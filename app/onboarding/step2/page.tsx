"use client"

/**
 * Onboarding Step 2 - Company Context
 * @description Collects company info and triggers Inngest-powered website analysis
 * using Firecrawl for scraping, Perplexity for research, and OpenAI for structured extraction
 * @module app/onboarding/step2/page
 */

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Info,
  Loader2,
  Sparkles,
  Globe,
  Building2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard"
import { trackOnboardingStep } from "@/lib/analytics"
import { updateOnboardingStepInDatabase } from "@/services/onboarding"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

/**
 * Industry options for the dropdown
 */
const INDUSTRY_OPTIONS = [
  "Technology / SaaS",
  "E-commerce / Retail",
  "Finance / Fintech",
  "Healthcare / Biotech",
  "Education / EdTech",
  "Marketing / Advertising",
  "Media / Publishing",
  "Consulting / Professional Services",
  "Real Estate",
  "Manufacturing",
  "Logistics / Supply Chain",
  "Nonprofit / Social Impact",
  "Entertainment / Gaming",
  "Travel / Hospitality",
  "Other",
] as const

/**
 * Analysis status response from API
 */
interface AnalysisStatus {
  status: string
  progress: number
  currentStep: string
  errorMessage?: string
  completedAt?: string
}

/** Current step number for this page */
const CURRENT_STEP = 2

/** Polling interval in milliseconds */
const POLL_INTERVAL = 2000

/** Maximum polling duration in milliseconds (5 minutes) */
const MAX_POLL_DURATION_MS = 300_000

/**
 * Step 2 - Company Context Ingestion
 * Collects company name, website URL, industry, and target audience,
 * then triggers an Inngest workflow for AI analysis.
 * @returns Step 2 page JSX
 */
export default function Step2() {
  const router = useRouter()
  const { checking } = useOnboardingGuard()
  const { refreshProfile } = useAuthContext()

  const [companyName, setCompanyName] = useState("")
  const [companyLink, setCompanyLink] = useState("")
  const [industry, setIndustry] = useState("")
  const [targetAudience, setTargetAudience] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus | null>(null)

  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const pollingStartRef = useRef<number | null>(null)

  /**
   * Stops the polling interval and resets the start time tracker
   */
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    pollingStartRef.current = null
  }, [])

  /**
   * Polls the analysis status API.
   * Enforces a maximum polling duration of 5 minutes to prevent infinite polling.
   */
  const pollStatus = useCallback(async () => {
    // Check if polling has exceeded the maximum duration
    if (pollingStartRef.current) {
      const elapsed = Date.now() - pollingStartRef.current
      if (elapsed >= MAX_POLL_DURATION_MS) {
        stopPolling()
        setIsAnalyzing(false)
        setError(
          "Analysis is taking longer than expected. You can try again or skip this step."
        )
        return
      }
    }

    try {
      const response = await fetch("/api/company-context/status")
      if (!response.ok) return

      const data = (await response.json()) as AnalysisStatus
      setAnalysisStatus(data)

      if (data.status === "completed") {
        stopPolling()

        toast.success("Company analysis complete!")

        // Update step progress in database
        await updateOnboardingStepInDatabase(3)
        await refreshProfile()
        trackOnboardingStep(CURRENT_STEP, true)

        router.push("/onboarding/step3")
      } else if (data.status === "failed") {
        stopPolling()

        setIsAnalyzing(false)
        setError(data.errorMessage || "Analysis failed. Please try again.")
      }
    } catch (err) {
      console.error("[Step2] Polling error:", err)
    }
  }, [refreshProfile, router, stopPolling])

  /**
   * Cleanup polling on unmount
   */
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [])

  /**
   * Triggers the Inngest company analysis workflow
   */
  const handleAnalyze = async () => {
    if (!companyName.trim() || !companyLink.trim()) {
      setError("Company name and website URL are required.")
      return
    }

    setError(null)
    setIsAnalyzing(true)
    setAnalysisStatus({ status: "pending", progress: 0, currentStep: "Starting analysis..." })

    try {
      const response = await fetch("/api/company-context/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          websiteUrl: companyLink.trim(),
          industry: industry || undefined,
          targetAudienceInput: targetAudience.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string }
        setIsAnalyzing(false)
        setError(errorData.error || "Failed to start analysis. Please try again.")
        return
      }

      // Start polling for status with timeout tracking
      pollingStartRef.current = Date.now()
      pollingRef.current = setInterval(pollStatus, POLL_INTERVAL)
      // Also poll immediately
      pollStatus()
    } catch {
      setIsAnalyzing(false)
      setError("An error occurred. Please try again.")
    }
  }

  /**
   * Skips analysis and proceeds to step 3 with basic data only
   */
  const handleSkip = async () => {
    // Update step progress in database
    await updateOnboardingStepInDatabase(3)
    await refreshProfile()
    trackOnboardingStep(CURRENT_STEP, false)
    router.push("/onboarding/step3")
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isAnalyzing && analysisStatus) {
    return (
      <AnalyzingState
        companyLink={companyLink}
        status={analysisStatus}
      />
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-4xl mx-auto p-6 bg-background">
      <div className="flex-1 flex flex-col">
        {/* Heading */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold">Tell Us About Your Company</h2>
          <p className="text-sm text-muted-foreground">
            We&apos;ll use AI to analyze your website and extract key context
            for personalized content generation.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 flex-1">
          {/* Form fields */}
          <div className="flex-1 flex flex-col space-y-5">
            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="company-name">
                Company name{" "}
                <span className="text-red-500 text-xs align-top">Required</span>
              </Label>
              <Input
                id="company-name"
                type="text"
                placeholder="Enter your company name"
                className="h-10"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>

            {/* Company Website */}
            <div className="space-y-2">
              <Label htmlFor="company-link">
                Company website URL{" "}
                <span className="text-red-500 text-xs align-top">Required</span>
              </Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="company-link"
                  type="url"
                  placeholder="https://yourcompany.com"
                  className="h-10 pl-9"
                  value={companyLink}
                  onChange={(e) => setCompanyLink(e.target.value)}
                />
              </div>
            </div>

            {/* Industry Dropdown */}
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <Label htmlFor="target-audience">Target Audience</Label>
              <Textarea
                id="target-audience"
                placeholder="Describe your ideal customers (e.g., B2B SaaS founders, marketing managers at mid-size companies...)"
                className="min-h-[80px] resize-none"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-950/20">
                <Info className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-red-600 text-sm dark:text-red-400" role="alert">
                  {error}
                </p>
              </div>
            )}

            {/* Info Box */}
            <Alert className="border border-dashed border-border bg-muted/30 rounded-xl">
              <Sparkles className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm text-muted-foreground">
                Our AI will scan your website to extract your value proposition,
                products, target audience, and brand tone. This powers personalized
                LinkedIn content generation.
              </AlertDescription>
            </Alert>
          </div>

          {/* Right Sidebar */}
          <div className="lg:w-80">
            <Alert className="border border-border bg-muted/30 rounded-xl h-full flex flex-col justify-between p-4">
              <div>
                <h3 className="font-medium text-base mb-1 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Why complete this step?
                </h3>
                <AlertDescription className="text-sm text-muted-foreground mb-4">
                  AI analysis of your company enables smarter content suggestions,
                  better audience targeting, and personalized post templates.
                </AlertDescription>

                <h3 className="font-medium text-base mt-2">What we extract</h3>
                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                    Value proposition
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Products &amp; services
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                    Target audience / ICP
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Tone of voice
                  </li>
                </ul>
              </div>
            </Alert>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => router.push("/onboarding/step1")}
          >
            Back
          </Button>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={handleSkip}>
              Skip
            </Button>
            <Button
              onClick={handleAnalyze}
              disabled={!companyName.trim() || !companyLink.trim()}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Analyze Website
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Analysis step configuration
 */
