/**
 * Admin Users Hook
 * @description Fetches and manages admin user data with pagination
 * @module hooks/use-admin-users
 */

"use client"

import { useCallback, useEffect, useState } from "react"
import type { AdminUser } from "@/types/admin"

/**
 * Pagination info from the API
 */
interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

/**
 * Filter options for admin users
 */
interface AdminUserFilters {
  /** Filter by onboarding completion status */
  onboardingCompleted?: boolean | null
  /** Filter by LinkedIn connection status */
  linkedinConnected?: boolean | null
  /** Sort by column */
  sortBy?: string
  /** Sort order */
  sortOrder?: "asc" | "desc"
}

/**
 * Return type for the useAdminUsers hook
 */
interface UseAdminUsersReturn {
  /** Array of user records */
  users: AdminUser[]
  /** Pagination information */
  pagination: PaginationInfo
  /** Whether data is currently loading */
  isLoading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Current search query */
  search: string
  /** Set search query */
  setSearch: (query: string) => void
  /** Current page */
  page: number
  /** Set current page */
  setPage: (page: number) => void
  /** Items per page */
  limit: number
  /** Set items per page */
  setLimit: (limit: number) => void
  /** Current filters */
  filters: AdminUserFilters
  /** Set filters */
  setFilters: (filters: AdminUserFilters) => void
  /** Refetch the data */
  refetch: () => void
}

/**
 * Hook for fetching admin user data with pagination and search.
 *
 * @returns Object with users, pagination, filters, and refetch function
 *
 * @example
 * ```tsx
 * const { users, pagination, isLoading, search, setSearch, page, setPage } = useAdminUsers()
 *
 * return (
 *   <div>
 *     <Input value={search} onChange={(e) => setSearch(e.target.value)} />
 *     <UserTable users={users} />
 *     <Pagination page={page} total={pagination.totalPages} onPageChange={setPage} />
 *   </div>
 * )
 * ```
 */
export function useAdminUsers(): UseAdminUsersReturn {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [filters, setFilters] = useState<AdminUserFilters>({
    onboardingCompleted: null,
    linkedinConnected: null,
    sortBy: "created_at",
    sortOrder: "desc",
  })

  /**
   * Fetches users from the API with current filters
   */
  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      })

      if (search) {
        params.append("search", search)
      }

      // Add filter params
      if (filters.onboardingCompleted !== null && filters.onboardingCompleted !== undefined) {
        params.append("onboardingCompleted", String(filters.onboardingCompleted))
      }
      if (filters.linkedinConnected !== null && filters.linkedinConnected !== undefined) {
        params.append("linkedinConnected", String(filters.linkedinConnected))
      }
      if (filters.sortBy) {
        params.append("sortBy", filters.sortBy)
      }
      if (filters.sortOrder) {
        params.append("sortOrder", filters.sortOrder)
      }

      const response = await fetch(`/api/admin/users?${params}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error ${response.status}`)
      }

      const result = await response.json()
      setUsers(result.users)
      setPagination(result.pagination)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch users"
      setError(message)
      console.error("Admin users fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [page, limit, search, filters])

  /**
   * Fetch users when filters change
   */
  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  /**
   * Reset to page 1 when search changes
   */
  useEffect(() => {
    setPage(1)
  }, [search])

  /**
   * Reset to page 1 when filters change
   */
  useEffect(() => {
    setPage(1)
  }, [filters])

  return {
    users,
    pagination,
    isLoading,
    error,
    search,
    setSearch,
    page,
    setPage,
    limit,
    setLimit,
    filters,
    setFilters,
    refetch: fetchUsers,
  }
}
