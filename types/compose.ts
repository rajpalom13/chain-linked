/**
 * Compose Section Types
 * @description Types for the dual-mode compose system (Basic + Advanced)
 * @module types/compose
 */

/**
 * Available compose modes
 * - basic: simplified one-shot generation (blue-tinted)
 * - advanced: conversation-first chat generation (red/warm-tinted)
 */
export type ComposeMode = 'basic' | 'advanced'

/**
 * A multiple-choice option presented by the AI in advanced mode
 */
export interface McqOption {
  /** Unique identifier for the option */
  id: string
  /** Display label */
  label: string
  /** Optional description providing more context */
  description?: string
}

/**
 * Theme configuration for a compose mode
 */
export interface ComposeTheme {
  /** Border color class */
  borderColor: string
  /** Background tint class */
  bgTint: string
  /** Accent color class */
  accentColor: string
  /** Gradient start color (oklch) */
  gradientFrom: string
  /** Gradient end color (oklch) */
  gradientTo: string
}

/**
 * Available compose page tabs
 * - single: create a single post
 * - series: create a series of related posts
 */
export type ComposeTab = 'single' | 'series'

/**
 * A single post within a series
 */
export interface SeriesPost {
  /** The complete post content */
  post: string
  /** The subtopic this post covers */
  subtopic: string
  /** Brief summary of the post */
  summary: string
}
