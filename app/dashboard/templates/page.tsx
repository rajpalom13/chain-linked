"use client"

/**
 * Templates Page
 * @description Template library for managing reusable LinkedIn post templates
 * @module app/dashboard/templates/page
 */

import { AppSidebar } from "@/components/app-sidebar"
import { TemplateLibrary } from "@/components/features/template-library"
import { SiteHeader } from "@/components/site-header"
import { TemplatesSkeleton } from "@/components/skeletons/page-skeletons"
import { usePageLoading } from "@/hooks/use-minimum-loading"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

/**
 * Templates page content component
 */
function TemplatesContent() {
  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6 animate-in fade-in duration-500">
      <TemplateLibrary />
    </div>
  )
}

/**
 * Templates page component
 * @returns Templates page with browsable and searchable template library
 */
export default function TemplatesPage() {
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
        <SiteHeader title="Templates" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {isLoading ? <TemplatesSkeleton /> : <TemplatesContent />}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
