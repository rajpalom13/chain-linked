/**
 * Company Research
 * @description Uses OpenRouter (perplexity/sonar-pro) to research company information.
 * Falls back to direct Perplexity API if OPENROUTER_API_KEY is not set.
 * @module lib/perplexity/research
 */

import { createPerplexityClient } from './client'

/**
 * Research result from Perplexity
 */
export interface CompanyResearchResult {
  /** Raw research text */
  research: string
  /** Whether research was successful */
  success: boolean
  /** Error message if failed */
  error?: string
}

/**
 * System prompt for company research
 */
const COMPANY_RESEARCH_PROMPT = `You are a business research analyst. Research the company and provide structured information about:

1. **Company Overview**: Brief description of what the company does
2. **Products/Services**: Main offerings and their value propositions
3. **Target Market**: Who are their typical customers (industries, company sizes, roles)
4. **Market Position**: Competitive landscape and unique differentiators
5. **Recent News**: Any significant recent announcements, funding, or milestones
6. **Company Culture**: Tone of voice, brand personality based on their communications

Be concise but comprehensive. Focus on facts that would be useful for creating LinkedIn content for this company.`

/**
 * Research a company using Perplexity AI
 * @param companyName - Name of the company
 * @param websiteUrl - Company website URL (optional)
 * @param additionalContext - Additional context from user (optional)
 * @returns Research results
 */
export async function researchCompany(
  companyName: string,
  websiteUrl?: string,
  additionalContext?: string
): Promise<CompanyResearchResult> {
  const client = createPerplexityClient()

  if (!client) {
    return {
      research: '',
      success: false,
      error: 'No OPENROUTER_API_KEY or PERPLEXITY_API_KEY configured',
    }
  }

  try {
    // Build the research query
    let query = `Research the company "${companyName}"`

    if (websiteUrl) {
      query += ` (website: ${websiteUrl})`
    }

    if (additionalContext) {
      query += `\n\nAdditional context from the company: ${additionalContext}`
    }

    query += '\n\nProvide a comprehensive analysis for creating B2B LinkedIn content.'

    const research = await client.research(query, COMPANY_RESEARCH_PROMPT)

    return {
      research,
      success: true,
    }
  } catch (error) {
    console.error('[Perplexity] Research error:', error)
    return {
      research: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown research error',
    }
  }
}

/**
 * Research target audience and ICP
 * @param companyName - Company name
 * @param industry - Industry (optional)
 * @param existingContext - Existing company context
 * @returns ICP research results
 */
export async function researchICP(
  companyName: string,
  industry?: string,
  existingContext?: string
): Promise<CompanyResearchResult> {
  const client = createPerplexityClient()

  if (!client) {
    return {
      research: '',
      success: false,
      error: 'No OPENROUTER_API_KEY or PERPLEXITY_API_KEY configured',
    }
  }

  try {
    let query = `For the company "${companyName}"`
    if (industry) {
      query += ` in the ${industry} industry`
    }

    query += `, identify the ideal customer profile (ICP) and target audience:

1. **Target Industries**: Which industries are most likely to buy from them?
2. **Company Size**: What size companies are ideal customers (startup, SMB, enterprise)?
3. **Decision Makers**: What job titles/roles make buying decisions?
4. **Pain Points**: What problems do their customers typically face?
5. **Buying Triggers**: What events or situations lead to purchasing?`

    if (existingContext) {
      query += `\n\nExisting context about the company:\n${existingContext}`
    }

    const research = await client.research(query)

    return {
      research,
      success: true,
    }
  } catch (error) {
    console.error('[Perplexity] ICP research error:', error)
    return {
      research: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown research error',
    }
  }
}
