/**
 * Discover News Seed API Route
 * @description Triggers the Inngest on-demand ingest pipeline to populate
 * discover_news_articles with fresh Perplexity content. Falls back to
 * running the pipeline directly if Inngest is unavailable.
 *
 * Returns a `reason` field on every response so the frontend can act
 * intelligently without parsing free-text messages:
 * - `no_api_key`      -- PERPLEXITY_API_KEY is not configured
 * - `already_exists`  -- articles already exist for the requested topics
 * - `no_results`      -- Perplexity returned zero usable articles (fallback only)
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
    const force: boolean = body.force === true

    if (topics.length === 0) {
      return NextResponse.json(
        { error: "No topics provided" },
        { status: 400 },
      )
    }

    const validTopics = topics.filter((t) => t !== "all")

    // ---- Duplicate check (skip when force = true) ----
    if (!force) {
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
    }

    // ---- Dispatch via Inngest (primary) with direct fallback ----
    const ingestTopics = validTopics.length > 0 ? validTopics : topics
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
