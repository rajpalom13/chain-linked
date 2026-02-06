/**
 * Chrome Notifications for LinkedIn Data Extractor
 * Handles capture notifications, alerts, and backup notifications
 */

import type { TrendType, AlertConfig } from '../shared/types';

// Notification IDs
export const NOTIFICATION_IDS = {
  CAPTURE_SUCCESS: 'linkedin-capture-success',
  CAPTURE_FAILURE: 'linkedin-capture-failure',
  BACKUP_SUCCESS: 'linkedin-backup-success',
  BACKUP_FAILURE: 'linkedin-backup-failure',
  GROWTH_ALERT: 'linkedin-growth-alert',
  MAINTENANCE: 'linkedin-maintenance',
} as const;

// Icon paths - use chrome.runtime.getURL for proper extension URLs
const getIconUrl = (path: string): string => {
  return chrome.runtime.getURL(path);
};

const ICONS = {
  get SUCCESS() { return getIconUrl('icons/icon128.png'); },
  get WARNING() { return getIconUrl('icons/icon128.png'); },
  get ERROR() { return getIconUrl('icons/icon128.png'); },
  get INFO() { return getIconUrl('icons/icon128.png'); },
};

// Notification settings storage key
const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

// ==========================================
// NOTIFICATION SETTINGS
// ==========================================

export interface NotificationSettings {
  captureNotifications: boolean;
  backupNotifications: boolean;
  growthAlerts: boolean;
  silentMode: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm
  quietHoursEnd: string;   // HH:mm
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  captureNotifications: true,
  backupNotifications: true,
  growthAlerts: true,
  silentMode: false,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

/**
 * Get notification settings
 */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const result = await chrome.storage.local.get(NOTIFICATION_SETTINGS_KEY);
  return { ...DEFAULT_NOTIFICATION_SETTINGS, ...result[NOTIFICATION_SETTINGS_KEY] };
}

/**
 * Save notification settings
 */
export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  await chrome.storage.local.set({ [NOTIFICATION_SETTINGS_KEY]: settings });
}

/**
 * Check if currently in quiet hours
 */
function isInQuietHours(settings: NotificationSettings): boolean {
  if (!settings.quietHoursEnabled) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = settings.quietHoursStart.split(':').map(Number);
  const [endHour, endMin] = settings.quietHoursEnd.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Check if notifications should be shown
 */
async function shouldShowNotification(type: keyof NotificationSettings): Promise<boolean> {
  const settings = await getNotificationSettings();

  if (settings.silentMode) return false;
  if (isInQuietHours(settings)) return false;

  return settings[type] as boolean;
}

// ==========================================
// NOTIFICATION CREATION
// ==========================================

/**
 * Create a basic notification
 */
async function createNotification(
  id: string,
  options: chrome.notifications.NotificationOptions<true>
): Promise<string> {
  return new Promise((resolve) => {
    chrome.notifications.create(id, options, (notificationId) => {
      console.log(`[Notifications] Created: ${notificationId}`);
      resolve(notificationId);
    });
  });
}

/**
 * Clear a notification
 */
export async function clearNotification(id: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.notifications.clear(id, () => {
      resolve();
    });
  });
}

// ==========================================
// CAPTURE NOTIFICATIONS
// ==========================================

/**
 * Show capture success notification
 */
export async function showCaptureNotification(
  captureType: string,
  details?: string
): Promise<void> {
  if (!(await shouldShowNotification('captureNotifications'))) return;

  const typeLabels: Record<string, string> = {
    creator_analytics: 'Creator Analytics',
    post_analytics: 'Post Analytics',
    audience_analytics: 'Audience Analytics',
    audience_demographics: 'Audience Demographics',
    post_demographics: 'Post Demographics',
    profile_views: 'Profile Views',
    profile: 'Profile Data',
  };

  const label = typeLabels[captureType] || captureType;

  await createNotification(NOTIFICATION_IDS.CAPTURE_SUCCESS, {
    type: 'basic',
    iconUrl: ICONS.SUCCESS,
    title: 'Data Captured',
    message: `${label} captured successfully${details ? `: ${details}` : ''}`,
    priority: 0,
  });

  // Auto-clear after 3 seconds
  setTimeout(() => clearNotification(NOTIFICATION_IDS.CAPTURE_SUCCESS), 3000);
}

/**
 * Show capture failure notification
 */
export async function showCaptureFailureNotification(
  captureType: string,
  error: string,
  retryCount?: number
): Promise<void> {
  if (!(await shouldShowNotification('captureNotifications'))) return;

  const typeLabels: Record<string, string> = {
    creator_analytics: 'Creator Analytics',
    post_analytics: 'Post Analytics',
    audience_analytics: 'Audience Analytics',
    audience_demographics: 'Audience Demographics',
    post_demographics: 'Post Demographics',
    profile_views: 'Profile Views',
    profile: 'Profile Data',
    company_analytics: 'Company Analytics',
    content_calendar: 'Content Calendar',
  };

  const label = typeLabels[captureType] || captureType;
  const retryInfo = retryCount ? ` (after ${retryCount} retries)` : '';

  await createNotification(NOTIFICATION_IDS.CAPTURE_FAILURE, {
    type: 'basic',
    iconUrl: ICONS.ERROR,
    title: 'Capture Failed',
    message: `Failed to capture ${label}${retryInfo}: ${error}`,
    priority: 1,
  });

  // Auto-clear after 10 seconds
  setTimeout(() => clearNotification(NOTIFICATION_IDS.CAPTURE_FAILURE), 10000);
}

