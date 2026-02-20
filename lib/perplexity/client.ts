/**
 * Perplexity API Client
 * @description Client for interacting with Perplexity AI for company research
 * @module lib/perplexity/client
 */

/** Perplexity API base URL */
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions'

/** Default model for research queries - using sonar-pro for higher quality results */
const DEFAULT_MODEL = 'sonar-pro'

/**
 * Perplexity message format
 */
export interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Perplexity chat completion request
 */
export interface PerplexityRequest {
  model: string
  messages: PerplexityMessage[]
  max_tokens?: number
  temperature?: number
  top_p?: number
  search_domain_filter?: string[]
  return_images?: boolean
  return_related_questions?: boolean
  search_recency_filter?: 'month' | 'week' | 'day' | 'year'
  top_k?: number
  stream?: boolean
  presence_penalty?: number
  frequency_penalty?: number
}

/**
 * Perplexity chat completion response
 */
export interface PerplexityResponse {
  id: string
  model: string
  created: number
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
  citations?: string[]
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
}

/**
 * Perplexity API client for company research
 */
export class PerplexityClient {
  private readonly apiKey: string
  private readonly model: string
  private readonly timeout: number

  /**
   * Creates a new Perplexity client
   * @param config - Client configuration
   */
  constructor(config: PerplexityClientConfig) {
    if (!config.apiKey) {
      throw new Error('Perplexity API key is required')
    }
    this.apiKey = config.apiKey
    this.model = config.model || DEFAULT_MODEL
    this.timeout = config.timeout || 60000 // 60 seconds default
  }

  /**
   * Sends a chat completion request to Perplexity
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

    try {
      const response = await fetch(PERPLEXITY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          ...options,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.error?.message ||
          `Perplexity API error: ${response.status} ${response.statusText}`
        )
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Perplexity request timed out')
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
      search_recency_filter: 'week',
      return_related_questions: false,
    })

    return response.choices[0]?.message?.content || ''
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
      search_recency_filter: 'week',
      return_related_questions: false,
    })

    return {
      content: response.choices[0]?.message?.content || '',
      citations: response.citations || [],
    }
  }
}

/**
 * Creates a Perplexity client using environment variables
 * @returns Perplexity client or null if not configured
 */
export function createPerplexityClient(): PerplexityClient | null {
  const apiKey = process.env.PERPLEXITY_API_KEY

  if (!apiKey) {
    console.warn('PERPLEXITY_API_KEY environment variable is not set')
    return null
  }

  return new PerplexityClient({ apiKey })
}
