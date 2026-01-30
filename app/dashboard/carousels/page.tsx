'use client';

/**
 * Carousels Page
 * @description Canvas-based carousel editor for designing multi-slide LinkedIn carousel posts
 * @module app/dashboard/carousels/page
 */

import { AppSidebar } from '@/components/app-sidebar';
import { CanvasEditor } from '@/components/features/canvas-editor';
import { SiteHeader } from '@/components/site-header';
import { CarouselsSkeleton } from '@/components/skeletons/page-skeletons';
import { usePageLoading } from '@/hooks/use-minimum-loading';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

/**
 * Carousels page content component with full-height canvas editor
 */
function CarouselsContent() {
  return (
    <div className="flex h-[calc(100vh-var(--header-height))] flex-col animate-in fade-in duration-500">
      <CanvasEditor />
    </div>
  );
}

/**
 * Carousels page component
 * @returns Carousels page with interactive canvas-based carousel builder
 */
export default function CarouselsPage() {
  const isLoading = usePageLoading(1000);

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Carousel Creator" />
        <main id="main-content" className="flex flex-1 flex-col overflow-hidden">
          <div className="@container/main flex flex-1 flex-col">
            {isLoading ? <CarouselsSkeleton /> : <CarouselsContent />}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
