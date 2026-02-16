"use client"

/**
 * Dashboard Page
 * @description Main dashboard for ChainLinked - LinkedIn content management platform
 * @module app/dashboard/page
 */

import * as React from "react"
import { motion, useSpring, useTransform } from "framer-motion"
import { useEffect, useMemo } from "react"
import {
  ExtensionInstallBanner,
  ExtensionInstallPrompt,
  useExtensionPrompt,
} from "@/components/features/extension-install-prompt"
import { isPromptDismissed } from "@/lib/extension/detect"
import { TeamActivityFeed } from "@/components/features/team-activity-feed"
import { DashboardSkeleton } from "@/components/skeletons/page-skeletons"
import { useTeamPosts } from "@/hooks/use-team-posts"
import { useScheduledPosts } from "@/hooks/use-scheduled-posts"
import { useAnalytics } from "@/hooks/use-analytics"
import { usePostingGoals } from "@/hooks/use-posting-goals"
import { useSwipeWishlist } from "@/hooks/use-swipe-wishlist"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { usePageMeta } from "@/lib/dashboard-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  IconPencil,
  IconCalendarEvent,
  IconSparkles,
  IconEye,
  IconUserPlus,
  IconThumbUp,
  IconUser,
  IconTrendingUp,
  IconTrendingDown,
  IconCheck,
  IconX,
  IconFlame,
  IconBookmark,
  IconSend,
} from "@tabler/icons-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import {
  pageVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from "@/lib/animations"

/**
 * Animated number counter component
 * Shows value immediately when 0, animates only for non-zero values
 */
function AnimatedNumber({
  value,
  decimals = 0,
  suffix = '',
}: {
  value: number
  decimals?: number
  suffix?: string
}) {
  const spring = useSpring(0, { stiffness: 50, damping: 20 })
  const display = useTransform(spring, (current) => {
    if (decimals > 0) {
      return `${current.toFixed(decimals)}${suffix}`
    }
    return `${Math.round(current).toLocaleString()}${suffix}`
  })

  useEffect(() => {
    if (value === 0) {
      spring.jump(0)
    } else {
      spring.set(value)
    }
  }, [spring, value])

  return <motion.span>{display}</motion.span>
}

/**
 * Quick stat card for dashboard overview
 */
