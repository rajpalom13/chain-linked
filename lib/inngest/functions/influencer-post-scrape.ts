/**
 * Influencer Post Scrape Cron Job
 * @description Inngest cron function that runs every 6 hours to scrape recent posts
 * from followed influencers via Apify (harvestapi~linkedin-profile-posts),
 * filter them with LLM quality assessment, update influencer profile data,
 * and store approved posts in the influencer_posts table.
 * @module lib/inngest/functions/influencer-post-scrape
 */

import { inngest } from '../client'
import { filterPostQualityBatch, type PostForQualityCheck } from '@/lib/ai/post-quality-filter'
import { createClient } from '@supabase/supabase-js'

/** Apify actor for scraping LinkedIn profile posts (no cookies needed) */
const APIFY_ACTOR_ID = 'harvestapi~linkedin-profile-posts'

/** Max posts to fetch per profile */
const LIMIT_PER_PROFILE = 20

/**
 * Supabase admin client for background jobs
 */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}

/**
 * Author data from Apify harvestapi~linkedin-profile-posts
 */
interface ApifyAuthor {
  publicIdentifier?: string
  name?: string
  info?: string
  linkedinUrl?: string
  avatar?: {
    url?: string
    width?: number
    height?: number
  }
}

/**
 * Engagement data from Apify
 */
interface ApifyEngagement {
  likes?: number
  comments?: number
  shares?: number
  reactions?: Array<{ type: string; count: number }>
}

/**
 * Raw post data from Apify harvestapi~linkedin-profile-posts
 */
interface ApifyLinkedInPost {
  type?: string
  id?: string
  linkedinUrl?: string
  content?: string
  author?: ApifyAuthor
  postedAt?: {
    timestamp?: number
    date?: string
    postedAgoShort?: string
    postedAgoText?: string
  }
  engagement?: ApifyEngagement
  postImages?: Array<{ url?: string }>
  query?: string
  [key: string]: unknown
}

/**
 * Grouped influencer data for batch processing
 */
interface InfluencerGroup {
  linkedin_url: string
  linkedin_username: string | null
  influencer_ids: string[]
  user_ids: string[]
}

/**
 * Influencer Post Scrape Cron Function
 * Runs every 6 hours or on-demand when a user follows an influencer
 */
