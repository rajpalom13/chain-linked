# LinkedIn Data Extractor - Implementation Plan for Data Capture Fixes

## Executive Summary

This document outlines a comprehensive implementation plan for fixing data capture issues in the LinkedIn Data Extractor Chrome extension. The plan is organized into 5 phases, each addressing specific categories of issues identified in the codebase analysis.

**Current State Analysis:**
- Data capture relies on DOM extraction (`dom-extractor.ts`) and auto-capture (`auto-capture.ts`)
- Content script orchestrates capture (`content-script.ts`)
- Service worker handles storage and Supabase sync (`service-worker.ts`)
- Multiple silent failure points exist where errors are logged but not surfaced to users
- Selector-based extraction is fragile due to LinkedIn's dynamic DOM updates
- No centralized validation before data persistence

---

## Phase 1: Critical Fixes (Error Handling)

### Objective
Eliminate silent failures by adding proper error handling, retry mechanisms, and user notifications across all capture pathways.

### 1.1 Add Retry Mechanism with Exponential Backoff

**File:** `E:\agiready\chain-linked\extension\src\content\content-script.ts`

**Current Issue:**
```typescript
// Lines 140-152: saveApiData has no retry logic
async function saveApiData(data: { endpoint: string; method: string; url: string; data: unknown; category?: string }): Promise<void> {
  try {
    const result = await sendToBackground({ ... });
    // No retry on failure
  } catch (error) {
    console.error('[ContentScript] Error saving API data:', error);
    // Silent failure - no retry, no user notification
  }
}
```

**Required Changes:**

1. Create new utility file for retry logic:

```typescript
// NEW FILE: E:\agiready\chain-linked\extension\src\shared\retry-utils.ts

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (attempt: number, error: Error, nextDelayMs: number) => void
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs, backoffMultiplier } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        break;
      }

      const delay = Math.min(
        baseDelayMs * Math.pow(backoffMultiplier, attempt),
        maxDelayMs
      );

      onRetry?.(attempt + 1, lastError, delay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

2. Update `content-script.ts` to use retry:

```typescript
// Update saveApiData, saveAnalyticsData, savePostAnalyticsData, saveAudienceData
async function saveApiData(data: { ... }): Promise<void> {
  try {
    await withRetry(
      () => sendToBackground({ type: 'API_CAPTURED', ...data }),
      { maxRetries: 3, baseDelayMs: 1000 },
      (attempt, error, delay) => {
        console.log(`[ContentScript] Retry ${attempt} for API save after ${delay}ms:`, error.message);
      }
    );
  } catch (error) {
    console.error('[ContentScript] Error saving API data after retries:', error);
    // Dispatch user notification event
    document.dispatchEvent(new CustomEvent('capture-error', {
      detail: { type: 'api', error: error.message, data }
    }));
  }
}
```

**File:** `E:\agiready\chain-linked\extension\src\content\auto-capture.ts`

**Current Issue (Lines 381-498):**
```typescript
async captureCurrentPage(pageInfo: PageInfo): Promise<void> {
  // No retry on extraction failure
  try {
    // ... extraction logic
  } catch (error) {
    console.error(`[AutoCapture] Capture failed for ${pageInfo.type}:`, error);
    // Silent failure - no retry
  }
}
```

**Required Changes:**
```typescript
// Add retry to captureCurrentPage
async captureCurrentPage(pageInfo: PageInfo): Promise<void> {
  try {
    await withRetry(
      async () => {
        // Existing extraction logic
        const data = await this.extractDataForPageType(pageInfo);
        if (!data) throw new Error('No data extracted');
        await this.saveCapture(messageType, data);
      },
      { maxRetries: 2, baseDelayMs: 2000 },
      (attempt, error, delay) => {
        console.log(`[AutoCapture] Retry ${attempt} for ${pageInfo.type} after ${delay}ms`);
        this.dispatchCaptureEvent(pageInfo.type, null, false, `Retrying (attempt ${attempt})`);
      }
    );
    // Success
    this.captureStats.successful++;
  } catch (error) {
    // Final failure after retries
    this.captureStats.failed++;
    this.notifyUser('capture_failed', pageInfo.type, error.message);
  }
}
```

### 1.2 Add Validation Layer Before Saving Data

**File:** `E:\agiready\chain-linked\extension\src\shared\validators.ts` (NEW)

```typescript
// NEW FILE: Data validation schemas using Zod-like patterns

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: Record<string, unknown>;
}

export const validators = {
  creatorAnalytics: (data: unknown): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || typeof data !== 'object') {
      return { valid: false, errors: ['Data must be an object'], warnings: [] };
    }

    const d = data as Record<string, unknown>;

    // Required field validation
    if (d.impressions !== undefined && typeof d.impressions !== 'number') {
      if (typeof d.impressions === 'string') {
        d.impressions = parseInt(String(d.impressions).replace(/,/g, ''), 10);
        warnings.push('Converted impressions from string to number');
      } else {
        errors.push('impressions must be a number');
      }
    }

    // Ensure non-negative numbers
    const numericFields = ['impressions', 'engagements', 'membersReached', 'profileViews', 'searchAppearances'];
    for (const field of numericFields) {
      if (d[field] !== undefined && typeof d[field] === 'number' && d[field] < 0) {
        errors.push(`${field} cannot be negative`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitizedData: d,
    };
  },

  postAnalytics: (data: unknown): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || typeof data !== 'object') {
      return { valid: false, errors: ['Data must be an object'], warnings: [] };
    }

    const d = data as Record<string, unknown>;

    // activityUrn is required for post analytics
    if (!d.activityUrn) {
      errors.push('activityUrn is required for post analytics');
    } else if (typeof d.activityUrn === 'string' && !d.activityUrn.startsWith('urn:li:activity:')) {
      warnings.push('activityUrn should follow urn:li:activity:xxx format');
    }

    return { valid: errors.length === 0, errors, warnings, sanitizedData: d };
  },

  profile: (data: unknown): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || typeof data !== 'object') {
      return { valid: false, errors: ['Data must be an object'], warnings: [] };
    }

    const d = data as Record<string, unknown>;

    // At least one identifier should be present
    if (!d.name && !d.fullName && !d.full_name && !d.linkedin_id && !d.linkedinId) {
      warnings.push('Profile has no identifiable name or ID');
    }

    // Numeric field validation
    if (d.followerCount !== undefined || d.followers_count !== undefined) {
      const count = d.followerCount ?? d.followers_count;
      if (typeof count === 'string') {
        const parsed = parseInt(String(count).replace(/,/g, ''), 10);
        if (!isNaN(parsed)) {
          d.followers_count = parsed;
          d.followerCount = parsed;
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings, sanitizedData: d };
  },
};
```

**Integration in service-worker.ts:**

```typescript
// Add to service-worker.ts message handlers
case 'AUTO_CAPTURE_CREATOR_ANALYTICS': {
  const validation = validators.creatorAnalytics(message.data);

  if (!validation.valid) {
    console.error('[CAPTURE][ANALYTICS] Validation failed:', validation.errors);
    response = { success: false, error: `Validation failed: ${validation.errors.join(', ')}` };
    break;
  }

  if (validation.warnings.length > 0) {
    console.warn('[CAPTURE][ANALYTICS] Validation warnings:', validation.warnings);
  }

  const analyticsData = validation.sanitizedData;
  // Continue with existing save logic...
}
```

### 1.3 Add User Notifications for Capture Failures

**File:** `E:\agiready\chain-linked\extension\src\background\notifications.ts`

**Additions:**
```typescript
// Add new notification types

