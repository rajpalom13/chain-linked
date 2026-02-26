/**
 * Analytics V2 API Route
 * @description Serves analytics data from the new daily/accumulative tables
 * with support for metric selection, time periods, content type filtering,
 * comparison periods, and granularity controls.
 * @module app/api/analytics/v2
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** Valid post-level metric names */
const POST_METRICS = [
  'impressions',
  'unique_reach',
  'reactions',
  'comments',
  'reposts',
  'saves',
  'sends',
  'engagements',
  'engagements_rate',
] as const

type PostMetric = (typeof POST_METRICS)[number]

/** Maps metric name to the _gained column in post_analytics_daily */
function gainedColumn(metric: PostMetric): string {
  return metric === 'engagements_rate' ? 'engagements_rate' : `${metric}_gained`
}

/**
 * Row shape returned from post_analytics_daily queries
 */
interface DailyAnalyticsRow {
  analysis_date: string
  [key: string]: string | number | null
}

/**
 * Compute start date from a period string relative to a reference date
 * @param period - The period identifier (7d, 30d, 90d, 1y)
 * @param ref - The reference end date
 * @returns Start date for the period
 */
function periodStartDate(period: string, ref: Date): Date {
  const start = new Date(ref)
  switch (period) {
    case '7d':
      start.setDate(start.getDate() - 7)
      break
    case '30d':
      start.setDate(start.getDate() - 30)
      break
    case '90d':
      start.setDate(start.getDate() - 90)
      break
    case '1y':
      start.setFullYear(start.getFullYear() - 1)
      break
    default:
      start.setDate(start.getDate() - 30)
  }
  return start
}

/**
 * Format a Date to YYYY-MM-DD string
 * @param d - Date object
 * @returns ISO date string
 */
function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

/**
 * Query post_analytics_daily with the given filters.
 * Uses dynamic column selection so we cast the result to DailyAnalyticsRow[].
 */
async function queryDailyAnalytics(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  col: string,
  startStr: string,
  endStr: string,
  postIds: string[] | null
): Promise<{ data: DailyAnalyticsRow[] | null; error: { message: string } | null }> {
  let query = supabase
    .from('post_analytics_daily')
    .select(`analysis_date, ${col}`)
    .eq('user_id', userId)
    .gte('analysis_date', startStr)
    .lte('analysis_date', endStr)
    .order('analysis_date', { ascending: true })

  if (postIds) {
    query = query.in('post_id', postIds)
  }

  const { data, error } = await query
  return {
    data: data as DailyAnalyticsRow[] | null,
    error: error ? { message: error.message } : null,
  }
}

/**
 * GET /api/analytics/v2
 * @description Fetches analytics data with filtering, comparison, and granularity
 */
