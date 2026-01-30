/**
 * Unified Storage Interface
 * Provides a single API for storage operations that handles both local cache and Supabase sync
 */

/**
 * Unified Storage class that wraps local cache with Supabase sync
 */
class UnifiedStorage {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize storage
   */
  async initialize() {
    if (this.initialized) return;

    // Initialize local cache
    await self.localCache?.initialize();

    // Check if user is authenticated and initialize sync
    const isAuth = await self.supabaseAuth?.isAuthenticated();
    if (isAuth) {
      await self.syncManager?.initialize();
    }

    this.initialized = true;
    console.log('[UnifiedStorage] Initialized');
  }

  /**
   * Save data to storage (local + sync to Supabase)
   * @param {string} key - Storage key
   * @param {any} data - Data to save
   * @param {object} options - Save options
   */
  async save(key, data, options = {}) {
    const { skipSync = false } = options;

    // Always save to local storage first (offline-first)
    await self.localCache?.set(key, data, { skipSync });

    return { success: true, data };
  }

  /**
   * Get data from storage
   * @param {string} key - Storage key
   * @param {object} options - Get options
   */
  async get(key, options = {}) {
    const { forceRemote = false } = options;

    // Get from local cache first
    let data = await self.localCache?.get(key);

    // If forceRemote and we have a Supabase table mapping, fetch from remote
    if (forceRemote && self.STORAGE_TABLE_MAP?.[key]) {
      const table = self.STORAGE_TABLE_MAP[key];
      const userId = await self.supabaseAuth?.getUserId();

      if (userId && self.isSupabaseConfigured?.()) {
        try {
          const { data: remoteData, error } = await self.supabase
            .from(table)
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

          if (!error && remoteData) {
            // Update local cache with remote data
            const singleRecordTables = ['linkedin_profiles', 'audience_data', 'extension_settings'];
            if (singleRecordTables.includes(table)) {
              data = remoteData[0] || null;
            } else {
              data = remoteData;
            }
            await self.localCache?.set(key, data, { skipSync: true });
          }
        } catch (e) {
          console.error(`[UnifiedStorage] Failed to fetch from remote:`, e);
        }
      }
    }

    return data;
  }

  /**
   * Append item to array storage
   * @param {string} key - Storage key
   * @param {any} item - Item to append
   * @param {object} options - Append options
   */
  async append(key, item, options = {}) {
    const { dedupeKey = null, maxItems = 1000 } = options;
    return await self.localCache?.append(key, item, { dedupeKey, maxItems });
  }

  /**
   * Remove data from storage
   * @param {string} key - Storage key
   */
  async remove(key) {
    await self.localCache?.remove(key);
    return { success: true };
  }

  /**
   * Get all data for a user from Supabase
   */
  async getAllFromRemote() {
    return await self.localCache?.pullFromSupabase();
  }

  /**
   * Push all local data to Supabase
   */
  async pushAllToRemote() {
    return await self.localCache?.fullSync();
  }

  /**
   * Migrate existing local data to Supabase
   */
  async migrateToSupabase() {
    return await self.localCache?.migrateExistingData();
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      cache: self.localCache?.getSyncStatus() || {},
      sync: self.syncManager?.getStatus() || {},
      isConfigured: self.isSupabaseConfigured?.() || false
    };
  }

  /**
   * Force sync now
   */
  async syncNow() {
    return await self.syncManager?.syncNow();
  }

  /**
   * Full sync (push and pull)
   */
  async fullSync() {
    return await self.syncManager?.fullSync();
  }
}

// ============================================
// Storage Helper Functions (Drop-in replacements)
// ============================================

/**
 * Save profile data
 */
async function saveProfile(data) {
  return await unifiedStorage.save('linkedin_profile', data);
}

/**
 * Get profile data
 */
async function getProfile() {
  return await unifiedStorage.get('linkedin_profile');
}

/**
 * Save analytics data
 */
async function saveAnalytics(data) {
  return await unifiedStorage.save('linkedin_analytics', data);
}

/**
 * Get analytics data
 */
async function getAnalytics() {
  return await unifiedStorage.get('linkedin_analytics');
}

/**
 * Save post analytics
 */
async function savePostAnalytics(data) {
  const existing = await unifiedStorage.get('linkedin_post_analytics') || [];
  const urn = data.activityUrn || data.activity_urn;

  // Deduplicate by URN
  const filtered = existing.filter(p =>
    (p.activityUrn || p.activity_urn) !== urn
  );

  filtered.unshift(data);

  // Keep max 100 posts
  const trimmed = filtered.slice(0, 100);

  return await unifiedStorage.save('linkedin_post_analytics', trimmed);
}

