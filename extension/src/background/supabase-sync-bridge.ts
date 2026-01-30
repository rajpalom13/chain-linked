/**
 * Supabase Sync Bridge
 * @description TypeScript bridge to connect service worker storage to Supabase sync
 * @module background/supabase-sync-bridge
 */

// Storage keys that should sync to Supabase
export const SYNCABLE_STORAGE_KEYS = [
  'linkedin_profile',
  'linkedin_analytics',
  'linkedin_post_analytics',
  'linkedin_audience',
  'linkedin_connections',
  'linkedin_feed_posts',
  'linkedin_my_posts',
  'linkedin_comments',
  'linkedin_followers',
  'captured_apis',
  'capture_stats',
  'extension_settings',
] as const;

export type SyncableStorageKey = typeof SYNCABLE_STORAGE_KEYS[number];

// Storage key to Supabase table mapping
export const STORAGE_TABLE_MAP: Record<string, string> = {
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
  'capture_stats': 'capture_stats',
  'extension_settings': 'extension_settings',
  // Additional tables
  'linkedin_notifications': 'notifications',
  'linkedin_invitations': 'invitations',
};

// Field mapping for camelCase to snake_case conversion
export const FIELD_MAPPINGS: Record<string, Record<string, string>> = {
  'linkedin_profiles': {
    'linkedinId': 'linkedin_id',
    'firstName': 'first_name',
    'lastName': 'last_name',
    'fullName': 'full_name',
    'name': 'full_name',  // alias
    'profilePicture': 'profile_picture_url',
    'profilePictureUrl': 'profile_picture_url',
    'profilePhoto': 'profile_picture_url',  // alias
    'publicIdentifier': 'public_identifier',
    'memberUrn': 'profile_urn',
    'profileUrn': 'profile_urn',
    'connectionCount': 'connections_count',
    'connectionsCount': 'connections_count',
    'followerCount': 'followers_count',
    'followersCount': 'followers_count',
    'profileUrl': 'profile_url',
    'backgroundImage': 'background_image_url',
    'backgroundImageUrl': 'background_image_url',
    'aboutSection': 'summary',
    'about': 'summary',  // alias
    'location': 'location',
    'industry': 'industry',
  },
  'linkedin_analytics': {
    'membersReached': 'members_reached',
    'profileViews': 'profile_views',
    'searchAppearances': 'search_appearances',
    'newFollowers': 'new_followers',
    'postCount': 'post_count',
    'reactionCount': 'reaction_count',
    'commentCount': 'comment_count',
    'shareCount': 'share_count',
    'capturedAt': 'captured_at',
    'lastUpdated': 'updated_at',
    'topPosts': 'top_posts',
    'pageType': 'page_type',
    // Additional analytics field mappings
    'impressionGrowth': 'impression_growth',
    'growth': 'growth_percentage',
    'growthPercentage': 'growth_percentage',
    'engagements': 'engagements',  // Keep same name but ensure mapping exists
    'engagementRate': 'engagement_rate',
    'rawData': 'raw_data',
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
  },
  'extension_settings': {
    'autoCapture': 'auto_capture_enabled',
    'storeImages': 'store_images',
    'captureNotifications': 'capture_notifications',
    'growthAlerts': 'growth_alerts',
    'captureFeed': 'capture_feed',
    'captureAnalytics': 'capture_analytics',
    'captureProfile': 'capture_profile',
    'captureMessaging': 'capture_messaging',
    'syncEnabled': 'sync_enabled',
    'syncInterval': 'sync_interval',
    'darkMode': 'dark_mode',
    'notificationsEnabled': 'notifications_enabled',
  },
};

