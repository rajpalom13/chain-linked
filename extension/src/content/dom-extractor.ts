/**
 * LinkedIn Data Extractor - DOM Extractor
 * TypeScript Version
 *
 * Extracts data directly from LinkedIn DOM when API data isn't available.
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

interface ProfileData {
  name: string | null;
  headline: string | null;
  location: string | null;
  profilePhoto: string | null;
  backgroundImage: string | null;
  connectionCount: number | null;
  followerCount: number | null;
  aboutSection: string | null;
  extractedAt: string;
  source: 'dom';
}

interface AnalyticsData {
  impressions: number | null;
  engagements: number | null;
  membersReached: number | null;
  growth: string | null;
  profileViews: number | null;
  searchAppearances: number | null;
  engagementRate: string | null;
  topPosts: TopPost[];
  extractedAt: string;
  source: 'dom';
  // Index signature for ExtractedData compatibility
  [key: string]: unknown;
}

interface TopPost {
  title: string;
  impressions: number | null;
  engagement: string | null;
}

interface PostAnalyticsData {
  activityUrn: string | null;
  impressions: number | null;
  membersReached: number | null;
  engagement: {
    reactions: number | null;
    comments: number | null;
    reposts: number | null;
  };
  profileActivity: {
    profileViewers: number | null;
    followersGained: number | null;
  };
  engagementRate: string | null;
  extractedAt: string;
  source: 'dom';
  // Index signature for ExtractedData compatibility
  [key: string]: unknown;
}

interface AudienceData {
  totalFollowers: number | null;
  followerGrowth: string | null;
  newFollowers: number | null;
  extractedAt: string;
  source: 'dom';
  // Index signature for ExtractedData compatibility
  [key: string]: unknown;
}

interface DemographicsData {
  demographics: {
    industries: DemographicItem[];
    locations: DemographicItem[];
    seniority: DemographicItem[];
    companies: DemographicItem[];
    jobTitles?: DemographicItem[];
  };
  extractedAt: string;
  source: 'dom';
  // Index signature for ExtractedData compatibility
  [key: string]: unknown;
}

interface DemographicItem {
  value: string;
  percentage: number;
}

interface ProfileViewsData {
  totalViews: number | null;
  profileViews: number | null;
  searchAppearances: number | null;
  viewers: ViewerInfo[];
  extractedAt: string;
  source: 'dom';
  // Index signature for ExtractedData compatibility
  [key: string]: unknown;
}

interface ViewerInfo {
  name: string;
  headline: string | null;
  profileUrl: string | null;
}

// Window.LinkedInDOMExtractor is declared in auto-capture.ts

// ============================================
// DOM EXTRACTOR CLASS
// ============================================

const LinkedInDOMExtractor = {
  /**
   * Detect the current page type
   */
  detectPageType(): string {
    const pathname = window.location.pathname;

    if (pathname.includes('/analytics/post-summary/')) return 'post_analytics';
    if (pathname.includes('/analytics/demographic-detail/')) return 'demographics';
    if (pathname.includes('/analytics/creator/')) return 'analytics';
    if (pathname.includes('/analytics/profile-views')) return 'profile_views';
    if (pathname.includes('/analytics/')) return 'analytics';
    if (pathname.match(/^\/in\/[^/]+\/?$/)) return 'profile';
    if (pathname === '/' || pathname === '/feed/') return 'feed';

    return 'unknown';
  },

  /**
   * Extract all available data from current page
   */
  extractAll(): Record<string, unknown> {
    const pageType = this.detectPageType();
    const data: Record<string, unknown> = {
      pageType,
      url: window.location.href,
      extractedAt: new Date().toISOString(),
    };

    switch (pageType) {
      case 'profile':
        data.profile = this.extractProfileData();
        break;
      case 'analytics':
        data.analytics = this.extractAnalyticsData();
        break;
      case 'post_analytics':
        data.postAnalytics = this.extractPostAnalyticsData();
        break;
      case 'demographics':
        data.demographics = this.extractAudienceDemographics();
        break;
      case 'profile_views':
        data.profileViews = this.extractProfileViewsData();
        break;
    }

    return data;
  },

  /**
   * Extract profile data from profile page DOM
   * Updated for LinkedIn 2026 layout
   */
  extractProfileData(): ProfileData | null {
    console.log('[CAPTURE][PROFILE] Starting profile data extraction');
    try {
      // ============================================
      // NAME EXTRACTION - Multiple fallback selectors
      // ============================================
      let name: string | null = null;

      // Priority 1: Main profile h1 with specific class
      const nameSelectors = [
        'h1.text-heading-xlarge',
        'h1[class*="text-heading-xlarge"]',
        'h1[class*="inline t-24"]',
        '.pv-top-card h1',
        '.pv-text-details__left-panel h1',
        'section.artdeco-card h1',
        'main h1',
        // 2026 LinkedIn layouts
        '[data-generated-suggestion-target] h1',
        '.profile-photo-edit__preview + h1',
        '.pv-top-card-profile-picture + div h1',
      ];

      for (const selector of nameSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          name = el.textContent.trim();
          console.log(`[CAPTURE][PROFILE] Name found via: ${selector}`);
          break;
        }
      }

      // Fallback: Find any h1 in the profile section
      if (!name) {
        const profileSection = document.querySelector('main section, .profile-section, [class*="profile"]');
        if (profileSection) {
          const h1 = profileSection.querySelector('h1');
          if (h1?.textContent?.trim()) {
            name = h1.textContent.trim();
            console.log('[CAPTURE][PROFILE] Name found via profile section h1');
          }
        }
      }

      // ============================================
      // HEADLINE EXTRACTION
      // ============================================
      let headline: string | null = null;

      const headlineSelectors = [
        '.text-body-medium.break-words',
        '.pv-text-details__left-panel .text-body-medium',
        '.pv-top-card .text-body-medium',
        '[data-generated-suggestion-target] .text-body-medium',
        '.profile-topcard-summary-info__text',
        // 2026 layouts - div after the name
        'h1.text-heading-xlarge + div.text-body-medium',
        'h1 + .text-body-medium',
      ];

      for (const selector of headlineSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          headline = el.textContent.trim();
          console.log(`[CAPTURE][PROFILE] Headline found via: ${selector}`);
          break;
        }
      }

      // Fallback: First text-body-medium after h1
      if (!headline) {
        const h1 = document.querySelector('h1');
        if (h1) {
          let sibling = h1.nextElementSibling;
          while (sibling) {
            if (sibling.classList.contains('text-body-medium') ||
                sibling.querySelector('.text-body-medium')) {
              const text = sibling.textContent?.trim();
              if (text && text.length < 300) {
                headline = text;
                console.log('[CAPTURE][PROFILE] Headline found via sibling');
                break;
              }
            }
            sibling = sibling.nextElementSibling;
          }
        }
      }

      // ============================================
      // LOCATION EXTRACTION
      // ============================================
      let location: string | null = null;

      const locationSelectors = [
        '.text-body-small.inline.t-black--light.break-words',
        '.pv-text-details__left-panel .text-body-small',
        'span.text-body-small[class*="break-words"]',
        '.pv-top-card--list-bullet .text-body-small',
        // 2026 layouts
        '[class*="location"]',
        '.profile-topcard-summary-info__location',
      ];

      for (const selector of locationSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          const text = el.textContent.trim();
          // Location should not contain "followers" or "connections"
          if (!text.toLowerCase().includes('follower') &&
              !text.toLowerCase().includes('connection') &&
              text.length < 100) {
            location = text;
            console.log(`[CAPTURE][PROFILE] Location found via: ${selector}`);
            break;
          }
        }
      }

      // ============================================
      // PROFILE PHOTO EXTRACTION
      // ============================================
      let profilePhoto: string | null = null;

      const photoSelectors = [
        'img.pv-top-card-profile-picture__image',
        'img.pv-top-card-profile-picture__image--show',
        'img[class*="profile-photo-edit__preview"]',
        'img[class*="pv-top-card"][class*="image"]',
        'button[class*="profile-photo"] img',
        '.pv-top-card__photo img',
        // 2026 layouts - look for large profile image
        'img[width="200"]',
        'img[class*="EntityPhoto-circle-9"]',
        'img[class*="presence-entity__image"]',
        '.profile-photo img',
      ];

      for (const selector of photoSelectors) {
        const el = document.querySelector(selector) as HTMLImageElement;
        if (el?.src && !el.src.includes('data:image') && el.src.includes('linkedin')) {
          profilePhoto = el.src;
          console.log(`[CAPTURE][PROFILE] Photo found via: ${selector}`);
          break;
        }
      }

      // Fallback: Find any large profile-looking image
      if (!profilePhoto) {
        const images = document.querySelectorAll('img');
        for (const img of images) {
          const src = (img as HTMLImageElement).src || '';
          const alt = img.getAttribute('alt') || '';
          // Profile images typically have the person's name in alt
          if (src.includes('profile-displayphoto') ||
              src.includes('media.licdn.com/dms/image') ||
              (alt && name && alt.toLowerCase().includes(name.toLowerCase().split(' ')[0]))) {
            profilePhoto = src;
            console.log('[CAPTURE][PROFILE] Photo found via image scan');
            break;
          }
        }
      }

      // ============================================
      // BANNER / BACKGROUND IMAGE EXTRACTION
      // ============================================
      let backgroundImage: string | null = null;

      const bannerSelectors = [
        // LinkedIn profile background image selectors
        '.profile-background-image__image',
        'img[class*="profile-background"]',
        '.pv-top-card__cover-photo img',
        '.profile-topcard__background-image img',
        // 2026 layouts - banner/cover section
        '[class*="profile-background"] img',
        '.artdeco-entity-image--profile-background img',
        'section[class*="top-card"] img[class*="background"]',
        // Cover image as CSS background-image
        '[class*="cover-img"] img',
        'img[alt*="background"]',
        'img[alt*="banner"]',
        'img[alt*="cover"]',
      ];

      for (const selector of bannerSelectors) {
        const el = document.querySelector(selector) as HTMLImageElement;
        if (el?.src && !el.src.includes('data:image') && el.src.includes('licdn')) {
          backgroundImage = el.src;
          console.log(`[CAPTURE][PROFILE] Banner image found via: ${selector}`);
          break;
        }
      }

      // Fallback: Check for background-image CSS on banner containers
      if (!backgroundImage) {
        const bannerContainerSelectors = [
          '.profile-background-image',
          '[class*="profile-background"]',
          '.pv-top-card__cover-photo',
          '[class*="cover-photo"]',
          '[class*="banner-image"]',
        ];
        for (const selector of bannerContainerSelectors) {
          const el = document.querySelector(selector) as HTMLElement;
          if (el) {
            const bgImage = window.getComputedStyle(el).backgroundImage;
            const urlMatch = bgImage?.match(/url\(["']?(https?:\/\/[^"')]+)["']?\)/);
            if (urlMatch && urlMatch[1].includes('licdn')) {
              backgroundImage = urlMatch[1];
              console.log(`[CAPTURE][PROFILE] Banner image found via CSS background: ${selector}`);
              break;
            }
          }
        }
      }

      // ============================================
      // FOLLOWER/CONNECTION COUNT EXTRACTION
      // ============================================
      let connectionCount: number | null = null;
      let followerCount: number | null = null;

      // Method 1: Text pattern matching on the page
      const bodyText = document.body.innerText;

      // Match patterns like "334,920 followers" with various formats
      const followersPatterns = [
        /(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*followers?/i,
        /followers?\s*(?:\n|\s)*(\d{1,3}(?:,\d{3})*|\d+)/i,
      ];

      for (const pattern of followersPatterns) {
        const match = bodyText.match(pattern);
        if (match) {
          followerCount = this.parseNumber(match[1]);
          if (followerCount) {
            console.log('[CAPTURE][PROFILE] Followers found via text pattern');
            break;
          }
        }
      }

      // Match patterns like "3,194 connections"
      const connectionsPatterns = [
        /(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*connections?/i,
        /connections?\s*(?:\n|\s)*(\d{1,3}(?:,\d{3})*|\d+)/i,
      ];

      for (const pattern of connectionsPatterns) {
        const match = bodyText.match(pattern);
        if (match) {
          connectionCount = this.parseNumber(match[1]);
          if (connectionCount) {
            console.log('[CAPTURE][PROFILE] Connections found via text pattern');
            break;
          }
        }
      }

      // Method 2: Look in specific link elements and spans
      if (!connectionCount || !followerCount) {
        const statsElements = document.querySelectorAll(
          'a[href*="connections"], a[href*="followers"], span.t-bold, .t-bold, [class*="follower"], [class*="connection"]'
        );

        statsElements.forEach((el) => {
          const text = el.textContent || '';
          const parentText = el.parentElement?.textContent || '';
          const combinedText = `${text} ${parentText}`.toLowerCase();

          if (combinedText.includes('connection') && !connectionCount) {
            const match = text.match(/(\d{1,3}(?:,\d{3})*|\d+)/);
            if (match) {
              connectionCount = this.parseNumber(match[1]);
            }
          }
          if (combinedText.includes('follower') && !followerCount) {
            const match = text.match(/(\d{1,3}(?:,\d{3})*|\d+)/);
            if (match) {
              followerCount = this.parseNumber(match[1]);
            }
          }
        });
      }

      // ============================================
      // ABOUT SECTION EXTRACTION
      // ============================================
      let aboutSection: string | null = null;

      const aboutSelectors = [
        '#about ~ .display-flex .inline-show-more-text',
        '#about + div .inline-show-more-text',
        '[class*="about"] .inline-show-more-text',
        '.pv-about-section .inline-show-more-text',
        '.pv-about-section p',
        'section#about .pv-shared-text-with-see-more',
        // 2026 layouts
        '[data-generated-suggestion-target*="about"] p',
        '.core-section-container[id*="about"] p',
      ];

      for (const selector of aboutSelectors) {
        const el = document.querySelector(selector);
        if (el?.textContent?.trim()) {
          aboutSection = el.textContent.trim();
          console.log(`[CAPTURE][PROFILE] About found via: ${selector}`);
          break;
        }
      }

      const result = {
        name,
        headline,
        location,
        profilePhoto,
        backgroundImage,
        connectionCount,
        followerCount,
        aboutSection,
        extractedAt: new Date().toISOString(),
        source: 'dom' as const,
      };

      console.log('[CAPTURE][PROFILE] Extraction complete:', {
        name: result.name,
        headline: result.headline ? result.headline.substring(0, 50) + '...' : null,
        location: result.location,
        hasPhoto: !!result.profilePhoto,
        hasBanner: !!result.backgroundImage,
        followerCount: result.followerCount,
        connectionCount: result.connectionCount
      });
      return result;
    } catch (error) {
      console.error('[CAPTURE][PROFILE][ERROR] Error extracting profile:', error);
      return null;
    }
  },

  /**
   * Extract creator analytics data
   */
  extractCreatorAnalytics(): AnalyticsData | null {
    return this.extractAnalyticsData();
  },

  /**
   * Extract analytics data from analytics page DOM
   * Updated for LinkedIn 2026 layout with comprehensive selectors
   */
  extractAnalyticsData(): AnalyticsData | null {
    console.log('[CAPTURE][ANALYTICS] Starting analytics data extraction');
    console.log('[CAPTURE][ANALYTICS] Current URL:', window.location.href);

    try {
      // Focus on main content area only, excluding sidebar and feed
      const mainContent = document.querySelector('main') || document.body;
      const analyticsSection = mainContent.querySelector('[class*="analytics"], [class*="dashboard"]') || mainContent;

      // Get text from entire body for more complete matching
      const bodyText = document.body.innerText;
      const analyticsText = analyticsSection.textContent || '';

      const data: AnalyticsData = {
        impressions: null,
        engagements: null,
        membersReached: null,
        growth: null,
        profileViews: null,
        searchAppearances: null,
        engagementRate: null,
        topPosts: [],
        extractedAt: new Date().toISOString(),
        source: 'dom',
      };

      // ============================================
      // IMPRESSIONS EXTRACTION
      // ============================================
      const impressionPatterns = [
        /(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*(?:Post\s+)?[Ii]mpressions/,
        /[Ii]mpressions\s*(?:\n|\s)*(\d{1,3}(?:,\d{3})*|\d+)/,
        /[Ii]mpressions\s*[:\s]*(\d{1,3}(?:,\d{3})*|\d+)/,
      ];

      for (const pattern of impressionPatterns) {
        const match = bodyText.match(pattern);
        if (match) {
          data.impressions = this.parseNumber(match[1]);
          if (data.impressions) {
            console.log('[CAPTURE][ANALYTICS] Impressions:', data.impressions);
            break;
          }
        }
      }

      // ============================================
      // MEMBERS REACHED EXTRACTION
      // ============================================
      const membersPatterns = [
        /(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*[Mm]embers\s+reached/,
        /[Mm]embers\s+reached\s*(?:\n|\s)*(\d{1,3}(?:,\d{3})*|\d+)/,
        /[Mm]embers\s+reached\s*[:\s]*(\d{1,3}(?:,\d{3})*|\d+)/,
        /[Rr]eached\s*(?:\n|\s)*(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*[Mm]embers/,
      ];

      for (const pattern of membersPatterns) {
        const match = bodyText.match(pattern);
        if (match) {
          data.membersReached = this.parseNumber(match[1]);
          if (data.membersReached) {
            console.log('[CAPTURE][ANALYTICS] Members reached:', data.membersReached);
            break;
          }
        }
      }

      // Fallback: Look in stat cards for "members" or "reached"
      if (!data.membersReached) {
        const cards = document.querySelectorAll('[class*="stat"], [class*="card"], [class*="metric"], .artdeco-card');
        cards.forEach((card) => {
          const cardText = card.textContent || '';
          const lowerText = cardText.toLowerCase();
          if ((lowerText.includes('member') && lowerText.includes('reach')) ||
              lowerText.includes('unique') && lowerText.includes('member')) {
            if (!data.membersReached) {
              const numMatch = cardText.match(/(\d{1,3}(?:,\d{3})*|\d+)/);
              if (numMatch) {
                data.membersReached = this.parseNumber(numMatch[1]);
                console.log('[CAPTURE][ANALYTICS] Members reached (from card):', data.membersReached);
              }
            }
          }
        });
      }

      // ============================================
      // GROWTH PERCENTAGE EXTRACTION
      // ============================================
      const growthPatterns = [
        /([+-]?\d+(?:\.\d+)?%)\s*(?:vs\.?\s*prior|past\s+\d+\s+days)/i,
        /([▼▲]?\s*\d+(?:\.\d+)?%)\s*(?:past|vs)/i,
        /(?:growth|change)[:\s]*([+-]?\d+(?:\.\d+)?%)/i,
      ];

      for (const pattern of growthPatterns) {
        const match = bodyText.match(pattern);
        if (match) {
          data.growth = match[1].replace(/[▼▲]/g, '').trim();
          console.log('[CAPTURE][ANALYTICS] Growth:', data.growth);
          break;
        }
      }

      // ============================================
      // PROFILE VIEWS EXTRACTION
      // ============================================
      const profileViewPatterns = [
        /(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*[Pp]rofile\s+view(?:er)?s/,
        /[Pp]rofile\s+view(?:er)?s\s*(?:\n|\s)*(\d{1,3}(?:,\d{3})*|\d+)/,
        /(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*(?:people\s+)?viewed\s+(?:your\s+)?profile/i,
        /[Ww]ho\s+viewed\s+your\s+profile\s*(?:\n|\s)*(\d{1,3}(?:,\d{3})*|\d+)/,
      ];

      for (const pattern of profileViewPatterns) {
        const match = bodyText.match(pattern);
        if (match) {
          data.profileViews = this.parseNumber(match[1]);
          if (data.profileViews) {
            console.log('[CAPTURE][ANALYTICS] Profile views:', data.profileViews);
            break;
          }
        }
      }

      // ============================================
      // SEARCH APPEARANCES EXTRACTION (Enhanced)
      // ============================================
      const searchPatterns = [
        /(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*[Ss]earch\s+appearances?/,
        /[Ss]earch\s+appearances?\s*(?:\n|\s)*(\d{1,3}(?:,\d{3})*|\d+)/,
        /(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*(?:times?\s+)?(?:appeared\s+)?in\s+search/i,
        /[Aa]ppeared\s+in\s+search\s*(?:\n|\s)*(\d{1,3}(?:,\d{3})*|\d+)/i,
        /in\s+(\d{1,3}(?:,\d{3})*|\d+)\s+search(?:es|\s+results?)?/i,
      ];

      for (const pattern of searchPatterns) {
        const match = bodyText.match(pattern);
        if (match) {
          data.searchAppearances = this.parseNumber(match[1]);
          if (data.searchAppearances) {
            console.log('[CAPTURE][ANALYTICS] Search appearances:', data.searchAppearances);
            break;
          }
        }
      }

      // Fallback: Look in stat cards for "search"
      if (!data.searchAppearances) {
        const cards = document.querySelectorAll('[class*="stat"], [class*="card"], [class*="metric"], .artdeco-card, li');
        cards.forEach((card) => {
          const cardText = card.textContent || '';
          const lowerText = cardText.toLowerCase();
          if (lowerText.includes('search') && (lowerText.includes('appear') || lowerText.includes('result'))) {
            if (!data.searchAppearances) {
              const numMatch = cardText.match(/(\d{1,3}(?:,\d{3})*|\d+)/);
              if (numMatch) {
                data.searchAppearances = this.parseNumber(numMatch[1]);
                console.log('[CAPTURE][ANALYTICS] Search appearances (from card):', data.searchAppearances);
              }
            }
          }
        });
      }

      // ============================================
      // ENGAGEMENTS EXTRACTION
      // ============================================
      let totalEngagements = 0;

      // Method 1: Direct "engagements" match
      const engagementsPatterns = [
        /(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*(?:total\s+)?[Ee]ngagements?/,
        /[Ee]ngagements?\s*[:\s]*(\d{1,3}(?:,\d{3})*|\d+)/,
      ];

      for (const pattern of engagementsPatterns) {
        const match = bodyText.match(pattern);
        if (match) {
          totalEngagements = this.parseNumber(match[1]) || 0;
          if (totalEngagements > 0) {
            console.log('[CAPTURE][ANALYTICS] Direct engagements match:', totalEngagements);
            break;
          }
        }
      }

      // Method 2: Sum reactions + comments + reposts
      if (totalEngagements === 0) {
        let reactions = 0, comments = 0, reposts = 0;

        // Reactions/likes
        const reactionsMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*(?:reactions?|likes?)/i);
        if (reactionsMatch) {
          reactions = this.parseNumber(reactionsMatch[1]) || 0;
        }

        // Comments
        const commentsMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*comments?/i);
        if (commentsMatch) {
          comments = this.parseNumber(commentsMatch[1]) || 0;
        }

        // Reposts/shares
        const repostsMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*(?:reposts?|shares?)/i);
        if (repostsMatch) {
          reposts = this.parseNumber(repostsMatch[1]) || 0;
        }

        totalEngagements = reactions + comments + reposts;
        if (totalEngagements > 0) {
          console.log('[CAPTURE][ANALYTICS] Engagements from sum (R/C/S):', reactions, comments, reposts, '=', totalEngagements);
        }
      }

      // Method 3: Look in engagement cards
      if (totalEngagements === 0) {
        const engagementCards = analyticsSection.querySelectorAll('[class*="engagement"], [class*="interaction"], [class*="social"]');
        engagementCards.forEach((card) => {
          const cardText = card.textContent || '';
          const numMatch = cardText.match(/(\d{1,3}(?:,\d{3})*|\d+)/);
          if (numMatch) {
            const lowerText = cardText.toLowerCase();
            if (lowerText.includes('reaction') || lowerText.includes('like') ||
                lowerText.includes('comment') || lowerText.includes('repost') ||
                lowerText.includes('share') || lowerText.includes('engagement')) {
              totalEngagements += this.parseNumber(numMatch[1]) || 0;
            }
          }
        });
      }

      data.engagements = totalEngagements > 0 ? totalEngagements : null;
      console.log('[CAPTURE][ANALYTICS] Total engagements:', data.engagements);

      // ============================================
      // ENGAGEMENT RATE CALCULATION
      // ============================================
      if (data.impressions && data.impressions > 0 && totalEngagements > 0) {
        data.engagementRate = ((totalEngagements / data.impressions) * 100).toFixed(2);
        console.log('[CAPTURE][ANALYTICS] Engagement rate:', data.engagementRate);
      }

      // ============================================
      // TOP POSTS EXTRACTION
      // ============================================
      const postCards = analyticsSection.querySelectorAll(
        '[data-test-id*="post"], .feed-shared-update-v2, .occludable-update, ' +
        '[class*="analytics-content-card"], [class*="creator-analytics"] li, ' +
        '.analytics-card, [class*="top-post"], [class*="post-card"]'
      );
      postCards.forEach((card) => {
        // Skip if this looks like a feed post
        if (card.closest('[class*="feed"]') || card.closest('[class*="promoted"]')) {
          return;
        }
        const titleEl = card.querySelector('h3, .t-bold');
        const impressionsEl = card.querySelector('[class*="impressions"], .t-normal');
        if (titleEl) {
          const title = titleEl.textContent?.trim() || '';
          // Skip titles that are too long (likely feed content)
          if (title.length < 200) {
            data.topPosts.push({
              title,
              impressions: this.parseNumber(impressionsEl?.textContent),
              engagement: null,
            });
          }
        }
      });

      console.log('[CAPTURE][ANALYTICS] Extraction complete:', {
        impressions: data.impressions,
        engagements: data.engagements,
        membersReached: data.membersReached,
        profileViews: data.profileViews,
        searchAppearances: data.searchAppearances,
        growth: data.growth,
        engagementRate: data.engagementRate,
        topPostsCount: data.topPosts.length
      });
      return data;
    } catch (error) {
      console.error('[CAPTURE][ANALYTICS][ERROR] Error extracting analytics:', error);
      return null;
    }
  },

  /**
   * Extract post analytics data from post analytics page
   */
  extractPostAnalyticsData(): PostAnalyticsData | null {
    console.log('[CAPTURE][POST_ANALYTICS] Starting post analytics extraction');
    try {
      const pathname = window.location.pathname;
      const activityMatch = pathname.match(/urn:li:activity:(\d+)/);
      const activityUrn = activityMatch ? `urn:li:activity:${activityMatch[1]}` : null;

      const bodyText = document.body.innerText;
      const data: PostAnalyticsData = {
        activityUrn,
        impressions: null,
        membersReached: null,
        engagement: {
          reactions: null,
          comments: null,
          reposts: null,
        },
        profileActivity: {
          profileViewers: null,
          followersGained: null,
        },
        engagementRate: null,
        extractedAt: new Date().toISOString(),
        source: 'dom',
      };

      // Extract impressions
      const impressionsMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*Impressions/i);
      if (impressionsMatch) {
        data.impressions = this.parseNumber(impressionsMatch[1]);
      }

      // Extract members reached
      const membersMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*Members reached/i);
      if (membersMatch) {
        data.membersReached = this.parseNumber(membersMatch[1]);
      }

      // Extract engagement metrics from list items
      const listItems = document.querySelectorAll('li');
      listItems.forEach((li) => {
        const text = li.textContent || '';
        const numMatch = text.match(/(\d+)/);
        if (!numMatch) return;

        const num = parseInt(numMatch[1], 10);

        if (text.toLowerCase().includes('reaction')) {
          data.engagement.reactions = num;
        } else if (text.toLowerCase().includes('comment') && !text.includes('comment on')) {
          data.engagement.comments = num;
        } else if (text.toLowerCase().includes('repost')) {
          data.engagement.reposts = num;
        } else if (text.toLowerCase().includes('profile viewer')) {
          data.profileActivity.profileViewers = num;
        } else if (text.toLowerCase().includes('follower') && text.toLowerCase().includes('gained')) {
          data.profileActivity.followersGained = num;
        }
      });

      // Calculate engagement rate
      if (data.impressions && data.impressions > 0) {
        const totalEngagement =
          (data.engagement.reactions || 0) +
          (data.engagement.comments || 0) +
          (data.engagement.reposts || 0);
        data.engagementRate = ((totalEngagement / data.impressions) * 100).toFixed(2);
      }

      console.log('[CAPTURE][POST_ANALYTICS] Extraction complete:', {
        activityUrn: data.activityUrn,
        impressions: data.impressions,
        engagement: data.engagement,
        engagementRate: data.engagementRate
      });
      return data;
    } catch (error) {
      console.error('[CAPTURE][POST_ANALYTICS][ERROR] Error extracting post analytics:', error);
      return null;
    }
  },

  /**
   * Extract audience analytics data
   */
  extractAudienceAnalytics(): AudienceData | null {
    console.log('[CAPTURE][AUDIENCE] Starting audience analytics extraction');
    try {
      // Target the main analytics content area
      const mainContent = document.querySelector('main') || document.body;
      const audienceSection = mainContent.querySelector('[class*="audience"], [class*="analytics"]') || mainContent;
      const audienceText = audienceSection.textContent || '';

      const data: AudienceData = {
        totalFollowers: null,
        followerGrowth: null,
        newFollowers: null,
        extractedAt: new Date().toISOString(),
        source: 'dom',
      };

      // Multiple patterns to match "Total followers" in different formats
      // Pattern 1: "265 Total followers" or "265\nTotal followers"
      let followersMatch = audienceText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*[Tt]otal\s+[Ff]ollowers/);
      // Pattern 2: "Total followers\n265" (label first, then number)
      if (!followersMatch) {
        followersMatch = audienceText.match(/[Tt]otal\s+[Ff]ollowers\s*(?:\n|\s)*(\d{1,3}(?:,\d{3})*|\d+)/);
      }
      // Pattern 3: Just "followers" section with a number nearby
      if (!followersMatch) {
        // Look for analytics cards with follower data
        const followerCards = document.querySelectorAll('[class*="card"], [class*="metric"], [class*="stat"]');
        followerCards.forEach((card) => {
          const cardText = card.textContent || '';
          if (cardText.toLowerCase().includes('follower') && !data.totalFollowers) {
            const numMatch = cardText.match(/(\d{1,3}(?:,\d{3})*|\d+)/);
            if (numMatch) {
              data.totalFollowers = this.parseNumber(numMatch[1]);
            }
          }
        });
      }

      if (followersMatch) {
        data.totalFollowers = this.parseNumber(followersMatch[1]);
      }

      // Multiple patterns for follower growth percentage
      // Pattern 1: "64.2% vs prior" or "+5% vs. prior"
      let growthMatch = audienceText.match(/([+-]?\d+(?:\.\d+)?%)\s*vs\.?\s*prior/i);
      // Pattern 2: "64.2% past 7 days" or "5.2% past 30 days"
      if (!growthMatch) {
        growthMatch = audienceText.match(/([+-]?\d+(?:\.\d+)?%)\s*past\s+\d+\s+days/i);
      }
      // Pattern 3: Look for percentage near "growth" or "change"
      if (!growthMatch) {
        growthMatch = audienceText.match(/(?:growth|change)[^\d]*([+-]?\d+(?:\.\d+)?%)/i);
      }

      if (growthMatch) {
        data.followerGrowth = growthMatch[1];
      }

      // Extract new followers
      // Pattern 1: "15 New followers"
      let newMatch = audienceText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*[Nn]ew\s+[Ff]ollowers/);
      // Pattern 2: "New followers\n15"
      if (!newMatch) {
        newMatch = audienceText.match(/[Nn]ew\s+[Ff]ollowers\s*(?:\n|\s)*(\d{1,3}(?:,\d{3})*|\d+)/);
      }

      if (newMatch) {
        data.newFollowers = this.parseNumber(newMatch[1]);
      }

      console.log('[CAPTURE][AUDIENCE] Extraction complete:', data);
      return data;
    } catch (error) {
      console.error('[CAPTURE][AUDIENCE][ERROR] Error extracting audience analytics:', error);
      return null;
    }
  },

  /**
   * Extract audience demographics data
   */
  extractAudienceDemographics(): DemographicsData | null {
    console.log('[CAPTURE][DEMOGRAPHICS] Starting demographics extraction');
    try {
      const data: DemographicsData = {
        demographics: {
          industries: [],
          locations: [],
          seniority: [],
          companies: [],
          jobTitles: [],
        },
        extractedAt: new Date().toISOString(),
        source: 'dom',
      };

      // Only look at the main content area, not feed/sidebar
      const mainContent = document.querySelector('main') || document.body;

      // More specific selectors for LinkedIn analytics demographic sections
      // Look for sections within analytics pages only
      const analyticsContainer = mainContent.querySelector('[class*="analytics"], [class*="audience"]');
      if (!analyticsContainer) {
        console.log('[DOMExtractor] No analytics container found for demographics');
        return data;
      }

      // Find demographic sections within the analytics container
      const sections = analyticsContainer.querySelectorAll('.artdeco-card, section[class*="demographic"], div[class*="breakdown"]');

      sections.forEach((section) => {
        // Skip sections that look like ads or feed content
        if (section.closest('[class*="feed"]') || section.closest('[class*="promoted"]')) {
          return;
        }

        const headingEl = section.querySelector('h2, h3, [class*="heading"], [class*="title"]');
        if (!headingEl) return;

        const heading = headingEl.textContent?.toLowerCase() || '';

        // Skip if heading contains ad-related text
        if (heading.includes('promoted') || heading.includes('sponsored') || heading.includes('follow')) {
          return;
        }

        // Look for list items within this section only
        const items = section.querySelectorAll('li:not([class*="feed"]):not([class*="post"])');

        items.forEach((item) => {
          const text = item.textContent || '';

          // Skip items that look like feed posts or ads
          if (text.length > 200 || text.includes('followers') || text.includes('Follow')) {
            return;
          }

          const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
          if (!percentMatch) return;

          const percentage = parseFloat(percentMatch[1]);
          // Extract value before the percentage
          const value = text.replace(/\s*\d+(?:\.\d+)?\s*%.*$/, '').trim();

          // Skip invalid values (too short or too long)
          if (value.length < 2 || value.length > 100) {
            return;
          }

          const demographicItem: DemographicItem = { value, percentage };

          if (heading.includes('industry') || heading.includes('industries')) {
            data.demographics.industries.push(demographicItem);
          } else if (heading.includes('location')) {
            data.demographics.locations.push(demographicItem);
          } else if (heading.includes('seniority') || heading.includes('experience') || heading.includes('level')) {
            data.demographics.seniority.push(demographicItem);
          } else if (heading.includes('company') || heading.includes('companies')) {
            data.demographics.companies.push(demographicItem);
          } else if (heading.includes('job') || heading.includes('title') || heading.includes('function')) {
            (data.demographics as Record<string, DemographicItem[]>).jobTitles.push(demographicItem);
          }
        });
      });

      console.log('[CAPTURE][DEMOGRAPHICS] Extraction complete:', {
        industries: data.demographics.industries.length,
        locations: data.demographics.locations.length,
        seniority: data.demographics.seniority.length,
        companies: data.demographics.companies.length
      });
      return data;
    } catch (error) {
      console.error('[CAPTURE][DEMOGRAPHICS][ERROR] Error extracting demographics:', error);
      return null;
    }
  },

  /**
   * Extract profile views data from /analytics/profile-views/ page
   */
  extractProfileViewsData(): ProfileViewsData | null {
    console.log('[CAPTURE][PROFILE_VIEWS] Starting profile views data extraction');

    try {
      const bodyText = document.body.innerText;
      const mainContent = document.querySelector('main') || document.body;

      const data: ProfileViewsData = {
        totalViews: null,
        profileViews: null,
        searchAppearances: null,
        viewers: [],
        extractedAt: new Date().toISOString(),
        source: 'dom',
      };

      // ============================================
      // PROFILE VIEWS EXTRACTION
      // ============================================
      // Pattern 1: "95 profile views" or "95\nProfile views"
      let viewsMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*(?:profile\s+)?view(?:er)?s?/i);
      // Pattern 2: "Profile views\n95"
      if (!viewsMatch) {
        viewsMatch = bodyText.match(/[Pp]rofile\s+view(?:er)?s?\s*(?:\n|\s)*(\d{1,3}(?:,\d{3})*|\d+)/);
      }
      // Pattern 3: "Who viewed your profile" header with count
      if (!viewsMatch) {
        viewsMatch = bodyText.match(/[Ww]ho\s+viewed\s+your\s+profile\s*(?:\n|\s)*(\d{1,3}(?:,\d{3})*|\d+)/);
      }
      // Pattern 4: Look in stat cards
      if (!viewsMatch) {
        const statCards = mainContent.querySelectorAll('[class*="stat"], [class*="card"], [class*="metric"], [class*="header"]');
        statCards.forEach((card) => {
          const cardText = card.textContent || '';
          const lowerText = cardText.toLowerCase();
          if ((lowerText.includes('view') && lowerText.includes('profile')) || lowerText.includes('viewer')) {
            if (!data.totalViews) {
              const numMatch = cardText.match(/(\d{1,3}(?:,\d{3})*|\d+)/);
              if (numMatch) {
                data.totalViews = this.parseNumber(numMatch[1]);
              }
            }
          }
        });
      }
      if (viewsMatch) {
        data.totalViews = this.parseNumber(viewsMatch[1]);
      }
      // Set profileViews for database compatibility
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
      // Pattern 3: "Appeared in search results" with number
      if (!searchMatch) {
        searchMatch = bodyText.match(/[Aa]ppeared\s+in\s+(?:\d+\s+)?search(?:\s+results?)?\s*(?:\n|\s)*(\d{1,3}(?:,\d{3})*|\d+)/);
      }
      // Pattern 4: "in X search results"
      if (!searchMatch) {
        searchMatch = bodyText.match(/in\s+(\d{1,3}(?:,\d{3})*|\d+)\s+search\s+(?:results?|appearances?)/i);
      }
      // Pattern 5: "X times in search"
      if (!searchMatch) {
        searchMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s+times?\s+in\s+search/i);
      }
      // Pattern 6: Look in stat cards
      if (!searchMatch) {
        const statCards = mainContent.querySelectorAll('[class*="stat"], [class*="card"], [class*="metric"], [class*="header"]');
        statCards.forEach((card) => {
          const cardText = card.textContent || '';
          const lowerText = cardText.toLowerCase();
          if (lowerText.includes('search') && (lowerText.includes('appear') || lowerText.includes('result'))) {
            if (!data.searchAppearances) {
              const numMatch = cardText.match(/(\d{1,3}(?:,\d{3})*|\d+)/);
              if (numMatch) {
                data.searchAppearances = this.parseNumber(numMatch[1]);
              }
            }
          }
        });
      }
      if (searchMatch) {
        data.searchAppearances = this.parseNumber(searchMatch[1]);
      }
      console.log('[CAPTURE][PROFILE_VIEWS] Search appearances:', data.searchAppearances);

      // ============================================
      // VIEWER CARDS EXTRACTION
      // ============================================
      const viewerCards = document.querySelectorAll('[class*="viewer"], [class*="profile-card"], [class*="entity-result"], [class*="list-item"]');
      viewerCards.forEach((card) => {
        // Skip if this looks like a header or navigation
        if (card.closest('[class*="nav"]') || card.closest('[class*="header"]') || card.closest('[class*="sidebar"]')) {
          return;
        }

        const nameEl = card.querySelector('h3, .t-bold, [class*="name"], [class*="title"]');
        const headlineEl = card.querySelector('.t-normal, [class*="headline"], [class*="subtitle"], [class*="secondary"]');
        const linkEl = card.querySelector('a[href*="/in/"]');

        if (nameEl) {
          const name = nameEl.textContent?.trim() || '';
          // Filter out headers and navigation text
          if (name.length > 2 && name.length < 100 &&
              !name.toLowerCase().includes('view') &&
              !name.toLowerCase().includes('search') &&
              !name.toLowerCase().includes('linkedin') &&
              !name.toLowerCase().includes('premium')) {
            data.viewers.push({
              name,
              headline: headlineEl?.textContent?.trim() || null,
              profileUrl: linkEl?.getAttribute('href') || null,
            });
          }
        }
      });
      console.log('[CAPTURE][PROFILE_VIEWS] Viewers found:', data.viewers.length);

      console.log('[CAPTURE][PROFILE_VIEWS] Extraction complete:', data);
      return data;
    } catch (error) {
      console.error('[CAPTURE][PROFILE_VIEWS][ERROR] Error extracting profile views:', error);
      return null;
    }
  },

  /**
   * Get auth token from cookies (for checking authentication)
   */
  getAuthToken(): string | null {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'li_at') {
        return value;
      }
    }
    return null;
  },

  /**
   * Parse number from string (handles commas)
   */
  parseNumber(str: string | null | undefined): number | null {
    if (!str) return null;
    const cleaned = str.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  },
};

// ============================================
// INITIALIZATION
// ============================================

(function () {
  'use strict';

  window.LinkedInDOMExtractor = LinkedInDOMExtractor;

  document.dispatchEvent(
    new CustomEvent('linkedin-dom-extractor-ready', {
      detail: { version: '4.1.0' },
    })
  );

  console.log('[CAPTURE][DOM_EXTRACTOR] Loaded (TypeScript v4.1.0) - engagements & searchAppearances extraction enabled');
})();

export { LinkedInDOMExtractor };
