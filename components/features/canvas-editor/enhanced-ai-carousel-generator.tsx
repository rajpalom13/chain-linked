/**
 * Enhanced AI Carousel Generator
 * @description Multi-step dialog for AI-powered carousel content generation
 * Features polished step indicators, animated generation progress,
 * and smooth transitions between steps
 * @module components/features/canvas-editor/enhanced-ai-carousel-generator
 */

'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  IconSparkles,
  IconLoader2,
  IconCheck,
  IconArrowLeft,
  IconArrowRight,
  IconRefresh,
  IconWand,
  IconLayoutGrid,
  IconPencil,
  IconPalette,
  IconEye,
} from '@tabler/icons-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

import { analyzeTemplate, type TemplateAnalysis } from '@/lib/ai/template-analyzer'
import { buildSlidesFromContent, type GeneratedSlotContent } from '@/lib/ai/carousel-builder'
import type { CarouselTone, CtaType } from '@/lib/ai/carousel-prompts'
import type { CanvasTemplate, CanvasSlide } from '@/types/canvas-editor'

import { TemplateSelectionStep } from './template-selection-step'
import { TopicInputStep } from './topic-input-step'
import { ToneCtaStep } from './tone-cta-step'
import { PreviewStep } from './preview-step'

/**
 * Form data for carousel generation
 */
export interface CarouselFormData {
  topic: string
  audience: string
  industry: string
  keyPoints: string[]
  tone: CarouselTone
  ctaType: CtaType
  customCta: string
}

/**
 * Default form values
 */
const DEFAULT_FORM_DATA: CarouselFormData = {
  topic: '',
  audience: '',
  industry: '',
  keyPoints: [],
  tone: 'professional',
  ctaType: 'follow',
  customCta: ''
}

/**
 * Props for EnhancedAiCarouselGenerator
 * @property open - Whether the dialog is open
 * @property onOpenChange - Callback when dialog open state changes
 * @property onGenerated - Callback with generated slides
 * @property templates - Available canvas templates
 */
interface EnhancedAiCarouselGeneratorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerated: (slides: CanvasSlide[]) => void
  templates: CanvasTemplate[]
}

/**
 * Step configuration for the wizard
 */
const STEPS = [
  { num: 1, label: 'Template', icon: <IconLayoutGrid className="w-3.5 h-3.5" /> },
  { num: 2, label: 'Topic', icon: <IconPencil className="w-3.5 h-3.5" /> },
  { num: 3, label: 'Style', icon: <IconPalette className="w-3.5 h-3.5" /> },
  { num: 4, label: 'Preview', icon: <IconEye className="w-3.5 h-3.5" /> }
] as const

/**
 * Animated progress messages for the generation overlay
 */
const PROGRESS_MESSAGES = [
  'Analyzing your topic and audience...',
  'Structuring the carousel flow...',
  'Crafting compelling headlines...',
  'Writing engaging content for each slide...',
  'Polishing language and tone...',
  'Finalizing your carousel...',
]

/**
 * Step indicator component with connected progress line and icons
 * @param props - Component props
 * @param props.currentStep - The current active step number
 * @param props.totalSteps - Total number of steps
 * @returns Step indicator JSX with connected dots and labels
 */
function StepIndicator({
  currentStep,
}: {
  currentStep: number
  totalSteps: number
}) {
  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {STEPS.map((step, index) => (
        <div key={step.num} className="flex items-center">
          {/* Step dot/icon */}
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                'flex items-center justify-center w-9 h-9 rounded-full text-sm font-medium transition-all duration-300',
                currentStep > step.num
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : currentStep === step.num
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 shadow-md'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {currentStep > step.num ? (
                <IconCheck className="w-4 h-4" />
              ) : (
                step.icon
              )}
            </div>
            <span
              className={cn(
                'text-[11px] font-medium transition-colors duration-300',
                currentStep >= step.num
                  ? 'text-foreground'
                  : 'text-muted-foreground/60'
              )}
            >
              {step.label}
            </span>
          </div>

          {/* Connector line */}
          {index < STEPS.length - 1 && (
            <div
              className={cn(
                'w-10 h-0.5 mx-1.5 mt-[-18px] rounded-full transition-colors duration-500',
                currentStep > step.num ? 'bg-primary' : 'bg-muted'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * Animated generation progress overlay
 * Shows cycling messages and a smooth progress bar during AI generation
 * @param props - Component props
 * @param props.topic - The topic being generated
 * @returns Animated overlay JSX
 */
function GenerationProgressOverlay({ topic }: { topic: string }) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % PROGRESS_MESSAGES.length)
    }, 2400)

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        return prev + Math.random() * 5
      })
    }, 400)

    return () => {
      clearInterval(msgInterval)
      clearInterval(progressInterval)
    }
  }, [])

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-sm space-y-6 text-center px-6">
        {/* Animated icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
              <IconWand className="h-8 w-8 animate-pulse text-primary" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <p className="font-semibold text-lg">Generating your carousel...</p>
          <p className="text-sm text-muted-foreground">This usually takes 5-10 seconds</p>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500 ease-out"
              style={{ width: `${Math.min(progress, 95)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground transition-opacity duration-300">
            {PROGRESS_MESSAGES[messageIndex]}
          </p>
        </div>

        {/* Topic preview */}
        <p className="text-xs text-muted-foreground/50 line-clamp-1">
          &quot;{topic.substring(0, 60)}{topic.length > 60 ? '...' : ''}&quot;
        </p>
      </div>
    </div>
  )
}

