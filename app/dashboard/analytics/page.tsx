"use client"

/**
 * Analytics & Goals Page
 * @description Redesigned analytics page with Performance Overview, Performance Trend chart,
 * Posting Goals, and My Recent Posts grid with LinkedIn-style popup
 * @module app/dashboard/analytics/page
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion } from 'framer-motion'
// Using native <img> for LinkedIn CDN images — next/image optimization
// causes broken images with media.licdn.com URLs
import { AnalyticsCards } from "@/components/features/analytics-cards"
import { AnalyticsChart } from "@/components/features/analytics-chart"
import { GoalsTracker } from "@/components/features/goals-tracker"
import { AnalyticsSkeleton } from "@/components/skeletons/page-skeletons"
import { PageContent } from "@/components/shared/page-content"
import { useAnalytics } from "@/hooks/use-analytics"
import { usePostingGoals } from "@/hooks/use-posting-goals"
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
  IconAlertCircle,
  IconRefresh,
  IconClock,
  IconDownload,
  IconEye,
  IconHeart,
  IconMessageCircle,
  IconRepeat,
  IconPhoto,
  IconArticle,
  IconMoodEmpty,
  IconThumbUp,
} from "@tabler/icons-react"
import { toast } from "sonner"
import {
  staggerContainerVariants,
  staggerItemVariants,
  staggerGridContainerVariants,
  staggerScaleItemVariants,
} from '@/lib/animations'

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
  created_at: string
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
        .from('my_posts')
        .select('id, content, media_type, media_urls, reactions, comments, reposts, impressions, posted_at, created_at')
        .eq('user_id', userId)
        .order('posted_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.warn('Recent posts fetch warning:', error.message)
        setPosts([])
      } else {
        setPosts(data || [])
      }
    } catch (err) {
      console.error('Recent posts fetch error:', err)
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
        {/* Image or text preview area */}
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
          {/* Media type badge */}
          {post.media_type && imageUrl && (
            <div className="absolute top-1.5 right-1.5 rounded bg-black/60 p-0.5">
              <IconPhoto className="size-3 text-white" />
            </div>
          )}
        </div>

        {/* Text preview */}
        {imageUrl && content && content !== "No content" && (
          <div className="px-2.5 pt-2">
            <p className="text-[11px] text-foreground/80 line-clamp-2 leading-relaxed">
              {content}
            </p>
          </div>
        )}

        {/* Bottom metrics bar */}
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
        {/* Visually hidden title for accessibility */}
        <DialogHeader className="sr-only">
          <DialogTitle>Post Detail</DialogTitle>
          <DialogDescription>Full view of your LinkedIn post</DialogDescription>
        </DialogHeader>

        {/* Scrollable content area */}
        <div className="overflow-y-auto overscroll-contain">
          {/* Author header */}
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

          {/* Post content */}
          <div className="px-4 pb-3">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {post.content || "No content available"}
            </p>
          </div>

          {/* Full-width image */}
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

          {/* Engagement stats */}
          <div className="px-4 py-3 space-y-2">
            {/* Reaction count row */}
            {reactions > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="flex items-center justify-center size-4 rounded-full bg-blue-500 text-white">
                  <IconThumbUp className="size-2.5" />
                </div>
                <span className="tabular-nums">{formatMetricNumber(reactions)}</span>
              </div>
            )}

            {/* Detailed stats row */}
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

      {/* LinkedIn post popup */}
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
 * Analytics page content component with real data and animations
 */
