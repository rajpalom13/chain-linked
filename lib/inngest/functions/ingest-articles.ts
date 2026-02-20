/**
 * Shared Article Ingest Logic
 * @description Core Perplexity search, validation, deduplication, and insert logic
 * used by both the Inngest on-demand function and the seed API route.
 * @module lib/inngest/functions/ingest-articles
 */

import { createPerplexityClient } from '@/lib/perplexity/client'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

/**
 * Display names for topic slugs used in Perplexity prompts
 */
const TOPIC_DISPLAY_NAMES: Record<string, string> = {
  'ai': 'Artificial Intelligence',
  'sales': 'B2B Sales & Revenue',
  'remote-work': 'Remote Work & Hybrid Workplace',
  'saas': 'SaaS & Cloud Software',
  'leadership': 'Leadership & Management',
  'marketing': 'Digital Marketing & Content Strategy',
  'product-management': 'Product Management',
  'startups': 'Startups & Entrepreneurship',
  'customer-success': 'Customer Success & Retention',
  'data-analytics': 'Data Analytics & Business Intelligence',
  'personal-branding': 'Personal Branding & Thought Leadership',
  'content-creation': 'Content Creation & Social Media',
  'digital-transformation': 'Digital Transformation',
  'hiring-talent': 'Hiring, Talent & Recruitment',
  'fintech': 'FinTech & Financial Technology',
  'sustainability': 'Sustainability & ESG',
  'cybersecurity': 'Cybersecurity & Data Privacy',
  'productivity': 'Productivity & Workflow Automation',
}

/**
 * Zod schema for validating Perplexity news article responses
 */
const newsArticleSchema = z.object({
  headline: z.string().min(1),
  summary: z.string().min(1),
  source_url: z.string().url(),
  source_name: z.string().min(1),
  published_date: z.string().nullable().optional(),
  relevance_tags: z.array(z.string()).default([]),
})

/**
 * Strip markdown code fences from Perplexity response content
 * @param text - Raw response text
 * @returns Cleaned JSON string
 */
function stripMarkdownFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim()
}

/**
 * Validated article from Perplexity with topic and citations attached
 */
export interface IngestedArticle {
  headline: string
  summary: string
  source_url: string
  source_name: string
  published_date?: string | null
  relevance_tags: string[]
  topic: string
  perplexity_citations: string[]
}

/**
 * Result returned from the ingest pipeline
 */
export interface IngestResult {
  success: boolean
  batchId: string
  topicsSearched: number
  totalResults: number
  articlesIngested: number
}

/**
 * Creates a Supabase admin client using service role key
 * @returns Supabase client with admin privileges
 */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}

/**
 * Search Perplexity for news articles across the given topics
 * @param topics - Topic slugs to search
 * @param resultsPerTopic - Max articles per topic
 * @param logPrefix - Log prefix for tracing
 * @returns Array of validated articles
 */
export async function searchTopics(
  topics: string[],
  resultsPerTopic: number = 5,
  logPrefix: string = '[Ingest]'
): Promise<IngestedArticle[]> {
  const perplexity = createPerplexityClient()
  if (!perplexity) {
    console.warn(`${logPrefix} PERPLEXITY_API_KEY not configured, skipping search`)
    return []
  }

  console.log(`${logPrefix} Searching ${topics.length} topics via Perplexity`)

  const systemPrompt = `You are a news research assistant for a LinkedIn content platform. Your job is to find the most recent, relevant, and noteworthy news stories for a given topic. Return structured data only — no commentary, no filler. Every story MUST include real, working source URLs. Prioritize stories that would spark professional discussion on LinkedIn.`

  const searchPromises = topics.map(async (topicSlug: string) => {
    const topicDisplayName = TOPIC_DISPLAY_NAMES[topicSlug] ||
      topicSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

    const userPrompt = `Find the top ${resultsPerTopic} breaking or trending news stories about "${topicDisplayName}" from the last 14 days. Today's date is ${new Date().toISOString().split('T')[0]}
For each story, return:

1. **headline**: A concise, attention-grabbing headline (max 15 words). Do NOT copy the original article headline verbatim — write a clear, neutral summary headline.

2. **summary**: Two short paragraphs (3-4 sentences total) explaining:
   - Paragraph 1: What happened — the core facts and context.
   - Paragraph 2: Why it matters — the professional/industry impact or what to watch next.

3. **source_url**: The direct URL to the primary source article.

4. **source_name**: The publication name (e.g., TechCrunch, Reuters, Harvard Business Review).

5. **published_date**: The approximate publish date (YYYY-MM-DD format).

6. **relevance_tags**: 2-3 short keyword tags relevant to this story (e.g., ["AI regulation", "enterprise", "policy"]).

Rules:
- Only include stories from the last 14 days. Do not include older stories.
- Prioritize authoritative sources: major publications, industry-specific outlets, analyst reports, official announcements.
- Do NOT include opinion pieces, listicles, or clickbait.
- If fewer than ${resultsPerTopic} quality stories exist for this topic in the timeframe, return however many you find. Do not pad with low-quality results.
- Every source_url must be a real, verifiable link. Do not fabricate URLs.

Return your response as a JSON array:

[
  {
    "headline": "...",
    "summary": "...",
    "source_url": "...",
    "source_name": "...",
    "published_date": "YYYY-MM-DD",
    "relevance_tags": ["...", "..."]
  }
]

Return ONLY the JSON array. No markdown, no explanation, no wrapping text.`

    try {
      const response = await perplexity.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        {
          search_recency_filter: 'week',
          temperature: 0.2,
        }
      )

      const rawContent = response.choices[0]?.message?.content || '[]'
      const cleanedContent = stripMarkdownFences(rawContent)
      const citations = response.citations || []

      let parsed: unknown
      try {
        parsed = JSON.parse(cleanedContent)
      } catch {
        console.error(`${logPrefix} Failed to parse JSON for topic "${topicSlug}":`, cleanedContent.slice(0, 200))
        return []
      }

      if (!Array.isArray(parsed)) {
        console.error(`${logPrefix} Expected array for topic "${topicSlug}", got:`, typeof parsed)
        return []
      }

      const validArticles: IngestedArticle[] = parsed
        .map(item => newsArticleSchema.safeParse(item))
        .filter(result => result.success)
        .map(result => ({
          ...result.data!,
          topic: topicSlug,
          perplexity_citations: citations,
        }))

      console.log(`${logPrefix} Topic "${topicSlug}": ${validArticles.length} valid articles`)
      return validArticles
    } catch (error) {
      console.error(`${logPrefix} Search failed for topic "${topicSlug}":`, error)
      return []
    }
  })

  const settled = await Promise.allSettled(searchPromises)
  const allResults = settled
    .filter((r): r is PromiseFulfilledResult<IngestedArticle[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value)

  console.log(`${logPrefix} Total search results: ${allResults.length}`)
  return allResults
}

