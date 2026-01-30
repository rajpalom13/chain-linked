/**
 * Tavily API Client
 * @description Client for performing content research using the Tavily Search API
 * @module lib/research/tavily-client
 */

/**
 * Individual search result from Tavily API
 */
export interface TavilySearchResult {
  /** Title of the search result */
  title: string
  /** URL of the source */
  url: string
  /** Content excerpt/snippet */
  content: string
  /** Relevance score (0-1) */
  score: number
  /** Published date if available */
  publishedDate?: string
  /** Raw content if requested */
  rawContent?: string
}

/**
 * Response from Tavily Search API
 */
export interface TavilySearchResponse {
  /** Query that was searched */
  query: string
  /** Array of search results */
  results: TavilySearchResult[]
  /** AI-generated answer summarizing results (if include_answer was true) */
  answer?: string
  /** Response time in seconds */
  responseTime?: number
}

/**
 * Options for Tavily search
 */
export interface TavilySearchOptions {
  /** Maximum number of results to return (default: 10) */
  maxResults?: number
  /** Search depth: 'basic' for faster results, 'advanced' for more comprehensive */
  searchDepth?: "basic" | "advanced"
  /** Only include results from these domains */
  includeDomains?: string[]
  /** Exclude results from these domains */
  excludeDomains?: string[]
  /** Include an AI-generated answer summarizing the results */
  includeAnswer?: boolean
  /** Include raw content from pages */
  includeRawContent?: boolean
  /** Topic category for better relevance */
  topic?: "general" | "news"
}

/**
 * Tavily API error class
 */
export class TavilyError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message)
    this.name = "TavilyError"
  }
}

/**
 * Default configuration for Tavily API
 */
const TAVILY_API_URL = "https://api.tavily.com/search"
const DEFAULT_MAX_RESULTS = 10
const DEFAULT_SEARCH_DEPTH = "basic"

/**
 * Searches for content using the Tavily API
 * @param query - Search query string
 * @param options - Optional search configuration
 * @returns Promise resolving to search response with results
 * @throws TavilyError if the API request fails
 * @example
 * ```typescript
 * const results = await searchContent("AI in sales enablement", {
 *   maxResults: 5,
 *   searchDepth: "advanced",
 *   includeDomains: ["linkedin.com", "medium.com"],
 * });
 * ```
 */
export async function searchContent(
  query: string,
  options?: TavilySearchOptions
): Promise<TavilySearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY

  if (!apiKey) {
    throw new TavilyError(
      "TAVILY_API_KEY environment variable is not configured",
      500,
      "MISSING_API_KEY"
    )
  }

  if (!query || query.trim().length === 0) {
    throw new TavilyError("Search query cannot be empty", 400, "INVALID_QUERY")
  }

  const requestBody = {
    api_key: apiKey,
    query: query.trim(),
    search_depth: options?.searchDepth ?? DEFAULT_SEARCH_DEPTH,
    max_results: options?.maxResults ?? DEFAULT_MAX_RESULTS,
    include_answer: options?.includeAnswer ?? true,
    include_raw_content: options?.includeRawContent ?? false,
    include_domains: options?.includeDomains ?? [],
    exclude_domains: options?.excludeDomains ?? [],
    topic: options?.topic ?? "general",
  }

  try {
    const response = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error")
      throw new TavilyError(
        `Tavily API request failed: ${errorText}`,
        response.status,
        "API_ERROR"
      )
    }

    const data = await response.json()

    // Transform response to our interface
    const transformedResults: TavilySearchResult[] = (data.results || []).map(
      (result: Record<string, unknown>) => ({
        title: result.title as string || "",
        url: result.url as string || "",
        content: result.content as string || "",
        score: typeof result.score === "number" ? result.score : 0,
        publishedDate: result.published_date as string | undefined,
        rawContent: result.raw_content as string | undefined,
      })
    )

    return {
      query: data.query || query,
      results: transformedResults,
      answer: data.answer,
      responseTime: data.response_time,
    }
  } catch (error) {
    if (error instanceof TavilyError) {
      throw error
    }

    // Handle network or other errors
    const message =
      error instanceof Error ? error.message : "Unknown error occurred"
    throw new TavilyError(`Failed to search content: ${message}`, 500, "NETWORK_ERROR")
  }
}

/**
 * Searches for LinkedIn-specific content using Tavily
 * @param query - Search query string
 * @param options - Optional search configuration
 * @returns Promise resolving to search response filtered for LinkedIn content
 * @example
 * ```typescript
 * const results = await searchLinkedInContent("sales leadership tips");
 * ```
 */
export async function searchLinkedInContent(
  query: string,
  options?: Omit<TavilySearchOptions, "includeDomains">
): Promise<TavilySearchResponse> {
  return searchContent(query, {
    ...options,
    includeDomains: ["linkedin.com"],
  })
}

/**
 * Searches for industry news and trends
 * @param query - Search query string
 * @param options - Optional search configuration
 * @returns Promise resolving to news-focused search results
 * @example
 * ```typescript
 * const results = await searchIndustryNews("B2B SaaS trends 2024");
 * ```
 */
export async function searchIndustryNews(
  query: string,
  options?: TavilySearchOptions
): Promise<TavilySearchResponse> {
  return searchContent(query, {
    ...options,
    topic: "news",
    searchDepth: options?.searchDepth ?? "advanced",
  })
}
