# Supabase Sync Implementation Plan

## Executive Summary

The Chrome extension has complete Supabase infrastructure (client, auth, sync, local-cache) but it's **disconnected** from the main data capture flow. This plan details how to wire the Supabase sync into the capture flow so captured LinkedIn data automatically syncs to the cloud.

---

## Current Architecture Analysis

### Data Flow (Current - Broken)
```
LinkedIn Page
     │
     ▼
content-script.js (intercepts APIs, extracts DOM)
     │
     ▼ chrome.runtime.sendMessage()
     │
service-worker.ts
     │
     ▼ saveToStorage() → chrome.storage.local.set()
     │
Local Storage Only ❌ (Data stops here)
```

### Data Flow (Target - Working)
```
LinkedIn Page
     │
     ▼
content-script.js (intercepts APIs, extracts DOM)
     │
     ▼ chrome.runtime.sendMessage()
     │
service-worker.ts
     │
     ▼ localCache.set() → chrome.storage.local.set()
     │                  → pendingChanges queue
     │                            │
     │                            ▼ (when online + authenticated)
     │                      syncManager.processPendingChanges()
     │                            │
     │                            ▼
     └────────────────────► Supabase Database ✅
```

---

## Key Components

### 1. Local Cache (`lib/supabase/local-cache.js`)
- **Purpose**: Offline-first storage with pending changes queue
- **Storage Mapping**: Maps local keys to Supabase tables
- **Current State**: Complete but unused in capture flow

### 2. Sync Manager (`lib/supabase/sync.js`)
- **Purpose**: Real-time subscriptions + periodic sync
- **Tables**: linkedin_profiles, linkedin_analytics, post_analytics, audience_data, etc.
- **Current State**: Initialized on auth but no data to sync

### 3. Service Worker (`background/service-worker.ts`)
- **Purpose**: Central message handler
- **Issue**: Uses direct `chrome.storage.local.set()` instead of `localCache.set()`

### 4. Auth System (`lib/supabase/auth.js`)
- **Purpose**: Email/password authentication
- **Current State**: Working, UI exists in popup

---

## Implementation Plan

### Phase 1: Refactor Storage Functions (Core Change)

**Goal**: Replace all `chrome.storage.local.set()` calls with `localCache.set()` in data capture paths.

#### 1.1 Modify `saveToStorage()` Function

**File**: `background/service-worker.ts`
**Location**: Lines ~185-200

