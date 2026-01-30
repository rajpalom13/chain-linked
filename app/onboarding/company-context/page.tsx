/**
 * Company Context Onboarding Page
 * @description Dedicated onboarding step for collecting comprehensive company context
 * including website analysis, products, ICP, and value propositions.
 * @module app/onboarding/company-context/page
 */

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { IconLoader2 } from "@tabler/icons-react"

import { CompanyOnboardingForm } from "@/components/features/company-onboarding-form"
import { useAuthContext } from "@/lib/auth/auth-provider"
import {
  type CompanyContextData,
  getCompanyContext,
  hasCompletedCompanyOnboarding,
  markCompanyOnboardingStarted,
} from "@/services/onboarding"

/**
 * Company Context Onboarding Page Component
 *
 * Dedicated page for collecting comprehensive company context during onboarding.
 * Features:
 * - AI-powered website analysis
 * - Form for company details, products, ICP, and value propositions
 * - Saves data to profiles table
 * - Marks company_onboarding_completed = true when done
 * - Redirects to dashboard if already completed
 *
 * @returns Company context onboarding page JSX
 * @example
 * Navigate to /onboarding/company-context
 */
export default function CompanyContextPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuthContext()

  const [isLoading, setIsLoading] = useState(true)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [initialData, setInitialData] = useState<Partial<CompanyContextData> | undefined>(undefined)

  /**
   * Check if user has already completed company onboarding
   */
  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.replace("/login")
      return
    }

    const checkOnboardingStatus = async () => {
      try {
        // Mark that we've started onboarding (prevents redirect loops)
        markCompanyOnboardingStarted()

        // Check if already completed
        const completed = await hasCompletedCompanyOnboarding()
        if (completed) {
          // Load existing data for display/editing
          const existingData = await getCompanyContext()
          if (existingData) {
            setInitialData(existingData)
          }
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkOnboardingStatus()
  }, [authLoading, user, router])

  /**
   * Handle successful form completion
   */
  const handleComplete = () => {
    setIsRedirecting(true)
    // Navigate to dashboard or next onboarding step
    router.push("/dashboard")
  }

  /**
   * Handle skip action
   */
  const handleSkip = () => {
    setIsRedirecting(true)
    router.push("/dashboard")
  }

  // Show loading state while checking auth and onboarding status
  if (authLoading || isLoading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <div className="flex flex-col items-center gap-4">
          <IconLoader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">
            {isRedirecting
              ? "Saving your company context..."
              : isLoading
              ? "Checking onboarding status..."
              : "Loading..."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4 py-8">
      {/* Progress Indicator */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
            1
          </div>
          <span className="text-sm font-medium">Company Context</span>
        </div>
        <div className="w-8 h-px bg-border" />
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm font-medium">
            2
          </div>
          <span className="text-sm text-muted-foreground">Start Creating</span>
        </div>
      </div>

      <CompanyOnboardingForm
        onComplete={handleComplete}
        onSkip={handleSkip}
        showSkip={true}
        initialData={initialData}
      />
    </div>
  )
}
