"use client"

/**
 * Onboarding Step 4 - Review & Complete
 * @description Final onboarding step - Review AI-extracted company context,
 * edit if needed, and complete onboarding. Data is loaded from the database.
 * @module app/onboarding/step4/page
 */

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  Package,
  Target,
  MessageSquare,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  PartyPopper,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { trackOnboardingStep } from "@/lib/analytics"
import { useOnboardingGuard } from "@/hooks/use-onboarding-guard"
import { completeOnboardingInDatabase } from "@/services/onboarding"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

/* ------------------------------------------------------------------ */
/*                         TYPE DEFINITIONS                          */
/* ------------------------------------------------------------------ */

/**
 * Product or service entry
 */
interface ProductEntry {
  name: string
  description: string
}

/**
 * Target audience / ICP data
 */
interface TargetAudienceData {
  industries: string[]
  companySize: string
  roles: string[]
  painPoints: string[]
}

/**
 * Tone of voice data
 */
interface ToneOfVoiceData {
  descriptors: string[]
  writingStyle: string
  examples: string[]
}

/**
 * Company context from database
 */
interface CompanyContext {
  id: string
  company_name: string
  website_url?: string
  industry?: string
  value_proposition?: string
  company_summary?: string
  products_and_services: ProductEntry[]
  target_audience: TargetAudienceData
  tone_of_voice: ToneOfVoiceData
  brand_colors: string[]
  status: string
}

/**
 * Full analysis data shape for UI
 */
interface CompanyAnalysis {
  valueProposition: string
  productsAndServices: ProductEntry[]
  targetAudience: TargetAudienceData
  toneOfVoice: ToneOfVoiceData
  brandColors: string[]
  summary: string
}

/**
 * Color scheme configuration for section blocks
 */
type ColorScheme = "blue" | "emerald" | "violet" | "amber"

/**
 * Default empty analysis structure
 */
const EMPTY_ANALYSIS: CompanyAnalysis = {
  valueProposition: "",
  productsAndServices: [],
  targetAudience: {
    industries: [],
    companySize: "",
    roles: [],
    painPoints: [],
  },
  toneOfVoice: {
    descriptors: [],
    writingStyle: "",
    examples: [],
  },
  brandColors: [],
  summary: "",
}

/* ------------------------------------------------------------------ */
/*                        MAIN PAGE COMPONENT                        */
/* ------------------------------------------------------------------ */

/** Current step number for this page */
const CURRENT_STEP = 4

/**
 * Step 4 - Review & Complete
 * Final onboarding step. Displays AI-extracted data from database
 * for review and editing. Completes onboarding when finished.
 * @returns Step 4 page JSX
 */
