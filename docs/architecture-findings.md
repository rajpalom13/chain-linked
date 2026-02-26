# ChainLinked Architecture Findings

## 1. Data Pipeline: LinkedIn → Extension → Supabase

### Overview

The Chrome extension is the **sole data extraction layer**. It uses LinkedIn's internal Voyager API via session cookies that exist only in the user's browser. There is no OAuth-based server-side access to LinkedIn analytics data.

### Authentication Flow

```
User logs into LinkedIn in Chrome
        ↓
Browser stores cookies: li_at, JSESSIONID
        ↓
Extension reads cookies at runtime via chrome.cookies.get()
        ↓
Constructs Voyager API headers (csrf-token from JSESSIONID)
        ↓
Makes authenticated GET requests to Voyager endpoints
        ↓
Cookies are NEVER persisted in chrome.storage or Supabase
```

**Key Code** (`extension/src/background/linkedin-api.ts`):
```typescript
const [liAt, jsessionid] = await Promise.all([
  chrome.cookies.get({ url: 'https://www.linkedin.com', name: 'li_at' }),
  chrome.cookies.get({ url: 'https://www.linkedin.com', name: 'JSESSIONID' }),
]);
// CSRF token = JSESSIONID with quotes stripped
csrfToken: jsessionid.value.replace(/"/g, '')
```

### Voyager API Endpoints Used

| Endpoint | Purpose | Data Returned |
|----------|---------|---------------|
| `/voyager/api/me` | Bootstrap: get current user | profileUrn, publicIdentifier |
| `/voyager/api/contentcreation/creatorAnalytics?q=analytics` | Creator metrics | impressions, engagement, followers, profile views |
| `/voyager/api/identity/dash/profiles?q=memberIdentity` | User profile | name, headline, connections, followers count |
| `/voyager/api/contentcreation/creatorAnalytics?q=audience` | Audience demographics | follower count, demographics breakdown |
| `/voyager/api/graphql?queryId=voyagerFeedDashProfileUpdates` | User's posts | post content, reactions, comments, reposts |
| `/voyager/api/identity/wvmpCards` | Profile views | who viewed your profile data |

### Extension Sync Schedule

- **Frequency**: Every 240 minutes ± 60 minutes random jitter
- **Max API calls per cycle**: 6 endpoints
- **Inter-request delay**: 1-4 seconds (anti-detection)
- **Circuit breaker**: Exponential backoff on failures, max threshold before stopping

### Data Flow: Extension → chrome.storage → Supabase

```
Voyager API Response
        ↓
Stored in chrome.storage.local with keys:
  linkedin_profile, linkedin_analytics, linkedin_analytics_history,
  linkedin_audience, linkedin_audience_history, linkedin_my_posts,
  linkedin_comments, linkedin_connections, linkedin_followers,
  linkedin_feed_posts, captured_apis, auto_capture_stats, extension_settings
        ↓
Queued in supabase_pending_changes array
        ↓
Transformation layer (supabase-sync-bridge.ts):
  - camelCase → snake_case field mapping
  - String numbers ("1,234") → integers
  - Percentage strings ("45.2%") → floats
  - Unix ms timestamps → ISO 8601
  - Unknown fields → raw_data JSONB
  - user_id injection from Supabase auth
        ↓
Upserted to Supabase tables via direct client calls
Also available via POST /api/sync endpoint (server-side)
```

### Sync Bridge Table Mapping

| chrome.storage Key | Supabase Table | Conflict Key |
|-------------------|----------------|--------------|
| linkedin_profile | linkedin_profiles | user_id |
| linkedin_analytics | linkedin_analytics | id |
| linkedin_post_analytics | post_analytics | user_id, activity_urn |
| linkedin_audience | audience_data | user_id |
| linkedin_analytics_history | analytics_history | user_id, date |
| linkedin_audience_history | audience_history | user_id, date |
| linkedin_my_posts | my_posts | user_id, activity_urn |
| linkedin_connections | connections | id |
| linkedin_followers | followers | id |
| linkedin_feed_posts | feed_posts | user_id, activity_urn |
| linkedin_comments | comments | id |
| captured_apis | captured_apis | id |
| auto_capture_stats | capture_stats | user_id, date |
| extension_settings | extension_settings | user_id |

---

## 2. Architecture Decision: Extension-First Data Pipeline (No Server-Side Cookies)

### Decision

**No cookies are stored server-side.** The Chrome extension remains the sole data extraction layer. Instead of a server-side midnight cron, we ensure the extension syncs data automatically when the user opens Chrome, giving us a reliable daily capture point.

### Why Not Store Cookies Server-Side?