export async function GET(request: Request) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const metric = (searchParams.get('metric') || 'impressions') as PostMetric
  const period = searchParams.get('period') || '30d'
  const contentType = searchParams.get('contentType') || 'all'
  const compare = searchParams.get('compare') === 'true'
  const granularity = searchParams.get('granularity') || 'daily'

  if (!POST_METRICS.includes(metric)) {
    return NextResponse.json({ error: `Invalid metric: ${metric}` }, { status: 400 })
  }

  // Determine date range
  const now = new Date()
  let endDate: Date
  let startDate: Date

  if (period === 'custom') {
    const customStart = searchParams.get('startDate')
    const customEnd = searchParams.get('endDate')
    if (!customStart || !customEnd) {
      return NextResponse.json({ error: 'startDate and endDate required for custom period' }, { status: 400 })
    }
    startDate = new Date(customStart)
    endDate = new Date(customEnd)
  } else {
    endDate = now
    startDate = periodStartDate(period, now)
  }

  const startStr = toDateStr(startDate)
  const endStr = toDateStr(endDate)

  // Compute comparison date range (same length, immediately preceding)
  const periodLengthMs = endDate.getTime() - startDate.getTime()
  const compStartDate = new Date(startDate.getTime() - periodLengthMs)
  const compEndDate = new Date(startDate.getTime() - 1) // day before current start
  const compStartStr = toDateStr(compStartDate)
  const compEndStr = toDateStr(compEndDate)

  const col = gainedColumn(metric)

  try {
    // If content type filter is active, we need to join with my_posts to filter
    let postIds: string[] | null = null
    if (contentType !== 'all') {
      const { data: filteredPosts } = await supabase
        .from('my_posts')
        .select('id')
        .eq('user_id', user.id)
        .eq('media_type', contentType)

      postIds = filteredPosts?.map(p => p.id) ?? []
      if (postIds.length === 0) {
        return NextResponse.json({
          current: [],
          comparison: null,
          summary: { total: 0, average: 0, change: 0 },
        })
      }
    }

    // Query current period
    const { data: currentRaw, error: currentError } = await queryDailyAnalytics(
      supabase, user.id, col, startStr, endStr, postIds
    )

    if (currentError) {
      console.error('Analytics V2 current query error:', currentError)
      return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 })
    }

    // Aggregate by date (sum across posts)
    const dateMap = new Map<string, number>()
    for (const row of currentRaw ?? []) {
      const date = row.analysis_date
      const val = row[col] as number | null
      dateMap.set(date, (dateMap.get(date) ?? 0) + (val ?? 0))
    }

    // Apply granularity bucketing
    const current = bucketByGranularity(dateMap, granularity)

    // Calculate summary
    const values = current.map(d => d.value)
    const total = values.reduce((s, v) => s + v, 0)
    const average = values.length > 0 ? total / values.length : 0

    // Comparison period
    let comparison: { date: string; value: number }[] | null = null
    let change = 0

    if (compare) {
      const { data: compRaw } = await queryDailyAnalytics(
        supabase, user.id, col, compStartStr, compEndStr, postIds
      )

      const compDateMap = new Map<string, number>()
      for (const row of compRaw ?? []) {
        const date = row.analysis_date
        const val = row[col] as number | null
        compDateMap.set(date, (compDateMap.get(date) ?? 0) + (val ?? 0))
      }

      comparison = bucketByGranularity(compDateMap, granularity)
      const compTotal = comparison.reduce((s, d) => s + d.value, 0)
      change = compTotal > 0 ? ((total - compTotal) / compTotal) * 100 : total > 0 ? 100 : 0
    } else {
      // Compute change from previous period for the summary
      const { data: prevRaw } = await queryDailyAnalytics(
        supabase, user.id, col, compStartStr, compEndStr, postIds
      )

      const prevTotal = (prevRaw ?? []).reduce((s, row) => {
        const val = row[col] as number | null
        return s + (val ?? 0)
      }, 0)
      change = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : total > 0 ? 100 : 0
    }

    return NextResponse.json({
      current,
      comparison,
      summary: {
        total: metric === 'engagements_rate' ? average : total,
        average: Math.round(average * 100) / 100,
        change: Math.round(change * 100) / 100,
      },
    })
  } catch (err) {
    console.error('Analytics V2 error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Buckets daily date-value pairs by the specified granularity
 * @param dateMap - Map of date strings to aggregated values
 * @param granularity - daily, weekly, or monthly
 * @returns Array of date-value pairs bucketed by granularity
 */
function bucketByGranularity(
  dateMap: Map<string, number>,
  granularity: string
): { date: string; value: number }[] {
  if (granularity === 'daily' || dateMap.size === 0) {
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value: Math.round(value * 100) / 100 }))
  }

  const buckets = new Map<string, number>()

  for (const [dateStr, value] of dateMap.entries()) {
    const d = new Date(dateStr)
    let bucketKey: string

    if (granularity === 'weekly') {
      const day = d.getDay()
      const monday = new Date(d)
      monday.setDate(d.getDate() - ((day + 6) % 7))
      bucketKey = toDateStr(monday)
    } else {
      bucketKey = `${dateStr.substring(0, 7)}-01`
    }

    buckets.set(bucketKey, (buckets.get(bucketKey) ?? 0) + value)
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value: Math.round(value * 100) / 100 }))
}
