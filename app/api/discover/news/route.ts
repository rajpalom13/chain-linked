/**
 * Discover News API Route
 * @description Fetches Perplexity-sourced news articles for the Discover tab
 * @module app/api/discover/news
 */

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * Valid sort options for discover news
 */
type NewsSortOption = "recent" | "relevance"

/**
 * GET /api/discover/news
 * @description Fetches news articles with filtering, sorting, and pagination
 * @param request - Incoming request with query params: topic, page, limit, sort, search
 * @returns Paginated list of news articles
 */
export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const topic = searchParams.get("topic") || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)))
  const sort = (searchParams.get("sort") || "recent") as NewsSortOption
  const search = searchParams.get("search") || ""

  const offset = (page - 1) * limit

  try {
    let query = supabase
      .from("discover_news_articles")
      .select("*", { count: "exact" })

    // Filter by topic
    if (topic && topic !== "all") {
      query = query.eq("topic", topic)
    }

    // Search in headline and summary (sanitize PostgREST special chars)
    if (search) {
      const sanitized = search.replace(/[%_.,()]/g, "")
      if (sanitized.length > 0) {
        query = query.or(
          `headline.ilike.%${sanitized}%,summary.ilike.%${sanitized}%`
        )
      }
    }

    // Apply sorting
    switch (sort) {
      case "relevance":
        query = query
          .order("freshness", { ascending: true })
          .order("created_at", { ascending: false })
        break
      case "recent":
      default:
        query = query.order("created_at", { ascending: false })
        break
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: articles, error: queryError, count } = await query

    if (queryError) {
      if (
        queryError.code === "42P01" ||
        queryError.message?.includes("does not exist")
      ) {
        return NextResponse.json({
          articles: [],
          pagination: {
            page,
            limit,
            total: 0,
            hasMore: false,
          },
        })
      }
      throw queryError
    }

    const total = count ?? 0

    return NextResponse.json({
      articles: articles || [],
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error("Error fetching discover news:", error)
    return NextResponse.json(
      { error: "Failed to fetch discover news" },
      { status: 500 }
    )
  }
}
