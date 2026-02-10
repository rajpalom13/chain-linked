# Background Sync Implementation Plan - Service Worker Direct API Fetch

## Overview
Implement a robust background data syncing system in the Chrome extension's service worker that proactively fetches LinkedIn data via Voyager API calls without requiring the user to navigate to specific pages.

## Architecture

### New Files to Create
1. `extension/src/background/linkedin-api.ts` - LinkedIn Voyager API client with header mimicry
2. `extension/src/background/background-sync.ts` - Sync orchestrator with scheduling, rate limiting, and safety
3. `extension/src/shared/sync-types.ts` - Types for background sync configuration and state

### Files to Modify
1. `extension/src/background/alarms.ts` - Add BACKGROUND_SYNC alarm
2. `extension/src/background/service-worker.ts` - Add message handlers for sync control
3. `extension/src/shared/types.ts` - Add new message types
4. `extension/manifest.json` - No changes needed (permissions already sufficient)

---

## File 1: `extension/src/background/linkedin-api.ts`

### Purpose
Encapsulated LinkedIn Voyager API client that handles authentication, header construction, and request execution from the service worker.

### Key Design Decisions
- Reads `li_at` and `JSESSIONID` cookies via `chrome.cookies.get()`
- Constructs full header set matching real browser requests
- Handles cookie-based auth (service worker `fetch()` doesn't auto-include cookies)
- Returns typed responses

### Implementation Details

```typescript
// Constants
const LINKEDIN_BASE = 'https://www.linkedin.com';
const VOYAGER_BASE = '/voyager/api';

// Headers that must match real browser traffic
interface LinkedInHeaders {
  'csrf-token': string;
  'x-li-lang': string;
  'x-li-track': string;
  'x-li-page-instance': string;
  'x-restli-protocol-version': string;
  accept: string;
  'accept-language': string;
  cookie: string;
}

// API Endpoints to fetch (prioritized by value)
const SYNC_ENDPOINTS = {
  // Analytics - highest value, updates frequently
  creatorAnalytics: '/voyager/api/voyagerContentcreationDashCreatorAnalytics?decorationId=...&q=analytics',

  // Profile - connection/follower counts
  profile: '/voyager/api/identity/dash/profiles?...',

  // Audience demographics
  audienceDemographics: '/voyager/api/voyagerContentcreationDashCreatorAnalytics?decorationId=...&q=audience',

  // Recent posts (my activity)
  myPosts: '/voyager/api/identity/dash/profileUpdates?...',

  // Profile views
  profileViews: '/voyager/api/identity/wvmpCards?...',
};
```

### Functions

1. **`getLinkedInAuth()`** - Read li_at and JSESSIONID cookies
2. **`buildHeaders(auth)`** - Construct full header set with csrf-token, x-li-track, etc.
3. **`voyagerFetch(endpoint, options?)`** - Execute authenticated Voyager API request
4. **`isAuthenticated()`** - Check if LinkedIn session is valid
5. **`getEndpointUrl(type)`** - Get the correct Voyager URL for each data type

### Cookie Handling
```typescript
async function getLinkedInAuth(): Promise<LinkedInAuth | null> {
  const [liAt, jsessionid] = await Promise.all([
    chrome.cookies.get({ url: 'https://www.linkedin.com', name: 'li_at' }),
    chrome.cookies.get({ url: 'https://www.linkedin.com', name: 'JSESSIONID' }),
  ]);

  if (!liAt?.value || !jsessionid?.value) return null;

  return {
    liAt: liAt.value,
    jsessionId: jsessionid.value,
    csrfToken: jsessionid.value.replace(/"/g, ''), // Strip quotes
  };
}
```

### Header Construction (Critical for Detection Avoidance)
```typescript
function buildHeaders(auth: LinkedInAuth): Record<string, string> {
  return {
    'accept': 'application/vnd.linkedin.normalized+json+2.1',
    'accept-language': 'en-US,en;q=0.9',
    'csrf-token': auth.csrfToken,
    'x-li-lang': 'en_US',
    'x-li-page-instance': `urn:li:page:d_flagship3_profile_view_base;${generateUUID()}`,
    'x-li-track': JSON.stringify({
      clientVersion: '1.13.8960',
      mpVersion: '1.13.8960',
      osName: 'web',
      timezoneOffset: new Date().getTimezoneOffset() / -60,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      deviceFormFactor: 'DESKTOP',
      mpName: 'voyager-web',
    }),
    'x-restli-protocol-version': '2.0.0',
    'cookie': `li_at=${auth.liAt}; JSESSIONID=${auth.jsessionId}`,
  };
}
```

---

## File 2: `extension/src/background/background-sync.ts`

### Purpose
Orchestrates background data fetching with intelligent scheduling, rate limiting, backoff, and safety mechanisms.

### Key Design Decisions
- **Opt-in by default**: User must explicitly enable background sync
- **Conservative timing**: 4-hour base interval with random jitter (3-5 hours)
- **Max 4-6 API calls per sync session**: Spread across data types
- **Exponential backoff**: On any error, double the interval (max 24 hours)
- **Active hours only**: Only sync when user was recently active (last 2 hours of Chrome usage)
- **Circuit breaker**: Stop all syncing after 3 consecutive failures, require manual reset
- **Sync state persistence**: Track last sync time, results, consecutive failures in chrome.storage

### State Management
```typescript
interface BackgroundSyncState {
  enabled: boolean;
  lastSyncTime: number | null;
  lastSyncSuccess: boolean;
  consecutiveFailures: number;
  nextSyncTime: number | null;
  totalSyncs: number;
  totalApiCalls: number;
  circuitBreakerTripped: boolean;
  lastError: string | null;
  syncHistory: SyncHistoryEntry[]; // Last 20 syncs
  // Per-endpoint tracking
  endpointLastSync: Record<string, number>;
  endpointLastSuccess: Record<string, boolean>;
}

interface SyncHistoryEntry {
  timestamp: number;
  endpointsFetched: string[];
  success: boolean;
  errors: string[];
  duration: number;
}

interface BackgroundSyncConfig {
  enabled: boolean;
  baseIntervalMinutes: number; // Default: 240 (4 hours)
  jitterMinutes: number; // Default: 60 (adds 0-60 min random)
  maxApiCallsPerSync: number; // Default: 4
  activeHoursOnly: boolean; // Default: true
  maxConsecutiveFailures: number; // Default: 3
  endpoints: {
    analytics: boolean;
    profile: boolean;
    audience: boolean;
    myPosts: boolean;
    profileViews: boolean;
  };
}
```

### Functions

1. **`initBackgroundSync()`** - Initialize sync system, register alarm
2. **`enableBackgroundSync(config?)`** - Enable sync with optional config
3. **`disableBackgroundSync()`** - Disable sync, clear alarm
4. **`triggerSync(manual?: boolean)`** - Execute a sync cycle
5. **`shouldSyncNow()`** - Check all preconditions (auth, timing, circuit breaker, active hours)
6. **`executeSyncCycle()`** - Fetch data from enabled endpoints
7. **`processAnalyticsResponse(data)`** - Parse and store analytics
8. **`processProfileResponse(data)`** - Parse and store profile
9. **`processAudienceResponse(data)`** - Parse and store audience
10. **`processMyPostsResponse(data)`** - Parse and store posts
11. **`processProfileViewsResponse(data)`** - Parse and store profile views
12. **`handleSyncError(error, endpoint)`** - Error handling with backoff
13. **`resetCircuitBreaker()`** - Manual circuit breaker reset
14. **`getSyncState()`** - Get current sync state for UI
15. **`getSyncConfig()`** - Get current sync config for UI
16. **`updateSyncConfig(config)`** - Update config from UI

### Sync Cycle Flow
```
1. shouldSyncNow() checks:
   - Is sync enabled?
   - Is circuit breaker tripped?
   - Is user authenticated on LinkedIn?
   - Has enough time passed since last sync?
   - Is it within active hours? (skip if manual)

2. executeSyncCycle():
   - Determine which endpoints to fetch (round-robin, oldest-first)
   - Pick up to maxApiCallsPerSync endpoints
   - Add random delay (500-3000ms) between each request
   - For each endpoint:
     a. voyagerFetch(endpoint)
     b. Parse response
     c. Store via existing saveToStorage() / saveWithSync()
     d. Update endpoint tracking
   - Record sync history
   - Schedule next sync with jitter

3. On error:
   - Increment consecutiveFailures
   - Apply exponential backoff to interval
   - If consecutiveFailures >= maxConsecutiveFailures: trip circuit breaker
   - Log error details

4. On success:
   - Reset consecutiveFailures to 0
   - Reset interval to base
   - Show optional notification
```

### Rate Limiting Details
```typescript
// Between-request delay within a sync cycle
function getIntraRequestDelay(): number {
  return 1000 + Math.random() * 3000; // 1-4 seconds
}

// Between-sync interval
function getNextSyncDelay(config: BackgroundSyncConfig, state: BackgroundSyncState): number {
  const baseMs = config.baseIntervalMinutes * 60 * 1000;
  const jitterMs = Math.random() * config.jitterMinutes * 60 * 1000;

  // Exponential backoff on failures
  const backoffMultiplier = Math.min(
    Math.pow(2, state.consecutiveFailures),
    6 // Max 6x the base interval (24 hours at 4h base)
  );

  return (baseMs * backoffMultiplier) + jitterMs;
}
```

---

## File 3: `extension/src/shared/sync-types.ts`

### Purpose
Shared types for background sync feature. Exports `BackgroundSyncState`, `BackgroundSyncConfig`, `SyncHistoryEntry`, and related types.

---

## Modifications to Existing Files

### `extension/src/background/alarms.ts`
- Add `BACKGROUND_SYNC: 'linkedin-background-sync'` to `ALARM_NAMES`
- No new alarm creation logic needed (background-sync.ts manages its own alarm)

### `extension/src/shared/types.ts`
Add new message types:
```typescript
// Background Sync (v4.2)
| 'BACKGROUND_SYNC_ENABLE'
| 'BACKGROUND_SYNC_DISABLE'
| 'BACKGROUND_SYNC_TRIGGER'
| 'BACKGROUND_SYNC_STATUS'
| 'BACKGROUND_SYNC_CONFIG'
| 'BACKGROUND_SYNC_UPDATE_CONFIG'
| 'BACKGROUND_SYNC_RESET_CIRCUIT_BREAKER'
| 'BACKGROUND_SYNC_HISTORY'
```

### `extension/src/background/service-worker.ts`
Add message handler cases in the switch statement:
```typescript
case 'BACKGROUND_SYNC_ENABLE': {
  await enableBackgroundSync(message.data as Partial<BackgroundSyncConfig>);
  response = { success: true };
  break;
}
case 'BACKGROUND_SYNC_DISABLE': {
  await disableBackgroundSync();
  response = { success: true };
  break;
}
case 'BACKGROUND_SYNC_TRIGGER': {
  await triggerSync(true); // manual=true
  response = { success: true };
  break;
}
case 'BACKGROUND_SYNC_STATUS': {
  const syncState = await getSyncState();
  response = { success: true, data: syncState };
  break;
}
case 'BACKGROUND_SYNC_CONFIG': {
  const syncConfig = await getSyncConfig();
  response = { success: true, data: syncConfig };
  break;
}
case 'BACKGROUND_SYNC_UPDATE_CONFIG': {
  await updateSyncConfig(message.data as Partial<BackgroundSyncConfig>);
  response = { success: true };
  break;
}
case 'BACKGROUND_SYNC_RESET_CIRCUIT_BREAKER': {
  await resetCircuitBreaker();
  response = { success: true };
  break;
}
case 'BACKGROUND_SYNC_HISTORY': {
  const state = await getSyncState();
  response = { success: true, data: state.syncHistory };
  break;
}
```

Also add in `chrome.alarms.onAlarm` handler:
```typescript
case 'linkedin-background-sync':
  await triggerSync();
  break;
```

Also import background-sync functions and call `initBackgroundSync()` in the initialization section.

---

## Voyager API Endpoints (Exact URLs)

These endpoints are derived from the existing interceptor patterns in `main-world-interceptor.ts`. The service worker will call these directly.

### 1. Creator Analytics
```
GET /voyager/api/contentcreation/creatorAnalytics/urn:li:fsd_profile:{profileUrn}
```
Returns: impressions, members reached, engagements, top posts

### 2. Profile Data
```
GET /voyager/api/identity/dash/profiles?q=memberIdentity&memberIdentity={publicIdentifier}&decorationId=com.linkedin.voyager.dash.deco.identity.profile.WebTopCardCore-16
```
Returns: name, headline, connections count, followers count, profile photo

### 3. Audience Demographics
```
GET /voyager/api/contentcreation/creatorAnalytics/urn:li:fsd_profile:{profileUrn}?q=audience
```
Returns: follower demographics (locations, industries, job functions)

### 4. My Posts (Recent Activity)
```
GET /voyager/api/identity/dash/profileUpdates?q=memberShareFeed&moduleKey=member-shares:phone&count=20
```
Returns: user's recent posts with engagement metrics

### 5. Profile Views
```
GET /voyager/api/identity/wvmpCards
```
Returns: who viewed my profile data

### Important: Profile URN Discovery
The extension already stores the user's profile data in `chrome.storage.local` under `linkedin_profile`. The background sync will read this to get the profile URN needed for API calls. If no profile is stored, the sync will skip analytics/audience endpoints and only fetch profile data first.

---

## Safety Mechanisms

### 1. Circuit Breaker
- After 3 consecutive failed sync cycles, all background syncing stops
- User must manually reset via popup UI or message
- Prevents runaway requests when LinkedIn changes APIs or blocks

### 2. Rate Limiting
- Max 4-6 API calls per sync cycle
- 1-4 second random delay between requests
- 3-5 hour interval between sync cycles
- Never sync more than 8 times per day

### 3. Active Hours Detection
- Track last user interaction with extension (popup open, content script message)
- Only sync if user was active in last 2 hours
- Skip during typical sleep hours (configurable)

### 4. Error Response Handling
- HTTP 429 (Rate Limit): Immediate backoff, double interval
- HTTP 401/403 (Auth): Stop syncing, mark auth expired
- HTTP 999 (LinkedIn block): Trip circuit breaker immediately
- Network errors: Increment failure counter
- Malformed response: Log and skip, don't count as failure

### 5. Deduplication
- Check if data changed since last sync before saving
- Use hash comparison to avoid overwriting identical data
- Prevents unnecessary Supabase sync triggers

---

## Testing Checklist

1. Background sync can be enabled/disabled via messages
2. Alarm fires at correct intervals with jitter
3. LinkedIn cookies are correctly read and formatted
4. Headers match real browser traffic
5. Each endpoint returns valid data
6. Data is correctly parsed and stored using existing storage functions
7. Circuit breaker trips after consecutive failures
8. Circuit breaker can be manually reset
9. Exponential backoff works correctly
10. Sync skips when user is not authenticated
11. Sync skips during inactive hours (when enabled)
12. Sync state persists across service worker restarts
13. Manual sync trigger works independently of schedule
14. No console errors during normal operation
15. Build succeeds with no TypeScript errors
16. Existing functionality is not broken
