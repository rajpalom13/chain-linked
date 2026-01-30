/**
 * Enhanced AI Carousel Generator
 * @description Multi-step dialog for AI-powered carousel content generation
 * @module components/features/canvas-editor/enhanced-ai-carousel-generator
 */

'use client'

import { useState, useMemo, useCallback } from 'react'
import { IconSparkles, IconLoader2, IconCheck, IconArrowLeft, IconArrowRight, IconRefresh } from '@tabler/icons-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
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
 */
interface EnhancedAiCarouselGeneratorProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Callback with generated slides */
  onGenerated: (slides: CanvasSlide[]) => void
  /** Available templates */
  templates: CanvasTemplate[]
}

/**
 * Step indicator component
 */
function StepIndicator({
  currentStep,
  totalSteps
}: {
  currentStep: number
  totalSteps: number
}) {
  const steps = [
    { num: 1, label: 'Template' },
    { num: 2, label: 'Topic' },
    { num: 3, label: 'Style' },
    { num: 4, label: 'Preview' }
  ]

  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, index) => (
        <div key={step.num} className="flex items-center">
          <div
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors',
              currentStep > step.num
                ? 'bg-primary text-primary-foreground'
                : currentStep === step.num
                ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {currentStep > step.num ? (
              <IconCheck className="w-4 h-4" />
            ) : (
              step.num
            )}
          </div>
          <span
            className={cn(
              'ml-2 text-sm hidden sm:block',
              currentStep >= step.num
                ? 'text-foreground'
                : 'text-muted-foreground'
            )}
          >
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'w-8 h-0.5 mx-2',
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
 * Enhanced AI Carousel Generator Dialog
 *
 * Multi-step workflow:
 * 1. Select a template
 * 2. Describe topic and audience
 * 3. Configure tone and CTA
 * 4. Preview and apply
 *
 * @param props - Component props
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
          <DialogTitle className="flex items-center gap-2">
            <IconSparkles className="w-5 h-5 text-primary" />
            AI Carousel Generator
          </DialogTitle>
          <DialogDescription>
            {step === 1 && 'Choose a template to fill with AI-generated content'}
            {step === 2 && 'Describe what your carousel is about'}
            {step === 3 && 'Configure the tone and call-to-action'}
            {step === 4 && 'Preview your generated carousel'}
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
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center space-y-4">
              <IconLoader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
              <div className="space-y-2">
                <p className="font-medium">Generating your carousel...</p>
                <p className="text-sm text-muted-foreground">
                  This may take a few seconds
                </p>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
