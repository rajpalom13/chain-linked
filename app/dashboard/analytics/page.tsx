"use client"

/**
 * Analytics Page
 * @description Comprehensive analytics dashboard showing performance metrics, trends, and goals tracking
 * @module app/dashboard/analytics/page
 */

import { AppSidebar } from "@/components/app-sidebar"
import { AnalyticsCards } from "@/components/features/analytics-cards"
import { AnalyticsChart } from "@/components/features/analytics-chart"
import { GoalsTracker } from "@/components/features/goals-tracker"
import { PostPerformance } from "@/components/features/post-performance"
import { TeamLeaderboard } from "@/components/features/team-leaderboard"
import { SiteHeader } from "@/components/site-header"
import { AnalyticsSkeleton } from "@/components/skeletons/page-skeletons"
import { usePageLoading } from "@/hooks/use-minimum-loading"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

/**
 * Analytics page content component
 */
function AnalyticsContent() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 animate-in fade-in duration-500">
      {/* Analytics Cards - Key Metrics */}
      <AnalyticsCards />

      {/* Charts and Goals Row */}
      <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-3 lg:px-6">
        {/* Performance Chart - Takes 2 columns */}
        <div className="lg:col-span-2">
          <AnalyticsChart />
        </div>

        {/* Goals Tracker - Takes 1 column */}
        <div className="lg:col-span-1">
          <GoalsTracker />
        </div>
      </div>

      {/* Team Leaderboard and Post Performance Row */}
      <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
        {/* Team Leaderboard */}
        <TeamLeaderboard currentUserId="3" />

        {/* Post Performance Drill-down */}
        <PostPerformance />
      </div>
    </div>
  )
}

/**
 * Analytics page component
 * @returns Analytics page with performance cards, charts, goals tracker, leaderboard, and post performance
 */
export default function AnalyticsPage() {
  const isLoading = usePageLoading(1000)

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
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {isLoading ? <AnalyticsSkeleton /> : <AnalyticsContent />}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
