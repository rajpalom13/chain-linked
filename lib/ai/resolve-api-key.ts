/**
 * Resolves the AI API key for a user, checking multiple sources in priority order.
 *
 * Priority:
 * 1. User's stored OpenAI OAuth token (from openai_connections table) — always preferred
 * 2. Server-side OPENROUTER_API_KEY environment variable as fallback
 *
 * @module lib/ai/resolve-api-key
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Resolves the best available API key for AI generation.
 * OAuth connection is always checked first and preferred over OpenRouter.
 *
 * @param supabase - Authenticated Supabase server client
 * @param userId - The authenticated user's ID
 * @returns The resolved API key, or null if none available
 */
export async function resolveApiKey(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  // 1. Check for stored OAuth connection first (always preferred)
  try {
    const { data: connection } = await supabase
      .from('openai_connections')
      .select('auth_method, api_key, access_token, token_expires_at, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (connection) {
      // Manual API key stored via settings
      if (connection.auth_method === 'manual' && connection.api_key) {
        return connection.api_key
      }
      // OAuth device-code token
      if (connection.auth_method === 'oauth-device' && connection.access_token) {
        // Check if token is expired
        if (connection.token_expires_at) {
          const expiresAt = new Date(connection.token_expires_at)
          if (expiresAt <= new Date()) {
            console.warn('[resolve-api-key] OAuth token expired for user', userId)
            // Token expired — fall through to OpenRouter
          } else {
            return connection.access_token
          }
        } else {
          return connection.access_token
        }
      }
    }
  } catch {
    // Query failed — fall through to OpenRouter
  }

  // 2. Fallback to server environment variable
  return process.env.OPENROUTER_API_KEY || null
}