export async function showCaptureFailureNotification(
  captureType: string,
  errorMessage: string,
  retryable: boolean = true
): Promise<void> {
  const settings = await getNotificationSettings();
  if (!settings.captureNotifications) return;

  const title = `Capture Failed: ${captureType}`;
  const message = retryable
    ? `${errorMessage}. Will retry automatically.`
    : `${errorMessage}. Manual capture may be needed.`;

  await chrome.notifications.create(`capture-failed-${Date.now()}`, {
    type: 'basic',
    iconUrl: 'icons/icon-warning-48.png',
    title,
    message,
    priority: 1,
  });
}

export async function showRetryNotification(
  captureType: string,
  attempt: number,
  maxAttempts: number
): Promise<void> {
  const settings = await getNotificationSettings();
  if (!settings.captureNotifications) return;

  await chrome.notifications.create(`capture-retry-${Date.now()}`, {
    type: 'basic',
    iconUrl: 'icons/icon-48.png',
    title: `Retrying Capture`,
    message: `Attempt ${attempt}/${maxAttempts} for ${captureType}`,
    priority: 0,
  });
}
```

### 1.4 Testing Requirements

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| TC-1.1 | Simulate network failure during capture | Retry 3 times with exponential backoff |
| TC-1.2 | Validate malformed analytics data | Validation errors returned, data not saved |
| TC-1.3 | Extension context invalidated | Graceful failure without crash |
| TC-1.4 | User notification on final failure | Chrome notification displayed |

### 1.5 Success Criteria

- [ ] All save operations use retry mechanism with configurable attempts
- [ ] Validation runs before all data persistence operations
- [ ] Users receive notifications for capture failures (when enabled)
- [ ] No silent failures - all errors are either recovered or reported

---

## Phase 2: Selector Robustness

### Objective
Make DOM extraction resilient to LinkedIn's frequent UI changes by implementing fallback selector chains and dynamic content waiting.

### 2.1 Create Fallback Selector Chains

**File:** `E:\agiready\chain-linked\extension\src\content\selectors.ts` (NEW)

```typescript
// NEW FILE: Centralized selector management with fallbacks

export interface SelectorChain {
  primary: string;
  fallbacks: string[];
  contentValidator?: (element: Element) => boolean;
}

export const SELECTORS = {
  profile: {
    name: {
      primary: 'h1.text-heading-xlarge',
      fallbacks: [
        'h1[class*="text-heading-xlarge"]',
        'h1[class*="inline t-24"]',
        '.pv-top-card h1',
        '.pv-text-details__left-panel h1',
        'section.artdeco-card h1',
        'main h1',
        '[data-generated-suggestion-target] h1',
      ],
      contentValidator: (el) => {
        const text = el.textContent?.trim() || '';
        return text.length > 1 && text.length < 100 && !text.includes('LinkedIn');
      },
    },
    headline: {
      primary: '.text-body-medium.break-words',
      fallbacks: [
        '.pv-text-details__left-panel .text-body-medium',
        '.pv-top-card .text-body-medium',
        '[data-generated-suggestion-target] .text-body-medium',
        'h1.text-heading-xlarge + div.text-body-medium',
        'h1 + .text-body-medium',
      ],
      contentValidator: (el) => {
        const text = el.textContent?.trim() || '';
        return text.length > 5 && text.length < 300;
      },
    },
    followerCount: {
      primary: 'a[href*="followers"] span.t-bold',
      fallbacks: [
        '[class*="follower"] .t-bold',
        '.pv-top-card--list-bullet span',
      ],
    },
    connectionCount: {
      primary: 'a[href*="connections"] span.t-bold',
      fallbacks: [
        '[class*="connection"] .t-bold',
        'li.text-body-small span.t-bold',
      ],
    },
  },

  analytics: {
    impressions: {
      primary: '[class*="impression"] .t-bold',
      fallbacks: [
        '[data-test-id*="impression"]',
        '.analytics-card .t-bold:first-child',
      ],
    },
    profileViews: {
      primary: '[class*="profile-view"] .t-bold',
      fallbacks: [
        'a[href*="profile-views"] .t-bold',
      ],
    },
    searchAppearances: {
      primary: '[class*="search-appear"] .t-bold',
      fallbacks: [
        'a[href*="search-appearances"] .t-bold',
      ],
    },
  },

  postAnalytics: {
    impressions: {
      primary: '[class*="impressions"] .t-bold',
      fallbacks: [
        'li:has-text("Impressions") .t-bold',
        '.analytics-summary .t-bold',
      ],
    },
    reactions: {
      primary: '[class*="reaction"] .t-bold',
      fallbacks: [
        'li:has-text("Reactions") .t-bold',
      ],
    },
    comments: {
      primary: '[class*="comment"] .t-bold',
      fallbacks: [
        'li:has-text("Comments") .t-bold',
      ],
    },
  },
};

/**
 * Query element using selector chain with fallbacks
 */
export function queryWithFallback(
  chain: SelectorChain,
  root: Document | Element = document
): Element | null {
  // Try primary selector first
  let element = root.querySelector(chain.primary);
  if (element && (!chain.contentValidator || chain.contentValidator(element))) {
    return element;
  }

  // Try fallbacks
  for (const selector of chain.fallbacks) {
    try {
      element = root.querySelector(selector);
      if (element && (!chain.contentValidator || chain.contentValidator(element))) {
        console.log(`[Selectors] Fallback selector worked: ${selector}`);
        // Log selector health metric
        logSelectorHealth(chain.primary, false, selector);
        return element;
      }
    } catch (e) {
      // Invalid selector, skip
    }
  }

  // Log failure
  logSelectorHealth(chain.primary, false, null);
  return null;
}

/**
 * Query all elements using selector chain
 */
export function queryAllWithFallback(
  chain: SelectorChain,
  root: Document | Element = document
): Element[] {
  const results = root.querySelectorAll(chain.primary);
  if (results.length > 0) {
    return Array.from(results);
  }

  for (const selector of chain.fallbacks) {
    try {
      const elements = root.querySelectorAll(selector);
      if (elements.length > 0) {
        return Array.from(elements);
      }
    } catch (e) {
      // Invalid selector, skip
    }
  }

  return [];
}

// Selector health tracking
const selectorHealthLog: Map<string, { success: number; fail: number; lastFailure: number | null }> = new Map();

function logSelectorHealth(selector: string, success: boolean, fallbackUsed: string | null): void {
  const current = selectorHealthLog.get(selector) || { success: 0, fail: 0, lastFailure: null };

  if (success) {
    current.success++;
  } else {
    current.fail++;
    current.lastFailure = Date.now();
  }

  selectorHealthLog.set(selector, current);

  // Report to background if failure rate is high
  const failureRate = current.fail / (current.success + current.fail);
  if (failureRate > 0.5 && current.fail >= 5) {
    reportSelectorIssue(selector, failureRate, fallbackUsed);
  }
}

function reportSelectorIssue(selector: string, failureRate: number, fallbackUsed: string | null): void {
  chrome.runtime.sendMessage({
    type: 'SELECTOR_HEALTH_REPORT',
    data: {
      selector,
      failureRate,
      fallbackUsed,
      timestamp: Date.now(),
    },
  }).catch(() => {});
}
```

### 2.2 Add MutationObserver-Based Waiting for Dynamic Content

**File:** `E:\agiready\chain-linked\extension\src\shared\dom-utils.ts` (NEW)

```typescript
// NEW FILE: DOM utilities for dynamic content handling

