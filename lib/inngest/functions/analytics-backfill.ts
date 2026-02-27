/**
 * Analytics Backfill Function (Inngest Cron)
 * @description Runs every 5 minutes to check for users who have raw snapshot data
 * (my_posts, post_analytics, linkedin_profiles, linkedin_analytics) but no
 * corresponding processed daily data. Seeds the daily and accumulative tables
 * so analytics are immediately visible without waiting for the midnight pipeline.
 *
 * Steps:
 *   1. Find users with posts in my_posts that have NO rows in post_analytics_daily
 *      → seed post_analytics_daily + post_analytics_accumulative from snapshot data
 *   2. Find users with linkedin_profiles that have NO rows in profile_analytics_daily
 *      → seed profile_analytics_daily + profile_analytics_accumulative from snapshot data
 *
 * @module lib/inngest/functions/analytics-backfill
 */

import { inngest } from '../client'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Log prefix for all backfill output */
const LOG = '[AnalyticsBackfill]'

/**
 * Creates a Supabase admin client that bypasses RLS
 * @returns Supabase client with service role privileges
 */
function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}

/**
 * Analytics backfill cron function
 * Runs every 5 minutes to seed daily/accumulative tables for users with raw data
 */
export const analyticsBackfill = inngest.createFunction(
  {
    id: 'analytics-backfill',
    name: 'Analytics Backfill (5min)',
    retries: 1,
    concurrency: [{ limit: 1 }],
  },
  { cron: '*/5 * * * *' },
  async ({ step }) => {
    const db = getSupabaseAdmin()
    const today = new Date().toISOString().split('T')[0]

    // ─── Step 1: Backfill Post Analytics ──────────────────────────────────
    const postResult = await step.run('backfill-post-analytics', async () => {
      console.log(`${LOG} [Step 1] Checking for posts missing daily analytics`)

      // Find all users who have posts
      const { data: usersWithPosts, error: postsErr } = await db
        .from('my_posts')
        .select('user_id')
        .not('user_id', 'is', null)

      if (postsErr || !usersWithPosts?.length) {
        console.log(`${LOG} [Step 1] No users with posts found`)
        return { usersProcessed: 0, rowsInserted: 0 }
      }

      const uniqueUserIds = [...new Set(usersWithPosts.map(p => p.user_id))]
      let totalRowsInserted = 0
      let usersProcessed = 0

      for (const userId of uniqueUserIds) {
        // Check if user already has non-zero daily data
        const { data: existingDaily } = await db
          .from('post_analytics_daily')
          .select('id')
          .eq('user_id', userId)
          .or('impressions_gained.gt.0,reactions_gained.gt.0,comments_gained.gt.0,reposts_gained.gt.0')
          .limit(1)

        if (existingDaily && existingDaily.length > 0) {
          continue // User already has real daily data
        }

        // Get user's posts
        const { data: posts } = await db
          .from('my_posts')
          .select('id, user_id, activity_urn, posted_at, impressions, reactions, comments, reposts, saves, sends')
          .eq('user_id', userId)

        if (!posts?.length) continue

        // Get post_analytics data for richer metrics
        const activityUrns = posts.map(p => p.activity_urn).filter(Boolean)
        const { data: postAnalytics } = activityUrns.length > 0
          ? await db
              .from('post_analytics')
              .select('activity_urn, impressions, unique_views, members_reached, reactions, comments, reposts, saves, sends, engagement_rate')
              .eq('user_id', userId)
              .in('activity_urn', activityUrns)
              .order('captured_at', { ascending: false })
          : { data: [] }

        // Build map of latest post_analytics per activity_urn (first seen = latest due to order)
        const paMap = new Map<string, {
          impressions: number
          uniqueReach: number
          reactions: number
          comments: number
          reposts: number
          saves: number
          sends: number
          engagementRate: number | null
        }>()
        for (const row of postAnalytics || []) {
          if (row.activity_urn && !paMap.has(row.activity_urn)) {
            paMap.set(row.activity_urn, {
              impressions: row.impressions ?? 0,
              uniqueReach: row.unique_views ?? row.members_reached ?? 0,
              reactions: row.reactions ?? 0,
              comments: row.comments ?? 0,
              reposts: row.reposts ?? 0,
              saves: row.saves ?? 0,
              sends: row.sends ?? 0,
              engagementRate: row.engagement_rate ?? null,
            })
          }
        }

        for (const post of posts) {
          const pa = paMap.get(post.activity_urn)
          const impressions = pa?.impressions ?? post.impressions ?? 0
          const uniqueReach = pa?.uniqueReach ?? 0
          const reactions = pa?.reactions ?? post.reactions ?? 0
          const comments = pa?.comments ?? post.comments ?? 0
          const reposts = pa?.reposts ?? post.reposts ?? 0
          const saves = pa?.saves ?? post.saves ?? 0
          const sends = pa?.sends ?? post.sends ?? 0

          // Only backfill if there are actual metrics
          if (impressions === 0 && reactions === 0 && comments === 0) continue

          const engagements = reactions + comments + reposts + saves + sends
          let engagementsRate: number | null = null
          if (pa?.engagementRate != null && pa.engagementRate > 0) {
            engagementsRate = pa.engagementRate
          } else if (impressions > 0) {
            engagementsRate = (engagements / impressions) * 100
          }

          const analysisDate = post.posted_at
            ? new Date(post.posted_at).toISOString().split('T')[0]
            : today

          // Upsert into post_analytics_daily
          const { error: dailyErr } = await db
            .from('post_analytics_daily')
            .upsert({
              user_id: userId,
              post_id: post.id,
              analysis_date: analysisDate,
              impressions_gained: impressions,
              unique_reach_gained: uniqueReach,
              reactions_gained: reactions,
              comments_gained: comments,
              reposts_gained: reposts,
              saves_gained: saves,
              sends_gained: sends,
              engagements_gained: engagements,
              engagements_rate: engagementsRate,
              analytics_tracking_status_id: 1, // DAILY
            }, {
              onConflict: 'user_id,post_id,analysis_date',
            })

          if (dailyErr) {
            console.error(`${LOG} [Step 1] Daily upsert error for post ${post.id}:`, dailyErr.message)
            continue
          }

          // Upsert into post_analytics_accumulative
          const { error: accumErr } = await db
            .from('post_analytics_accumulative')
            .upsert({
              user_id: userId,
              post_id: post.id,
              analysis_date: analysisDate,
              post_created_at: analysisDate,
              impressions_total: impressions,
              unique_reach_total: uniqueReach,
              reactions_total: reactions,
              comments_total: comments,
              reposts_total: reposts,
              saves_total: saves,
              sends_total: sends,
              engagements_total: engagements,
              engagements_rate: engagementsRate,
              analytics_tracking_status_id: 1,
            }, {
              onConflict: 'user_id,post_id',
            })

          if (accumErr) {
            console.error(`${LOG} [Step 1] Accumulative upsert error for post ${post.id}:`, accumErr.message)
          }

          totalRowsInserted++
        }

        usersProcessed++
        console.log(`${LOG} [Step 1] Backfilled post analytics for user ${userId}`)
      }

      console.log(`${LOG} [Step 1] Done: ${usersProcessed} users, ${totalRowsInserted} rows`)
      return { usersProcessed, rowsInserted: totalRowsInserted }
    })

    // ─── Step 2: Backfill Profile Analytics ───────────────────────────────
    const profileResult = await step.run('backfill-profile-analytics', async () => {
      console.log(`${LOG} [Step 2] Checking for profiles missing daily analytics`)

      const { data: profiles, error: profileErr } = await db
        .from('linkedin_profiles')
        .select('user_id, followers_count, connections_count')
        .not('user_id', 'is', null)

      if (profileErr || !profiles?.length) {
        console.log(`${LOG} [Step 2] No profiles found`)
        return { usersProcessed: 0, rowsInserted: 0 }
      }

      let totalRowsInserted = 0
      let usersProcessed = 0

      for (const profile of profiles) {
        const userId = profile.user_id

        // Check if user already has non-zero profile daily data
        const { data: existing } = await db
          .from('profile_analytics_daily')
          .select('id')
          .eq('user_id', userId)
          .or('followers_gained.gt.0,profile_views_gained.gt.0,connections_gained.gt.0')
          .limit(1)

        if (existing && existing.length > 0) continue

        // Get linkedin_analytics for profile_views and search_appearances
        const { data: analytics } = await db
          .from('linkedin_analytics')
          .select('profile_views, search_appearances')
          .eq('user_id', userId)
          .order('captured_at', { ascending: false })
          .limit(1)

        const profileViews = analytics?.[0]?.profile_views ?? 0
        const searchAppearances = analytics?.[0]?.search_appearances ?? 0
        const followers = profile.followers_count ?? 0
        const connections = profile.connections_count ?? 0

        // Only backfill if there are actual metrics
        if (followers === 0 && profileViews === 0 && connections === 0) continue

        // Upsert into profile_analytics_daily
        const { error: dailyErr } = await db
          .from('profile_analytics_daily')
          .upsert({
            user_id: userId,
            analysis_date: today,
            followers_gained: followers,
            connections_gained: connections,
            profile_views_gained: profileViews,
            search_appearances_gained: searchAppearances,
          }, {
            onConflict: 'user_id,analysis_date',
          })

        if (dailyErr) {
          console.error(`${LOG} [Step 2] Profile daily upsert error for ${userId}:`, dailyErr.message)
          continue
        }

        // Upsert into profile_analytics_accumulative
        const { error: accumErr } = await db
          .from('profile_analytics_accumulative')
          .upsert({
            user_id: userId,
            analysis_date: today,
            followers_total: followers,
            connections_total: connections,
            profile_views_total: profileViews,
            search_appearances_total: searchAppearances,
          }, {
            onConflict: 'user_id,analysis_date',
          })

        if (accumErr) {
          console.error(`${LOG} [Step 2] Profile accumulative upsert error for ${userId}:`, accumErr.message)
        }

        totalRowsInserted++
        usersProcessed++
        console.log(`${LOG} [Step 2] Backfilled profile analytics for user ${userId}`)
      }

      console.log(`${LOG} [Step 2] Done: ${usersProcessed} users, ${totalRowsInserted} rows`)
      return { usersProcessed, rowsInserted: totalRowsInserted }
    })

    const totalSeeded = (postResult?.rowsInserted ?? 0) + (profileResult?.rowsInserted ?? 0)

    if (totalSeeded > 0) {
      console.log(
        `${LOG} Backfilled ${totalSeeded} rows — data is now available via RPC queries. ` +
        `Summary cache will refresh on next analytics-summary-compute cron (every 4h).`
      )
    } else {
      console.log(`${LOG} No backfill needed — all users have daily analytics data`)
    }

    return { postResult, profileResult, totalSeeded }
  }
)
