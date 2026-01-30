/**
 * Settings - Extension settings and configuration component
 * @module popup/components/Settings
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import {
  useSettings,
  useNotificationSettings,
  useBackupSchedule,
} from '../hooks/useStorage';
import { useStorageStats, useExport } from '../hooks/useAnalytics';
import { formatRelativeTime } from '../lib/utils';

/**
 * Settings component for managing extension preferences
 */
export function Settings() {
  const { settings, updateSettings, loading: settingsLoading } = useSettings();
  const { settings: notificationSettings, updateSettings: updateNotifications } = useNotificationSettings();
  const { schedule, updateSchedule, triggerBackup, loading: backupLoading } = useBackupSchedule();
  const { stats: storageStats } = useStorageStats();
  const { exportFullBackup, loading: exportLoading } = useExport();

  return (
    <div className="space-y-3">
      {/* Auto-Capture Settings */}
      <Card className="overflow-hidden border-0 shadow-md">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-[12px] font-semibold text-slate-800">Auto-Capture</CardTitle>
              <CardDescription className="text-[10px] text-slate-500">
                Capture data while browsing LinkedIn
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <SettingRow
            label="Enable Auto-Capture"
            description="Automatically capture data"
            checked={settings.autoCapture}
            onChange={(checked) => updateSettings({ autoCapture: checked })}
            disabled={settingsLoading}
          />
          <SettingRow
            label="Capture Analytics"
            description="Post and profile analytics"
            checked={settings.captureAnalytics}
            onChange={(checked) => updateSettings({ captureAnalytics: checked })}
            disabled={settingsLoading || !settings.autoCapture}
          />
          <SettingRow
            label="Capture Profiles"
            description="Profile views and data"
            checked={settings.captureProfiles}
            onChange={(checked) => updateSettings({ captureProfiles: checked })}
            disabled={settingsLoading || !settings.autoCapture}
          />
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card className="overflow-hidden border-0 shadow-md">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-[12px] font-semibold text-slate-800">Notifications</CardTitle>
              <CardDescription className="text-[10px] text-slate-500">
                Control when you receive alerts
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {notificationSettings && (
            <>
              <SettingRow
                label="Capture Notifications"
                description="When data is captured"
                checked={notificationSettings.captureNotifications}
                onChange={(checked) => updateNotifications({ captureNotifications: checked })}
              />
              <SettingRow
                label="Growth Alerts"
                description="Milestone achievements"
                checked={notificationSettings.growthAlerts}
                onChange={(checked) => updateNotifications({ growthAlerts: checked })}
              />
              <SettingRow
                label="Silent Mode"
                description="Disable all notifications"
                checked={notificationSettings.silentMode}
                onChange={(checked) => updateNotifications({ silentMode: checked })}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Backup Settings */}
      <Card className="overflow-hidden border-0 shadow-md">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-[12px] font-semibold text-slate-800">Local Backups</CardTitle>
              <CardDescription className="text-[10px] text-slate-500">
                Export your data locally
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {schedule && (
            <>
              <SettingRow
                label="Auto Backup"
                description={schedule.enabled ? `${schedule.frequency} at ${schedule.time}` : 'Disabled'}
                checked={schedule.enabled}
                onChange={(checked) => updateSchedule({ enabled: checked })}
              />

              {schedule.enabled && (
                <div className="flex gap-2">
                  <Button
                    variant={schedule.frequency === 'daily' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSchedule({ frequency: 'daily' })}
                    className="flex-1 h-8 text-[10px]"
                  >
                    Daily
                  </Button>
                  <Button
                    variant={schedule.frequency === 'weekly' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateSchedule({ frequency: 'weekly' })}
                    className="flex-1 h-8 text-[10px]"
                  >
                    Weekly
                  </Button>
                </div>
              )}

              {schedule.lastBackup && (
                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Last backup: {formatRelativeTime(schedule.lastBackup)}
                </p>
              )}
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={triggerBackup}
            disabled={backupLoading}
            className="w-full h-8 text-[10px] font-medium"
          >
            {backupLoading ? (
              <>
                <svg className="w-3 h-3 mr-1.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                Backing up...
              </>
            ) : (
              <>
                <svg className="w-3 h-3 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Backup Now
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Storage Stats */}
      <Card className="overflow-hidden border-0 shadow-md">
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
            </div>
            <div>
              <CardTitle className="text-[12px] font-semibold text-slate-800">Storage</CardTitle>
              <CardDescription className="text-[10px] text-slate-500">
                Local data summary
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {storageStats && (
            <div className="grid grid-cols-3 gap-2">
              <StatBox label="Trends" value={storageStats.trendsCount} color="blue" />
              <StatBox label="Captures" value={storageStats.capturesCount} color="emerald" />
              <StatBox label="Backups" value={storageStats.backupsCount} color="amber" />
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={exportFullBackup}
            disabled={exportLoading}
            className="w-full h-8 text-[10px] font-medium"
          >
            {exportLoading ? (
              <>
                <svg className="w-3 h-3 mr-1.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 11-6.219-8.56" />
                </svg>
                Exporting...
              </>
            ) : (
              <>
                <svg className="w-3 h-3 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                Export All Data
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Version Info */}
      <div className="text-center pt-2 pb-1">
        <p className="text-[10px] text-slate-400 font-medium">LinkedIn Data Extractor v4.0</p>
        <div className="flex items-center justify-center gap-2 mt-1">
          <a
            href="https://chainlinked.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] text-blue-500 hover:text-blue-600 hover:underline"
          >
            Dashboard
          </a>
          <span className="text-slate-300">•</span>
          <a
            href="https://github.com/agiready/linkedin-data-extractor"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] text-blue-500 hover:text-blue-600 hover:underline"
          >
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

/** Props for SettingRow component */
interface SettingRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * Individual setting row with label and toggle
 */
function SettingRow({ label, description, checked, onChange, disabled }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="space-y-0.5">
        <p className="text-[11px] font-medium text-slate-700">{label}</p>
        {description && (
          <p className="text-[9px] text-slate-500">{description}</p>
        )}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

/** Props for StatBox component */
interface StatBoxProps {
  label: string;
  value: number;
  color: 'blue' | 'emerald' | 'amber';
}

/**
 * Compact stat display box
 */
function StatBox({ label, value, color }: StatBoxProps) {
  const colorMap = {
    blue: 'bg-blue-50 border-blue-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    amber: 'bg-amber-50 border-amber-100',
  };

  const textColorMap = {
    blue: 'text-blue-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
  };

  return (
    <div className={`rounded-lg border p-2.5 text-center ${colorMap[color]}`}>
      <p className={`text-lg font-bold ${textColorMap[color]}`}>{value}</p>
      <p className="text-[9px] text-slate-500 font-medium">{label}</p>
    </div>
  );
}