export interface WaitForElementOptions {
  timeout?: number;
  pollInterval?: number;
  container?: Element | Document;
  requireVisible?: boolean;
  requireContent?: boolean;
  minContentLength?: number;
}

/**
 * Wait for element to appear in DOM using MutationObserver
 */
export function waitForElement(
  selector: string,
  options: WaitForElementOptions = {}
): Promise<Element | null> {
  const {
    timeout = 10000,
    container = document,
    requireVisible = false,
    requireContent = false,
    minContentLength = 1,
  } = options;

  return new Promise((resolve) => {
    // Check if element already exists
    const existing = container.querySelector(selector);
    if (existing && isElementReady(existing, requireVisible, requireContent, minContentLength)) {
      resolve(existing);
      return;
    }

    let observer: MutationObserver | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    // Set timeout
    timeoutId = setTimeout(() => {
      cleanup();
      console.warn(`[DOMUtils] Timeout waiting for: ${selector}`);
      resolve(null);
    }, timeout);

    // Setup observer
    observer = new MutationObserver((mutations) => {
      const element = container.querySelector(selector);
      if (element && isElementReady(element, requireVisible, requireContent, minContentLength)) {
        cleanup();
        resolve(element);
      }
    });

    observer.observe(container === document ? document.body : container, {
      childList: true,
      subtree: true,
      attributes: requireVisible,
    });
  });
}

/**
 * Wait for multiple elements with content
 */
export async function waitForElements(
  selectors: string[],
  options: WaitForElementOptions = {}
): Promise<Map<string, Element | null>> {
  const results = new Map<string, Element | null>();

  await Promise.all(
    selectors.map(async (selector) => {
      const element = await waitForElement(selector, options);
      results.set(selector, element);
    })
  );

  return results;
}

/**
 * Wait for analytics page to fully load
 */
export async function waitForAnalyticsPageReady(): Promise<boolean> {
  const requiredSelectors = [
    'main[aria-label*="analytics" i]',
    '[class*="analytics"]',
    '.artdeco-card',
  ];

  const contentIndicators = [
    /\d+\s*(impressions|views|followers)/i,
    /analytics/i,
  ];

  // Wait for any required selector
  for (const selector of requiredSelectors) {
    const element = await waitForElement(selector, {
      timeout: 8000,
      requireContent: true,
      minContentLength: 50,
    });

    if (element) {
      // Verify content contains expected patterns
      const text = element.textContent || '';
      for (const pattern of contentIndicators) {
        if (pattern.test(text)) {
          console.log('[DOMUtils] Analytics page ready');
          return true;
        }
      }
    }
  }

  // Fallback: Wait a bit longer for dynamic content
  await new Promise(resolve => setTimeout(resolve, 2000));
  return document.body.innerText.length > 1000;
}

function isElementReady(
  element: Element,
  requireVisible: boolean,
  requireContent: boolean,
  minContentLength: number
): boolean {
  if (requireVisible) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }
    const style = window.getComputedStyle(element);
    if (style.visibility === 'hidden' || style.display === 'none') {
      return false;
    }
  }

  if (requireContent) {
    const text = element.textContent?.trim() || '';
    if (text.length < minContentLength) {
      return false;
    }
  }

  return true;
}
```

### 2.3 Update DOM Extractor to Use New Utilities

**File:** `E:\agiready\chain-linked\extension\src\content\dom-extractor.ts`

**Required Changes:**

```typescript
// Import new utilities
import { queryWithFallback, SELECTORS } from './selectors';
import { waitForElement, waitForAnalyticsPageReady } from '../shared/dom-utils';

// Update extractProfileData to use selector chains
extractProfileData(): ProfileData | null {
  console.log('[CAPTURE][PROFILE] Starting profile data extraction');

  try {
    // Use selector chain for name
    const nameEl = queryWithFallback(SELECTORS.profile.name);
    const name = nameEl?.textContent?.trim() || null;

    // Use selector chain for headline
    const headlineEl = queryWithFallback(SELECTORS.profile.headline);
    const headline = headlineEl?.textContent?.trim() || null;

    // Continue with other fields using selector chains...
  } catch (error) {
    console.error('[CAPTURE][PROFILE][ERROR] Error extracting profile:', error);
    return null;
  }
}

// Update extractAnalyticsData to wait for page ready
async extractAnalyticsData(): Promise<AnalyticsData | null> {
  console.log('[CAPTURE][ANALYTICS] Starting analytics data extraction');

  // Wait for analytics page to be ready
  const pageReady = await waitForAnalyticsPageReady();
  if (!pageReady) {
    console.warn('[CAPTURE][ANALYTICS] Page not ready, proceeding with partial extraction');
  }

  // Continue with extraction...
}
```

### 2.4 Testing Requirements

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| TC-2.1 | Primary selector fails | Fallback selector used successfully |
| TC-2.2 | All selectors fail | Graceful failure with health report |
| TC-2.3 | Page loads slowly | MutationObserver waits for content |
| TC-2.4 | LinkedIn DOM update simulation | At least one fallback succeeds |

### 2.5 Success Criteria

- [ ] All DOM extractions use selector chains with 3+ fallbacks
- [ ] MutationObserver waits up to 10s for dynamic content
- [ ] Selector health is monitored and reported when failure rate > 50%
- [ ] Auto-reporting system sends selector issues to background for aggregation

---

## Phase 3: Data Integrity

### Objective
Ensure data consistency through proper sync, field validation, and deduplication.

### 3.1 Implement analytics_history Sync to Supabase

**Current Issue:**
`analytics_history` is stored locally in `chrome.storage.local` but not synced to Supabase.

**File:** `E:\agiready\chain-linked\extension\src\background\supabase-sync-bridge.ts`

**Required Changes:**

```typescript
// Add to SYNCABLE_STORAGE_KEYS
export const SYNCABLE_STORAGE_KEYS = [
  // ... existing keys
  'linkedin_analytics_history',  // ADD
  'linkedin_audience_history',   // ADD
] as const;

// Add to STORAGE_TABLE_MAP
export const STORAGE_TABLE_MAP: Record<string, string> = {
  // ... existing mappings
  'linkedin_analytics_history': 'analytics_history',
  'linkedin_audience_history': 'audience_history',
};

// Add to FIELD_MAPPINGS
export const FIELD_MAPPINGS: Record<string, Record<string, string>> = {
  // ... existing mappings
  'analytics_history': {
    'date': 'date',
    'timestamp': 'timestamp',
    'impressions': 'impressions',
    'membersReached': 'members_reached',
    'profileViews': 'profile_views',
    'searchAppearances': 'search_appearances',
    'engagements': 'engagements',
    'topPostsCount': 'top_posts_count',
  },
  'audience_history': {
    'date': 'date',
    'timestamp': 'timestamp',
    'totalFollowers': 'total_followers',
    'followerGrowth': 'follower_growth',
    'newFollowers': 'new_followers',
  },
};

// Add to TABLE_COLUMNS
export const TABLE_COLUMNS: Record<string, string[]> = {
  // ... existing columns
  'analytics_history': [
    'id', 'user_id', 'date', 'impressions', 'members_reached', 'profile_views',
    'search_appearances', 'engagements', 'top_posts_count', 'raw_data',
    'captured_at', 'updated_at',
  ],
  'audience_history': [
    'id', 'user_id', 'date', 'total_followers', 'follower_growth',
    'new_followers', 'raw_data', 'captured_at', 'updated_at',
  ],
};
```

**Database Migration Required:**

```sql
-- File: supabase/migrations/20260203_create_analytics_history.sql

