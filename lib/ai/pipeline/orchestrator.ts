/**
 * Post-Generation Pipeline Orchestrator
 * @description Orchestrates the multi-step post-generation pipeline: verify rules,
 * fact-check claims, and auto-refine if issues are found. Tracks timing and results
 * for each step.
 * @module lib/ai/pipeline/orchestrator
 */

import * as Sentry from '@sentry/nextjs'
import { createOpenAIClient } from '@/lib/ai/openai-client'
import { verifyRules } from './verify-rules'
import { factCheck } from './fact-check'
import { refinePost } from './refine'
import type {
  PipelineConfig,
  PipelineResult,
  PipelineStep,
  PipelineIssue,
} from './types'

/**
 * Orchestrates the post-generation verification and refinement pipeline.
 *
 * Execution order:
 * 1. Verify content rules (if enabled and rules provided)
 * 2. Fact-check claims via Tavily (if enabled)
 * 3. Auto-refine post (if enabled and issues were found)
 *
 * Each step is fault-tolerant. A failure in one step does not block subsequent steps.
 *
 * @example
 * const pipeline = new PostPipeline({
 *   enableVerification: true,
 *   enableFactCheck: true,
 *   enableAutoRefine: true,
 *   maxRefinementAttempts: 1,
 *   apiKey: 'sk-or-v1-...',
 *   contentRules: ['No em dashes', 'Include hashtags'],
 * })
 * const result = await pipeline.run('My generated LinkedIn post...')
 */
export class PostPipeline {
  private config: PipelineConfig

  /**
   * Creates a new PostPipeline instance.
   * @param config - Pipeline configuration including API key and content rules
   */
  constructor(config: PipelineConfig) {
    this.config = config
  }

  /**
   * Runs the full pipeline on a generated post.
   * @param postContent - The generated post content to process
   * @returns Complete pipeline result with all steps, issues, and final content
   */
  async run(postContent: string): Promise<PipelineResult> {
    const pipelineStart = Date.now()
    const steps: PipelineStep[] = []
    let currentContent = postContent
    let allIssues: PipelineIssue[] = []

    const client = createOpenAIClient({ apiKey: this.config.apiKey })

    // Step 1: Verify content rules
    if (this.config.enableVerification) {
      try {
        const verifyStep = await verifyRules(
          client,
          currentContent,
          this.config.contentRules
        )
        steps.push(verifyStep)
        allIssues = [...allIssues, ...verifyStep.issues]
      } catch (error) {
        Sentry.captureException(error, {
          tags: { feature: 'pipeline', stage: 'orchestrator-verify' },
        })
        steps.push({
          stage: 'verification',
          status: 'error',
          issues: [],
          durationMs: 0,
          errorMessage: error instanceof Error ? error.message : 'Verification failed',
        })
      }
    }

    // Step 2: Fact-check claims
    if (this.config.enableFactCheck) {
      try {
        const factCheckStep = await factCheck(client, currentContent)
        steps.push(factCheckStep)
        allIssues = [...allIssues, ...factCheckStep.issues]
      } catch (error) {
        Sentry.captureException(error, {
          tags: { feature: 'pipeline', stage: 'orchestrator-factcheck' },
        })
        steps.push({
          stage: 'fact-check',
          status: 'error',
          issues: [],
          durationMs: 0,
          errorMessage: error instanceof Error ? error.message : 'Fact-check failed',
        })
      }
    }

    // Step 3: Auto-refine if issues were found
    if (this.config.enableAutoRefine && allIssues.length > 0) {
      let attempts = 0
      while (attempts < this.config.maxRefinementAttempts) {
        attempts++
        try {
          const refineStep = await refinePost(client, currentContent, allIssues)
          steps.push(refineStep)

          if (refineStep.status === 'passed' && refineStep.result) {
            currentContent = refineStep.result
          }
          // Break after first successful or failed refinement
          break
        } catch (error) {
          Sentry.captureException(error, {
            tags: { feature: 'pipeline', stage: 'orchestrator-refine', attempt: attempts },
          })
          steps.push({
            stage: 'refinement',
            status: 'error',
            issues: [],
            durationMs: 0,
            errorMessage: error instanceof Error ? error.message : 'Refinement failed',
          })
          break
        }
      }
    }

    const totalDurationMs = Date.now() - pipelineStart
    const errorCount = allIssues.filter((i) => i.severity === 'error').length
    const warningCount = allIssues.filter((i) => i.severity === 'warning').length

    return {
      originalContent: postContent,
      finalContent: currentContent,
      wasRefined: currentContent !== postContent,
      steps,
      totalDurationMs,
      totalIssues: allIssues.length,
      errorCount,
      warningCount,
    }
  }
}
