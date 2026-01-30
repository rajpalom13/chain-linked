/**
 * LinkedIn Data Extractor - DOM Extractor
 *
 * Extracts data directly from LinkedIn's rendered DOM elements.
 * Provides fallback data when API interception doesn't capture everything.
 */

(function() {
  'use strict';

  // Prevent double initialization
  if (window.__linkedInDOMExtractorLoaded) return;
  window.__linkedInDOMExtractorLoaded = true;

  console.log('[DOMExtractor] Initializing DOM extractor...');

  // ============================================
  // DOM SELECTORS
  // ============================================

  const SELECTORS = {
    // Profile page selectors (updated for current LinkedIn UI - Jan 2025)
    profile: {
      name: 'h1.text-heading-xlarge, .pv-text-details__left-panel h1, main h1, .mt2 h1, h1',
      headline: '.text-body-medium.break-words, .text-body-medium, .pv-text-details__left-panel .text-body-medium',
      location: '.text-body-small.inline.t-black--light.break-words, .text-body-small.inline.t-black--light, .pv-text-details__left-panel .text-body-small',
      about: '#about ~ .display-flex .pv-shared-text-with-see-more span[aria-hidden="true"], .pv-about__summary-text, section.pv-about-section div.inline-show-more-text',
      // Connection count - usually in link with href containing /connections
      connectionCount: 'a[href*="/connections"] span.t-bold, a[href*="/connections"], .pv-top-card--list-bullet li span.t-bold',
      // Follower count - look for text containing "followers" or link with followers href
      followerCount: 'a[href*="followers"] span.t-bold, span.t-bold[aria-hidden="true"], .pv-top-card--list-bullet .t-bold, .pv-text-details__left-panel span.t-bold',
      profilePhoto: 'img.pv-top-card-profile-picture__image, .presence-entity__image, img.profile-photo-edit__preview',
      backgroundPhoto: '.profile-background-image__image',
      currentCompany: '.pv-text-details__right-panel li:first-child, .inline-show-more-text',
      education: '.pv-text-details__right-panel li:nth-child(2)'
    },

    // Analytics dashboard selectors (updated)
    analytics: {
      profileViews: '[href*="profile-views"] span.t-bold, [data-test-id="profile-views"] .t-black--light, .analytics-card .t-20, .pv-dashboard-section span.t-20',
      postImpressions: '[href*="post-impressions"] span.t-bold, [data-test-id="post-impressions"] .t-black--light',
      searchAppearances: '[href*="search-appearances"] span.t-bold, [data-test-id="search-appearances"] .t-black--light',
      followerCount: '.pv-recent-activity-section__follower-count'
    },

    // Feed selectors
    feed: {
      posts: '.feed-shared-update-v2',
      postAuthor: '.feed-shared-actor__name',
      postContent: '.feed-shared-text__text-view',
      postTimestamp: '.feed-shared-actor__sub-description',
      postLikes: '.social-details-social-counts__reactions-count',
      postComments: '.social-details-social-counts__comments'
    },

    // Connection selectors
    connections: {
      connectionCard: '.mn-connection-card',
      connectionName: '.mn-connection-card__name',
      connectionOccupation: '.mn-connection-card__occupation',
      connectionTime: '.time-badge'
    },

    // URN extraction
    urn: {
      profileUrn: '[data-entity-urn*="member"], [data-urn*="member"]',
      activityUrn: '[data-activity-urn]'
    }
  };

  // ============================================
  // EXTRACTION FUNCTIONS
  // ============================================

  /**
   * Safe query selector that returns null if element not found
   */
  function safeQuery(selector, context = document) {
    try {
      return context.querySelector(selector);
    } catch (e) {
      return null;
    }
  }

  /**
   * Safe query selector all
   */
  function safeQueryAll(selector, context = document) {
    try {
      return Array.from(context.querySelectorAll(selector));
    } catch (e) {
      return [];
    }
  }

  /**
   * Get text content safely
   */
  function getText(selector, context = document) {
    const element = safeQuery(selector, context);
    return element ? element.textContent.trim() : null;
  }

  /**
   * Get attribute safely
   */
  function getAttr(selector, attr, context = document) {
    const element = safeQuery(selector, context);
    return element ? element.getAttribute(attr) : null;
  }

  /**
   * Parse number from text (e.g., "1.5K" -> 1500)
   */
  function parseNumber(text) {
    if (!text) return null;

    const cleaned = text.replace(/,/g, '').trim();

    if (cleaned.includes('K') || cleaned.includes('k')) {
      return Math.round(parseFloat(cleaned) * 1000);
    }
    if (cleaned.includes('M') || cleaned.includes('m')) {
      return Math.round(parseFloat(cleaned) * 1000000);
    }

    const num = parseInt(cleaned, 10);
    return isNaN(num) ? null : num;
  }

  // ============================================
  // PROFILE EXTRACTION
  // ============================================

  /**
   * Extract profile data from current page
   */
  function extractProfileData() {
    const data = {
      extractedAt: new Date().toISOString(),
      source: 'dom',
      url: window.location.href
    };

    // Basic info
    data.name = getText(SELECTORS.profile.name);
    data.headline = getText(SELECTORS.profile.headline);
    data.location = getText(SELECTORS.profile.location);
    data.about = getText(SELECTORS.profile.about);

    // Connections and followers - try selector-based first
    const connectionText = getText(SELECTORS.profile.connectionCount);
    const followerText = getText(SELECTORS.profile.followerCount);

    data.connections = parseNumber(connectionText);
    data.followers = parseNumber(followerText);

    console.log('[DOMExtractor] Selector-based extraction:', {
      connectionText,
      followerText,
      connections: data.connections,
      followers: data.followers
    });

    // Fallback: Text-based extraction if selectors failed
    // Search the page text for patterns like "263 followers" and "116 connections"
    // NOTE: LinkedIn modifies RegExp - use [0-9] instead of \d, avoid 'i' flag
    if (!data.followers || !data.connections) {
      const bodyText = document.body.innerText;

      // Look for followers pattern (case-sensitive due to LinkedIn RegExp issues)
      if (!data.followers) {
        // Try both cases since we can't use 'i' flag
        const followersRegex = new RegExp('([0-9,]+) followers');
        const followersMatch = bodyText.match(followersRegex);
        if (followersMatch) {
          data.followers = parseInt(followersMatch[1].replace(/,/g, ''), 10);
          console.log('[DOMExtractor] Text fallback found followers:', data.followers);
        }
      }

      // Look for connections pattern
      if (!data.connections) {
        const connectionsRegex = new RegExp('([0-9,]+) connections');
        const connectionsMatch = bodyText.match(connectionsRegex);
        if (connectionsMatch) {
          data.connections = parseInt(connectionsMatch[1].replace(/,/g, ''), 10);
          console.log('[DOMExtractor] Text fallback found connections:', data.connections);
        }
      }
    }

    // Photos
    data.profilePhotoUrl = getAttr(SELECTORS.profile.profilePhoto, 'src');
    data.backgroundPhotoUrl = getAttr(SELECTORS.profile.backgroundPhoto, 'src');

    // Current position
    data.currentCompany = getText(SELECTORS.profile.currentCompany);
    data.education = getText(SELECTORS.profile.education);

    // Extract URN
    data.memberUrn = extractMemberUrn();

    console.log('[DOMExtractor] Final profile data:', {
      name: data.name,
      followers: data.followers,
      connections: data.connections,
      headline: data.headline?.substring(0, 30)
    });

    return data;
  }

  /**
   * Extract member URN from page
   */
  function extractMemberUrn() {
    // Method 1: From data attributes
    const urnElement = safeQuery(SELECTORS.urn.profileUrn);
    if (urnElement) {
      const urn = urnElement.dataset.entityUrn || urnElement.dataset.urn;
      if (urn) return urn;
    }

    // Method 2: From URL
    const urlMatch = window.location.href.match(/\/in\/([^\/\?]+)/);
    if (urlMatch) {
      return `vanity:${urlMatch[1]}`;
    }

    // Method 3: From profile URL in page
    const profileLink = safeQuery('a[href*="/in/"]');
    if (profileLink) {
      const href = profileLink.getAttribute('href');
      const match = href.match(/\/in\/([^\/\?]+)/);
      if (match) return `vanity:${match[1]}`;
    }

    return null;
  }

  // ============================================
  // ANALYTICS EXTRACTION
  // ============================================

  /**
   * Extract analytics data from dashboard (updated for Creator Analytics page)
   */
  function extractAnalyticsData() {
    const data = {
      extractedAt: new Date().toISOString(),
      source: 'dom',
      url: window.location.href
    };

    // Detect if we're on the new Creator Analytics page
    const isCreatorAnalytics = window.location.pathname.includes('/analytics/creator');

    if (isCreatorAnalytics) {
      // Extract from Creator Analytics page structure
      data.pageType = 'creator_analytics';

      // Get time range from button
      const timeRangeBtn = safeQuery('button[type="button"]');
      if (timeRangeBtn && timeRangeBtn.textContent.includes('Past')) {
        data.timeRange = timeRangeBtn.textContent.trim();
      }

      // Direct extraction from main content using proper CSS selectors
      const mainEl = safeQuery('main');
      if (mainEl) {
        // Find all list items (li elements or elements with role="listitem")
        const allListItems = safeQueryAll('main li, main [role="listitem"]');

        allListItems.forEach(item => {
          const text = item.textContent || '';

          // Extract impressions - look for number followed by "Impressions"
          if (text.includes('Impressions') && !data.impressions) {
            // The number is usually in the first child element
            const firstChild = item.firstElementChild;
            if (firstChild) {
              const num = parseNumber(firstChild.textContent);
              if (num && num > 0) {
                data.impressions = num;
              }
            }
            // Fallback: look for number pattern in text
            if (!data.impressions) {
              const numMatch = text.match(/^[\s]*(\d+)[\s\S]*Impressions/i);
              if (numMatch) {
                data.impressions = parseInt(numMatch[1]);
              }
            }
          }

          // Extract members reached
          if (text.includes('Members reached') && !data.membersReached) {
            const firstChild = item.firstElementChild;
            if (firstChild) {
              const num = parseNumber(firstChild.textContent);
              if (num && num > 0) {
                data.membersReached = num;
              }
            }
            // Fallback
            if (!data.membersReached) {
              const numMatch = text.match(/^[\s]*(\d+)[\s\S]*Members reached/i);
              if (numMatch) {
                data.membersReached = parseInt(numMatch[1]);
              }
            }
          }
        });

        // Extract percentage changes from visible text
        const mainText = mainEl.textContent;
        const changeMatches = mainText.match(/(?:increase|decrease) by ([\d.]+)%/gi) || [];
        if (changeMatches.length > 0) {
          data.changes = changeMatches;
        }
      }

      // Extract chart data from Highcharts images
      const chartImages = safeQueryAll('img[alt*="Impressions"]');
      if (chartImages.length > 0) {
        data.chartData = [];
        chartImages.forEach(img => {
          const alt = img.getAttribute('alt') || '';
          // Parse: "1. Saturday, Jan 3, 2026, Impressions, 2"
          const match = alt.match(/(\d+)\.\s+(\w+),\s+(\w+\s+\d+,\s+\d+),\s+Impressions,\s+(\d+)/);
          if (match) {
            data.chartData.push({
              day: parseInt(match[1]),
              dayName: match[2],
              date: match[3],
              impressions: parseInt(match[4])
            });
          }
        });
      }

      // Extract top performing posts
      const postLinks = safeQueryAll('a[href*="/feed/update/urn:li:activity:"]');
      if (postLinks.length > 0) {
        data.topPosts = [];
        const processedUrns = new Set();

        postLinks.forEach(link => {
          const href = link.getAttribute('href') || '';
          const urnMatch = href.match(/urn:li:activity:(\d+)/);
          if (urnMatch && !processedUrns.has(urnMatch[1])) {
            processedUrns.add(urnMatch[1]);

            const listItem = link.closest('listitem, li');
            if (listItem) {
              const post = {
                activityUrn: `urn:li:activity:${urnMatch[1]}`,
                url: href
              };

              // Get content
              const contentEl = listItem.querySelector('a[href*="updateEntityUrn"] + *') ||
                               listItem.querySelector('[class*="text"]');
              if (contentEl) {
                post.content = contentEl.textContent.trim().substring(0, 200);
              }

              // Get impressions from the analytics link
              const impressionsLink = listItem.querySelector('a[href*="/analytics/post-summary/"]');
              if (impressionsLink) {
                const impMatch = impressionsLink.textContent.match(/(\d+)\s*Impressions/i);
                if (impMatch) post.impressions = parseInt(impMatch[1]);
              }

              // Get reactions
              const reactionsBtn = listItem.querySelector('button[type="button"]');
              if (reactionsBtn) {
                const reactMatch = reactionsBtn.textContent.match(/(\d+)\s*reactions/i);
                if (reactMatch) post.reactions = parseInt(reactMatch[1]);
              }

              // Get comments (search in text content since :has-text is not valid CSS)
              const commMatch = listItem.textContent.match(/(\d+)\s*comments/i);
              if (commMatch) post.comments = parseInt(commMatch[1]);

              // Get timestamp
              const timeText = listItem.textContent.match(/(\d+(?:mo|yr|d|h|w))/);
              if (timeText) post.timestamp = timeText[1];

              data.topPosts.push(post);
            }
          }
        });
      }

      console.log('[DOMExtractor] Extracted Creator Analytics:', data);
    } else {
      // Legacy dashboard extraction
      const profileViewsText = getText(SELECTORS.analytics.profileViews);
      const postImpressionsText = getText(SELECTORS.analytics.postImpressions);
      const searchAppearancesText = getText(SELECTORS.analytics.searchAppearances);

      data.profileViews = parseNumber(profileViewsText);
      data.postImpressions = parseNumber(postImpressionsText);
      data.searchAppearances = parseNumber(searchAppearancesText);

      // Look for analytics cards
      const analyticsCards = safeQueryAll('.analytics-card, .pv-dashboard-section');
      analyticsCards.forEach(card => {
        const title = getText('.t-14, .pv-dashboard-section__title', card);
        const value = getText('.t-20, .pv-dashboard-section__value', card);

        if (title && value) {
          const key = title.toLowerCase().replace(/\s+/g, '_');
          data[key] = parseNumber(value) || value;
        }
      });
    }

    return data;
  }

  // ============================================
  // POST ANALYTICS EXTRACTION
  // ============================================

  /**
   * Extract detailed analytics for a single post from /analytics/post-summary/ page
   */
  function extractPostAnalyticsData() {
    const data = {
      extractedAt: new Date().toISOString(),
      source: 'dom',
      url: window.location.href,
      pageType: 'post_analytics'
    };

    // Extract activity URN from URL
    const urnMatch = window.location.pathname.match(/urn:li:activity:(\d+)/);
    if (urnMatch) {
      data.activityUrn = `urn:li:activity:${urnMatch[1]}`;
      data.activityId = urnMatch[1];
    }

    // Get post content preview
    const mainEl = safeQuery('main');
    if (!mainEl) {
      console.log('[DOMExtractor] Post analytics: main element not found');
      return data;
    }

    // Extract post author and timestamp
    const postLink = safeQuery('a[href*="/feed/update/"]', mainEl);
    if (postLink) {
      const linkText = postLink.textContent || '';
      const timeMatch = linkText.match(/(\d+(?:mo|yr|d|h|w|min))/);
      if (timeMatch) data.postAge = timeMatch[1];

      // Get author name
      const authorEl = safeQuery('[class*="Om Rajpal"], .text-body-medium', postLink) || postLink;
      const authorMatch = (authorEl.textContent || '').match(/^([^•]+)/);
      if (authorMatch) data.author = authorMatch[1].replace('posted this', '').trim();
    }

    // Extract post content
    const contentEl = safeQuery('main [class*="feed-shared-text"], main .break-words', mainEl);
    if (contentEl) {
      data.postContent = contentEl.textContent.trim().substring(0, 500);
    }

    // Discovery section - Impressions and Members reached
    const discoverySection = Array.from(safeQueryAll('main section, main region, main [role="region"]'))
      .find(el => el.textContent.includes('Discovery'));

    if (discoverySection) {
      const listItems = safeQueryAll('li, [role="listitem"]', discoverySection);
      listItems.forEach(item => {
        const text = item.textContent || '';
        if (text.includes('Impressions')) {
          const numEl = item.firstElementChild;
          if (numEl) {
            const num = parseNumber(numEl.textContent);
            if (num > 0) data.impressions = num;
          }
        }
        if (text.includes('Members reached')) {
          const numEl = item.firstElementChild;
          if (numEl) {
            const num = parseNumber(numEl.textContent);
            if (num > 0) data.membersReached = num;
          }
        }
      });
    }

    // Fallback: Look for impressions/members anywhere in main
    if (!data.impressions) {
      const allListItems = safeQueryAll('main li, main [role="listitem"]');
      allListItems.forEach(item => {
        const text = item.textContent || '';
        if (text.includes('Impressions') && !data.impressions) {
          const numEl = item.firstElementChild;
          if (numEl) {
            const num = parseNumber(numEl.textContent);
            if (num > 0) data.impressions = num;
          }
        }
        if (text.includes('Members reached') && !data.membersReached) {
          const numEl = item.firstElementChild;
          if (numEl) {
            const num = parseNumber(numEl.textContent);
            if (num > 0) data.membersReached = num;
          }
        }
      });
    }

    // Profile activity section
    const profileActivitySection = Array.from(safeQueryAll('main section, main region, main [role="region"]'))
      .find(el => el.textContent.includes('Profile activity'));

    if (profileActivitySection) {
      const listItems = safeQueryAll('li, [role="listitem"]', profileActivitySection);
      listItems.forEach(item => {
        const text = item.textContent || '';
        // Find the number - it's usually at the end or in a specific element
        const numMatch = text.match(/(\d+)\s*$/);

        if (text.includes('Profile viewers from this post')) {
          if (numMatch) data.profileViewers = parseInt(numMatch[1]);
        }
        if (text.includes('Followers gained from this post')) {
          if (numMatch) data.followersGained = parseInt(numMatch[1]);
        }
      });
    }

    // Social engagement section
    const socialSection = Array.from(safeQueryAll('main section, main region, main [role="region"]'))
      .find(el => el.textContent.includes('Social engagement'));

    data.engagement = {};
    if (socialSection) {
      const listItems = safeQueryAll('li, [role="listitem"]', socialSection);
      listItems.forEach(item => {
        const text = item.textContent || '';
        const numMatch = text.match(/(\d+)/);
        const num = numMatch ? parseInt(numMatch[1]) : 0;

        if (text.includes('Reactions')) data.engagement.reactions = num;
        if (text.includes('Comments')) data.engagement.comments = num;
        if (text.includes('Reposts')) data.engagement.reposts = num;
        if (text.includes('Saves')) data.engagement.saves = num;
        if (text.includes('Sends on LinkedIn')) data.engagement.sends = num;
      });
    }

    // Post viewers demographics section
    const demographicsSection = Array.from(safeQueryAll('main section, main region, main [role="region"]'))
      .find(el => el.textContent.includes('Post viewers demographics'));

    if (demographicsSection) {
      data.demographics = [];
      const listItems = safeQueryAll('li, [role="listitem"]', demographicsSection);
      listItems.forEach(item => {
        const text = item.textContent || '';
        const percentMatch = text.match(/(\d+)%/);
        if (percentMatch) {
          const demographic = {
            percentage: parseInt(percentMatch[1])
          };

          // Determine type based on description text
          if (text.includes('experience level')) {
            demographic.type = 'experience';
            demographic.value = text.split('With this')[0].trim();
          } else if (text.includes('industry')) {
            demographic.type = 'industry';
            demographic.value = text.split('In this')[0].trim();
          } else if (text.includes('location')) {
            demographic.type = 'location';
            demographic.value = text.split('From this')[0].trim();
          } else if (text.includes('company')) {
            demographic.type = 'company';
            demographic.value = text.split('From this')[0].trim();
          } else if (text.includes('job title')) {
            demographic.type = 'job_title';
            demographic.value = text.split('With this')[0].trim();
          }

          if (demographic.value) {
            data.demographics.push(demographic);
          }
        }
      });
    }

    // Calculate engagement rate
    if (data.impressions && data.engagement) {
      const totalEngagement = (data.engagement.reactions || 0) +
                              (data.engagement.comments || 0) +
                              (data.engagement.reposts || 0) +
                              (data.engagement.saves || 0);
      data.engagementRate = ((totalEngagement / data.impressions) * 100).toFixed(2);
    }

    console.log('[DOMExtractor] Extracted Post Analytics:', data);
    return data;
  }

  // ============================================
  // AUDIENCE ANALYTICS EXTRACTION
  // ============================================

  /**
   * Extract audience analytics from /analytics/creator/audience page
   */
  function extractAudienceAnalytics() {
    const data = {
      extractedAt: new Date().toISOString(),
      source: 'dom',
      url: window.location.href,
      pageType: 'audience_analytics'
    };

    const mainEl = safeQuery('main');
    if (!mainEl) {
      console.log('[DOMExtractor] Audience analytics: main element not found');
      return data;
    }

    const bodyText = mainEl.textContent || '';

    // Extract total followers - look for pattern "X Total followers"
    const followersMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:\n|\s)*Total followers/i);
    if (followersMatch) {
      data.totalFollowers = parseNumber(followersMatch[1]);
    }

    // Alternative: look for large number near "followers"
    if (!data.totalFollowers) {
      const allListItems = safeQueryAll('main li, main [role="listitem"]');
      allListItems.forEach(item => {
        const text = item.textContent || '';
        if (text.includes('Total followers')) {
          const numEl = item.firstElementChild;
          if (numEl) {
            const num = parseNumber(numEl.textContent);
            if (num > 0) data.totalFollowers = num;
          }
        }
      });
    }

    // Extract growth percentage
    const growthMatch = bodyText.match(/([+-]?\d+(?:\.\d+)?)\s*%\s*(?:vs\.?\s*prior|growth|change)/i);
    if (growthMatch) {
      data.followerGrowth = parseFloat(growthMatch[1]);
      data.followerGrowthFormatted = growthMatch[1] + '%';
    }

    // Alternative growth pattern
    if (!data.followerGrowth) {
      const changeMatch = bodyText.match(/(?:increase|decrease|grew|declined) by (\d+(?:\.\d+)?%)/i);
      if (changeMatch) {
        data.followerGrowthFormatted = changeMatch[1];
        data.followerGrowth = parseFloat(changeMatch[1]);
      }
    }

    // Extract new followers count
    const newFollowersMatch = bodyText.match(/(\d+)\s*(?:New followers|new followers)/i);
    if (newFollowersMatch) {
      data.newFollowers = parseInt(newFollowersMatch[1]);
    }

    // Extract demographics preview (links to detailed demographics)
    data.demographicsPreview = {};
    const demoLinks = safeQueryAll('a[href*="/analytics/demographic-detail/"]');
    demoLinks.forEach(link => {
      const text = link.textContent || '';
      const parentLi = link.closest('li') || link.parentElement;
      const parentText = parentLi ? parentLi.textContent : text;

      // Extract top value for each category
      if (parentText.includes('Top industr')) {
        const industryMatch = parentText.match(/Top industr[^:]*:?\s*([^%]+?)(?:\d+%|$)/i);
        if (industryMatch) data.demographicsPreview.topIndustry = industryMatch[1].trim();
      }
      if (parentText.includes('Top location')) {
        const locationMatch = parentText.match(/Top location[^:]*:?\s*([^%]+?)(?:\d+%|$)/i);
        if (locationMatch) data.demographicsPreview.topLocation = locationMatch[1].trim();
      }
      if (parentText.includes('Top seniority') || parentText.includes('experience')) {
        const seniorityMatch = parentText.match(/(?:Top seniority|experience)[^:]*:?\s*([^%]+?)(?:\d+%|$)/i);
        if (seniorityMatch) data.demographicsPreview.topSeniority = seniorityMatch[1].trim();
      }
      if (parentText.includes('Top compan')) {
        const companyMatch = parentText.match(/Top compan[^:]*:?\s*([^%]+?)(?:\d+%|$)/i);
        if (companyMatch) data.demographicsPreview.topCompany = companyMatch[1].trim();
      }
    });

    console.log('[DOMExtractor] Extracted Audience Analytics:', data);
    return data;
  }

  // ============================================
  // AUDIENCE DEMOGRAPHICS EXTRACTION
  // ============================================

  /**
   * Extract detailed audience demographics from /analytics/demographic-detail/ page
   */
  function extractAudienceDemographics() {
    const data = {
      extractedAt: new Date().toISOString(),
      source: 'dom',
      url: window.location.href,
      pageType: 'audience_demographics',
      demographics: {
        industries: [],
        locations: [],
        seniority: [],
        companies: [],
        jobTitles: []
      }
    };

    const mainEl = safeQuery('main');
    if (!mainEl) {
      console.log('[DOMExtractor] Demographics: main element not found');
      return data;
    }

    // Determine demographic type from URL or page content
    const url = window.location.pathname;
    let currentCategory = 'unknown';

    // Detect category from heading
    const headings = safeQueryAll('main h1, main h2, main [role="heading"]');
    headings.forEach(h => {
      const text = h.textContent.toLowerCase();
      if (text.includes('industry') || text.includes('industries')) currentCategory = 'industries';
      if (text.includes('location')) currentCategory = 'locations';
      if (text.includes('seniority') || text.includes('experience')) currentCategory = 'seniority';
      if (text.includes('company') || text.includes('companies')) currentCategory = 'companies';
      if (text.includes('job title') || text.includes('job function')) currentCategory = 'jobTitles';
    });

    // Extract list items with percentages
    const listItems = safeQueryAll('main li, main [role="listitem"]');
    listItems.forEach(item => {
      const text = item.textContent || '';
      const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);

      if (percentMatch) {
        const percentage = parseFloat(percentMatch[1]);
        // Get the value (text before the percentage)
        let value = text.replace(/\d+(?:\.\d+)?\s*%.*/, '').trim();

        // Clean up common suffixes
        value = value.replace(/^\d+\.\s*/, '').trim(); // Remove numbering like "1. "

        if (value && percentage > 0) {
          const entry = { value, percentage };

          // Categorize based on detected category or guess from content
          if (currentCategory !== 'unknown') {
            if (data.demographics[currentCategory]) {
              data.demographics[currentCategory].push(entry);
            }
          } else {
            // Guess category from value content
            if (value.match(/\b(manager|director|senior|junior|entry|executive|vp|chief|lead|head)\b/i)) {
              data.demographics.seniority.push(entry);
            } else if (value.match(/\b(inc|corp|ltd|llc|company|technologies|services|solutions)\b/i)) {
              data.demographics.companies.push(entry);
            } else if (value.match(/\b(united states|india|uk|canada|australia|germany|france|brazil|china|japan|california|new york|london|mumbai)\b/i)) {
              data.demographics.locations.push(entry);
            } else {
              // Default to industries for unmatched items
              data.demographics.industries.push(entry);
            }
          }
        }
      }
    });

    // Also try to extract from sections if list extraction failed
    if (Object.values(data.demographics).every(arr => arr.length === 0)) {
      const sections = safeQueryAll('main section, main [role="region"]');
      sections.forEach(section => {
        const sectionText = section.textContent.toLowerCase();
        let category = null;

        if (sectionText.includes('industry')) category = 'industries';
        else if (sectionText.includes('location')) category = 'locations';
        else if (sectionText.includes('seniority') || sectionText.includes('experience')) category = 'seniority';
        else if (sectionText.includes('company')) category = 'companies';
        else if (sectionText.includes('job title')) category = 'jobTitles';

        if (category) {
          const items = safeQueryAll('li', section);
          items.forEach(item => {
            const text = item.textContent || '';
            const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
            if (percentMatch) {
              const percentage = parseFloat(percentMatch[1]);
              const value = text.replace(/\d+(?:\.\d+)?\s*%.*/, '').trim();
              if (value && percentage > 0) {
                data.demographics[category].push({ value, percentage });
              }
            }
          });
        }
      });
    }

    // Sort each category by percentage descending
    Object.keys(data.demographics).forEach(key => {
      data.demographics[key].sort((a, b) => b.percentage - a.percentage);
    });

    console.log('[DOMExtractor] Extracted Audience Demographics:', data);
    return data;
  }

  // ============================================
  // PROFILE VIEWS EXTRACTION
  // ============================================

  /**
   * Extract profile views data from /analytics/profile-views page
   */
  function extractProfileViewsData() {
    const data = {
      extractedAt: new Date().toISOString(),
      source: 'dom',
      url: window.location.href,
      pageType: 'profile_views',
      viewers: []
    };

    const mainEl = safeQuery('main');
    if (!mainEl) {
      console.log('[DOMExtractor] Profile views: main element not found');
      return data;
    }

    const bodyText = mainEl.textContent || '';

    // Extract total profile views
    const viewsMatch = bodyText.match(/(\d{1,3}(?:,\d{3})*|\d+)\s*(?:profile)?\s*view/i);
    if (viewsMatch) {
      data.totalViews = parseNumber(viewsMatch[1]);
    }

    // Look for specific pattern "X Profile views"
    const profileViewsMatch = bodyText.match(/(\d+)\s*Profile views/i);
    if (profileViewsMatch) {
      data.totalViews = parseInt(profileViewsMatch[1]);
    }

    // Extract growth/change
    const growthMatch = bodyText.match(/([+-]?\d+(?:\.\d+)?%)\s*(?:vs\.?\s*prior|from last)/i);
    if (growthMatch) {
      data.viewsGrowth = growthMatch[1];
    }

    // Extract time period
    const periodMatch = bodyText.match(/(?:Past|Last)\s*(\d+\s*(?:days|weeks|months))/i);
    if (periodMatch) {
      data.timePeriod = periodMatch[1];
    }

    // Extract viewer list if visible
    const viewerCards = safeQueryAll('main [class*="viewer"], main [class*="profile-card"], main .entity-result');
    viewerCards.forEach(card => {
      const viewer = {};

      // Get name
      const nameEl = safeQuery('[class*="name"], .text-body-medium, h3', card);
      if (nameEl) viewer.name = nameEl.textContent.trim();

      // Get headline
      const headlineEl = safeQuery('[class*="headline"], [class*="occupation"], .text-body-small', card);
      if (headlineEl) viewer.headline = headlineEl.textContent.trim();

      // Get profile link
      const linkEl = safeQuery('a[href*="/in/"]', card);
      if (linkEl) {
        viewer.profileUrl = linkEl.getAttribute('href');
        const match = viewer.profileUrl.match(/\/in\/([^\/\?]+)/);
        if (match) viewer.vanityName = match[1];
      }

      // Get view time
      const timeEl = safeQuery('[class*="time"], .time-ago', card);
      if (timeEl) viewer.viewedAt = timeEl.textContent.trim();

      if (viewer.name || viewer.profileUrl) {
        data.viewers.push(viewer);
      }
    });

    // Extract from simpler list format
    if (data.viewers.length === 0) {
      const listItems = safeQueryAll('main li');
      listItems.forEach(item => {
        const linkEl = safeQuery('a[href*="/in/"]', item);
        if (linkEl) {
          const viewer = {
            name: linkEl.textContent.trim(),
            profileUrl: linkEl.getAttribute('href')
          };
          const match = viewer.profileUrl.match(/\/in\/([^\/\?]+)/);
          if (match) viewer.vanityName = match[1];
          data.viewers.push(viewer);
        }
      });
    }

    console.log('[DOMExtractor] Extracted Profile Views:', data);
    return data;
  }

  // ============================================
  // CREATOR ANALYTICS EXTRACTION (ENHANCED)
  // ============================================

  /**
   * Extract creator analytics data - enhanced version for auto-capture
   * Alias/wrapper for extractAnalyticsData that ensures all fields are captured
   */
  function extractCreatorAnalytics() {
    const data = extractAnalyticsData();

    // Ensure we have the creator_analytics page type
    if (window.location.pathname.includes('/analytics/creator')) {
      data.pageType = 'creator_analytics';

      // Determine subtype
      if (window.location.pathname.includes('/content')) {
        data.subtype = 'content';
      } else if (window.location.pathname.includes('/audience')) {
        data.subtype = 'audience';
        // Merge audience data if on audience page
        const audienceData = extractAudienceAnalytics();
        Object.assign(data, audienceData);
      } else if (window.location.pathname.includes('/top-posts')) {
        data.subtype = 'top_posts';
      }
    }

    return data;
  }

  // ============================================
  // FEED EXTRACTION
  // ============================================

  /**
   * Extract posts from feed
   */
  function extractFeedPosts(limit = 10) {
    const posts = [];
    const postElements = safeQueryAll(SELECTORS.feed.posts).slice(0, limit);

    postElements.forEach((postEl, index) => {
      const post = {
        index: index,
        extractedAt: new Date().toISOString()
      };

      post.author = getText(SELECTORS.feed.postAuthor, postEl);
      post.content = getText(SELECTORS.feed.postContent, postEl);
      post.timestamp = getText(SELECTORS.feed.postTimestamp, postEl);

      const likesText = getText(SELECTORS.feed.postLikes, postEl);
      const commentsText = getText(SELECTORS.feed.postComments, postEl);

      post.likes = parseNumber(likesText);
      post.comments = parseNumber(commentsText);

      // Get activity URN
      const activityUrn = postEl.dataset.activityUrn || getAttr('[data-activity-urn]', 'data-activity-urn', postEl);
      post.activityUrn = activityUrn;

      posts.push(post);
    });

    return posts;
  }

  // ============================================
  // CONNECTIONS EXTRACTION
  // ============================================

  /**
   * Extract connections from connections page
   */
  function extractConnections(limit = 50) {
    const connections = [];
    const connectionCards = safeQueryAll(SELECTORS.connections.connectionCard).slice(0, limit);

    connectionCards.forEach((card, index) => {
      const connection = {
        index: index,
        extractedAt: new Date().toISOString()
      };

      connection.name = getText(SELECTORS.connections.connectionName, card);
      connection.occupation = getText(SELECTORS.connections.connectionOccupation, card);
      connection.connectedTime = getText(SELECTORS.connections.connectionTime, card);

      // Get profile link
      const profileLink = safeQuery('a[href*="/in/"]', card);
      if (profileLink) {
        connection.profileUrl = profileLink.getAttribute('href');
        const match = connection.profileUrl.match(/\/in\/([^\/\?]+)/);
        if (match) connection.vanityName = match[1];
      }

      connections.push(connection);
    });

    return connections;
  }

  // ============================================
  // COOKIE EXTRACTION (for reference)
  // ============================================

  /**
   * Extract cookies from document.cookie
   */
  function extractCookies() {
    const cookies = {};
    document.cookie.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name) {
        cookies[name] = value || '';
      }
    });
    return cookies;
  }

  /**
   * Get LinkedIn auth token from cookies
   */
  function getAuthToken() {
    const cookies = extractCookies();
    return cookies['li_at'] || null;
  }

  /**
   * Get CSRF token from cookies
   */
  function getCsrfToken() {
    const cookies = extractCookies();
    // JSESSIONID is surrounded by quotes
    const token = cookies['JSESSIONID'] || '';
    return token.replace(/"/g, '');
  }

  // ============================================
  // PAGE TYPE DETECTION
  // ============================================

  /**
   * Detect what type of LinkedIn page we're on
   */
  function detectPageType() {
    const url = window.location.href;
    const pathname = window.location.pathname;

    // Check for profile page pattern first
    if (/\/in\/[^\/]+\/?$/.test(pathname)) {
      return 'profile';
    }
    if (pathname === '/feed/' || pathname === '/feed') {
      return 'feed';
    }
    if (pathname.includes('/mynetwork/')) {
      return 'network';
    }

    // Analytics pages (most specific first)

    // Post analytics page
    if (pathname.includes('/analytics/post-summary/')) {
      return 'post_analytics';
    }

    // Demographic detail pages
    if (pathname.includes('/analytics/demographic-detail/')) {
      // Check if it's for a profile (audience) or post
      if (pathname.includes('urn:li:fsd_profile')) {
        return 'audience_demographics';
      }
      if (pathname.includes('urn:li:activity')) {
        return 'post_demographics';
      }
      return 'audience_demographics'; // Default to audience
    }

    // Profile views page
    if (pathname.includes('/analytics/profile-views')) {
      return 'profile_views';
    }

    // Creator analytics pages
    if (pathname.includes('/analytics/creator/audience')) {
      return 'audience_analytics';
    }
    if (pathname.includes('/analytics/creator/content') || pathname.includes('/analytics/creator/top-posts')) {
      return 'creator_analytics';
    }
    if (pathname.includes('/analytics/creator')) {
      return 'creator_analytics';
    }

    // General analytics fallback
    if (pathname.includes('/analytics/')) {
      return 'analytics';
    }

    if (pathname.includes('/messaging/')) {
      return 'messaging';
    }
    if (pathname.includes('/jobs/')) {
      return 'jobs';
    }
    if (pathname.includes('/search/')) {
      return 'search';
    }

    return 'other';
  }

  // ============================================
  // PUBLIC API
  // ============================================

  window.LinkedInDOMExtractor = {
    // Core extractors
    extractProfileData,
    extractAnalyticsData,
    extractPostAnalyticsData,
    extractFeedPosts,
    extractConnections,
    extractCookies,
    getAuthToken,
    getCsrfToken,
    extractMemberUrn,
    detectPageType,

    // New Phase 2 extractors for auto-capture
    extractCreatorAnalytics,
    extractAudienceAnalytics,
    extractAudienceDemographics,
    extractProfileViewsData,

    // Extract all available data from current page
    extractAll: function() {
      const pageType = detectPageType();
      const data = {
        pageType: pageType,
        url: window.location.href,
        extractedAt: new Date().toISOString(),
        cookies: extractCookies(),
        memberUrn: extractMemberUrn()
      };

      switch (pageType) {
        case 'profile':
          data.profile = extractProfileData();
          break;
        case 'feed':
          data.posts = extractFeedPosts();
          break;
        case 'network':
          data.connections = extractConnections();
          break;
        case 'analytics':
        case 'creator_analytics':
          data.analytics = extractCreatorAnalytics();
          break;
        case 'audience_analytics':
          data.audience = extractAudienceAnalytics();
          break;
        case 'post_analytics':
          data.postAnalytics = extractPostAnalyticsData();
          break;
        case 'post_demographics':
        case 'audience_demographics':
          data.demographics = extractAudienceDemographics();
          break;
        case 'profile_views':
          data.profileViews = extractProfileViewsData();
          break;
        default:
          // Try to extract what we can
          data.profile = extractProfileData();
      }

      return data;
    }
  };

  console.log('[DOMExtractor] DOM extractor initialized successfully');

  // Signal ready
  window.dispatchEvent(new CustomEvent('linkedin-dom-extractor-ready'));

})();
