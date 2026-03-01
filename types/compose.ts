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
