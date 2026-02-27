"use client"

/**
 * Analytics Page
 * @description Redesigned analytics page with filter bar, summary metrics,
 * trend chart with comparison overlay, data table, and recent posts grid.
 * @module app/dashboard/analytics/page
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { AnalyticsSkeleton } from "@/components/skeletons/page-skeletons"
import { PageContent } from "@/components/shared/page-content"
import { AnalyticsFilterBar } from "@/components/features/analytics-filter-bar"
import { AnalyticsSummaryBar } from "@/components/features/analytics-summary-bar"
import { AnalyticsTrendChart } from "@/components/features/analytics-trend-chart"
import { AnalyticsDataTable } from "@/components/features/analytics-data-table"
import { useAnalyticsV2, type AnalyticsV2Filters } from "@/hooks/use-analytics-v2"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { usePageMeta } from "@/lib/dashboard-context"
import { formatMetricNumber, getInitials } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import {
  IconEye,
  IconHeart,
  IconMessageCircle,
  IconRepeat,
  IconPhoto,
  IconArticle,
  IconMoodEmpty,
  IconThumbUp,
} from "@tabler/icons-react"
import {
  staggerContainerVariants,
  staggerItemVariants,
  staggerGridContainerVariants,
  staggerScaleItemVariants,
} from "@/lib/animations"

/**
 * Shape of a user's post from my_posts table
 */
interface MyRecentPost {
  id: string
  content: string | null
  media_type: string | null
  media_urls: string[] | null
  reactions: number | null
  comments: number | null
  reposts: number | null
  impressions: number | null
  posted_at: string | null
  created_at: string | null
}

/**
 * Converts a date string to a relative time description
 * @param dateStr - ISO date string
 * @returns Human-readable relative time
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

/**
 * Hook to fetch the user's recent posts from my_posts
 * @param userId - The authenticated user's ID
 * @param limit - Maximum number of posts to fetch
 * @returns Recent posts array and loading state
 */
function useMyRecentPosts(userId: string | undefined, limit = 9) {
  const [posts, setPosts] = useState<MyRecentPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchPosts = useCallback(async () => {
    if (!userId) {
      setPosts([])
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from("my_posts")
        .select("id, content, media_type, media_urls, reactions, comments, reposts, impressions, posted_at, created_at")
        .eq("user_id", userId)
        .order("posted_at", { ascending: false })
        .limit(limit)

      if (error) {
        console.warn("Recent posts fetch warning:", error.message)
        setPosts([])
      } else {
        setPosts(data || [])
      }
    } catch (err) {
      console.error("Recent posts fetch error:", err)
      setPosts([])
    } finally {
      setIsLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- supabase client is effectively a singleton
  }, [userId, limit])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  return { posts, isLoading }
}

/**
 * Grid card for a recent post with image/text preview
 * @param props.post - The post data
 * @param props.onClick - Callback when the card is clicked
 */
function PostGridCard({
  post,
  onClick,
}: {
  post: MyRecentPost
  onClick: () => void
}) {
  const imageUrl = post.media_urls?.[0] ?? null
  const content = post.content || "No content"
  const totalEngagement = (post.reactions ?? 0) + (post.comments ?? 0) + (post.reposts ?? 0)

  return (
    <motion.div variants={staggerScaleItemVariants}>
      <button
        type="button"
        onClick={onClick}
        className="group relative flex w-full flex-col overflow-hidden rounded-lg border border-border/50 bg-card text-left transition-colors hover:border-border hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/50">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Post media"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center p-3">
              <p className="text-xs text-muted-foreground line-clamp-5 leading-relaxed">
                {content}
              </p>
            </div>
          )}
          {post.media_type && imageUrl && (
            <div className="absolute top-1.5 right-1.5 rounded bg-black/60 p-0.5">
              <IconPhoto className="size-3 text-white" />
            </div>
          )}
        </div>

        {imageUrl && content && content !== "No content" && (
          <div className="px-2.5 pt-2">
            <p className="text-[11px] text-foreground/80 line-clamp-2 leading-relaxed">
              {content}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 px-2.5 py-2">
          <span className="text-[11px] text-muted-foreground truncate">
            {relativeTime(post.posted_at)}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {totalEngagement > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground tabular-nums">
                <IconHeart className="size-3" />
                {formatMetricNumber(totalEngagement)}
              </span>
            )}
            {(post.impressions ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground tabular-nums">
                <IconEye className="size-3" />
                {formatMetricNumber(post.impressions)}
              </span>
            )}
          </div>
        </div>
      </button>
    </motion.div>
  )
}

