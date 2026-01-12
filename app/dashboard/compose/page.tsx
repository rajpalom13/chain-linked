"use client"

/**
 * Compose Page
 * @description Post composer interface for creating and editing LinkedIn content
 * @module app/dashboard/compose/page
 */

import { AppSidebar } from "@/components/app-sidebar"
import { PostComposer } from "@/components/features/post-composer"
import { SiteHeader } from "@/components/site-header"
import { ComposeSkeleton } from "@/components/skeletons/page-skeletons"
import { usePageLoading } from "@/hooks/use-minimum-loading"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

/**
 * Compose page content component
 */
function ComposeContent() {
  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6 animate-in fade-in duration-500">
      <PostComposer />
    </div>
  )
}

/**
 * Compose page component
 * @returns Compose page with post composer for creating LinkedIn content
 */
export default function ComposePage() {
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
        <SiteHeader title="Compose" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {isLoading ? <ComposeSkeleton /> : <ComposeContent />}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