/**
 * Get post analytics
 */
async function getPostAnalytics() {
  return await unifiedStorage.get('linkedin_post_analytics') || [];
}

/**
 * Save audience data
 */
async function saveAudienceData(data) {
  return await unifiedStorage.save('linkedin_audience', data);
}

/**
 * Get audience data
 */
async function getAudienceData() {
  return await unifiedStorage.get('linkedin_audience');
}

/**
 * Save feed posts
 */
async function saveFeedPosts(posts) {
  const existing = await unifiedStorage.get('linkedin_feed_posts') || [];

  // Deduplicate by URN
  const urnSet = new Set(posts.map(p => p.activityUrn || p.activity_urn));
  const filtered = existing.filter(p =>
    !urnSet.has(p.activityUrn || p.activity_urn)
  );

  const combined = [...posts, ...filtered].slice(0, 500);

  return await unifiedStorage.save('linkedin_feed_posts', combined);
}

/**
 * Get feed posts
 */
async function getFeedPosts() {
  return await unifiedStorage.get('linkedin_feed_posts') || [];
}

/**
 * Save connections
 */
async function saveConnections(connections) {
  const existing = await unifiedStorage.get('linkedin_connections') || [];

  // Deduplicate by URN
  const urnSet = new Set(connections.map(c => c.connectionUrn || c.connection_urn));
  const filtered = existing.filter(c =>
    !urnSet.has(c.connectionUrn || c.connection_urn)
  );

  const combined = [...connections, ...filtered];

  return await unifiedStorage.save('linkedin_connections', combined);
}

/**
 * Get connections
 */
async function getConnections() {
  return await unifiedStorage.get('linkedin_connections') || [];
}

/**
 * Save captured API
 */
async function saveCapturedAPI(apiData) {
  return await unifiedStorage.append('captured_apis', apiData, {
    dedupeKey: 'hash',
    maxItems: 1000
  });
}

/**
 * Get captured APIs
 */
async function getCapturedAPIs() {
  return await unifiedStorage.get('captured_apis') || [];
}

/**
 * Save extension settings
 */
async function saveSettings(settings) {
  return await unifiedStorage.save('extension_settings', settings);
}

/**
 * Get extension settings
 */
async function getSettings() {
  return await unifiedStorage.get('extension_settings') || {
    auto_capture_enabled: true,
    capture_feed: true,
    capture_analytics: true,
    capture_profile: true,
    capture_messaging: false,
    sync_enabled: true,
    dark_mode: false,
    notifications_enabled: true
  };
}

/**
 * Update capture stats
 */
async function updateCaptureStats(stats) {
  const today = new Date().toISOString().split('T')[0];
  const existing = await unifiedStorage.get('linkedin_capture_stats') || {};

  const todayStats = existing[today] || {
    api_calls_captured: 0,
    feed_posts_captured: 0,
    analytics_captures: 0,
    dom_extractions: 0
  };

  // Merge stats
  Object.keys(stats).forEach(key => {
    todayStats[key] = (todayStats[key] || 0) + (stats[key] || 0);
  });

  existing[today] = todayStats;

  // Keep only last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

  Object.keys(existing).forEach(date => {
    if (date < cutoff) {
      delete existing[date];
    }
  });

  return await unifiedStorage.save('linkedin_capture_stats', existing);
}

/**
 * Get capture stats
 */
async function getCaptureStats() {
  return await unifiedStorage.get('linkedin_capture_stats') || {};
}

// Create singleton instance
const unifiedStorage = new UnifiedStorage();

// Export for use in service worker
if (typeof self !== 'undefined') {
  self.unifiedStorage = unifiedStorage;
  self.UnifiedStorage = UnifiedStorage;

  // Export helper functions
  self.storageHelpers = {
    saveProfile,
    getProfile,
    saveAnalytics,
    getAnalytics,
    savePostAnalytics,
    getPostAnalytics,
    saveAudienceData,
    getAudienceData,
    saveFeedPosts,
    getFeedPosts,
    saveConnections,
    getConnections,
    saveCapturedAPI,
    getCapturedAPIs,
    saveSettings,
    getSettings,
    updateCaptureStats,
    getCaptureStats
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    unifiedStorage,
    UnifiedStorage,
    saveProfile,
    getProfile,
    saveAnalytics,
    getAnalytics,
    savePostAnalytics,
    getPostAnalytics,
    saveAudienceData,
    getAudienceData,
    saveFeedPosts,
    getFeedPosts,
    saveConnections,
    getConnections,
    saveCapturedAPI,
    getCapturedAPIs,
    saveSettings,
    getSettings,
    updateCaptureStats,
    getCaptureStats
  };
}
