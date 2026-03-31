/**
 * Post-Generation Pipeline Type Definitions
 * @description Types for the multi-step verification, fact-checking, and refinement pipeline
 * that runs after post generation to ensure quality and accuracy.
 * @module lib/ai/pipeline/types
 */

/**
 * Pipeline processing stages in execution order
 */
export type PipelineStage = 'verification' | 'fact-check' | 'refinement'

/**
 * Status of a pipeline step after execution
 */
export type PipelineStepStatus = 'passed' | 'failed' | 'skipped' | 'error'

/**
 * Severity level for issues found during pipeline processing
 */
export type IssueSeverity = 'error' | 'warning' | 'info'

/**
 * Category of issue found during pipeline processing
 */
export type IssueCategory = 'rule-violation' | 'factual-error' | 'style' | 'formatting'

/**
 * An issue found during pipeline processing
 * @example
 * {
 *   category: 'rule-violation',
 *   severity: 'warning',
 *   message: 'Post uses em dashes which violate content rules',
 *   details: 'Found 2 instances of em dash character',
 *   suggestion: 'Replace em dashes with commas or periods',
 * }
 */
export interface PipelineIssue {
  /** The category of this issue */
  category: IssueCategory
  /** Severity level of the issue */
  severity: IssueSeverity
  /** Human-readable description of the issue */
  message: string
  /** Optional additional details */
  details?: string
  /** Optional suggestion for fixing the issue */
  suggestion?: string
}

/**
 * Result of a single pipeline step execution
 * @example
 * {
 *   stage: 'verification',
 *   status: 'passed',
 *   issues: [],
 *   durationMs: 1200,
 * }
 */
export interface PipelineStep {
  /** Which pipeline stage this step represents */
  stage: PipelineStage
  /** Final status after execution */
  status: PipelineStepStatus
  /** Issues discovered during this step */
  issues: PipelineIssue[]
  /** Execution time in milliseconds */
  durationMs: number
  /** Optional result text (e.g., refined post content) */
  result?: string
  /** Optional error message if status is 'error' */
  errorMessage?: string
}

/**
 * Complete result of running the full pipeline
 */
export interface PipelineResult {
  /** The original post content before pipeline processing */
  originalContent: string
  /** The final post content after pipeline processing (may be refined) */
  finalContent: string
  /** Whether the content was modified by the pipeline */
  wasRefined: boolean
  /** All pipeline steps that were executed */
  steps: PipelineStep[]
  /** Total pipeline execution time in milliseconds */
  totalDurationMs: number
  /** Total number of issues found across all steps */
  totalIssues: number
  /** Number of errors found */
  errorCount: number
  /** Number of warnings found */
  warningCount: number
}

/**
 * Configuration for the post-generation pipeline
 */
export interface PipelineConfig {
  /** Whether to run content rules verification */
  enableVerification: boolean
  /** Whether to run fact-checking via Tavily */
  enableFactCheck: boolean
  /** Whether to auto-refine the post if issues are found */
  enableAutoRefine: boolean
  /** Maximum number of refinement attempts (to prevent infinite loops) */
  maxRefinementAttempts: number
  /** OpenRouter API key for LLM calls */
  apiKey: string
  /** Content rules to verify against */
  contentRules: string[]
}

/**
 * Default pipeline configuration
 * All stages enabled with a single refinement pass.
 */
export const DEFAULT_PIPELINE_CONFIG: Omit<PipelineConfig, 'apiKey' | 'contentRules'> = {
  enableVerification: true,
  enableFactCheck: true,
  enableAutoRefine: true,
  maxRefinementAttempts: 1,
}
