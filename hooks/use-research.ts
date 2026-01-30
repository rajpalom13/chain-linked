/**
 * Research Hook
 * @description Custom hook for performing deep content research using Inngest workflow
 * Uses Tavily for search, Perplexity for enrichment, and OpenAI for post generation
 * @module hooks/use-research
 */

import * as React from "react"
import type { DiscoverPost } from "@/types/database"

/**
 * Research result item with additional metadata
 */
export interface ResearchResult {
  /** Unique identifier for the result */
  id: string
  /** URL of the source */
  url: string
  /** Title of the content */
  title: string
  /** Content excerpt/description */
  description: string
  /** Source name */
  source: string
  /** Source color for display */
  sourceColor: string
  /** Published date */
  publishedAt: string
  /** Relevance score (0-5) */
  relevanceScore: number
  /** Topic tags */
  topics: string[]
  /** Whether this result has been added to feed */
  addedToFeed: boolean
  /** Original post data for saving */
  originalPost: Partial<DiscoverPost>
}

/**
 * AI-generated LinkedIn post from research
 */
export interface GeneratedPost {
  /** Unique identifier */
  id: string
  /** Post content */
  content: string
  /** Post type (thought-leadership, storytelling, etc.) */
  postType: string
  /** Opening hook/first line */
  hook: string
  /** Call to action */
  cta?: string
  /** Word count */
  wordCount: number
  /** Estimated read time in seconds */
  estimatedReadTime?: number
  /** Post status */
  status: "draft" | "scheduled" | "posted" | "archived"
  /** Source URL the post was generated from */
  sourceUrl: string
  /** Source title */
  sourceTitle: string
  /** Source snippet */
  sourceSnippet?: string
  /** Research session ID */
  researchSessionId: string
  /** Created timestamp */
  createdAt: string
  /** Whether this post has been copied/used */
  isCopied?: boolean
}

/**
 * Research session status from Inngest workflow
 */
export type ResearchStatus =
  | "pending"
  | "initializing"
  | "searching"
  | "enriching"
  | "generating"
  | "saving"
  | "completed"
  | "failed"

/**
 * Research session progress
 */
interface ResearchProgress {
  step: string
  percentage: number
}

/**
 * Research state
 */
interface ResearchState {
  /** Research results */
  results: ResearchResult[]
  /** AI-generated LinkedIn posts */
  generatedPosts: GeneratedPost[]
  /** Whether research is in progress */
  isResearching: boolean
  /** Current research status */
  status: ResearchStatus | null
  /** Progress information */
  progress: ResearchProgress | null
  /** Error message if research failed */
  error: string | null
  /** AI-generated summary of results */
  summary: string | null
  /** Last query that was searched */
  lastQuery: string | null
  /** Current session ID */
  sessionId: string | null
  /** Number of posts discovered */
  postsDiscovered: number
  /** Number of posts generated */
  postsGenerated: number
}

/**
 * Options for performing research
 */
export interface ResearchOptions {
  /** Topic filters */
  topics?: string[]
  /** Maximum results per topic */
  maxResultsPerTopic?: number
  /** Search depth */
  depth?: "basic" | "deep"
  /** Whether to generate LinkedIn posts */
  generatePosts?: boolean
  /** Post types to generate */
  postTypes?: string[]
}

/**
 * Source colors for different domains
 */
const SOURCE_COLORS: Record<string, string> = {
  linkedin: "#0A66C2",
  medium: "#000000",
  forbes: "#AF0E0E",
  techcrunch: "#0A9E01",
  harvard: "#C41230",
  wired: "#000000",
  saastr: "#6366F1",
  substack: "#FF6719",
  twitter: "#1DA1F2",
  x: "#000000",
  research: "#6B7280",
  tavily: "#8B5CF6",
}

/**
 * Gets color for a source domain
 * @param source - Source name
 * @returns Hex color code
 */
function getSourceColor(source: string): string {
  const lowerSource = source.toLowerCase()
  for (const [key, color] of Object.entries(SOURCE_COLORS)) {
    if (lowerSource.includes(key)) {
      return color
    }
  }
  return SOURCE_COLORS.research
}

/**
 * Transforms API response post to ResearchResult
 * @param post - DiscoverPost from API
 * @param index - Index for generating unique ID
 * @returns ResearchResult for display
 */
