# LinkedIn Voyager API — Complete Network Request Analysis Report

## 1. Overview
LinkedIn's internal API is called Voyager API. It lives at `https://www.linkedin.com/voyager/api/` and uses two request styles: REST-style endpoints and GraphQL-style endpoints (with predefined query IDs, not freeform GraphQL). Your browser extension can intercept these to save your posts, engagement, followers, metrics, and profile data.

## 2. Authentication & Required Headers

### Cookies (sent automatically by the browser)
- **li_at** — Master authentication cookie. httpOnly, sent with every request automatically. Extract via `chrome.cookies.get`. Without it, every API call returns 401.
- **JSESSIONID** — Contains the CSRF token. Format: `"ajax:XXXXXXXXXXXXXXXXXX"` (quoted, prefixed with ajax:). The quotes are part of the cookie value.
- Other cookies present (18 total): `li_sugr`, `bcookie`, `lang`, `liap`, `sdui_ver`, `timezone`, `_guid`, `AnalyticsSyncHistory`, `lms_ads`, `lms_analytics`, `li_theme`, `li_theme_set`, `lidc`, and Adobe/Google analytics cookies.
- Most not required, but `li_at`, `JSESSIONID`, `bcookie`, and `lidc` should be forwarded.

### Required Request Headers

| Header | Value | Purpose |
|--------|-------|---------|
| csrf-token | Value of JSESSIONID cookie without quotes (e.g., `ajax:1263431060261657376`) | CSRF protection — if missing, you get 403 |
| accept | `application/vnd.linkedin.normalized+json+2.1` | Tells Voyager to return normalized JSON with included entities |
| x-restli-protocol-version | `2.0.0` | Rest.li framework protocol version |
| x-li-lang | `en_US` | Language preference |
| x-li-track | `{"clientVersion":"1.0.0","osName":"web","timezoneOffset":5.5,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}` | Client tracking metadata |

Additional optional headers: `x-li-page-instance` (from meta tag clientPageInstanceId), and standard browser headers.

Credentials: All requests must include `credentials: 'include'` (for fetch) or `withCredentials: true` (for XHR) to send cookies.

## 3. API Architecture

### Response Format
Every successful Voyager API response has this structure:
```json
{
  "data": { ... },       // The primary response data
  "meta": { "microSchema": { ... } },  // Schema metadata
  "included": [ ... ]    // Array of normalized entities (denormalized objects)
}
```

The `included` array is key — it contains all entities referenced by the response, each tagged with a `$type` field like `com.linkedin.voyager.dash.identity.profile.Profile`. Entities reference each other via `entityUrn` strings.

### URN Format
LinkedIn uses URNs (Uniform Resource Names) as entity IDs throughout:
- Profile URN: `urn:li:fsd_profile:ACoAAEh4nZsB-8yA3l26vt8mnsfxEF9_ola4Ybk`
- The memberIdentity part: `ACoAAEh4nZsB-8yA3l26vt8mnsfxEF9_ola4Ybk` (base64-encoded internal ID)
- Post URNs: `urn:li:activity:XXXXXXXXXXXXXXXXXXX`

### Two Endpoint Styles
1. **GraphQL-style** (most calls): `GET /voyager/api/graphql?includeWebMetadata=true&variables=(<PARAMS>)&queryId=<QUERY_ID>`
2. **REST-style**: `GET /voyager/api/<resource_path>?<query_params>`

## 4. All Discovered Endpoints (By Category)

### 4A. PROFILE DATA (20 calls on profile page)