-- Analytics History Table
CREATE TABLE IF NOT EXISTS analytics_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  members_reached INTEGER DEFAULT 0,
  profile_views INTEGER DEFAULT 0,
  search_appearances INTEGER DEFAULT 0,
  engagements INTEGER DEFAULT 0,
  top_posts_count INTEGER DEFAULT 0,
  raw_data JSONB,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Audience History Table
CREATE TABLE IF NOT EXISTS audience_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_followers INTEGER DEFAULT 0,
  follower_growth INTEGER DEFAULT 0,
  new_followers INTEGER DEFAULT 0,
  raw_data JSONB,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Indexes
CREATE INDEX idx_analytics_history_user_date ON analytics_history(user_id, date DESC);
CREATE INDEX idx_audience_history_user_date ON audience_history(user_id, date DESC);

-- RLS Policies
ALTER TABLE analytics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics history" ON analytics_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics history" ON analytics_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analytics history" ON analytics_history
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own audience history" ON audience_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audience history" ON audience_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own audience history" ON audience_history
  FOR UPDATE USING (auth.uid() = user_id);
```

### 3.2 Add Field Validation Schemas (Zod)

**File:** `E:\agiready\chain-linked\extension\src\shared\schemas.ts` (NEW)

```typescript
// NEW FILE: Zod-style validation schemas

// Since we can't add npm dependencies easily to an extension,
// we'll create a lightweight Zod-like validator

type Validator<T> = (value: unknown) => { success: boolean; data?: T; error?: string };

export const z = {
  string: () => ({
    parse: (value: unknown): string => {
      if (typeof value !== 'string') throw new Error('Expected string');
      return value;
    },
    optional: () => ({
      parse: (value: unknown): string | undefined => {
        if (value === undefined || value === null) return undefined;
        if (typeof value !== 'string') throw new Error('Expected string or undefined');
        return value;
      },
    }),
  }),

  number: () => ({
    parse: (value: unknown): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value.replace(/,/g, ''));
        if (!isNaN(parsed)) return parsed;
      }
      throw new Error('Expected number');
    },
    optional: () => ({
      parse: (value: unknown): number | undefined => {
        if (value === undefined || value === null) return undefined;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
          const parsed = parseFloat(value.replace(/,/g, ''));
          if (!isNaN(parsed)) return parsed;
        }
        return undefined;
      },
    }),
    nonnegative: () => ({
      parse: (value: unknown): number => {
        const num = z.number().parse(value);
        if (num < 0) throw new Error('Expected non-negative number');
        return num;
      },
    }),
  }),

  boolean: () => ({
    parse: (value: unknown): boolean => {
      if (typeof value !== 'boolean') throw new Error('Expected boolean');
      return value;
    },
  }),

  object: <T extends Record<string, { parse: (v: unknown) => unknown }>>(shape: T) => ({
    parse: (value: unknown): { [K in keyof T]: ReturnType<T[K]['parse']> } => {
      if (typeof value !== 'object' || value === null) {
        throw new Error('Expected object');
      }
      const result: Record<string, unknown> = {};
      for (const [key, validator] of Object.entries(shape)) {
        try {
          result[key] = validator.parse((value as Record<string, unknown>)[key]);
        } catch (e) {
          throw new Error(`Field "${key}": ${(e as Error).message}`);
        }
      }
      return result as { [K in keyof T]: ReturnType<T[K]['parse']> };
    },
    safeParse: (value: unknown) => {
      try {
        const data = z.object(shape).parse(value);
        return { success: true as const, data };
      } catch (error) {
        return { success: false as const, error: (error as Error).message };
      }
    },
  }),
};

// Analytics schema
export const CreatorAnalyticsSchema = z.object({
  impressions: z.number().optional(),
  engagements: z.number().optional(),
  membersReached: z.number().optional(),
  profileViews: z.number().optional(),
  searchAppearances: z.number().optional(),
  newFollowers: z.number().optional(),
});

// Post analytics schema
export const PostAnalyticsSchema = z.object({
  activityUrn: z.string(),
  impressions: z.number().optional(),
});

// Profile schema
export const ProfileSchema = z.object({
  name: z.string().optional(),
  headline: z.string().optional(),
  followerCount: z.number().optional(),
  connectionCount: z.number().optional(),
});
```

### 3.3 Fix activityUrn Missing in Post Analytics

**File:** `E:\agiready\chain-linked\extension\src\content\auto-capture.ts`

**Current Issue (Lines 625-639):**
```typescript
private async extractPostAnalytics(activityId: string | null): Promise<ExtractedData> {
  // activityId can be null, but we need it for proper post tracking
}
```

**Required Changes:**

```typescript
private async extractPostAnalytics(activityId: string | null): Promise<ExtractedData> {
  console.log(`[AutoCapture] Extracting post analytics: ${activityId}`);

  // VALIDATION: Ensure activityId is present
  if (!activityId) {
    // Try to extract from URL
    const urlMatch = window.location.pathname.match(/urn:li:activity:(\d+)/);
    if (urlMatch) {
      activityId = urlMatch[1];
      console.log(`[AutoCapture] Extracted activityId from URL: ${activityId}`);
    } else {
      console.error('[AutoCapture] No activityId found - cannot track post');
      throw new Error('Post activityId is required but not found');
    }
  }

  // Existing extraction logic...
  if (window.LinkedInDOMExtractor?.extractPostAnalyticsData) {
    const data = window.LinkedInDOMExtractor.extractPostAnalyticsData();
    if (data && (data.impressions || data.engagement)) {
      // ALWAYS ensure activityUrn is set
      data.activityUrn = `urn:li:activity:${activityId}`;
      return data;
    }
  }

  // Fallback also ensures activityUrn
  const fallbackData = this.basicPostAnalyticsExtraction(activityId);
  fallbackData.activityUrn = `urn:li:activity:${activityId}`;
  return fallbackData;
}
```

### 3.4 Add Data Deduplication with Proper Windows

**File:** `E:\agiready\chain-linked\extension\src\shared\deduplication.ts` (NEW)

```typescript
// NEW FILE: Data deduplication utilities

export interface DeduplicationConfig {
  timeWindowMs: number;
  keyFields: string[];
}

const DEFAULT_CONFIGS: Record<string, DeduplicationConfig> = {
  'creator_analytics': {
    timeWindowMs: 5 * 60 * 1000, // 5 minutes
    keyFields: ['pageType', 'subtype'],
  },
  'post_analytics': {
    timeWindowMs: 5 * 60 * 1000, // 5 minutes
    keyFields: ['activityUrn'],
  },
  'audience_analytics': {
    timeWindowMs: 30 * 60 * 1000, // 30 minutes
    keyFields: ['pageType'],
  },
  'profile': {
    timeWindowMs: 60 * 60 * 1000, // 1 hour
    keyFields: ['linkedin_id', 'profileUrn'],
  },
};

// In-memory dedup cache
const dedupCache: Map<string, { timestamp: number; hash: string }> = new Map();

/**
 * Generate a unique key for deduplication
 */
function generateDedupKey(captureType: string, data: Record<string, unknown>): string {
  const config = DEFAULT_CONFIGS[captureType];
  if (!config) return `${captureType}:default`;

  const keyParts = config.keyFields.map(field => String(data[field] || 'null'));
  return `${captureType}:${keyParts.join(':')}`;
}

