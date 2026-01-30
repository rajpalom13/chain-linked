# LinkedIn Data Extractor - Comprehensive Fix Document

**Created:** 2026-01-30
**Purpose:** Reference document for all agents fixing the extension

---

## EXECUTIVE SUMMARY

The extension captures data but the frontend shows incorrect/missing values because:
1. **Extension doesn't capture all required metrics** (search_appearances, engagement_rate change)
2. **Historical data not being stored properly** for trend calculations
3. **Field naming mismatches** between extension storage and Supabase tables
4. **Sync failures** not properly logged/handled
5. **DOM extraction selectors outdated** for current LinkedIn layout

---

## PART 1: EXTENSION ARCHITECTURE

### Data Flow
```
LinkedIn Page → API Interceptor → Content Script → Service Worker → Chrome Storage → Supabase Sync
```

### Key Files
| File | Purpose |
|------|---------|
| `src/background/service-worker.ts` | Main message handler (2068 lines) |
| `src/background/supabase-sync-bridge.ts` | Supabase sync layer (1004 lines) |
| `src/content/auto-capture.ts` | Page detection & capture trigger |
| `src/content/dom-extractor.ts` | DOM-based data extraction |
| `src/content/main-world-interceptor.ts` | Fetch/XHR interception |
| `src/shared/types.ts` | Type definitions |

### Storage Keys → Supabase Tables
| Storage Key | Table | Primary Key |
|------------|-------|-------------|
| `linkedin_profile` | `linkedin_profiles` | `user_id` |
| `linkedin_analytics` | `linkedin_analytics` | `id` (auto) |
| `linkedin_post_analytics` | `post_analytics` | `id` (auto) |
| `linkedin_audience` | `audience_data` | `user_id` |
| `extension_settings` | `extension_settings` | `user_id` |

---

## PART 2: CRITICAL ISSUES TO FIX

### Issue 1: Missing Analytics Metrics
**Location:** `src/content/auto-capture.ts` and `src/content/dom-extractor.ts`
**Problem:** Frontend expects these metrics but extension doesn't capture them:
- `search_appearances` - Not being extracted
- `connections_count` - Only from profile, not analytics
- Trend/change values for all metrics

**Fix Required:**
1. Add search appearances extraction from `/analytics/profile-views` page
2. Store previous values to calculate changes
3. Ensure ALL fields map to correct database columns

### Issue 2: Analytics History Not Populated
**Location:** `src/background/service-worker.ts` (lines 850-900)
**Problem:** `analytics_history` table is empty. Frontend needs historical data for trends.

**Fix Required:**
1. On every analytics capture, also insert into `analytics_history`
2. Store daily snapshots with date-based keys
3. Calculate and store growth percentages

### Issue 3: Field Mapping Errors
**Location:** `src/background/supabase-sync-bridge.ts`
**Problem:** camelCase fields not properly converted to snake_case

**Field Map That MUST Be Applied:**
```javascript
const FIELD_MAPPINGS = {
  // Profile fields
  linkedinId: 'linkedin_id',
  firstName: 'first_name',
  lastName: 'last_name',
  fullName: 'full_name',
  profileUrl: 'profile_url',
  profilePictureUrl: 'profile_picture_url',
  connectionCount: 'connections_count',
  followerCount: 'followers_count',

  // Analytics fields
  membersReached: 'members_reached',
  profileViews: 'profile_views',
  searchAppearances: 'search_appearances',
  newFollowers: 'new_followers',
  engagementRate: 'engagement_rate',
  capturedAt: 'captured_at',
  rawData: 'raw_data',

  // Post analytics fields
  activityUrn: 'activity_urn',
  postContent: 'post_content',
  postedAt: 'posted_at',
  mediaType: 'media_type',

  // Audience fields
  totalFollowers: 'total_followers',
  followerGrowth: 'follower_growth',
  topLocations: 'top_locations',
  topIndustries: 'top_industries',
  topJobTitles: 'top_job_titles',
  topCompanies: 'top_companies'
};
```

### Issue 4: DOM Extractor Selectors Outdated
**Location:** `src/content/dom-extractor.ts`
**Problem:** LinkedIn changes their DOM frequently. Current selectors may not match.

**Selectors to Verify/Update:**
```javascript
// Profile Stats
'.pv-top-card--list-bullet .t-bold' // May have changed
'.artdeco-entity-lockup__subtitle' // May have changed

// Analytics Page
'.analytics-stat-card__value' // Verify still exists
'.analytics-stat-card__metric-name' // Verify still exists
```

### Issue 5: Logging Insufficient
**Location:** All files
**Problem:** Hard to debug what's being captured and why sync fails

**Fix Required:**
1. Add detailed logging with `[CAPTURE]`, `[SYNC]`, `[ERROR]` prefixes
2. Log exact data being captured
3. Log exact data being sent to Supabase
4. Log any transformation applied

---

## PART 3: DATA MAPPING SPECIFICATION

### Frontend Expected Data Structure

**AnalyticsCards Component Expects:**
```typescript
{
  impressions: { value: number, change: number },      // % change from last period
  engagementRate: { value: number, change: number },  // calculated: (engagements/impressions)*100
  followers: { value: number, change: number },       // from linkedin_profiles
  profileViews: { value: number, change: number },    // from linkedin_analytics
  searchAppearances: { value: number, change: number },
  connections: { value: number, change: number },     // from linkedin_profiles
  membersReached: { value: number, change: number }   // from linkedin_analytics
}
```

### Database Schema Required

