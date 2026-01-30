/**
 * LinkedIn Data Extractor - Content Script
 * TypeScript Version
 *
 * Main orchestrator for content scripts.
 */

import type { ExtensionMessage } from '../shared/types';

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

// Declare global window extensions
declare global {
  interface Window {
    __linkedInContentScriptLoaded?: boolean;
    LinkedInDOMExtractor?: {
      detectPageType: () => string;
      extractAll: () => Record<string, unknown>;
      extractProfileData: () => Record<string, unknown> | null;
      extractAnalyticsData: () => Record<string, unknown> | null;
      extractPostAnalyticsData: () => Record<string, unknown> | null;
      getAuthToken: () => string | null;
    };
    LinkedInAutoCapture?: {
      isEnabled: boolean;
      isInitialized: boolean;
      getStats: () => Record<string, unknown>;
      enable: () => void;
      disable: () => void;
      forceCapture: () => void;
    };
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
// MESSAGING WITH SERVICE WORKER
// ============================================

function isExtensionContextValid(): boolean {
  try {
    return !!(chrome?.runtime?.id);
  } catch {
    return false;
  }
}

async function sendToBackground(message: ExtensionMessage): Promise<unknown> {
  if (!isExtensionContextValid()) {
    console.log('[ContentScript] Extension context invalidated, skipping message');
    return null;
  }

  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          const errorMsg = chrome.runtime.lastError.message || '';
          if (errorMsg.includes('Extension context invalidated') || errorMsg.includes('message port closed')) {
            console.log('[ContentScript] Extension reloaded, message not sent');
            resolve(null);
          } else {
            reject(chrome.runtime.lastError);
          }
        } else {
          resolve(response);
        }
      });
    } catch (error) {
      if ((error as Error).message?.includes('Extension context invalidated')) {
        console.log('[ContentScript] Extension context lost');
        resolve(null);
      } else {
        reject(error);
      }
    }
  });
}

// ============================================
// DATA SAVING FUNCTIONS
// ============================================

async function saveApiData(data: { endpoint: string; method: string; url: string; data: unknown; category?: string }): Promise<void> {
  try {
    const result = await sendToBackground({
      type: 'API_CAPTURED' as ExtensionMessage['type'],
      ...data,
    } as unknown as ExtensionMessage) as { count?: number } | null;
    if (result) {
      console.log('[ContentScript] API saved:', data.category, '- total:', result.count);
    }
  } catch (error) {
    console.error('[ContentScript] Error saving API data:', error);
  }
}

async function saveAnalyticsData(data: unknown): Promise<void> {
  console.log('[ContentScript] saveAnalyticsData called');
  try {
    const response = await sendToBackground({
      type: 'ANALYTICS_CAPTURED' as ExtensionMessage['type'],
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
      type: 'POST_ANALYTICS_CAPTURED' as ExtensionMessage['type'],
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
      type: 'AUDIENCE_DATA_CAPTURED' as ExtensionMessage['type'],
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

function handleCapturedApi(event: CustomEvent): void {
  const data = event.detail;

  if (!data?.endpoint) return;

  console.log('[ContentScript] API captured:', data.category, data.endpoint);

  state.capturedData.apiResponses.push({
    ...data,
    capturedAt: new Date().toISOString(),
  });

  if (state.capturedData.apiResponses.length > CONFIG.maxItemsPerCategory) {
    state.capturedData.apiResponses = state.capturedData.apiResponses.slice(-CONFIG.maxItemsPerCategory);
  }

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

  // Listen for captured API data
  document.addEventListener('linkedin-api-captured', handleCapturedApi as EventListener);
  document.addEventListener('linkedin-response-json', handleCapturedApi as EventListener);

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