| # | Endpoint Name | Query ID / Path | Variables | Entity Types Returned |
|---|--------------|-----------------|-----------|----------------------|
| 1 | Profile Basic Info | `voyagerIdentityDashProfiles.b5c27c04968c409fc0ed3546575b9b7a` | `(memberIdentity:<URN>)` | Profile (firstName, lastName, publicIdentifier) |
| 2 | Profile Detailed | `voyagerIdentityDashProfiles.a1a483e719b20537a256b6853cdca711` | `(memberIdentity:<URN>)` | Extended profile |
| 3 | Profile Full View | `voyagerIdentityDashProfiles.2ca312bdbe80fac72fd663a3e06a83e7` | `(memberIdentity:<URN>)` | Complete view data |
| 4 | Profile Detailed (variant) | `voyagerIdentityDashProfiles.da93c92bffce3da586a992376e42a305` | `(memberIdentity:<URN>)` | Profile variant |
| 5 | Profile Cards (All Sections) | `voyagerIdentityDashProfileCards.55af784c21dc8640b500ab5b45937064` | `(profileUrn:<FULL_URN>)` | Card, Company — returns all profile sections (experience, education, skills, etc.) with 30 entities |
| 6 | Profile Content Collections | `voyagerIdentityDashProfileCards.2bdab365ea61cd6af00b57e0183430c3` | `(profileUrn:<FULL_URN>)` | ProfileContentCollectionsComponent, SocialActivityCounts, Update, Profile, Card, Company, SocialDetail, SocialPermissions — 31 entities |
| 7 | Profile Cards (variant) | `voyagerIdentityDashProfileCards.ef04d8d8a644bb1271d8640b7fd373d3` | `(profileUrn:<FULL_URN>)` | Additional card data |
| 8 | Profile Components | `voyagerIdentityDashProfileComponents.c5d4db426a0f8247b8ab7bc1d660775a` | `(profileUrn:<FULL_URN>)` | Profile section components |
| 9 | Profile Goals/Dashboard | `voyagerIdentityDashProfileGoals.43067c4c98bbff75453ed37ae57676c9` | `(profileUrn:<FULL_URN>)` | GoalsSection (3 entities — profile views, post impressions, search appearances) |
| 10 | Open To Cards | `voyagerIdentityDashOpenToCards.8997c1f12aa6cf3b5d39397121d2262d` | — | Open to work/hiring status |
| 11 | Open To Cards (variant) | `voyagerIdentityDashOpenToCards.e995567c30954a2d6b5be5bdd898ea2b` | — | |
| 12 | Verification | `voyagerTrustDashVerificationEntryPointPages.12bc7b955c5d88be129ad2e3043410c0` | — | Verification badge data |
| 13 | Learning Recommendations | `voyagerLearningDashLearningRecommendations.bd566e7894157a3402a386ea1baf0063` | — | Learning course suggestions |
| 14 | Profile Photo Frames | REST: `/voyager/api/voyagerIdentityDashProfilePhotoFrames` | — | Photo frame overlays |
| 15 | Notification Cards | REST: `/voyager/api/voyagerIdentityDashNotificationCards` | — | Profile action prompts |
| 16 | Social Proofs | REST: `/voyager/api/growth/socialproofs?q=profileView` | — | Who viewed your profile social proof |
| 17 | Launchpad Views | REST: `/voyager/api/voyagerLaunchpadDashLaunchpadViews` | `q=PROFILE_ME` | Dashboard metrics (profile views count, post impressions, search appearances) |

### 4B. FEED / POSTS / CONTENT (9 calls)

| # | Endpoint Name | Query ID / Path | Variables | Entity Types Returned |
|---|--------------|-----------------|-----------|----------------------|
| 1 | Main Feed | `voyagerFeedDashMainFeed.923020905727c01516495a0ac90bb475` | `(count:10,start:0)` | Update, SocialActivityCounts, SocialDetail, SocialPermissions, Profile, Company, FollowingState, Hashtag, AdServing, HidePostAction, UpdateActions, LeadGenForm — ~104 entities per page |
| 2 | Identity Module | `voyagerFeedDashIdentityModule.803fe19f843a4d461478049f70d7babd` | — | Your identity card shown in the feed sidebar |
| 3 | Feed Topics | `voyagerFeedDashTopics.9075cab8b59e14d62b497b48f77d5e12` | — | Hashtag topics |
| 4 | Package Recommendations | `voyagerFeedDashPackageRecommendations.a17e2926893fd3ff632c189cd61176d1` | — | Content recommendations |
| 5 | Third Party ID Syncs | `voyagerFeedDashThirdPartyIdSyncs.e9d3044f7ad311ff359561b405629210` | — | Ad sync tracking |
| 6 | Closed Sharebox | REST: `/voyager/api/voyagerContentcreationDashClosedSharebox` | — | Post creation prompt |
| 7 | Organizations | `voyagerOrganizationDashCompanies.ab1917e0c30a4c08c0c4a6c97cfad779` | — | Company data in feed |