/**
 * Safely parse a date string into an ISO timestamp.
 * Returns null if the input is missing or not a valid date.
 * @param dateStr - Raw date string from Perplexity
 * @returns Valid ISO string or null
 */
function sanitizePublishedDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  const parsed = new Date(dateStr)
  if (isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

/**
 * Deduplicate articles against existing DB rows and insert new ones.
 * Uses upsert with ON CONFLICT DO NOTHING to gracefully handle
 * duplicates (both intra-batch and against existing rows).
 * @param articles - Articles from Perplexity search
 * @param batchId - Batch UUID for grouping
 * @param logPrefix - Log prefix for tracing
 * @returns Number of articles saved
 */
export async function deduplicateAndSave(
  articles: IngestedArticle[],
  batchId: string,
  logPrefix: string = '[Ingest]'
): Promise<number> {
  if (articles.length === 0) return 0

  const supabase = getSupabaseAdmin()

  // In-batch dedup: keep only the first occurrence of each (source_url, topic) pair
  const seenKeys = new Set<string>()
  const uniqueArticles = articles.filter((r) => {
    const key = `${r.source_url}::${r.topic}`
    if (seenKeys.has(key)) return false
    seenKeys.add(key)
    return true
  })

  const rows = uniqueArticles.map((result) => ({
    headline: result.headline,
    summary: result.summary,
    source_url: result.source_url,
    source_name: result.source_name,
    published_date: sanitizePublishedDate(result.published_date),
    relevance_tags: result.relevance_tags,
    topic: result.topic,
    ingest_batch_id: batchId,
    freshness: 'new',
    perplexity_citations: result.perplexity_citations,
  }))

  if (rows.length === 0) {
    console.log(`${logPrefix} No articles to insert after dedup`)
    return 0
  }

  // Use upsert with ignoreDuplicates to skip rows that already exist
  const { data, error } = await supabase
    .from('discover_news_articles')
    .upsert(rows, { onConflict: 'source_url,topic', ignoreDuplicates: true })
    .select('id')

  if (error) {
    console.error(`${logPrefix} Failed to upsert articles:`, error)
    return 0
  }

  const insertedCount = data?.length ?? 0
  console.log(`${logPrefix} Upserted ${insertedCount} new articles (${rows.length - insertedCount} duplicates skipped)`)
  return insertedCount
}

/**
 * Run the full ingest pipeline: search topics, deduplicate, and save
 * @param topics - Topic slugs to ingest (excludes "all")
 * @param options - Optional overrides for batch ID, results per topic, and log prefix
 * @returns Ingest result summary
 */
export async function runIngestPipeline(
  topics: string[],
  options?: {
    batchId?: string
    maxResultsPerTopic?: number
    logPrefix?: string
  }
): Promise<IngestResult> {
  const batchId = options?.batchId ?? crypto.randomUUID()
  const resultsPerTopic = options?.maxResultsPerTopic ?? 5
  const logPrefix = options?.logPrefix ?? '[Ingest]'

  const validTopics = topics.filter((t) => t !== 'all')

  if (validTopics.length === 0) {
    return { success: true, batchId, topicsSearched: 0, totalResults: 0, articlesIngested: 0 }
  }

  const searchResults = await searchTopics(validTopics, resultsPerTopic, logPrefix)
  const savedCount = await deduplicateAndSave(searchResults, batchId, logPrefix)

  return {
    success: true,
    batchId,
    topicsSearched: validTopics.length,
    totalResults: searchResults.length,
    articlesIngested: savedCount,
  }
}