The `linkedin_credentials` table exists in Supabase with the right schema, and a server-side `VoyagerClient` (`lib/linkedin/voyager-client.ts`) is ready to use it. However, storing LinkedIn session cookies (`li_at`, `JSESSIONID`) server-side carries significant risk:
- **Account security**: If the database is compromised, attackers get full LinkedIn session access
- **ToS violation risk**: Forwarding session cookies to a third-party server is a gray area
- **Cookie expiration**: `li_at` expires and can be revoked by LinkedIn at any time
- **Encryption overhead**: Would need at-rest encryption, key rotation, validity monitoring

### Chosen Approach: Auto-Sync on Chrome Startup

Instead, the extension triggers an immediate data sync every time the user opens Chrome:

```
User opens Chrome
        ↓
chrome.runtime.onStartup fires
        ↓
initBackgroundSync(isStartup=true) called
        ↓
triggerSync(manual=false, startup=true) called
  - Bypasses 30-min minimum interval check
  - Bypasses active-hours check
  - Still checks: sync enabled, circuit breaker, LinkedIn auth
        ↓
Full sync cycle executes (all Voyager endpoints)
        ↓
Data arrives in Supabase as snapshots
        ↓
Server-side Supabase functions compute deltas from consecutive snapshots
```

**Changes made:**
- `background-sync.ts`: `initBackgroundSync(isStartup)` accepts startup flag
- `background-sync.ts`: `triggerSync(manual, startup)` bypasses interval guard on startup
- `background-sync.ts`: `shouldSyncNow(manual, startup)` skips active-hours + min-interval on startup
- `service-worker.ts`: `onStartup` handler passes `true` to `initBackgroundSync`

### How This Meets the Ticket Requirements

The tickets require daily deltas. With auto-startup sync:

1. **Daily capture**: Most users open Chrome at least once daily. Each open triggers a full sync.
2. **Delta computation**: Server-side Supabase functions compare today's snapshot with yesterday's to compute deltas. No Voyager API calls needed from the server.
3. **Rollup pipeline**: Supabase pg_cron or Inngest scheduled function runs at midnight to:
   - Compute deltas from the latest two snapshots per user
   - Write to `profile_analytics_daily` and `post_analytics_daily`
   - Roll up into accumulative/weekly/monthly/quarterly/yearly tables
4. **Graceful gaps**: If a user doesn't open Chrome for a day, that day has no data point. The `analysis_date` column simply skips that date. This is acceptable and noted in the ticket spec ("gaps in dates are fine").

### Tradeoff vs. Server-Side Approach

| Aspect | Extension-First (chosen) | Server-Side Cookies |
|--------|-------------------------|-------------------|
| Security | No cookies leave browser | Cookies stored in DB |
| Reliability | Depends on user opening Chrome | Runs regardless |
| Data freshness | On Chrome open + every 4h | Midnight exactly |
| Complexity | Simpler, no encryption needed | Need encryption, monitoring |
| Daily capture | ~95% of active users | 100% of users with valid cookies |

---

## 3. Current Supabase Database Analysis

### Table Inventory (52 tables total)

**Analytics Tables (Current)**:
| Table | Rows | Purpose |
|-------|------|---------|
| linkedin_analytics | 156 | Raw creator analytics snapshots |
| analytics_history | 7 | Daily rollup (user_id + date unique) |
| post_analytics | 19 | Per-post engagement snapshots |
| audience_data | 3 | Current audience demographics |
| audience_history | 3 | Daily audience tracking |
| my_posts | 59 | User's posts with engagement counts |
| linkedin_profiles | 5 | LinkedIn profile data |
| linkedin_credentials | 0 | Empty — credentials for server-side API |
| network_data | 0 | Empty — not populated yet |
| sync_metadata | 0 | Empty — sync tracking not used |

**Other Key Tables**:
| Table | Purpose |
|-------|---------|
| profiles | App user profiles |
| companies, teams, team_members, team_invitations | Team management |
| scheduled_posts | Post scheduling (pg_cron) |
| templates, template_categories, template_favorites | Template library |
| inspiration_posts, saved_inspirations | Content inspiration |
| discover_posts, discover_news_articles | Discovery feed |
| swipe_preferences, swipe_wishlist, wishlist_collections | Swipe interface |
| generated_suggestions, suggestion_generation_runs | AI suggestions |
| writing_style_profiles | User writing style analysis |
| brand_kits | Brand identity extraction |
| system_prompts, prompt_versions, prompt_usage_logs, prompt_test_results | Prompt management |
| research_sessions, generated_posts | AI research |
| linkedin_research_posts | LinkedIn research data |
| notifications, invitations | App notifications |
| carousel_templates | Carousel creator templates |

### Current Schema vs. Required New Tables

