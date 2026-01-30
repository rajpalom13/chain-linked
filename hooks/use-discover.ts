/**
 * Discover Hook
 * @description Custom hook for managing discover page state, topics, and content
 * with real API integration and infinite scroll support
 * @module hooks/use-discover
 */

import * as React from "react"
import type { DiscoverPost } from "@/types/database"

/**
 * Discover article/content item (kept for backward compatibility with existing card)
 */
export interface DiscoverArticle {
  /** Unique identifier */
  id: string
  /** Source name or publication */
  source: string
  /** Color for source label */
  sourceColor: string
  /** Article/post title or first line */
  title: string
  /** Article description or content excerpt */
  description: string
  /** Optional URL to original content */
  url?: string
  /** Topic slug this article belongs to */
  topic: string
  /** ISO date string of publication */
  publishedAt: string
  /** Author display name */
  authorName?: string
  /** Author headline */
  authorHeadline?: string
  /** Author avatar URL */
  authorAvatarUrl?: string | null
  /** Author profile URL */
  authorProfileUrl?: string | null
  /** Number of likes */
  likesCount?: number
  /** Number of comments */
  commentsCount?: number
  /** Number of reposts */
  repostsCount?: number
  /** Engagement rate percentage */
  engagementRate?: number | null
  /** Whether the post is viral */
  isViral?: boolean
}

/**
 * Topic configuration
 */
export interface Topic {
  /** Unique identifier */
  id: string
  /** Display name */
  name: string
  /** URL-safe slug */
  slug: string
  /** Number of posts for this topic */
  postCount?: number
}

/**
 * Sort option for discover feed
 */
export type DiscoverSortOption = "engagement" | "recent" | "viral"

/**
 * Discover state
 */
interface DiscoverState {
  topics: Topic[]
  activeTopic: string
  articles: DiscoverArticle[]
  isLoading: boolean
  isLoadingMore: boolean
  error: string | null
  page: number
  hasMore: boolean
  sort: DiscoverSortOption
  searchQuery: string
}

/**
 * Default topics for new users
 */
const DEFAULT_TOPICS: Topic[] = [
  { id: "1", name: "All", slug: "all" },
  { id: "2", name: "Artificial Intelligence", slug: "artificial-intelligence" },
  { id: "3", name: "Sales Enablement", slug: "sales-enablement" },
  { id: "4", name: "Remote Work", slug: "remote-work" },
  { id: "5", name: "SaaS Growth", slug: "saas-growth" },
  { id: "6", name: "Leadership", slug: "leadership" },
]

/**
 * Source colors mapping for visual distinction
 */
const SOURCE_COLORS: Record<string, string> = {
  techcrunch: "#0A9E01",
  quantanite: "#3B82F6",
  "harvard business review": "#C41230",
  saastr: "#6366F1",
  forbes: "#AF0E0E",
  wired: "#000000",
  "mit technology review": "#A31F34",
  "the verge": "#F9405F",
  "fast company": "#000000",
  linkedin: "#0A66C2",
  apify: "#00C7B7",
  manual: "#6B7280",
  import: "#8B5CF6",
}

/**
 * Get color for a source
 * @param source - Source name
 * @returns Hex color code
 */
function getSourceColor(source: string): string {
  return SOURCE_COLORS[source.toLowerCase()] || "#6B7280"
}

/**
 * Convert a DiscoverPost from the API to a DiscoverArticle for display
 * @param post - Database discover post
 * @returns DiscoverArticle for rendering
 */
function postToArticle(post: DiscoverPost): DiscoverArticle {
  const firstLine = post.content.split("\n")[0]?.trim() || ""
  const title =
    firstLine.length > 120 ? firstLine.slice(0, 120) + "..." : firstLine
  const description =
    post.content.length > firstLine.length
      ? post.content.slice(firstLine.length).trim()
      : post.content

  return {
    id: post.id,
    source: post.source,
    sourceColor: getSourceColor(post.source),
    title,
    description,
    url: post.linkedin_url,
    topic: post.topics[0] || "general",
    publishedAt: post.posted_at,
    authorName: post.author_name,
    authorHeadline: post.author_headline,
    authorAvatarUrl: post.author_avatar_url,
    authorProfileUrl: post.author_profile_url,
    likesCount: post.likes_count,
    commentsCount: post.comments_count,
    repostsCount: post.reposts_count,
    engagementRate: post.engagement_rate,
    isViral: post.is_viral,
  }
}

