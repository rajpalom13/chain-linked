"use strict";
(() => {
  // src/shared/indexeddb.ts
  var DB_NAME = "linkedin-data-extractor";
  var DB_VERSION = 1;
  var STORES = {
    TRENDS: "trends",
    CAPTURES: "captures",
    BACKUPS: "backups"
  };
  var dbInstance = null;
  async function initDB() {
    if (dbInstance) {
      return dbInstance;
    }
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => {
        console.error("[IndexedDB] Failed to open database:", request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        dbInstance = request.result;
        console.log("[IndexedDB] Database opened successfully");
        resolve(dbInstance);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log("[IndexedDB] Upgrading database...");
        if (!db.objectStoreNames.contains(STORES.TRENDS)) {
          const trendsStore = db.createObjectStore(STORES.TRENDS, { keyPath: "id", autoIncrement: true });
          trendsStore.createIndex("date", "date", { unique: false });
          trendsStore.createIndex("type", "type", { unique: false });
          trendsStore.createIndex("date_type", ["date", "type"], { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.CAPTURES)) {
          const capturesStore = db.createObjectStore(STORES.CAPTURES, { keyPath: "id" });
          capturesStore.createIndex("timestamp", "timestamp", { unique: false });
          capturesStore.createIndex("type", "type", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.BACKUPS)) {
          const backupsStore = db.createObjectStore(STORES.BACKUPS, { keyPath: "id" });
          backupsStore.createIndex("timestamp", "timestamp", { unique: false });
          backupsStore.createIndex("type", "type", { unique: false });
        }
      };
    });
  }
  async function getDB() {
    if (!dbInstance) {
      return initDB();
    }
    return dbInstance;
  }
  async function addRecord(storeName, record) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.add(record);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function getAllRecords(storeName) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function addTrendData(trend) {
    return addRecord(STORES.TRENDS, trend);
  }
  async function getAllTrends() {
    return getAllRecords(STORES.TRENDS);
  }
  async function getTrendsByDateRange(startDate, endDate) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TRENDS, "readonly");
      const store = transaction.objectStore(STORES.TRENDS);
      const index = store.index("date");
      const range = IDBKeyRange.bound(startDate, endDate);
      const request = index.getAll(range);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function pruneTrendsOlderThan(days) {
    const db = await getDB();
    const cutoffDate = /* @__PURE__ */ new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split("T")[0];
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TRENDS, "readwrite");
      const store = transaction.objectStore(STORES.TRENDS);
      const index = store.index("date");
      const range = IDBKeyRange.upperBound(cutoffStr, true);
      const request = index.openCursor(range);
      let deletedCount = 0;
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
  async function addCaptureLog(log) {
    return addRecord(STORES.CAPTURES, log);
  }
  async function getAllCaptureLogs() {
    return getAllRecords(STORES.CAPTURES);
  }
  async function getRecentCaptureLogs(limit = 50) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.CAPTURES, "readonly");
      const store = transaction.objectStore(STORES.CAPTURES);
      const index = store.index("timestamp");
      const request = index.openCursor(null, "prev");
      const results = [];
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
  async function pruneCaptureLogsOlderThan(days) {
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1e3;
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.CAPTURES, "readwrite");
      const store = transaction.objectStore(STORES.CAPTURES);
      const index = store.index("timestamp");
      const range = IDBKeyRange.upperBound(cutoffTime, true);
      const request = index.openCursor(range);
      let deletedCount = 0;
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
  async function getAllBackupMetadata() {
    return getAllRecords(STORES.BACKUPS);
  }
  async function getDBStats() {
    const db = await getDB();
    const getCount = (storeName) => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    };
    const [trendsCount, capturesCount, backupsCount] = await Promise.all([
      getCount(STORES.TRENDS),
      getCount(STORES.CAPTURES),
      getCount(STORES.BACKUPS)
    ]);
    return { trendsCount, capturesCount, backupsCount };
  }
  async function runDailyMaintenance() {
    const trendsDeleted = await pruneTrendsOlderThan(90);
    const capturesDeleted = await pruneCaptureLogsOlderThan(30);
    console.log(`[IndexedDB] Maintenance complete: ${trendsDeleted} trends, ${capturesDeleted} captures deleted`);
    return { trendsDeleted, capturesDeleted };
  }
  async function exportAllData() {
    const [trends, captures, backups] = await Promise.all([
      getAllTrends(),
      getAllCaptureLogs(),
      getAllBackupMetadata()
    ]);
    return {
      trends,
      captures,
      backups,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }

  // src/shared/history-manager.ts
  async function recordAnalyticsTrends(analytics) {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const source = "creator-analytics";
    const trendsToAdd = [];
    const impressionsValue = analytics.impressions_last_7_days ?? analytics.impressions;
    if (impressionsValue !== void 0 && impressionsValue > 0) {
      trendsToAdd.push({
        date: today,
        type: "impressions",
        value: impressionsValue,
        source,
        capturedAt: Date.now()
      });
    }
    const followersValue = analytics.followers_count ?? analytics.membersReached;
    if (followersValue !== void 0 && followersValue > 0) {
      trendsToAdd.push({
        date: today,
        type: "followers",
        value: followersValue,
        source,
        capturedAt: Date.now()
      });
    }
    const engagementsValue = analytics.engagements_last_7_days ?? analytics.engagementRate;
    if (engagementsValue !== void 0 && engagementsValue > 0) {
      trendsToAdd.push({
        date: today,
        type: "engagements",
        value: engagementsValue,
        source,
        capturedAt: Date.now()
      });
    }
    for (const trend of trendsToAdd) {
      await addTrendData(trend);
    }
    console.log(`[HistoryManager] Recorded ${trendsToAdd.length} trend data points for impressions=${impressionsValue}, followers=${followersValue}`);
  }
  async function recordProfileTrends(profile) {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const source = "profile-data";
    const trendsToAdd = [];
    if (profile.followers_count !== void 0) {
      trendsToAdd.push({
        date: today,
        type: "followers",
        value: profile.followers_count,
        source
      });
    }
    for (const trend of trendsToAdd) {
      await addTrendData(trend);
    }
    if (trendsToAdd.length > 0) {
      console.log(`[HistoryManager] Recorded ${trendsToAdd.length} profile trend data points`);
    }
  }
  async function logCapture(type, dataSize, success) {
    const log = {
      id: `capture-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      dataSize,
      success
    };
    await addCaptureLog(log);
    console.log(`[HistoryManager] Logged capture: ${type}, success: ${success}`);
  }
  async function getTrendDataForCharts(days = 30) {
    const endDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
    const trends = await getTrendsByDateRange(startDate, endDate);
    const aggregated = /* @__PURE__ */ new Map();
    for (const trend of trends) {
      if (!aggregated.has(trend.date)) {
        aggregated.set(trend.date, /* @__PURE__ */ new Map());
      }
      aggregated.get(trend.date).set(trend.type, trend.value);
    }
    const dates = Array.from(aggregated.keys()).sort();
    const impressions = [];
    const followers = [];
    const engagements = [];
    for (const date of dates) {
      const dayData = aggregated.get(date);
      if (dayData.has("impressions")) {
        impressions.push({ date, value: dayData.get("impressions") });
      }
      if (dayData.has("followers")) {
        followers.push({ date, value: dayData.get("followers") });
      }
      if (dayData.has("engagements")) {
        engagements.push({ date, value: dayData.get("engagements") });
      }
    }
    return { impressions, followers, engagements };
  }
  async function getTrendSummary(days = 7) {
    const now = /* @__PURE__ */ new Date();
    const currentEndDate = now.toISOString().split("T")[0];
    const currentStartDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
    const previousStartDate = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
    const currentTrends = await getTrendsByDateRange(currentStartDate, currentEndDate);
    const previousTrends = await getTrendsByDateRange(previousStartDate, currentStartDate);
    const calculateStats = (current, previous, type) => {
      const currentFiltered = current.filter((t) => t.type === type);
      const previousFiltered = previous.filter((t) => t.type === type);
      const currentValue = currentFiltered.length > 0 ? currentFiltered[currentFiltered.length - 1].value : 0;
      const previousValue = previousFiltered.length > 0 ? previousFiltered[previousFiltered.length - 1].value : 0;
      const change = currentValue - previousValue;
      const changePercent = previousValue > 0 ? change / previousValue * 100 : 0;
      return { current: currentValue, previous: previousValue, change, changePercent };
    };
    return {
      impressions: calculateStats(currentTrends, previousTrends, "impressions"),
      followers: calculateStats(currentTrends, previousTrends, "followers"),
      engagements: calculateStats(currentTrends, previousTrends, "engagements")
    };
  }
  async function exportTrendsAsCSV(days = 90) {
    const endDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
    const trends = await getTrendsByDateRange(startDate, endDate);
    trends.sort((a, b) => {
      if (a.date !== b.date)
        return a.date.localeCompare(b.date);
      return a.type.localeCompare(b.type);
    });
    const headers = ["Date", "Type", "Value", "Source"];
    const rows = trends.map((t) => [t.date, t.type, t.value.toString(), t.source]);
    const csv = [
      headers.join(","),
      ...rows.map((row) => row.join(","))
    ].join("\n");
    return csv;
  }
  async function exportTrendsAsJSON(days = 90) {
    const endDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1e3).toISOString().split("T")[0];
    const trends = await getTrendsByDateRange(startDate, endDate);
    return JSON.stringify({
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      dateRange: { startDate, endDate },
      trendsCount: trends.length,
      trends
    }, null, 2);
  }
  async function exportCaptureLogsAsCSV(limit = 100) {
    const logs = await getRecentCaptureLogs(limit);
    const headers = ["ID", "Timestamp", "Date", "Type", "Data Size", "Success"];
    const rows = logs.map((log) => [
      log.id,
      log.timestamp.toString(),
      new Date(log.timestamp).toISOString(),
      log.type,
      log.dataSize.toString(),
      log.success.toString()
    ]);
    const csv = [
      headers.join(","),
      ...rows.map((row) => row.join(","))
    ].join("\n");
    return csv;
  }
  async function exportFullBackup() {
    const data = await exportAllData();
    return JSON.stringify(data, null, 2);
  }
  async function initHistoryManager() {
    await initDB();
    console.log("[HistoryManager] Initialized");
  }
  async function runMaintenance() {
    const result = await runDailyMaintenance();
    console.log(`[HistoryManager] Maintenance: deleted ${result.trendsDeleted} old trends, ${result.capturesDeleted} old capture logs`);
  }
  async function getStorageStats() {
    return getDBStats();
  }
  async function checkAlerts(alerts) {
    const summary = await getTrendSummary(7);
    const triggered = [];
    const typeToKey = {
      impressions: "impressions",
      followers: "followers",
      engagements: "engagements"
    };
    for (const alert of alerts) {
      if (!alert.enabled)
        continue;
      const summaryKey = typeToKey[alert.type];
      if (!summaryKey)
        continue;
      const stats = summary[summaryKey];
      let shouldTrigger = false;
      switch (alert.condition) {
        case "above":
          shouldTrigger = stats.current > alert.threshold;
          break;
        case "below":
          shouldTrigger = stats.current < alert.threshold;
          break;
        case "change_percent":
          shouldTrigger = Math.abs(stats.changePercent) > alert.threshold;
          break;
      }
      if (shouldTrigger) {
        if (!alert.lastTriggered || Date.now() - alert.lastTriggered > 24 * 60 * 60 * 1e3) {
          triggered.push(alert);
        }
      }
    }
    return triggered;
  }

  // src/background/alarms.ts
  var ALARM_NAMES = {
    DAILY_BACKUP: "linkedin-daily-backup",
    WEEKLY_BACKUP: "linkedin-weekly-backup",
    MAINTENANCE: "linkedin-maintenance",
    ALERT_CHECK: "linkedin-alert-check"
  };
  var DEFAULT_BACKUP_SCHEDULE = {
    enabled: false,
    frequency: "daily",
    time: "03:00"
    // 3 AM local time
  };
  async function initializeAlarms() {
    console.log("[Alarms] Initializing alarms...");
    await createAlarm(ALARM_NAMES.MAINTENANCE, {
      periodInMinutes: 24 * 60,
      // Daily
      delayInMinutes: getMinutesUntilTime("04:00")
    });
    await createAlarm(ALARM_NAMES.ALERT_CHECK, {
      periodInMinutes: 60
      // Hourly
    });
    const schedule = await getBackupSchedule();
    if (schedule.enabled) {
      await scheduleBackup(schedule);
    }
    console.log("[Alarms] Alarms initialized");
  }
  async function createAlarm(name, options) {
    await chrome.alarms.clear(name);
    chrome.alarms.create(name, options);
    console.log(`[Alarms] Created alarm: ${name}`, options);
  }
  function getMinutesUntilTime(timeStr) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const now = /* @__PURE__ */ new Date();
    const target = /* @__PURE__ */ new Date();
    target.setHours(hours, minutes, 0, 0);
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }
    return Math.round((target.getTime() - now.getTime()) / (1e3 * 60));
  }
  function getDaysUntilWeekday(targetDay) {
    const today = (/* @__PURE__ */ new Date()).getDay();
    let daysUntil = targetDay - today;
    if (daysUntil <= 0) {
      daysUntil += 7;
    }
    return daysUntil;
  }
  async function scheduleBackup(schedule) {
    if (!schedule.enabled) {
      await chrome.alarms.clear(ALARM_NAMES.DAILY_BACKUP);
      await chrome.alarms.clear(ALARM_NAMES.WEEKLY_BACKUP);
      console.log("[Alarms] Backup alarms cleared");
      return;
    }
    const minutesUntilTime = getMinutesUntilTime(schedule.time);
    if (schedule.frequency === "daily") {
      await chrome.alarms.clear(ALARM_NAMES.WEEKLY_BACKUP);
      await createAlarm(ALARM_NAMES.DAILY_BACKUP, {
        periodInMinutes: 24 * 60,
        delayInMinutes: minutesUntilTime
      });
      console.log(`[Alarms] Daily backup scheduled for ${schedule.time}`);
    } else if (schedule.frequency === "weekly") {
      await chrome.alarms.clear(ALARM_NAMES.DAILY_BACKUP);
      const daysUntil = getDaysUntilWeekday(schedule.dayOfWeek || 0);
      const totalMinutes = daysUntil * 24 * 60 + minutesUntilTime;
      await createAlarm(ALARM_NAMES.WEEKLY_BACKUP, {
        periodInMinutes: 7 * 24 * 60,
        // Weekly
        delayInMinutes: totalMinutes
      });
      console.log(`[Alarms] Weekly backup scheduled for day ${schedule.dayOfWeek} at ${schedule.time}`);
    }
    await saveBackupSchedule(schedule);
  }
  async function getBackupSchedule() {
    const result = await chrome.storage.local.get("backup_schedule");
    return result.backup_schedule || DEFAULT_BACKUP_SCHEDULE;
  }
  async function saveBackupSchedule(schedule) {
    await chrome.storage.local.set({ backup_schedule: schedule });
  }
  async function updateBackupSchedule(schedule) {
    await saveBackupSchedule(schedule);
    await scheduleBackup(schedule);
  }
  async function getAlertConfigs() {
    const result = await chrome.storage.local.get("alert_configs");
    return result.alert_configs || [];
  }
  async function saveAlertConfigs(configs) {
    await chrome.storage.local.set({ alert_configs: configs });
  }
  async function upsertAlertConfig(config) {
    const configs = await getAlertConfigs();
    const existingIndex = configs.findIndex((c) => c.id === config.id);
    if (existingIndex >= 0) {
      configs[existingIndex] = config;
    } else {
      configs.push(config);
    }
    await saveAlertConfigs(configs);
  }
  async function deleteAlertConfig(id) {
    const configs = await getAlertConfigs();
    const filtered = configs.filter((c) => c.id !== id);
    await saveAlertConfigs(filtered);
  }
  async function markAlertTriggered(id) {
    const configs = await getAlertConfigs();
    const config = configs.find((c) => c.id === id);
    if (config) {
      config.lastTriggered = Date.now();
      await saveAlertConfigs(configs);
    }
  }
  async function getAllAlarms() {
    return chrome.alarms.getAll();
  }

  // src/background/notifications.ts
  var NOTIFICATION_IDS = {
    CAPTURE_SUCCESS: "linkedin-capture-success",
    BACKUP_SUCCESS: "linkedin-backup-success",
    BACKUP_FAILURE: "linkedin-backup-failure",
    GROWTH_ALERT: "linkedin-growth-alert",
    MAINTENANCE: "linkedin-maintenance"
  };
  var ICONS = {
    SUCCESS: "icons/icon128.png",
    WARNING: "icons/icon128.png",
    ERROR: "icons/icon128.png",
    INFO: "icons/icon128.png"
  };
  var NOTIFICATION_SETTINGS_KEY = "notification_settings";
  var DEFAULT_NOTIFICATION_SETTINGS = {
    captureNotifications: true,
    backupNotifications: true,
    growthAlerts: true,
    silentMode: false,
    quietHoursEnabled: false,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00"
  };
  async function getNotificationSettings() {
    const result = await chrome.storage.local.get(NOTIFICATION_SETTINGS_KEY);
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...result[NOTIFICATION_SETTINGS_KEY] };
  }
  async function saveNotificationSettings(settings) {
    await chrome.storage.local.set({ [NOTIFICATION_SETTINGS_KEY]: settings });
  }
  function isInQuietHours(settings) {
    if (!settings.quietHoursEnabled)
      return false;
    const now = /* @__PURE__ */ new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMin] = settings.quietHoursStart.split(":").map(Number);
    const [endHour, endMin] = settings.quietHoursEnd.split(":").map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  async function shouldShowNotification(type) {
    const settings = await getNotificationSettings();
    if (settings.silentMode)
      return false;
    if (isInQuietHours(settings))
      return false;
    return settings[type];
  }
  async function createNotification(id, options) {
    return new Promise((resolve) => {
      chrome.notifications.create(id, options, (notificationId) => {
        console.log(`[Notifications] Created: ${notificationId}`);
        resolve(notificationId);
      });
    });
  }
  async function clearNotification(id) {
    return new Promise((resolve) => {
      chrome.notifications.clear(id, () => {
        resolve();
      });
    });
  }
  async function showCaptureNotification(captureType, details) {
    if (!await shouldShowNotification("captureNotifications"))
      return;
    const typeLabels = {
      creator_analytics: "Creator Analytics",
      post_analytics: "Post Analytics",
      audience_analytics: "Audience Analytics",
      audience_demographics: "Audience Demographics",
      post_demographics: "Post Demographics",
      profile_views: "Profile Views",
      profile: "Profile Data"
    };
    const label = typeLabels[captureType] || captureType;
    await createNotification(NOTIFICATION_IDS.CAPTURE_SUCCESS, {
      type: "basic",
      iconUrl: ICONS.SUCCESS,
      title: "Data Captured",
      message: `${label} captured successfully${details ? `: ${details}` : ""}`,
      priority: 0
    });
    setTimeout(() => clearNotification(NOTIFICATION_IDS.CAPTURE_SUCCESS), 3e3);
  }
  async function showBackupSuccessNotification(backupType, size) {
    if (!await shouldShowNotification("backupNotifications"))
      return;
    const sizeStr = size ? ` (${formatBytes(size)})` : "";
    await createNotification(NOTIFICATION_IDS.BACKUP_SUCCESS, {
      type: "basic",
      iconUrl: ICONS.SUCCESS,
      title: "Backup Complete",
      message: `${backupType === "scheduled" ? "Scheduled" : "Manual"} backup completed${sizeStr}`,
      priority: 0
    });
    setTimeout(() => clearNotification(NOTIFICATION_IDS.BACKUP_SUCCESS), 5e3);
  }
  async function showBackupFailureNotification(error) {
    if (!await shouldShowNotification("backupNotifications"))
      return;
    await createNotification(NOTIFICATION_IDS.BACKUP_FAILURE, {
      type: "basic",
      iconUrl: ICONS.ERROR,
      title: "Backup Failed",
      message: `Could not complete backup: ${error}`,
      priority: 2
    });
  }
  async function showGrowthAlertNotification(alert, currentValue, changePercent) {
    if (!await shouldShowNotification("growthAlerts"))
      return;
    const typeLabels = {
      impressions: "Impressions",
      followers: "Followers",
      engagements: "Engagements",
      profile_views: "Profile Views",
      connections: "Connections"
    };
    const label = typeLabels[alert.type] || alert.type;
    let message;
    switch (alert.condition) {
      case "above":
        message = `${label} reached ${formatNumber(currentValue)} (above ${formatNumber(alert.threshold)} threshold)`;
        break;
      case "below":
        message = `${label} dropped to ${formatNumber(currentValue)} (below ${formatNumber(alert.threshold)} threshold)`;
        break;
      case "change_percent":
        message = `${label} changed by ${changePercent?.toFixed(1)}% (threshold: ${alert.threshold}%)`;
        break;
      default:
        message = `${label}: ${formatNumber(currentValue)}`;
    }
    await createNotification(`${NOTIFICATION_IDS.GROWTH_ALERT}-${alert.id}`, {
      type: "basic",
      iconUrl: ICONS.INFO,
      title: "Growth Alert",
      message,
      priority: 1,
      requireInteraction: true
      // Keep notification visible until user interacts
    });
  }
  async function showMultipleGrowthAlerts(alerts) {
    if (!await shouldShowNotification("growthAlerts"))
      return;
    if (alerts.length === 0)
      return;
    if (alerts.length === 1) {
      const { alert, currentValue, changePercent } = alerts[0];
      await showGrowthAlertNotification(alert, currentValue, changePercent);
      return;
    }
    const items = alerts.map(({ alert }) => ({
      title: alert.type,
      message: `${alert.condition} ${alert.threshold}`
    }));
    await createNotification(NOTIFICATION_IDS.GROWTH_ALERT, {
      type: "list",
      iconUrl: ICONS.INFO,
      title: `${alerts.length} Growth Alerts`,
      message: "Multiple thresholds reached",
      items,
      priority: 1,
      requireInteraction: true
    });
  }
  function formatBytes(bytes) {
    if (bytes === 0)
      return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }
  function formatNumber(num) {
    return num.toLocaleString();
  }
  function handleNotificationClick(notificationId) {
    console.log(`[Notifications] Clicked: ${notificationId}`);
    clearNotification(notificationId);
    if (notificationId.startsWith(NOTIFICATION_IDS.GROWTH_ALERT)) {
      chrome.action.openPopup();
    } else if (notificationId === NOTIFICATION_IDS.BACKUP_FAILURE) {
      chrome.action.openPopup();
    }
  }
  function setupNotificationListeners() {
    chrome.notifications.onClicked.addListener(handleNotificationClick);
    chrome.notifications.onClosed.addListener((notificationId, byUser) => {
      console.log(`[Notifications] Closed: ${notificationId}, by user: ${byUser}`);
    });
  }

  // src/background/google-auth.ts
  var AUTH_STORAGE_KEY = "google_auth_state";
  async function getAuthState() {
    try {
      const result = await chrome.storage.local.get(AUTH_STORAGE_KEY);
      const state = result[AUTH_STORAGE_KEY];
      if (state?.accessToken && state?.expiresAt) {
        if (Date.now() >= state.expiresAt) {
          console.log("[GoogleAuth] Token expired, clearing auth state");
          await clearAuthState();
          return { isAuthenticated: false };
        }
        return state;
      }
      return { isAuthenticated: false };
    } catch (error) {
      console.error("[GoogleAuth] Error getting auth state:", error);
      return { isAuthenticated: false };
    }
  }
  async function saveAuthState(state) {
    await chrome.storage.local.set({ [AUTH_STORAGE_KEY]: state });
  }
  async function clearAuthState() {
    await chrome.storage.local.remove(AUTH_STORAGE_KEY);
  }
  async function startAuthFlow() {
    console.log("[GoogleAuth] Starting OAuth flow...");
    try {
      const token = await new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token2) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!token2) {
            reject(new Error("No token received"));
          } else {
            resolve(token2);
          }
        });
      });
      console.log("[GoogleAuth] Got access token");
      const userInfo = await fetchUserInfo(token);
      const expiresAt = Date.now() + 3600 * 1e3;
      const authState = {
        isAuthenticated: true,
        accessToken: token,
        expiresAt,
        userEmail: userInfo.email,
        userName: userInfo.name,
        userPhoto: userInfo.picture
      };
      await saveAuthState(authState);
      console.log("[GoogleAuth] Auth successful:", userInfo.email);
      return authState;
    } catch (error) {
      console.error("[GoogleAuth] Auth flow error:", error);
      throw error;
    }
  }
  async function fetchUserInfo(accessToken) {
    try {
      const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch user info: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("[GoogleAuth] Error fetching user info:", error);
      return {};
    }
  }
  async function logout() {
    console.log("[GoogleAuth] Logging out...");
    try {
      const state = await getAuthState();
      if (state.accessToken) {
        await new Promise((resolve) => {
          chrome.identity.removeCachedAuthToken({ token: state.accessToken }, () => {
            resolve();
          });
        });
        try {
          await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${state.accessToken}`);
        } catch (e) {
        }
      }
      await clearAuthState();
      console.log("[GoogleAuth] Logged out successfully");
    } catch (error) {
      console.error("[GoogleAuth] Logout error:", error);
      await clearAuthState();
    }
  }
  async function refreshTokenIfNeeded() {
    const state = await getAuthState();
    if (!state.isAuthenticated) {
      return null;
    }
    if (state.expiresAt && Date.now() >= state.expiresAt - 5 * 60 * 1e3) {
      console.log("[GoogleAuth] Token expiring soon, refreshing...");
      try {
        if (state.accessToken) {
          await new Promise((resolve) => {
            chrome.identity.removeCachedAuthToken({ token: state.accessToken }, () => {
              resolve();
            });
          });
        }
        const token = await new Promise((resolve, reject) => {
          chrome.identity.getAuthToken({ interactive: false }, (token2) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (!token2) {
              reject(new Error("No token received"));
            } else {
              resolve(token2);
            }
          });
        });
        const newState = {
          ...state,
          accessToken: token,
          expiresAt: Date.now() + 3600 * 1e3
        };
        await saveAuthState(newState);
        return token;
      } catch (error) {
        console.error("[GoogleAuth] Token refresh failed:", error);
        await clearAuthState();
        return null;
      }
    }
    return state.accessToken || null;
  }
  async function getValidToken() {
    return refreshTokenIfNeeded();
  }
  async function isAuthenticated() {
    const token = await getValidToken();
    return !!token;
  }

  // src/background/drive-sync.ts
  var SYNC_SETTINGS_KEY = "drive_sync_settings";
  var SYNC_STATUS_KEY = "drive_sync_status";
  var DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
  var DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
  var BACKUP_FILE_PREFIX = "linkedin-extractor-backup-";
  var BACKUP_MIME_TYPE = "application/json";
  async function getSyncSettings() {
    const result = await chrome.storage.local.get(SYNC_SETTINGS_KEY);
    return result[SYNC_SETTINGS_KEY] || {
      enabled: false,
      autoSync: false,
      syncFrequency: "weekly",
      keepBackups: 5
    };
  }
  async function saveSyncSettings(settings) {
    await chrome.storage.local.set({ [SYNC_SETTINGS_KEY]: settings });
  }
  async function getSyncStatus() {
    const result = await chrome.storage.local.get(SYNC_STATUS_KEY);
    return result[SYNC_STATUS_KEY] || {
      syncInProgress: false,
      autoSyncEnabled: false
    };
  }
  async function updateSyncStatus(updates) {
    const current = await getSyncStatus();
    await chrome.storage.local.set({
      [SYNC_STATUS_KEY]: { ...current, ...updates }
    });
  }
  async function driveRequest(url, options = {}) {
    const token = await getValidToken();
    if (!token) {
      throw new Error("Not authenticated");
    }
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers
      }
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Drive API error: ${response.status} - ${error}`);
    }
    return response;
  }
  async function listBackups() {
    console.log("[DriveSync] Listing backups...");
    const params = new URLSearchParams({
      spaces: "appDataFolder",
      fields: "files(id,name,createdTime,modifiedTime,size,mimeType)",
      orderBy: "createdTime desc",
      q: `name contains '${BACKUP_FILE_PREFIX}'`
    });
    const response = await driveRequest(`${DRIVE_API_BASE}/files?${params}`);
    const data = await response.json();
    const files = (data.files || []).map((file) => ({
      id: file.id,
      name: file.name,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      size: parseInt(file.size || "0", 10),
      mimeType: file.mimeType
    }));
    console.log(`[DriveSync] Found ${files.length} backups`);
    return files;
  }
  async function uploadBackup() {
    console.log("[DriveSync] Starting backup upload...");
    await updateSyncStatus({ syncInProgress: true });
    try {
      const backupData = await exportFullBackup();
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
      const fileName = `${BACKUP_FILE_PREFIX}${timestamp}.json`;
      const metadata = {
        name: fileName,
        mimeType: BACKUP_MIME_TYPE,
        parents: ["appDataFolder"]
      };
      const boundary = "-------314159265358979323846";
      const delimiter = `\r
