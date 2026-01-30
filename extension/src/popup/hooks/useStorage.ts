import { useState, useEffect, useCallback } from 'react';

interface StorageResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to get data from chrome.storage.local
 */
export function useStorage<T>(key: string): StorageResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await chrome.storage.local.get(key);
      setData(result[key] || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for storage changes
  useEffect(() => {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[key]) {
        setData(changes[key].newValue || null);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [key]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook to send messages to service worker
 */
export function useMessage<TRequest, TResponse>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (message: TRequest): Promise<TResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await chrome.runtime.sendMessage(message);
      if (response?.success === false) {
        setError(response.error || 'Request failed');
        return null;
      }
      return response?.data || response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { sendMessage, loading, error };
}

/**
 * Hook for extension settings
 */
export function useSettings() {
  const { data: settings, loading, error, refetch } = useStorage<{
    autoCapture: boolean;
    captureProfiles: boolean;
    captureAnalytics: boolean;
    captureConnections: boolean;
  }>('extension_settings');

  const updateSettings = useCallback(async (newSettings: Partial<typeof settings>) => {
    if (!settings) return;
    const updated = { ...settings, ...newSettings };
    await chrome.storage.local.set({ extension_settings: updated });
  }, [settings]);

  return {
    settings: settings || {
      autoCapture: true,
      captureProfiles: true,
      captureAnalytics: true,
      captureConnections: true,
    },
    loading,
    error,
    updateSettings,
    refetch,
  };
}

/**
 * Hook for notification settings
 */
export function useNotificationSettings() {
  const { sendMessage, loading } = useMessage();
  const [settings, setSettings] = useState<{
    captureNotifications: boolean;
    backupNotifications: boolean;
    growthAlerts: boolean;
    silentMode: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  } | null>(null);

  const fetchSettings = useCallback(async () => {
    const response = await sendMessage({ type: 'GET_NOTIFICATION_SETTINGS' });
    if (response) {
      setSettings(response);
    }
  }, [sendMessage]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (newSettings: Partial<typeof settings>) => {
    if (!settings) return;
    const updated = { ...settings, ...newSettings };
    await sendMessage({ type: 'SAVE_NOTIFICATION_SETTINGS', data: updated });
    setSettings(updated);
  }, [settings, sendMessage]);

  return { settings, loading, updateSettings, refetch: fetchSettings };
}

/**
 * Hook for backup schedule
 */
export function useBackupSchedule() {
  const { sendMessage, loading } = useMessage();
  const [schedule, setSchedule] = useState<{
    enabled: boolean;
    frequency: 'daily' | 'weekly';
    dayOfWeek?: number;
    time: string;
    lastBackup?: number;
  } | null>(null);

  const fetchSchedule = useCallback(async () => {
    const response = await sendMessage({ type: 'GET_BACKUP_SCHEDULE' });
    if (response) {
      setSchedule(response);
    }
  }, [sendMessage]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const updateSchedule = useCallback(async (newSchedule: Partial<typeof schedule>) => {
    if (!schedule) return;
    const updated = { ...schedule, ...newSchedule };
    await sendMessage({ type: 'UPDATE_BACKUP_SCHEDULE', data: updated });
    setSchedule(updated);
  }, [schedule, sendMessage]);

  const triggerBackup = useCallback(async () => {
    return sendMessage({ type: 'TRIGGER_MANUAL_BACKUP' });
  }, [sendMessage]);

  return { schedule, loading, updateSchedule, triggerBackup, refetch: fetchSchedule };
}
