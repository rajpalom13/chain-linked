/**
 * Research API Route
 * @description API endpoint for performing content research using Tavily API
 * @module app/api/research/route
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  searchContent,
  TavilyError,
  type TavilySearchResult,
} from "@/lib/research/tavily-client"
import type { DiscoverPost } from "@/types/database"

/**
 * Direct save post data for addToFeed functionality
 */
interface SavePostData {
  /** URL of the source */
  url: string
  /** Title of the content */
  title: string
  /** Content excerpt/description */
  content: string
  /** Topic tags */
  topics: string[]
  /** Source name */
  source: string
  /** Published date */
  publishedDate?: string
}

/**
 * Request body for research endpoint
 */
interface ResearchRequest {
  /** Search query string */
  query?: string
  /** Optional topic filters */
  topics?: string[]
  /** Maximum number of results (default: 10) */
  maxResults?: number
  /** Search depth: 'basic' or 'advanced' */
  searchDepth?: "basic" | "advanced"
  /** Whether to save results to discover_posts table */
  saveResults?: boolean
  /** Direct save post data (alternative to query-based search) */
  savePost?: SavePostData
}

/**
 * Response from research endpoint
 */
interface ResearchResponse {
  /** Transformed results as DiscoverPost format */
  posts: Partial<DiscoverPost>[]
  /** Original query */
  query: string
  /** AI-generated summary of results */
  summary?: string
  /** Number of results returned */
  count: number
  /** Whether results were saved to database */
  saved: boolean
}

/**
 * Extracts domain name from URL for source attribution
 * @param url - URL to extract domain from
 * @returns Cleaned domain name
 */
function extractSource(url: string): string {
  try {
    const hostname = new URL(url).hostname
    // Remove www. and common TLDs for cleaner display
    return hostname
      .replace(/^www\./, "")
      .replace(/\.com$|\.org$|\.net$|\.io$/, "")
      .split(".")[0]
      .charAt(0)
      .toUpperCase() +
      hostname
        .replace(/^www\./, "")
        .replace(/\.com$|\.org$|\.net$|\.io$/, "")
        .split(".")[0]
        .slice(1)
  } catch {
    return "Research"
  }
}

/**
 * Transforms a Tavily search result into a DiscoverPost format
 * @param result - Tavily search result
 * @param topics - Topic tags to assign
 * @returns Partial DiscoverPost object
 */
function transformToDiscoverPost(
  result: TavilySearchResult,
  topics: string[]
): Partial<DiscoverPost> {
  const source = extractSource(result.url)
  const now = new Date().toISOString()

  // Calculate a pseudo engagement rate based on relevance score
  const engagementRate = result.score * 5 // Scale 0-1 to 0-5%

  return {
    linkedin_url: result.url,
    author_name: source,
    author_headline: `Content from ${source}`,
    author_avatar_url: null,
    author_profile_url: result.url,
    content: result.content || result.title,
    post_type: "article",
    likes_count: 0,
    comments_count: 0,
    reposts_count: 0,
    impressions_count: null,
    posted_at: result.publishedDate || now,
    scraped_at: now,
    topics: topics.length > 0 ? topics : ["research"],
    is_viral: false,
    engagement_rate: engagementRate,
    source: "tavily",
  }
}

/**
 * POST /api/research
 * @description Performs content research using Tavily API and returns results
 * in DiscoverPost format. Optionally saves results to discover_posts table.
 * @param request - Request with query, topics, maxResults
 * @returns Research results transformed to DiscoverPost format
 */
