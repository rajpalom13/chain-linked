"use client"

/**
 * Onboarding Layout
 * @description Shared layout for onboarding steps with a progress indicator,
 * responsive container, and subtle page transition animations.
 * Uses database-backed step tracking via auth context.
 * @module app/onboarding/layout
 */

import { useMemo } from "react"
import { usePathname } from "next/navigation"
import { OnboardingProgress } from "@/components/OnboardingProgress"
import { OnboardingNavbar } from "@/components/onboarding-navbar"
import { cn } from "@/lib/utils"
import { useAuthContext } from "@/lib/auth/auth-provider"

/**
 * Total number of onboarding steps in the flow
 * Steps: 1 (Profile), 2 (Connections), 3 (Company Analysis), 4 (Brand Kit), 5 (Review & Complete)
 */
const TOTAL_STEPS = 5

/**
 * Onboarding layout component wrapping all onboarding step pages.
 * Provides a navbar, progress indicator, and animated content area.
 * Progress is synced from the database via auth context.
 * @param props - Layout props
 * @param props.children - Child step content
 * @returns Layout JSX
 * @example
 * <OnboardingLayout>
 *   <Step1 />
 * </OnboardingLayout>
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { currentOnboardingStep } = useAuthContext()

  /**
   * Extracts the current step number from the URL path
   * Falls back to database-backed currentOnboardingStep if URL doesn't contain step
   */
  const step = useMemo(() => {
    const match = pathname.match(/step(\d+)/)
    if (match) {
      const rawStep = Number(match[1])
      return Math.min(Math.max(rawStep, 1), TOTAL_STEPS)
    }
    // For non-step paths (like /onboarding/company), use the database step
    return Math.min(Math.max(currentOnboardingStep, 1), TOTAL_STEPS)
  }, [pathname, currentOnboardingStep])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <div className="w-full flex justify-center border-b-0 py-4 mt-5">
        <OnboardingNavbar />
      </div>

      {/* Progress indicator */}
      <div className="w-full flex justify-center py-4 px-4">
        <div className="w-full max-w-2xl">
          <OnboardingProgress step={step} totalSteps={TOTAL_STEPS} />
        </div>
      </div>

      {/* Main content with transition animation */}
      <main
        key={pathname}
        className={cn(
          "flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12",
          "animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out"
        )}
      >
        {children}
      </main>
    </div>
  )
}
