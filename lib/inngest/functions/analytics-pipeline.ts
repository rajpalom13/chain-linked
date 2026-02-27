/**
 * Daily Analytics Pipeline (Inngest Cron)
 * @description Computes daily deltas from LinkedIn snapshot data and rolls them up
 * into weekly, monthly, quarterly, and yearly aggregates. Runs at midnight UTC.
 *
 * Pipeline steps:
 *   1. Profile daily deltas
 *   2. Profile accumulative update
 *   3. Post daily deltas (with tracking-phase gating)
 *   4. Post accumulative update
 *   5. Weekly rollup
 *   6. Monthly rollup
 *   7. Quarterly rollup
 *   8. Yearly rollup
 *   9. Phase transitions
 *
 * @module lib/inngest/functions/analytics-pipeline
 */

import { inngest } from '../client'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/** Log prefix for all pipeline output */
const LOG_PREFIX = '[AnalyticsPipeline]'

/** Tracking status IDs matching analytics_tracking_status table */
const TRACKING_STATUS = {
  INACTIVE: 0,
  DAILY: 1,
  WEEKLY: 2,
  MONTHLY: 3,
} as const

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
 * Computes the tracking status for a post based on its age in days
 * @param postAgeDays - Number of days since the post was published
 * @returns Tracking status ID (0-3)
 */
function getTrackingStatus(postAgeDays: number): number {
  if (postAgeDays <= 30) return TRACKING_STATUS.DAILY
  if (postAgeDays <= 90) return TRACKING_STATUS.WEEKLY
  if (postAgeDays <= 365) return TRACKING_STATUS.MONTHLY
  return TRACKING_STATUS.INACTIVE
}

/**
 * Determines whether a post should be processed today given its tracking phase
 * @param trackingStatus - The post's tracking status ID
 * @param dayOfWeek - 0 = Sunday, 1 = Monday, ... 6 = Saturday
 * @param dayOfMonth - 1-31
 * @returns true if the post should be processed today
 */
function shouldProcessToday(
  trackingStatus: number,
  dayOfWeek: number,
  dayOfMonth: number
): boolean {
  switch (trackingStatus) {
    case TRACKING_STATUS.DAILY:
      return true
    case TRACKING_STATUS.WEEKLY:
      return dayOfWeek === 1 // Monday
    case TRACKING_STATUS.MONTHLY:
      return dayOfMonth === 1 // 1st of month
    case TRACKING_STATUS.INACTIVE:
    default:
      return false
  }
}

/**
 * Returns the Monday (ISO week start) for a given date
 * @param date - Reference date
 * @returns Date string (YYYY-MM-DD) of the Monday of that week
 */
function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1) // Monday
  d.setUTCDate(diff)
  return d.toISOString().split('T')[0]
}

/**
 * Returns the first day of the month for a given date
 * @param date - Reference date
 * @returns Date string (YYYY-MM-DD)
 */
