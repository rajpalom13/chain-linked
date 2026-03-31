/**
 * Auto-Refinement Pipeline Step
 * @description Takes a post and all issues found by previous pipeline steps,
 * then uses an LLM to make surgical fixes while preserving the original voice and style.
 * @module lib/ai/pipeline/refine
 */

import * as Sentry from '@sentry/nextjs'
import OpenAI from 'openai'
import { chatCompletion, DEFAULT_MODEL } from '@/lib/ai/openai-client'
import { ANTI_AI_WRITING_RULES } from '@/lib/ai/anti-ai-rules'
import type { PipelineStep, PipelineIssue } from './types'

/**
 * Refines a post to address issues found during verification and fact-checking.
 * Makes minimal, targeted changes to fix problems while preserving the original voice.
 *
 * @param client - OpenAI-compatible client instance
 * @param postContent - The post content to refine
 * @param issues - All issues found by previous pipeline steps
 * @returns PipelineStep with the refined post content in the result field
 * @example
 * const step = await refinePost(client, 'Original post...', [
 *   { category: 'rule-violation', severity: 'error', message: 'Uses em dashes' }
 * ])
 * if (step.result) {
 *   console.log('Refined post:', step.result)
 * }
 */
export async function refinePost(
  client: OpenAI,
  postContent: string,
  issues: PipelineIssue[]
): Promise<PipelineStep> {
  const startTime = Date.now()

  // Only refine if there are actionable issues (errors or warnings)
  const actionableIssues = issues.filter(
    (i) => i.severity === 'error' || i.severity === 'warning'
  )

  if (actionableIssues.length === 0) {
    return {
      stage: 'refinement',
      status: 'skipped',
      issues: [],
      durationMs: Date.now() - startTime,
    }
  }

  try {
    const issuesText = actionableIssues
      .map((issue, i) => {
        let line = `${i + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`
        if (issue.details) line += `\n   Details: ${issue.details}`
        if (issue.suggestion) line += `\n   Fix: ${issue.suggestion}`
        return line
      })
      .join('\n')

    const systemPrompt = `You are a surgical post editor. Your job is to fix specific issues in a LinkedIn post while making the MINIMUM changes necessary.

## Rules
1. Fix ONLY the issues listed below. Do not rewrite or rephrase other parts of the post.
2. Preserve the original tone, voice, structure, and formatting.
3. If a factual claim is flagged as incorrect, either correct it or remove it. Do not introduce new claims.
4. If a rule violation is flagged, fix it with the smallest possible change.
5. Keep the post roughly the same length. Do not add padding or filler.
6. Return ONLY the corrected post text. No explanations, no meta-commentary, no markdown wrapping.

${ANTI_AI_WRITING_RULES}`

    const userMessage = `## Issues to Fix
${issuesText}

## Original Post
${postContent}

Return the corrected post now.`

    const response = await chatCompletion(client, {
      systemPrompt,
      userMessage,
      model: DEFAULT_MODEL,
      temperature: 0.3, // Low creativity for surgical edits
      maxTokens: 1500,
    })

    // Strip markdown fences and quotes LLMs sometimes add
    const refinedContent = response.content
      .replace(/^```(?:\w+)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .replace(/^["']|["']$/g, '')
      .trim()

    // Sanity check: if the LLM returned something wildly different in length, flag it
    const lengthRatio = refinedContent.length / postContent.length
    if (lengthRatio < 0.5 || lengthRatio > 1.5) {
      return {
        stage: 'refinement',
        status: 'error',
        issues: [{
          category: 'style',
          severity: 'warning',
          message: 'Refinement produced content with significantly different length, keeping original',
        }],
        durationMs: Date.now() - startTime,
        errorMessage: 'Refined content length differs too much from original',
      }
    }

    return {
      stage: 'refinement',
      status: 'passed',
      issues: [],
      durationMs: Date.now() - startTime,
      result: refinedContent,
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: 'pipeline', stage: 'refinement' },
    })
    console.error('[Pipeline:refine] Error:', error)

    return {
      stage: 'refinement',
      status: 'error',
      issues: [],
      durationMs: Date.now() - startTime,
      errorMessage: error instanceof Error ? error.message : 'Refinement failed',
    }
  }
}
