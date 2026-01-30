/**
 * History Manager for LinkedIn Data Extractor
 * Manages trend data collection, aggregation, and export
 */

import type { TrendDataPoint, CreatorAnalytics, ProfileData, CaptureLog, AlertConfig, TrendType } from './types';
import {
  addTrendData,
  addCaptureLog,
  getAllTrends,
  getTrendsByDateRange,
  getTrendsByType,
  getRecentCaptureLogs,
  runDailyMaintenance,
  exportAllData,
  getDBStats,
  initDB,
} from './indexeddb';

// ==========================================
// TREND DATA COLLECTION
// ==========================================

/**
 * Record analytics data as trend points
 */
export async function recordAnalyticsTrends(analytics: CreatorAnalytics): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const source = 'creator-analytics';

  const trendsToAdd: Omit<TrendDataPoint, 'id'>[] = [];

  // Record impressions if available (check both property names)
  const impressionsValue = analytics.impressions_last_7_days ?? analytics.impressions;
  if (impressionsValue !== undefined && impressionsValue > 0) {
    trendsToAdd.push({
      date: today,
      type: 'impressions',
      value: impressionsValue,
      source,
      capturedAt: Date.now(),
    });
  }

  // Record followers if available (check both property names)
  const followersValue = analytics.followers_count ?? (analytics as Record<string, unknown>).membersReached as number;
  if (followersValue !== undefined && followersValue > 0) {
    trendsToAdd.push({
      date: today,
      type: 'followers',
      value: followersValue,
      source,
      capturedAt: Date.now(),
    });
  }

  // Record engagements if available (check both property names)
  const engagementsValue = analytics.engagements_last_7_days ?? (analytics as Record<string, unknown>).engagementRate as number;
  if (engagementsValue !== undefined && engagementsValue > 0) {
    trendsToAdd.push({
      date: today,
      type: 'engagements',
      value: engagementsValue,
      source,
      capturedAt: Date.now(),
    });
  }

  // Add all trends
  for (const trend of trendsToAdd) {
    await addTrendData(trend);
  }

  console.log(`[HistoryManager] Recorded ${trendsToAdd.length} trend data points for impressions=${impressionsValue}, followers=${followersValue}`);
}

/**
 * Record profile data as trend points
 */
export async function recordProfileTrends(profile: ProfileData): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const source = 'profile-data';

  const trendsToAdd: Omit<TrendDataPoint, 'id'>[] = [];

  // Record followers from profile if available
  if (profile.followers_count !== undefined) {
    trendsToAdd.push({
      date: today,
      type: 'followers',
      value: profile.followers_count,
      source,
    });
  }

  // Add all trends
  for (const trend of trendsToAdd) {
    await addTrendData(trend);
  }

  if (trendsToAdd.length > 0) {
    console.log(`[HistoryManager] Recorded ${trendsToAdd.length} profile trend data points`);
  }
}

/**
 * Log a capture event
 */
