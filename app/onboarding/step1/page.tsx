"use client"

/**
 * Onboarding Step 1
 * @description Collects user name and email, saves progress to database
 * @module app/onboarding/step1/page
 */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { trackOnboardingStep } from "@/lib/analytics"
import { SignupForm } from "@/components/signup-form"
import { Button } from "@/components/ui/button"
import {
  getAuthUserData,
  updateOnboardingStepInDatabase,
  updateUserProfile,
} from "@/services/onboarding"
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard"
import { useAuthContext } from "@/lib/auth/auth-provider"

/** Current step number for this page */
const CURRENT_STEP = 1

/**
 * Step 1 component
 * Collects and validates user name and email
 * Saves progress to database when moving to next step
 * @returns Step 1 JSX
 */
export default function Step1() {
  const router = useRouter()
  const { checking } = useOnboardingGuard()
  const { refreshProfile } = useAuthContext()

  const [form, setForm] = useState({ fullname: "", email: "" })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  /**
   * Updates the current step in the database on mount
   */
  useEffect(() => {
    if (checking) return
    // Ensure database reflects we're on step 1
    updateOnboardingStepInDatabase(CURRENT_STEP)
  }, [checking])

  /**
   * Loads existing user data from auth metadata or localStorage
   */
  useEffect(() => {
    if (checking) return

    const loadUserData = async () => {
      const saved = localStorage.getItem("onboarding_signup")

      if (saved) {
        try {
          setForm(JSON.parse(saved))
          return
        } catch {
          localStorage.removeItem("onboarding_signup")
        }
      }

      const userData = await getAuthUserData()
      setForm({ fullname: userData.name, email: userData.email })
    }

    loadUserData()
  }, [checking])

  /**
   * Handles navigation to next step
   * Validates form, saves to localStorage and database
   */
  const handleNext = async () => {
    if (!form.fullname || !form.email) {
      setError("Both fields are required.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Save to localStorage for quick retrieval
      localStorage.setItem("onboarding_signup", JSON.stringify(form))

      // Update user profile in database
      await updateUserProfile(form.fullname, form.email)

      // Update step progress in database (moving to step 2)
      await updateOnboardingStepInDatabase(2)

      // Refresh profile to sync auth context with database
      await refreshProfile()

      // Track analytics
      trackOnboardingStep(CURRENT_STEP, true)

      // Navigate to next step
      router.push("/onboarding/step2")
    } catch (err) {
      console.error("Error saving step 1:", err)
      setError("Failed to save your information. Please try again.")
      setIsSubmitting(false)
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center w-full py-12 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="w-full max-w-md bg-white/70 dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 shadow-sm rounded-xl p-8 backdrop-blur-sm">
        <SignupForm
          fullname={form.fullname}
          email={form.email}
          error={error || undefined}
          onChange={(data) => {
            setForm(data)
            setError(null)
          }}
        />
        <div className="flex justify-end mt-6">
          <Button onClick={handleNext} className="px-6" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Next"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
