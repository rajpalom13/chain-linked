/**
 * Daily Content Ingest Cron Job
 * @description Inngest cron function that runs daily at 6 AM UTC to ingest
 * fresh industry articles via Tavily for all users with selected discover topics.
 * Handles deduplication, freshness management, and resilient topic searching.
 * @module lib/inngest/functions/daily-content-ingest
 */

import { inngest } from '../client'
import { searchIndustryNews, type TavilySearchResult } from '@/lib/research/tavily-client'
import { createClient } from '@supabase/supabase-js'

/**
 * Supabase admin client for background jobs
 */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}

/**
 * Topic display name mapping for search queries
 */
const TOPIC_SEARCH_QUERIES: Record<string, string> = {
  'ai': 'AI artificial intelligence trends LinkedIn professionals',
  'sales': 'B2B sales strategy enablement',
  'remote-work': 'remote work hybrid workplace trends',
  'saas': 'SaaS B2B software growth',
  'leadership': 'leadership management corporate',
  'marketing': 'digital marketing content strategy',
  'product-management': 'product management strategy tech',
  'startups': 'startup entrepreneurship venture capital',
  'customer-success': 'customer success retention SaaS',
  'data-analytics': 'data analytics business intelligence',
  'personal-branding': 'personal branding LinkedIn thought leadership',
  'content-creation': 'content creation strategy social media',
  'digital-transformation': 'digital transformation enterprise technology',
  'hiring-talent': 'hiring talent recruitment management',
  'fintech': 'fintech financial technology banking',
  'sustainability': 'sustainability ESG corporate responsibility',
  'cybersecurity': 'cybersecurity data privacy enterprise security',
  'productivity': 'productivity tools workflow automation',
}

/**
 * Daily Content Ingest Cron Function
 * Runs at 6 AM UTC daily to ingest fresh content for all active user topics
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

      // Aggregate unique topic slugs
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
      return { success: true, message: 'No active topics', postsIngested: 0 }
    }

    // Step 2: Search all topics using Tavily (resilient with Promise.allSettled)
    const searchResults = await step.run('search-topics', async () => {
      if (!process.env.TAVILY_API_KEY) {
        console.warn('[DailyIngest] TAVILY_API_KEY not configured, skipping search')
        return []
      }

      console.log(`[DailyIngest] Searching ${activeTopics.length} topics via Tavily`)

      const searchPromises = activeTopics.map(async (topicSlug) => {
        const query = TOPIC_SEARCH_QUERIES[topicSlug] || topicSlug.replace(/-/g, ' ')

        try {
          const response = await searchIndustryNews(query, {
            maxResults: 5,
            searchDepth: 'basic',
          })

          return response.results.map((result: TavilySearchResult) => ({
            url: result.url,
            title: result.title,
            content: result.content,
            score: result.score,
            topic: topicSlug,
            publishedDate: result.publishedDate,
          }))
        } catch (error) {
          console.error(`[DailyIngest] Search failed for topic "${topicSlug}":`, error)
          return []
        }
      })

      // Use Promise.allSettled for resilience
      const settled = await Promise.allSettled(searchPromises)
      const allResults = settled
        .filter((r): r is PromiseFulfilledResult<typeof searchPromises extends Promise<infer T>[] ? T : never> => r.status === 'fulfilled')
        .flatMap((r) => r.value)

      console.log(`[DailyIngest] Total search results: ${allResults.length}`)
      return allResults
    })

    // Step 3: Deduplicate and save new posts
    const savedCount = await step.run('deduplicate-and-save', async () => {
      if (searchResults.length === 0) return 0

      // Check existing URLs
      const urls = searchResults.map((r: { url: string }) => r.url)
      const { data: existing } = await supabase
        .from('discover_posts')
        .select('linkedin_url')
        .in('linkedin_url', urls)

      const existingUrls = new Set(
        (existing || []).map((e: { linkedin_url: string }) => e.linkedin_url)
      )

      // Filter to new posts only
      const newPosts = searchResults
        .filter((r: { url: string }) => !existingUrls.has(r.url))
        .map((result: { url: string; title: string; content: string; score: number; topic: string; publishedDate?: string }) => ({
          linkedin_url: result.url,
          author_name: (() => {
            try { return new URL(result.url).hostname.replace('www.', '') }
            catch { return 'Unknown' }
          })(),
          author_headline: `Article from ${(() => {
            try { return new URL(result.url).hostname }
            catch { return 'web' }
          })()}`,
          content: result.content || result.title,
          post_type: 'article',
          likes_count: 0,
          comments_count: 0,
          reposts_count: 0,
          posted_at: result.publishedDate || new Date().toISOString(),
          scraped_at: new Date().toISOString(),
          topics: [result.topic],
          is_viral: false,
          engagement_rate: result.score * 5,
          source: 'daily-ingest',
          ingest_batch_id: batchId,
          freshness: 'new',
        }))

      if (newPosts.length === 0) {
        console.log('[DailyIngest] No new posts to insert (all duplicates)')
        return 0
      }

      const { error } = await supabase
        .from('discover_posts')
        .insert(newPosts)

      if (error) {
        console.error('[DailyIngest] Failed to insert posts:', error)
        return 0
      }

      console.log(`[DailyIngest] Inserted ${newPosts.length} new posts`)
      return newPosts.length
    })

    // Step 4: Update freshness for aging posts
    await step.run('update-freshness', async () => {
      const now = new Date()

      // new (>24h) -> recent
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
      await supabase
        .from('discover_posts')
        .update({ freshness: 'recent' })
        .eq('freshness', 'new')
        .lt('scraped_at', oneDayAgo)

      // recent (>3d) -> aging
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
      await supabase
        .from('discover_posts')
        .update({ freshness: 'aging' })
        .eq('freshness', 'recent')
        .lt('scraped_at', threeDaysAgo)

      // aging (>7d) -> stale
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      await supabase
        .from('discover_posts')
        .update({ freshness: 'stale' })
        .eq('freshness', 'aging')
        .lt('scraped_at', sevenDaysAgo)

      console.log('[DailyIngest] Updated freshness levels')
    })

    // Step 5: Log summary
    await step.run('log-summary', async () => {
      console.log(`[DailyIngest] === Ingest Summary ===`)
      console.log(`[DailyIngest] Batch ID: ${batchId}`)
      console.log(`[DailyIngest] Topics searched: ${activeTopics.length}`)
      console.log(`[DailyIngest] Total results found: ${searchResults.length}`)
      console.log(`[DailyIngest] New posts saved: ${savedCount}`)
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
      postsIngested: savedCount,
    }
  }
)