// ==========================================
// BACKUP NOTIFICATIONS
// ==========================================

/**
 * Show backup success notification
 */
export async function showBackupSuccessNotification(
  backupType: 'scheduled' | 'manual',
  size?: number
): Promise<void> {
  if (!(await shouldShowNotification('backupNotifications'))) return;

  const sizeStr = size ? ` (${formatBytes(size)})` : '';

  await createNotification(NOTIFICATION_IDS.BACKUP_SUCCESS, {
    type: 'basic',
    iconUrl: ICONS.SUCCESS,
    title: 'Backup Complete',
    message: `${backupType === 'scheduled' ? 'Scheduled' : 'Manual'} backup completed${sizeStr}`,
    priority: 0,
  });

  // Auto-clear after 5 seconds
  setTimeout(() => clearNotification(NOTIFICATION_IDS.BACKUP_SUCCESS), 5000);
}

/**
 * Show backup failure notification
 */
export async function showBackupFailureNotification(error: string): Promise<void> {
  if (!(await shouldShowNotification('backupNotifications'))) return;

  await createNotification(NOTIFICATION_IDS.BACKUP_FAILURE, {
    type: 'basic',
    iconUrl: ICONS.ERROR,
    title: 'Backup Failed',
    message: `Could not complete backup: ${error}`,
    priority: 2,
  });
}

// ==========================================
// GROWTH ALERT NOTIFICATIONS
// ==========================================

/**
 * Show growth alert notification
 */
export async function showGrowthAlertNotification(
  alert: AlertConfig,
  currentValue: number,
  changePercent?: number
): Promise<void> {
  if (!(await shouldShowNotification('growthAlerts'))) return;

  const typeLabels: Record<TrendType, string> = {
    impressions: 'Impressions',
    followers: 'Followers',
    engagements: 'Engagements',
    profile_views: 'Profile Views',
    connections: 'Connections',
  };

  const label = typeLabels[alert.type] || alert.type;
  let message: string;

  switch (alert.condition) {
    case 'above':
      message = `${label} reached ${formatNumber(currentValue)} (above ${formatNumber(alert.threshold)} threshold)`;
      break;
    case 'below':
      message = `${label} dropped to ${formatNumber(currentValue)} (below ${formatNumber(alert.threshold)} threshold)`;
      break;
    case 'change_percent':
      message = `${label} changed by ${changePercent?.toFixed(1)}% (threshold: ${alert.threshold}%)`;
      break;
    default:
      message = `${label}: ${formatNumber(currentValue)}`;
  }

  await createNotification(`${NOTIFICATION_IDS.GROWTH_ALERT}-${alert.id}`, {
    type: 'basic',
    iconUrl: ICONS.INFO,
    title: 'Growth Alert',
    message,
    priority: 1,
    requireInteraction: true, // Keep notification visible until user interacts
  });
}

/**
 * Show multiple growth alerts as a list
 */
export async function showMultipleGrowthAlerts(
  alerts: Array<{ alert: AlertConfig; currentValue: number; changePercent?: number }>
): Promise<void> {
  if (!(await shouldShowNotification('growthAlerts'))) return;
  if (alerts.length === 0) return;

  if (alerts.length === 1) {
    const { alert, currentValue, changePercent } = alerts[0];
    await showGrowthAlertNotification(alert, currentValue, changePercent);
    return;
  }

  // For multiple alerts, show a summary
  const items = alerts.map(({ alert }) => ({
    title: alert.type,
    message: `${alert.condition} ${alert.threshold}`,
  }));

  await createNotification(NOTIFICATION_IDS.GROWTH_ALERT, {
    type: 'list',
    iconUrl: ICONS.INFO,
    title: `${alerts.length} Growth Alerts`,
    message: 'Multiple thresholds reached',
    items,
    priority: 1,
    requireInteraction: true,
  });
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format number with commas
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

// ==========================================
// NOTIFICATION CLICK HANDLERS
// ==========================================

/**
 * Handle notification click
 */
export function handleNotificationClick(notificationId: string): void {
  console.log(`[Notifications] Clicked: ${notificationId}`);

  // Clear the notification
  clearNotification(notificationId);

  // Open extension popup or relevant page based on notification type
  if (notificationId.startsWith(NOTIFICATION_IDS.GROWTH_ALERT)) {
    // Could open analytics page
    chrome.action.openPopup();
  } else if (notificationId === NOTIFICATION_IDS.BACKUP_FAILURE) {
    // Could open settings page
    chrome.action.openPopup();
  }
}

/**
 * Setup notification click listener
 */
export function setupNotificationListeners(): void {
  chrome.notifications.onClicked.addListener(handleNotificationClick);

  chrome.notifications.onClosed.addListener((notificationId, byUser) => {
    console.log(`[Notifications] Closed: ${notificationId}, by user: ${byUser}`);
  });
}
