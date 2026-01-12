"use client"

/**
 * Schedule Page
 * @description View and manage scheduled LinkedIn posts with calendar and list views
 * @module app/dashboard/schedule/page
 */

import { AppSidebar } from "@/components/app-sidebar"
import { ScheduleCalendar } from "@/components/features/schedule-calendar"
import { ScheduledPosts } from "@/components/features/scheduled-posts"
import { SiteHeader } from "@/components/site-header"
import { ScheduleSkeleton } from "@/components/skeletons/page-skeletons"
import { usePageLoading } from "@/hooks/use-minimum-loading"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

/**
 * Schedule page content component
 */
function ScheduleContent() {
  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6 animate-in fade-in duration-500">
      {/* Calendar View and List View */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Calendar View */}
        <ScheduleCalendar />

        {/* List View */}
        <ScheduledPosts />
      </div>
    </div>
  )
}

/**
 * Schedule page component
 * @returns Schedule page with calendar view and list of upcoming scheduled posts
 */
export default function SchedulePage() {
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
        <SiteHeader title="Schedule" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {isLoading ? <ScheduleSkeleton /> : <ScheduleContent />}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
