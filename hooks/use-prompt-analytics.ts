/**
 * Prompt Analytics Hook
 * @description React hook for fetching prompt usage analytics
 * @module hooks/use-prompt-analytics
 */

"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import type {
  UsageAnalytics,
  PromptType,
  PromptFeature,
} from '@/lib/prompts/prompt-types'

/**
 * Options for configuring the usePromptAnalytics hook
 */
interface UsePromptAnalyticsOptions {
  /** Filter by specific prompt ID */
  promptId?: string
  /** Filter by prompt type */
  promptType?: PromptType
  /** Filter by feature */
  feature?: PromptFeature
  /** Start of date range */
  startDate?: Date
  /** End of date range */
  endDate?: Date
  /** Maximum results */
  limit?: number
  /** Pagination offset */
  offset?: number
  /** Whether to auto-fetch on mount (default: true) */
  autoFetch?: boolean
}

/**
 * Return type for the usePromptAnalytics hook
 */
interface UsePromptAnalyticsReturn {
  /** Aggregated usage analytics */
  analytics: UsageAnalytics | null
  /** Whether analytics are currently loading */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Manually refetch analytics */
  refetch: () => Promise<void>
  /** Applied filters in the last request */
  appliedFilters: {
    promptId?: string
    promptType?: PromptType
    feature?: PromptFeature
    startDate?: string
    endDate?: string
    isAdminView?: boolean
  } | null
}

/**
 * Hook for fetching prompt usage analytics from the API
 * @param options - Configuration options for filtering analytics data
 * @returns Object with analytics data and helper functions
 * @example
 * ```tsx
 * // Fetch all analytics (admin view)
 * const { analytics, isLoading } = usePromptAnalytics()
 *
 * // Fetch analytics for a specific prompt type
 * const { analytics } = usePromptAnalytics({
 *   promptType: PromptType.REMIX_PROFESSIONAL,
 * })
 *
 * // Fetch analytics for a date range
 * const { analytics } = usePromptAnalytics({
 *   startDate: new Date('2024-01-01'),
 *   endDate: new Date('2024-01-31'),
 * })
 *
 * // Fetch analytics for a specific feature
 * const { analytics } = usePromptAnalytics({
 *   feature: 'remix',
 * })
 * ```
 */
