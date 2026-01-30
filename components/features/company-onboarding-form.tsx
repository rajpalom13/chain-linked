/**
 * Company Context Onboarding Form Component
 * @description A comprehensive form for collecting company context during onboarding.
 * Supports AI-powered website analysis to auto-populate fields.
 * @module components/features/company-onboarding-form
 */

"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  IconBuilding,
  IconGlobe,
  IconLoader2,
  IconSparkles,
  IconTargetArrow,
  IconPackage,
  IconBulb,
  IconCheck,
  IconAlertCircle,
  IconRefresh,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  type CompanyContextData,
  saveCompanyContext,
  saveCompanyContextToStorage,
  getCompanyContextFromStorage,
} from "@/services/onboarding"

/**
 * Zod validation schema for company context form
 */
const companyContextSchema = z.object({
  companyWebsite: z
    .string()
    .min(1, "Website URL is required")
    .refine(
      (val) => {
        try {
          const url = val.startsWith("http") ? val : `https://${val}`
          new URL(url)
          return true
        } catch {
          return false
        }
      },
      { message: "Please enter a valid URL" }
    ),
  companyName: z
    .string()
    .min(1, "Company name is required")
    .max(100, "Company name must be less than 100 characters"),
  companyDescription: z
    .string()
    .min(10, "Please provide a brief description (at least 10 characters)")
    .max(2000, "Description must be less than 2000 characters"),
  companyProducts: z
    .string()
    .min(5, "Please list at least one product or service")
    .max(2000, "Products list must be less than 2000 characters"),
  companyIcp: z
    .string()
    .min(10, "Please describe your ideal customer (at least 10 characters)")
    .max(1500, "ICP description must be less than 1500 characters"),
  companyValueProps: z
    .string()
    .min(10, "Please list at least one value proposition")
    .max(1500, "Value propositions must be less than 1500 characters"),
})

/**
 * Form values type inferred from schema
 */
type CompanyContextFormValues = z.infer<typeof companyContextSchema>

/**
 * Props for the CompanyOnboardingForm component
 */
export interface CompanyOnboardingFormProps {
  /** Callback fired when form is submitted successfully */
  onComplete: (data: CompanyContextData) => void
  /** Callback fired when user chooses to skip */
  onSkip?: () => void
  /** Whether to show skip button */
  showSkip?: boolean
  /** Initial data to pre-populate the form */
  initialData?: Partial<CompanyContextData>
  /** Custom class name */
  className?: string
}

/**
 * Company Context Onboarding Form Component
 *
 * A comprehensive form for collecting company context during onboarding.
 * Features:
 * - AI-powered website analysis to auto-populate fields
 * - Real-time form validation with Zod
 * - Persistent form state via localStorage
 * - Loading states for analysis and submission
 * - Error handling with user feedback
 *
 * @param props - Component props
 * @returns Company context onboarding form JSX
 * @example
 * ```tsx
 * <CompanyOnboardingForm
 *   onComplete={(data) => router.push('/dashboard')}
 *   onSkip={() => router.push('/dashboard')}
 *   showSkip={true}
 * />
 * ```
 */
