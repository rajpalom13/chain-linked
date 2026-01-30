/**
 * AI Carousel Generation API
 * @description Generates carousel content based on template structure.
 * Uses the centralized prompt service for prompt management with fallback to defaults.
 * @module app/api/ai/carousel/generate
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import OpenAI from 'openai'
import {
  buildCarouselSystemPrompt,
  buildCarouselUserPrompt,
  parseCarouselResponse,
  validateContent,
  truncateToFit,
  type CarouselGenerationInput,
  type CarouselTone,
  type CtaType
} from '@/lib/ai/carousel-prompts'
import type { TemplateSlot, SlideBreakdown } from '@/lib/ai/template-analyzer'
import { PromptService, PromptType } from '@/lib/prompts'

/**
 * Request validation schema
 */
const requestSchema = z.object({
  topic: z.string().min(10, 'Topic must be at least 10 characters'),
  audience: z.string().optional(),
  industry: z.string().optional(),
  keyPoints: z.array(z.string()).optional(),
  tone: z.enum(['professional', 'casual', 'educational', 'inspirational', 'storytelling']),
  ctaType: z.enum(['follow', 'comment', 'share', 'link', 'dm', 'save', 'custom']).optional(),
  customCta: z.string().optional(),
  templateAnalysis: z.object({
    templateId: z.string(),
    templateName: z.string(),
    category: z.string(),
    totalSlides: z.number(),
    slideBreakdown: z.array(z.object({
      index: z.number(),
      purpose: z.string(),
      elementCount: z.number(),
      textElementCount: z.number(),
      hasImage: z.boolean(),
      backgroundColor: z.string(),
      slots: z.array(z.any())
    })),
    slots: z.array(z.object({
      id: z.string(),
      slideIndex: z.number(),
      elementId: z.string(),
      type: z.string(),
      maxLength: z.number(),
      placeholder: z.string(),
      purpose: z.string(),
      required: z.boolean(),
      originalFontSize: z.number(),
      position: z.object({
        x: z.number(),
        y: z.number()
      })
    })),
    brandColors: z.array(z.string()),
    fonts: z.array(z.string()),
    totalSlots: z.number(),
    requiredSlots: z.number()
  })
})

/**
 * Response structure
 */
interface GenerationResponse {
  success: boolean
  slots: Array<{
    slotId: string
    content: string
  }>
  metadata: {
    tokensUsed: number
    generationTime: number
    model: string
  }
  error?: string
}

/**
 * Gets the API key for the user or falls back to system key
 */
async function getApiKey(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string> {
  // Try to get user's API key first
  const { data: userKey } = await supabase
    .from('user_api_keys')
    .select('encrypted_key')
    .eq('user_id', userId)
    .eq('provider', 'openrouter')
    .eq('is_valid', true)
    .single()

  if (userKey?.encrypted_key) {
    // In production, decrypt the key here
    return userKey.encrypted_key
  }

  // Fall back to system key
  const systemKey = process.env.OPENROUTER_API_KEY
  if (!systemKey) {
    throw new Error('No API key available')
  }

  return systemKey
}

/**
 * POST /api/ai/carousel/generate
 * Generates carousel content based on template and topic
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = requestSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: validationResult.error.issues
        },
        { status: 400 }
      )
    }

    const input = validationResult.data as CarouselGenerationInput

    // Get API key
    const apiKey = await getApiKey(supabase, user.id)

    // Get base prompts from service with fallback to defaults
    // Note: We still use buildCarouselSystemPrompt/buildCarouselUserPrompt for
    // template-specific logic, but we can use the service prompts as an enhancement
    const carouselSystemBase = await PromptService.getPromptWithFallback(PromptType.CAROUSEL_SYSTEM)

    // Build prompts using the template-aware builders
    // The builders already incorporate the base prompt patterns
    const systemPrompt = buildCarouselSystemPrompt(input)
    const userPrompt = buildCarouselUserPrompt(input)

    // Track start time for response metrics
    const aiStartTime = Date.now()

    // Initialize OpenRouter client
    const client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'ChainLinked Carousel Generator'
      }
    })

    // Call AI
    const completion = await client.chat.completions.create({
      model: 'openai/gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    const aiResponseTimeMs = Date.now() - aiStartTime

    const responseContent = completion.choices[0]?.message?.content
    if (!responseContent) {
      throw new Error('No response from AI')
    }

    // Parse response
    const contentMap = parseCarouselResponse(responseContent, input.templateAnalysis.slots)
    if (!contentMap) {
      throw new Error('Failed to parse AI response')
    }

    // Validate and fix content
    const validation = validateContent(contentMap, input.templateAnalysis.slots)

    // Truncate any content that exceeds limits
    const slots: Array<{ slotId: string; content: string }> = []
    input.templateAnalysis.slots.forEach(slot => {
      let content = contentMap.get(slot.id) || ''

      // Truncate if needed
      if (content.length > slot.maxLength) {
        content = truncateToFit(content, slot.maxLength)
      }

      if (content) {
        slots.push({
          slotId: slot.id,
          content
        })
      }
    })

    const generationTime = Date.now() - startTime

    const response: GenerationResponse = {
      success: true,
      slots,
      metadata: {
        tokensUsed: completion.usage?.total_tokens || 0,
        generationTime,
        model: 'gpt-4o'
      }
    }

    // Log validation issues as warnings
    if (!validation.isValid) {
      console.warn('Content validation issues:', validation.issues)
    }

    // Log usage for analytics (non-blocking)
    try {
      await PromptService.logUsage({
        promptType: PromptType.CAROUSEL_SYSTEM,
        promptVersion: 1,
        userId: user.id,
        feature: 'carousel',
        inputTokens: completion.usage?.prompt_tokens,
        outputTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens,
        model: 'openai/gpt-4o',
        responseTimeMs: aiResponseTimeMs,
        success: true,
        metadata: {
          topic: input.topic,
          tone: input.tone,
          totalSlides: input.templateAnalysis.totalSlides,
          slotsGenerated: slots.length,
          validationPassed: validation.isValid,
        },
      })
    } catch (logError) {
      // Usage logging should not block the response
      console.error('[Carousel] Failed to log usage:', logError)
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Carousel generation error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Handle specific error types
    if (errorMessage.includes('API key')) {
      return NextResponse.json(
        { success: false, error: 'API key not configured' },
        { status: 401 }
      )
    }

    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to generate carousel content' },
      { status: 500 }
    )
  }
}
