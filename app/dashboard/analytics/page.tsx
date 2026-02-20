"use client"

/**
 * Analytics & Goals Page
 * @description Redesigned analytics page with Performance Overview, Performance Trend chart,
 * Posting Goals, and My Recent Posts section
 * @module app/dashboard/analytics/page
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion } from 'framer-motion'
import { AnalyticsCards } from "@/components/features/analytics-cards"
import { AnalyticsChart } from "@/components/features/analytics-chart"
import { GoalsTracker } from "@/components/features/goals-tracker"
// Post Performance is hidden per ticket #36 - keeping import for future use
// import { PostPerformance } from "@/components/features/post-performance"
// Team Leaderboard moved to Team Activity page per ticket #35
// import { TeamLeaderboard } from "@/components/features/team-leaderboard"
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
} from "@tabler/icons-react"
import { toast } from "sonner"
import {
  staggerContainerVariants,
  staggerItemVariants,
} from '@/lib/animations'

/**
 * Shape of a user's post from my_posts table
 */
interface MyRecentPost {
  id: string
  content: string | null
  media_type: string | null
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
function useMyRecentPosts(userId: string | undefined, limit = 5) {
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
        .select('id, content, media_type, reactions, comments, reposts, impressions, posted_at, created_at')
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
  }, [supabase, userId, limit])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  return { posts, isLoading }
}

/**
 * Compact recent post row component
 * @param props.post - The post data
 * @param props.authorName - Display name for the post author
 * @param props.authorAvatar - Avatar URL for the author
 */
function RecentPostRow({
  post,
  authorName,
  authorAvatar,
}: {
  post: MyRecentPost
  authorName: string
  authorAvatar?: string
}) {
  const content = post.content || "No content available"
  const totalEngagement = (post.reactions ?? 0) + (post.comments ?? 0) + (post.reposts ?? 0)

  return (
    <motion.div variants={staggerItemVariants}>
      <div className="flex items-start gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:border-border hover:bg-muted/30">
        <Avatar className="size-9 shrink-0">
          {authorAvatar && <AvatarImage src={authorAvatar} alt={authorName} />}
          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
            {getInitials(authorName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium truncate">{authorName}</span>
            <span className="text-xs text-muted-foreground shrink-0">
              {relativeTime(post.posted_at)}
            </span>
            {post.media_type && (
              <IconPhoto className="size-3 text-muted-foreground shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {content}
          </p>
          {/* Metrics row */}
          <div className="flex items-center gap-3 mt-2">
            {(post.impressions ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
                <IconEye className="size-3" />
                {formatMetricNumber(post.impressions)}
              </span>
            )}
            {(post.reactions ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
                <IconHeart className="size-3" />
                {formatMetricNumber(post.reactions)}
              </span>
            )}
            {(post.comments ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
                <IconMessageCircle className="size-3" />
                {formatMetricNumber(post.comments)}
              </span>
            )}
            {(post.reposts ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground tabular-nums">
                <IconRepeat className="size-3" />
                {formatMetricNumber(post.reposts)}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * My Recent Posts section component
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
  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-border/50 p-3">
              <Skeleton className="size-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
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
            className="space-y-2"
            variants={staggerContainerVariants}
            initial="initial"
            animate="animate"
          >
            {posts.map((post) => (
              <RecentPostRow
                key={post.id}
                post={post}
                authorName={authorName}
                authorAvatar={authorAvatar}
              />
            ))}
          </motion.div>
        )}
      </CardContent>
    </Card>
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
    updateGoalTarget
  } = usePostingGoals(user?.id)
  const { posts: recentPosts, isLoading: postsLoading } = useMyRecentPosts(user?.id, 5)

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
            onUpdateGoal={updateGoalTarget}
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

      {/* Team Leaderboard - MOVED to Team Activity page (ticket #35) */}

      {/* Post Performance - HIDDEN per ticket #36; to be re-enabled later */}
      {/*
      <motion.div
        variants={staggerContainerVariants}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItemVariants}>
          <PostPerformance
            post={selectedPost ?? undefined}
            isLoading={postAnalyticsLoading}
            onClose={() => selectPost(null)}
          />
        </motion.div>
      </motion.div>
      */}

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
