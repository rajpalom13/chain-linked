/**
 * Perplexity API Client (via OpenRouter)
 * @description Routes Perplexity sonar-pro requests through OpenRouter for unified API key management.
 * Falls back to direct Perplexity API if OPENROUTER_API_KEY is not set but PERPLEXITY_API_KEY is.
 * @module lib/perplexity/client
 */

/** OpenRouter API base URL (OpenAI-compatible) */
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

/** Direct Perplexity API base URL (fallback) */
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions'

/** Default model for research queries via OpenRouter */
const DEFAULT_OPENROUTER_MODEL = 'perplexity/sonar-pro'

/** Default model for direct Perplexity API */
const DEFAULT_PERPLEXITY_MODEL = 'sonar-pro'

/**
 * Perplexity message format
 */
export interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Perplexity chat completion request
 * @see https://docs.perplexity.ai/api-reference/chat-completions-post
 */
export interface PerplexityRequest {
  model: string
  messages: PerplexityMessage[]
  max_tokens?: number
  temperature?: number
  top_p?: number
  /** Controls search behaviour: academic, sec, or web (default) */
  search_mode?: 'academic' | 'sec' | 'web'
  /** Only for sonar-deep-research model */
  reasoning_effort?: 'low' | 'medium' | 'high'
  stream?: boolean
}

/**
 * Search result returned by the Perplexity API
 */
export interface PerplexitySearchResult {
  title: string
  url: string
  date?: string
}

/**
 * Perplexity chat completion response
 * @see https://docs.perplexity.ai/api-reference/chat-completions-post
 */
export interface PerplexityResponse {
  id: string
  model: string
  created: number
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
    search_context_size?: string
    citation_tokens?: number
    num_search_queries?: number
    reasoning_tokens?: number
  }
  /** @deprecated Use search_results instead */
  citations?: string[]
  /** Search results with title, url, and date */
  search_results?: PerplexitySearchResult[]
  object: string
  choices: {
    index: number
    finish_reason: string
    message: {
      role: string
      content: string
    }
    delta?: {
      role?: string
      content?: string
    }
  }[]
}

/**
 * Perplexity client configuration
 */
export interface PerplexityClientConfig {
  apiKey: string
  model?: string
  timeout?: number
  /** Whether this client routes through OpenRouter */
  viaOpenRouter?: boolean
}

/**
 * Perplexity API client routed through OpenRouter
 * Uses the perplexity/sonar-pro model on OpenRouter for unified billing and API key management.
 * Falls back to direct Perplexity API when only PERPLEXITY_API_KEY is configured.
 */
export class PerplexityClient {
  private readonly apiKey: string
  private readonly model: string
  private readonly timeout: number
  private readonly viaOpenRouter: boolean
  private readonly apiUrl: string

  /**
   * Creates a new Perplexity client
   * @param config - Client configuration
   */
  constructor(config: PerplexityClientConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required')
    }
    this.apiKey = config.apiKey
    this.viaOpenRouter = config.viaOpenRouter ?? false
    this.model = config.model || (this.viaOpenRouter ? DEFAULT_OPENROUTER_MODEL : DEFAULT_PERPLEXITY_MODEL)
    this.timeout = config.timeout || 60000 // 60 seconds default
    this.apiUrl = this.viaOpenRouter ? OPENROUTER_API_URL : PERPLEXITY_API_URL
  }

  /**
   * Sends a chat completion request to Perplexity (via OpenRouter or direct)
   * @param messages - Array of messages
   * @param options - Additional request options
   * @returns Perplexity response
   */
  async chat(
    messages: PerplexityMessage[],
    options?: Partial<PerplexityRequest>
  ): Promise<PerplexityResponse> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    // Build headers based on routing
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    }

    if (this.viaOpenRouter) {
      headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      headers['X-Title'] = 'ChainLinked'
    }

    // Build request body — OpenRouter uses standard OpenAI fields
    // search_mode and reasoning_effort are Perplexity-specific extras
    const body: Record<string, unknown> = {
      model: this.model,
      messages,
    }

    if (options?.temperature !== undefined) body.temperature = options.temperature
    if (options?.max_tokens !== undefined) body.max_tokens = options.max_tokens
    if (options?.top_p !== undefined) body.top_p = options.top_p

    // Perplexity-specific options — OpenRouter passes these through to Perplexity
    if (options?.search_mode) body.search_mode = options.search_mode
    if (options?.reasoning_effort) body.reasoning_effort = options.reasoning_effort

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const provider = this.viaOpenRouter ? 'OpenRouter' : 'Perplexity'
        throw new Error(
          errorData.error?.message ||
          `${provider} API error: ${response.status} ${response.statusText}`
        )
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out')
      }
      throw error
    }
  }

  /**
   * Performs a research query with online search
   * @param query - Research query
   * @param systemPrompt - Optional system prompt
   * @returns Research result text
   */
  async research(query: string, systemPrompt?: string): Promise<string> {
    const messages: PerplexityMessage[] = []

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }

    messages.push({ role: 'user', content: query })

    const response = await this.chat(messages, {
      search_mode: 'web',
    })

    return response.choices[0]?.message?.content || ''
  }

  /**
   * Extract citation URLs from the response, handling both old and new formats
   * @param response - Perplexity API response
   * @returns Array of citation URLs
   */
  static extractCitations(response: PerplexityResponse): string[] {
    // New format: search_results array with url field
    if (response.search_results?.length) {
      return response.search_results.map((r) => r.url)
    }
    // Legacy format: citations string array
    if (response.citations?.length) {
      return response.citations
    }
    return []
  }

  /**
   * Performs a research query and returns content with citations
   * @param query - Research query
   * @param systemPrompt - Optional system prompt
   * @returns Object with content and citations array
   */
  async researchWithCitations(
    query: string,
    systemPrompt?: string
  ): Promise<{ content: string; citations: string[] }> {
    const messages: PerplexityMessage[] = []

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }

    messages.push({ role: 'user', content: query })

    const response = await this.chat(messages, {
      search_mode: 'web',
    })

    return {
      content: response.choices[0]?.message?.content || '',
      citations: PerplexityClient.extractCitations(response),
    }
  }
}

/**
 * Creates a Perplexity client, preferring OpenRouter routing over direct Perplexity API.
 * Priority: OPENROUTER_API_KEY (via OpenRouter) > PERPLEXITY_API_KEY (direct) > null
 * @returns Perplexity client or null if neither key is configured
 */
export function createPerplexityClient(): PerplexityClient | null {
  // Prefer OpenRouter for unified API key management
  const openRouterKey = process.env.OPENROUTER_API_KEY
  if (openRouterKey) {
    return new PerplexityClient({
      apiKey: openRouterKey,
      viaOpenRouter: true,
    })
  }

  // Fallback to direct Perplexity API
  const perplexityKey = process.env.PERPLEXITY_API_KEY
  if (perplexityKey) {
    console.warn('Using direct Perplexity API key — consider switching to OPENROUTER_API_KEY')
    return new PerplexityClient({
      apiKey: perplexityKey,
      viaOpenRouter: false,
    })
  }

  console.warn('Neither OPENROUTER_API_KEY nor PERPLEXITY_API_KEY is configured')
  return null
}
