/**
 * API Keys Management Route
 * @description CRUD operations for user API keys (BYOK - Bring Your Own Key)
 * @module app/api/settings/api-keys
 */

import { createClient } from '@/lib/supabase/server'
import { encrypt, decrypt, createKeyHint, validateOpenAIKeyFormat } from '@/lib/crypto'
import { NextResponse } from 'next/server'

/**
 * Supported API key providers
 */
type ApiKeyProvider = 'openai'

/**
 * Response type for API key status
 */
interface ApiKeyStatusResponse {
  hasKey: boolean
  provider: ApiKeyProvider
  keyHint: string | null
  isValid: boolean
  lastValidated: string | null
}

/**
 * Validates an API key by making a test request to OpenRouter
 * @param apiKey - The OpenRouter API key to validate (sk-or-v1-...) or OpenAI key (sk-...)
 * @returns Object with isValid boolean and error message if invalid
 * @see https://openrouter.ai/docs/api/reference/authentication
 */
async function validateOpenAIKey(apiKey: string): Promise<{ isValid: boolean; error?: string }> {
  try {
    // Make a lightweight request to OpenRouter to verify the key
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'ChainLinked',
      },
    })

    if (response.ok) {
      return { isValid: true }
    }

    const errorData = await response.json().catch(() => null)
    const errorMessage = errorData?.error?.message || 'Invalid API key'

    if (response.status === 401) {
      return { isValid: false, error: 'Invalid API key. Please check your key and try again.' }
    }

    if (response.status === 429) {
      return { isValid: false, error: 'Rate limited. The API key is valid but has exceeded its quota.' }
    }

    return { isValid: false, error: errorMessage }
  } catch (error) {
    console.error('OpenRouter validation error:', error)
    return { isValid: false, error: 'Failed to validate API key. Please try again.' }
  }
}

/**
 * GET - Check if user has API key configured
 * @returns API key status for the authenticated user
 */
export async function GET(request: Request) {
  try {
    // Log request for debugging
    console.log('[API Keys] GET request received')

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch user's API key for OpenAI
    const { data: apiKeyData, error: fetchError } = await supabase
      .from('user_api_keys')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'openai')
      .single()

    // Check if environment variable is set (server-side key via OpenRouter)
    const hasEnvKey = !!process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'your_openrouter_key_here'

    // Handle database errors gracefully
    // PGRST116 = no rows found (expected when user has no key)
    // 42P01 = table doesn't exist (table not created yet)
    // Other errors = log but don't fail - return "no key" status
    if (fetchError && fetchError.code !== 'PGRST116') {
      // Log the error for debugging but don't fail the request
      // This allows the UI to work even if the table hasn't been set up yet
      console.warn('API key fetch warning:', fetchError.code, fetchError.message)

      // Return response with env key status
      const defaultResponse: ApiKeyStatusResponse = {
        hasKey: hasEnvKey,
        provider: 'openai',
        keyHint: hasEnvKey ? '(Server-configured)' : null,
        isValid: hasEnvKey,
        lastValidated: null,
      }
      return NextResponse.json(defaultResponse)
    }

    // If user has a key in the database, use that
    // Otherwise, fall back to environment variable
    const hasUserKey = !!apiKeyData
    const hasKey = hasUserKey || hasEnvKey

    const response: ApiKeyStatusResponse = {
      hasKey,
      provider: 'openai',
      keyHint: apiKeyData?.key_hint || (hasEnvKey ? '(Server-configured)' : null),
      isValid: apiKeyData?.is_valid ?? hasEnvKey,
      lastValidated: apiKeyData?.last_validated_at || null,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/settings/api-keys error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST - Save or update API key
 * @param request - Request with provider and apiKey
 * @returns Success status with key hint
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    let body: { provider?: string; apiKey?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { provider = 'openai', apiKey } = body

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }

    // Validate provider
    if (provider !== 'openai') {
      return NextResponse.json({ error: 'Unsupported provider. Only "openai" is supported.' }, { status: 400 })
    }

    // Validate API key format
    const formatValidation = validateOpenAIKeyFormat(apiKey)
    if (!formatValidation.isValid) {
      return NextResponse.json({ error: formatValidation.error }, { status: 400 })
    }

    // Validate API key with OpenAI
    const validationResult = await validateOpenAIKey(apiKey)
    if (!validationResult.isValid) {
      return NextResponse.json({
        error: validationResult.error,
        validationFailed: true,
      }, { status: 400 })
    }

    // Encrypt the API key
    const encryptedKey = encrypt(apiKey)
    const keyHint = createKeyHint(apiKey)
    const now = new Date().toISOString()

    // Upsert the API key (insert or update)
    const { error: upsertError } = await supabase
      .from('user_api_keys')
      .upsert({
        user_id: user.id,
        provider: provider as ApiKeyProvider,
        encrypted_key: encryptedKey,
        key_hint: keyHint,
        is_valid: true,
        last_validated_at: now,
        updated_at: now,
      }, {
        onConflict: 'user_id,provider',
      })

    if (upsertError) {
      console.error('API key upsert error:', upsertError.code, upsertError.message)

      // Check if it's a "table doesn't exist" error
      if (upsertError.code === '42P01') {
        return NextResponse.json({
          error: 'API keys table not configured. Please contact support or run database migrations.',
        }, { status: 503 })
      }

      return NextResponse.json({ error: 'Failed to save API key' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      keyHint,
      isValid: true,
      lastValidated: now,
    })
  } catch (error) {
    console.error('POST /api/settings/api-keys error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE - Remove API key
 * @returns Success status
 */
export async function DELETE() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete the API key
    const { error: deleteError } = await supabase
      .from('user_api_keys')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', 'openai')

    if (deleteError) {
      console.error('API key delete error:', deleteError.code, deleteError.message)

      // Check if it's a "table doesn't exist" error - treat as success (nothing to delete)
      if (deleteError.code === '42P01') {
        return NextResponse.json({ success: true })
      }

      return NextResponse.json({ error: 'Failed to delete API key' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/settings/api-keys error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH - Re-validate existing API key
 * @returns Validation result
 */
export async function PATCH() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the existing API key
    const { data: apiKeyData, error: fetchError } = await supabase
      .from('user_api_keys')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'openai')
      .single()

    if (fetchError || !apiKeyData) {
      // Check if table doesn't exist
      if (fetchError?.code === '42P01') {
        return NextResponse.json({ error: 'No API key found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'No API key found' }, { status: 404 })
    }

    // Decrypt and validate
    let decryptedKey: string
    try {
      decryptedKey = decrypt(apiKeyData.encrypted_key)
    } catch (decryptError) {
      console.error('Decryption error:', decryptError)
      return NextResponse.json({ error: 'Failed to decrypt API key' }, { status: 500 })
    }

    const validationResult = await validateOpenAIKey(decryptedKey)
    const now = new Date().toISOString()

    // Update validation status
    const { error: updateError } = await supabase
      .from('user_api_keys')
      .update({
        is_valid: validationResult.isValid,
        last_validated_at: now,
        updated_at: now,
      })
      .eq('user_id', user.id)
      .eq('provider', 'openai')

    if (updateError) {
      console.error('Validation update error:', updateError)
    }

    return NextResponse.json({
      isValid: validationResult.isValid,
      error: validationResult.error,
      lastValidated: now,
    })
  } catch (error) {
    console.error('PATCH /api/settings/api-keys error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
