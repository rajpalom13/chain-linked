# LinkedIn Data Extractor - Extension Architecture

**Version:** 4.1.0
**Last Updated:** 2026-02-03
**Author:** AGI Ready Engineering Team

---

## Table of Contents

1. [Overview](#overview)
2. [High-Level Architecture](#high-level-architecture)
3. [Component Architecture](#component-architecture)
4. [Data Flow](#data-flow)
5. [Current Architecture Analysis](#current-architecture-analysis)
6. [Critical Issues Identified](#critical-issues-identified)
7. [Proposed Architecture Improvements](#proposed-architecture-improvements)
8. [Database Schema](#database-schema)
9. [Message Protocol](#message-protocol)
10. [Security Considerations](#security-considerations)

---

## Overview

The LinkedIn Data Extractor is a Chrome Extension (Manifest V3) that captures LinkedIn analytics data, profile information, and network insights. It uses a multi-layer capture strategy combining API interception, DOM extraction, and auto-capture mechanisms with offline-first storage and Supabase cloud sync.

### Key Features
- Multi-layer data capture (API interception + DOM extraction)
- Automatic page detection and data capture
- Offline-first architecture with cloud sync
- Trend tracking and analytics history
- Export capabilities (JSON, CSV)
- Google Drive backup integration
- Real-time sync to Supabase

---

## High-Level Architecture

```
+------------------------------------------------------------------+
|                         LinkedIn.com                               |
+------------------------------------------------------------------+
          |                      |                      |
          v                      v                      v
+------------------+  +-------------------+  +------------------+
| main-world-      |  | dom-extractor.ts  |  | auto-capture.ts  |
| interceptor.ts   |  | (ISOLATED world)  |  | (ISOLATED world) |
| (MAIN world)     |  |                   |  |                  |
+------------------+  +-------------------+  +------------------+
          |                      |                      |
          | CustomEvent          | Direct call          | Page navigation
          v                      v                      v
+------------------------------------------------------------------+
|                    content-script.ts                              |
|              (ISOLATED world - orchestrator)                      |
+------------------------------------------------------------------+
          |
          | chrome.runtime.sendMessage
          v
+------------------------------------------------------------------+
|                    service-worker.ts                              |
|                  (Background Script)                              |
+------------------------------------------------------------------+
          |                      |                      |
          v                      v                      v
+------------------+  +-------------------+  +------------------+
| chrome.storage   |  | IndexedDB         |  | Supabase         |
| .local           |  | (history-manager) |  | (cloud sync)     |
+------------------+  +-------------------+  +------------------+
```

---

## Component Architecture

### 1. Content Scripts Layer

#### main-world-interceptor.ts
**Location:** `src/content/main-world-interceptor.ts`
**World:** MAIN (same as LinkedIn's JavaScript)
**Purpose:** Intercept LinkedIn Voyager API responses before they reach LinkedIn's code

```typescript
API_PATTERNS = {
  profile:     /\/voyager\/api\/(me|identity\/profiles?|graphql.*profile)/i,
  analytics:   /\/voyager\/api\/(analytics|graphql.*analytics)/i,
  connections: /\/voyager\/api\/(relationships|connections)/i,
  feed:        /\/voyager\/api\/(feed|graphql.*feed)/i,
  posts:       /\/voyager\/api\/(posts|activities|shares)/i,
  comments:    /\/voyager\/api\/.*comments/i,
  myPosts:     /\/voyager\/api\/identity\/.*\/posts/i,
  followers:   /\/voyager\/api\/.*followers/i,
  trending:    /\/voyager\/api\/(news|trending)/i,
  reactions:   /\/voyager\/api\/.*reactions/i,
  messaging:   /\/voyager\/api\/(messaging|conversations)/i,
  network:     /\/voyager\/api\/.*network/i,
}
```

**Interception Methods:**
1. `fetch()` - Monkey-patched to clone and capture JSON responses
2. `XMLHttpRequest` - Patched `open()` and `send()` methods
3. `Response.prototype.json()` - Backup interceptor for edge cases

**Data Dispatch:** Uses `CustomEvent('linkedin-api-captured')` to send data to content script

#### dom-extractor.ts
**Location:** `src/content/dom-extractor.ts`
**World:** ISOLATED
**Purpose:** Extract data directly from LinkedIn DOM when API data is unavailable

**Page Type Detection:**
```typescript
detectPageType(): string {
  // Returns: 'profile' | 'analytics' | 'post_analytics' | 'demographics' |
  //          'profile_views' | 'feed' | 'unknown'
}
```

**Extraction Methods:**
- `extractProfileData()` - Name, headline, location, photo, follower/connection counts
- `extractAnalyticsData()` - Impressions, engagements, members reached, profile views
- `extractPostAnalyticsData()` - Individual post metrics
- `extractAudienceDemographics()` - Industry, location, seniority breakdowns
- `extractProfileViewsData()` - Profile viewers list

**Selector Strategy:** Uses multiple fallback selectors per data point to handle LinkedIn UI changes

#### auto-capture.ts
**Location:** `src/content/auto-capture.ts`
**World:** ISOLATED
**Purpose:** Automatically detect page navigation and trigger appropriate data capture

**Page Pattern Detection:**
```typescript
PAGE_PATTERNS = {
  POST_SUMMARY:        /\/analytics\/post-summary\/urn:li:activity:(\d+)/,
  POST_DEMOGRAPHICS:   /\/analytics\/demographic-detail\/urn:li:activity:(\d+)/,
  AUDIENCE_DEMOGRAPHICS: /\/analytics\/demographic-detail\/urn:li:fsd_profile/,
  CREATOR_CONTENT:     /\/analytics\/creator\/content/,
  CREATOR_TOP_POSTS:   /\/analytics\/creator\/top-posts/,
  CREATOR_AUDIENCE:    /\/analytics\/creator\/audience/,
  PROFILE_VIEWS:       /\/analytics\/profile-views/,
  COMPANY_PAGE:        /^\/company\/([^\/]+)\/?$/,
  COMPANY_ANALYTICS:   /^\/company\/([^\/]+)\/analytics/,
  COMPANY_POSTS:       /^\/company\/([^\/]+)\/posts/,
  DASHBOARD:           /^\/dashboard\/?$/,
  PROFILE:             /^\/in\/([^\/]+)\/?$/,
}
```

**Navigation Detection Methods:**
1. `history.pushState` / `history.replaceState` monkey-patching
2. `popstate` event listener
3. URL polling (500ms interval) - fallback for SPA navigation
4. `visibilitychange` event - detects tab switching

**Capture Flow:**
```
Navigation Detected
      |
      v
detectPageType() --> non_analytics? --> STOP
      |
      v
Check debounce cache (5 min cooldown)
      |
      v
Schedule capture (1000ms delay)
      |
      v
Validate URL unchanged during delay
      |
      v
waitForAnalyticsContent() (5000ms timeout)
      |
      v
Extract data via DOMExtractor
      |
      v
Validate URL unchanged during extraction
      |
      v
sendToServiceWorker()
```

#### company-extractor.ts
**Location:** `src/content/company-extractor.ts`
**World:** ISOLATED
**Purpose:** Extract company page analytics and content calendar

**Capabilities:**
- Company page detection and identification
- Follower/employee count extraction
- Company info (industry, headquarters, size, founded)
- Content calendar (past posts with engagement metrics)

#### content-script.ts
**Location:** `src/content/content-script.ts`
**World:** ISOLATED
**Purpose:** Main orchestrator for all content scripts

**Responsibilities:**
- Listen for API capture events from main-world-interceptor
- Coordinate with auto-capture controller
- Handle messages from popup
- Forward captured data to service worker

---

### 2. Background Layer

#### service-worker.ts
**Location:** `src/background/service-worker.ts`
**Purpose:** Central hub for data processing, storage, and sync

**Key Responsibilities:**
1. Message handling from content scripts and popup
2. Chrome storage management
3. Cookie/authentication checking
4. Data transformation and normalization
5. History tracking (analytics_history, audience_history)
6. Export functionality (JSON, CSV)
7. Alarm handling (backup, maintenance, alerts)
8. Supabase sync coordination

**Storage Keys:**
```typescript
STORAGE_KEYS = {
  AUTH_DATA:            'linkedin_auth',
  PROFILE_DATA:         'linkedin_profile',
  ANALYTICS_DATA:       'linkedin_analytics',
  POST_ANALYTICS_DATA:  'linkedin_post_analytics',
  AUDIENCE_DATA:        'linkedin_audience',
  CONNECTIONS_DATA:     'linkedin_connections',
  POSTS_DATA:           'linkedin_posts',
  FEED_POSTS:           'linkedin_feed_posts',
  MY_POSTS:             'linkedin_my_posts',
  COMMENTS:             'linkedin_comments',
  FOLLOWERS:            'linkedin_followers',
  TRENDING:             'linkedin_trending',
  CAPTURED_APIS:        'captured_apis',
  SETTINGS:             'extension_settings',
  AUTO_CAPTURE_LOG:     'auto_capture_log',
  AUTO_CAPTURE_SETTINGS: 'linkedin_capture_settings',
  ANALYTICS_HISTORY:    'linkedin_analytics_history',
  AUDIENCE_HISTORY:     'linkedin_audience_history',
  CAPTURE_STATS:        'auto_capture_stats',
  COMPANY_ANALYTICS:    'linkedin_company_analytics',
  CONTENT_CALENDAR:     'linkedin_content_calendar',
}
```

#### supabase-sync-bridge.ts
**Location:** `src/background/supabase-sync-bridge.ts`
**Purpose:** Bridge between local storage and Supabase cloud sync

**Syncable Storage Keys:**
```typescript
SYNCABLE_STORAGE_KEYS = [
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
]
```

**Storage-to-Table Mapping:**
```typescript
STORAGE_TABLE_MAP = {
  'linkedin_profile':       'linkedin_profiles',
  'linkedin_analytics':     'linkedin_analytics',
  'linkedin_post_analytics': 'post_analytics',
  'linkedin_audience':      'audience_data',
  'linkedin_connections':   'connections',
  'linkedin_feed_posts':    'feed_posts',
  'linkedin_my_posts':      'my_posts',
  'linkedin_comments':      'comments',
  'linkedin_followers':     'followers',
  'captured_apis':          'captured_apis',
  'capture_stats':          'capture_stats',
  'extension_settings':     'extension_settings',
}
```

**Sync Flow:**
```
saveWithSync(key, data)
      |
      v
Save to chrome.storage.local
      |
      v
isSyncableKey(key) && currentUserId?
      |
      v
queueForSync(key, data)
      |
      v
setTimeout(processPendingChanges, 100ms)
      |
      v
prepareForSupabase(data, table, userId)
      |
      v
supabase.from(table).upsert(record)
```

#### history-manager.ts
**Location:** `src/shared/history-manager.ts`
**Purpose:** Manage trend data collection, aggregation, and export via IndexedDB

**Trend Types:**
- `impressions` - Post impressions over time
- `followers` - Follower count growth
- `engagements` - Engagement metrics
- `profile_views` - Profile view counts
- `connections` - Connection count growth

#### alarms.ts
**Location:** `src/background/alarms.ts`
**Purpose:** Chrome alarms for scheduled tasks

**Alarm Types:**
- `daily_backup` - Automatic daily backup
- `weekly_backup` - Automatic weekly backup
- `maintenance` - Database cleanup
- `alert_check` - Growth alert monitoring

---

### 3. Popup Layer

**Location:** `src/popup/`
**Technology:** React + TypeScript + Tailwind CSS

**Components:**
- `Dashboard.tsx` - Main analytics overview
- `Analytics.tsx` - Detailed analytics view
- `CloudSync.tsx` - Supabase sync status and controls
- `Settings.tsx` - Extension configuration
- `SupabaseAuth.tsx` - Authentication UI
- `QuickComposer.tsx` - Post creation widget
- `TrendChart.tsx` - Analytics visualization
- `CompanyAnalytics.tsx` - Company page data view
- `ContentCalendar.tsx` - Content scheduling view

---

## Data Flow

### Capture Flow (API Interception)

```
LinkedIn Page Load
      |
      v
+--------------------------------+
| main-world-interceptor.ts      |
| - Monkey-patch fetch()         |
| - Monkey-patch XHR             |
+--------------------------------+
      |
      | fetch("/voyager/api/...")
      v
+--------------------------------+
| Intercept Response             |
| - Clone response               |
| - Parse JSON                   |
| - Categorize endpoint          |
+--------------------------------+
      |
      | CustomEvent('linkedin-api-captured')
      v
+--------------------------------+
| content-script.ts              |
| - handleCapturedApi()          |
| - Add to capturedData.apiResponses |
+--------------------------------+
      |
      | chrome.runtime.sendMessage
      v
+--------------------------------+
| service-worker.ts              |
| - saveToStorage()              |
| - queueForSync()               |
+--------------------------------+
      |
      v
+--------------------------------+
| chrome.storage.local           |
| supabase_pending_changes       |
+--------------------------------+
      |
      | processPendingChanges()
      v
+--------------------------------+
| Supabase                       |
| - upsert to appropriate table  |
+--------------------------------+
```

### Capture Flow (DOM Extraction)

```
Page Navigation Detected
      |
      v
+--------------------------------+
| auto-capture.ts                |
| - detectPageType()             |
| - shouldDebounce()             |
+--------------------------------+
      |
      | Schedule capture (1s delay)
      v
+--------------------------------+
| dom-extractor.ts               |
| - extractAnalyticsData()       |
| - extractProfileData()         |
| - etc.                         |
+--------------------------------+
      |
      | Return extracted data
      v
+--------------------------------+
| auto-capture.ts                |
| - captureCurrentPage()         |
| - Validate URL unchanged       |
+--------------------------------+
      |
      | sendMessage('AUTO_CAPTURE_*')
      v
+--------------------------------+
| service-worker.ts              |
| - Process & normalize data     |
| - saveToStorage()              |
| - addToAnalyticsHistory()      |
| - updateCaptureStats()         |
| - showCaptureNotification()    |
+--------------------------------+
```

---

## Current Architecture Analysis

### Strengths

1. **Multi-layer Capture Strategy**
   - API interception catches structured data
   - DOM extraction provides fallback
   - Auto-capture ensures page coverage

2. **Offline-First Design**
   - Local storage primary
   - Pending changes queue
   - Sync when online

3. **Comprehensive Page Coverage**
   - 13+ LinkedIn page types detected
   - Profile, analytics, posts, company pages
   - Dashboard and demographics

4. **Modular Code Structure**
   - Clear separation of concerns
   - TypeScript for type safety
   - Shared types across components

### Weaknesses

1. **Error Handling Gaps**
   - Errors logged but not queued for retry
   - No exponential backoff on sync failures
   - Silent failures in DOM extraction

2. **Fragile Selectors**
   - DOM selectors break on LinkedIn UI updates
   - No selector health monitoring
   - Limited fallback strategies

3. **Sync Reliability**
   - No offline queue persistence verification
   - Missing sync conflict resolution
   - analytics_history not synced to Supabase

4. **User Feedback**
   - Capture failures not visible to user
   - Sync status not prominent
   - No capture success indicators

---

## Critical Issues Identified

### Issue 1: Silent Failures

**Problem:** Errors are caught and logged but no retry mechanism exists

**Affected Code:**
```typescript
// main-world-interceptor.ts line 105-107
} catch (error) {
  // Silently ignore non-JSON responses
}
```

**Impact:** Failed captures are lost permanently

**Recommendation:** Queue failed captures for retry with exponential backoff

---

### Issue 2: Fragile DOM Selectors

**Problem:** LinkedIn UI changes break DOM extraction

**Example Selectors at Risk:**
```typescript
// dom-extractor.ts
const nameSelectors = [
  'h1.text-heading-xlarge',
  'h1[class*="text-heading-xlarge"]',
  // ... LinkedIn can change these at any time
];
```

**Impact:** After LinkedIn UI update, extension stops capturing data

**Recommendation:**
- Implement selector health scoring
- Use multiple extraction strategies per data point
- Add fallback to text pattern matching

---

### Issue 3: Missing Validation

**Problem:** Required fields not validated before save

**Example:**
```typescript
// service-worker.ts line 604-606
async function savePostAnalyticsToStorage(newData: PostAnalyticsData): Promise<StorageResult> {
  if (!newData?.activityUrn) {
    return { success: false, error: 'No activity URN provided' };
  }
  // But other required fields not checked
```

**Impact:** Incomplete data saved, causing downstream issues

**Recommendation:** Add schema validation for all data types before storage

---

### Issue 4: Manual Trigger Required

**Problem:** User must visit pages for capture (passive only)

**Impact:** Data gaps when user doesn't visit analytics pages

**Recommendation:** Consider scheduled background data fetching (with rate limiting)

---

### Issue 5: Incomplete Supabase Sync

**Problem:** `analytics_history` stored locally but not synced to Supabase

**Affected Code:**
```typescript
// SYNCABLE_STORAGE_KEYS does not include:
// - 'linkedin_analytics_history'
// - 'linkedin_audience_history'
```

**Impact:** Historical trend data lost on device change/reinstall

**Recommendation:** Add analytics_history to syncable keys and create Supabase table

---

### Issue 6: No User Feedback on Failures

**Problem:** Capture and sync failures happen silently

**Impact:** User unaware data isn't being captured/synced

**Recommendation:**
- Add capture status indicator in popup
- Show error notifications for repeated failures
- Provide manual retry button

---

## Proposed Architecture Improvements

### 1. Robust Error Handling with Retry Queue

```typescript
interface FailedCapture {
  id: string;
  type: CaptureType;
  data: unknown;
  error: string;
  attempts: number;
  lastAttempt: number;
  nextRetry: number;  // Exponential backoff
}

class CaptureRetryQueue {
  maxAttempts = 5;
  baseDelay = 1000;  // 1s, 2s, 4s, 8s, 16s

  async add(capture: FailedCapture): Promise<void>;
  async processQueue(): Promise<void>;
  async getStatus(): Promise<{ pending: number; failed: number }>;
}
```

### 2. Fallback Selector Strategy

```typescript
interface ExtractionStrategy {
  name: string;
  selectors: string[];
  textPatterns: RegExp[];
  confidence: number;  // 0-1
  lastSuccess: number;
}

class RobustExtractor {
  strategies: ExtractionStrategy[];

  extract(field: string): { value: unknown; confidence: number };
  reportFailure(strategyName: string): void;
  getHealthReport(): SelectorHealth[];
}
```

### 3. Validation Layer

```typescript
import { z } from 'zod';

const AnalyticsSchema = z.object({
  impressions: z.number().optional(),
  engagements: z.number().optional(),
  membersReached: z.number().optional(),
  // At least one field required
}).refine(data =>
  data.impressions || data.engagements || data.membersReached,
  "At least one metric required"
);

function validateBeforeSave(type: CaptureType, data: unknown): ValidationResult;
```

### 4. Real-Time Monitoring Dashboard

```typescript
interface CaptureStatus {
  lastCapture: {
    type: string;
    timestamp: number;
    success: boolean;
  };
  todayStats: {
    successful: number;
    failed: number;
    retrying: number;
  };
  syncStatus: {
    pending: number;
    lastSync: number;
    errors: string[];
  };
  selectorHealth: {
    name: string;
    successRate: number;
    lastFailure?: number;
  }[];
}
```

### 5. Background Sync with analytics_history

**New Supabase Table:**
```sql
CREATE TABLE analytics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL,
  impressions INTEGER,
  engagements INTEGER,
  members_reached INTEGER,
  profile_views INTEGER,
  search_appearances INTEGER,
  new_followers INTEGER,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);
```

### 6. Circuit Breaker Pattern

```typescript
class CaptureCircuitBreaker {
  failureThreshold = 10;  // Failures in window
  windowMs = 60000;       // 1 minute window
  cooldownMs = 300000;    // 5 minute cooldown

  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  recordSuccess(): void;
  recordFailure(): void;
  canCapture(): boolean;
  getStatus(): CircuitBreakerStatus;
}
```

---

## Database Schema

### Supabase Tables

#### linkedin_profiles
```sql
CREATE TABLE linkedin_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  profile_urn TEXT,
  public_identifier TEXT,
  first_name TEXT,
  last_name TEXT,
  headline TEXT,
  location TEXT,
  industry TEXT,
  profile_picture_url TEXT,
  background_image_url TEXT,
  connections_count INTEGER,
  followers_count INTEGER,
  summary TEXT,
  raw_data JSONB,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### linkedin_analytics
```sql
CREATE TABLE linkedin_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  page_type TEXT,
  impressions INTEGER,
  members_reached INTEGER,
  engagements INTEGER,
  new_followers INTEGER,
  profile_views INTEGER,
  search_appearances INTEGER,
  top_posts JSONB,
  raw_data JSONB,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### post_analytics
```sql
CREATE TABLE post_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  activity_urn TEXT NOT NULL,
  post_content TEXT,
  post_type TEXT,
  impressions INTEGER,
  members_reached INTEGER,
  unique_views INTEGER,
  reactions INTEGER,
  comments INTEGER,
  reposts INTEGER,
  engagement_rate NUMERIC(5,2),
  profile_viewers INTEGER,
  followers_gained INTEGER,
  demographics JSONB,
  raw_data JSONB,
  posted_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### audience_data
```sql
CREATE TABLE audience_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  total_followers INTEGER,
  follower_growth INTEGER,
  demographics_preview JSONB,
  top_job_titles JSONB,
  top_companies JSONB,
  top_locations JSONB,
  top_industries JSONB,
  raw_data JSONB,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### connections
```sql
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  linkedin_id TEXT,
  first_name TEXT,
  last_name TEXT,
  headline TEXT,
  profile_picture TEXT,
  public_identifier TEXT,
  connected_at TIMESTAMPTZ,
  connection_degree INTEGER,
  captured_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### feed_posts
```sql
CREATE TABLE feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  author_id TEXT,
  author_name TEXT,
  author_headline TEXT,
  author_profile_picture TEXT,
  post_text TEXT,
  post_type TEXT,
  activity_urn TEXT,
  like_count INTEGER,
  comment_count INTEGER,
  repost_count INTEGER,
  posted_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### my_posts
```sql
CREATE TABLE my_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  activity_urn TEXT NOT NULL,
  post_text TEXT,
  post_type TEXT,
  impression_count INTEGER,
  like_count INTEGER,
  comment_count INTEGER,
  repost_count INTEGER,
  posted_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### followers
```sql
CREATE TABLE followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  follower_linkedin_id TEXT,
  follower_name TEXT,
  follower_headline TEXT,
  follower_profile_picture TEXT,
  followed_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### comments
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  activity_urn TEXT,
  comment_urn TEXT,
  commenter_id TEXT,
  commenter_name TEXT,
  comment_text TEXT,
  like_count INTEGER,
  commented_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### captured_apis
```sql
CREATE TABLE captured_apis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  category TEXT,
  endpoint TEXT,
  method TEXT,
  response_hash TEXT,
  response_data JSONB,
  captured_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### capture_stats
```sql
CREATE TABLE capture_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL,
  api_calls_captured INTEGER DEFAULT 0,
  feed_posts_captured INTEGER DEFAULT 0,
  analytics_captures INTEGER DEFAULT 0,
  dom_extractions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);
```

#### extension_settings
```sql
CREATE TABLE extension_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  auto_capture_enabled BOOLEAN DEFAULT TRUE,
  capture_feed BOOLEAN DEFAULT TRUE,
  capture_analytics BOOLEAN DEFAULT TRUE,
  capture_profile BOOLEAN DEFAULT TRUE,
  capture_messaging BOOLEAN DEFAULT FALSE,
  sync_enabled BOOLEAN DEFAULT TRUE,
  sync_interval INTEGER DEFAULT 5,
  dark_mode BOOLEAN DEFAULT FALSE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  raw_settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### sync_metadata
```sql
CREATE TABLE sync_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  pending_changes INTEGER DEFAULT 0,
  sync_errors JSONB,
  device_id TEXT,
  extension_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Message Protocol

### Content Script to Service Worker

| Message Type | Direction | Payload | Description |
|-------------|-----------|---------|-------------|
| `API_CAPTURED` | CS -> SW | `{endpoint, method, url, data, category}` | Raw API response captured |
| `ANALYTICS_CAPTURED` | CS -> SW | `{analytics data}` | Analytics data from DOM |
| `POST_ANALYTICS_CAPTURED` | CS -> SW | `{post analytics}` | Individual post metrics |
| `AUDIENCE_DATA_CAPTURED` | CS -> SW | `{audience data}` | Audience demographics |
| `AUTO_CAPTURE_CREATOR_ANALYTICS` | CS -> SW | `{creator analytics}` | Auto-captured analytics |
| `AUTO_CAPTURE_POST_ANALYTICS` | CS -> SW | `{post analytics}` | Auto-captured post data |
| `AUTO_CAPTURE_AUDIENCE` | CS -> SW | `{audience data}` | Auto-captured audience |
| `AUTO_CAPTURE_PROFILE` | CS -> SW | `{profile data}` | Auto-captured profile |
| `AUTO_CAPTURE_LOG` | CS -> SW | `{type, url, success}` | Capture event log |

### Popup to Service Worker

| Message Type | Direction | Payload | Description |
|-------------|-----------|---------|-------------|
| `GET_DATA` | Popup -> SW | `{key}` | Retrieve stored data |
| `SAVE_DATA` | Popup -> SW | `{key, data}` | Save data |
| `GET_ALL_DATA` | Popup -> SW | - | Get all stored data |
| `CHECK_AUTH` | Popup -> SW | - | Check LinkedIn auth status |
| `GET_CAPTURE_STATS` | Popup -> SW | - | Get capture statistics |
| `GET_TREND_DATA` | Popup -> SW | `{days}` | Get trend data for charts |
| `EXPORT_JSON` | Popup -> SW | - | Export all data as JSON |
| `SUPABASE_AUTH_STATUS` | Popup -> SW | - | Check Supabase auth |
| `SUPABASE_SYNC_NOW` | Popup -> SW | - | Trigger manual sync |

### Popup to Content Script

| Message Type | Direction | Payload | Description |
|-------------|-----------|---------|-------------|
| `EXTRACT_NOW` | Popup -> CS | - | Force immediate extraction |
| `GET_PAGE_TYPE` | Popup -> CS | - | Get current page type |
| `GET_AUTH_STATUS` | Popup -> CS | - | Check LinkedIn login |
| `SET_AUTO_CAPTURE` | Popup -> CS | `{enabled}` | Enable/disable auto-capture |
| `FORCE_CAPTURE` | Popup -> CS | - | Force capture current page |

---

## Security Considerations

### Data Privacy

1. **Local Storage First**
   - All data stored locally before cloud sync
   - User controls what syncs to cloud
   - No data sent without explicit authentication

2. **Authentication Tokens**
   - LinkedIn `li_at` cookie read-only for auth check
   - Never stored or transmitted
   - Used only to verify login status

3. **Supabase Security**
   - Row Level Security (RLS) enabled
   - Users can only access own data
   - JWT token authentication

### Content Security Policy

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.googleapis.com;"
  }
}
```

### Permissions

```json
{
  "permissions": [
    "cookies",        // Check LinkedIn auth status
    "storage",        // Local data persistence
    "activeTab",      // Access current tab
    "scripting",      // Inject content scripts
    "alarms",         // Scheduled tasks
    "notifications",  // User alerts
    "identity"        // Google OAuth for Drive backup
  ],
  "host_permissions": [
    "https://*.linkedin.com/*",
    "https://www.linkedin.com/*",
    "https://*.supabase.co/*"
  ]
}
```

---

## Appendix: File Structure

```
extension/
├── manifest.json
├── background/
│   └── service-worker.js        # Compiled from src/background/
├── content/
│   ├── main-world-interceptor.js
│   ├── dom-extractor.js
│   ├── auto-capture.js
│   ├── company-extractor.js
│   ├── content-script.js
│   └── styles.css
├── popup/
│   └── popup.html
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── lib/
│   └── supabase/
│       ├── client.js
│       ├── auth.js
│       ├── local-cache.js
│       ├── sync.js
│       └── storage.js
└── src/                         # TypeScript source
    ├── background/
    │   ├── service-worker.ts
    │   ├── supabase-sync-bridge.ts
    │   ├── alarms.ts
    │   ├── notifications.ts
    │   ├── google-auth.ts
    │   └── drive-sync.ts
    ├── content/
    │   ├── content-script.ts
    │   ├── main-world-interceptor.ts
    │   ├── dom-extractor.ts
    │   ├── auto-capture.ts
    │   └── company-extractor.ts
    ├── popup/
    │   ├── main.tsx
    │   ├── App.tsx
    │   └── components/
    └── shared/
        ├── types.ts
        ├── storage.ts
        ├── indexeddb.ts
        └── history-manager.ts
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 4.1.0 | 2026-02-03 | AGI Ready | Initial architecture document |
