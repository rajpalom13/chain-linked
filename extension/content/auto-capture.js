/**
 * LinkedIn Data Extractor - Auto-Capture Controller
 *
 * Automatically captures analytics data when user navigates to
 * LinkedIn analytics pages. No manual action required.
 *
 * @version 1.0.0
 * @author LinkedIn Data Extractor
 */

(function() {
  'use strict';

  // ============================================
  // CONSTANTS
  // ============================================

  const CAPTURE_DELAY = 2500;           // Wait for page to load (ms)
  const DEBOUNCE_TIME = 300000;         // 5 minutes between same page captures
  const URL_POLL_INTERVAL = 500;        // URL change detection interval (ms)
  const MAX_RETRIES = 3;                // Max extraction retries
  const RETRY_DELAY = 1000;             // Delay between retries (ms)
  const ELEMENT_WAIT_TIMEOUT = 8000;    // Max wait for DOM element (ms)

  // Page type patterns for LinkedIn analytics
  const PAGE_PATTERNS = {
    // Post-specific analytics
    POST_SUMMARY: {
      pattern: /\/analytics\/post-summary\/urn:li:activity:(\d+)/,
      type: 'post_analytics',
      subtype: 'summary'
    },

    // Demographic detail pages
    POST_DEMOGRAPHICS: {
      pattern: /\/analytics\/demographic-detail\/urn:li:activity:(\d+)/,
      type: 'post_demographics',
      subtype: 'post_viewers'
    },
    AUDIENCE_DEMOGRAPHICS: {
      pattern: /\/analytics\/demographic-detail\/urn:li:fsd_profile/,
      type: 'audience_demographics',
      subtype: 'followers'
    },

    // Creator analytics sections
    CREATOR_CONTENT: {
      pattern: /\/analytics\/creator\/content/,
      type: 'creator_analytics',
      subtype: 'content'
    },
    CREATOR_TOP_POSTS: {
      pattern: /\/analytics\/creator\/top-posts/,
      type: 'creator_analytics',
      subtype: 'top_posts'
    },
    CREATOR_AUDIENCE: {
      pattern: /\/analytics\/creator\/audience/,
      type: 'audience_analytics',
      subtype: 'audience'
    },

    // Profile views
    PROFILE_VIEWS: {
      pattern: /\/analytics\/profile-views/,
      type: 'profile_views',
      subtype: 'list'
    },

    // Dashboard page - main analytics overview
    DASHBOARD: {
      pattern: /^\/dashboard\/?$/,
      type: 'creator_analytics',
      subtype: 'dashboard'
    },

    // Profile page pattern - captures follower/connection counts
    PROFILE: {
      pattern: /^\/in\/([^\/]+)\/?$/,
      type: 'profile',
      subtype: 'main'
    },

    // Company page patterns (v4.0 Phase 5)
    COMPANY_PAGE: {
      pattern: /^\/company\/([^\/]+)\/?$/,
      type: 'company_analytics',
      subtype: 'page'
    },
    COMPANY_ANALYTICS: {
      pattern: /^\/company\/([^\/]+)\/analytics/,
      type: 'company_analytics',
      subtype: 'analytics'
    },
    COMPANY_POSTS: {
      pattern: /^\/company\/([^\/]+)\/posts/,
      type: 'content_calendar',
      subtype: 'posts'
    },

    // General analytics fallback
    ANALYTICS_GENERAL: {
      pattern: /\/analytics\//,
      type: 'analytics',
      subtype: 'unknown'
    },

    // Main feed
    FEED: {
      pattern: /^\/feed\/?$/,
      type: 'feed',
      subtype: 'main'
    },

    // Notifications
    NOTIFICATIONS: {
      pattern: /^\/notifications\/?$/,
      type: 'notifications',
      subtype: 'list'
    },

    // Messaging
    MESSAGING: {
      pattern: /^\/messaging\/?/,
      type: 'messaging',
      subtype: 'inbox'
    },

    // My Network
    MY_NETWORK: {
      pattern: /^\/mynetwork\/?$/,
      type: 'network',
      subtype: 'suggestions'
    },

    // Connections list
    CONNECTIONS: {
      pattern: /^\/mynetwork\/connections\/?$/,
      type: 'network',
      subtype: 'connections'
    },

    // Invitations
    INVITATIONS: {
      pattern: /^\/mynetwork\/invitation-manager\/?$/,
      type: 'invitations',
      subtype: 'pending'
    },

    // Jobs
    JOBS: {
      pattern: /^\/jobs\/?$/,
      type: 'jobs',
      subtype: 'feed'
    },

    // Search results
    SEARCH_RESULTS: {
      pattern: /^\/search\/results\//,
      type: 'search',
      subtype: 'results'
    }
  };

  // ============================================
  // AUTO-CAPTURE CONTROLLER CLASS
  // ============================================

  class AutoCaptureController {
    constructor() {
      this.isEnabled = true;
      this.isInitialized = false;
      this.lastUrl = '';
      this.lastCaptures = new Map();
      this.pendingCapture = null;
      this.urlPollInterval = null;
      this.captureStats = {
        total: 0,
        successful: 0,
        failed: 0,
        byType: {}
      };

      // Bind methods to preserve context
      this.handleNavigation = this.handleNavigation.bind(this);
      this.detectPageType = this.detectPageType.bind(this);
      this.captureCurrentPage = this.captureCurrentPage.bind(this);
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    /**
     * Initialize the auto-capture controller
     */
    async initialize() {
      if (this.isInitialized) {
        console.log('[AutoCapture] Already initialized');
        return;
      }

      console.log('[AutoCapture] Initializing...');

      try {
        // Load settings from storage
        await this.loadSettings();

        // Set up navigation listeners
        this.setupNavigationListeners();

        // Store initial URL
        this.lastUrl = window.location.href;

        // Initial capture if on analytics page
        setTimeout(() => {
          this.handleNavigation();
        }, 1000);

        this.isInitialized = true;
        console.log('[AutoCapture] Initialization complete');

      } catch (error) {
        console.error('[AutoCapture] Initialization failed:', error);
      }
    }

    /**
     * Load settings from storage
     */
    async loadSettings() {
      try {
        // Try to get settings from chrome storage via message
        const response = await this.sendMessage({
          type: 'GET_DATA',
          key: 'linkedin_capture_settings'
        });

        if (response && response.data) {
          this.isEnabled = response.data.autoCapture !== false;
          console.log('[AutoCapture] Settings loaded, enabled:', this.isEnabled);
        } else {
          // Default to enabled
          this.isEnabled = true;
          console.log('[AutoCapture] Using default settings, enabled:', this.isEnabled);
        }
      } catch (error) {
        console.warn('[AutoCapture] Could not load settings, using defaults:', error);
        this.isEnabled = true;
      }
    }

    /**
     * Send message to background service worker
     */
    sendMessage(message) {
      return new Promise((resolve, reject) => {
        try {
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
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

    /**
     * Set up all navigation listeners
     */
    setupNavigationListeners() {
      console.log('[AutoCapture] Setting up navigation listeners');

      // 1. History API - pushState
      const originalPushState = history.pushState;
      history.pushState = (...args) => {
        originalPushState.apply(history, args);
        console.log('[AutoCapture] pushState detected');
        this.handleNavigation();
      };

      // 2. History API - replaceState
      const originalReplaceState = history.replaceState;
      history.replaceState = (...args) => {
        originalReplaceState.apply(history, args);
        console.log('[AutoCapture] replaceState detected');
        this.handleNavigation();
      };

      // 3. Popstate event (back/forward buttons)
      window.addEventListener('popstate', () => {
        console.log('[AutoCapture] popstate detected');
        this.handleNavigation();
      });

      // 4. URL polling as backup (for edge cases)
      this.urlPollInterval = setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== this.lastUrl) {
          console.log('[AutoCapture] URL change detected via polling');
          this.lastUrl = currentUrl;
          this.handleNavigation();
        }
      }, URL_POLL_INTERVAL);

      // 5. Page visibility change (tab switch back)
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

    /**
     * Detect the type of analytics page from current URL
     * @returns {Object} Page info with type, subtype, and identifier
     */
    detectPageType() {
      const pathname = window.location.pathname;
      const href = window.location.href;

      // Check each pattern in order (most specific first)
      for (const [name, config] of Object.entries(PAGE_PATTERNS)) {
        const match = pathname.match(config.pattern);
        if (match) {
          const pageInfo = {
            type: config.type,
            subtype: config.subtype,
            patternName: name,
            url: href,
            pathname: pathname,
            identifier: match[1] || null,  // Capture group (e.g., activity ID)
            detectedAt: new Date().toISOString()
          };

          console.log('[AutoCapture] Page detected:', pageInfo.type, pageInfo.subtype);
          return pageInfo;
        }
      }

      // Not an analytics page
      return {
        type: 'non_analytics',
        subtype: null,
        url: href,
        pathname: pathname,
        identifier: null,
        detectedAt: new Date().toISOString()
      };
    }

    // ============================================
    // CAPTURE LOGIC
    // ============================================

    /**
     * Handle navigation event and decide whether to capture
     */
    handleNavigation() {
      // Check if enabled
      if (!this.isEnabled) {
        console.log('[AutoCapture] Disabled, skipping');
        return;
      }

      // Cancel any pending capture
      if (this.pendingCapture) {
        clearTimeout(this.pendingCapture);
        this.pendingCapture = null;
      }

      // Detect page type
      const pageInfo = this.detectPageType();

      // Skip non-analytics pages
      if (pageInfo.type === 'non_analytics') {
        console.log('[AutoCapture] Not an analytics page, skipping');
        return;
      }

      // Check debounce
      const cacheKey = this.getCacheKey(pageInfo);
      if (this.shouldDebounce(cacheKey)) {
        console.log('[AutoCapture] Debounced:', cacheKey);
        return;
      }

      // Schedule capture after delay (wait for page to fully load)
      console.log(`[AutoCapture] Scheduling capture for ${pageInfo.type} in ${CAPTURE_DELAY}ms`);

      this.pendingCapture = setTimeout(() => {
        this.captureCurrentPage(pageInfo);
      }, CAPTURE_DELAY);
    }

    /**
     * Generate cache key for deduplication
     */
    getCacheKey(pageInfo) {
      if (pageInfo.identifier) {
        return `${pageInfo.type}:${pageInfo.subtype}:${pageInfo.identifier}`;
      }
      return `${pageInfo.type}:${pageInfo.subtype}:default`;
    }

    /**
     * Check if we should debounce this capture
     */
    shouldDebounce(cacheKey) {
      const lastCapture = this.lastCaptures.get(cacheKey);
      if (!lastCapture) return false;

      const timeSinceLastCapture = Date.now() - lastCapture;
      return timeSinceLastCapture < DEBOUNCE_TIME;
    }

    /**
     * Main capture function - extracts data from current page
     */
    async captureCurrentPage(pageInfo) {
      console.log(`[AutoCapture] Starting capture for: ${pageInfo.type}/${pageInfo.subtype}`);
      this.captureStats.total++;

      try {
        // Wait for key analytics elements to load
        await this.waitForAnalyticsContent();

        // Extract data based on page type
        let data = null;
        let messageType = null;

        switch (pageInfo.type) {
          case 'creator_analytics':
            data = await this.extractCreatorAnalytics(pageInfo.subtype);
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

          case 'profile':
            data = await this.extractProfile();
            messageType = 'AUTO_CAPTURE_PROFILE';
            break;

          case 'company_analytics':
            data = await this.extractCompanyAnalytics(pageInfo.identifier);
            messageType = 'AUTO_CAPTURE_COMPANY_ANALYTICS';
            break;

          case 'content_calendar':
            data = await this.extractContentCalendar(pageInfo.identifier);
            messageType = 'AUTO_CAPTURE_CONTENT_CALENDAR';
            break;

          case 'feed':
            data = await this.extractFeed();
            messageType = 'AUTO_CAPTURE_FEED';
            break;

          case 'notifications':
            data = await this.extractNotifications();
            messageType = 'AUTO_CAPTURE_NOTIFICATIONS';
            break;

          case 'messaging':
            data = await this.extractMessaging();
            messageType = 'AUTO_CAPTURE_MESSAGING';
            break;

          case 'network':
            data = await this.extractNetwork(pageInfo.subtype);
            messageType = 'AUTO_CAPTURE_NETWORK';
            break;

          case 'invitations':
            data = await this.extractInvitations();
            messageType = 'AUTO_CAPTURE_INVITATIONS';
            break;

          case 'jobs':
            data = await this.extractJobs();
            messageType = 'AUTO_CAPTURE_JOBS';
            break;

          case 'search':
            data = await this.extractSearch();
            messageType = 'AUTO_CAPTURE_SEARCH';
            break;

          default:
            console.log(`[AutoCapture] Unknown page type: ${pageInfo.type}`);
            return;
        }

        // Validate extracted data
        if (!data || Object.keys(data).length === 0) {
          throw new Error('No data extracted');
        }

        // Add metadata
        data.capturedAt = new Date().toISOString();
        data.pageInfo = pageInfo;
        data.captureMethod = 'auto';

        // Send to service worker
        await this.saveCapture(messageType, data);

        // Update debounce cache
        const cacheKey = this.getCacheKey(pageInfo);
        this.lastCaptures.set(cacheKey, Date.now());

        // Update stats
        this.captureStats.successful++;
        this.captureStats.byType[pageInfo.type] = (this.captureStats.byType[pageInfo.type] || 0) + 1;

        console.log(`[AutoCapture] Successfully captured ${pageInfo.type}:`, data);

        // Dispatch event for content script to know
        this.dispatchCaptureEvent(pageInfo.type, data, true);

      } catch (error) {
        console.error(`[AutoCapture] Capture failed for ${pageInfo.type}:`, error);
        this.captureStats.failed++;

        // Log the failure
        await this.logCapture(pageInfo, false, error.message);

        // Dispatch failure event
        this.dispatchCaptureEvent(pageInfo.type, null, false, error.message);
      }
    }

    /**
     * Wait for analytics content to be present in DOM
     */
    waitForAnalyticsContent() {
      return new Promise((resolve, reject) => {
        // Selectors that indicate analytics content is loaded
        const selectors = [
          'main[aria-label*="analytics" i]',
          '[class*="analytics"]',
          '[data-test-id*="analytics"]',
          '.artdeco-card',
          'section'
        ];

        // Check if any selector matches
        const checkContent = () => {
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.length > 100) {
              return true;
            }
          }
          return false;
        };

        // Already present
        if (checkContent()) {
          resolve();
          return;
        }

        // Set up observer
        const observer = new MutationObserver((mutations, obs) => {
          if (checkContent()) {
            obs.disconnect();
            resolve();
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });

        // Timeout
        setTimeout(() => {
          observer.disconnect();
          // Resolve anyway - let extraction try
          resolve();
        }, ELEMENT_WAIT_TIMEOUT);
      });
    }

    /**
     * Save captured data to storage via service worker
     */
    async saveCapture(messageType, data) {
      try {
        console.log(`[AutoCapture] Sending ${messageType} to service worker...`);
        console.log(`[AutoCapture] Data being sent:`, JSON.stringify({
          followers_count: data.followers_count,
          followerCount: data.followerCount,
          connections_count: data.connections_count,
          connectionCount: data.connectionCount,
          headline: data.headline?.substring(0, 50)
        }));

        const response = await this.sendMessage({
          type: messageType,
          data: data
        });

        console.log(`[AutoCapture] Response from service worker:`, JSON.stringify(response));

        if (response && response.success) {
          console.log(`[AutoCapture] Data saved successfully via ${messageType}`);

          // Check sync status after save
          try {
            const syncStatus = await this.sendMessage({ type: 'SUPABASE_SYNC_STATUS' });
            console.log(`[AutoCapture] Sync status:`, JSON.stringify(syncStatus?.data || syncStatus));

            // Force a sync if there are pending changes
            if (syncStatus?.data?.pendingCount > 0) {
              console.log(`[AutoCapture] Forcing sync for ${syncStatus.data.pendingCount} pending changes...`);
              const syncResult = await this.sendMessage({ type: 'SUPABASE_SYNC_NOW' });
              console.log(`[AutoCapture] Sync result:`, JSON.stringify(syncResult));
            }
          } catch (e) {
            console.log(`[AutoCapture] Could not get sync status:`, e.message);
          }

          return response;
        } else {
          throw new Error(response?.error || 'Save failed');
        }
      } catch (error) {
        console.error('[AutoCapture] Failed to save data:', error);
        throw error;
      }
    }

    /**
     * Log capture event for debugging/stats
     */
    async logCapture(pageInfo, success, errorMessage = null) {
      try {
        await this.sendMessage({
          type: 'AUTO_CAPTURE_LOG',
          data: {
            timestamp: new Date().toISOString(),
            pageType: pageInfo.type,
            subtype: pageInfo.subtype,
            url: pageInfo.url,
            success: success,
            error: errorMessage
          }
        });
      } catch (error) {
        console.warn('[AutoCapture] Failed to log capture:', error);
      }
    }

    /**
     * Dispatch custom event for other scripts to listen
     */
    dispatchCaptureEvent(pageType, data, success, error = null) {
      const event = new CustomEvent('auto-capture-complete', {
        detail: {
          pageType: pageType,
          data: data,
          success: success,
          error: error,
          timestamp: new Date().toISOString()
        }
      });
      document.dispatchEvent(event);
    }

    // ============================================
    // DATA EXTRACTORS (Phase 2 - Using DOM Extractors)
    // ============================================

    /**
     * Extract Creator Analytics data
     * @param {string} subtype - 'content', 'top_posts', etc.
     */
    async extractCreatorAnalytics(subtype) {
      console.log(`[AutoCapture] Extracting creator analytics: ${subtype}`);

      // Use DOM extractor (primary method)
      if (window.LinkedInDOMExtractor && typeof window.LinkedInDOMExtractor.extractCreatorAnalytics === 'function') {
        const data = window.LinkedInDOMExtractor.extractCreatorAnalytics();
        if (data && (data.impressions || data.membersReached || data.topPosts)) {
          data.subtype = subtype;
          return data;
        }
      }

      // Fallback to basic extraction if DOM extractor fails
      console.log('[AutoCapture] DOM extractor failed, using fallback');
      return this.basicCreatorAnalyticsExtraction();
    }

    /**
     * Extract Post Analytics data
     * @param {string} activityId - The activity/post ID
     */
    async extractPostAnalytics(activityId) {
      console.log(`[AutoCapture] Extracting post analytics: ${activityId}`);

      // Use DOM extractor (primary method)
      if (window.LinkedInDOMExtractor && typeof window.LinkedInDOMExtractor.extractPostAnalyticsData === 'function') {
        const data = window.LinkedInDOMExtractor.extractPostAnalyticsData();
        if (data && (data.impressions || data.engagement)) {
          // Ensure activityUrn is set
          if (!data.activityUrn && activityId) {
            data.activityUrn = `urn:li:activity:${activityId}`;
          }
          return data;
        }
      }

      // Fallback to basic extraction
      console.log('[AutoCapture] DOM extractor failed, using fallback');
      return this.basicPostAnalyticsExtraction(activityId);
    }

    /**
     * Extract Audience Analytics data
     */
    async extractAudienceAnalytics() {
      console.log('[AutoCapture] Extracting audience analytics');

      // Use DOM extractor (primary method)
      if (window.LinkedInDOMExtractor && typeof window.LinkedInDOMExtractor.extractAudienceAnalytics === 'function') {
        const data = window.LinkedInDOMExtractor.extractAudienceAnalytics();
        if (data && (data.totalFollowers || data.followerGrowth)) {
          return data;
        }
      }

      // Fallback to basic extraction
      console.log('[AutoCapture] DOM extractor failed, using fallback');
      return this.basicAudienceExtraction();
    }

    /**
     * Extract Audience Demographics detail
     */
    async extractAudienceDemographics() {
      console.log('[AutoCapture] Extracting audience demographics');

      // Use DOM extractor (primary method)
      if (window.LinkedInDOMExtractor && typeof window.LinkedInDOMExtractor.extractAudienceDemographics === 'function') {
        const data = window.LinkedInDOMExtractor.extractAudienceDemographics();
        if (data && data.demographics) {
          const hasData = Object.values(data.demographics).some(arr => arr.length > 0);
          if (hasData) {
            return data;
          }
        }
      }

      // Fallback to basic extraction
      console.log('[AutoCapture] DOM extractor failed, using fallback');
      return this.basicDemographicsExtraction();
    }

    /**
     * Extract Post Demographics detail
     */
    async extractPostDemographics(activityId) {
      console.log(`[AutoCapture] Extracting post demographics: ${activityId}`);

      // Use DOM extractor (primary method)
      if (window.LinkedInDOMExtractor && typeof window.LinkedInDOMExtractor.extractAudienceDemographics === 'function') {
        const data = window.LinkedInDOMExtractor.extractAudienceDemographics();
        if (data && data.demographics) {
          // Add post identifier
          if (activityId) {
            data.activityId = activityId;
            data.activityUrn = `urn:li:activity:${activityId}`;
          }
          const hasData = Object.values(data.demographics).some(arr => arr.length > 0);
          if (hasData) {
            return data;
          }
        }
      }

      // Fallback to basic extraction
      console.log('[AutoCapture] DOM extractor failed, using fallback');
      return this.basicDemographicsExtraction();
    }

    /**
     * Extract Profile Views data
     */
    async extractProfileViews() {
      console.log('[AutoCapture] Extracting profile views');

      // Use DOM extractor (primary method)
      if (window.LinkedInDOMExtractor && typeof window.LinkedInDOMExtractor.extractProfileViewsData === 'function') {
        const data = window.LinkedInDOMExtractor.extractProfileViewsData();
        if (data && (data.totalViews || data.viewers?.length > 0)) {
          return data;
        }
      }

      // Fallback to basic extraction
      console.log('[AutoCapture] DOM extractor failed, using fallback');
      return this.basicProfileViewsExtraction();
    }

    /**
     * Extract profile data (follower/connection counts)
     */
    async extractProfile() {
      console.log('[AutoCapture] Extracting profile data');

      // Use DOM extractor if available
      if (window.LinkedInDOMExtractor && typeof window.LinkedInDOMExtractor.extractProfileData === 'function') {
        const data = window.LinkedInDOMExtractor.extractProfileData();
        // Check for name OR any follower/connection field (dom-extractor uses 'followers'/'connections')
        if (data && (data.name || data.followers_count || data.followers || data.followerCount)) {
          // Normalize field names - ensure both camelCase and snake_case variants exist
          const normalizedData = {
            ...data,
            // Follower aliases (dom-extractor uses 'followers', basic uses 'followerCount')
            followers_count: data.followers_count || data.followers || data.followerCount || 0,
            followerCount: data.followerCount || data.followers || data.followers_count || 0,
            // Connection aliases (dom-extractor uses 'connections', basic uses 'connectionCount')
            connections_count: data.connections_count || data.connections || data.connectionCount || 0,
            connectionCount: data.connectionCount || data.connections || data.connections_count || 0,
            pageType: 'profile',
            extractedAt: new Date().toISOString(),
            source: 'dom',
            url: window.location.href
          };
          console.log('[AutoCapture] DOM extractor result normalized:', {
            followers_count: normalizedData.followers_count,
            connections_count: normalizedData.connections_count,
            name: normalizedData.name
          });
          return normalizedData;
        }
      }

      // Fallback to basic extraction
      console.log('[AutoCapture] DOM extractor failed, using fallback');
      return this.basicProfileExtraction();
    }

    /**
     * Extract company analytics data
     */
    async extractCompanyAnalytics(companyId) {
      console.log('[AutoCapture] Extracting company analytics for:', companyId);

      // Use company extractor if available
      if (window.LinkedInCompanyExtractor && typeof window.LinkedInCompanyExtractor.extractCompanyAnalytics === 'function') {
        const data = window.LinkedInCompanyExtractor.extractCompanyAnalytics();
        if (data && data.followers) {
          return {
            ...data,
            companyId: companyId,
            pageType: 'company_analytics',
            extractedAt: new Date().toISOString(),
            source: 'dom',
            url: window.location.href
          };
        }
      }

      console.log('[AutoCapture] Company extractor failed');
      return null;
    }

    /**
     * Extract content calendar data
     */
    async extractContentCalendar(companyId) {
      console.log('[AutoCapture] Extracting content calendar for:', companyId);

      // Use company extractor if available
      if (window.LinkedInCompanyExtractor && typeof window.LinkedInCompanyExtractor.extractContentCalendar === 'function') {
        const data = window.LinkedInCompanyExtractor.extractContentCalendar();
        if (data && data.items) {
          return {
            ...data,
            companyId: companyId,
            pageType: 'content_calendar',
            extractedAt: new Date().toISOString(),
            source: 'dom',
            url: window.location.href
          };
        }
      }

      console.log('[AutoCapture] Content calendar extractor failed');
      return null;
    }

    // ============================================
    // BASIC EXTRACTORS (Fallback implementations)
    // ============================================

    /**
     * Basic extraction for creator analytics
     */
    basicCreatorAnalyticsExtraction() {
      const data = {
        pageType: 'creator_analytics',
        extractedAt: new Date().toISOString()
      };

      const bodyText = document.body.innerText;

      // Match "33\nPost impressions" pattern on dashboard
      const impressionsMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*(?:Post\s+)?impressions/i);
      if (impressionsMatch) {
        data.impressions = parseInt(impressionsMatch[1].replace(/,/g, ''), 10);
      }

      // Match "263\nFollowers" pattern on dashboard -> newFollowers for db mapping
      const followersMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*Followers/i);
      if (followersMatch) {
        data.newFollowers = parseInt(followersMatch[1].replace(/,/g, ''), 10);
      }

      // Match "95\nProfile viewers" pattern on dashboard -> profileViews for db mapping
      const profileViewersMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*Profile\s+viewers/i);
      if (profileViewersMatch) {
        data.profileViews = parseInt(profileViewersMatch[1].replace(/,/g, ''), 10);
      }

      // Match "44\nSearch appearances" pattern on dashboard
      const searchAppearancesMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*Search\s+appearances/i);
      if (searchAppearancesMatch) {
        data.searchAppearances = parseInt(searchAppearancesMatch[1].replace(/,/g, ''), 10);
      }

      // Match growth percentage like "64.2% past 7 days"
      const impressionGrowthMatch = bodyText.match(/([▼▲]?)(\d+(?:\.\d+)?%)\s*past\s+7\s+days/i);
      if (impressionGrowthMatch) {
        const isNegative = impressionGrowthMatch[1] === '▼' || impressionGrowthMatch[1] === '';
        const value = parseFloat(impressionGrowthMatch[2]);
        data.impressionGrowth = isNegative ? -value : value;
      }

      // Look for members reached
      const membersMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*Members reached/i);
      if (membersMatch) {
        data.membersReached = parseInt(membersMatch[1].replace(/,/g, ''), 10);
      }

      // Look for growth percentage vs prior
      const growthMatch = bodyText.match(/([+-]?\d+(?:\.\d+)?%)\s*vs\.?\s*prior/i);
      if (growthMatch) {
        data.growth = growthMatch[1];
      }

      return data;
    }

    /**
     * Basic extraction for post analytics
     */
    basicPostAnalyticsExtraction(activityId) {
      const data = {
        pageType: 'post_analytics',
        activityUrn: activityId ? `urn:li:activity:${activityId}` : null,
        extractedAt: new Date().toISOString(),
        discovery: {},
        profileActivity: {},
        socialEngagement: {},
        demographics: []
      };

      const bodyText = document.body.innerText;

      // Discovery metrics
      const impressionsMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*Impressions/i);
      if (impressionsMatch) {
        data.discovery.impressions = parseInt(impressionsMatch[1].replace(/,/g, ''), 10);
      }

      const membersMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*Members reached/i);
      if (membersMatch) {
        data.discovery.membersReached = parseInt(membersMatch[1].replace(/,/g, ''), 10);
      }

      // Engagement metrics - look for list items
      const lists = document.querySelectorAll('li');
      lists.forEach(li => {
        const text = li.textContent;

        if (text.includes('Reactions')) {
          const match = text.match(/(\d+)/);
          if (match) data.socialEngagement.reactions = parseInt(match[1], 10);
        }
        if (text.includes('Comments') && !text.includes('comment on')) {
          const match = text.match(/(\d+)/);
          if (match) data.socialEngagement.comments = parseInt(match[1], 10);
        }
        if (text.includes('Reposts')) {
          const match = text.match(/(\d+)/);
          if (match) data.socialEngagement.reposts = parseInt(match[1], 10);
        }
        if (text.includes('Profile viewers from this post')) {
          const match = text.match(/(\d+)/);
          if (match) data.profileActivity.profileViewers = parseInt(match[1], 10);
        }
        if (text.includes('Followers gained')) {
          const match = text.match(/(\d+)/);
          if (match) data.profileActivity.followersGained = parseInt(match[1], 10);
        }
      });

      // Calculate engagement rate
      const totalEngagement = (data.socialEngagement.reactions || 0) +
                             (data.socialEngagement.comments || 0) +
                             (data.socialEngagement.reposts || 0);
      if (data.discovery.impressions > 0) {
        data.engagementRate = ((totalEngagement / data.discovery.impressions) * 100).toFixed(2);
      }

      return data;
    }

    /**
     * Basic extraction for audience data
     */
    basicAudienceExtraction() {
      const data = {
        pageType: 'audience_analytics',
        extractedAt: new Date().toISOString()
      };

      const bodyText = document.body.innerText;

      // Total followers
      const followersMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*Total followers/i);
      if (followersMatch) {
        data.totalFollowers = parseInt(followersMatch[1].replace(/,/g, ''), 10);
      }

      // Growth
      const growthMatch = bodyText.match(/([+-]?\d+(?:\.\d+)?%)\s*vs\.?\s*prior/i);
      if (growthMatch) {
        data.followerGrowth = growthMatch[1];
      }

      return data;
    }

    /**
     * Basic extraction for demographics
     */
    basicDemographicsExtraction() {
      const data = {
        pageType: 'demographics',
        extractedAt: new Date().toISOString(),
        demographics: {
          industries: [],
          locations: [],
          seniority: [],
          companies: []
        }
      };

      // Look for demographic sections
      const sections = document.querySelectorAll('[class*="section"], .artdeco-card');

      sections.forEach(section => {
        const heading = section.querySelector('h2, h3, [class*="heading"]');
        if (!heading) return;

        const headingText = heading.textContent.toLowerCase();
        const items = section.querySelectorAll('li');

        items.forEach(item => {
          const text = item.textContent;
          const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
          if (!percentMatch) return;

          const percentage = parseFloat(percentMatch[1]);
          const value = text.replace(/\d+(?:\.\d+)?\s*%.*/, '').trim();

          if (headingText.includes('industry')) {
            data.demographics.industries.push({ value, percentage });
          } else if (headingText.includes('location')) {
            data.demographics.locations.push({ value, percentage });
          } else if (headingText.includes('seniority') || headingText.includes('experience')) {
            data.demographics.seniority.push({ value, percentage });
          } else if (headingText.includes('company')) {
            data.demographics.companies.push({ value, percentage });
          }
        });
      });

      return data;
    }

    /**
     * Basic extraction for profile views
     */
    basicProfileViewsExtraction() {
      const data = {
        pageType: 'profile_views',
        extractedAt: new Date().toISOString(),
        viewers: []
      };

      const bodyText = document.body.innerText;

      // Total views
      const viewsMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:profile)?\s*view/i);
      if (viewsMatch) {
        data.totalViews = parseInt(viewsMatch[1].replace(/,/g, ''), 10);
      }

      return data;
    }

    /**
     * Basic extraction for profile page (fallback)
     */
    basicProfileExtraction() {
      console.log('[AutoCapture] Basic profile extraction');

      // Extract publicIdentifier from URL
      const urlMatch = window.location.pathname.match(/\/in\/([^\/]+)/);
      const publicIdentifier = urlMatch ? urlMatch[1] : '';

      const data = {
        pageType: 'profile',
        capturedAt: Date.now(),
        source: 'basic-dom',
        url: window.location.href,
        // Required fields for ProfileData type
        memberUrn: `urn:li:member:${publicIdentifier}`,
        publicIdentifier: publicIdentifier,
        firstName: '',
        lastName: ''
      };

      // Extract name from page title or h1
      const nameElement = document.querySelector('h1.text-heading-xlarge') ||
        document.querySelector('h1[data-anonymize="person-name"]') ||
        document.querySelector('.pv-text-details__left-panel h1');
      if (nameElement) {
        const fullName = nameElement.textContent.trim();
        const nameParts = fullName.split(' ');
        data.firstName = nameParts[0] || '';
        data.lastName = nameParts.slice(1).join(' ') || '';
        data.name = fullName; // Keep for backwards compatibility
      }

      // Extract headline
      const headlineElement = document.querySelector('.text-body-medium.break-words') ||
        document.querySelector('[data-anonymize="headline"]') ||
        document.querySelector('.pv-text-details__left-panel .text-body-medium');
      if (headlineElement) {
        data.headline = headlineElement.textContent.trim();
      }

      // Extract follower/connection counts from the page text
      // NOTE: LinkedIn modifies RegExp - must use [0-9] instead of \d and avoid 'i' flag
      const bodyText = document.body.innerText;

      // Look for followers pattern (use [0-9] and no 'i' flag due to LinkedIn RegExp modifications)
      const followersRegex = new RegExp('([0-9,]+) followers');
      const followersMatch = bodyText.match(followersRegex);
      if (followersMatch) {
        const count = parseInt(followersMatch[1].replace(/,/g, ''), 10);
        data.followerCount = count;
        data.followers_count = count; // Alias for trend tracking
      }

      // Look for connections pattern
      const connectionsRegex = new RegExp('([0-9,]+) connections');
      const connectionsMatch = bodyText.match(connectionsRegex);
      if (connectionsMatch) {
        data.connectionCount = parseInt(connectionsMatch[1].replace(/,/g, ''), 10);
        data.connections_count = parseInt(connectionsMatch[1].replace(/,/g, ''), 10);
      }

      console.log('[AutoCapture] Basic profile extraction result:', data);
      return data;
    }

    // ============================================
    // ADDITIONAL PAGE EXTRACTORS
    // ============================================

    /**
     * Extract feed page data (basic capture)
     * @returns {Object} Feed page metadata and basic content
     */
    async extractFeed() {
      console.log('[AutoCapture] Extracting feed data');

      const data = {
        pageType: 'feed',
        url: window.location.href,
        extractedAt: new Date().toISOString(),
        source: 'auto-capture'
      };

      // Count visible posts
      const postElements = document.querySelectorAll('[data-urn*="activity"], [data-urn*="ugcPost"], .feed-shared-update-v2');
      data.visiblePostCount = postElements.length;

      // Get basic page state
      const bodyText = document.body.innerText;

      // Try to extract any visible engagement counts
      const postsWithUrns = [];
      postElements.forEach((el, index) => {
        if (index >= 10) return; // Limit to first 10 posts
        const urn = el.getAttribute('data-urn');
        if (urn) {
          postsWithUrns.push(urn);
        }
      });
      data.capturedUrns = postsWithUrns;

      console.log('[AutoCapture] Feed extraction result:', data);
      return data;
    }

    /**
     * Extract notifications page data
     * @returns {Object} Notifications page metadata
     */
    async extractNotifications() {
      console.log('[AutoCapture] Extracting notifications data');

      const data = {
        pageType: 'notifications',
        url: window.location.href,
        extractedAt: new Date().toISOString(),
        source: 'auto-capture'
      };

      // Count notification items
      const notificationElements = document.querySelectorAll('.nt-card, [class*="notification"], .artdeco-list__item');
      data.visibleNotificationCount = notificationElements.length;

      // Try to get unread count from nav badge
      const badgeElement = document.querySelector('[data-notification-badge], .notification-badge, [class*="badge"]');
      if (badgeElement) {
        const badgeText = badgeElement.textContent.trim();
        const badgeNumber = parseInt(badgeText.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(badgeNumber)) {
          data.unreadCount = badgeNumber;
        }
      }

      console.log('[AutoCapture] Notifications extraction result:', data);
      return data;
    }

    /**
     * Extract messaging page data
     * @returns {Object} Messaging page metadata
     */
    async extractMessaging() {
      console.log('[AutoCapture] Extracting messaging data');

      const data = {
        pageType: 'messaging',
        url: window.location.href,
        extractedAt: new Date().toISOString(),
        source: 'auto-capture'
      };

      // Count conversation threads
      const conversationElements = document.querySelectorAll('.msg-conversation-listitem, [class*="conversation-item"]');
      data.visibleConversationCount = conversationElements.length;

      // Try to get unread count
      const unreadBadge = document.querySelector('[data-test-id="messaging-unread-count"], .msg-overlay-list-bubble__unread-count');
      if (unreadBadge) {
        const unreadText = unreadBadge.textContent.trim();
        const unreadNumber = parseInt(unreadText.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(unreadNumber)) {
          data.unreadCount = unreadNumber;
        }
      }

      console.log('[AutoCapture] Messaging extraction result:', data);
      return data;
    }

    /**
     * Extract network page data (My Network, connections, suggestions)
     * @param {string} subtype - 'suggestions' or 'connections'
     * @returns {Object} Network page metadata
     */
    async extractNetwork(subtype) {
      console.log('[AutoCapture] Extracting network data, subtype:', subtype);

      const data = {
        pageType: 'network',
        subtype: subtype,
        url: window.location.href,
        extractedAt: new Date().toISOString(),
        source: 'auto-capture'
      };

      if (subtype === 'connections') {
        // Count connections list items
        const connectionElements = document.querySelectorAll('.mn-connection-card, [class*="connection-card"]');
        data.visibleConnectionCount = connectionElements.length;

        // Try to get total connections from page
        const bodyText = document.body.innerText;
        const totalMatch = bodyText.match(new RegExp('([0-9,]+) Connections'));
        if (totalMatch) {
          data.totalConnections = parseInt(totalMatch[1].replace(/,/g, ''), 10);
        }
      } else {
        // Suggestions page
        const suggestionElements = document.querySelectorAll('.discover-entity-card, [class*="pymk-card"]');
        data.visibleSuggestionCount = suggestionElements.length;
      }

      console.log('[AutoCapture] Network extraction result:', data);
      return data;
    }

    /**
     * Extract invitations page data
     * @returns {Object} Invitations page metadata
     */
    async extractInvitations() {
      console.log('[AutoCapture] Extracting invitations data');

      const data = {
        pageType: 'invitations',
        url: window.location.href,
        extractedAt: new Date().toISOString(),
        source: 'auto-capture'
      };

      // Count invitation cards
      const invitationElements = document.querySelectorAll('.invitation-card, [class*="invitation-card"]');
      data.visibleInvitationCount = invitationElements.length;

      // Look for pending count in page
      const bodyText = document.body.innerText;
      const pendingMatch = bodyText.match(new RegExp('([0-9,]+) pending'));
      if (pendingMatch) {
        data.pendingCount = parseInt(pendingMatch[1].replace(/,/g, ''), 10);
      }

      console.log('[AutoCapture] Invitations extraction result:', data);
      return data;
    }

    /**
     * Extract jobs page data
     * @returns {Object} Jobs page metadata
     */
    async extractJobs() {
      console.log('[AutoCapture] Extracting jobs data');

      const data = {
        pageType: 'jobs',
        url: window.location.href,
        extractedAt: new Date().toISOString(),
        source: 'auto-capture'
      };

      // Count job cards
      const jobElements = document.querySelectorAll('.jobs-search-results__list-item, [class*="job-card"]');
      data.visibleJobCount = jobElements.length;

      // Try to get total results
      const resultsElement = document.querySelector('.jobs-search-results-list__subtitle, [class*="results-count"]');
      if (resultsElement) {
        const resultsText = resultsElement.textContent.trim();
        const totalMatch = resultsText.match(new RegExp('([0-9,]+)'));
        if (totalMatch) {
          data.totalResults = parseInt(totalMatch[1].replace(/,/g, ''), 10);
        }
      }

      console.log('[AutoCapture] Jobs extraction result:', data);
      return data;
    }

    /**
     * Extract search results page data
     * @returns {Object} Search results page metadata
     */
    async extractSearch() {
      console.log('[AutoCapture] Extracting search data');

      const data = {
        pageType: 'search',
        url: window.location.href,
        extractedAt: new Date().toISOString(),
        source: 'auto-capture'
      };

      // Determine search type from URL
      const urlParams = new URLSearchParams(window.location.search);
      const pathname = window.location.pathname;

      if (pathname.includes('/people')) {
        data.searchType = 'people';
      } else if (pathname.includes('/companies')) {
        data.searchType = 'companies';
      } else if (pathname.includes('/posts') || pathname.includes('/content')) {
        data.searchType = 'content';
      } else if (pathname.includes('/jobs')) {
        data.searchType = 'jobs';
      } else {
        data.searchType = 'all';
      }

      // Get search keywords
      const keywords = urlParams.get('keywords');
      if (keywords) {
        data.searchQuery = keywords;
      }

      // Count result items
      const resultElements = document.querySelectorAll('.search-results__list li, [class*="search-result"]');
      data.visibleResultCount = resultElements.length;

      // Try to get total results
      const totalElement = document.querySelector('.search-results__total, [class*="results-count"]');
      if (totalElement) {
        const totalText = totalElement.textContent.trim();
        const totalMatch = totalText.match(new RegExp('([0-9,]+)'));
        if (totalMatch) {
          data.totalResults = parseInt(totalMatch[1].replace(/,/g, ''), 10);
        }
      }

      console.log('[AutoCapture] Search extraction result:', data);
      return data;
    }

    // ============================================
    // PUBLIC API
    // ============================================

    /**
     * Enable auto-capture
     */
    enable() {
      this.isEnabled = true;
      console.log('[AutoCapture] Enabled');
      this.handleNavigation(); // Check current page
    }

    /**
     * Disable auto-capture
     */
    disable() {
      this.isEnabled = false;
      if (this.pendingCapture) {
        clearTimeout(this.pendingCapture);
        this.pendingCapture = null;
      }
      console.log('[AutoCapture] Disabled');
    }

    /**
     * Get capture statistics
     */
    getStats() {
      return { ...this.captureStats };
    }

    /**
     * Force capture of current page (bypass debounce)
     */
    forceCapture() {
      const pageInfo = this.detectPageType();
      if (pageInfo.type !== 'non_analytics') {
        this.captureCurrentPage(pageInfo);
      }
    }

    /**
     * Cleanup when controller is destroyed
     */
    destroy() {
      if (this.urlPollInterval) {
        clearInterval(this.urlPollInterval);
      }
      if (this.pendingCapture) {
        clearTimeout(this.pendingCapture);
      }
      this.isInitialized = false;
      console.log('[AutoCapture] Destroyed');
    }

    /**
     * Debug: Clear all pending sync changes
     */
    async debugClearPending() {
      console.log('[AutoCapture] Clearing pending changes...');
      const result = await this.sendMessage({ type: 'DEBUG_CLEAR_PENDING' });
      console.log('[AutoCapture] Clear result:', result);
      return result;
    }

    /**
     * Debug: Get pending sync changes
     */
    async debugGetPending() {
      console.log('[AutoCapture] Getting pending changes...');
      const result = await this.sendMessage({ type: 'DEBUG_GET_PENDING' });
      console.log('[AutoCapture] Pending changes:', result);
      return result;
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  // Create global instance
  const autoCaptureController = new AutoCaptureController();

  // Export to window for access by other scripts
  window.LinkedInAutoCapture = autoCaptureController;

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      autoCaptureController.initialize();
    });
  } else {
    autoCaptureController.initialize();
  }

  // Dispatch ready event
  document.dispatchEvent(new CustomEvent('linkedin-auto-capture-ready', {
    detail: { version: '1.0.0' }
  }));

  console.log('[AutoCapture] Script loaded');

})();
