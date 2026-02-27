/**
 * Analytics Summary Compute (Inngest Cron)
 * @description Pre-computes analytics summaries for all active users every 4 hours.
 * Replaces on-the-fly RPC calls with cached results for reliable, fast reads.
 *
 * For each user, computes summary stats (total, avg, pct_change) and timeseries
 * for every metric × period combination. Results are upserted into
 * `analytics_summary_cache` for the API routes to read.
 *
 * Metrics computed:
 *   Post:    impressions, reactions, comments, reposts, saves, sends, engagements, engagements_rate
 *   Profile: followers, profile_views, search_appearances
 *
 * Periods:   7d, 30d, 90d, 1y
 *
 * @module lib/inngest/functions/analytics-summary-compute
 */

import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'

/** Log prefix */
const LOG = '[AnalyticsSummaryCompute]'

/** Post-level metrics */
const POST_METRICS = [
  'impressions',
  'reactions',
  'comments',
  'reposts',
  'saves',
  'sends',
  'engagements',
  'engagements_rate',
] as const

/** Profile-level metrics */
const PROFILE_METRICS = [
  'followers',
  'profile_views',
  'search_appearances',
] as const

/** Standard periods to pre-compute */
const PERIODS = ['7d', '30d', '90d', '1y'] as const

/** Minimum comparison data points for a meaningful pct_change */
const MIN_COMP_DAYS = 3

/**
 * Creates a Supabase admin client that bypasses RLS
 * @returns Supabase client with service role privileges
 */
function getSupabaseAdmin(): ReturnType<typeof createClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}

/**
 * Compute start date for a period relative to today
 * @param period - Period string (7d, 30d, 90d, 1y)
 * @param ref - Reference end date
 * @returns Start date
 */
function periodStartDate(period: string, ref: Date): Date {
  const start = new Date(ref)
  switch (period) {
    case '7d': start.setDate(start.getDate() - 7); break
    case '30d': start.setDate(start.getDate() - 30); break
    case '90d': start.setDate(start.getDate() - 90); break
    case '1y': start.setFullYear(start.getFullYear() - 1); break
    default: start.setDate(start.getDate() - 30)
  }
  return start
}

/** Format Date → YYYY-MM-DD */
function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

/**
 * Summary result for a single metric + period
 */
interface ComputedSummary {
  user_id: string
  metric: string
  period: string
  metric_type: 'post' | 'profile'
  current_total: number
  current_avg: number
  current_count: number
  comp_total: number
  comp_avg: number
  comp_count: number
  pct_change: number
  accumulative_total: number | null
  timeseries: { date: string; value: number }[]
  computed_at: string
}

/**
 * Compute post-level summaries for a user
 * @param supabase - Admin Supabase client
 * @param userId - User ID
 * @param now - Reference date
 * @returns Array of computed summaries
 */
async function computePostSummaries(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  now: Date
): Promise<ComputedSummary[]> {
  const results: ComputedSummary[] = []

  for (const period of PERIODS) {
    const endDate = now
    const startDate = periodStartDate(period, now)
    const startStr = toDateStr(startDate)
    const endStr = toDateStr(endDate)

    // Comparison period: same length, immediately preceding
    const periodLengthMs = endDate.getTime() - startDate.getTime()
    const compStartDate = new Date(startDate.getTime() - periodLengthMs)
    const compEndDate = new Date(startDate.getTime() - 1)
    const compStartStr = toDateStr(compStartDate)
    const compEndStr = toDateStr(compEndDate)

    for (const metric of POST_METRICS) {
      const col = metric === 'engagements_rate' ? 'engagements_rate' : `${metric}_gained`

      try {
        // Current period aggregates
        const { data: curRows } = await supabase
          .from('post_analytics_daily')
          .select('*')
          .eq('user_id', userId)
          .gte('analysis_date', startStr)
          .lte('analysis_date', endStr) as { data: Record<string, unknown>[] | null }

        const curValues = (curRows ?? []).map((r) => Number(r[col]) || 0)
        const curDates = new Set((curRows ?? []).map((r) => r.analysis_date as string))
        const currentTotal = curValues.reduce((a, b) => a + b, 0)
        const currentAvg = curValues.length > 0 ? currentTotal / curValues.length : 0
        const currentCount = curDates.size

        // Comparison period aggregates
        const { data: compRows } = await supabase
          .from('post_analytics_daily')
          .select('*')
          .eq('user_id', userId)
          .gte('analysis_date', compStartStr)
          .lte('analysis_date', compEndStr) as { data: Record<string, unknown>[] | null }

        const compValues = (compRows ?? []).map((r) => Number(r[col]) || 0)
        const compDates = new Set((compRows ?? []).map((r) => r.analysis_date as string))
        const compTotal = compValues.reduce((a, b) => a + b, 0)
        const compAvg = compValues.length > 0 ? compTotal / compValues.length : 0
        const compCount = compDates.size

        // Percentage change (daily average based, suppressed if < MIN_COMP_DAYS)
        let pctChange = 0
        if (compCount >= MIN_COMP_DAYS && compAvg > 0) {
          pctChange = Math.round(((currentAvg - compAvg) / compAvg) * 10000) / 100
        }

        // Timeseries: aggregate by date
        const dateMap = new Map<string, number>()
        for (const r of curRows ?? []) {
          const d = r.analysis_date as string
          const v = Number(r[col]) || 0
          dateMap.set(d, (dateMap.get(d) || 0) + v)
        }
        const timeseries = Array.from(dateMap.entries())
          .map(([date, value]) => ({ date, value: Math.round(value * 100) / 100 }))
          .sort((a, b) => a.date.localeCompare(b.date))

        results.push({
          user_id: userId,
          metric,
          period,
          metric_type: 'post',
          current_total: Math.round(currentTotal * 100) / 100,
          current_avg: Math.round(currentAvg * 100) / 100,
          current_count: currentCount,
          comp_total: Math.round(compTotal * 100) / 100,
          comp_avg: Math.round(compAvg * 100) / 100,
          comp_count: compCount,
          pct_change: pctChange,
          accumulative_total: null,
          timeseries,
          computed_at: new Date().toISOString(),
        })
      } catch (err) {
        console.error(`${LOG} Error computing ${metric}/${period} for user ${userId}:`, err)
      }
    }
  }

  return results
}