function getMonthStart(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`
}

/**
 * Returns the first day of the quarter for a given date
 * @param date - Reference date
 * @returns Date string (YYYY-MM-DD)
 */
function getQuarterStart(date: Date): string {
  const month = date.getUTCMonth() // 0-11
  const quarterStartMonth = Math.floor(month / 3) * 3 + 1 // 1, 4, 7, 10
  return `${date.getUTCFullYear()}-${String(quarterStartMonth).padStart(2, '0')}-01`
}

/**
 * Returns the first day of the year for a given date
 * @param date - Reference date
 * @returns Date string (YYYY-MM-DD)
 */
function getYearStart(date: Date): string {
  return `${date.getUTCFullYear()}-01-01`
}

/**
 * Checks whether a date is the last day of its month
 * @param date - Reference date
 * @returns true if this is the last day of the month
 */
function isLastDayOfMonth(date: Date): boolean {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + 1)
  return next.getUTCMonth() !== date.getUTCMonth()
}

/**
 * Checks whether a date is the last day of its quarter
 * @param date - Reference date
 * @returns true if this is the last day of the quarter
 */
function isLastDayOfQuarter(date: Date): boolean {
  const month = date.getUTCMonth() // 0-11
  const isEndOfQuarterMonth = (month + 1) % 3 === 0 // months 2, 5, 8, 11
  return isEndOfQuarterMonth && isLastDayOfMonth(date)
}

/** Shape of a post with its current metric snapshot */
interface PostSnapshot {
  postId: string
  userId: string
  postedAt: string
  impressions: number
  uniqueReach: number
  reactions: number
  comments: number
  reposts: number
  saves: number
  sends: number
}

/** Shape of a post daily delta row to insert */
interface PostDailyRow {
  user_id: string
  post_id: string
  analysis_date: string
  impressions_gained: number
  unique_reach_gained: number
  reactions_gained: number
  comments_gained: number
  reposts_gained: number
  saves_gained: number
  sends_gained: number
  engagements_gained: number
  engagements_rate: number | null
  analytics_tracking_status_id: number
}

/**
 * Daily Analytics Pipeline Cron Function
 * Runs at midnight UTC every day. Computes deltas and rolls up analytics.
 */
export const analyticsPipeline = inngest.createFunction(
  {
    id: 'analytics-pipeline',
    name: 'Daily Analytics Pipeline',
    retries: 2,
  },
  { cron: '0 0 * * *' },
  async ({ step }) => {
    const supabase = getSupabaseAdmin()

    /** Yesterday's date (the date we are computing analytics for) */
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    const analysisDate = yesterday.toISOString().split('T')[0]
    const dayOfWeek = yesterday.getUTCDay() // 0=Sun ... 6=Sat
    const dayOfMonth = yesterday.getUTCDate()

    console.log(`${LOG_PREFIX} Starting pipeline for analysis_date=${analysisDate}`)

    // ─── Step 0: Diagnostic — Check Recent Snapshots ──────────────────────
    await step.run('diagnostic-snapshot-check', async () => {
      console.log(`${LOG_PREFIX} [Step 0] Checking recent post_analytics snapshots`)

      const cutoff48h = new Date(now)
      cutoff48h.setUTCHours(cutoff48h.getUTCHours() - 48)

      const { count, error } = await supabase
        .from('post_analytics')
        .select('*', { count: 'exact', head: true })
        .gte('captured_at', cutoff48h.toISOString())

      if (error) {
        console.warn(`${LOG_PREFIX} [Step 0] Failed to query post_analytics: ${error.message}`)
        return { snapshotCount: 0, error: error.message }
      }

      console.log(`${LOG_PREFIX} [Step 0] Found ${count ?? 0} post_analytics snapshots in last 48h`)

      if ((count ?? 0) === 0) {
        console.warn(`${LOG_PREFIX} [Step 0] No recent snapshots — extension may not have synced recently`)
      }

      return { snapshotCount: count ?? 0 }
    })

    // ─── Step 1: Profile Daily Deltas ────────────────────────────────────
    const profileResults = await step.run('profile-daily-deltas', async () => {
      console.log(`${LOG_PREFIX} [Step 1] Computing profile daily deltas`)

      // Get all profiles updated in the last 48 hours
      const cutoff = new Date(now)
      cutoff.setUTCHours(cutoff.getUTCHours() - 48)

      const { data: profiles, error: profilesError } = await supabase
        .from('linkedin_profiles')
        .select('user_id, followers_count, connections_count, updated_at')
        .gte('updated_at', cutoff.toISOString())

      if (profilesError) {
        console.error(`${LOG_PREFIX} [Step 1] Failed to fetch profiles:`, profilesError)
        return { processed: 0, skipped: 0, errors: 0 }
      }

      if (!profiles || profiles.length === 0) {
        console.log(`${LOG_PREFIX} [Step 1] No recently updated profiles found`)
        return { processed: 0, skipped: 0, errors: 0 }
      }

      console.log(`${LOG_PREFIX} [Step 1] Found ${profiles.length} recently updated profiles`)

      // Also fetch linkedin_analytics for profile_views and search_appearances
      const userIds = profiles.map((p) => p.user_id)
      const { data: analyticsRows } = await supabase
        .from('linkedin_analytics')
        .select('user_id, profile_views, search_appearances')
        .in('user_id', userIds)
        .order('captured_at', { ascending: false })

      // Build a map of latest analytics per user
      const analyticsMap = new Map<string, { profile_views: number; search_appearances: number }>()
      for (const row of analyticsRows || []) {
        if (!analyticsMap.has(row.user_id)) {
          analyticsMap.set(row.user_id, {
            profile_views: row.profile_views ?? 0,
            search_appearances: row.search_appearances ?? 0,
          })
        }
      }

      let processed = 0
      let skipped = 0
      let errors = 0

      for (const profile of profiles) {
        try {
          const currentFollowers = profile.followers_count ?? 0
          const currentConnections = profile.connections_count ?? 0
          const analytics = analyticsMap.get(profile.user_id)
          const currentProfileViews = analytics?.profile_views ?? 0
          const currentSearchAppearances = analytics?.search_appearances ?? 0

          // Get latest accumulative row for this user (most recent analysis_date)
          const { data: latestAccum } = await supabase
            .from('profile_analytics_accumulative')
            .select('*')
            .eq('user_id', profile.user_id)
            .order('analysis_date', { ascending: false })
            .limit(1)
            .maybeSingle()

          // Compute deltas
          const followersGained = latestAccum
            ? currentFollowers - (latestAccum.followers_total ?? 0)
            : currentFollowers
          const connectionsGained = latestAccum
            ? currentConnections - (latestAccum.connections_total ?? 0)
            : currentConnections
          const profileViewsGained = latestAccum
            ? currentProfileViews - (latestAccum.profile_views_total ?? 0)
            : currentProfileViews
          const searchAppearancesGained = latestAccum
            ? currentSearchAppearances - (latestAccum.search_appearances_total ?? 0)
            : currentSearchAppearances

          // Skip if all deltas are 0 (unless this is the first-ever run)
          if (
            latestAccum &&
            followersGained === 0 &&
            connectionsGained === 0 &&
            profileViewsGained === 0 &&
            searchAppearancesGained === 0
          ) {
            skipped++
            continue
          }

          // Write profile_analytics_daily (upsert on user_id + analysis_date)
          const { error: dailyError } = await supabase
            .from('profile_analytics_daily')
            .upsert(
              {
                user_id: profile.user_id,
                analysis_date: analysisDate,
                followers_gained: followersGained,
                connections_gained: connectionsGained,
                profile_views_gained: profileViewsGained,
                search_appearances_gained: searchAppearancesGained,
              },
              { onConflict: 'user_id,analysis_date' }
            )

          if (dailyError) {
            console.error(
              `${LOG_PREFIX} [Step 1] Failed to upsert daily for user ${profile.user_id}:`,
              dailyError
            )
            errors++
            continue
          }

          processed++
        } catch (err) {
          console.error(
            `${LOG_PREFIX} [Step 1] Unexpected error for user ${profile.user_id}:`,
            err
          )
          errors++
        }
      }

      console.log(
        `${LOG_PREFIX} [Step 1] Done: ${processed} processed, ${skipped} skipped, ${errors} errors`
      )
      return { processed, skipped, errors }
    })

    // ─── Step 2: Profile Accumulative Update ─────────────────────────────
    const profileAccumResults = await step.run('profile-accumulative-update', async () => {
      console.log(`${LOG_PREFIX} [Step 2] Updating profile accumulative totals`)

      // Fetch all daily rows written for analysisDate
      const { data: dailyRows, error: fetchError } = await supabase
        .from('profile_analytics_daily')
        .select('*')
        .eq('analysis_date', analysisDate)

      if (fetchError || !dailyRows || dailyRows.length === 0) {
        console.log(`${LOG_PREFIX} [Step 2] No daily rows to accumulate`)
        return { updated: 0 }
      }

      let updated = 0

      for (const daily of dailyRows) {
        // Get current absolute values from linkedin_profiles
        const { data: profile } = await supabase
          .from('linkedin_profiles')
          .select('followers_count, connections_count')
          .eq('user_id', daily.user_id)
          .limit(1)
          .maybeSingle()

        // Get linkedin_analytics for profile_views and search_appearances
        const { data: analytics } = await supabase
          .from('linkedin_analytics')
          .select('profile_views, search_appearances')
          .eq('user_id', daily.user_id)
          .order('captured_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        const { error: upsertError } = await supabase
          .from('profile_analytics_accumulative')
          .upsert(
            {
              user_id: daily.user_id,
              analysis_date: analysisDate,
              followers_total: profile?.followers_count ?? 0,
              connections_total: profile?.connections_count ?? 0,
              profile_views_total: analytics?.profile_views ?? 0,
              search_appearances_total: analytics?.search_appearances ?? 0,
            },
            { onConflict: 'user_id,analysis_date' }
          )

        if (upsertError) {
          console.error(
            `${LOG_PREFIX} [Step 2] Failed to upsert accumulative for user ${daily.user_id}:`,
            upsertError
          )
          continue
        }

        updated++
      }

      console.log(`${LOG_PREFIX} [Step 2] Done: ${updated} accumulative rows upserted`)
      return { updated }
    })

    // ─── Step 3: Post Daily Deltas ───────────────────────────────────────
    const postDailyResults = await step.run('post-daily-deltas', async () => {
      console.log(`${LOG_PREFIX} [Step 3] Computing post daily deltas`)

      // Fetch all posts with a posted_at date
      const { data: posts, error: postsError } = await supabase
        .from('my_posts')
        .select('id, user_id, activity_urn, posted_at, impressions, reactions, comments, reposts, saves, sends')
        .not('posted_at', 'is', null)

      if (postsError) {
        console.error(`${LOG_PREFIX} [Step 3] Failed to fetch posts:`, postsError)
        return { processed: 0, skipped: 0, inactive: 0, phaseSkipped: 0, errors: 0 }
      }

      if (!posts || posts.length === 0) {
        console.log(`${LOG_PREFIX} [Step 3] No posts found`)
        return { processed: 0, skipped: 0, inactive: 0, phaseSkipped: 0, errors: 0 }
      }

      console.log(`${LOG_PREFIX} [Step 3] Found ${posts.length} posts to evaluate`)

      // Fetch detailed metrics from post_analytics (keyed by activity_urn)
      const activityUrns = posts.map((p) => p.activity_urn).filter(Boolean)
      const { data: postAnalyticsRows } = await supabase
        .from('post_analytics')
        .select(
          'activity_urn, impressions, members_reached, unique_views, reactions, comments, reposts, saves, sends, engagement_rate'
        )
        .in('activity_urn', activityUrns)
        .order('captured_at', { ascending: false })

      // Build map of latest post_analytics per activity_urn
      const paMap = new Map<
        string,
        {
          impressions: number
          uniqueReach: number
          reactions: number
          comments: number
          reposts: number
          saves: number
          sends: number
          engagementRate: number | null
        }
      >()
      for (const row of postAnalyticsRows || []) {
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

      // Fetch all existing post_analytics_accumulative rows for batch lookup
      const postIds = posts.map((p) => p.id)
      const { data: accumRows } = await supabase
        .from('post_analytics_accumulative')
        .select('*')
        .in('post_id', postIds)

      const accumMap = new Map<string, (typeof accumRows extends (infer T)[] | null ? T : never)>()
      for (const row of accumRows || []) {
        accumMap.set(row.post_id, row)
      }

      let processed = 0
      let skipped = 0
      let inactive = 0
      let phaseSkipped = 0
      let errors = 0

      const dailyRowsToInsert: PostDailyRow[] = []

      for (const post of posts) {
        try {
          const postedAt = new Date(post.posted_at)
          const ageDays = Math.floor(
            (yesterday.getTime() - postedAt.getTime()) / (1000 * 60 * 60 * 24)
          )

          // Determine tracking status
          const trackingStatus = getTrackingStatus(ageDays)

          if (trackingStatus === TRACKING_STATUS.INACTIVE) {
            inactive++
            continue
          }

          // Check if this post should be processed today based on its phase
          if (!shouldProcessToday(trackingStatus, dayOfWeek, dayOfMonth)) {
            phaseSkipped++
            continue
          }

          // Get current metrics: prefer post_analytics, fallback to my_posts
          const paData = paMap.get(post.activity_urn)
          const currentImpressions = paData?.impressions ?? post.impressions ?? 0
          const currentUniqueReach = paData?.uniqueReach ?? 0
          const currentReactions = paData?.reactions ?? post.reactions ?? 0
          const currentComments = paData?.comments ?? post.comments ?? 0
          const currentReposts = paData?.reposts ?? post.reposts ?? 0
          const currentSaves = paData?.saves ?? post.saves ?? 0
          const currentSends = paData?.sends ?? post.sends ?? 0

          // Get latest accumulative for this post
          const accum = accumMap.get(post.id)

          // Compute deltas
          const impressionsGained = accum
            ? currentImpressions - (accum.impressions_total ?? 0)
            : currentImpressions
          const uniqueReachGained = accum
            ? currentUniqueReach - (accum.unique_reach_total ?? 0)
            : currentUniqueReach
          const reactionsGained = accum
            ? currentReactions - (accum.reactions_total ?? 0)
            : currentReactions
          const commentsGained = accum
            ? currentComments - (accum.comments_total ?? 0)
            : currentComments
          const repostsGained = accum
            ? currentReposts - (accum.reposts_total ?? 0)
            : currentReposts
          const savesGained = accum ? currentSaves - (accum.saves_total ?? 0) : currentSaves
          const sendsGained = accum ? currentSends - (accum.sends_total ?? 0) : currentSends

          // Skip if all deltas are 0 (unless first-ever row)
          if (
            accum &&
            impressionsGained === 0 &&
            uniqueReachGained === 0 &&
            reactionsGained === 0 &&
            commentsGained === 0 &&
            repostsGained === 0 &&
            savesGained === 0 &&
            sendsGained === 0
          ) {
            skipped++
            continue
          }

          // Calculate engagements_gained and rate
          const engagementsGained =
            reactionsGained + commentsGained + repostsGained + savesGained + sendsGained

          // Use API-provided engagement_rate if available, else calculate from totals
          let engagementsRate: number | null = null
          if (paData?.engagementRate != null && paData.engagementRate > 0) {
            engagementsRate = paData.engagementRate
          } else {
            const totalEngagements = currentReactions + currentComments + currentReposts + currentSaves + currentSends
            engagementsRate = currentImpressions > 0
              ? (totalEngagements / currentImpressions) * 100
              : null
          }

          dailyRowsToInsert.push({
            user_id: post.user_id,
            post_id: post.id,
            analysis_date: analysisDate,
            impressions_gained: impressionsGained,
            unique_reach_gained: uniqueReachGained,
            reactions_gained: reactionsGained,
            comments_gained: commentsGained,
            reposts_gained: repostsGained,
            saves_gained: savesGained,
            sends_gained: sendsGained,
            engagements_gained: engagementsGained,
            engagements_rate: engagementsRate,
            analytics_tracking_status_id: trackingStatus,
          })

          processed++
        } catch (err) {
          console.error(`${LOG_PREFIX} [Step 3] Unexpected error for post ${post.id}:`, err)
          errors++
        }
      }

      // Batch upsert daily rows
      if (dailyRowsToInsert.length > 0) {
        const { error: upsertError } = await supabase
          .from('post_analytics_daily')
          .upsert(dailyRowsToInsert, {
            onConflict: 'user_id,post_id,analysis_date',
          })

        if (upsertError) {
          console.error(`${LOG_PREFIX} [Step 3] Batch upsert failed:`, upsertError)
          errors += dailyRowsToInsert.length
          processed = 0
        }
      }

      console.log(
        `${LOG_PREFIX} [Step 3] Done: ${processed} processed, ${skipped} zero-delta, ` +
          `${inactive} inactive, ${phaseSkipped} phase-skipped, ${errors} errors`
      )
      return { processed, skipped, inactive, phaseSkipped, errors }
    })

    // ─── Step 4: Post Accumulative Update ────────────────────────────────
    const postAccumResults = await step.run('post-accumulative-update', async () => {
      console.log(`${LOG_PREFIX} [Step 4] Updating post accumulative totals`)

      // Fetch all daily rows written today
      const { data: dailyRows, error: fetchError } = await supabase
        .from('post_analytics_daily')
        .select('*')
        .eq('analysis_date', analysisDate)

      if (fetchError || !dailyRows || dailyRows.length === 0) {
        console.log(`${LOG_PREFIX} [Step 4] No daily rows to accumulate`)
        return { updated: 0 }
      }

      // Fetch existing accumulative rows for these posts
      const postIds = dailyRows.map((r) => r.post_id)
      const { data: existingAccums } = await supabase
        .from('post_analytics_accumulative')
        .select('*')
        .in('post_id', postIds)

      const existingMap = new Map<string, (typeof existingAccums extends (infer T)[] | null ? T : never)>()
      for (const row of existingAccums || []) {
        existingMap.set(row.post_id, row)
      }

      // Also fetch the earliest analysis_date per post for post_created_at
      const { data: earliestDates } = await supabase
        .from('post_analytics_daily')
        .select('post_id, analysis_date')
        .in('post_id', postIds)
        .order('analysis_date', { ascending: true })

      const earliestMap = new Map<string, string>()
      for (const row of earliestDates || []) {
        if (!earliestMap.has(row.post_id)) {
          earliestMap.set(row.post_id, row.analysis_date)
        }
      }

      const upsertRows = dailyRows.map((daily) => {
        const existing = existingMap.get(daily.post_id)
        return {
          user_id: daily.user_id,
          post_id: daily.post_id,
          analysis_date: analysisDate,
          post_created_at: earliestMap.get(daily.post_id) ?? analysisDate,
          impressions_total: (existing?.impressions_total ?? 0) + (daily.impressions_gained ?? 0),
          unique_reach_total:
            (existing?.unique_reach_total ?? 0) + (daily.unique_reach_gained ?? 0),
          reactions_total: (existing?.reactions_total ?? 0) + (daily.reactions_gained ?? 0),
          comments_total: (existing?.comments_total ?? 0) + (daily.comments_gained ?? 0),
          reposts_total: (existing?.reposts_total ?? 0) + (daily.reposts_gained ?? 0),
          saves_total: (existing?.saves_total ?? 0) + (daily.saves_gained ?? 0),
          sends_total: (existing?.sends_total ?? 0) + (daily.sends_gained ?? 0),
          engagements_total:
            (existing?.engagements_total ?? 0) + (daily.engagements_gained ?? 0),
          engagements_rate: daily.engagements_rate,
          analytics_tracking_status_id: daily.analytics_tracking_status_id,
        }
      })

      const { error: upsertError } = await supabase
        .from('post_analytics_accumulative')
        .upsert(upsertRows, { onConflict: 'user_id,post_id' })

      if (upsertError) {
        console.error(`${LOG_PREFIX} [Step 4] Batch upsert failed:`, upsertError)
        return { updated: 0 }
      }

      console.log(`${LOG_PREFIX} [Step 4] Done: ${upsertRows.length} accumulative rows upserted`)
      return { updated: upsertRows.length }
    })

    // ─── Step 5: Weekly Rollup ───────────────────────────────────────────
    const weeklyResults = await step.run('weekly-rollup', async () => {
      const weekStart = getWeekStart(yesterday)
      const isSunday = yesterday.getUTCDay() === 0

      console.log(
        `${LOG_PREFIX} [Step 5] Weekly rollup for week_start=${weekStart}, finalize=${isSunday}`
      )

      // Fetch daily rows in the week range and aggregate in JS
      const { data: dailyRows, error: fetchError } = await supabase
        .from('post_analytics_daily')
        .select('*')
        .gte('analysis_date', weekStart)
        .lte('analysis_date', analysisDate)

      if (fetchError || !dailyRows || dailyRows.length === 0) {
        console.log(`${LOG_PREFIX} [Step 5] No daily rows for this week`)
        return { updated: 0 }
      }

      // Aggregate by post_id
      const postAgg = new Map<
        string,
        {
          user_id: string
          post_id: string
          impressions: number
          unique_reach: number
          reactions: number
          comments: number
          reposts: number
          saves: number
          sends: number
          engagements: number
          tracking_status: number
        }
      >()

      for (const row of dailyRows) {
        const key = row.post_id
        const existing = postAgg.get(key)
        if (existing) {
          existing.impressions += row.impressions_gained ?? 0
          existing.unique_reach += row.unique_reach_gained ?? 0
          existing.reactions += row.reactions_gained ?? 0
          existing.comments += row.comments_gained ?? 0
          existing.reposts += row.reposts_gained ?? 0
          existing.saves += row.saves_gained ?? 0
          existing.sends += row.sends_gained ?? 0
          existing.engagements += row.engagements_gained ?? 0
          existing.tracking_status = row.analytics_tracking_status_id ?? existing.tracking_status
        } else {
          postAgg.set(key, {
            user_id: row.user_id,
            post_id: row.post_id,
            impressions: row.impressions_gained ?? 0,
            unique_reach: row.unique_reach_gained ?? 0,
            reactions: row.reactions_gained ?? 0,
            comments: row.comments_gained ?? 0,
            reposts: row.reposts_gained ?? 0,
            saves: row.saves_gained ?? 0,
            sends: row.sends_gained ?? 0,
            engagements: row.engagements_gained ?? 0,
            tracking_status: row.analytics_tracking_status_id ?? TRACKING_STATUS.DAILY,
          })
        }
      }

      const upsertRows = Array.from(postAgg.values()).map((agg) => ({
        user_id: agg.user_id,
        post_id: agg.post_id,
        week_start: weekStart,
        analysis_date: analysisDate,
        impressions_total: agg.impressions,
        unique_reach_total: agg.unique_reach,
        reactions_total: agg.reactions,
        comments_total: agg.comments,
        reposts_total: agg.reposts,
        saves_total: agg.saves,
        sends_total: agg.sends,
        engagements_total: agg.engagements,
        engagements_rate: agg.impressions > 0 ? agg.engagements / agg.impressions : null,
        is_finalized: isSunday,
        analytics_tracking_status_id: agg.tracking_status,
      }))

      if (upsertRows.length > 0) {
        const { error: upsertError } = await supabase
          .from('post_analytics_wk')
          .upsert(upsertRows, { onConflict: 'user_id,post_id,week_start' })

        if (upsertError) {
          console.error(`${LOG_PREFIX} [Step 5] Weekly upsert failed:`, upsertError)
          return { updated: 0 }
        }
      }

      console.log(`${LOG_PREFIX} [Step 5] Done: ${upsertRows.length} weekly rows upserted`)
      return { updated: upsertRows.length }
    })

    // ─── Step 6: Monthly Rollup ──────────────────────────────────────────
    const monthlyResults = await step.run('monthly-rollup', async () => {
      const monthStart = getMonthStart(yesterday)
      const finalize = isLastDayOfMonth(yesterday)

      console.log(
        `${LOG_PREFIX} [Step 6] Monthly rollup for month_start=${monthStart}, finalize=${finalize}`
      )

      const { data: dailyRows, error: fetchError } = await supabase
        .from('post_analytics_daily')
        .select('*')
        .gte('analysis_date', monthStart)
        .lte('analysis_date', analysisDate)

      if (fetchError || !dailyRows || dailyRows.length === 0) {
        console.log(`${LOG_PREFIX} [Step 6] No daily rows for this month`)
        return { updated: 0 }
      }

      // Aggregate by post_id
      const postAgg = new Map<
        string,
        {
          user_id: string
          post_id: string
          impressions: number
          unique_reach: number
          reactions: number
          comments: number
          reposts: number
          saves: number
          sends: number
          engagements: number
          tracking_status: number
        }
      >()

      for (const row of dailyRows) {
        const key = row.post_id
        const existing = postAgg.get(key)
        if (existing) {
          existing.impressions += row.impressions_gained ?? 0
          existing.unique_reach += row.unique_reach_gained ?? 0
          existing.reactions += row.reactions_gained ?? 0
          existing.comments += row.comments_gained ?? 0
          existing.reposts += row.reposts_gained ?? 0
          existing.saves += row.saves_gained ?? 0
          existing.sends += row.sends_gained ?? 0
          existing.engagements += row.engagements_gained ?? 0
          existing.tracking_status = row.analytics_tracking_status_id ?? existing.tracking_status
        } else {
          postAgg.set(key, {
            user_id: row.user_id,
            post_id: row.post_id,
            impressions: row.impressions_gained ?? 0,
            unique_reach: row.unique_reach_gained ?? 0,
            reactions: row.reactions_gained ?? 0,
            comments: row.comments_gained ?? 0,
            reposts: row.reposts_gained ?? 0,
            saves: row.saves_gained ?? 0,
            sends: row.sends_gained ?? 0,
            engagements: row.engagements_gained ?? 0,
            tracking_status: row.analytics_tracking_status_id ?? TRACKING_STATUS.DAILY,
          })
        }
      }

      const upsertRows = Array.from(postAgg.values()).map((agg) => ({
        user_id: agg.user_id,
        post_id: agg.post_id,
        month_start: monthStart,
        analysis_date: analysisDate,
        impressions_total: agg.impressions,
        unique_reach_total: agg.unique_reach,
        reactions_total: agg.reactions,
        comments_total: agg.comments,
        reposts_total: agg.reposts,
        saves_total: agg.saves,
        sends_total: agg.sends,
        engagements_total: agg.engagements,
        engagements_rate: agg.impressions > 0 ? agg.engagements / agg.impressions : null,
        is_finalized: finalize,
        analytics_tracking_status_id: agg.tracking_status,
      }))

      if (upsertRows.length > 0) {
        const { error: upsertError } = await supabase
          .from('post_analytics_mth')
          .upsert(upsertRows, { onConflict: 'user_id,post_id,month_start' })

        if (upsertError) {
          console.error(`${LOG_PREFIX} [Step 6] Monthly upsert failed:`, upsertError)
          return { updated: 0 }
        }
      }

      console.log(`${LOG_PREFIX} [Step 6] Done: ${upsertRows.length} monthly rows upserted`)
      return { updated: upsertRows.length }
    })

    // ─── Step 7: Quarterly Rollup ────────────────────────────────────────
    const quarterlyResults = await step.run('quarterly-rollup', async () => {
      const quarterStart = getQuarterStart(yesterday)
      const finalize = isLastDayOfQuarter(yesterday)

      console.log(
        `${LOG_PREFIX} [Step 7] Quarterly rollup for quarter_start=${quarterStart}, finalize=${finalize}`
      )

      // Sum from monthly rows for current quarter
      const { data: monthlyRows, error: fetchError } = await supabase
        .from('post_analytics_mth')
        .select('*')
        .gte('month_start', quarterStart)
        .lte('analysis_date', analysisDate)

      if (fetchError || !monthlyRows || monthlyRows.length === 0) {
        console.log(`${LOG_PREFIX} [Step 7] No monthly rows for this quarter`)
        return { updated: 0 }
      }

      // Aggregate by post_id
      const postAgg = new Map<
        string,
        {
          user_id: string
          post_id: string
          impressions: number
          unique_reach: number
          reactions: number
          comments: number
          reposts: number
          saves: number
          sends: number
          engagements: number
          tracking_status: number
        }
      >()

      for (const row of monthlyRows) {
        const key = row.post_id
        const existing = postAgg.get(key)
        if (existing) {
          existing.impressions += row.impressions_total ?? 0
          existing.unique_reach += row.unique_reach_total ?? 0
          existing.reactions += row.reactions_total ?? 0
          existing.comments += row.comments_total ?? 0
          existing.reposts += row.reposts_total ?? 0
          existing.saves += row.saves_total ?? 0
          existing.sends += row.sends_total ?? 0
          existing.engagements += row.engagements_total ?? 0
          existing.tracking_status = row.analytics_tracking_status_id ?? existing.tracking_status
        } else {
          postAgg.set(key, {
            user_id: row.user_id,
            post_id: row.post_id,
            impressions: row.impressions_total ?? 0,
            unique_reach: row.unique_reach_total ?? 0,
            reactions: row.reactions_total ?? 0,
            comments: row.comments_total ?? 0,
            reposts: row.reposts_total ?? 0,
            saves: row.saves_total ?? 0,
            sends: row.sends_total ?? 0,
            engagements: row.engagements_total ?? 0,
            tracking_status: row.analytics_tracking_status_id ?? TRACKING_STATUS.DAILY,
          })
        }
      }

      const upsertRows = Array.from(postAgg.values()).map((agg) => ({
        user_id: agg.user_id,
        post_id: agg.post_id,
        quarter_start: quarterStart,
        analysis_date: analysisDate,
        impressions_total: agg.impressions,
        unique_reach_total: agg.unique_reach,
        reactions_total: agg.reactions,
        comments_total: agg.comments,
        reposts_total: agg.reposts,
        saves_total: agg.saves,
        sends_total: agg.sends,
        engagements_total: agg.engagements,
        engagements_rate: agg.impressions > 0 ? agg.engagements / agg.impressions : null,
        is_finalized: finalize,
        analytics_tracking_status_id: agg.tracking_status,
      }))

      if (upsertRows.length > 0) {
        const { error: upsertError } = await supabase
          .from('post_analytics_qtr')
          .upsert(upsertRows, { onConflict: 'user_id,post_id,quarter_start' })

        if (upsertError) {
          console.error(`${LOG_PREFIX} [Step 7] Quarterly upsert failed:`, upsertError)
          return { updated: 0 }
        }
      }

      console.log(`${LOG_PREFIX} [Step 7] Done: ${upsertRows.length} quarterly rows upserted`)
      return { updated: upsertRows.length }
    })

    // ─── Step 8: Yearly Rollup ───────────────────────────────────────────
    const yearlyResults = await step.run('yearly-rollup', async () => {
      const yearStart = getYearStart(yesterday)
      const finalize = yesterday.getUTCMonth() === 11 && yesterday.getUTCDate() === 31

      console.log(
        `${LOG_PREFIX} [Step 8] Yearly rollup for year_start=${yearStart}, finalize=${finalize}`
      )

      // Sum from monthly rows for current year
      const { data: monthlyRows, error: fetchError } = await supabase
        .from('post_analytics_mth')
        .select('*')
        .gte('month_start', yearStart)
        .lte('analysis_date', analysisDate)

      if (fetchError || !monthlyRows || monthlyRows.length === 0) {
        console.log(`${LOG_PREFIX} [Step 8] No monthly rows for this year`)
        return { updated: 0 }
      }

      // Aggregate by post_id
      const postAgg = new Map<
        string,
        {
          user_id: string
          post_id: string
          impressions: number
          unique_reach: number
          reactions: number
          comments: number
          reposts: number
          saves: number
          sends: number
          engagements: number
          tracking_status: number
        }
      >()

      for (const row of monthlyRows) {
        const key = row.post_id
        const existing = postAgg.get(key)
        if (existing) {
          existing.impressions += row.impressions_total ?? 0
          existing.unique_reach += row.unique_reach_total ?? 0
          existing.reactions += row.reactions_total ?? 0
          existing.comments += row.comments_total ?? 0
          existing.reposts += row.reposts_total ?? 0
          existing.saves += row.saves_total ?? 0
          existing.sends += row.sends_total ?? 0
          existing.engagements += row.engagements_total ?? 0
          existing.tracking_status = row.analytics_tracking_status_id ?? existing.tracking_status
        } else {
          postAgg.set(key, {
            user_id: row.user_id,
            post_id: row.post_id,
            impressions: row.impressions_total ?? 0,
            unique_reach: row.unique_reach_total ?? 0,
            reactions: row.reactions_total ?? 0,
            comments: row.comments_total ?? 0,
            reposts: row.reposts_total ?? 0,
            saves: row.saves_total ?? 0,
            sends: row.sends_total ?? 0,
            engagements: row.engagements_total ?? 0,
            tracking_status: row.analytics_tracking_status_id ?? TRACKING_STATUS.DAILY,
          })
        }
      }

      const upsertRows = Array.from(postAgg.values()).map((agg) => ({
        user_id: agg.user_id,
        post_id: agg.post_id,
        year_start: yearStart,
        analysis_date: analysisDate,
        impressions_total: agg.impressions,
        unique_reach_total: agg.unique_reach,
        reactions_total: agg.reactions,
        comments_total: agg.comments,
        reposts_total: agg.reposts,
        saves_total: agg.saves,
        sends_total: agg.sends,
        engagements_total: agg.engagements,
        engagements_rate: agg.impressions > 0 ? agg.engagements / agg.impressions : null,
        is_finalized: finalize,
        analytics_tracking_status_id: agg.tracking_status,
      }))

      if (upsertRows.length > 0) {
        const { error: upsertError } = await supabase
          .from('post_analytics_yr')
          .upsert(upsertRows, { onConflict: 'user_id,post_id,year_start' })

        if (upsertError) {
          console.error(`${LOG_PREFIX} [Step 8] Yearly upsert failed:`, upsertError)
          return { updated: 0 }
        }
      }

      console.log(`${LOG_PREFIX} [Step 8] Done: ${upsertRows.length} yearly rows upserted`)
      return { updated: upsertRows.length }
    })

    // ─── Step 9: Phase Transitions ───────────────────────────────────────
    const phaseResults = await step.run('phase-transitions', async () => {
      console.log(`${LOG_PREFIX} [Step 9] Checking for tracking phase transitions`)

      // Fetch all posts with posted_at to check for phase boundary crossings
      const { data: posts, error: postsError } = await supabase
        .from('my_posts')
        .select('id, user_id, posted_at')
        .not('posted_at', 'is', null)

      if (postsError || !posts || posts.length === 0) {
        console.log(`${LOG_PREFIX} [Step 9] No posts to check`)
        return { transitions: 0 }
      }

      // Phase boundaries: 30, 90, 365 days
      const boundaries = [30, 90, 365]
      let transitions = 0

      for (const post of posts) {
        const postedAt = new Date(post.posted_at)
        const ageDays = Math.floor(
          (yesterday.getTime() - postedAt.getTime()) / (1000 * 60 * 60 * 24)
        )

        // Check if the post just crossed a boundary (age is exactly at boundary or 1 day past)
        const justCrossed = boundaries.some((b) => ageDays === b || ageDays === b + 1)
        if (!justCrossed) continue

        const newStatus = getTrackingStatus(ageDays)

        console.log(
          `${LOG_PREFIX} [Step 9] Post ${post.id} transitioned to status ${newStatus} (age=${ageDays}d)`
        )

        // Update analytics_tracking_status_id across all tables for this post
        const tables = [
          'post_analytics_daily',
          'post_analytics_accumulative',
          'post_analytics_wk',
          'post_analytics_mth',
          'post_analytics_qtr',
          'post_analytics_yr',
        ] as const

        for (const table of tables) {
          const { error: updateError } = await supabase
            .from(table)
            .update({ analytics_tracking_status_id: newStatus })
            .eq('post_id', post.id)

          if (updateError) {
            console.error(
              `${LOG_PREFIX} [Step 9] Failed to update ${table} for post ${post.id}:`,
              updateError
            )
          }
        }

        transitions++
      }

      console.log(`${LOG_PREFIX} [Step 9] Done: ${transitions} phase transitions applied`)
      return { transitions }
    })

    // ─── Summary ─────────────────────────────────────────────────────────
    const summary = {
      analysisDate,
      profilesProcessed: profileResults.processed,
      profileAccumUpdated: profileAccumResults.updated,
      postsProcessed: postDailyResults.processed,
      postAccumUpdated: postAccumResults.updated,
      weeklyRollups: weeklyResults.updated,
      monthlyRollups: monthlyResults.updated,
      quarterlyRollups: quarterlyResults.updated,
      yearlyRollups: yearlyResults.updated,
      phaseTransitions: phaseResults.transitions,
    }

    console.log(`${LOG_PREFIX} === Pipeline Summary ===`)
    console.log(`${LOG_PREFIX} Analysis date: ${summary.analysisDate}`)
    console.log(`${LOG_PREFIX} Profiles processed: ${summary.profilesProcessed}`)
    console.log(`${LOG_PREFIX} Profile accum updated: ${summary.profileAccumUpdated}`)
    console.log(`${LOG_PREFIX} Posts processed: ${summary.postsProcessed}`)
    console.log(`${LOG_PREFIX} Post accum updated: ${summary.postAccumUpdated}`)
    console.log(`${LOG_PREFIX} Weekly rollups: ${summary.weeklyRollups}`)
    console.log(`${LOG_PREFIX} Monthly rollups: ${summary.monthlyRollups}`)
    console.log(`${LOG_PREFIX} Quarterly rollups: ${summary.quarterlyRollups}`)
    console.log(`${LOG_PREFIX} Yearly rollups: ${summary.yearlyRollups}`)
    console.log(`${LOG_PREFIX} Phase transitions: ${summary.phaseTransitions}`)

    return { success: true, ...summary }
  }
)