/**
 * Generate content hash for comparison
 */
function generateContentHash(data: Record<string, unknown>): string {
  // Simple hash based on stringified data
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * Check if data is a duplicate
 */
export function isDuplicate(captureType: string, data: Record<string, unknown>): boolean {
  const config = DEFAULT_CONFIGS[captureType];
  if (!config) return false;

  const key = generateDedupKey(captureType, data);
  const cached = dedupCache.get(key);

  if (!cached) return false;

  const now = Date.now();
  const isWithinWindow = (now - cached.timestamp) < config.timeWindowMs;

  if (!isWithinWindow) {
    dedupCache.delete(key);
    return false;
  }

  // Within time window - check content hash
  const currentHash = generateContentHash(data);
  return cached.hash === currentHash;
}

/**
 * Mark data as captured for deduplication
 */
export function markCaptured(captureType: string, data: Record<string, unknown>): void {
  const key = generateDedupKey(captureType, data);
  const hash = generateContentHash(data);

  dedupCache.set(key, {
    timestamp: Date.now(),
    hash,
  });

  // Cleanup old entries periodically
  if (dedupCache.size > 1000) {
    cleanupDedupCache();
  }
}

/**
 * Clean up expired cache entries
 */
function cleanupDedupCache(): void {
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour max

  for (const [key, value] of dedupCache.entries()) {
    if (now - value.timestamp > maxAge) {
      dedupCache.delete(key);
    }
  }
}

/**
 * Clear dedup cache (for testing)
 */
export function clearDedupCache(): void {
  dedupCache.clear();
}
```

**Integration in auto-capture.ts:**

```typescript
import { isDuplicate, markCaptured } from '../shared/deduplication';

async captureCurrentPage(pageInfo: PageInfo): Promise<void> {
  // ... existing validation ...

  try {
    const data = await this.extractDataForPageType(pageInfo);

    // Check for duplicates before saving
    if (isDuplicate(pageInfo.type, data)) {
      console.log(`[AutoCapture] Duplicate data detected for ${pageInfo.type}, skipping`);
      return;
    }

    await this.saveCapture(messageType, data);

    // Mark as captured for future deduplication
    markCaptured(pageInfo.type, data);

    // ... rest of success handling ...
  } catch (error) {
    // ... error handling ...
  }
}
```

### 3.5 Testing Requirements

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| TC-3.1 | analytics_history syncs to Supabase | Data appears in Supabase table |
| TC-3.2 | Invalid data fails validation | Validation error, data not saved |
| TC-3.3 | Post analytics without activityUrn | activityUrn extracted from URL |
| TC-3.4 | Duplicate capture within 5 minutes | Second capture skipped |
| TC-3.5 | Same data after time window | Data captured normally |

### 3.6 Success Criteria

- [ ] analytics_history and audience_history sync to Supabase
- [ ] All data passes schema validation before persistence
- [ ] Post analytics always include activityUrn
- [ ] Duplicate data within time windows is skipped

---

## Phase 4: Monitoring and Observability

### Objective
Add visibility into capture health, sync status, and system performance through dashboards and metrics.

### 4.1 Add Capture Status Dashboard to Popup

**File:** `E:\agiready\chain-linked\extension\src\popup\components\CaptureHealth.tsx` (NEW)

```tsx
// NEW FILE: Capture health dashboard component

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface CaptureStats {
  totalCaptures: number;
  successfulCaptures: number;
  failedCaptures: number;
  capturesByType: Record<string, { success: number; failed: number }>;
  lastCapture: {
    type: string;
    success: boolean;
    timestamp: string;
  } | null;
}

interface SelectorHealth {
  selector: string;
  failureRate: number;
  lastFailure: number | null;
}

export function CaptureHealth() {
  const [stats, setStats] = useState<CaptureStats | null>(null);
  const [selectorHealth, setSelectorHealth] = useState<SelectorHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCaptureHealth();
    const interval = setInterval(loadCaptureHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadCaptureHealth() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CAPTURE_STATS' });
      if (response.success) {
        setStats(response.data);
      }

      const healthResponse = await chrome.runtime.sendMessage({ type: 'GET_SELECTOR_HEALTH' });
      if (healthResponse.success) {
        setSelectorHealth(healthResponse.data);
      }
    } catch (error) {
      console.error('Failed to load capture health:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse">Loading capture health...</div>;
  }

  const successRate = stats
    ? Math.round((stats.successfulCaptures / stats.totalCaptures) * 100) || 0
    : 0;

  return (
    <div className="space-y-4">
      {/* Overall Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Capture Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <span>Success Rate</span>
            <Badge variant={successRate > 90 ? 'default' : successRate > 70 ? 'secondary' : 'destructive'}>
              {successRate}%
            </Badge>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
            <span>{stats?.successfulCaptures || 0} successful</span>
            <span>{stats?.failedCaptures || 0} failed</span>
          </div>
        </CardContent>
      </Card>

      {/* By Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">By Capture Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats?.capturesByType && Object.entries(stats.capturesByType).map(([type, data]) => (
              <div key={type} className="flex items-center justify-between text-sm">
                <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                <span className="text-muted-foreground">
                  {data.success}/{data.success + data.failed}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selector Health Warnings */}
      {selectorHealth.filter(s => s.failureRate > 0.3).length > 0 && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-yellow-600">Selector Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectorHealth
                .filter(s => s.failureRate > 0.3)
                .map((s, i) => (
                  <div key={i} className="text-xs text-muted-foreground">
                    {s.selector.substring(0, 30)}... ({Math.round(s.failureRate * 100)}% failure)
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Capture */}
      {stats?.lastCapture && (
        <div className="text-xs text-muted-foreground">
          Last capture: {stats.lastCapture.type} at {new Date(stats.lastCapture.timestamp).toLocaleTimeString()}
          {stats.lastCapture.success ? ' (success)' : ' (failed)'}
        </div>
      )}
    </div>
  );
}
```

### 4.2 Implement Capture Health Metrics

**File:** `E:\agiready\chain-linked\extension\src\shared\metrics.ts` (NEW)

```typescript
// NEW FILE: Metrics collection and reporting

export interface CaptureMetric {
  type: string;
  success: boolean;
  duration: number;
  timestamp: number;
  errorMessage?: string;
  retryCount?: number;
  selectorUsed?: string;
}

export interface MetricsSummary {
  period: 'hour' | 'day' | 'week';
  totalCaptures: number;
  successRate: number;
  avgDuration: number;
  byType: Record<string, {
    count: number;
    successRate: number;
    avgDuration: number;
  }>;
  topErrors: Array<{ message: string; count: number }>;
}

class MetricsCollector {
  private metrics: CaptureMetric[] = [];
  private readonly MAX_METRICS = 1000;

  record(metric: Omit<CaptureMetric, 'timestamp'>): void {
    this.metrics.push({
      ...metric,
      timestamp: Date.now(),
    });

    // Trim old metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Persist to storage periodically
    this.persistMetrics();
  }

  getSummary(period: 'hour' | 'day' | 'week'): MetricsSummary {
    const cutoff = this.getCutoff(period);
    const relevant = this.metrics.filter(m => m.timestamp > cutoff);

    const byType: Record<string, { total: number; success: number; totalDuration: number }> = {};
    const errorCounts: Record<string, number> = {};

    for (const metric of relevant) {
      if (!byType[metric.type]) {
        byType[metric.type] = { total: 0, success: 0, totalDuration: 0 };
      }
      byType[metric.type].total++;
      if (metric.success) byType[metric.type].success++;
      byType[metric.type].totalDuration += metric.duration;

      if (!metric.success && metric.errorMessage) {
        errorCounts[metric.errorMessage] = (errorCounts[metric.errorMessage] || 0) + 1;
      }
    }

    const totalCaptures = relevant.length;
    const successCount = relevant.filter(m => m.success).length;
    const totalDuration = relevant.reduce((sum, m) => sum + m.duration, 0);

    return {
      period,
      totalCaptures,
      successRate: totalCaptures > 0 ? successCount / totalCaptures : 0,
      avgDuration: totalCaptures > 0 ? totalDuration / totalCaptures : 0,
      byType: Object.fromEntries(
        Object.entries(byType).map(([type, data]) => [
          type,
          {
            count: data.total,
            successRate: data.total > 0 ? data.success / data.total : 0,
            avgDuration: data.total > 0 ? data.totalDuration / data.total : 0,
          },
        ])
      ),
      topErrors: Object.entries(errorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([message, count]) => ({ message, count })),
    };
  }

  private getCutoff(period: 'hour' | 'day' | 'week'): number {
    const now = Date.now();
    switch (period) {
      case 'hour': return now - 60 * 60 * 1000;
      case 'day': return now - 24 * 60 * 60 * 1000;
      case 'week': return now - 7 * 24 * 60 * 60 * 1000;
    }
  }

  private async persistMetrics(): void {
    try {
      await chrome.storage.local.set({ capture_metrics: this.metrics.slice(-500) });
    } catch (e) {
      console.error('[Metrics] Failed to persist:', e);
    }
  }

  async loadMetrics(): Promise<void> {
    try {
      const result = await chrome.storage.local.get('capture_metrics');
      if (result.capture_metrics) {
        this.metrics = result.capture_metrics;
      }
    } catch (e) {
      console.error('[Metrics] Failed to load:', e);
    }
  }
}

export const metricsCollector = new MetricsCollector();
```

### 4.3 Add Real-Time Sync Status Indicators

**File:** `E:\agiready\chain-linked\extension\src\popup\components\SyncStatus.tsx` (NEW)

```tsx
// NEW FILE: Real-time sync status component

import React, { useEffect, useState } from 'react';
import { Badge } from './ui/badge';

interface SyncStatusData {
  isAuthenticated: boolean;
  userId: string | null;
  pendingCount: number;
  lastSyncTime: number | null;
  isSyncing: boolean;
  isOnline: boolean;
}

export function SyncStatus() {
  const [status, setStatus] = useState<SyncStatusData | null>(null);

  useEffect(() => {
    loadSyncStatus();

    // Listen for sync events
    const handleMessage = (message: { type: string; data?: unknown }) => {
      if (message.type === 'SYNC_STARTED' ||
          message.type === 'SYNC_COMPLETE' ||
          message.type === 'PENDING_CHANGE_ADDED') {
        loadSyncStatus();
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    // Poll every 30 seconds
    const interval = setInterval(loadSyncStatus, 30000);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
      clearInterval(interval);
    };
  }, []);

  async function loadSyncStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'SUPABASE_SYNC_STATUS' });
      if (response.success) {
        setStatus(response.data);
      }
    } catch (e) {
      console.error('Failed to load sync status:', e);
    }
  }

  if (!status) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* Connection Status */}
      <div className="flex items-center gap-1">
        <span className={`w-2 h-2 rounded-full ${status.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-xs text-muted-foreground">
          {status.isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Sync Status */}
      {status.isSyncing ? (
        <Badge variant="secondary" className="animate-pulse">
          Syncing...
        </Badge>
      ) : status.pendingCount > 0 ? (
        <Badge variant="outline">
          {status.pendingCount} pending
        </Badge>
      ) : (
        <Badge variant="default">Synced</Badge>
      )}

      {/* Last Sync Time */}
      {status.lastSyncTime && (
        <span className="text-xs text-muted-foreground">
          {formatRelativeTime(status.lastSyncTime)}
        </span>
      )}
    </div>
  );
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}
```

### 4.4 Create Capture Logs Viewer

**File:** `E:\agiready\chain-linked\extension\src\popup\components\CaptureLogs.tsx` (NEW)

```tsx
// NEW FILE: Capture logs viewer component

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

interface CaptureLog {
  id: string;
  type: string;
  timestamp: number;
  success: boolean;
  dataSize: number;
  error?: string;
  url?: string;
}

export function CaptureLogs() {
  const [logs, setLogs] = useState<CaptureLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_DATA',
        key: 'auto_capture_log'
      });
      if (response.success && response.data) {
        setLogs(response.data.slice(-50).reverse());
      }
    } catch (e) {
      console.error('Failed to load logs:', e);
    } finally {
      setLoading(false);
    }
  }

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'success') return log.success;
    return !log.success;
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Recent Captures</CardTitle>
        <div className="flex gap-1">
          {(['all', 'success', 'failed'] as const).map(f => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse">Loading...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-sm text-muted-foreground">No captures yet</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredLogs.map((log, i) => (
              <div
                key={log.id || i}
                className={`text-xs p-2 rounded ${
                  log.success ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-medium capitalize">{log.type?.replace(/_/g, ' ')}</span>
                  <span className="text-muted-foreground">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {!log.success && log.error && (
                  <div className="text-red-600 mt-1">{log.error}</div>
                )}
              </div>
            ))}
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2"
          onClick={loadLogs}
        >
          Refresh
        </Button>
      </CardContent>
    </Card>
  );
}
```

### 4.5 Testing Requirements

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| TC-4.1 | View capture health dashboard | Stats display correctly |
| TC-4.2 | Sync status updates in real-time | Badge updates on sync events |
| TC-4.3 | Filter capture logs | Logs filter correctly |
| TC-4.4 | Metrics summary accurate | Counts match actual captures |

### 4.5 Success Criteria

- [ ] Popup shows capture success rate and recent activity
- [ ] Real-time sync status indicator shows pending/syncing/synced
- [ ] Capture logs are viewable and filterable
- [ ] Selector health warnings appear when failure rate > 30%

---

## Phase 5: Background Sync Improvements

### Objective
Optimize sync performance, add conflict resolution, and improve offline handling.

### 5.1 Optimize Sync Intervals Based on Capture Activity

**File:** `E:\agiready\chain-linked\extension\src\background\supabase-sync-bridge.ts`

**Additions:**

```typescript
// Adaptive sync interval management
interface SyncIntervalConfig {
  minIntervalMs: number;
  maxIntervalMs: number;
  pendingThreshold: number;
  activityDecayMs: number;
}

