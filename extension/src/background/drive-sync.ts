/**
 * LinkedIn Data Extractor - Google Drive Sync
 * Handles backup/restore to Google Drive appdata folder
 */

import type { DriveBackupFile, DriveSyncSettings, DriveSyncStatus } from '../shared/types';
import { getValidToken, isAuthenticated } from './google-auth';
import { exportFullBackup } from '../shared/history-manager';

// Storage keys
const SYNC_SETTINGS_KEY = 'drive_sync_settings';
const SYNC_STATUS_KEY = 'drive_sync_status';

// Drive API endpoints
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

// Backup file naming
const BACKUP_FILE_PREFIX = 'linkedin-extractor-backup-';
const BACKUP_MIME_TYPE = 'application/json';

/**
 * Get sync settings
 */
export async function getSyncSettings(): Promise<DriveSyncSettings> {
  const result = await chrome.storage.local.get(SYNC_SETTINGS_KEY);
  return result[SYNC_SETTINGS_KEY] || {
    enabled: false,
    autoSync: false,
    syncFrequency: 'weekly',
    keepBackups: 5,
  };
}

/**
 * Save sync settings
 */
export async function saveSyncSettings(settings: DriveSyncSettings): Promise<void> {
  await chrome.storage.local.set({ [SYNC_SETTINGS_KEY]: settings });
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<DriveSyncStatus> {
  const result = await chrome.storage.local.get(SYNC_STATUS_KEY);
  return result[SYNC_STATUS_KEY] || {
    syncInProgress: false,
    autoSyncEnabled: false,
  };
}

/**
 * Update sync status
 */
async function updateSyncStatus(updates: Partial<DriveSyncStatus>): Promise<void> {
  const current = await getSyncStatus();
  await chrome.storage.local.set({
    [SYNC_STATUS_KEY]: { ...current, ...updates },
  });
}

/**
 * Make authorized request to Drive API
 */
async function driveRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getValidToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Drive API error: ${response.status} - ${error}`);
  }

  return response;
}

/**
 * List backup files in appdata folder
 */
export async function listBackups(): Promise<DriveBackupFile[]> {
  console.log('[DriveSync] Listing backups...');

  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    fields: 'files(id,name,createdTime,modifiedTime,size,mimeType)',
    orderBy: 'createdTime desc',
    q: `name contains '${BACKUP_FILE_PREFIX}'`,
  });

  const response = await driveRequest(`${DRIVE_API_BASE}/files?${params}`);
  const data = await response.json();

  const files: DriveBackupFile[] = (data.files || []).map((file: any) => ({
    id: file.id,
    name: file.name,
    createdTime: file.createdTime,
    modifiedTime: file.modifiedTime,
    size: parseInt(file.size || '0', 10),
    mimeType: file.mimeType,
  }));

  console.log(`[DriveSync] Found ${files.length} backups`);
  return files;
}

/**
 * Upload backup to Drive
 */
export async function uploadBackup(): Promise<DriveBackupFile> {
  console.log('[DriveSync] Starting backup upload...');

  await updateSyncStatus({ syncInProgress: true });

  try {
    // Get backup data
    const backupData = await exportFullBackup();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${BACKUP_FILE_PREFIX}${timestamp}.json`;

    // Create file metadata
    const metadata = {
      name: fileName,
      mimeType: BACKUP_MIME_TYPE,
      parents: ['appDataFolder'],
    };

    // Create multipart request
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartBody =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${BACKUP_MIME_TYPE}\r\n\r\n` +
      backupData +
      closeDelimiter;

    const response = await driveRequest(
      `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart`,
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      }
    );

    const file = await response.json();
    console.log(`[DriveSync] Backup uploaded: ${file.name}`);

    // Update sync status
    const settings = await getSyncSettings();
    settings.lastSync = Date.now();
    await saveSyncSettings(settings);

    await updateSyncStatus({
      syncInProgress: false,
      lastSync: Date.now(),
      lastSyncSuccess: true,
      lastSyncError: undefined,
    });

    // Cleanup old backups
    await cleanupOldBackups();

    return {
      id: file.id,
      name: file.name,
      createdTime: file.createdTime || new Date().toISOString(),
      modifiedTime: file.modifiedTime || new Date().toISOString(),
      size: backupData.length,
      mimeType: BACKUP_MIME_TYPE,
    };
  } catch (error) {
    console.error('[DriveSync] Upload failed:', error);

    await updateSyncStatus({
      syncInProgress: false,
      lastSyncSuccess: false,
      lastSyncError: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

/**
 * Download and restore backup from Drive
 */
export async function restoreBackup(fileId: string): Promise<void> {
  console.log(`[DriveSync] Restoring backup: ${fileId}`);

  await updateSyncStatus({ syncInProgress: true });

  try {
    // Download file content
    const response = await driveRequest(
      `${DRIVE_API_BASE}/files/${fileId}?alt=media`
    );

    const backupData = await response.json();

    // Validate backup structure
    if (!backupData || typeof backupData !== 'object') {
      throw new Error('Invalid backup format');
    }

    // Restore to local storage
    // The backup contains: { exportedAt, version, indexedDB, chromeStorage }
    if (backupData.chromeStorage) {
      // Restore chrome.storage data
      for (const [key, value] of Object.entries(backupData.chromeStorage)) {
        await chrome.storage.local.set({ [key]: value });
      }
      console.log('[DriveSync] Chrome storage restored');
    }

    // Note: IndexedDB restoration would require additional handling
    // For now, we restore the chrome.storage portion

    await updateSyncStatus({
      syncInProgress: false,
      lastSync: Date.now(),
      lastSyncSuccess: true,
    });

    console.log('[DriveSync] Backup restored successfully');
  } catch (error) {
    console.error('[DriveSync] Restore failed:', error);

    await updateSyncStatus({
      syncInProgress: false,
      lastSyncSuccess: false,
      lastSyncError: error instanceof Error ? error.message : 'Unknown error',
    });

    throw error;
  }
}

/**
 * Delete a backup file from Drive
 */
export async function deleteBackup(fileId: string): Promise<void> {
  console.log(`[DriveSync] Deleting backup: ${fileId}`);

  await driveRequest(`${DRIVE_API_BASE}/files/${fileId}`, {
    method: 'DELETE',
  });

  console.log('[DriveSync] Backup deleted');
}

/**
 * Cleanup old backups, keeping only the most recent ones
 */
async function cleanupOldBackups(): Promise<void> {
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
    console.error('[DriveSync] Cleanup failed:', error);
  }
}

/**
 * Perform sync (upload new backup)
 */
export async function syncNow(): Promise<DriveBackupFile> {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    throw new Error('Not authenticated with Google');
  }

  return uploadBackup();
}

/**
 * Get Drive storage quota info
 */
export async function getStorageQuota(): Promise<{
  limit?: number;
  usage?: number;
  usageInDrive?: number;
}> {
  try {
    const response = await driveRequest(
      `${DRIVE_API_BASE}/about?fields=storageQuota`
    );
    const data = await response.json();
    return {
      limit: parseInt(data.storageQuota?.limit || '0', 10),
      usage: parseInt(data.storageQuota?.usage || '0', 10),
      usageInDrive: parseInt(data.storageQuota?.usageInDrive || '0', 10),
    };
  } catch (error) {
    console.error('[DriveSync] Failed to get quota:', error);
    return {};
  }
}
