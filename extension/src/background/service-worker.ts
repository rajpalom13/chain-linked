/**
 * LinkedIn Data Extractor - Service Worker (Background Script)
 * TypeScript Version - v4.0
 */

// Declare importScripts for service worker
declare function importScripts(...urls: string[]): void;

// Declare global types for Supabase loaded via importScripts
declare const self: typeof globalThis & {
  supabase?: {
    url: string;
    anonKey: string;
    from: (table: string) => {
      upsert: (data: unknown[], options?: { onConflict?: string }) => Promise<{ error?: { message: string } }>;
      select: (fields?: string) => { eq: (field: string, value: string) => { single: () => Promise<{ data: unknown; error?: { message: string } }> } };
      insert: (data: unknown) => Promise<{ error?: { message: string } }>;
    };
    setAuth: (token: string, userId?: string) => void;
    clearAuth: () => void;
  };
  supabaseAuth?: {
    signIn: (email: string, password: string) => Promise<{ success: boolean; user?: { id: string; email: string }; session?: unknown; error?: string }>;
    signUp: (email: string, password: string) => Promise<{ success: boolean; user?: { id: string; email: string }; session?: unknown; error?: string; message?: string }>;
    signOut: () => Promise<{ error?: { message: string } }>;
    getSession: () => Promise<{ session?: { user?: { id: string } }; user?: { id: string; email: string } }>;
    getUser: () => Promise<{ user?: { id: string; email: string } }>;
  };
  isSupabaseConfigured?: () => boolean;
  localCache?: unknown;
  syncManager?: { initialize: () => Promise<void>; cleanup: () => void };
};

// Load Supabase modules via importScripts (runs before main code)
try {
  importScripts(
    '../lib/supabase/client.js',
    '../lib/supabase/auth.js',
    '../lib/supabase/local-cache.js',
    '../lib/supabase/sync.js',
    '../lib/supabase/storage.js'
  );
  console.log('[ServiceWorker] Supabase modules loaded');
} catch (e) {
  console.error('[ServiceWorker] Failed to load Supabase modules:', e);
}

import type {
  ExtensionMessage,
  StorageKey,
  CaptureType,
  ProfileData,
  CreatorAnalytics,
  PostAnalytics,
  AudienceAnalytics,
  CaptureLog,
  CompanyAnalytics,
  ContentCalendarData,
} from '../shared/types';

import {
  initHistoryManager,
  recordAnalyticsTrends,
  recordProfileTrends,
  logCapture,
  getTrendDataForCharts,
  getTrendSummary,
  exportTrendsAsCSV,
  exportTrendsAsJSON,
  exportCaptureLogsAsCSV,
  exportFullBackup,
  runMaintenance,
  getStorageStats,
  checkAlerts,
} from '../shared/history-manager';

import {
  initializeAlarms,
  scheduleBackup,
  getBackupSchedule,
  updateBackupSchedule,
  getAlertConfigs,
  saveAlertConfigs,
  upsertAlertConfig,
  deleteAlertConfig,
  markAlertTriggered,
  getAllAlarms,
  ALARM_NAMES,
} from './alarms';

import {
  showCaptureNotification,
  showBackupSuccessNotification,
  showBackupFailureNotification,
  showGrowthAlertNotification,
  showMultipleGrowthAlerts,
  getNotificationSettings,
  saveNotificationSettings,
  setupNotificationListeners,
  type NotificationSettings,
} from './notifications';

import {
  getAuthState,
  startAuthFlow,
  logout as googleLogout,
} from './google-auth';

import {
  syncNow,
  getSyncStatus,
  getSyncSettings,
  saveSyncSettings,
  listBackups,
  restoreBackup,
  deleteBackup,
} from './drive-sync';

import {
  initSyncBridge,
  saveWithSync,
  appendWithSync,
  processPendingChanges,
  migrateExistingData,
  setCurrentUserId,
  getCurrentUserId,
  getSyncStatusInfo,
  getDetailedSyncStatus,
  syncWithRetry,
  isSyncableKey,
  startPeriodicSync,
  queueForSync,
} from './supabase-sync-bridge';

// ============================================
// CONSTANTS
// ============================================

const LINKEDIN_DOMAIN = '.linkedin.com';
const LINKEDIN_URL = 'https://www.linkedin.com';

const COOKIE_NAMES = {
  AUTH_TOKEN: 'li_at',
  CSRF_TOKEN: 'JSESSIONID',
  DATA_CENTER: 'lidc',
  BROWSER_ID: 'bcookie',
} as const;

const STORAGE_KEYS = {
  AUTH_DATA: 'linkedin_auth',
  PROFILE_DATA: 'linkedin_profile',
  ANALYTICS_DATA: 'linkedin_analytics',
  POST_ANALYTICS_DATA: 'linkedin_post_analytics',
  AUDIENCE_DATA: 'linkedin_audience',
  CONNECTIONS_DATA: 'linkedin_connections',
  POSTS_DATA: 'linkedin_posts',
  FEED_POSTS: 'linkedin_feed_posts',
  MY_POSTS: 'linkedin_my_posts',
  COMMENTS: 'linkedin_comments',
  FOLLOWERS: 'linkedin_followers',
  TRENDING: 'linkedin_trending',
  CAPTURED_APIS: 'captured_apis',
  SETTINGS: 'extension_settings',
  AUTO_CAPTURE_LOG: 'auto_capture_log',
  AUTO_CAPTURE_SETTINGS: 'linkedin_capture_settings',
  ANALYTICS_HISTORY: 'linkedin_analytics_history',
  AUDIENCE_HISTORY: 'linkedin_audience_history',
  CAPTURE_STATS: 'auto_capture_stats',
  // v4.0 Phase 5: Company data
  COMPANY_ANALYTICS: 'linkedin_company_analytics',
  CONTENT_CALENDAR: 'linkedin_content_calendar',
} as const;

const DECORATION_IDS = {
  FULL_PROFILE: 'com.linkedin.voyager.dash.deco.identity.profile.WebTopCardCore-16',
  PROFILE_VIEW: 'com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-93',
  CONNECTIONS_LIST: 'com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionList-16',
  MINI_PROFILE: 'com.linkedin.voyager.dash.deco.identity.profile.StandardMiniProfile-3',
} as const;

// ============================================
// TYPE DEFINITIONS
// ============================================

interface CookieResult {
  success: boolean;
  cookies?: Record<string, string>;
  authToken?: string | null;
  csrfToken?: string | null;
  isAuthenticated: boolean;
  error?: string;
}

interface StorageResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

interface CaptureStats {
  totalCaptures: number;
  successfulCaptures: number;
  failedCaptures: number;
  capturesByType: Record<string, { success: number; failed: number }>;
  lastCapture: {
    type: string;
    success: boolean;
    timestamp: string;
    identifier?: string;
  } | null;
  captureHistory: Array<{
    type: string;
    success: boolean;
    timestamp: string;
    identifier?: string;
  }>;
}

interface AnalyticsHistoryEntry {
  date: string;
  timestamp: string;
  impressions: number;
  membersReached: number;
  profileViews: number;
  topPostsCount: number;
}

interface AudienceHistoryEntry {
  date: string;
  timestamp: string;
  totalFollowers: number;
  followerGrowth: number;
  newFollowers: number;
}

// ============================================
// COOKIE MANAGEMENT
// ============================================

async function getLinkedInCookies(): Promise<CookieResult> {
  try {
    const cookies = await chrome.cookies.getAll({ domain: LINKEDIN_DOMAIN });
    const cookieMap: Record<string, string> = {};

    cookies.forEach((cookie) => {
      cookieMap[cookie.name] = cookie.value;
    });

    return {
      success: true,
      cookies: cookieMap,
      authToken: cookieMap[COOKIE_NAMES.AUTH_TOKEN] || null,
      csrfToken: cookieMap[COOKIE_NAMES.CSRF_TOKEN] || null,
      isAuthenticated: !!cookieMap[COOKIE_NAMES.AUTH_TOKEN],
    };
  } catch (error) {
    console.error('[ServiceWorker] Error getting cookies:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      isAuthenticated: false,
    };
  }
}

async function getLinkedInCookie(name: string): Promise<string | null> {
  try {
    const cookie = await chrome.cookies.get({ url: LINKEDIN_URL, name });
    return cookie ? cookie.value : null;
  } catch (error) {
    console.error(`[ServiceWorker] Error getting cookie ${name}:`, error);
    return null;
  }
}