function transformToResult(
  post: Partial<DiscoverPost>,
  index: number
): ResearchResult {
  const source = post.source || post.author_name || "Research"
  const content = post.content || ""
  const firstLine = content.split("\n")[0] || ""
  const title = firstLine.length > 100 ? firstLine.slice(0, 100) + "..." : firstLine
  const description =
    content.length > firstLine.length
      ? content.slice(firstLine.length).trim()
      : content

  return {
    id: post.id?.toString() || `research-${Date.now()}-${index}`,
    url: post.linkedin_url || "",
    title: title || "Untitled",
    description,
    source,
    sourceColor: getSourceColor(source),
    publishedAt: post.posted_at || new Date().toISOString(),
    relevanceScore: post.engagement_rate || 0,
    topics: post.topics || [],
    addedToFeed: false,
    originalPost: post,
  }
}

/** Polling interval in milliseconds */
const POLL_INTERVAL = 2000

/**
 * Custom hook for performing deep content research via Inngest workflow
 * @returns Research state and actions
 * @example
 * ```tsx
 * const { results, isResearching, status, progress, research, clearResults } = useResearch();
 *
 * const handleSearch = async () => {
 *   await research("AI in sales", { maxResultsPerTopic: 5, depth: "deep" });
 * };
 * ```
 */