/**
 * LinkedIn-style post popup dialog showing full post content and metrics
 * @param props.post - The post to display (null when closed)
 * @param props.open - Whether the dialog is open
 * @param props.onOpenChange - Callback when dialog state changes
 * @param props.authorName - Display name of the author
 * @param props.authorAvatar - Avatar URL of the author
 */
function LinkedInPostDialog({
  post,
  open,
  onOpenChange,
  authorName,
  authorAvatar,
}: {
  post: MyRecentPost | null
  open: boolean
  onOpenChange: (open: boolean) => void
  authorName: string
  authorAvatar?: string
}) {
  if (!post) return null

  const imageUrl = post.media_urls?.[0] ?? null
  const reactions = post.reactions ?? 0
  const comments = post.comments ?? 0
  const reposts = post.reposts ?? 0
  const impressions = post.impressions ?? 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Post Detail</DialogTitle>
          <DialogDescription>Full view of your LinkedIn post</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto overscroll-contain">
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <Avatar className="size-10 shrink-0">
              {authorAvatar && <AvatarImage src={authorAvatar} alt={authorName} />}
              <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                {getInitials(authorName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{authorName}</p>
              <p className="text-xs text-muted-foreground">
                {relativeTime(post.posted_at)}
              </p>
            </div>
          </div>

          <div className="px-4 pb-3">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {post.content || "No content available"}
            </p>
          </div>

          {imageUrl && (
            <div className="relative w-full bg-muted">
              <img
                src={imageUrl}
                alt="Post media"
                loading="lazy"
                className="w-full object-contain"
              />
            </div>
          )}

          <div className="px-4 py-3 space-y-2">
            {reactions > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="flex items-center justify-center size-4 rounded-full bg-blue-500 text-white">
                  <IconThumbUp className="size-2.5" />
                </div>
                <span className="tabular-nums">{formatMetricNumber(reactions)}</span>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border/50 pt-2">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                  <IconHeart className="size-3.5" />
                  {formatMetricNumber(reactions)}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                  <IconMessageCircle className="size-3.5" />
                  {formatMetricNumber(comments)}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                  <IconRepeat className="size-3.5" />
                  {formatMetricNumber(reposts)}
                </span>
              </div>
              {impressions > 0 && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                  <IconEye className="size-3.5" />
                  {formatMetricNumber(impressions)} impressions
                </span>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * My Recent Posts section with grid layout and LinkedIn-style popup
 * @param props.posts - Array of recent posts
 * @param props.isLoading - Loading state
 * @param props.authorName - Display name for the current user
 * @param props.authorAvatar - Avatar URL for the current user
 */
function MyRecentPostsSection({
  posts,
  isLoading,
  authorName,
  authorAvatar,
}: {
  posts: MyRecentPost[]
  isLoading: boolean
  authorName: string
  authorAvatar?: string
}) {
  const [selectedPost, setSelectedPost] = useState<MyRecentPost | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleCardClick = (post: MyRecentPost) => {
    setSelectedPost(post)
    setDialogOpen(true)
  }

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-lg border border-border/50">
                <Skeleton className="aspect-square w-full" />
                <div className="flex items-center justify-between px-2.5 py-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card hover>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconArticle className="size-5" />
            My Recent Posts
          </CardTitle>
          <CardDescription>
            Your latest LinkedIn posts and their performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="rounded-full bg-muted p-4">
                <IconMoodEmpty className="size-7 text-muted-foreground" />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">No posts yet</h4>
                <p className="text-muted-foreground text-xs max-w-[260px]">
                  Your LinkedIn posts will appear here once the ChainLinked extension captures them.
                </p>
              </div>
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-2 sm:grid-cols-3 gap-3"
              variants={staggerGridContainerVariants}
              initial="initial"
              animate="animate"
            >
              {posts.map((post) => (
                <PostGridCard
                  key={post.id}
                  post={post}
                  onClick={() => handleCardClick(post)}
                />
              ))}
            </motion.div>
          )}
        </CardContent>
      </Card>

      <LinkedInPostDialog
        post={selectedPost}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        authorName={authorName}
        authorAvatar={authorAvatar}
      />
    </>
  )
}

/**
 * Default filter values, optionally hydrated from URL search params
 * @param searchParams - URL search params
 * @returns Default filter configuration
 */
function getDefaultFilters(searchParams: URLSearchParams): AnalyticsV2Filters {
  return {
    metric: searchParams.get("metric") || "impressions",
    period: searchParams.get("period") || "30d",
    startDate: searchParams.get("startDate") || undefined,
    endDate: searchParams.get("endDate") || undefined,
    contentType: searchParams.get("contentType") || "all",
    compare: searchParams.get("compare") === "true",
    granularity: searchParams.get("granularity") || "daily",
  }
}

/**
 * Analytics page content component with new V2 dashboard
 */
function AnalyticsContent() {
  const { user, profile, isLoading: authLoading } = useAuthContext()
  const searchParams = useSearchParams()
  const [filters, setFilters] = useState<AnalyticsV2Filters>(() => getDefaultFilters(searchParams))
  const { data, summary, comparisonData, multiData, isLoading, error } = useAnalyticsV2(filters)
  const { posts: recentPosts, isLoading: postsLoading } = useMyRecentPosts(user?.id, 9)

  /** Derive display name and avatar for the current user */
  const userInfo = useMemo(() => {
    const linkedinProfile = profile?.linkedin_profile
    const rawData = linkedinProfile?.raw_data as Record<string, unknown> | null
    const linkedInName = rawData?.name as string | undefined
    const linkedInProfileName = linkedinProfile?.first_name && linkedinProfile?.last_name
      ? `${linkedinProfile.first_name} ${linkedinProfile.last_name}`
      : linkedinProfile?.first_name || undefined
    const name = linkedInName || linkedInProfileName || profile?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "You"
    const linkedInAvatar = (rawData?.profilePhotoUrl as string | undefined) || linkedinProfile?.profile_picture_url || profile?.linkedin_avatar_url
    const avatarUrl = linkedInAvatar || profile?.avatar_url || user?.user_metadata?.avatar_url || undefined

    return { name: name as string, avatarUrl: avatarUrl as string | undefined }
  }, [user, profile])

  /**
   * Handle granularity changes from the data table
   */
  const handleGranularityChange = useCallback((granularity: string) => {
    setFilters((prev) => ({ ...prev, granularity }))
  }, [])

  if (authLoading) {
    return <AnalyticsSkeleton />
  }

  return (
    <PageContent>
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
        <p className="text-sm text-muted-foreground">
          Track your LinkedIn post performance and engagement metrics.
        </p>
      </div>

      {/* FE-001: Filter Bar */}
      <AnalyticsFilterBar filters={filters} onFiltersChange={setFilters} />

      {/* FE-002: Summary Bar */}
      <AnalyticsSummaryBar
        summary={summary}
        metric={filters.metric}
        isLoading={isLoading}
      />

      {/* FE-003/004/005: Trend Chart with comparison overlay */}
      <motion.div
        variants={staggerContainerVariants}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItemVariants}>
          <AnalyticsTrendChart
            data={data}
            comparisonData={comparisonData}
            metric={filters.metric}
            compareActive={filters.compare}
            isLoading={isLoading}
            multiData={multiData}
          />
        </motion.div>
      </motion.div>

      {/* FE-006: Data Table */}
      <motion.div
        variants={staggerContainerVariants}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItemVariants}>
          <AnalyticsDataTable
            data={data}
            metric={filters.metric}
            granularity={filters.granularity}
            onGranularityChange={handleGranularityChange}
            isLoading={isLoading}
            multiData={multiData}
          />
        </motion.div>
      </motion.div>

      {/* My Recent Posts (preserved from original) */}
      <motion.div
        variants={staggerContainerVariants}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItemVariants}>
          <MyRecentPostsSection
            posts={recentPosts}
            isLoading={postsLoading}
            authorName={userInfo.name}
            authorAvatar={userInfo.avatarUrl}
          />
        </motion.div>
      </motion.div>
    </PageContent>
  )
}

/**
 * Analytics page component
 * @returns Analytics page with filter bar, summary, trend chart, data table, and recent posts
 */
export default function AnalyticsPage() {
  usePageMeta({ title: "Analytics" })

  return <AnalyticsContent />
}
