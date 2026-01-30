# LinkedIn Data Extractor - Testing Guide

**Last Updated:** 2026-01-30

---

## Quick Start Testing

### Step 1: Reload Extension
1. Open Chrome and go to `chrome://extensions`
2. Find "LinkedIn Data Extractor"
3. Click the refresh button (🔄) to reload the extension
4. Open DevTools in service worker to see logs

### Step 2: Visit These Pages (In Order)

| # | Page | URL | Data Captured |
|---|------|-----|---------------|
| 1 | **Your Profile** | `linkedin.com/in/YOUR-USERNAME/` | Name, Headline, Followers, Connections |
| 2 | **Creator Dashboard** | `linkedin.com/dashboard/` | Impressions, Followers, Profile Views, Search Appearances |
| 3 | **Creator Analytics** | `linkedin.com/analytics/creator/` | Detailed impressions, Members reached, Engagements |
| 4 | **Audience Analytics** | `linkedin.com/analytics/creator/audience/` | Total followers, Demographics, Growth % |
| 5 | **Profile Views** | `linkedin.com/analytics/profile-views/` | Profile views count, Search appearances count |

---

## Expected Console Logs

When you visit each page, you should see logs like:

### Profile Page
```
[AutoCapture] Page detected: profile main
[CAPTURE][PROFILE] Extracting profile data
[CAPTURE][PROFILE] Extracted: {name, headline, followers_count, connections_count}
[CAPTURE][PROFILE] Saving to storage: {...}
[SyncBridge] Queued linkedin_profile for sync to linkedin_profiles
[SyncBridge] Syncing 1 records to linkedin_profiles
[SyncBridge] Successfully synced 1 records to linkedin_profiles
```

### Dashboard/Analytics Page
```
[AutoCapture] Page detected: creator_analytics dashboard
[CAPTURE][CREATOR_ANALYTICS] Extracting analytics data
[CAPTURE][ANALYTICS] Extracted: {impressions: 95, engagements: 12, searchAppearances: 44}
[CAPTURE][ANALYTICS] Saving to storage: {...}
[SyncBridge] Queued linkedin_analytics for sync
```

### Profile Views Page
```
[AutoCapture] Page detected: profile_views list
[CAPTURE][PROFILE_VIEWS] Extracting profile views data
[CAPTURE][PROFILE_VIEWS] Extracted: {profileViews: 95, searchAppearances: 44}
```

---

## Data Fields Captured

### linkedin_profiles table
| Field | Source | Description |
|-------|--------|-------------|
| full_name | Profile page | Your full name |
| headline | Profile page | Your headline/title |
| followers_count | Profile page | Total followers |
| connections_count | Profile page | Total connections |
| profile_url | Profile page | Your LinkedIn URL |
| profile_picture_url | Profile page | Avatar image URL |

### linkedin_analytics table
| Field | Source | Description |
|-------|--------|-------------|
| impressions | Dashboard/Analytics | Total post impressions |
| engagements | Analytics | Total engagements (reactions + comments + reposts) |
| members_reached | Analytics | Unique members who saw content |
| profile_views | Dashboard/Profile Views | Total profile views |
| search_appearances | Dashboard/Profile Views | Times appeared in search |
| new_followers | Analytics | New followers this period |
| engagement_rate | Calculated | (engagements / impressions) * 100 |

### audience_data table
| Field | Source | Description |
|-------|--------|-------------|
| total_followers | Audience Analytics | Total follower count |
| follower_growth | Audience Analytics | Growth percentage (integer) |
| follower_growth_formatted | Audience Analytics | Original "5.2%" string |
| top_locations | Audience Demographics | Location breakdown |
| top_industries | Audience Demographics | Industry breakdown |
| top_job_titles | Audience Demographics | Job title breakdown |

---

## Verifying Data in Supabase

After visiting all pages, check Supabase:

### Using Supabase Dashboard
1. Go to your Supabase project
2. Click "Table Editor"
3. Check these tables:
   - `linkedin_profiles` - Should have your profile data
   - `linkedin_analytics` - Should have impressions, engagements, etc.
   - `audience_data` - Should have follower count and demographics

### Expected SQL Query Results
```sql
-- Check profile data
SELECT full_name, followers_count, connections_count, updated_at
FROM linkedin_profiles
WHERE user_id = 'YOUR_USER_ID';

-- Check analytics data
SELECT impressions, engagements, members_reached, profile_views, search_appearances, captured_at
FROM linkedin_analytics
WHERE user_id = 'YOUR_USER_ID'
ORDER BY captured_at DESC
LIMIT 5;

-- Check audience data
SELECT total_followers, follower_growth, follower_growth_formatted, captured_at
FROM audience_data
WHERE user_id = 'YOUR_USER_ID';
```

---

## Troubleshooting

### Issue: No data captured
**Cause:** Auto-capture is debounced (5 min per page type)
**Fix:** Wait 5 minutes and revisit the page, or check the extension popup for "Force Capture" button

### Issue: Sync failed
**Check:**
1. Are you logged into the extension? (Check popup)
2. Is there a pending queue? (Check popup sync status)
3. Check DevTools console for `[ERROR][SYNC]` messages

### Issue: Data shows in extension but not Supabase
**Check:**
1. Open extension popup
2. Go to "Cloud Sync" tab
3. Check "Pending Changes" count
4. Click "Sync Now" to force sync
5. Check for errors in console

### Issue: Wrong field values in database
**Check:** The console logs should show both input and output:
```
[SYNC][PREPARE] Input data for linkedin_analytics: {...}
[SYNC][PREPARE] Output data for linkedin_analytics: {...}
```

---

## Frontend Dashboard Verification

After data is in Supabase, verify on the ChainLinked dashboard:

1. Go to `localhost:3000/dashboard` (or your app URL)
2. Check "Analytics" section for:
   - Impressions with growth %
   - Engagement rate with trend
   - Followers count
   - Profile views
   - Search appearances
   - Connections count
   - Members reached

If values show 0 or loading forever, check:
1. Browser DevTools Network tab for API errors
2. Console for fetch errors
3. Supabase table data matches expected format

---

## Log Prefixes Reference

| Prefix | Component | Description |
|--------|-----------|-------------|
| `[AutoCapture]` | Content Script | Page detection and capture triggering |
| `[CAPTURE][type]` | Content Script | Data extraction logs |
| `[DOMExtractor]` | Content Script | DOM parsing logs |
| `[ServiceWorker]` | Background | Message handling |
| `[SyncBridge]` | Background | Supabase sync operations |
| `[SYNC][PREPARE]` | Background | Data transformation |
| `[SYNC][PROCESS]` | Background | Batch sync processing |
| `[ERROR][SYNC]` | Background | Sync errors |
