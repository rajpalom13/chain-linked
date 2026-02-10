"use client"

/**
 * Posts Page
 * @description Displays the user's own LinkedIn posts with engagement metrics,
 * search/filter, sorting, and summary statistics
 * @module app/dashboard/posts/page
 */

import * as React from "react"
import { useState, useEffect, useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { cn } from "@/lib/utils"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  IconAlertCircle,
  IconArticle,
  IconChevronDown,
  IconChevronUp,
  IconEye,
  IconHeart,
  IconMessageCircle,
  IconMoodEmpty,
  IconRefresh,
  IconRepeat,
  IconSearch,
  IconTrendingUp,
} from "@tabler/icons-react"
import {
  pageVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from "@/lib/animations"

// ============================================================================
// Types
// ============================================================================

/**
 * Shape of a single post returned from the my_posts API
 */
interface MyPost {
  /** Unique post identifier */
  id: string
  /** Owner user ID */
  user_id: string
  /** LinkedIn activity URN */
  activity_urn: string
  /** Post text content */
  content: string | null
  /** Type of media attached (image, video, document, etc.) */
  media_type: string | null
  /** Number of reactions (likes, celebrates, etc.) */
  reactions: number | null
  /** Number of comments */
  comments: number | null
  /** Number of reposts/shares */
  reposts: number | null
  /** Number of impressions / views */
  impressions: number | null
  /** When the post was published on LinkedIn */
  posted_at: string | null
  /** Raw LinkedIn API data */
  raw_data: unknown
  /** Record creation timestamp */
  created_at: string
  /** Record update timestamp */
  updated_at: string
}

/**
 * API response shape from /api/posts
 */
interface PostsApiResponse {
  posts: MyPost[]
  total: number
}

/**
 * Sort options for the post list
 */
type SortOption = "recent" | "impressions" | "engagement"

// ============================================================================
// Constants
// ============================================================================

/** Number of posts to fetch per page */
const PAGE_SIZE = 20

/** Sort option labels for the dropdown */
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Most Recent" },
  { value: "impressions", label: "Most Impressions" },
  { value: "engagement", label: "Most Engagement" },
]

// ============================================================================
// Utilities
// ============================================================================

/**
 * Formats a number with K/M suffixes for large values
 * @param num - The number to format
 * @returns Formatted string (e.g. "1.2K", "3.4M")
 */
function formatNumber(num: number | null | undefined): string {
  if (num == null) return "0"
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")}K`
  }
  return num.toString()
}

/**
 * Calculates engagement rate for a post
 * @param post - The post to calculate engagement for
 * @returns Engagement rate as a percentage string (e.g. "4.2%")
 */
function getEngagementRate(post: MyPost): string {
  const impressions = post.impressions ?? 0
  if (impressions === 0) return "0%"
  const engagements = (post.reactions ?? 0) + (post.comments ?? 0) + (post.reposts ?? 0)
  const rate = (engagements / impressions) * 100
  return `${rate.toFixed(1)}%`
}

/**
 * Returns a numeric engagement rate for sorting
 * @param post - The post to calculate engagement for
 * @returns Engagement rate as a decimal number
 */
function getEngagementRateNum(post: MyPost): number {
  const impressions = post.impressions ?? 0
  if (impressions === 0) return 0
  const engagements = (post.reactions ?? 0) + (post.comments ?? 0) + (post.reposts ?? 0)
  return engagements / impressions
}

/**
 * Converts a date string to a relative time description
 * @param dateStr - ISO date string
 * @returns Human-readable relative time (e.g. "3d ago", "2h ago")
 */
