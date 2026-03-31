/**
 * ChatGPT Codex Backend Client
 *
 * Creates an OpenAI-compatible client that routes through the ChatGPT Codex
 * backend (chatgpt.com/backend-api) instead of the standard OpenAI API.
 * This allows ChatGPT Plus/Pro subscribers to use their subscription for
 * API calls via OAuth tokens.
 *
 * Key differences from standard OpenAI/OpenRouter:
 * - Base URL: chatgpt.com/backend-api (not api.openai.com or openrouter.ai)
 * - Uses Chat Completions endpoint with Codex-specific headers
 * - Requires: chatgpt-account-id, originator headers
 * - Forces store=false
 *
 * @module lib/ai/codex-client
 */

import OpenAI from 'openai'
import { observeOpenAI } from '@langfuse/openai'

/** Codex backend base URL */
const CODEX_BASE_URL = 'https://chatgpt.com/backend-api'

/**
 * Creates an OpenAI-compatible client routed through the ChatGPT Codex backend.
 *
 * @param accessToken - OAuth access token from device-code flow
 * @param accountId - ChatGPT account ID for routing
 * @returns OpenAI client configured for Codex backend
 */
export function createCodexClient(accessToken: string, accountId?: string | null): OpenAI {
  const codexFetch: typeof globalThis.fetch = async (input, init) => {
    let url = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : (input as Request).url

    // Rewrite chat/completions URL for Codex
    // The SDK calls /v1/chat/completions, we need /codex/v1/chat/completions
    url = url.replace(
      CODEX_BASE_URL + '/v1/',
      CODEX_BASE_URL + '/codex/v1/'
    )

    // Add Codex-specific headers
    const headers = new Headers(init?.headers || {})
    if (accountId) {
      headers.set('chatgpt-account-id', accountId)
    }
    headers.set('originator', 'codex_cli_rs')

    // Modify request body to add store=false
    let modifiedInit = init
    if (init?.body && typeof init.body === 'string') {
      try {
        const body = JSON.parse(init.body)
        body.store = false

        // Map OpenRouter model paths to standard model names
        if (body.model && body.model.startsWith('openai/')) {
          body.model = body.model.replace('openai/', '')
        }

        modifiedInit = { ...init, body: JSON.stringify(body) }
      } catch {
        // Body parsing failed — pass through unchanged
      }
    }

    const response = await globalThis.fetch(url, { ...modifiedInit, headers })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[codex-client] ${response.status}:`, errorText.substring(0, 500))
      return new Response(errorText, {
        status: response.status,
        headers: response.headers,
      })
    }

    return response
  }

  const client = new OpenAI({
    apiKey: accessToken,
    baseURL: CODEX_BASE_URL + '/v1',
    timeout: 60000,
    maxRetries: 1,
    fetch: codexFetch,
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://chainlinked.ai',
      'X-Title': 'ChainLinked',
    },
  })

  return observeOpenAI(client, {
    traceName: 'chainlinked-codex',
  })
}