--${boundary}\r
`;
      const closeDelimiter = `\r
--${boundary}--`;
      const multipartBody = delimiter + "Content-Type: application/json\r\n\r\n" + JSON.stringify(metadata) + delimiter + `Content-Type: ${BACKUP_MIME_TYPE}\r
\r
` + backupData + closeDelimiter;
      const response = await driveRequest(
        `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart`,
        {
          method: "POST",
          headers: {
            "Content-Type": `multipart/related; boundary=${boundary}`
          },
          body: multipartBody
        }
      );
      const file = await response.json();
      console.log(`[DriveSync] Backup uploaded: ${file.name}`);
      const settings = await getSyncSettings();
      settings.lastSync = Date.now();
      await saveSyncSettings(settings);
      await updateSyncStatus({
        syncInProgress: false,
        lastSync: Date.now(),
        lastSyncSuccess: true,
        lastSyncError: void 0
      });
      await cleanupOldBackups();
      return {
        id: file.id,
        name: file.name,
        createdTime: file.createdTime || (/* @__PURE__ */ new Date()).toISOString(),
        modifiedTime: file.modifiedTime || (/* @__PURE__ */ new Date()).toISOString(),
        size: backupData.length,
        mimeType: BACKUP_MIME_TYPE
      };
    } catch (error) {
      console.error("[DriveSync] Upload failed:", error);
      await updateSyncStatus({
        syncInProgress: false,
        lastSyncSuccess: false,
        lastSyncError: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }
  async function restoreBackup(fileId) {
    console.log(`[DriveSync] Restoring backup: ${fileId}`);
    await updateSyncStatus({ syncInProgress: true });
    try {
      const response = await driveRequest(
        `${DRIVE_API_BASE}/files/${fileId}?alt=media`
      );
      const backupData = await response.json();
      if (!backupData || typeof backupData !== "object") {
        throw new Error("Invalid backup format");
      }
      if (backupData.chromeStorage) {
        for (const [key, value] of Object.entries(backupData.chromeStorage)) {
          await chrome.storage.local.set({ [key]: value });
        }
        console.log("[DriveSync] Chrome storage restored");
      }
      await updateSyncStatus({
        syncInProgress: false,
        lastSync: Date.now(),
        lastSyncSuccess: true
      });
      console.log("[DriveSync] Backup restored successfully");
    } catch (error) {
      console.error("[DriveSync] Restore failed:", error);
      await updateSyncStatus({
        syncInProgress: false,
        lastSyncSuccess: false,
        lastSyncError: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }
  async function deleteBackup(fileId) {
    console.log(`[DriveSync] Deleting backup: ${fileId}`);
    await driveRequest(`${DRIVE_API_BASE}/files/${fileId}`, {
      method: "DELETE"
    });
    console.log("[DriveSync] Backup deleted");
  }
  async function cleanupOldBackups() {
    try {
      const settings = await getSyncSettings();
      const keepCount = settings.keepBackups || 5;
      const backups = await listBackups();
      if (backups.length > keepCount) {
        const toDelete = backups.slice(keepCount);
        console.log(`[DriveSync] Cleaning up ${toDelete.length} old backups`);
        for (const backup of toDelete) {
          try {
            await deleteBackup(backup.id);
          } catch (error) {
            console.error(`[DriveSync] Failed to delete backup ${backup.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error("[DriveSync] Cleanup failed:", error);
    }
  }
  async function syncNow() {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      throw new Error("Not authenticated with Google");
    }
    return uploadBackup();
  }

  // src/background/supabase-sync-bridge.ts
  var SYNCABLE_STORAGE_KEYS = [
    "linkedin_profile",
    "linkedin_analytics",
    "linkedin_post_analytics",
    "linkedin_audience",
    "linkedin_connections",
    "linkedin_feed_posts",
    "linkedin_my_posts",
    "linkedin_comments",
    "linkedin_followers",
    "captured_apis",
    "capture_stats",
    "extension_settings"
  ];
  var STORAGE_TABLE_MAP = {
    "linkedin_profile": "linkedin_profiles",
    "linkedin_analytics": "linkedin_analytics",
    "linkedin_post_analytics": "post_analytics",
    "linkedin_audience": "audience_data",
    "linkedin_connections": "connections",
    "linkedin_feed_posts": "feed_posts",
    "linkedin_my_posts": "my_posts",
    "linkedin_comments": "comments",
    "linkedin_followers": "followers",
    "captured_apis": "captured_apis",
    "capture_stats": "capture_stats",
    "extension_settings": "extension_settings"
  };
  var FIELD_MAPPINGS = {
    "linkedin_profiles": {
      "linkedinId": "linkedin_id",
      "firstName": "first_name",
      "lastName": "last_name",
      "profilePicture": "profile_picture",
      "publicIdentifier": "public_identifier",
      "memberUrn": "member_urn",
      "connectionCount": "connections_count",
      "followerCount": "followers_count",
      "profileUrl": "profile_url",
      "backgroundImage": "background_image"
    },
    "linkedin_analytics": {
      "membersReached": "members_reached",
      "profileViews": "profile_views",
      "searchAppearances": "search_appearances",
      "newFollowers": "new_followers",
      "postCount": "post_count",
      "reactionCount": "reaction_count",
      "commentCount": "comment_count",
      "shareCount": "share_count",
      "capturedAt": "captured_at",
      "lastUpdated": "last_updated",
      "topPosts": "top_posts",
      "pageType": "page_type"
    },
    "post_analytics": {
      "activityUrn": "activity_urn",
      "postText": "post_text",
      "postType": "post_type",
      "impressionCount": "impression_count",
      "likeCount": "like_count",
      "commentCount": "comment_count",
      "repostCount": "repost_count",
      "shareCount": "share_count",
      "clickCount": "click_count",
      "engagementRate": "engagement_rate",
      "postedAt": "posted_at",
      "capturedAt": "captured_at",
      "firstCaptured": "first_captured",
      "lastUpdated": "last_updated"
    },
    "audience_data": {
      "totalFollowers": "total_followers",
      "newFollowers": "new_followers",
      "followerGrowth": "follower_growth",
      "growthRate": "growth_rate",
      "topLocations": "top_locations",
      "topIndustries": "top_industries",
      "topJobFunctions": "top_job_functions",
      "topSeniorities": "top_seniorities",
      "capturedAt": "captured_at",
      "lastUpdated": "last_updated"
    },
    "connections": {
      "linkedinId": "linkedin_id",
      "firstName": "first_name",
      "lastName": "last_name",
      "profilePicture": "profile_picture",
      "publicIdentifier": "public_identifier",
      "connectedAt": "connected_at",
      "connectionDegree": "connection_degree"
    },
    "feed_posts": {
      "authorId": "author_id",
      "authorName": "author_name",
      "authorHeadline": "author_headline",
      "authorProfilePicture": "author_profile_picture",
      "postText": "post_text",
      "postType": "post_type",
      "activityUrn": "activity_urn",
      "likeCount": "like_count",
      "commentCount": "comment_count",
      "repostCount": "repost_count",
      "postedAt": "posted_at",
      "capturedAt": "captured_at"
    },
    "my_posts": {
      "activityUrn": "activity_urn",
      "postText": "post_text",
      "postType": "post_type",
      "impressionCount": "impression_count",
      "likeCount": "like_count",
      "commentCount": "comment_count",
      "repostCount": "repost_count",
      "postedAt": "posted_at",
      "capturedAt": "captured_at"
    },
    "captured_apis": {
      "apiUrl": "api_url",
      "apiCategory": "api_category",
      "responseSize": "response_size",
      "capturedAt": "captured_at"
    },
    "capture_stats": {
      "totalCaptures": "total_captures",
      "successfulCaptures": "successful_captures",
      "failedCaptures": "failed_captures",
      "capturesByType": "captures_by_type",
      "lastCapture": "last_capture",
      "captureHistory": "capture_history"
    },
    "extension_settings": {
      "autoCapture": "auto_capture_enabled",
      "storeImages": "store_images",
      "captureNotifications": "capture_notifications",
      "growthAlerts": "growth_alerts",
      "captureFeed": "capture_feed",
      "captureAnalytics": "capture_analytics",
      "captureProfile": "capture_profile",
      "captureMessaging": "capture_messaging",
      "syncEnabled": "sync_enabled",
      "syncInterval": "sync_interval",
      "darkMode": "dark_mode",
      "notificationsEnabled": "notifications_enabled"
    }
  };
  var TABLE_COLUMNS = {
    "linkedin_profiles": [
      "id",
      "user_id",
      "profile_urn",
      "public_identifier",
      "first_name",
      "last_name",
      "headline",
      "location",
      "industry",
      "profile_picture_url",
      "background_image_url",
      "connections_count",
      "followers_count",
      "summary",
      "raw_data",
      "captured_at",
      "updated_at"
    ],
    "linkedin_analytics": [
      "id",
      "user_id",
      "page_type",
      "impressions",
      "members_reached",
      "engagements",
      "new_followers",
      "profile_views",
      "search_appearances",
      "top_posts",
      "raw_data",
      "captured_at",
      "updated_at"
    ],
    "post_analytics": [
      "id",
      "user_id",
      "activity_urn",
      "post_content",
      "post_type",
      "impressions",
      "members_reached",
      "unique_views",
      "reactions",
      "comments",
      "reposts",
      "engagement_rate",
      "profile_viewers",
      "followers_gained",
      "demographics",
      "raw_data",
      "posted_at",
      "captured_at",
      "updated_at"
    ],
    "audience_data": [
      "id",
      "user_id",
      "total_followers",
      "follower_growth",
      "follower_growth_formatted",
      "demographics_preview",
      "top_job_titles",
      "top_companies",
      "top_locations",
      "top_industries",
      "raw_data",
      "captured_at",
      "updated_at"
    ],
    "extension_settings": [
      "id",
      "user_id",
      "auto_capture_enabled",
      "capture_feed",
      "capture_analytics",
      "capture_profile",
      "capture_messaging",
      "sync_enabled",
      "sync_interval",
      "dark_mode",
      "notifications_enabled",
      "raw_settings",
      "created_at",
      "updated_at"
    ],
    "captured_apis": [
      "id",
      "user_id",
      "category",
      "endpoint",
      "method",
      "response_hash",
      "response_data",
      "captured_at"
    ],
    "capture_stats": [
      "id",
      "user_id",
      "date",
      "api_calls_captured",
      "feed_posts_captured",
      "analytics_captures",
      "dom_extractions",
      "created_at",
      "updated_at"
    ]
  };
  var currentUserId = null;
  var isSyncing = false;
  var lastSyncTime = null;
  function isSyncableKey(key) {
    return SYNCABLE_STORAGE_KEYS.includes(key);
  }
  function getTableForKey(key) {
    return STORAGE_TABLE_MAP[key] || null;
  }
  function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  function prepareForSupabase(data, table, userId) {
    if (!data || typeof data !== "object")
      return data;
    const prepared = { ...data };
    const userIdConflictTables = ["linkedin_profiles", "audience_data", "extension_settings"];
    if (userIdConflictTables.includes(table)) {
      delete prepared.id;
    } else {
      if (!prepared.id) {
        prepared.id = generateUUID();
      }
    }
    if (userId) {
      prepared.user_id = userId;
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (!prepared.captured_at) {
      prepared.captured_at = now;
    }
    if (!prepared.created_at) {
      prepared.created_at = now;
    }
    prepared.updated_at = now;
    const mapping = FIELD_MAPPINGS[table];
    if (mapping) {
      for (const [camelCase, snakeCase] of Object.entries(mapping)) {
        if (prepared[camelCase] !== void 0) {
          prepared[snakeCase] = prepared[camelCase];
          delete prepared[camelCase];
        }
      }
    }
    delete prepared._localId;
    delete prepared._pendingSync;
    delete prepared.source;
    const knownColumns = TABLE_COLUMNS[table];
    if (knownColumns) {
      const filtered = {};
      for (const key of Object.keys(prepared)) {
        if (knownColumns.includes(key)) {
          filtered[key] = prepared[key];
        } else {
          if (knownColumns.includes("raw_data") || knownColumns.includes("raw_settings")) {
            const rawKey = knownColumns.includes("raw_settings") ? "raw_settings" : "raw_data";
            if (!filtered[rawKey]) {
              filtered[rawKey] = {};
            }
            filtered[rawKey][key] = prepared[key];
          }
        }
      }
      return filtered;
    }
    return prepared;
  }
  async function getPendingChanges() {
    try {
      const result = await chrome.storage.local.get("supabase_pending_changes");
      return result.supabase_pending_changes || [];
    } catch (error) {
      console.error("[SyncBridge] Error getting pending changes:", error);
      return [];
    }
  }
  async function savePendingChanges(changes) {
    try {
      await chrome.storage.local.set({ supabase_pending_changes: changes });
    } catch (error) {
      console.error("[SyncBridge] Error saving pending changes:", error);
    }
  }
  async function queueForSync2(localKey, data, operation = "upsert") {
    const table = getTableForKey(localKey);
    if (!table) {
      console.log(`[SyncBridge] No table mapping for key: ${localKey}`);
      return;
    }
    const pendingChanges = await getPendingChanges();
    const change = {
      table,
      operation,
      data,
      localKey,
      timestamp: Date.now()
    };
    const existingIndex = pendingChanges.findIndex(
      (c) => c.localKey === localKey && c.table === table
    );
    if (existingIndex >= 0) {
      pendingChanges[existingIndex] = change;
    } else {
      pendingChanges.push(change);
    }
    await savePendingChanges(pendingChanges);
    console.log(`[SyncBridge] Queued ${localKey} for sync to ${table}`);
    try {
      chrome.runtime.sendMessage({
        type: "PENDING_CHANGE_ADDED",
        count: pendingChanges.length
      }).catch(() => {
      });
    } catch {
    }
  }
  async function saveWithSync(key, data, skipSync = false) {
    try {
      await chrome.storage.local.set({ [key]: data });
      if (!skipSync && isSyncableKey(key) && currentUserId) {
        await queueForSync2(key, data);
        setTimeout(async () => {
          try {
            const result = await processPendingChanges();
            console.log(`[SyncBridge] Immediate sync complete: ${result.success} success, ${result.failed} failed`);
          } catch (err) {
            console.error("[SyncBridge] Immediate sync error:", err);
          }
        }, 100);
      }
      return { success: true };
    } catch (error) {
      console.error("[SyncBridge] Save error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
  async function processPendingChanges() {
    if (isSyncing) {
      console.log("[SyncBridge] Sync already in progress");
      return { success: 0, failed: 0, errors: ["Sync already in progress"] };
    }
    if (!navigator.onLine) {
      console.log("[SyncBridge] Offline - skipping sync");
      return { success: 0, failed: 0, errors: ["Offline"] };
    }
    if (!currentUserId) {
      console.log("[SyncBridge] Not authenticated - skipping sync");
      return { success: 0, failed: 0, errors: ["Not authenticated"] };
    }
    isSyncing = true;
    const errors = [];
    let success = 0;
    let failed = 0;
    try {
      chrome.runtime.sendMessage({ type: "SYNC_STARTED" }).catch(() => {
      });
      const pendingChanges = await getPendingChanges();
      if (pendingChanges.length === 0) {
        console.log("[SyncBridge] No pending changes to sync");
        return { success: 0, failed: 0, errors: [] };
      }
      console.log(`[SyncBridge] Processing ${pendingChanges.length} pending changes...`);
      const byTable = {};
      for (const change of pendingChanges) {
        if (!byTable[change.table]) {
          byTable[change.table] = [];
        }
        byTable[change.table].push(change);
      }
      const supabase = self.supabase;
      if (!supabase) {
        console.error("[SyncBridge] Supabase client not available");
        return { success: 0, failed: pendingChanges.length, errors: ["Supabase client not available"] };
      }
      const processedChanges = [];
      for (const [table, changes] of Object.entries(byTable)) {
        try {
          const records = changes.map(
            (c) => prepareForSupabase(c.data, table, currentUserId)
          );
          console.log(`[SyncBridge] Syncing ${records.length} records to ${table}`);
          console.log(`[SyncBridge] Record data:`, JSON.stringify(records[0], null, 2));
          const userIdConflictTables = ["linkedin_profiles", "audience_data", "extension_settings"];
          const isUserIdTable = userIdConflictTables.includes(table);
          let error;
          if (isUserIdTable && currentUserId) {
            console.log(`[SyncBridge] Using UPDATE strategy for ${table}`);
            for (const record of records) {
              const { user_id, ...updateData } = record;
              const updateResult = await supabase.from(table).eq("user_id", currentUserId).update(updateData);
              console.log(`[SyncBridge] Update result for ${table}:`, JSON.stringify(updateResult));
              if (updateResult.error) {
                console.log(`[SyncBridge] Update failed, trying INSERT for ${table}`);
                const insertResult = await supabase.from(table).insert({ ...record, user_id: currentUserId });
                if (insertResult.error) {
                  error = insertResult.error;
                }
              }
            }
          } else {
            const tableClient = supabase.from(table);
            console.log(`[SyncBridge] Upserting to ${table} with conflictKey: id`);
            const result = await tableClient.upsert(records, { onConflict: "id" });
            console.log(`[SyncBridge] Upsert result for ${table}:`, JSON.stringify(result));
            error = result.error;
          }
          if (error) {
            console.error(`[SyncBridge] Sync error for ${table}:`, error);
            errors.push(`${table}: ${error.message}`);
            const isDuplicateUserIdError = error.message.includes("duplicate key value violates unique constraint") && error.message.includes("user_id") && userIdConflictTables.includes(table);
            if (isDuplicateUserIdError) {
              console.log(`[SyncBridge] Duplicate user_id error for ${table} - data already exists, removing from queue`);
              processedChanges.push(...changes);
            } else {
              failed += changes.length;
            }
          } else {
            console.log(`[SyncBridge] Successfully synced ${changes.length} records to ${table}`);
            success += changes.length;
            processedChanges.push(...changes);
          }
        } catch (err) {
          console.error(`[SyncBridge] Batch sync error for ${table}:`, err);
          errors.push(`${table}: ${err instanceof Error ? err.message : "Unknown error"}`);
          failed += changes.length;
        }
      }
      if (processedChanges.length > 0) {
        const remainingChanges = pendingChanges.filter(
          (change) => !processedChanges.some(
            (p) => p.timestamp === change.timestamp && p.table === change.table
          )
        );
        await savePendingChanges(remainingChanges);
      }
      lastSyncTime = Date.now();
      console.log(`[SyncBridge] Sync complete: ${success} success, ${failed} failed`);
      chrome.runtime.sendMessage({
        type: "SYNC_COMPLETE",
        data: { success, failed }
      }).catch(() => {
      });
      return { success, failed, errors };
    } catch (error) {
      console.error("[SyncBridge] Sync error:", error);
      return {
        success,
        failed: failed || 1,
        errors: [...errors, error instanceof Error ? error.message : "Unknown error"]
      };
    } finally {
      isSyncing = false;
    }
  }
  async function migrateExistingData() {
    if (!currentUserId) {
      console.log("[SyncBridge] No user - cannot migrate");
      return { success: false, migrated: 0, failed: 0, errors: ["Not authenticated"] };
    }
    console.log("[SyncBridge] Starting data migration...");
    const errors = [];
    let migrated = 0;
    let failed = 0;
    for (const localKey of SYNCABLE_STORAGE_KEYS) {
      try {
        const result = await chrome.storage.local.get(localKey);
        const data = result[localKey];
        if (data) {
          await queueForSync2(localKey, data);
          migrated++;
          console.log(`[SyncBridge] Queued ${localKey} for migration`);
        }
      } catch (error) {
        console.error(`[SyncBridge] Migration failed for ${localKey}:`, error);
        errors.push(`${localKey}: ${error instanceof Error ? error.message : "Unknown error"}`);
        failed++;
      }
    }
    console.log(`[SyncBridge] Migration queued: ${migrated} items`);
    const syncResult = await processPendingChanges();
    await chrome.storage.local.set({
      supabase_migration_complete: true,
      supabase_migration_date: (/* @__PURE__ */ new Date()).toISOString(),
      supabase_migration_user: currentUserId
    });
    return {
      success: true,
      migrated,
      failed: failed + syncResult.failed,
      errors: [...errors, ...syncResult.errors]
    };
  }
  function setCurrentUserId(userId) {
    currentUserId = userId;
    console.log(`[SyncBridge] User ID set: ${userId ? userId.substring(0, 8) + "..." : "null"}`);
  }
  function getCurrentUserId() {
    return currentUserId;
  }
  async function getSyncStatusInfo() {
    const pendingChanges = await getPendingChanges();
    return {
      isAuthenticated: !!currentUserId,
      userId: currentUserId,
      pendingCount: pendingChanges.length,
      lastSyncTime,
      isSyncing
    };
  }
  async function initSyncBridge() {
    console.log("[SyncBridge] Initializing...");
    try {
      const supabaseAuth = self.supabaseAuth;
      if (supabaseAuth) {
        console.log("[SyncBridge] Using auth module to restore session...");
        const { session, user } = await supabaseAuth.getSession();
        const userId = user?.id || session?.user?.id;
        console.log("[SyncBridge] Auth module session check:", session ? "found" : "not found", userId ? `user: ${userId.substring(0, 8)}...` : "no user");
        if (userId) {
          currentUserId = userId;
          console.log(`[SyncBridge] Restored user session via auth module: ${currentUserId.substring(0, 8)}...`);
        }
      }
      if (!currentUserId) {
        console.log("[SyncBridge] Trying direct storage fallback...");
        const result = await chrome.storage.local.get("supabase_session");
        const session = result.supabase_session;
        console.log("[SyncBridge] Storage session check:", session ? "found" : "not found", session?.user?.id ? `user: ${session.user.id.substring(0, 8)}...` : "no user");
        if (session?.user?.id) {
          currentUserId = session.user.id;
          console.log(`[SyncBridge] Restored user session from storage: ${currentUserId.substring(0, 8)}...`);
          const supabase = self.supabase;
          if (supabase && session.access_token) {
            supabase.setAuth(session.access_token, session.user.id);
            console.log("[SyncBridge] Set auth on Supabase client");
          }
        }
      }
      if (currentUserId) {
        const migrationCheck = await chrome.storage.local.get([
          "supabase_migration_complete",
          "supabase_migration_user"
        ]);
        if (!migrationCheck.supabase_migration_complete || migrationCheck.supabase_migration_user !== currentUserId) {
          console.log("[SyncBridge] Migration needed for current user");
        }
      }
    } catch (error) {
      console.error("[SyncBridge] Error checking session:", error);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        console.log("[SyncBridge] Back online - triggering sync");
        processPendingChanges();
      });
    }
    console.log("[SyncBridge] Initialized");
  }
  function startPeriodicSync(intervalMinutes = 5) {
    const intervalMs = intervalMinutes * 60 * 1e3;
    setInterval(async () => {
      if (navigator.onLine && currentUserId) {
        console.log("[SyncBridge] Running periodic sync...");
        await processPendingChanges();
      }
    }, intervalMs);
    console.log(`[SyncBridge] Periodic sync started (every ${intervalMinutes} minutes)`);
  }

  // src/background/service-worker.ts
  try {
    importScripts(
      "../lib/supabase/client.js",
      "../lib/supabase/auth.js",
      "../lib/supabase/local-cache.js",
      "../lib/supabase/sync.js",
      "../lib/supabase/storage.js"
    );
    console.log("[ServiceWorker] Supabase modules loaded");
  } catch (e) {
    console.error("[ServiceWorker] Failed to load Supabase modules:", e);
  }
  var LINKEDIN_DOMAIN = ".linkedin.com";
  var LINKEDIN_URL = "https://www.linkedin.com";
  var COOKIE_NAMES = {
    AUTH_TOKEN: "li_at",
    CSRF_TOKEN: "JSESSIONID",
    DATA_CENTER: "lidc",
    BROWSER_ID: "bcookie"
  };
  var STORAGE_KEYS = {
    AUTH_DATA: "linkedin_auth",
    PROFILE_DATA: "linkedin_profile",
    ANALYTICS_DATA: "linkedin_analytics",
    POST_ANALYTICS_DATA: "linkedin_post_analytics",
    AUDIENCE_DATA: "linkedin_audience",
    CONNECTIONS_DATA: "linkedin_connections",
    POSTS_DATA: "linkedin_posts",
    FEED_POSTS: "linkedin_feed_posts",
    MY_POSTS: "linkedin_my_posts",
    COMMENTS: "linkedin_comments",
    FOLLOWERS: "linkedin_followers",
    TRENDING: "linkedin_trending",
    CAPTURED_APIS: "captured_apis",
    SETTINGS: "extension_settings",
    AUTO_CAPTURE_LOG: "auto_capture_log",
    AUTO_CAPTURE_SETTINGS: "linkedin_capture_settings",
    ANALYTICS_HISTORY: "linkedin_analytics_history",
    AUDIENCE_HISTORY: "linkedin_audience_history",
    CAPTURE_STATS: "auto_capture_stats",
    // v4.0 Phase 5: Company data
    COMPANY_ANALYTICS: "linkedin_company_analytics",
    CONTENT_CALENDAR: "linkedin_content_calendar",
    // v4.1 - New data types from API interception
    NETWORK_DATA: "linkedin_network",
    INVITATIONS_DATA: "linkedin_invitations",
    NOTIFICATIONS_DATA: "linkedin_notifications",
    SEARCH_DATA: "linkedin_search",
    JOBS_DATA: "linkedin_jobs"
  };
  async function getLinkedInCookies() {
    try {
      const cookies = await chrome.cookies.getAll({ domain: LINKEDIN_DOMAIN });
      const cookieMap = {};
      cookies.forEach((cookie) => {
        cookieMap[cookie.name] = cookie.value;
      });
      return {
        success: true,
        cookies: cookieMap,
        authToken: cookieMap[COOKIE_NAMES.AUTH_TOKEN] || null,
        csrfToken: cookieMap[COOKIE_NAMES.CSRF_TOKEN] || null,
        isAuthenticated: !!cookieMap[COOKIE_NAMES.AUTH_TOKEN]
      };
    } catch (error) {
      console.error("[ServiceWorker] Error getting cookies:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        isAuthenticated: false
      };
    }
  }
  async function getLinkedInCookie(name) {
    try {
      const cookie = await chrome.cookies.get({ url: LINKEDIN_URL, name });
      return cookie ? cookie.value : null;
    } catch (error) {
      console.error(`[ServiceWorker] Error getting cookie ${name}:`, error);
      return null;
    }
  }
  async function checkAuthentication() {
    const authToken = await getLinkedInCookie(COOKIE_NAMES.AUTH_TOKEN);
    return {
      isAuthenticated: !!authToken,
      token: authToken
    };
  }
  async function saveToStorage(key, data, skipSync = false) {
    try {
      let userId = getCurrentUserId();
      const syncable = isSyncableKey(key);
      if (syncable && !userId) {
        console.log(`[ServiceWorker] No userId for syncable key ${key}, trying to restore from storage...`);
        const sessionResult = await chrome.storage.local.get("supabase_session");
        if (sessionResult.supabase_session?.user?.id) {
          const restoredUserId = sessionResult.supabase_session.user.id;
          console.log(`[ServiceWorker] Restored userId from storage: ${restoredUserId.substring(0, 8)}...`);
          setCurrentUserId(restoredUserId);
          if (self.supabase && sessionResult.supabase_session.access_token) {
            self.supabase.setAuth(sessionResult.supabase_session.access_token, restoredUserId);
            console.log(`[ServiceWorker] Set auth on Supabase client`);
          }
          userId = restoredUserId;
        }
      }
      console.log(`[ServiceWorker] saveToStorage: key=${key}, syncable=${syncable}, userId=${userId ? userId.substring(0, 8) + "..." : "null"}`);
      if (syncable && userId) {
        console.log(`[ServiceWorker] Using saveWithSync for ${key}`);
        const result = await saveWithSync(key, data, skipSync);
        if (!result.success) {
          console.error("[ServiceWorker] Sync save error:", result.error);
        }
        return result;
      }
      console.log(`[ServiceWorker] Direct storage for ${key} (no sync)`);
      await chrome.storage.local.set({ [key]: data });
      return { success: true };
    } catch (error) {
      console.error("[ServiceWorker] Storage save error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
  async function getFromStorage(key) {
    try {
      const result = await chrome.storage.local.get(key);
      return { success: true, data: result[key] || null };
    } catch (error) {
      console.error("[ServiceWorker] Storage get error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
  async function getAllStoredData() {
    try {
      const result = await chrome.storage.local.get(null);
      return { success: true, data: result };
    } catch (error) {
      console.error("[ServiceWorker] Storage get all error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
  async function clearStorage() {
    try {
      await chrome.storage.local.clear();
      return { success: true };
    } catch (error) {
      console.error("[ServiceWorker] Storage clear error:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
  async function addToAnalyticsHistory(analyticsData) {
    try {
      const existing = await getFromStorage(STORAGE_KEYS.ANALYTICS_HISTORY);
      let history = existing.data || [];
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const entry = {
        date: today,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        impressions: analyticsData.impressions || 0,
        membersReached: analyticsData.membersReached || 0,
        profileViews: 0,
        topPostsCount: analyticsData.topPosts?.length || 0
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
      console.error("[ServiceWorker] Error updating analytics history:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
  async function addToAudienceHistory(audienceData) {
    try {
      const existing = await getFromStorage(STORAGE_KEYS.AUDIENCE_HISTORY);
      let history = existing.data || [];
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const entry = {
        date: today,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        totalFollowers: audienceData.totalFollowers || 0,
        followerGrowth: audienceData.growthRate || 0,
        newFollowers: audienceData.newFollowers || 0
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
      console.error("[ServiceWorker] Error updating audience history:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
  async function updateCaptureStats(captureType, success) {
    try {
      const existing = await getFromStorage(STORAGE_KEYS.CAPTURE_STATS);
      const stats = existing.data || {
        totalCaptures: 0,
        successfulCaptures: 0,
        failedCaptures: 0,
        capturesByType: {},
        lastCapture: null,
        captureHistory: []
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
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      stats.captureHistory.push({
        type: captureType,
        success,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      stats.captureHistory = stats.captureHistory.slice(-50);
      await saveToStorage(STORAGE_KEYS.CAPTURE_STATS, stats);
      console.log(`[ServiceWorker] Capture stats updated: ${stats.totalCaptures} total`);
      return { success: true, data: { stats } };
    } catch (error) {
      console.error("[ServiceWorker] Error updating capture stats:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
  async function getAnalyticsGrowth() {
    try {
      const existing = await getFromStorage(STORAGE_KEYS.ANALYTICS_HISTORY);
      const history = existing.data || [];
      if (history.length < 2) {
        return { success: true, data: { growth: null, message: "Not enough data for growth calculation" } };
      }
      const latest = history[history.length - 1];
      const previous = history[history.length - 2];
      const growth = {
        impressionsChange: latest.impressions - previous.impressions,
        impressionsGrowth: previous.impressions > 0 ? ((latest.impressions - previous.impressions) / previous.impressions * 100).toFixed(2) : 0,
        membersReachedChange: latest.membersReached - previous.membersReached,
        profileViewsChange: latest.profileViews - previous.profileViews,
        period: `${previous.date} to ${latest.date}`
      };
      return { success: true, data: { growth } };
    } catch (error) {
      console.error("[ServiceWorker] Error calculating analytics growth:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
  async function getAudienceGrowth() {
    try {
      const existing = await getFromStorage(STORAGE_KEYS.AUDIENCE_HISTORY);
      const history = existing.data || [];
      if (history.length < 2) {
        return { success: true, data: { growth: null, message: "Not enough data for growth calculation" } };
      }
      const latest = history[history.length - 1];
      const oldest = history[0];
      const growth = {
        totalGrowth: latest.totalFollowers - oldest.totalFollowers,
        growthRate: oldest.totalFollowers > 0 ? ((latest.totalFollowers - oldest.totalFollowers) / oldest.totalFollowers * 100).toFixed(2) : 0,
        period: `${oldest.date} to ${latest.date}`,
        daysTracked: history.length
      };
      if (history.length >= 7) {
        const weekAgo = history[history.length - 7];
        growth.weeklyGrowth = latest.totalFollowers - weekAgo.totalFollowers;
        growth.weeklyGrowthRate = weekAgo.totalFollowers > 0 ? ((latest.totalFollowers - weekAgo.totalFollowers) / weekAgo.totalFollowers * 100).toFixed(2) : 0;
      }
      return { success: true, data: { growth } };
    } catch (error) {
      console.error("[ServiceWorker] Error calculating audience growth:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
  async function savePostAnalyticsToStorage(newData) {
    try {
      if (!newData?.activityUrn) {
        return { success: false, error: "No activity URN provided" };
      }
      const existing = await getFromStorage(
        STORAGE_KEYS.POST_ANALYTICS_DATA
      );
      const existingData = existing.data || { posts: [], stats: {} };
      let allPosts = existingData.posts || [];
      const existingIndex = allPosts.findIndex((p) => p.activityUrn === newData.activityUrn);
      if (existingIndex >= 0) {
        allPosts[existingIndex] = {
          ...allPosts[existingIndex],
          ...newData,
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
        };
      } else {
        allPosts.push({
          ...newData,
          firstCaptured: (/* @__PURE__ */ new Date()).toISOString(),
          lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
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
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString(),
        stats: {
          totalImpressions,
          totalReactions,
          totalComments,
          avgImpressions: allPosts.length > 0 ? Math.round(totalImpressions / allPosts.length) : 0,
          avgReactions: allPosts.length > 0 ? Math.round(totalReactions / allPosts.length) : 0
        }
      };
      await saveToStorage(STORAGE_KEYS.POST_ANALYTICS_DATA, postAnalyticsData);
      console.log(`[ServiceWorker] Post analytics saved: ${allPosts.length} posts, latest: ${newData.activityUrn}`);
      return {
        success: true,
        data: { totalCount: allPosts.length, isUpdate: existingIndex >= 0 }
      };
    } catch (error) {
      console.error("[ServiceWorker] Error saving post analytics:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
  async function saveAudienceDataToStorage(newData) {
    try {
      if (!newData) {
        return { success: false, error: "No audience data provided" };
      }
      const audienceData = {
        ...newData,
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      };
      await saveToStorage(STORAGE_KEYS.AUDIENCE_DATA, audienceData);
      console.log(`[ServiceWorker] Audience data saved: ${newData.totalFollowers} followers`);
      return { success: true, data: { totalFollowers: newData.totalFollowers } };
    } catch (error) {
      console.error("[ServiceWorker] Error saving audience data:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
  async function exportAsJSON() {
    const allData = await getAllStoredData();
    if (!allData.success) {
      return { success: false, error: allData.error };
    }
    const exportData = {
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      version: "4.0.0",
      data: allData.data
    };
    return {
      success: true,
      data: {
        content: JSON.stringify(exportData, null, 2),
        filename: `linkedin-data-${Date.now()}.json`
      }
    };
  }
  async function exportAsCSV(dataKey) {
    const result = await getFromStorage(dataKey);
    if (!result.success || !result.data) {
      return { success: false, error: "No data to export" };
    }
    const data = result.data;
    if (!Array.isArray(data) || data.length === 0) {
      return { success: false, error: "No data to export" };
    }
    const allKeys = /* @__PURE__ */ new Set();
    data.forEach((item) => {
      if (typeof item === "object" && item !== null) {
        Object.keys(item).forEach((key) => allKeys.add(key));
      }
    });
    const headers = Array.from(allKeys);
    const csvRows = [headers.join(",")];
    data.forEach((item) => {
      const row = headers.map((header) => {
        const value = item[header];
        if (value === null || value === void 0)
          return "";
        if (typeof value === "object")
          return JSON.stringify(value).replace(/"/g, '""');
        return String(value).replace(/"/g, '""');
      });
      csvRows.push(row.map((v) => `"${v}"`).join(","));
    });
    return {
      success: true,
      data: {
        content: csvRows.join("\n"),
        filename: `linkedin-${dataKey}-${Date.now()}.csv`
      }
    };
  }
  function generateUUID2() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log("[ServiceWorker] Received message:", message.type);
    (async () => {
      let response;
      switch (message.type) {
        case "GET_COOKIES":
          response = await getLinkedInCookies();
          break;
        case "CHECK_AUTH":
          response = { success: true, data: await checkAuthentication() };
          break;
        case "SAVE_DATA":
          response = await saveToStorage(message.key, message.data);
          break;
        case "GET_DATA":
          response = await getFromStorage(message.key);
          break;
        case "GET_ALL_DATA":
          response = await getAllStoredData();
          break;
        case "CLEAR_DATA":
          response = await clearStorage();
          break;
        case "AUTO_CAPTURE_CREATOR_ANALYTICS": {
          console.log("[ServiceWorker] AUTO_CAPTURE_CREATOR_ANALYTICS received");
          const analyticsData = message.data;
          response = await saveToStorage(STORAGE_KEYS.ANALYTICS_DATA, {
            ...analyticsData,
            page_type: "creator_analytics",
            source: "auto_capture",
            lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
          });
          await addToAnalyticsHistory(analyticsData);
          await updateCaptureStats("creator_analytics", true);
          try {
            await recordAnalyticsTrends(analyticsData);
            await logCapture("creator_analytics", JSON.stringify(analyticsData).length, true);
          } catch (error) {
            console.error("[ServiceWorker] Error recording analytics trends:", error);
          }
          const impressions = analyticsData.impressions?.toLocaleString() || "";
          await showCaptureNotification("creator_analytics", impressions ? `${impressions} impressions` : void 0);
          break;
        }
        case "AUTO_CAPTURE_POST_ANALYTICS": {
          console.log("[ServiceWorker] AUTO_CAPTURE_POST_ANALYTICS received");
          const postData = message.data;
          response = await savePostAnalyticsToStorage(postData);
          await updateCaptureStats("post_analytics", response.success);
          await showCaptureNotification("post_analytics", postData.impressions?.toLocaleString() || void 0);
          break;
        }
        case "AUTO_CAPTURE_AUDIENCE": {
          console.log("[ServiceWorker] AUTO_CAPTURE_AUDIENCE received");
          const audienceData = message.data;
          response = await saveAudienceDataToStorage(audienceData);
          await addToAudienceHistory(audienceData);
          await updateCaptureStats("audience_analytics", response.success);
          try {
            if (audienceData.totalFollowers) {
              await recordProfileTrends({ followers_count: audienceData.totalFollowers });
            }
            await logCapture("audience_analytics", JSON.stringify(audienceData).length, response.success);
          } catch (error) {
            console.error("[ServiceWorker] Error recording audience trends:", error);
          }
          const followers = audienceData.totalFollowers?.toLocaleString() || "";
          await showCaptureNotification("audience_analytics", followers ? `${followers} followers` : void 0);
          break;
        }
        case "AUTO_CAPTURE_AUDIENCE_DEMOGRAPHICS": {
          console.log("[ServiceWorker] AUTO_CAPTURE_AUDIENCE_DEMOGRAPHICS received");
          const existingAudience = await getFromStorage(STORAGE_KEYS.AUDIENCE_DATA);
          const audienceWithDemographics = {
            ...existingAudience.data || {},
            demographics: message.data?.demographics || message.data,
            demographicsUpdated: (/* @__PURE__ */ new Date()).toISOString()
          };
          response = await saveAudienceDataToStorage(audienceWithDemographics);
          await updateCaptureStats("audience_demographics", response.success);
          break;
        }
        case "AUTO_CAPTURE_POST_DEMOGRAPHICS": {
          console.log("[ServiceWorker] AUTO_CAPTURE_POST_DEMOGRAPHICS received");
          const pageInfo = message.data?.pageInfo;
          if (pageInfo?.identifier) {
            const postUrn = `urn:li:activity:${pageInfo.identifier}`;
            const existingPostAnalytics = await getFromStorage(
              STORAGE_KEYS.POST_ANALYTICS_DATA
            );
            const posts = existingPostAnalytics.data?.posts || [];
            const postIndex = posts.findIndex((p) => p.activityUrn === postUrn);
            if (postIndex >= 0) {
              posts[postIndex].demographics = message.data?.demographics;
              posts[postIndex].demographicsUpdated = (/* @__PURE__ */ new Date()).toISOString();
              await saveToStorage(STORAGE_KEYS.POST_ANALYTICS_DATA, {
                ...existingPostAnalytics.data,
                posts,
                lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
              });
            }
          }
          response = { success: true };
          await updateCaptureStats("post_demographics", true);
          break;
        }
        case "AUTO_CAPTURE_PROFILE_VIEWS": {
          console.log("[ServiceWorker] AUTO_CAPTURE_PROFILE_VIEWS received");
          const existingAnalytics = await getFromStorage(STORAGE_KEYS.ANALYTICS_DATA);
          const profileViewsData = message.data;
          response = await saveToStorage(STORAGE_KEYS.ANALYTICS_DATA, {
            ...existingAnalytics.data || {},
            profileViews: profileViewsData?.totalViews || profileViewsData?.profileViews,
            profileViewsData: message.data,
            profileViewsUpdated: (/* @__PURE__ */ new Date()).toISOString()
          });
          await updateCaptureStats("profile_views", response.success);
          break;
        }
        case "AUTO_CAPTURE_PROFILE": {
          console.log("[ServiceWorker] AUTO_CAPTURE_PROFILE received");
          const profileData = message.data;
          response = await saveToStorage(STORAGE_KEYS.PROFILE_DATA, {
            ...profileData,
            source: "auto_capture",
            lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
          });
          await updateCaptureStats("profile", true);
          try {
            await recordProfileTrends(profileData);
            await logCapture("profile", JSON.stringify(profileData).length, true);
          } catch (error) {
            console.error("[ServiceWorker] Error recording profile trends:", error);
          }
          const followers = profileData.followers_count?.toLocaleString() || "";
          await showCaptureNotification("profile", followers ? `${followers} followers` : void 0);
          break;
        }
        case "AUTO_CAPTURE_COMPANY_ANALYTICS": {
          console.log("[ServiceWorker] AUTO_CAPTURE_COMPANY_ANALYTICS received");
          const companyData = message.data;
          const existingCompanies = await getFromStorage(
            STORAGE_KEYS.COMPANY_ANALYTICS
          );
          const companies = existingCompanies.data || {};
          if (companyData.companyId) {
            companies[companyData.companyId] = {
              ...companyData,
              capturedAt: Date.now()
            };
          }
          response = await saveToStorage(STORAGE_KEYS.COMPANY_ANALYTICS, companies);
          await updateCaptureStats("company_analytics", response.success);
          try {
            await logCapture("company_analytics", JSON.stringify(companyData).length, response.success);
          } catch (error) {
            console.error("[ServiceWorker] Error logging company capture:", error);
          }
          const followers = companyData.followers?.toLocaleString() || "";
          await showCaptureNotification("company_analytics", followers ? `${followers} followers` : companyData.companyName);
          break;
        }
        case "AUTO_CAPTURE_CONTENT_CALENDAR": {
          console.log("[ServiceWorker] AUTO_CAPTURE_CONTENT_CALENDAR received");
          const calendarData = message.data;
          const existingCalendars = await getFromStorage(
            STORAGE_KEYS.CONTENT_CALENDAR
          );
          const calendars = existingCalendars.data || {};
          const calendarKey = calendarData.companyId || "personal";
          calendars[calendarKey] = {
            ...calendarData,
            capturedAt: Date.now()
          };
          response = await saveToStorage(STORAGE_KEYS.CONTENT_CALENDAR, calendars);
          await updateCaptureStats("content_calendar", response.success);
          try {
            await logCapture("content_calendar", JSON.stringify(calendarData).length, response.success);
          } catch (error) {
            console.error("[ServiceWorker] Error logging calendar capture:", error);
          }
          const postCount = calendarData.items?.length || 0;
          await showCaptureNotification("content_calendar", `${postCount} posts`);
          break;
        }
        case "GET_COMPANY_ANALYTICS": {
          console.log("[ServiceWorker] GET_COMPANY_ANALYTICS received");
          const companyId = message.data?.companyId;
          try {
            const companies = await getFromStorage(
              STORAGE_KEYS.COMPANY_ANALYTICS
            );
            if (companyId && companies.data) {
              response = { success: true, data: companies.data[companyId] || null };
            } else {
              response = { success: true, data: companies.data || {} };
            }
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "GET_CONTENT_CALENDAR": {
          console.log("[ServiceWorker] GET_CONTENT_CALENDAR received");
          const calendarKey = message.data?.companyId || "personal";
          try {
            const calendars = await getFromStorage(
              STORAGE_KEYS.CONTENT_CALENDAR
            );
            if (calendars.data && calendars.data[calendarKey]) {
              response = { success: true, data: calendars.data[calendarKey] };
            } else {
              response = { success: true, data: null };
            }
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "AUTO_CAPTURE_LOG": {
          console.log("[ServiceWorker] AUTO_CAPTURE_LOG:", message.data?.pageType);
          const captureLog = await getFromStorage(STORAGE_KEYS.AUTO_CAPTURE_LOG);
          const logs = captureLog.data || [];
          logs.push({
            ...message.data,
            loggedAt: (/* @__PURE__ */ new Date()).toISOString()
          });
          response = await saveToStorage(STORAGE_KEYS.AUTO_CAPTURE_LOG, logs.slice(-100));
          break;
        }
        case "GET_ANALYTICS_GROWTH":
          response = await getAnalyticsGrowth();
          break;
        case "GET_AUDIENCE_GROWTH":
          response = await getAudienceGrowth();
          break;
        case "GET_CAPTURE_STATS":
          response = await getFromStorage(STORAGE_KEYS.CAPTURE_STATS);
          break;
        case "EXPORT_JSON":
          response = await exportAsJSON();
          break;
        case "EXPORT_CSV":
          response = await exportAsCSV(message.key);
          break;
        case "GET_TREND_DATA": {
          console.log("[ServiceWorker] GET_TREND_DATA received");
          const days = message.data?.days || 30;
          try {
            const trendData = await getTrendDataForCharts(days);
            response = { success: true, data: trendData };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "GET_TREND_SUMMARY": {
          console.log("[ServiceWorker] GET_TREND_SUMMARY received");
          const summaryDays = message.data?.days || 7;
          try {
            const summary = await getTrendSummary(summaryDays);
            response = { success: true, data: summary };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "EXPORT_TRENDS_CSV": {
          console.log("[ServiceWorker] EXPORT_TRENDS_CSV received");
          const csvDays = message.data?.days || 90;
          try {
            const csv = await exportTrendsAsCSV(csvDays);
            response = {
              success: true,
              data: {
                content: csv,
                filename: `linkedin-trends-${Date.now()}.csv`
              }
            };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "EXPORT_TRENDS_JSON": {
          console.log("[ServiceWorker] EXPORT_TRENDS_JSON received");
          const jsonDays = message.data?.days || 90;
          try {
            const json = await exportTrendsAsJSON(jsonDays);
            response = {
              success: true,
              data: {
                content: json,
                filename: `linkedin-trends-${Date.now()}.json`
              }
            };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "EXPORT_CAPTURE_LOGS": {
          console.log("[ServiceWorker] EXPORT_CAPTURE_LOGS received");
          const limit = message.data?.limit || 100;
          try {
            const logsCSV = await exportCaptureLogsAsCSV(limit);
            response = {
              success: true,
              data: {
                content: logsCSV,
                filename: `linkedin-capture-logs-${Date.now()}.csv`
              }
            };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "EXPORT_FULL_BACKUP": {
          console.log("[ServiceWorker] EXPORT_FULL_BACKUP received");
          try {
            const backup = await exportFullBackup();
            response = {
              success: true,
              data: {
                content: backup,
                filename: `linkedin-full-backup-${Date.now()}.json`
              }
            };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "GET_STORAGE_STATS": {
          console.log("[ServiceWorker] GET_STORAGE_STATS received");
          try {
            const stats = await getStorageStats();
            response = { success: true, data: stats };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "RUN_MAINTENANCE": {
          console.log("[ServiceWorker] RUN_MAINTENANCE received");
          try {
            await runMaintenance();
            response = { success: true, data: { message: "Maintenance completed" } };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "GET_BACKUP_SCHEDULE": {
          console.log("[ServiceWorker] GET_BACKUP_SCHEDULE received");
          try {
            const schedule = await getBackupSchedule();
            response = { success: true, data: schedule };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "UPDATE_BACKUP_SCHEDULE": {
          console.log("[ServiceWorker] UPDATE_BACKUP_SCHEDULE received");
          try {
            const newSchedule = message.data;
            await updateBackupSchedule(newSchedule);
            response = { success: true, data: { message: "Backup schedule updated" } };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "GET_ALERT_CONFIGS": {
          console.log("[ServiceWorker] GET_ALERT_CONFIGS received");
          try {
            const configs = await getAlertConfigs();
            response = { success: true, data: configs };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "SAVE_ALERT_CONFIG": {
          console.log("[ServiceWorker] SAVE_ALERT_CONFIG received");
          try {
            const config = message.data;
            await upsertAlertConfig(config);
            response = { success: true, data: { message: "Alert config saved" } };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "DELETE_ALERT_CONFIG": {
          console.log("[ServiceWorker] DELETE_ALERT_CONFIG received");
          try {
            const alertId = message.data.id;
            await deleteAlertConfig(alertId);
            response = { success: true, data: { message: "Alert config deleted" } };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "GET_NOTIFICATION_SETTINGS": {
          console.log("[ServiceWorker] GET_NOTIFICATION_SETTINGS received");
          try {
            const settings = await getNotificationSettings();
            response = { success: true, data: settings };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "SAVE_NOTIFICATION_SETTINGS": {
          console.log("[ServiceWorker] SAVE_NOTIFICATION_SETTINGS received");
          try {
            const settings = message.data;
            await saveNotificationSettings(settings);
            response = { success: true, data: { message: "Notification settings saved" } };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "GET_ALL_ALARMS": {
          console.log("[ServiceWorker] GET_ALL_ALARMS received");
          try {
            const alarms = await getAllAlarms();
            response = { success: true, data: alarms };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "TRIGGER_MANUAL_BACKUP": {
          console.log("[ServiceWorker] TRIGGER_MANUAL_BACKUP received");
          try {
            const backup = await exportFullBackup();
            const size = new Blob([backup]).size;
            const backupId = `backup-${Date.now()}`;
            await saveToStorage(`backup_${backupId}`, {
              id: backupId,
              timestamp: Date.now(),
              size,
              type: "manual",
              data: backup
            });
            await showBackupSuccessNotification("manual", size);
            response = {
              success: true,
              data: { backupId, size, content: backup }
            };
          } catch (error) {
            await showBackupFailureNotification(error instanceof Error ? error.message : "Unknown error");
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "SUPABASE_AUTH_STATUS": {
          console.log("[ServiceWorker] SUPABASE_AUTH_STATUS received");
          try {
            const syncStatus = await getSyncStatusInfo();
            const session = await chrome.storage.local.get("supabase_session");
            response = {
              success: true,
              data: {
                isConfigured: true,
                isAuthenticated: syncStatus.isAuthenticated,
                userId: syncStatus.userId,
                user: session.supabase_session?.user || null,
                pendingCount: syncStatus.pendingCount,
                lastSyncTime: syncStatus.lastSyncTime,
                isSyncing: syncStatus.isSyncing
              }
            };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "SUPABASE_AUTH_SIGN_IN": {
          console.log("[ServiceWorker] SUPABASE_AUTH_SIGN_IN received");
          try {
            const { email, password } = message.data;
            const supabaseAuth = self.supabaseAuth;
            if (!supabaseAuth) {
              response = { success: false, error: "Supabase auth not initialized" };
              break;
            }
            const result = await supabaseAuth.signIn(email, password);
            if (result.success && result.user) {
              setCurrentUserId(result.user.id);
              const migrationCheck = await chrome.storage.local.get([
                "supabase_migration_complete",
                "supabase_migration_user"
              ]);
              if (!migrationCheck.supabase_migration_complete || migrationCheck.supabase_migration_user !== result.user.id) {
                console.log("[ServiceWorker] First sign-in - running data migration");
                await migrateExistingData();
              }
            }
            response = { success: result.success, data: result, error: result.error };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "SUPABASE_AUTH_SIGN_UP": {
          console.log("[ServiceWorker] SUPABASE_AUTH_SIGN_UP received");
          try {
            const { email, password } = message.data;
            const supabaseAuth = self.supabaseAuth;
            if (!supabaseAuth) {
              response = { success: false, error: "Supabase auth not initialized" };
              break;
            }
            const result = await supabaseAuth.signUp(email, password);
            if (result.success && result.user) {
              setCurrentUserId(result.user.id);
            }
            response = { success: result.success, data: result, error: result.error };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "SUPABASE_AUTH_SIGN_OUT": {
          console.log("[ServiceWorker] SUPABASE_AUTH_SIGN_OUT received");
          try {
            const supabaseAuth = self.supabaseAuth;
            if (supabaseAuth) {
              await supabaseAuth.signOut();
            }
            setCurrentUserId(null);
            response = { success: true };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "SUPABASE_SYNC_STATUS": {
          console.log("[ServiceWorker] SUPABASE_SYNC_STATUS received");
          try {
            const syncStatus = await getSyncStatusInfo();
            response = { success: true, data: syncStatus };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "SUPABASE_SYNC_NOW": {
          console.log("[ServiceWorker] SUPABASE_SYNC_NOW received");
          try {
            const result = await processPendingChanges();
            response = { success: true, data: result };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "SUPABASE_FULL_SYNC": {
          console.log("[ServiceWorker] SUPABASE_FULL_SYNC received");
          try {
            const migrationResult = await migrateExistingData();
            response = { success: true, data: migrationResult };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "SUPABASE_MIGRATE_DATA": {
          console.log("[ServiceWorker] SUPABASE_MIGRATE_DATA received");
          try {
            const result = await migrateExistingData();
            response = { success: true, data: result };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "DEBUG_AUTH_RESTORE": {
          console.log("[ServiceWorker] DEBUG_AUTH_RESTORE received");
          try {
            const currentState = {
              currentUserId: getCurrentUserId(),
              supabaseAvailable: !!self.supabase,
              supabaseAuthAvailable: !!self.supabaseAuth
            };
            console.log("[DEBUG] Current state:", currentState);
            const storageResult = await chrome.storage.local.get(["supabase_session", "linkedin_profile"]);
            console.log("[DEBUG] Storage session:", storageResult.supabase_session ? "found" : "not found");
            console.log("[DEBUG] Storage profile:", storageResult.linkedin_profile ? "found" : "not found");
            if (storageResult.supabase_session?.user?.id) {
              const userId = storageResult.supabase_session.user.id;
              console.log("[DEBUG] Restoring user ID:", userId);
              setCurrentUserId(userId);
              if (self.supabase && storageResult.supabase_session.access_token) {
                self.supabase.setAuth(storageResult.supabase_session.access_token, userId);
                console.log("[DEBUG] Set auth on Supabase client");
              }
            }
            if (storageResult.linkedin_profile && getCurrentUserId()) {
              console.log("[DEBUG] Queuing profile for sync...");
              await queueForSync("linkedin_profile", storageResult.linkedin_profile);
              const syncResult = await processPendingChanges();
              console.log("[DEBUG] Sync result:", syncResult);
              response = {
                success: true,
                data: {
                  ...currentState,
                  restoredUserId: getCurrentUserId(),
                  syncResult,
                  profileData: storageResult.linkedin_profile
                }
              };
            } else {
              response = {
                success: true,
                data: {
                  ...currentState,
                  restoredUserId: getCurrentUserId(),
                  error: !storageResult.linkedin_profile ? "No profile data" : "No user ID"
                }
              };
            }
          } catch (error) {
            console.error("[DEBUG] Error:", error);
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "DEBUG_CLEAR_PENDING": {
          console.log("[ServiceWorker] DEBUG_CLEAR_PENDING received");
          try {
            const pendingResult = await chrome.storage.local.get("supabase_pending_changes");
            const pendingCount = (pendingResult.supabase_pending_changes || []).length;
            await chrome.storage.local.set({ supabase_pending_changes: [] });
            response = {
              success: true,
              data: {
                clearedCount: pendingCount,
                message: `Cleared ${pendingCount} pending changes`
              }
            };
          } catch (error) {
            console.error("[DEBUG] Error clearing pending:", error);
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "DEBUG_GET_PENDING": {
          console.log("[ServiceWorker] DEBUG_GET_PENDING received");
          try {
            const pendingResult = await chrome.storage.local.get("supabase_pending_changes");
            const pending = pendingResult.supabase_pending_changes || [];
            response = {
              success: true,
              data: {
                count: pending.length,
                changes: pending
              }
            };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "GOOGLE_AUTH_STATUS": {
          console.log("[ServiceWorker] GOOGLE_AUTH_STATUS received");
          try {
            const authState = await getAuthState();
            response = { success: true, data: authState };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "GOOGLE_AUTH_START": {
          console.log("[ServiceWorker] GOOGLE_AUTH_START received");
          try {
            const authState = await startAuthFlow();
            response = { success: true, data: authState };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "GOOGLE_AUTH_LOGOUT": {
          console.log("[ServiceWorker] GOOGLE_AUTH_LOGOUT received");
          try {
            await logout();
            response = { success: true };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "DRIVE_SYNC_NOW": {
          console.log("[ServiceWorker] DRIVE_SYNC_NOW received");
          try {
            const backupFile = await syncNow();
            response = { success: true, data: backupFile };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "DRIVE_SYNC_STATUS": {
          console.log("[ServiceWorker] DRIVE_SYNC_STATUS received");
          try {
            const status = await getSyncStatus();
            const settings = await getSyncSettings();
            response = { success: true, data: { status, settings } };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "DRIVE_GET_BACKUPS": {
          console.log("[ServiceWorker] DRIVE_GET_BACKUPS received");
          try {
            const backups = await listBackups();
            response = { success: true, data: backups };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "DRIVE_RESTORE_BACKUP": {
          console.log("[ServiceWorker] DRIVE_RESTORE_BACKUP received");
          try {
            const fileId = message.data.fileId;
            await restoreBackup(fileId);
            response = { success: true };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "DRIVE_DELETE_BACKUP": {
          console.log("[ServiceWorker] DRIVE_DELETE_BACKUP received");
          try {
            const fileId = message.data.fileId;
            await deleteBackup(fileId);
            response = { success: true };
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "CREATE_LINKEDIN_POST": {
          console.log("[ServiceWorker] CREATE_LINKEDIN_POST received");
          try {
            const postData = message.data;
            const cookies = await getLinkedInCookies();
            if (!cookies.isAuthenticated) {
              response = { success: false, error: "Not authenticated to LinkedIn. Please log in first." };
              break;
            }
            const csrfToken = cookies.csrfToken?.replace(/"/g, "") || "";
            const postPayload = {
              visibleToGuest: postData.visibility === "PUBLIC",
              externalAudienceProviders: [],
              commentaryV2: {
                text: postData.content,
                attributes: []
              },
              origin: "FEED",
              allowedCommentersScope: "ALL",
              postState: "PUBLISHED"
            };
            const postResponse = await fetch("https://www.linkedin.com/voyager/api/contentcreation/normShares", {
              method: "POST",
              headers: {
                "accept": "application/vnd.linkedin.normalized+json+2.1",
                "accept-language": "en-US,en;q=0.9",
                "content-type": "application/json; charset=UTF-8",
                "csrf-token": csrfToken,
                "x-li-lang": "en_US",
                "x-li-page-instance": "urn:li:page:feed_index_logged_in;" + generateUUID2(),
                "x-li-track": JSON.stringify({
                  clientVersion: "1.13.8960",
                  mpVersion: "1.13.8960",
                  osName: "web",
                  timezoneOffset: (/* @__PURE__ */ new Date()).getTimezoneOffset() / -60,
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  deviceFormFactor: "DESKTOP",
                  mpName: "voyager-web"
                }),
                "x-restli-protocol-version": "2.0.0"
              },
              credentials: "include",
              body: JSON.stringify(postPayload)
            });
            if (!postResponse.ok) {
              const errorText = await postResponse.text();
              console.error("[ServiceWorker] Post creation failed:", postResponse.status, errorText);
              response = {
                success: false,
                error: `Failed to create post (${postResponse.status}). Try posting from LinkedIn directly.`
              };
              break;
            }
            const result = await postResponse.json();
            console.log("[ServiceWorker] Post created successfully:", result);
            const existingPosts = await getFromStorage("quick_posts_history");
            const posts = existingPosts.data || [];
            posts.unshift({
              id: Date.now().toString(),
              content: postData.content.substring(0, 100),
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              postId: result.data?.value?.urn || null
            });
            await saveToStorage("quick_posts_history", posts.slice(0, 50));
            response = {
              success: true,
              data: {
                message: "Post created successfully!",
                postId: result.data?.value?.urn
              }
            };
          } catch (error) {
            console.error("[ServiceWorker] Error creating post:", error);
            response = {
              success: false,
              error: error instanceof Error ? error.message : "Failed to create post"
            };
          }
          break;
        }
        // ============================================
        // API INTERCEPTION MESSAGE HANDLERS (v4.1)
        // ============================================
        case "PROFILE_CAPTURED": {
          console.log("[ServiceWorker] PROFILE_CAPTURED received");
          try {
            const profileData = message.data;
            response = await saveToStorage(STORAGE_KEYS.PROFILE_DATA, {
              ...profileData,
              source: "api_interception",
              lastUpdated: new Date().toISOString()
            });
            await updateCaptureStats("profile_api", response.success);
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "ANALYTICS_CAPTURED": {
          console.log("[ServiceWorker] ANALYTICS_CAPTURED received");
          try {
            const analyticsData = message.data;
            response = await saveToStorage(STORAGE_KEYS.ANALYTICS_DATA, {
              ...analyticsData,
              source: "api_interception",
              lastUpdated: new Date().toISOString()
            });
            await addToAnalyticsHistory(analyticsData);
            await updateCaptureStats("analytics_api", response.success);
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "POST_ANALYTICS_CAPTURED": {
          console.log("[ServiceWorker] POST_ANALYTICS_CAPTURED received");
          try {
            const postData = message.data;
            response = await savePostAnalyticsToStorage(postData);
            await updateCaptureStats("post_analytics_api", response.success);
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "AUDIENCE_DATA_CAPTURED": {
          console.log("[ServiceWorker] AUDIENCE_DATA_CAPTURED received");
          try {
            const audienceData = message.data;
            response = await saveAudienceDataToStorage(audienceData);
            await addToAudienceHistory(audienceData);
            await updateCaptureStats("audience_api", response.success);
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "API_CAPTURED": {
          console.log("[ServiceWorker] API_CAPTURED received:", message.endpoint);
          try {
            const existing = await getFromStorage(STORAGE_KEYS.CAPTURED_APIS);
            const apis = existing.data || [];
            apis.push({
              endpoint: message.endpoint,
              category: message.category,
              queryId: message.queryId,
              url: message.url,
              capturedAt: new Date().toISOString()
            });
            // Keep last 500 API captures
            response = await saveToStorage(STORAGE_KEYS.CAPTURED_APIS, apis.slice(-500));
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "SAVE_FEED_POSTS": {
          console.log("[ServiceWorker] SAVE_FEED_POSTS received");
          try {
            const posts = message.posts || [];
            const existing = await getFromStorage(STORAGE_KEYS.FEED_POSTS);
            const existingPosts = existing.data?.posts || [];

            // Merge and deduplicate by URN
            const postMap = new Map();
            existingPosts.forEach(p => p.urn && postMap.set(p.urn, p));
            posts.forEach(p => p.urn && postMap.set(p.urn, { ...postMap.get(p.urn) || {}, ...p }));

            const mergedPosts = Array.from(postMap.values()).slice(-200);
            response = await saveToStorage(STORAGE_KEYS.FEED_POSTS, {
              posts: mergedPosts,
              lastUpdated: new Date().toISOString()
            });
            await updateCaptureStats("feed_posts", response.success);
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "SAVE_COMMENTS": {
          console.log("[ServiceWorker] SAVE_COMMENTS received");
          try {
            const comments = message.comments || [];
            const existing = await getFromStorage(STORAGE_KEYS.COMMENTS);
            const existingComments = existing.data?.comments || [];

            // Merge and deduplicate
            const commentMap = new Map();
            existingComments.forEach(c => c.urn && commentMap.set(c.urn, c));
            comments.forEach(c => c.urn && commentMap.set(c.urn, { ...commentMap.get(c.urn) || {}, ...c }));

            const mergedComments = Array.from(commentMap.values()).slice(-500);
            response = await saveToStorage(STORAGE_KEYS.COMMENTS, {
              comments: mergedComments,
              lastUpdated: new Date().toISOString()
            });
            await updateCaptureStats("comments", response.success);
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "SAVE_MY_POSTS": {
          console.log("[ServiceWorker] SAVE_MY_POSTS received");
          try {
            const posts = message.posts || [];
            const existing = await getFromStorage(STORAGE_KEYS.MY_POSTS);
            const existingPosts = existing.data?.posts || [];

            // Merge and deduplicate by URN
            const postMap = new Map();
            existingPosts.forEach(p => p.urn && postMap.set(p.urn, p));
            posts.forEach(p => p.urn && postMap.set(p.urn, { ...postMap.get(p.urn) || {}, ...p }));

            const mergedPosts = Array.from(postMap.values()).slice(-100);
            response = await saveToStorage(STORAGE_KEYS.MY_POSTS, {
              posts: mergedPosts,
              lastUpdated: new Date().toISOString()
            });
            await updateCaptureStats("my_posts", response.success);
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "SAVE_FOLLOWERS": {
          console.log("[ServiceWorker] SAVE_FOLLOWERS received");
          try {
            const data = message.data || {};
            response = await saveToStorage(STORAGE_KEYS.FOLLOWERS, {
              ...data,
              lastUpdated: new Date().toISOString()
            });
            await updateCaptureStats("followers", response.success);
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "SAVE_TRENDING": {
          console.log("[ServiceWorker] SAVE_TRENDING received");
          try {
            const topics = message.topics || [];
            response = await saveToStorage(STORAGE_KEYS.TRENDING, {
              topics: topics,
              lastUpdated: new Date().toISOString()
            });
            await updateCaptureStats("trending", response.success);
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "SAVE_NETWORK_DATA": {
          console.log("[ServiceWorker] SAVE_NETWORK_DATA received");
          try {
            const data = message.data || {};
            const existing = await getFromStorage(STORAGE_KEYS.NETWORK_DATA);
            const existingConnections = existing.data?.connections || [];
            const existingSuggestions = existing.data?.suggestions || [];

            // Merge connections
            const connMap = new Map();
            existingConnections.forEach(c => c.publicIdentifier && connMap.set(c.publicIdentifier, c));
            (data.connections || []).forEach(c => c.publicIdentifier && connMap.set(c.publicIdentifier, { ...connMap.get(c.publicIdentifier) || {}, ...c }));

            // Merge suggestions
            const suggMap = new Map();
            existingSuggestions.forEach(s => s.publicIdentifier && suggMap.set(s.publicIdentifier, s));
            (data.suggestions || []).forEach(s => s.publicIdentifier && suggMap.set(s.publicIdentifier, { ...suggMap.get(s.publicIdentifier) || {}, ...s }));

            response = await saveToStorage(STORAGE_KEYS.NETWORK_DATA, {
              connections: Array.from(connMap.values()).slice(-500),
              suggestions: Array.from(suggMap.values()).slice(-100),
              lastUpdated: new Date().toISOString()
            });
            await updateCaptureStats("network", response.success);
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        case "SAVE_INVITATIONS_DATA": {
          console.log("[ServiceWorker] SAVE_INVITATIONS_DATA received");
          try {
            const data = message.data || {};
            response = await saveToStorage(STORAGE_KEYS.INVITATIONS_DATA, {
              received: data.received || [],
              sent: data.sent || [],
              summary: data.summary || {},
              lastUpdated: new Date().toISOString()
            });
            await updateCaptureStats("invitations", response.success);
          } catch (error) {
            response = { success: false, error: error instanceof Error ? error.message : "Unknown error" };
          }
          break;
        }
        default:
          response = { success: false, error: "Unknown message type" };
      }
      sendResponse(response);
    })();
    return true;
  });
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
  async function handleScheduledBackup() {
    console.log("[ServiceWorker] Running scheduled backup...");
    try {
      const backup = await exportFullBackup();
      const size = new Blob([backup]).size;
      const backupId = `backup-${Date.now()}`;
      await saveToStorage(`backup_${backupId}`, {
        id: backupId,
        timestamp: Date.now(),
        size,
        type: "scheduled",
        data: backup
      });
      const schedule = await getBackupSchedule();
      schedule.lastBackup = Date.now();
      await updateBackupSchedule(schedule);
      await showBackupSuccessNotification("scheduled", size);
      console.log(`[ServiceWorker] Scheduled backup completed: ${size} bytes`);
    } catch (error) {
      console.error("[ServiceWorker] Scheduled backup failed:", error);
      await showBackupFailureNotification(error instanceof Error ? error.message : "Unknown error");
    }
  }
  async function handleMaintenanceAlarm() {
    console.log("[ServiceWorker] Running maintenance...");
    try {
      await runMaintenance();
      console.log("[ServiceWorker] Maintenance completed");
    } catch (error) {
      console.error("[ServiceWorker] Maintenance failed:", error);
    }
  }
  async function handleAlertCheck() {
    console.log("[ServiceWorker] Checking alerts...");
    try {
      const alerts = await getAlertConfigs();
      const triggered = await checkAlerts(alerts);
      if (triggered.length > 0) {
        console.log(`[ServiceWorker] ${triggered.length} alerts triggered`);
        const summary = await getTrendSummary(7);
        const alertsWithValues = triggered.map((alert) => {
          const typeKey = alert.type;
          const stats = summary[typeKey] || { current: 0, changePercent: 0 };
          return {
            alert,
            currentValue: stats.current,
            changePercent: stats.changePercent
          };
        });
        await showMultipleGrowthAlerts(alertsWithValues);
        for (const alert of triggered) {
          await markAlertTriggered(alert.id);
        }
      }
    } catch (error) {
      console.error("[ServiceWorker] Alert check failed:", error);
    }
  }
  chrome.runtime.onInstalled.addListener(async (details) => {
    console.log("[ServiceWorker] Extension installed:", details.reason);
    try {
      await initHistoryManager();
      console.log("[ServiceWorker] IndexedDB initialized");
    } catch (error) {
      console.error("[ServiceWorker] Failed to initialize IndexedDB:", error);
    }
    try {
      await initializeAlarms();
      console.log("[ServiceWorker] Alarms initialized");
    } catch (error) {
      console.error("[ServiceWorker] Failed to initialize alarms:", error);
    }
    setupNotificationListeners();
    saveToStorage(STORAGE_KEYS.SETTINGS, {
      autoCapture: true,
      captureProfiles: true,
      captureAnalytics: true,
      captureConnections: true,
      maxStoredApis: 1e3
    });
  });
  chrome.runtime.onStartup.addListener(async () => {
    console.log("[ServiceWorker] Browser started");
    try {
      await initHistoryManager();
      console.log("[ServiceWorker] IndexedDB initialized on startup");
      await runMaintenance();
    } catch (error) {
      console.error("[ServiceWorker] Startup initialization error:", error);
    }
    try {
      await initializeAlarms();
      console.log("[ServiceWorker] Alarms initialized on startup");
    } catch (error) {
      console.error("[ServiceWorker] Alarms initialization error:", error);
    }
    setupNotificationListeners();
  });
  (async () => {
    try {
      await initHistoryManager();
      console.log("[ServiceWorker] IndexedDB ready");
      await initializeAlarms();
      console.log("[ServiceWorker] Alarms ready");
      setupNotificationListeners();
      console.log("[ServiceWorker] Notifications ready");
      await initSyncBridge();
      console.log("[ServiceWorker] Supabase sync bridge ready");
      startPeriodicSync(5);
      console.log("[ServiceWorker] Periodic sync started");
    } catch (error) {
      console.error("[ServiceWorker] Initialization error:", error);
    }
  })();
  console.log("[ServiceWorker] LinkedIn Data Extractor service worker loaded (TypeScript v4.0)");
})();
//# sourceMappingURL=service-worker.js.map
