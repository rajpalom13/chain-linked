"use client"

/**
 * Onboarding Step 3 - Brand Kit Display
 * @description Automatically extracts brand kit using the company URL from Step 2
 * (via Firecrawl + Brandfetch), then displays the results for review and editing.
 * No URL input is shown — the URL is carried over from Step 2's company context.
 * @module app/onboarding/step3/page
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  IconPalette,
  IconSparkles,
  IconLoader2,
  IconArrowLeft,
  IconArrowRight,
  IconAlertCircle,
  IconWorldWww,
  IconBrandFigma,
  IconColorSwatch,
  IconCheck,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useBrandKit } from "@/hooks/use-brand-kit"
import { BrandKitPreview } from "@/components/features/brand-kit-preview"
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard"
import { updateOnboardingStepInDatabase } from "@/services/onboarding"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { trackOnboardingStep } from "@/lib/analytics"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

/** Current step number for this page */
const CURRENT_STEP = 3

/**
 * Company context response from the API
 */
interface CompanyContextResponse {
  /** Company website URL */
  website_url?: string
  /** Company name */
  company_name?: string
  /** Analysis status */
  status?: string
}

/**
 * Extraction progress stages shown during loading
 */
const EXTRACTION_STAGES = [
  {
    id: "scraping",
    label: "Scraping website styles & assets",
    icon: IconWorldWww,
  },
  {
    id: "brandfetch",
    label: "Fetching brand assets from registries",
    icon: IconBrandFigma,
  },
  {
    id: "analyzing",
    label: "Analyzing colors, fonts & logo",
    icon: IconColorSwatch,
  },
] as const

/**
 * Step 3 - Brand Kit Display
 * Automatically extracts brand identity using the URL from Step 2,
 * then displays results for review and editing before saving.
 * @returns Step 3 page JSX
 */
