"use client"

/**
 * Onboarding Entry Page
 * @description Redirects user to current onboarding step or dashboard based on database state
 * @module app/onboarding/page
 */

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAuthContext } from "@/lib/auth/auth-provider"

/**
 * Onboarding entry component
 * Reads onboarding status from the auth context (database-backed)
 * and redirects to the appropriate step or dashboard
 * @returns Loading state while redirecting
 */
export default function OnboardingPage() {
  const router = useRouter()
  const {
    isLoading,
    isAuthenticated,
    hasCompletedOnboarding,
    currentOnboardingStep,
  } = useAuthContext()

  useEffect(() => {
    // Wait for auth state to be determined
    if (isLoading) return

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
      router.replace("/login")
      return
    }

    // Onboarding completed - redirect to dashboard
    if (hasCompletedOnboarding) {
      router.replace("/dashboard")
      return
    }

    // Redirect to the user's current step
    const step = currentOnboardingStep || 1
    router.replace(`/onboarding/step${step}`)
  }, [isLoading, isAuthenticated, hasCompletedOnboarding, currentOnboardingStep, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading your progress...</p>
      </div>
    </div>
  )
}
