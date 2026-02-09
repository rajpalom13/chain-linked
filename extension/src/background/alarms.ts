/**
 * Chrome Alarms Management for LinkedIn Data Extractor
 * Handles scheduled backups, maintenance, and alert checking
 */

import type { BackupSchedule, AlertConfig } from '../shared/types';

// Alarm names
export const ALARM_NAMES = {
  DAILY_BACKUP: 'linkedin-daily-backup',
  WEEKLY_BACKUP: 'linkedin-weekly-backup',
  MAINTENANCE: 'linkedin-maintenance',
  ALERT_CHECK: 'linkedin-alert-check',
  BACKGROUND_SYNC: 'linkedin-background-sync',
} as const;

type AlarmName = typeof ALARM_NAMES[keyof typeof ALARM_NAMES];

// Default schedules
const DEFAULT_BACKUP_SCHEDULE: BackupSchedule = {
  enabled: false,
  frequency: 'daily',
  time: '03:00', // 3 AM local time
};

// ==========================================
// ALARM CREATION & MANAGEMENT
// ==========================================

/**
 * Initialize all alarms
 */
export async function initializeAlarms(): Promise<void> {
  console.log('[Alarms] Initializing alarms...');

  // Set up maintenance alarm (runs daily at 4 AM)
  await createAlarm(ALARM_NAMES.MAINTENANCE, {
    periodInMinutes: 24 * 60, // Daily
    delayInMinutes: getMinutesUntilTime('04:00'),
  });

  // Set up alert checking alarm (runs every hour)
  await createAlarm(ALARM_NAMES.ALERT_CHECK, {
    periodInMinutes: 60, // Hourly
  });

  // Load backup schedule and set up backup alarm
  const schedule = await getBackupSchedule();
  if (schedule.enabled) {
    await scheduleBackup(schedule);
  }

  console.log('[Alarms] Alarms initialized');
}

/**
 * Create or update an alarm
 */
async function createAlarm(
  name: AlarmName,
  options: chrome.alarms.AlarmCreateInfo
): Promise<void> {
  // Clear existing alarm first
  await chrome.alarms.clear(name);

  // Create new alarm
  chrome.alarms.create(name, options);
  console.log(`[Alarms] Created alarm: ${name}`, options);
}

/**
 * Get minutes until a specific time today or tomorrow
 */
function getMinutesUntilTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);

  // If time has passed today, schedule for tomorrow
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  return Math.round((target.getTime() - now.getTime()) / (1000 * 60));
}

/**
 * Get day offset for weekly backup
 */
function getDaysUntilWeekday(targetDay: number): number {
  const today = new Date().getDay();
  let daysUntil = targetDay - today;
  if (daysUntil <= 0) {
    daysUntil += 7;
  }
  return daysUntil;
}

// ==========================================
// BACKUP SCHEDULING
// ==========================================

/**
 * Schedule backup based on settings
 */
export async function scheduleBackup(schedule: BackupSchedule): Promise<void> {
  if (!schedule.enabled) {
    // Clear backup alarms
    await chrome.alarms.clear(ALARM_NAMES.DAILY_BACKUP);
    await chrome.alarms.clear(ALARM_NAMES.WEEKLY_BACKUP);
    console.log('[Alarms] Backup alarms cleared');
    return;
  }

  const minutesUntilTime = getMinutesUntilTime(schedule.time);

  if (schedule.frequency === 'daily') {
    await chrome.alarms.clear(ALARM_NAMES.WEEKLY_BACKUP);
    await createAlarm(ALARM_NAMES.DAILY_BACKUP, {
      periodInMinutes: 24 * 60,
      delayInMinutes: minutesUntilTime,
    });
    console.log(`[Alarms] Daily backup scheduled for ${schedule.time}`);
  } else if (schedule.frequency === 'weekly') {
    await chrome.alarms.clear(ALARM_NAMES.DAILY_BACKUP);
    const daysUntil = getDaysUntilWeekday(schedule.dayOfWeek || 0);
    const totalMinutes = (daysUntil * 24 * 60) + minutesUntilTime;
    await createAlarm(ALARM_NAMES.WEEKLY_BACKUP, {
      periodInMinutes: 7 * 24 * 60, // Weekly
      delayInMinutes: totalMinutes,
    });
    console.log(`[Alarms] Weekly backup scheduled for day ${schedule.dayOfWeek} at ${schedule.time}`);
  }

  // Save schedule
  await saveBackupSchedule(schedule);
}

/**
 * Get current backup schedule
 */
export async function getBackupSchedule(): Promise<BackupSchedule> {
  const result = await chrome.storage.local.get('backup_schedule');
  return result.backup_schedule || DEFAULT_BACKUP_SCHEDULE;
}

/**
 * Save backup schedule
 */
async function saveBackupSchedule(schedule: BackupSchedule): Promise<void> {
  await chrome.storage.local.set({ backup_schedule: schedule });
}

/**
 * Update backup schedule and reschedule
 */
export async function updateBackupSchedule(schedule: BackupSchedule): Promise<void> {
  await saveBackupSchedule(schedule);
  await scheduleBackup(schedule);
}

// ==========================================
// ALERT MANAGEMENT
// ==========================================

/**
 * Get current alert configurations
 */
export async function getAlertConfigs(): Promise<AlertConfig[]> {
  const result = await chrome.storage.local.get('alert_configs');
  return result.alert_configs || [];
}

/**
 * Save alert configurations
 */
export async function saveAlertConfigs(configs: AlertConfig[]): Promise<void> {
  await chrome.storage.local.set({ alert_configs: configs });
}

/**
 * Add or update an alert configuration
 */
export async function upsertAlertConfig(config: AlertConfig): Promise<void> {
  const configs = await getAlertConfigs();
  const existingIndex = configs.findIndex((c) => c.id === config.id);

  if (existingIndex >= 0) {
    configs[existingIndex] = config;
  } else {
    configs.push(config);
  }

  await saveAlertConfigs(configs);
}

/**
 * Delete an alert configuration
 */
export async function deleteAlertConfig(id: string): Promise<void> {
  const configs = await getAlertConfigs();
  const filtered = configs.filter((c) => c.id !== id);
  await saveAlertConfigs(filtered);
}

/**
 * Mark an alert as triggered
 */
export async function markAlertTriggered(id: string): Promise<void> {
  const configs = await getAlertConfigs();
  const config = configs.find((c) => c.id === id);
  if (config) {
    config.lastTriggered = Date.now();
    await saveAlertConfigs(configs);
  }
}

// ==========================================
// ALARM LIST UTILITIES
// ==========================================

/**
 * Get all active alarms
 */
export async function getAllAlarms(): Promise<chrome.alarms.Alarm[]> {
  return chrome.alarms.getAll();
}

/**
 * Clear all extension alarms
 */
export async function clearAllAlarms(): Promise<void> {
  await chrome.alarms.clearAll();
  console.log('[Alarms] All alarms cleared');
}

/**
 * Check if a specific alarm is active
 */
export async function isAlarmActive(name: AlarmName): Promise<boolean> {
  const alarm = await chrome.alarms.get(name);
  return !!alarm;
}

/**
 * Get info about next scheduled alarm
 */
export async function getNextAlarmInfo(name: AlarmName): Promise<{
  exists: boolean;
  scheduledTime?: Date;
  periodInMinutes?: number;
}> {
  const alarm = await chrome.alarms.get(name);
  if (!alarm) {
    return { exists: false };
  }

  return {
    exists: true,
    scheduledTime: new Date(alarm.scheduledTime),
    periodInMinutes: alarm.periodInMinutes,
  };
}
