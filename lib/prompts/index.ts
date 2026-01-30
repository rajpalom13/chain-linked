/**
 * Prompt System
 * @description Unified prompt management for AI features in ChainLinked.
 *
 * This module provides:
 * - Type definitions for prompts, versions, and usage tracking
 * - Default prompt templates extracted from original hardcoded implementations
 * - Helper functions for prompt manipulation and variable substitution
 *
 * @module lib/prompts
 *
 * @example
 * // Import types
 * import { PromptType, SystemPrompt, PromptVariable } from '@/lib/prompts'
 *
 * // Import default prompts
 * import { getDefaultPromptContent, getAllDefaultPrompts } from '@/lib/prompts'
 *
 * // Get a specific default prompt
 * const content = getDefaultPromptContent(PromptType.REMIX_PROFESSIONAL)
 *
 * // Get all prompts for database seeding
 * const allPrompts = getAllDefaultPrompts()
 */

// =============================================================================
// Type Exports
// =============================================================================

export {
  // Main enum for prompt types
  PromptType,

  // Type utilities
  type PromptTypeValue,
  PROMPT_TYPE_VALUES,

  // Core interfaces
  type PromptVariable,
  type SystemPrompt,
  type PromptVersion,
  type PromptUsageLog,
  type PromptTestResult,

  // Database row types (for direct Supabase queries)
  type SystemPromptRow,
  type PromptVersionRow,
  type PromptUsageLogRow,
  type PromptTestResultRow,

  // Input types (for creating/updating)
  type SavePromptInput,
  type PromptUsageInput,

  // Query and analytics types
  type UsageFilter,
  type UsageAnalytics,
  type PromptWithVersions,
  type PromptFeature,

  // Row mapping utilities
  mapRowToSystemPrompt,
  mapRowToPromptVersion,
  mapRowToPromptUsageLog,
  mapRowToPromptTestResult,

  // Type guards
  isValidPromptType,
  isValidPromptFeature,
} from './prompt-types'

// =============================================================================
// Default Prompts Exports
// =============================================================================

export {
  // Main default prompts map
  DEFAULT_PROMPTS,

  // Type for default prompt structure
  type DefaultPrompt,

  // Getter functions
  getDefaultPromptContent,
  getDefaultPrompt,
  getAllDefaultPrompts,
  getDefaultPromptsByCategory,

  // Variable utilities
  substituteVariables,
  extractVariables,

  // Type mapping utilities
  mapToneToPromptType,
  mapPostTypeToPromptType,
} from './prompt-defaults'

// =============================================================================
// Cache Exports
// =============================================================================

export { PromptCache } from './prompt-cache'

// =============================================================================
// Utility Exports
// =============================================================================

export {
  // Variable handling (prompt-utils has better implementations)
  substituteVariables as substitutePromptVariables,
  extractVariableKeys,
  validateVariables,
  type VariableValidationResult,

  // Context building
  buildPromptWithContext,
  type UserContext,

  // Token utilities
  estimateTokens,
  estimateCost,
  truncateToTokenLimit,

  // Input sanitization
  sanitizePromptInput,
  formatPromptForLog,

  // Variable checking
  hasUnsubstitutedVariables,
  getUnsubstitutedVariables,
} from './prompt-utils'

// =============================================================================
// Service Exports
// =============================================================================

export {
  PromptService,
  PromptServiceError,
} from './prompt-service'