const ADAPTIVE_SYNC_CONFIG: SyncIntervalConfig = {
  minIntervalMs: 30 * 1000,      // 30 seconds when very active
  maxIntervalMs: 10 * 60 * 1000, // 10 minutes when idle
  pendingThreshold: 5,           // Sync immediately if > 5 pending
  activityDecayMs: 5 * 60 * 1000, // Slow down after 5 min of no activity
};

let lastActivityTime = Date.now();
let currentSyncInterval = ADAPTIVE_SYNC_CONFIG.maxIntervalMs;
let syncIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Record capture activity to adjust sync frequency
 */
export function recordActivity(): void {
  lastActivityTime = Date.now();
  adjustSyncInterval();
}

/**
 * Adjust sync interval based on recent activity
 */
function adjustSyncInterval(): void {
  const timeSinceActivity = Date.now() - lastActivityTime;

  // More frequent sync when recently active
  if (timeSinceActivity < ADAPTIVE_SYNC_CONFIG.activityDecayMs) {
    currentSyncInterval = ADAPTIVE_SYNC_CONFIG.minIntervalMs;
  } else {
    // Gradually increase interval
    const decayFactor = Math.min(
      timeSinceActivity / ADAPTIVE_SYNC_CONFIG.activityDecayMs,
      4 // Max 4x decay
    );
    currentSyncInterval = Math.min(
      ADAPTIVE_SYNC_CONFIG.minIntervalMs * decayFactor,
      ADAPTIVE_SYNC_CONFIG.maxIntervalMs
    );
  }

  console.log(`[SyncBridge] Adjusted sync interval to ${Math.round(currentSyncInterval / 1000)}s`);
  restartSyncInterval();
}