**Current Code**:
```javascript
async function saveToStorage(key, data) {
  try {
    await chrome.storage.local.set({ [key]: data });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

**New Code**:
```javascript
async function saveToStorage(key, data, options = {}) {
  try {
    // Check if we should use localCache (for Supabase-synced data)
    const syncableKeys = [
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
      'capture_stats'
    ];

    if (self.localCache && syncableKeys.includes(key)) {
      // Use localCache for Supabase-synced data
      await self.localCache.set(key, data, options.skipSync);
    } else {
      // Use direct storage for non-synced data
      await chrome.storage.local.set({ [key]: data });
    }

    return { success: true };
  } catch (error) {
    console.error('saveToStorage error:', error);
    return { success: false, error: error.message };
  }
}
```

#### 1.2 Modify `appendToStorage()` Function

**File**: `background/service-worker.ts`
**Location**: Lines ~220-260

**Current Code**:
```javascript
async function appendToStorage(key, newData, maxItems = 1000) {
  try {
    const result = await chrome.storage.local.get(key);
    let existing = result[key] || [];
    // ... deduplication logic
    await chrome.storage.local.set({ [key]: existing });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

**New Code**:
```javascript
async function appendToStorage(key, newData, maxItems = 1000, options = {}) {
  try {
    const syncableKeys = [
      'captured_apis',
      'linkedin_feed_posts',
      'linkedin_my_posts',
      'linkedin_comments',
      'linkedin_followers'
    ];

    if (self.localCache && syncableKeys.includes(key)) {
      // Use localCache append for Supabase-synced arrays
      await self.localCache.append(key, newData, maxItems, options.skipSync);
    } else {
      // Original logic for non-synced data
      const result = await chrome.storage.local.get(key);
      let existing = result[key] || [];
      // ... existing deduplication logic
      await chrome.storage.local.set({ [key]: existing });
    }

    return { success: true };
  } catch (error) {
    console.error('appendToStorage error:', error);
    return { success: false, error: error.message };
  }
}
```

---

### Phase 2: Enhance Local Cache

**Goal**: Add missing functionality to local-cache.js for complete data mapping.

#### 2.1 Add Comprehensive Field Mapping

**File**: `lib/supabase/local-cache.js`

**Add/Update `prepareForSupabase()` method** to handle all field mappings:

```javascript
prepareForSupabase(data, userId, table) {
  if (!data || typeof data !== 'object') return data;

  const prepared = { ...data };

  // Always add user_id
  prepared.user_id = userId;

  // Add timestamps if missing
  if (!prepared.created_at) {
    prepared.created_at = new Date().toISOString();
  }
  prepared.updated_at = new Date().toISOString();

  // Table-specific field mappings (camelCase → snake_case)
  const fieldMappings = {
    'linkedin_profiles': {
      'linkedinId': 'linkedin_id',
      'firstName': 'first_name',
      'lastName': 'last_name',
      'profilePicture': 'profile_picture',
      'publicIdentifier': 'public_identifier',
      'memberUrn': 'member_urn',
      'connectionCount': 'connection_count',
      'followerCount': 'follower_count'
    },
    'linkedin_analytics': {
      'membersReached': 'members_reached',
      'profileViews': 'profile_views',
      'searchAppearances': 'search_appearances',
      'postCount': 'post_count',
      'reactionCount': 'reaction_count',
      'commentCount': 'comment_count',
      'shareCount': 'share_count',
      'capturedAt': 'captured_at'
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
      'capturedAt': 'captured_at'
    },
    'audience_data': {
      'totalFollowers': 'total_followers',
      'newFollowers': 'new_followers',
      'followerGrowth': 'follower_growth',
      'topLocations': 'top_locations',
      'topIndustries': 'top_industries',
      'topJobFunctions': 'top_job_functions',
      'topSeniorities': 'top_seniorities',
      'capturedAt': 'captured_at'
    },
    'connections': {
      'linkedinId': 'linkedin_id',
      'firstName': 'first_name',
      'lastName': 'last_name',
      'profilePicture': 'profile_picture',
      'publicIdentifier': 'public_identifier',
      'connectedAt': 'connected_at'
    },
    'feed_posts': {
      'authorId': 'author_id',
      'authorName': 'author_name',
      'authorHeadline': 'author_headline',
      'postText': 'post_text',
      'postType': 'post_type',
      'activityUrn': 'activity_urn',
      'likeCount': 'like_count',
      'commentCount': 'comment_count',
      'repostCount': 'repost_count',
      'postedAt': 'posted_at',
      'capturedAt': 'captured_at'
    },
    'my_posts': {
      'activityUrn': 'activity_urn',
      'postText': 'post_text',
      'postType': 'post_type',
      'impressionCount': 'impression_count',
      'likeCount': 'like_count',
      'commentCount': 'comment_count',
      'repostCount': 'repost_count',
      'postedAt': 'posted_at'
    },
    'captured_apis': {
      'apiUrl': 'api_url',
      'apiCategory': 'api_category',
      'responseSize': 'response_size',
      'capturedAt': 'captured_at'
    },
    'capture_stats': {
      'totalCaptures': 'total_captures',
      'profileCaptures': 'profile_captures',
      'analyticsCaptures': 'analytics_captures',
      'postCaptures': 'post_captures',
      'audienceCaptures': 'audience_captures',
      'lastCaptureAt': 'last_capture_at'
    }
  };

  // Apply field mappings for the specific table
  const mapping = fieldMappings[table];
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

  return prepared;
}
```

#### 2.2 Add Batch Operations

**File**: `lib/supabase/local-cache.js`

```javascript
/**
 * Process pending changes in batch
 * @returns {Promise<{success: number, failed: number}>}
 */
async processPendingChanges() {
  if (!navigator.onLine) {
    console.log('Offline - skipping sync');
    return { success: 0, failed: 0 };
  }

  const userId = self.supabaseAuth?.getUserId();
  if (!userId) {
    console.log('Not authenticated - skipping sync');
    return { success: 0, failed: 0 };
  }

  const pending = [...this.pendingChanges];
  if (pending.length === 0) {
    return { success: 0, failed: 0 };
  }

  console.log(`Processing ${pending.length} pending changes...`);

  let success = 0;
  let failed = 0;

  // Group by table for batch operations
  const byTable = {};
  for (const change of pending) {
    if (!byTable[change.table]) {
      byTable[change.table] = [];
    }
    byTable[change.table].push(change);
  }

  for (const [table, changes] of Object.entries(byTable)) {
    try {
      // Prepare all data for this table
      const records = changes.map(c =>
        this.prepareForSupabase(c.data, userId, table)
      );

      // Batch upsert
      const { error } = await self.supabase
        .from(table)
        .upsert(records, { onConflict: 'id' });

      if (error) {
        console.error(`Sync error for ${table}:`, error);
        failed += changes.length;
      } else {
        success += changes.length;
        // Remove successful changes from pending queue
        for (const change of changes) {
          const index = this.pendingChanges.findIndex(
            p => p.timestamp === change.timestamp && p.table === change.table
          );
          if (index > -1) {
            this.pendingChanges.splice(index, 1);
          }
        }
      }
    } catch (err) {
      console.error(`Batch sync error for ${table}:`, err);
      failed += changes.length;
    }
  }

  // Persist updated pending queue
  await this.savePendingChanges();

  console.log(`Sync complete: ${success} success, ${failed} failed`);
  return { success, failed };
}
```

---

### Phase 3: Enhance Sync Manager

**Goal**: Add automatic sync triggers and better queue management.

#### 3.1 Add Sync Triggers

**File**: `lib/supabase/sync.js`

```javascript
/**
 * Start watching for changes and auto-sync
 */
startAutoSync() {
  // Sync on coming online
  window.addEventListener('online', () => {
    console.log('Back online - triggering sync');
    this.syncNow();
  });

  // Sync periodically (every 5 minutes)
  this.syncInterval = setInterval(() => {
    if (navigator.onLine) {
      this.syncNow();
    }
  }, 5 * 60 * 1000);

  // Sync on extension wake-up
  chrome.runtime.onStartup.addListener(() => {
    if (navigator.onLine) {
      setTimeout(() => this.syncNow(), 5000);
    }
  });
}

/**
 * Perform immediate sync
 */
async syncNow() {
  if (this.isSyncing) {
    console.log('Sync already in progress');
    return { success: false, reason: 'already_syncing' };
  }

  this.isSyncing = true;

  try {
    // Process pending changes
    const result = await self.localCache.processPendingChanges();

    // Broadcast sync complete
    chrome.runtime.sendMessage({
      type: 'SYNC_COMPLETE',
      data: result
    }).catch(() => {}); // Ignore if no listener

    this.lastSyncTime = Date.now();

    return { success: true, ...result };
  } catch (error) {
    console.error('Sync error:', error);
    return { success: false, error: error.message };
  } finally {
    this.isSyncing = false;
  }
}
```

---

### Phase 4: Add User ID Tracking

**Goal**: Ensure all data is associated with the authenticated user.

#### 4.1 Update Service Worker Initialization

**File**: `background/service-worker.ts`

```javascript
// Add at the top after imports
let currentUserId = null;

// Update the initSupabase function
(async function initSupabase() {
  await new Promise(r => setTimeout(r, 100));

  if (self.localCache) {
    await self.localCache.initialize();
  }

  if (self.supabaseAuth) {
    const { session, user } = await self.supabaseAuth.getSession();
    if (session && user) {
      currentUserId = user.id;

      if (self.syncManager) {
        await self.syncManager.initialize();
      }
    }

    // Listen for auth changes
    self.supabaseAuth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        currentUserId = session.user.id;
      } else if (event === 'SIGNED_OUT') {
        currentUserId = null;
      }
    });
  }
})();
```

#### 4.2 Update saveToStorage to Include User ID

```javascript
async function saveToStorage(key, data, options = {}) {
  try {
    const syncableKeys = [/* ... */];

    if (self.localCache && syncableKeys.includes(key)) {
      // Add user_id if authenticated
      const dataWithUser = currentUserId
        ? { ...data, user_id: currentUserId }
        : data;

      await self.localCache.set(key, dataWithUser, options.skipSync);
    } else {
      await chrome.storage.local.set({ [key]: data });
    }

    return { success: true };
  } catch (error) {
    console.error('saveToStorage error:', error);
    return { success: false, error: error.message };
  }
}
```

---

### Phase 5: Add Data Migration

**Goal**: Migrate existing local data to Supabase on first login.

#### 5.1 Add Migration Function

**File**: `lib/supabase/local-cache.js`

```javascript
/**
 * Migrate existing local storage data to Supabase
 * Called after first successful authentication
 */
async migrateExistingData() {
  const userId = self.supabaseAuth?.getUserId();
  if (!userId) {
    console.log('No user - cannot migrate');
    return { success: false, reason: 'not_authenticated' };
  }

  console.log('Starting data migration...');

  const keysToMigrate = [
    'linkedin_profile',
    'linkedin_analytics',
    'linkedin_post_analytics',
    'linkedin_audience',
    'linkedin_connections',
    'linkedin_feed_posts',
    'linkedin_my_posts',
    'captured_apis',
    'capture_stats'
  ];

  let migrated = 0;
  let failed = 0;

  for (const localKey of keysToMigrate) {
    try {
      const result = await chrome.storage.local.get(localKey);
      const data = result[localKey];

      if (data) {
        // Queue for sync (will be processed by processPendingChanges)
        await this.set(localKey, data, false);
        migrated++;
      }
    } catch (error) {
      console.error(`Migration failed for ${localKey}:`, error);
      failed++;
    }
  }

  console.log(`Migration complete: ${migrated} migrated, ${failed} failed`);

  // Process all pending changes immediately
  await this.processPendingChanges();

  // Mark migration as complete
  await chrome.storage.local.set({
    supabase_migration_complete: true,
    supabase_migration_date: new Date().toISOString()
  });

  return { success: true, migrated, failed };
}
```

#### 5.2 Trigger Migration on First Sign-In

**File**: `lib/supabase/auth.js`

Update `signIn()` method:

```javascript
async signIn(email, password) {
  // ... existing sign in logic ...

  if (response.ok) {
    await this.saveSession(data);

    // Check if this is first sign-in (needs migration)
    const migrationCheck = await chrome.storage.local.get('supabase_migration_complete');
    if (!migrationCheck.supabase_migration_complete) {
      console.log('First sign-in - triggering data migration');
      if (self.localCache) {
        await self.localCache.migrateExistingData();
      }
    }

    // Initialize sync manager
    if (self.syncManager) {
      await self.syncManager.initialize();
    }

    return { success: true, user: data.user };
  }
}
```

---

### Phase 6: Add Sync Status UI

**Goal**: Show real-time sync status in popup.

#### 6.1 Update Popup UI Elements

The UI already exists in `popup.html` (lines 418-484). We need to ensure the handlers update correctly.

#### 6.2 Add Real-Time Status Updates

**File**: `popup/popup.js`

```javascript
// Listen for sync updates from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SYNC_COMPLETE') {
    updateSyncUI();
  } else if (message.type === 'SYNC_STARTED') {
    updateSyncStatus('syncing', 'Syncing...');
  } else if (message.type === 'PENDING_CHANGE_ADDED') {
    updatePendingCount(message.count);
  }
});

function updatePendingCount(count) {
  const element = document.getElementById('pending-changes-count');
  if (element) {
    element.textContent = count.toString();
  }
}
```

---

## Database Schema Requirements

Ensure the Supabase tables have the correct schema:

### Required Tables

```sql
-- Users table (exists)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  linkedin_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LinkedIn Profiles
CREATE TABLE linkedin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  linkedin_id TEXT,
  first_name TEXT,
  last_name TEXT,
  headline TEXT,
  profile_picture TEXT,
  public_identifier TEXT,
  member_urn TEXT,
  connection_count INTEGER,
  follower_count INTEGER,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, linkedin_id)
);

-- LinkedIn Analytics
CREATE TABLE linkedin_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  members_reached INTEGER,
  profile_views INTEGER,
  search_appearances INTEGER,
  post_count INTEGER,
  reaction_count INTEGER,
  comment_count INTEGER,
  share_count INTEGER,
  captured_at TIMESTAMP WITH TIME ZONE,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Post Analytics
CREATE TABLE post_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  activity_urn TEXT,
  post_text TEXT,
  post_type TEXT,
  impression_count INTEGER,
  like_count INTEGER,
  comment_count INTEGER,
  repost_count INTEGER,
  share_count INTEGER,
  click_count INTEGER,
  engagement_rate DECIMAL,
  posted_at TIMESTAMP WITH TIME ZONE,
  captured_at TIMESTAMP WITH TIME ZONE,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, activity_urn)
);

-- Enable RLS
ALTER TABLE linkedin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can access own data" ON linkedin_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own analytics" ON linkedin_analytics
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can access own post analytics" ON post_analytics
  FOR ALL USING (auth.uid() = user_id);
```

---

## Implementation Order

1. **Phase 1** - Modify storage functions (2-3 hours)
2. **Phase 2** - Enhance local cache (2-3 hours)
3. **Phase 3** - Enhance sync manager (1-2 hours)
4. **Phase 4** - Add user ID tracking (1 hour)
5. **Phase 5** - Add data migration (1-2 hours)
6. **Phase 6** - Add sync status UI (1 hour)

**Total Estimated Time**: 8-12 hours

---

## Testing Plan

### Unit Tests
1. Test `saveToStorage()` routes to correct storage
2. Test `prepareForSupabase()` field mapping
3. Test `processPendingChanges()` batch operations
4. Test migration function

### Integration Tests
1. Capture data → appears in local storage
2. Sign in → migration triggers
3. Capture data while authenticated → syncs to Supabase
4. Go offline → data queued
5. Come online → pending changes sync

### End-to-End Tests
1. Fresh install → capture data → sign in → data migrates
2. Authenticated → capture new data → verify in Supabase
3. Network disconnect → capture data → reconnect → verify sync

---

## Rollback Plan

If issues arise:
1. Set `ENABLE_SUPABASE_SYNC = false` flag in service worker
2. All storage operations fall back to direct `chrome.storage.local`
3. Pending changes preserved for when sync is re-enabled

---

## Security Considerations

1. **RLS Policies**: All tables must have RLS enabled
2. **User ID Validation**: Never trust user_id from client, verify via auth
3. **Data Sanitization**: Strip sensitive fields before sync
4. **Token Security**: Refresh tokens stored securely in chrome.storage.local
