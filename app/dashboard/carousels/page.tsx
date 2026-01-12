"use client"

/**
 * Carousels Page
 * @description Carousel creator for designing multi-slide LinkedIn carousel posts
 * @module app/dashboard/carousels/page
 */

import { AppSidebar } from "@/components/app-sidebar"
import { CarouselCreator } from "@/components/features/carousel-creator"
import { SiteHeader } from "@/components/site-header"
import { CarouselsSkeleton } from "@/components/skeletons/page-skeletons"
import { usePageLoading } from "@/hooks/use-minimum-loading"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

/**
 * Carousels page content component
 */
function CarouselsContent() {
  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6 animate-in fade-in duration-500">
      <CarouselCreator />
    </div>
  )
}

/**
 * Carousels page component
 * @returns Carousels page with interactive carousel builder and preview
 */
export default function CarouselsPage() {
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
        <SiteHeader title="Carousels" />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {isLoading ? <CarouselsSkeleton /> : <CarouselsContent />}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