/**
 * Compute profile-level summaries for a user
 * @param supabase - Admin Supabase client
 * @param userId - User ID
 * @param now - Reference date
 * @returns Array of computed summaries
 */
async function computeProfileSummaries(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  now: Date
): Promise<ComputedSummary[]> {
  const results: ComputedSummary[] = []

  for (const period of PERIODS) {
    const endDate = now
    const startDate = periodStartDate(period, now)
    const startStr = toDateStr(startDate)
    const endStr = toDateStr(endDate)

    const periodLengthMs = endDate.getTime() - startDate.getTime()
    const compStartDate = new Date(startDate.getTime() - periodLengthMs)
    const compEndDate = new Date(startDate.getTime() - 1)
    const compStartStr = toDateStr(compStartDate)
    const compEndStr = toDateStr(compEndDate)

    for (const metric of PROFILE_METRICS) {
      const col = `${metric}_gained`

      try {
        // Current period
        const { data: curRows } = await supabase
          .from('profile_analytics_daily')
          .select('*')
          .eq('user_id', userId)
          .gte('analysis_date', startStr)
          .lte('analysis_date', endStr) as { data: Record<string, unknown>[] | null }

        const curValues = (curRows ?? []).map((r) => Number(r[col]) || 0)
        const currentTotal = curValues.reduce((a, b) => a + b, 0)
        const currentAvg = curValues.length > 0 ? currentTotal / curValues.length : 0
        const currentCount = curValues.length

        // Comparison period
        const { data: compRows } = await supabase
          .from('profile_analytics_daily')
          .select('*')
          .eq('user_id', userId)
          .gte('analysis_date', compStartStr)
          .lte('analysis_date', compEndStr) as { data: Record<string, unknown>[] | null }

        const compValues = (compRows ?? []).map((r) => Number(r[col]) || 0)
        const compTotal = compValues.reduce((a, b) => a + b, 0)
        const compAvg = compValues.length > 0 ? compTotal / compValues.length : 0
        const compCount = compValues.length

        let pctChange = 0
        if (compCount >= MIN_COMP_DAYS && compAvg > 0) {
          pctChange = Math.round(((currentAvg - compAvg) / compAvg) * 10000) / 100
        }

        // Timeseries
        const timeseries = (curRows ?? [])
          .map((r) => ({
            date: r.analysis_date as string,
            value: Math.round((Number(r[col]) || 0) * 100) / 100,
          }))
          .sort((a, b) => a.date.localeCompare(b.date))

        // Accumulative total: latest value
        const totalCol = `${metric}_total`
        const { data: accumRow } = await supabase
          .from('profile_analytics_accumulative')
          .select('*')
          .eq('user_id', userId)
          .order('analysis_date', { ascending: false })
          .limit(1)
          .maybeSingle() as { data: Record<string, unknown> | null }

        const accumulativeTotal = accumRow
          ? Number(accumRow[totalCol]) || 0
          : null

        results.push({
          user_id: userId,
          metric,
          period,
          metric_type: 'profile',
          current_total: Math.round(currentTotal * 100) / 100,
          current_avg: Math.round(currentAvg * 100) / 100,
          current_count: currentCount,
          comp_total: Math.round(compTotal * 100) / 100,
          comp_avg: Math.round(compAvg * 100) / 100,
          comp_count: compCount,
          pct_change: pctChange,
          accumulative_total: accumulativeTotal,
          timeseries,
          computed_at: new Date().toISOString(),
        })
      } catch (err) {
        console.error(`${LOG} Error computing ${metric}/${period} for user ${userId}:`, err)
      }
    }
  }

  return results
}