### 4C. ENGAGEMENT METRICS (Embedded in Feed Entities)

The `SocialActivityCounts` entity type is where all engagement lives. Fields:
- `numLikes` — Total likes/reactions count
- `numComments` — Comment count
- `numShares` — Repost count
- `numImpressions` — View/impression count
- `liked` — Whether you liked it (boolean)
- `reacted` — Whether you reacted (boolean)
- `reactionTypeCounts` — Breakdown by reaction type (LIKE, CELEBRATE, SUPPORT, etc.)
- `highlightedReactorName` — Featured reactor name
- `entityUrn` — Links back to the post

The `SocialDetail` entity has: `threadUrn`, `totalSocialActivityCounts`, `socialPermissionsPersonalTopicUrn`, `showPremiumAnalytics`, `allowedCommentersScope`, `commentsTopicUrn`, `reactionsTopicUrn`, `reshareUpdateUrn`.

### 4D. CONNECTIONS / FOLLOWERS (3+ calls)

| # | Endpoint | Path | Returns |
|---|----------|------|---------|
| 1 | Connections Summary | REST: `/voyager/api/relationships/connectionsSummary` | numConnections, facets by geo/industry/company/school |
| 2 | Invitations Summary | REST: `/voyager/api/relationships/invitationsSummary` | Pending invitations count |
| 3 | Invitation Views | REST: `/voyager/api/relationships/invitationViews` | Detailed invitation list |
| 4 | My Network Notifications | REST: `/voyager/api/relationships/myNetworkNotifications` | Network activity |

Connections Summary fields: `numConnections`, `numConnectionsOfGeoRegionFacets`, `numConnectionsOfIndustryFacets`, `numConnectionsOfCurrentCompanyFacets`, `numConnectionsOfPastCompanyFacets`, `numConnectionsOfSchoolFacets`, `numConnectionsOfProfileLanguageFacets`, plus all the facet arrays.

### 4E. MESSAGING (6+ calls)

| # | Endpoint | Query ID / Path |
|---|----------|-----------------|
| 1 | Mailbox Counts | `messengerMailboxCounts.fc528a5a81a76dff212a4a3d2d48e84b2` |
| 2 | Conversations | `messengerConversations.0d5e6781bbee71c3e51c8843c6519f48` |
| 3 | Messaging Settings | `voyagerMessagingDashMessagingSettings.a555e413ad439d1d3f58ceef31ff0728` |
| 4 | Away Status | `voyagerMessagingDashAwayStatusV2.ee0ba3add6f8a58c35df3e08daa87b11` |
| 5 | Affiliated Mailboxes | `voyagerMessagingDashAffiliatedMailboxes.da7e8047e61ae87c4b97ee31fed7d934` |
| 6 | Presence Statuses | REST POST: `/voyager/api/messaging/dash/presenceStatuses` |
| 7 | Secondary Inbox | REST: `/voyager/api/voyagerMessagingDashSecondaryInbox?q=previewBanner` |
| 8 | Conversation Nudges | REST: `/voyager/api/voyagerMessagingDashConversationNudges` |

Note: Messaging uses a separate GraphQL sub-path: `/voyager/api/voyagerMessagingGraphQL/graphql`

### 4F. OTHER ENDPOINTS