**linkedin_analytics table:**
```sql
- id (auto)
- user_id (uuid, FK)
- impressions (integer)
- engagements (integer)
- members_reached (integer)
- profile_views (integer)
- search_appearances (integer)
- new_followers (integer)
- engagement_rate (numeric)
- raw_data (jsonb)
- captured_at (timestamp)
- created_at (timestamp)
```

**linkedin_profiles table:**
```sql
- id (auto)
- user_id (uuid, FK)
- linkedin_id (text)
- first_name (text)
- last_name (text)
- full_name (text)
- headline (text)
- profile_url (text)
- profile_picture_url (text)
- followers_count (integer)
- connections_count (integer)
- about (text)
- location (text)
- created_at (timestamp)
- updated_at (timestamp)
```

**analytics_history table:**
```sql
- id (auto)
- user_id (uuid, FK)
- date (date, unique per user)
- impressions (integer)
- engagements (integer)
- members_reached (integer)
- profile_views (integer)
- search_appearances (integer)
- followers_count (integer)
- connections_count (integer)
- engagement_rate (numeric)
- created_at (timestamp)
```

---

## PART 4: PAGES TO CAPTURE DATA FROM

### Required LinkedIn Pages for Full Data

| Page | URL Pattern | Data Captured |
|------|-------------|---------------|
| Profile | `/in/{username}/` | name, headline, followers, connections, about |
| Creator Analytics | `/analytics/creator/` | impressions, engagements, new_followers |
| Audience Analytics | `/analytics/creator/audience/` | total_followers, demographics |
| Post Summary | `/analytics/post-summary/urn:li:activity:*` | per-post metrics |
| Profile Views | `/analytics/profile-views/` | profile_views, search_appearances |

### Capture Order Recommendation
1. First visit Profile page - captures basic profile
2. Then visit `/analytics/creator/` - captures main analytics
3. Then visit `/analytics/creator/audience/` - captures audience data
4. Then visit `/analytics/profile-views/` - captures view stats

---

## PART 5: IMPLEMENTATION CHECKLIST

### Content Scripts Fixes
- [ ] Update DOM selectors in `dom-extractor.ts` for current LinkedIn layout
- [ ] Add search_appearances extraction
- [ ] Add proper error handling with fallbacks
- [ ] Add verbose logging

### Service Worker Fixes
- [ ] Fix field mapping in storage handlers
- [ ] Add analytics_history insertion on every capture
- [ ] Store previous values for change calculation
- [ ] Add comprehensive logging

### Supabase Sync Fixes
- [x] Fix all field name mappings (camelCase → snake_case)
- [x] Ensure user_id is always included
- [x] Handle sync errors gracefully
- [x] Log exactly what's being synced
- [x] Remove `created_at` from linkedin_profiles TABLE_COLUMNS (doesn't exist in DB)
- [x] Remove `created_at` from linkedin_analytics TABLE_COLUMNS (doesn't exist in DB)
- [x] Remove `follower_growth_formatted` from audience_data TABLE_COLUMNS (doesn't exist in DB)
- [x] Fix automatic timestamp insertion to only add created_at for tables that have it

### Testing Verification
- [ ] Capture profile data → verify in `linkedin_profiles` table
- [ ] Capture analytics → verify in `linkedin_analytics` table
- [ ] Verify historical data in `analytics_history`
- [ ] Verify frontend displays correct values

---

## PART 6: LOGGING STANDARDS

All log messages MUST follow this format:
```javascript
console.log('[COMPONENT][ACTION] Description', { data });
```

Components:
- `[CAPTURE]` - Data capture operations
- `[SYNC]` - Supabase sync operations
- `[STORAGE]` - Chrome storage operations
- `[ERROR]` - Error conditions
- `[DEBUG]` - Debug information

Examples:
```javascript
console.log('[CAPTURE][ANALYTICS] Extracted analytics data', { impressions, engagements, followers });
console.log('[SYNC][PREPARE] Preparing data for Supabase', { table, fields, values });
console.log('[SYNC][SUCCESS] Synced to Supabase', { table, count: records.length });
console.log('[ERROR][SYNC] Failed to sync', { table, error: error.message });
```

---

## PART 7: AGENT TASKS

### Agent 1: Content Script Fixer
- Fix `dom-extractor.ts` selectors
- Fix `auto-capture.ts` data extraction
- Add missing field extractions
- Add comprehensive logging

### Agent 2: Service Worker Fixer
- Fix message handlers for correct field mapping
- Add analytics_history storage
- Add change/trend calculation
- Fix storage key handling

### Agent 3: Supabase Sync Fixer
- Fix all field mappings in `supabase-sync-bridge.ts`
- Ensure proper data transformation
- Add detailed sync logging
- Handle errors properly

### Agent 4: Quality Assurance
- Verify all fixes work end-to-end
- Test each capture page
- Verify Supabase data
- Verify frontend display

---

## APPENDIX: CURRENT LINKEDIN DOM STRUCTURE (2026)

### Analytics Dashboard
```html
<!-- Main stats container -->
<div class="analytics-feed-update-stats">
  <div class="feed-update-stats-header">
    <span class="feed-update-stats-header__metric">Impressions</span>
    <span class="feed-update-stats-header__stat-value">95</span>
  </div>
</div>

<!-- Alternative structure -->
<div data-test-id="analytics-stat-card">
  <p class="t-20 t-bold">95</p>
  <p class="t-14 t-normal">Impressions</p>
</div>
```

### Profile Page
```html
<h1 class="text-heading-xlarge">Full Name</h1>
<div class="text-body-medium">Headline</div>
<span class="t-bold">{number}</span> followers
<span class="t-bold">{number}</span> connections
```

---

**END OF DOCUMENT**