export function usePromptAnalytics(
  options: UsePromptAnalyticsOptions = {}
): UsePromptAnalyticsReturn {
  const {
    promptId,
    promptType,
    feature,
    startDate,
    endDate,
    limit,
    offset,
    autoFetch = true,
  } = options

  const [analytics, setAnalytics] = useState<UsageAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appliedFilters, setAppliedFilters] = useState<{
    promptId?: string
    promptType?: PromptType
    feature?: PromptFeature
    startDate?: string
    endDate?: string
    isAdminView?: boolean
  } | null>(null)

  /**
   * Fetches analytics from the API with the configured filters
   */
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Build query parameters from options
      const params = new URLSearchParams()

      if (promptId) params.set('promptId', promptId)
      if (promptType) params.set('promptType', promptType)
      if (feature) params.set('feature', feature)
      if (startDate) params.set('startDate', startDate.toISOString())
      if (endDate) params.set('endDate', endDate.toISOString())
      if (limit !== undefined) params.set('limit', String(limit))
      if (offset !== undefined) params.set('offset', String(offset))

      const queryString = params.toString()
      const url = `/api/prompts/analytics${queryString ? `?${queryString}` : ''}`

      const response = await fetch(url)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch analytics: ${response.status}`)
      }

      const { data, filters } = await response.json()
      setAnalytics(data ?? null)
      setAppliedFilters(filters ?? null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error fetching analytics'
      setError(message)
      setAnalytics(null)
      toast.error('Failed to fetch analytics', { description: message })
    } finally {
      setIsLoading(false)
    }
  }, [promptId, promptType, feature, startDate, endDate, limit, offset])

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchAnalytics()
    }
  }, [autoFetch, fetchAnalytics])

  return {
    analytics,
    isLoading,
    error,
    refetch: fetchAnalytics,
    appliedFilters,
  }
}

/**
 * Preset time ranges for analytics queries
 */
export type AnalyticsTimeRange =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'thisYear'
  | 'custom'

/**
 * Gets start and end dates for a preset time range
 * @param range - The preset time range
 * @returns Object with startDate and endDate
 */
export function getDateRangeForPreset(range: AnalyticsTimeRange): {
  startDate: Date
  endDate: Date
} {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(today)
  endOfToday.setHours(23, 59, 59, 999)

  switch (range) {
    case 'today':
      return { startDate: today, endDate: endOfToday }

    case 'yesterday': {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const endOfYesterday = new Date(yesterday)
      endOfYesterday.setHours(23, 59, 59, 999)
      return { startDate: yesterday, endDate: endOfYesterday }
    }

    case 'last7days': {
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      return { startDate: sevenDaysAgo, endDate: endOfToday }
    }

    case 'last30days': {
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
      return { startDate: thirtyDaysAgo, endDate: endOfToday }
    }

    case 'thisMonth': {
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return { startDate: firstOfMonth, endDate: endOfToday }
    }

    case 'lastMonth': {
      const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      lastOfLastMonth.setHours(23, 59, 59, 999)
      return { startDate: firstOfLastMonth, endDate: lastOfLastMonth }
    }

    case 'thisQuarter': {
      const quarter = Math.floor(now.getMonth() / 3)
      const firstOfQuarter = new Date(now.getFullYear(), quarter * 3, 1)
      return { startDate: firstOfQuarter, endDate: endOfToday }
    }

    case 'thisYear': {
      const firstOfYear = new Date(now.getFullYear(), 0, 1)
      return { startDate: firstOfYear, endDate: endOfToday }
    }

    case 'custom':
    default:
      // For custom, return last 30 days as default
      const defaultStart = new Date(today)
      defaultStart.setDate(defaultStart.getDate() - 29)
      return { startDate: defaultStart, endDate: endOfToday }
  }
}

/**
 * Hook that wraps usePromptAnalytics with preset time range support
 * @param range - Preset time range
 * @param options - Additional filter options (excluding startDate/endDate)
 * @returns Analytics data with time range info
 * @example
 * ```tsx
 * const { analytics, timeRange, setTimeRange } = usePromptAnalyticsWithRange('last7days')
 *
 * // Change time range
 * setTimeRange('last30days')
 * ```
 */
export function usePromptAnalyticsWithRange(
  initialRange: AnalyticsTimeRange = 'last30days',
  options: Omit<UsePromptAnalyticsOptions, 'startDate' | 'endDate' | 'autoFetch'> = {}
): UsePromptAnalyticsReturn & {
  timeRange: AnalyticsTimeRange
  setTimeRange: (range: AnalyticsTimeRange) => void
  dateRange: { startDate: Date; endDate: Date }
} {
  const [timeRange, setTimeRange] = useState<AnalyticsTimeRange>(initialRange)

  const dateRange = useMemo(() => getDateRangeForPreset(timeRange), [timeRange])

  const analyticsResult = usePromptAnalytics({
    ...options,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    autoFetch: true,
  })

  return {
    ...analyticsResult,
    timeRange,
    setTimeRange,
    dateRange,
  }
}

/**
 * Hook for fetching analytics summary stats (commonly used metrics)
 * @param options - Filter options
 * @returns Object with commonly accessed metrics
 * @example
 * ```tsx
 * const {
 *   totalUsages,
 *   successRate,
 *   avgTokens,
 *   isLoading,
 * } = usePromptAnalyticsSummary({ feature: 'remix' })
 * ```
 */
export function usePromptAnalyticsSummary(
  options: UsePromptAnalyticsOptions = {}
): {
  totalUsages: number
  successRate: number
  avgTokens: number
  avgResponseTimeMs: number
  errorCount: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
} {
  const { analytics, isLoading, error, refetch } = usePromptAnalytics(options)

  return {
    totalUsages: analytics?.totalUsages ?? 0,
    successRate: analytics?.successRate ?? 0,
    avgTokens: analytics?.avgTokens ?? 0,
    avgResponseTimeMs: analytics?.avgResponseTimeMs ?? 0,
    errorCount: analytics?.errorCount ?? 0,
    isLoading,
    error,
    refetch,
  }
}
