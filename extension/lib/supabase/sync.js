/**
 * Real-time Sync Manager for Supabase
 * Handles real-time subscriptions and sync orchestration
 */

/**
 * Tables to subscribe to for real-time updates
 */
const REALTIME_TABLES = [
  'linkedin_profiles',
  'linkedin_analytics',
  'post_analytics',
  'audience_data',
  'extension_settings',
  'sync_metadata'
];

/**
 * Sync interval in milliseconds (5 minutes default)
 */
const DEFAULT_SYNC_INTERVAL = 5 * 60 * 1000;

/**
 * Sync Manager Class
 */
class SyncManager {
  constructor() {
    this.subscriptions = new Map();
    this.isInitialized = false;
    this.userId = null;
    this.syncInterval = null;
    this.lastSyncTime = null;
    this.listeners = [];
  }

  /**
   * Initialize sync manager with user session
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('[SyncManager] Already initialized');
      return;
    }

    // Check if Supabase is configured
    if (!self.isSupabaseConfigured || !self.isSupabaseConfigured()) {
      console.log('[SyncManager] Supabase not configured, skipping initialization');
      return;
    }

    // Get user ID
    this.userId = await self.supabaseAuth?.getUserId();
    if (!this.userId) {
      console.log('[SyncManager] No user authenticated, skipping initialization');
      return;
    }

    // Initialize local cache
    await self.localCache?.initialize();

    // Set up real-time subscriptions
    await this.initializeSubscriptions();

    // Start periodic sync
    this.startPeriodicSync();

    // Listen for auth changes
    self.supabaseAuth?.onAuthStateChange((event, user) => {
      if (event === 'SIGNED_OUT') {
        this.cleanup();
      } else if (event === 'SIGNED_IN') {
        this.initialize();
      }
    });

    this.isInitialized = true;
    console.log('[SyncManager] Initialized successfully');
  }

  /**
   * Initialize real-time subscriptions
   */
  async initializeSubscriptions() {
    console.log('[SyncManager] Setting up real-time subscriptions...');

    for (const table of REALTIME_TABLES) {
      try {
        const channel = self.supabase.realtime.channel(`${table}_changes`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: table,
              filter: `user_id=eq.${this.userId}`
            },
            (payload) => this.handleRealtimeChange(table, payload)
          )
          .subscribe((status) => {
            console.log(`[SyncManager] Subscription to ${table}: ${status}`);
          });

        this.subscriptions.set(table, channel);

      } catch (error) {
        console.error(`[SyncManager] Failed to subscribe to ${table}:`, error);
      }
    }
  }

  /**
   * Handle incoming real-time changes
   */
  async handleRealtimeChange(table, payload) {
    console.log(`[SyncManager] Realtime change in ${table}:`, payload.eventType);

    const { eventType, new: newRecord, old: oldRecord } = payload;

    // Get local storage key for this table
    const localKey = self.TABLE_STORAGE_MAP?.[table];
    if (!localKey) return;

    try {
      switch (eventType) {
        case 'INSERT':
        case 'UPDATE':
          await this.updateLocalCache(localKey, table, newRecord);
          break;

        case 'DELETE':
          await this.removeFromLocalCache(localKey, table, oldRecord);
          break;
      }

      // Notify listeners
      this.notifyListeners({
        type: 'REALTIME_UPDATE',
        table,
        eventType,
        data: newRecord || oldRecord
      });

      // Broadcast to popup/content scripts
      chrome.runtime.sendMessage({
        type: 'SYNC_UPDATE',
        table,
        eventType,
        data: newRecord || oldRecord
      }).catch(() => {});

    } catch (error) {
      console.error(`[SyncManager] Error handling realtime change:`, error);
    }
  }

  /**
   * Update local cache with remote data
   */
  async updateLocalCache(localKey, table, data) {
    // Single record tables
    const singleRecordTables = ['linkedin_profiles', 'audience_data', 'extension_settings'];

    if (singleRecordTables.includes(table)) {
      await self.localCache?.set(localKey, data, { skipSync: true });
    } else {
      // Array tables - update or add
      const existing = await self.localCache?.get(localKey) || [];
      const index = existing.findIndex(item => item.id === data.id);

      if (index >= 0) {
        existing[index] = data;
      } else {
        existing.unshift(data);
      }

      await self.localCache?.set(localKey, existing, { skipSync: true });
    }
  }

  /**
   * Remove item from local cache
   */
  async removeFromLocalCache(localKey, table, data) {
    const singleRecordTables = ['linkedin_profiles', 'audience_data', 'extension_settings'];

    if (singleRecordTables.includes(table)) {
      await self.localCache?.remove(localKey);
    } else {
      const existing = await self.localCache?.get(localKey) || [];
      const filtered = existing.filter(item => item.id !== data.id);
      await self.localCache?.set(localKey, filtered, { skipSync: true });
    }
  }

  /**
   * Start periodic sync
   */
  startPeriodicSync(interval = DEFAULT_SYNC_INTERVAL) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.syncNow();
    }, interval);

    // Also sync immediately
    this.syncNow();
  }

  /**
   * Trigger immediate sync
   */
  async syncNow() {
    if (!this.isInitialized || !this.userId) {
      return { success: false, error: 'Not initialized' };
    }

    console.log('[SyncManager] Starting sync...');

    try {
      // Push local changes to Supabase
      await self.localCache?.processPendingChanges();

      // Update last sync time
      this.lastSyncTime = Date.now();
      await this.updateSyncMetadata();

      // Notify status
      this.notifyListeners({
        type: 'SYNC_COMPLETE',
        lastSyncTime: this.lastSyncTime
      });

      console.log('[SyncManager] Sync completed successfully');
      return { success: true, lastSyncTime: this.lastSyncTime };

    } catch (error) {
      console.error('[SyncManager] Sync failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Full sync - pull all data from Supabase
   */
  async fullSync() {
    if (!this.isInitialized || !this.userId) {
      return { success: false, error: 'Not initialized' };
    }

    console.log('[SyncManager] Starting full sync...');

    try {
      // First push any pending local changes
      await self.localCache?.processPendingChanges();

      // Then pull all data from Supabase
      const pullResult = await self.localCache?.pullFromSupabase();

      // Update sync metadata
      this.lastSyncTime = Date.now();
      await this.updateSyncMetadata();

      this.notifyListeners({
        type: 'FULL_SYNC_COMPLETE',
        lastSyncTime: this.lastSyncTime,
        results: pullResult?.results
      });

      console.log('[SyncManager] Full sync completed');
      return { success: true, results: pullResult?.results };

    } catch (error) {
      console.error('[SyncManager] Full sync failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update sync metadata in Supabase
   */
  async updateSyncMetadata() {
    if (!this.userId) return;

    try {
      const tables = Object.values(self.STORAGE_TABLE_MAP || {});

      for (const table of tables) {
        await self.supabase.from('sync_metadata').upsert({
          user_id: this.userId,
          table_name: table,
          last_synced_at: new Date().toISOString(),
          sync_status: 'idle',
          pending_changes: 0
        });
      }
    } catch (error) {
      console.error('[SyncManager] Failed to update sync metadata:', error);
    }
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      userId: this.userId,
      lastSyncTime: this.lastSyncTime,
      subscriptions: Array.from(this.subscriptions.keys()),
      pendingChanges: self.localCache?.getPendingCount() || 0,
      isOnline: navigator.onLine
    };
  }

  /**
   * Add sync status listener
   */
  onSyncStatusChange(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify all listeners
   */
  notifyListeners(event) {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (e) {
        console.error('[SyncManager] Listener error:', e);
      }
    });
  }

  /**
   * Pause sync
   */
  pause() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log('[SyncManager] Sync paused');
  }

  /**
   * Resume sync
   */
  resume() {
    if (!this.syncInterval) {
      this.startPeriodicSync();
    }
    console.log('[SyncManager] Sync resumed');
  }

  /**
   * Cleanup subscriptions and intervals
   */
  cleanup() {
    console.log('[SyncManager] Cleaning up...');

    // Clear interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Unsubscribe from all channels
    for (const [table, channel] of this.subscriptions) {
      try {
        channel.unsubscribe();
      } catch (e) {
        console.error(`[SyncManager] Error unsubscribing from ${table}:`, e);
      }
    }
    this.subscriptions.clear();

    // Disconnect realtime
    self.supabase?.realtime?.disconnect();

    this.isInitialized = false;
    this.userId = null;
    this.lastSyncTime = null;

    console.log('[SyncManager] Cleanup complete');
  }

  /**
   * Tables with unique user_id constraint (use user_id as conflict key)
   */
  static USER_ID_CONFLICT_TABLES = ['linkedin_profiles', 'audience_data', 'extension_settings'];

  /**
   * Get appropriate conflict key for table upsert
   */
  getConflictKey(table) {
    return SyncManager.USER_ID_CONFLICT_TABLES.includes(table) ? 'user_id' : 'id';
  }

  /**
   * Sync specific table
   */
  async syncTable(table) {
    if (!this.userId) return { success: false, error: 'Not authenticated' };

    const localKey = self.TABLE_STORAGE_MAP?.[table];
    if (!localKey) return { success: false, error: 'Unknown table' };

    try {
      // Get local data
      const localData = await self.localCache?.get(localKey);

      if (localData) {
        // Push to Supabase
        const items = Array.isArray(localData) ? localData : [localData];
        const conflictKey = this.getConflictKey(table);

        for (const item of items) {
          const dataWithUser = { ...item, user_id: this.userId };
          await self.supabase.from(table).upsert(dataWithUser, { onConflict: conflictKey });
        }
      }

      return { success: true };

    } catch (error) {
      console.error(`[SyncManager] Failed to sync table ${table}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if data is stale and needs refresh
   */
  isDataStale(maxAge = 5 * 60 * 1000) {
    if (!this.lastSyncTime) return true;
    return Date.now() - this.lastSyncTime > maxAge;
  }
}

// Create singleton instance
const syncManager = new SyncManager();

// Export for use in service worker
if (typeof self !== 'undefined') {
  self.syncManager = syncManager;
  self.SyncManager = SyncManager;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { syncManager, SyncManager };
}
