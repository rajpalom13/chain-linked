/**
 * LinkedIn Data Extractor - Main World Interceptor v3.4
 *
 * This script runs in the MAIN world at document_start, ensuring it executes
 * before LinkedIn's code can cache references to fetch/XHR.
 *
 * 8 Interceptors:
 * 1. Fetch - intercepts fetch() calls to LinkedIn API
 * 2. XHR - intercepts XMLHttpRequest to LinkedIn API
 * 3. Response.json() - catches .json() consumption
 * 4. Response.text() - catches .text() + JSON.parse() pattern
 * 5. JSON.parse - ultimate fallback for structure-detected data
 * 6. Response.arrayBuffer() - catches binary JSON consumption
 * 7. Worker message - catches data from Web Workers
 * 8. ReadableStream - catches streaming response consumption
 * + Fetch body tee for non-JSON content types
 */

// Make this file a module to allow global augmentations
export {};

// ============================================
// TYPE DEFINITIONS
// ============================================

interface DispatchPayload {
  type: string;
  url: string;
  endpoint: string;
  method: string;
  category: string;
  queryId: string | null;
  isGraphQL: boolean;
  data: unknown;
  timestamp: number;
}

type Category = 'feed' | 'myPosts' | 'comments' | 'reactions' | 'messaging' |
  'profile' | 'network' | 'analytics' | 'notifications' | 'invitations' |
  'search' | 'jobs' | 'company' | 'learning' | 'events' | 'other' | 'excluded';

declare global {
  interface Window {
    __linkedInMainWorldInterceptorLoaded?: boolean;
    __linkedInFetchInterceptor?: typeof fetch;
  }
}

// ============================================
// IIFE — everything runs inside to avoid leaking globals
// ============================================

