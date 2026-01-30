/**
 * IndexedDB Wrapper for LinkedIn Data Extractor
 * Provides persistent storage for trend data, capture logs, and backup metadata
 */

import type { TrendDataPoint, CaptureLog, BackupMetadata } from './types';

const DB_NAME = 'linkedin-data-extractor';
const DB_VERSION = 1;

// Store names
export const STORES = {
  TRENDS: 'trends',
  CAPTURES: 'captures',
  BACKUPS: 'backups',
} as const;

type StoreName = typeof STORES[keyof typeof STORES];

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize the IndexedDB database
 */
export async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[IndexedDB] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log('[IndexedDB] Database opened successfully');
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      console.log('[IndexedDB] Upgrading database...');

      // Trends store - time-series data
      if (!db.objectStoreNames.contains(STORES.TRENDS)) {
        const trendsStore = db.createObjectStore(STORES.TRENDS, { keyPath: 'id', autoIncrement: true });
        trendsStore.createIndex('date', 'date', { unique: false });
        trendsStore.createIndex('type', 'type', { unique: false });
        trendsStore.createIndex('date_type', ['date', 'type'], { unique: false });
      }

      // Captures store - capture history log
      if (!db.objectStoreNames.contains(STORES.CAPTURES)) {
        const capturesStore = db.createObjectStore(STORES.CAPTURES, { keyPath: 'id' });
        capturesStore.createIndex('timestamp', 'timestamp', { unique: false });
        capturesStore.createIndex('type', 'type', { unique: false });
      }

      // Backups store - backup metadata
      if (!db.objectStoreNames.contains(STORES.BACKUPS)) {
        const backupsStore = db.createObjectStore(STORES.BACKUPS, { keyPath: 'id' });
        backupsStore.createIndex('timestamp', 'timestamp', { unique: false });
        backupsStore.createIndex('type', 'type', { unique: false });
      }
    };
  });
}

/**
 * Get the database instance, initializing if needed
 */
export async function getDB(): Promise<IDBDatabase> {
  if (!dbInstance) {
    return initDB();
  }
  return dbInstance;
}

/**
 * Generic add operation
 */
async function addRecord<T>(storeName: StoreName, record: T): Promise<IDBValidKey> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.add(record);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic put operation (add or update)
 */
async function putRecord<T>(storeName: StoreName, record: T): Promise<IDBValidKey> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(record);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic get by key
 */
async function getRecord<T>(storeName: StoreName, key: IDBValidKey): Promise<T | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic get all records
 */
async function getAllRecords<T>(storeName: StoreName): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generic delete by key
 */
async function deleteRecord(storeName: StoreName, key: IDBValidKey): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all records from a store
 */
async function clearStore(storeName: StoreName): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ==========================================
// TREND DATA OPERATIONS
// ==========================================

/**
 * Add a trend data point
 */
export async function addTrendData(trend: Omit<TrendDataPoint, 'id'>): Promise<IDBValidKey> {
  return addRecord(STORES.TRENDS, trend);
}

/**
 * Get all trend data
 */
export async function getAllTrends(): Promise<TrendDataPoint[]> {
  return getAllRecords(STORES.TRENDS);
}

/**
 * Get trend data within a date range
 */
export async function getTrendsByDateRange(startDate: string, endDate: string): Promise<TrendDataPoint[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.TRENDS, 'readonly');
    const store = transaction.objectStore(STORES.TRENDS);
    const index = store.index('date');
    const range = IDBKeyRange.bound(startDate, endDate);
    const request = index.getAll(range);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get trend data by type
 */
export async function getTrendsByType(type: TrendDataPoint['type']): Promise<TrendDataPoint[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.TRENDS, 'readonly');
    const store = transaction.objectStore(STORES.TRENDS);
    const index = store.index('type');
    const request = index.getAll(type);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete trends older than specified days
 */
export async function pruneTrendsOlderThan(days: number): Promise<number> {
  const db = await getDB();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.TRENDS, 'readwrite');
    const store = transaction.objectStore(STORES.TRENDS);
    const index = store.index('date');
    const range = IDBKeyRange.upperBound(cutoffStr, true);
    const request = index.openCursor(range);

    let deletedCount = 0;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
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

// ==========================================
// CAPTURE LOG OPERATIONS
// ==========================================

