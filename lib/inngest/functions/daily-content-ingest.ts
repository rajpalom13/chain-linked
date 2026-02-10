/**
 * Daily Content Ingest Cron Job
 * @description Inngest cron function that runs daily at 6 AM UTC to ingest
 * fresh news articles via Perplexity AI for all users with selected discover topics.
 * Handles deduplication, freshness management, and resilient topic searching.
 * @module lib/inngest/functions/daily-content-ingest
 */

import { inngest } from '../client'
import { createPerplexityClient } from '@/lib/perplexity/client'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

/**
 * Supabase admin client for background jobs
 */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}

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
 * Daily Content Ingest Cron Function
 * Runs at 6 AM UTC daily to ingest fresh news via Perplexity for all active user topics
 */
export const dailyContentIngest = inngest.createFunction(
  {
    id: 'daily-content-ingest',
    name: 'Daily Content Ingest',
    retries: 2,
  },
  { cron: '0 6 * * *' },
  async ({ step }) => {
    const supabase = getSupabaseAdmin()
    const batchId = crypto.randomUUID()

    console.log(`[DailyIngest] Starting daily content ingest, batchId: ${batchId}`)

    // Step 1: Fetch all active topics across users
    const activeTopics = await step.run('fetch-active-topics', async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('discover_topics')
        .eq('discover_topics_selected', true)

      if (error) {
        console.error('[DailyIngest] Failed to fetch profiles:', error)
        return []
      }

      const allTopics = new Set<string>()
      for (const profile of profiles || []) {
        const topics = profile.discover_topics as string[] | null
        if (topics) {
          for (const topic of topics) {
            allTopics.add(topic)
          }
        }
      }

      const uniqueTopics = Array.from(allTopics)
      console.log(`[DailyIngest] Found ${uniqueTopics.length} unique topics from ${profiles?.length || 0} profiles`)
      return uniqueTopics
    })

    if (activeTopics.length === 0) {
      console.log('[DailyIngest] No active topics found, skipping ingest')
      return { success: true, message: 'No active topics', articlesIngested: 0 }
    }

    // Step 2: Search all topics using Perplexity (resilient with Promise.allSettled)
    const searchResults = await step.run('search-topics-perplexity', async () => {
      const perplexity = createPerplexityClient()
      if (!perplexity) {
        console.warn('[DailyIngest] PERPLEXITY_API_KEY not configured, skipping search')
        return []
      }

      console.log(`[DailyIngest] Searching ${activeTopics.length} topics via Perplexity`)

      const systemPrompt = `You are a news research assistant for a LinkedIn content platform. Your job is to find the most relevant, timely, and interesting news stories that professionals would want to discuss on LinkedIn. Focus on stories that are: Breaking or very recent (within the last 24 hours), Relevant to business professionals, Likely to generate discussion and engagement, From credible sources. Always return your findings in the exact JSON format requested.`

      const searchPromises = activeTopics.map(async (topicSlug) => {
        const topicDisplayName = TOPIC_DISPLAY_NAMES[topicSlug] ||
          topicSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

        const userPrompt = `Find the top 5 breaking or trending news stories about ${topicDisplayName} from the last 24 hours. For each story, provide: A catchy, attention-grabbing headline (not the original headline - rewrite it to be more engaging), A 2-3 sentence summary that captures the key points, The source URL, The source/publication name, The published date, 2-3 relevance tags. Return ONLY a JSON array with exactly 5 objects, each with these fields: headline, summary, source_url, source_name, published_date, relevance_tags`

        try {
          const response = await perplexity.chat(
            [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            {
              search_recency_filter: 'day',
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
            console.error(`[DailyIngest] Failed to parse JSON for topic "${topicSlug}":`, cleanedContent.slice(0, 200))
            return []
          }

          if (!Array.isArray(parsed)) {
            console.error(`[DailyIngest] Expected array for topic "${topicSlug}", got:`, typeof parsed)
            return []
          }

          const validArticles = parsed
            .map(item => newsArticleSchema.safeParse(item))
            .filter(result => result.success)
            .map(result => ({
              ...result.data!,
              topic: topicSlug,
              perplexity_citations: citations,
            }))

          console.log(`[DailyIngest] Topic "${topicSlug}": ${validArticles.length} valid articles`)
          return validArticles
        } catch (error) {
          console.error(`[DailyIngest] Search failed for topic "${topicSlug}":`, error)
          return []
        }
      })

      const settled = await Promise.allSettled(searchPromises)
      const allResults = settled
        .filter((r): r is PromiseFulfilledResult<Awaited<typeof searchPromises[number]>> => r.status === 'fulfilled')
        .flatMap((r) => r.value)

      console.log(`[DailyIngest] Total search results: ${allResults.length}`)
      return allResults
    })

    // Step 3: Deduplicate and save new articles
    const savedCount = await step.run('deduplicate-and-save', async () => {
      if (searchResults.length === 0) return 0

      // Check existing URLs per topic
      const urlTopicPairs = searchResults.map((r: { source_url: string; topic: string }) => r.source_url)
      const { data: existing } = await supabase
        .from('discover_news_articles')
        .select('source_url, topic')
        .in('source_url', urlTopicPairs)

      const existingKeys = new Set(
        (existing || []).map((e: { source_url: string; topic: string }) => `${e.source_url}::${e.topic}`)
      )

      const newArticles = searchResults
        .filter((r: { source_url: string; topic: string }) => !existingKeys.has(`${r.source_url}::${r.topic}`))
        .map((result: {
          headline: string
          summary: string
          source_url: string
          source_name: string
          published_date?: string | null
          relevance_tags: string[]
          topic: string
          perplexity_citations: string[]
        }) => ({
          headline: result.headline,
          summary: result.summary,
          source_url: result.source_url,
          source_name: result.source_name,
          published_date: result.published_date || null,
          relevance_tags: result.relevance_tags,
          topic: result.topic,
          ingest_batch_id: batchId,
          freshness: 'new',
          perplexity_citations: result.perplexity_citations,
        }))

      if (newArticles.length === 0) {
        console.log('[DailyIngest] No new articles to insert (all duplicates)')
        return 0
      }

      const { error } = await supabase
        .from('discover_news_articles')
        .insert(newArticles)

      if (error) {
        console.error('[DailyIngest] Failed to insert articles:', error)
        return 0
      }

      console.log(`[DailyIngest] Inserted ${newArticles.length} new articles`)
      return newArticles.length
    })

    // Step 4: Update freshness for aging articles
    await step.run('update-freshness', async () => {
      const now = new Date()

      // new (>24h) -> recent
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
      await supabase
        .from('discover_news_articles')
        .update({ freshness: 'recent' })
        .eq('freshness', 'new')
        .lt('created_at', oneDayAgo)

      // recent (>3d) -> aging
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
      await supabase
        .from('discover_news_articles')
        .update({ freshness: 'aging' })
        .eq('freshness', 'recent')
        .lt('created_at', threeDaysAgo)

      // aging (>7d) -> stale
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      await supabase
        .from('discover_news_articles')
        .update({ freshness: 'stale' })
        .eq('freshness', 'aging')
        .lt('created_at', sevenDaysAgo)

      // Delete stale articles older than 30 days
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      await supabase
        .from('discover_news_articles')
        .delete()
        .eq('freshness', 'stale')
        .lt('created_at', thirtyDaysAgo)

      console.log('[DailyIngest] Updated freshness levels and cleaned stale articles')
    })

    // Step 5: Log summary
    await step.run('log-summary', async () => {
      console.log(`[DailyIngest] === Ingest Summary ===`)
      console.log(`[DailyIngest] Batch ID: ${batchId}`)
      console.log(`[DailyIngest] Topics searched: ${activeTopics.length}`)
      console.log(`[DailyIngest] Total results found: ${searchResults.length}`)
      console.log(`[DailyIngest] New articles saved: ${savedCount}`)
      console.log(`[DailyIngest] Duplicates skipped: ${searchResults.length - savedCount}`)
    })

    // Step 6: Emit completion event
    await step.sendEvent('ingest-completed', {
      name: 'discover/ingest.completed',
      data: {
        batchId,
        topicsSearched: activeTopics.length,
        totalResults: searchResults.length,
        postsIngested: savedCount,
      },
    })

    return {
      success: true,
      batchId,
      topicsSearched: activeTopics.length,
      totalResults: searchResults.length,
      articlesIngested: savedCount,
    }
  }
)
