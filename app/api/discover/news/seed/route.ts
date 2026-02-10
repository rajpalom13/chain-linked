/**
 * Discover News Seed API Route
 * @description Checks if the discover_news_articles table is empty and runs
 * the ingest pipeline directly to populate it with fresh Perplexity content.
 * Works without the Inngest dev server running.
 *
 * Returns a `reason` field on every response so the frontend can act
 * intelligently without parsing free-text messages:
 * - `no_api_key`      -- PERPLEXITY_API_KEY is not configured
 * - `already_exists`  -- articles already exist for the requested topics
 * - `no_results`      -- Perplexity returned zero usable articles
 * - `success`         -- articles were ingested and saved
 * @module app/api/discover/news/seed
 */

import { createClient } from "@/lib/supabase/server"
import { runIngestPipeline } from "@/lib/inngest/functions/ingest-articles"
import { NextResponse } from "next/server"

/** Possible reason codes returned by the seed endpoint */
type SeedReason = "no_api_key" | "already_exists" | "no_results" | "success"

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
    // ---- API key gate (cheap, must come before any Perplexity work) ----
    if (!process.env.PERPLEXITY_API_KEY) {
      console.warn("[Seed] PERPLEXITY_API_KEY is not configured -- skipping ingest")
      return NextResponse.json<SeedResponse>({
        seeded: false,
        reason: "no_api_key",
        message:
          "PERPLEXITY_API_KEY is not configured. Set the environment variable to enable news ingestion.",
      })
    }

    // ---- Topic validation ----
    const body = await request.json()
    const topics: string[] = body.topics || []

    if (topics.length === 0) {
      return NextResponse.json(
        { error: "No topics provided" },
        { status: 400 },
      )
    }

    const validTopics = topics.filter((t) => t !== "all")

    // ---- Duplicate check ----
    let query = supabase
      .from("discover_news_articles")
      .select("id", { count: "exact", head: true })

    if (validTopics.length > 0) {
      query = query.in("topic", validTopics)
    }

    const { count, error: countError } = await query

    if (countError) {
      console.warn("[Seed] Error checking article count:", countError)
    }

    if (count && count > 0) {
      return NextResponse.json<SeedResponse>({
        seeded: false,
        reason: "already_exists",
        message: "Articles already exist for the requested topics",
        count,
      })
    }

    // ---- Run the ingest pipeline directly (no Inngest event dispatch) ----
    const result = await runIngestPipeline(
      validTopics.length > 0 ? validTopics : topics,
      {
        maxResultsPerTopic: 5,
        logPrefix: "[Seed]",
      },
    )

    console.log(
      `[Seed] Ingest complete -- batchId: ${result.batchId}, ` +
        `topics: ${result.topicsSearched}, articles: ${result.articlesIngested}`,
    )

    if (result.articlesIngested === 0) {
      return NextResponse.json<SeedResponse>({
        seeded: false,
        reason: "no_results",
        message:
          "Perplexity returned no usable articles for the requested topics",
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
