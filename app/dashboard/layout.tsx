/**
 * Dashboard Layout
 * @description Wraps all dashboard pages with a client-side authentication guard.
 * Onboarding enforcement is handled by the middleware (server-side) to avoid
 * race conditions between the middleware and client-side profile loading.
 * @module app/dashboard/layout
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { IconLoader2 } from '@tabler/icons-react'

import { useAuthContext } from '@/lib/auth/auth-provider'

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
 * Handles client-side authentication check only.
 * Onboarding status is enforced by the middleware to prevent race conditions.
 *
 * @param props - Layout props
 * @param props.children - Dashboard page content
 * @returns Dashboard layout JSX with auth guard
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

  return <>{children}</>
}
