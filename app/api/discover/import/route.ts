/**
 * Discover Import API Route
 * @description Imports scraped LinkedIn posts from Apify or manual sources
 * @module app/api/discover/import
 */

import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { z } from "zod"

/**
 * Topic keyword mapping for auto-classification
 */
const TOPIC_KEYWORDS: Record<string, string[]> = {
  "artificial-intelligence": [
    "ai", "artificial intelligence", "machine learning", "ml", "deep learning",
    "neural network", "llm", "chatgpt", "openai", "gpt", "generative ai",
    "nlp", "natural language", "computer vision", "automation",
  ],
  "sales-enablement": [
    "sales", "selling", "revenue", "crm", "pipeline", "leads", "prospecting",
    "quota", "deal", "close", "buyer", "b2b sales", "outbound", "inbound",
    "account executive", "sdr",
  ],
  "remote-work": [
    "remote work", "work from home", "wfh", "hybrid work", "distributed team",
    "async", "asynchronous", "digital nomad", "coworking", "remote first",
  ],
  "saas-growth": [
    "saas", "software as a service", "mrr", "arr", "churn", "retention",
    "plg", "product-led", "subscription", "pricing", "freemium",
    "net revenue retention", "cac",
  ],
  "leadership": [
    "leadership", "management", "ceo", "cto", "founder", "executive",
    "team building", "culture", "hiring", "mentorship", "coaching",
    "psychological safety", "organizational",
  ],
  "marketing": [
    "marketing", "content marketing", "seo", "social media", "brand",
    "demand gen", "growth marketing", "copywriting", "funnel", "conversion",
  ],
  "startup": [
    "startup", "venture capital", "vc", "fundraising", "series a", "seed round",
    "bootstrapping", "founder", "entrepreneurship", "pitch deck", "investor",
  ],
  "product-management": [
    "product management", "product manager", "pm", "roadmap", "user research",
    "feature", "sprint", "agile", "scrum", "product strategy", "user story",
  ],
}

/**
 * Zod schema for validating imported post data
 */
const importedPostSchema = z.object({
  linkedin_url: z.string().url(),
  author_name: z.string().min(1).max(255),
  author_headline: z.string().max(500).default(""),
  author_avatar_url: z.string().url().nullable().optional(),
  author_profile_url: z.string().url().nullable().optional(),
  content: z.string().min(1),
  post_type: z.string().nullable().optional(),
  likes_count: z.number().int().min(0).default(0),
  comments_count: z.number().int().min(0).default(0),
  reposts_count: z.number().int().min(0).default(0),
  impressions_count: z.number().int().min(0).nullable().optional(),
  posted_at: z.string(),
  topics: z.array(z.string()).optional(),
})

/**
 * Request body schema
 */
const importRequestSchema = z.object({
  posts: z.array(importedPostSchema).min(1).max(500),
  source: z.enum(["apify", "manual", "import"]).default("apify"),
})

/**
 * Auto-classify topics based on content keywords
 * @param content - Post content text
 * @returns Array of matched topic slugs
 */
function classifyTopics(content: string): string[] {
  const lowerContent = content.toLowerCase()
  const matched: string[] = []

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const hasMatch = keywords.some((keyword) => lowerContent.includes(keyword))
    if (hasMatch) {
      matched.push(topic)
    }
  }

  // Default to general if no topics matched
  return matched.length > 0 ? matched : ["general"]
}

/**
 * Calculate engagement rate from metrics
 * @param likes - Number of likes
 * @param comments - Number of comments
 * @param reposts - Number of reposts
 * @param impressions - Number of impressions (optional)
 * @returns Engagement rate as a percentage, or null if no impressions
 */
function calculateEngagementRate(
  likes: number,
  comments: number,
  reposts: number,
  impressions: number | null | undefined
): number | null {
  if (!impressions || impressions === 0) {
    // Estimate based on total engagement as a rough heuristic
    const totalEngagement = likes + comments + reposts
    if (totalEngagement > 500) return 5.0
    if (totalEngagement > 200) return 3.0
    if (totalEngagement > 50) return 1.5
    return 0.5
  }
  const totalEngagement = likes + comments + reposts
  return parseFloat(((totalEngagement / impressions) * 100).toFixed(2))
}

/**
 * POST /api/discover/import
 * @description Imports an array of scraped posts, deduplicating by linkedin_url
 * @param request - Request with JSON body containing posts array and source
 * @returns Import summary with counts of new, updated, and skipped posts
 */
export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = importRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { posts, source } = parsed.data

    let newCount = 0
    let updatedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    for (const post of posts) {
      try {
        // Auto-classify topics if not provided
        const topics =
          post.topics && post.topics.length > 0
            ? post.topics
            : classifyTopics(post.content)

        const engagementRate = calculateEngagementRate(
          post.likes_count,
          post.comments_count,
          post.reposts_count,
          post.impressions_count ?? null
        )

        const isViral = (engagementRate ?? 0) >= 2.0

        const postData = {
          linkedin_url: post.linkedin_url,
          author_name: post.author_name,
          author_headline: post.author_headline,
          author_avatar_url: post.author_avatar_url ?? null,
          author_profile_url: post.author_profile_url ?? null,
          content: post.content,
          post_type: post.post_type ?? null,
          likes_count: post.likes_count,
          comments_count: post.comments_count,
          reposts_count: post.reposts_count,
          impressions_count: post.impressions_count ?? null,
          posted_at: post.posted_at,
          scraped_at: new Date().toISOString(),
          topics,
          is_viral: isViral,
          engagement_rate: engagementRate,
          source,
        }

        // Upsert by linkedin_url to deduplicate
        const { data: existing } = await supabase
          .from("discover_posts")
          .select("id")
          .eq("linkedin_url", post.linkedin_url)
          .maybeSingle()

        if (existing) {
          const { error: updateError } = await supabase
            .from("discover_posts")
            .update({
              ...postData,
              scraped_at: new Date().toISOString(),
            })
            .eq("id", existing.id)

          if (updateError) {
            errors.push(
              `Failed to update ${post.linkedin_url}: ${updateError.message}`
            )
            skippedCount++
          } else {
            updatedCount++
          }
        } else {
          const { error: insertError } = await supabase
            .from("discover_posts")
            .insert(postData)

          if (insertError) {
            errors.push(
              `Failed to insert ${post.linkedin_url}: ${insertError.message}`
            )
            skippedCount++
          } else {
            newCount++
          }
        }
      } catch (postError) {
        const message =
          postError instanceof Error ? postError.message : "Unknown error"
        errors.push(`Error processing ${post.linkedin_url}: ${message}`)
        skippedCount++
      }
    }

    return NextResponse.json({
      summary: {
        total: posts.length,
        new: newCount,
        updated: updatedCount,
        skipped: skippedCount,
      },
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Error importing discover posts:", error)
    return NextResponse.json(
      { error: "Failed to import posts" },
      { status: 500 }
    )
  }
}
