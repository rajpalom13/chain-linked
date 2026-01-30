/**
 * Centralized PostHog Analytics Tracking Utility
 * @description Provides typed, safe event tracking functions for all ChainLinked features.
 * Each function checks that PostHog is initialized before capturing events.
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
export function trackTemplateAction(action: "created" | "used" | "deleted", templateId: string): void {
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
 * @param step - The step number (1-6)
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