export const influencerPostScrape = inngest.createFunction(
  {
    id: 'influencer-post-scrape',
    name: 'Influencer Post Scrape',
    retries: 2,
  },
  [
    { cron: '0 */6 * * *' },
    { event: 'influencer/follow' },
  ],
  async ({ step }) => {
    const supabase = getSupabaseAdmin()

    console.log('[InfluencerScrape] Starting influencer post scrape')

    // Step 1: Fetch active influencers, grouped by username to deduplicate
    const influencerGroups = await step.run('fetch-active-influencers', async () => {
      const { data: influencers, error } = await supabase
        .from('followed_influencers')
        .select('id, user_id, linkedin_url, linkedin_username')
        .eq('status', 'active')

      if (error) {
        console.error('[InfluencerScrape] Failed to fetch influencers:', error)
        return []
      }

      if (!influencers || influencers.length === 0) {
        console.log('[InfluencerScrape] No active influencers found')
        return []
      }

      // Group by linkedin_url to deduplicate across users
      const grouped = new Map<string, InfluencerGroup>()
      for (const inf of influencers) {
        const key = inf.linkedin_url
        if (!grouped.has(key)) {
          grouped.set(key, {
            linkedin_url: inf.linkedin_url,
            linkedin_username: inf.linkedin_username,
            influencer_ids: [],
            user_ids: [],
          })
        }
        const group = grouped.get(key)!
        group.influencer_ids.push(inf.id)
        group.user_ids.push(inf.user_id)
      }

      const groups = Array.from(grouped.values())
      console.log(`[InfluencerScrape] Found ${groups.length} unique influencers from ${influencers.length} follow records`)
      return groups
    })

    if (influencerGroups.length === 0) {
      return { success: true, message: 'No active influencers', postsScraped: 0 }
    }

    // Step 2: Scrape via Apify in batches of 5 profiles
    const allScrapedPosts: Array<{ influencerGroup: InfluencerGroup; posts: ApifyLinkedInPost[] }> = []

    const batches: InfluencerGroup[][] = []
    for (let i = 0; i < influencerGroups.length; i += 5) {
      batches.push(influencerGroups.slice(i, i + 5))
    }

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx]
      const batchResults = await step.run(`scrape-batch-${batchIdx}`, async () => {
        const profileUrls = batch.map(g => g.linkedin_url)
        const token = process.env.APIFY_API_TOKEN
        if (!token) throw new Error('APIFY_API_TOKEN not set')

        try {
          // Use run-sync-get-dataset-items for simplicity — blocks until done & returns items
          const response = await fetch(
            `https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/run-sync-get-dataset-items?token=${token}&timeout=180`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                profileUrls,
                limitPerProfile: LIMIT_PER_PROFILE,
              }),
            }
          )

          if (!response.ok) {
            const errorText = await response.text()
            throw new Error(`Apify run failed (${response.status}): ${errorText.slice(0, 200)}`)
          }

          const items: ApifyLinkedInPost[] = await response.json()

          // Filter to posts from last 7 days
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
          const recentItems = items.filter(item => {
            if (!item.postedAt?.timestamp && !item.postedAt?.date) return false
            const postedTime = item.postedAt.timestamp || new Date(item.postedAt.date!).getTime()
            return postedTime >= sevenDaysAgo
          })

          console.log(`[InfluencerScrape] Batch ${batchIdx}: ${recentItems.length} recent posts (of ${items.length} total) from ${profileUrls.length} profiles`)

          // Map posts back to their influencer groups by author publicIdentifier
          return batch.map(group => {
            const groupPosts = recentItems.filter(item => {
              const authorId = item.author?.publicIdentifier || ''
              const queryUrl = item.query || ''
              return authorId === group.linkedin_username ||
                     queryUrl.includes(group.linkedin_username || '__none__')
            })
            return { influencerGroup: group, posts: groupPosts }
          })
        } catch (error) {
          console.error(`[InfluencerScrape] Batch ${batchIdx} scrape failed:`, error instanceof Error ? error.message : error)
          return batch.map(group => ({ influencerGroup: group, posts: [] as ApifyLinkedInPost[] }))
        }
      })

      allScrapedPosts.push(...batchResults)
    }

    // Step 3: Update influencer profiles with scraped author data (name, avatar, headline)
    await step.run('update-influencer-profiles', async () => {
      for (const scraped of allScrapedPosts) {
        if (scraped.posts.length === 0) continue
        const firstPost = scraped.posts[0]
        const author = firstPost.author
        if (!author) continue

        const updates: Record<string, unknown> = {}
        if (author.name) updates.author_name = author.name
        if (author.info) updates.author_headline = author.info
        if (author.avatar?.url) updates.author_profile_picture = author.avatar.url

        if (Object.keys(updates).length === 0) continue

        for (const influencerId of scraped.influencerGroup.influencer_ids) {
          await supabase
            .from('followed_influencers')
            .update(updates)
            .eq('id', influencerId)
        }
      }
      console.log('[InfluencerScrape] Updated influencer profile data (name, avatar, headline)')
    })

    // Step 4: LLM quality filter
    const qualityResults = await step.run('llm-quality-filter', async () => {
      const allPosts: Array<{ post: ApifyLinkedInPost; groupIdx: number }> = []
      for (let i = 0; i < allScrapedPosts.length; i++) {
        for (const post of allScrapedPosts[i].posts) {
          if (post.content && post.content.length > 0) {
            allPosts.push({ post, groupIdx: i })
          }
        }
      }

      if (allPosts.length === 0) return []

      // Process in batches of 10 for LLM
      const results: Array<{
        post: ApifyLinkedInPost
        groupIdx: number
        approved: boolean
        score: number
        reason: string | null
        topics: string[]
      }> = []

      for (let i = 0; i < allPosts.length; i += 10) {
        const chunk = allPosts.slice(i, i + 10)
        const postsForFilter: PostForQualityCheck[] = chunk.map(({ post }) => ({
          content: post.content || '',
          author_name: post.author?.name || 'Unknown',
          metrics: {
            likes: post.engagement?.likes || 0,
            comments: post.engagement?.comments || 0,
            reposts: post.engagement?.shares || 0,
          },
        }))

        const filterResults = await filterPostQualityBatch(postsForFilter)

        for (let j = 0; j < chunk.length; j++) {
          results.push({
            ...chunk[j],
            approved: filterResults[j].approved,
            score: filterResults[j].score,
            reason: filterResults[j].reason,
            topics: filterResults[j].topics,
          })
        }
      }

      console.log(`[InfluencerScrape] Quality filter: ${results.filter(r => r.approved).length}/${results.length} approved`)
      return results
    })

    // Step 5: Save approved posts
    const savedCount = await step.run('save-posts', async () => {
      if (qualityResults.length === 0) return 0

      let saved = 0
      for (const result of qualityResults) {
        const group = allScrapedPosts[result.groupIdx].influencerGroup

        // Create a row for each user who follows this influencer
        for (let u = 0; u < group.user_ids.length; u++) {
          const userId = group.user_ids[u]
          const influencerId = group.influencer_ids[u]

          const postedAtDate = result.post.postedAt?.date
            || (result.post.postedAt?.timestamp
              ? new Date(result.post.postedAt.timestamp).toISOString()
              : null)

          const row = {
            influencer_id: influencerId,
            user_id: userId,
            linkedin_url: result.post.linkedinUrl || null,
            content: result.post.content || '',
            post_type: result.post.type || null,
            likes_count: result.post.engagement?.likes || 0,
            comments_count: result.post.engagement?.comments || 0,
            reposts_count: result.post.engagement?.shares || 0,
            posted_at: postedAtDate,
            quality_score: result.score,
            quality_status: result.approved ? 'approved' : 'rejected',
            rejection_reason: result.reason,
            raw_data: result.post as unknown as Record<string, unknown>,
          }

          const { error } = await supabase
            .from('influencer_posts')
            .upsert(row, { onConflict: 'user_id,linkedin_url', ignoreDuplicates: true })

          if (error) {
            console.error(`[InfluencerScrape] Failed to upsert post:`, error.message)
          } else {
            saved++
          }
        }
      }

      console.log(`[InfluencerScrape] Saved ${saved} influencer post records`)
      return saved
    })

    // Step 6: Update influencer counts and last_scraped_at
    await step.run('update-counts', async () => {
      for (const scraped of allScrapedPosts) {
        const group = scraped.influencerGroup
        const approvedCount = qualityResults.filter(
          r => r.groupIdx === allScrapedPosts.indexOf(scraped) && r.approved
        ).length

        for (const influencerId of group.influencer_ids) {
          await supabase
            .from('followed_influencers')
            .update({
              posts_count: approvedCount,
              last_scraped_at: new Date().toISOString(),
            })
            .eq('id', influencerId)
        }
      }
      console.log('[InfluencerScrape] Updated influencer counts and last_scraped_at')
    })

    // Step 7: Emit completion event
    await step.sendEvent('scrape-completed', {
      name: 'influencer/scrape.completed',
      data: {
        influencersScraped: influencerGroups.length,
        postsFound: qualityResults.length,
        postsApproved: qualityResults.filter(r => r.approved).length,
      },
    })

    return {
      success: true,
      influencersScraped: influencerGroups.length,
      postsFound: qualityResults.length,
      postsApproved: qualityResults.filter(r => r.approved).length,
      postsSaved: savedCount,
    }
  }
)
