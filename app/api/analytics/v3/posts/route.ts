/**
 * Analytics V3 Posts API Route
 * @description Serves per-post and aggregated engagement data from the
 * `daily_post_snapshots` table. Supports metric selection, time period
 * filtering, single-post drill-down via `activity_urn`, and content type
 * filtering. Returns a daily timeseries with day-over-day deltas.
 * @module app/api/analytics/v3/posts
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** Valid metric names for post-level analytics */
const VALID_METRICS = [
  'impressions',
  'reactions',
  'comments',
  'reposts',
  'saves',
  'sends',
  'engagements',
] as const

type PostMetric = (typeof VALID_METRICS)[number]

/** Valid period identifiers */
const VALID_PERIODS = ['7d', '30d', '90d', '1y', 'custom'] as const
type Period = (typeof VALID_PERIODS)[number]

/** Valid content type filters */
const VALID_CONTENT_TYPES = ['all', 'text', 'image', 'video', 'carousel', 'document'] as const
type ContentType = (typeof VALID_CONTENT_TYPES)[number]

/** Shape of a row from the daily_post_snapshots table */
interface SnapshotRow {
  user_id: string
  activity_urn: string
  date: string
  impressions: number
  reactions: number
  comments: number
  reposts: number
  saves: number
  sends: number
  engagements: number
  media_type: string | null
  posted_at: string | null
  updated_at: string | null
  created_at: string | null
}

/** Shape of a single timeseries entry in the response */
interface TimeseriesEntry {
  date: string
  impressions: number
  reactions: number
  comments: number
  reposts: number
  saves: number
  sends: number
  engagements: number
  delta: number
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
 * @returns ISO date string (YYYY-MM-DD)
 */
function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

/**
 * Aggregate snapshot rows by date, summing all metric columns
 * @param rows - Array of daily_post_snapshots rows
 * @returns Map of date string to aggregated metric totals
 */
function aggregateByDate(
  rows: SnapshotRow[]
): Map<string, Omit<TimeseriesEntry, 'delta'>> {
  const map = new Map<string, Omit<TimeseriesEntry, 'delta'>>()

  for (const row of rows) {
    const existing = map.get(row.date)
    if (existing) {
      existing.impressions += Number(row.impressions) || 0
      existing.reactions += Number(row.reactions) || 0
      existing.comments += Number(row.comments) || 0
      existing.reposts += Number(row.reposts) || 0
      existing.saves += Number(row.saves) || 0
      existing.sends += Number(row.sends) || 0
      existing.engagements += Number(row.engagements) || 0
    } else {
      map.set(row.date, {
        date: row.date,
        impressions: Number(row.impressions) || 0,
        reactions: Number(row.reactions) || 0,
        comments: Number(row.comments) || 0,
        reposts: Number(row.reposts) || 0,
        saves: Number(row.saves) || 0,
        sends: Number(row.sends) || 0,
        engagements: Number(row.engagements) || 0,
      })
    }
  }

  return map
}

/**
 * Build a timeseries array with day-over-day deltas for the requested metric
 * @param aggregated - Map of date to aggregated metrics
 * @param metric - The metric to compute deltas for
 * @returns Sorted timeseries array with delta values
 */
function buildTimeseries(
  aggregated: Map<string, Omit<TimeseriesEntry, 'delta'>>,
  metric: PostMetric
): TimeseriesEntry[] {
  const sorted = Array.from(aggregated.values()).sort(
    (a, b) => a.date.localeCompare(b.date)
  )

  const timeseries: TimeseriesEntry[] = []

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i]
    const currentValue = entry[metric]
    const previousValue = i > 0 ? sorted[i - 1][metric] : 0
    const delta = currentValue - previousValue

    timeseries.push({
      ...entry,
      delta: Math.round(delta * 100) / 100,
    })
  }

  return timeseries
}

/**
 * GET /api/analytics/v3/posts
 * @description Fetches post-level analytics from daily_post_snapshots.
 * Returns a daily aggregated timeseries with day-over-day deltas.
 * When `activity_urn` is specified, also returns raw per-post rows.
 *
 * @param request - The incoming HTTP request
 * @returns JSON response with timeseries data and optional per-post rows
 *
 * @example
 * // Fetch 30-day engagements timeseries
 * GET /api/analytics/v3/posts?metric=engagements&period=30d
 *
 * @example
 * // Fetch impressions for a specific post
 * GET /api/analytics/v3/posts?metric=impressions&activity_urn=urn:li:activity:123
 *
 * @example
 * // Fetch video-only reactions for a custom date range
 * GET /api/analytics/v3/posts?metric=reactions&period=custom&startDate=2026-01-01&endDate=2026-03-01&contentType=video
 */
export async function GET(request: Request) {
  const supabase = await createClient()

  // Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)

  // Parse and validate parameters
  const metric = (searchParams.get('metric') || 'engagements') as PostMetric
  const period = (searchParams.get('period') || '30d') as Period
  const activityUrn = searchParams.get('activity_urn') || null
  const contentType = (searchParams.get('contentType') || 'all') as ContentType
  const customStart = searchParams.get('startDate')
  const customEnd = searchParams.get('endDate')

  if (!VALID_METRICS.includes(metric)) {
    return NextResponse.json(
      { error: `Invalid metric: ${metric}. Valid values: ${VALID_METRICS.join(', ')}` },
      { status: 400 }
    )
  }

  if (!VALID_PERIODS.includes(period)) {
    return NextResponse.json(
      { error: `Invalid period: ${period}. Valid values: ${VALID_PERIODS.join(', ')}` },
      { status: 400 }
    )
  }

  if (!VALID_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json(
      { error: `Invalid contentType: ${contentType}. Valid values: ${VALID_CONTENT_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  // Determine date range
  let startDate: Date
  let endDate: Date

  if (period === 'custom') {
    if (!customStart || !customEnd) {
      return NextResponse.json(
        { error: 'startDate and endDate are required for custom period' },
        { status: 400 }
      )
    }
    startDate = new Date(customStart)
    endDate = new Date(customEnd)

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid startDate or endDate format' },
        { status: 400 }
      )
    }
  } else {
    endDate = new Date()
    startDate = periodStartDate(period, endDate)
  }

  const startStr = toDateStr(startDate)
  const endStr = toDateStr(endDate)

  try {
    // Build query against daily_post_snapshots
    let query = supabase
      .from('daily_post_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startStr)
      .lte('date', endStr)

    // Apply optional filters
    if (activityUrn) {
      query = query.eq('activity_urn', activityUrn)
    }

    if (contentType !== 'all') {
      query = query.eq('media_type', contentType)
    }

    // Order by date for consistent processing
    query = query.order('date', { ascending: true })

    const { data: snapshots, error: queryError } = await query

    if (queryError) {
      console.error('Analytics V3 posts query error:', queryError)
      return NextResponse.json(
        { error: 'Failed to fetch post analytics' },
        { status: 500 }
      )
    }

    const rows = (snapshots ?? []) as SnapshotRow[]

    // Aggregate all posts' metrics by date
    const aggregated = aggregateByDate(rows)

    // Build timeseries with day-over-day deltas
    const timeseries = buildTimeseries(aggregated, metric)

    // Build response
    const response: {
      timeseries: TimeseriesEntry[]
      posts?: SnapshotRow[]
    } = { timeseries }

    // Include raw per-post rows when filtering by a specific post
    if (activityUrn) {
      response.posts = rows
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('Analytics V3 posts error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