// Known columns for each table - used to filter unknown fields
// IMPORTANT: Only include columns that actually exist in the database schema
// Verified against Supabase schema on 2026-01-31
export const TABLE_COLUMNS: Record<string, string[]> = {
  'linkedin_profiles': [
    // Verified columns from database schema
    'id', 'user_id', 'profile_urn', 'public_identifier', 'first_name', 'last_name',
    'headline', 'location', 'industry', 'profile_picture_url', 'background_image_url',
    'connections_count', 'followers_count', 'summary', 'raw_data',
    'captured_at', 'updated_at',
    // Note: linkedin_id, full_name, profile_url, created_at do NOT exist in database
  ],
  'linkedin_analytics': [
    // Verified columns from database schema
    'id', 'user_id', 'page_type', 'impressions', 'members_reached', 'engagements',
    'new_followers', 'profile_views', 'search_appearances', 'top_posts', 'raw_data',
    'captured_at', 'updated_at',
    // Note: engagement_rate, impression_growth, growth_percentage, post_count,
    // reaction_count, comment_count, share_count, created_at do NOT exist in database
  ],
  'post_analytics': [
    // Verified columns from database schema
    'id', 'user_id', 'activity_urn', 'post_content', 'post_type', 'impressions',
    'members_reached', 'unique_views', 'reactions', 'comments', 'reposts',
    'engagement_rate', 'profile_viewers', 'followers_gained', 'demographics',
    'raw_data', 'posted_at', 'captured_at', 'updated_at',
  ],
  'audience_data': [
    // Verified columns from database schema
    'id', 'user_id', 'total_followers', 'follower_growth',
    'demographics_preview', 'top_job_titles', 'top_companies', 'top_locations',
    'top_industries', 'raw_data', 'captured_at', 'updated_at',
    // Note: follower_growth_formatted does NOT exist in database
  ],
  'extension_settings': [
    'id', 'user_id', 'auto_capture_enabled', 'capture_feed', 'capture_analytics',
    'capture_profile', 'capture_messaging', 'sync_enabled', 'sync_interval',
    'dark_mode', 'notifications_enabled', 'raw_settings', 'created_at', 'updated_at',
  ],
  'captured_apis': [
    'id', 'user_id', 'category', 'endpoint', 'method', 'response_hash',
    'response_data', 'captured_at',
  ],
  'capture_stats': [
    'id', 'user_id', 'date', 'api_calls_captured', 'feed_posts_captured',
    'analytics_captures', 'dom_extractions', 'created_at', 'updated_at',
  ],
};

/**
 * Interface for pending sync changes
 */
interface PendingChange {
  table: string;
  operation: 'upsert' | 'insert' | 'update' | 'delete';
  data: Record<string, unknown>;
  localKey: string;
  timestamp: number;
}

/**
 * Interface for sync status
 */
export interface SyncStatus {
  isAuthenticated: boolean;
  userId: string | null;
  pendingCount: number;
  lastSyncTime: number | null;
  isSyncing: boolean;
}

/**
 * Current user ID for sync operations
 */
let currentUserId: string | null = null;
let isSyncing = false;
let lastSyncTime: number | null = null;

/**
 * Check if a storage key should be synced to Supabase
 */
export function isSyncableKey(key: string): boolean {
  return SYNCABLE_STORAGE_KEYS.includes(key as SyncableStorageKey);
}

/**
 * Get the Supabase table name for a storage key
 */
