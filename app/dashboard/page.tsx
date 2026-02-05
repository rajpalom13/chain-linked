"use client"

/**
 * Dashboard Page
 * @description Main dashboard for ChainLinked - LinkedIn content management platform
 * @module app/dashboard/page
 */

import { motion, useSpring, useTransform } from "framer-motion"
import { useEffect } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import {
  ExtensionInstallPrompt,
  useExtensionPrompt,
} from "@/components/features/extension-install-prompt"
import { GoalsTracker } from "@/components/features/goals-tracker"
import { ScheduleCalendar } from "@/components/features/schedule-calendar"
import { TeamActivityFeed } from "@/components/features/team-activity-feed"
import { SiteHeader } from "@/components/site-header"
import { DashboardSkeleton } from "@/components/skeletons/page-skeletons"
import { useTeamPosts } from "@/hooks/use-team-posts"
import { useScheduledPosts } from "@/hooks/use-scheduled-posts"
import { usePostingGoals } from "@/hooks/use-posting-goals"
import { useAnalytics } from "@/hooks/use-analytics"
import { useAuthContext } from "@/lib/auth/auth-provider"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
} from "@tabler/icons-react"
import Link from "next/link"
import {
  pageVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from "@/lib/animations"

/**
 * Animated number counter component
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
    spring.set(value)
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
}: {
  title: string
  value: number
  change: number
  icon: React.ElementType
  suffix?: string
  decimals?: number
  isLoading?: boolean
}) {
  const isPositive = change >= 0
  const TrendIcon = isPositive ? IconTrendingUp : IconTrendingDown

  if (isLoading) {
    return (
      <Card className="border-border/50 bg-gradient-to-br from-card via-card to-primary/5">
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
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <Card className="border-border/50 bg-gradient-to-br from-card via-card to-primary/5 dark:to-primary/10 hover:border-primary/30 transition-all duration-300 card-glow hover-lift">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">{title}</p>
              <p className="text-2xl font-bold tabular-nums mt-1">
                <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
              </p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 p-2.5 shadow-sm ring-1 ring-primary/10">
              <Icon className="size-5 text-primary" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border/40">
            <TrendIcon className={`size-3.5 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
            <span className={`text-xs font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
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
    <Link href={href} className="group">
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <Card className="h-full overflow-hidden transition-all duration-300 border-border/50 hover:shadow-lg hover:border-primary/40 bg-gradient-to-br from-card via-card to-primary/5 dark:to-primary/10 group relative card-glow">
          {/* Subtle glow effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
          <CardHeader className="pb-2 relative">
            <div className="flex items-center gap-3">
              <motion.div
                className="rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 p-2.5 shadow-sm ring-1 ring-primary/10"
                whileHover={{ rotate: 5, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Icon className="size-5 text-primary" />
              </motion.div>
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="flex items-center justify-between">
              <CardDescription>{description}</CardDescription>
              <IconArrowRight className="size-4 text-muted-foreground/50 transition-all duration-200 group-hover:text-primary group-hover:translate-x-0.5" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Link>
  )
}

/**
 * Dashboard content component with real data
 */
function DashboardContent() {
  const { user, profile } = useAuthContext()
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

  // Extension install prompt - shows after login if extension not installed
  const { showPrompt, setShowPrompt, checkAndShowPrompt } = useExtensionPrompt({
    delay: 2000, // Show after 2 seconds for better UX
  })

  // Check for extension on first dashboard load
  useEffect(() => {
    checkAndShowPrompt()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Get display name for welcome message
  const displayName = profile?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  return (
    <motion.div
      className="flex flex-col gap-4 py-4 md:gap-6 md:py-6"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Welcome Section */}
      <div className="px-4 lg:px-6">
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
            >
              <IconSparkles className="size-6 text-primary" />
            </motion.div>
            <h2 className="text-2xl font-bold tracking-tight">Welcome back, {displayName}!</h2>
          </div>
          <p className="text-muted-foreground">
            Here&apos;s an overview of your LinkedIn content management.
          </p>
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
              isLoading={analyticsLoading}
            />
          </motion.div>
          <motion.div variants={staggerItemVariants}>
            <QuickStatCard
              title="Followers"
              value={metrics?.followers.value || 0}
              change={metrics?.followers.change || 0}
              icon={IconUserPlus}
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
              isLoading={analyticsLoading}
            />
          </motion.div>
          <motion.div variants={staggerItemVariants}>
            <QuickStatCard
              title="Profile Views"
              value={metrics?.profileViews.value || 0}
              change={metrics?.profileViews.change || 0}
              icon={IconUser}
              isLoading={analyticsLoading}
            />
          </motion.div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
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

      {/* Team Activity Feed */}
      <motion.div
        className="px-4 lg:px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <TeamActivityFeed
          posts={teamPosts}
          isLoading={postsLoading}
        />
      </motion.div>

      {/* Extension Install Prompt - shows after login if extension not installed */}
      <ExtensionInstallPrompt
        open={showPrompt}
        onOpenChange={setShowPrompt}
      />
    </motion.div>
  )
}

/**
 * Dashboard page component
 * @returns Dashboard page with quick actions, schedule calendar, goals, and team activity
 */
export default function DashboardPage() {
  const { isLoading: authLoading } = useAuthContext()

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
        <SiteHeader title="Dashboard" />
        <main id="main-content" className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {authLoading ? <DashboardSkeleton /> : <DashboardContent />}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