/**
 * Add a capture log entry
 */
export async function addCaptureLog(log: CaptureLog): Promise<IDBValidKey> {
  return addRecord(STORES.CAPTURES, log);
}

/**
 * Get all capture logs
 */
export async function getAllCaptureLogs(): Promise<CaptureLog[]> {
  return getAllRecords(STORES.CAPTURES);
}

/**
 * Get capture logs within a time range
 */
export async function getCaptureLogsByTimeRange(startTime: number, endTime: number): Promise<CaptureLog[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CAPTURES, 'readonly');
    const store = transaction.objectStore(STORES.CAPTURES);
    const index = store.index('timestamp');
    const range = IDBKeyRange.bound(startTime, endTime);
    const request = index.getAll(range);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get recent capture logs (last N entries)
 */
export async function getRecentCaptureLogs(limit: number = 50): Promise<CaptureLog[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CAPTURES, 'readonly');
    const store = transaction.objectStore(STORES.CAPTURES);
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev');

    const results: CaptureLog[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
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

/**
 * Delete capture logs older than specified days
 */
export async function pruneCaptureLogsOlderThan(days: number): Promise<number> {
  const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CAPTURES, 'readwrite');
    const store = transaction.objectStore(STORES.CAPTURES);
    const index = store.index('timestamp');
    const range = IDBKeyRange.upperBound(cutoffTime, true);
    const request = index.openCursor(range);

    let deletedCount = 0;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
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

// ==========================================
// BACKUP METADATA OPERATIONS
// ==========================================

/**
 * Add a backup metadata entry
 */
export async function addBackupMetadata(backup: BackupMetadata): Promise<IDBValidKey> {
  return addRecord(STORES.BACKUPS, backup);
}

/**
 * Get all backup metadata
 */
export async function getAllBackupMetadata(): Promise<BackupMetadata[]> {
  return getAllRecords(STORES.BACKUPS);
}

/**
 * Get the most recent backup
 */
export async function getMostRecentBackup(): Promise<BackupMetadata | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.BACKUPS, 'readonly');
    const store = transaction.objectStore(STORES.BACKUPS);
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev');

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      resolve(cursor?.value);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete backup metadata by ID
 */
export async function deleteBackupMetadata(id: string): Promise<void> {
  return deleteRecord(STORES.BACKUPS, id);
}

// ==========================================
// UTILITY OPERATIONS
// ==========================================

/**
 * Get database statistics
 */
export async function getDBStats(): Promise<{
  trendsCount: number;
  capturesCount: number;
  backupsCount: number;
}> {
  const db = await getDB();

  const getCount = (storeName: StoreName): Promise<number> => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  };

  const [trendsCount, capturesCount, backupsCount] = await Promise.all([
    getCount(STORES.TRENDS),
    getCount(STORES.CAPTURES),
    getCount(STORES.BACKUPS),
  ]);

  return { trendsCount, capturesCount, backupsCount };
}

/**
 * Clear all data from the database
 */
export async function clearAllData(): Promise<void> {
  await Promise.all([
    clearStore(STORES.TRENDS),
    clearStore(STORES.CAPTURES),
    clearStore(STORES.BACKUPS),
  ]);
  console.log('[IndexedDB] All data cleared');
}

/**
 * Run daily maintenance (prune old data)
 */
export async function runDailyMaintenance(): Promise<{
  trendsDeleted: number;
  capturesDeleted: number;
}> {
  const trendsDeleted = await pruneTrendsOlderThan(90); // Keep 90 days of trends
  const capturesDeleted = await pruneCaptureLogsOlderThan(30); // Keep 30 days of capture logs

  console.log(`[IndexedDB] Maintenance complete: ${trendsDeleted} trends, ${capturesDeleted} captures deleted`);

  return { trendsDeleted, capturesDeleted };
}

/**
 * Export all data as JSON for backup
 */
export async function exportAllData(): Promise<{
  trends: TrendDataPoint[];
  captures: CaptureLog[];
  backups: BackupMetadata[];
  exportedAt: string;
}> {
  const [trends, captures, backups] = await Promise.all([
    getAllTrends(),
    getAllCaptureLogs(),
    getAllBackupMetadata(),
  ]);

  return {
    trends,
    captures,
    backups,
    exportedAt: new Date().toISOString(),
  };
}
