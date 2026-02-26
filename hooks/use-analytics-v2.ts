/**
 * Analytics V2 Hook
 * @description Fetches analytics data from the /api/analytics/v2 endpoint
 * with support for metric selection, time periods, content type filtering,
 * comparison periods, and granularity controls.
 * @module hooks/use-analytics-v2
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Filter configuration for the analytics V2 endpoint
 */
export interface AnalyticsV2Filters {
  /** The metric to query (e.g., impressions, reactions, comments) */
  metric: string
  /** Time period (7d, 30d, 90d, 1y, custom) */
  period: string
  /** Start date for custom period (YYYY-MM-DD) */
  startDate?: string
  /** End date for custom period (YYYY-MM-DD) */
  endDate?: string
  /** Content type filter (all, text, image, video, carousel, document) */
  contentType: string
  /** Whether to include comparison period data */
  compare: boolean
  /** Data granularity (daily, weekly, monthly) */
  granularity: string
}

/**
 * Single data point in the analytics time series
 */
export interface AnalyticsDataPoint {
  /** Date string (YYYY-MM-DD) */
  date: string
  /** Metric value */
  value: number
}

/**
 * Summary statistics for the analytics data
 */
export interface AnalyticsSummary {
  /** Total value across the period */
  total: number
  /** Average value per data point */
  average: number
  /** Percentage change vs previous period */
  change: number
}

/**
 * Return type for the useAnalyticsV2 hook
 */
interface UseAnalyticsV2Return {
  /** Current period data points */
  data: AnalyticsDataPoint[]
  /** Summary statistics */
  summary: AnalyticsSummary | null
  /** Comparison period data points (when compare is enabled) */
  comparisonData: AnalyticsDataPoint[] | null
  /** Whether data is currently loading */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
}

/**
 * Hook to fetch and manage analytics V2 data
 * @param filters - Analytics filter configuration
 * @returns Analytics data, summary, comparison data, loading, and error states
 * @example
 * const { data, summary, isLoading } = useAnalyticsV2({
 *   metric: 'impressions',
 *   period: '30d',
 *   contentType: 'all',
 *   compare: false,
 *   granularity: 'daily',
 * })
 */
export function useAnalyticsV2(filters: AnalyticsV2Filters): UseAnalyticsV2Return {
  const [data, setData] = useState<AnalyticsDataPoint[]>([])
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [comparisonData, setComparisonData] = useState<AnalyticsDataPoint[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        metric: filters.metric,
        period: filters.period,
        contentType: filters.contentType,
        compare: String(filters.compare),
        granularity: filters.granularity,
      })

      if (filters.period === 'custom' && filters.startDate && filters.endDate) {
        params.set('startDate', filters.startDate)
        params.set('endDate', filters.endDate)
      }

      const response = await fetch(`/api/analytics/v2?${params.toString()}`, {
        signal: controller.signal,
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(body.error || `HTTP ${response.status}`)
      }

      const json = await response.json()

      if (!controller.signal.aborted) {
        setData(json.current ?? [])
        setSummary(json.summary ?? null)
        setComparisonData(json.comparison ?? null)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      console.error('Analytics V2 fetch error:', err)
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
        setData([])
        setSummary(null)
        setComparisonData(null)
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false)
      }
    }
  }, [filters.metric, filters.period, filters.startDate, filters.endDate, filters.contentType, filters.compare, filters.granularity])

  useEffect(() => {
    fetchData()
    return () => {
      abortRef.current?.abort()
    }
  }, [fetchData])

  return { data, summary, comparisonData, isLoading, error }
}
