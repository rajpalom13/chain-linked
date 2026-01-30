/**
 * Admin Settings Hook
 * @description Manages admin settings and feature flags using localStorage
 * @module hooks/use-admin-settings
 */

"use client"

import { useCallback, useEffect, useState } from "react"
import type { AdminSetting, FeatureFlag } from "@/types/admin"
import {
  ADMIN_STORAGE_KEYS,
  DEFAULT_ADMIN_SETTINGS,
  DEFAULT_FEATURE_FLAGS,
} from "@/lib/admin/constants"

/**
 * Return type for the useAdminSettings hook
 */
interface UseAdminSettingsReturn {
  /** Array of admin settings */
  settings: AdminSetting[]
  /** Array of feature flags */
  featureFlags: FeatureFlag[]
  /** Whether settings are loading */
  isLoading: boolean
  /** Update a single setting value */
  updateSetting: (key: string, value: string | boolean | number) => void
  /** Toggle a feature flag */
  toggleFeatureFlag: (key: string) => void
  /** Reset all settings to defaults */
  resetSettings: () => void
  /** Reset all feature flags to defaults */
  resetFeatureFlags: () => void
}

/**
 * Hook for managing admin settings and feature flags.
 * Uses localStorage for persistence, ready for migration to Supabase.
 *
 * @returns Object with settings, feature flags, and mutation functions
 * @example
 * ```tsx
 * const { settings, featureFlags, updateSetting, toggleFeatureFlag } = useAdminSettings()
 * ```
 */
export function useAdminSettings(): UseAdminSettingsReturn {
  const [settings, setSettings] = useState<AdminSetting[]>([])
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([])
  const [isLoading, setIsLoading] = useState(true)

  /**
   * Load settings and feature flags from localStorage on mount
   */
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem(ADMIN_STORAGE_KEYS.SETTINGS)
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings))
      } else {
        setSettings(DEFAULT_ADMIN_SETTINGS as AdminSetting[])
        localStorage.setItem(ADMIN_STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_ADMIN_SETTINGS))
      }

      const storedFlags = localStorage.getItem(ADMIN_STORAGE_KEYS.FEATURE_FLAGS)
      if (storedFlags) {
        setFeatureFlags(JSON.parse(storedFlags))
      } else {
        const defaultFlags = DEFAULT_FEATURE_FLAGS.map((f) => ({ ...f }))
        setFeatureFlags(defaultFlags)
        localStorage.setItem(ADMIN_STORAGE_KEYS.FEATURE_FLAGS, JSON.stringify(defaultFlags))
      }
    } catch {
      setSettings(DEFAULT_ADMIN_SETTINGS as AdminSetting[])
      const defaultFlags = DEFAULT_FEATURE_FLAGS.map((f) => ({ ...f }))
      setFeatureFlags(defaultFlags)
    }
    setIsLoading(false)
  }, [])

  /**
   * Update a single setting value
   * @param key - Setting key to update
   * @param value - New value for the setting
   */
  const updateSetting = useCallback(
    (key: string, value: string | boolean | number) => {
      const updated = settings.map((s) => (s.key === key ? { ...s, value } : s))
      setSettings(updated)
      try {
        localStorage.setItem(ADMIN_STORAGE_KEYS.SETTINGS, JSON.stringify(updated))
      } catch {
        console.error("Failed to persist settings to localStorage")
      }
    },
    [settings]
  )

  /**
   * Toggle a feature flag on/off
   * @param key - Feature flag key to toggle
   */
  const toggleFeatureFlag = useCallback(
    (key: string) => {
      const updated = featureFlags.map((f) =>
        f.key === key ? { ...f, enabled: !f.enabled } : f
      )
      setFeatureFlags(updated)
      try {
        localStorage.setItem(ADMIN_STORAGE_KEYS.FEATURE_FLAGS, JSON.stringify(updated))
      } catch {
        console.error("Failed to persist feature flags to localStorage")
      }
    },
    [featureFlags]
  )

  /**
   * Reset all settings to their default values
   */
  const resetSettings = useCallback(() => {
    const defaults = DEFAULT_ADMIN_SETTINGS as AdminSetting[]
    setSettings(defaults)
    try {
      localStorage.setItem(ADMIN_STORAGE_KEYS.SETTINGS, JSON.stringify(defaults))
    } catch {
      console.error("Failed to persist settings to localStorage")
    }
  }, [])

  /**
   * Reset all feature flags to their default values
   */
  const resetFeatureFlags = useCallback(() => {
    const defaults = DEFAULT_FEATURE_FLAGS.map((f) => ({ ...f }))
    setFeatureFlags(defaults)
    try {
      localStorage.setItem(ADMIN_STORAGE_KEYS.FEATURE_FLAGS, JSON.stringify(defaults))
    } catch {
      console.error("Failed to persist feature flags to localStorage")
    }
  }, [])

  return {
    settings,
    featureFlags,
    isLoading,
    updateSetting,
    toggleFeatureFlag,
    resetSettings,
    resetFeatureFlags,
  }
}