/**
 * Mock articles data by topic (fallback when API returns no data)
 */
const MOCK_ARTICLES: Record<string, DiscoverArticle[]> = {
  "all": [
    {
      id: "ai-1",
      source: "Quantanite",
      sourceColor: getSourceColor("quantanite"),
      title: "AI in Sales: How Machine Learning is Revolutionizing Lead Scoring Models",
      description: "Recent studies show that AI-driven lead scoring can increase conversion rates by up to 30%. By analyzing thousands of data points, sales teams can now prioritize prospects with unprecedented accuracy, saving countless hours on manual qualification.",
      topic: "artificial-intelligence",
      publishedAt: "2024-01-20T10:00:00Z",
      authorName: "Sarah Chen",
      authorHeadline: "VP of Sales at TechCorp",
      authorAvatarUrl: null,
      likesCount: 342,
      commentsCount: 45,
      repostsCount: 28,
      engagementRate: 3.2,
      isViral: true,
    },
    {
      id: "sales-1",
      source: "Forbes",
      sourceColor: getSourceColor("forbes"),
      title: "The New Sales Playbook: Adapting to Buyer-Centric Selling",
      description: "Modern B2B buyers complete 70% of their journey before speaking to sales. Learn how top-performing teams are adapting their strategies to meet prospects where they are.",
      topic: "sales-enablement",
      publishedAt: "2024-01-20T11:00:00Z",
      authorName: "Mark Johnson",
      authorHeadline: "Chief Revenue Officer at SalesForce",
      authorAvatarUrl: null,
      likesCount: 567,
      commentsCount: 89,
      repostsCount: 45,
      engagementRate: 4.1,
      isViral: true,
    },
    {
      id: "remote-1",
      source: "Wired",
      sourceColor: getSourceColor("wired"),
      title: "The Future of Work is Asynchronous",
      description: "Companies embracing async-first communication are seeing productivity gains of up to 25%. Learn how leading tech companies are redesigning their workflows for the distributed era.",
      topic: "remote-work",
      publishedAt: "2024-01-20T09:00:00Z",
      authorName: "Lisa Park",
      authorHeadline: "Head of Remote at GitLab",
      authorAvatarUrl: null,
      likesCount: 892,
      commentsCount: 134,
      repostsCount: 67,
      engagementRate: 5.2,
      isViral: true,
    },
  ],
  "artificial-intelligence": [
    {
      id: "ai-1",
      source: "Quantanite",
      sourceColor: getSourceColor("quantanite"),
      title: "AI in Sales: How Machine Learning is Revolutionizing Lead Scoring Models",
      description: "Recent studies show that AI-driven lead scoring can increase conversion rates by up to 30%. By analyzing thousands of data points, sales teams can now prioritize prospects with unprecedented accuracy, saving countless hours on manual qualification.",
      topic: "artificial-intelligence",
      publishedAt: "2024-01-20T10:00:00Z",
      authorName: "Sarah Chen",
      authorHeadline: "VP of Sales at TechCorp",
      authorAvatarUrl: null,
      likesCount: 342,
      commentsCount: 45,
      repostsCount: 28,
      engagementRate: 3.2,
      isViral: true,
    },
    {
      id: "ai-2",
      source: "TechCrunch",
      sourceColor: getSourceColor("techcrunch"),
      title: "The Shift to Product-Led Growth in B2B Enterprise Software",
      description: "Traditional sales-led models are being challenged by PLG strategies even in the enterprise sector. Companies are finding that end-user adoption is a more powerful driver of retention than executive procurement.",
      topic: "artificial-intelligence",
      publishedAt: "2024-01-19T14:30:00Z",
      authorName: "Alex Rivera",
      authorHeadline: "Staff Writer at TechCrunch",
      authorAvatarUrl: null,
      likesCount: 198,
      commentsCount: 32,
      repostsCount: 15,
      engagementRate: 1.8,
      isViral: false,
    },
    {
      id: "ai-3",
      source: "Harvard Business Review",
      sourceColor: getSourceColor("harvard business review"),
      title: "Building Trust in a Digital-First Sales Environment",
      description: "Without face-to-face meetings, building rapport requires a new set of skills. Digital empathy and active listening through video calls have become the most sought-after soft skills for modern account executives.",
      topic: "artificial-intelligence",
      publishedAt: "2024-01-18T09:00:00Z",
      authorName: "Dr. Amy Wei",
      authorHeadline: "Professor of Business at Harvard",
      authorAvatarUrl: null,
      likesCount: 456,
      commentsCount: 78,
      repostsCount: 34,
      engagementRate: 3.8,
      isViral: true,
    },
    {
      id: "ai-4",
      source: "SaaStr",
      sourceColor: getSourceColor("saastr"),
      title: "5 Key Metrics Every CRO Should Watch in 2024",
      description: "Beyond ARR and churn, the modern Chief Revenue Officer needs to keep an eye on NRR, CAC payback period, and the emerging 'Usage Intensity' metric. We break down what these numbers really mean for the health of your business.",
      topic: "artificial-intelligence",
      publishedAt: "2024-01-17T16:00:00Z",
      authorName: "Jason Lemkin",
      authorHeadline: "Founder at SaaStr",
      authorAvatarUrl: null,
      likesCount: 723,
      commentsCount: 112,
      repostsCount: 56,
      engagementRate: 4.5,
      isViral: true,
    },
  ],
  "sales-enablement": [
    {
      id: "sales-1",
      source: "Forbes",
      sourceColor: getSourceColor("forbes"),
      title: "The New Sales Playbook: Adapting to Buyer-Centric Selling",
      description: "Modern B2B buyers complete 70% of their journey before speaking to sales. Learn how top-performing teams are adapting their strategies to meet prospects where they are.",
      topic: "sales-enablement",
      publishedAt: "2024-01-20T11:00:00Z",
      authorName: "Mark Johnson",
      authorHeadline: "Chief Revenue Officer at SalesForce",
      authorAvatarUrl: null,
      likesCount: 567,
      commentsCount: 89,
      repostsCount: 45,
      engagementRate: 4.1,
      isViral: true,
    },
    {
      id: "sales-2",
      source: "Harvard Business Review",
      sourceColor: getSourceColor("harvard business review"),
      title: "Building High-Performance Sales Teams in a Hybrid World",
      description: "The shift to remote and hybrid work has fundamentally changed how sales teams operate. Discover the frameworks that leading organizations use to maintain culture and drive results.",
      topic: "sales-enablement",
      publishedAt: "2024-01-19T08:00:00Z",
      authorName: "Rachel Kim",
      authorHeadline: "Sales Director at HubSpot",
      authorAvatarUrl: null,
      likesCount: 234,
      commentsCount: 41,
      repostsCount: 19,
      engagementRate: 2.3,
      isViral: true,
    },
    {
      id: "sales-3",
      source: "SaaStr",
      sourceColor: getSourceColor("saastr"),
      title: "Revenue Operations: The Missing Link in Your Growth Strategy",
      description: "RevOps has emerged as the critical function bridging sales, marketing, and customer success. Here's why companies with dedicated RevOps teams grow 19% faster than those without.",
      topic: "sales-enablement",
      publishedAt: "2024-01-18T13:00:00Z",
      authorName: "Tom Bradley",
      authorHeadline: "VP RevOps at Gong",
      authorAvatarUrl: null,
      likesCount: 389,
      commentsCount: 56,
      repostsCount: 31,
      engagementRate: 3.0,
      isViral: true,
    },
  ],
  "remote-work": [
    {
      id: "remote-1",
      source: "Wired",
      sourceColor: getSourceColor("wired"),
      title: "The Future of Work is Asynchronous",
      description: "Companies embracing async-first communication are seeing productivity gains of up to 25%. Learn how leading tech companies are redesigning their workflows for the distributed era.",
      topic: "remote-work",
      publishedAt: "2024-01-20T09:00:00Z",
      authorName: "Lisa Park",
      authorHeadline: "Head of Remote at GitLab",
      authorAvatarUrl: null,
      likesCount: 892,
      commentsCount: 134,
      repostsCount: 67,
      engagementRate: 5.2,
      isViral: true,
    },
    {
      id: "remote-2",
      source: "Fast Company",
      sourceColor: getSourceColor("fast company"),
      title: "Digital Nomad Visas: Which Countries Are Leading the Way",
      description: "Over 50 countries now offer specialized visas for remote workers. We analyze the best options for professionals looking to work from anywhere.",
      topic: "remote-work",
      publishedAt: "2024-01-19T12:00:00Z",
      authorName: "David Torres",
      authorHeadline: "Digital Nomad & Travel Writer",
      authorAvatarUrl: null,
      likesCount: 145,
      commentsCount: 23,
      repostsCount: 12,
      engagementRate: 1.4,
      isViral: false,
    },
  ],
  "saas-growth": [
    {
      id: "saas-1",
      source: "SaaStr",
      sourceColor: getSourceColor("saastr"),
      title: "The Rule of 40 is Dead. Long Live the Rule of X",
      description: "Investors are evolving their metrics for evaluating SaaS companies. The new 'Rule of X' framework accounts for market conditions and company stage in ways the old model never could.",
      topic: "saas-growth",
      publishedAt: "2024-01-20T14:00:00Z",
      authorName: "Jason Lemkin",
      authorHeadline: "Founder at SaaStr",
      authorAvatarUrl: null,
      likesCount: 567,
      commentsCount: 98,
      repostsCount: 43,
      engagementRate: 4.2,
      isViral: true,
    },
    {
      id: "saas-2",
      source: "TechCrunch",
      sourceColor: getSourceColor("techcrunch"),
      title: "Why Usage-Based Pricing is Winning in 2024",
      description: "From Snowflake to OpenAI, usage-based pricing models are dominating the fastest-growing software companies. Here's how to make the transition.",
      topic: "saas-growth",
      publishedAt: "2024-01-18T10:00:00Z",
      authorName: "Emma Davis",
      authorHeadline: "Pricing Strategy at Stripe",
      authorAvatarUrl: null,
      likesCount: 312,
      commentsCount: 54,
      repostsCount: 27,
      engagementRate: 2.8,
      isViral: true,
    },
  ],
  "leadership": [
    {
      id: "lead-1",
      source: "Harvard Business Review",
      sourceColor: getSourceColor("harvard business review"),
      title: "The Executive's Guide to AI Transformation",
      description: "AI adoption isn't just a technology challenge -- it's a leadership one. Learn how successful executives are navigating organizational change in the age of artificial intelligence.",
      topic: "leadership",
      publishedAt: "2024-01-20T08:00:00Z",
      authorName: "Michael Porter",
      authorHeadline: "Professor at Harvard Business School",
      authorAvatarUrl: null,
      likesCount: 1023,
      commentsCount: 156,
      repostsCount: 89,
      engagementRate: 6.1,
      isViral: true,
    },
    {
      id: "lead-2",
      source: "Forbes",
      sourceColor: getSourceColor("forbes"),
      title: "Building Resilient Teams Through Psychological Safety",
      description: "Google's Project Aristotle revealed that psychological safety is the #1 predictor of team success. Here's how to cultivate it in your organization.",
      topic: "leadership",
      publishedAt: "2024-01-19T11:00:00Z",
      authorName: "Dr. Susan David",
      authorHeadline: "Psychologist & Author",
      authorAvatarUrl: null,
      likesCount: 445,
      commentsCount: 67,
      repostsCount: 38,
      engagementRate: 3.4,
      isViral: true,
    },
  ],
}

