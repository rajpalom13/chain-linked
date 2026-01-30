/**
 * LinkedIn Data Extractor - Company Page Extractor
 * Extracts company page analytics and information
 */

(function() {
  'use strict';

  // ============================================
  // COMPANY PAGE DETECTION
  // ============================================

  /**
   * Detect if current page is a company page and get info
   */
  function detectCompanyPage() {
    const pathname = window.location.pathname;
    const href = window.location.href;

    // Company page patterns
    const patterns = {
      company_page: /^\/company\/([^\/]+)\/?$/,
      company_analytics: /^\/company\/([^\/]+)\/analytics\/?/,
      company_admin: /^\/company\/([^\/]+)\/admin\/?/,
      content_posts: /^\/company\/([^\/]+)\/posts\/?/,
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      const match = pathname.match(pattern);
      if (match) {
        const companyId = match[1];
        const companyName = extractCompanyName();

        return {
          type: type,
          companyId: companyId,
          companyName: companyName,
          url: href,
        };
      }
    }

    return null;
  }

  /**
   * Extract company name from page
   */
  function extractCompanyName() {
    const selectors = [
      'h1.org-top-card-summary__title',
      'h1[class*="org-top-card"]',
      '.org-top-card-summary__title span',
      '[data-test-id="org-name"]',
      'h1.t-24',
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    // Fallback: try to get from page title
    const title = document.title;
    const match = title.match(/^(.+?)\s*[|\-–]/);
    if (match) {
      return match[1].trim();
    }

    return null;
  }

  // ============================================
  // COMPANY ANALYTICS EXTRACTION
  // ============================================

  /**
   * Extract company analytics data from the page
   */
  function extractCompanyAnalytics() {
    const pageInfo = detectCompanyPage();
    if (!pageInfo || !pageInfo.companyId) {
      console.log('[CompanyExtractor] Not a company page or missing ID');
      return null;
    }

    const data = {
      companyId: pageInfo.companyId,
      companyName: pageInfo.companyName || pageInfo.companyId,
      companyUrl: pageInfo.url,
      capturedAt: Date.now(),
      followers: 0,
    };

    // Extract from company page
    extractCompanyStats(data);
    extractCompanyInfo(data);

    // If on analytics page, extract analytics-specific data
    if (pageInfo.type === 'company_analytics') {
      extractAnalyticsPageData(data);
    }

    return data;
  }

  /**
   * Extract follower count and other stats
   */
  function extractCompanyStats(data) {
    const bodyText = document.body.innerText;

    // Followers
    const followersPatterns = [
      /(\d{1,3}(?:,\d{3})*|\d+)\s*followers/i,
      /followers?\s*(\d{1,3}(?:,\d{3})*|\d+)/i,
    ];

    for (const pattern of followersPatterns) {
      const match = bodyText.match(pattern);
      if (match) {
        data.followers = parseInt(match[1].replace(/,/g, ''), 10);
        break;
      }
    }

    // Employees
    const employeesMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*employees?\s*on\s*linkedin/i);
    if (employeesMatch) {
      data.employees = parseInt(employeesMatch[1].replace(/,/g, ''), 10);
    }

    // Try to get from structured elements
    const statsElements = document.querySelectorAll('[class*="org-top-card"] li, .org-top-card-summary-info-list__info-item');
    statsElements.forEach((el) => {
      const text = el.textContent || '';

      const followersMatch = text.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*followers/i);
      if (followersMatch && data.followers === 0) {
        data.followers = parseInt(followersMatch[1].replace(/,/g, ''), 10);
      }

      const employeesMatch = text.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*employees/i);
      if (employeesMatch && !data.employees) {
        data.employees = parseInt(employeesMatch[1].replace(/,/g, ''), 10);
      }
    });
  }

  /**
   * Extract company information (industry, size, etc.)
   */
  function extractCompanyInfo(data) {
    // Industry
    const industrySelectors = [
      '.org-top-card-summary-info-list__info-item:first-child',
      '[data-test-id="org-industry"]',
      '.org-about-us-organization-description__industry',
    ];

    for (const selector of industrySelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent && element.textContent.trim()) {
        data.industry = element.textContent.trim();
        break;
      }
    }

    // Headquarters
    const hqSelectors = [
      '.org-top-card-summary-info-list__info-item:nth-child(2)',
      '[data-test-id="org-headquarters"]',
    ];

    for (const selector of hqSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent && element.textContent.trim()) {
        data.headquarters = element.textContent.trim();
        break;
      }
    }

    // Company size and founded year
    const aboutSection = document.querySelector('.org-about-us-organization-description, [class*="about-us"]');
    if (aboutSection) {
      const text = aboutSection.textContent || '';

      const sizeMatch = text.match(/(\d+-\d+|\d+\+?)\s*employees/i);
      if (sizeMatch) {
        data.companySize = sizeMatch[1] + ' employees';
      }

      const foundedMatch = text.match(/founded\s*(?:in\s*)?(\d{4})/i);
      if (foundedMatch) {
        data.founded = foundedMatch[1];
      }
    }

    // Specialties
    const specialtiesElement = document.querySelector('[class*="specialties"], [data-test-id="org-specialties"]');
    if (specialtiesElement && specialtiesElement.textContent) {
      const text = specialtiesElement.textContent.replace(/specialties:?/i, '').trim();
      data.specialties = text.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  /**
   * Extract data from company analytics page
   */
  function extractAnalyticsPageData(data) {
    const bodyText = document.body.innerText;

    // Page views
    const pageViewsMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*page\s*views?/i);
    if (pageViewsMatch) {
      data.pageViews = parseInt(pageViewsMatch[1].replace(/,/g, ''), 10);
    }

    // Unique visitors
    const visitorsMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*unique\s*visitors?/i);
    if (visitorsMatch) {
      data.uniqueVisitors = parseInt(visitorsMatch[1].replace(/,/g, ''), 10);
    }

    // Custom button clicks
    const clicksMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:custom\s*button\s*)?clicks?/i);
    if (clicksMatch) {
      data.customButtonClicks = parseInt(clicksMatch[1].replace(/,/g, ''), 10);
    }

    // Updates/posts count
    const updatesMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:updates?|posts?)/i);
    if (updatesMatch) {
      data.updates = parseInt(updatesMatch[1].replace(/,/g, ''), 10);
    }
  }

  // ============================================
  // CONTENT CALENDAR EXTRACTION
  // ============================================

  /**
   * Extract content calendar data (past posts)
   */
  function extractContentCalendar() {
    const items = [];

    // Find all post items on the page
    const postSelectors = [
      '.org-update-posted-update-container',
      '[data-test-id="update-container"]',
      '.feed-shared-update-v2',
      '.occludable-update',
      '[class*="update-components-actor"]',
    ];

    let postElements = null;
    for (const selector of postSelectors) {
      postElements = document.querySelectorAll(selector);
      if (postElements.length > 0) break;
    }

    if (!postElements || postElements.length === 0) {
      console.log('[CompanyExtractor] No posts found');
      return null;
    }

    postElements.forEach((postEl, index) => {
      const item = extractPostItem(postEl, index);
      if (item) {
        items.push(item);
      }
    });

    if (items.length === 0) {
      return null;
    }

    return {
      items: items,
      capturedAt: Date.now(),
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
      },
    };
  }

  /**
   * Extract a single post item
   */
  function extractPostItem(postEl, index) {
    const item = {
      id: 'post-' + index + '-' + Date.now(),
      type: 'post',
      status: 'published',
    };

    // Get post text/title
    const textSelectors = [
      '.feed-shared-update-v2__description',
      '.update-components-text',
      '.feed-shared-text',
      '[data-test-id="update-text"]',
    ];

    for (const selector of textSelectors) {
      const textEl = postEl.querySelector(selector);
      if (textEl && textEl.textContent && textEl.textContent.trim()) {
        const text = textEl.textContent.trim();
        item.content = text;
        item.title = text.substring(0, 100) + (text.length > 100 ? '...' : '');
        break;
      }
    }

    // Detect post type
    if (postEl.querySelector('[class*="article"], [data-test-id="article"]')) {
      item.type = 'article';
    } else if (postEl.querySelector('[class*="poll"], [data-test-id="poll"]')) {
      item.type = 'poll';
    } else if (postEl.querySelector('video, [class*="video"]')) {
      item.type = 'video';
    } else if (postEl.querySelector('[class*="document"], .feed-shared-document')) {
      item.type = 'document';
    }

    // Get timestamp
    const timeEl = postEl.querySelector('time, [class*="actor__sub-description"]');
    if (timeEl) {
      const datetime = timeEl.getAttribute('datetime');
      if (datetime) {
        item.publishedAt = new Date(datetime).getTime();
      } else {
        // Try to parse relative time
        const timeText = timeEl.textContent || '';
        item.publishedAt = parseRelativeTime(timeText);
      }
    }

    // Get engagement metrics
    const socialCounts = postEl.querySelector('[class*="social-counts"], [class*="social-details"]');
    if (socialCounts) {
      const text = socialCounts.textContent || '';

      const reactionsMatch = text.match(/(\d+)\s*(?:reactions?|likes?)/i);
      if (reactionsMatch) {
        item.reactions = parseInt(reactionsMatch[1], 10);
      }

      const commentsMatch = text.match(/(\d+)\s*comments?/i);
      if (commentsMatch) {
        item.comments = parseInt(commentsMatch[1], 10);
      }

      const sharesMatch = text.match(/(\d+)\s*(?:shares?|reposts?)/i);
      if (sharesMatch) {
        item.shares = parseInt(sharesMatch[1], 10);
      }
    }

    // Get post URL
    const linkEl = postEl.querySelector('a[href*="/feed/update/"]');
    if (linkEl) {
      item.postUrl = linkEl.getAttribute('href') || undefined;
    }

    // Calculate total engagement
    item.engagement = (item.reactions || 0) + (item.comments || 0) + (item.shares || 0);

    return item;
  }

  /**
   * Parse relative time strings like "2d", "1w", "3mo"
   */
  function parseRelativeTime(text) {
    const now = Date.now();
    const match = text.match(/(\d+)\s*(m|h|d|w|mo|y)/i);

    if (!match) return now;

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    const msPerUnit = {
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
      w: 7 * 24 * 60 * 60 * 1000,
      mo: 30 * 24 * 60 * 60 * 1000,
      y: 365 * 24 * 60 * 60 * 1000,
    };

    return now - (value * (msPerUnit[unit] || msPerUnit.d));
  }

  // ============================================
  // EXPORTS
  // ============================================

  // Make extractors available globally for auto-capture
  window.LinkedInCompanyExtractor = {
    detectCompanyPage: detectCompanyPage,
    extractCompanyAnalytics: extractCompanyAnalytics,
    extractContentCalendar: extractContentCalendar,
  };

  console.log('[CompanyExtractor] Loaded');
})();
