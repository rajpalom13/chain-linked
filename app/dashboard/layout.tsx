/**
 * Dashboard Layout
 * @description Wraps all dashboard pages with authentication guard and shared
 * sidebar/header shell. Individual pages no longer need to repeat this boilerplate.
 * @module app/dashboard/layout
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { IconLoader2 } from '@tabler/icons-react'

import { useAuthContext } from '@/lib/auth/auth-provider'
import { DashboardProvider } from '@/lib/dashboard-context'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'

export const dynamic = 'force-dynamic'

/**
 * Loading component displayed while checking auth status
 * @returns Loading UI with spinner
 */
function DashboardLoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Loading dashboard...</p>
      </div>
    </div>
  )
}

/**
 * Dashboard Layout Component
 * Provides auth guard + shared sidebar/header shell for all dashboard pages.
 *
 * @param props - Layout props
 * @param props.children - Dashboard page content
 * @returns Dashboard layout with auth guard and shared shell
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading, isAuthenticated } = useAuthContext()

  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated || !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
      return
    }

    // Auth confirmed — middleware already enforced onboarding status server-side
    setReady(true)
  }, [isLoading, isAuthenticated, user, pathname, router])

  if (isLoading || !ready) {
    return <DashboardLoadingState />
  }

  return (
    <DashboardProvider>
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
          <SiteHeader />
          <main id="main-content" className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              {children}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </DashboardProvider>
  )
}
