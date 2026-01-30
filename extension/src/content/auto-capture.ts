/**
 * LinkedIn Data Extractor - Auto-Capture Controller
 * TypeScript Version
 */

import type { LinkedInPageType, CaptureType, ExtensionMessage } from '../shared/types';

// ============================================
// CONSTANTS
// ============================================

const CAPTURE_DELAY = 1000; // Reduced from 2500ms for faster capture
const DEBOUNCE_TIME = 300000;
const URL_POLL_INTERVAL = 500;
const ELEMENT_WAIT_TIMEOUT = 5000; // Reduced from 8000ms

interface PagePattern {
  pattern: RegExp;
  type: LinkedInPageType;
  subtype: string;
}

const PAGE_PATTERNS: Record<string, PagePattern> = {
  POST_SUMMARY: {
    pattern: /\/analytics\/post-summary\/urn:li:activity:(\d+)/,
    type: 'post_analytics',
    subtype: 'summary',
  },
  POST_DEMOGRAPHICS: {
    pattern: /\/analytics\/demographic-detail\/urn:li:activity:(\d+)/,
    type: 'post_demographics',
    subtype: 'post_viewers',
  },
  AUDIENCE_DEMOGRAPHICS: {
    pattern: /\/analytics\/demographic-detail\/urn:li:fsd_profile/,
    type: 'audience_demographics',
    subtype: 'followers',
  },
  CREATOR_CONTENT: {
    pattern: /\/analytics\/creator\/content/,
    type: 'creator_analytics',
    subtype: 'content',
  },
  CREATOR_TOP_POSTS: {
    pattern: /\/analytics\/creator\/top-posts/,
    type: 'creator_analytics',
    subtype: 'top_posts',
  },
  CREATOR_AUDIENCE: {
    pattern: /\/analytics\/creator\/audience/,
    type: 'audience_analytics',
    subtype: 'audience',
  },
  PROFILE_VIEWS: {
    pattern: /\/analytics\/profile-views/,
    type: 'profile_views',
    subtype: 'list',
  },
  // Company page patterns (v4.0 Phase 5)
  COMPANY_PAGE: {
    pattern: /^\/company\/([^\/]+)\/?$/,
    type: 'company_analytics',
    subtype: 'page',
  },
  COMPANY_ANALYTICS: {
    pattern: /^\/company\/([^\/]+)\/analytics/,
    type: 'company_analytics',
    subtype: 'analytics',
  },
  COMPANY_POSTS: {
    pattern: /^\/company\/([^\/]+)\/posts/,
    type: 'content_calendar',
    subtype: 'posts',
  },
  // Dashboard page - main analytics overview
  DASHBOARD: {
    pattern: /^\/dashboard\/?$/,
    type: 'creator_analytics',
    subtype: 'dashboard',
  },
  // Profile page pattern - captures follower/connection counts
  PROFILE: {
    pattern: /^\/in\/([^\/]+)\/?$/,
    type: 'profile',
    subtype: 'main',
  },
};

// ============================================
// TYPE DEFINITIONS
// ============================================

interface PageInfo {
  type: LinkedInPageType | 'non_analytics';
  subtype: string | null;
  patternName?: string;
  url: string;
  pathname: string;
  identifier: string | null;
  detectedAt: string;
}

interface CaptureStats {
  total: number;
  successful: number;
  failed: number;
  byType: Record<string, number>;
}

interface ExtractedData {
  capturedAt?: string;
  pageInfo?: PageInfo;
  captureMethod?: string;
  [key: string]: unknown;
}

// Declare global window extensions
interface ProfileExtractionData {
  name?: string | null;
  headline?: string | null;
  location?: string | null;
  profilePhoto?: string | null;
  connectionCount?: number | null;
  followerCount?: number | null;
  aboutSection?: string | null;
  extractedAt?: string;
  source?: string;
}

declare global {
  interface Window {
    LinkedInDOMExtractor?: {
      extractCreatorAnalytics: () => ExtractedData | null;
      extractPostAnalyticsData: () => ExtractedData | null;
      extractAudienceAnalytics: () => ExtractedData | null;
      extractAudienceDemographics: () => ExtractedData | null;
      extractProfileViewsData: () => ExtractedData | null;
      extractProfileData: () => ProfileExtractionData | null;
    };
    LinkedInCompanyExtractor?: {
      detectCompanyPage: () => { type: string; companyId: string | null; companyName: string | null; url: string } | null;
      extractCompanyAnalytics: () => ExtractedData | null;
      extractContentCalendar: () => ExtractedData | null;
    };
    LinkedInAutoCapture?: AutoCaptureController;
    __linkedInAutoCaptureLoaded?: boolean;
  }
}

// ============================================
// AUTO-CAPTURE CONTROLLER CLASS
// ============================================

class AutoCaptureController {
  public isEnabled: boolean = true;
  public isInitialized: boolean = false;
  private lastUrl: string = '';
  private lastCaptures: Map<string, number> = new Map();
  private pendingCapture: ReturnType<typeof setTimeout> | null = null;
  private pendingCaptureUrl: string = ''; // URL when capture was scheduled
  private urlPollInterval: ReturnType<typeof setInterval> | null = null;
  private captureStats: CaptureStats = {
    total: 0,
    successful: 0,
    failed: 0,
    byType: {},
  };

  constructor() {
    this.handleNavigation = this.handleNavigation.bind(this);
    this.detectPageType = this.detectPageType.bind(this);
    this.captureCurrentPage = this.captureCurrentPage.bind(this);
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[AutoCapture] Already initialized');
      return;
    }

