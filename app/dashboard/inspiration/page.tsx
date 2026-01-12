"use client"

/**
 * Inspiration Page
 * @description Content inspiration feed with swipe interface for discovering trending LinkedIn content
 * @module app/dashboard/inspiration/page
 */

import { AppSidebar } from "@/components/app-sidebar"
import { InspirationFeed } from "@/components/features/inspiration-feed"
import { SwipeInterface } from "@/components/features/swipe-interface"
import { SiteHeader } from "@/components/site-header"
import { InspirationSkeleton } from "@/components/skeletons/page-skeletons"
import { usePageLoading } from "@/hooks/use-minimum-loading"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

/**
 * Inspiration page content component
 */
function InspirationContent() {
  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Swipe Interface - Takes 1 column on desktop */}
        <div className="lg:col-span-1 order-2 lg:order-1">
          <SwipeInterface />
        </div>

        {/* Inspiration Feed - Takes 2 columns on desktop */}
        <div className="lg:col-span-2 order-1 lg:order-2">
          <InspirationFeed />
        </div>
      </div>
    </div>
  )
}

/**
 * Inspiration page component
 * @returns Inspiration page with swipeable content feed for discovering trending posts
 */
export default function InspirationPage() {
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
        <SiteHeader title="Inspiration" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {isLoading ? <InspirationSkeleton /> : <InspirationContent />}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
