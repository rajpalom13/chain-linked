/**
 * Fact-Checking Pipeline Step
 * @description Extracts verifiable claims from a post, searches for evidence via Tavily,
 * and assesses factual accuracy using an LLM. Skips gracefully if TAVILY_API_KEY is not set.
 * @module lib/ai/pipeline/fact-check
 */

import * as Sentry from '@sentry/nextjs'
import OpenAI from 'openai'
import { chatCompletion, DEFAULT_MODEL } from '@/lib/ai/openai-client'
import type { PipelineStep, PipelineIssue } from './types'

/** Maximum number of claims to fact-check per post */
const MAX_CLAIMS = 5

/**
 * JSON schema for the claim extraction LLM response
 */
interface ClaimExtractionResponse {
  /** Array of verifiable claims extracted from the post */
  claims: Array<{
    /** The claim text as stated in the post */
    claim: string
    /** A concise search query to verify this claim */
    searchQuery: string
  }>
}

/**
 * JSON schema for the claim assessment LLM response
 */
interface ClaimAssessmentResponse {
  /** Assessment results for each claim */
  assessments: Array<{
    /** The original claim */
    claim: string
    /** Whether the claim is supported, refuted, or unverifiable */
    verdict: 'supported' | 'refuted' | 'unverifiable'
    /** Explanation of the verdict */
    explanation: string
    /** Suggested correction if refuted */
    correction?: string
  }>
}

/**
 * Fact-checks a generated post by extracting claims, searching the web, and assessing accuracy.
 *
 * Pipeline:
 * 1. LLM extracts verifiable claims from the post (max 5)
 * 2. Each claim is searched via Tavily API in parallel
 * 3. LLM assesses claims against search results
 *
 * Skips gracefully if TAVILY_API_KEY is not configured.
 *
 * @param client - OpenAI-compatible client instance
 * @param postContent - The generated post to fact-check
 * @returns PipelineStep with fact-check results and any factual issues
 * @example
 * const step = await factCheck(client, 'According to a 2024 study, 73% of remote workers...')
 */
export async function factCheck(
  client: OpenAI,
  postContent: string
): Promise<PipelineStep> {
  const startTime = Date.now()

  // Skip if Tavily API key is not configured
  const tavilyApiKey = process.env.TAVILY_API_KEY
  if (!tavilyApiKey) {
    return {
      stage: 'fact-check',
      status: 'skipped',
      issues: [],
      durationMs: Date.now() - startTime,
    }
  }

  try {
    // Step 1: Extract verifiable claims from the post
    const claims = await extractClaims(client, postContent)

    if (claims.length === 0) {
      return {
        stage: 'fact-check',
        status: 'passed',
        issues: [],
        durationMs: Date.now() - startTime,
      }
    }

    // Step 2: Search each claim via Tavily in parallel
    const { tavily } = await import('@tavily/core')
    const tavilyClient = tavily({ apiKey: tavilyApiKey })

    const searchResults = await Promise.allSettled(
      claims.slice(0, MAX_CLAIMS).map(async (claim) => {
        const result = await tavilyClient.search(claim.searchQuery, {
          maxResults: 3,
          searchDepth: 'basic',
        })
        return {
          claim: claim.claim,
          searchQuery: claim.searchQuery,
          results: result.results.map((r) => ({
            title: r.title,
            content: r.content?.slice(0, 500) || '',
            url: r.url,
          })),
        }
      })
    )

    // Collect successful search results
    const successfulSearches = searchResults
      .filter((r): r is PromiseFulfilledResult<{
        claim: string
        searchQuery: string
        results: Array<{ title: string; content: string; url: string }>
      }> => r.status === 'fulfilled')
      .map((r) => r.value)

    if (successfulSearches.length === 0) {
      return {
        stage: 'fact-check',
        status: 'passed',
        issues: [{
          category: 'factual-error',
          severity: 'info',
          message: 'Could not retrieve search results for fact-checking',
        }],
        durationMs: Date.now() - startTime,
      }
    }

    // Step 3: LLM assesses claims against search results
    const issues = await assessClaims(client, successfulSearches)

    const hasErrors = issues.some((i) => i.severity === 'error')

    return {
      stage: 'fact-check',
      status: hasErrors ? 'failed' : 'passed',
      issues,
      durationMs: Date.now() - startTime,
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { feature: 'pipeline', stage: 'fact-check' },
    })
    console.error('[Pipeline:fact-check] Error:', error)

    return {
      stage: 'fact-check',
      status: 'error',
      issues: [],
      durationMs: Date.now() - startTime,
      errorMessage: error instanceof Error ? error.message : 'Fact-check failed',
    }
  }
}

