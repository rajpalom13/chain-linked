/**
 * LinkedIn Data Extractor - Content Script
 * TypeScript Version
 *
 * Main orchestrator for content scripts.
 * Enhanced with retry mechanism and validation.
 */

import type { ExtensionMessage } from '../shared/types';
import {
  sendMessageWithRetry,
  queueMessage,
  isExtensionContextValid,
  DEFAULT_RETRY_CONFIG,
} from '../shared/retry-utils';

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  autoCapture: true,
  debounceMs: 500,
  categories: ['profile', 'analytics', 'connections', 'feed', 'posts', 'comments', 'myPosts', 'followers', 'trending', 'reactions', 'messaging', 'network', 'other'],
  maxItemsPerCategory: 100,
} as const;

// ============================================
// TYPE DEFINITIONS
// ============================================

interface CapturedData {
  profile: unknown;
  analytics: unknown;
  connections: unknown[];
  feed: unknown[];
  apiResponses: unknown[];
  postAnalytics?: unknown[];
  audienceData?: unknown;
  reactions?: unknown[];
  messaging?: unknown;
  connectionSummary?: unknown;
}

interface State {
  isInitialized: boolean;
  capturedData: CapturedData;
  settings: unknown;
  autoCaptureController: {
    isEnabled: boolean;
    isInitialized: boolean;
    getStats: () => Record<string, unknown>;
    enable: () => void;
    disable: () => void;
    forceCapture: () => void;
  } | null;
}

// Use types from auto-capture.ts via the shared interface
// The Window interface is declared in auto-capture.ts - we only need to add content-script specific properties
declare global {
  interface Window {
    __linkedInContentScriptLoaded?: boolean;
  }
}

// ============================================
// STATE MANAGEMENT
// ============================================

const state: State = {
  isInitialized: false,
  capturedData: {
    profile: null,
    analytics: null,
    connections: [],
    feed: [],
    apiResponses: [],
  },
  settings: null,
  autoCaptureController: null,
};

// ============================================
// MESSAGING WITH SERVICE WORKER (with retry)
// ============================================

/**
 * Send message to background script with retry logic
 * Falls back to queue if all retries fail
 */
async function sendToBackground(message: ExtensionMessage): Promise<unknown> {
  if (!isExtensionContextValid()) {
    console.log('[ContentScript] Extension context invalidated, skipping message');
    return null;
  }

  try {
    const response = await sendMessageWithRetry(message, DEFAULT_RETRY_CONFIG);

    if (!response) {
      console.log('[ContentScript] Extension context lost during send');
      return null;
    }

    return response;
  } catch (error) {
    console.error('[ContentScript] Message failed after retries:', error);

    // Queue the message for later retry
    const queueId = queueMessage(message);
    console.log(`[ContentScript] Message queued: ${queueId}`);

    return null;
  }
}

// ============================================
// DATA SAVING FUNCTIONS
// ============================================

async function saveApiData(data: { endpoint: string; method: string; url: string; data: unknown; category?: string }): Promise<void> {
  try {
    console.log(`[CL:CONTENT] --- SENDING to service worker: type=API_CAPTURED category=${data.category}`);
    const result = await sendToBackground({
      ...data,
      type: 'API_CAPTURED', // MUST come after spread — data.type ('json-parse' etc.) would overwrite
    } as unknown as ExtensionMessage) as { success?: boolean; error?: string; data?: { count?: number } } | null;
    if (result?.success) {
      console.log(`[CL:CONTENT] +++ SERVICE WORKER CONFIRMED: category=${data.category} count=${result.data?.count}`);
    } else if (result === null) {
      console.warn(`[CL:CONTENT] !!! SERVICE WORKER RETURNED NULL: category=${data.category} (extension context may be invalid)`);
    } else {
      console.warn(`[CL:CONTENT] !!! SERVICE WORKER REJECTED: category=${data.category} error=${result?.error || 'unknown'}`);
    }
  } catch (error) {
    console.error(`[CL:CONTENT] !!! SEND FAILED: category=${data.category} error=`, error);
  }
}

