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
import { PageContent } from "@/components/shared/page-content"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { cn } from "@/lib/utils"
import { usePageMeta } from "@/lib/dashboard-context"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import {
  IconAlertCircle,
  IconArticle,
  IconChevronDown,
  IconChevronUp,
  IconEye,
  IconHeart,
  IconMessageCircle,
  IconMoodEmpty,
  IconPencil,
  IconPhoto,
  IconRefresh,
  IconRepeat,
  IconSearch,
  IconTrendingUp,
  IconUsers,
  IconUser,
} from "@tabler/icons-react"
import {
  staggerContainerVariants,
  staggerItemVariants,
} from "@/lib/animations"
import { CrossNav, type CrossNavItem } from "@/components/shared/cross-nav"
import { IconChartBar, IconTemplate } from "@tabler/icons-react"

/** Cross-navigation items for the posts page */
const POSTS_CROSS_NAV: CrossNavItem[] = [
  {
    href: "/dashboard/compose",
    icon: IconPencil,
    label: "Compose a Post",
    description: "Draft and publish new LinkedIn content.",
    color: "primary",
  },
  {
    href: "/dashboard/analytics",
    icon: IconChartBar,
    label: "View Analytics",
    description: "Track your performance and engagement metrics.",
    color: "emerald-500",
  },
  {
    href: "/dashboard/templates",
    icon: IconTemplate,
    label: "Browse Templates",
    description: "Start from proven post templates.",
    color: "amber-500",
  },
]

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
  /** Media URLs (images, videos, etc.) attached to the post */
  media_urls: string[] | null
  /** Record update timestamp */
  updated_at: string
  /** Author profile (included in team_posts responses) */
  author?: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

/**
 * View mode for the posts page
 */