(function () {
  'use strict';

  // Prevent double initialization
  if (window.__linkedInMainWorldInterceptorLoaded) return;
  window.__linkedInMainWorldInterceptorLoaded = true;

  console.log('[MainWorldInterceptor] v3.4 Initializing at document_start...');

  // ============================================
  // STORE ORIGINAL REFERENCES IMMEDIATELY
  // ============================================

  const _originalFetch = window.fetch;
  const _originalXHROpen = XMLHttpRequest.prototype.open;
  const _originalXHRSend = XMLHttpRequest.prototype.send;
  const _originalResponseJson = Response.prototype.json;
  const _originalResponseText = Response.prototype.text;
  const _originalJSONParse = JSON.parse;

  // ============================================
  // URL TRACKING VIA PERFORMANCE OBSERVER
  // ============================================

  const recentVoyagerUrls = new Map<string, number>();
  const MAX_URL_AGE = 10000; // 10 seconds

  /**
   * Track voyager API URLs for correlation with structure-detected data
   * @param url - The URL to track
   */
  function trackVoyagerUrl(url: string): void {
    if (url && url.includes('/voyager/')) {
      recentVoyagerUrls.set(url, Date.now());
      const now = Date.now();
      for (const [u, t] of recentVoyagerUrls) {
        if (now - t > MAX_URL_AGE) recentVoyagerUrls.delete(u);
      }
    }
  }

  /**
   * Get the most recent voyager URL for correlation
   * @returns The most recent voyager URL or null
   */
  function getRecentVoyagerUrl(): string | null {
    const now = Date.now();
    let bestUrl: string | null = null;
    let bestTime = 0;
    for (const [url, time] of recentVoyagerUrls) {
      if (now - time < MAX_URL_AGE && time > bestTime) {
        bestUrl = url;
        bestTime = time;
      }
    }
    return bestUrl;
  }

  // Install PerformanceObserver to track ALL network requests
  try {
    const perfObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if ((entry as PerformanceResourceTiming).initiatorType === 'fetch' ||
            (entry as PerformanceResourceTiming).initiatorType === 'xmlhttprequest') {
          trackVoyagerUrl(entry.name);
        }
      }
    });
    perfObserver.observe({ entryTypes: ['resource'] });
    console.log('[MainWorldInterceptor] PerformanceObserver installed for URL tracking');
  } catch (e) {
    console.warn('[MainWorldInterceptor] PerformanceObserver not available:', (e as Error).message);
  }

  // ============================================
  // CONFIGURATION
  // ============================================

  const capturePatterns = ['/voyager/api/', '/voyagerMessagingGraphQL/', '/li/track'];

  /**
   * Check if a URL should be captured
   * @param url - The URL to check
   * @returns Whether the URL matches a capture pattern
   */
  function shouldCapture(url: string): boolean {
    return capturePatterns.some(p => String(url).includes(p));
  }

  /** GraphQL queryId patterns for categorization
   * Derived from LinkedIn Voyager API Reference — covers all known endpoint prefixes */
  const graphqlCategories: Record<string, string[]> = {
    feed: ['voyagerFeedDashMainFeed', 'voyagerFeedDashFeedUpdate', 'voyagerFeedDashRecommendedFeed',
           'voyagerFeedDashUpdateV2', 'voyagerSocialDashUpdate', 'voyagerFeedDashIdentityModule',
           'voyagerFeedDashTopics', 'voyagerFeedDashPackageRecommendations'],
    myPosts: ['voyagerFeedDashProfileUpdates', 'voyagerFeedDashMemberActivityFeed',
              'voyagerFeedDashActivityFeed', 'voyagerFeedDashShareUpdate',
              'voyagerIdentityDashProfilePosts', 'voyagerFeedDashProfileActivityFeed',
              'voyagerIdentityDashProfileContentCollections', 'voyagerFeedDashMemberShareFeed'],
    comments: ['voyagerSocialDashComments', 'voyagerSocialDashReplies'],
    reactions: ['voyagerSocialDashReactions', 'voyagerSocialDashReactors'],
    messaging: ['messengerMailboxCounts', 'messengerConversations', 'messengerMessages',
                'voyagerMessagingDashMessagingSettings', 'voyagerMessagingDashAwayStatus',
                'voyagerMessagingDashAffiliatedMailboxes', 'voyagerMessagingDashConversationNudges',
                'voyagerMessagingDashSecondaryInbox'],
    profile: ['voyagerIdentityDashProfiles', 'voyagerIdentityDashProfileCards',
              'voyagerIdentityDashProfileComponents', 'voyagerIdentityDashProfileGoals',
              'voyagerIdentityDashOpenToCards', 'voyagerIdentityDashNotificationCards',
              'voyagerTrustDashVerification', 'voyagerIdentityDashProfilePhotoFrames'],
    network: ['voyagerRelationshipsDashConnections', 'voyagerRelationshipsDashFollowers'],
    analytics: ['voyagerCreatorDashAnalytics', 'voyagerContentDashAnalytics', 'voyagerIdentityDashWvmp',
                'voyagerLaunchpadDashLaunchpadViews'],
    notifications: ['voyagerNotificationsDash', 'notificationCards', 'notificationsSeen',
                    'voyagerNotificationsDashBadging'],
    invitations: ['voyagerRelationshipsDashInvitations', 'invitationsSummary', 'invitationsReceived'],
    search: ['voyagerSearchDash', 'searchBlendedResults', 'searchHistory'],
    jobs: ['voyagerJobsDash', 'jobPostings', 'jobApplications', 'voyagerJobsDashJobSeekerPreferences'],
    company: ['voyagerOrganizationDash', 'companyInsights', 'companySuggestions',
              'voyagerOrganizationDashCompanies', 'voyagerOrganizationDashPageMailbox'],
    learning: ['voyagerLearningDash', 'learningCourses', 'voyagerLearningDashLearningRecommendations'],
    events: ['voyagerEventsDash', 'eventDetails']
  };

  /**
   * Extract the GraphQL queryId from a URL
   * @param url - The URL to extract from
   * @returns The queryId or null
   */
  function extractQueryId(url: string): string | null {
    if (!url) return null;
    const match = String(url).match(/queryId=([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  /** Non-post endpoints — these are known junk that should NEVER be categorized as real data.
   * categorize() treats 'excluded' as authoritative — structure detection won't override it */
  const feedExclusions = [
    'thirdpartyidsync', 'premiumdash', 'featureaccess',
    'typeaheadinsight', 'adstarget', 'onboarding', 'preference',
    'migration', 'tabcount', 'nudge', 'upsellslot',
    'featureflags', 'abtest',
  ];
  // 'badge' removed — catches legitimate 'badging' notifications endpoint
  // 'setting' removed — catches legitimate voyagerMessagingDashMessagingSettings

  /**
   * Categorize a request by its URL
   * @param url - The request URL
   * @returns The category string
   */
  function categorizeByUrl(url: string): Category | null {
    if (!url) return null;
    const urlStr = String(url).toLowerCase();

    // Try queryId matching FIRST — most precise categorization
    const queryId = extractQueryId(url);
    if (queryId) {
      for (const [cat, patterns] of Object.entries(graphqlCategories)) {
        if (patterns.some(p => queryId.toLowerCase().includes(p.toLowerCase()))) {
          return cat as Category;
        }
      }
    }

    // Check exclusions AFTER queryId — prevents false positives for endpoints
    // like voyagerMessagingDashSettings that contain excluded words but have valid queryIds
    // Returns 'excluded' (not 'other') so categorize() knows NOT to try structure detection
    if (feedExclusions.some(ex => urlStr.includes(ex))) {
      return 'excluded';
    }

    // More specific URL-based fallback (not just "includes feed")
    if (urlStr.includes('/feed/updates') || urlStr.includes('/feeddashmain')) return 'feed';
    if (urlStr.includes('/identity/') && urlStr.includes('/posts')) return 'myPosts';
    if (urlStr.includes('/shares') || urlStr.includes('/activities') || urlStr.includes('/activity')) return 'myPosts';
    if (urlStr.includes('profileupdates') || urlStr.includes('memberactivity') || urlStr.includes('recent-activity')) return 'myPosts';
    if (urlStr.includes('/messaging') || urlStr.includes('/messenger')) return 'messaging';
    if (urlStr.includes('/identity/') || urlStr.includes('/profile')) return 'profile';
    if (urlStr.includes('/relationship') || urlStr.includes('/connection')) return 'network';
    if (urlStr.includes('/analytics') || urlStr.includes('/wvmp')) return 'analytics';
    if (urlStr.includes('/notification') || urlStr.includes('/badging')) return 'notifications';
    if (urlStr.includes('/organization') || urlStr.includes('/compan')) return 'company';
    if (urlStr.includes('/launchpad') || urlStr.includes('/growth/')) return 'analytics';
    if (urlStr.includes('/publishing/') || urlStr.includes('/articles')) return 'myPosts';
    return 'other';
  }

  // ============================================
  // STRUCTURE-BASED CATEGORIZATION
  // ============================================

  /**
   * Categorize API response data by examining its structure
   * @param data - The parsed JSON response data
   * @returns The detected category or null
   */
  function categorizeByStructure(data: unknown): Category | null {
    if (!data || typeof data !== 'object') return null;
    const obj = data as Record<string, unknown>;

    // Check for GraphQL response structures in data.data
    // Use pattern matching on key names (resilient to LinkedIn renaming the "By..." suffix)
    if (obj.data && typeof obj.data === 'object') {
      const dataKeys = Object.keys(obj.data as Record<string, unknown>);
      for (const key of dataKeys) {
        const kl = key.toLowerCase();
        if (kl.includes('feeddashmain') || kl.includes('recommendedfeed')) return 'feed';
        if (kl.includes('profileupdate') || kl.includes('memberactivity') ||
            kl.includes('activityfeed') || kl.includes('profileposts') ||
            kl.includes('profilecontentcollection') || kl.includes('membersharefeed')) return 'myPosts';
        if (kl.includes('messengerconversation') || kl.includes('mailboxcount') ||
            kl.includes('messengermailbox')) return 'messaging';
        if (kl.includes('socialdashreplies') || kl.includes('socialdashcomment')) return 'comments';
      }
    }

    // Check included array — but be stricter about what counts as "feed"
    if (Array.isArray(obj.included) && obj.included.length > 0) {
      const types = new Set<string>();
      let hasPostContent = false;
      for (const item of (obj.included as Record<string, unknown>[]).slice(0, 30)) {
        const t = ((item._type || item.$type) as string || '').toLowerCase();
        // Count as feed if the type indicates post/activity content
        // 'updatev2' catches com.linkedin.voyager.feed.render.UpdateV2
        if (t.includes('activity') || t.includes('shareupdate') || t.includes('ugcpost') ||
            t.endsWith('updatev2') || t.endsWith('feedupdate')) {
          types.add('feed');
        }
        if (t.includes('message') || t.includes('conversation')) types.add('messaging');
        if (t.includes('comment')) types.add('comments');
        if (t.includes('connection') || t.includes('invitation')) types.add('network');
        // Skip miniprofile/memberrelationship as too generic
        if (!t.includes('miniprofile') && !t.includes('memberrelationship')) {
          if (t.includes('profile') || t.includes('member')) types.add('profile');
        }

        // Check for actual post content fields (both direct and URN reference *-prefixed format)
        if (item.commentary || item.resharedUpdate || item.socialDetail ||
            item['*commentary'] || item['*resharedUpdate'] || item['*socialDetail']) {
          hasPostContent = true;
        }
      }

      if (hasPostContent || types.has('feed')) return 'feed';
      if (types.has('messaging')) return 'messaging';
      if (types.has('comments')) return 'comments';
      if (types.has('profile')) return 'profile';
      if (types.has('network')) return 'network';
    }

    // Check elements array for post-like structures
    if (Array.isArray(obj.elements) && obj.elements.length > 0) {
      const first = obj.elements[0] as Record<string, unknown> | undefined;
      if (first) {
        if (first.actor || first.commentary || first.socialDetail ||
            first['*actor'] || first['*commentary'] || first['*socialDetail']) return 'feed';
        if (first.conversationParticipants || first.messages) return 'messaging';
        if (first.firstName || first.lastName || first.headline) return 'profile';
      }
    }

    return null;
  }

  /**
   * Categorize a request using URL first, then structure fallback
   * @param url - The request URL
   * @param data - The parsed response data
   * @returns The determined category
   */
  function categorize(url: string, data: unknown): string {
    const urlCategory = categorizeByUrl(url);

    // 'excluded' means feedExclusions matched — this is authoritative, skip structure detection
    if (urlCategory === 'excluded') return 'other';

    // If URL gave a real category (not 'other'), use it
    if (urlCategory && urlCategory !== 'other') return urlCategory;

    // Fall back to structure-based only when URL-based returned null or 'other'
    const structureCategory = categorizeByStructure(data);
    if (structureCategory) return structureCategory;

    return urlCategory || 'other';
  }

  /**
   * Extract pathname from a URL
   * @param url - The URL to parse
   * @returns The pathname string
   */
  function getPathname(url: string): string {
    try {
      return new URL(url, window.location.origin).pathname;
    } catch {
      return String(url || 'unknown');
    }
  }

  // ============================================
  // DEDUPLICATION
  // ============================================

  const recentDispatches = new Map<number, number>();
  const DISPATCH_DEDUP_WINDOW = 500;

  /**
   * Create a simple hash from data for deduplication
   * @param data - The data to hash
   * @returns A numeric hash
   */
  function hashData(data: unknown): number {
    try {
      const str = JSON.stringify(data).substring(0, 500);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return hash;
    } catch {
      return Math.random();
    }
  }

  /**
   * Check if data should be dispatched (not a recent duplicate)
   * @param data - The data to check
   * @returns Whether to dispatch
   */
  function shouldDispatch(data: unknown): boolean {
    const hash = hashData(data);
    const now = Date.now();

    for (const [h, t] of recentDispatches) {
      if (now - t > DISPATCH_DEDUP_WINDOW) recentDispatches.delete(h);
    }

    if (recentDispatches.has(hash)) {
      return false;
    }

    recentDispatches.set(hash, now);
    return true;
  }

  // ============================================
  // EVENT DISPATCH
  // ============================================

  /**
   * Dispatch captured data as a CustomEvent
   * @param payload - The captured data payload
   */
  function dispatch(payload: DispatchPayload): void {
    if (!shouldDispatch(payload.data)) {
      console.log('[CL:INTERCEPT] Deduped:', payload.category, payload.type);
      return;
    }

    try {
      const d = payload.data as Record<string, unknown> | null;
      const shape = d ? {
        keys: Object.keys(d).slice(0, 8).join(','),
        hasIncluded: Array.isArray((d as Record<string, unknown>).included) ? ((d as Record<string, unknown>).included as unknown[]).length : false,
        hasElements: Array.isArray((d as Record<string, unknown>).elements) ? ((d as Record<string, unknown>).elements as unknown[]).length : false,
        hasData: (d as Record<string, unknown>).data ? Object.keys((d as Record<string, unknown>).data as Record<string, unknown>).slice(0, 3).join(',') : false,
        size: JSON.stringify(d).length,
      } : null;

      // Use postMessage instead of CustomEvent — detail doesn't cross MAIN→ISOLATED world boundary
      window.postMessage({ type: '__CL_API_CAPTURED__', payload }, '*');
      console.log(`[CL:INTERCEPT] >>> DISPATCHED category=${payload.category} type=${payload.type} queryId=${payload.queryId || 'none'} endpoint=${payload.endpoint?.substring(0, 50)}`);
      console.log(`[CL:INTERCEPT]     shape:`, shape);
    } catch (e) {
      console.error('[CL:INTERCEPT] Error dispatching:', e);
    }
  }

  // ============================================
  // FETCH INTERCEPTOR
  // ============================================

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = input instanceof Request ? input.url : String(input);
    const method = init?.method || (input instanceof Request ? input.method : 'GET');

    // Silently block chrome-extension://invalid/ URLs (LinkedIn extension detection spam)
    if (url === 'chrome-extension://invalid/' || url.startsWith('chrome-extension://invalid')) {
      return new Response('', { status: 200, statusText: 'OK' });
    }

    // Pass through other non-HTTP URLs (data:, blob:, etc.)
    if (!url.startsWith('http')) {
      if (url.startsWith('chrome-extension://')) {
        return new Response('', { status: 200, statusText: 'OK' });
      }
      return _originalFetch.apply(this, arguments as unknown as Parameters<typeof fetch>);
    }

    // Track URL
    trackVoyagerUrl(url);

    // Call original fetch
    const response = await _originalFetch.apply(this, arguments as unknown as Parameters<typeof fetch>);

    // Capture if it's a LinkedIn API call
    if (shouldCapture(url)) {
      try {
        const clone = response.clone();
        const contentType = clone.headers.get('content-type') || '';

        if (contentType.includes('application/json') || contentType.includes('application/vnd.linkedin')) {
          clone.json().then((data: unknown) => {
            if (data) {
              const category = categorize(url, data);
              const queryId = extractQueryId(url);

              dispatch({
                type: 'fetch',
                url,
                endpoint: getPathname(url),
                method,
                category,
                queryId,
                isGraphQL: url.includes('/graphql'),
                data,
                timestamp: Date.now()
              });
            }
          }).catch(() => { /* Silent fail */ });
        }
      } catch {
        // Silent fail
      }
    }

    return response;
  };

  // Preserve fetch properties
  Object.keys(_originalFetch).forEach(key => {
    try {
      (window.fetch as Record<string, unknown>)[key] =
        (_originalFetch as unknown as Record<string, unknown>)[key];
    } catch { /* ignore */ }
  });

  window.__linkedInFetchInterceptor = window.fetch;

  // ============================================
  // XMLHTTPREQUEST INTERCEPTOR
  // ============================================

  XMLHttpRequest.prototype.open = function (
    method: string, url: string | URL, ...rest: unknown[]
  ): void {
    (this as XMLHttpRequest & { _interceptData: { method: string; url: string } })._interceptData = {
      method,
      url: String(url)
    };
    trackVoyagerUrl(String(url));
    return _originalXHROpen.apply(this, [method, url, ...rest] as unknown as Parameters<typeof _originalXHROpen>);
  };

  XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null): void {
    const xhr = this as XMLHttpRequest & { _interceptData?: { method: string; url: string } };
    const data = xhr._interceptData;

    if (data && shouldCapture(data.url)) {
      xhr.addEventListener('load', function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const ct = xhr.getResponseHeader('content-type') || '';
            if (ct.includes('application/json') || ct.includes('application/vnd.linkedin')) {
              const json = _originalJSONParse(xhr.responseText);
              if (json) {
                const category = categorize(data.url, json);
                const queryId = extractQueryId(data.url);

                dispatch({
                  type: 'xhr',
                  url: data.url,
                  endpoint: getPathname(data.url),
                  method: data.method,
                  category,
                  queryId,
                  isGraphQL: data.url.includes('/graphql'),
                  data: json,
                  timestamp: Date.now()
                });
              }
            }
          } catch {
            // Silent fail
          }
        }
      });
    }

    return _originalXHRSend.apply(this, arguments as unknown as Parameters<typeof _originalXHRSend>);
  };

  // ============================================
  // RESPONSE.JSON() INTERCEPTOR
  // ============================================

  Response.prototype.json = async function (): Promise<unknown> {
    const url = this.url || '';
    const result = await _originalResponseJson.apply(this, arguments as unknown as Parameters<typeof _originalResponseJson>);

    if (result && (shouldCapture(url) || categorizeByStructure(result))) {
      try {
        const category = categorize(url, result);
        const queryId = extractQueryId(url);

        dispatch({
          type: 'response-json',
          url: url || getRecentVoyagerUrl() || 'unknown',
          endpoint: getPathname(url),
          method: 'GET',
          category,
          queryId,
          isGraphQL: url.includes('/graphql'),
          data: result,
          timestamp: Date.now()
        });
      } catch {
        // Silent fail
      }
    }

    return result;
  };

  console.log('[MainWorldInterceptor] Response.json interceptor installed');

  // ============================================
  // RESPONSE.TEXT() INTERCEPTOR
  // ============================================

  Response.prototype.text = async function (): Promise<string> {
    const url = this.url || '';
    const result = await _originalResponseText.apply(this, arguments as unknown as Parameters<typeof _originalResponseText>);

    if (url && shouldCapture(url)) {
      try {
        const jsonData = _originalJSONParse(result);
        if (jsonData && typeof jsonData === 'object') {
          const category = categorize(url, jsonData);
          const queryId = extractQueryId(url);

          dispatch({
            type: 'response-text',
            url,
            endpoint: getPathname(url),
            method: 'GET',
            category,
            queryId,
            isGraphQL: url.includes('/graphql'),
            data: jsonData,
            timestamp: Date.now()
          });
        }
      } catch {
        // Not JSON or parse error — that's fine
      }
    } else if (result && result.length > 200 && (result[0] === '{' || result[0] === '[')) {
      // No voyager URL — try structure detection on potential JSON (like Response.json does)
      try {
        const jsonData = _originalJSONParse(result);
        if (jsonData && typeof jsonData === 'object') {
          const structCat = categorizeByStructure(jsonData);
          if (structCat) {
            const recentUrl = getRecentVoyagerUrl();
            const category = recentUrl ? categorize(recentUrl, jsonData) : structCat;

            dispatch({
              type: 'response-text',
              url: recentUrl || 'structure-detected',
              endpoint: recentUrl ? getPathname(recentUrl) : '/unknown',
              method: 'GET',
              category,
              queryId: recentUrl ? extractQueryId(recentUrl) : null,
              isGraphQL: recentUrl ? recentUrl.includes('/graphql') : false,
              data: jsonData,
              timestamp: Date.now()
            });
          }
        }
      } catch {
        // Not JSON — fine
      }
    }

    return result;
  };

  console.log('[MainWorldInterceptor] Response.text interceptor installed');

  // ============================================
  // JSON.PARSE INTERCEPTOR (ULTIMATE FALLBACK)
  // ============================================

  JSON.parse = function (text: string, reviver?: (key: string, value: unknown) => unknown): unknown {
    const result = _originalJSONParse.apply(this, arguments as unknown as Parameters<typeof _originalJSONParse>);

    if (result && typeof result === 'object') {
      try {
        const structureCategory = categorizeByStructure(result);

        if (structureCategory) {
          const url = getRecentVoyagerUrl();
          const category = url ? categorize(url, result) : structureCategory;
          const queryId = url ? extractQueryId(url) : null;

          dispatch({
            type: 'json-parse',
            url: url || 'structure-detected',
            endpoint: url ? getPathname(url) : '/unknown',
            method: 'GET',
            category,
            queryId,
            isGraphQL: url ? url.includes('/graphql') : false,
            data: result,
            timestamp: Date.now()
          });

          console.log('[MainWorldInterceptor] JSON.parse captured by structure:', category);
        }
      } catch {
        // Silent fail
      }
    }

    return result;
  };

  console.log('[MainWorldInterceptor] JSON.parse interceptor installed');

  // ============================================
  // RESPONSE.ARRAYBUFFER() INTERCEPTOR
  // ============================================

  const _originalResponseArrayBuffer = Response.prototype.arrayBuffer;

  Response.prototype.arrayBuffer = async function (): Promise<ArrayBuffer> {
    const url = this.url || '';
    const result = await _originalResponseArrayBuffer.apply(
      this, arguments as unknown as Parameters<typeof _originalResponseArrayBuffer>
    );

    try {
      if (shouldCapture(url) || (!url && result.byteLength > 500 && result.byteLength < 5_000_000)) {
        const bytes = new Uint8Array(result);
        if (bytes[0] === 0x7B || bytes[0] === 0x5B) { // { or [
          const text = new TextDecoder().decode(result);
          const jsonData = _originalJSONParse(text) as Record<string, unknown>;
          if (jsonData && typeof jsonData === 'object') {
            const structCat = categorizeByStructure(jsonData);
            if (shouldCapture(url) || structCat) {
              const resolvedUrl = url || getRecentVoyagerUrl();
              const category = resolvedUrl ? categorize(resolvedUrl, jsonData) : structCat;
              if (category && category !== 'other') {
                dispatch({
                  type: 'response-arraybuffer',
                  url: resolvedUrl || 'structure-detected',
                  endpoint: resolvedUrl ? getPathname(resolvedUrl) : '/unknown',
                  method: 'GET',
                  category: category as string,
                  queryId: resolvedUrl ? extractQueryId(resolvedUrl) : null,
                  isGraphQL: resolvedUrl ? resolvedUrl.includes('/graphql') : false,
                  data: jsonData,
                  timestamp: Date.now()
                });
              }
            }
          }
        }
      }
    } catch {
      // Silent fail
    }

    return result;
  };

  console.log('[MainWorldInterceptor] Response.arrayBuffer interceptor installed');

  // ============================================
  // WEB WORKER MESSAGE INTERCEPTOR
  // ============================================
  // LinkedIn may process API responses inside Web Workers.
  // Workers have their own fetch/JSON.parse — invisible to main-world overrides.
  // Intercept Worker construction to capture data flowing back via postMessage.

  const _OrigWorker = window.Worker;

  window.Worker = function (
    this: Worker,
    scriptURL: string | URL,
    options?: WorkerOptions
  ): Worker {
    const worker = new _OrigWorker(scriptURL, options);

    worker.addEventListener('message', function (event: MessageEvent) {
      try {
        const msgData = event.data;
        if (!msgData || typeof msgData !== 'object') return;

        // The Worker might wrap the API response in an envelope
        const candidates = [msgData, msgData.data, msgData.result, msgData.response, msgData.payload];
        for (const candidate of candidates) {
          if (!candidate || typeof candidate !== 'object') continue;
          const structCat = categorizeByStructure(candidate);
          if (structCat) {
            const url = getRecentVoyagerUrl();
            const category = url ? categorize(url, candidate) : structCat;

            dispatch({
              type: 'worker-message',
              url: url || 'worker-detected',
              endpoint: url ? getPathname(url) : '/unknown',
              method: 'GET',
              category: category as string,
              queryId: url ? extractQueryId(url) : null,
              isGraphQL: url ? url.includes('/graphql') : false,
              data: candidate,
              timestamp: Date.now()
            });
            break; // Only dispatch the first match per message
          }
        }
      } catch {
        // Silent fail
      }
    });

    return worker;
  } as unknown as typeof Worker;

  // Preserve Worker static properties and prototype
  Object.keys(_OrigWorker).forEach(k => {
    try {
      (window.Worker as unknown as Record<string, unknown>)[k] =
        (_OrigWorker as unknown as Record<string, unknown>)[k];
    } catch { /* ignore */ }
  });
  window.Worker.prototype = _OrigWorker.prototype;

  console.log('[MainWorldInterceptor] Worker message interceptor installed');

  // ============================================
  // READABLE STREAM INTERCEPTOR (PAGINATION)
  // ============================================
  // LinkedIn may consume pagination responses via ReadableStream.getReader()
  // instead of Response.json(). This bypasses all Response method overrides.
  // Intercept getReader() to collect streamed chunks, then parse when done.

  const _origGetReader = ReadableStream.prototype.getReader;

  ReadableStream.prototype.getReader = function (
    ...args: Parameters<typeof ReadableStream.prototype.getReader>
  ): ReadableStreamDefaultReader {
    const reader = _origGetReader.apply(this, args) as ReadableStreamDefaultReader<Uint8Array>;
    const _origRead = reader.read.bind(reader);
    const chunks: Uint8Array[] = [];
    let totalSize = 0;

    reader.read = async function (): Promise<ReadableStreamReadResult<Uint8Array>> {
      const result = await _origRead();

      if (result.value) {
        chunks.push(result.value);
        totalSize += result.value.byteLength;
      }

      if (result.done && chunks.length > 0 && totalSize > 500 && totalSize < 5_000_000) {
        // Stream complete — try to parse as JSON
        try {
          const merged = new Uint8Array(totalSize);
          let offset = 0;
          for (const chunk of chunks) {
            merged.set(chunk, offset);
            offset += chunk.byteLength;
          }
          // Check if starts with { or [
          if (merged[0] === 0x7B || merged[0] === 0x5B) {
            const text = new TextDecoder().decode(merged);
            const json = _originalJSONParse(text);
            if (json && typeof json === 'object') {
              const structCat = categorizeByStructure(json);
              if (structCat) {
                const url = getRecentVoyagerUrl();
                const category = url ? categorize(url, json) : structCat;
                if (category && category !== 'other') {
                  dispatch({
                    type: 'stream-reader',
                    url: url || 'stream-detected',
                    endpoint: url ? getPathname(url) : '/unknown',
                    method: 'GET',
                    category: category as string,
                    queryId: url ? extractQueryId(url) : null,
                    isGraphQL: url ? url.includes('/graphql') : false,
                    data: json,
                    timestamp: Date.now()
                  });
                  console.log(`[MainWorldInterceptor] Stream captured: category=${category} size=${totalSize}`);
                }
              }
            }
          }
        } catch {
          // Silent fail
        }
      }

      return result;
    } as typeof reader.read;

    return reader;
  } as typeof ReadableStream.prototype.getReader;

  console.log('[MainWorldInterceptor] ReadableStream interceptor installed');

  // ============================================
  // FETCH RESPONSE BODY TEE (PAGINATION FALLBACK)
  // ============================================
  // Additional approach: For voyager API responses where the body might be consumed
  // via streaming, tee the response body so we can read it independently.
  // This modifies the fetch interceptor to handle all voyager responses aggressively.

  // Enhance the existing fetch interceptor by also handling non-JSON content types
  // (LinkedIn may return 'text/plain' or no content-type for pagination)
  const _enhancedFetch = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const response = await _enhancedFetch.apply(this, arguments as unknown as Parameters<typeof fetch>);
    const url = input instanceof Request ? input.url : String(input);

    // For voyager API calls, tee the body so streaming reads can also be captured
    if (shouldCapture(url) && response.body) {
      try {
        const ct = response.headers.get('content-type') || '';
        // Only tee for content types our original fetch interceptor didn't already handle
        const alreadyHandled = ct.includes('application/json') || ct.includes('application/vnd.linkedin');
        if (!alreadyHandled) {
          const [bodyForCaller, bodyForCapture] = response.body.tee();
          // Read the capture copy asynchronously
          const captureReader = bodyForCapture.getReader();
          const captureChunks: Uint8Array[] = [];
          let captureSize = 0;

          (async () => {
            try {
              // eslint-disable-next-line no-constant-condition
              while (true) {
                const { value, done } = await captureReader.read();
                if (value) {
                  captureChunks.push(value);
                  captureSize += value.byteLength;
                }
                if (done) break;
                if (captureSize > 5_000_000) break; // Safety limit
              }
              if (captureSize > 200 && captureChunks.length > 0) {
                const merged = new Uint8Array(captureSize);
                let off = 0;
                for (const c of captureChunks) { merged.set(c, off); off += c.byteLength; }
                if (merged[0] === 0x7B || merged[0] === 0x5B) {
                  const text = new TextDecoder().decode(merged);
                  const json = _originalJSONParse(text);
                  if (json && typeof json === 'object') {
                    const cat = categorize(url, json);
                    if (cat && cat !== 'other') {
                      dispatch({
                        type: 'fetch-tee',
                        url,
                        endpoint: getPathname(url),
                        method: init?.method || 'GET',
                        category: cat,
                        queryId: extractQueryId(url),
                        isGraphQL: url.includes('/graphql'),
                        data: json,
                        timestamp: Date.now()
                      });
                    }
                  }
                }
              }
            } catch { /* silent */ }
          })();

          // Return response with the caller's copy of the body
          return new Response(bodyForCaller, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }
      } catch {
        // If tee fails, return original response
      }
    }

    return response;
  };

  // Preserve fetch properties on enhanced version
  Object.keys(_enhancedFetch).forEach(key => {
    try {
      (window.fetch as Record<string, unknown>)[key] =
        (_enhancedFetch as unknown as Record<string, unknown>)[key];
    } catch { /* ignore */ }
  });

  console.log('[MainWorldInterceptor] Fetch body tee interceptor installed');

  // ============================================
  // INITIALIZATION COMPLETE
  // ============================================

  console.log('[MainWorldInterceptor] v3.4 All interceptors installed successfully (8 interceptors + fetch-tee)');

  document.dispatchEvent(new CustomEvent('linkedin-main-interceptor-ready', {
    detail: { version: '3.4.0' }
  }));

})();