async function saveAnalyticsData(data: unknown): Promise<void> {
  console.log('[ContentScript] saveAnalyticsData called');
  try {
    const response = await sendToBackground({
      type: 'AUTO_CAPTURE_CREATOR_ANALYTICS',
      data,
    } as unknown as ExtensionMessage);
    console.log('[ContentScript] Analytics save response:', response);
    state.capturedData.analytics = data;
  } catch (error) {
    console.error('[ContentScript] Error saving analytics data:', error);
  }
}

async function savePostAnalyticsData(data: unknown): Promise<void> {
  console.log('[ContentScript] savePostAnalyticsData called');
  try {
    const response = await sendToBackground({
      type: 'AUTO_CAPTURE_POST_ANALYTICS',
      data,
    } as unknown as ExtensionMessage);
    console.log('[ContentScript] Post analytics save response:', response);
  } catch (error) {
    console.error('[ContentScript] Error saving post analytics data:', error);
  }
}

async function saveAudienceData(data: unknown): Promise<void> {
  console.log('[ContentScript] saveAudienceData called');
  try {
    const response = await sendToBackground({
      type: 'AUTO_CAPTURE_AUDIENCE',
      data,
    } as unknown as ExtensionMessage);
    console.log('[ContentScript] Audience data save response:', response);
    state.capturedData.audienceData = data;
  } catch (error) {
    console.error('[ContentScript] Error saving audience data:', error);
  }
}

// ============================================
// API INTERCEPTION HANDLER
// ============================================

function handleCapturedApi(data: { endpoint: string; method: string; url: string; data: unknown; category?: string; type?: string }): void {
  if (!data?.endpoint) return;

  const dataSize = data.data ? JSON.stringify(data.data).length : 0;
  console.log(`[CL:CONTENT] <<< RECEIVED from interceptor: category=${data.category} type=${data.type} endpoint=${data.endpoint?.substring(0, 50)} size=${dataSize}b`);

  state.capturedData.apiResponses.push({
    ...data,
    capturedAt: new Date().toISOString(),
  });

  if (state.capturedData.apiResponses.length > CONFIG.maxItemsPerCategory) {
    state.capturedData.apiResponses = state.capturedData.apiResponses.slice(-CONFIG.maxItemsPerCategory);
  }

  console.log(`[CL:CONTENT] >>> FORWARDING to service worker: category=${data.category} (buffer: ${state.capturedData.apiResponses.length} items)`);
  saveApiData(data);
}

// ============================================
// DOM EXTRACTION
// ============================================

function debounce<T extends (...args: unknown[]) => void>(func: T, wait: number): T {
  let timeout: ReturnType<typeof setTimeout>;
  return function (this: unknown, ...args: unknown[]) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  } as T;
}

const extractFromDOM = debounce(() => {
  if (!window.LinkedInDOMExtractor) return;

  const pageType = window.LinkedInDOMExtractor.detectPageType();
  console.log('[ContentScript] Extracting DOM data, page type:', pageType);

  switch (pageType) {
    case 'analytics': {
      const analyticsData = window.LinkedInDOMExtractor.extractAnalyticsData();
      if (analyticsData) {
        saveAnalyticsData(analyticsData);
      }
      break;
    }
    case 'post_analytics': {
      const postAnalyticsData = window.LinkedInDOMExtractor.extractPostAnalyticsData();
      if (postAnalyticsData) {
        savePostAnalyticsData(postAnalyticsData);
      }
      break;
    }
  }
}, CONFIG.debounceMs);

// ============================================
// PAGE CHANGE DETECTION
// ============================================

function setupNavigationListener(): void {
  let lastUrl = location.href;

  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log('[ContentScript] URL changed:', lastUrl);
      extractFromDOM();
    }
  });

  function startObserving(): void {
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
      console.log('[ContentScript] MutationObserver started');
    } else {
      const bodyObserver = new MutationObserver((_, obs) => {
        if (document.body) {
          obs.disconnect();
          observer.observe(document.body, { childList: true, subtree: true });
          console.log('[ContentScript] MutationObserver started (delayed)');
        }
      });
      bodyObserver.observe(document.documentElement, { childList: true });
    }
  }

  startObserving();

  window.addEventListener('popstate', () => {
    console.log('[ContentScript] Popstate event');
    extractFromDOM();
  });
}

