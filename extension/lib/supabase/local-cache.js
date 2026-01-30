/**
 * Local Cache Layer for Offline-First Architecture
 * Manages chrome.storage.local as a cache with pending changes queue
 */

/**
 * Storage key mappings between local storage and Supabase tables
 */
const STORAGE_TABLE_MAP = {
  // Local storage key -> Supabase table
  'linkedin_profile': 'linkedin_profiles',
  'linkedin_analytics': 'linkedin_analytics',
  'linkedin_post_analytics': 'post_analytics',
  'linkedin_audience': 'audience_data',
  'linkedin_connections': 'connections',
  'linkedin_feed_posts': 'feed_posts',
  'linkedin_my_posts': 'my_posts',
  'linkedin_comments': 'comments',
  'linkedin_followers': 'followers',
  'captured_apis': 'captured_apis',
  'auto_capture_stats': 'capture_stats', // Fixed: was 'linkedin_capture_stats'
  'extension_settings': 'extension_settings',
  'linkedin_analytics_history': 'analytics_history', // Added: history table exists
  // Additional tables for v4.1
  'linkedin_notifications': 'notifications',
  'linkedin_invitations': 'invitations',
  'linkedin_network': 'network_data',
  'linkedin_trending': 'captured_apis', // Store trending topics in captured_apis with category
};

/**
 * Reverse mapping: Supabase table -> local storage key
 */
const TABLE_STORAGE_MAP = Object.fromEntries(
  Object.entries(STORAGE_TABLE_MAP).map(([k, v]) => [v, k])
);

/**
 * Local Cache Manager
 */
class LocalCache {
  constructor() {
    this.pendingChanges = [];
    this.isOnline = true;
    this.syncInProgress = false;
  }

  /**
   * Initialize the cache and load pending changes
   */
  async initialize() {
    // Load pending changes from storage
    const result = await chrome.storage.local.get('supabase_pending_changes');
    this.pendingChanges = result.supabase_pending_changes || [];

    // Check online status
    this.isOnline = navigator.onLine;

    // Listen for online/offline events in service worker context
    if (typeof self !== 'undefined' && self.addEventListener) {
      self.addEventListener('online', async () => {
        console.log('[LocalCache] Back online, syncing pending changes with retry...');
        this.isOnline = true;
        // Use sync with retry for more reliable sync after coming back online
        const result = await this.syncWithRetry(3);
        console.log('[LocalCache] Online sync result:', result);
      });
      self.addEventListener('offline', () => {
        console.log('[LocalCache] Gone offline');
        this.isOnline = false;
      });
    }

    // Also listen in window context if available
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('online', async () => {
        console.log('[LocalCache] Window: Back online, syncing pending changes...');
        this.isOnline = true;
        const result = await this.syncWithRetry(3);
        console.log('[LocalCache] Window online sync result:', result);
      });
      window.addEventListener('offline', () => {
        console.log('[LocalCache] Window: Gone offline');
        this.isOnline = false;
      });
    }