| Required Table (Tickets) | Exists? | Gap |
|--------------------------|---------|-----|
| profile_analytics_daily | NO | New table needed |
| profile_analytics_accumulative | NO | New table needed |
| post_analytics_daily | NO | New table needed (different from post_analytics) |
| post_analytics_accumulative | NO | New table needed |
| post_analytics_wk | NO | New table needed |
| post_analytics_mth | NO | New table needed |
| post_analytics_qtr | NO | New table needed |
| post_analytics_yr | NO | New table needed |
| analytics_tracking_status | NO | New lookup table needed |

**Current `post_analytics`** stores snapshots (total impressions, reactions at capture time).
**Required `post_analytics_daily`** stores daily deltas (impressions_gained, reactions_gained per day).

These are fundamentally different data models. The current tables cannot be transformed into the required ones without the Voyager API providing daily delta extraction.

### RLS Policies

Only `linkedin_profiles` has RLS enabled. All analytics tables are **unprotected**. This must be fixed in the migration.

### Existing Indexes (Good)

- `analytics_history`: Composite (user_id, date) UNIQUE — matches required pattern
- `post_analytics`: Composite (user_id, activity_urn) UNIQUE
- `my_posts`: Composite (user_id, activity_urn) UNIQUE + media index
- `linkedin_credentials`: (user_id) UNIQUE — ready for Option A

### Existing Functions

Only `sync_linkedin_to_profiles` exists. No analytics aggregation, rollup, or delta functions.

---

## 4. Recommended Implementation Order

### Phase 1: Extension Startup Sync (DONE)
- `background-sync.ts`: `initBackgroundSync(isStartup)` triggers immediate sync on Chrome open
- `background-sync.ts`: `shouldSyncNow` bypasses interval/active-hours checks for startup
- `service-worker.ts`: `onStartup` passes `true` to init

### Phase 2: Schema Migration (Supabase Migrations)
1. Create `analytics_tracking_status` lookup table (seed with 4 statuses)
2. Create `profile_analytics_daily` + `profile_analytics_accumulative`
3. Create `post_analytics_daily` + `post_analytics_accumulative`
4. Create `post_analytics_wk`, `post_analytics_mth`, `post_analytics_qtr`, `post_analytics_yr`
5. Add RLS policies to ALL new tables (`auth.uid() = user_id`)
6. Add indexes: (user_id, analysis_date), (user_id, post_id, analysis_date)

### Phase 3: Delta Computation Pipeline (Supabase Functions + Inngest)
The pipeline runs at midnight via Inngest cron. It does NOT call Voyager API — it computes deltas from the extension's snapshot data already in Supabase.

1. **Profile daily deltas**: Compare latest `linkedin_analytics` snapshot with previous day's snapshot → write `profile_analytics_daily`
2. **Post daily deltas**: Compare latest `post_analytics` snapshot per post with previous → write `post_analytics_daily`
3. **Accumulative rollup**: Sum all daily rows per post/profile → update accumulative tables
4. **Period rollups**: Weekly/monthly/quarterly/yearly with `is_finalized` flags
5. **Phase transitions**: Move posts through tracking status 1→2→3→0 based on age

Delta calculation logic:
```sql
-- Example: profile daily delta
INSERT INTO profile_analytics_daily (user_id, analysis_date, followers_gained, ...)
SELECT
  curr.user_id,
  CURRENT_DATE - 1,
  COALESCE(curr.followers_count, 0) - COALESCE(prev.followers_count, 0),
  ...
FROM linkedin_profiles curr
LEFT JOIN profile_analytics_accumulative prev
  ON curr.user_id = prev.user_id
  AND prev.analysis_date = CURRENT_DATE - 2
WHERE curr.updated_at >= CURRENT_DATE - INTERVAL '1 day';
```

### Phase 4: Frontend (FE-001 through FE-006)
1. FE-001: Dashboard layout + filter bar with URL params
2. FE-002: Summary bar (total + average display)
3. FE-003: Compare button + comparison logic
4. FE-004: Main trend chart (Recharts area chart)
5. FE-005: Comparison overlay on chart
6. FE-006: Data table with granularity toggle + CSV export

### Key FK Mapping Decision
The tickets reference `post_id FK to posts`. Current table is `my_posts`. Options:
- Use `my_posts.id` as the FK (recommended: avoid table rename)
- Create a `posts` view over `my_posts` for cleaner naming

---

## 5. Security Considerations

### No Cookie Storage Required
By keeping the extension as the sole data extraction layer, we avoid storing session cookies server-side entirely. The `linkedin_credentials` table remains empty and unused.

### Rate Limiting
- Extension already uses jitter (1-4s between requests) and circuit breaker
- Startup sync respects all safety mechanisms except the 30-min interval check
- Anti-detection: fresh UUID per request in `x-li-page-instance` header

### Data Access
- Add RLS to ALL 9 new analytics tables
- Policy: `auth.uid() = user_id` for SELECT/INSERT/UPDATE
- Service role for Inngest cron job writes (bypass RLS)
