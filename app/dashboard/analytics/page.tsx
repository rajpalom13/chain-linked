"use client"

/**
 * Analytics Page
 * @description Comprehensive analytics dashboard with rich animations and performance metrics
 * @module app/dashboard/analytics/page
 */

import { motion } from 'framer-motion'
import { AppSidebar } from "@/components/app-sidebar"
import { AnalyticsCards } from "@/components/features/analytics-cards"
import { AnalyticsChart } from "@/components/features/analytics-chart"
import { GoalsTracker } from "@/components/features/goals-tracker"
import { PostPerformance } from "@/components/features/post-performance"
import { TeamLeaderboard } from "@/components/features/team-leaderboard"
import { SiteHeader } from "@/components/site-header"
import { AnalyticsSkeleton } from "@/components/skeletons/page-skeletons"
import { useAnalytics } from "@/hooks/use-analytics"
import { usePostingGoals } from "@/hooks/use-posting-goals"
import { usePostAnalytics } from "@/hooks/use-post-analytics"
import { useAuthContext } from "@/lib/auth/auth-provider"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { IconAlertCircle, IconRefresh, IconClock, IconDownload } from "@tabler/icons-react"
import { toast } from "sonner"
import {
  pageVariants,
  staggerContainerVariants,
  staggerItemVariants,
} from '@/lib/animations'

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

  /**
   * Exports analytics data to CSV format
   */
  const handleExportCSV = () => {
    try {
      // Prepare CSV data
      const csvRows = []

      // CSV Header
      csvRows.push('Metric,Value')

      // Add key metrics
      if (metrics) {
        csvRows.push(`Impressions,${metrics.impressions || 0}`)
        csvRows.push(`Engagement Rate,${metrics.engagementRate || 0}%`)
        csvRows.push(`Followers,${metrics.followers || 0}`)
        csvRows.push(`Profile Views,${metrics.profileViews || 0}`)
        csvRows.push(`Search Appearances,${metrics.searchAppearances || 0}`)
        csvRows.push(`Connections,${metrics.connections || 0}`)
        csvRows.push(`Members Reached,${metrics.membersReached || 0}`)
      }

      // Add blank line
      csvRows.push('')

      // Add chart data
      if (chartData && chartData.length > 0) {
        csvRows.push('Date,Impressions,Engagement,Profile Views')
        chartData.forEach(data => {
          csvRows.push(`${data.date},${data.impressions || 0},${data.engagements || 0},${data.profileViews || 0}`)
        })
      }

      // Add blank line
      csvRows.push('')

      // Add goals data
      if (goals && goals.length > 0) {
        csvRows.push('Goal Type,Target,Current,Progress')
        goals.forEach(goal => {
          const progress = ((goal.current / goal.target) * 100).toFixed(1)
          csvRows.push(`${goal.period} Posts,${goal.target},${goal.current},${progress}%`)
        })
        csvRows.push(`Current Streak,${currentStreak} days`)
        csvRows.push(`Best Streak,${bestStreak} days`)
      }

      // Create CSV blob and download
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
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export analytics data')
    }
  }

  // Show error state with animation
  if (error) {
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
              <span>Failed to load analytics: {error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              <IconRefresh className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // Show loading state
  if (isLoading) {
    return <AnalyticsSkeleton />
  }

  return (
    <motion.div
      className="flex flex-col gap-4 py-4 md:gap-6 md:py-6"
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {/* Last Updated Timestamp and Export Button */}
      <motion.div
        className="flex items-center justify-between px-4 lg:px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {metadata?.lastUpdated && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <IconClock className="size-4" />
            <span>Last updated: {new Date(metadata.lastUpdated).toLocaleString()}</span>
            {metadata.captureMethod && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
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
          className="gap-2"
        >
          <IconDownload className="size-4" />
          Export CSV
        </Button>
      </motion.div>

      {/* Analytics Cards - Key Metrics */}
      <AnalyticsCards
        impressions={metrics?.impressions}
        engagementRate={metrics?.engagementRate}
        followers={metrics?.followers}
        profileViews={metrics?.profileViews}
        searchAppearances={metrics?.searchAppearances}
        connections={metrics?.connections}
        membersReached={metrics?.membersReached}
      />

      {/* Charts and Goals Row */}
      <motion.div
        className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-3 lg:px-6"
        variants={staggerContainerVariants}
        initial="initial"
        animate="animate"
      >
        {/* Performance Chart - Takes 2 columns */}
        <motion.div className="lg:col-span-2" variants={staggerItemVariants}>
          <AnalyticsChart data={chartData} />
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

      {/* Team Leaderboard and Post Performance Row */}
      <motion.div
        className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6"
        variants={staggerContainerVariants}
        initial="initial"
        animate="animate"
      >
        {/* Team Leaderboard */}
        <motion.div variants={staggerItemVariants}>
          <TeamLeaderboard currentUserId={user?.id} />
        </motion.div>

        {/* Post Performance Drill-down */}
        <motion.div variants={staggerItemVariants}>
          <PostPerformance
            post={selectedPost ?? undefined}
            isLoading={postAnalyticsLoading}
            onClose={() => selectPost(null)}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

/**
 * Analytics page component
 * @returns Analytics page with performance cards, charts, goals tracker, leaderboard, and post performance
 */
export default function AnalyticsPage() {
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
        <SiteHeader title="Analytics" />
        <main id="main-content" className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <AnalyticsContent />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
