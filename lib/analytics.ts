/**
 * Centralized PostHog Analytics Tracking Utility
 * @description Provides typed, safe event tracking functions for all ChainLinked features.
 * Each function checks that PostHog is initialized before capturing events.
 * Includes session replay controls and enhanced analytics.
 * @module lib/analytics
 */

import posthog from "posthog-js"

/**
 * Checks whether PostHog is loaded and ready to capture events.
 * @returns true if PostHog is initialized in a browser environment
 */
function isPostHogReady(): boolean {
  return typeof window !== "undefined" && posthog.__loaded === true
}

/**
 * Safely captures a PostHog event with optional properties.
 * No-ops if PostHog is not initialized.
 * @param eventName - The event name to capture
 * @param properties - Optional properties to attach to the event
 */
function safeCapture(eventName: string, properties?: Record<string, unknown>): void {
  if (!isPostHogReady()) return
  posthog.capture(eventName, properties)
}

// ============================================================================
// Session Replay Controls
// ============================================================================

/**
 * Gets the current session replay URL for support/debugging purposes.
 * @returns The session replay URL or null if not available
 */
export function getSessionReplayUrl(): string | null {
  if (!isPostHogReady()) return null
  const sessionId = posthog.get_session_id()
  if (!sessionId) return null
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com"
  // Remove /i from ingest URL to get app URL
  const appHost = host.replace("/i.", ".")
  return `${appHost}/replay/${sessionId}`
}

/**
 * Gets the current session ID for debugging.
 * @returns The session ID or null if not available
 */
export function getSessionId(): string | null {
  if (!isPostHogReady()) return null
  return posthog.get_session_id() || null
}

/**
 * Gets the current distinct ID (user identifier).
 * @returns The distinct ID or null if not available
 */
export function getDistinctId(): string | null {
  if (!isPostHogReady()) return null
  return posthog.get_distinct_id() || null
}

/**
 * Manually starts session recording.
 * Useful when recording is paused or for on-demand recording.
 */
export function startSessionRecording(): void {
  if (!isPostHogReady()) return
  posthog.startSessionRecording()
}

/**
 * Manually stops session recording.
 * Useful for privacy-sensitive pages or user preference.
 */
export function stopSessionRecording(): void {
  if (!isPostHogReady()) return
  posthog.stopSessionRecording()
}

/**
 * Checks if session recording is currently active.
 * @returns true if recording is active
 */
export function isSessionRecordingActive(): boolean {
  if (!isPostHogReady()) return false
  return posthog.sessionRecording?.started ?? false
}

/**
 * Registers super properties that are sent with every subsequent event.
 * Use this to tag all events in the current session with common properties.
 * @param properties - Key-value pairs to add to all future events
 */
export function registerSuperProperties(properties: Record<string, string | number | boolean>): void {
  if (!isPostHogReady()) return
  posthog.register(properties)
}

/**
 * Sets person properties for the current user in PostHog.
 * These properties are associated with the user, not individual events.
 * @param properties - Key-value pairs to set on the person
 */
export function setPersonProperties(properties: Record<string, string | number | boolean>): void {
  if (!isPostHogReady()) return
  posthog.capture("$set", { $set: properties })
}

// ============================================================================
// User Identification
// ============================================================================

/**
 * Identifies a user for analytics tracking.
 * @param userId - Unique user identifier
 * @param properties - Optional user properties
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>): void {
  if (!isPostHogReady()) return
  posthog.identify(userId, properties)
}

/**
 * Resets the current user identity (e.g., on logout).
 */
export function resetUser(): void {
  if (!isPostHogReady()) return
  posthog.reset()
}

/**
 * Associates the current user with a group (e.g., team or organization).
 * @param groupType - The type of group (e.g., "team", "organization")
 * @param groupKey - The unique identifier for the group
 * @param properties - Optional group properties
 */
export function setGroup(groupType: string, groupKey: string, properties?: Record<string, unknown>): void {
  if (!isPostHogReady()) return
  posthog.group(groupType, groupKey, properties)
}

/**
 * Tracks when a post is created in the composer.
 * @param postType - The type of post (e.g., "text", "carousel", "document")
 * @param method - How the post was created
 */
