// LinkedIn Data Extractor - Storage Utilities

import type { StorageKey, ExtensionSettings, CaptureLog, TrendDataPoint } from './types';

/**
 * Get data from chrome.storage.local
 */
export async function getStorageData<T>(key: StorageKey): Promise<T | null> {
  try {
    const result = await chrome.storage.local.get(key);
    return result[key] ?? null;
  } catch (error) {
    console.error(`[Storage] Error getting ${key}:`, error);
    return null;
  }
}

/**
 * Save data to chrome.storage.local
 */
export async function setStorageData<T>(key: StorageKey, data: T): Promise<boolean> {
  try {
    await chrome.storage.local.set({ [key]: data });
    return true;
  } catch (error) {
    console.error(`[Storage] Error saving ${key}:`, error);
    return false;
  }
}

/**
 * Remove data from chrome.storage.local
 */
export async function removeStorageData(key: StorageKey): Promise<boolean> {
  try {
    await chrome.storage.local.remove(key);
    return true;
  } catch (error) {
    console.error(`[Storage] Error removing ${key}:`, error);
    return false;
  }
}

/**
 * Get all stored data
 */
export async function getAllStorageData(): Promise<Record<string, unknown>> {
  try {
    return await chrome.storage.local.get(null);
  } catch (error) {
    console.error('[Storage] Error getting all data:', error);
    return {};
  }
}

/**
 * Clear all stored data
 */
export async function clearAllStorageData(): Promise<boolean> {
  try {
    await chrome.storage.local.clear();
    return true;
  } catch (error) {
    console.error('[Storage] Error clearing data:', error);
    return false;
  }
}

/**
 * Get extension settings with defaults
 */
export async function getSettings(): Promise<ExtensionSettings> {
  const settings = await getStorageData<ExtensionSettings>('extension_settings');
  return {
    autoCapture: settings?.autoCapture ?? true,
    storeImages: settings?.storeImages ?? true,
    captureNotifications: settings?.captureNotifications ?? false,
    growthAlerts: settings?.growthAlerts ?? false,
  };
}

/**
 * Save extension settings
 */
export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<boolean> {
  const currentSettings = await getSettings();
  return setStorageData('extension_settings', { ...currentSettings, ...settings });
}

/**
 * Add entry to capture log
 */
export async function addCaptureLog(entry: Omit<CaptureLog, 'id'>): Promise<boolean> {
  try {
    const logs = await getStorageData<CaptureLog[]>('capture_log') || [];
    const newEntry: CaptureLog = {
      ...entry,
      id: `capture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    // Keep last 1000 entries
    const updatedLogs = [newEntry, ...logs].slice(0, 1000);
    return setStorageData('capture_log', updatedLogs);
  } catch (error) {
    console.error('[Storage] Error adding capture log:', error);
    return false;
  }
}

/**
 * Get capture logs with optional filtering
 */
export async function getCaptureLogs(options?: {
  limit?: number;
  type?: string;
  since?: number;
}): Promise<CaptureLog[]> {
  let logs = await getStorageData<CaptureLog[]>('capture_log') || [];

  if (options?.type) {
    logs = logs.filter(log => log.type === options.type);
  }

  if (options?.since) {
    logs = logs.filter(log => log.timestamp >= options.since);
  }

  if (options?.limit) {
    logs = logs.slice(0, options.limit);
  }

  return logs;
}

/**
 * Calculate storage usage
 */
export async function getStorageUsage(): Promise<{
  bytesUsed: number;
  bytesTotal: number;
  percentUsed: number;
}> {
  try {
    const bytesUsed = await chrome.storage.local.getBytesInUse(null);
    const bytesTotal = chrome.storage.local.QUOTA_BYTES;
    return {
      bytesUsed,
      bytesTotal,
      percentUsed: (bytesUsed / bytesTotal) * 100,
    };
  } catch (error) {
    console.error('[Storage] Error getting storage usage:', error);
    return { bytesUsed: 0, bytesTotal: 0, percentUsed: 0 };
  }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate unique ID
 */
export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