/**
 * Analytics Summary Compute Cron
 * Runs every 4 hours to pre-compute analytics summaries for all active users.
 * Results are upserted into analytics_summary_cache.
 */
export const analyticsSummaryCompute = inngest.createFunction(
  {
    id: 'analytics-summary-compute',
    name: 'Analytics Summary Compute',
    retries: 2,
    concurrency: [{ limit: 1 }],
  },
  { cron: '0 */4 * * *' },
  async ({ step }) => {
    const supabase = getSupabaseAdmin()
    const now = new Date()

    console.log(`${LOG} Starting summary computation at ${now.toISOString()}`)

    // Step 1: Get all active users (users with analytics data)
    const userIds = await step.run('fetch-active-users', async () => {
      // Get users that have post analytics data
      const { data: postUsers } = await supabase
        .from('post_analytics_daily')
        .select('user_id')
        .limit(1000) as { data: { user_id: string }[] | null }

      // Get users that have profile analytics data
      const { data: profileUsers } = await supabase
        .from('profile_analytics_daily')
        .select('user_id')
        .limit(1000) as { data: { user_id: string }[] | null }

      const ids = new Set<string>()
      for (const row of postUsers ?? []) ids.add(row.user_id)
      for (const row of profileUsers ?? []) ids.add(row.user_id)

      const uniqueIds = Array.from(ids)
      console.log(`${LOG} Found ${uniqueIds.length} active user(s)`)
      return uniqueIds
    })

    if (userIds.length === 0) {
      console.log(`${LOG} No active users, skipping`)
      return { success: true, usersProcessed: 0, summariesUpserted: 0 }
    }

    // Step 2: Compute summaries for all users
    const totalUpserted = await step.run('compute-and-upsert-summaries', async () => {
      let totalRows = 0

      for (const userId of userIds) {
        try {
          console.log(`${LOG} Computing summaries for user ${userId}`)

          const [postSummaries, profileSummaries] = await Promise.all([
            computePostSummaries(supabase, userId, now),
            computeProfileSummaries(supabase, userId, now),
          ])

          const allSummaries = [...postSummaries, ...profileSummaries]

          if (allSummaries.length === 0) {
            console.log(`${LOG} No data for user ${userId}, skipping`)
            continue
          }

          // Upsert in batches of 50
          for (let i = 0; i < allSummaries.length; i += 50) {
            const batch = allSummaries.slice(i, i + 50)

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
              .from('analytics_summary_cache')
              .upsert(
                batch.map((s) => ({
                  user_id: s.user_id,
                  metric: s.metric,
                  period: s.period,
                  metric_type: s.metric_type,
                  current_total: s.current_total,
                  current_avg: s.current_avg,
                  current_count: s.current_count,
                  comp_total: s.comp_total,
                  comp_avg: s.comp_avg,
                  comp_count: s.comp_count,
                  pct_change: s.pct_change,
                  accumulative_total: s.accumulative_total,
                  timeseries: s.timeseries,
                  computed_at: s.computed_at,
                })),
                { onConflict: 'user_id,metric,period' }
              )

            if (error) {
              console.error(`${LOG} Upsert error for user ${userId}:`, error)
            } else {
              totalRows += batch.length
            }
          }

          console.log(`${LOG} User ${userId}: ${allSummaries.length} summaries upserted`)
        } catch (err) {
          console.error(`${LOG} Failed to compute summaries for user ${userId}:`, err)
        }
      }

      return totalRows
    })

    // Step 3: Clean up stale entries (users that no longer exist)
    await step.run('cleanup-stale-entries', async () => {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('analytics_summary_cache')
        .delete()
        .lt('computed_at', sevenDaysAgo)

      if (error) {
        console.error(`${LOG} Cleanup error:`, error)
      } else {
        console.log(`${LOG} Cleaned up entries older than 7 days`)
      }
    })

    console.log(`${LOG} Completed: ${userIds.length} users, ${totalUpserted} summaries`)

    return {
      success: true,
      usersProcessed: userIds.length,
      summariesUpserted: totalUpserted,
    }
  }
)
