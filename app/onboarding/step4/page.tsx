"use client"

/**
 * Onboarding Step 4 - Brand Kit Extraction
 * @description Extracts brand colors, fonts, and logo from the user's company
 * website using AI. Allows reviewing and editing before saving.
 * @module app/onboarding/step4/page
 */

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  IconPalette,
  IconWorldWww,
  IconSparkles,
  IconLoader2,
  IconArrowLeft,
  IconArrowRight,
  IconAlertCircle,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useBrandKit } from "@/hooks/use-brand-kit"
import { BrandKitPreview } from "@/components/features/brand-kit-preview"
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard"
import { updateOnboardingStepInDatabase } from "@/services/onboarding"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { trackOnboardingStep } from "@/lib/analytics"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

/** Current step number for this page */
const CURRENT_STEP = 4

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
 * Step 4 - Brand Kit Extraction
 * Extracts brand identity (colors, fonts, logo) from the company website,
 * allows the user to review and edit, then saves to the database.
 * @returns Step 4 page JSX
 */
export default function Step4() {
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
  const [isLoadingContext, setIsLoadingContext] = useState(true)
  const [isSkipping, setIsSkipping] = useState(false)
  const [isSavingAndContinuing, setIsSavingAndContinuing] = useState(false)

  /**
   * Loads the company website URL from company context on mount.
   * Pre-fills the URL input if company analysis has already been done.
   */
  useEffect(() => {
    if (checking) return

    async function loadCompanyUrl() {
      try {
        const response = await fetch("/api/company-context")
        if (!response.ok) {
          setIsLoadingContext(false)
          return
        }

        const data = (await response.json()) as CompanyContextResponse | null
        if (data?.website_url) {
          setWebsiteUrl(data.website_url)
        }
      } catch (err) {
        console.error("Failed to load company context for brand kit:", err)
      } finally {
        setIsLoadingContext(false)
      }
    }

    loadCompanyUrl()
  }, [checking])

  /**
   * Handles form submission to extract brand kit from URL
   */
  const handleExtract = async () => {
    if (!websiteUrl.trim()) {
      toast.error("Please enter a website URL")
      return
    }

    clearError()
    const success = await extractBrandKit(websiteUrl.trim())
    if (success) {
      toast.success("Brand kit extracted successfully")
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

      await updateOnboardingStepInDatabase(5)
      await refreshProfile()
      trackOnboardingStep(CURRENT_STEP, true)

      toast.success("Brand kit saved")
      router.push("/onboarding/step5")
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
    setIsSkipping(true)
    try {
      await updateOnboardingStepInDatabase(5)
      await refreshProfile()
      trackOnboardingStep(CURRENT_STEP, false)
      router.push("/onboarding/step5")
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
            <h2 className="text-xl font-semibold">Extract Your Brand Kit</h2>
            <p className="text-sm text-muted-foreground">
              We&apos;ll extract your brand colors, fonts, and logo from your
              website to keep your LinkedIn content on-brand.
            </p>
          </div>
        </div>
      </div>

      {/* URL Input Form - shown when no kit has been extracted yet */}
      {!extractedKit && !isExtracting && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-5">
            {/* Website URL Input */}
            <div className="space-y-2">
              <Label htmlFor="brand-url">
                Company website URL{" "}
                <span className="text-red-500 text-xs align-top">Required</span>
              </Label>
              <div className="relative">
                <IconWorldWww className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="brand-url"
                  type="url"
                  placeholder="https://yourcompany.com"
                  className="h-10 pl-9"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleExtract()
                    }
                  }}
                />
              </div>
            </div>

            {/* Error Message */}
            {brandKitError && (
              <Alert variant="destructive" className="rounded-xl">
                <IconAlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {brandKitError}
                </AlertDescription>
              </Alert>
            )}

            {/* Info Box */}
            <Alert className="border border-dashed border-border bg-muted/30 rounded-xl">
              <IconSparkles className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm text-muted-foreground">
                Our AI will scan your website to extract brand colors, typography,
                and logo. This ensures your LinkedIn content stays visually
                consistent with your brand.
              </AlertDescription>
            </Alert>

            {/* Extract Button */}
            <Button
              onClick={handleExtract}
              disabled={!websiteUrl.trim()}
              className="w-full gap-2"
            >
              <IconSparkles className="h-4 w-4" />
              Extract Brand Kit
            </Button>
          </div>

          {/* Right Sidebar - Info Card */}
          <div className="lg:w-80">
            <Alert className="border border-border bg-muted/30 rounded-xl h-full flex flex-col justify-between p-4">
              <div>
                <h3 className="font-medium text-base mb-1 flex items-center gap-2">
                  <IconPalette className="h-4 w-4 text-primary" />
                  Why set up a brand kit?
                </h3>
                <AlertDescription className="text-sm text-muted-foreground mb-4">
                  A brand kit ensures visual consistency across all your LinkedIn
                  content. Carousels, images, and templates will automatically
                  use your brand identity.
                </AlertDescription>

                <h3 className="font-medium text-base mt-2">What we extract</h3>
                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                    Primary &amp; secondary colors
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Accent &amp; background colors
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                    Typography / fonts
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Brand logo
                  </li>
                </ul>
              </div>
            </Alert>
          </div>
        </div>
      )}

      {/* Extracting State */}
      {isExtracting && (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary/60 rounded-full blur-xl opacity-30 animate-pulse" />
            <div className="relative bg-background border border-border/60 rounded-full p-6">
              <IconPalette className="h-12 w-12 text-primary animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">
              Extracting brand identity...
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Scanning {websiteUrl} for colors, fonts, and logo. This usually
              takes 10-20 seconds.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <IconLoader2 className="h-4 w-4 animate-spin text-primary" />
            <span>Analyzing website styles...</span>
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
            onRetry={handleExtract}
          />
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4 pb-8">
        <Button
          variant="outline"
          onClick={() => router.push("/onboarding/step3")}
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
