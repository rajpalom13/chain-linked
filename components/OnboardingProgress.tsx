"use client"

/**
 * Onboarding Progress Indicator
 * @description Displays a step-by-step progress indicator with labels, animated transitions,
 * and responsive design (dots-only on mobile, full labels on larger screens).
 * @module components/OnboardingProgress
 */

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

/**
 * Step label configuration for the 5-step onboarding flow
 */
const STEP_LABELS = [
  "Profile",
  "Connect",
  "Company",
  "Brand Kit",
  "Review",
] as const

/**
 * Short description subtitles for each onboarding step
 */
const STEP_DESCRIPTIONS = [
  "Your details",
  "LinkedIn & tools",
  "AI analysis",
  "Brand identity",
  "Complete setup",
] as const

/**
 * Props for OnboardingProgress component
 */
interface OnboardingProgressProps {
  /** Current active step number (1-based) */
  step: number
  /** Total number of onboarding steps */
  totalSteps?: number
}

/**
 * Step-by-step progress indicator with labels and smooth animations.
 * On small screens, only dots are shown. On medium+ screens, labels appear.
 * Completed steps show a checkmark with primary color, current step pulses,
 * and upcoming steps are muted.
 * @param props - Component props
 * @param props.step - Current step number (1-based)
 * @param props.totalSteps - Total number of steps (default: 5)
 * @returns Progress indicator JSX
 * @example
 * <OnboardingProgress step={3} totalSteps={5} />
 */
export function OnboardingProgress({
  step,
  totalSteps = 5,
}: OnboardingProgressProps) {
  return (
    <div className="w-full px-2 py-4 bg-background">
      {/* Step text label - visible on all sizes */}
      <p className="text-sm text-muted-foreground mb-4 text-center md:hidden">
        Step {step} of {totalSteps}
      </p>

      {/* Progress dots and labels */}
      <div className="flex items-center justify-between w-full">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNumber = i + 1
          const isCompleted = stepNumber < step
          const isCurrent = stepNumber === step
          const isUpcoming = stepNumber > step
          const label = STEP_LABELS[i] || `Step ${stepNumber}`
          const description = STEP_DESCRIPTIONS[i] || ""

          return (
            <div key={stepNumber} className="flex items-center flex-1 last:flex-none">
              {/* Step indicator + label */}
              <div className="flex flex-col items-center gap-1.5">
                {/* Dot / Check */}
                <div
                  className={cn(
                    "flex items-center justify-center rounded-full transition-all duration-300 ease-in-out",
                    // Size
                    "h-8 w-8 text-xs font-medium",
                    // Completed
                    isCompleted &&
                      "bg-primary text-primary-foreground shadow-sm",
                    // Current - highlighted with ring
                    isCurrent &&
                      "bg-primary text-primary-foreground shadow-md ring-4 ring-primary/20",
                    // Upcoming
                    isUpcoming &&
                      "bg-muted text-muted-foreground border border-border"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{stepNumber}</span>
                  )}
                </div>

                {/* Label - hidden on small screens */}
                <span
                  className={cn(
                    "hidden md:block text-xs text-center whitespace-nowrap transition-colors duration-300",
                    isCompleted && "text-primary font-medium",
                    isCurrent && "text-foreground font-semibold",
                    isUpcoming && "text-muted-foreground"
                  )}
                >
                  {label}
                </span>

                {/* Description subtitle - hidden on small screens */}
                {description && (
                  <span
                    className={cn(
                      "hidden md:block text-[10px] text-center whitespace-nowrap transition-colors duration-300",
                      isCurrent ? "text-muted-foreground" : "text-muted-foreground/70"
                    )}
                  >
                    {description}
                  </span>
                )}
              </div>

              {/* Connector line between steps */}
              {stepNumber < totalSteps && (
                <div className="flex-1 mx-2 md:mx-3">
                  <div
                    className={cn(
                      "h-0.5 w-full rounded-full transition-all duration-500 ease-in-out",
                      isCompleted ? "bg-primary" : "bg-border"
                    )}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