function AnalyticsContent() {
  const { user, profile } = useAuthContext()
  const { metrics, chartData, metadata, isLoading, error, refetch } = useAnalytics(user?.id)
  const {
    goals,
    currentStreak,
    bestStreak,
    isLoading: goalsLoading,
    updateGoalTarget,
    createGoal,
    removeGoal,
  } = usePostingGoals(user?.id)
  const { posts: recentPosts, isLoading: postsLoading } = useMyRecentPosts(user?.id, 9)

  /** Derive display name and avatar for the current user */
  const userInfo = useMemo(() => {
    const linkedinProfile = profile?.linkedin_profile
    const rawData = linkedinProfile?.raw_data as Record<string, unknown> | null
    const linkedInName = rawData?.name as string | undefined
    const linkedInProfileName = linkedinProfile?.first_name && linkedinProfile?.last_name
      ? `${linkedinProfile.first_name} ${linkedinProfile.last_name}`
      : linkedinProfile?.first_name || undefined
    const name = linkedInName || linkedInProfileName || profile?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'You'
    const linkedInAvatar = (rawData?.profilePhotoUrl as string | undefined) || linkedinProfile?.profile_picture_url || profile?.linkedin_avatar_url
    const avatarUrl = linkedInAvatar || profile?.avatar_url || user?.user_metadata?.avatar_url || undefined

    return { name: name as string, avatarUrl: avatarUrl as string | undefined }
  }, [user, profile])

  /**
   * Wrapper for creating a goal with toast feedback
   */
  const handleCreateGoal = async (period: "daily" | "weekly" | "monthly", target: number) => {
    try {
      await createGoal(period, target)
      toast.success(`${period.charAt(0).toUpperCase() + period.slice(1)} goal created`)
    } catch {
      toast.error("Failed to create goal")
    }
  }

  /**
   * Wrapper for removing a goal with toast feedback
   */
  const handleRemoveGoal = async (goalId: string) => {
    try {
      await removeGoal(goalId)
      toast.success("Goal removed")
    } catch {
      toast.error("Failed to remove goal")
    }
  }

  /**
   * Wrapper for updating a goal target with toast feedback
   */
  const handleUpdateGoal = async (goalId: string, target: number) => {
    try {
      await updateGoalTarget(goalId, target)
      toast.success("Goal updated")
    } catch {
      toast.error("Failed to update goal")
    }
  }

  /**
   * Exports analytics data to CSV format
   */
  const handleExportCSV = () => {
    try {
      const csvRows: string[] = []
      csvRows.push('Metric,Value')
      if (metrics) {
        csvRows.push(`Impressions,${metrics.impressions?.value || 0}`)
        csvRows.push(`Engagement Rate,${metrics.engagementRate?.value || 0}%`)
        csvRows.push(`Followers,${metrics.followers?.value || 0}`)
        csvRows.push(`Profile Views,${metrics.profileViews?.value || 0}`)
        csvRows.push(`Search Appearances,${metrics.searchAppearances?.value || 0}`)
        csvRows.push(`Connections,${metrics.connections?.value || 0}`)
        csvRows.push(`Members Reached,${metrics.membersReached?.value || 0}`)
      }
      csvRows.push('')
      if (chartData && chartData.length > 0) {
        csvRows.push('Date,Impressions,Engagement,Profile Views')
        chartData.forEach(data => {
          csvRows.push(`${data.date},${data.impressions || 0},${data.engagements || 0},${data.profileViews || 0}`)
        })
      }
      csvRows.push('')
      if (goals && goals.length > 0) {
        csvRows.push('Goal Type,Target,Current,Progress')
        goals.forEach(goal => {
          const progress = ((goal.current / goal.target) * 100).toFixed(1)
          csvRows.push(`${goal.period} Posts,${goal.target},${goal.current},${progress}%`)
        })
        csvRows.push(`Current Streak,${currentStreak} days`)
        csvRows.push(`Best Streak,${bestStreak} days`)
      }
      const csvContent = csvRows.join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `analytics_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('Analytics data exported successfully')
    } catch (err) {
      console.error('Export error:', err)
      toast.error('Failed to export analytics data')
    }
  }

  if (error) {
    return (
      <PageContent>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2 text-destructive">
              <IconAlertCircle className="h-5 w-5" />
              <span>Failed to load analytics: {error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              <IconRefresh className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </PageContent>
    )
  }

  if (isLoading) {
    return <AnalyticsSkeleton />
  }

  return (
    <PageContent>
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics & Goals</h2>
          <p className="text-sm text-muted-foreground">
            Track your LinkedIn growth and engagement metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {metadata?.lastUpdated && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <IconClock className="size-3.5" />
              <span>Updated {new Date(metadata.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              {metadata.captureMethod && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                  {metadata.captureMethod}
                </span>
              )}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={isLoading || !metrics}
            className="gap-1.5"
          >
            <IconDownload className="size-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Performance Overview - merged 4 metric cards into single section (ticket #27) */}
      <AnalyticsCards
        impressions={metrics?.impressions}
        engagementRate={metrics?.engagementRate}
        followers={metrics?.followers}
        profileViews={metrics?.profileViews}
        variant="primary"
      />

      {/* Performance Trend Chart - full width (ticket #28, #29, #32) */}
      <motion.div
        variants={staggerContainerVariants}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItemVariants}>
          <AnalyticsChart data={chartData} />
        </motion.div>
      </motion.div>

      {/* Posting Goals - below Performance Trend (ticket #32, #33, #34) */}
      <motion.div
        variants={staggerContainerVariants}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItemVariants}>
          <GoalsTracker
            goals={goals}
            currentStreak={currentStreak}
            bestStreak={bestStreak}
            onUpdateGoal={handleUpdateGoal}
            onRemoveGoal={handleRemoveGoal}
            onCreateGoal={handleCreateGoal}
            isLoading={goalsLoading}
          />
        </motion.div>
      </motion.div>

      {/* My Recent Posts (ticket #26) */}
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
 * Analytics & Goals page component
 * @returns Analytics page with performance overview, trend chart, goals tracker, and recent posts
 */
export default function AnalyticsPage() {
  usePageMeta({ title: "Analytics & Goals" })

  return <AnalyticsContent />
}
