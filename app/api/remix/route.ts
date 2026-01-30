/**
 * Remix API Route
 * @description Handles AI-powered post remix using OpenRouter API (GPT-4.1)
 * @module app/api/remix
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  createOpenAIClient,
  chatCompletion,
  OpenAIError,
  getErrorMessage,
  DEFAULT_MODEL,
} from '@/lib/ai/openai-client'
import {
  getRemixSystemPrompt,
  formatRemixUserMessage,
  validateRemixContent,
  type RemixTone,
} from '@/lib/ai/remix-prompts'

/**
 * Request body for remix endpoint
 */
interface RemixRequest {
  /** Original post content to remix */
  content: string
  /** Desired tone for the remix */
  tone: RemixTone
  /** Optional custom instructions */
  instructions?: string
}

/**
 * Response body for remix endpoint
 */
interface RemixResponse {
  /** Remixed content */
  remixedContent: string
  /** Original content (echoed back) */
  originalContent: string
  /** Tokens used in the request */
  tokensUsed: {
    prompt: number
    completion: number
    total: number
  }
  /** Model used for generation */
  model: string
}

/**
 * Decrypts the API key from storage
 * @param encryptedKey - The encrypted key from database
 * @returns Decrypted API key
 * @note For MVP, using base64 encoding. In production, use Supabase Vault.
 */
function decryptApiKey(encryptedKey: string): string {
  // MVP: Base64 encoding (should use Supabase Vault in production)
  try {
    return Buffer.from(encryptedKey, 'base64').toString('utf-8')
  } catch {
    // If it's not base64 encoded, return as-is (for existing keys)
    return encryptedKey
  }
}

/**
 * POST /api/remix
 * @description Remixes post content using AI with user's OpenAI API key
 * @param request - Remix request with content, tone, and optional instructions
 * @returns Remixed content with token usage stats
 */
export async function POST(request: Request) {
  const supabase = await createClient()

  // Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized', code: 'unauthorized' },
      { status: 401 }
    )
  }

  // Parse request body
  let body: RemixRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body', code: 'invalid_request' },
      { status: 400 }
    )
  }

  const { content, tone, instructions } = body

  // Validate tone
  const validTones: RemixTone[] = ['match-my-style', 'professional', 'casual', 'inspiring', 'educational', 'thought-provoking']
  if (!tone || !validTones.includes(tone)) {
    return NextResponse.json(
      { error: 'Invalid tone. Must be one of: match-my-style, professional, casual, inspiring, educational, thought-provoking', code: 'invalid_tone' },
      { status: 400 }
    )
  }

  // Validate content
  const validation = validateRemixContent(content)
  if (!validation.isValid) {
    return NextResponse.json(
      { error: validation.error, code: 'invalid_content' },
      { status: 400 }
    )
  }

  // Fetch user's API key (or fall back to environment variable)
  let apiKey: string | undefined

  try {
    const { data: apiKeyData, error: keyError } = await supabase
      .from('user_api_keys')
      .select('encrypted_key, is_valid')
      .eq('user_id', user.id)
      .eq('provider', 'openai')
      .single()

    if (!keyError && apiKeyData?.is_valid && apiKeyData.encrypted_key) {
      apiKey = decryptApiKey(apiKeyData.encrypted_key)
    }
  } catch {
    // Table might not exist, continue to fallback
    console.log('user_api_keys table not available, using environment variable')
  }

  // Fallback to environment variable (OpenRouter)
  if (!apiKey) {
    apiKey = process.env.OPENROUTER_API_KEY
  }

  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'No API key found. Please set OPENROUTER_API_KEY in environment or add your API key in Settings.',
        code: 'no_api_key'
      },
      { status: 400 }
    )
  }

  // Create OpenAI client
  const client = createOpenAIClient({ apiKey })

  // Build prompts
  const systemPrompt = getRemixSystemPrompt(tone, instructions)
  const userMessage = formatRemixUserMessage(content)

  try {
    // Make OpenRouter API call with GPT-4.1
    const response = await chatCompletion(client, {
      systemPrompt,
      userMessage,
      model: DEFAULT_MODEL, // GPT-4.1 via OpenRouter
      temperature: 0.7,
      maxTokens: 1024,
    })

    // Update last_used_at timestamp
    await supabase
      .from('user_api_keys')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('provider', 'openai')

    const result: RemixResponse = {
      remixedContent: response.content,
      originalContent: content,
      tokensUsed: {
        prompt: response.promptTokens,
        completion: response.completionTokens,
        total: response.totalTokens,
      },
      model: response.model,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Remix API error:', error)

    if (error instanceof OpenAIError) {
      const userMessage = getErrorMessage(error)

      // If API key is invalid, mark it as such in the database
      if (error.type === 'invalid_api_key') {
        await supabase
          .from('user_api_keys')
          .update({ is_valid: false })
          .eq('user_id', user.id)
          .eq('provider', 'openai')
      }

      return NextResponse.json(
        { error: userMessage, code: error.type },
        { status: error.type === 'rate_limit' ? 429 : 400 }
      )
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.', code: 'unknown' },
      { status: 500 }
    )
  }
}