function restartSyncInterval(): void {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
  }

  syncIntervalId = setInterval(async () => {
    const pending = await getPendingChanges();

    // Immediate sync if many pending changes
    if (pending.length >= ADAPTIVE_SYNC_CONFIG.pendingThreshold) {
      console.log(`[SyncBridge] High pending count (${pending.length}), syncing now`);
    }

    if (navigator.onLine && currentUserId && pending.length > 0) {
      await processPendingChanges();
    }
  }, currentSyncInterval);
}

/**
 * Start adaptive sync
 */
export function startAdaptiveSync(): void {
  adjustSyncInterval();
  console.log('[SyncBridge] Adaptive sync started');
}
```

### 5.2 Add Conflict Resolution for Multi-Device Sync

**File:** `E:\agiready\chain-linked\extension\src\shared\conflict-resolution.ts` (NEW)

```typescript
// NEW FILE: Conflict resolution for multi-device sync

export type ConflictStrategy = 'server-wins' | 'client-wins' | 'merge' | 'newest-wins';

export interface ConflictResult {
  resolved: Record<string, unknown>;
  strategy: ConflictStrategy;
  hadConflict: boolean;
}

/**
 * Resolve conflicts between local and server data
 */
export function resolveConflict(
  localData: Record<string, unknown>,
  serverData: Record<string, unknown>,
  strategy: ConflictStrategy = 'newest-wins'
): ConflictResult {
  // No server data - use local
  if (!serverData || Object.keys(serverData).length === 0) {
    return { resolved: localData, strategy, hadConflict: false };
  }

  // No local data - use server
  if (!localData || Object.keys(localData).length === 0) {
    return { resolved: serverData, strategy, hadConflict: false };
  }

  switch (strategy) {
    case 'server-wins':
      return { resolved: serverData, strategy, hadConflict: true };

    case 'client-wins':
      return { resolved: localData, strategy, hadConflict: true };

    case 'newest-wins':
      return resolveByTimestamp(localData, serverData);

    case 'merge':
      return mergeData(localData, serverData);

    default:
      return { resolved: localData, strategy, hadConflict: true };
  }
}

function resolveByTimestamp(
  localData: Record<string, unknown>,
  serverData: Record<string, unknown>
): ConflictResult {
  const localTimestamp = getTimestamp(localData);
  const serverTimestamp = getTimestamp(serverData);

  if (localTimestamp > serverTimestamp) {
    return { resolved: localData, strategy: 'newest-wins', hadConflict: true };
  }
  return { resolved: serverData, strategy: 'newest-wins', hadConflict: true };
}

function getTimestamp(data: Record<string, unknown>): number {
  const timestamp = data.updated_at || data.lastUpdated || data.capturedAt || data.captured_at;
  if (typeof timestamp === 'string') {
    return new Date(timestamp).getTime();
  }
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  return 0;
}

function mergeData(
  localData: Record<string, unknown>,
  serverData: Record<string, unknown>
): ConflictResult {
  const merged: Record<string, unknown> = { ...serverData };

  // For numeric fields, take the maximum (usually more recent)
  const numericFields = [
    'impressions', 'engagements', 'followers_count', 'connections_count',
    'profile_views', 'search_appearances', 'total_followers'
  ];

  for (const field of numericFields) {
    const local = localData[field] as number | undefined;
    const server = serverData[field] as number | undefined;

    if (local !== undefined && server !== undefined) {
      merged[field] = Math.max(local, server);
    } else if (local !== undefined) {
      merged[field] = local;
    }
  }

  // For arrays, merge unique items
  const arrayFields = ['topPosts', 'top_posts'];
  for (const field of arrayFields) {
    if (Array.isArray(localData[field]) && Array.isArray(serverData[field])) {
      const combined = [...(serverData[field] as unknown[])];
      const serverIds = new Set((serverData[field] as Array<{ id?: string }>).map(i => i.id));

      for (const item of localData[field] as Array<{ id?: string }>) {
        if (!serverIds.has(item.id)) {
          combined.push(item);
        }
      }
      merged[field] = combined;
    }
  }

  // Update timestamp to now
  merged.updated_at = new Date().toISOString();

  return { resolved: merged, strategy: 'merge', hadConflict: true };
}
```

### 5.3 Implement Incremental Sync

**File:** `E:\agiready\chain-linked\extension\src\background\supabase-sync-bridge.ts`

**Additions:**

```typescript
/**
 * Incremental sync - only sync changed data since last sync
 */
export async function incrementalSync(): Promise<{
  synced: number;
  unchanged: number;
  errors: string[];
}> {
  const lastSyncTime = await getLastSyncTime();
  const pending = await getPendingChanges();

  // Filter to only changes since last sync
  const newChanges = pending.filter(c => c.timestamp > (lastSyncTime || 0));

  console.log(`[SyncBridge] Incremental sync: ${newChanges.length}/${pending.length} changes since last sync`);

  if (newChanges.length === 0) {
    return { synced: 0, unchanged: pending.length, errors: [] };
  }

  // Temporarily replace pending with only new changes
  const originalPending = await getPendingChanges();
  await savePendingChanges(newChanges);

  try {
    const result = await processPendingChanges();
    return {
      synced: result.success,
      unchanged: pending.length - newChanges.length,
      errors: result.errors,
    };
  } finally {
    // Restore any remaining changes
    const remaining = await getPendingChanges();
    const failedOriginal = originalPending.filter(o =>
      !newChanges.some(n => n.timestamp === o.timestamp && n.table === o.table) ||
      remaining.some(r => r.timestamp === o.timestamp && r.table === o.table)
    );
    await savePendingChanges(failedOriginal);
  }
}

async function getLastSyncTime(): Promise<number | null> {
  const result = await chrome.storage.local.get('last_sync_time');
  return result.last_sync_time ? new Date(result.last_sync_time).getTime() : null;
}
```

### 5.4 Add Offline Queue Management

**File:** `E:\agiready\chain-linked\extension\src\shared\offline-queue.ts` (NEW)

```typescript
// NEW FILE: Offline queue management

interface QueuedOperation {
  id: string;
  type: 'sync' | 'save' | 'capture';
  data: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'normal' | 'low';
}

const QUEUE_STORAGE_KEY = 'offline_operation_queue';
const MAX_QUEUE_SIZE = 500;

/**
 * Add operation to offline queue
 */