export function trackPostCreated(postType: string, method: "manual" | "ai" | "template"): void {
  safeCapture("post_created", { post_type: postType, method })
}

/**
 * Tracks when a post is scheduled for future publishing.
 * @param scheduledDate - ISO date string of the scheduled time
 */
export function trackPostScheduled(scheduledDate: string): void {
  safeCapture("post_scheduled", { scheduled_date: scheduledDate })
}

/**
 * Tracks when a post is published.
 * @param method - The publishing method used
 */
export function trackPostPublished(method: "direct" | "clipboard"): void {
  safeCapture("post_published", { method })
}

/**
 * Tracks template CRUD actions.
 * @param action - The action performed on the template
 * @param templateId - The unique identifier of the template
 */
export function trackTemplateAction(action: "created" | "edited" | "used" | "deleted", templateId: string): void {
  safeCapture("template_action", { action, template_id: templateId })
}

/**
 * Tracks AI content generation events.
 * @param type - The type of content generated
 * @param model - The AI model used for generation
 */
export function trackAIGeneration(type: "post" | "carousel" | "remix", model: string): void {
  safeCapture("ai_generation", { type, model })
}

/**
 * Tracks carousel-related actions.
 * @param action - The carousel action performed
 */
export function trackCarouselAction(action: "created" | "exported" | "template_applied"): void {
  safeCapture("carousel_action", { action })
}

/**
 * Tracks swipe actions on the suggestion interface.
 * @param direction - The swipe direction
 * @param postId - The ID of the post suggestion that was swiped
 */
export function trackSwipeAction(direction: "left" | "right", postId: string): void {
  safeCapture("swipe_action", { direction, post_id: postId })
}

/**
 * Tracks discover/inspiration feed actions.
 * @param action - The action taken in the discover feed
 * @param topic - Optional topic related to the action
 */
export function trackDiscoverAction(action: "viewed" | "remixed" | "topic_changed", topic?: string): void {
  safeCapture("discover_action", { action, topic })
}

/**
 * Tracks onboarding step progression.
 * @param step - The step number (1-4)
 * @param completed - Whether the step was completed successfully
 */
export function trackOnboardingStep(step: number, completed: boolean): void {
  safeCapture("onboarding_step", { step, completed })
}

/**
 * Tracks changes made in the settings screen.
 * @param setting - The name of the setting that was changed
 */
export function trackSettingsChanged(setting: string): void {
  safeCapture("settings_changed", { setting })
}

/**
 * Tracks LinkedIn-related actions.
 * @param action - The LinkedIn action performed
 */
export function trackLinkedInAction(action: "connected" | "disconnected" | "post_attempted"): void {
  safeCapture("linkedin_action", { action })
}

/**
 * Tracks generic feature usage for engagement analysis.
 * @param feature - The name of the feature used
 */
export function trackFeatureUsed(feature: string): void {
  safeCapture("feature_used", { feature })
}

// ============================================================================
// Error Tracking
// ============================================================================

/**
 * Tracks client-side errors for debugging.
 * @param error - The error object or message
 * @param context - Additional context about where the error occurred
 */
export function trackError(error: Error | string, context?: Record<string, unknown>): void {
  const errorData = error instanceof Error
    ? { message: error.message, stack: error.stack, name: error.name }
    : { message: error }

  safeCapture("client_error", {
    ...errorData,
    ...context,
    url: typeof window !== "undefined" ? window.location.href : undefined,
  })
}

/**
 * Tracks API errors for monitoring.
 * @param endpoint - The API endpoint that failed
 * @param statusCode - The HTTP status code
 * @param errorMessage - The error message
 */
export function trackApiError(endpoint: string, statusCode: number, errorMessage: string): void {
  safeCapture("api_error", {
    endpoint,
    status_code: statusCode,
    error_message: errorMessage,
  })
}

// ============================================================================
// Performance Tracking
// ============================================================================

/**
 * Tracks timing for performance-critical operations.
 * @param operationName - Name of the operation being timed
 * @param durationMs - Duration in milliseconds
 * @param metadata - Additional metadata about the operation
 */
