/**
 * LinkedIn Data Extractor - Main World Interceptor v3.0
 *
 * This script runs in the MAIN world at document_start, ensuring it executes
 * before LinkedIn's code can cache references to fetch/XHR.
 *
 * FIXES in v3.0:
 * - Added Response.text() interceptor (LinkedIn uses text() + JSON.parse())
 * - Smart JSON.parse that detects data by STRUCTURE, not just URL
 * - PerformanceObserver for URL tracking (can't be bypassed by cached fetch)
 * - Structure-based categorization when URL is unknown
 */

(function() {
  'use strict';

  // Prevent double initialization
  if (window.__linkedInMainWorldInterceptorLoaded) return;
  window.__linkedInMainWorldInterceptorLoaded = true;

  console.log('[MainWorldInterceptor] v3.0 Initializing at document_start...');

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
  // This can't be bypassed even if LinkedIn caches fetch!

  const recentVoyagerUrls = new Map(); // url -> timestamp
  const MAX_URL_AGE = 10000; // 10 seconds

  function trackVoyagerUrl(url) {
    if (url && url.includes('/voyager/')) {
      recentVoyagerUrls.set(url, Date.now());
      // Clean old entries
      const now = Date.now();
      for (const [u, t] of recentVoyagerUrls) {
        if (now - t > MAX_URL_AGE) recentVoyagerUrls.delete(u);
      }
    }
  }

  function getRecentVoyagerUrl() {
    const now = Date.now();
    let bestUrl = null;
    let bestTime = 0;
    for (const [url, time] of recentVoyagerUrls) {
      if (now - time < MAX_URL_AGE && time > bestTime) {
        bestUrl = url;
        bestTime = time;
      }
    }
    return bestUrl;
  }

  // Use PerformanceObserver to track ALL network requests (can't be bypassed!)
  try {
    const perfObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
          trackVoyagerUrl(entry.name);
        }
      }
    });
    perfObserver.observe({ entryTypes: ['resource'] });
    console.log('[MainWorldInterceptor] PerformanceObserver installed for URL tracking');
  } catch (e) {
    console.warn('[MainWorldInterceptor] PerformanceObserver not available:', e.message);
  }

  // ============================================
  // CONFIGURATION
  // ============================================

  const capturePatterns = ['/voyager/api/', '/voyagerMessagingGraphQL/', '/li/track'];

  function shouldCapture(url) {
    return capturePatterns.some(p => String(url).includes(p));
  }

  // GraphQL queryId patterns for categorization
  // Derived from LinkedIn Voyager API Reference — covers all known endpoint prefixes
  const graphqlCategories = {
    feed: ['voyagerFeedDashMainFeed', 'voyagerFeedDashFeedUpdate', 'voyagerFeedDashRecommendedFeed',
           'voyagerFeedDashUpdateV2', 'voyagerSocialDashUpdate', 'voyagerFeedDashIdentityModule',
           'voyagerFeedDashTopics', 'voyagerFeedDashPackageRecommendations'],
    myPosts: ['voyagerFeedDashProfileUpdates', 'voyagerFeedDashMemberActivityFeed',
              'voyagerFeedDashActivityFeed', 'voyagerFeedDashShareUpdate',
              'voyagerIdentityDashProfilePosts', 'voyagerFeedDashProfileActivityFeed',
              'voyagerIdentityDashProfileContentCollections'],
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

  function extractQueryId(url) {
    if (!url) return null;
    const match = String(url).match(/queryId=([a-zA-Z0-9]+)/);
    return match ? match[1] : null;
  }

  // Non-post endpoints — these are known junk that should NEVER be categorized as real data
  // IMPORTANT: categorize() treats 'excluded' as authoritative — structure detection won't override it
  const feedExclusions = [
    'thirdpartyidsync', 'premiumdash', 'featureaccess',
    'typeaheadinsight', 'adstarget', 'onboarding', 'preference',
    'migration', 'tabcount', 'nudge', 'upsellslot',
    'featureflags', 'abtest',
  ];

  // Words that appear in exclusion-like URLs but also in legitimate ones
  // 'badge' removed — catches legitimate 'badging' notifications endpoint
  // 'setting' removed — catches legitimate voyagerMessagingDashMessagingSettings

  function categorizeByUrl(url) {
    if (!url) return null;
    const urlStr = String(url).toLowerCase();

    // Try queryId matching FIRST — most precise categorization
    const queryId = extractQueryId(url);
    if (queryId) {
      for (const [cat, patterns] of Object.entries(graphqlCategories)) {
        if (patterns.some(p => queryId.toLowerCase().includes(p.toLowerCase()))) {
          return cat;
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
  // STRUCTURE-BASED CATEGORIZATION (NEW!)
  // ============================================
  // Detect data type by examining the actual structure

  function categorizeByStructure(data) {
    if (!data || typeof data !== 'object') return null;

    // Check for GraphQL response structures in data.data
    // Use pattern matching on key names (resilient to LinkedIn renaming the "By..." suffix)
    if (data.data && typeof data.data === 'object') {
      const dataKeys = Object.keys(data.data);
      for (const key of dataKeys) {
        const kl = key.toLowerCase();
        if (kl.includes('feeddashmain') || kl.includes('recommendedfeed')) return 'feed';
        if (kl.includes('profileupdate') || kl.includes('memberactivity') ||
            kl.includes('activityfeed') || kl.includes('profileposts') ||
            kl.includes('profilecontentcollection')) return 'myPosts';
        if (kl.includes('messengerconversation') || kl.includes('mailboxcount') ||
            kl.includes('messengermailbox')) return 'messaging';
        if (kl.includes('socialdashreplies') || kl.includes('socialdashcomment')) return 'comments';
      }
    }

    // Check included array — but be stricter about what counts as "feed"
    if (Array.isArray(data.included) && data.included.length > 0) {
      const types = new Set();
      let hasPostContent = false;
      for (const item of data.included.slice(0, 30)) {
        const t = ((item._type || item.$type) || '').toLowerCase();
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

    // Check elements array
    if (Array.isArray(data.elements) && data.elements.length > 0) {
      const first = data.elements[0];
      if (first) {
        if (first.actor || first.commentary || first.socialDetail ||
            first['*actor'] || first['*commentary'] || first['*socialDetail']) return 'feed';
        if (first.conversationParticipants || first.messages) return 'messaging';
        if (first.firstName || first.lastName || first.headline) return 'profile';
      }
    }

    return null;
  }

  function categorize(url, data) {
    // Try URL-based first
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

  function getPathname(url) {
    try {
      return new URL(url, window.location.origin).pathname;
    } catch (e) {
      return String(url || 'unknown');
    }
  }

  // ============================================
  // DEDUPLICATION
  // ============================================

  const recentDispatches = new Map(); // hash -> timestamp
  const DISPATCH_DEDUP_WINDOW = 500; // 500ms - reduced from 2000ms to capture more data

  function hashData(data) {
    try {
      // Create a simple hash from data structure
      const str = JSON.stringify(data).substring(0, 500);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
      }
      return hash;
    } catch (e) {
      return Math.random();
    }
  }

  function shouldDispatch(data) {
    const hash = hashData(data);
    const now = Date.now();

    // Clean old entries
    for (const [h, t] of recentDispatches) {
      if (now - t > DISPATCH_DEDUP_WINDOW) recentDispatches.delete(h);
    }

    if (recentDispatches.has(hash)) {
      return false; // Duplicate
    }

    recentDispatches.set(hash, now);
    return true;
  }

  // ============================================
  // EVENT DISPATCH
  // ============================================

  function dispatch(data) {
    // Deduplicate
    if (!shouldDispatch(data.data)) {
      console.log('[CL:INTERCEPT] Deduped:', data.category, data.type);
      return;
    }

    try {
      // Compute data shape for debugging
      const d = data.data;
      const shape = d ? {
        keys: Object.keys(d).slice(0, 8).join(','),
        hasIncluded: Array.isArray(d.included) ? d.included.length : false,
        hasElements: Array.isArray(d.elements) ? d.elements.length : false,
        hasData: d.data ? Object.keys(d.data).slice(0, 3).join(',') : false,
        size: JSON.stringify(d).length,
      } : null;

      // Use postMessage instead of CustomEvent — detail doesn't cross MAIN→ISOLATED world boundary
      window.postMessage({ type: '__CL_API_CAPTURED__', payload: data }, '*');
      console.log(`[CL:INTERCEPT] >>> DISPATCHED category=${data.category} type=${data.type} queryId=${data.queryId || 'none'} endpoint=${data.endpoint?.substring(0, 50)}`);
      console.log(`[CL:INTERCEPT]     shape:`, shape);
    } catch (e) {
      console.error('[CL:INTERCEPT] Error dispatching:', e);
    }
  }

  // ============================================
  // FETCH INTERCEPTOR
  // ============================================

  window.fetch = async function(input, init) {
    const url = input instanceof Request ? input.url : String(input);
    const method = init?.method || (input instanceof Request ? input.method : 'GET');

    // Silently block chrome-extension://invalid/ URLs (LinkedIn extension detection spam)
    if (url === 'chrome-extension://invalid/' || url.startsWith('chrome-extension://invalid')) {
      return new Response('', { status: 200, statusText: 'OK' });
    }

    // Pass through other non-HTTP URLs (data:, blob:, etc.) without our interceptor processing
    if (!url.startsWith('http')) {
      if (url.startsWith('chrome-extension://')) {
        return new Response('', { status: 200, statusText: 'OK' });
      }
      return _originalFetch.apply(this, arguments);
    }

    // Track URL
    trackVoyagerUrl(url);

    // Call original fetch
    const response = await _originalFetch.apply(this, arguments);

    // Capture if it's a LinkedIn API call
    if (shouldCapture(url)) {
      try {
        const clone = response.clone();
        const contentType = clone.headers.get('content-type') || '';

        if (contentType.includes('application/json') || contentType.includes('application/vnd.linkedin')) {
          clone.json().then(data => {
            if (data) {
              const category = categorize(url, data);
              const queryId = extractQueryId(url);

              dispatch({
                type: 'fetch',
                url: url,
                endpoint: getPathname(url),
                method: method,
                category: category,
                queryId: queryId,
                isGraphQL: url.includes('/graphql'),
                data: data,
                timestamp: Date.now()
              });
            }
          }).catch(() => {});
        }
      } catch (e) {
        // Silent fail
      }
    }

    return response;
  };

  // Preserve fetch properties
  Object.keys(_originalFetch).forEach(key => {
    try { window.fetch[key] = _originalFetch[key]; } catch (e) {}
  });

  window.__linkedInFetchInterceptor = window.fetch;

  // ============================================
  // XMLHTTPREQUEST INTERCEPTOR
  // ============================================

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._interceptData = { method, url };
    trackVoyagerUrl(url);
    return _originalXHROpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(body) {
    const xhr = this;
    const data = this._interceptData;

    if (data && shouldCapture(data.url)) {
      xhr.addEventListener('load', function() {
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
                  category: category,
                  queryId: queryId,
                  isGraphQL: data.url.includes('/graphql'),
                  data: json,
                  timestamp: Date.now()
                });
              }
            }
          } catch (e) {
            // Silent fail
          }
        }
      });
    }

    return _originalXHRSend.apply(this, arguments);
  };

  // ============================================
  // RESPONSE.JSON() INTERCEPTOR
  // ============================================

  Response.prototype.json = async function() {
    const url = this.url || '';
    const result = await _originalResponseJson.apply(this, arguments);

    if (result && (shouldCapture(url) || categorizeByStructure(result))) {
      try {
        const category = categorize(url, result);
        const queryId = extractQueryId(url);

        dispatch({
          type: 'response-json',
          url: url || getRecentVoyagerUrl() || 'unknown',
          endpoint: getPathname(url),
          method: 'GET',
          category: category,
          queryId: queryId,
          isGraphQL: url.includes('/graphql'),
          data: result,
          timestamp: Date.now()
        });
      } catch (e) {
        // Silent fail
      }
    }

    return result;
  };

  console.log('[MainWorldInterceptor] Response.json interceptor installed');

  // ============================================
  // RESPONSE.TEXT() INTERCEPTOR (NEW!)
  // ============================================
  // LinkedIn often uses response.text() + JSON.parse() instead of response.json()

  Response.prototype.text = async function() {
    const url = this.url || '';
    const result = await _originalResponseText.apply(this, arguments);

    if (url && shouldCapture(url)) {
      try {
        const jsonData = _originalJSONParse(result);
        if (jsonData && typeof jsonData === 'object') {
          const category = categorize(url, jsonData);
          const queryId = extractQueryId(url);

          dispatch({
            type: 'response-text',
            url: url,
            endpoint: getPathname(url),
            method: 'GET',
            category: category,
            queryId: queryId,
            isGraphQL: url.includes('/graphql'),
            data: jsonData,
            timestamp: Date.now()
          });
        }
      } catch (e) {
        // Not JSON or parse error - that's fine
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
              category: category,
              queryId: recentUrl ? extractQueryId(recentUrl) : null,
              isGraphQL: recentUrl ? recentUrl.includes('/graphql') : false,
              data: jsonData,
              timestamp: Date.now()
            });
          }
        }
      } catch (e) {
        // Not JSON — fine
      }
    }

    return result;
  };

  console.log('[MainWorldInterceptor] Response.text interceptor installed');

  // ============================================
  // JSON.PARSE INTERCEPTOR (ULTIMATE FALLBACK)
  // ============================================
  // Catches ALL JSON parsing, even when URL tracking fails

  JSON.parse = function(text, reviver) {
    const result = _originalJSONParse.apply(this, arguments);

    // Only process objects that look like LinkedIn API responses
    if (result && typeof result === 'object') {
      try {
        const structureCategory = categorizeByStructure(result);

        // If we can identify it as LinkedIn data by structure
        if (structureCategory) {
          // Try to find a matching URL from recent requests
          const url = getRecentVoyagerUrl();
          const category = url ? categorize(url, result) : structureCategory;
          const queryId = url ? extractQueryId(url) : null;

          dispatch({
            type: 'json-parse',
            url: url || 'structure-detected',
            endpoint: url ? getPathname(url) : '/unknown',
            method: 'GET',
            category: category,
            queryId: queryId,
            isGraphQL: url ? url.includes('/graphql') : false,
            data: result,
            timestamp: Date.now()
          });

          console.log('[MainWorldInterceptor] JSON.parse captured by structure:', category);
        }
      } catch (e) {
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

  Response.prototype.arrayBuffer = async function() {
    const url = this.url || '';
    const result = await _originalResponseArrayBuffer.apply(this, arguments);

    try {
      if (shouldCapture(url) || (!url && result.byteLength > 500 && result.byteLength < 5000000)) {
        const bytes = new Uint8Array(result);
        if (bytes[0] === 0x7B || bytes[0] === 0x5B) { // { or [
          const text = new TextDecoder().decode(result);
          const jsonData = _originalJSONParse(text);
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
                  category: category,
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
    } catch (e) {
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

  window.Worker = function(scriptURL, options) {
    const worker = new _OrigWorker(scriptURL, options);

    worker.addEventListener('message', function(event) {
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
              category: category,
              queryId: url ? extractQueryId(url) : null,
              isGraphQL: url ? url.includes('/graphql') : false,
              data: candidate,
              timestamp: Date.now()
            });
            break; // Only dispatch the first match per message
          }
        }
      } catch (e) {
        // Silent fail
      }
    });

    return worker;
  };

  // Preserve Worker static properties and prototype
  Object.keys(_OrigWorker).forEach(function(k) {
    try { window.Worker[k] = _OrigWorker[k]; } catch(e) {}
  });
  window.Worker.prototype = _OrigWorker.prototype;

  console.log('[MainWorldInterceptor] Worker message interceptor installed');

  // ============================================
  // INITIALIZATION COMPLETE
  // ============================================

  console.log('[MainWorldInterceptor] v3.2 All interceptors installed successfully');

  document.dispatchEvent(new CustomEvent('linkedin-main-interceptor-ready', {
    detail: { version: '3.2.0' }
  }));

})();
