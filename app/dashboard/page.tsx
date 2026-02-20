"use client"

/**
 * Dashboard Page
 * @description LinkedIn-style dashboard with 3-column layout:
 * Left: Profile card with metrics | Center: Create post + analytics + recent posts feed | Right: Tips, streak, schedule
 * @module app/dashboard/page
 */

import * as React from "react"
import { useState, useMemo, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import dynamic from "next/dynamic"
import Link from "next/link"
import {
  IconPencil,
  IconPhoto,
  IconSparkles,
  IconEye,
  IconUserPlus,
  IconUsers,
  IconTrendingUp,
  IconBulb,
  IconFlame,
  IconChevronRight,
  IconRocket,
  IconCheck,
  IconArticle,
  IconPresentation,
  IconTemplate,
  IconThumbUp,
  IconMessage,
  IconRepeat,
  IconCalendarEvent,
  IconClock,
  IconChartLine,
  IconArrowRight,
  IconPointFilled,
  IconTarget,
} from "@tabler/icons-react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { formatDistanceToNow } from "date-fns"

import {
  ExtensionInstallBanner,
  ExtensionInstallPrompt,
  useExtensionPrompt,
} from "@/components/features/extension-install-prompt"
import { isPromptDismissed } from "@/lib/extension/detect"
import { DashboardSkeleton } from "@/components/skeletons/page-skeletons"
import { useAnalytics } from "@/hooks/use-analytics"
import { usePostAnalytics } from "@/hooks/use-post-analytics"
import { useScheduledPosts } from "@/hooks/use-scheduled-posts"
import { usePostingGoals } from "@/hooks/use-posting-goals"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { usePageMeta } from "@/lib/dashboard-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"
import { pageVariants, staggerContainerVariants, staggerItemVariants } from "@/lib/animations"

/** Dynamically import Lottie so it doesn't block SSR */
const Lottie = dynamic(() => import("lottie-react"), { ssr: false })

/** Lottie reaction animation URL */
const LOTTIE_REACTION_URL =
  "https://lottie.host/4f86270c-2dad-4dc0-afd9-2f93058330fa/d2KU6m2R6p.json"

/** Daily tips for the right sidebar */
const DAILY_TIPS = [
  "Posts with a question at the end get 2x more comments.",
  "Posting between 8-10am gets the most visibility on LinkedIn.",
  "Carousel posts get 3x more reach than text-only posts.",
  "Engage with 5 posts before publishing yours for better reach.",
  "Use line breaks generously — walls of text get scrolled past.",
  "Your first line is your headline. Make it count.",
  "Tag people who'd genuinely find your post useful.",
  "Repurpose your best content every 3-4 months.",
  "Reply to every comment within the first hour of posting.",
  "Share a personal story — vulnerability drives engagement.",
]

/** Getting started checklist items */
const GETTING_STARTED_ITEMS = [
  { key: "extension", label: "Install browser extension", href: "#" },
  { key: "profile", label: "Complete your profile", href: "/dashboard/settings" },
  { key: "post", label: "Create your first post", href: "/dashboard/compose" },
  { key: "template", label: "Browse templates", href: "/dashboard/templates" },
]

/** Chart config for the mini analytics chart */
const miniChartConfig = {
  impressions: {
    label: "Impressions",
    color: "oklch(0.55 0.15 230)",
  },
} satisfies ChartConfig

/**
 * Format large numbers to compact form
 * @param num - Number to format
 * @returns Formatted string like "1.2K" or "345"
 */
function formatCompact(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

/**
 * Get today's tip based on day of year (deterministic per day)
 * @returns A tip string
 */
function getTodaysTip(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length]
}

/**
 * Truncate text to a maximum length, adding ellipsis if needed
 * @param text - Text to truncate
 * @param maxLength - Maximum character count
 * @returns Truncated string
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + "..."
}

// ============================================================================
// Left Column: Profile Card
// ============================================================================

/**
 * LinkedIn-style profile card with avatar, name, tagline and key metrics
 * @param props.className - Additional CSS classes
 */
function ProfileCard({ className }: { className?: string }) {
  const { user, profile } = useAuthContext()
  const { metrics } = useAnalytics(user?.id)

  const displayName = profile?.full_name
    || (profile?.linkedin_profile?.first_name && profile?.linkedin_profile?.last_name
      ? `${profile.linkedin_profile.first_name} ${profile.linkedin_profile.last_name}`
      : null)
    || profile?.name
    || user?.user_metadata?.full_name
    || user?.email?.split("@")[0]
    || "User"

  const headline = profile?.linkedin_profile?.headline
    || profile?.linkedin_profile?.raw_data?.headline
    || profile?.linkedin_headline
    || profile?.company_name
    || ""

  const avatarUrl = profile?.linkedin_profile?.profile_picture_url
    || profile?.linkedin_profile?.raw_data?.profilePhotoUrl
    || profile?.linkedin_avatar_url
    || profile?.avatar_url
    || user?.user_metadata?.avatar_url
    || ""

  const followers = metrics?.followers.value ?? 0
  const connections = metrics?.connections?.value ?? 0
  const profileViews = metrics?.profileViews.value ?? 0

  return (
    <Card className={cn("border-border/50 overflow-hidden", className)}>
      {/* Banner gradient */}
      <div className="h-16 bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/20" />

      <CardContent className="pt-0 px-4 pb-4 -mt-8">
        {/* Avatar */}
        <Avatar className="size-16 border-4 border-background shadow-md">
          {avatarUrl && <AvatarImage src={avatarUrl as string} alt={displayName as string} />}
          <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
            {(displayName as string).charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Name & headline */}
        <div className="mt-2">
          <h3 className="font-semibold text-sm leading-tight">{displayName}</h3>
          {headline && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {headline as string}
            </p>
          )}
        </div>

        <Separator className="my-3" />

        {/* Metrics */}
        <div className="space-y-2">
          <Link
            href="/dashboard/analytics"
            className="flex items-center justify-between text-xs hover:bg-muted/50 -mx-2 px-2 py-1 rounded-md transition-colors group"
          >
            <span className="text-muted-foreground flex items-center gap-1.5">
              <IconEye className="size-3.5" />
              Profile viewers
            </span>
            <span className="font-semibold text-primary tabular-nums">
              {formatCompact(profileViews)}
            </span>
          </Link>
          <Link
            href="/dashboard/analytics"
            className="flex items-center justify-between text-xs hover:bg-muted/50 -mx-2 px-2 py-1 rounded-md transition-colors group"
          >
            <span className="text-muted-foreground flex items-center gap-1.5">
              <IconUserPlus className="size-3.5" />
              Followers
            </span>
            <span className="font-semibold text-primary tabular-nums">
              {formatCompact(followers)}
            </span>
          </Link>
          <Link
            href="/dashboard/analytics"
            className="flex items-center justify-between text-xs hover:bg-muted/50 -mx-2 px-2 py-1 rounded-md transition-colors group"
          >
            <span className="text-muted-foreground flex items-center gap-1.5">
              <IconUsers className="size-3.5" />
              Connections
            </span>
            <span className="font-semibold text-primary tabular-nums">
              {formatCompact(connections)}
            </span>
          </Link>
        </div>

        <Separator className="my-3" />

        {/* Quick links */}
        <div className="space-y-1">
          <Link
            href="/dashboard/drafts"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground -mx-2 px-2 py-1 rounded-md transition-colors"
          >
            <IconArticle className="size-3.5" />
            Saved Drafts
          </Link>
          <Link
            href="/dashboard/analytics"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground -mx-2 px-2 py-1 rounded-md transition-colors"
          >
            <IconTrendingUp className="size-3.5" />
            Analytics & Goals
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Center Column: Greeting + Create Post + Widgets
// ============================================================================

/**
 * Inline greeting displayed above the create post card.
 * Shows time-based greeting with user's first name — no wrapping card.
 */
function InlineGreeting() {
  const { profile, user } = useAuthContext()
  const now = new Date()
  const greeting = now.getHours() < 12
    ? "Good morning"
    : now.getHours() < 18
      ? "Good afternoon"
      : "Good evening"

  const firstName = profile?.full_name?.split(" ")[0]
    || profile?.linkedin_profile?.first_name
    || profile?.name?.split(" ")[0]
    || user?.user_metadata?.full_name?.split(" ")[0]
    || user?.email?.split("@")[0]
    || ""

  return (
    <h2 className="text-lg font-semibold tracking-tight">
      {greeting}{firstName ? `, ${firstName}` : ""}
    </h2>
  )
}

/**
 * LinkedIn-style "Start a post" prompt card
 */
function CreatePostCard({ className }: { className?: string }) {
  const { profile, user } = useAuthContext()

  const avatarUrl = profile?.linkedin_profile?.profile_picture_url
    || profile?.linkedin_avatar_url
    || profile?.avatar_url
    || user?.user_metadata?.avatar_url
    || ""

  const displayName = profile?.full_name
    || profile?.name
    || user?.user_metadata?.full_name
    || "User"

  return (
    <Card className={cn("border-border/50", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-10 shrink-0">
            {avatarUrl && <AvatarImage src={avatarUrl as string} alt={displayName as string} />}
            <AvatarFallback className="text-sm font-medium bg-primary/10 text-primary">
              {(displayName as string).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <Link
            href="/dashboard/compose"
            className="flex-1 rounded-full border border-border/60 hover:bg-muted/50 transition-colors px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground"
          >
            Start a post...
          </Link>
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-1 mt-3 -mx-1">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/dashboard/compose">
              <IconPhoto className="size-4 text-primary" />
              Media
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/dashboard/compose">
              <IconSparkles className="size-4 text-secondary" />
              AI Generate
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/dashboard/carousels">
              <IconPresentation className="size-4 text-primary" />
              Carousel
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link href="/dashboard/templates">
              <IconTemplate className="size-4 text-muted-foreground" />
              Template
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Compact analytics overview with mini chart
 * Shows key metrics inline with a small area chart
 */
function AnalyticsOverviewCard({ className }: { className?: string }) {
  const { user } = useAuthContext()
  const { metrics, chartData, isLoading } = useAnalytics(user?.id)
  const [lottieData, setLottieData] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    fetch(LOTTIE_REACTION_URL)
      .then(res => res.json())
      .then(data => setLottieData(data))
      .catch(() => {})
  }, [])

  if (isLoading) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-32" />
            <div className="grid grid-cols-3 gap-4">
              <div className="h-14 bg-muted rounded" />
              <div className="h-14 bg-muted rounded" />
              <div className="h-14 bg-muted rounded" />
            </div>
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const impressions = metrics?.impressions.value ?? 0
  const impressionsChange = metrics?.impressions.change ?? 0
  const engagement = metrics?.engagementRate.value ?? 0
  const engagementChange = metrics?.engagementRate.change ?? 0
  const followers = metrics?.followers.value ?? 0
  const followersChange = metrics?.followers.change ?? 0

  // Use last 14 days of chart data for the mini chart
  const miniChartData = chartData.slice(-14)

  return (
    <Card className={cn("border-border/50 overflow-hidden", className)}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            <IconChartLine className="size-4 text-primary" />
            Analytics
          </h4>
          <Link
            href="/dashboard/analytics"
            className="text-xs text-primary hover:underline flex items-center gap-0.5"
          >
            View all
            <IconChevronRight className="size-3" />
          </Link>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-3 mx-4 divide-x divide-border/40">
          {/* Impressions */}
          <div className="text-center py-2.5 px-2">
            <p className="text-lg font-bold tabular-nums leading-tight">{formatCompact(impressions)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Impressions</p>
            <div className={cn(
              "text-[10px] font-medium",
              impressionsChange >= 0 ? "text-success" : "text-destructive"
            )}>
              {impressionsChange >= 0 ? "+" : ""}{impressionsChange.toFixed(1)}%
            </div>
          </div>

          {/* Engagement */}
          <div className="text-center py-2.5 px-2 relative">
            {lottieData && (
              <div className="absolute -top-1 -right-0.5 size-5">
                <Lottie animationData={lottieData} loop autoplay className="size-5" />
              </div>
            )}
            <p className="text-lg font-bold tabular-nums leading-tight">{engagement.toFixed(1)}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Engagement</p>
            <div className={cn(
              "text-[10px] font-medium",
              engagementChange >= 0 ? "text-success" : "text-destructive"
            )}>
              {engagementChange >= 0 ? "+" : ""}{engagementChange.toFixed(1)}%
            </div>
          </div>

          {/* Followers */}
          <div className="text-center py-2.5 px-2">
            <p className="text-lg font-bold tabular-nums leading-tight">{formatCompact(followers)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Followers</p>
            <div className={cn(
              "text-[10px] font-medium",
              followersChange >= 0 ? "text-success" : "text-destructive"
            )}>
              {followersChange >= 0 ? "+" : ""}{followersChange.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Mini area chart */}
        {miniChartData.length > 1 ? (
          <div className="px-2 pt-2 pb-1">
            <ChartContainer config={miniChartConfig} className="h-[72px] w-full">
              <AreaChart data={miniChartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashboardFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.55 0.15 230)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="oklch(0.55 0.15 230)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.3} />
                <XAxis dataKey="date" hide />
                <ChartTooltip
                  cursor={{ stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '3 3' }}
                  content={<ChartTooltipContent labelFormatter={(v) => {
                    const d = new Date(v as string)
                    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  }} indicator="dot" />}
                />
                <Area
                  dataKey="impressions"
                  type="monotone"
                  fill="url(#dashboardFill)"
                  stroke="oklch(0.55 0.15 230)"
                  strokeWidth={1.5}
                  animationDuration={800}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        ) : (
          <div className="px-4 py-4 text-center">
            <p className="text-[11px] text-muted-foreground">
              Chart data will appear once your LinkedIn activity is synced.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Single post item in the recent posts feed
 * Shows post content preview with engagement metrics
 */
function RecentPostItem({
  content,
  publishedAt,
  impressions,
  engagements,
  engagementRate,
  reactions,
  comments,
  reposts,
}: {
  content: string
  publishedAt: string
  impressions: number
  engagements: number
  engagementRate: number
  reactions: number
  comments: number
  reposts: number
}) {
  const timeAgo = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(publishedAt), { addSuffix: true })
    } catch {
      return ""
    }
  }, [publishedAt])

  return (
    <div className="px-4 py-3 hover:bg-muted/30 transition-colors border-b border-border/30 last:border-b-0">
      {/* Post content preview */}
      <p className="text-sm leading-relaxed text-foreground/90 line-clamp-3">
        {truncateText(content, 200)}
      </p>

      {/* Meta row */}
      <div className="flex items-center justify-between mt-2.5">
        <span className="text-[11px] text-muted-foreground">{timeAgo}</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <IconEye className="size-3" />
            {formatCompact(impressions)}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <IconThumbUp className="size-3" />
            {formatCompact(reactions)}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <IconMessage className="size-3" />
            {comments}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <IconRepeat className="size-3" />
            {reposts}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * Recent posts feed card showing the user's latest LinkedIn posts
 * with engagement metrics inline
 */
function RecentPostsFeed({ className }: { className?: string }) {
  const { user } = useAuthContext()
  const { posts, isLoading } = usePostAnalytics(user?.id, 5)

  if (isLoading) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardContent className="p-0">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <div className="h-4 bg-muted rounded w-28 animate-pulse" />
            <div className="h-3 bg-muted rounded w-16 animate-pulse" />
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-4 py-3 border-b border-border/30 animate-pulse">
              <div className="h-4 bg-muted rounded w-full mb-1.5" />
              <div className="h-4 bg-muted rounded w-3/4 mb-2.5" />
              <div className="flex justify-between">
                <div className="h-3 bg-muted rounded w-16" />
                <div className="h-3 bg-muted rounded w-32" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!posts || posts.length === 0) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardContent className="p-0">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-1.5">
              <IconArticle className="size-4 text-primary" />
              Recent Posts
            </h4>
          </div>
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <div className="rounded-full bg-muted/50 p-3 mb-3">
              <IconPencil className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">No posts yet</p>
            <p className="text-xs text-muted-foreground max-w-[240px] mb-3">
              Your recent LinkedIn posts and their performance will show up here.
            </p>
            <Button variant="default" size="sm" asChild>
              <Link href="/dashboard/compose" className="gap-1.5">
                <IconPencil className="size-3.5" />
                Write your first post
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-border/50", className)}>
      <CardContent className="p-0">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            <IconArticle className="size-4 text-primary" />
            Recent Posts
          </h4>
          <Link
            href="/dashboard/analytics"
            className="text-xs text-primary hover:underline flex items-center gap-0.5"
          >
            See all
            <IconChevronRight className="size-3" />
          </Link>
        </div>

        {posts.slice(0, 5).map((post) => {
          // Calculate reactions/comments/reposts from metrics
          const totalReactions = post.metrics.reduce((sum, m) => sum + m.likes, 0)
          const totalComments = post.metrics.reduce((sum, m) => sum + m.comments, 0)
          const totalReposts = post.metrics.reduce((sum, m) => sum + m.shares, 0)

          return (
            <RecentPostItem
              key={post.id}
              content={post.content}
              publishedAt={post.publishedAt}
              impressions={post.totalImpressions}
              engagements={post.totalEngagements}
              engagementRate={post.engagementRate}
              reactions={totalReactions}
              comments={totalComments}
              reposts={totalReposts}
            />
          )
        })}
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Right Column: Greeting, Streak, Schedule, Tips, Getting Started
// ============================================================================

/**
 * Greeting card with time-based greeting and date
 */
function GreetingCard({ className }: { className?: string }) {
  const now = new Date()
  const greeting = now.getHours() < 12
    ? "Good morning"
    : now.getHours() < 18
      ? "Good afternoon"
      : "Good evening"

  const { profile, user } = useAuthContext()
  const firstName = profile?.full_name?.split(" ")[0]
    || profile?.linkedin_profile?.first_name
    || profile?.name?.split(" ")[0]
    || user?.user_metadata?.full_name?.split(" ")[0]
    || user?.email?.split("@")[0]
    || ""

  return (
    <Card className={cn("border-border/50", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <IconCalendarEvent className="size-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </span>
        </div>
        <p className="text-sm font-medium">
          {greeting}{firstName ? `, ${firstName}` : ""}!
        </p>
      </CardContent>
    </Card>
  )
}

/**
 * Posting streak tracker card
 * Tracks consecutive days of posting with weekly visualization
 */
function StreakCard({ className }: { className?: string }) {
  const { currentStreak, bestStreak, isLoading } = usePostingGoals()
  const weekDays = ["M", "T", "W", "T", "F", "S", "S"]
  const today = new Date().getDay()
  const adjustedToday = today === 0 ? 6 : today - 1

  if (isLoading) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
            <div className="flex gap-1.5">
              {weekDays.map((_, i) => (
                <div key={i} className="flex-1 h-7 bg-muted rounded-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-border/50", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="rounded-lg bg-secondary/10 p-1.5">
            <IconFlame className="size-4 text-secondary" />
          </div>
          <h4 className="text-sm font-medium">Posting Streak</h4>
          {currentStreak > 0 && (
            <span className="ml-auto text-xs font-bold text-secondary tabular-nums">
              {currentStreak} day{currentStreak !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Week visualization */}
        <div className="flex items-center gap-1.5">
          {weekDays.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={cn(
                  "size-7 rounded-full flex items-center justify-center text-[10px] font-medium border transition-colors",
                  i === adjustedToday
                    ? "border-primary bg-primary/10 text-primary"
                    : i < adjustedToday
                      ? "border-muted bg-muted/50 text-muted-foreground"
                      : "border-border/40 text-muted-foreground/50"
                )}
              >
                {day}
              </div>
            </div>
          ))}
        </div>

        {currentStreak === 0 ? (
          <p className="text-[11px] text-muted-foreground mt-2.5 text-center">
            Post today to start your streak!
          </p>
        ) : bestStreak > 0 && (
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Best: <span className="font-medium">{bestStreak}</span> days
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Mini calendar widget showing the current month with dots on days that have scheduled posts
 * @param props.className - Additional CSS classes
 */
function ScheduleCalendarCard({ className }: { className?: string }) {
  const { posts, isLoading } = useScheduledPosts(30)

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const today = now.getDate()

  /** Days in the current month */
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  /** Day of week the month starts on (0=Sun) */
  const startDay = new Date(year, month, 1).getDay()

  /** Set of dates (1-31) that have scheduled posts */
  const scheduledDates = useMemo(() => {
    const dates = new Set<number>()
    for (const p of posts) {
      if (
        p.status === "pending" &&
        p.scheduledFor.getFullYear() === year &&
        p.scheduledFor.getMonth() === month
      ) {
        dates.add(p.scheduledFor.getDate())
      }
    }
    return dates
  }, [posts, year, month])

  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  const weekDayHeaders = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

  /** Build calendar grid cells */
  const cells: (number | null)[] = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  if (isLoading) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-7 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-border/50", className)}>
      <CardContent className="p-4">
        <h4 className="text-sm font-medium mb-3 flex items-center gap-1.5">
          <IconCalendarEvent className="size-4 text-primary" />
          {monthLabel}
        </h4>

        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {weekDayHeaders.map((d) => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-0.5">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="h-7" />
            }
            const isToday = day === today
            const hasPost = scheduledDates.has(day)
            const isPast = day < today

            return (
              <div
                key={day}
                className={cn(
                  "h-7 flex flex-col items-center justify-center rounded-md text-[11px] relative",
                  isToday
                    ? "bg-primary text-primary-foreground font-semibold"
                    : isPast
                      ? "text-muted-foreground/50"
                      : "text-foreground"
                )}
              >
                {day}
                {hasPost && (
                  <div className={cn(
                    "absolute bottom-0.5 size-1 rounded-full",
                    isToday ? "bg-primary-foreground" : "bg-primary"
                  )} />
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Upcoming scheduled posts preview
 * Shows next 3 upcoming scheduled posts
 */
function UpcomingScheduleCard({ className }: { className?: string }) {
  const { posts, isLoading } = useScheduledPosts(30)

  // Filter to only show future pending posts
  const upcomingPosts = useMemo(() => {
    const now = new Date()
    return posts
      .filter(p => p.status === "pending" && p.scheduledFor > now)
      .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())
      .slice(0, 3)
  }, [posts])

  if (isLoading) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded" />
            </div>
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-border/50", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            <IconClock className="size-4 text-primary" />
            Upcoming
          </h4>
          {posts.length > 0 && (
            <Link
              href="/dashboard/schedule"
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              Schedule
              <IconChevronRight className="size-3" />
            </Link>
          )}
        </div>

        {upcomingPosts.length === 0 ? (
          <div className="text-center py-3">
            <p className="text-xs text-muted-foreground mb-2">No upcoming posts scheduled</p>
            <Button variant="outline" size="sm" asChild className="h-7 text-xs">
              <Link href="/dashboard/compose">
                Schedule a post
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingPosts.map((post) => (
              <div
                key={post.id}
                className="p-2 rounded-md bg-muted/30 border border-border/30"
              >
                <p className="text-xs line-clamp-2 text-foreground/80">
                  {truncateText(post.content, 80)}
                </p>
                <div className="flex items-center gap-1 mt-1.5">
                  <IconCalendarEvent className="size-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">
                    {post.scheduledFor.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })} at {post.scheduledFor.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Posting goals summary widget for the sidebar
 * Shows a compact view of active goals
 */
function GoalsSummaryCard({ className }: { className?: string }) {
  const { goals, isLoading } = usePostingGoals()

  if (isLoading) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-muted rounded" />
              <div className="h-4 w-20 bg-muted rounded" />
            </div>
            <div className="h-2 bg-muted rounded-full" />
            <div className="h-2 bg-muted rounded-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (goals.length === 0) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium flex items-center gap-1.5">
              <IconTarget className="size-4 text-primary" />
              Goals
            </h4>
            <Link
              href="/dashboard/analytics"
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              Set up
              <IconChevronRight className="size-3" />
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            Set posting goals to track your content creation progress.
          </p>
        </CardContent>
      </Card>
    )
  }

  const periodLabels: Record<string, string> = {
    daily: "Today",
    weekly: "This week",
    monthly: "This month",
  }

  return (
    <Card className={cn("border-border/50", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            <IconTarget className="size-4 text-primary" />
            Goals
          </h4>
          <Link
            href="/dashboard/analytics"
            className="text-xs text-primary hover:underline flex items-center gap-0.5"
          >
            Details
            <IconChevronRight className="size-3" />
          </Link>
        </div>

        <div className="space-y-2.5">
          {goals.slice(0, 3).map((goal) => {
            const progress = goal.target > 0
              ? Math.min(Math.round((goal.current / goal.target) * 100), 100)
              : 0
            const isComplete = goal.current >= goal.target

            return (
              <div key={goal.id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">
                    {periodLabels[goal.period] || goal.period}
                  </span>
                  <span className={cn(
                    "font-medium tabular-nums",
                    isComplete ? "text-success" : "text-foreground"
                  )}>
                    {goal.current}/{goal.target}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isComplete ? "bg-success" : "bg-primary"
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Daily tip card with rotating tips
 */
function DailyTipCard({ className }: { className?: string }) {
  const tip = useMemo(() => getTodaysTip(), [])

  return (
    <Card className={cn("border-border/50 bg-gradient-to-br from-secondary/5 to-transparent", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="rounded-lg bg-secondary/10 p-1.5">
            <IconBulb className="size-4 text-secondary" />
          </div>
          <h4 className="text-sm font-medium">Daily Tip</h4>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{tip}</p>
      </CardContent>
    </Card>
  )
}

/**
 * Getting started checklist for new users
 */
function GettingStartedCard({ className }: { className?: string }) {
  const { profile, extensionInstalled } = useAuthContext()

  const completedItems = useMemo(() => {
    const completed = new Set<string>()
    if (extensionInstalled) completed.add("extension")
    if (profile?.onboarding_completed) completed.add("profile")
    return completed
  }, [extensionInstalled, profile?.onboarding_completed])

  const progress = completedItems.size
  const total = GETTING_STARTED_ITEMS.length

  // Hide if all items are completed
  if (progress >= total) return null

  return (
    <Card className={cn("border-border/50 bg-gradient-to-br from-primary/5 to-transparent", className)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="rounded-lg bg-primary/10 p-1.5">
            <IconRocket className="size-4 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium">Get Started</h4>
            <p className="text-[10px] text-muted-foreground">{progress}/{total} complete</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(progress / total) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        {/* Checklist */}
        <div className="space-y-1.5">
          {GETTING_STARTED_ITEMS.map((item) => {
            const done = completedItems.has(item.key)
            return (
              <Link
                key={item.key}
                href={done ? "#" : item.href}
                className={cn(
                  "flex items-center gap-2 text-xs py-1 transition-colors rounded",
                  done
                    ? "text-muted-foreground line-through"
                    : "text-foreground hover:text-primary"
                )}
              >
                <div
                  className={cn(
                    "size-4 rounded-full border flex items-center justify-center shrink-0",
                    done
                      ? "bg-primary border-primary"
                      : "border-border"
                  )}
                >
                  {done && <IconCheck className="size-2.5 text-primary-foreground" />}
                </div>
                {item.label}
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Main Dashboard Content
// ============================================================================

/**
 * Dashboard content component with LinkedIn-style 3-column layout
 */
function DashboardContent() {
  const { user, profile, extensionInstalled } = useAuthContext()

  // Suppress extension prompts while the dashboard tour is active / not yet completed
  const tourCompleted = profile?.dashboard_tour_completed !== false

  // Extension install popup dialog (shown once after delay if extension not installed AND tour is done)
  const { showPrompt, setShowPrompt } = useExtensionPrompt({
    delay: 2000,
    autoCheck: extensionInstalled === false && tourCompleted,
  })

  // Track if the extension banner has been dismissed this session
  const [bannerDismissed, setBannerDismissed] = React.useState(false)
  const showExtensionBanner =
    tourCompleted && extensionInstalled === false && !isPromptDismissed() && !bannerDismissed

  return (
    <motion.div
      className="flex flex-col gap-4 py-4 md:py-6"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Extension Install Banner */}
      <ExtensionInstallBanner
        visible={showExtensionBanner}
        onDismiss={() => setBannerDismissed(true)}
      />

      {/* Extension Install Popup Dialog */}
      <ExtensionInstallPrompt
        open={showPrompt && tourCompleted}
        onOpenChange={setShowPrompt}
        onDismiss={(permanent) => {
          setShowPrompt(false)
          if (permanent) setBannerDismissed(true)
        }}
      />

      {/* LinkedIn-style 3-column layout */}
      <div className="px-4 lg:px-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr_280px] xl:grid-cols-[260px_1fr_300px]">
          {/* LEFT COLUMN: Profile card */}
          <div className="space-y-4" data-tour="profile-card">
            <ProfileCard />
          </div>

          {/* CENTER COLUMN: Greeting + Create post + Getting started + Streak + Tip */}
          <div className="space-y-4" data-tour="create-post">
            <InlineGreeting />
            <CreatePostCard />
            <GettingStartedCard />
            <StreakCard />
            <DailyTipCard />
          </div>

          {/* RIGHT COLUMN: Scheduled posts with calendar */}
          <div className="space-y-4" data-tour="sidebar-widgets">
            <ScheduleCalendarCard />
            <UpcomingScheduleCard />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Dashboard page component
 * @returns LinkedIn-style dashboard with profile, create post, analytics feed, and sidebar widgets
 */
export default function DashboardPage() {
  usePageMeta({
    title: "Dashboard",
  })
  const { isLoading: authLoading } = useAuthContext()

  return authLoading ? <DashboardSkeleton /> : <DashboardContent />
}
