/**
 * Dashboard Layout
 * @description Wraps all dashboard pages with authentication and onboarding guards.
 * Forces dynamic rendering since pages depend on client-side auth context.
 * @module app/dashboard/layout
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { IconLoader2 } from '@tabler/icons-react'

import { useAuthContext } from '@/lib/auth/auth-provider'

export const dynamic = 'force-dynamic'

/**
 * Loading component displayed while checking auth and onboarding status
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
 * Handles authentication checks and company onboarding redirect.
 *
 * Flow:
 * 1. Wait for auth loading to complete
 * 2. If not authenticated, redirect to login
 * 3. If authenticated but profile not loaded yet, wait
 * 4. If company onboarding not completed, redirect to /onboarding/company
 * 5. Otherwise, render dashboard content
 *
 * @param props - Layout props
 * @param props.children - Dashboard page content
 * @returns Dashboard layout JSX with guards
 * @example
 * <DashboardLayout>
 *   <DashboardPage />
 * </DashboardLayout>
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const {
    user,
    profile,
    isLoading,
    isAuthenticated,
    hasCompletedCompanyOnboarding
  } = useAuthContext()

  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true)
  const [hasRedirected, setHasRedirected] = useState(false)

  useEffect(() => {
    // Wait for auth loading to complete
    if (isLoading) {
      return
    }

    // Not authenticated - redirect to login
    if (!isAuthenticated || !user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`)
      return
    }

    // Profile is still loading (user exists but profile fetch in progress)
    // Give it a moment to load before making decisions
    if (profile === null) {
      // Set a timeout to prevent infinite waiting
      const timeout = setTimeout(() => {
        // If profile still null after 3 seconds, assume new user
        // and redirect to onboarding
        setIsCheckingOnboarding(false)
      }, 3000)

      return () => clearTimeout(timeout)
    }

    // Profile loaded - check onboarding status
    if (!hasCompletedCompanyOnboarding && !hasRedirected) {
      console.log('[DashboardLayout] Company onboarding not completed, redirecting to /onboarding/company')
      setHasRedirected(true)
      router.replace('/onboarding/company')
      return
    }

    // All checks passed
    setIsCheckingOnboarding(false)
  }, [
    isLoading,
    isAuthenticated,
    user,
    profile,
    hasCompletedCompanyOnboarding,
    hasRedirected,
    pathname,
    router
  ])

  // Show loading while auth is loading or we're checking onboarding
  if (isLoading || (isCheckingOnboarding && isAuthenticated)) {
    return <DashboardLoadingState />
  }

  // If we've determined onboarding redirect is needed but waiting for navigation
  if (!hasCompletedCompanyOnboarding && hasRedirected) {
    return <DashboardLoadingState />
  }

  // All guards passed - render dashboard
  return <>{children}</>
}