/**
 * Items per page for pagination
 */
const PAGE_SIZE = 12

/**
 * Local storage key for user topics
 */
const TOPICS_STORAGE_KEY = "chainlinked_discover_topics"

/**
 * Fetch discover posts from the API
 * @param topic - Topic slug to filter by
 * @param page - Page number (1-based)
 * @param sort - Sort option
 * @param search - Search query
 * @returns API response with posts and pagination
 */
async function fetchDiscoverPosts(
  topic: string,
  page: number,
  sort: DiscoverSortOption,
  search: string
): Promise<{
  posts: DiscoverPost[]
  pagination: { page: number; limit: number; total: number; hasMore: boolean }
  fallback: boolean
}> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: PAGE_SIZE.toString(),
    sort,
  })

  if (topic && topic !== "all") {
    params.set("topic", topic)
  }

  if (search) {
    params.set("search", search)
  }

  const response = await fetch(`/api/discover/posts?${params.toString()}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Custom hook for managing discover page state with real API integration
 * @returns Discover state and actions including infinite scroll support
 */
export function useDiscover() {
  const [state, setState] = React.useState<DiscoverState>({
    topics: [],
    activeTopic: "",
    articles: [],
    isLoading: true,
    isLoadingMore: false,
    error: null,
    page: 1,
    hasMore: false,
    sort: "engagement",
    searchQuery: "",
  })

  /**
   * Load topics from local storage on mount
   */
  React.useEffect(() => {
    const loadTopics = () => {
      try {
        const stored = localStorage.getItem(TOPICS_STORAGE_KEY)
        const storedTopics: Topic[] = stored ? JSON.parse(stored) : []

        // Ensure "All" tab always exists
        const hasAll = storedTopics.some((t) => t.slug === "all")
        const topics = hasAll
          ? storedTopics
          : storedTopics.length > 0
            ? [{ id: "all", name: "All", slug: "all" }, ...storedTopics]
            : DEFAULT_TOPICS

        const activeTopic = topics[0]?.slug || "all"

        setState((prev) => ({
          ...prev,
          topics,
          activeTopic,
          isLoading: true,
        }))
      } catch {
        setState((prev) => ({
          ...prev,
          topics: DEFAULT_TOPICS,
          activeTopic: DEFAULT_TOPICS[0].slug,
          isLoading: true,
        }))
      }
    }

    loadTopics()
  }, [])

  /**
   * Load articles when active topic, sort, or search changes
   */
  React.useEffect(() => {
    if (!state.activeTopic) return

    let cancelled = false

    const loadArticles = async () => {
      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        page: 1,
        articles: [],
      }))

      try {
        const result = await fetchDiscoverPosts(
          state.activeTopic,
          1,
          state.sort,
          state.searchQuery
        )

        if (cancelled) return

        if (result.fallback || result.posts.length === 0) {
          // Fallback to mock data
          const topicSlug = state.activeTopic
          const mockArticles = MOCK_ARTICLES[topicSlug] || MOCK_ARTICLES["all"] || []
          setState((prev) => ({
            ...prev,
            articles: mockArticles,
            isLoading: false,
            page: 1,
            hasMore: false,
          }))
        } else {
          const articles = result.posts.map(postToArticle)
          setState((prev) => ({
            ...prev,
            articles,
            isLoading: false,
            page: 1,
            hasMore: result.pagination.hasMore,
          }))
        }
      } catch {
        if (cancelled) return

        // On error, try fallback to mock data
        const topicSlug = state.activeTopic
        const mockArticles = MOCK_ARTICLES[topicSlug] || MOCK_ARTICLES["all"] || []

        if (mockArticles.length > 0) {
          setState((prev) => ({
            ...prev,
            articles: mockArticles,
            isLoading: false,
            page: 1,
            hasMore: false,
            error: null,
          }))
        } else {
          setState((prev) => ({
            ...prev,
            error: "Failed to load articles. Please try again.",
            isLoading: false,
          }))
        }
      }
    }

    loadArticles()

    return () => {
      cancelled = true
    }
  }, [state.activeTopic, state.sort, state.searchQuery])

  /**
   * Load more articles for infinite scroll
   */
  const loadMore = React.useCallback(async () => {
    if (state.isLoadingMore || !state.hasMore) return

    setState((prev) => ({ ...prev, isLoadingMore: true }))

    try {
      const nextPage = state.page + 1
      const result = await fetchDiscoverPosts(
        state.activeTopic,
        nextPage,
        state.sort,
        state.searchQuery
      )

      const newArticles = result.posts.map(postToArticle)

      setState((prev) => ({
        ...prev,
        articles: [...prev.articles, ...newArticles],
        isLoadingMore: false,
        page: nextPage,
        hasMore: result.pagination.hasMore,
      }))
    } catch {
      setState((prev) => ({
        ...prev,
        isLoadingMore: false,
      }))
    }
  }, [state.isLoadingMore, state.hasMore, state.page, state.activeTopic, state.sort, state.searchQuery])

  /**
   * Set the active topic
   * @param topicSlug - Topic slug to activate
   */
  const setActiveTopic = React.useCallback((topicSlug: string) => {
    setState((prev) => ({
      ...prev,
      activeTopic: topicSlug,
      page: 1,
      hasMore: false,
    }))
  }, [])

  /**
   * Set the sort option
   * @param sort - Sort option to apply
   */
  const setSort = React.useCallback((sort: DiscoverSortOption) => {
    setState((prev) => ({
      ...prev,
      sort,
      page: 1,
      hasMore: false,
    }))
  }, [])

  /**
   * Set the search query
   * @param query - Search query string
   */
  const setSearchQuery = React.useCallback((query: string) => {
    setState((prev) => ({
      ...prev,
      searchQuery: query,
      page: 1,
      hasMore: false,
    }))
  }, [])

  /**
   * Add a new topic
   * @param name - Topic name
   */
  const addTopic = React.useCallback((name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
    const id = `topic-${Date.now()}`

    setState((prev) => {
      if (prev.topics.some((t) => t.slug === slug)) {
        return prev
      }

      const newTopics = [...prev.topics, { id, name, slug }]
      localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(newTopics))
      return { ...prev, topics: newTopics }
    })
  }, [])

  /**
   * Remove a topic
   * @param topicId - Topic ID to remove
   */
  const removeTopic = React.useCallback((topicId: string) => {
    setState((prev) => {
      // Don't allow removing the "All" topic
      const topicToRemove = prev.topics.find((t) => t.id === topicId)
      if (topicToRemove?.slug === "all") return prev

      const newTopics = prev.topics.filter((t) => t.id !== topicId)
      if (newTopics.length === 0) return prev

      localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(newTopics))

      const newActiveTopic =
        topicToRemove?.slug === prev.activeTopic
          ? newTopics[0].slug
          : prev.activeTopic

      return { ...prev, topics: newTopics, activeTopic: newActiveTopic }
    })
  }, [])

  /**
   * Update topics order/list
   * @param topics - New topics array
   */
  const updateTopics = React.useCallback((topics: Topic[]) => {
    localStorage.setItem(TOPICS_STORAGE_KEY, JSON.stringify(topics))
    setState((prev) => ({ ...prev, topics }))
  }, [])

  /**
   * Retry loading articles
   */
  const retry = React.useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    const currentTopic = state.activeTopic
    setState((prev) => ({ ...prev, activeTopic: "" }))
    setTimeout(() => {
      setState((prev) => ({ ...prev, activeTopic: currentTopic }))
    }, 0)
  }, [state.activeTopic])

  /**
   * Refresh the current feed
   */
  const refresh = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      page: 1,
      hasMore: false,
      articles: [],
      isLoading: true,
      error: null,
    }))
    // Re-trigger by toggling activeTopic
    const currentTopic = state.activeTopic
    setState((prev) => ({ ...prev, activeTopic: "" }))
    setTimeout(() => {
      setState((prev) => ({ ...prev, activeTopic: currentTopic }))
    }, 0)
  }, [state.activeTopic])

  return {
    ...state,
    setActiveTopic,
    setSort,
    setSearchQuery,
    addTopic,
    removeTopic,
    updateTopics,
    retry,
    refresh,
    loadMore,
  }
}
