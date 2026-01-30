/**
 * LinkedIn Analytics Pro - Popup Script
 * Enhanced dashboard with insights and analytics
 */

(function() {
  'use strict';

  // ============================================
  // STATE
  // ============================================

  const state = {
    profile: null,
    analytics: null,
    connections: [],
    posts: [],
    isAuthenticated: false,
    currentView: 'dashboard',
    chartPeriod: 'week'
  };

  // ============================================
  // DOM ELEMENTS
  // ============================================

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // Elements will be populated after DOM is ready
  let elements = {};

  function initElements() {
    elements = {
      // Navigation
      navPills: $$('.nav-pill'),
      views: $$('.view'),

      // Profile
      profileAvatar: $('#profile-avatar'),
      profileName: $('#profile-name'),
      profileHeadline: $('#profile-headline'),
      profileLocation: $('#profile-location span'),
      profileIndustry: $('#profile-industry span'),
      premiumBadge: $('#premium-badge'),

      // Stats
      statConnections: $('#stat-connections'),
      statViews: $('#stat-views'),
      statSearch: $('#stat-search'),
      connectionsGrowth: $('#connections-growth'),
      viewsGrowth: $('#views-growth'),

      // Status
      statusIndicator: $('#status-indicator'),

      // Chart
      chartArea: $('#chart-area'),
      chartPlaceholder: $('#chart-placeholder'),
      chartTabs: $$('.chart-tab'),

      // Viewers
      viewersList: $('#viewers-list'),
      viewerCount: $('#viewer-count'),

      // Posts/Top Hits
      postsList: $('#posts-list'),
      postsCount: $('#posts-count'),

      // Connections
      connectionsList: $('#connections-list'),
      searchConnections: $('#search-connections'),
      showingCount: $('#showing-count'),
      totalCount: $('#total-count'),
      filterChips: $$('.chip'),

      // Insights
      industryList: $('#industry-list'),
      companyList: $('#company-list'),
      locationList: $('#location-list'),
      networkScore: $('#network-score'),
      scoreCircle: $('#score-circle'),

      // Buttons
      btnFetch: $('#btn-fetch'),
      btnRefresh: $('#btn-refresh'),
      btnExportJson: $('#btn-export-json'),
      btnExportCsv: $('#btn-export-csv'),
      btnExportAllJson: $('#btn-export-all-json'),
      btnExportAllCsv: $('#btn-export-all-csv'),
      btnClearData: $('#btn-clear-data'),
      btnLoadConnections: $('#btn-load-connections'),

      // Settings
      toggleAutoCapture: $('#toggle-auto-capture'),
      toggleStoreImages: $('#toggle-store-images'),

      // Loading
      loadingOverlay: $('#loading-overlay'),
      loadingText: $('#loading-text'),
      progressBar: $('#progress-bar'),

      // Toast
      toast: $('#toast'),
      toastMessage: $('#toast-message'),
      toastIcon: $('#toast-icon'),

      // Supabase Cloud Sync
      supabaseSignedOut: $('#supabase-signed-out'),
      supabaseSignedIn: $('#supabase-signed-in'),
      supabaseNotConfigured: $('#supabase-not-configured'),
      btnSupabaseSignin: $('#btn-supabase-signin'),
      btnSupabaseSignup: $('#btn-supabase-signup'),
      btnSupabaseSignout: $('#btn-supabase-signout'),
      btnSyncNow: $('#btn-sync-now'),
      btnFullSync: $('#btn-full-sync'),
      authEmail: $('#auth-email'),
      authPassword: $('#auth-password'),
      authError: $('#auth-error'),
      supabaseUserAvatar: $('#supabase-user-avatar'),
      supabaseUserName: $('#supabase-user-name'),
      supabaseUserEmail: $('#supabase-user-email'),
      syncStatusIndicator: $('#sync-status-indicator'),
      syncStatusText: $('#sync-status-text'),
      lastSyncTime: $('#last-sync-time'),
      pendingChangesCount: $('#pending-changes-count')
    };
  }

  // ============================================
  // MESSAGING
  // ============================================

  async function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  // ============================================
  // UI HELPERS
  // ============================================

  function showLoading(text = 'Loading...', progress = 0) {
    if (elements.loadingText) elements.loadingText.textContent = text;
    if (elements.progressBar) elements.progressBar.style.width = `${progress}%`;
    if (elements.loadingOverlay) elements.loadingOverlay.classList.remove('hidden');
  }

  function updateLoadingProgress(text, progress) {
    if (elements.loadingText) elements.loadingText.textContent = text;
    if (elements.progressBar) elements.progressBar.style.width = `${progress}%`;
  }

  function hideLoading() {
    if (elements.loadingOverlay) elements.loadingOverlay.classList.add('hidden');
    if (elements.progressBar) elements.progressBar.style.width = '0%';
  }

  function showToast(message, type = 'info') {
    if (!elements.toast || !elements.toastIcon || !elements.toastMessage) return;

    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>',
      error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
      warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
      info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
    };

    elements.toastIcon.innerHTML = icons[type] || icons.info;
    elements.toastMessage.textContent = message;
    elements.toast.className = `toast ${type}`;
    elements.toast.classList.remove('hidden');

    setTimeout(() => {
      if (elements.toast) elements.toast.classList.add('hidden');
    }, 3500);
  }

  function switchView(viewName) {
    state.currentView = viewName;

    if (elements.navPills) {
      elements.navPills.forEach(pill => {
        if (pill) pill.classList.toggle('active', pill.dataset.view === viewName);
      });
    }

    if (elements.views) {
      elements.views.forEach(view => {
        if (view) view.classList.toggle('active', view.id === `${viewName}-view`);
      });
    }

    // Load data when switching views
    if (viewName === 'connections' && state.connections.length > 0) {
      renderConnections();
    } else if (viewName === 'insights' && state.connections.length > 0) {
      renderInsights();
    }
  }

  function animateValue(element, start, end, duration = 1000) {
    if (!element) return;

    const startTime = performance.now();
    const diff = end - start;

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = Math.round(start + diff * eased);
      element.textContent = formatNumber(current);
      element.dataset.value = current;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  // ============================================
  // DATA DISPLAY
  // ============================================

  function updateProfile(profile) {
    if (!profile) return;

    state.profile = profile;

    // Name
    const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'LinkedIn User';
    if (elements.profileName) elements.profileName.textContent = fullName;

    // Headline
    if (elements.profileHeadline) elements.profileHeadline.textContent = profile.headline || 'Connect to see your profile';

    // Location
    if ((profile.locationName || profile.location) && elements.profileLocation) {
      elements.profileLocation.textContent = profile.locationName || profile.location;
    }

    // Industry
    if ((profile.industryName || profile.industry) && elements.profileIndustry) {
      elements.profileIndustry.textContent = profile.industryName || profile.industry;
    }

    // Avatar
    if (profile.profilePicture && elements.profileAvatar) {
      elements.profileAvatar.innerHTML = `<img src="${profile.profilePicture}" alt="${fullName}">`;
    }

    // Premium badge
    if (profile.premium && elements.premiumBadge) {
      elements.premiumBadge.style.display = 'block';
    }

    // Connection count
    const connCount = profile.connectionsCount || profile.numConnections || 0;
    animateValue(elements.statConnections, 0, connCount);
  }

  function updateAnalytics(analytics) {
    if (!analytics) return;

    state.analytics = analytics;

    // Profile views (old format)
    if (analytics.profileViews !== undefined) {
      animateValue(elements.statViews, 0, analytics.profileViews);
      if (elements.viewsGrowth) elements.viewsGrowth.textContent = '+' + (analytics.profileViewsGrowth || '0%');
    }

    // Search appearances (old format)
    if (analytics.searchAppearances !== undefined) {
      animateValue(elements.statSearch, 0, analytics.searchAppearances);
    }

    // Creator Analytics - Impressions (new format)
    if (analytics.impressions !== undefined) {
      // Display impressions in the views card if no profile views
      if (analytics.profileViews === undefined) {
        animateValue(elements.statViews, 0, analytics.impressions);
        // Update label to show "Impressions" instead of "Profile Views"
        const viewsLabel = document.querySelector('[data-type="views"] .stat-label');
        if (viewsLabel) viewsLabel.textContent = 'Impressions';
      }
      // Also update growth if available
      if (analytics.changes && analytics.changes.length > 0 && elements.viewsGrowth) {
        elements.viewsGrowth.textContent = analytics.changes[0];
      }
    }

    // Creator Analytics - Members Reached (new format)
    if (analytics.membersReached !== undefined) {
      // Display in search card if no search appearances
      if (analytics.searchAppearances === undefined) {
        animateValue(elements.statSearch, 0, analytics.membersReached);
        // Update label to show "Reached" instead of "Search Hits"
        const searchLabel = document.querySelector('[data-type="search"] .stat-label');
        if (searchLabel) searchLabel.textContent = 'Reached';
      }
    }

    // Recent viewers
    if (analytics.recentViewers && analytics.recentViewers.length > 0) {
      renderViewers(analytics.recentViewers);
    }

    // Creator Analytics - Top Posts (new format)
    if (analytics.topPosts && analytics.topPosts.length > 0) {
      console.log('[Popup] Creator Analytics top posts:', analytics.topPosts.length);
    }
  }

  /**
   * Update display with detailed post analytics
   */
  function updatePostAnalytics(postAnalyticsData) {
    if (!postAnalyticsData) return;

    console.log('[Popup] Post analytics loaded:', postAnalyticsData.totalCount || 0, 'posts');

    // Store in state
    state.postAnalytics = postAnalyticsData;

    // Update posts list with detailed analytics if available
    if (postAnalyticsData.posts && postAnalyticsData.posts.length > 0) {
      renderPostAnalytics(postAnalyticsData.posts);
    }

    // Update stats display if we have aggregate stats
    if (postAnalyticsData.stats) {
      const stats = postAnalyticsData.stats;

      // Update total impressions display
      const totalImpressionsEl = $('#total-impressions');
      if (totalImpressionsEl) {
        animateValue(totalImpressionsEl, 0, stats.totalImpressions || 0);
      }

      // Update avg engagement rate
      const avgEngagementEl = $('#avg-engagement-rate');
      if (avgEngagementEl) {
        avgEngagementEl.textContent = (stats.avgEngagementRate || '0') + '%';
      }

      console.log('[Popup] Post analytics stats:', stats);
    }
  }

  /**
   * Render detailed post analytics cards
   */
  function renderPostAnalytics(posts) {
    const postsList = $('#posts-list') || $('#post-analytics-list');
    if (!postsList) return;

    // Clear existing content
    postsList.innerHTML = '';

    // Sort by impressions (handle both data structures)
    const sortedPosts = [...posts].sort((a, b) => {
      const impA = a.discovery?.impressions || a.impressions || 0;
      const impB = b.discovery?.impressions || b.impressions || 0;
      return impB - impA;
    });

    // Render top posts
    sortedPosts.slice(0, 10).forEach((post, index) => {
      // Handle both old and new data structures
      const impressions = post.discovery?.impressions || post.impressions || 0;
      const membersReached = post.discovery?.membersReached || 0;
      const reactions = post.socialEngagement?.reactions || post.engagement?.reactions || 0;
      const comments = post.socialEngagement?.comments || post.engagement?.comments || 0;
      const reposts = post.socialEngagement?.reposts || 0;
      const profileViewers = post.profileActivity?.profileViewers || 0;
      const postText = post.postText || post.postContent || 'Post content';

      const card = document.createElement('div');
      card.className = 'post-analytics-card';
      card.innerHTML = `
        <div class="post-rank">#${index + 1}</div>
        <div class="post-content">
          <div class="post-text">${truncateText(postText, 80)}</div>
          <div class="post-metrics">
            <span class="metric" title="Impressions">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
              </svg>
              ${formatNumber(impressions)}
            </span>
            <span class="metric" title="Members Reached">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
              ${formatNumber(membersReached)}
            </span>
            <span class="metric" title="Reactions">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              ${formatNumber(reactions)}
            </span>
            <span class="metric" title="Comments">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"/>
              </svg>
              ${formatNumber(comments)}
            </span>
            ${post.engagementRate ? `<span class="metric engagement-rate" title="Engagement Rate">${post.engagementRate}%</span>` : ''}
          </div>
          <div class="post-extra-metrics">
            ${profileViewers > 0 ? `<span class="extra-metric">Profile Views: ${profileViewers}</span>` : ''}
            ${reposts > 0 ? `<span class="extra-metric">Reposts: ${reposts}</span>` : ''}
          </div>
          ${post.demographics && post.demographics.length > 0 ? `
            <div class="post-demographics">
              ${post.demographics.slice(0, 3).map(d => `<span class="demo-tag">${d.value}: ${d.percentage}%</span>`).join('')}
            </div>
          ` : ''}
        </div>
        <div class="post-age">${post.postAge || ''}</div>
      `;

      // Add click handler to open post
      card.addEventListener('click', () => {
        if (post.activityUrn) {
          const postUrl = `https://www.linkedin.com/feed/update/${post.activityUrn}/`;
          chrome.tabs.create({ url: postUrl });
        }
      });

      postsList.appendChild(card);
    });

    // Update posts count
    if (elements.postsCount) {
      elements.postsCount.textContent = posts.length;
    }
  }

  /**
   * Update display with audience/follower data
   */
  function updateAudienceData(audienceData) {
    if (!audienceData) return;

    console.log('[Popup] Audience data loaded:', audienceData.totalFollowers, 'followers');

    // Store in state
    state.audienceData = audienceData;

    // Update total followers
    const totalFollowersEl = $('#total-followers');
    if (totalFollowersEl) {
      animateValue(totalFollowersEl, 0, audienceData.totalFollowers || 0);
    }

    // Update follower growth
    const followerGrowthEl = $('#follower-growth');
    if (followerGrowthEl && audienceData.followerGrowth) {
      followerGrowthEl.textContent = audienceData.followerGrowth;
    }

    // Render audience demographics
    if (audienceData.demographics) {
      renderAudienceDemographics(audienceData.demographics);
    }
  }

  /**
   * Render audience demographics breakdown
   */
  function renderAudienceDemographics(demographics) {
    // Update industry list
    if (elements.industryList && demographics.industries) {
      elements.industryList.innerHTML = demographics.industries.slice(0, 5).map(item => `
        <div class="insight-item">
          <span class="insight-label">${item.value}</span>
          <div class="insight-bar-container">
            <div class="insight-bar" style="width: ${item.percentage}%"></div>
          </div>
          <span class="insight-value">${item.percentage}%</span>
        </div>
      `).join('');
    }

    // Update company list
    if (elements.companyList && demographics.topCompanies) {
      elements.companyList.innerHTML = demographics.topCompanies.slice(0, 5).map(item => `
        <div class="insight-item">
          <span class="insight-label">${item.value}</span>
          <div class="insight-bar-container">
            <div class="insight-bar" style="width: ${item.percentage * 10}%"></div>
          </div>
          <span class="insight-value">${item.percentage}%</span>
        </div>
      `).join('');
    }

    // Update location list
    if (elements.locationList && demographics.locations) {
      elements.locationList.innerHTML = demographics.locations.slice(0, 5).map(item => `
        <div class="insight-item">
          <span class="insight-label">${item.value}</span>
          <div class="insight-bar-container">
            <div class="insight-bar" style="width: ${item.percentage}%"></div>
          </div>
          <span class="insight-value">${item.percentage}%</span>
        </div>
      `).join('');
    }

    // Update seniority/experience display if element exists
    const seniorityList = $('#seniority-list');
    if (seniorityList && demographics.seniority) {
      seniorityList.innerHTML = demographics.seniority.slice(0, 5).map(item => `
        <div class="insight-item">
          <span class="insight-label">${item.value}</span>
          <div class="insight-bar-container">
            <div class="insight-bar" style="width: ${item.percentage}%"></div>
          </div>
          <span class="insight-value">${item.percentage}%</span>
        </div>
      `).join('');
    }
  }

  function updateAuthStatus(isAuthenticated) {
    state.isAuthenticated = isAuthenticated;
    if (elements.statusIndicator) {
      elements.statusIndicator.classList.toggle('connected', isAuthenticated);
    }
  }

  function renderViewers(viewers) {
    if (!elements.viewersList || !elements.viewerCount) return;

    if (!viewers || viewers.length === 0) {
      elements.viewersList.innerHTML = `
        <div class="empty-state mini">
          <p>No viewers data available</p>
        </div>
      `;
      elements.viewerCount.textContent = '0';
      return;
    }

    elements.viewerCount.textContent = viewers.length;

    elements.viewersList.innerHTML = viewers.slice(0, 8).map(viewer => `
      <div class="viewer-card" data-url="${viewer.profileUrl || '#'}">
        <div class="viewer-avatar">
          ${viewer.profilePicture
            ? `<img src="${viewer.profilePicture}" alt="">`
            : `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`
          }
        </div>
        <span class="viewer-name">${viewer.firstName || 'Someone'}</span>
      </div>
    `).join('');

    // Click handlers
    elements.viewersList.querySelectorAll('.viewer-card').forEach(card => {
      card.addEventListener('click', () => {
        const url = card.dataset.url;
        if (url && url !== '#') {
          chrome.tabs.create({ url });
        }
      });
    });
  }

  /**
   * Update feed statistics display
   */
  function updateFeedStats(stats, totalCount) {
    // Update captured posts count
    const capturedPostsEl = $('#captured-posts-count');
    if (capturedPostsEl) {
      capturedPostsEl.textContent = totalCount;
    }

    // Update average engagement
    const avgEngagementEl = $('#avg-engagement');
    if (avgEngagementEl) {
      avgEngagementEl.textContent = formatNumber(stats.avgEngagement || 0);
    }

    // Update top hashtags
    const hashtagsEl = $('#top-hashtags');
    if (hashtagsEl && stats.topHashtags && stats.topHashtags.length > 0) {
      hashtagsEl.innerHTML = stats.topHashtags.slice(0, 8).map(h =>
        `<span class="hashtag-chip">${h.tag} <small>(${h.count})</small></span>`
      ).join('');
    }

    // Update post types
    const postTypesEl = $('#post-types');
    if (postTypesEl && stats.postTypes) {
      const types = Object.entries(stats.postTypes).sort((a, b) => b[1] - a[1]);
      postTypesEl.innerHTML = types.map(([type, count]) =>
        `<span class="type-chip ${type}">${type}: ${count}</span>`
      ).join('');
    }
  }

  /**
   * Update comments statistics display
   */
  function updateCommentsStats(data) {
    const commentsCountEl = $('#comments-count');
    if (commentsCountEl) {
      commentsCountEl.textContent = data.totalCount || 0;
    }

    const topCommentsEl = $('#top-comments-count');
    if (topCommentsEl) {
      topCommentsEl.textContent = data.stats?.topCommentsCount || 0;
    }

    const avgCommentLengthEl = $('#avg-comment-length');
    if (avgCommentLengthEl) {
      avgCommentLengthEl.textContent = data.stats?.avgLength || 0;
    }

    // Render top comments if container exists
    const topCommentsList = $('#top-comments-list');
    if (topCommentsList && data.topComments && data.topComments.length > 0) {
      topCommentsList.innerHTML = data.topComments.slice(0, 5).map(c => `
        <div class="comment-card">
          <div class="comment-author">${c.author?.name || 'Unknown'}</div>
          <div class="comment-text">${truncateText(c.text || '', 100)}</div>
          <div class="comment-likes">${c.likes || 0} likes</div>
        </div>
      `).join('');
    }
  }

  /**
   * Update my posts statistics display
   */
  function updateMyPostsStats(data) {
    const myPostsCountEl = $('#my-posts-count');
    if (myPostsCountEl) {
      myPostsCountEl.textContent = data.totalCount || 0;
    }

    const totalImpressionsEl = $('#total-impressions');
    if (totalImpressionsEl) {
      totalImpressionsEl.textContent = formatNumber(data.stats?.totalImpressions || 0);
    }

    const avgEngagementRateEl = $('#avg-engagement-rate');
    if (avgEngagementRateEl) {
      avgEngagementRateEl.textContent = (data.stats?.avgEngagementRate || 0) + '%';
    }

    const avgLikesEl = $('#my-avg-likes');
    if (avgLikesEl) {
      avgLikesEl.textContent = formatNumber(data.stats?.avgLikes || 0);
    }

    // Render best post if exists
    const bestPostEl = $('#best-post');
    if (bestPostEl && data.bestPost) {
      const p = data.bestPost;
      bestPostEl.innerHTML = `
        <div class="best-post-card">
          <div class="best-post-text">${truncateText(p.text || '', 80)}</div>
          <div class="best-post-stats">
            <span>${formatNumber(p.engagement?.likes || 0)} likes</span>
            <span>${formatNumber(p.engagement?.comments || 0)} comments</span>
            <span>${formatNumber(p.analytics?.impressions || 0)} impressions</span>
          </div>
        </div>
      `;
    }
  }

  /**
   * Update followers statistics display
   */
  function updateFollowersStats(data) {
    const followerCountEl = $('#follower-count');
    if (followerCountEl) {
      followerCountEl.textContent = formatNumber(data.followerCount || 0);
    }

    const followersListCountEl = $('#followers-list-count');
    if (followersListCountEl) {
      followersListCountEl.textContent = data.followers?.length || 0;
    }
  }

  function renderPosts(posts) {
    if (!elements.postsList || !elements.postsCount) return;

    if (!posts || posts.length === 0) {
      elements.postsList.innerHTML = `
        <div class="empty-state mini">
          <p>Browse your LinkedIn feed to capture top posts</p>
        </div>
      `;
      elements.postsCount.textContent = '0';
      return;
    }

    state.posts = posts;
    elements.postsCount.textContent = posts.length;

    elements.postsList.innerHTML = posts.slice(0, 10).map(post => {
      const author = post.author || {};
      const likes = formatNumber(post.engagement?.likes || post.numLikes || 0);
      const comments = formatNumber(post.engagement?.comments || post.numComments || 0);
      const engagementScore = post.engagementScore || 0;
      const timeAgo = getTimeAgo(post.postedAt || post.createdAt);
      const text = truncateText(post.text || post.commentary || '', 100);
      const postType = post.type || 'text';

      return `
        <div class="post-card" data-url="${post.url || '#'}">
          <div class="post-author">
            <div class="post-avatar">
              ${author.profilePicture
                ? `<img src="${author.profilePicture}" alt="${author.name || ''}">`
                : `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`
              }
            </div>
            <div class="post-author-info">
              <span class="post-author-name">${author.name || 'Unknown'}</span>
              <span class="post-time">${timeAgo}</span>
            </div>
          </div>
          <p class="post-text">${text}</p>
          <div class="post-stats">
            <span class="post-stat likes">
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M19.46 11l-3.91-3.91a7 7 0 01-1.69-2.74l-.49-1.47A2.76 2.76 0 0010.76 1 2.75 2.75 0 008 3.74v1.12a9.19 9.19 0 00.46 2.85L8.89 9H4.12A2.12 2.12 0 002 11.12a2.16 2.16 0 00.92 1.76A2.11 2.11 0 002 14.62a2.14 2.14 0 001.28 2 2 2 0 00-.28 1 2.12 2.12 0 002 2.12v.14A2.12 2.12 0 007.12 22h7.49a8.08 8.08 0 003.58-.84l.31-.16H21V11zM19 19h-1l-.73.37a6.14 6.14 0 01-2.69.63H7.72a1 1 0 01-.72-.3.93.93 0 01-.28-.7v-.14a.82.82 0 01.13-.44l.11-.14v-.83A.8.8 0 016.14 16a.63.63 0 01-.08-.1l-.11-.14v-.68a.84.84 0 01.08-.38l.11-.21v-.71l-.2-.26a.84.84 0 01-.14-.48 1.1 1.1 0 011.08-1.12H10a1 1 0 001-.88l-.39-1.17A7.24 7.24 0 0110 7.86V3.74a.74.74 0 01.74-.74.77.77 0 01.73.54l.49 1.47a9 9 0 002.13 3.46l4.91 4.91z"/>
              </svg>
              ${likes}
            </span>
            <span class="post-stat comments">
              <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                <path d="M7 9h10v1H7zm0 4h7v-1H7zm16-2a6.78 6.78 0 01-2.84 5.61L12 22v-5H7A7 7 0 017 3h10a7 7 0 017 8zm-2 0a5 5 0 00-5-5H7a5 5 0 000 10h7v3.13L18.18 13A4.78 4.78 0 0021 9z"/>
              </svg>
              ${comments}
            </span>
          </div>
        </div>
      `;
    }).join('');

    // Click handlers to open post
    elements.postsList.querySelectorAll('.post-card').forEach(card => {
      card.addEventListener('click', () => {
        const url = card.dataset.url;
        if (url && url !== '#') {
          chrome.tabs.create({ url });
        }
      });
    });
  }

  function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  function renderConnections(filter = '') {
    if (!elements.connectionsList) return;

    const connections = state.connections;

    if (!connections || connections.length === 0) {
      elements.connectionsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <h4>No connections loaded</h4>
          <p>Fetch your LinkedIn data to see your network</p>
          <button class="btn-secondary" id="btn-load-connections-inner">Load Network</button>
        </div>
      `;

      const loadBtn = $('#btn-load-connections-inner');
      if (loadBtn) {
        loadBtn.addEventListener('click', handleFetchData);
      }

      if (elements.showingCount) elements.showingCount.textContent = '0';
      if (elements.totalCount) elements.totalCount.textContent = '0';
      return;
    }

    // Filter connections
    const filtered = filter
      ? connections.filter(c => {
          const searchStr = `${c.firstName} ${c.lastName} ${c.fullName || ''} ${c.headline || ''} ${c.company || ''}`.toLowerCase();
          return searchStr.includes(filter.toLowerCase());
        })
      : connections;

    if (elements.showingCount) elements.showingCount.textContent = filtered.length;
    if (elements.totalCount) elements.totalCount.textContent = connections.length;

    // Render connections (virtualized - only render visible items)
    const displayConnections = filtered.slice(0, 50);

    elements.connectionsList.innerHTML = displayConnections.map(conn => `
      <div class="connection-card" data-url="${conn.profileUrl || '#'}">
        <div class="connection-avatar">
          ${conn.profilePicture
            ? `<img src="${conn.profilePicture}" alt="${conn.fullName || ''}">`
            : `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`
          }
        </div>
        <div class="connection-info">
          <div class="connection-name">${conn.fullName || conn.firstName || 'Unknown'}</div>
          <div class="connection-headline">${conn.headline || '-'}</div>
          ${conn.company ? `<div class="connection-meta">${conn.company}</div>` : ''}
        </div>
        <div class="connection-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </div>
    `).join('');

    // Click handlers
    elements.connectionsList.querySelectorAll('.connection-card').forEach(card => {
      card.addEventListener('click', () => {
        const url = card.dataset.url;
        if (url && url !== '#') {
          chrome.tabs.create({ url });
        }
      });
    });
  }

  // ============================================
  // CHART
  // ============================================

  function renderChart(connections, period = 'week') {
    if (!elements.chartArea || !elements.chartPlaceholder) return;

    if (!connections || connections.length === 0) {
      elements.chartPlaceholder.classList.remove('hidden');
      return;
    }

    elements.chartPlaceholder.classList.add('hidden');

    // Generate mock data based on connections count
    // In real app, you'd track connection dates
    const periods = {
      week: { count: 7, label: 'day', format: d => d.toLocaleDateString('en', { weekday: 'short' }) },
      month: { count: 30, label: 'day', format: d => d.getDate() },
      year: { count: 12, label: 'month', format: d => d.toLocaleDateString('en', { month: 'short' }) }
    };

    const config = periods[period];
    const data = [];
    const now = new Date();

    for (let i = config.count - 1; i >= 0; i--) {
      const date = new Date(now);
      if (period === 'year') {
        date.setMonth(date.getMonth() - i);
      } else {
        date.setDate(date.getDate() - i);
      }

      // Generate realistic-looking growth data
      const baseValue = Math.floor(connections.length / config.count);
      const variance = Math.floor(Math.random() * (baseValue * 0.5));
      const value = baseValue + variance - Math.floor(baseValue * 0.25);

      data.push({
        label: config.format(date),
        value: Math.max(0, value)
      });
    }

    const maxValue = Math.max(...data.map(d => d.value), 1);

    const chartHTML = `
      <div class="mini-chart">
        ${data.map((d, i) => {
          const height = Math.max((d.value / maxValue) * 100, 5);
          return `
            <div class="chart-bar-wrapper">
              <div class="chart-bar" style="height: ${height}%;" data-value="${d.value} new"></div>
              <span class="chart-bar-label">${d.label}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;

    elements.chartArea.innerHTML = chartHTML;
  }

  // ============================================
  // INSIGHTS
  // ============================================

  function renderInsights() {
    if (!state.connections || state.connections.length === 0) return;
    if (!elements.industryList || !elements.companyList || !elements.locationList) return;

    const connections = state.connections;

    // Industry breakdown
    const industries = {};
    connections.forEach(c => {
      const industry = c.industry || c.industryName || 'Other';
      industries[industry] = (industries[industry] || 0) + 1;
    });

    const topIndustries = Object.entries(industries)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (topIndustries.length > 0) {
      const maxIndustry = topIndustries[0][1];
      elements.industryList.innerHTML = topIndustries.map(([name, count], i) => `
        <div class="industry-item">
          <span class="industry-rank">${i + 1}</span>
          <div class="industry-bar">
            <div class="industry-fill" style="width: ${(count / maxIndustry) * 100}%;">
              <span class="industry-name">${name.length > 15 ? name.slice(0, 15) + '...' : name}</span>
            </div>
            <span class="industry-count">${count}</span>
          </div>
        </div>
      `).join('');
    }

    // Company breakdown
    const companies = {};
    connections.forEach(c => {
      const company = c.company || c.companyName || 'Unknown';
      if (company !== 'Unknown') {
        companies[company] = (companies[company] || 0) + 1;
      }
    });

    const topCompanies = Object.entries(companies)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (topCompanies.length > 0) {
      const maxCompany = topCompanies[0][1];
      elements.companyList.innerHTML = topCompanies.map(([name, count], i) => `
        <div class="company-item">
          <span class="company-rank">${i + 1}</span>
          <div class="company-bar">
            <div class="company-fill" style="width: ${(count / maxCompany) * 100}%;">
              <span class="company-name">${name.length > 12 ? name.slice(0, 12) + '...' : name}</span>
            </div>
            <span class="company-count">${count}</span>
          </div>
        </div>
      `).join('');
    }

    // Location breakdown
    const locations = {};
    connections.forEach(c => {
      const location = c.locationName || c.location || 'Unknown';
      if (location !== 'Unknown') {
        // Simplify to city/country
        const simplified = location.split(',')[0].trim();
        locations[simplified] = (locations[simplified] || 0) + 1;
      }
    });

    const topLocations = Object.entries(locations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    if (topLocations.length > 0) {
      const maxLocation = topLocations[0][1];
      elements.locationList.innerHTML = topLocations.map(([name, count]) => `
        <div class="location-item">
          <span class="location-name">${name}</span>
          <div class="location-bar">
            <div class="location-fill" style="width: ${(count / maxLocation) * 100}%;"></div>
          </div>
          <span class="location-count">${count}</span>
        </div>
      `).join('');
    }

    // Network score (based on diversity)
    const industryDiversity = Object.keys(industries).length;
    const companyDiversity = Object.keys(companies).length;
    const locationDiversity = Object.keys(locations).length;

    // Calculate score (max 100)
    const networkSize = connections.length;
    const sizeScore = Math.min(networkSize / 500 * 30, 30);
    const industryScore = Math.min(industryDiversity / 20 * 25, 25);
    const companyScore = Math.min(companyDiversity / 50 * 25, 25);
    const locationScore = Math.min(locationDiversity / 30 * 20, 20);

    const totalScore = Math.round(sizeScore + industryScore + companyScore + locationScore);
    if (elements.networkScore) elements.networkScore.textContent = totalScore;

    // Animate score circle
    if (elements.scoreCircle) {
      const circumference = 2 * Math.PI * 54;
      const offset = circumference - (totalScore / 100) * circumference;
      elements.scoreCircle.style.strokeDashoffset = offset;
    }
  }

  // ============================================
  // DATA LOADING
  // ============================================

  async function loadAllData() {
    try {
      // Check auth
      const authResponse = await sendMessage({ type: 'CHECK_AUTH' });
      updateAuthStatus(authResponse.isAuthenticated);

      // Get profile
      const profileResponse = await sendMessage({ type: 'GET_DATA', key: 'linkedin_profile' });
      if (profileResponse.data) {
        updateProfile(profileResponse.data);
      }

      // Get analytics
      const analyticsResponse = await sendMessage({ type: 'GET_DATA', key: 'linkedin_analytics' });
      if (analyticsResponse.data) {
        updateAnalytics(analyticsResponse.data);
      }

      // Get post analytics (individual post performance)
      const postAnalyticsResponse = await sendMessage({ type: 'GET_DATA', key: 'linkedin_post_analytics' });
      if (postAnalyticsResponse.data) {
        updatePostAnalytics(postAnalyticsResponse.data);
      }

      // Get audience/follower data
      const audienceResponse = await sendMessage({ type: 'GET_DATA', key: 'linkedin_audience' });
      if (audienceResponse.data) {
        updateAudienceData(audienceResponse.data);
      }

      // Get connections
      const connectionsResponse = await sendMessage({ type: 'GET_DATA', key: 'linkedin_connections' });
      if (connectionsResponse.data && connectionsResponse.data.connections) {
        state.connections = connectionsResponse.data.connections;
        animateValue(elements.statConnections, 0, state.connections.length);
        if (elements.connectionsGrowth) elements.connectionsGrowth.textContent = '+' + state.connections.length;
        renderChart(state.connections, state.chartPeriod);
      }

      // Get feed posts (captured from browsing)
      const feedPostsResponse = await sendMessage({ type: 'GET_DATA', key: 'linkedin_feed_posts' });
      if (feedPostsResponse.data) {
        const feedData = feedPostsResponse.data;
        console.log('[Popup] Feed posts loaded:', feedData.totalCount || 0, 'posts');

        // Render top hits (high engagement posts)
        if (feedData.topHits && feedData.topHits.length > 0) {
          renderPosts(feedData.topHits);
        } else if (feedData.posts && feedData.posts.length > 0) {
          renderPosts(feedData.posts.slice(0, 10));
        }

        // Update feed stats display
        if (feedData.stats) {
          updateFeedStats(feedData.stats, feedData.totalCount || 0);
        }

        // Update settings feed count too
        const settingsFeedCount = $('#settings-feed-posts-count');
        if (settingsFeedCount) {
          settingsFeedCount.textContent = feedData.totalCount || 0;
        }
      } else {
        // Fallback to old posts storage
        const postsResponse = await sendMessage({ type: 'GET_DATA', key: 'linkedin_posts' });
        if (postsResponse.data) {
          const postsData = postsResponse.data;
          if (postsData.topHits && postsData.topHits.length > 0) {
            renderPosts(postsData.topHits);
          } else if (postsData.posts && postsData.posts.length > 0) {
            renderPosts(postsData.posts);
          }
        }
      }

      // Get captured APIs count (passive capture data)
      const capturedApisResponse = await sendMessage({ type: 'GET_DATA', key: 'captured_apis' });
      const capturedApisCount = capturedApisResponse.data?.length || 0;
      console.log('[Popup] Captured APIs count:', capturedApisCount);

      // Update captured APIs indicator if element exists
      const capturedIndicator = $('#captured-apis-count');
      if (capturedIndicator) {
        capturedIndicator.textContent = capturedApisCount;
      }

      // Get comments data
      const commentsResponse = await sendMessage({ type: 'GET_DATA', key: 'linkedin_comments' });
      if (commentsResponse.data) {
        const commentsData = commentsResponse.data;
        console.log('[Popup] Comments loaded:', commentsData.totalCount || 0);
        updateCommentsStats(commentsData);
      }

      // Get my posts data
      const myPostsResponse = await sendMessage({ type: 'GET_DATA', key: 'linkedin_my_posts' });
      if (myPostsResponse.data) {
        const myPostsData = myPostsResponse.data;
        console.log('[Popup] My posts loaded:', myPostsData.totalCount || 0);
        updateMyPostsStats(myPostsData);
      }

      // Get followers data
      const followersResponse = await sendMessage({ type: 'GET_DATA', key: 'linkedin_followers' });
      if (followersResponse.data) {
        const followersData = followersResponse.data;
        console.log('[Popup] Followers loaded:', followersData.followerCount || 0);
        updateFollowersStats(followersData);
      }

      // Get settings
      const settingsResponse = await sendMessage({ type: 'GET_DATA', key: 'extension_settings' });
      if (settingsResponse.data) {
        if (elements.toggleAutoCapture) elements.toggleAutoCapture.checked = settingsResponse.data.autoCapture !== false;
        if (elements.toggleStoreImages) elements.toggleStoreImages.checked = settingsResponse.data.storeImages !== false;
      }

      // Load auto-capture stats (Phase 4)
      await loadCaptureStats();

      // Load growth data (Phase 4)
      await loadGrowthData();

    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  /**
   * Load and display capture statistics (Phase 4)
   */
  async function loadCaptureStats() {
    try {
      const statsResponse = await sendMessage({ type: 'GET_CAPTURE_STATS' });
      const stats = statsResponse.data;

      if (stats) {
        // Update total captures count
        const totalCapturesEl = $('#total-captures-count');
        if (totalCapturesEl) totalCapturesEl.textContent = stats.totalCaptures || 0;

        // Update successful captures
        const successCapturesEl = $('#success-captures-count');
        if (successCapturesEl) successCapturesEl.textContent = stats.successfulCaptures || 0;

        // Check if auto-capture is enabled and update status badge
        const settingsResponse = await sendMessage({ type: 'GET_DATA', key: 'extension_settings' });
        const isEnabled = settingsResponse.data?.autoCapture !== false;
        updateAutoCaptureStatusBadge(isEnabled);

        // Update last capture time
        const lastCaptureEl = $('#last-capture-time');
        if (lastCaptureEl && stats.lastCapture) {
          const lastTime = new Date(stats.lastCapture.timestamp);
          const timeAgo = getTimeAgo(lastTime);
          lastCaptureEl.textContent = `Last capture: ${timeAgo}`;
        }

        // Render capture by type
        const captureByTypeEl = $('#capture-by-type');
        if (captureByTypeEl && stats.capturesByType) {
          renderCaptureByType(captureByTypeEl, stats.capturesByType);
        }
      }
    } catch (error) {
      console.error('[Popup] Error loading capture stats:', error);
    }
  }

  /**
   * Render capture counts by type
   */
  function renderCaptureByType(container, capturesByType) {
    const typeLabels = {
      'creator_analytics': 'Creator Analytics',
      'post_analytics': 'Post Analytics',
      'audience_analytics': 'Audience Analytics',
      'audience_demographics': 'Demographics',
      'post_demographics': 'Post Demographics',
      'profile_views': 'Profile Views'
    };

    let html = '';
    for (const [type, counts] of Object.entries(capturesByType)) {
      const label = typeLabels[type] || type;
      const total = (counts.success || 0) + (counts.failed || 0);
      html += `
        <div class="capture-type-row">
          <span class="capture-type-name">${label}</span>
          <span class="capture-type-count">${total}</span>
        </div>
      `;
    }

    container.innerHTML = html || '<p class="empty-hint">No captures yet</p>';
  }

  /**
   * Load and display growth data (Phase 4)
   */
  async function loadGrowthData() {
    try {
      // Get analytics growth
      const analyticsGrowthResponse = await sendMessage({ type: 'GET_ANALYTICS_GROWTH' });
      const analyticsGrowth = analyticsGrowthResponse.growth;

      const impressionsGrowthEl = $('#impressions-growth-indicator');
      if (impressionsGrowthEl && analyticsGrowth) {
        const change = analyticsGrowth.impressionsGrowth || 0;
        impressionsGrowthEl.textContent = formatGrowth(change);
        impressionsGrowthEl.className = 'growth-value ' + getGrowthClass(parseFloat(change));
      }

      // Get audience growth
      const audienceGrowthResponse = await sendMessage({ type: 'GET_AUDIENCE_GROWTH' });
      const audienceGrowth = audienceGrowthResponse.growth;

      const followersGrowthEl = $('#followers-growth-indicator');
      if (followersGrowthEl && audienceGrowth) {
        const rate = audienceGrowth.growthRate || 0;
        followersGrowthEl.textContent = formatGrowth(rate);
        followersGrowthEl.className = 'growth-value ' + getGrowthClass(parseFloat(rate));
      }

      // Update days tracked
      const daysTrackedEl = $('#days-tracked');
      if (daysTrackedEl && audienceGrowth) {
        daysTrackedEl.textContent = audienceGrowth.daysTracked || 0;
        daysTrackedEl.className = 'growth-value neutral';
      }

    } catch (error) {
      console.error('[Popup] Error loading growth data:', error);
    }
  }

  /**
   * Format growth value with sign and percentage
   */
  function formatGrowth(value) {
    const num = parseFloat(value);
    if (isNaN(num) || num === 0) return '0%';
    const sign = num > 0 ? '+' : '';
    return `${sign}${num}%`;
  }

  /**
   * Get CSS class based on growth value
   */
  function getGrowthClass(value) {
    if (value > 0) return 'positive';
    if (value < 0) return 'negative';
    return 'neutral';
  }

  /**
   * Get human-readable time ago string
   */
  function getTimeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  async function handleFetchData() {
    showLoading('Connecting to LinkedIn...', 10);

    try {
      updateLoadingProgress('Fetching profile data...', 20);

      const response = await sendMessage({ type: 'FETCH_ALL_DATA' });

      if (response.success) {
        updateLoadingProgress('Processing data...', 60);

        // Update profile
        if (response.profile && response.profile.data) {
          updateProfile(response.profile.data);
        }

        updateLoadingProgress('Loading connections...', 70);

        // Update connections
        if (response.connections && response.connections.data) {
          state.connections = response.connections.data.connections || [];
          animateValue(elements.statConnections, 0, state.connections.length);
          if (elements.connectionsGrowth) elements.connectionsGrowth.textContent = '+' + state.connections.length;
          renderChart(state.connections, state.chartPeriod);
        }

        updateLoadingProgress('Fetching top hits...', 85);

        // Update posts/top hits
        if (response.posts && response.posts.data) {
          const postsData = response.posts.data;
          if (postsData.topHits && postsData.topHits.length > 0) {
            renderPosts(postsData.topHits);
          } else if (postsData.posts && postsData.posts.length > 0) {
            renderPosts(postsData.posts);
          }
        }

        // Update analytics
        if (response.analytics && response.analytics.data) {
          updateAnalytics(response.analytics.data);
        }

        updateLoadingProgress('Done!', 100);

        setTimeout(() => {
          hideLoading();
          showToast('Data fetched successfully!', 'success');
        }, 500);

      } else {
        hideLoading();
        showToast(response.error || 'Failed to fetch data', 'error');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      hideLoading();
      showToast('Make sure you\'re logged into LinkedIn', 'error');
    }
  }

  async function handleExport(type = 'json') {
    try {
      const messageType = type === 'csv' ? 'EXPORT_CSV' : 'EXPORT_JSON';
      const response = await sendMessage({
        type: messageType,
        dataKey: type === 'csv' ? 'linkedin_connections' : undefined
      });

      if (response.success) {
        downloadFile(response.content, response.filename, type === 'csv' ? 'text/csv' : 'application/json');
        showToast(`Exported as ${type.toUpperCase()}!`, 'success');
      } else {
        showToast(response.error || 'Export failed', 'error');
      }
    } catch (error) {
      console.error('Export error:', error);
      showToast('Export failed', 'error');
    }
  }

  async function handleClearData() {
    if (!confirm('Clear all stored data? This cannot be undone.')) {
      return;
    }

    try {
      await sendMessage({ type: 'CLEAR_DATA' });

      // Reset state
      state.profile = null;
      state.analytics = null;
      state.connections = [];
      state.posts = [];

      // Reset UI
      if (elements.profileName) elements.profileName.textContent = 'LinkedIn User';
      if (elements.profileHeadline) elements.profileHeadline.textContent = 'Connect to see your profile';
      if (elements.profileAvatar) elements.profileAvatar.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
      if (elements.statConnections) elements.statConnections.textContent = '-';
      if (elements.statViews) elements.statViews.textContent = '-';
      if (elements.statSearch) elements.statSearch.textContent = '-';

      renderConnections();
      renderViewers([]);
      renderPosts([]);

      showToast('All data cleared', 'success');
    } catch (error) {
      console.error('Clear error:', error);
      showToast('Failed to clear data', 'error');
    }
  }

  async function handleSaveSettings() {
    try {
      const isAutoCaptureEnabled = elements.toggleAutoCapture ? elements.toggleAutoCapture.checked : true;

      await sendMessage({
        type: 'SAVE_DATA',
        key: 'extension_settings',
        data: {
          autoCapture: isAutoCaptureEnabled,
          storeImages: elements.toggleStoreImages ? elements.toggleStoreImages.checked : true
        }
      });

      // Immediately update the auto-capture status badge UI
      updateAutoCaptureStatusBadge(isAutoCaptureEnabled);

    } catch (error) {
      console.error('Settings save error:', error);
    }
  }

  /**
   * Update the auto-capture status badge UI
   */
  function updateAutoCaptureStatusBadge(isEnabled) {
    const statusBadge = $('#auto-capture-status-badge');
    const statusText = $('#auto-capture-status-text');
    const statusDot = statusBadge?.querySelector('.status-dot');

    if (statusBadge && statusText && statusDot) {
      if (isEnabled) {
        statusBadge.classList.remove('inactive');
        statusDot.classList.add('active');
        statusDot.classList.remove('inactive');
        statusText.textContent = 'Active';
      } else {
        statusBadge.classList.add('inactive');
        statusDot.classList.remove('active');
        statusDot.classList.add('inactive');
        statusText.textContent = 'Disabled';
      }
    }
  }

  function handleSearch(e) {
    const filter = e.target.value;
    renderConnections(filter);
  }

  function handleChartPeriodChange(period) {
    state.chartPeriod = period;
    if (elements.chartTabs) {
      elements.chartTabs.forEach(tab => {
        if (tab) tab.classList.toggle('active', tab.dataset.period === period);
      });
    }
    renderChart(state.connections, period);
  }

  // ============================================
  // UTILITIES
  // ============================================

  function formatNumber(num) {
    if (num === null || num === undefined) return '-';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  }

  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function setupEventListeners() {
    try {
      // Navigation
      if (elements.navPills && elements.navPills.length > 0) {
        elements.navPills.forEach(pill => {
          if (pill) pill.addEventListener('click', () => switchView(pill.dataset.view));
        });
      }

    // Main actions
    if (elements.btnFetch) {
      elements.btnFetch.addEventListener('click', handleFetchData);
    }

    if (elements.btnRefresh) {
      elements.btnRefresh.addEventListener('click', handleFetchData);
    }

    // Export buttons
    if (elements.btnExportJson) {
      elements.btnExportJson.addEventListener('click', () => handleExport('json'));
    }

    if (elements.btnExportCsv) {
      elements.btnExportCsv.addEventListener('click', () => handleExport('csv'));
    }

    if (elements.btnExportAllJson) {
      elements.btnExportAllJson.addEventListener('click', () => handleExport('json'));
    }

    if (elements.btnExportAllCsv) {
      elements.btnExportAllCsv.addEventListener('click', () => handleExport('csv'));
    }

    // Clear data
    if (elements.btnClearData) {
      elements.btnClearData.addEventListener('click', handleClearData);
    }

    // Load connections
    if (elements.btnLoadConnections) {
      elements.btnLoadConnections.addEventListener('click', handleFetchData);
    }

    // Settings toggles
    if (elements.toggleAutoCapture) {
      elements.toggleAutoCapture.addEventListener('change', handleSaveSettings);
    }

    if (elements.toggleStoreImages) {
      elements.toggleStoreImages.addEventListener('change', handleSaveSettings);
    }

    // Search
    if (elements.searchConnections) {
      elements.searchConnections.addEventListener('input', handleSearch);
    }

    // Chart period tabs
    if (elements.chartTabs && elements.chartTabs.length > 0) {
      elements.chartTabs.forEach(tab => {
        if (tab) tab.addEventListener('click', () => handleChartPeriodChange(tab.dataset.period));
      });
    }

    // Filter chips
    if (elements.filterChips && elements.filterChips.length > 0) {
      elements.filterChips.forEach(chip => {
        if (chip) {
          chip.addEventListener('click', () => {
            elements.filterChips.forEach(c => c && c.classList.remove('active'));
            chip.classList.add('active');
            // Could implement filtering logic here
          });
        }
      });
    }

    // Supabase Cloud Sync
    if (elements.btnSupabaseSignin) {
      elements.btnSupabaseSignin.addEventListener('click', handleSupabaseSignIn);
    }

    if (elements.btnSupabaseSignup) {
      elements.btnSupabaseSignup.addEventListener('click', handleSupabaseSignUp);
    }

    if (elements.btnSupabaseSignout) {
      elements.btnSupabaseSignout.addEventListener('click', handleSupabaseSignOut);
    }

    if (elements.btnSyncNow) {
      elements.btnSyncNow.addEventListener('click', handleSyncNow);
    }

    if (elements.btnFullSync) {
      elements.btnFullSync.addEventListener('click', handleFullSync);
    }

    // Listen for sync updates from service worker
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'SYNC_UPDATE' || message.type === 'SYNC_STATUS_UPDATE') {
        updateSyncUI();
      }
    });

    } catch (error) {
      console.error('[Popup] Error in setupEventListeners:', error);
    }
  }

  // ============================================
  // SUPABASE CLOUD SYNC HANDLERS
  // ============================================

  async function handleSupabaseSignIn() {
    try {
      // Get email and password from form
      const email = elements.authEmail?.value?.trim();
      const password = elements.authPassword?.value;

      // Validate inputs
      if (!email || !password) {
        showAuthError('Please enter both email and password');
        return;
      }

      if (!isValidEmail(email)) {
        showAuthError('Please enter a valid email address');
        return;
      }

      clearAuthError();
      showLoading('Signing in...');

      const response = await sendMessage({
        type: 'SUPABASE_AUTH_SIGN_IN',
        email,
        password
      });

      if (response.success) {
        // Clear form
        if (elements.authEmail) elements.authEmail.value = '';
        if (elements.authPassword) elements.authPassword.value = '';

        showToast('Signed in successfully!', 'success');
        await updateSyncUI();
      } else {
        showAuthError(response.error || 'Sign in failed');
      }
    } catch (error) {
      console.error('[Popup] Sign in error:', error);
      showAuthError('Failed to sign in. Please try again.');
    } finally {
      hideLoading();
    }
  }

  async function handleSupabaseSignUp() {
    try {
      // Get email and password from form
      const email = elements.authEmail?.value?.trim();
      const password = elements.authPassword?.value;

      // Validate inputs
      if (!email || !password) {
        showAuthError('Please enter both email and password');
        return;
      }

      if (!isValidEmail(email)) {
        showAuthError('Please enter a valid email address');
        return;
      }

      if (password.length < 6) {
        showAuthError('Password must be at least 6 characters');
        return;
      }

      clearAuthError();
      showLoading('Creating account...');

      const response = await sendMessage({
        type: 'SUPABASE_AUTH_SIGN_UP',
        email,
        password
      });

      if (response.success) {
        // Clear form
        if (elements.authEmail) elements.authEmail.value = '';
        if (elements.authPassword) elements.authPassword.value = '';

        if (response.data?.message || response.data?.requiresConfirmation) {
          // Email confirmation required
          showToast(response.data.message || 'Please check your email to confirm your account', 'info');
        } else {
          showToast('Account created successfully!', 'success');
          await updateSyncUI();
        }
      } else {
        showAuthError(response.error || 'Sign up failed');
      }
    } catch (error) {
      console.error('[Popup] Sign up error:', error);
      showAuthError('Failed to create account. Please try again.');
    } finally {
      hideLoading();
    }
  }

  function showAuthError(message) {
    if (elements.authError) {
      elements.authError.textContent = message;
      elements.authError.classList.remove('hidden');
    }
  }

  function clearAuthError() {
    if (elements.authError) {
      elements.authError.textContent = '';
      elements.authError.classList.add('hidden');
    }
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function handleSupabaseSignOut() {
    try {
      const confirmed = confirm('Are you sure you want to sign out? Your local data will be preserved.');
      if (!confirmed) return;

      showLoading('Signing out...');

      const response = await sendMessage({ type: 'SUPABASE_AUTH_SIGN_OUT' });

      if (response.success) {
        showToast('Signed out successfully', 'success');
        await updateSyncUI();
      } else {
        showToast(response.error || 'Sign out failed', 'error');
      }
    } catch (error) {
      console.error('[Popup] Sign out error:', error);
      showToast('Failed to sign out', 'error');
    } finally {
      hideLoading();
    }
  }

  async function handleSyncNow() {
    try {
      if (elements.btnSyncNow) {
        elements.btnSyncNow.disabled = true;
        elements.btnSyncNow.innerHTML = '<svg class="spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> Syncing...';
      }

      updateSyncStatus('syncing');

      const response = await sendMessage({ type: 'SUPABASE_SYNC_NOW' });

      if (response.success) {
        showToast('Synced successfully', 'success');
        updateSyncStatus('synced');
      } else {
        showToast(response.error || 'Sync failed', 'error');
        updateSyncStatus('error');
      }
    } catch (error) {
      console.error('[Popup] Sync error:', error);
      showToast('Sync failed', 'error');
      updateSyncStatus('error');
    } finally {
      if (elements.btnSyncNow) {
        elements.btnSyncNow.disabled = false;
        elements.btnSyncNow.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> Sync Now';
      }
      await updateSyncUI();
    }
  }

  async function handleFullSync() {
    try {
      const confirmed = confirm('This will sync all data between local storage and cloud. Continue?');
      if (!confirmed) return;

      showLoading('Running full sync...');
      updateSyncStatus('syncing');

      const response = await sendMessage({ type: 'SUPABASE_FULL_SYNC' });

      if (response.success) {
        showToast('Full sync completed', 'success');
        updateSyncStatus('synced');
        // Reload local data
        await loadAllData();
      } else {
        showToast(response.error || 'Full sync failed', 'error');
        updateSyncStatus('error');
      }
    } catch (error) {
      console.error('[Popup] Full sync error:', error);
      showToast('Full sync failed', 'error');
      updateSyncStatus('error');
    } finally {
      hideLoading();
      await updateSyncUI();
    }
  }

  function updateSyncStatus(status) {
    if (!elements.syncStatusIndicator || !elements.syncStatusText) return;

    const statusMap = {
      synced: { text: 'Synced', class: 'synced' },
      syncing: { text: 'Syncing...', class: 'syncing' },
      pending: { text: 'Pending', class: 'pending' },
      error: { text: 'Error', class: 'error' }
    };

    const statusInfo = statusMap[status] || statusMap.synced;

    elements.syncStatusIndicator.className = `sync-status-badge ${statusInfo.class}`;
    elements.syncStatusText.textContent = statusInfo.text;
  }

  async function updateSyncUI() {
    try {
      const response = await sendMessage({ type: 'SUPABASE_AUTH_STATUS' });

      if (!response.success) {
        console.error('[Popup] Failed to get auth status:', response.error);
        return;
      }

      const { isAuthenticated, user, isConfigured } = response.data;

      // Show/hide appropriate sections
      if (!isConfigured) {
        // Supabase not configured
        if (elements.supabaseSignedOut) elements.supabaseSignedOut.classList.add('hidden');
        if (elements.supabaseSignedIn) elements.supabaseSignedIn.classList.add('hidden');
        if (elements.supabaseNotConfigured) elements.supabaseNotConfigured.classList.remove('hidden');
        return;
      }

      if (elements.supabaseNotConfigured) elements.supabaseNotConfigured.classList.add('hidden');

      if (isAuthenticated && user) {
        // Signed in
        if (elements.supabaseSignedOut) elements.supabaseSignedOut.classList.add('hidden');
        if (elements.supabaseSignedIn) elements.supabaseSignedIn.classList.remove('hidden');

        // Update user info
        const displayName = user.name || (user.email ? user.email.split('@')[0] : 'User');
        if (elements.supabaseUserName) elements.supabaseUserName.textContent = displayName;
        if (elements.supabaseUserEmail) elements.supabaseUserEmail.textContent = user.email || '';
        if (elements.supabaseUserAvatar) {
          if (user.picture) {
            elements.supabaseUserAvatar.src = user.picture;
          } else {
            // Use default icon for email/password users
            elements.supabaseUserAvatar.src = 'icons/icon48.png';
          }
          elements.supabaseUserAvatar.onerror = () => {
            elements.supabaseUserAvatar.src = 'icons/icon48.png';
          };
        }

        // Get sync status
        const syncResponse = await sendMessage({ type: 'SUPABASE_SYNC_STATUS' });
        if (syncResponse.success) {
          const { lastSyncTime, pendingChanges, isOnline } = syncResponse.data;

          // Update last sync time
          if (elements.lastSyncTime) {
            if (lastSyncTime) {
              const date = new Date(lastSyncTime);
              elements.lastSyncTime.textContent = date.toLocaleString();
            } else {
              elements.lastSyncTime.textContent = 'Never';
            }
          }

          // Update pending changes
          if (elements.pendingChangesCount) {
            elements.pendingChangesCount.textContent = pendingChanges || 0;
          }

          // Update status based on pending changes
          if (!isOnline) {
            updateSyncStatus('pending');
          } else if (pendingChanges > 0) {
            updateSyncStatus('pending');
          } else {
            updateSyncStatus('synced');
          }
        }
      } else {
        // Signed out
        if (elements.supabaseSignedOut) elements.supabaseSignedOut.classList.remove('hidden');
        if (elements.supabaseSignedIn) elements.supabaseSignedIn.classList.add('hidden');
      }
    } catch (error) {
      console.error('[Popup] Error updating sync UI:', error);
    }
  }

  async function initialize() {
    console.log('[Popup] Initializing LinkedIn Data Extractor v4.1...');
    console.log('[Popup] Document readyState:', document.readyState);

    // Initialize DOM elements first (after DOM is ready)
    initElements();
    console.log('[Popup] Elements initialized:', Object.keys(elements).length, 'elements');
    console.log('[Popup] btnFetch:', elements.btnFetch);
    console.log('[Popup] navPills:', elements.navPills?.length);

    setupEventListeners();
    console.log('[Popup] Event listeners attached');

    await loadAllData();

    // Initialize Supabase sync UI
    await updateSyncUI();

    console.log('[Popup] Initialization complete');
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();
