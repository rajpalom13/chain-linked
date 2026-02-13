"use client"

/**
 * Analytics Page
 * @description Comprehensive analytics dashboard with rich animations and performance metrics
 * @module app/dashboard/analytics/page
 */

import { motion } from 'framer-motion'
import { AnalyticsCards } from "@/components/features/analytics-cards"
import { AnalyticsChart } from "@/components/features/analytics-chart"
import { GoalsTracker } from "@/components/features/goals-tracker"
import { PostPerformance } from "@/components/features/post-performance"
import { TeamLeaderboard } from "@/components/features/team-leaderboard"
import { AnalyticsSkeleton } from "@/components/skeletons/page-skeletons"
import { PageContent } from "@/components/shared/page-content"
import { useAnalytics } from "@/hooks/use-analytics"
import { usePostingGoals } from "@/hooks/use-posting-goals"
import { usePostAnalytics } from "@/hooks/use-post-analytics"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { useTeamLeaderboard } from "@/hooks/use-team-leaderboard"
import { usePageMeta } from "@/lib/dashboard-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  IconAlertCircle,
  IconRefresh,
  IconClock,
  IconDownload,
  IconPencil,
  IconCalendar,
  IconSearch,
  IconUsers,
  IconUsersGroup,
  IconArticle,
} from "@tabler/icons-react"
import Link from "next/link"
import { toast } from "sonner"
import {
  staggerContainerVariants,
  staggerItemVariants,
} from '@/lib/animations'
import { CrossNav, type CrossNavItem } from "@/components/shared/cross-nav"

/**
 * Actionable insight navigation items for the analytics page bottom
 */
const analyticsInsightNav: CrossNavItem[] = [
  {
    href: "/dashboard/compose",
    icon: IconPencil,
    label: "Create more content",
    description: "Consistent posting helps build your audience.",
    color: "primary",
  },
  {
    href: "/dashboard/schedule",
    icon: IconCalendar,
    label: "Stay consistent",
    description: "Schedule posts ahead to maintain your posting rhythm.",
    color: "blue-500",
  },
  {
    href: "/dashboard/posts",
    icon: IconArticle,
    label: "Review your posts",
    description: "See all your published content and track individual performance.",
    color: "emerald-500",
  },
]

/**
 * Compact secondary metric display
 * @param props - icon, label, value, change
 */
function SecondaryMetric({ icon: Icon, label, value, change }: {
  icon: React.ElementType
  label: string
  value: number
  change: number
}) {
  const isPositive = change >= 0
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card px-4 py-3 transition-colors hover:border-border">
      <div className="rounded-lg bg-muted p-2 shrink-0">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold tabular-nums">{value.toLocaleString()}</p>
      </div>
      <span className={`text-xs font-medium tabular-nums ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
        {isPositive ? '+' : ''}{change.toFixed(1)}%
      </span>
    </div>
  )
}

/**
 * Analytics page content component with real data and animations
 */
function AnalyticsContent() {
  const { user } = useAuthContext()
  const { metrics, chartData, metadata, isLoading, error, refetch } = useAnalytics(user?.id)
  const {
    goals,
    currentStreak,
    bestStreak,
    isLoading: goalsLoading,
    updateGoalTarget
  } = usePostingGoals(user?.id)
  const {
    selectedPost,
    isLoading: postAnalyticsLoading,
    selectPost
  } = usePostAnalytics(user?.id)
  const {
    members: leaderboardMembers,
    timeRange,
    setTimeRange,
    isLoading: leaderboardLoading,
    currentUserId,
  } = useTeamLeaderboard()

  /**
   * Exports analytics data to CSV format
   */
  const handleExportCSV = () => {
    try {
      const csvRows = []
      csvRows.push('Metric,Value')
      if (metrics) {
        csvRows.push(`Impressions,${metrics.impressions || 0}`)
        csvRows.push(`Engagement Rate,${metrics.engagementRate || 0}%`)
        csvRows.push(`Followers,${metrics.followers || 0}`)
        csvRows.push(`Profile Views,${metrics.profileViews || 0}`)
        csvRows.push(`Search Appearances,${metrics.searchAppearances || 0}`)
        csvRows.push(`Connections,${metrics.connections || 0}`)
        csvRows.push(`Members Reached,${metrics.membersReached || 0}`)
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
          <h2 className="text-2xl font-bold tracking-tight">Performance Overview</h2>
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

      {/* Primary Metrics - 4 Key Cards */}
      <AnalyticsCards
        impressions={metrics?.impressions}
        engagementRate={metrics?.engagementRate}
        followers={metrics?.followers}
        profileViews={metrics?.profileViews}
        variant="primary"
      />

      {/* Secondary Metrics - Compact Row */}
      <motion.div
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        variants={staggerContainerVariants}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItemVariants}>
          <SecondaryMetric
            icon={IconSearch}
            label="Search Appearances"
            value={metrics?.searchAppearances?.value ?? 0}
            change={metrics?.searchAppearances?.change ?? 0}
          />
        </motion.div>
        <motion.div variants={staggerItemVariants}>
          <SecondaryMetric
            icon={IconUsers}
            label="Connections"
            value={metrics?.connections?.value ?? 0}
            change={metrics?.connections?.change ?? 0}
          />
        </motion.div>
        <motion.div variants={staggerItemVariants}>
          <SecondaryMetric
            icon={IconUsersGroup}
            label="Members Reached"
            value={metrics?.membersReached?.value ?? 0}
            change={metrics?.membersReached?.change ?? 0}
          />
        </motion.div>
      </motion.div>

      {/* Charts and Goals Row */}
      <motion.div
        className="grid grid-cols-1 gap-4 lg:grid-cols-3"
        variants={staggerContainerVariants}
        initial="initial"
        animate="animate"
      >
        <motion.div className="lg:col-span-2" variants={staggerItemVariants}>
          <AnalyticsChart data={chartData} />
        </motion.div>
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

      {/* Team Leaderboard and Post Performance Row */}
      <motion.div
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
        variants={staggerContainerVariants}
        initial="initial"
        animate="animate"
      >
        <motion.div variants={staggerItemVariants}>
          <TeamLeaderboard
            members={leaderboardMembers}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            currentUserId={currentUserId || undefined}
            isLoading={leaderboardLoading}
          />
        </motion.div>
        <motion.div variants={staggerItemVariants}>
          <PostPerformance
            post={selectedPost ?? undefined}
            isLoading={postAnalyticsLoading}
            onClose={() => selectPost(null)}
          />
        </motion.div>
      </motion.div>

      {/* Actionable Insight Cards */}
      <CrossNav items={analyticsInsightNav} />
    </PageContent>
  )
}

/**
 * Analytics page component
 * @returns Analytics page with performance cards, charts, goals tracker, leaderboard, and post performance
 */
export default function AnalyticsPage() {
  usePageMeta({ title: "Analytics" })

  return <AnalyticsContent />
}
