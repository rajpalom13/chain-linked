/**
 * Admin Stats Hook
 * @description Fetches and manages admin dashboard statistics
 * @module hooks/use-admin-stats
 */

"use client"

import { useCallback, useEffect, useState } from "react"
import type { AdminDashboardData } from "@/types/admin"

/**
 * Return type for the useAdminStats hook
 */
interface UseAdminStatsReturn {
  /** Dashboard data */
  data: AdminDashboardData | null
  /** Whether data is currently loading */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Refetch the data */
  refetch: () => void
}

/**
 * Hook for fetching admin dashboard statistics from the API.
 *
 * @returns Object with dashboard data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useAdminStats()
 *
 * if (isLoading) return <Loading />
 * if (error) return <Error message={error} />
 *
 * return <Dashboard data={data} />
 * ```
 */
export function useAdminStats(): UseAdminStatsReturn {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetches admin stats from the API
   */
  const fetchStats = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/stats")

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error ${response.status}`)
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch admin stats"
      setError(message)
      console.error("Admin stats fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Fetch stats on mount
   */
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    data,
    isLoading,
    error,
    refetch: fetchStats,
  }
}