/**
 * Enhanced AI Carousel Generator Dialog
 *
 * Multi-step workflow:
 * 1. Select a template
 * 2. Describe topic and audience
 * 3. Configure tone and CTA
 * 4. Preview and apply
 *
 * Features polished step indicators, animated generation progress,
 * and visual feedback throughout the flow.
 *
 * @param props - Component props
 * @param props.open - Whether the dialog is open
 * @param props.onOpenChange - Open state change callback
 * @param props.onGenerated - Generated slides callback
 * @param props.templates - Available templates
 * @returns Dialog component JSX
 */
export function EnhancedAiCarouselGenerator({
  open,
  onOpenChange,
  onGenerated,
  templates
}: EnhancedAiCarouselGeneratorProps) {
  // Step state
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<CanvasTemplate | null>(null)
  const [formData, setFormData] = useState<CarouselFormData>(DEFAULT_FORM_DATA)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedSlides, setGeneratedSlides] = useState<CanvasSlide[] | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)

  // Analyze selected template
  const templateAnalysis = useMemo<TemplateAnalysis | null>(() => {
    if (!selectedTemplate) return null
    return analyzeTemplate(selectedTemplate)
  }, [selectedTemplate])

  /**
   * Reset dialog state
   */
  const resetState = useCallback(() => {
    setStep(1)
    setSelectedTemplate(null)
    setFormData(DEFAULT_FORM_DATA)
    setGeneratedSlides(null)
    setGenerationError(null)
    setIsGenerating(false)
  }, [])

  /**
   * Handle dialog close
   */
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      resetState()
    }
    onOpenChange(newOpen)
  }, [onOpenChange, resetState])

  /**
   * Generate carousel content
   */
  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate || !templateAnalysis) {
      toast.error('Please select a template first')
      return
    }

    if (formData.topic.trim().length < 10) {
      toast.error('Please provide a more detailed topic')
      return
    }

    setIsGenerating(true)
    setGenerationError(null)

    try {
      const response = await fetch('/api/ai/carousel/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: formData.topic,
          audience: formData.audience || undefined,
          industry: formData.industry || undefined,
          keyPoints: formData.keyPoints.length > 0 ? formData.keyPoints : undefined,
          tone: formData.tone,
          ctaType: formData.ctaType,
          customCta: formData.ctaType === 'custom' ? formData.customCta : undefined,
          templateAnalysis
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Generation failed')
      }

      const data = await response.json()

      if (!data.success || !data.slots) {
        throw new Error(data.error || 'Invalid response')
      }

      // Convert slots to GeneratedSlotContent format
      const generatedContent: GeneratedSlotContent[] = data.slots.map(
        (slot: { slotId: string; content: string }) => ({
          slotId: slot.slotId,
          content: slot.content
        })
      )

      // Build slides from content
      const result = buildSlidesFromContent(
        selectedTemplate,
        templateAnalysis,
        generatedContent
      )

      if (result.warnings.length > 0) {
        console.warn('Generation warnings:', result.warnings)
      }

      setGeneratedSlides(result.slides)
      setStep(4)

      toast.success(`Generated ${result.filledSlots}/${result.totalSlots} content areas`)

    } catch (error) {
      console.error('Generation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate'
      setGenerationError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }, [selectedTemplate, templateAnalysis, formData])

  /**
   * Apply generated carousel
   */
  const handleApply = useCallback(() => {
    if (!generatedSlides) return

    onGenerated(generatedSlides)
    handleOpenChange(false)
    toast.success('Carousel applied successfully!')
  }, [generatedSlides, onGenerated, handleOpenChange])

  /**
   * Regenerate content
   */
  const handleRegenerate = useCallback(() => {
    setGeneratedSlides(null)
    handleGenerate()
  }, [handleGenerate])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
              <IconSparkles className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <span>AI Carousel Generator</span>
              <p className="text-xs font-normal text-muted-foreground mt-0.5">
                {step === 1 && 'Choose a template to fill with AI-generated content'}
                {step === 2 && 'Describe what your carousel is about'}
                {step === 3 && 'Configure the tone and call-to-action'}
                {step === 4 && 'Preview your generated carousel'}
              </p>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Multi-step AI carousel generation wizard
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <StepIndicator currentStep={step} totalSteps={4} />

        {/* Step content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Step 1: Template Selection */}
          {step === 1 && (
            <TemplateSelectionStep
              templates={templates}
              selectedTemplate={selectedTemplate}
              onSelect={setSelectedTemplate}
              onNext={() => setStep(2)}
            />
          )}

          {/* Step 2: Topic Input */}
          {step === 2 && templateAnalysis && (
            <TopicInputStep
              formData={formData}
              onChange={setFormData}
              templateAnalysis={templateAnalysis}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}

          {/* Step 3: Tone & CTA */}
          {step === 3 && (
            <ToneCtaStep
              formData={formData}
              onChange={setFormData}
              onBack={() => setStep(2)}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
            />
          )}

          {/* Step 4: Preview */}
          {step === 4 && generatedSlides && (
            <PreviewStep
              slides={generatedSlides}
              templateName={selectedTemplate?.name || ''}
              onBack={() => setStep(3)}
              onApply={handleApply}
              onRegenerate={handleRegenerate}
              isRegenerating={isGenerating}
            />
          )}
        </div>

        {/* Generation progress overlay */}
        {isGenerating && step === 3 && (
          <GenerationProgressOverlay topic={formData.topic} />
        )}
      </DialogContent>
    </Dialog>
  )
}