export async function queueOfflineOperation(
  type: QueuedOperation['type'],
  data: Record<string, unknown>,
  priority: QueuedOperation['priority'] = 'normal'
): Promise<void> {
  const queue = await getOfflineQueue();

  const operation: QueuedOperation = {
    id: generateOperationId(),
    type,
    data,
    createdAt: Date.now(),
    retryCount: 0,
    maxRetries: 3,
    priority,
  };

  // Add to queue with priority ordering
  const insertIndex = queue.findIndex(op =>
    getPriorityWeight(op.priority) < getPriorityWeight(priority)
  );

  if (insertIndex === -1) {
    queue.push(operation);
  } else {
    queue.splice(insertIndex, 0, operation);
  }

  // Trim queue if too large
  if (queue.length > MAX_QUEUE_SIZE) {
    // Remove oldest low-priority items
    const lowPriority = queue.filter(op => op.priority === 'low');
    if (lowPriority.length > 0) {
      queue.splice(queue.indexOf(lowPriority[0]), 1);
    } else {
      queue.shift();
    }
  }

  await saveOfflineQueue(queue);
  console.log(`[OfflineQueue] Queued ${type} operation (${queue.length} total)`);
}

/**
 * Process offline queue when online
 */
export async function processOfflineQueue(): Promise<{
  processed: number;
  failed: number;
  remaining: number;
}> {
  if (!navigator.onLine) {
    console.log('[OfflineQueue] Still offline, skipping');
    return { processed: 0, failed: 0, remaining: 0 };
  }

  const queue = await getOfflineQueue();
  let processed = 0;
  let failed = 0;
  const remaining: QueuedOperation[] = [];

  for (const operation of queue) {
    try {
      await executeOperation(operation);
      processed++;
    } catch (error) {
      operation.retryCount++;

      if (operation.retryCount < operation.maxRetries) {
        remaining.push(operation);
      } else {
        failed++;
        console.error(`[OfflineQueue] Operation ${operation.id} failed permanently:`, error);
      }
    }
  }

  await saveOfflineQueue(remaining);

  console.log(`[OfflineQueue] Processed ${processed}, failed ${failed}, remaining ${remaining.length}`);
  return { processed, failed, remaining: remaining.length };
}

async function executeOperation(operation: QueuedOperation): Promise<void> {
  switch (operation.type) {
    case 'sync':
      await chrome.runtime.sendMessage({ type: 'SUPABASE_SYNC_NOW' });
      break;
    case 'save':
      await chrome.runtime.sendMessage({
        type: 'SAVE_DATA',
        key: operation.data.key as string,
        data: operation.data.value
      });
      break;
    case 'capture':
      // Re-queue for sync bridge
      await chrome.runtime.sendMessage({
        type: operation.data.messageType as string,
        data: operation.data.captureData,
      });
      break;
    default:
      throw new Error(`Unknown operation type: ${operation.type}`);
  }
}

async function getOfflineQueue(): Promise<QueuedOperation[]> {
  const result = await chrome.storage.local.get(QUEUE_STORAGE_KEY);
  return result[QUEUE_STORAGE_KEY] || [];
}

async function saveOfflineQueue(queue: QueuedOperation[]): Promise<void> {
  await chrome.storage.local.set({ [QUEUE_STORAGE_KEY]: queue });
}

function generateOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getPriorityWeight(priority: QueuedOperation['priority']): number {
  switch (priority) {
    case 'high': return 3;
    case 'normal': return 2;
    case 'low': return 1;
  }
}

// Setup online listener for automatic queue processing
if (typeof self !== 'undefined') {
  self.addEventListener('online', async () => {
    console.log('[OfflineQueue] Online - processing queue');
    await processOfflineQueue();
  });
}
```

### 5.5 Testing Requirements

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| TC-5.1 | Active captures increase sync frequency | Interval drops to 30s |
| TC-5.2 | Conflict between local and server | Resolved using strategy |
| TC-5.3 | Incremental sync after partial failure | Only new changes synced |
| TC-5.4 | Operations queued while offline | Processed when online |

### 5.6 Success Criteria

- [ ] Sync interval adapts: 30s when active, 10m when idle
- [ ] Conflicts resolved with configurable strategy (default: newest-wins)
- [ ] Incremental sync skips unchanged data
- [ ] Offline queue persists and processes on reconnection

---

## Implementation Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Error Handling | 1 week | None |
| Phase 2: Selector Robustness | 1 week | Phase 1 (partial) |
| Phase 3: Data Integrity | 1 week | Phase 1 |
| Phase 4: Monitoring | 1 week | Phases 1-3 |
| Phase 5: Background Sync | 1 week | Phases 1, 3 |

**Total Estimated Duration:** 5 weeks

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| LinkedIn DOM changes break selectors | High | High | Fallback chains + health monitoring |
| Service worker crashes lose state | Medium | High | Persist state to storage |
| Supabase sync conflicts | Medium | Medium | Conflict resolution strategy |
| Performance degradation | Low | Medium | Adaptive intervals + batching |
| Extension context invalidation | High | Low | Graceful error handling |

---

## Files Summary

### New Files to Create:
1. `E:\agiready\chain-linked\extension\src\shared\retry-utils.ts`
2. `E:\agiready\chain-linked\extension\src\shared\validators.ts`
3. `E:\agiready\chain-linked\extension\src\content\selectors.ts`
4. `E:\agiready\chain-linked\extension\src\shared\dom-utils.ts`
5. `E:\agiready\chain-linked\extension\src\shared\schemas.ts`
6. `E:\agiready\chain-linked\extension\src\shared\deduplication.ts`
7. `E:\agiready\chain-linked\extension\src\shared\metrics.ts`
8. `E:\agiready\chain-linked\extension\src\shared\conflict-resolution.ts`
9. `E:\agiready\chain-linked\extension\src\shared\offline-queue.ts`
10. `E:\agiready\chain-linked\extension\src\popup\components\CaptureHealth.tsx`
11. `E:\agiready\chain-linked\extension\src\popup\components\SyncStatus.tsx`
12. `E:\agiready\chain-linked\extension\src\popup\components\CaptureLogs.tsx`

### Files to Modify:
1. `E:\agiready\chain-linked\extension\src\content\content-script.ts`
2. `E:\agiready\chain-linked\extension\src\content\auto-capture.ts`
3. `E:\agiready\chain-linked\extension\src\content\dom-extractor.ts`
4. `E:\agiready\chain-linked\extension\src\background\service-worker.ts`
5. `E:\agiready\chain-linked\extension\src\background\notifications.ts`
6. `E:\agiready\chain-linked\extension\src\background\supabase-sync-bridge.ts`

### Database Migrations:
1. `E:\agiready\chain-linked\supabase\migrations\20260203_create_analytics_history.sql`

---

## Appendix: Quick Reference

### Message Types for Service Worker

| Message Type | Purpose |
|--------------|---------|
| `GET_CAPTURE_STATS` | Get capture statistics |
| `GET_SELECTOR_HEALTH` | Get selector health metrics |
| `GET_METRICS_SUMMARY` | Get metrics summary by period |
| `SELECTOR_HEALTH_REPORT` | Report failing selector |
| `CAPTURE_ERROR` | Report capture error |

### Validation Schemas

| Schema | Required Fields | Optional Fields |
|--------|-----------------|-----------------|
| `CreatorAnalyticsSchema` | None | impressions, engagements, membersReached, profileViews, searchAppearances, newFollowers |
| `PostAnalyticsSchema` | activityUrn | impressions |
| `ProfileSchema` | None | name, headline, followerCount, connectionCount |

### Deduplication Time Windows

| Capture Type | Window |
|--------------|--------|
| creator_analytics | 5 minutes |
| post_analytics | 5 minutes |
| audience_analytics | 30 minutes |
| profile | 1 hour |
