/**
 * PostHog React Hook
 * @description Provides easy access to PostHog analytics within React components
 * @module hooks/use-posthog
 */

"use client"

import { useCallback, useMemo } from "react"
import { usePostHog as usePostHogBase } from "posthog-js/react"
import {
  getSessionId,
  getSessionReplayUrl,
  isSessionRecordingActive,
  startSessionRecording,
  stopSessionRecording,
  registerSuperProperties,
  setPersonProperties,
  trackError,
  trackTiming,
  startTimer,
  trackFeatureUsed,
  getFeatureFlag,
  isFeatureEnabled,
  getFeatureFlagPayload,
  identifyUser,
  resetUser,
  setGroup,
  trackApiError,
} from "@/lib/analytics"

/**
 * Session replay control methods (stable reference)
 */
const sessionReplayMethods = Object.freeze({
  /** Gets the current session ID */
  getSessionId,
  /** Gets the URL to view the current session replay */
  getReplayUrl: getSessionReplayUrl,
  /** Checks if recording is active */
  isRecording: isSessionRecordingActive,
  /** Starts session recording */
  start: startSessionRecording,
  /** Stops session recording */
  stop: stopSessionRecording,
  /** Registers super properties for all events */
  registerProperties: registerSuperProperties,
  /** Sets person properties on the user */
  setPersonProperties,
})

/**
 * Feature flag methods (stable reference)
 */
const featureFlagMethods = Object.freeze({
  /** Gets the value of a feature flag */
  get: getFeatureFlag,
  /** Checks if a feature flag is enabled */
  isEnabled: isFeatureEnabled,
  /** Gets the payload of a feature flag */
  getPayload: getFeatureFlagPayload,
})

/**
 * Performance tracking methods (stable reference)
 */
const performanceMethods = Object.freeze({
  /** Tracks timing for an operation */
  trackTiming,
  /** Starts a timer that can be stopped later */
  startTimer,
})

/**
 * User management methods (stable reference)
 */
const userMethods = Object.freeze({
  /** Identifies a user */
  identify: identifyUser,
  /** Resets user identity */
  reset: resetUser,
  /** Associates user with a group */
  setGroup,
})

/** Return type for the usePostHog hook */
interface UsePostHogReturn {
  /** The PostHog client instance (may be undefined if not initialized) */
  posthog: ReturnType<typeof usePostHogBase>
  /** Captures a custom event */
  capture: (eventName: string, properties?: Record<string, unknown>) => void
  /** Session replay control methods */
  sessionReplay: typeof sessionReplayMethods
  /** Feature flag methods */
  featureFlags: typeof featureFlagMethods
  /** Performance tracking methods */
  performance: typeof performanceMethods
  /** User management methods */
  user: typeof userMethods
  /** Tracks client-side errors */
  trackError: typeof trackError
  /** Tracks API errors */
  trackApiError: typeof trackApiError
  /** Tracks feature usage */
  trackFeature: typeof trackFeatureUsed
}

/**
 * Custom hook for PostHog analytics integration.
 * Provides typed methods for event tracking, session replay control, and feature flags.
 * All returned objects are stable references to prevent unnecessary re-renders.
 * @returns PostHog utilities and tracking methods
 * @example
 * const { capture, sessionReplay, featureFlags } = usePostHog()
 * capture("button_clicked", { buttonId: "submit" })
 */
export function usePostHog(): UsePostHogReturn {
  const posthog = usePostHogBase()

  /**
   * Captures a custom event with optional properties.
   * Memoized to prevent re-renders when used in dependency arrays.
   */
  const capture = useCallback(
    (eventName: string, properties?: Record<string, unknown>) => {
      posthog?.capture(eventName, properties)
    },
    [posthog]
  )

  // Return stable object references
  return useMemo(
    () => ({
      posthog,
      capture,
      sessionReplay: sessionReplayMethods,
      featureFlags: featureFlagMethods,
      performance: performanceMethods,
      user: userMethods,
      trackError,
      trackApiError,
      trackFeature: trackFeatureUsed,
    }),
    [posthog, capture]
  )
}
