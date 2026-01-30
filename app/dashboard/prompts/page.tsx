"use client"

/**
 * Prompt Playground Page
 * @description Dashboard page for prompt iteration and testing
 * @module app/dashboard/prompts/page
 */

import { AppSidebar } from "@/components/app-sidebar"
import { PromptPlayground } from "@/components/features/prompt-playground"
import { SiteHeader } from "@/components/site-header"
import { Skeleton } from "@/components/ui/skeleton"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useAuthContext } from "@/lib/auth/auth-provider"

/**
 * Prompt playground page content
 */
function PromptPlaygroundContent() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 animate-in fade-in duration-500">
      <PromptPlayground />
    </div>
  )
}

/**
 * Prompt playground page component
 * @returns Prompt playground dashboard page
 */
export default function PromptPlaygroundPage() {
  const { isLoading: authLoading } = useAuthContext()

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
        <SiteHeader title="Prompt Playground" />
        <main id="main-content" className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {authLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : (
              <PromptPlaygroundContent />
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