    console.log('[AutoCapture] Initializing...');

    try {
      await this.loadSettings();
      this.setupNavigationListeners();
      this.lastUrl = window.location.href;

      setTimeout(() => {
        this.handleNavigation();
      }, 1000);

      this.isInitialized = true;
      console.log('[AutoCapture] Initialization complete');
    } catch (error) {
      console.error('[AutoCapture] Initialization failed:', error);
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const response = await this.sendMessage({
        type: 'GET_DATA',
        key: 'linkedin_capture_settings',
      });

      if (response?.data) {
        this.isEnabled = (response.data as { autoCapture?: boolean }).autoCapture !== false;
        console.log('[AutoCapture] Settings loaded, enabled:', this.isEnabled);
      } else {
        this.isEnabled = true;
        console.log('[AutoCapture] Using default settings, enabled:', this.isEnabled);
      }
    } catch (error) {
      console.warn('[AutoCapture] Could not load settings, using defaults:', error);
      this.isEnabled = true;
    }
  }

  private sendMessage(message: ExtensionMessage): Promise<{ success: boolean; data?: unknown; error?: string }> {
    return new Promise((resolve, reject) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
          chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          });
        } else {
          reject(new Error('Chrome runtime not available'));
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============================================
  // NAVIGATION DETECTION
  // ============================================

  private setupNavigationListeners(): void {
    console.log('[AutoCapture] Setting up navigation listeners');

    const originalPushState = history.pushState;
    history.pushState = (...args: Parameters<typeof history.pushState>) => {
      originalPushState.apply(history, args);
      console.log('[AutoCapture] pushState detected');
      this.handleNavigation();
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = (...args: Parameters<typeof history.replaceState>) => {
      originalReplaceState.apply(history, args);
      console.log('[AutoCapture] replaceState detected');
      this.handleNavigation();
    };

    window.addEventListener('popstate', () => {
      console.log('[AutoCapture] popstate detected');
      this.handleNavigation();
    });

    this.urlPollInterval = setInterval(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== this.lastUrl) {
        console.log('[AutoCapture] URL change detected via polling');
        this.lastUrl = currentUrl;
        this.handleNavigation();
      }
    }, URL_POLL_INTERVAL);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const currentUrl = window.location.href;
        if (currentUrl !== this.lastUrl) {
          console.log('[AutoCapture] URL changed while tab was hidden');
          this.lastUrl = currentUrl;
          this.handleNavigation();
        }
      }
    });

    console.log('[AutoCapture] Navigation listeners set up complete');
  }

  // ============================================
  // PAGE TYPE DETECTION
  // ============================================

  detectPageType(): PageInfo {
    const pathname = window.location.pathname;
    const href = window.location.href;

    for (const [name, config] of Object.entries(PAGE_PATTERNS)) {
      const match = pathname.match(config.pattern);
      if (match) {
        const pageInfo: PageInfo = {
          type: config.type,
          subtype: config.subtype,
          patternName: name,
          url: href,
          pathname: pathname,
          identifier: match[1] || null,
          detectedAt: new Date().toISOString(),
        };

        console.log('[AutoCapture] Page detected:', pageInfo.type, pageInfo.subtype);
        return pageInfo;
      }
    }

    return {
      type: 'non_analytics',
      subtype: null,
      url: href,
      pathname: pathname,
      identifier: null,
      detectedAt: new Date().toISOString(),
    };
  }

  // ============================================
  // CAPTURE LOGIC
  // ============================================

  handleNavigation(): void {
    if (!this.isEnabled) {
      console.log('[AutoCapture] Disabled, skipping');
      return;
    }

    if (this.pendingCapture) {
      clearTimeout(this.pendingCapture);
      this.pendingCapture = null;
    }

    const pageInfo = this.detectPageType();

    if (pageInfo.type === 'non_analytics') {
      console.log('[AutoCapture] Not an analytics page, skipping');
      return;
    }

    const cacheKey = this.getCacheKey(pageInfo);
    if (this.shouldDebounce(cacheKey)) {
      console.log('[AutoCapture] Debounced:', cacheKey);
      return;
    }

    console.log(`[AutoCapture] Scheduling capture for ${pageInfo.type} in ${CAPTURE_DELAY}ms`);

    // Store the URL when scheduling to validate later
    this.pendingCaptureUrl = window.location.href;

    this.pendingCapture = setTimeout(() => {
      this.captureCurrentPage(pageInfo);
    }, CAPTURE_DELAY);
  }

  private getCacheKey(pageInfo: PageInfo): string {
    if (pageInfo.identifier) {
      return `${pageInfo.type}:${pageInfo.subtype}:${pageInfo.identifier}`;
    }
    return `${pageInfo.type}:${pageInfo.subtype}:default`;
  }

  private shouldDebounce(cacheKey: string): boolean {
    const lastCapture = this.lastCaptures.get(cacheKey);
    if (!lastCapture) return false;

    const timeSinceLastCapture = Date.now() - lastCapture;
    return timeSinceLastCapture < DEBOUNCE_TIME;
  }

  async captureCurrentPage(pageInfo: PageInfo): Promise<void> {
    console.log(`[AutoCapture] Starting capture for: ${pageInfo.type}/${pageInfo.subtype}`);

    // ============================================
    // URL VALIDATION - Prevent capture if user navigated away
    // ============================================
    const currentUrl = window.location.href;
    if (this.pendingCaptureUrl && currentUrl !== this.pendingCaptureUrl) {
      console.log(`[AutoCapture] URL changed during delay, skipping capture`);
      console.log(`[AutoCapture] Expected: ${this.pendingCaptureUrl}`);
      console.log(`[AutoCapture] Current:  ${currentUrl}`);
      return;
    }

    // Also validate that the current page type still matches
    const currentPageInfo = this.detectPageType();
    if (currentPageInfo.type !== pageInfo.type) {
      console.log(`[AutoCapture] Page type changed from ${pageInfo.type} to ${currentPageInfo.type}, skipping capture`);
      return;
    }

    this.captureStats.total++;

    try {
      await this.waitForAnalyticsContent();

      let data: ExtractedData | null = null;
      let messageType: string | null = null;

      switch (pageInfo.type) {
        case 'creator_analytics':
          data = await this.extractCreatorAnalytics(pageInfo.subtype!);
          messageType = 'AUTO_CAPTURE_CREATOR_ANALYTICS';
          break;

        case 'post_analytics':
          data = await this.extractPostAnalytics(pageInfo.identifier);
          messageType = 'AUTO_CAPTURE_POST_ANALYTICS';
          break;

        case 'audience_analytics':
          data = await this.extractAudienceAnalytics();
          messageType = 'AUTO_CAPTURE_AUDIENCE';
          break;

        case 'audience_demographics':
          data = await this.extractAudienceDemographics();
          messageType = 'AUTO_CAPTURE_AUDIENCE_DEMOGRAPHICS';
          break;

        case 'post_demographics':
          data = await this.extractPostDemographics(pageInfo.identifier);
          messageType = 'AUTO_CAPTURE_POST_DEMOGRAPHICS';
          break;

        case 'profile_views':
          data = await this.extractProfileViews();
          messageType = 'AUTO_CAPTURE_PROFILE_VIEWS';
          break;

        case 'company_analytics':
          data = await this.extractCompanyAnalytics(pageInfo.identifier);
          messageType = 'AUTO_CAPTURE_COMPANY_ANALYTICS';
          break;

        case 'content_calendar':
          data = await this.extractContentCalendar(pageInfo.identifier);
          messageType = 'AUTO_CAPTURE_CONTENT_CALENDAR';
          break;

        case 'profile':
          data = await this.extractProfile();
          messageType = 'AUTO_CAPTURE_PROFILE';
          break;

        default:
          console.log(`[AutoCapture] Unknown page type: ${pageInfo.type}`);
          return;
      }

      if (!data || Object.keys(data).length === 0) {
        throw new Error('No data extracted');
      }

      // ============================================
      // FINAL URL VALIDATION - Before saving
      // ============================================
      const finalUrl = window.location.href;
      if (this.pendingCaptureUrl && finalUrl !== this.pendingCaptureUrl) {
        console.log(`[AutoCapture] URL changed during extraction, discarding data`);
        console.log(`[AutoCapture] Expected: ${this.pendingCaptureUrl}`);
        console.log(`[AutoCapture] Final:    ${finalUrl}`);
        return;
      }

      data.capturedAt = new Date().toISOString();
      data.pageInfo = pageInfo;
      data.captureMethod = 'auto';
      // Use the original URL from pageInfo, not current window.location
      data.url = pageInfo.url;

      await this.saveCapture(messageType, data);

      const cacheKey = this.getCacheKey(pageInfo);
      this.lastCaptures.set(cacheKey, Date.now());

      this.captureStats.successful++;
      this.captureStats.byType[pageInfo.type] = (this.captureStats.byType[pageInfo.type] || 0) + 1;

      console.log(`[AutoCapture] Successfully captured ${pageInfo.type}:`, data);
      this.dispatchCaptureEvent(pageInfo.type, data, true);
    } catch (error) {
      console.error(`[AutoCapture] Capture failed for ${pageInfo.type}:`, error);
      this.captureStats.failed++;

      await this.logCapture(pageInfo, false, error instanceof Error ? error.message : 'Unknown error');
      this.dispatchCaptureEvent(pageInfo.type, null, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private waitForAnalyticsContent(): Promise<void> {
    return new Promise((resolve) => {
      const selectors = [
        'main[aria-label*="analytics" i]',
        '[class*="analytics"]',
        '[data-test-id*="analytics"]',
        '.artdeco-card',
        'section',
      ];

      const checkContent = (): boolean => {
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent && element.textContent.length > 100) {
            return true;
          }
        }
        return false;
      };

      if (checkContent()) {
        resolve();
        return;
      }

      const observer = new MutationObserver((_, obs) => {
        if (checkContent()) {
          obs.disconnect();
          resolve();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        resolve();
      }, ELEMENT_WAIT_TIMEOUT);
    });
  }

  private async saveCapture(messageType: string, data: ExtractedData): Promise<void> {
    try {
      const response = await this.sendMessage({
        type: messageType as ExtensionMessage['type'],
        data,
      });

      if (response?.success) {
        console.log(`[AutoCapture] Data saved successfully via ${messageType}`);
      } else {
        throw new Error(response?.error || 'Save failed');
      }
    } catch (error) {
      console.error('[AutoCapture] Failed to save data:', error);
      throw error;
    }
  }

  private async logCapture(pageInfo: PageInfo, success: boolean, errorMessage: string | null = null): Promise<void> {
    try {
      await this.sendMessage({
        type: 'AUTO_CAPTURE_LOG',
        data: {
          timestamp: new Date().toISOString(),
          pageType: pageInfo.type,
          subtype: pageInfo.subtype,
          url: pageInfo.url,
          success,
          error: errorMessage,
        },
      });
    } catch (error) {
      console.warn('[AutoCapture] Failed to log capture:', error);
    }
  }

  private dispatchCaptureEvent(
    pageType: string,
    data: ExtractedData | null,
    success: boolean,
    error: string | null = null
  ): void {
    const event = new CustomEvent('auto-capture-complete', {
      detail: {
        pageType,
        data,
        success,
        error,
        timestamp: new Date().toISOString(),
      },
    });
    document.dispatchEvent(event);
  }

  // ============================================
  // DATA EXTRACTORS
  // ============================================

  private async extractCreatorAnalytics(subtype: string): Promise<ExtractedData> {
    console.log(`[AutoCapture] Extracting creator analytics: ${subtype}`);

    // Validate we're still on an analytics page
    const currentPath = window.location.pathname;
    if (!currentPath.includes('/analytics/') && !currentPath.includes('/dashboard')) {
      console.log('[AutoCapture] No longer on analytics page, skipping extraction');
      return {};
    }

    if (window.LinkedInDOMExtractor?.extractCreatorAnalytics) {
      const data = window.LinkedInDOMExtractor.extractCreatorAnalytics();
      if (data && (data.impressions || data.membersReached || data.topPosts)) {
        data.subtype = subtype;
        return data;
      }
    }

    console.log('[AutoCapture] DOM extractor failed, using fallback');
    return this.basicCreatorAnalyticsExtraction();
  }

  private async extractPostAnalytics(activityId: string | null): Promise<ExtractedData> {
    console.log(`[AutoCapture] Extracting post analytics: ${activityId}`);

    if (window.LinkedInDOMExtractor?.extractPostAnalyticsData) {
      const data = window.LinkedInDOMExtractor.extractPostAnalyticsData();
      if (data && (data.impressions || data.engagement)) {
        if (!data.activityUrn && activityId) {
          data.activityUrn = `urn:li:activity:${activityId}`;
        }
        return data;
      }
    }

    console.log('[AutoCapture] DOM extractor failed, using fallback');
    return this.basicPostAnalyticsExtraction(activityId);
  }

  private async extractAudienceAnalytics(): Promise<ExtractedData> {
    console.log('[AutoCapture] Extracting audience analytics');

    if (window.LinkedInDOMExtractor?.extractAudienceAnalytics) {
      const data = window.LinkedInDOMExtractor.extractAudienceAnalytics();
      if (data && (data.totalFollowers || data.followerGrowth)) {
        return data;
      }
    }

    console.log('[AutoCapture] DOM extractor failed, using fallback');
    return this.basicAudienceExtraction();
  }

  private async extractAudienceDemographics(): Promise<ExtractedData> {
    console.log('[AutoCapture] Extracting audience demographics');

    if (window.LinkedInDOMExtractor?.extractAudienceDemographics) {
      const data = window.LinkedInDOMExtractor.extractAudienceDemographics();
      if (data?.demographics) {
        const hasData = Object.values(data.demographics as Record<string, unknown[]>).some(
          (arr) => Array.isArray(arr) && arr.length > 0
        );
        if (hasData) {
          return data;
        }
      }
    }

    console.log('[AutoCapture] DOM extractor failed, using fallback');
    return this.basicDemographicsExtraction();
  }

  private async extractPostDemographics(activityId: string | null): Promise<ExtractedData> {
    console.log(`[AutoCapture] Extracting post demographics: ${activityId}`);

    if (window.LinkedInDOMExtractor?.extractAudienceDemographics) {
      const data = window.LinkedInDOMExtractor.extractAudienceDemographics();
      if (data?.demographics) {
        if (activityId) {
          data.activityId = activityId;
          data.activityUrn = `urn:li:activity:${activityId}`;
        }
        const hasData = Object.values(data.demographics as Record<string, unknown[]>).some(
          (arr) => Array.isArray(arr) && arr.length > 0
        );
        if (hasData) {
          return data;
        }
      }
    }

    console.log('[AutoCapture] DOM extractor failed, using fallback');
    return this.basicDemographicsExtraction();
  }

  private async extractProfileViews(): Promise<ExtractedData> {
    console.log('[AutoCapture] Extracting profile views');

    if (window.LinkedInDOMExtractor?.extractProfileViewsData) {
      const data = window.LinkedInDOMExtractor.extractProfileViewsData();
      if (data && (data.totalViews || (Array.isArray(data.viewers) && data.viewers.length > 0))) {
        return data;
      }
    }

    console.log('[AutoCapture] DOM extractor failed, using fallback');
    return this.basicProfileViewsExtraction();
  }

  private async extractProfile(): Promise<ExtractedData> {
    console.log('[AutoCapture] Extracting profile data');

    // Validate we're still on a profile page
    const currentPath = window.location.pathname;
    if (!currentPath.match(/^\/in\/[^\/]+\/?$/)) {
      console.log('[AutoCapture] No longer on profile page, skipping extraction');
      return {};
    }

    if (window.LinkedInDOMExtractor?.extractProfileData) {
      const data = window.LinkedInDOMExtractor.extractProfileData();
      // Check for followerCount (from DOMExtractor) not followers_count
      if (data && (data.name || data.followerCount || data.connectionCount)) {
        return {
          ...data,
          // Map DOMExtractor properties to expected names for database
          followers_count: data.followerCount,
          connections_count: data.connectionCount,
          pageType: 'profile',
          extractedAt: new Date().toISOString(),
          source: 'dom',
        };
      }
    }

    console.log('[AutoCapture] DOM extractor failed, using fallback');
    return this.basicProfileExtraction();
  }

  private basicProfileExtraction(): ExtractedData {
    // Validate we're still on a profile page
    const currentPath = window.location.pathname;
    if (!currentPath.match(/^\/in\/[^\/]+\/?$/)) {
      console.log('[AutoCapture] No longer on profile page during basic extraction');
      return {};
    }

    const data: ExtractedData = {
      pageType: 'profile',
      extractedAt: new Date().toISOString(),
      source: 'dom',
    };

    try {
      // Extract name - multiple selectors
      const nameSelectors = [
        'h1.text-heading-xlarge',
        'h1[class*="text-heading"]',
        '.pv-text-details__left-panel h1',
        'main h1',
      ];
      for (const selector of nameSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          data.name = el.textContent.trim();
          break;
        }
      }

      // Extract headline - multiple selectors
      const headlineSelectors = [
        '.text-body-medium.break-words',
        '.pv-text-details__left-panel .text-body-medium',
        'h1 + .text-body-medium',
      ];
      for (const selector of headlineSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          data.headline = el.textContent.trim();
          break;
        }
      }

      // Extract followers count
      const bodyText = document.body.innerText;
      const followersPatterns = [
        /(\d{1,3}(?:,\d{3})*|\d+)\s*followers/i,
        /followers\s*(\d{1,3}(?:,\d{3})*|\d+)/i,
      ];
      for (const pattern of followersPatterns) {
        const match = bodyText.match(pattern);
        if (match) {
          data.followers_count = parseInt(match[1].replace(/,/g, ''), 10);
          break;
        }
      }

      // Extract connections count
      const connectionsPatterns = [
        /(\d{1,3}(?:,\d{3})*|\d+)\s*connections/i,
        /connections\s*(\d{1,3}(?:,\d{3})*|\d+)/i,
      ];
      for (const pattern of connectionsPatterns) {
        const match = bodyText.match(pattern);
        if (match) {
          data.connections_count = parseInt(match[1].replace(/,/g, ''), 10);
          break;
        }
      }

      console.log('[AutoCapture] Basic profile extraction:', data);
    } catch (error) {
      console.error('[AutoCapture] Basic profile extraction error:', error);
    }

    return data;
  }

  // ============================================
  // COMPANY PAGE EXTRACTORS (v4.0 Phase 5)
  // ============================================

  private async extractCompanyAnalytics(companyId: string | null): Promise<ExtractedData> {
    console.log(`[AutoCapture] Extracting company analytics: ${companyId}`);

    if (window.LinkedInCompanyExtractor?.extractCompanyAnalytics) {
      const data = window.LinkedInCompanyExtractor.extractCompanyAnalytics();
      if (data && (data.companyId || data.followers)) {
        return data;
      }
    }

    console.log('[AutoCapture] Company extractor failed, using fallback');
    return this.basicCompanyExtraction(companyId);
  }

  private async extractContentCalendar(companyId: string | null): Promise<ExtractedData> {
    console.log(`[AutoCapture] Extracting content calendar: ${companyId}`);

    if (window.LinkedInCompanyExtractor?.extractContentCalendar) {
      const data = window.LinkedInCompanyExtractor.extractContentCalendar();
      if (data && data.items && (data.items as unknown[]).length > 0) {
        if (companyId) {
          data.companyId = companyId;
        }
        return data;
      }
    }

    console.log('[AutoCapture] Content calendar extractor failed, using fallback');
    return this.basicContentCalendarExtraction(companyId);
  }

  private basicCompanyExtraction(companyId: string | null): ExtractedData {
    const data: ExtractedData = {
      pageType: 'company_analytics',
      companyId: companyId,
      extractedAt: new Date().toISOString(),
      followers: 0,
    };

    const bodyText = document.body.innerText;

    // Extract followers
    const followersMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*followers/i);
    if (followersMatch) {
      data.followers = parseInt(followersMatch[1].replace(/,/g, ''), 10);
    }

    // Extract employees
    const employeesMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*employees?\s*on\s*linkedin/i);
    if (employeesMatch) {
      data.employees = parseInt(employeesMatch[1].replace(/,/g, ''), 10);
    }

    // Extract company name from title or h1
    const h1 = document.querySelector('h1');
    if (h1?.textContent?.trim()) {
      data.companyName = h1.textContent.trim();
    }

    return data;
  }

  private basicContentCalendarExtraction(companyId: string | null): ExtractedData {
    const data: ExtractedData = {
      pageType: 'content_calendar',
      companyId: companyId,
      extractedAt: new Date().toISOString(),
      items: [],
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
      },
    };

    // Try to find post elements
    const postElements = document.querySelectorAll('.feed-shared-update-v2, [class*="update-container"]');
    const items: Array<Record<string, unknown>> = [];

    postElements.forEach((postEl, index) => {
      const textEl = postEl.querySelector('.feed-shared-text, [class*="update-text"]');
      const text = textEl?.textContent?.trim() || '';

      if (text) {
        items.push({
          id: `post-${index}`,
          type: 'post',
          status: 'published',
          title: text.substring(0, 100),
          content: text,
        });
      }
    });

    data.items = items;
    return data;
  }

  // ============================================
  // BASIC EXTRACTORS (Fallback)
  // ============================================

  private basicCreatorAnalyticsExtraction(): ExtractedData {
    console.log('[CAPTURE][CREATOR_ANALYTICS] Starting basic creator analytics extraction');

    const data: ExtractedData = {
      pageType: 'creator_analytics',
      extractedAt: new Date().toISOString(),
    };

    const bodyText = document.body.innerText;

    // Match "33\nPost impressions" pattern on dashboard
    const impressionsMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*(?:Post\s+)?impressions/i);
    if (impressionsMatch) {
      data.impressions = parseInt(impressionsMatch[1].replace(/,/g, ''), 10);
      console.log('[CAPTURE][CREATOR_ANALYTICS] Impressions:', data.impressions);
    }

    // Match "263\nFollowers" pattern on dashboard -> newFollowers for db mapping
    const followersMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*Followers/i);
    if (followersMatch) {
      data.newFollowers = parseInt(followersMatch[1].replace(/,/g, ''), 10);
      console.log('[CAPTURE][CREATOR_ANALYTICS] Followers (newFollowers):', data.newFollowers);
    }

    // Match "95\nProfile viewers" pattern on dashboard -> profileViews for db mapping
    const profileViewersMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*Profile\s+viewers/i);
    if (profileViewersMatch) {
      data.profileViews = parseInt(profileViewersMatch[1].replace(/,/g, ''), 10);
      console.log('[CAPTURE][CREATOR_ANALYTICS] Profile views:', data.profileViews);
    }

    // Match "44\nSearch appearances" pattern on dashboard
    // Multiple patterns to improve robustness
    let searchAppearancesMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*Search\s+appearances/i);
    if (!searchAppearancesMatch) {
      // Alternative: "Search appearances\n44"
      searchAppearancesMatch = bodyText.match(/Search\s+appearances\s*(?:\n|\s)*(\d{1,3}(?:,\d{3})*|\d+)/i);
    }
    if (!searchAppearancesMatch) {
      // Alternative: Look in specific cards/sections
      const cards = document.querySelectorAll('[class*="card"], [class*="stat"], [class*="metric"]');
      cards.forEach((card) => {
        const cardText = card.textContent || '';
        if (cardText.toLowerCase().includes('search') && cardText.toLowerCase().includes('appearance') && !data.searchAppearances) {
          const numMatch = cardText.match(/(\d{1,3}(?:,\d{3})*|\d+)/);
          if (numMatch) {
            data.searchAppearances = parseInt(numMatch[1].replace(/,/g, ''), 10);
          }
        }
      });
    }
    if (searchAppearancesMatch) {
      data.searchAppearances = parseInt(searchAppearancesMatch[1].replace(/,/g, ''), 10);
    }
    console.log('[CAPTURE][CREATOR_ANALYTICS] Search appearances:', data.searchAppearances);

    // Match growth percentage like "64.2% past 7 days" or "0.4% past 7 days"
    const impressionGrowthMatch = bodyText.match(/([▼▲]?)(\d+(?:\.\d+)?%)\s*past\s+7\s+days/i);
    if (impressionGrowthMatch) {
      const isNegative = impressionGrowthMatch[1] === '▼' || impressionGrowthMatch[1] === '';
      const value = parseFloat(impressionGrowthMatch[2]);
      data.impressionGrowth = isNegative ? -value : value;
      console.log('[CAPTURE][CREATOR_ANALYTICS] Impression growth:', data.impressionGrowth);
    }

    const membersMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*Members reached/i);
    if (membersMatch) {
      data.membersReached = parseInt(membersMatch[1].replace(/,/g, ''), 10);
      console.log('[CAPTURE][CREATOR_ANALYTICS] Members reached:', data.membersReached);
    }

    const growthMatch = bodyText.match(/([+-]?\d+(?:\.\d+)?%)\s*vs\.?\s*prior/i);
    if (growthMatch) {
      data.growth = growthMatch[1];
      console.log('[CAPTURE][CREATOR_ANALYTICS] Growth:', data.growth);
    }

    // ============================================
    // ENGAGEMENTS CALCULATION
    // Calculate total engagements from top posts data (reactions + comments + reposts)
    // ============================================
    let totalEngagements = 0;

    // Method 1: Try to extract from top posts section
    const topPostsSection = document.querySelector('[class*="top-post"], [class*="posts"], main');
    if (topPostsSection) {
      // Look for reaction/like counts
      const reactionMatches = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*(?:reactions?|likes?)/gi);
      if (reactionMatches) {
        reactionMatches.forEach((match) => {
          const numMatch = match.match(/(\d{1,3}(?:,\d{3})*|\d+)/);
          if (numMatch) {
            totalEngagements += parseInt(numMatch[1].replace(/,/g, ''), 10);
          }
        });
      }

      // Look for comment counts
      const commentMatches = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*comments?/gi);
      if (commentMatches) {
        commentMatches.forEach((match) => {
          const numMatch = match.match(/(\d{1,3}(?:,\d{3})*|\d+)/);
          if (numMatch) {
            totalEngagements += parseInt(numMatch[1].replace(/,/g, ''), 10);
          }
        });
      }

      // Look for repost/share counts
      const repostMatches = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*(?:reposts?|shares?)/gi);
      if (repostMatches) {
        repostMatches.forEach((match) => {
          const numMatch = match.match(/(\d{1,3}(?:,\d{3})*|\d+)/);
          if (numMatch) {
            totalEngagements += parseInt(numMatch[1].replace(/,/g, ''), 10);
          }
        });
      }
    }

    // Method 2: Alternative - look for "engagements" directly mentioned
    const engagementsDirectMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*(?:total\s+)?engagements?/i);
    if (engagementsDirectMatch) {
      totalEngagements = parseInt(engagementsDirectMatch[1].replace(/,/g, ''), 10);
    }

    // Method 3: Check analytics cards for engagement data
    if (totalEngagements === 0) {
      const engagementCards = document.querySelectorAll('[class*="engagement"], [class*="interaction"]');
      engagementCards.forEach((card) => {
        const cardText = card.textContent || '';
        const numMatch = cardText.match(/(\d{1,3}(?:,\d{3})*|\d+)/);
        if (numMatch && (cardText.toLowerCase().includes('engagement') || cardText.toLowerCase().includes('interaction'))) {
          totalEngagements += parseInt(numMatch[1].replace(/,/g, ''), 10);
        }
      });
    }

    data.engagements = totalEngagements;
    console.log('[CAPTURE][CREATOR_ANALYTICS] Total engagements:', data.engagements);

    // Calculate engagement rate if we have impressions
    if (data.impressions && (data.impressions as number) > 0 && totalEngagements > 0) {
      data.engagementRate = ((totalEngagements / (data.impressions as number)) * 100).toFixed(2);
      console.log('[CAPTURE][CREATOR_ANALYTICS] Engagement rate:', data.engagementRate);
    }

    console.log('[CAPTURE][CREATOR_ANALYTICS] Extraction complete:', data);
    return data;
  }

  private basicPostAnalyticsExtraction(activityId: string | null): ExtractedData {
    const data: ExtractedData = {
      pageType: 'post_analytics',
      activityUrn: activityId ? `urn:li:activity:${activityId}` : null,
      extractedAt: new Date().toISOString(),
      discovery: {},
      profileActivity: {},
      socialEngagement: {},
      demographics: [],
    };

    const bodyText = document.body.innerText;

    const impressionsMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*Impressions/i);
    if (impressionsMatch) {
      (data.discovery as Record<string, unknown>).impressions = parseInt(impressionsMatch[1].replace(/,/g, ''), 10);
    }

    const lists = document.querySelectorAll('li');
    lists.forEach((li) => {
      const text = li.textContent || '';
      const socialEngagement = data.socialEngagement as Record<string, number>;
      const profileActivity = data.profileActivity as Record<string, number>;

      if (text.includes('Reactions')) {
        const match = text.match(/(\d+)/);
        if (match) socialEngagement.reactions = parseInt(match[1], 10);
      }
      if (text.includes('Comments') && !text.includes('comment on')) {
        const match = text.match(/(\d+)/);
        if (match) socialEngagement.comments = parseInt(match[1], 10);
      }
      if (text.includes('Reposts')) {
        const match = text.match(/(\d+)/);
        if (match) socialEngagement.reposts = parseInt(match[1], 10);
      }
      if (text.includes('Profile viewers from this post')) {
        const match = text.match(/(\d+)/);
        if (match) profileActivity.profileViewers = parseInt(match[1], 10);
      }
    });

    return data;
  }

  private basicAudienceExtraction(): ExtractedData {
    const data: ExtractedData = {
      pageType: 'audience_analytics',
      extractedAt: new Date().toISOString(),
    };

    const bodyText = document.body.innerText;

    const followersMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*Total followers/i);
    if (followersMatch) {
      data.totalFollowers = parseInt(followersMatch[1].replace(/,/g, ''), 10);
    }

    const growthMatch = bodyText.match(/([+-]?\d+(?:\.\d+)?%)\s*vs\.?\s*prior/i);
    if (growthMatch) {
      data.followerGrowth = growthMatch[1];
    }

    return data;
  }

  private basicDemographicsExtraction(): ExtractedData {
    const data: ExtractedData = {
      pageType: 'demographics',
      extractedAt: new Date().toISOString(),
      demographics: {
        industries: [],
        locations: [],
        seniority: [],
        companies: [],
      },
    };

    return data;
  }

  private basicProfileViewsExtraction(): ExtractedData {
    console.log('[CAPTURE][PROFILE_VIEWS] Starting basic profile views extraction');

    const data: ExtractedData = {
      pageType: 'profile_views',
      extractedAt: new Date().toISOString(),
      viewers: [],
    };

    const bodyText = document.body.innerText;

    // ============================================
    // PROFILE VIEWS EXTRACTION
    // ============================================
    // Pattern 1: "95 profile views" or "95\nProfile views"
    let viewsMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*(?:profile\s+)?view(?:er)?s?/i);
    // Pattern 2: "Profile views\n95"
    if (!viewsMatch) {
      viewsMatch = bodyText.match(/[Pp]rofile\s+views?\s*(?:\n|\s)*(\d{1,3}(?:,\d{3})*|\d+)/);
    }
    // Pattern 3: "Who viewed your profile\n95"
    if (!viewsMatch) {
      viewsMatch = bodyText.match(/[Ww]ho\s+viewed\s+your\s+profile\s*(?:\n|\s)*(\d{1,3}(?:,\d{3})*|\d+)/);
    }
    // Pattern 4: Look in stat cards
    if (!viewsMatch) {
      const statCards = document.querySelectorAll('[class*="stat"], [class*="card"], [class*="metric"]');
      statCards.forEach((card) => {
        const cardText = card.textContent || '';
        if ((cardText.toLowerCase().includes('view') || cardText.toLowerCase().includes('viewer')) && !data.totalViews) {
          const numMatch = cardText.match(/(\d{1,3}(?:,\d{3})*|\d+)/);
          if (numMatch) {
            data.totalViews = parseInt(numMatch[1].replace(/,/g, ''), 10);
          }
        }
      });
    }

    if (viewsMatch) {
      data.totalViews = parseInt(viewsMatch[1].replace(/,/g, ''), 10);
    }
    // Also set profileViews for database compatibility
    data.profileViews = data.totalViews;
    console.log('[CAPTURE][PROFILE_VIEWS] Profile views:', data.profileViews);

    // ============================================
    // SEARCH APPEARANCES EXTRACTION
    // ============================================
    // Pattern 1: "44 search appearances" or "44\nSearch appearances"
    let searchMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*[Ss]earch\s+appearances?/);
    // Pattern 2: "Search appearances\n44"
    if (!searchMatch) {
      searchMatch = bodyText.match(/[Ss]earch\s+appearances?\s*(?:\n|\s)*(\d{1,3}(?:,\d{3})*|\d+)/);
    }
    // Pattern 3: "Appeared in search\n44" or "44 times in search"
    if (!searchMatch) {
      searchMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*(?:times?\s+)?in\s+search/i);
    }
    // Pattern 4: "in search results\n44"
    if (!searchMatch) {
      searchMatch = bodyText.match(/in\s+search\s+(?:results?)?\s*(?:\n|\s)*(\d{1,3}(?:,\d{3})*|\d+)/i);
    }
    // Pattern 5: Look in stat cards
    if (!searchMatch) {
      const statCards = document.querySelectorAll('[class*="stat"], [class*="card"], [class*="metric"]');
      statCards.forEach((card) => {
        const cardText = card.textContent || '';
        if (cardText.toLowerCase().includes('search') && cardText.toLowerCase().includes('appear') && !data.searchAppearances) {
          const numMatch = cardText.match(/(\d{1,3}(?:,\d{3})*|\d+)/);
          if (numMatch) {
            data.searchAppearances = parseInt(numMatch[1].replace(/,/g, ''), 10);
          }
        }
      });
    }

    if (searchMatch) {
      data.searchAppearances = parseInt(searchMatch[1].replace(/,/g, ''), 10);
    }
    console.log('[CAPTURE][PROFILE_VIEWS] Search appearances:', data.searchAppearances);

    // ============================================
    // VIEWER EXTRACTION
    // ============================================
    const viewerCards = document.querySelectorAll('[class*="viewer"], [class*="profile-card"], [class*="entity-result"]');
    const viewers: Array<{ name: string; headline: string | null; profileUrl: string | null }> = [];

    viewerCards.forEach((card) => {
      const nameEl = card.querySelector('h3, .t-bold, [class*="name"], [class*="title"]');
      const headlineEl = card.querySelector('.t-normal, [class*="headline"], [class*="subtitle"]');
      const linkEl = card.querySelector('a[href*="/in/"]');

      if (nameEl) {
        const name = nameEl.textContent?.trim() || 'Unknown';
        // Skip entries that look like headers or non-viewer content
        if (name.length > 2 && name.length < 100 && !name.toLowerCase().includes('view') && !name.toLowerCase().includes('search')) {
          viewers.push({
            name,
            headline: headlineEl?.textContent?.trim() || null,
            profileUrl: linkEl?.getAttribute('href') || null,
          });
        }
      }
    });

    data.viewers = viewers;
    console.log('[CAPTURE][PROFILE_VIEWS] Viewers found:', viewers.length);

    console.log('[CAPTURE][PROFILE_VIEWS] Extraction complete:', data);
    return data;
  }

  // ============================================
  // PUBLIC API
  // ============================================

  enable(): void {
    this.isEnabled = true;
    console.log('[AutoCapture] Enabled');
    this.handleNavigation();
  }

  disable(): void {
    this.isEnabled = false;
    if (this.pendingCapture) {
      clearTimeout(this.pendingCapture);
      this.pendingCapture = null;
    }
    console.log('[AutoCapture] Disabled');
  }

  getStats(): CaptureStats {
    return { ...this.captureStats };
  }

  forceCapture(): void {
    const pageInfo = this.detectPageType();
    if (pageInfo.type !== 'non_analytics') {
      this.captureCurrentPage(pageInfo);
    }
  }

  destroy(): void {
    if (this.urlPollInterval) {
      clearInterval(this.urlPollInterval);
    }
    if (this.pendingCapture) {
      clearTimeout(this.pendingCapture);
    }
    this.isInitialized = false;
    console.log('[AutoCapture] Destroyed');
  }
}

// ============================================
// INITIALIZATION
// ============================================

(function () {
  'use strict';

  if (window.__linkedInAutoCaptureLoaded) return;
  window.__linkedInAutoCaptureLoaded = true;

  const autoCaptureController = new AutoCaptureController();
  window.LinkedInAutoCapture = autoCaptureController;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      autoCaptureController.initialize();
    });
  } else {
    autoCaptureController.initialize();
  }

  document.dispatchEvent(
    new CustomEvent('linkedin-auto-capture-ready', {
      detail: { version: '4.0.0' },
    })
  );

  console.log('[AutoCapture] Script loaded (TypeScript)');
})();

export { AutoCaptureController };