// ============================================
// MESSAGE HANDLING FROM POPUP
// ============================================

chrome.runtime.onMessage.addListener((message: { type: string; enabled?: boolean }, _, sendResponse) => {
  console.log('[ContentScript] Received message:', message.type);

  switch (message.type) {
    case 'EXTRACT_NOW': {
      const allData = window.LinkedInDOMExtractor?.extractAll() || {};
      sendResponse({ success: true, data: allData });
      break;
    }

    case 'GET_PAGE_TYPE': {
      const pageType = window.LinkedInDOMExtractor?.detectPageType() || 'unknown';
      sendResponse({ success: true, pageType });
      break;
    }

    case 'GET_AUTH_STATUS': {
      const authToken = window.LinkedInDOMExtractor?.getAuthToken();
      sendResponse({
        success: true,
        isAuthenticated: !!authToken,
        hasToken: !!authToken,
      });
      break;
    }

    case 'GET_CAPTURED_DATA':
      sendResponse({ success: true, data: state.capturedData });
      break;

    case 'GET_AUTO_CAPTURE_STATUS':
      if (state.autoCaptureController) {
        sendResponse({
          success: true,
          enabled: state.autoCaptureController.isEnabled,
          initialized: state.autoCaptureController.isInitialized,
          stats: state.autoCaptureController.getStats(),
        });
      } else {
        sendResponse({ success: false, error: 'AutoCaptureController not available' });
      }
      break;

    case 'SET_AUTO_CAPTURE':
      if (state.autoCaptureController) {
        if (message.enabled) {
          state.autoCaptureController.enable();
        } else {
          state.autoCaptureController.disable();
        }
        sendResponse({ success: true, enabled: message.enabled });
      } else {
        sendResponse({ success: false, error: 'AutoCaptureController not available' });
      }
      break;

    case 'FORCE_CAPTURE':
      if (state.autoCaptureController) {
        state.autoCaptureController.forceCapture();
        sendResponse({ success: true, message: 'Capture initiated' });
      } else {
        sendResponse({ success: false, error: 'AutoCaptureController not available' });
      }
      break;

    default:
      sendResponse({ success: false, error: 'Unknown message type' });
  }

  return true;
});

// ============================================
// INITIALIZATION
// ============================================

function initialize(): void {
  if (state.isInitialized) return;

  console.log('[ContentScript] Initializing...');

  // Listen for captured API data via postMessage (crosses MAIN→ISOLATED world boundary)
  window.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.type === '__CL_API_CAPTURED__' && event.data?.payload) {
      handleCapturedApi(event.data.payload);
    }
  });

  // Listen for auto-capture ready
  document.addEventListener('linkedin-auto-capture-ready', () => {
    console.log('[ContentScript] Auto-capture controller ready');
    if (window.LinkedInAutoCapture) {
      state.autoCaptureController = window.LinkedInAutoCapture;
    }
  });

  // Check if AutoCaptureController is already available
  if (window.LinkedInAutoCapture) {
    state.autoCaptureController = window.LinkedInAutoCapture;
    console.log('[ContentScript] AutoCaptureController found on initialization');
  }

  setupNavigationListener();

  if (document.readyState === 'complete') {
    extractFromDOM();
  } else {
    window.addEventListener('load', extractFromDOM);
  }

  setTimeout(extractFromDOM, 2000);
  setTimeout(extractFromDOM, 5000);

  state.isInitialized = true;
  console.log('[ContentScript] Initialization complete');
}

// ============================================
// ENTRY POINT
// ============================================

(function () {
  'use strict';

  if (window.__linkedInContentScriptLoaded) return;
  window.__linkedInContentScriptLoaded = true;

  console.log('[ContentScript] LinkedIn Data Extractor content script loading (TypeScript)...');

  if (window.LinkedInDOMExtractor) {
    initialize();
  } else {
    window.addEventListener('linkedin-dom-extractor-ready', initialize);
    setTimeout(initialize, 1000);
  }
})();
