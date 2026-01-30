/**
 * LinkedIn Data Extractor - Main World Network Interceptor
 * TypeScript Version
 *
 * Runs in MAIN world to intercept network requests before LinkedIn's code.
 */

// ============================================
// CONSTANTS
// ============================================

const API_PATTERNS = {
  profile: /\/voyager\/api\/(me|identity\/profiles?|graphql.*profile)/i,
  analytics: /\/voyager\/api\/(analytics|graphql.*analytics)/i,
  connections: /\/voyager\/api\/(relationships|connections)/i,
  feed: /\/voyager\/api\/(feed|graphql.*feed)/i,
  posts: /\/voyager\/api\/(posts|activities|shares)/i,
  comments: /\/voyager\/api\/.*comments/i,
  myPosts: /\/voyager\/api\/identity\/.*\/posts/i,
  followers: /\/voyager\/api\/.*followers/i,
  trending: /\/voyager\/api\/(news|trending)/i,
  reactions: /\/voyager\/api\/.*reactions/i,
  messaging: /\/voyager\/api\/(messaging|conversations)/i,
  network: /\/voyager\/api\/.*network/i,
} as const;

// ============================================
// TYPE DEFINITIONS
// ============================================

interface CapturedApiData {
  endpoint: string;
  method: string;
  url: string;
  data: unknown;
  category: string;
  capturedAt: string;
}

type CategoryKey = keyof typeof API_PATTERNS;

// Declare global window extension
declare global {
  interface Window {
    __linkedInMainInterceptorLoaded?: boolean;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function categorizeEndpoint(url: string): string {
  for (const [category, pattern] of Object.entries(API_PATTERNS) as [CategoryKey, RegExp][]) {
    if (pattern.test(url)) {
      return category;
    }
  }
  return 'other';
}

function isLinkedInVoyagerApi(url: string): boolean {
  return url.includes('/voyager/api/') || url.includes('/graphql');
}

function dispatchCapturedData(data: CapturedApiData): void {
  const event = new CustomEvent('linkedin-api-captured', { detail: data });
  document.dispatchEvent(event);
}

// ============================================
// FETCH INTERCEPTOR
// ============================================

function interceptFetch(): void {
  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();

    // Call original fetch
    const response = await originalFetch.apply(this, [input, init]);

    // Check if this is a LinkedIn API call we want to capture
    if (isLinkedInVoyagerApi(url)) {
      try {
        // Clone response to read body without consuming it
        const clone = response.clone();
        const data = await clone.json();

        const category = categorizeEndpoint(url);
        const endpoint = new URL(url).pathname;

        const capturedData: CapturedApiData = {
          endpoint,
          method: init?.method || 'GET',
          url,
          data,
          category,
          capturedAt: new Date().toISOString(),
        };

        console.log('[MainInterceptor] Captured:', category, endpoint);
        dispatchCapturedData(capturedData);
      } catch (error) {
        // Silently ignore non-JSON responses
      }
    }

    return response;
  };

  console.log('[MainInterceptor] Fetch interceptor installed');
}

// ============================================
// XHR INTERCEPTOR
// ============================================

function interceptXHR(): void {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async: boolean = true,
    username?: string | null,
    password?: string | null
  ): void {
    // Store request info
    (this as XMLHttpRequest & { _interceptedUrl: string; _interceptedMethod: string })._interceptedUrl =
      typeof url === 'string' ? url : url.toString();
    (this as XMLHttpRequest & { _interceptedMethod: string })._interceptedMethod = method;

    return originalOpen.call(this, method, url, async, username, password);
  };

  XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null): void {
    const xhr = this as XMLHttpRequest & { _interceptedUrl: string; _interceptedMethod: string };

    if (xhr._interceptedUrl && isLinkedInVoyagerApi(xhr._interceptedUrl)) {
      this.addEventListener('load', function () {
        try {
          if (this.responseType === '' || this.responseType === 'text' || this.responseType === 'json') {
            const data = this.responseType === 'json' ? this.response : JSON.parse(this.responseText);

            const category = categorizeEndpoint(xhr._interceptedUrl);
            const endpoint = new URL(xhr._interceptedUrl, window.location.origin).pathname;

            const capturedData: CapturedApiData = {
              endpoint,
              method: xhr._interceptedMethod,
              url: xhr._interceptedUrl,
              data,
              category,
              capturedAt: new Date().toISOString(),
            };

            console.log('[MainInterceptor] XHR Captured:', category, endpoint);
            dispatchCapturedData(capturedData);
          }
        } catch (error) {
          // Silently ignore parse errors
        }
      });
    }

    return originalSend.call(this, body);
  };

  console.log('[MainInterceptor] XHR interceptor installed');
}

// ============================================
// RESPONSE.JSON INTERCEPTOR (BACKUP)
// ============================================

function interceptResponseJson(): void {
  const originalJson = Response.prototype.json;

  Response.prototype.json = async function (): Promise<unknown> {
    const data = await originalJson.call(this);

    // Check if this response is from LinkedIn API
    if (this.url && isLinkedInVoyagerApi(this.url)) {
      try {
        const category = categorizeEndpoint(this.url);
        const endpoint = new URL(this.url).pathname;

        const capturedData: CapturedApiData = {
          endpoint,
          method: 'RESPONSE',
          url: this.url,
          data,
          category,
          capturedAt: new Date().toISOString(),
        };

        const event = new CustomEvent('linkedin-response-json', { detail: capturedData });
        document.dispatchEvent(event);
      } catch (error) {
        // Silently ignore errors
      }
    }

    return data;
  };

  console.log('[MainInterceptor] Response.json interceptor installed');
}

// ============================================
// INITIALIZATION
// ============================================

(function () {
  'use strict';

  // Prevent double initialization
  if (window.__linkedInMainInterceptorLoaded) {
    console.log('[MainInterceptor] Already loaded, skipping');
    return;
  }
  window.__linkedInMainInterceptorLoaded = true;

  console.log('[MainInterceptor] Initializing network interceptors (TypeScript)...');

  // Install interceptors
  interceptFetch();
  interceptXHR();
  interceptResponseJson();

  // Dispatch ready event
  document.dispatchEvent(
    new CustomEvent('linkedin-main-interceptor-ready', {
      detail: { version: '4.0.0' },
    })
  );

  console.log('[MainInterceptor] All interceptors installed');
})();