async function checkAuthentication(): Promise<{ isAuthenticated: boolean; token: string | null }> {
  const authToken = await getLinkedInCookie(COOKIE_NAMES.AUTH_TOKEN);
  return {
    isAuthenticated: !!authToken,
    token: authToken,
  };
}

// ============================================
// STORAGE MANAGEMENT
// ============================================

async function saveToStorage<T>(key: string, data: T, skipSync = false): Promise<StorageResult> {
  try {
    let userId = getCurrentUserId();
    const syncable = isSyncableKey(key);

    // If syncable but no userId, try to restore from storage
    if (syncable && !userId) {
      console.log(`[ServiceWorker] No userId for syncable key ${key}, trying to restore from storage...`);
      const sessionResult = await chrome.storage.local.get('supabase_session');
      if (sessionResult.supabase_session?.user?.id) {
        const restoredUserId = sessionResult.supabase_session.user.id;
        console.log(`[ServiceWorker] Restored userId from storage: ${restoredUserId.substring(0, 8)}...`);
        setCurrentUserId(restoredUserId);

        // Also set auth on supabase client if available
        if (self.supabase && sessionResult.supabase_session.access_token) {
          self.supabase.setAuth(sessionResult.supabase_session.access_token, restoredUserId);
          console.log(`[ServiceWorker] Set auth on Supabase client`);
        }

        userId = restoredUserId;
      }
    }

    console.log(`[ServiceWorker] saveToStorage: key=${key}, syncable=${syncable}, userId=${userId ? userId.substring(0, 8) + '...' : 'null'}`);

    // Use sync bridge for syncable keys when user is authenticated
    if (syncable && userId) {
      console.log(`[ServiceWorker] Using saveWithSync for ${key}`);
      const result = await saveWithSync(key, data as Record<string, unknown>, skipSync);
      if (!result.success) {
        console.error('[ServiceWorker] Sync save error:', result.error);
      }
      return result;
    }

    // Direct storage for non-syncable keys or when not authenticated
    console.log(`[ServiceWorker] Direct storage for ${key} (no sync)`);
    await chrome.storage.local.set({ [key]: data });
    return { success: true };
  } catch (error) {
    console.error('[ServiceWorker] Storage save error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function getFromStorage<T>(key: string): Promise<StorageResult<T>> {
  try {
    const result = await chrome.storage.local.get(key);
    return { success: true, data: result[key] || null };
  } catch (error) {
    console.error('[ServiceWorker] Storage get error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function getAllStoredData(): Promise<StorageResult<Record<string, unknown>>> {
  try {
    const result = await chrome.storage.local.get(null);
    return { success: true, data: result };
  } catch (error) {
    console.error('[ServiceWorker] Storage get all error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function clearStorage(): Promise<StorageResult> {
  try {
    await chrome.storage.local.clear();
    return { success: true };
  } catch (error) {
    console.error('[ServiceWorker] Storage clear error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function appendToStorage<T extends Record<string, unknown>>(
  key: string,
  newData: T,
  maxItems = 1000,
  skipSync = false
): Promise<StorageResult<{ count: number }>> {
  try {
    // Use sync bridge for syncable keys when user is authenticated
    if (isSyncableKey(key) && getCurrentUserId()) {
      const result = await appendWithSync(key, newData, maxItems, skipSync);
      if (!result.success) {
        console.error('[ServiceWorker] Sync append error:', result.error);
      }
      return { success: result.success, data: { count: result.count || 0 }, error: result.error };
    }

    // Direct storage for non-syncable keys or when not authenticated
    const existing = await getFromStorage<T[]>(key);
    const currentArray = existing.data || [];

    const dataWithTimestamp = {
      ...newData,
      capturedAt: new Date().toISOString(),
    };

    currentArray.push(dataWithTimestamp as T);
    const trimmedArray = currentArray.slice(-maxItems);

    await chrome.storage.local.set({ [key]: trimmedArray });
    return { success: true, data: { count: trimmedArray.length } };
  } catch (error) {
    console.error('[ServiceWorker] Append to storage error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// HISTORY TRACKING
// ============================================

async function addToAnalyticsHistory(analyticsData: Partial<CreatorAnalytics>): Promise<StorageResult> {
  try {
    const existing = await getFromStorage<AnalyticsHistoryEntry[]>(STORAGE_KEYS.ANALYTICS_HISTORY);
    let history = existing.data || [];

    const today = new Date().toISOString().split('T')[0];
    const entry: AnalyticsHistoryEntry = {
      date: today,
      timestamp: new Date().toISOString(),
      impressions: analyticsData.impressions || 0,
      membersReached: analyticsData.membersReached || 0,
      profileViews: 0,
      topPostsCount: analyticsData.topPosts?.length || 0,
    };

    const existingIndex = history.findIndex((h) => h.date === today);
    if (existingIndex >= 0) {
      history[existingIndex] = entry;
    } else {
      history.push(entry);
    }

    history = history.slice(-90);
    await saveToStorage(STORAGE_KEYS.ANALYTICS_HISTORY, history);
    console.log(`[ServiceWorker] Analytics history updated: ${history.length} entries`);

    return { success: true, data: { entries: history.length } };
  } catch (error) {
    console.error('[ServiceWorker] Error updating analytics history:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function addToAudienceHistory(audienceData: Partial<AudienceAnalytics>): Promise<StorageResult> {
  try {
    const existing = await getFromStorage<AudienceHistoryEntry[]>(STORAGE_KEYS.AUDIENCE_HISTORY);
    let history = existing.data || [];

    const today = new Date().toISOString().split('T')[0];
    const entry: AudienceHistoryEntry = {
      date: today,
      timestamp: new Date().toISOString(),
      totalFollowers: audienceData.totalFollowers || 0,
      followerGrowth: audienceData.growthRate || 0,
      newFollowers: audienceData.newFollowers || 0,
    };

    const existingIndex = history.findIndex((h) => h.date === today);
    if (existingIndex >= 0) {
      history[existingIndex] = entry;
    } else {
      history.push(entry);
    }

    history = history.slice(-90);
    await saveToStorage(STORAGE_KEYS.AUDIENCE_HISTORY, history);
    console.log(`[ServiceWorker] Audience history updated: ${history.length} entries`);

    return { success: true, data: { entries: history.length } };
  } catch (error) {
    console.error('[ServiceWorker] Error updating audience history:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function updateCaptureStats(captureType: string, success: boolean): Promise<StorageResult> {
  try {
    const existing = await getFromStorage<CaptureStats>(STORAGE_KEYS.CAPTURE_STATS);
    const stats: CaptureStats = existing.data || {
      totalCaptures: 0,
      successfulCaptures: 0,
      failedCaptures: 0,
      capturesByType: {},
      lastCapture: null,
      captureHistory: [],
    };

    stats.totalCaptures++;
    if (success) {
      stats.successfulCaptures++;
    } else {
      stats.failedCaptures++;
    }

    if (!stats.capturesByType[captureType]) {
      stats.capturesByType[captureType] = { success: 0, failed: 0 };
    }
    if (success) {
      stats.capturesByType[captureType].success++;
    } else {
      stats.capturesByType[captureType].failed++;
    }

    stats.lastCapture = {
      type: captureType,
      success,
      timestamp: new Date().toISOString(),
    };

    stats.captureHistory.push({
      type: captureType,
      success,
      timestamp: new Date().toISOString(),
    });
    stats.captureHistory = stats.captureHistory.slice(-50);

    await saveToStorage(STORAGE_KEYS.CAPTURE_STATS, stats);
    console.log(`[ServiceWorker] Capture stats updated: ${stats.totalCaptures} total`);

    return { success: true, data: { stats } };
  } catch (error) {
    console.error('[ServiceWorker] Error updating capture stats:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function getAnalyticsGrowth(): Promise<StorageResult> {
  try {
    const existing = await getFromStorage<AnalyticsHistoryEntry[]>(STORAGE_KEYS.ANALYTICS_HISTORY);
    const history = existing.data || [];

    if (history.length < 2) {
      return { success: true, data: { growth: null, message: 'Not enough data for growth calculation' } };
    }

    const latest = history[history.length - 1];
    const previous = history[history.length - 2];

    const growth = {
      impressionsChange: latest.impressions - previous.impressions,
      impressionsGrowth:
        previous.impressions > 0
          ? ((latest.impressions - previous.impressions) / previous.impressions * 100).toFixed(2)
          : 0,
      membersReachedChange: latest.membersReached - previous.membersReached,
      profileViewsChange: latest.profileViews - previous.profileViews,
      period: `${previous.date} to ${latest.date}`,
    };

    return { success: true, data: { growth } };
  } catch (error) {
    console.error('[ServiceWorker] Error calculating analytics growth:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function getAudienceGrowth(): Promise<StorageResult> {
  try {
    const existing = await getFromStorage<AudienceHistoryEntry[]>(STORAGE_KEYS.AUDIENCE_HISTORY);
    const history = existing.data || [];

    if (history.length < 2) {
      return { success: true, data: { growth: null, message: 'Not enough data for growth calculation' } };
    }

    const latest = history[history.length - 1];
    const oldest = history[0];

    const growth: Record<string, unknown> = {
      totalGrowth: latest.totalFollowers - oldest.totalFollowers,
      growthRate:
        oldest.totalFollowers > 0
          ? ((latest.totalFollowers - oldest.totalFollowers) / oldest.totalFollowers * 100).toFixed(2)
          : 0,
      period: `${oldest.date} to ${latest.date}`,
      daysTracked: history.length,
    };

    if (history.length >= 7) {
      const weekAgo = history[history.length - 7];
      growth.weeklyGrowth = latest.totalFollowers - weekAgo.totalFollowers;
      growth.weeklyGrowthRate =
        weekAgo.totalFollowers > 0
          ? ((latest.totalFollowers - weekAgo.totalFollowers) / weekAgo.totalFollowers * 100).toFixed(2)
          : 0;
    }

    return { success: true, data: { growth } };
  } catch (error) {
    console.error('[ServiceWorker] Error calculating audience growth:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// POST ANALYTICS STORAGE
// ============================================

interface PostAnalyticsData {
  activityUrn: string;
  impressions?: number;
  engagement?: {
    reactions?: number;
    comments?: number;
    reposts?: number;
  };
  engagementRate?: string;
  [key: string]: unknown;
}

async function savePostAnalyticsToStorage(newData: PostAnalyticsData): Promise<StorageResult> {
  try {
    if (!newData?.activityUrn) {
      return { success: false, error: 'No activity URN provided' };
    }

    const existing = await getFromStorage<{ posts: PostAnalyticsData[]; stats: Record<string, unknown> }>(
      STORAGE_KEYS.POST_ANALYTICS_DATA
    );
    const existingData = existing.data || { posts: [], stats: {} };
    let allPosts = existingData.posts || [];

    const existingIndex = allPosts.findIndex((p) => p.activityUrn === newData.activityUrn);

    if (existingIndex >= 0) {
      allPosts[existingIndex] = {
        ...allPosts[existingIndex],
        ...newData,
        lastUpdated: new Date().toISOString(),
      };
    } else {
      allPosts.push({
        ...newData,
        firstCaptured: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      });
    }

    allPosts.sort((a, b) => (b.impressions || 0) - (a.impressions || 0));
    allPosts = allPosts.slice(0, 100);

    const totalImpressions = allPosts.reduce((sum, p) => sum + (p.impressions || 0), 0);
    const totalReactions = allPosts.reduce((sum, p) => sum + (p.engagement?.reactions || 0), 0);
    const totalComments = allPosts.reduce((sum, p) => sum + (p.engagement?.comments || 0), 0);

    const postAnalyticsData = {
      posts: allPosts,
      totalCount: allPosts.length,
      lastUpdated: new Date().toISOString(),
      stats: {
        totalImpressions,
        totalReactions,
        totalComments,
        avgImpressions: allPosts.length > 0 ? Math.round(totalImpressions / allPosts.length) : 0,
        avgReactions: allPosts.length > 0 ? Math.round(totalReactions / allPosts.length) : 0,
      },
    };

    await saveToStorage(STORAGE_KEYS.POST_ANALYTICS_DATA, postAnalyticsData);
    console.log(`[ServiceWorker] Post analytics saved: ${allPosts.length} posts, latest: ${newData.activityUrn}`);

    return {
      success: true,
      data: { totalCount: allPosts.length, isUpdate: existingIndex >= 0 },
    };
  } catch (error) {
    console.error('[ServiceWorker] Error saving post analytics:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// AUDIENCE DATA STORAGE
// ============================================

async function saveAudienceDataToStorage(newData: Partial<AudienceAnalytics>): Promise<StorageResult> {
  try {
    if (!newData) {
      return { success: false, error: 'No audience data provided' };
    }

    const audienceData = {
      ...newData,
      lastUpdated: new Date().toISOString(),
    };

    await saveToStorage(STORAGE_KEYS.AUDIENCE_DATA, audienceData);
    console.log(`[ServiceWorker] Audience data saved: ${newData.totalFollowers} followers`);

    return { success: true, data: { totalFollowers: newData.totalFollowers } };
  } catch (error) {
    console.error('[ServiceWorker] Error saving audience data:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

async function exportAsJSON(): Promise<StorageResult<{ content: string; filename: string }>> {
  const allData = await getAllStoredData();
  if (!allData.success) {
    return { success: false, error: allData.error };
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    version: '4.0.0',
    data: allData.data,
  };

  return {
    success: true,
    data: {
      content: JSON.stringify(exportData, null, 2),
      filename: `linkedin-data-${Date.now()}.json`,
    },
  };
}

async function exportAsCSV(dataKey: string): Promise<StorageResult<{ content: string; filename: string }>> {
  const result = await getFromStorage<unknown[]>(dataKey);
  if (!result.success || !result.data) {
    return { success: false, error: 'No data to export' };
  }

  const data = result.data;
  if (!Array.isArray(data) || data.length === 0) {
    return { success: false, error: 'No data to export' };
  }

  const allKeys = new Set<string>();
  data.forEach((item) => {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item).forEach((key) => allKeys.add(key));
    }
  });

  const headers = Array.from(allKeys);
  const csvRows = [headers.join(',')];

  data.forEach((item: Record<string, unknown>) => {
    const row = headers.map((header) => {
      const value = item[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
      return String(value).replace(/"/g, '""');
    });
    csvRows.push(row.map((v) => `"${v}"`).join(','));
  });

  return {
    success: true,
    data: {
      content: csvRows.join('\n'),
      filename: `linkedin-${dataKey}-${Date.now()}.csv`,
    },
  };
}

// ============================================
// LINKEDIN API FUNCTIONS
// ============================================

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function fetchLinkedInAPI(endpoint: string, options: RequestInit = {}): Promise<StorageResult> {
  try {
    const cookies = await getLinkedInCookies();
    if (!cookies.isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    const csrfToken = cookies.csrfToken?.replace(/"/g, '') || '';

    const headers: HeadersInit = {
      accept: 'application/vnd.linkedin.normalized+json+2.1',
      'accept-language': 'en-US,en;q=0.9',
      'csrf-token': csrfToken,
      'x-li-lang': 'en_US',
      'x-li-page-instance': 'urn:li:page:d_flagship3_profile_view_base;' + generateUUID(),
      'x-li-track': JSON.stringify({
        clientVersion: '1.13.8960',
        mpVersion: '1.13.8960',
        osName: 'web',
        timezoneOffset: new Date().getTimezoneOffset() / -60,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        deviceFormFactor: 'DESKTOP',
        mpName: 'voyager-web',
      }),
      'x-restli-protocol-version': '2.0.0',
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(`https://www.linkedin.com${endpoint}`, {
      method: options.method || 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      console.error(`[ServiceWorker] API error: ${response.status} for ${endpoint}`);
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('[ServiceWorker] API fetch error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// MESSAGE HANDLING
// ============================================

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  console.log('[ServiceWorker] Received message:', message.type);

  (async () => {
    let response: StorageResult;

    switch (message.type) {
      case 'GET_COOKIES':
        response = await getLinkedInCookies();
        break;

      case 'CHECK_AUTH':
        response = { success: true, data: await checkAuthentication() };
        break;

      case 'SAVE_DATA':
        response = await saveToStorage(message.key!, message.data);
        break;

      case 'GET_DATA':
        response = await getFromStorage(message.key!);
        break;

      case 'GET_ALL_DATA':
        response = await getAllStoredData();
        break;

      case 'CLEAR_DATA':
        response = await clearStorage();
        break;

      case 'AUTO_CAPTURE_CREATOR_ANALYTICS': {
        console.log('[CAPTURE][ANALYTICS] Received data:', JSON.stringify(message.data, null, 2));
        const analyticsData = message.data as Partial<CreatorAnalytics> & {
          searchAppearances?: number;
          search_appearances?: number;
          engagementRate?: number;
          engagement_rate?: number;
        };

        // Calculate engagements if not present (sum of reactions, comments, reposts from top posts)
        let engagements = (analyticsData as { engagements?: number }).engagements || 0;
        if (!engagements && analyticsData.topPosts) {
          engagements = analyticsData.topPosts.reduce((sum, post) => {
            const postEngagements = (post.reactions || 0) + (post.comments || 0) + (post.reposts || 0);
            return sum + postEngagements;
          }, 0);
        }

        // Map fields to ensure consistency (camelCase -> snake_case for storage)
        const dataToSave = {
          // Original data
          ...analyticsData,
          // Ensure all required fields are present with proper naming
          impressions: analyticsData.impressions || 0,
          engagements: engagements,
          members_reached: analyticsData.membersReached || (analyticsData as { members_reached?: number }).members_reached || 0,
          profile_views: (analyticsData as { profileViews?: number }).profileViews || (analyticsData as { profile_views?: number }).profile_views || 0,
          search_appearances: analyticsData.searchAppearances || analyticsData.search_appearances || 0,
          new_followers: analyticsData.newFollowers || (analyticsData as { new_followers?: number }).new_followers || 0,
          engagement_rate: analyticsData.engagementRate || analyticsData.engagement_rate ||
            (analyticsData.impressions && analyticsData.impressions > 0
              ? ((engagements / analyticsData.impressions) * 100).toFixed(2)
              : 0),
          // Metadata
          page_type: 'creator_analytics',
          source: 'auto_capture',
          captured_at: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
          raw_data: analyticsData,
        };

        console.log('[CAPTURE][ANALYTICS] Saving to storage:', JSON.stringify({
          impressions: dataToSave.impressions,
          engagements: dataToSave.engagements,
          members_reached: dataToSave.members_reached,
          profile_views: dataToSave.profile_views,
          search_appearances: dataToSave.search_appearances,
          new_followers: dataToSave.new_followers,
          engagement_rate: dataToSave.engagement_rate,
        }, null, 2));

        response = await saveToStorage(STORAGE_KEYS.ANALYTICS_DATA, dataToSave);
        await addToAnalyticsHistory(analyticsData);
        await updateCaptureStats('creator_analytics', true);

        // Record to IndexedDB for trend tracking
        try {
          await recordAnalyticsTrends(analyticsData as CreatorAnalytics);
          await logCapture('creator_analytics', JSON.stringify(analyticsData).length, true);
        } catch (error) {
          console.error('[ERROR][ANALYTICS] Error recording analytics trends:', error);
        }

        // Show capture notification
        const impressions = analyticsData.impressions?.toLocaleString() || '';
        await showCaptureNotification('creator_analytics', impressions ? `${impressions} impressions` : undefined);
        console.log('[CAPTURE][ANALYTICS] Save completed successfully');
        break;
      }

      case 'AUTO_CAPTURE_POST_ANALYTICS': {
        console.log('[CAPTURE][POST_ANALYTICS] Received data:', JSON.stringify(message.data, null, 2));
        const postData = message.data as PostAnalyticsData;

        console.log('[CAPTURE][POST_ANALYTICS] Saving post:', {
          activityUrn: postData.activityUrn,
          impressions: postData.impressions,
          reactions: postData.engagement?.reactions,
          comments: postData.engagement?.comments,
          reposts: postData.engagement?.reposts,
        });

        response = await savePostAnalyticsToStorage(postData);
        await updateCaptureStats('post_analytics', response.success);
        await showCaptureNotification('post_analytics', postData.impressions?.toLocaleString() || undefined);
        console.log('[CAPTURE][POST_ANALYTICS] Save completed, success:', response.success);
        break;
      }

      case 'AUTO_CAPTURE_AUDIENCE': {
        console.log('[CAPTURE][AUDIENCE] Received data:', JSON.stringify(message.data, null, 2));
        const audienceData = message.data as Partial<AudienceAnalytics> & {
          total_followers?: number;
          follower_growth?: number;
          top_locations?: unknown;
          top_industries?: unknown;
          top_job_titles?: unknown;
          top_companies?: unknown;
        };

        // Map to snake_case for database consistency
        const dataToSave: Partial<AudienceAnalytics> = {
          ...audienceData,
          totalFollowers: audienceData.totalFollowers || audienceData.total_followers || 0,
          followerGrowth: audienceData.followerGrowth || audienceData.follower_growth || 0,
          newFollowers: audienceData.newFollowers || 0,
          // Keep original field names for demographics
          topLocations: audienceData.topLocations || audienceData.top_locations,
          topIndustries: audienceData.topIndustries || audienceData.top_industries,
          topJobTitles: audienceData.topJobTitles || audienceData.top_job_titles,
          topCompanies: audienceData.topCompanies || audienceData.top_companies,
        };

        console.log('[CAPTURE][AUDIENCE] Saving to storage:', JSON.stringify({
          totalFollowers: dataToSave.totalFollowers,
          followerGrowth: dataToSave.followerGrowth,
          newFollowers: dataToSave.newFollowers,
        }, null, 2));

        response = await saveAudienceDataToStorage(dataToSave);
        await addToAudienceHistory(dataToSave);
        await updateCaptureStats('audience_analytics', response.success);

        // Record to IndexedDB for trend tracking (follower count)
        try {
          if (dataToSave.totalFollowers) {
            await recordProfileTrends({ followers_count: dataToSave.totalFollowers } as ProfileData);
          }
          await logCapture('audience_analytics', JSON.stringify(audienceData).length, response.success);
        } catch (error) {
          console.error('[ERROR][AUDIENCE] Error recording audience trends:', error);
        }

        // Show capture notification
        const followers = dataToSave.totalFollowers?.toLocaleString() || '';
        await showCaptureNotification('audience_analytics', followers ? `${followers} followers` : undefined);
        console.log('[CAPTURE][AUDIENCE] Save completed, success:', response.success);
        break;
      }

      case 'AUTO_CAPTURE_AUDIENCE_DEMOGRAPHICS': {
        console.log('[CAPTURE][AUDIENCE_DEMOGRAPHICS] Received data:', JSON.stringify(message.data, null, 2));
        const existingAudience = await getFromStorage<Partial<AudienceAnalytics>>(STORAGE_KEYS.AUDIENCE_DATA);
        const audienceWithDemographics = {
          ...(existingAudience.data || {}),
          demographics: (message.data as { demographics?: unknown })?.demographics || message.data,
          demographicsUpdated: new Date().toISOString(),
        };

        console.log('[CAPTURE][AUDIENCE_DEMOGRAPHICS] Merging with existing data:', {
          hadExistingData: !!existingAudience.data,
          newDemographicsKeys: Object.keys((message.data as { demographics?: unknown })?.demographics || message.data || {}),
        });

        response = await saveAudienceDataToStorage(audienceWithDemographics);
        await updateCaptureStats('audience_demographics', response.success);
        console.log('[CAPTURE][AUDIENCE_DEMOGRAPHICS] Save completed, success:', response.success);
        break;
      }

      case 'AUTO_CAPTURE_POST_DEMOGRAPHICS': {
        console.log('[CAPTURE][POST_DEMOGRAPHICS] Received data:', JSON.stringify(message.data, null, 2));
        const pageInfo = (message.data as { pageInfo?: { identifier?: string } })?.pageInfo;
        if (pageInfo?.identifier) {
          const postUrn = `urn:li:activity:${pageInfo.identifier}`;
          console.log('[CAPTURE][POST_DEMOGRAPHICS] Looking for post:', postUrn);

          const existingPostAnalytics = await getFromStorage<{ posts: PostAnalyticsData[] }>(
            STORAGE_KEYS.POST_ANALYTICS_DATA
          );
          const posts = existingPostAnalytics.data?.posts || [];
          const postIndex = posts.findIndex((p) => p.activityUrn === postUrn);

          if (postIndex >= 0) {
            posts[postIndex].demographics = (message.data as { demographics?: unknown })?.demographics;
            posts[postIndex].demographicsUpdated = new Date().toISOString();

            console.log('[CAPTURE][POST_DEMOGRAPHICS] Updating post at index:', postIndex);

            await saveToStorage(STORAGE_KEYS.POST_ANALYTICS_DATA, {
              ...existingPostAnalytics.data,
              posts,
              lastUpdated: new Date().toISOString(),
            });
          } else {
            console.log('[CAPTURE][POST_DEMOGRAPHICS] Post not found in storage');
          }
        } else {
          console.log('[CAPTURE][POST_DEMOGRAPHICS] No page identifier provided');
        }
        response = { success: true };
        await updateCaptureStats('post_demographics', true);
        console.log('[CAPTURE][POST_DEMOGRAPHICS] Save completed');
        break;
      }

      case 'AUTO_CAPTURE_PROFILE_VIEWS': {
        console.log('[CAPTURE][PROFILE_VIEWS] Received data:', JSON.stringify(message.data, null, 2));
        const existingAnalytics = await getFromStorage<Record<string, unknown>>(STORAGE_KEYS.ANALYTICS_DATA);
        const profileViewsData = message.data as {
          totalViews?: number;
          profileViews?: number;
          profile_views?: number;
          searchAppearances?: number;
          search_appearances?: number;
          viewers?: unknown[];
        };

        // Extract profile views from various possible field names
        const profileViews = profileViewsData?.totalViews ||
          profileViewsData?.profileViews ||
          profileViewsData?.profile_views ||
          (profileViewsData?.viewers?.length) ||
          0;

        // Extract search appearances from various possible field names
        const searchAppearances = profileViewsData?.searchAppearances ||
          profileViewsData?.search_appearances ||
          0;

        const dataToSave = {
          ...(existingAnalytics.data || {}),
          // Use snake_case for consistency with database schema
          profile_views: profileViews,
          search_appearances: searchAppearances,
          // Also keep camelCase for backward compatibility
          profileViews: profileViews,
          searchAppearances: searchAppearances,
          // Store raw data for debugging
          profileViewsData: message.data,
          profileViewsUpdated: new Date().toISOString(),
        };

        console.log('[CAPTURE][PROFILE_VIEWS] Saving to storage:', JSON.stringify({
          profile_views: dataToSave.profile_views,
          search_appearances: dataToSave.search_appearances,
        }, null, 2));

        response = await saveToStorage(STORAGE_KEYS.ANALYTICS_DATA, dataToSave);
        await updateCaptureStats('profile_views', response.success);
        console.log('[CAPTURE][PROFILE_VIEWS] Save completed, success:', response.success);
        break;
      }

      case 'AUTO_CAPTURE_PROFILE': {
        console.log('[CAPTURE][PROFILE] Received data:', JSON.stringify(message.data, null, 2));
        const profileData = message.data as ProfileData & {
          connectionCount?: number;
          followerCount?: number;
          followersCount?: number;
          connectionsCount?: number;
        };

        // Map various field naming conventions to snake_case for database consistency
        const followersCount = profileData.followers_count ||
          profileData.followerCount ||
          profileData.followersCount ||
          0;

        const connectionsCount = profileData.connections_count ||
          profileData.connectionCount ||
          profileData.connectionsCount ||
          0;

        const dataToSave = {
          ...profileData,
          // Ensure snake_case fields are present (database schema uses snake_case)
          followers_count: followersCount,
          connections_count: connectionsCount,
          // Also include camelCase for backward compatibility
          followerCount: followersCount,
          connectionCount: connectionsCount,
          // Map other profile fields
          linkedin_id: profileData.linkedin_id || (profileData as { linkedinId?: string }).linkedinId,
          first_name: profileData.first_name || (profileData as { firstName?: string }).firstName,
          last_name: profileData.last_name || (profileData as { lastName?: string }).lastName,
          full_name: profileData.full_name || (profileData as { fullName?: string }).fullName || profileData.name,
          profile_url: profileData.profile_url || (profileData as { profileUrl?: string }).profileUrl,
          profile_picture_url: profileData.profile_picture_url || (profileData as { profilePictureUrl?: string }).profilePictureUrl,
          // Metadata
          source: 'auto_capture',
          captured_at: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        };

        console.log('[CAPTURE][PROFILE] Saving to storage:', JSON.stringify({
          name: dataToSave.full_name || dataToSave.name,
          followers_count: dataToSave.followers_count,
          connections_count: dataToSave.connections_count,
          headline: dataToSave.headline,
        }, null, 2));

        response = await saveToStorage(STORAGE_KEYS.PROFILE_DATA, dataToSave);
        await updateCaptureStats('profile', true);

        // Record profile trends to IndexedDB for trend tracking
        try {
          await recordProfileTrends(dataToSave as ProfileData);
          await logCapture('profile', JSON.stringify(profileData).length, true);
        } catch (error) {
          console.error('[ERROR][PROFILE] Error recording profile trends:', error);
        }

        // Show capture notification
        const followers = followersCount?.toLocaleString() || '';
        await showCaptureNotification('profile', followers ? `${followers} followers` : undefined);
        console.log('[CAPTURE][PROFILE] Save completed successfully');
        break;
      }

      // ==========================================
      // Company Analytics (v4.0 Phase 5)
      // ==========================================

      case 'AUTO_CAPTURE_COMPANY_ANALYTICS': {
        console.log('[CAPTURE][COMPANY_ANALYTICS] Received data:', JSON.stringify(message.data, null, 2));
        const companyData = message.data as CompanyAnalytics;

        // Get existing company data
        const existingCompanies = await getFromStorage<Record<string, CompanyAnalytics>>(
          STORAGE_KEYS.COMPANY_ANALYTICS
        );
        const companies = existingCompanies.data || {};

        // Store by company ID
        if (companyData.companyId) {
          companies[companyData.companyId] = {
            ...companyData,
            capturedAt: Date.now(),
          };
          console.log('[CAPTURE][COMPANY_ANALYTICS] Saving company:', {
            companyId: companyData.companyId,
            companyName: companyData.companyName,
            followers: companyData.followers,
          });
        } else {
          console.log('[CAPTURE][COMPANY_ANALYTICS] No company ID provided');
        }

        response = await saveToStorage(STORAGE_KEYS.COMPANY_ANALYTICS, companies);
        await updateCaptureStats('company_analytics', response.success);

        // Log capture
        try {
          await logCapture('company_analytics', JSON.stringify(companyData).length, response.success);
        } catch (error) {
          console.error('[ERROR][COMPANY_ANALYTICS] Error logging company capture:', error);
        }

        // Show capture notification
        const followers = companyData.followers?.toLocaleString() || '';
        await showCaptureNotification('company_analytics', followers ? `${followers} followers` : companyData.companyName);
        console.log('[CAPTURE][COMPANY_ANALYTICS] Save completed, success:', response.success);
        break;
      }

      case 'AUTO_CAPTURE_CONTENT_CALENDAR': {
        console.log('[CAPTURE][CONTENT_CALENDAR] Received data:', JSON.stringify(message.data, null, 2));
        const calendarData = message.data as ContentCalendarData & { companyId?: string };

        // Get existing calendar data
        const existingCalendars = await getFromStorage<Record<string, ContentCalendarData>>(
          STORAGE_KEYS.CONTENT_CALENDAR
        );
        const calendars = existingCalendars.data || {};

        // Store by company ID or 'personal'
        const calendarKey = calendarData.companyId || 'personal';
        calendars[calendarKey] = {
          ...calendarData,
          capturedAt: Date.now(),
        };

        console.log('[CAPTURE][CONTENT_CALENDAR] Saving calendar:', {
          calendarKey,
          itemCount: calendarData.items?.length || 0,
        });

        response = await saveToStorage(STORAGE_KEYS.CONTENT_CALENDAR, calendars);
        await updateCaptureStats('content_calendar', response.success);

        // Log capture
        try {
          await logCapture('content_calendar', JSON.stringify(calendarData).length, response.success);
        } catch (error) {
          console.error('[ERROR][CONTENT_CALENDAR] Error logging calendar capture:', error);
        }

        // Show capture notification
        const postCount = calendarData.items?.length || 0;
        await showCaptureNotification('content_calendar', `${postCount} posts`);
        console.log('[CAPTURE][CONTENT_CALENDAR] Save completed, success:', response.success);
        break;
      }

      case 'GET_COMPANY_ANALYTICS': {
        console.log('[ServiceWorker] GET_COMPANY_ANALYTICS received');
        const companyId = (message.data as { companyId?: string })?.companyId;
        try {
          const companies = await getFromStorage<Record<string, CompanyAnalytics>>(
            STORAGE_KEYS.COMPANY_ANALYTICS
          );
          if (companyId && companies.data) {
            response = { success: true, data: companies.data[companyId] || null };
          } else {
            response = { success: true, data: companies.data || {} };
          }
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'GET_CONTENT_CALENDAR': {
        console.log('[ServiceWorker] GET_CONTENT_CALENDAR received');
        const calendarKey = (message.data as { companyId?: string })?.companyId || 'personal';
        try {
          const calendars = await getFromStorage<Record<string, ContentCalendarData>>(
            STORAGE_KEYS.CONTENT_CALENDAR
          );
          if (calendars.data && calendars.data[calendarKey]) {
            response = { success: true, data: calendars.data[calendarKey] };
          } else {
            response = { success: true, data: null };
          }
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'AUTO_CAPTURE_LOG': {
        const logData = message.data as { pageType?: string; url?: string; success?: boolean };
        console.log('[CAPTURE][LOG] Recording capture event:', JSON.stringify({
          pageType: logData.pageType,
          url: logData.url,
          success: logData.success,
        }, null, 2));

        const captureLog = await getFromStorage<unknown[]>(STORAGE_KEYS.AUTO_CAPTURE_LOG);
        const logs = captureLog.data || [];
        logs.push({
          ...(message.data as Record<string, unknown>),
          loggedAt: new Date().toISOString(),
        });
        response = await saveToStorage(STORAGE_KEYS.AUTO_CAPTURE_LOG, logs.slice(-100));
        console.log('[CAPTURE][LOG] Logged, total entries:', Math.min(logs.length, 100));
        break;
      }

      case 'GET_ANALYTICS_GROWTH':
        response = await getAnalyticsGrowth();
        break;

      case 'GET_AUDIENCE_GROWTH':
        response = await getAudienceGrowth();
        break;

      case 'GET_CAPTURE_STATS':
        response = await getFromStorage(STORAGE_KEYS.CAPTURE_STATS);
        break;

      case 'EXPORT_JSON':
        response = await exportAsJSON();
        break;

      case 'EXPORT_CSV':
        response = await exportAsCSV(message.key!);
        break;

      // ==========================================
      // IndexedDB / Trend Data Operations
      // ==========================================

      case 'GET_TREND_DATA': {
        console.log('[ServiceWorker] GET_TREND_DATA received');
        const days = (message.data as { days?: number })?.days || 30;
        try {
          const trendData = await getTrendDataForCharts(days);
          response = { success: true, data: trendData };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'GET_TREND_SUMMARY': {
        console.log('[ServiceWorker] GET_TREND_SUMMARY received');
        const summaryDays = (message.data as { days?: number })?.days || 7;
        try {
          const summary = await getTrendSummary(summaryDays);
          response = { success: true, data: summary };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'EXPORT_TRENDS_CSV': {
        console.log('[ServiceWorker] EXPORT_TRENDS_CSV received');
        const csvDays = (message.data as { days?: number })?.days || 90;
        try {
          const csv = await exportTrendsAsCSV(csvDays);
          response = {
            success: true,
            data: {
              content: csv,
              filename: `linkedin-trends-${Date.now()}.csv`,
            },
          };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'EXPORT_TRENDS_JSON': {
        console.log('[ServiceWorker] EXPORT_TRENDS_JSON received');
        const jsonDays = (message.data as { days?: number })?.days || 90;
        try {
          const json = await exportTrendsAsJSON(jsonDays);
          response = {
            success: true,
            data: {
              content: json,
              filename: `linkedin-trends-${Date.now()}.json`,
            },
          };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'EXPORT_CAPTURE_LOGS': {
        console.log('[ServiceWorker] EXPORT_CAPTURE_LOGS received');
        const limit = (message.data as { limit?: number })?.limit || 100;
        try {
          const logsCSV = await exportCaptureLogsAsCSV(limit);
          response = {
            success: true,
            data: {
              content: logsCSV,
              filename: `linkedin-capture-logs-${Date.now()}.csv`,
            },
          };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'EXPORT_FULL_BACKUP': {
        console.log('[ServiceWorker] EXPORT_FULL_BACKUP received');
        try {
          const backup = await exportFullBackup();
          response = {
            success: true,
            data: {
              content: backup,
              filename: `linkedin-full-backup-${Date.now()}.json`,
            },
          };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'GET_STORAGE_STATS': {
        console.log('[ServiceWorker] GET_STORAGE_STATS received');
        try {
          const stats = await getStorageStats();
          response = { success: true, data: stats };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'RUN_MAINTENANCE': {
        console.log('[ServiceWorker] RUN_MAINTENANCE received');
        try {
          await runMaintenance();
          response = { success: true, data: { message: 'Maintenance completed' } };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      // ==========================================
      // Alarms & Notifications Operations
      // ==========================================

      case 'GET_BACKUP_SCHEDULE': {
        console.log('[ServiceWorker] GET_BACKUP_SCHEDULE received');
        try {
          const schedule = await getBackupSchedule();
          response = { success: true, data: schedule };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'UPDATE_BACKUP_SCHEDULE': {
        console.log('[ServiceWorker] UPDATE_BACKUP_SCHEDULE received');
        try {
          const newSchedule = message.data as import('../shared/types').BackupSchedule;
          await updateBackupSchedule(newSchedule);
          response = { success: true, data: { message: 'Backup schedule updated' } };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'GET_ALERT_CONFIGS': {
        console.log('[ServiceWorker] GET_ALERT_CONFIGS received');
        try {
          const configs = await getAlertConfigs();
          response = { success: true, data: configs };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'SAVE_ALERT_CONFIG': {
        console.log('[ServiceWorker] SAVE_ALERT_CONFIG received');
        try {
          const config = message.data as import('../shared/types').AlertConfig;
          await upsertAlertConfig(config);
          response = { success: true, data: { message: 'Alert config saved' } };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'DELETE_ALERT_CONFIG': {
        console.log('[ServiceWorker] DELETE_ALERT_CONFIG received');
        try {
          const alertId = (message.data as { id: string }).id;
          await deleteAlertConfig(alertId);
          response = { success: true, data: { message: 'Alert config deleted' } };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'GET_NOTIFICATION_SETTINGS': {
        console.log('[ServiceWorker] GET_NOTIFICATION_SETTINGS received');
        try {
          const settings = await getNotificationSettings();
          response = { success: true, data: settings };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'SAVE_NOTIFICATION_SETTINGS': {
        console.log('[ServiceWorker] SAVE_NOTIFICATION_SETTINGS received');
        try {
          const settings = message.data as NotificationSettings;
          await saveNotificationSettings(settings);
          response = { success: true, data: { message: 'Notification settings saved' } };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'GET_ALL_ALARMS': {
        console.log('[ServiceWorker] GET_ALL_ALARMS received');
        try {
          const alarms = await getAllAlarms();
          response = { success: true, data: alarms };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'TRIGGER_MANUAL_BACKUP': {
        console.log('[ServiceWorker] TRIGGER_MANUAL_BACKUP received');
        try {
          const backup = await exportFullBackup();
          const size = new Blob([backup]).size;

          const backupId = `backup-${Date.now()}`;
          await saveToStorage(`backup_${backupId}`, {
            id: backupId,
            timestamp: Date.now(),
            size,
            type: 'manual',
            data: backup,
          });

          await showBackupSuccessNotification('manual', size);
          response = {
            success: true,
            data: { backupId, size, content: backup },
          };
        } catch (error) {
          await showBackupFailureNotification(error instanceof Error ? error.message : 'Unknown error');
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      // ==========================================
      // Supabase Sync (v4.1)
      // ==========================================

      case 'SUPABASE_AUTH_STATUS': {
        console.log('[ServiceWorker] SUPABASE_AUTH_STATUS received');
        try {
          // First check storage for session (in case service worker restarted)
          const sessionResult = await chrome.storage.local.get('supabase_session');
          const session = sessionResult.supabase_session;

          // If session exists in storage but currentUserId is not set, restore it
          let syncStatus = await getSyncStatusInfo();
          if (!syncStatus.isAuthenticated && session?.user?.id) {
            console.log('[ServiceWorker] Restoring session from storage for user:', session.user.id.substring(0, 8) + '...');
            // Restore the currentUserId in sync bridge
            setCurrentUserId(session.user.id);
            // Also set auth on supabase client if available
            const supabaseClient = (self as unknown as { supabase?: { setAuth: (token: string, userId?: string) => void } }).supabase;
            if (supabaseClient && session.access_token) {
              supabaseClient.setAuth(session.access_token, session.user.id);
            }
            // Re-fetch sync status after restoration
            syncStatus = await getSyncStatusInfo();
          }

          response = {
            success: true,
            data: {
              isConfigured: true,
              isAuthenticated: syncStatus.isAuthenticated || !!session?.user?.id,
              userId: syncStatus.userId || session?.user?.id || null,
              email: session?.user?.email || null,  // Add email directly for popup
              user: session?.user || null,
              pendingCount: syncStatus.pendingCount,
              lastSyncTime: syncStatus.lastSyncTime,
              isSyncing: syncStatus.isSyncing,
            },
          };
          console.log('[ServiceWorker] Auth status response:', {
            isAuthenticated: response.data.isAuthenticated,
            hasEmail: !!response.data.email
          });
        } catch (error) {
          console.error('[ServiceWorker] Auth status error:', error);
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'SUPABASE_AUTH_SIGN_IN': {
        console.log('[ServiceWorker] SUPABASE_AUTH_SIGN_IN received');
        try {
          const { email, password } = message.data as { email: string; password: string };

          // Use the supabase auth module from lib/supabase/auth.js
          const supabaseAuth = (self as unknown as { supabaseAuth?: {
            signIn: (email: string, password: string) => Promise<{ success: boolean; user?: { id: string }; error?: string }>;
          } }).supabaseAuth;

          if (!supabaseAuth) {
            response = { success: false, error: 'Supabase auth not initialized' };
            break;
          }

          const result = await supabaseAuth.signIn(email, password);
          if (result.success && result.user) {
            setCurrentUserId(result.user.id);

            // Check if migration is needed
            const migrationCheck = await chrome.storage.local.get([
              'supabase_migration_complete',
              'supabase_migration_user',
            ]);

            if (
              !migrationCheck.supabase_migration_complete ||
              migrationCheck.supabase_migration_user !== result.user.id
            ) {
              console.log('[ServiceWorker] First sign-in - running data migration');
              await migrateExistingData();
            }
          }

          response = { success: result.success, data: result, error: result.error };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'SUPABASE_AUTH_SIGN_UP': {
        console.log('[ServiceWorker] SUPABASE_AUTH_SIGN_UP received');
        try {
          const { email, password } = message.data as { email: string; password: string };

          const supabaseAuth = (self as unknown as { supabaseAuth?: {
            signUp: (email: string, password: string) => Promise<{ success: boolean; user?: { id: string }; error?: string; message?: string }>;
          } }).supabaseAuth;

          if (!supabaseAuth) {
            response = { success: false, error: 'Supabase auth not initialized' };
            break;
          }

          const result = await supabaseAuth.signUp(email, password);
          if (result.success && result.user) {
            setCurrentUserId(result.user.id);
          }

          response = { success: result.success, data: result, error: result.error };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'SUPABASE_AUTH_SIGN_OUT': {
        console.log('[ServiceWorker] SUPABASE_AUTH_SIGN_OUT received');
        try {
          const supabaseAuth = (self as unknown as { supabaseAuth?: {
            signOut: () => Promise<{ success: boolean; error?: string }>;
          } }).supabaseAuth;

          if (supabaseAuth) {
            await supabaseAuth.signOut();
          }

          setCurrentUserId(null);
          response = { success: true };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'SUPABASE_SYNC_STATUS': {
        console.log('[ServiceWorker] SUPABASE_SYNC_STATUS received');
        try {
          const syncStatus = await getSyncStatusInfo();
          // Also get last sync time from storage
          const lastSyncResult = await chrome.storage.local.get('last_sync_time');
          response = {
            success: true,
            data: {
              ...syncStatus,
              lastSyncTimeISO: lastSyncResult.last_sync_time || null,
              isOnline: navigator.onLine,
            },
          };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'SUPABASE_SYNC_NOW': {
        console.log('[ServiceWorker] SUPABASE_SYNC_NOW received');
        try {
          const result = await processPendingChanges();
          response = { success: true, data: result };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'SUPABASE_SYNC_RETRY': {
        console.log('[ServiceWorker] SUPABASE_SYNC_RETRY received');
        try {
          const maxRetries = (message.data as { maxRetries?: number })?.maxRetries || 3;
          const result = await syncWithRetry(maxRetries);
          response = { success: result.success, data: result };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'SUPABASE_DETAILED_STATUS': {
        console.log('[ServiceWorker] SUPABASE_DETAILED_STATUS received');
        try {
          const detailedStatus = await getDetailedSyncStatus();
          response = { success: true, data: detailedStatus };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'SUPABASE_FULL_SYNC': {
        console.log('[ServiceWorker] SUPABASE_FULL_SYNC received');
        try {
          // Re-queue all data and sync
          const migrationResult = await migrateExistingData();
          response = { success: true, data: migrationResult };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'SUPABASE_MIGRATE_DATA': {
        console.log('[ServiceWorker] SUPABASE_MIGRATE_DATA received');
        try {
          const result = await migrateExistingData();
          response = { success: true, data: result };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'DEBUG_AUTH_RESTORE': {
        console.log('[ServiceWorker] DEBUG_AUTH_RESTORE received');
        try {
          // Get current state
          const currentState = {
            currentUserId: getCurrentUserId(),
            supabaseAvailable: !!self.supabase,
            supabaseAuthAvailable: !!self.supabaseAuth,
          };
          console.log('[DEBUG] Current state:', currentState);

          // Try to restore from storage
          const storageResult = await chrome.storage.local.get(['supabase_session', 'linkedin_profile']);
          console.log('[DEBUG] Storage session:', storageResult.supabase_session ? 'found' : 'not found');
          console.log('[DEBUG] Storage profile:', storageResult.linkedin_profile ? 'found' : 'not found');

          if (storageResult.supabase_session?.user?.id) {
            const userId = storageResult.supabase_session.user.id;
            console.log('[DEBUG] Restoring user ID:', userId);
            setCurrentUserId(userId);

            // Also set auth on supabase client
            if (self.supabase && storageResult.supabase_session.access_token) {
              self.supabase.setAuth(storageResult.supabase_session.access_token, userId);
              console.log('[DEBUG] Set auth on Supabase client');
            }
          }

          // Now try to sync if we have profile data
          if (storageResult.linkedin_profile && getCurrentUserId()) {
            console.log('[DEBUG] Queuing profile for sync...');
            await queueForSync('linkedin_profile', storageResult.linkedin_profile);
            const syncResult = await processPendingChanges();
            console.log('[DEBUG] Sync result:', syncResult);
            response = {
              success: true,
              data: {
                ...currentState,
                restoredUserId: getCurrentUserId(),
                syncResult,
                profileData: storageResult.linkedin_profile,
              },
            };
          } else {
            response = {
              success: true,
              data: {
                ...currentState,
                restoredUserId: getCurrentUserId(),
                error: !storageResult.linkedin_profile ? 'No profile data' : 'No user ID',
              },
            };
          }
        } catch (error) {
          console.error('[DEBUG] Error:', error);
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'DEBUG_CLEAR_PENDING': {
        console.log('[ServiceWorker] DEBUG_CLEAR_PENDING received');
        try {
          // Get current pending changes
          const pendingResult = await chrome.storage.local.get('supabase_pending_changes');
          const pendingCount = (pendingResult.supabase_pending_changes || []).length;

          // Clear pending changes
          await chrome.storage.local.set({ supabase_pending_changes: [] });

          response = {
            success: true,
            data: {
              clearedCount: pendingCount,
              message: `Cleared ${pendingCount} pending changes`,
            },
          };
        } catch (error) {
          console.error('[DEBUG] Error clearing pending:', error);
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'DEBUG_GET_PENDING': {
        console.log('[ServiceWorker] DEBUG_GET_PENDING received');
        try {
          const pendingResult = await chrome.storage.local.get('supabase_pending_changes');
          const pending = pendingResult.supabase_pending_changes || [];

          response = {
            success: true,
            data: {
              count: pending.length,
              changes: pending,
            },
          };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      // ==========================================
      // Google Drive Sync (v4.0 Phase 6)
      // ==========================================

      case 'GOOGLE_AUTH_STATUS': {
        console.log('[ServiceWorker] GOOGLE_AUTH_STATUS received');
        try {
          const authState = await getAuthState();
          response = { success: true, data: authState };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'GOOGLE_AUTH_START': {
        console.log('[ServiceWorker] GOOGLE_AUTH_START received');
        try {
          const authState = await startAuthFlow();
          response = { success: true, data: authState };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'GOOGLE_AUTH_LOGOUT': {
        console.log('[ServiceWorker] GOOGLE_AUTH_LOGOUT received');
        try {
          await googleLogout();
          response = { success: true };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'DRIVE_SYNC_NOW': {
        console.log('[ServiceWorker] DRIVE_SYNC_NOW received');
        try {
          const backupFile = await syncNow();
          response = { success: true, data: backupFile };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'DRIVE_SYNC_STATUS': {
        console.log('[ServiceWorker] DRIVE_SYNC_STATUS received');
        try {
          const status = await getSyncStatus();
          const settings = await getSyncSettings();
          response = { success: true, data: { status, settings } };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'DRIVE_GET_BACKUPS': {
        console.log('[ServiceWorker] DRIVE_GET_BACKUPS received');
        try {
          const backups = await listBackups();
          response = { success: true, data: backups };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'DRIVE_RESTORE_BACKUP': {
        console.log('[ServiceWorker] DRIVE_RESTORE_BACKUP received');
        try {
          const fileId = (message.data as { fileId: string }).fileId;
          await restoreBackup(fileId);
          response = { success: true };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      case 'DRIVE_DELETE_BACKUP': {
        console.log('[ServiceWorker] DRIVE_DELETE_BACKUP received');
        try {
          const fileId = (message.data as { fileId: string }).fileId;
          await deleteBackup(fileId);
          response = { success: true };
        } catch (error) {
          response = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
        break;
      }

      // ==========================================
      // Quick Post Composer (AGI-59)
      // ==========================================

      case 'CREATE_LINKEDIN_POST': {
        console.log('[ServiceWorker] CREATE_LINKEDIN_POST received');
        try {
          const postData = message.data as { content: string; visibility?: string };

          // Get auth cookies
          const cookies = await getLinkedInCookies();
          if (!cookies.isAuthenticated) {
            response = { success: false, error: 'Not authenticated to LinkedIn. Please log in first.' };
            break;
          }

          // Create post using LinkedIn Voyager API
          const csrfToken = cookies.csrfToken?.replace(/"/g, '') || '';

          const postPayload = {
            visibleToGuest: postData.visibility === 'PUBLIC',
            externalAudienceProviders: [],
            commentaryV2: {
              text: postData.content,
              attributes: [],
            },
            origin: 'FEED',
            allowedCommentersScope: 'ALL',
            postState: 'PUBLISHED',
          };

          const postResponse = await fetch('https://www.linkedin.com/voyager/api/contentcreation/normShares', {
            method: 'POST',
            headers: {
              'accept': 'application/vnd.linkedin.normalized+json+2.1',
              'accept-language': 'en-US,en;q=0.9',
              'content-type': 'application/json; charset=UTF-8',
              'csrf-token': csrfToken,
              'x-li-lang': 'en_US',
              'x-li-page-instance': 'urn:li:page:feed_index_logged_in;' + generateUUID(),
              'x-li-track': JSON.stringify({
                clientVersion: '1.13.8960',
                mpVersion: '1.13.8960',
                osName: 'web',
                timezoneOffset: new Date().getTimezoneOffset() / -60,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                deviceFormFactor: 'DESKTOP',
                mpName: 'voyager-web',
              }),
              'x-restli-protocol-version': '2.0.0',
            },
            credentials: 'include',
            body: JSON.stringify(postPayload),
          });

          if (!postResponse.ok) {
            const errorText = await postResponse.text();
            console.error('[ServiceWorker] Post creation failed:', postResponse.status, errorText);
            response = {
              success: false,
              error: `Failed to create post (${postResponse.status}). Try posting from LinkedIn directly.`
            };
            break;
          }

          const result = await postResponse.json();
          console.log('[ServiceWorker] Post created successfully:', result);

          // Save post to history
          const existingPosts = await getFromStorage<unknown[]>('quick_posts_history');
          const posts = existingPosts.data || [];
          posts.unshift({
            id: Date.now().toString(),
            content: postData.content.substring(0, 100),
            timestamp: new Date().toISOString(),
            postId: result.data?.value?.urn || null,
          });
          await saveToStorage('quick_posts_history', posts.slice(0, 50));

          response = {
            success: true,
            data: {
              message: 'Post created successfully!',
              postId: result.data?.value?.urn,
            }
          };
        } catch (error) {
          console.error('[ServiceWorker] Error creating post:', error);
          response = {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create post'
          };
        }
        break;
      }

      default:
        response = { success: false, error: 'Unknown message type' };
    }

    sendResponse(response);
  })();

  return true;
});

// ============================================
// ALARM EVENT HANDLER
// ============================================

chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log(`[ServiceWorker] Alarm triggered: ${alarm.name}`);

  switch (alarm.name) {
    case ALARM_NAMES.DAILY_BACKUP:
    case ALARM_NAMES.WEEKLY_BACKUP:
      await handleScheduledBackup();
      break;

    case ALARM_NAMES.MAINTENANCE:
      await handleMaintenanceAlarm();
      break;

    case ALARM_NAMES.ALERT_CHECK:
      await handleAlertCheck();
      break;

    default:
      console.log(`[ServiceWorker] Unknown alarm: ${alarm.name}`);
  }
});

async function handleScheduledBackup(): Promise<void> {
  console.log('[ServiceWorker] Running scheduled backup...');
  try {
    const backup = await exportFullBackup();
    const size = new Blob([backup]).size;

    // Store backup metadata
    const backupId = `backup-${Date.now()}`;
    await saveToStorage(`backup_${backupId}`, {
      id: backupId,
      timestamp: Date.now(),
      size,
      type: 'scheduled',
      data: backup,
    });

    // Update last backup time
    const schedule = await getBackupSchedule();
    schedule.lastBackup = Date.now();
    await updateBackupSchedule(schedule);

    await showBackupSuccessNotification('scheduled', size);
    console.log(`[ServiceWorker] Scheduled backup completed: ${size} bytes`);
  } catch (error) {
    console.error('[ServiceWorker] Scheduled backup failed:', error);
    await showBackupFailureNotification(error instanceof Error ? error.message : 'Unknown error');
  }
}

async function handleMaintenanceAlarm(): Promise<void> {
  console.log('[ServiceWorker] Running maintenance...');
  try {
    await runMaintenance();
    console.log('[ServiceWorker] Maintenance completed');
  } catch (error) {
    console.error('[ServiceWorker] Maintenance failed:', error);
  }
}

async function handleAlertCheck(): Promise<void> {
  console.log('[ServiceWorker] Checking alerts...');
  try {
    const alerts = await getAlertConfigs();
    const triggered = await checkAlerts(alerts);

    if (triggered.length > 0) {
      console.log(`[ServiceWorker] ${triggered.length} alerts triggered`);

      // Get current values for triggered alerts
      const summary = await getTrendSummary(7);
      const alertsWithValues = triggered.map((alert) => {
        const typeKey = alert.type as keyof typeof summary;
        const stats = summary[typeKey] || { current: 0, changePercent: 0 };
        return {
          alert,
          currentValue: stats.current,
          changePercent: stats.changePercent,
        };
      });

      // Show notifications
      await showMultipleGrowthAlerts(alertsWithValues);

      // Mark alerts as triggered
      for (const alert of triggered) {
        await markAlertTriggered(alert.id);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Alert check failed:', error);
  }
}

// ============================================
// EXTENSION LIFECYCLE
// ============================================

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[ServiceWorker] Extension installed:', details.reason);

  // Initialize IndexedDB
  try {
    await initHistoryManager();
    console.log('[ServiceWorker] IndexedDB initialized');
  } catch (error) {
    console.error('[ServiceWorker] Failed to initialize IndexedDB:', error);
  }

  // Initialize alarms
  try {
    await initializeAlarms();
    console.log('[ServiceWorker] Alarms initialized');
  } catch (error) {
    console.error('[ServiceWorker] Failed to initialize alarms:', error);
  }

  // Setup notification listeners
  setupNotificationListeners();

  saveToStorage(STORAGE_KEYS.SETTINGS, {
    autoCapture: true,
    captureProfiles: true,
    captureAnalytics: true,
    captureConnections: true,
    maxStoredApis: 1000,
  });
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('[ServiceWorker] Browser started');

  // Initialize IndexedDB on browser startup
  try {
    await initHistoryManager();
    console.log('[ServiceWorker] IndexedDB initialized on startup');

    // Run daily maintenance (prune old data)
    await runMaintenance();
  } catch (error) {
    console.error('[ServiceWorker] Startup initialization error:', error);
  }

  // Initialize alarms on browser startup
  try {
    await initializeAlarms();
    console.log('[ServiceWorker] Alarms initialized on startup');
  } catch (error) {
    console.error('[ServiceWorker] Alarms initialization error:', error);
  }

  // Setup notification listeners
  setupNotificationListeners();
});

// Initialize when service worker loads
(async () => {
  try {
    await initHistoryManager();
    console.log('[ServiceWorker] IndexedDB ready');

    await initializeAlarms();
    console.log('[ServiceWorker] Alarms ready');

    setupNotificationListeners();
    console.log('[ServiceWorker] Notifications ready');

    // Initialize Supabase sync bridge
    await initSyncBridge();
    console.log('[ServiceWorker] Supabase sync bridge ready');

    // Start periodic sync (every 5 minutes)
    startPeriodicSync(5);
    console.log('[ServiceWorker] Periodic sync started');
  } catch (error) {
    console.error('[ServiceWorker] Initialization error:', error);
  }
})();

console.log('[ServiceWorker] LinkedIn Data Extractor service worker loaded (TypeScript v4.0)');