| # | Endpoint | Query ID / Path | Purpose |
|---|----------|-----------------|---------|
| 1 | My Settings | `voyagerDashMySettings.7ea6de345b41dfb57b660a9a4bebe1b8` | User settings |
| 2 | Global Alerts | REST: `/voyager/api/voyagerGlobalAlerts?adHocAlerts=true&alertWithActions=true&q=findAlerts` | System alerts |
| 3 | Page Contents (Lego) | `voyagerLegoDashPageContents.6e5607181411f5835938e105d18564e2` | Page layout/rendering |
| 4 | Premium Feature Access | `voyagerPremiumDashFeatureAccess.c87b20dac35795f9920f2a8072fd7af5` | `(featureAccessTypes:List(CAN_ACCESS_SALES_NAV_BADGE,CAN_ACCESS_ADVERTISE_BADGE))` |
| 5 | Job Seeker Preferences | `voyagerJobsDashJobSeekerPreferences.53d4a0b454b82ce339abf8afc2c65190` | Job search prefs |
| 6 | Premium Upsell | `voyagerPremiumDashUpsellSlotContent.a238ee2fbd0497ba30a6a3d884e4cd10` | Premium slot content |
| 7 | Page Org Mailbox | REST: `/voyager/api/voyagerOrganizationDashPageMailbox/` | Org page messaging |
| 8 | Articles | REST: `/voyager/api/publishing/editorFirstPartyArticles?q=byAuthor` | Your published articles |
| 9 | Notification Badge Counts | REST: `/voyager/api/voyagerNotificationsDashBadgingItemCounts` | Unread notification counts |

## 5. Response Header Analysis

Every Voyager API response includes these headers:
- `x-restli-protocol-version` — Confirms Rest.li 2.0
- `x-li-fabric` — LinkedIn internal datacenter/fabric info
- `x-li-pop` — Point of presence server
- `x-li-uuid` — Unique request ID (useful for debugging)
- `x-li-server-time` — Server-side processing time
- `x-li-content-length` — Uncompressed response size
- `content-type` — `application/json` (always)
- `cache-control / expires / pragma` — Caching directives
- Standard security headers (content-security-policy, strict-transport-security, x-content-type-options, x-frame-options)

## 6. Key Endpoints for Extension Goals

| Your Goal | Primary Endpoint(s) |
|-----------|-------------------|
| Save My Posts | `voyagerFeedDashMainFeed` with pagination + `voyagerIdentityDashProfileCards.2bdab365ea61cd6af00b57e0183430c3` |
| Engagement Metrics | Extract `SocialActivityCounts` entities from feed — numLikes, numComments, numShares, numImpressions |
| Followers Count | `FollowingState` entity from feed (has followerCount, followeeCount) |
| Connections | `/voyager/api/relationships/connectionsSummary` — gives numConnections with facets |
| Profile Data | `voyagerIdentityDashProfileCards.55af784c21dc8640b500ab5b45937064` — returns all 30 profile section entities |
| Profile Analytics | `voyagerIdentityDashProfileGoals` — profile views, impressions, search appearances |
| Full Profile View | `voyagerIdentityDashProfiles.2ca312bdbe80fac72fd663a3e06a83e7` |
| Articles | `/voyager/api/publishing/editorFirstPartyArticles?q=byAuthor` |

## 7. Important Notes & Caveats

1. **Query ID hashes change**: The hash suffix on queryIds (e.g., `.b5c27c04968c409fc0ed3546575b9b7a`) can change when LinkedIn deploys updates. Your extension should handle this gracefully, possibly by extracting current queryIds from the page's JavaScript bundles.
2. **Rate limiting**: LinkedIn aggressively rate-limits API calls. Stick to reasonable intervals (a few seconds between calls).
3. **The li_at cookie is the golden key**: It's httpOnly and has a long expiry. This single cookie authenticates all Voyager API access. Your extension extracts this via `chrome.cookies` API.
4. **LinkedIn's module system**: They use a custom webpack-based system called "como" (`__como_rehydration__`, `__como_module_cache__`, `__como_chunks__`). The initial page load serves server-rendered HTML with hydration data, and subsequent navigation uses client-side API calls.
5. **Total API calls per page**: A single profile page load makes ~47 Voyager API calls. The activity page makes ~38. The feed makes similar numbers. This is normal — LinkedIn aggressively prefetches data.