export function CompanyOnboardingForm({
  onComplete,
  onSkip,
  showSkip = false,
  initialData,
  className,
}: CompanyOnboardingFormProps) {
  // Form state
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [analysisError, setAnalysisError] = React.useState<string | null>(null)
  const [hasAnalyzed, setHasAnalyzed] = React.useState(false)
  const [confidenceScore, setConfidenceScore] = React.useState<number | null>(null)

  // React Hook Form setup
  const form = useForm<CompanyContextFormValues>({
    resolver: zodResolver(companyContextSchema),
    defaultValues: {
      companyWebsite: initialData?.companyWebsite || "",
      companyName: initialData?.companyName || "",
      companyDescription: initialData?.companyDescription || "",
      companyProducts: initialData?.companyProducts || "",
      companyIcp: initialData?.companyIcp || "",
      companyValueProps: initialData?.companyValueProps || "",
    },
    mode: "onBlur",
  })

  const { register, handleSubmit, setValue, watch, formState } = form
  const { errors } = formState
  const websiteUrl = watch("companyWebsite")

  /**
   * Load saved form data from localStorage on mount
   */
  React.useEffect(() => {
    const savedData = getCompanyContextFromStorage()
    if (savedData && !initialData) {
      setValue("companyWebsite", savedData.companyWebsite)
      setValue("companyName", savedData.companyName)
      setValue("companyDescription", savedData.companyDescription)
      setValue("companyProducts", savedData.companyProducts)
      setValue("companyIcp", savedData.companyIcp)
      setValue("companyValueProps", savedData.companyValueProps)
      if (savedData.companyName) {
        setHasAnalyzed(true)
      }
    }
  }, [setValue, initialData])

  /**
   * Save form data to localStorage when values change
   */
  React.useEffect(() => {
    const subscription = form.watch((values) => {
      if (values.companyName) {
        saveCompanyContextToStorage(values as CompanyContextData)
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

  /**
   * Handles AI analysis of the website URL
   */
  const handleAnalyze = async () => {
    const url = websiteUrl?.trim()
    if (!url) {
      setAnalysisError("Please enter a website URL first")
      return
    }

    setIsAnalyzing(true)
    setAnalysisError(null)

    try {
      const response = await fetch("/api/company/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: url,
          companyName: form.getValues("companyName") || undefined,
        }),
      })

      const result = (await response.json()) as {
        success?: boolean
        data?: {
          companyName: string
          companyDescription: string
          companyProducts: string
          companyIcp: string
          companyValueProps: string
          websiteUrl: string
          confidenceScore: number
        }
        error?: string
      }

      if (!response.ok || !result.success || !result.data) {
        setAnalysisError(result.error || "Failed to analyze website. Please try again.")
        setIsAnalyzing(false)
        return
      }

      // Populate form with AI-generated data
      setValue("companyName", result.data.companyName, { shouldValidate: true })
      setValue("companyDescription", result.data.companyDescription, { shouldValidate: true })
      setValue("companyProducts", result.data.companyProducts, { shouldValidate: true })
      setValue("companyIcp", result.data.companyIcp, { shouldValidate: true })
      setValue("companyValueProps", result.data.companyValueProps, { shouldValidate: true })
      setValue("companyWebsite", result.data.websiteUrl, { shouldValidate: true })

      setConfidenceScore(result.data.confidenceScore)
      setHasAnalyzed(true)
    } catch (error) {
      console.error("Analysis error:", error)
      setAnalysisError("An error occurred during analysis. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  /**
   * Handles form submission
   */
  const onSubmit = async (data: CompanyContextFormValues) => {
    setIsSubmitting(true)

    try {
      // Normalize website URL
      let normalizedUrl = data.companyWebsite.trim()
      if (!normalizedUrl.startsWith("http")) {
        normalizedUrl = `https://${normalizedUrl}`
      }

      const contextData: CompanyContextData = {
        companyWebsite: normalizedUrl,
        companyName: data.companyName.trim(),
        companyDescription: data.companyDescription.trim(),
        companyProducts: data.companyProducts.trim(),
        companyIcp: data.companyIcp.trim(),
        companyValueProps: data.companyValueProps.trim(),
      }

      // Save to Supabase
      const result = await saveCompanyContext(contextData)

      if (!result.success) {
        setAnalysisError(result.error || "Failed to save company context. Please try again.")
        setIsSubmitting(false)
        return
      }

      onComplete(contextData)
    } catch (error) {
      console.error("Submit error:", error)
      setAnalysisError("An error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLoading = isAnalyzing || isSubmitting

  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <IconBuilding className="h-8 w-8 text-primary" />
        </div>
        <div>
          <CardTitle className="text-2xl font-bold">Tell us about your company</CardTitle>
          <CardDescription className="mt-2">
            This context helps AI generate personalized LinkedIn content for your brand.
            Enter your website URL and we&apos;ll extract the details automatically.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Website URL with Analyze Button */}
          <div className="space-y-2">
            <Label htmlFor="companyWebsite" className="flex items-center gap-2">
              <IconGlobe className="h-4 w-4" />
              Company Website
              <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="companyWebsite"
                type="text"
                placeholder="https://yourcompany.com"
                {...register("companyWebsite")}
                disabled={isLoading}
                className={cn(errors.companyWebsite && "border-destructive")}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAnalyze}
                disabled={isLoading || !websiteUrl?.trim()}
                className="shrink-0"
              >
                {isAnalyzing ? (
                  <>
                    <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : hasAnalyzed ? (
                  <>
                    <IconRefresh className="h-4 w-4 mr-2" />
                    Re-analyze
                  </>
                ) : (
                  <>
                    <IconSparkles className="h-4 w-4 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
            </div>
            {errors.companyWebsite && (
              <p className="text-sm text-destructive">{errors.companyWebsite.message}</p>
            )}
          </div>

          {/* Analysis Status */}
          {hasAnalyzed && confidenceScore !== null && (
            <Alert className="bg-primary/5 border-primary/20">
              <IconCheck className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                AI analysis complete with {confidenceScore}% confidence. Review and edit the
                details below as needed.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Alert */}
          {analysisError && (
            <Alert variant="destructive">
              <IconAlertCircle className="h-4 w-4" />
              <AlertDescription>{analysisError}</AlertDescription>
            </Alert>
          )}

          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="companyName" className="flex items-center gap-2">
              <IconBuilding className="h-4 w-4" />
              Company Name
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="companyName"
              type="text"
              placeholder="Acme Inc."
              {...register("companyName")}
              disabled={isLoading}
              className={cn(errors.companyName && "border-destructive")}
            />
            {errors.companyName && (
              <p className="text-sm text-destructive">{errors.companyName.message}</p>
            )}
          </div>

          {/* Company Description */}
          <div className="space-y-2">
            <Label htmlFor="companyDescription" className="flex items-center gap-2">
              <IconBulb className="h-4 w-4" />
              Company Description
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="companyDescription"
              placeholder="Describe what your company does, its mission, and market position..."
              rows={4}
              {...register("companyDescription")}
              disabled={isLoading}
              className={cn(errors.companyDescription && "border-destructive")}
            />
            {errors.companyDescription && (
              <p className="text-sm text-destructive">{errors.companyDescription.message}</p>
            )}
          </div>

          {/* Products & Services */}
          <div className="space-y-2">
            <Label htmlFor="companyProducts" className="flex items-center gap-2">
              <IconPackage className="h-4 w-4" />
              Products & Services
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="companyProducts"
              placeholder="List your main products and/or services:&#10;- Product A: Brief description&#10;- Service B: Brief description"
              rows={4}
              {...register("companyProducts")}
              disabled={isLoading}
              className={cn(errors.companyProducts && "border-destructive")}
            />
            {errors.companyProducts && (
              <p className="text-sm text-destructive">{errors.companyProducts.message}</p>
            )}
          </div>

          {/* Ideal Customer Profile */}
          <div className="space-y-2">
            <Label htmlFor="companyIcp" className="flex items-center gap-2">
              <IconTargetArrow className="h-4 w-4" />
              Ideal Customer Profile (ICP)
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="companyIcp"
              placeholder="Describe your ideal customers: industries, company size, job titles, pain points they have..."
              rows={3}
              {...register("companyIcp")}
              disabled={isLoading}
              className={cn(errors.companyIcp && "border-destructive")}
            />
            {errors.companyIcp && (
              <p className="text-sm text-destructive">{errors.companyIcp.message}</p>
            )}
          </div>

          {/* Value Propositions */}
          <div className="space-y-2">
            <Label htmlFor="companyValueProps" className="flex items-center gap-2">
              <IconSparkles className="h-4 w-4" />
              Key Value Propositions
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="companyValueProps"
              placeholder="List your 3-5 main value propositions or unique selling points:&#10;- Fast implementation&#10;- Industry-leading support"
              rows={3}
              {...register("companyValueProps")}
              disabled={isLoading}
              className={cn(errors.companyValueProps && "border-destructive")}
            />
            {errors.companyValueProps && (
              <p className="text-sm text-destructive">{errors.companyValueProps.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4">
            <Button
              type="submit"
              className="w-full h-11"
              disabled={isLoading || !formState.isValid}
            >
              {isSubmitting ? (
                <>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <IconCheck className="mr-2 h-4 w-4" />
                  Save & Continue
                </>
              )}
            </Button>

            {showSkip && onSkip && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={onSkip}
                disabled={isLoading}
              >
                Skip for now
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