    console.log(`[LocalCache] Initialized with ${this.pendingChanges.length} pending changes, online: ${this.isOnline}`);
  }

  /**
   * Get data from local cache
   * @param {string} key - Local storage key
   * @returns {Promise<any>}
   */
  async get(key) {
    const result = await chrome.storage.local.get(key);
    return result[key];
  }

  /**
   * Set data in local cache and queue for sync
   * @param {string} key - Local storage key
   * @param {any} value - Data to store
   * @param {object} options - Options for sync behavior
   */
  async set(key, value, options = {}) {
    const { skipSync = false, operation = 'upsert' } = options;

    console.log('[LocalCache] set() called:', { key, skipSync, hasTableMapping: !!STORAGE_TABLE_MAP[key] });

    // Save to local storage immediately
    await chrome.storage.local.set({ [key]: value });
    console.log('[LocalCache] Saved to chrome.storage.local');

    // Queue for sync if not skipped and we have a table mapping
    if (!skipSync && STORAGE_TABLE_MAP[key]) {
      console.log('[LocalCache] Queueing for sync to table:', STORAGE_TABLE_MAP[key]);
      await this.queueChange({
        table: STORAGE_TABLE_MAP[key],
        operation,
        data: value,
        localKey: key,
        timestamp: Date.now()
      });
    } else {
      console.log('[LocalCache] NOT queueing - skipSync:', skipSync, 'tableMapping:', STORAGE_TABLE_MAP[key]);
    }

    return value;
  }

  /**
   * Append data to an array in local cache
   * @param {string} key - Local storage key
   * @param {any} item - Item to append
   * @param {object} options - Options including deduplication
   */
  async append(key, item, options = {}) {
    const { dedupeKey = null, maxItems = 1000, skipSync = false } = options;

    let existing = await this.get(key) || [];

    // Deduplicate if key provided
    if (dedupeKey && item[dedupeKey]) {
      existing = existing.filter(i => i[dedupeKey] !== item[dedupeKey]);
    }

    // Add new item
    existing.unshift(item);

    // Trim if over max
    if (existing.length > maxItems) {
      existing = existing.slice(0, maxItems);
    }

    await this.set(key, existing, { skipSync });

    // Queue individual item for sync
    if (!skipSync && STORAGE_TABLE_MAP[key]) {
      await this.queueChange({
        table: STORAGE_TABLE_MAP[key],
        operation: 'upsert',
        data: item,
        localKey: key,
        timestamp: Date.now()
      });
    }

    return existing;
  }

  /**
   * Remove data from local cache
   * @param {string} key - Local storage key
   */
  async remove(key) {
    await chrome.storage.local.remove(key);
  }

  /**
   * Queue a change for sync to Supabase
   */
  async queueChange(change) {
    console.log('[LocalCache] queueChange called:', { table: change.table, operation: change.operation });

    // Add user context if available
    if (self.supabaseAuth) {
      const userId = await self.supabaseAuth.getUserId();
      console.log('[LocalCache] User ID for queue:', userId);
      if (userId) {
        change.userId = userId;
      }
    }

    this.pendingChanges.push(change);
    console.log('[LocalCache] Queued change, total pending:', this.pendingChanges.length);

    // Save pending changes
    await chrome.storage.local.set({ supabase_pending_changes: this.pendingChanges });

    // Try to sync immediately if online
    console.log('[LocalCache] Will try sync:', { isOnline: this.isOnline, syncInProgress: this.syncInProgress });
    if (this.isOnline && !this.syncInProgress) {
      this.processPendingChanges();
    }
  }

  /**
   * Process pending changes and sync to Supabase
   */
  async processPendingChanges() {
    console.log('[LocalCache] processPendingChanges called:', {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      pendingCount: this.pendingChanges.length
    });

    if (!this.isOnline || this.syncInProgress || this.pendingChanges.length === 0) {
      console.log('[LocalCache] Early return - conditions not met');
      return;
    }

    // Check if Supabase is configured
    const supabaseConfigured = self.isSupabaseConfigured && self.isSupabaseConfigured();
    console.log('[LocalCache] Supabase configured:', supabaseConfigured);
    if (!supabaseConfigured) {
      console.log('[LocalCache] Supabase not configured, skipping sync');
      return;
    }

    // Check if authenticated
    const isAuth = await self.supabaseAuth?.isAuthenticated();
    console.log('[LocalCache] Authentication status:', isAuth);
    if (!isAuth) {
      console.log('[LocalCache] Not authenticated, skipping sync');
      return;
    }

    this.syncInProgress = true;
    console.log(`[LocalCache] Processing ${this.pendingChanges.length} pending changes`);

    const failed = [];
    const userId = await self.supabaseAuth.getUserId();

    for (const change of this.pendingChanges) {
      try {
        const result = await this.syncChangeToSupabase(change, userId);
        if (!result.success) {
          failed.push(change);
        }
      } catch (error) {
        console.error('[LocalCache] Failed to sync change:', error);
        failed.push(change);
      }
    }

    // Update pending changes to only failed ones
    this.pendingChanges = failed;
    await chrome.storage.local.set({ supabase_pending_changes: this.pendingChanges });

    this.syncInProgress = false;

    console.log(`[LocalCache] Sync complete. ${failed.length} changes remaining.`);

    // Notify sync status
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'SYNC_STATUS_UPDATE',
        status: failed.length === 0 ? 'synced' : 'pending',
        pendingCount: failed.length
      }).catch(() => {});
    }
  }

  /**
   * Tables with unique user_id constraint (use user_id as conflict key)
   */
  static USER_ID_CONFLICT_TABLES = ['linkedin_profiles', 'audience_data', 'extension_settings'];

  /**
   * Get appropriate conflict key for table upsert
   */
  getConflictKey(table) {
    return LocalCache.USER_ID_CONFLICT_TABLES.includes(table) ? 'user_id' : 'id';
  }

  /**
   * Sync a single change to Supabase
   */
  async syncChangeToSupabase(change, userId) {
    const { table, operation, data } = change;

    // Prepare data with field mappings and user_id
    const dataWithUser = this.prepareForSupabase(data, userId, table);

    // Get appropriate conflict key for upsert
    const conflictKey = this.getConflictKey(table);

    console.log(`[LocalCache] Syncing to ${table}:`, { conflictKey, fields: Object.keys(dataWithUser) });

    try {
      let result;

      switch (operation) {
        case 'insert':
          result = await self.supabase.from(table).insert(dataWithUser);
          break;

        case 'update':
          if (data.id) {
            result = await self.supabase.from(table)
              .update(dataWithUser)
              .eq('id', data.id);
          } else {
            // Use upsert if no ID with proper conflict key
            result = await self.supabase.from(table).upsert(dataWithUser, { onConflict: conflictKey });
          }
          break;

        case 'upsert':
          result = await self.supabase.from(table).upsert(dataWithUser, { onConflict: conflictKey });
          break;

        case 'delete':
          if (data.id) {
            result = await self.supabase.from(table)
              .delete()
              .eq('id', data.id);
          }
          break;

        default:
          result = await self.supabase.from(table).upsert(dataWithUser, { onConflict: conflictKey });
      }

      if (result.error) {
        console.error(`[LocalCache] Supabase error for ${table}:`, result.error);
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data };

    } catch (error) {
      console.error(`[LocalCache] Sync error for ${table}:`, error);
      return { success: false, error };
    }
  }

  /**
   * Force sync all local data to Supabase
   */
  async fullSync() {
    console.log('[LocalCache] Starting full sync...');

    const userId = await self.supabaseAuth?.getUserId();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    const results = {};

    for (const [localKey, table] of Object.entries(STORAGE_TABLE_MAP)) {
      try {
        const data = await this.get(localKey);
        if (!data) continue;

        // Handle arrays vs single objects
        const items = Array.isArray(data) ? data : [data];

        // Get appropriate conflict key for this table
        const conflictKey = this.getConflictKey(table);

        for (const item of items) {
          const dataWithUser = { ...item, user_id: userId };
          const result = await self.supabase.from(table).upsert(dataWithUser, { onConflict: conflictKey });

          if (result.error) {
            results[table] = { success: false, error: result.error };
          } else {
            results[table] = { success: true, count: items.length };
          }
        }

        console.log(`[LocalCache] Synced ${items.length} items to ${table}`);

      } catch (error) {
        console.error(`[LocalCache] Error syncing ${localKey}:`, error);
        results[table] = { success: false, error };
      }
    }

    return { success: true, results };
  }

  /**
   * Pull data from Supabase to local cache
   */
  async pullFromSupabase(tables = null) {
    console.log('[LocalCache] Pulling data from Supabase...');

    const userId = await self.supabaseAuth?.getUserId();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    const tablesToPull = tables || Object.values(STORAGE_TABLE_MAP);
    const results = {};

    for (const table of tablesToPull) {
      try {
        const localKey = TABLE_STORAGE_MAP[table];
        if (!localKey) continue;

        const { data, error } = await self.supabase
          .from(table)
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });

        if (error) {
          results[table] = { success: false, error };
          continue;
        }

        // Store in local cache
        if (data && data.length > 0) {
          // For single-record tables, store the first item
          const singleRecordTables = ['linkedin_profiles', 'audience_data', 'extension_settings'];
          if (singleRecordTables.includes(table)) {
            await this.set(localKey, data[0], { skipSync: true });
          } else {
            await this.set(localKey, data, { skipSync: true });
          }
        }

        results[table] = { success: true, count: data?.length || 0 };
        console.log(`[LocalCache] Pulled ${data?.length || 0} items from ${table}`);

      } catch (error) {
        console.error(`[LocalCache] Error pulling ${table}:`, error);
        results[table] = { success: false, error };
      }
    }

    return { success: true, results };
  }

  /**
   * Get pending changes count
   */
  getPendingCount() {
    return this.pendingChanges.length;
  }

  /**
   * Clear all pending changes
   */
  async clearPendingChanges() {
    this.pendingChanges = [];
    await chrome.storage.local.remove('supabase_pending_changes');
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      pendingChanges: this.pendingChanges.length
    };
  }

  /**
   * Get detailed sync status including last sync time
   * @returns {Promise<Object>} Detailed sync status object
   */
  async getDetailedSyncStatus() {
    const lastSyncResult = await chrome.storage.local.get('last_sync_time');
    const pendingChanges = await this.getPendingChangesFromStorage();

    return {
      pendingCount: pendingChanges.length,
      lastSyncTime: lastSyncResult.last_sync_time || null,
      isOnline: navigator.onLine,
      syncInProgress: this.syncInProgress,
      tables: [...new Set(pendingChanges.map(c => c.table))],
      oldestPendingChange: pendingChanges.length > 0
        ? Math.min(...pendingChanges.map(c => c.timestamp))
        : null
    };
  }

  /**
   * Get pending changes from storage
   * @returns {Promise<Array>} Array of pending changes
   */
  async getPendingChangesFromStorage() {
    const result = await chrome.storage.local.get('supabase_pending_changes');
    return result.supabase_pending_changes || [];
  }

  /**
   * Record successful sync time
   * @returns {Promise<void>}
   */
  async recordSyncTime() {
    await chrome.storage.local.set({
      last_sync_time: new Date().toISOString()
    });
    console.log('[LocalCache] Recorded sync time');
  }

  /**
   * Sync pending changes with retry logic and exponential backoff
   * @param {number} maxRetries - Maximum retry attempts (default: 3)
   * @returns {Promise<{success: boolean, synced: number, failed: number, attempts: number, error?: string}>}
   */
  async syncWithRetry(maxRetries = 3) {
    let attempt = 0;
    let lastError = null;

    console.log(`[LocalCache] Starting sync with retry (max ${maxRetries} attempts)`);

    while (attempt < maxRetries) {
      try {
        // Check preconditions
        if (!navigator.onLine) {
          console.log('[LocalCache] Offline - cannot sync');
          return { success: false, synced: 0, failed: 0, attempts: attempt, error: 'Offline' };
        }

        if (this.syncInProgress) {
          console.log('[LocalCache] Sync already in progress');
          return { success: false, synced: 0, failed: 0, attempts: attempt, error: 'Sync already in progress' };
        }

        // Process pending changes
        const result = await this.processPendingChangesWithCount();

        if (result.success) {
          console.log(`[LocalCache] Sync succeeded on attempt ${attempt + 1}`);
          await this.recordSyncTime();
          return {
            success: true,
            synced: result.synced,
            failed: result.failed,
            attempts: attempt + 1
          };
        }

        // If we got here but not successful, treat as failure for retry
        throw new Error(result.error || 'Sync returned unsuccessful');

      } catch (error) {
        lastError = error;
        attempt++;
        console.log(`[LocalCache] Sync attempt ${attempt} failed:`, error.message);

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s, 8s...
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`[LocalCache] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error(`[LocalCache] Sync failed after ${maxRetries} attempts:`, lastError);
    return {
      success: false,
      synced: 0,
      failed: this.pendingChanges.length,
      attempts: attempt,
      error: lastError?.message || 'Unknown error'
    };
  }

  /**
   * Process pending changes and return count of synced/failed items
   * @returns {Promise<{success: boolean, synced: number, failed: number, error?: string}>}
   */
  async processPendingChangesWithCount() {
    console.log('[LocalCache] processPendingChangesWithCount called');

    if (!this.isOnline || this.syncInProgress) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        error: !this.isOnline ? 'Offline' : 'Sync in progress'
      };
    }

    if (this.pendingChanges.length === 0) {
      return { success: true, synced: 0, failed: 0 };
    }

    // Check if Supabase is configured
    const supabaseConfigured = self.isSupabaseConfigured && self.isSupabaseConfigured();
    if (!supabaseConfigured) {
      return { success: false, synced: 0, failed: 0, error: 'Supabase not configured' };
    }

    // Check if authenticated
    const isAuth = await self.supabaseAuth?.isAuthenticated();
    if (!isAuth) {
      return { success: false, synced: 0, failed: 0, error: 'Not authenticated' };
    }

    this.syncInProgress = true;
    const totalCount = this.pendingChanges.length;
    console.log(`[LocalCache] Processing ${totalCount} pending changes with count tracking`);

    const failed = [];
    const userId = await self.supabaseAuth.getUserId();
    let synced = 0;

    for (const change of this.pendingChanges) {
      try {
        const result = await this.syncChangeToSupabase(change, userId);
        if (!result.success) {
          failed.push(change);
        } else {
          synced++;
        }
      } catch (error) {
        console.error('[LocalCache] Failed to sync change:', error);
        failed.push(change);
      }
    }

    // Update pending changes to only failed ones
    this.pendingChanges = failed;
    await chrome.storage.local.set({ supabase_pending_changes: this.pendingChanges });

    this.syncInProgress = false;

    console.log(`[LocalCache] Sync complete. ${synced} synced, ${failed.length} failed.`);

    // Notify sync status
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'SYNC_STATUS_UPDATE',
        status: failed.length === 0 ? 'synced' : 'pending',
        synced: synced,
        pendingCount: failed.length
      }).catch(() => {});
    }

    return {
      success: failed.length === 0,
      synced: synced,
      failed: failed.length
    };
  }

  /**
   * Migrate existing data to Supabase
   * Call this when user first signs in to sync existing local data
   */
  async migrateExistingData() {
    console.log('[LocalCache] Migrating existing local data to Supabase...');

    const userId = await self.supabaseAuth?.getUserId();
    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    // Get all relevant storage keys
    const keysToMigrate = Object.keys(STORAGE_TABLE_MAP);
    const allData = await chrome.storage.local.get(keysToMigrate);

    const results = {};

    for (const [localKey, table] of Object.entries(STORAGE_TABLE_MAP)) {
      const data = allData[localKey];
      if (!data) continue;

      try {
        const items = Array.isArray(data) ? data : [data];
        let successCount = 0;

        // Get appropriate conflict key for this table
        const conflictKey = this.getConflictKey(table);

        for (const item of items) {
          // Add user_id and prepare for Supabase
          const dataWithUser = this.prepareForSupabase(item, userId, table);

          const { error } = await self.supabase.from(table).upsert(dataWithUser, { onConflict: conflictKey });

          if (!error) {
            successCount++;
          } else {
            console.error(`[LocalCache] Migration error for ${table}:`, error);
          }
        }

        results[table] = { success: true, count: successCount, total: items.length };
        console.log(`[LocalCache] Migrated ${successCount}/${items.length} items to ${table}`);

      } catch (error) {
        console.error(`[LocalCache] Migration error for ${localKey}:`, error);
        results[table] = { success: false, error: error.message };
      }
    }

    return { success: true, results };
  }

  /**
   * Field mappings for camelCase to snake_case conversion by table
   */
  static FIELD_MAPPINGS = {
    'linkedin_profiles': {
      'linkedinId': 'linkedin_id',
      'firstName': 'first_name',
      'lastName': 'last_name',
      'profilePicture': 'profile_picture',
      'publicIdentifier': 'public_identifier',
      'memberUrn': 'member_urn',
      'connectionCount': 'connections_count',
      'followerCount': 'followers_count',
      'profileUrl': 'profile_url',
      'backgroundImage': 'background_image',
      'lastUpdated': 'last_updated',
    },
    'linkedin_analytics': {
      'membersReached': 'members_reached',
      'profileViews': 'profile_views',
      'searchAppearances': 'search_appearances',
      'postCount': 'post_count',
      'reactionCount': 'reaction_count',
      'commentCount': 'comment_count',
      'shareCount': 'share_count',
      'capturedAt': 'captured_at',
      'lastUpdated': 'last_updated',
      'topPosts': 'top_posts',
      'pageType': 'page_type',
    },
    'post_analytics': {
      'activityUrn': 'activity_urn',
      'postText': 'post_text',
      'postType': 'post_type',
      'impressionCount': 'impression_count',
      'likeCount': 'like_count',
      'commentCount': 'comment_count',
      'repostCount': 'repost_count',
      'shareCount': 'share_count',
      'clickCount': 'click_count',
      'engagementRate': 'engagement_rate',
      'postedAt': 'posted_at',
      'capturedAt': 'captured_at',
      'firstCaptured': 'first_captured',
      'lastUpdated': 'last_updated',
    },
    'audience_data': {
      'totalFollowers': 'total_followers',
      'newFollowers': 'new_followers',
      'followerGrowth': 'follower_growth',
      'growthRate': 'growth_rate',
      'topLocations': 'top_locations',
      'topIndustries': 'top_industries',
      'topJobFunctions': 'top_job_functions',
      'topSeniorities': 'top_seniorities',
      'capturedAt': 'captured_at',
      'lastUpdated': 'last_updated',
    },
    'connections': {
      'linkedinId': 'linkedin_id',
      'firstName': 'first_name',
      'lastName': 'last_name',
      'profilePicture': 'profile_picture',
      'publicIdentifier': 'public_identifier',
      'connectedAt': 'connected_at',
      'connectionDegree': 'connection_degree',
    },
    'feed_posts': {
      'authorId': 'author_id',
      'authorName': 'author_name',
      'authorHeadline': 'author_headline',
      'authorProfilePicture': 'author_profile_picture',
      'authorUrn': 'author_urn',
      'postText': 'post_text',
      'postType': 'post_type',
      'activityUrn': 'activity_urn',
      'likeCount': 'like_count',
      'commentCount': 'comment_count',
      'repostCount': 'repost_count',
      'postedAt': 'posted_at',
      'capturedAt': 'captured_at',
    },
    'my_posts': {
      'activityUrn': 'activity_urn',
      'postText': 'post_text',
      'postType': 'post_type',
      'impressionCount': 'impression_count',
      'likeCount': 'like_count',
      'commentCount': 'comment_count',
      'repostCount': 'repost_count',
      'postedAt': 'posted_at',
      'capturedAt': 'captured_at',
    },
    'captured_apis': {
      'apiUrl': 'api_url',
      'apiCategory': 'api_category',
      'responseSize': 'response_size',
      'capturedAt': 'captured_at',
    },
    'capture_stats': {
      'totalCaptures': 'total_captures',
      'successfulCaptures': 'successful_captures',
      'failedCaptures': 'failed_captures',
      'capturesByType': 'captures_by_type',
      'lastCapture': 'last_capture',
      'captureHistory': 'capture_history',
      'apiCallsCaptured': 'api_calls_captured',
      'feedPostsCaptured': 'feed_posts_captured',
      'analyticsCaptures': 'analytics_captures',
      'domExtractions': 'dom_extractions',
    },
    'notifications': {
      'notificationUrn': 'notification_urn',
      'notificationType': 'notification_type',
      'actorName': 'actor_name',
      'actorHeadline': 'actor_headline',
      'actorProfileUrl': 'actor_profile_url',
      'isRead': 'is_read',
      'receivedAt': 'received_at',
      'rawData': 'raw_data',
    },
    'invitations': {
      'invitationUrn': 'invitation_urn',
      'invitationType': 'invitation_type',
      'actorName': 'actor_name',
      'actorHeadline': 'actor_headline',
      'actorProfileUrl': 'actor_profile_url',
      'actorProfilePicture': 'actor_profile_picture',
      'sentAt': 'sent_at',
      'rawData': 'raw_data',
    },
    'network_data': {
      'dataType': 'data_type',
      'personName': 'person_name',
      'personHeadline': 'person_headline',
      'personProfileUrl': 'person_profile_url',
      'personProfilePicture': 'person_profile_picture',
      'publicIdentifier': 'public_identifier',
      'entityUrn': 'entity_urn',
      'suggestionReason': 'suggestion_reason',
      'rawData': 'raw_data',
    },
    'analytics_history': {
      'membersReached': 'members_reached',
      'profileViews': 'profile_views',
      'createdAt': 'created_at',
    },
  };

  /**
   * Prepare data for Supabase by mapping local fields to table columns
   */
  prepareForSupabase(data, userId, table) {
    if (!data || typeof data !== 'object') return data;

    const prepared = { ...data, user_id: userId };

    // Add timestamps if not present
    if (!prepared.created_at) {
      prepared.created_at = new Date().toISOString();
    }
    prepared.updated_at = new Date().toISOString();

    // Add captured_at if not present
    if (!prepared.captured_at) {
      prepared.captured_at = new Date().toISOString();
    }

    // Apply field mappings for the specific table
    const mapping = LocalCache.FIELD_MAPPINGS[table];
    if (mapping) {
      for (const [camelCase, snakeCase] of Object.entries(mapping)) {
        if (prepared[camelCase] !== undefined) {
          prepared[snakeCase] = prepared[camelCase];
          delete prepared[camelCase];
        }
      }
    }

    // Remove internal fields that shouldn't go to Supabase
    delete prepared._localId;
    delete prepared._pendingSync;
    delete prepared.source;

    return prepared;
  }
}

// Create singleton instance
const localCache = new LocalCache();

// Export for use in service worker
if (typeof self !== 'undefined') {
  self.localCache = localCache;
  self.LocalCache = LocalCache;
  self.STORAGE_TABLE_MAP = STORAGE_TABLE_MAP;
  self.TABLE_STORAGE_MAP = TABLE_STORAGE_MAP;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { localCache, LocalCache, STORAGE_TABLE_MAP, TABLE_STORAGE_MAP };
}