function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "Unknown"
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffWeek = Math.floor(diffDay / 7)
  const diffMonth = Math.floor(diffDay / 30)

  if (diffMonth > 0) return `${diffMonth}mo ago`
  if (diffWeek > 0) return `${diffWeek}w ago`
  if (diffDay > 0) return `${diffDay}d ago`
  if (diffHour > 0) return `${diffHour}h ago`
  if (diffMin > 0) return `${diffMin}m ago`
  return "Just now"
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Summary statistics cards shown at the top of the page
 * @param props - Component props
 * @param props.totalPosts - Total number of posts
 * @param props.totalImpressions - Sum of impressions across all posts
 * @param props.avgEngagement - Average engagement rate percentage
 * @param props.totalReactions - Sum of reactions across all posts
 * @returns Summary stats row
 */
function StatsSummary({
  totalPosts,
  totalImpressions,
  avgEngagement,
  totalReactions,
}: {
  totalPosts: number
  totalImpressions: number
  avgEngagement: number
  totalReactions: number
}) {
  const stats = [
    {
      label: "Total Posts",
      value: formatNumber(totalPosts),
      icon: IconArticle,
      color: "text-blue-500",
    },
    {
      label: "Total Impressions",
      value: formatNumber(totalImpressions),
      icon: IconEye,
      color: "text-emerald-500",
    },
    {
      label: "Avg. Engagement",
      value: `${avgEngagement.toFixed(1)}%`,
      icon: IconTrendingUp,
      color: "text-amber-500",
    },
    {
      label: "Total Reactions",
      value: formatNumber(totalReactions),
      icon: IconHeart,
      color: "text-rose-500",
    },
  ]

  return (
    <motion.div
      className="grid grid-cols-2 gap-3 sm:grid-cols-4 px-4 lg:px-6"
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
    >
      {stats.map((stat) => (
        <motion.div key={stat.label} variants={staggerItemVariants}>
          <Card>
            <CardContent className="flex items-center gap-3 py-4 px-4">
              <div className={cn("rounded-lg bg-muted p-2", stat.color)}>
                <stat.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                <p className="text-lg font-semibold leading-tight">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}

/**
 * Metric bar that shows relative performance compared to the best post
 * @param props - Component props
 * @param props.value - Current value
 * @param props.max - Maximum value in the dataset (for normalization)
 * @returns A thin horizontal bar
 */
function MetricBar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.max((value / max) * 100, 2) : 2
  return (
    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-primary/60"
        initial={{ width: 0 }}
        animate={{ width: `${width}%` }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  )
}

/**
 * Individual post card with content preview and engagement metrics
 * @param props - Component props
 * @param props.post - The post data to display
 * @param props.maxImpressions - Highest impression count across all posts (for bar normalization)
 * @returns Post card element
 */
function PostCard({ post, maxImpressions }: { post: MyPost; maxImpressions: number }) {
  const [expanded, setExpanded] = useState(false)
  const content = post.content || "No content available"
  const isLong = content.length > 200

  return (
    <motion.div variants={staggerItemVariants}>
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <CardContent className="p-4 sm:p-5">
          {/* Header row: date + media badge */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              {relativeTime(post.posted_at)}
            </span>
            <div className="flex items-center gap-2">
              {post.media_type && (
                <Badge variant="secondary" className="text-xs capitalize">
                  {post.media_type}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-medium",
                  getEngagementRateNum(post) >= 0.05
                    ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                    : getEngagementRateNum(post) >= 0.02
                      ? "border-amber-500/40 text-amber-600 dark:text-amber-400"
                      : "border-muted-foreground/30"
                )}
              >
                {getEngagementRate(post)} ER
              </Badge>
            </div>
          </div>

          {/* Post content */}
          <div className="mb-3">
            <p
              className={cn(
                "text-sm leading-relaxed whitespace-pre-wrap break-words",
                !expanded && isLong && "line-clamp-3"
              )}
            >
              {content}
            </p>
            {isLong && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-1 text-xs font-medium text-primary hover:underline inline-flex items-center gap-0.5"
              >
                {expanded ? (
                  <>
                    Show less <IconChevronUp className="size-3" />
                  </>
                ) : (
                  <>
                    Read more <IconChevronDown className="size-3" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Performance bar */}
          <div className="mb-3">
            <MetricBar value={post.impressions ?? 0} max={maxImpressions} />
          </div>

          {/* Engagement metrics row */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1 text-muted-foreground">
                <IconEye className="size-3.5" />
                <span className="text-xs">Views</span>
              </div>
              <span className="text-sm font-semibold">{formatNumber(post.impressions)}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1 text-muted-foreground">
                <IconHeart className="size-3.5" />
                <span className="text-xs">Likes</span>
              </div>
              <span className="text-sm font-semibold">{formatNumber(post.reactions)}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1 text-muted-foreground">
                <IconMessageCircle className="size-3.5" />
                <span className="text-xs">Comments</span>
              </div>
              <span className="text-sm font-semibold">{formatNumber(post.comments)}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1 text-muted-foreground">
                <IconRepeat className="size-3.5" />
                <span className="text-xs">Reposts</span>
              </div>
              <span className="text-sm font-semibold">{formatNumber(post.reposts)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/**
 * Loading skeleton for the posts page
 * @returns Skeleton placeholder for the posts list
 */
function PostsSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 animate-in fade-in duration-300">
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 px-4 lg:px-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 py-4 px-4">
              <Skeleton className="size-9 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-14" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search/filter skeleton */}
      <div className="flex items-center gap-3 px-4 lg:px-6">
        <Skeleton className="h-9 flex-1 max-w-sm" />
        <Skeleton className="h-9 w-[160px]" />
      </div>

      {/* Post cards skeleton */}
      <div className="flex flex-col gap-3 px-4 lg:px-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex flex-col items-center gap-1">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/**
 * Empty state when no posts are found
 * @param props - Component props
 * @param props.hasSearch - Whether a search filter is currently active
 * @returns Empty state illustration and message
 */
function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <IconMoodEmpty className="size-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">
        {hasSearch ? "No matching posts" : "No posts yet"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md">
        {hasSearch
          ? "Try adjusting your search term or clearing the filter to see all posts."
          : "Your LinkedIn posts will appear here once the ChainLinked extension captures them. Make sure the extension is connected and syncing."}
      </p>
    </motion.div>
  )
}

// ============================================================================
// Main Content
// ============================================================================

/**
 * Posts page content with data fetching, filtering, and sorting
 * @returns The main posts list content area
 */
function PostsContent() {
  const { user } = useAuthContext()

  const [posts, setPosts] = useState<MyPost[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("recent")
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  /**
   * Fetches posts from the API
   */
  const fetchPosts = useCallback(async (currentOffset: number, append = false) => {
    if (!user?.id) return

    try {
      if (!append) setIsLoading(true)
      setError(null)

      const res = await fetch(
        `/api/posts?type=my_posts&limit=${PAGE_SIZE}&offset=${currentOffset}`
      )

      if (!res.ok) {
        throw new Error(`Failed to fetch posts (${res.status})`)
      }

      const data: PostsApiResponse = await res.json()

      if (append) {
        setPosts((prev) => [...prev, ...(data.posts || [])])
      } else {
        setPosts(data.posts || [])
      }

      setTotal(data.total ?? 0)
      setHasMore((data.posts?.length ?? 0) >= PAGE_SIZE)
    } catch (err) {
      console.error("Error fetching posts:", err)
      setError(err instanceof Error ? err.message : "Failed to load posts")
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  /** Initial data load */
  useEffect(() => {
    fetchPosts(0)
  }, [fetchPosts])

  /**
   * Handles loading the next page of posts
   */
  const loadMore = useCallback(() => {
    const newOffset = offset + PAGE_SIZE
    setOffset(newOffset)
    fetchPosts(newOffset, true)
  }, [offset, fetchPosts])

  /**
   * Filters posts by search query and applies sort
   */
  const filteredAndSortedPosts = useMemo(() => {
    let result = [...posts]

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (p) => p.content?.toLowerCase().includes(query)
      )
    }

    // Apply sort
    switch (sortBy) {
      case "impressions":
        result.sort((a, b) => (b.impressions ?? 0) - (a.impressions ?? 0))
        break
      case "engagement":
        result.sort((a, b) => getEngagementRateNum(b) - getEngagementRateNum(a))
        break
      case "recent":
      default:
        result.sort((a, b) => {
          const dateA = a.posted_at ? new Date(a.posted_at).getTime() : 0
          const dateB = b.posted_at ? new Date(b.posted_at).getTime() : 0
          return dateB - dateA
        })
        break
    }

    return result
  }, [posts, searchQuery, sortBy])

  /**
   * Computed summary statistics from all loaded posts
   */
  const summaryStats = useMemo(() => {
    const totalImpressions = posts.reduce((sum, p) => sum + (p.impressions ?? 0), 0)
    const totalReactions = posts.reduce((sum, p) => sum + (p.reactions ?? 0), 0)
    const totalComments = posts.reduce((sum, p) => sum + (p.comments ?? 0), 0)
    const totalReposts = posts.reduce((sum, p) => sum + (p.reposts ?? 0), 0)
    const totalEngagements = totalReactions + totalComments + totalReposts
    const avgEngagement =
      totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0

    return {
      totalPosts: total,
      totalImpressions,
      avgEngagement,
      totalReactions,
    }
  }, [posts, total])

  /** Maximum impressions value across all posts, used for bar normalization */
  const maxImpressions = useMemo(
    () => Math.max(...posts.map((p) => p.impressions ?? 0), 1),
    [posts]
  )

  // -- Error state --
  if (error && posts.length === 0) {
    return (
      <motion.div
        className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2 text-destructive">
              <IconAlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchPosts(0)}>
              <IconRefresh className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // -- Loading state --
  if (isLoading) {
    return <PostsSkeleton />
  }

  // -- Empty state (no posts at all) --
  if (posts.length === 0) {
    return <EmptyState hasSearch={false} />
  }

  return (
    <motion.div
      className="flex flex-col gap-4 py-4 md:gap-6 md:py-6"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Summary Stats */}
      <StatsSummary
        totalPosts={summaryStats.totalPosts}
        totalImpressions={summaryStats.totalImpressions}
        avgEngagement={summaryStats.avgEngagement}
        totalReactions={summaryStats.totalReactions}
      />

      {/* Search & Sort Controls */}
      <motion.div
        className="flex flex-col gap-3 sm:flex-row sm:items-center px-4 lg:px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="relative flex-1 max-w-sm">
          <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={sortBy}
          onValueChange={(val) => setSortBy(val as SortOption)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Post List */}
      {filteredAndSortedPosts.length === 0 ? (
        <EmptyState hasSearch={!!searchQuery.trim()} />
      ) : (
        <motion.div
          className="flex flex-col gap-3 px-4 lg:px-6"
          variants={staggerContainerVariants}
          initial="initial"
          animate="animate"
        >
          {filteredAndSortedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              maxImpressions={maxImpressions}
            />
          ))}
        </motion.div>
      )}

      {/* Load More */}
      {hasMore && !searchQuery.trim() && (
        <motion.div
          className="flex justify-center px-4 lg:px-6 pb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            variant="outline"
            onClick={loadMore}
            className="gap-2"
          >
            Load more posts
          </Button>
        </motion.div>
      )}
    </motion.div>
  )
}

// ============================================================================
// Page Component
// ============================================================================

/**
 * Posts page - Displays the user's own LinkedIn posts with engagement metrics
 * @returns Full page layout with sidebar, header, and posts content
 * @example
 * // Accessed via /dashboard/posts
 */
export default function PostsPage() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Posts" />
        <main id="main-content" className="flex flex-1 flex-col overflow-y-auto">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <PostsContent />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