const ANALYSIS_STEPS = [
  { status: "scraping", label: "Scraping website content", icon: Globe },
  { status: "researching", label: "Researching company information", icon: Building2 },
  { status: "analyzing", label: "Extracting company insights", icon: Sparkles },
] as const

/**
 * Animated loading state shown while AI analyzes the company website
 * @param props - Component props
 * @param props.companyLink - The URL being analyzed
 * @param props.status - Current analysis status
 * @returns Loading state JSX
 */
function AnalyzingState({
  companyLink,
  status,
}: {
  companyLink: string
  status: AnalysisStatus
}) {
  const [dots, setDots] = useState("")

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  /**
   * Determines the state of each step
   */
  const getStepState = (stepStatus: string): "completed" | "active" | "pending" => {
    const stepOrder = ["scraping", "researching", "analyzing", "completed"]
    const currentIndex = stepOrder.indexOf(status.status)
    const stepIndex = stepOrder.indexOf(stepStatus)

    if (stepIndex < currentIndex) return "completed"
    if (stepIndex === currentIndex) return "active"
    return "pending"
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 w-full max-w-4xl mx-auto p-6">
      {/* Gradient spinner */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-primary/60 rounded-full blur-xl opacity-30 animate-pulse" />
        <div className="relative bg-background border border-border/60 rounded-full p-6">
          <Sparkles className="h-12 w-12 text-primary animate-pulse" />
        </div>
      </div>

      {/* Text */}
      <div className="text-center space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">
          AI is analyzing your company{dots}
        </h2>
        <p className="text-muted-foreground max-w-md">
          {status.currentStep}
        </p>
      </div>

      {/* Processing indicator */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>Processing {companyLink}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full bg-primary transition-all duration-500"
            )}
            style={{ width: `${status.progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {status.progress}% complete
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex flex-col gap-3 mt-4">
        {ANALYSIS_STEPS.map((step) => {
          const state = getStepState(step.status)
          const Icon = step.icon

          return (
            <div
              key={step.status}
              className={cn(
                "flex items-center gap-3 text-sm",
                state === "completed" && "text-emerald-600 dark:text-emerald-400",
                state === "active" && "text-primary font-medium",
                state === "pending" && "text-muted-foreground"
              )}
            >
              {state === "completed" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : state === "active" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icon className="h-4 w-4 opacity-50" />
              )}
              <span>{step.label}</span>
            </div>
          )
        })}
      </div>

      {/* Error state */}
      {status.status === "failed" && status.errorMessage && (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mt-4">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{status.errorMessage}</span>
        </div>
      )}
    </div>
  )
}
