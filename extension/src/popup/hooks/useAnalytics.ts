import { useState, useEffect, useCallback } from 'react';
import { useMessage } from './useStorage';

interface TrendData {
  impressions: { date: string; value: number }[];
  followers: { date: string; value: number }[];
  engagements: { date: string; value: number }[];
}

interface TrendSummary {
  impressions: { current: number; previous: number; change: number; changePercent: number };
  followers: { current: number; previous: number; change: number; changePercent: number };
  engagements: { current: number; previous: number; change: number; changePercent: number };
}

interface StorageStats {
  trendsCount: number;
  capturesCount: number;
  backupsCount: number;
}

/**
 * Hook for trend data for charts
 */
export function useTrendData(days: number = 30) {
  const { sendMessage, loading, error } = useMessage();
  const [data, setData] = useState<TrendData | null>(null);

  const fetchData = useCallback(async () => {
    const response = await sendMessage({ type: 'GET_TREND_DATA', data: { days } });
    if (response) {
      setData(response as TrendData);
    }
  }, [sendMessage, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for trend summary statistics
 */
export function useTrendSummary(days: number = 7) {
  const { sendMessage, loading, error } = useMessage();
  const [summary, setSummary] = useState<TrendSummary | null>(null);

  const fetchSummary = useCallback(async () => {
    const response = await sendMessage({ type: 'GET_TREND_SUMMARY', data: { days } });
    if (response) {
      setSummary(response as TrendSummary);
    }
  }, [sendMessage, days]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, error, refetch: fetchSummary };
}

/**
 * Hook for storage statistics
 */
export function useStorageStats() {
  const { sendMessage, loading, error } = useMessage();
  const [stats, setStats] = useState<StorageStats | null>(null);

  const fetchStats = useCallback(async () => {
    const response = await sendMessage({ type: 'GET_STORAGE_STATS' });
    if (response) {
      setStats(response as StorageStats);
    }
  }, [sendMessage]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

/**
 * Hook for capture statistics
 */
export function useCaptureStats() {
  const { sendMessage, loading, error } = useMessage();
  const [stats, setStats] = useState<{
    totalCaptures: number;
    successfulCaptures: number;
    failedCaptures: number;
    lastCapture: {
      type: string;
      success: boolean;
      timestamp: string;
    } | null;
    captureHistory: Array<{
      type: string;
      success: boolean;
      timestamp: string;
    }>;
  } | null>(null);

  const fetchStats = useCallback(async () => {
    const response = await sendMessage({ type: 'GET_CAPTURE_STATS' });
    if (response) {
      setStats(response as typeof stats);
    }
  }, [sendMessage]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

/**
 * Hook for creator analytics data
 */
export function useCreatorAnalytics() {
  const { sendMessage, loading, error } = useMessage();
  const [analytics, setAnalytics] = useState<{
    impressions: number;
    membersReached: number;
    topPosts: Array<{
      title: string;
      impressions: number;
      reactions?: number;
      comments?: number;
    }>;
    period: string;
    source?: string;
    lastUpdated?: string;
  } | null>(null);

  const fetchAnalytics = useCallback(async () => {
    const response = await sendMessage({ type: 'GET_DATA', key: 'linkedin_analytics' });
    if (response) {
      setAnalytics(response as typeof analytics);
    }
  }, [sendMessage]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { analytics, loading, error, refetch: fetchAnalytics };
}

/**
 * Hook for audience data
 */
export function useAudienceData() {
  const { sendMessage, loading, error } = useMessage();
  const [audience, setAudience] = useState<{
    totalFollowers: number;
    newFollowers?: number;
    growthRate?: number;
    lastUpdated?: string;
  } | null>(null);

  const fetchAudience = useCallback(async () => {
    const response = await sendMessage({ type: 'GET_DATA', key: 'linkedin_audience' });
    if (response) {
      setAudience(response as typeof audience);
    }
  }, [sendMessage]);

  useEffect(() => {
    fetchAudience();
  }, [fetchAudience]);

  return { audience, loading, error, refetch: fetchAudience };
}

/**
 * Hook for exporting data
 */
export function useExport() {
  const { sendMessage, loading, error } = useMessage();

  const exportTrendsCSV = useCallback(async (days: number = 90) => {
    const response = await sendMessage({ type: 'EXPORT_TRENDS_CSV', data: { days } }) as { content: string; filename: string } | null;
    if (response?.content) {
      downloadFile(response.content, response.filename, 'text/csv');
    }
    return response;
  }, [sendMessage]);

  const exportTrendsJSON = useCallback(async (days: number = 90) => {
    const response = await sendMessage({ type: 'EXPORT_TRENDS_JSON', data: { days } }) as { content: string; filename: string } | null;
    if (response?.content) {
      downloadFile(response.content, response.filename, 'application/json');
    }
    return response;
  }, [sendMessage]);

  const exportFullBackup = useCallback(async () => {
    const response = await sendMessage({ type: 'EXPORT_FULL_BACKUP' }) as { content: string; filename: string } | null;
    if (response?.content) {
      downloadFile(response.content, response.filename, 'application/json');
    }
    return response;
  }, [sendMessage]);

  const exportAllJSON = useCallback(async () => {
    const response = await sendMessage({ type: 'EXPORT_JSON' }) as { content: string; filename: string } | null;
    if (response?.content) {
      downloadFile(response.content, response.filename, 'application/json');
    }
    return response;
  }, [sendMessage]);

  return {
    exportTrendsCSV,
    exportTrendsJSON,
    exportFullBackup,
    exportAllJSON,
    loading,
    error,
  };
}

/**
 * Helper to download a file
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