export async function logCapture(
  type: string,
  dataSize: number,
  success: boolean
): Promise<void> {
  const log: CaptureLog = {
    id: `capture-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    type,
    dataSize,
    success,
  };

  await addCaptureLog(log);
  console.log(`[HistoryManager] Logged capture: ${type}, success: ${success}`);
}

// ==========================================
// TREND DATA RETRIEVAL
// ==========================================

/**
 * Get trend data for display in charts
 */
export async function getTrendDataForCharts(days: number = 30): Promise<{
  impressions: { date: string; value: number }[];
  followers: { date: string; value: number }[];
  engagements: { date: string; value: number }[];
}> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const trends = await getTrendsByDateRange(startDate, endDate);

  // Aggregate by date and type (keep latest value per day)
  const aggregated: Map<string, Map<TrendDataPoint['type'], number>> = new Map();

  for (const trend of trends) {
    if (!aggregated.has(trend.date)) {
      aggregated.set(trend.date, new Map());
    }
    aggregated.get(trend.date)!.set(trend.type, trend.value);
  }

  // Convert to arrays for charting
  const dates = Array.from(aggregated.keys()).sort();

  const impressions: { date: string; value: number }[] = [];
  const followers: { date: string; value: number }[] = [];
  const engagements: { date: string; value: number }[] = [];

  for (const date of dates) {
    const dayData = aggregated.get(date)!;

    if (dayData.has('impressions')) {
      impressions.push({ date, value: dayData.get('impressions')! });
    }
    if (dayData.has('followers')) {
      followers.push({ date, value: dayData.get('followers')! });
    }
    if (dayData.has('engagements')) {
      engagements.push({ date, value: dayData.get('engagements')! });
    }
  }

  return { impressions, followers, engagements };
}

/**
 * Get summary statistics for trends
 */
export async function getTrendSummary(days: number = 7): Promise<{
  impressions: { current: number; previous: number; change: number; changePercent: number };
  followers: { current: number; previous: number; change: number; changePercent: number };
  engagements: { current: number; previous: number; change: number; changePercent: number };
}> {
  const now = new Date();
  const currentEndDate = now.toISOString().split('T')[0];
  const currentStartDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const previousStartDate = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const currentTrends = await getTrendsByDateRange(currentStartDate, currentEndDate);
  const previousTrends = await getTrendsByDateRange(previousStartDate, currentStartDate);

  const calculateStats = (current: TrendDataPoint[], previous: TrendDataPoint[], type: TrendDataPoint['type']) => {
    const currentFiltered = current.filter(t => t.type === type);
    const previousFiltered = previous.filter(t => t.type === type);

    const currentValue = currentFiltered.length > 0
      ? currentFiltered[currentFiltered.length - 1].value
      : 0;
    const previousValue = previousFiltered.length > 0
      ? previousFiltered[previousFiltered.length - 1].value
      : 0;

    const change = currentValue - previousValue;
    const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;

    return { current: currentValue, previous: previousValue, change, changePercent };
  };

  return {
    impressions: calculateStats(currentTrends, previousTrends, 'impressions'),
    followers: calculateStats(currentTrends, previousTrends, 'followers'),
    engagements: calculateStats(currentTrends, previousTrends, 'engagements'),
  };
}

// ==========================================
// EXPORT FUNCTIONS
// ==========================================

/**
 * Export trend data as CSV
 */
export async function exportTrendsAsCSV(days: number = 90): Promise<string> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const trends = await getTrendsByDateRange(startDate, endDate);

  // Sort by date then type
  trends.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.type.localeCompare(b.type);
  });

  const headers = ['Date', 'Type', 'Value', 'Source'];
  const rows = trends.map(t => [t.date, t.type, t.value.toString(), t.source]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  return csv;
}

/**
 * Export trend data as JSON
 */
export async function exportTrendsAsJSON(days: number = 90): Promise<string> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const trends = await getTrendsByDateRange(startDate, endDate);

  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    dateRange: { startDate, endDate },
    trendsCount: trends.length,
    trends,
  }, null, 2);
}

/**
 * Export capture logs as CSV
 */
export async function exportCaptureLogsAsCSV(limit: number = 100): Promise<string> {
  const logs = await getRecentCaptureLogs(limit);

  const headers = ['ID', 'Timestamp', 'Date', 'Type', 'Data Size', 'Success'];
  const rows = logs.map(log => [
    log.id,
    log.timestamp.toString(),
    new Date(log.timestamp).toISOString(),
    log.type,
    log.dataSize.toString(),
    log.success.toString(),
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  return csv;
}

/**
 * Export all data for backup
 */
export async function exportFullBackup(): Promise<string> {
  const data = await exportAllData();
  return JSON.stringify(data, null, 2);
}

// ==========================================
// INITIALIZATION & MAINTENANCE
// ==========================================

/**
 * Initialize the history manager
 */
export async function initHistoryManager(): Promise<void> {
  await initDB();
  console.log('[HistoryManager] Initialized');
}

/**
 * Run maintenance tasks
 */
export async function runMaintenance(): Promise<void> {
  const result = await runDailyMaintenance();
  console.log(`[HistoryManager] Maintenance: deleted ${result.trendsDeleted} old trends, ${result.capturesDeleted} old capture logs`);
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  trendsCount: number;
  capturesCount: number;
  backupsCount: number;
}> {
  return getDBStats();
}

// ==========================================
// ALERT CHECKING
// ==========================================

/**
 * Check if any alerts should be triggered
 * Supports alert types: impressions, followers, engagements
 */
export async function checkAlerts(alerts: AlertConfig[]): Promise<AlertConfig[]> {
  const summary = await getTrendSummary(7);
  const triggered: AlertConfig[] = [];

  // Map TrendType to summary keys
  const typeToKey: Record<string, keyof typeof summary> = {
    impressions: 'impressions',
    followers: 'followers',
    engagements: 'engagements',
  };

  for (const alert of alerts) {
    if (!alert.enabled) continue;

    const summaryKey = typeToKey[alert.type];
    if (!summaryKey) continue; // Skip unsupported types like profile_views, connections

    const stats = summary[summaryKey];
    let shouldTrigger = false;

    switch (alert.condition) {
      case 'above':
        shouldTrigger = stats.current > alert.threshold;
        break;
      case 'below':
        shouldTrigger = stats.current < alert.threshold;
        break;
      case 'change_percent':
        shouldTrigger = Math.abs(stats.changePercent) > alert.threshold;
        break;
    }

    if (shouldTrigger) {
      // Check if already triggered recently (within 24 hours)
      if (!alert.lastTriggered || Date.now() - alert.lastTriggered > 24 * 60 * 60 * 1000) {
        triggered.push(alert);
      }
    }
  }

  return triggered;
}