export default function Step4() {
  const router = useRouter()
  const { checking } = useOnboardingGuard()
  const { refreshProfile } = useAuthContext()

  const [analysis, setAnalysis] = useState<CompanyAnalysis>(EMPTY_ANALYSIS)
  const [companyName, setCompanyName] = useState("")
  const [companyContextId, setCompanyContextId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [hasData, setHasData] = useState(false)

  // Dialog states
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false)
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [productEditIndex, setProductEditIndex] = useState<number | null>(null)
  const [audienceDialogOpen, setAudienceDialogOpen] = useState(false)
  const [toneDialogOpen, setToneDialogOpen] = useState(false)

  // Draft states for dialogs
  const [valuePropDraft, setValuePropDraft] = useState("")
  const [summaryDraft, setSummaryDraft] = useState("")
  const [productDraft, setProductDraft] = useState<ProductEntry>({
    name: "",
    description: "",
  })
  const [audienceDraft, setAudienceDraft] = useState<TargetAudienceData>({
    industries: [],
    companySize: "",
    roles: [],
    painPoints: [],
  })
  const [toneDraft, setToneDraft] = useState<ToneOfVoiceData>({
    descriptors: [],
    writingStyle: "",
    examples: [],
  })

  /**
   * Loads company context from database on mount
   */
  useEffect(() => {
    if (checking) return

    async function loadCompanyContext() {
      try {
        const response = await fetch("/api/company-context")
        if (!response.ok) {
          setLoading(false)
          return
        }

        const data = (await response.json()) as CompanyContext | null

        if (data && data.status === "completed") {
          setCompanyName(data.company_name)
          setCompanyContextId(data.id)

          // Map database structure to UI structure
          const mapped: CompanyAnalysis = {
            valueProposition: data.value_proposition || "",
            summary: data.company_summary || "",
            productsAndServices: Array.isArray(data.products_and_services)
              ? data.products_and_services
              : [],
            targetAudience: {
              industries: data.target_audience?.industries || [],
              companySize: data.target_audience?.companySize || "",
              roles: data.target_audience?.roles || [],
              painPoints: data.target_audience?.painPoints || [],
            },
            toneOfVoice: {
              descriptors: data.tone_of_voice?.descriptors || [],
              writingStyle: data.tone_of_voice?.writingStyle || "",
              examples: data.tone_of_voice?.examples || [],
            },
            brandColors: Array.isArray(data.brand_colors) ? data.brand_colors : [],
          }

          setAnalysis(mapped)
          setHasData(true)
        }
      } catch (err) {
        console.error("Failed to load company context:", err)
      } finally {
        setLoading(false)
      }
    }

    loadCompanyContext()
  }, [checking])

  /**
   * Saves analysis data to database
   * @param updater - Callback to update the analysis state
   */
  const updateAnalysis = useCallback(
    async (updater: (prev: CompanyAnalysis) => CompanyAnalysis) => {
      setAnalysis((prev) => {
        const updated = updater(prev)

        // Background sync to database
        setSaving(true)
        fetch("/api/company-context", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName,
            valueProposition: updated.valueProposition,
            companySummary: updated.summary,
            productsAndServices: updated.productsAndServices,
            targetAudience: updated.targetAudience,
            toneOfVoice: updated.toneOfVoice,
            brandColors: updated.brandColors,
          }),
        })
          .then(() => setSaving(false))
          .catch(() => setSaving(false))

        return updated
      })
    },
    [companyName]
  )

  if (checking || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading brand context...
          </p>
        </div>
      </div>
    )
  }

  if (!hasData) {
    return (
      <div className="flex flex-col gap-8 max-w-4xl mx-auto">
        <div className="flex flex-col items-center gap-4 text-center py-20">
          <AlertCircle className="h-10 w-10 text-muted-foreground" />
          <p className="text-lg font-semibold">No analysis data available</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Please go back to Step 3 and run the AI analysis on your company
            website first.
          </p>
          <Button onClick={() => router.push("/onboarding/step3")}>
            Go to Step 3
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Review Brand Context
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Review and refine the AI-extracted context for{" "}
            <span className="font-medium text-foreground">{companyName}</span>.
            All edits save automatically.
          </p>
        </div>
        {saving && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Saving...</span>
          </div>
        )}
      </div>

      {/* Info alert */}
      <Alert className="bg-primary/5 border-primary/20 rounded-xl">
        <AlertCircle className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          This data powers personalized LinkedIn content generation. Edit any
          section to refine the AI&apos;s understanding of your brand.
        </AlertDescription>
      </Alert>

      {/* ========================= COMPANY INFO SECTION ========================= */}
      <SectionBlock
        title="Company Information"
        icon={<Building2 className="h-5 w-5" />}
        colorScheme="blue"
        onEdit={() => {
          setValuePropDraft(analysis.valueProposition)
          setSummaryDraft(analysis.summary)
          setCompanyDialogOpen(true)
        }}
      >
        <FieldDisplay label="Company" value={companyName} />
        <FieldDisplay
          label="Value Proposition"
          value={analysis.valueProposition || "Not extracted"}
          multiline
        />
        <FieldDisplay
          label="Summary"
          value={analysis.summary || "Not extracted"}
          multiline
        />
        {analysis.brandColors.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              Brand Colors
            </div>
            <div className="flex gap-2">
              {analysis.brandColors.map((color, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div
                    className="h-5 w-5 rounded-full border border-border"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs text-muted-foreground">{color}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionBlock>

      {/* ========================= PRODUCTS SECTION ========================= */}
      <SectionBlock
        title="Products & Services"
        icon={<Package className="h-5 w-5" />}
        colorScheme="emerald"
        actionLabel="Add Product"
        onAction={() => {
          setProductDraft({ name: "", description: "" })
          setProductEditIndex(null)
          setProductDialogOpen(true)
        }}
      >
        {analysis.productsAndServices.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No products extracted. Click &quot;Add Product&quot; to add one.
          </p>
        ) : (
          <div className="space-y-3">
            {analysis.productsAndServices.map((product, i) => (
              <SubItem
                key={i}
                title={product.name}
                description={product.description}
                colorScheme="emerald"
                onEdit={() => {
                  setProductDraft(product)
                  setProductEditIndex(i)
                  setProductDialogOpen(true)
                }}
                onDelete={() =>
                  updateAnalysis((prev) => ({
                    ...prev,
                    productsAndServices: prev.productsAndServices.filter(
                      (_, idx) => idx !== i
                    ),
                  }))
                }
              />
            ))}
          </div>
        )}
      </SectionBlock>

      {/* ========================= TARGET AUDIENCE SECTION ========================= */}
      <SectionBlock
        title="Target Audience / ICP"
        icon={<Target className="h-5 w-5" />}
        colorScheme="violet"
        onEdit={() => {
          setAudienceDraft({ ...analysis.targetAudience })
          setAudienceDialogOpen(true)
        }}
      >
        <FieldDisplay
          label="Industries"
          value={
            analysis.targetAudience.industries.length > 0
              ? analysis.targetAudience.industries.join(", ")
              : "Not specified"
          }
        />
        <FieldDisplay
          label="Company Size"
          value={analysis.targetAudience.companySize || "Not specified"}
        />
        {analysis.targetAudience.roles.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              Target Roles
            </div>
            <div className="flex flex-wrap gap-1.5">
              {analysis.targetAudience.roles.map((role, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {role}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {analysis.targetAudience.painPoints.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              Pain Points
            </div>
            <ul className="text-sm space-y-1">
              {analysis.targetAudience.painPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500 mt-1.5 shrink-0" />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}
      </SectionBlock>

      {/* ========================= TONE SECTION ========================= */}
      <SectionBlock
        title="Tone & Voice"
        icon={<MessageSquare className="h-5 w-5" />}
        colorScheme="amber"
        onEdit={() => {
          setToneDraft({ ...analysis.toneOfVoice })
          setToneDialogOpen(true)
        }}
      >
        {analysis.toneOfVoice.descriptors.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              Tone Descriptors
            </div>
            <div className="flex flex-wrap gap-1.5">
              {analysis.toneOfVoice.descriptors.map((desc, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {desc}
                </Badge>
              ))}
            </div>
          </div>
        )}
        <FieldDisplay
          label="Writing Style"
          value={analysis.toneOfVoice.writingStyle || "Not analyzed"}
          multiline
        />
        {analysis.toneOfVoice.examples.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              Example Phrases
            </div>
            <div className="space-y-1.5">
              {analysis.toneOfVoice.examples.map((example, i) => (
                <p
                  key={i}
                  className="text-sm italic text-muted-foreground border-l-2 border-amber-300 pl-3"
                >
                  &quot;{example}&quot;
                </p>
              ))}
            </div>
          </div>
        )}
      </SectionBlock>

      {/* ========================= DIALOGS ========================= */}

      {/* Company Info Dialog */}
      <Dialog open={companyDialogOpen} onOpenChange={setCompanyDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Company Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Value Proposition</Label>
              <Textarea
                value={valuePropDraft}
                onChange={(e) => setValuePropDraft(e.target.value)}
                rows={3}
                placeholder="Your company's core value proposition..."
              />
            </div>
            <div className="space-y-2">
              <Label>Summary</Label>
              <Textarea
                value={summaryDraft}
                onChange={(e) => setSummaryDraft(e.target.value)}
                rows={3}
                placeholder="Brief company summary..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompanyDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateAnalysis((prev) => ({
                  ...prev,
                  valueProposition: valuePropDraft,
                  summary: summaryDraft,
                }))
                setCompanyDialogOpen(false)
                toast.success("Company info updated")
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {productEditIndex !== null ? "Edit Product" : "Add Product"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product / Service Name</Label>
              <Input
                value={productDraft.name}
                onChange={(e) =>
                  setProductDraft((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="Product name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={productDraft.description}
                onChange={(e) =>
                  setProductDraft((p) => ({
                    ...p,
                    description: e.target.value,
                  }))
                }
                rows={3}
                placeholder="Brief description..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProductDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateAnalysis((prev) => {
                  const arr = [...prev.productsAndServices]
                  if (productEditIndex !== null) {
                    arr[productEditIndex] = productDraft
                  } else {
                    arr.push(productDraft)
                  }
                  return { ...prev, productsAndServices: arr }
                })
                setProductDialogOpen(false)
                toast.success(
                  productEditIndex !== null
                    ? "Product updated"
                    : "Product added"
                )
              }}
              disabled={!productDraft.name.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audience Dialog */}
      <Dialog open={audienceDialogOpen} onOpenChange={setAudienceDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Target Audience / ICP</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Target Industries (comma-separated)</Label>
              <Textarea
                value={audienceDraft.industries.join(", ")}
                onChange={(e) =>
                  setAudienceDraft((p) => ({
                    ...p,
                    industries: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
                rows={2}
                placeholder="SaaS, Fintech, Healthcare..."
              />
            </div>
            <div className="space-y-2">
              <Label>Company Size</Label>
              <Input
                value={audienceDraft.companySize}
                onChange={(e) =>
                  setAudienceDraft((p) => ({
                    ...p,
                    companySize: e.target.value,
                  }))
                }
                placeholder="e.g., 50-500 employees"
              />
            </div>
            <div className="space-y-2">
              <Label>Target Roles (comma-separated)</Label>
              <Textarea
                value={audienceDraft.roles.join(", ")}
                onChange={(e) =>
                  setAudienceDraft((p) => ({
                    ...p,
                    roles: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
                rows={2}
                placeholder="VP Marketing, Head of Growth..."
              />
            </div>
            <div className="space-y-2">
              <Label>Pain Points (comma-separated)</Label>
              <Textarea
                value={audienceDraft.painPoints.join(", ")}
                onChange={(e) =>
                  setAudienceDraft((p) => ({
                    ...p,
                    painPoints: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
                rows={3}
                placeholder="Inconsistent posting, low engagement..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAudienceDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateAnalysis((prev) => ({
                  ...prev,
                  targetAudience: audienceDraft,
                }))
                setAudienceDialogOpen(false)
                toast.success("Target audience updated")
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tone Dialog */}
      <Dialog open={toneDialogOpen} onOpenChange={setToneDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tone &amp; Voice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tone Descriptors (comma-separated)</Label>
              <Input
                value={toneDraft.descriptors.join(", ")}
                onChange={(e) =>
                  setToneDraft((p) => ({
                    ...p,
                    descriptors: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
                placeholder="Professional, Friendly, Authoritative..."
              />
            </div>
            <div className="space-y-2">
              <Label>Writing Style</Label>
              <Textarea
                value={toneDraft.writingStyle}
                onChange={(e) =>
                  setToneDraft((p) => ({
                    ...p,
                    writingStyle: e.target.value,
                  }))
                }
                rows={3}
                placeholder="Describe the brand's writing style..."
              />
            </div>
            <div className="space-y-2">
              <Label>Example Phrases (one per line)</Label>
              <Textarea
                value={toneDraft.examples.join("\n")}
                onChange={(e) =>
                  setToneDraft((p) => ({
                    ...p,
                    examples: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
                rows={4}
                placeholder="Enter example phrases, one per line..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setToneDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                updateAnalysis((prev) => ({
                  ...prev,
                  toneOfVoice: toneDraft,
                }))
                setToneDialogOpen(false)
                toast.success("Tone & voice updated")
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================= NAVIGATION ========================= */}
      <div className="flex justify-between pt-4 pb-8">
        <Button
          variant="outline"
          onClick={() => router.push("/onboarding/step3")}
        >
          Back
        </Button>
        <Button
          onClick={async () => {
            setCompleting(true)
            try {
              // Complete onboarding in database
              await completeOnboardingInDatabase()
              // Refresh profile to sync auth context with database
              await refreshProfile()
              trackOnboardingStep(CURRENT_STEP, true)

              toast.success("Welcome to ChainLinked! 🎉")
              router.push("/dashboard")
            } catch (err) {
              console.error("Failed to complete onboarding:", err)
              toast.error("Failed to complete setup. Please try again.")
              setCompleting(false)
            }
          }}
          disabled={completing}
          className="gap-2"
        >
          {completing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Completing...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Complete Setup
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*                      PRESENTATION COMPONENTS                      */
/* ------------------------------------------------------------------ */

/**
 * Color mapping for section block themes
 */
const COLOR_MAP: Record<
  ColorScheme,
  {
    border: string
    bg: string
    icon: string
    hover: string
  }
> = {
  blue: {
    border: "border-l-sky-500",
    bg: "bg-sky-500/5",
    icon: "text-sky-500",
    hover: "hover:bg-sky-500/10",
  },
  emerald: {
    border: "border-l-emerald-500",
    bg: "bg-emerald-500/5",
    icon: "text-emerald-500",
    hover: "hover:bg-emerald-500/10",
  },
  violet: {
    border: "border-l-violet-500",
    bg: "bg-violet-500/5",
    icon: "text-violet-500",
    hover: "hover:bg-violet-500/10",
  },
  amber: {
    border: "border-l-amber-500",
    bg: "bg-amber-500/5",
    icon: "text-amber-500",
    hover: "hover:bg-amber-500/10",
  },
}

/**
 * Editable section block with colored left border and icon
 * @param props - Section block props
 * @param props.title - Section title
 * @param props.icon - Section icon element
 * @param props.colorScheme - Color theme for the section
 * @param props.onEdit - Handler for edit button click
 * @param props.onAction - Handler for action button click (e.g., "Add")
 * @param props.actionLabel - Label for the action button
 * @param props.children - Section content
 * @returns Section block JSX
 */
function SectionBlock({
  title,
  icon,
  colorScheme,
  onEdit,
  onAction,
  actionLabel,
  children,
}: {
  title: string
  icon: React.ReactNode
  colorScheme: ColorScheme
  onEdit?: () => void
  onAction?: () => void
  actionLabel?: string
  children: React.ReactNode
}) {
  const colors = COLOR_MAP[colorScheme]

  return (
    <Card
      className={cn(
        "border-l-4 overflow-hidden",
        colors.border,
        colors.bg
      )}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <span className={colors.icon}>{icon}</span>
            {title}
          </CardTitle>
          <div className="flex gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            )}
            {onAction && (
              <Button variant="outline" size="sm" onClick={onAction}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                {actionLabel}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

/**
 * Displays a labeled field value
 * @param props - Field display props
 * @param props.label - Field label
 * @param props.value - Field value
 * @param props.multiline - Whether to allow multi-line display
 * @returns Field display JSX
 */
function FieldDisplay({
  label,
  value,
  multiline = false,
}: {
  label: string
  value: string
  multiline?: boolean
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
        {label}
      </div>
      <div className={cn("text-sm", multiline && "leading-relaxed")}>
        {value || "---"}
      </div>
    </div>
  )
}

/**
 * Color mapping for sub-items
 */
const SUB_ITEM_COLORS: Record<
  ColorScheme,
  { border: string; bg: string; hover: string }
> = {
  blue: {
    border: "border-sky-200/40 dark:border-sky-500/20",
    bg: "bg-sky-500/5",
    hover: "hover:bg-sky-500/10",
  },
  emerald: {
    border: "border-emerald-200/40 dark:border-emerald-500/20",
    bg: "bg-emerald-500/5",
    hover: "hover:bg-emerald-500/10",
  },
  violet: {
    border: "border-violet-200/40 dark:border-violet-500/20",
    bg: "bg-violet-500/5",
    hover: "hover:bg-violet-500/10",
  },
  amber: {
    border: "border-amber-200/40 dark:border-amber-500/20",
    bg: "bg-amber-500/5",
    hover: "hover:bg-amber-500/10",
  },
}

/**
 * Individual editable/deletable item within a section
 * @param props - Sub item props
 * @param props.title - Item title
 * @param props.description - Item description
 * @param props.colorScheme - Color theme
 * @param props.onEdit - Edit handler
 * @param props.onDelete - Delete handler
 * @returns Sub item JSX
 */
function SubItem({
  title,
  description,
  colorScheme,
  onEdit,
  onDelete,
}: {
  title: string
  description?: string
  colorScheme: ColorScheme
  onEdit: () => void
  onDelete: () => void
}) {
  const colors = SUB_ITEM_COLORS[colorScheme]

  return (
    <div
      className={cn(
        "rounded-xl border p-4 flex flex-col space-y-2 transition-all duration-200",
        colors.border,
        colors.bg,
        colors.hover
      )}
    >
      <div className="font-medium text-sm">{title}</div>
      {description && (
        <div className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onEdit} className="h-7">
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-7 text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