function QuickStatCard({
  title,
  value,
  change,
  icon: Icon,
  suffix = '',
  decimals = 0,
  isLoading = false,
  accent = 'primary',
}: {
  title: string
  value: number
  change: number
  icon: React.ElementType
  suffix?: string
  decimals?: number
  isLoading?: boolean
  accent?: 'primary' | 'blue' | 'emerald' | 'amber'
}) {
  const isPositive = change >= 0
  const TrendIcon = isPositive ? IconTrendingUp : IconTrendingDown

  const accentStyles = {
    primary: {
      card: 'hover:border-primary/30',
      icon: 'from-primary/15 to-primary/5 ring-primary/10',
      iconColor: 'text-primary',
    },
    blue: {
      card: 'hover:border-blue-500/30',
      icon: 'from-blue-500/15 to-blue-500/5 ring-blue-500/10',
      iconColor: 'text-blue-500',
    },
    emerald: {
      card: 'hover:border-emerald-500/30',
      icon: 'from-emerald-500/15 to-emerald-500/5 ring-emerald-500/10',
      iconColor: 'text-emerald-500',
    },
    amber: {
      card: 'hover:border-amber-500/30',
      icon: 'from-amber-500/15 to-amber-500/5 ring-amber-500/10',
      iconColor: 'text-amber-500',
    },
  }

  const styles = accentStyles[accent]

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
          <Skeleton className="h-4 w-16 mt-2" />
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Card className={`border-border/50 ${styles.card} transition-all duration-300`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{title}</p>
              <p className="text-2xl font-bold tabular-nums mt-1">
                <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
              </p>
            </div>
            <div className={`rounded-xl bg-gradient-to-br ${styles.icon} p-2.5 shadow-sm ring-1`}>
              <Icon className={`size-5 ${styles.iconColor}`} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border/40">
            <TrendIcon className={`size-3.5 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`} />
            <span className={`text-xs font-semibold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}{change.toFixed(1)}%
            </span>
            <span className="text-xs text-muted-foreground">vs last period</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/**
 * Getting Started checklist for new users
 */
function GettingStartedChecklist({
  linkedInConnected,
  extensionInstalled,
  hasScheduledPosts,
  onDismiss,
}: {
  linkedInConnected: boolean
  extensionInstalled: boolean
  hasScheduledPosts: boolean
  onDismiss: () => void
}) {
  const steps = [
    { label: "Connect LinkedIn", done: linkedInConnected, href: "/dashboard/settings" },
    { label: "Install extension", done: extensionInstalled, href: "/dashboard/settings" },
    { label: "Create first post", done: false, href: "/dashboard/compose" },
    { label: "Schedule content", done: hasScheduledPosts, href: "/dashboard/schedule" },
  ]
  const completed = steps.filter(s => s.done).length
  const progressPercent = (completed / steps.length) * 100

  // If all done, don't show
  if (completed === steps.length) return null

  return (
    <motion.div
      className="px-4 lg:px-6"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
    >
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-transparent overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold">Getting Started</h3>
              <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{completed}/{steps.length}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground"
              onClick={onDismiss}
            >
              <IconX className="size-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-muted/50 rounded-full mb-3 overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {steps.map((step) => (
              <Link
                key={step.label}
                href={step.href}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50"
              >
                {step.done ? (
                  <div className="size-5 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                    <IconCheck className="size-3 text-emerald-500" />
                  </div>
                ) : (
                  <div className="size-5 rounded-full border-2 border-muted-foreground/20 shrink-0" />
                )}
                <span className={`text-xs font-medium ${step.done ? "text-muted-foreground line-through" : ""}`}>{step.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* =============================================================================
   NEW DASHBOARD WIDGETS
   ============================================================================= */

/**
 * Widget: Next Up — hero count with compact upcoming post timeline
 * @param props.rawPosts - Raw scheduled posts from useScheduledPosts
 * @param props.isLoading - Loading state
 */
function NextUpStrip({
  rawPosts,
  isLoading,
}: {
  rawPosts: { id: string; content: string; scheduled_for: string; status: string }[]
  isLoading: boolean
}) {
  const upcoming = useMemo(() => {
    return rawPosts
      .filter(p => p.status === 'pending' || p.status === 'scheduled')
      .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())
      .slice(0, 3)
  }, [rawPosts])

  if (isLoading) {
    return (
      <Card className="border-border/50 h-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="size-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-16 mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 h-full">
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Next Up</p>
          <div className="rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 p-1.5">
            <IconSend className="size-4 text-primary" />
          </div>
        </div>

        <div className="flex items-baseline gap-1.5 mt-2">
          <span className="text-3xl font-bold tabular-nums">
            <AnimatedNumber value={upcoming.length} />
          </span>
          <span className="text-sm text-muted-foreground font-medium">scheduled</span>
        </div>

        <div className="mt-auto pt-3 space-y-1.5">
          {upcoming.length === 0 ? (
            <div className="text-center py-2">
              <p className="text-[11px] text-muted-foreground mb-2">Nothing scheduled yet</p>
              <Button variant="outline" size="sm" className="h-7 text-[11px]" asChild>
                <Link href="/dashboard/compose">
                  <IconPencil className="size-3 mr-1" />
                  Compose
                </Link>
              </Button>
            </div>
          ) : (
            <>
              {upcoming.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/30"
                >
                  <div className="size-1.5 rounded-full bg-primary shrink-0" />
                  <p className="text-[11px] truncate flex-1">{post.content.slice(0, 45)}{post.content.length > 45 ? '...' : ''}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                    {formatDistanceToNow(new Date(post.scheduled_for), { addSuffix: false })}
                  </span>
                </div>
              ))}
              <Link href="/dashboard/schedule" className="text-[11px] text-primary hover:underline block text-right pt-1">
                View schedule →
              </Link>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Widget: Posting Streak — hero metric with weekly progress dots
 * @param props.currentStreak - Current consecutive days posted
 * @param props.bestStreak - All-time best streak
 * @param props.isLoading - Loading state
 */
function PostingStreakIndicator({
  currentStreak,
  bestStreak,
  isLoading,
}: {
  currentStreak: number
  bestStreak: number
  isLoading: boolean
}) {
  const weekDots = useMemo(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1

    return Array.from({ length: 7 }, (_, i) => ({
      label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
      filled: i <= adjustedDay && (adjustedDay - i) < currentStreak,
      isToday: i === adjustedDay,
    }))
  }, [currentStreak])

  if (isLoading) {
    return (
      <Card className="border-border/50 h-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="size-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-20 mb-4" />
          <div className="flex items-center gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="size-6 rounded-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 h-full">
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Posting Streak</p>
          <div className="rounded-lg bg-gradient-to-br from-orange-500/15 to-amber-500/5 p-1.5">
            <IconFlame className={cn("size-4", currentStreak > 0 ? "text-orange-500" : "text-muted-foreground")} />
          </div>
        </div>

        <div className="flex items-baseline gap-1.5 mt-2">
          <span className="text-3xl font-bold tabular-nums text-orange-500">
            <AnimatedNumber value={currentStreak} />
          </span>
          <span className="text-sm text-muted-foreground font-medium">
            {currentStreak === 1 ? 'day' : 'days'}
          </span>
        </div>

        <div className="mt-auto pt-3">
          <div className="flex items-center justify-between">
            {weekDots.map((dot, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <div
                  className={cn(
                    "size-6 rounded-full flex items-center justify-center text-[10px] font-medium transition-all",
                    dot.filled
                      ? "bg-orange-500 text-white shadow-sm shadow-orange-500/25"
                      : dot.isToday
                      ? "ring-2 ring-orange-500/30 bg-orange-50 text-orange-600 dark:bg-orange-500/10"
                      : "bg-muted/60 text-muted-foreground"
                  )}
                >
                  {dot.filled ? <IconCheck className="size-3" /> : dot.label}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Personal best: {bestStreak} day{bestStreak !== 1 ? 's' : ''}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Widget: Content Pipeline — hero total with split scheduled/saved blocks
 * @param props.scheduledCount - Number of scheduled/pending posts
 * @param props.wishlistCount - Number of items in wishlist
 * @param props.isLoading - Loading state
 */
function ContentPipelineSummary({
  scheduledCount,
  wishlistCount,
  isLoading,
}: {
  scheduledCount: number
  wishlistCount: number
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <Card className="border-border/50 h-full">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="size-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-16 mb-4" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/50 h-full">
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Pipeline</p>
          <div className="rounded-lg bg-gradient-to-br from-violet-500/15 to-violet-500/5 p-1.5">
            <IconBookmark className="size-4 text-violet-500" />
          </div>
        </div>

        <div className="flex items-baseline gap-1.5 mt-2">
          <span className="text-3xl font-bold tabular-nums">
            <AnimatedNumber value={scheduledCount + wishlistCount} />
          </span>
          <span className="text-sm text-muted-foreground font-medium">total items</span>
        </div>

        <div className="mt-auto pt-3 grid grid-cols-2 gap-2">
          <Link
            href="/dashboard/schedule"
            className="block p-2.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors text-center group"
          >
            <span className="text-lg font-bold tabular-nums block group-hover:text-primary transition-colors">{scheduledCount}</span>
            <span className="text-[10px] text-muted-foreground">Scheduled</span>
          </Link>
          <Link
            href="/dashboard/swipe/wishlist"
            className="block p-2.5 rounded-lg bg-violet-500/5 hover:bg-violet-500/10 transition-colors text-center group"
          >
            <span className="text-lg font-bold tabular-nums block group-hover:text-violet-500 transition-colors">{wishlistCount}</span>
            <span className="text-[10px] text-muted-foreground">Saved</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Dashboard content component with real data
 */
function DashboardContent() {
  const { user, profile, extensionInstalled } = useAuthContext()
  const { posts: teamPosts, isLoading: postsLoading } = useTeamPosts(20)
  const { posts: scheduledPosts, rawPosts: scheduledRawPosts } = useScheduledPosts(30)
  const { metrics, isLoading: analyticsLoading } = useAnalytics(user?.id)
  const { currentStreak, bestStreak, isLoading: goalsLoading } = usePostingGoals()
  const { totalItems: wishlistCount, isLoading: wishlistLoading } = useSwipeWishlist()

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

  // Track if Getting Started checklist is dismissed (persisted in localStorage)
  const [checklistDismissed, setChecklistDismissed] = React.useState(() => {
    if (typeof window === "undefined") return false
    try {
      return localStorage.getItem("chainlinked_checklist_dismissed") === "true"
    } catch {
      return false
    }
  })
  const dismissChecklist = React.useCallback(() => {
    setChecklistDismissed(true)
    try {
      localStorage.setItem("chainlinked_checklist_dismissed", "true")
    } catch {
      // localStorage may be unavailable in some environments
    }
  }, [])

  // Count of pending/scheduled posts for pipeline widget
  const pendingScheduledCount = useMemo(() => {
    return scheduledRawPosts.filter(
      p => p.status === 'pending' || p.status === 'scheduled'
    ).length
  }, [scheduledRawPosts])

  // Get display name for welcome message - prioritize full_name from DB
  const displayName = profile?.full_name?.split(' ')[0] || profile?.name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  return (
    <motion.div
      className="flex flex-col gap-4 py-4 md:gap-6 md:py-6"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Extension Install Banner */}
      <ExtensionInstallBanner
        visible={showExtensionBanner}
        onDismiss={() => setBannerDismissed(true)}
      />

      {/* Extension Install Popup Dialog — always mounted so Radix can clean
          up body styles properly; the `open` prop controls visibility */}
      <ExtensionInstallPrompt
        open={showPrompt && tourCompleted}
        onOpenChange={setShowPrompt}
        onDismiss={(permanent) => {
          setShowPrompt(false)
          if (permanent) setBannerDismissed(true)
        }}
      />

      {/* Getting Started Checklist */}
      {!checklistDismissed && (
        <GettingStartedChecklist
          linkedInConnected={!!profile?.linkedin_profile}
          extensionInstalled={extensionInstalled === true}
          hasScheduledPosts={scheduledPosts.length > 0}
          onDismiss={dismissChecklist}
        />
      )}

      {/* Welcome Section */}
      <div className="px-4 lg:px-6" data-tour="welcome-section">
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
                >
                  <IconSparkles className="size-6 text-primary" />
                </motion.div>
                <h2 className="text-2xl font-bold tracking-tight">
                  {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'}, {displayName}!
                </h2>
              </div>
              <p className="text-muted-foreground">
                Here&apos;s your LinkedIn content overview for today.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <IconCalendarEvent className="size-4" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </motion.div>

        {/* Quick Stats Overview */}
        <motion.div
          className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6"
          data-tour="quick-stats"
          variants={staggerContainerVariants}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={staggerItemVariants}>
            <QuickStatCard
              title="Impressions"
              value={metrics?.impressions.value || 0}
              change={metrics?.impressions.change || 0}
              icon={IconEye}
              accent="primary"
              isLoading={analyticsLoading}
            />
          </motion.div>
          <motion.div variants={staggerItemVariants}>
            <QuickStatCard
              title="Followers"
              value={metrics?.followers.value || 0}
              change={metrics?.followers.change || 0}
              icon={IconUserPlus}
              accent="blue"
              isLoading={analyticsLoading}
            />
          </motion.div>
          <motion.div variants={staggerItemVariants}>
            <QuickStatCard
              title="Engagement"
              value={metrics?.engagementRate.value || 0}
              change={metrics?.engagementRate.change || 0}
              icon={IconThumbUp}
              suffix="%"
              decimals={1}
              accent="emerald"
              isLoading={analyticsLoading}
            />
          </motion.div>
          <motion.div variants={staggerItemVariants}>
            <QuickStatCard
              title="Profile Views"
              value={metrics?.profileViews.value || 0}
              change={metrics?.profileViews.change || 0}
              icon={IconUser}
              accent="amber"
              isLoading={analyticsLoading}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* 3-column utility row: Streak | Next Up | Pipeline */}
      <div className="px-4 lg:px-6" data-tour="widgets-row">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <PostingStreakIndicator
              currentStreak={currentStreak}
              bestStreak={bestStreak}
              isLoading={goalsLoading}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
          >
            <NextUpStrip rawPosts={scheduledRawPosts} isLoading={analyticsLoading} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <ContentPipelineSummary
              scheduledCount={pendingScheduledCount}
              wishlistCount={wishlistCount}
              isLoading={wishlistLoading}
            />
          </motion.div>
        </div>
      </div>

      {/* Recent Activity Feed — 2-column LinkedIn post grid */}
      <motion.div
        className="px-4 lg:px-6"
        data-tour="activity-feed"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Recent Activity</h3>
            <p className="text-sm text-muted-foreground">Latest posts from your feed</p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/posts" className="text-sm text-primary hover:text-primary/80">
              View All →
            </Link>
          </Button>
        </div>
        <TeamActivityFeed
          posts={teamPosts.slice(0, 8)}
          isLoading={postsLoading}
          columns={2}
        />
      </motion.div>

    </motion.div>
  )
}

/**
 * Dashboard page component
 * @returns Dashboard page with quick actions, schedule calendar, goals, and team activity
 */
export default function DashboardPage() {
  usePageMeta({
    title: "Dashboard",
    headerActions: (
      <Button asChild size="sm">
        <Link href="/dashboard/compose">
          <IconPencil className="size-4 mr-1" />
          New Post
        </Link>
      </Button>
    ),
  })
  const { isLoading: authLoading } = useAuthContext()

  return authLoading ? <DashboardSkeleton /> : <DashboardContent />
}