/**
 * Extracts verifiable claims from post content using an LLM.
 * @param client - OpenAI-compatible client instance
 * @param postContent - The post to extract claims from
 * @returns Array of claims with search queries
 */
async function extractClaims(
  client: OpenAI,
  postContent: string
): Promise<ClaimExtractionResponse['claims']> {
  const systemPrompt = `You extract verifiable factual claims from LinkedIn posts. Only extract claims that:
- State specific statistics, numbers, or percentages
- Reference studies, reports, or research findings
- Make claims about company performance, market data, or industry trends
- State historical facts or dates

Do NOT extract:
- Opinions or subjective statements
- General advice or recommendations
- Personal anecdotes (unless they contain verifiable facts)
- Hypothetical scenarios

Respond in JSON with this exact structure:
{
  "claims": [
    {
      "claim": "the exact claim as stated in the post",
      "searchQuery": "a concise search query to verify this claim"
    }
  ]
}

If the post contains no verifiable claims, return { "claims": [] }.
Limit to the top ${MAX_CLAIMS} most important claims.`

  const response = await chatCompletion(client, {
    systemPrompt,
    userMessage: `Extract verifiable claims from this post:\n\n${postContent}`,
    model: DEFAULT_MODEL,
    temperature: 0.1,
    maxTokens: 512,
  })

  try {
    const parsed = JSON.parse(response.content) as ClaimExtractionResponse
    return parsed.claims || []
  } catch {
    return []
  }
}

/**
 * Assesses extracted claims against search results using an LLM.
 * @param client - OpenAI-compatible client instance
 * @param searchData - Claims paired with their Tavily search results
 * @returns Array of PipelineIssues for any factual problems found
 */
async function assessClaims(
  client: OpenAI,
  searchData: Array<{
    claim: string
    searchQuery: string
    results: Array<{ title: string; content: string; url: string }>
  }>
): Promise<PipelineIssue[]> {
  const systemPrompt = `You are a fact-checker. For each claim, assess whether the web search results support, refute, or cannot verify the claim.

Respond in JSON with this exact structure:
{
  "assessments": [
    {
      "claim": "the claim text",
      "verdict": "supported" | "refuted" | "unverifiable",
      "explanation": "brief explanation of your assessment",
      "correction": "if refuted, what the correct information is (omit if not refuted)"
    }
  ]
}

Be conservative: only mark as "refuted" if the search results clearly contradict the claim. Mark as "unverifiable" if the results are inconclusive or insufficient.`

  const claimsText = searchData.map((item, i) => {
    const resultsText = item.results
      .map((r) => `  - ${r.title}: ${r.content}`)
      .join('\n')
    return `Claim ${i + 1}: "${item.claim}"\nSearch results:\n${resultsText}`
  }).join('\n\n')

  const response = await chatCompletion(client, {
    systemPrompt,
    userMessage: `Assess these claims against their search results:\n\n${claimsText}`,
    model: DEFAULT_MODEL,
    temperature: 0.1,
    maxTokens: 1024,
  })

  try {
    const parsed = JSON.parse(response.content) as ClaimAssessmentResponse
    const issues: PipelineIssue[] = []

    for (const assessment of parsed.assessments || []) {
      if (assessment.verdict === 'refuted') {
        issues.push({
          category: 'factual-error',
          severity: 'error',
          message: `Factual claim may be incorrect: "${assessment.claim}"`,
          details: assessment.explanation,
          suggestion: assessment.correction || 'Verify this claim before publishing',
        })
      } else if (assessment.verdict === 'unverifiable') {
        issues.push({
          category: 'factual-error',
          severity: 'warning',
          message: `Claim could not be verified: "${assessment.claim}"`,
          details: assessment.explanation,
          suggestion: 'Consider adding a source or rephrasing as an estimate',
        })
      }
    }

    return issues
  } catch {
    return []
  }
}
