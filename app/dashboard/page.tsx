"use client"

/**
 * Dashboard Page
 * @description Main dashboard for ChainLinked - LinkedIn content management platform
 * @module app/dashboard/page
 */

import { AppSidebar } from "@/components/app-sidebar"
import { GoalsTracker } from "@/components/features/goals-tracker"
import { ScheduleCalendar, sampleScheduledPostItems } from "@/components/features/schedule-calendar"
import { TeamActivityFeed, sampleTeamPosts } from "@/components/features/team-activity-feed"
import { SiteHeader } from "@/components/site-header"
import { DashboardSkeleton } from "@/components/skeletons/page-skeletons"
import { usePageLoading } from "@/hooks/use-minimum-loading"
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
import {
  IconPencil,
  IconCalendarEvent,
  IconTemplate,
  IconBrandLinkedin,
} from "@tabler/icons-react"
import Link from "next/link"

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
      <Card className="h-full transition-all hover:shadow-md hover:border-primary/50 group-hover:bg-muted/30">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Icon className="size-5 text-primary" />
            </div>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription>{description}</CardDescription>
        </CardContent>
      </Card>
    </Link>
  )
}

/**
 * Dashboard content component
 */
function DashboardContent() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 animate-in fade-in duration-500">
      {/* Welcome Section with Quick Actions */}
      <div className="px-4 lg:px-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold tracking-tight">Welcome back!</h2>
          <p className="text-muted-foreground">
            Here&apos;s an overview of your LinkedIn content management.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard
            title="New Post"
            description="Create and schedule a new LinkedIn post"
            href="/dashboard/compose"
            icon={IconPencil}
          />
          <QuickActionCard
            title="Schedule"
            description="View and manage your content calendar"
            href="/dashboard/schedule"
            icon={IconCalendarEvent}
          />
          <QuickActionCard
            title="Templates"
            description="Browse and use post templates"
            href="/dashboard/templates"
            icon={IconTemplate}
          />
          <QuickActionCard
            title="Analytics"
            description="View detailed performance metrics"
            href="/dashboard/analytics"
            icon={IconBrandLinkedin}
          />
        </div>
      </div>

      {/* Calendar and Goals Row */}
      <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-3 lg:px-6">
        {/* Schedule Calendar - Takes 2 columns */}
        <div className="lg:col-span-2">
          <ScheduleCalendar posts={sampleScheduledPostItems} />
        </div>

        {/* Goals Tracker - Takes 1 column */}
        <div className="lg:col-span-1">
          <GoalsTracker />
        </div>
      </div>

      {/* Team Activity Feed */}
      <div className="px-4 lg:px-6">
        <TeamActivityFeed posts={sampleTeamPosts} />
      </div>
    </div>
  )
}

/**
 * Dashboard page component
 * @returns Dashboard page with quick actions, schedule calendar, goals, and team activity
 */
export default function DashboardPage() {
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
        <SiteHeader title="Dashboard" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {isLoading ? <DashboardSkeleton /> : <DashboardContent />}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
