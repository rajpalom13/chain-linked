/**
 * Supabase Client for Chrome Extension
 * Handles initialization and provides the Supabase client instance
 */

// ============================================
// CONFIGURATION
// ============================================
const SUPABASE_URL = 'https://baurjucvzdboavbcuxjh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhdXJqdWN2emRib2F2YmN1eGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NzI1ODIsImV4cCI6MjA4NTM0ODU4Mn0.AN6edcdG2fIef5tb0d-k_Gx6FR3WZB7UiWBeoBd6z-8';

// ============================================
// Supabase Client Implementation
// ============================================

/**
 * Lightweight Supabase client for Chrome Extension
 * Uses fetch API directly to avoid bundling the full SDK
 */
class SupabaseClient {
  constructor(url, anonKey) {
    this.url = url.replace(/\/$/, ''); // Remove trailing slash
    this.anonKey = anonKey;
    this.authToken = null;
    this.userId = null;
    this.realtimeChannels = new Map();
  }

  /**
   * Set the auth token for authenticated requests
   */
  setAuth(token, userId) {
    this.authToken = token;
    this.userId = userId;
  }

  /**
   * Clear auth state
   */
  clearAuth() {
    this.authToken = null;
    this.userId = null;
  }

  /**
   * Get headers for API requests
   */
  getHeaders(options = {}) {
    const headers = {
      'apikey': this.anonKey,
      'Content-Type': 'application/json',
      'Prefer': options.prefer || 'return=representation'
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Make a request to the REST API
   */
  async request(endpoint, options = {}) {
    const url = `${this.url}/rest/v1/${endpoint}`;

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: this.getHeaders(options),
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    // Handle empty responses
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  /**
   * Query builder for SELECT operations
   */
  from(table) {
    return new QueryBuilder(this, table);
  }

  /**
   * Auth namespace
   */
  get auth() {
    return new AuthClient(this);
  }

  /**
   * Realtime namespace
   */
  get realtime() {
    return new RealtimeClient(this);
  }
}

/**
 * Query Builder for database operations
 */
class QueryBuilder {
  constructor(client, table) {
    this.client = client;
    this.table = table;
    this.filters = [];
    this.selectColumns = '*';
    this.orderByColumn = null;
    this.orderAsc = true;
    this.limitCount = null;
    this.singleRow = false;
  }

  /**
   * Select specific columns
   */
  select(columns = '*') {
    this.selectColumns = columns;
    return this;
  }

  /**
   * Filter by equality
   */
  eq(column, value) {
    this.filters.push(`${column}=eq.${encodeURIComponent(value)}`);
    return this;
  }

  /**
   * Filter by not equal
   */
  neq(column, value) {
    this.filters.push(`${column}=neq.${encodeURIComponent(value)}`);
    return this;
  }

  /**
   * Filter by greater than
   */
  gt(column, value) {
    this.filters.push(`${column}=gt.${encodeURIComponent(value)}`);
    return this;
  }

  /**
   * Filter by less than
   */
  lt(column, value) {
    this.filters.push(`${column}=lt.${encodeURIComponent(value)}`);
    return this;
  }

  /**
   * Filter by greater than or equal
   */
  gte(column, value) {
    this.filters.push(`${column}=gte.${encodeURIComponent(value)}`);
    return this;
  }

  /**
   * Filter by less than or equal
   */
  lte(column, value) {
    this.filters.push(`${column}=lte.${encodeURIComponent(value)}`);
    return this;
  }

  /**
   * Filter by pattern match (LIKE)
   */
  like(column, pattern) {
    this.filters.push(`${column}=like.${encodeURIComponent(pattern)}`);
    return this;
  }

  /**
   * Filter by value in list
   */
  in(column, values) {
    this.filters.push(`${column}=in.(${values.map(v => encodeURIComponent(v)).join(',')})`);
    return this;
  }

  /**
   * Order results
   */
  order(column, { ascending = true } = {}) {
    this.orderByColumn = column;
    this.orderAsc = ascending;
    return this;
  }

  /**
   * Limit results
   */
  limit(count) {
    this.limitCount = count;
    return this;
  }

  /**
   * Return single row
   */
  single() {
    this.singleRow = true;
    this.limitCount = 1;
    return this;
  }

  /**
   * Build the query string
   */
  buildQuery() {
    const params = new URLSearchParams();
    params.set('select', this.selectColumns);

    if (this.orderByColumn) {
      params.set('order', `${this.orderByColumn}.${this.orderAsc ? 'asc' : 'desc'}`);
    }

    if (this.limitCount) {
      params.set('limit', this.limitCount);
    }

    let endpoint = `${this.table}?${params.toString()}`;

    if (this.filters.length > 0) {
      endpoint += '&' + this.filters.join('&');
    }

    return endpoint;
  }

  /**
   * Execute SELECT query
   */
  async execute() {
    try {
      const endpoint = this.buildQuery();
      const data = await this.client.request(endpoint);

      if (this.singleRow) {
        return { data: data?.[0] || null, error: null };
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Alias for execute
   */
  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }

  /**
   * INSERT operation
   */
  async insert(data, options = {}) {
    try {
      const result = await this.client.request(this.table, {
        method: 'POST',
        body: data,
        prefer: options.onConflict ? `resolution=merge-duplicates` : 'return=representation'
      });
      return { data: result, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * UPDATE operation
   */
  async update(data) {
    try {
      let endpoint = this.table;
      if (this.filters.length > 0) {
        endpoint += '?' + this.filters.join('&');
      }
      const result = await this.client.request(endpoint, {
        method: 'PATCH',
        body: data
      });
      return { data: result, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * UPSERT operation
   */
  async upsert(data, options = {}) {
    try {
      const prefer = options.onConflict
        ? `return=representation,resolution=merge-duplicates`
        : 'return=representation';

      const result = await this.client.request(this.table, {
        method: 'POST',
        body: data,
        prefer
      });
      return { data: result, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * DELETE operation
   */
  async delete() {
    try {
      let endpoint = this.table;
      if (this.filters.length > 0) {
        endpoint += '?' + this.filters.join('&');
      }
      const result = await this.client.request(endpoint, {
        method: 'DELETE'
      });
      return { data: result, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}

/**
 * Auth Client for Supabase authentication
 */
class AuthClient {
  constructor(client) {
    this.client = client;
  }

  /**
   * Sign in with ID token (Google OAuth)
   */
  async signInWithIdToken({ provider, token, access_token }) {
    try {
      const response = await fetch(`${this.client.url}/auth/v1/token?grant_type=id_token`, {
        method: 'POST',
        headers: {
          'apikey': this.client.anonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider,
          id_token: token,
          access_token
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error_description || error.message || 'Auth failed');
      }

      const data = await response.json();

      // Set the auth token on the client
      this.client.setAuth(data.access_token, data.user?.id);

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Get current session from storage
   */
  async getSession() {
    try {
      const result = await chrome.storage.local.get('supabase_session');
      const session = result.supabase_session;

      if (session && session.access_token) {
        // Check if token is expired
        const expiresAt = session.expires_at || 0;
        if (Date.now() / 1000 < expiresAt) {
          this.client.setAuth(session.access_token, session.user?.id);
          return { data: { session }, error: null };
        }

        // Token expired, try to refresh
        if (session.refresh_token) {
          return await this.refreshSession(session.refresh_token);
        }
      }

      return { data: { session: null }, error: null };
    } catch (error) {
      return { data: { session: null }, error };
    }
  }

  /**
   * Refresh the session token
   */
  async refreshSession(refreshToken) {
    try {
      const response = await fetch(`${this.client.url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'apikey': this.client.anonKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (!response.ok) {
        throw new Error('Failed to refresh session');
      }

      const data = await response.json();

      // Save new session
      await this.saveSession(data);

      this.client.setAuth(data.access_token, data.user?.id);

      return { data: { session: data }, error: null };
    } catch (error) {
      // Clear invalid session
      await chrome.storage.local.remove('supabase_session');
      return { data: { session: null }, error };
    }
  }

  /**
   * Save session to storage
   */
  async saveSession(session) {
    await chrome.storage.local.set({ supabase_session: session });
  }

  /**
   * Sign out
   */
  async signOut() {
    try {
      if (this.client.authToken) {
        await fetch(`${this.client.url}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            'apikey': this.client.anonKey,
            'Authorization': `Bearer ${this.client.authToken}`
          }
        });
      }
    } catch (e) {
      // Ignore logout errors
    }

    this.client.clearAuth();
    await chrome.storage.local.remove('supabase_session');

    return { error: null };
  }

  /**
   * Get current user
   */
  async getUser() {
    try {
      const { data: sessionData } = await this.getSession();
      if (!sessionData?.session?.user) {
        return { data: { user: null }, error: null };
      }
      return { data: { user: sessionData.session.user }, error: null };
    } catch (error) {
      return { data: { user: null }, error };
    }
  }
}

/**
 * Realtime Client for subscriptions
 */
class RealtimeClient {
  constructor(client) {
    this.client = client;
    this.socket = null;
    this.channels = new Map();
  }

  /**
   * Connect to realtime websocket
   */
  connect() {
    if (this.socket) return;

    const wsUrl = this.client.url.replace('https://', 'wss://').replace('http://', 'ws://');
    this.socket = new WebSocket(`${wsUrl}/realtime/v1/websocket?apikey=${this.client.anonKey}&vsn=1.0.0`);

    this.socket.onopen = () => {
      console.log('[Supabase] Realtime connected');
      // Rejoin all channels
      this.channels.forEach((channel, name) => {
        this.joinChannel(name, channel.config);
      });
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (e) {
        console.error('[Supabase] Failed to parse realtime message:', e);
      }
    };

    this.socket.onclose = () => {
      console.log('[Supabase] Realtime disconnected');
      this.socket = null;
      // Attempt reconnect after delay
      setTimeout(() => this.connect(), 5000);
    };

    this.socket.onerror = (error) => {
      console.error('[Supabase] Realtime error:', error);
    };
  }

  /**
   * Handle incoming realtime messages
   */
  handleMessage(message) {
    const { topic, event, payload } = message;

    if (event === 'phx_reply') return;

    const channel = this.channels.get(topic);
    if (channel && channel.callbacks[event]) {
      channel.callbacks[event].forEach(cb => cb(payload));
    }
  }

  /**
   * Create a channel subscription
   */
  channel(name, config = {}) {
    const channelConfig = {
      config,
      callbacks: {},
      ref: Math.random().toString(36).slice(2)
    };

    const channelApi = {
      on: (event, eventFilter, callback) => {
        if (typeof eventFilter === 'function') {
          callback = eventFilter;
          eventFilter = {};
        }

        const eventName = event === 'postgres_changes' ? 'postgres_changes' : event;
        if (!channelConfig.callbacks[eventName]) {
          channelConfig.callbacks[eventName] = [];
        }
        channelConfig.callbacks[eventName].push(callback);
        return channelApi;
      },
      subscribe: (callback) => {
        this.channels.set(name, channelConfig);
        if (this.socket?.readyState === WebSocket.OPEN) {
          this.joinChannel(name, config);
        } else {
          this.connect();
        }
        if (callback) callback('SUBSCRIBED');
        return channelApi;
      },
      unsubscribe: () => {
        this.leaveChannel(name);
        this.channels.delete(name);
      }
    };

    return channelApi;
  }

  /**
   * Join a channel
   */
  joinChannel(name, config) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    const message = {
      topic: name,
      event: 'phx_join',
      payload: { config },
      ref: Math.random().toString(36).slice(2)
    };

    this.socket.send(JSON.stringify(message));
  }

  /**
   * Leave a channel
   */
  leaveChannel(name) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    const message = {
      topic: name,
      event: 'phx_leave',
      payload: {},
      ref: Math.random().toString(36).slice(2)
    };

    this.socket.send(JSON.stringify(message));
  }

  /**
   * Disconnect from realtime
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.channels.clear();
  }
}

// ============================================
// Export singleton instance
// ============================================
const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Check if properly configured
const isConfigured = () => {
  return SUPABASE_URL !== 'YOUR_SUPABASE_PROJECT_URL' &&
         SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { supabase, isConfigured, SupabaseClient };
}

// Also make available globally for service worker
if (typeof self !== 'undefined') {
  self.supabase = supabase;
  self.isSupabaseConfigured = isConfigured;
  self.SupabaseClient = SupabaseClient;
}