export default function Step3() {
  const router = useRouter()
  const { checking } = useOnboardingGuard()
  const { refreshProfile } = useAuthContext()

  const {
    extractedKit,
    isExtracting,
    isSaving,
    error: brandKitError,
    extractBrandKit,
    updateExtractedKit,
    saveBrandKit,
    clearError,
  } = useBrandKit()

  const [websiteUrl, setWebsiteUrl] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [isLoadingContext, setIsLoadingContext] = useState(true)
  const [isSkipping, setIsSkipping] = useState(false)
  const [isSavingAndContinuing, setIsSavingAndContinuing] = useState(false)
  const [extractionTriggered, setExtractionTriggered] = useState(false)
  const [extractionStage, setExtractionStage] = useState(0)
  const stageIntervalRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Starts cycling through extraction stage labels for the loading animation
   */
  const startStageAnimation = useCallback(() => {
    setExtractionStage(0)
    let stage = 0
    stageIntervalRef.current = setInterval(() => {
      stage += 1
      if (stage < EXTRACTION_STAGES.length) {
        setExtractionStage(stage)
      }
    }, 5000)
  }, [])

  /**
   * Stops the stage animation interval
   */
  const stopStageAnimation = useCallback(() => {
    if (stageIntervalRef.current) {
      clearInterval(stageIntervalRef.current)
      stageIntervalRef.current = null
    }
  }, [])

  /**
   * Loads company context and auto-triggers brand extraction
   */
  useEffect(() => {
    if (checking) return

    let cancelled = false

    async function loadAndExtract() {
      try {
        const response = await fetch("/api/company-context")
        if (!response.ok || cancelled) {
          setIsLoadingContext(false)
          return
        }

        const data = (await response.json()) as CompanyContextResponse | null
        if (cancelled) return

        if (data?.website_url) {
          setWebsiteUrl(data.website_url)
        }
        if (data?.company_name) {
          setCompanyName(data.company_name)
        }

        setIsLoadingContext(false)

        // Auto-trigger extraction if we have a URL and haven't extracted yet
        if (data?.website_url && !cancelled) {
          setExtractionTriggered(true)
        }
      } catch (err) {
        console.error("Failed to load company context for brand kit:", err)
        if (!cancelled) {
          setIsLoadingContext(false)
        }
      }
    }

    loadAndExtract()

    return () => {
      cancelled = true
    }
  }, [checking])

  /**
   * Triggers brand extraction once URL is available
   */
  useEffect(() => {
    if (!extractionTriggered || !websiteUrl || isExtracting || extractedKit) return

    clearError()
    startStageAnimation()
    extractBrandKit(websiteUrl).then((success) => {
      stopStageAnimation()
      if (success) {
        toast.success("Brand kit extracted successfully")
      }
    })
  }, [
    extractionTriggered,
    websiteUrl,
    isExtracting,
    extractedKit,
    extractBrandKit,
    clearError,
    startStageAnimation,
    stopStageAnimation,
  ])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      stopStageAnimation()
    }
  }, [stopStageAnimation])

  /**
   * Handles re-extraction when user clicks retry
   */
  const handleRetry = async () => {
    if (!websiteUrl.trim()) return
    clearError()
    startStageAnimation()
    const success = await extractBrandKit(websiteUrl.trim())
    stopStageAnimation()
    if (success) {
      toast.success("Brand kit re-extracted successfully")
    }
  }

  /**
   * Handles saving the brand kit and continuing to the next step
   */
  const handleSaveAndContinue = async () => {
    setIsSavingAndContinuing(true)
    try {
      const saved = await saveBrandKit()
      if (!saved) {
        toast.error("Failed to save brand kit. Please try again.")
        setIsSavingAndContinuing(false)
        return
      }

      await updateOnboardingStepInDatabase(4)
      await refreshProfile()
      trackOnboardingStep(CURRENT_STEP, true)

      toast.success("Brand kit saved")
      router.push("/onboarding/step4")
    } catch (err) {
      console.error("Failed to save brand kit:", err)
      toast.error("Failed to save. Please try again.")
      setIsSavingAndContinuing(false)
    }
  }

  /**
   * Handles skipping the brand kit step
   */
  const handleSkip = async () => {
    const confirmed = window.confirm(
      "Skipping brand kit extraction means your carousels won't have your brand colors and fonts. You can set this up later in Settings. Skip anyway?"
    )
    if (!confirmed) return

    setIsSkipping(true)
    try {
      await updateOnboardingStepInDatabase(4)
      await refreshProfile()
      trackOnboardingStep(CURRENT_STEP, false)
      router.push("/onboarding/step4")
    } catch (err) {
      console.error("Failed to skip brand kit step:", err)
      toast.error("Something went wrong. Please try again.")
      setIsSkipping(false)
    }
  }

  /**
   * Handles updating extracted kit data from the preview component
   * @param updates - Partial brand kit data updates
   */
  const handlePreviewUpdate = (updates: Record<string, unknown>) => {
    updateExtractedKit(updates as Partial<typeof extractedKit & object>)
  }

  if (checking || isLoadingContext) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto p-6 bg-background">
      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <IconPalette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Your Brand Kit</h2>
            <p className="text-sm text-muted-foreground">
              {isExtracting
                ? `Extracting brand identity from ${websiteUrl || "your website"}...`
                : extractedKit
                  ? "Review your extracted brand colors, fonts, and logo. Click any element to edit it."
                  : brandKitError
                    ? "We had trouble extracting your brand kit."
                    : "Setting up your brand identity..."
              }
            </p>
          </div>
        </div>
      </div>

      {/* Extracting State */}
      {isExtracting && (
        <ExtractingAnimation
          websiteUrl={websiteUrl}
          currentStage={extractionStage}
        />
      )}

      {/* Error State */}
      {!isExtracting && !extractedKit && brandKitError && (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <IconAlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="text-center space-y-2 max-w-md">
            <h3 className="text-lg font-semibold">Extraction failed</h3>
            <p className="text-sm text-muted-foreground">
              {brandKitError}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleRetry}>
              <IconSparkles className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button variant="ghost" onClick={handleSkip}>
              Skip for now
            </Button>
          </div>
        </div>
      )}

      {/* No URL from Step 2 - edge case (user skipped Step 2) */}
      {!isExtracting && !extractedKit && !brandKitError && !websiteUrl && (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <IconWorldWww className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center space-y-2 max-w-md">
            <h3 className="text-lg font-semibold">No website URL found</h3>
            <p className="text-sm text-muted-foreground">
              Go back to Step 2 and enter your company website so we can
              extract your brand identity, or skip this step.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/onboarding/step2")}
            >
              <IconArrowLeft className="h-4 w-4 mr-2" />
              Back to Step 2
            </Button>
            <Button variant="ghost" onClick={handleSkip}>
              Skip for now
            </Button>
          </div>
        </div>
      )}

      {/* Brand Kit Preview - shown after extraction */}
      {extractedKit && !isExtracting && (
        <div className="space-y-6">
          <BrandKitPreview
            brandKit={{
              websiteUrl: extractedKit.websiteUrl,
              primaryColor: extractedKit.primaryColor,
              secondaryColor: extractedKit.secondaryColor,
              accentColor: extractedKit.accentColor,
              backgroundColor: extractedKit.backgroundColor,
              textColor: extractedKit.textColor,
              fontPrimary: extractedKit.fontPrimary,
              fontSecondary: extractedKit.fontSecondary,
              logoUrl: extractedKit.logoUrl,
            }}
            editable
            onUpdate={handlePreviewUpdate}
            onRetry={handleRetry}
          />
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4 pb-8">
        <Button
          variant="outline"
          onClick={() => router.push("/onboarding/step2")}
          className="gap-2"
        >
          <IconArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isSkipping}
          >
            {isSkipping ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Skipping...
              </>
            ) : (
              "Skip for now"
            )}
          </Button>

          {extractedKit && (
            <Button
              onClick={handleSaveAndContinue}
              disabled={isSavingAndContinuing || isSaving}
              className="gap-2"
            >
              {isSavingAndContinuing || isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Save &amp; Continue
                  <IconArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Animated loading state shown while brand kit is being extracted
 * @param props - Component props
 * @param props.websiteUrl - The URL being analyzed
 * @param props.currentStage - Current extraction stage index
 * @returns Animated extraction JSX
 */
function ExtractingAnimation({
  websiteUrl,
  currentStage,
}: {
  websiteUrl: string
  currentStage: number
}) {
  const [dots, setDots] = useState("")

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-[350px] gap-6">
      {/* Gradient spinner */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary/60 rounded-full blur-xl opacity-30 animate-pulse" />
        <div className="relative bg-background border border-border/60 rounded-full p-6">
          <IconPalette className="h-12 w-12 text-primary animate-pulse" />
        </div>
      </div>

      {/* Text */}
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold tracking-tight">
          Extracting brand identity{dots}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Analyzing <span className="font-medium text-foreground">{websiteUrl}</span> for
          colors, fonts, and logo. This usually takes 10-20 seconds.
        </p>
      </div>

      {/* Progress stages */}
      <div className="flex flex-col gap-3 mt-2">
        {EXTRACTION_STAGES.map((stage, index) => {
          const Icon = stage.icon
          const state: "completed" | "active" | "pending" =
            index < currentStage
              ? "completed"
              : index === currentStage
                ? "active"
                : "pending"

          return (
            <div
              key={stage.id}
              className={cn(
                "flex items-center gap-3 text-sm transition-all duration-300",
                state === "completed" && "text-emerald-600 dark:text-emerald-400",
                state === "active" && "text-primary font-medium",
                state === "pending" && "text-muted-foreground/50"
              )}
            >
              {state === "completed" ? (
                <IconCheck className="h-4 w-4" />
              ) : state === "active" ? (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icon className="h-4 w-4 opacity-40" />
              )}
              <span>{stage.label}</span>
            </div>
          )
        })}
      </div>

      {/* Source indicator */}
      <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Firecrawl (CSS analysis)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
          Brandfetch (brand registry)
        </span>
      </div>
    </div>
  )
}