export function getTableForKey(key: string): string | null {
  return STORAGE_TABLE_MAP[key] || null;
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function prepareForSupabase(
  data: Record<string, unknown>,
  table: string,
  userId: string | null
): Record<string, unknown> {
  if (!data || typeof data !== 'object') return data;

  // Log input data for debugging
  console.log(`[SYNC][PREPARE] Input data for ${table}:`, JSON.stringify(data, null, 2));

  const prepared: Record<string, unknown> = { ...data };

  // Tables that use user_id as conflict key - don't include 'id' field
  // This lets PostgreSQL handle id auto-generation and proper upsert behavior
  const userIdConflictTables = ['linkedin_profiles', 'audience_data', 'extension_settings'];

  if (userIdConflictTables.includes(table)) {
    // Remove id field for user_id conflict tables - let DB handle it
    delete prepared.id;
  } else {
    // Generate UUID if missing (required for upsert with onConflict: 'id')
    if (!prepared.id) {
      prepared.id = generateUUID();
    }
  }

  // Add user_id if authenticated
  if (userId) {
    prepared.user_id = userId;
  }

  const now = new Date().toISOString();

  // Tables that have created_at column
  const tablesWithCreatedAt = ['extension_settings', 'capture_stats', 'post_analytics'];

  // Add timestamps if missing - use captured_at for analytics tables
  if (!prepared.captured_at) {
    prepared.captured_at = now;
  }
  // Only add created_at for tables that actually have this column
  if (tablesWithCreatedAt.includes(table) && !prepared.created_at) {
    prepared.created_at = now;
  }
  prepared.updated_at = now;

  // Apply field mappings for the specific table
  const mapping = FIELD_MAPPINGS[table];
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

  // Data type conversions for specific tables
  if (table === 'audience_data') {
    // Convert follower_growth from string like "0%" or "302.9%" to integer
    if (typeof prepared.follower_growth === 'string') {
      const growthStr = prepared.follower_growth as string;
      const numericValue = parseFloat(growthStr.replace('%', ''));
      prepared.follower_growth = isNaN(numericValue) ? null : Math.round(numericValue);
      // Note: follower_growth_formatted removed - column does not exist in database
      // The formatted string is preserved in raw_data if needed
    }
  }

  // Ensure numeric fields are numbers for linkedin_analytics
  if (table === 'linkedin_analytics') {
    const numericFields = [
      'impressions', 'engagements', 'members_reached', 'profile_views',
      'search_appearances', 'new_followers', 'post_count', 'reaction_count',
      'comment_count', 'share_count', 'impression_growth', 'growth_percentage'
    ];
    numericFields.forEach(field => {
      if (prepared[field] !== undefined && typeof prepared[field] === 'string') {
        // Remove commas and parse as integer
        const strValue = prepared[field] as string;
        const parsed = parseInt(strValue.replace(/,/g, ''), 10);
        prepared[field] = isNaN(parsed) ? 0 : parsed;
        console.log(`[SYNC][PREPARE] Converted ${field} from "${strValue}" to ${prepared[field]}`);
      }
    });
    // Handle engagement_rate as float
    if (prepared.engagement_rate !== undefined && typeof prepared.engagement_rate === 'string') {
      const strValue = prepared.engagement_rate as string;
      const parsed = parseFloat(strValue.replace(/[%,]/g, ''));
      prepared.engagement_rate = isNaN(parsed) ? 0 : parsed;
      console.log(`[SYNC][PREPARE] Converted engagement_rate from "${strValue}" to ${prepared.engagement_rate}`);
    }
  }

  // Ensure numeric fields are numbers for linkedin_profiles
  if (table === 'linkedin_profiles') {
    const numericFields = ['connections_count', 'followers_count'];
    numericFields.forEach(field => {
      if (prepared[field] !== undefined && typeof prepared[field] === 'string') {
        const strValue = prepared[field] as string;
        const parsed = parseInt(strValue.replace(/,/g, ''), 10);
        prepared[field] = isNaN(parsed) ? 0 : parsed;
        console.log(`[SYNC][PREPARE] Converted ${field} from "${strValue}" to ${prepared[field]}`);
      }
    });
  }

  // Filter to only known columns for this table
  const knownColumns = TABLE_COLUMNS[table];
  if (knownColumns) {
    const filtered: Record<string, unknown> = {};
    const unknownFields: string[] = [];
    for (const key of Object.keys(prepared)) {
      if (knownColumns.includes(key)) {
        filtered[key] = prepared[key];
      } else {
        unknownFields.push(key);
        // Store unknown fields in raw_data if the table supports it
        if (knownColumns.includes('raw_data') || knownColumns.includes('raw_settings')) {
          const rawKey = knownColumns.includes('raw_settings') ? 'raw_settings' : 'raw_data';
          if (!filtered[rawKey]) {
            filtered[rawKey] = {};
          }
          (filtered[rawKey] as Record<string, unknown>)[key] = prepared[key];
        }
      }
    }
    if (unknownFields.length > 0) {
      console.log(`[SYNC][PREPARE] Unknown fields for ${table} moved to raw_data:`, unknownFields);
    }
    console.log(`[SYNC][PREPARE] Output data for ${table}:`, JSON.stringify(filtered, null, 2));
    return filtered;
  }

  console.log(`[SYNC][PREPARE] Output data for ${table} (no column filter):`, JSON.stringify(prepared, null, 2));
  return prepared;
}

/**
 * Get pending changes from storage
 */
async function getPendingChanges(): Promise<PendingChange[]> {
  try {
    const result = await chrome.storage.local.get('supabase_pending_changes');
    return result.supabase_pending_changes || [];
  } catch (error) {
    console.error('[SyncBridge] Error getting pending changes:', error);
    return [];
  }
}

/**
 * Save pending changes to storage
 */
async function savePendingChanges(changes: PendingChange[]): Promise<void> {
  try {
    await chrome.storage.local.set({ supabase_pending_changes: changes });
  } catch (error) {
    console.error('[SyncBridge] Error saving pending changes:', error);
  }
}

/**
 * Queue data for sync to Supabase
 */
export async function queueForSync(
  localKey: string,
  data: Record<string, unknown>,
  operation: 'upsert' | 'insert' | 'update' = 'upsert'
): Promise<void> {
  const table = getTableForKey(localKey);
  if (!table) {
    console.log(`[SyncBridge] No table mapping for key: ${localKey}`);
    return;
  }

  const pendingChanges = await getPendingChanges();

  const change: PendingChange = {
    table,
    operation,
    data,
    localKey,
    timestamp: Date.now(),
  };

  // Check if there's already a pending change for this key
  const existingIndex = pendingChanges.findIndex(
    (c) => c.localKey === localKey && c.table === table
  );

  if (existingIndex >= 0) {
    // Update existing pending change
    pendingChanges[existingIndex] = change;
  } else {
    // Add new pending change
    pendingChanges.push(change);
  }

  await savePendingChanges(pendingChanges);
  console.log(`[SyncBridge] Queued ${localKey} for sync to ${table}`);

  // Notify popup about pending change
  try {
    chrome.runtime.sendMessage({
      type: 'PENDING_CHANGE_ADDED',
      count: pendingChanges.length,
    }).catch(() => {}); // Ignore if no listener
  } catch {
    // Ignore errors when popup is closed
  }
}

/**
 * Save data to local storage and queue for sync
 */
export async function saveWithSync<T extends Record<string, unknown>>(
  key: string,
  data: T,
  skipSync = false
): Promise<{ success: boolean; error?: string }> {
  try {
    // Always save to local storage first
    await chrome.storage.local.set({ [key]: data });

    // Queue for sync if this is a syncable key and sync is not skipped
    if (!skipSync && isSyncableKey(key) && currentUserId) {
      await queueForSync(key, data);

      // Trigger immediate sync (don't wait for periodic sync)
      // Use setTimeout to avoid blocking the save operation
      setTimeout(async () => {
        try {
          const result = await processPendingChanges();
          console.log(`[SyncBridge] Immediate sync complete: ${result.success} success, ${result.failed} failed`);
        } catch (err) {
          console.error('[SyncBridge] Immediate sync error:', err);
        }
      }, 100);
    }

    return { success: true };
  } catch (error) {
    console.error('[SyncBridge] Save error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Append data to array in storage and queue for sync
 */
export async function appendWithSync<T extends Record<string, unknown>>(
  key: string,
  newData: T,
  maxItems = 1000,
  skipSync = false
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const result = await chrome.storage.local.get(key);
    let currentArray: T[] = result[key] || [];

    const dataWithTimestamp = {
      ...newData,
      capturedAt: new Date().toISOString(),
    } as T;

    // Check for duplicates (by id or activityUrn)
    const idField = 'id' in newData ? 'id' : 'activityUrn' in newData ? 'activityUrn' : null;
    if (idField && newData[idField]) {
      const existingIndex = currentArray.findIndex(
        (item) => item[idField] === newData[idField]
      );
      if (existingIndex >= 0) {
        currentArray[existingIndex] = dataWithTimestamp;
      } else {
        currentArray.push(dataWithTimestamp);
      }
    } else {
      currentArray.push(dataWithTimestamp);
    }

    // Trim array to max items
    currentArray = currentArray.slice(-maxItems);

    // Save to local storage
    await chrome.storage.local.set({ [key]: currentArray });

    // Queue for sync if this is a syncable key
    if (!skipSync && isSyncableKey(key) && currentUserId) {
      // For arrays, we queue the individual item, not the whole array
      await queueForSync(key, dataWithTimestamp);
    }

    return { success: true, count: currentArray.length };
  } catch (error) {
    console.error('[SyncBridge] Append error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process all pending changes and sync to Supabase
 */
export async function processPendingChanges(): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  if (isSyncing) {
    console.log('[SyncBridge] Sync already in progress');
    return { success: 0, failed: 0, errors: ['Sync already in progress'] };
  }

  if (!navigator.onLine) {
    console.log('[SyncBridge] Offline - skipping sync');
    return { success: 0, failed: 0, errors: ['Offline'] };
  }

  if (!currentUserId) {
    console.log('[SyncBridge] Not authenticated - skipping sync');
    return { success: 0, failed: 0, errors: ['Not authenticated'] };
  }

  isSyncing = true;
  const errors: string[] = [];
  let success = 0;
  let failed = 0;

  try {
    // Notify sync started
    chrome.runtime.sendMessage({ type: 'SYNC_STARTED' }).catch(() => {});

    const pendingChanges = await getPendingChanges();
    if (pendingChanges.length === 0) {
      console.log('[SyncBridge] No pending changes to sync');
      return { success: 0, failed: 0, errors: [] };
    }

    console.log(`[SyncBridge] Processing ${pendingChanges.length} pending changes...`);

    // Group by table for batch operations
    const byTable: Record<string, PendingChange[]> = {};
    for (const change of pendingChanges) {
      if (!byTable[change.table]) {
        byTable[change.table] = [];
      }
      byTable[change.table].push(change);
    }

    // Get supabase client from global scope (loaded in service worker)
    const supabase = (self as unknown as { supabase?: { from: (table: string) => unknown } }).supabase;
    if (!supabase) {
      console.error('[SyncBridge] Supabase client not available');
      return { success: 0, failed: pendingChanges.length, errors: ['Supabase client not available'] };
    }

    const processedChanges: PendingChange[] = [];

    for (const [table, changes] of Object.entries(byTable)) {
      try {
        console.log(`[SYNC][PROCESS] Processing ${changes.length} changes for ${table}`);

        // Prepare all data for this table
        const records = changes.map((c) =>
          prepareForSupabase(c.data, table, currentUserId)
        );

        console.log(`[SYNC][PROCESS] Syncing ${records.length} records to ${table}`);
        console.log(`[SYNC][PROCESS] First record:`, JSON.stringify(records[0], null, 2));
        if (records.length > 1) {
          console.log(`[SYNC][PROCESS] Additional records count: ${records.length - 1}`);
        }

        // Use user_id as conflict key for tables with unique user_id constraint
        const userIdConflictTables = ['linkedin_profiles', 'audience_data', 'extension_settings'];
        const isUserIdTable = userIdConflictTables.includes(table);

        let error: { message: string } | undefined;

        if (isUserIdTable && currentUserId) {
          // For user_id tables: use UPSERT with user_id as conflict key
          console.log(`[SyncBridge] Using UPSERT strategy for ${table} with onConflict: user_id`);

          for (const record of records) {
            // Ensure user_id is set
            const recordWithUser = { ...record, user_id: currentUserId };

            // Use upsert with user_id as the conflict key
            const tableClient = supabase.from(table) as {
              upsert: (data: unknown, options?: { onConflict?: string }) => Promise<{ data?: unknown[]; error?: { message: string } }>;
            };

            const upsertResult = await tableClient.upsert(recordWithUser, { onConflict: 'user_id' });
            console.log(`[SyncBridge] Upsert result for ${table}:`, JSON.stringify(upsertResult));

            if (upsertResult.error) {
              console.error(`[SyncBridge] Upsert failed for ${table}:`, upsertResult.error);
              error = upsertResult.error;
            } else {
              console.log(`[SyncBridge] Successfully upserted record to ${table}`);
            }
          }
        } else {
          // For other tables: use standard upsert with id conflict
          const tableClient = supabase.from(table) as {
            upsert: (data: unknown[], options?: { onConflict?: string }) => Promise<{ error?: { message: string } }>;
          };

          console.log(`[SyncBridge] Upserting to ${table} with conflictKey: id`);
          const result = await tableClient.upsert(records, { onConflict: 'id' });
          console.log(`[SyncBridge] Upsert result for ${table}:`, JSON.stringify(result));
          error = result.error;
        }

        if (error) {
          console.error(`[ERROR][SYNC] Sync error for ${table}:`, error);
          errors.push(`${table}: ${error.message}`);

          // Check if this is a duplicate key error for user_id conflict tables
          // If so, the data already exists - remove from pending queue
          const isDuplicateUserIdError =
            error.message.includes('duplicate key value violates unique constraint') &&
            error.message.includes('user_id') &&
            userIdConflictTables.includes(table);

          if (isDuplicateUserIdError) {
            console.log(`[SyncBridge] Duplicate user_id error for ${table} - data already exists, removing from queue`);
            processedChanges.push(...changes); // Mark as processed to remove from queue
            // Don't count as failed since data is already in DB
          } else {
            failed += changes.length;
          }
        } else {
          console.log(`[SYNC][SUCCESS] Successfully synced ${changes.length} records to ${table}`);
          success += changes.length;
          processedChanges.push(...changes);
        }
      } catch (err) {
        console.error(`[ERROR][SYNC] Batch sync error for ${table}:`, err);
        errors.push(`${table}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        failed += changes.length;
      }
    }

    // Remove processed changes from pending queue
    if (processedChanges.length > 0) {
      const remainingChanges = pendingChanges.filter(
        (change) =>
          !processedChanges.some(
            (p) => p.timestamp === change.timestamp && p.table === change.table
          )
      );
      await savePendingChanges(remainingChanges);
    }

    lastSyncTime = Date.now();
    console.log(`[SyncBridge] Sync complete: ${success} success, ${failed} failed`);

    // Notify sync complete
    chrome.runtime.sendMessage({
      type: 'SYNC_COMPLETE',
      data: { success, failed },
    }).catch(() => {});

    return { success, failed, errors };
  } catch (error) {
    console.error('[SyncBridge] Sync error:', error);
    return {
      success,
      failed: failed || 1,
      errors: [...errors, error instanceof Error ? error.message : 'Unknown error'],
    };
  } finally {
    isSyncing = false;
  }
}

/**
 * Migrate existing local data to Supabase
 */
export async function migrateExistingData(): Promise<{
  success: boolean;
  migrated: number;
  failed: number;
  errors: string[];
}> {
  if (!currentUserId) {
    console.log('[SyncBridge] No user - cannot migrate');
    return { success: false, migrated: 0, failed: 0, errors: ['Not authenticated'] };
  }

  console.log('[SyncBridge] Starting data migration...');
  const errors: string[] = [];
  let migrated = 0;
  let failed = 0;

  for (const localKey of SYNCABLE_STORAGE_KEYS) {
    try {
      const result = await chrome.storage.local.get(localKey);
      const data = result[localKey];

      if (data) {
        // Queue for sync
        await queueForSync(localKey, data);
        migrated++;
        console.log(`[SyncBridge] Queued ${localKey} for migration`);
      }
    } catch (error) {
      console.error(`[SyncBridge] Migration failed for ${localKey}:`, error);
      errors.push(`${localKey}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failed++;
    }
  }

  console.log(`[SyncBridge] Migration queued: ${migrated} items`);

  // Process all pending changes immediately
  const syncResult = await processPendingChanges();

  // Mark migration as complete
  await chrome.storage.local.set({
    supabase_migration_complete: true,
    supabase_migration_date: new Date().toISOString(),
    supabase_migration_user: currentUserId,
  });

  return {
    success: true,
    migrated,
    failed: failed + syncResult.failed,
    errors: [...errors, ...syncResult.errors],
  };
}

/**
 * Set the current user ID for sync operations
 */
export function setCurrentUserId(userId: string | null): void {
  currentUserId = userId;
  console.log(`[SyncBridge] User ID set: ${userId ? userId.substring(0, 8) + '...' : 'null'}`);
}

/**
 * Get current user ID
 */
export function getCurrentUserId(): string | null {
  return currentUserId;
}

/**
 * Get sync status
 */
export async function getSyncStatusInfo(): Promise<SyncStatus> {
  const pendingChanges = await getPendingChanges();
  return {
    isAuthenticated: !!currentUserId,
    userId: currentUserId,
    pendingCount: pendingChanges.length,
    lastSyncTime,
    isSyncing,
  };
}

/**
 * Extended sync status with more details
 */
export interface DetailedSyncStatus extends SyncStatus {
  isOnline: boolean;
  tables: string[];
  oldestPendingChange: number | null;
}

/**
 * Get detailed sync status including last sync time and affected tables
 */
export async function getDetailedSyncStatus(): Promise<DetailedSyncStatus> {
  const pendingChanges = await getPendingChanges();
  const lastSyncResult = await chrome.storage.local.get('last_sync_time');

  return {
    isAuthenticated: !!currentUserId,
    userId: currentUserId,
    pendingCount: pendingChanges.length,
    lastSyncTime: lastSyncResult.last_sync_time ? new Date(lastSyncResult.last_sync_time).getTime() : lastSyncTime,
    isSyncing,
    isOnline: navigator.onLine,
    tables: [...new Set(pendingChanges.map(c => c.table))],
    oldestPendingChange: pendingChanges.length > 0
      ? Math.min(...pendingChanges.map(c => c.timestamp))
      : null
  };
}

/**
 * Record successful sync time to storage
 */
async function recordSyncTime(): Promise<void> {
  const now = new Date().toISOString();
  await chrome.storage.local.set({ last_sync_time: now });
  lastSyncTime = Date.now();
  console.log('[SyncBridge] Recorded sync time:', now);
}

/**
 * Sync result with retry information
 */
export interface SyncWithRetryResult {
  success: boolean;
  synced: number;
  failed: number;
  attempts: number;
  error?: string;
}

/**
 * Sync pending changes with retry logic and exponential backoff
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @returns Promise with sync result including attempt count
 */
export async function syncWithRetry(maxRetries = 3): Promise<SyncWithRetryResult> {
  let attempt = 0;
  let lastError: Error | null = null;

  console.log(`[SyncBridge] Starting sync with retry (max ${maxRetries} attempts)`);

  while (attempt < maxRetries) {
    try {
      // Check preconditions
      if (!navigator.onLine) {
        console.log('[SyncBridge] Offline - cannot sync');
        return { success: false, synced: 0, failed: 0, attempts: attempt, error: 'Offline' };
      }

      if (isSyncing) {
        console.log('[SyncBridge] Sync already in progress');
        return { success: false, synced: 0, failed: 0, attempts: attempt, error: 'Sync already in progress' };
      }

      if (!currentUserId) {
        console.log('[SyncBridge] Not authenticated - cannot sync');
        return { success: false, synced: 0, failed: 0, attempts: attempt, error: 'Not authenticated' };
      }

      // Process pending changes
      const result = await processPendingChanges();

      // Check if sync was successful (all items synced or no items to sync)
      if (result.failed === 0) {
        console.log(`[SyncBridge] Sync succeeded on attempt ${attempt + 1}`);
        await recordSyncTime();
        return {
          success: true,
          synced: result.success,
          failed: 0,
          attempts: attempt + 1
        };
      }

      // Some items failed - this counts as a partial failure that should retry
      throw new Error(`${result.failed} items failed to sync: ${result.errors.join(', ')}`);

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      attempt++;
      console.log(`[SyncBridge] Sync attempt ${attempt} failed:`, lastError.message);

      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, 8s...
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`[SyncBridge] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  const pendingChanges = await getPendingChanges();
  console.error(`[SyncBridge] Sync failed after ${maxRetries} attempts:`, lastError);

  return {
    success: false,
    synced: 0,
    failed: pendingChanges.length,
    attempts: attempt,
    error: lastError?.message || 'Unknown error'
  };
}

/**
 * Initialize sync bridge on startup
 */
export async function initSyncBridge(): Promise<void> {
  console.log('[SyncBridge] Initializing...');

  // Check for existing Supabase session using auth module (handles token refresh)
  try {
    // First try to use the auth module if available (handles token refresh)
    const supabaseAuth = (self as unknown as { supabaseAuth?: {
      getSession: () => Promise<{ session?: { user?: { id: string } }; user?: { id: string } }>;
    } }).supabaseAuth;

    if (supabaseAuth) {
      console.log('[SyncBridge] Using auth module to restore session...');
      const { session, user } = await supabaseAuth.getSession();
      const userId = user?.id || session?.user?.id;
      console.log('[SyncBridge] Auth module session check:', session ? 'found' : 'not found', userId ? `user: ${userId.substring(0, 8)}...` : 'no user');

      if (userId) {
        currentUserId = userId;
        console.log(`[SyncBridge] Restored user session via auth module: ${currentUserId!.substring(0, 8)}...`);
      }
    }

    // Always try direct storage as fallback if no user found yet
    if (!currentUserId) {
      console.log('[SyncBridge] Trying direct storage fallback...');
      const result = await chrome.storage.local.get('supabase_session');
      const session = result.supabase_session;
      console.log('[SyncBridge] Storage session check:', session ? 'found' : 'not found', session?.user?.id ? `user: ${session.user.id.substring(0, 8)}...` : 'no user');
      if (session?.user?.id) {
        currentUserId = session.user.id;
        console.log(`[SyncBridge] Restored user session from storage: ${currentUserId!.substring(0, 8)}...`);

        // Also set auth on supabase client if available
        const supabase = (self as unknown as { supabase?: { setAuth: (token: string, userId?: string) => void } }).supabase;
        if (supabase && session.access_token) {
          supabase.setAuth(session.access_token, session.user.id);
          console.log('[SyncBridge] Set auth on Supabase client');
        }
      }
    }

    // Check if we need to run initial migration
    if (currentUserId) {
      const migrationCheck = await chrome.storage.local.get([
        'supabase_migration_complete',
        'supabase_migration_user',
      ]);

      if (
        !migrationCheck.supabase_migration_complete ||
        migrationCheck.supabase_migration_user !== currentUserId
      ) {
        console.log('[SyncBridge] Migration needed for current user');
        // Don't auto-migrate, let user trigger it
      }
    }
  } catch (error) {
    console.error('[SyncBridge] Error checking session:', error);
  }

  // Setup online/offline listeners for auto-sync with retry
  if (typeof window !== 'undefined') {
    window.addEventListener('online', async () => {
      console.log('[SyncBridge] Back online - triggering sync with retry');
      const result = await syncWithRetry(3);
      console.log('[SyncBridge] Online sync result:', result);
    });

    window.addEventListener('offline', () => {
      console.log('[SyncBridge] Gone offline');
    });
  }

  // Also listen in service worker context
  if (typeof self !== 'undefined' && self.addEventListener) {
    self.addEventListener('online', async () => {
      console.log('[SyncBridge] ServiceWorker: Back online - triggering sync with retry');
      const result = await syncWithRetry(3);
      console.log('[SyncBridge] ServiceWorker online sync result:', result);
    });

    self.addEventListener('offline', () => {
      console.log('[SyncBridge] ServiceWorker: Gone offline');
    });
  }

  console.log('[SyncBridge] Initialized');
}

/**
 * Start periodic sync
 */
export function startPeriodicSync(intervalMinutes = 5): void {
  const intervalMs = intervalMinutes * 60 * 1000;

  setInterval(async () => {
    if (navigator.onLine && currentUserId) {
      console.log('[SyncBridge] Running periodic sync...');
      await processPendingChanges();
    }
  }, intervalMs);

  console.log(`[SyncBridge] Periodic sync started (every ${intervalMinutes} minutes)`);
}
