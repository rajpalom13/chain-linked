/**
 * Discover News Seed API Route
 * @description Triggers the ingest pipeline to populate discover_news_articles
 * with fresh content. Tries Perplexity first, falls back to Tavily search.
 * Uses Inngest for async processing when available, otherwise runs directly.
 *
 * Returns a `reason` field on every response so the frontend can act
 * intelligently without parsing free-text messages:
 * - `no_api_key`      -- Neither PERPLEXITY_API_KEY nor TAVILY_API_KEY is configured
 * - `already_exists`  -- articles already exist for the requested topics
 * - `no_results`      -- search returned zero usable articles (fallback only)
 * - `success`         -- articles were ingested and saved (fallback only)
 * - `triggered`       -- ingest dispatched via Inngest (async)
 * @module app/api/discover/news/seed
 */

import { createClient } from "@/lib/supabase/server"
import { inngest } from "@/lib/inngest/client"
import { runIngestPipeline } from "@/lib/inngest/functions/ingest-articles"
import { NextResponse } from "next/server"

/** Possible reason codes returned by the seed endpoint */
type SeedReason = "no_api_key" | "already_exists" | "no_results" | "success" | "triggered"

/**
 * Shape shared by every successful (non-error) JSON response from this route.
 * The `reason` discriminator lets callers branch without string-matching.
 */
interface SeedResponse {
  seeded: boolean
  reason: SeedReason
  message: string
  count?: number
  batchId?: string
  articlesIngested?: number
}

/**
 * POST /api/discover/news/seed
 * @description Seeds the discover_news_articles table by running the
 * Perplexity ingest pipeline for the supplied topics. The handler
 * short-circuits early when the API key is missing or articles already
 * exist, avoiding expensive network calls.
 * @param request - Incoming request with JSON body containing a `topics` string array
 * @returns A {@link SeedResponse} with a machine-readable `reason` field
 */
export async function POST(request: Request) {
  // ---- Auth check ----
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // ---- API key gate (need at least one search provider) ----
    if (!process.env.PERPLEXITY_API_KEY && !process.env.TAVILY_API_KEY) {
      console.warn("[Seed] Neither PERPLEXITY_API_KEY nor TAVILY_API_KEY is configured")
      return NextResponse.json<SeedResponse>({
        seeded: false,
        reason: "no_api_key",
        message:
          "No search API key configured. Set PERPLEXITY_API_KEY or TAVILY_API_KEY to enable news ingestion.",
      })
    }

    // ---- Topic validation ----
    const body = await request.json()
    const topics: string[] = body.topics || []
    const force: boolean = body.force === true

    if (topics.length === 0) {
      return NextResponse.json(
        { error: "No topics provided" },
        { status: 400 },
      )
    }

    const validTopics = topics.filter((t) => t !== "all")

    // ---- Per-topic duplicate check (skip when force = true) ----
    // Only seed topics that are missing recent articles (< 24h old).
    // Previously this checked ALL topics at once, so a single topic
    // with existing articles would block every other topic from being seeded.
    let topicsToSeed = validTopics.length > 0 ? validTopics : topics

    if (!force && topicsToSeed.length > 0) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const { data: recentRows, error: countError } = await supabase
        .from("discover_news_articles")
        .select("topic")
        .in("topic", topicsToSeed)
        .gte("created_at", oneDayAgo)

      if (countError) {
        console.warn("[Seed] Error checking recent articles:", countError)
      } else {
        const topicsWithRecentArticles = new Set(
          (recentRows || []).map((r: { topic: string }) => r.topic)
        )
        topicsToSeed = topicsToSeed.filter(
          (t) => !topicsWithRecentArticles.has(t)
        )

        if (topicsToSeed.length === 0) {
          return NextResponse.json<SeedResponse>({
            seeded: false,
            reason: "already_exists",
            message:
              "All requested topics already have recent articles (< 24h old)",
          })
        }

        console.log(
          `[Seed] ${topicsWithRecentArticles.size} topics already have recent articles, seeding ${topicsToSeed.length} remaining topics`
        )
      }
    }

    // ---- Dispatch via Inngest (primary) with direct fallback ----
    const ingestTopics = topicsToSeed
    const batchId = crypto.randomUUID()

    try {
      await inngest.send({
        name: "discover/ingest",
        data: {
          batchId,
          topics: ingestTopics,
          maxResultsPerTopic: 5,
        },
      })

      console.log(
        `[Seed] Inngest event dispatched -- batchId: ${batchId}, topics: ${ingestTopics.join(", ")}`,
      )

      return NextResponse.json<SeedResponse>({
        seeded: true,
        reason: "triggered",
        message: "Ingest dispatched via Inngest. Articles will appear shortly.",
        batchId,
      })
    } catch (inngestError) {
      console.warn("[Seed] Inngest dispatch failed, falling back to direct pipeline:", inngestError)
    }

    // ---- Fallback: run the ingest pipeline directly ----
    const result = await runIngestPipeline(ingestTopics, {
      batchId,
      maxResultsPerTopic: 5,
      logPrefix: "[Seed-Fallback]",
    })

    console.log(
      `[Seed-Fallback] Ingest complete -- batchId: ${result.batchId}, ` +
        `topics: ${result.topicsSearched}, articles: ${result.articlesIngested}`,
    )

    if (result.articlesIngested === 0) {
      return NextResponse.json<SeedResponse>({
        seeded: false,
        reason: "no_results",
        message:
          "Search returned no usable articles for the requested topics. Check that your API keys are valid.",
        batchId: result.batchId,
        articlesIngested: 0,
      })
    }

    return NextResponse.json<SeedResponse>({
      seeded: true,
      reason: "success",
      message: `Ingested ${result.articlesIngested} articles`,
      batchId: result.batchId,
      articlesIngested: result.articlesIngested,
    })
  } catch (error) {
    console.error("[Seed] Error:", error)
    return NextResponse.json(
      { error: "Failed to seed discover news" },
      { status: 500 },
    )
  }
}
