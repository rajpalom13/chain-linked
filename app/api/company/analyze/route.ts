/**
 * Company Context Analysis API Route
 * @description AI-powered website analysis to extract comprehensive company context
 * for onboarding. Analyzes website URL and returns structured company data including
 * name, description, products, ICP, and value propositions.
 * @module app/api/company/analyze/route
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  createOpenAIClient,
  chatCompletion,
  OpenAIError,
  getErrorMessage,
  DEFAULT_MODEL,
} from "@/lib/ai/openai-client"

/**
 * Request body for company context analysis
 */
interface AnalyzeCompanyContextRequest {
  /** Company website URL to analyze */
  websiteUrl: string
  /** Company name (optional, will be extracted if not provided) */
  companyName?: string
}

/**
 * Extracted company context returned by the AI
 */
export interface CompanyContextResult {
  /** Company name */
  companyName: string
  /** Detailed company description (2-3 paragraphs) */
  companyDescription: string
  /** Products and services offered */
  companyProducts: string
  /** Ideal Customer Profile (ICP) description */
  companyIcp: string
  /** Key value propositions (3-5 bullet points) */
  companyValueProps: string
  /** Confidence score (0-100) for the analysis quality */
  confidenceScore: number
}

/**
 * Builds the system prompt for comprehensive company context extraction
 * @returns System prompt string
 */
function buildCompanyContextSystemPrompt(): string {
  return `You are an expert business analyst specializing in company research and market positioning. Your task is to analyze a company website and extract comprehensive business context.

## Your Task
Based on the website URL provided, research and extract the following information about the company. Return the data as a JSON object with these exact fields:

1. **companyName**: The official company name
2. **companyDescription**: A detailed 2-3 paragraph description of what the company does, its mission, and market position
3. **companyProducts**: A comprehensive list of the company's main products and/or services with brief descriptions. Format as a bullet-point list.
4. **companyIcp**: A detailed description of the company's Ideal Customer Profile (ICP), including:
   - Target industries
   - Company size (employees/revenue)
   - Geographic focus
   - Key decision-maker roles
   - Common pain points they solve
5. **companyValueProps**: The company's 3-5 key value propositions or unique selling points. Format as a bullet-point list.
6. **confidenceScore**: A number from 0-100 indicating how confident you are in the accuracy of this analysis (100 = very confident with clear data, lower = more inference required)

## Output Format
Return ONLY valid JSON matching this exact structure:
{
  "companyName": "string",
  "companyDescription": "string (2-3 paragraphs)",
  "companyProducts": "string (bullet points)",
  "companyIcp": "string (detailed paragraph)",
  "companyValueProps": "string (bullet points)",
  "confidenceScore": number
}

No markdown, no explanations, no code fences. Just the raw JSON object.`
}

/**
 * POST /api/company/analyze
 * Analyzes a company website and returns structured context for the profiles table
 * @param request - Next.js request object
 * @returns JSON response with company context or error
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyzeCompanyContextRequest
    const { websiteUrl, companyName } = body

    // Validate required fields
    if (!websiteUrl?.trim()) {
      return NextResponse.json(
        { error: "Website URL is required" },
        { status: 400 }
      )
    }

    // Basic URL validation
    let normalizedUrl = websiteUrl.trim()
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`
    }

    try {
      new URL(normalizedUrl)
    } catch {
      return NextResponse.json(
        { error: "Invalid website URL format" },
        { status: 400 }
      )
    }

    // Get API key from environment
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service is not configured. Please contact support." },
        { status: 503 }
      )
    }

    // Authenticate user
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      )
    }

    // Build prompts
    const systemPrompt = buildCompanyContextSystemPrompt()
    const userMessage = `Please analyze this company website and extract comprehensive business context.

Website URL: ${normalizedUrl}
${companyName ? `Company Name Hint: ${companyName}` : ""}

Based on this website, provide detailed company context. If you cannot directly access the website, use your knowledge of the company (if it's well-known) or make reasonable inferences based on the domain name and any available information.

Return the analysis as valid JSON only.`

    // Create client and make request
    const openai = createOpenAIClient({ apiKey, timeout: 90000 })
    const response = await chatCompletion(openai, {
      systemPrompt,
      userMessage,
      model: DEFAULT_MODEL,
      temperature: 0.3, // Lower temperature for more consistent structured output
      maxTokens: 2500,
    })

    // Parse JSON response
    let analysisData: CompanyContextResult
    try {
      // Clean up the response - remove potential markdown formatting
      const cleaned = response.content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim()
      analysisData = JSON.parse(cleaned) as CompanyContextResult
    } catch {
      console.error("Failed to parse AI response:", response.content)
      return NextResponse.json(
        { error: "Failed to parse AI analysis. Please try again." },
        { status: 500 }
      )
    }

    // Validate required fields in response
    if (!analysisData.companyName || !analysisData.companyDescription) {
      return NextResponse.json(
        { error: "AI analysis returned incomplete data. Please try again." },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        companyName: analysisData.companyName,
        companyDescription: analysisData.companyDescription,
        companyProducts: analysisData.companyProducts || "",
        companyIcp: analysisData.companyIcp || "",
        companyValueProps: analysisData.companyValueProps || "",
        websiteUrl: normalizedUrl,
        confidenceScore: analysisData.confidenceScore || 50,
      },
      metadata: {
        model: response.model,
        tokensUsed: response.totalTokens,
      },
    })
  } catch (error) {
    console.error("Company context analysis error:", error)

    if (error instanceof OpenAIError) {
      return NextResponse.json(
        { error: getErrorMessage(error), errorType: error.type },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: "Failed to analyze company. Please try again." },
      { status: 500 }
    )
  }
}
