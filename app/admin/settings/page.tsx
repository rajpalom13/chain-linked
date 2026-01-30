/**
 * Admin Settings Page
 * @description Configuration for AI models, system prompts, feature flags, and API limits
 * @module app/admin/settings/page
 */

"use client"

import {
  IconRefresh,
  IconSettings,
  IconSparkles,
  IconToggleLeft,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

import { useAdminSettings } from "@/hooks/use-admin-settings"
import type { AdminSetting, FeatureFlag } from "@/types/admin"

/**
 * SettingField Component
 * Renders the appropriate input control for a setting based on its type
 *
 * @param props - Component props
 * @param props.setting - The setting to render
 * @param props.onUpdate - Callback when the setting value changes
 * @returns The appropriate input component for the setting type
 */
function SettingField({
  setting,
  onUpdate,
}: {
  setting: AdminSetting
  onUpdate: (key: string, value: string | boolean | number) => void
}) {
  switch (setting.type) {
    case "select":
      return (
        <Select
          value={String(setting.value)}
          onValueChange={(val) => {
            onUpdate(setting.key, val)
            toast.success(`${setting.label} updated`)
          }}
        >
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {setting.options?.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )

    case "number":
      return (
        <Input
          type="number"
          value={String(setting.value)}
          onChange={(e) => {
            const num = parseInt(e.target.value, 10)
            if (!isNaN(num)) {
              onUpdate(setting.key, num)
            }
          }}
          onBlur={() => toast.success(`${setting.label} updated`)}
          className="w-full max-w-xs"
        />
      )

    case "toggle":
      return (
        <Switch
          checked={Boolean(setting.value)}
          onCheckedChange={(checked) => {
            onUpdate(setting.key, checked)
            toast.success(`${setting.label} ${checked ? "enabled" : "disabled"}`)
          }}
        />
      )

    case "text":
    default:
      return (
        <Textarea
          value={String(setting.value)}
          onChange={(e) => onUpdate(setting.key, e.target.value)}
          onBlur={() => toast.success(`${setting.label} updated`)}
          rows={3}
          className="resize-y"
        />
      )
  }
}

/**
 * FeatureFlagRow Component
 * Displays a single feature flag with toggle switch
 *
 * @param props - Component props
 * @param props.flag - The feature flag data
 * @param props.onToggle - Callback to toggle the flag
 * @returns A row with the feature flag details and toggle
 */
function FeatureFlagRow({
  flag,
  onToggle,
}: {
  flag: FeatureFlag
  onToggle: (key: string) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{flag.name}</p>
          <Badge variant={flag.enabled ? "default" : "secondary"} className="text-xs">
            {flag.enabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {flag.description}
        </p>
      </div>
      <Switch
        checked={flag.enabled}
        onCheckedChange={() => {
          onToggle(flag.key)
          toast.success(
            `${flag.name} ${flag.enabled ? "disabled" : "enabled"}`
          )
        }}
      />
    </div>
  )
}

/**
 * API usage data for display
 */
const API_USAGE = {
  openai: {
    label: "OpenAI API",
    used: 12847,
    limit: 50000,
    unit: "requests",
  },
  supabase: {
    label: "Supabase Database",
    used: 245000,
    limit: 500000,
    unit: "rows read",
  },
  linkedin: {
    label: "LinkedIn API",
    used: 342,
    limit: 1000,
    unit: "calls",
  },
}

/**
 * Formats a number with commas
 * @param num - Number to format
 * @returns Formatted string
 */
function formatNumber(num: number): string {
  return num.toLocaleString("en-US")
}

/**
 * AdminSettingsPage Component
 *
 * Admin settings page with sections for:
 * - AI model and prompt configuration
 * - Feature flags with toggle controls
 * - API usage limits display
 *
 * Settings are stored in localStorage, ready for database migration.
 *
 * @returns The admin settings page
 */
export default function AdminSettingsPage() {
  const {
    settings,
    featureFlags,
    isLoading,
    updateSetting,
    toggleFeatureFlag,
    resetSettings,
    resetFeatureFlags,
  } = useAdminSettings()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 lg:p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  /** Separate settings into AI/prompt settings and limit settings */
  const aiSettings = settings.filter(
    (s) => s.key.includes("prompt") || s.key.includes("model")
  )
  const limitSettings = settings.filter(
    (s) => s.key.includes("max") || s.key.includes("limit")
  )

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Configure platform defaults, feature flags, and API limits.
        </p>
      </div>

      {/* AI Model & Prompt Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconSparkles className="size-5" />
                AI Configuration
              </CardTitle>
              <CardDescription>
                Default AI model and system prompt settings.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetSettings()
                toast.success("Settings reset to defaults")
              }}
            >
              <IconRefresh className="size-4" />
              Reset Defaults
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {aiSettings.map((setting) => (
            <div key={setting.key} className="space-y-2">
              <Label htmlFor={setting.key} className="font-medium">
                {setting.label}
              </Label>
              <p className="text-xs text-muted-foreground">
                {setting.description}
              </p>
              <SettingField setting={setting} onUpdate={updateSetting} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Usage Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconSettings className="size-5" />
            Usage Limits
          </CardTitle>
          <CardDescription>
            Maximum usage limits for user accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {limitSettings.map((setting) => (
            <div key={setting.key} className="space-y-2">
              <Label htmlFor={setting.key} className="font-medium">
                {setting.label}
              </Label>
              <p className="text-xs text-muted-foreground">
                {setting.description}
              </p>
              <SettingField setting={setting} onUpdate={updateSetting} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconToggleLeft className="size-5" />
                Feature Flags
              </CardTitle>
              <CardDescription>
                Enable or disable platform features globally.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetFeatureFlags()
                toast.success("Feature flags reset to defaults")
              }}
            >
              <IconRefresh className="size-4" />
              Reset Defaults
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {featureFlags.map((flag) => (
            <FeatureFlagRow
              key={flag.key}
              flag={flag}
              onToggle={toggleFeatureFlag}
            />
          ))}
        </CardContent>
      </Card>

      {/* API Usage Display */}
      <Card>
        <CardHeader>
          <CardTitle>API Usage</CardTitle>
          <CardDescription>
            Current period API usage across integrated services.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(API_USAGE).map(([key, api]) => {
            const percentage = Math.round((api.used / api.limit) * 100)
            const isWarning = percentage > 80
            const isDanger = percentage > 95

            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{api.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatNumber(api.used)} / {formatNumber(api.limit)} {api.unit}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isDanger
                        ? "bg-destructive"
                        : isWarning
                          ? "bg-warning"
                          : "bg-primary"
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-end">
                  <Badge
                    variant={isDanger ? "destructive" : isWarning ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    {percentage}% used
                  </Badge>
                </div>
                <Separator />
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
