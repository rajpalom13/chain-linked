# Auto-Capture Feature Specification

## LinkedIn Data Extractor - Automatic Data Collection System

**Version:** 1.0
**Date:** 2026-01-10
**Status:** Proposed

---

## Table of Contents

1. [Overview](#1-overview)
2. [Current State Analysis](#2-current-state-analysis)
3. [Goals & Objectives](#3-goals--objectives)
4. [Page Detection System](#4-page-detection-system)
5. [Data Extraction Specifications](#5-data-extraction-specifications)
6. [Storage Schema](#6-storage-schema)
7. [Architecture Design](#7-architecture-design)
8. [Implementation Plan](#8-implementation-plan)
9. [Error Handling](#9-error-handling)
10. [Testing Strategy](#10-testing-strategy)
11. [Future Enhancements](#11-future-enhancements)

---

## 1. Overview

### 1.1 Purpose

The Auto-Capture feature enables automatic, passive data collection from LinkedIn analytics pages. When a user naturally browses LinkedIn and visits any analytics-related page, the extension will automatically detect the page type and extract relevant data without requiring any manual action.

### 1.2 Benefits

- **Zero Friction:** Users don't need to click buttons or run scripts
- **Complete Data:** Captures data from every analytics page visited
- **Historical Tracking:** Builds comprehensive history over time
- **Passive Operation:** Works silently in the background
- **No Data Missed:** Automatic detection ensures nothing is overlooked

### 1.3 Scope

This feature covers automatic capture from:
- Creator Analytics (Content Performance)
- Individual Post Analytics
- Audience/Follower Analytics
- Demographic Detail Pages
- Profile Views Analytics
- Search Appearances (if accessible)

---

## 2. Current State Analysis

### 2.1 Current Implementation

| Component | Current Behavior | Limitation |
|-----------|------------------|------------|
| Page Detection | `detectPageType()` in dom-extractor.js | Only detects, doesn't auto-trigger |
| Data Extraction | Functions exist for each page type | Must be manually called |
| Event System | Custom events dispatch data | Requires manual event dispatch |
| Storage | Service worker saves data | Works correctly |

### 2.2 Current Page Types Detected

```javascript
// In dom-extractor.js - detectPageType()
- 'profile'           // /in/username/
- 'feed'              // /feed/
- 'post'              // /feed/update/
- 'analytics'         // /analytics/creator/
- 'post_analytics'    // /analytics/post-summary/
- 'post_demographics' // /analytics/demographic-detail/
- 'connections'       // /mynetwork/invite-connect/
- 'search'            // /search/results/
- 'unknown'           // fallback
```

### 2.3 Current Data Flow

```
User Action → Manual Script → DOM Extraction → Event Dispatch → Content Script → Service Worker → Storage
```

### 2.4 Gaps Identified

1. **No automatic trigger** when page type changes
2. **SPA navigation** not fully handled for analytics pages
3. **Audience page** detection missing
4. **Profile views page** not detected
5. **Debouncing** not implemented (may capture same data multiple times)
6. **Loading state** not handled (data extracted before page fully loads)

---

## 3. Goals & Objectives

### 3.1 Primary Goals

| Goal | Success Metric |
|------|----------------|
| Automatic capture on page visit | 100% of analytics page visits trigger capture |
| Zero user interaction required | No clicks/scripts needed after extension install |
| Complete data extraction | All visible metrics captured |
| No duplicate data | Deduplication prevents redundant storage |
| Minimal performance impact | < 50ms extraction time, no visible lag |

### 3.2 User Stories

1. **As a user**, when I visit my Creator Analytics page, I want my impressions and engagement data automatically saved.

2. **As a user**, when I click on a post's "View analytics" link, I want that post's detailed metrics automatically captured.

3. **As a user**, when I visit the Audience tab, I want my follower count and demographics automatically saved.

4. **As a user**, I want to see all my captured data in the extension popup without having done anything manually.

5. **As a user**, I want historical data tracked so I can see my growth over time.

---

## 4. Page Detection System

### 4.1 LinkedIn Analytics URL Patterns

| Page Type | URL Pattern | Example |
|-----------|-------------|---------|
| Creator Analytics - Content | `/analytics/creator/content/` | Overview with impressions chart |
| Creator Analytics - Top Posts | `/analytics/creator/top-posts/` | List of top performing posts |
| Creator Analytics - Audience | `/analytics/creator/audience/` | Follower count and demographics |
| Post Analytics | `/analytics/post-summary/urn:li:activity:*` | Individual post metrics |
| Demographic Detail | `/analytics/demographic-detail/urn:li:activity:*` | Post viewer demographics |
| Audience Demographics | `/analytics/demographic-detail/urn:li:fsd_profile:*` | Follower demographics |
| Profile Views | `/analytics/profile-views/` | Who viewed your profile |

### 4.2 Enhanced Page Type Detection

```javascript
function detectAnalyticsPageType() {
  const pathname = window.location.pathname;
  const search = window.location.search;

  // Post-specific analytics
  if (pathname.includes('/analytics/post-summary/')) {
    const urnMatch = pathname.match(/urn:li:activity:(\d+)/);
    return {
      type: 'post_analytics',
      subtype: 'summary',
      activityUrn: urnMatch ? urnMatch[0] : null
    };
  }

  // Demographic detail pages
  if (pathname.includes('/analytics/demographic-detail/')) {
    if (pathname.includes('urn:li:activity:')) {
      return { type: 'post_demographics', subtype: 'post_viewers' };
    }
    if (pathname.includes('urn:li:fsd_profile:')) {
      return { type: 'audience_demographics', subtype: 'followers' };
    }
  }

  // Creator analytics sections
  if (pathname.includes('/analytics/creator/')) {
    if (pathname.includes('/content')) {
      return { type: 'creator_analytics', subtype: 'content' };
    }
    if (pathname.includes('/top-posts')) {
      return { type: 'creator_analytics', subtype: 'top_posts' };
    }
    if (pathname.includes('/audience')) {
      return { type: 'creator_analytics', subtype: 'audience' };
    }
  }

  // Profile views
  if (pathname.includes('/analytics/profile-views')) {
    return { type: 'profile_views', subtype: 'list' };
  }

  // General analytics fallback
  if (pathname.includes('/analytics/')) {
    return { type: 'analytics', subtype: 'unknown' };
  }

  return { type: 'non_analytics', subtype: null };
}
```

### 4.3 SPA Navigation Detection

LinkedIn is a Single Page Application (SPA). Page changes don't trigger traditional page loads.

**Detection Methods:**

1. **History API Monitoring**
```javascript
// Intercept pushState and replaceState
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  originalPushState.apply(this, args);
  handleNavigation();
};

history.replaceState = function(...args) {
  originalReplaceState.apply(this, args);
  handleNavigation();
};

// Listen for popstate (back/forward)
window.addEventListener('popstate', handleNavigation);
```

2. **URL Polling (Backup)**
```javascript
let lastUrl = window.location.href;
setInterval(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    handleNavigation();
  }
}, 500);
```

3. **MutationObserver on Main Content**
```javascript
const observer = new MutationObserver((mutations) => {
  // Check if main content changed significantly
  if (isSignificantChange(mutations)) {
    handleNavigation();
  }
});

observer.observe(document.querySelector('main'), {
  childList: true,
  subtree: true
});
```

---

## 5. Data Extraction Specifications

### 5.1 Creator Analytics - Content Page

**URL:** `/analytics/creator/content/`

**Data to Extract:**

```javascript
{
  pageType: 'creator_analytics_content',
  capturedAt: ISO timestamp,
  url: current URL,

  // Summary metrics
  summary: {
    impressions: number,
    impressionsGrowth: string,        // e.g., "+86%"
    impressionsPeriod: string,        // e.g., "Past 7 days"
    membersReached: number,
    engagements: number
  },

  // Top posts list
  topPosts: [
    {
      activityUrn: string,
      content: string (first 200 chars),
      impressions: number,
      reactions: number,
      comments: number,
      reposts: number,
      timestamp: string              // e.g., "2mo", "1yr"
    }
  ],

  // Chart data (if extractable)
  chartData: {
    period: string,
    dataPoints: [
      { date: string, value: number }
    ]
  }
}
```

**DOM Selectors:**

| Data Point | Selector Strategy |
|------------|-------------------|
| Impressions | Look for large number near "Impressions" text |
| Growth % | Text with "%" near impressions |
| Top Posts | Cards with activity URN links |
| Post metrics | Within each post card |

### 5.2 Individual Post Analytics

**URL:** `/analytics/post-summary/urn:li:activity:{id}`

**Data to Extract:**

```javascript
{
  pageType: 'post_analytics',
  capturedAt: ISO timestamp,
  activityUrn: string,
  postText: string (preview),

  // Discovery section
  discovery: {
    impressions: number,
    membersReached: number
  },

  // Profile activity section
  profileActivity: {
    profileViewers: number,
    followersGained: number
  },

  // Social engagement section
  socialEngagement: {
    reactions: number,
    comments: number,
    reposts: number,
    saves: number,
    sends: number
  },

  // Demographics section (if available)
  demographics: [
    {
      type: 'experience' | 'industry' | 'location',
      value: string,
      percentage: number
    }
  ],

  // Calculated metrics
  engagementRate: string,           // (reactions+comments)/impressions * 100

  // Who viewed (if visible)
  topViewers: [
    {
      description: string,          // e.g., "3 work at Microsoft"
      count: number
    }
  ]
}
```

### 5.3 Audience Analytics

**URL:** `/analytics/creator/audience/`

**Data to Extract:**

```javascript
{
  pageType: 'audience_analytics',
  capturedAt: ISO timestamp,

  // Follower summary
  followers: {
    total: number,
    growth: string,                 // e.g., "+1.2%"
    growthPeriod: string,           // e.g., "vs. prior 7 days"
    newFollowers: number,           // in selected period
  },

  // New followers chart data
  followerTrend: [
    { date: string, cumulative: number }
  ],

  // Top demographics (summary)
  topDemographics: {
    experience: { value: string, percentage: number },
    industry: { value: string, percentage: number },
    location: { value: string, percentage: number }
  }
}
```

### 5.4 Audience Demographics Detail

**URL:** `/analytics/demographic-detail/urn:li:fsd_profile:profile`

**Data to Extract:**

```javascript
{
  pageType: 'audience_demographics_detail',
  capturedAt: ISO timestamp,

  demographics: {
    jobTitles: [
      { value: string, percentage: number }
    ],
    locations: [
      { value: string, percentage: number }
    ],
    industries: [
      { value: string, percentage: number }
    ],
    seniority: [
      { value: string, percentage: number }
    ],
    companySize: [
      { value: string, percentage: number }
    ],
    companies: [
      { value: string, percentage: number }
    ]
  }
}
```

### 5.5 Profile Views

**URL:** `/analytics/profile-views/`

**Data to Extract:**

```javascript
{
  pageType: 'profile_views',
  capturedAt: ISO timestamp,

  summary: {
    totalViews: number,
    period: string,
    growth: string
  },

  viewers: [
    {
      name: string (if visible) | null,
      headline: string | null,
      company: string | null,
      profileUrl: string | null,
      viewedAt: string | null,
      isAnonymous: boolean
    }
  ],

  viewerDemographics: {
    companies: [{ value: string, count: number }],
    titles: [{ value: string, count: number }]
  }
}
```

---

## 6. Storage Schema

### 6.1 Storage Keys

```javascript
const STORAGE_KEYS = {
  // Existing
  ANALYTICS_DATA: 'linkedin_analytics',
  POST_ANALYTICS_DATA: 'linkedin_post_analytics',
  AUDIENCE_DATA: 'linkedin_audience',

  // New
  ANALYTICS_HISTORY: 'linkedin_analytics_history',
  PROFILE_VIEWS_DATA: 'linkedin_profile_views',
  CAPTURE_LOG: 'linkedin_capture_log',
  CAPTURE_SETTINGS: 'linkedin_capture_settings'
};
```

### 6.2 Analytics History Schema

Track metrics over time for trend analysis:

```javascript
// linkedin_analytics_history
{
  dataPoints: [
    {
      capturedAt: ISO timestamp,
      impressions: number,
      membersReached: number,
      followers: number,
      profileViews: number
    }
  ],

  // Aggregated stats
  stats: {
    firstCapture: ISO timestamp,
    lastCapture: ISO timestamp,
    totalCaptures: number,

    // Growth calculations
    impressionsGrowth: {
      daily: number,
      weekly: number,
      monthly: number
    },
    followersGrowth: {
      daily: number,
      weekly: number,
      monthly: number
    }
  }
}
```

### 6.3 Capture Log Schema

Track what was captured and when:

```javascript
// linkedin_capture_log
{
  captures: [
    {
      id: unique string,
      timestamp: ISO timestamp,
      pageType: string,
      url: string,
      success: boolean,
      dataSize: number,          // bytes
      error: string | null
    }
  ],

  stats: {
    totalCaptures: number,
    successfulCaptures: number,
    failedCaptures: number,
    lastCapture: ISO timestamp,
    capturesByType: {
      'creator_analytics': number,
      'post_analytics': number,
      'audience': number,
      'profile_views': number
    }
  }
}
```

### 6.4 Deduplication Strategy

**Post Analytics:**
- Key: `activityUrn`
- Strategy: Update existing entry, keep history of changes

**Audience Data:**
- Key: Single entry, always update
- Strategy: Store previous values in history array

**Analytics Snapshots:**
- Key: Date (YYYY-MM-DD)
- Strategy: One snapshot per day, update if same day

```javascript
function shouldCapture(pageType, identifier) {
  const captureLog = await getFromStorage(STORAGE_KEYS.CAPTURE_LOG);
  const recentCaptures = captureLog.captures.filter(c =>
    c.pageType === pageType &&
    c.timestamp > Date.now() - (5 * 60 * 1000) // Last 5 minutes
  );

  // Debounce: Don't capture same page type within 5 minutes
  if (recentCaptures.length > 0) {
    console.log(`[AutoCapture] Skipping ${pageType} - captured recently`);
    return false;
  }

  return true;
}
```

---

## 7. Architecture Design

### 7.1 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        LinkedIn Page                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Navigation     │  │  Analytics      │  │  DOM Content    │ │
│  │  Events         │  │  Data           │  │                 │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
└───────────┼─────────────────────┼─────────────────────┼─────────┘
            │                     │                     │
            ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Content Script (Isolated World)               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Navigation     │  │  Auto-Capture   │  │  DOM Extractor  │ │
│  │  Detector       │──▶│  Controller     │──▶│  Functions      │ │
│  └─────────────────┘  └────────┬────────┘  └─────────────────┘ │
│                                │                                 │
│                                ▼                                 │
│                       ┌─────────────────┐                       │
│                       │  Message        │                       │
│                       │  Dispatcher     │                       │
│                       └────────┬────────┘                       │
└────────────────────────────────┼────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Service Worker (Background)                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Message        │  │  Storage        │  │  Deduplication  │ │
│  │  Handler        │──▶│  Manager        │──▶│  Logic          │ │
│  └─────────────────┘  └────────┬────────┘  └─────────────────┘ │
│                                │                                 │
│                                ▼                                 │
│                       ┌─────────────────┐                       │
│                       │  Chrome         │                       │
│                       │  Storage API    │                       │
│                       └─────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Data Flow

```
1. User navigates to analytics page
            │
            ▼
2. Navigation Detector fires
   (history API / URL change)
            │
            ▼
3. Auto-Capture Controller
   - Detect page type
   - Check if should capture (debounce)
   - Wait for page load
            │
            ▼
4. DOM Extractor
   - Extract relevant data
   - Format according to schema
            │
            ▼
5. Message Dispatcher
   - Send to service worker
   - Include page type & data
            │
            ▼
6. Service Worker Handler
   - Receive message
   - Validate data
   - Check deduplication
            │
            ▼
7. Storage Manager
   - Save to appropriate key
   - Update history
   - Log capture
            │
            ▼
8. Confirmation
   - Log success/failure
   - Update capture stats
```

### 7.3 Auto-Capture Controller

```javascript
class AutoCaptureController {
  constructor() {
    this.isEnabled = true;
    this.captureDelay = 2000;      // Wait for page to load
    this.debounceTime = 300000;    // 5 minutes between same page captures
    this.lastCaptures = new Map(); // Track recent captures
    this.pendingCapture = null;
  }

  async initialize() {
    // Load settings
    const settings = await this.loadSettings();
    this.isEnabled = settings.autoCapture !== false;

    // Set up navigation listeners
    this.setupNavigationListeners();

    // Initial capture if on analytics page
    this.handleNavigation();
  }

  setupNavigationListeners() {
    // History API
    const originalPushState = history.pushState;
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.handleNavigation();
    };

    // Popstate
    window.addEventListener('popstate', () => this.handleNavigation());

    // URL polling backup
    let lastUrl = location.href;
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        this.handleNavigation();
      }
    }, 500);
  }

  async handleNavigation() {
    if (!this.isEnabled) return;

    // Clear pending capture
    if (this.pendingCapture) {
      clearTimeout(this.pendingCapture);
    }

    // Detect page type
    const pageInfo = this.detectPageType();

    if (pageInfo.type === 'non_analytics') {
      return; // Not an analytics page
    }

    // Check debounce
    const cacheKey = `${pageInfo.type}:${pageInfo.identifier || 'default'}`;
    const lastCapture = this.lastCaptures.get(cacheKey);

    if (lastCapture && Date.now() - lastCapture < this.debounceTime) {
      console.log(`[AutoCapture] Debounced: ${cacheKey}`);
      return;
    }

    // Schedule capture after delay (wait for page load)
    this.pendingCapture = setTimeout(() => {
      this.captureCurrentPage(pageInfo);
    }, this.captureDelay);
  }

  async captureCurrentPage(pageInfo) {
    console.log(`[AutoCapture] Capturing: ${pageInfo.type}`);

    try {
      let data;

      switch (pageInfo.type) {
        case 'creator_analytics':
          data = await this.captureCreatorAnalytics(pageInfo.subtype);
          break;
        case 'post_analytics':
          data = await this.capturePostAnalytics(pageInfo.activityUrn);
          break;
        case 'audience_analytics':
          data = await this.captureAudienceAnalytics();
          break;
        case 'audience_demographics':
          data = await this.captureAudienceDemographics();
          break;
        case 'profile_views':
          data = await this.captureProfileViews();
          break;
        default:
          console.log(`[AutoCapture] Unknown page type: ${pageInfo.type}`);
          return;
      }

      if (data) {
        await this.saveCapture(pageInfo.type, data);
        this.lastCaptures.set(
          `${pageInfo.type}:${pageInfo.identifier || 'default'}`,
          Date.now()
        );
      }
    } catch (error) {
      console.error(`[AutoCapture] Error:`, error);
      await this.logCapture(pageInfo.type, false, error.message);
    }
  }
}
```

---

## 8. Implementation Plan

### 8.1 Phase 1: Foundation (Day 1-2)

**Tasks:**

1. **Create AutoCaptureController class**
   - File: `content/auto-capture.js`
   - Navigation detection
   - Page type detection
   - Debouncing logic

2. **Enhance page type detection**
   - Update `dom-extractor.js`
   - Add all analytics URL patterns
   - Return detailed page info

3. **Add capture settings**
   - Storage key for settings
   - Enable/disable toggle
   - Capture frequency setting

**Files to Modify:**
- `content/auto-capture.js` (new)
- `content/dom-extractor.js`
- `content/content-script.js`
- `manifest.json` (add new script)

### 8.2 Phase 2: Extractors (Day 3-4)

**Tasks:**

1. **Creator Analytics extractor**
   - Content performance metrics
   - Top posts list
   - Chart data (if possible)

2. **Post Analytics extractor**
   - All sections (Discovery, Profile, Engagement, Demographics)
   - Handle missing sections gracefully

3. **Audience Analytics extractor**
   - Follower count and growth
   - Top demographics summary

4. **Audience Demographics detail extractor**
   - All demographic categories
   - Full lists with percentages

5. **Profile Views extractor** (new)
   - View count
   - Viewer list (where visible)

**Files to Modify:**
- `content/dom-extractor.js`
- `content/auto-capture.js`

### 8.3 Phase 3: Storage & Service Worker (Day 5)

**Tasks:**

1. **Add new message handlers**
   - `AUTO_CAPTURE_CREATOR_ANALYTICS`
   - `AUTO_CAPTURE_POST_ANALYTICS`
   - `AUTO_CAPTURE_AUDIENCE`
   - `AUTO_CAPTURE_PROFILE_VIEWS`

2. **Implement history tracking**
   - Daily snapshots
   - Growth calculations

3. **Implement capture logging**
   - Success/failure tracking
   - Statistics

4. **Deduplication improvements**
   - Smart merging for updates
   - History preservation

**Files to Modify:**
- `background/service-worker.js`

### 8.4 Phase 4: UI Updates (Day 6)

**Tasks:**

1. **Settings panel**
   - Auto-capture toggle
   - Capture frequency selector
   - View capture log

2. **Dashboard updates**
   - Show last capture time
   - Historical charts
   - Growth indicators

3. **Notifications**
   - Capture success indicator
   - Error notifications

**Files to Modify:**
- `popup/popup.html`
- `popup/popup.js`
- `popup/popup.css`

### 8.5 Phase 5: Testing & Polish (Day 7)

**Tasks:**

1. **Integration testing**
   - Test all page types
   - Test navigation scenarios
   - Test error handling

2. **Performance optimization**
   - Minimize DOM queries
   - Efficient storage operations

3. **Documentation**
   - Update README
   - Add user guide

---

## 9. Error Handling

### 9.1 Error Types

| Error Type | Cause | Handling |
|------------|-------|----------|
| Page Not Loaded | DOM not ready | Retry with delay |
| Element Not Found | Selector failed | Log warning, continue |
| Storage Error | Chrome storage API failed | Retry, notify user |
| Permission Error | Content script blocked | Show error message |
| Rate Limit | Too many captures | Increase debounce |

### 9.2 Error Handling Strategy

```javascript
async function safeCapture(extractorFn, pageType) {
  const maxRetries = 3;
  const retryDelay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Wait for key elements to exist
      await waitForElement('.analytics-content', 5000);

      // Extract data
      const data = await extractorFn();

      if (!data || Object.keys(data).length === 0) {
        throw new Error('No data extracted');
      }

      return data;
    } catch (error) {
      console.warn(`[AutoCapture] Attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        await sleep(retryDelay * attempt);
      } else {
        throw error;
      }
    }
  }
}

function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}
```

### 9.3 Graceful Degradation

If certain data can't be extracted, capture what's available:

```javascript
function extractWithFallbacks(extractors) {
  const result = {};

  for (const [key, extractor] of Object.entries(extractors)) {
    try {
      result[key] = extractor();
    } catch (error) {
      console.warn(`[AutoCapture] Failed to extract ${key}:`, error);
      result[key] = null;
    }
  }

  return result;
}
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

| Test Case | Description |
|-----------|-------------|
| Page Detection | Verify correct type for each URL pattern |
| Debouncing | Verify captures are throttled correctly |
| Data Extraction | Verify all fields extracted correctly |
| Storage | Verify data saved and retrieved correctly |
| Deduplication | Verify no duplicate entries created |

### 10.2 Integration Tests

| Test Scenario | Steps | Expected Result |
|---------------|-------|-----------------|
| Navigate to Creator Analytics | Go to /analytics/creator/content/ | Data auto-captured within 3s |
| Click Post Analytics | Click "View analytics" on a post | Post data captured |
| Switch to Audience tab | Click "Audience" tab | Audience data captured |
| Rapid navigation | Navigate between pages quickly | Only one capture per page (debounced) |
| Page refresh | Refresh analytics page | Data captured after delay |
| Back/Forward | Use browser navigation | Data captured for new pages |

### 10.3 Test Data Verification

```javascript
// Test helper to verify captured data
function verifyCapture(pageType, expectedFields) {
  return new Promise(async (resolve, reject) => {
    // Listen for capture event
    document.addEventListener('auto-capture-complete', (event) => {
      const { type, data } = event.detail;

      if (type !== pageType) return;

      const missingFields = expectedFields.filter(f => !(f in data));

      if (missingFields.length > 0) {
        reject(new Error(`Missing fields: ${missingFields.join(', ')}`));
      } else {
        resolve(data);
      }
    }, { once: true });

    // Timeout
    setTimeout(() => {
      reject(new Error('Capture timeout'));
    }, 10000);
  });
}

// Usage
await verifyCapture('post_analytics', [
  'activityUrn',
  'discovery',
  'socialEngagement',
  'engagementRate'
]);
```

### 10.4 Manual Testing Checklist

- [ ] Fresh install - verify default settings
- [ ] Navigate to each analytics page type
- [ ] Verify data appears in popup
- [ ] Test with slow network (throttle)
- [ ] Test rapid navigation
- [ ] Test browser back/forward
- [ ] Verify no console errors
- [ ] Check storage size doesn't grow excessively
- [ ] Test disable/enable toggle
- [ ] Test export with auto-captured data

---

## 11. Future Enhancements

### 11.1 Short Term (Next Release)

1. **Smart Refresh**
   - Detect when data has changed
   - Only update changed values

2. **Background Sync**
   - Periodic refresh without user visiting pages
   - Requires additional permissions

3. **Notification System**
   - Alert when engagement spikes
   - Weekly summary notification

### 11.2 Medium Term

1. **Trend Analysis**
   - Automatic growth calculations
   - Anomaly detection

2. **Content Recommendations**
   - Best posting times
   - Content type suggestions

3. **Comparison Features**
   - Compare periods
   - Compare posts

### 11.3 Long Term

1. **Cloud Sync**
   - Backup data to cloud
   - Access from multiple devices

2. **Advanced Analytics**
   - Predictive analytics
   - Engagement forecasting

3. **API Integration**
   - Export to external tools
   - Webhook notifications

---

## Appendix A: File Structure After Implementation

```
extension/
├── manifest.json                    # Updated with new scripts
├── background/
│   └── service-worker.js            # Updated with new handlers
├── content/
│   ├── content-script.js            # Updated initialization
│   ├── dom-extractor.js             # Enhanced extractors
│   └── auto-capture.js              # NEW: Auto-capture controller
├── popup/
│   ├── popup.html                   # Updated with settings
│   ├── popup.js                     # Updated with history display
│   └── popup.css                    # Updated styles
└── docs/
    └── AUTO_CAPTURE_FEATURE.md      # This document
```

## Appendix B: Message Types

| Message Type | Direction | Purpose |
|--------------|-----------|---------|
| `AUTO_CAPTURE_ENABLED` | Popup → SW | Check if auto-capture is on |
| `AUTO_CAPTURE_TOGGLE` | Popup → SW | Enable/disable |
| `AUTO_CAPTURE_DATA` | CS → SW | Send captured data |
| `AUTO_CAPTURE_LOG` | CS → SW | Log capture event |
| `GET_CAPTURE_HISTORY` | Popup → SW | Get historical data |
| `GET_CAPTURE_STATS` | Popup → SW | Get capture statistics |

---

**Document End**

*This specification is subject to updates as implementation progresses.*