type PostViewMode = "my_posts" | "team_posts"

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
      iconColor: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Total Impressions",
      value: formatNumber(totalImpressions),
      icon: IconEye,
      iconColor: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Avg. Engagement",
      value: `${avgEngagement.toFixed(1)}%`,
      icon: IconTrendingUp,
      iconColor: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Total Reactions",
      value: formatNumber(totalReactions),
      icon: IconHeart,
      iconColor: "text-rose-500",
      bgColor: "bg-rose-500/10",
    },
  ]

  return (
    <motion.div
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
    >
      {stats.map((stat) => (
        <motion.div key={stat.label} variants={staggerItemVariants}>
          <Card className="border-border/50 hover:border-border transition-colors">
            <CardContent className="flex items-center gap-3 py-4 px-4">
              <div className={cn("rounded-xl p-2.5 shrink-0", stat.bgColor)}>
                <stat.icon className={cn("size-4", stat.iconColor)} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                <p className="text-lg font-bold leading-tight tabular-nums">{stat.value}</p>
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
    <div className="h-1 w-full rounded-full bg-muted/60 overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary/40"
        initial={{ width: 0 }}
        animate={{ width: `${width}%` }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  )
}

/**
 * Generates initials from a full name for avatar fallback
 * @param name - Full name to extract initials from
 * @returns Two-letter initials string
 */
function getInitials(name: string): string {
  const parts = name.split(" ").filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * LinkedIn-style media gallery.
 * - Hero image on top: full width, good height
 * - Below: row of square thumbnails for the rest
 * - "+N" overlay on last square if more images exist
 * Click any image for full-screen lightbox.
 *
 * @param props.urls - Array of media URLs
 */
function PostMediaGallery({ urls }: { urls: string[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const count = urls.length

  if (count === 0) return null

  /** Max squares to show in the bottom row (last becomes +N if overflow) */
  const maxSquares = 4
  const squareUrls = urls.slice(1, 1 + maxSquares)
  const overflow = count - 1 - maxSquares // remaining after hero + visible squares

  return (
    <>
      <div className="mb-3 flex flex-col gap-1 overflow-hidden rounded-lg">
        {/* Hero image — full width */}
        <button
          type="button"
          className="relative h-44 w-full overflow-hidden bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          onClick={() => setLightboxIndex(0)}
          aria-label={`View image 1 of ${count}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urls[0]} alt="" className="size-full object-cover" loading="lazy" />
        </button>

        {/* Square thumbnails row */}
        {squareUrls.length > 0 && (
          <div className="flex gap-1">
            {squareUrls.map((url, i) => {
              const realIndex = i + 1
              const isLast = i === squareUrls.length - 1 && overflow > 0
              return (
                <button
                  key={realIndex}
                  type="button"
                  className="relative flex-1 aspect-square overflow-hidden bg-muted cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  onClick={() => setLightboxIndex(realIndex)}
                  aria-label={isLast ? `View all ${count} images` : `View image ${realIndex + 1} of ${count}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="size-full object-cover" loading="lazy" />
                  {isLast && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <span className="text-lg font-bold text-white">+{overflow}</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Full-screen lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={() => setLightboxIndex(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLightboxIndex(null)
            if (e.key === "ArrowRight" && lightboxIndex < count - 1) setLightboxIndex(lightboxIndex + 1)
            if (e.key === "ArrowLeft" && lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1)
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Image lightbox"
          tabIndex={0}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(null) }}
            aria-label="Close"
          >
            <IconChevronUp className="size-5 rotate-45" />
          </button>

          {/* Prev */}
          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 z-10 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1) }}
              aria-label="Previous"
            >
              <IconChevronDown className="size-5 rotate-90" />
            </button>
          )}

          {/* Next */}
          {lightboxIndex < count - 1 && (
            <button
              className="absolute right-4 z-10 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20 transition-colors"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1) }}
              aria-label="Next"
            >
              <IconChevronDown className="size-5 -rotate-90" />
            </button>
          )}

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white">
            {lightboxIndex + 1} / {count}
          </div>

          {/* Thumbnail strip at bottom */}
          {count > 1 && (
            <div className="absolute bottom-12 left-1/2 z-10 -translate-x-1/2 flex gap-1.5">
              {urls.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  className={cn(
                    "size-10 shrink-0 overflow-hidden rounded transition-all",
                    i === lightboxIndex
                      ? "ring-2 ring-white brightness-100"
                      : "opacity-50 hover:opacity-80"
                  )}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(i) }}
                  aria-label={`Go to image ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Main image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urls[lightboxIndex]}
            alt={`Image ${lightboxIndex + 1} of ${count}`}
            className="max-h-[75vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

/**
 * Individual post card with content preview, media gallery, and engagement metrics
 * @param props - Component props
 * @param props.post - The post data to display
 * @param props.maxImpressions - Highest impression count across all posts (for bar normalization)
 * @param props.showAuthor - Whether to show author info (for team view)
 * @returns Post card element
 */
function PostCard({ post, maxImpressions, showAuthor = false }: { post: MyPost; maxImpressions: number; showAuthor?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const content = post.content || "No content available"
  const isLong = content.length > 200
  const mediaUrls = post.media_urls ?? []

  return (
    <motion.div variants={staggerItemVariants} whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
      <Card className="overflow-hidden border-border/50 transition-all duration-200 hover:border-border hover:shadow-sm">
        <CardContent className="p-4 sm:p-5">
          {/* Author row (team view only) */}
          {showAuthor && post.author && (
            <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-border/50">
              <Avatar className="size-8">
                {post.author.avatar_url && (
                  <AvatarImage src={post.author.avatar_url} alt={post.author.full_name || ''} />
                )}
                <AvatarFallback className="text-xs font-medium">
                  {getInitials(post.author.full_name || post.author.email || '?')}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {post.author.full_name || post.author.email?.split('@')[0] || 'Unknown'}
                </p>
              </div>
            </div>
          )}

          {/* Header row: date + media badge + ER */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium">
              {relativeTime(post.posted_at)}
            </span>
            <div className="flex items-center gap-2">
              {post.media_type && (
                <Badge variant="secondary" className="text-[11px] capitalize font-medium gap-1">
                  {mediaUrls.length > 0 && <IconPhoto className="size-3" />}
                  {post.media_type}
                  {mediaUrls.length > 1 && (
                    <span className="text-muted-foreground">({mediaUrls.length})</span>
                  )}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "text-[11px] font-semibold",
                  getEngagementRateNum(post) >= 0.05
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                    : getEngagementRateNum(post) >= 0.02
                      ? "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400"
                      : "border-muted-foreground/20 text-muted-foreground"
                )}
              >
                {getEngagementRate(post)} ER
              </Badge>
            </div>
          </div>

          {/* Post content */}
          <div className="mb-4">
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
                className="mt-1.5 text-xs font-medium text-primary hover:underline inline-flex items-center gap-0.5"
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

          {/* Media Gallery */}
          {mediaUrls.length > 0 && (
            <PostMediaGallery urls={mediaUrls} />
          )}

          {/* Performance bar */}
          <div className="mb-4">
            <MetricBar value={post.impressions ?? 0} max={maxImpressions} />
          </div>

          {/* Engagement metrics row */}
          <div className="grid grid-cols-4 gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1 text-muted-foreground">
                <IconEye className="size-3" />
                <span className="text-[11px]">Views</span>
              </div>
              <span className="text-sm font-bold tabular-nums">{formatNumber(post.impressions)}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1 text-muted-foreground">
                <IconHeart className="size-3" />
                <span className="text-[11px]">Likes</span>
              </div>
              <span className="text-sm font-bold tabular-nums">{formatNumber(post.reactions)}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1 text-muted-foreground">
                <IconMessageCircle className="size-3" />
                <span className="text-[11px]">Comments</span>
              </div>
              <span className="text-sm font-bold tabular-nums">{formatNumber(post.comments)}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1 text-muted-foreground">
                <IconRepeat className="size-3" />
                <span className="text-[11px]">Reposts</span>
              </div>
              <span className="text-sm font-bold tabular-nums">{formatNumber(post.reposts)}</span>
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
    <PageContent>
      {/* Header skeleton */}
      <div className="space-y-1.5">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="flex items-center gap-3 py-4 px-4">
              <Skeleton className="size-9 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-14" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search/filter skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 flex-1 max-w-sm" />
        <Skeleton className="h-9 w-[160px]" />
      </div>

      {/* Post cards skeleton */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="border-border/50">
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
              {/* Media gallery skeleton (alternating) */}
              {i % 2 === 0 && (
                <Skeleton className="h-40 w-full rounded-lg" />
              )}
              <Skeleton className="h-1 w-full rounded-full" />
              <div className="grid grid-cols-4 gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
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
    </PageContent>
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

  const [viewMode, setViewMode] = useState<PostViewMode>("my_posts")
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
  const fetchPosts = useCallback(async (currentOffset: number, append = false, mode?: PostViewMode) => {
    if (!user?.id) return

    const fetchMode = mode ?? viewMode

    try {
      if (!append) setIsLoading(true)
      setError(null)

      const res = await fetch(
        `/api/posts?type=${fetchMode}&limit=${PAGE_SIZE}&offset=${currentOffset}`
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
  }, [user?.id, viewMode])

  /** Initial data load */
  useEffect(() => {
    fetchPosts(0)
  }, [fetchPosts])

  /**
   * Handle view mode change (My Posts / Team Posts)
   */
  const handleViewModeChange = useCallback((mode: string) => {
    const newMode = mode as PostViewMode
    setViewMode(newMode)
    setOffset(0)
    setSearchQuery("")
    setSortBy("recent")
    fetchPosts(0, false, newMode)
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
  if (posts.length === 0 && !isLoading) {
    return (
      <PageContent>
        {/* View Mode Toggle (still shown in empty state) */}
        <Tabs value={viewMode} onValueChange={handleViewModeChange}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="my_posts" className="gap-1.5">
              <IconUser className="size-3.5" />
              My Posts
            </TabsTrigger>
            <TabsTrigger value="team_posts" className="gap-1.5">
              <IconUsers className="size-3.5" />
              Team Posts
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <EmptyState hasSearch={false} />
      </PageContent>
    )
  }

  return (
    <PageContent>
      {/* Page Header with View Toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {viewMode === "team_posts" ? "Team Posts" : "Your Posts"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {viewMode === "team_posts"
              ? "See LinkedIn posts from all your team members."
              : "Track engagement and performance across your LinkedIn content."}
          </p>
        </div>
        <Tabs value={viewMode} onValueChange={handleViewModeChange}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="my_posts" className="gap-1.5">
              <IconUser className="size-3.5" />
              My Posts
            </TabsTrigger>
            <TabsTrigger value="team_posts" className="gap-1.5">
              <IconUsers className="size-3.5" />
              Team Posts
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Stats */}
      <StatsSummary
        totalPosts={summaryStats.totalPosts}
        totalImpressions={summaryStats.totalImpressions}
        avgEngagement={summaryStats.avgEngagement}
        totalReactions={summaryStats.totalReactions}
      />

      {/* Search & Sort Controls */}
      <motion.div
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="relative flex-1 max-w-sm">
          <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={viewMode === "team_posts" ? "Search team posts..." : "Search posts..."}
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
          className="flex flex-col gap-3"
          variants={staggerContainerVariants}
          initial="initial"
          animate="animate"
        >
          {filteredAndSortedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              maxImpressions={maxImpressions}
              showAuthor={viewMode === "team_posts"}
            />
          ))}
        </motion.div>
      )}

      {/* Related Pages */}
      <CrossNav items={POSTS_CROSS_NAV} />

      {/* Load More */}
      {hasMore && !searchQuery.trim() && (
        <motion.div
          className="flex justify-center pb-4"
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
    </PageContent>
  )
}

// ============================================================================
// Page Component
// ============================================================================

/**
 * Posts page - Displays the user's own LinkedIn posts with engagement metrics
 * @returns Posts content with stats, search, and post list
 * @example
 * // Accessed via /dashboard/posts
 */
export default function PostsPage() {
  usePageMeta({
    title: "Posts",
    headerActions: (
      <Button asChild size="sm">
        <Link href="/dashboard/compose">
          <IconPencil className="size-4 mr-1" />
          New Post
        </Link>
      </Button>
    ),
  })

  return <PostsContent />
}
