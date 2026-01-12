/**
 * Schedule Page
 * @description View and manage scheduled LinkedIn posts with calendar and list views
 * @module app/dashboard/schedule/page
 */

import { AppSidebar } from "@/components/app-sidebar"
import { ScheduleCalendar } from "@/components/features/schedule-calendar"
import { ScheduledPosts } from "@/components/features/scheduled-posts"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

/**
 * Schedule page component
 * @returns Schedule page with calendar view and list of upcoming scheduled posts
 */
export default function SchedulePage() {
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
            <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
              {/* Calendar View and List View */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Calendar View */}
                <ScheduleCalendar />

                {/* List View */}
                <ScheduledPosts />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