export function useResearch() {
  const [state, setState] = React.useState<ResearchState>({
    results: [],
    generatedPosts: [],
    isResearching: false,
    status: null,
    progress: null,
    error: null,
    summary: null,
    lastQuery: null,
    sessionId: null,
    postsDiscovered: 0,
    postsGenerated: 0,
  })

  const pollingRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const abortControllerRef = React.useRef<AbortController | null>(null)

  /**
   * Stops polling for session status
   */
  const stopPolling = React.useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  /**
   * Transforms API generated post to GeneratedPost interface
   */
  const transformGeneratedPost = (post: Record<string, unknown>): GeneratedPost => ({
    id: post.id as string,
    content: post.content as string,
    postType: post.post_type as string,
    hook: post.hook as string || "",
    cta: post.cta as string | undefined,
    wordCount: post.word_count as number || 0,
    estimatedReadTime: post.estimated_read_time as number | undefined,
    status: post.status as "draft" | "scheduled" | "posted" | "archived",
    sourceUrl: post.source_url as string || "",
    sourceTitle: post.source_title as string || "",
    sourceSnippet: post.source_snippet as string | undefined,
    researchSessionId: post.research_session_id as string,
    createdAt: post.created_at as string,
    isCopied: false,
  })

  /**
   * Fetches generated posts for a session
   */
  const fetchGeneratedPosts = React.useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/research/posts?sessionId=${sessionId}&limit=50`)

      if (!response.ok) {
        throw new Error("Failed to fetch generated posts")
      }

      const data = await response.json()
      const posts = (data.posts || []).map(transformGeneratedPost)

      return posts as GeneratedPost[]
    } catch (error) {
      console.error("Failed to fetch generated posts:", error)
      return []
    }
  }, [])

  /**
   * Fetches discover posts for a completed session
   */
  const fetchSessionResults = React.useCallback(async (sessionId: string) => {
    try {
      // Fetch both discover posts and generated posts in parallel
      const [discoverResponse, generatedPosts] = await Promise.all([
        fetch(`/api/discover/posts?source=research&limit=20`),
        fetchGeneratedPosts(sessionId),
      ])

      if (!discoverResponse.ok) {
        throw new Error("Failed to fetch results")
      }

      const data = await discoverResponse.json()
      const posts = data.posts || []

      const results = posts.map(
        (post: Partial<DiscoverPost>, index: number) =>
          transformToResult(post, index)
      )

      setState((prev) => ({
        ...prev,
        results,
        generatedPosts,
        isResearching: false,
      }))
    } catch (error) {
      console.error("Failed to fetch session results:", error)
    }
  }, [fetchGeneratedPosts])

  /**
   * Polls the session status until completion
   */
  const pollSessionStatus = React.useCallback(
    async (sessionId: string) => {
      try {
        const response = await fetch(`/api/research/status/${sessionId}`)

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new Error(error.error || "Failed to fetch status")
        }

        const data = await response.json()

        setState((prev) => ({
          ...prev,
          status: data.status,
          progress: data.progress,
          postsDiscovered: data.results?.postsDiscovered || 0,
          postsGenerated: data.results?.postsGenerated || 0,
          error: data.error || null,
        }))

        // Check if completed or failed
        if (data.status === "completed") {
          stopPolling()
          await fetchSessionResults(sessionId)

          // Generate summary from results
          const summary = `Found ${data.results?.postsDiscovered || 0} relevant articles and generated ${data.results?.postsGenerated || 0} LinkedIn post drafts.`
          setState((prev) => ({
            ...prev,
            summary,
            isResearching: false,
          }))
        } else if (data.status === "failed") {
          stopPolling()
          setState((prev) => ({
            ...prev,
            isResearching: false,
            error: data.error || "Research failed",
          }))
        }
      } catch (error) {
        console.error("Polling error:", error)
        // Don't stop polling on transient errors
      }
    },
    [stopPolling, fetchSessionResults]
  )

  /**
   * Starts the research workflow
   * @param query - Search query/topic
   * @param options - Research options
   */
  const research = React.useCallback(
    async (query: string, options?: ResearchOptions) => {
      if (!query.trim()) {
        setState((prev) => ({
          ...prev,
          error: "Please enter a search query",
        }))
        return
      }

      // Stop any existing polling
      stopPolling()

      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      setState({
        results: [],
        generatedPosts: [],
        isResearching: true,
        status: "pending",
        progress: { step: "Starting research", percentage: 0 },
        error: null,
        summary: null,
        lastQuery: query,
        sessionId: null,
        postsDiscovered: 0,
        postsGenerated: 0,
      })

      try {
        // Start the Inngest workflow
        const response = await fetch("/api/research/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topics: [query.trim()],
            depth: options?.depth || "basic",
            maxResultsPerTopic: options?.maxResultsPerTopic || 5,
            generatePosts: options?.generatePosts !== false,
            postTypes: options?.postTypes || [
              "thought-leadership",
              "educational",
              "storytelling",
            ],
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            errorData.error || `Research failed with status ${response.status}`
          )
        }

        const data = await response.json()

        setState((prev) => ({
          ...prev,
          sessionId: data.sessionId,
          status: "initializing",
          progress: { step: "Initializing", percentage: 5 },
        }))

        // Start polling for status
        pollingRef.current = setInterval(() => {
          pollSessionStatus(data.sessionId)
        }, POLL_INTERVAL)

        // Also poll immediately
        await pollSessionStatus(data.sessionId)
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return // Request was cancelled
        }

        const message =
          error instanceof Error ? error.message : "Failed to start research"

        setState((prev) => ({
          ...prev,
          isResearching: false,
          status: "failed",
          error: message,
        }))
      }
    },
    [stopPolling, pollSessionStatus]
  )

  /**
   * Performs a quick search using direct Tavily API (no enrichment/generation)
   * @param query - Search query
   * @param options - Research options
   */
  const quickSearch = React.useCallback(
    async (query: string, options?: ResearchOptions) => {
      if (!query.trim()) {
        setState((prev) => ({
          ...prev,
          error: "Please enter a search query",
        }))
        return
      }

      setState((prev) => ({
        ...prev,
        isResearching: true,
        error: null,
        results: [],
        summary: null,
        lastQuery: query,
        status: "searching",
        progress: { step: "Searching web", percentage: 50 },
      }))

      try {
        const response = await fetch("/api/research", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: query.trim(),
            topics: options?.topics || [],
            maxResults: options?.maxResultsPerTopic || 10,
            searchDepth: options?.depth || "basic",
            saveResults: false,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(
            errorData.error || `Research failed with status ${response.status}`
          )
        }

        const data = await response.json()

        const results = (data.posts || []).map(
          (post: Partial<DiscoverPost>, index: number) =>
            transformToResult(post, index)
        )

        setState((prev) => ({
          ...prev,
          results,
          summary: data.summary || null,
          isResearching: false,
          status: "completed",
          progress: { step: "Completed", percentage: 100 },
          error: null,
        }))
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to perform research"

        setState((prev) => ({
          ...prev,
          isResearching: false,
          status: "failed",
          error: message,
          results: [],
          summary: null,
        }))
      }
    },
    []
  )

  /**
   * Clears all research results and resets state
   */
  const clearResults = React.useCallback(() => {
    stopPolling()
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setState({
      results: [],
      generatedPosts: [],
      isResearching: false,
      status: null,
      progress: null,
      error: null,
      summary: null,
      lastQuery: null,
      sessionId: null,
      postsDiscovered: 0,
      postsGenerated: 0,
    })
  }, [stopPolling])

  /**
   * Marks a generated post as copied
   * @param postId - ID of the generated post
   */
  const markPostCopied = React.useCallback((postId: string) => {
    setState((prev) => ({
      ...prev,
      generatedPosts: prev.generatedPosts.map((p) =>
        p.id === postId ? { ...p, isCopied: true } : p
      ),
    }))
  }, [])

  /**
   * Updates a generated post's status
   * @param postId - ID of the generated post
   * @param status - New status
   */
  const updatePostStatus = React.useCallback(
    async (postId: string, status: "draft" | "scheduled" | "posted" | "archived"): Promise<boolean> => {
      try {
        const response = await fetch("/api/research/posts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ postId, status }),
        })

        if (response.ok) {
          setState((prev) => ({
            ...prev,
            generatedPosts: prev.generatedPosts.map((p) =>
              p.id === postId ? { ...p, status } : p
            ),
          }))
          return true
        }
        return false
      } catch (error) {
        console.error("Failed to update post status:", error)
        return false
      }
    },
    []
  )

  /**
   * Deletes a generated post
   * @param postId - ID of the generated post to delete
   */
  const deleteGeneratedPost = React.useCallback(
    async (postId: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/research/posts?postId=${postId}`, {
          method: "DELETE",
        })

        if (response.ok) {
          setState((prev) => ({
            ...prev,
            generatedPosts: prev.generatedPosts.filter((p) => p.id !== postId),
          }))
          return true
        }
        return false
      } catch (error) {
        console.error("Failed to delete generated post:", error)
        return false
      }
    },
    []
  )

  /**
   * Marks a result as added to feed
   * @param resultId - ID of the result to mark
   */
  const markAsAdded = React.useCallback((resultId: string) => {
    setState((prev) => ({
      ...prev,
      results: prev.results.map((r) =>
        r.id === resultId ? { ...r, addedToFeed: true } : r
      ),
    }))
  }, [])

  /**
   * Adds a research result to the discover feed
   * @param result - Research result to add
   * @returns Promise that resolves when added
   */
  const addToFeed = React.useCallback(
    async (result: ResearchResult): Promise<boolean> => {
      try {
        const response = await fetch("/api/research", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            savePost: {
              url: result.url,
              title: result.title,
              content: result.description || result.title,
              topics: result.topics,
              source: result.source,
              publishedDate: result.publishedAt,
            },
          }),
        })

        if (response.ok) {
          markAsAdded(result.id)
          return true
        }
        return false
      } catch (error) {
        console.error("Failed to add to feed:", error)
        return false
      }
    },
    [markAsAdded]
  )

  /**
   * Checks if research APIs are configured
   * @returns Promise resolving to configuration status
   */
  const checkApiStatus = React.useCallback(async (): Promise<{
    configured: boolean
    message: string
  }> => {
    try {
      const response = await fetch("/api/research/test")
      const data = await response.json()

      const allConfigured =
        data.tavilyConfigured &&
        data.perplexityConfigured &&
        data.openrouterConfigured

      return {
        configured: allConfigured,
        message: allConfigured
          ? "All research APIs are configured"
          : `Missing: ${[
              !data.tavilyConfigured && "Tavily",
              !data.perplexityConfigured && "Perplexity",
              !data.openrouterConfigured && "OpenRouter"
            ].filter(Boolean).join(", ")}`,
      }
    } catch (error) {
      console.error("Failed to check API status:", error)
      return {
        configured: false,
        message: "Failed to check API status",
      }
    }
  }, [])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopPolling()
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [stopPolling])

  return {
    ...state,
    research,
    quickSearch,
    clearResults,
    markAsAdded,
    addToFeed,
    checkApiStatus,
    markPostCopied,
    updatePostStatus,
    deleteGeneratedPost,
  }
}
