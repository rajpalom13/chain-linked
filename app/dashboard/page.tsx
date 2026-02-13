"use client"

/**
 * Dashboard Page
 * @description Main dashboard for ChainLinked - LinkedIn content management platform
 * @module app/dashboard/page
 */

import * as React from "react"
import { motion, useSpring, useTransform } from "framer-motion"
import { useEffect } from "react"
import {
  ExtensionInstallBanner,
  ExtensionInstallPrompt,
  useExtensionPrompt,
} from "@/components/features/extension-install-prompt"
import { isPromptDismissed } from "@/lib/extension/detect"
import { GoalsTracker } from "@/components/features/goals-tracker"
import { ScheduleCalendar } from "@/components/features/schedule-calendar"
import { TeamActivityFeed } from "@/components/features/team-activity-feed"
import { DashboardSkeleton } from "@/components/skeletons/page-skeletons"
import { useTeamPosts } from "@/hooks/use-team-posts"
import { useScheduledPosts } from "@/hooks/use-scheduled-posts"
import { usePostingGoals } from "@/hooks/use-posting-goals"
import { useAnalytics } from "@/hooks/use-analytics"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { usePageMeta } from "@/lib/dashboard-context"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  IconPencil,
  IconCalendarEvent,
  IconTemplate,
  IconBrandLinkedin,
  IconSparkles,
  IconEye,
  IconUserPlus,
  IconThumbUp,
  IconUser,
  IconTrendingUp,
  IconTrendingDown,
  IconArrowRight,
  IconCheck,
  IconCircle,
  IconX,
} from "@tabler/icons-react"
import Link from "next/link"
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
 * Quick action card component for dashboard
 */
function QuickActionCard({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string
  description: string
  href: string
  icon: React.ElementType
}) {
  return (
    <Link href={href} className="group block">
      <Card className="h-full transition-all duration-200 border-border/50 hover:border-primary/40 hover:shadow-md group">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 p-3 ring-1 ring-primary/10 shrink-0 transition-transform duration-200 group-hover:scale-105">
            <Icon className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
          </div>
          <IconArrowRight className="size-4 text-muted-foreground/30 transition-all duration-200 group-hover:text-primary group-hover:translate-x-0.5 shrink-0" />
        </CardContent>
      </Card>
    </Link>
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

/**
 * Dashboard content component with real data
 */
function DashboardContent() {
  const { user, profile, extensionInstalled } = useAuthContext()
  const { posts: teamPosts, isLoading: postsLoading } = useTeamPosts(20)
  const { posts: scheduledPosts, isLoading: scheduleLoading } = useScheduledPosts(30)
  const {
    goals,
    currentStreak,
    bestStreak,
    isLoading: goalsLoading,
    updateGoalTarget
  } = usePostingGoals(user?.id)
  const { metrics, isLoading: analyticsLoading } = useAnalytics(user?.id)

  // Extension install popup dialog (shown once after delay if extension not installed)
  const { showPrompt, setShowPrompt } = useExtensionPrompt({
    delay: 2000,
    autoCheck: extensionInstalled === false,
  })

  // Track if the extension banner has been dismissed this session
  const [bannerDismissed, setBannerDismissed] = React.useState(false)
  const showExtensionBanner =
    extensionInstalled === false && !isPromptDismissed() && !bannerDismissed

  // Track if Getting Started checklist is dismissed (persisted in localStorage)
  const [checklistDismissed, setChecklistDismissed] = React.useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem("chainlinked_checklist_dismissed") === "true"
  })
  const dismissChecklist = React.useCallback(() => {
    setChecklistDismissed(true)
    localStorage.setItem("chainlinked_checklist_dismissed", "true")
  }, [])

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

      {/* Extension Install Popup Dialog */}
      <ExtensionInstallPrompt
        open={showPrompt}
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
      <div className="px-4 lg:px-6">
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

        {/* Quick Actions */}
        <motion.div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          variants={staggerContainerVariants}
          initial="initial"
          animate="animate"
        >
          <motion.div variants={staggerItemVariants}>
            <QuickActionCard
              title="New Post"
              description="Create and schedule a new LinkedIn post"
              href="/dashboard/compose"
              icon={IconPencil}
            />
          </motion.div>
          <motion.div variants={staggerItemVariants}>
            <QuickActionCard
              title="Schedule"
              description="View and manage your content calendar"
              href="/dashboard/schedule"
              icon={IconCalendarEvent}
            />
          </motion.div>
          <motion.div variants={staggerItemVariants}>
            <QuickActionCard
              title="Templates"
              description="Browse and use post templates"
              href="/dashboard/templates"
              icon={IconTemplate}
            />
          </motion.div>
          <motion.div variants={staggerItemVariants}>
            <QuickActionCard
              title="Analytics"
              description="View detailed performance metrics"
              href="/dashboard/analytics"
              icon={IconBrandLinkedin}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Calendar and Goals Row */}
      <motion.div
        className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-3 lg:px-6"
        variants={staggerContainerVariants}
        initial="initial"
        animate="animate"
      >
        {/* Schedule Calendar - Takes 2 columns */}
        <motion.div className="lg:col-span-2" variants={staggerItemVariants}>
          <ScheduleCalendar
            posts={scheduledPosts}
            isLoading={scheduleLoading}
          />
        </motion.div>

        {/* Goals Tracker - Takes 1 column */}
        <motion.div className="lg:col-span-1" variants={staggerItemVariants}>
          <GoalsTracker
            goals={goals}
            currentStreak={currentStreak}
            bestStreak={bestStreak}
            onUpdateGoal={updateGoalTarget}
            isLoading={goalsLoading}
          />
        </motion.div>
      </motion.div>

      {/* Team Activity Feed - Capped at 5 posts on dashboard */}
      <motion.div
        className="px-4 lg:px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <CardDescription>Latest posts from your feed</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/posts">
                  View All
                  <IconArrowRight className="size-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <TeamActivityFeed
              posts={teamPosts.slice(0, 5)}
              isLoading={postsLoading}
              compact
            />
          </CardContent>
        </Card>
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