export function trackTiming(operationName: string, durationMs: number, metadata?: Record<string, unknown>): void {
  safeCapture("timing", {
    operation: operationName,
    duration_ms: durationMs,
    ...metadata,
  })
}

/**
 * Creates a timer utility for measuring operation duration.
 * @param operationName - Name of the operation to time
 * @returns Object with stop() method to end timing and capture the event
 * @example
 * const timer = startTimer("api_fetch")
 * await fetchData()
 * timer.stop({ endpoint: "/api/data" })
 */
export function startTimer(operationName: string): { stop: (metadata?: Record<string, unknown>) => void } {
  const startTime = typeof performance !== "undefined" ? performance.now() : Date.now()
  let stopped = false
  return {
    stop: (metadata?: Record<string, unknown>) => {
      if (stopped) return // Prevent duplicate timing events
      stopped = true
      const endTime = typeof performance !== "undefined" ? performance.now() : Date.now()
      const durationMs = Math.round(endTime - startTime)
      trackTiming(operationName, durationMs, metadata)
    },
  }
}

// ============================================================================
// User Journey Tracking
// ============================================================================

/**
 * Tracks when a user starts a flow (e.g., checkout, onboarding).
 * @param flowName - Name of the user flow
 * @param properties - Additional properties about the flow start
 */
export function trackFlowStarted(flowName: string, properties?: Record<string, unknown>): void {
  safeCapture("flow_started", { flow_name: flowName, ...properties })
}

/**
 * Tracks when a user completes a flow.
 * @param flowName - Name of the user flow
 * @param success - Whether the flow completed successfully
 * @param properties - Additional properties about the flow completion
 */
export function trackFlowCompleted(flowName: string, success: boolean, properties?: Record<string, unknown>): void {
  safeCapture("flow_completed", { flow_name: flowName, success, ...properties })
}

/**
 * Tracks when a user abandons a flow.
 * @param flowName - Name of the user flow
 * @param step - The step where the user abandoned
 * @param reason - Optional reason for abandonment
 */
export function trackFlowAbandoned(flowName: string, step: string | number, reason?: string): void {
  safeCapture("flow_abandoned", { flow_name: flowName, step, reason })
}

// ============================================================================
// Search & Discovery Tracking
// ============================================================================

/**
 * Tracks search queries.
 * @param query - The search query
 * @param resultCount - Number of results returned
 * @param filters - Any filters applied
 */
export function trackSearch(query: string, resultCount: number, filters?: Record<string, unknown>): void {
  safeCapture("search_performed", {
    query,
    result_count: resultCount,
    filters,
  })
}

/**
 * Tracks when a user clicks on a search result.
 * @param query - The original search query
 * @param resultPosition - Position of the clicked result (1-indexed)
 * @param resultId - Identifier of the clicked result
 */
export function trackSearchResultClick(query: string, resultPosition: number, resultId: string): void {
  safeCapture("search_result_clicked", {
    query,
    result_position: resultPosition,
    result_id: resultId,
  })
}

// ============================================================================
// Feature Flags
// ============================================================================

/**
 * Gets a feature flag value.
 * @param flagKey - The feature flag key
 * @returns The flag value or undefined if not available
 */
export function getFeatureFlag(flagKey: string): boolean | string | undefined {
  if (!isPostHogReady()) return undefined
  return posthog.getFeatureFlag(flagKey)
}

/**
 * Checks if a feature flag is enabled.
 * @param flagKey - The feature flag key
 * @returns true if the flag is enabled
 */
export function isFeatureEnabled(flagKey: string): boolean {
  if (!isPostHogReady()) return false
  return posthog.isFeatureEnabled(flagKey) ?? false
}

/**
 * Gets the payload associated with a feature flag.
 * @param flagKey - The feature flag key
 * @returns The flag payload or undefined
 */
export function getFeatureFlagPayload(flagKey: string): unknown {
  if (!isPostHogReady()) return undefined
  return posthog.getFeatureFlagPayload(flagKey)
}

/**
 * Reloads feature flags from the server.
 * @returns Promise that resolves when flags are reloaded
 */
export function reloadFeatureFlags(): void {
  if (!isPostHogReady()) return
  posthog.reloadFeatureFlags()
}