export async function POST(request: Request) {
  const supabase = await createClient()

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Parse request body
  let body: ResearchRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    )
  }

  // Check if this is a direct save request (has savePost data instead of query)
  if (body.savePost) {
    const post = body.savePost

    // Check for duplicates
    const { data: existing } = await supabase
      .from("discover_posts")
      .select("id")
      .eq("linkedin_url", post.url)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        results: [],
        message: "Post already exists in your feed",
        saved: 0,
      })
    }

    // Insert the post directly
    const now = new Date().toISOString()
    const { error } = await supabase.from("discover_posts").insert({
      linkedin_url: post.url,
      author_name: post.source || "Research",
      author_headline: "Via Tavily Research",
      content: post.content,
      post_type: "text",
      likes_count: 0,
      comments_count: 0,
      reposts_count: 0,
      posted_at: post.publishedDate || now,
      scraped_at: now,
      topics: post.topics,
      is_viral: false,
      engagement_rate: null,
      source: "research",
    })

    if (error) {
      console.error("Failed to save post:", error)
      return NextResponse.json(
        { error: "Failed to save post" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      results: [],
      message: "Post saved to feed",
      saved: 1,
    })
  }

  // Validate query
  const { query, topics = [], maxResults = 10, searchDepth = "basic", saveResults = false } = body

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: "Query is required" },
      { status: 400 }
    )
  }

  if (query.trim().length < 3) {
    return NextResponse.json(
      { error: "Query must be at least 3 characters" },
      { status: 400 }
    )
  }

  if (maxResults < 1 || maxResults > 20) {
    return NextResponse.json(
      { error: "maxResults must be between 1 and 20" },
      { status: 400 }
    )
  }

  try {
    // Perform search
    const searchResponse = await searchContent(query.trim(), {
      maxResults,
      searchDepth,
      includeAnswer: true,
    })

    // Transform results to DiscoverPost format
    const posts = searchResponse.results.map((result) =>
      transformToDiscoverPost(result, topics)
    )

    // Optionally save to database for caching
    let saved = false
    if (saveResults && posts.length > 0) {
      try {
        // Check for existing posts by URL to avoid duplicates
        const urls = posts.map((p) => p.linkedin_url).filter(Boolean) as string[]

        const { data: existing } = await supabase
          .from("discover_posts")
          .select("linkedin_url")
          .in("linkedin_url", urls)

        const existingUrls = new Set(existing?.map((e) => e.linkedin_url) || [])

        // Filter to only new posts
        const newPosts = posts.filter(
          (p) => p.linkedin_url && !existingUrls.has(p.linkedin_url)
        )

        if (newPosts.length > 0) {
          // Insert with all required fields
          const postsToInsert = newPosts.map((p) => ({
            linkedin_url: p.linkedin_url!,
            author_name: p.author_name || "Unknown",
            author_headline: p.author_headline || "",
            author_avatar_url: p.author_avatar_url,
            author_profile_url: p.author_profile_url,
            content: p.content || "",
            post_type: p.post_type,
            likes_count: p.likes_count || 0,
            comments_count: p.comments_count || 0,
            reposts_count: p.reposts_count || 0,
            impressions_count: p.impressions_count,
            posted_at: p.posted_at || new Date().toISOString(),
            topics: p.topics || [],
            is_viral: p.is_viral || false,
            engagement_rate: p.engagement_rate,
            source: "tavily",
          }))

          const { error: insertError } = await supabase
            .from("discover_posts")
            .insert(postsToInsert)

          if (!insertError) {
            saved = true
          } else {
            console.error("Failed to save research results:", insertError)
          }
        }
      } catch (saveError) {
        console.error("Error saving research results:", saveError)
        // Continue without saving - don't fail the request
      }
    }

    const response: ResearchResponse = {
      posts,
      query: searchResponse.query,
      summary: searchResponse.answer,
      count: posts.length,
      saved,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Research API error:", error)

    if (error instanceof TavilyError) {
      const status = error.statusCode || 500
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status }
      )
    }

    return NextResponse.json(
      { error: "Failed to perform research. Please try again." },
      { status: 500 }
    )
  }
}

/**
 * GET /api/research
 * @description Returns API status and configuration info
 */
export async function GET() {
  const hasApiKey = !!process.env.TAVILY_API_KEY

  return NextResponse.json({
    status: hasApiKey ? "configured" : "not_configured",
    message: hasApiKey
      ? "Tavily API is configured and ready"
      : "TAVILY_API_KEY environment variable is not set",
  })
}
