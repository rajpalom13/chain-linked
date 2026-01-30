/**
 * AI Content Generator
 * @description Simple dialog to generate content for the current template
 * @module components/features/canvas-editor/ai-content-generator
 */

'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  IconSparkles,
  IconLoader2,
  IconCheck,
  IconRefresh,
  IconChevronDown,
  IconChevronUp,
  IconChevronLeft,
  IconChevronRight,
  IconArrowLeft,
} from '@tabler/icons-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

import { analyzeTemplate, type TemplateAnalysis, type TemplateSlot } from '@/lib/ai/template-analyzer'
import { buildSlidesFromContent, type GeneratedSlotContent } from '@/lib/ai/carousel-builder'
import type { CarouselTone, CtaType } from '@/lib/ai/carousel-prompts'
import type { CanvasTemplate, CanvasSlide } from '@/types/canvas-editor'

/**
 * Props for AiContentGenerator
 */
interface AiContentGeneratorProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void
  /** Callback with generated slides */
  onGenerated: (slides: CanvasSlide[]) => void
  /** Current template being used */
  currentTemplate: CanvasTemplate | null
  /** Current slides in the editor */
  currentSlides: CanvasSlide[]
}

/**
 * Generated content display for a single slide
 */
interface SlideContent {
  slideIndex: number
  slidePurpose: string
  items: Array<{
    slotId: string
    type: string
    content: string
  }>
}

/**
 * Tone options
 */
const TONE_OPTIONS: Array<{ value: CarouselTone; label: string }> = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'educational', label: 'Educational' },
  { value: 'inspirational', label: 'Inspirational' },
  { value: 'storytelling', label: 'Storytelling' }
]

/**
 * CTA options
 */
const CTA_OPTIONS: Array<{ value: CtaType; label: string }> = [
  { value: 'follow', label: 'Follow me' },
  { value: 'comment', label: 'Comment below' },
  { value: 'share', label: 'Share this' },
  { value: 'save', label: 'Save for later' },
  { value: 'dm', label: 'DM me' },
  { value: 'link', label: 'Link in bio' }
]

/**
 * AI Content Generator Dialog
 *
 * Simple flow:
 * 1. User describes what they want
 * 2. AI generates text content for each slide
 * 3. User reviews and applies
 *
 * @param props - Component props
 * @returns Dialog component JSX
 */
export function AiContentGenerator({
  open,
  onOpenChange,
  onGenerated,
  currentTemplate,
  currentSlides
}: AiContentGeneratorProps) {
  // Form state
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState<CarouselTone>('professional')
  const [ctaType, setCtaType] = useState<CtaType>('follow')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [audience, setAudience] = useState('')

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<SlideContent[] | null>(null)
  const [generatedSlots, setGeneratedSlots] = useState<GeneratedSlotContent[] | null>(null)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  // Analyze current template
  const templateAnalysis = useMemo<TemplateAnalysis | null>(() => {
    if (!currentTemplate) return null
    return analyzeTemplate(currentTemplate)
  }, [currentTemplate])

  /**
   * Reset state when dialog closes
   */
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setTopic('')
      setGeneratedContent(null)
      setGeneratedSlots(null)
      setShowAdvanced(false)
      setAudience('')
      setCurrentSlideIndex(0)
    }
    onOpenChange(newOpen)
  }, [onOpenChange])

  /**
   * Generate content
   */
  const handleGenerate = useCallback(async () => {
    if (!currentTemplate || !templateAnalysis) {
      toast.error('No template selected')
      return
    }

    if (topic.trim().length < 10) {
      toast.error('Please describe your topic in more detail')
      return
    }

    setIsGenerating(true)
    setGeneratedContent(null)
    setGeneratedSlots(null)

    try {
      const response = await fetch('/api/ai/carousel/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          audience: audience || undefined,
          tone,
          ctaType,
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

      // Store raw slots for applying later
      const slots: GeneratedSlotContent[] = data.slots.map(
        (slot: { slotId: string; content: string }) => ({
          slotId: slot.slotId,
          content: slot.content
        })
      )
      setGeneratedSlots(slots)

      // Organize content by slide for display
      const contentBySlide = organizeContentBySlide(slots, templateAnalysis)
      setGeneratedContent(contentBySlide)

      toast.success('Content generated!')

    } catch (error) {
      console.error('Generation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate'
      toast.error(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }, [currentTemplate, templateAnalysis, topic, audience, tone, ctaType])

  /**
   * Apply generated content to template
   */
  const handleApply = useCallback(() => {
    if (!currentTemplate || !templateAnalysis || !generatedSlots) return

    const result = buildSlidesFromContent(
      currentTemplate,
      templateAnalysis,
      generatedSlots
    )

    onGenerated(result.slides)
    handleOpenChange(false)
    toast.success('Content applied to carousel!')
  }, [currentTemplate, templateAnalysis, generatedSlots, onGenerated, handleOpenChange])

  // Check if we can generate
  const canGenerate = topic.trim().length >= 10 && currentTemplate

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconSparkles className="w-5 h-5 text-primary" />
            Generate Content with AI
          </DialogTitle>
          <DialogDescription>
            {currentTemplate
              ? `Generating content for "${currentTemplate.name}" (${currentTemplate.defaultSlides.length} slides)`
              : 'Please select a template first'}
          </DialogDescription>
        </DialogHeader>

        {!currentTemplate ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>Please select a template first before generating content.</p>
          </div>
        ) : !generatedContent ? (
          /* Input Form */
          <div className="space-y-4 py-4">
            {/* Topic input */}
            <div className="space-y-2">
              <Label htmlFor="topic">What's your carousel about?</Label>
              <Textarea
                id="topic"
                placeholder="e.g., 5 productivity tips for remote workers who struggle with focus and time management"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="min-h-[100px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Be specific - the more detail you provide, the better the content
              </p>
            </div>

            {/* Tone and CTA */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={tone} onValueChange={(v) => setTone(v as CarouselTone)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Call-to-Action</Label>
                <Select value={ctaType} onValueChange={(v) => setCtaType(v as CtaType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CTA_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Advanced options */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  {showAdvanced ? <IconChevronUp className="w-4 h-4" /> : <IconChevronDown className="w-4 h-4" />}
                  Advanced options
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="space-y-2">
                  <Label htmlFor="audience">Target Audience (optional)</Label>
                  <Input
                    id="audience"
                    placeholder="e.g., Startup founders, Marketing professionals"
                    value={audience}
                    onChange={e => setAudience(e.target.value)}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Generate button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleGenerate}
                disabled={!canGenerate || isGenerating}
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <IconSparkles className="w-4 h-4 mr-2" />
                    Generate Content
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* Generated Content Display - Paginated */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Slide indicator dots */}
            <div className="flex items-center justify-center gap-2 py-3">
              {generatedContent.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentSlideIndex(index)}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all",
                    index === currentSlideIndex
                      ? "bg-primary scale-125"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            {/* Current slide display */}
            {generatedContent[currentSlideIndex] && (
              <div className="flex-1 flex flex-col">
                <div className="border rounded-xl overflow-hidden flex-1 flex flex-col">
                  {/* Slide header */}
                  <div className="bg-muted px-4 py-3 flex items-center justify-between">
                    <span className="font-semibold text-lg">
                      Slide {currentSlideIndex + 1} of {generatedContent.length}
                    </span>
                    <span className="text-sm text-muted-foreground capitalize px-2 py-1 bg-background rounded-md">
                      {generatedContent[currentSlideIndex].slidePurpose}
                    </span>
                  </div>

                  {/* Slide content */}
                  <div className="p-6 space-y-4 flex-1">
                    {generatedContent[currentSlideIndex].items.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                          {item.type}
                        </p>
                        <p className={cn(
                          "text-foreground",
                          item.type === 'title' || item.type === 'heading'
                            ? 'text-xl font-bold'
                            : 'text-base leading-relaxed'
                        )}>
                          {item.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Navigation and actions */}
                <div className="flex items-center justify-between pt-4">
                  {/* Left side: Back/Previous */}
                  <div className="flex gap-2">
                    {currentSlideIndex === 0 ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setGeneratedContent(null)
                          setGeneratedSlots(null)
                          setCurrentSlideIndex(0)
                        }}
                      >
                        <IconArrowLeft className="w-4 h-4 mr-2" />
                        Back to Edit
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setCurrentSlideIndex(i => i - 1)}
                      >
                        <IconChevronLeft className="w-4 h-4 mr-2" />
                        Previous
                      </Button>
                    )}
                  </div>

                  {/* Right side: Next or Apply */}
                  <div className="flex gap-2">
                    {currentSlideIndex === 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setGeneratedContent(null)
                          setGeneratedSlots(null)
                          setCurrentSlideIndex(0)
                        }}
                      >
                        <IconRefresh className="w-4 h-4 mr-1" />
                        Regenerate
                      </Button>
                    )}
                    {currentSlideIndex < generatedContent.length - 1 ? (
                      <Button onClick={() => setCurrentSlideIndex(i => i + 1)}>
                        Next
                        <IconChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <Button onClick={handleApply} size="lg" className="px-6">
                        <IconCheck className="w-4 h-4 mr-2" />
                        Apply to Template
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Organizes generated slots into slide-based structure for display
 */
function organizeContentBySlide(
  slots: GeneratedSlotContent[],
  analysis: TemplateAnalysis
): SlideContent[] {
  const slideMap = new Map<number, SlideContent>()

  // Initialize slides
  analysis.slideBreakdown.forEach(slide => {
    slideMap.set(slide.index, {
      slideIndex: slide.index,
      slidePurpose: slide.purpose,
      items: []
    })
  })

  // Add content to slides
  slots.forEach(slot => {
    // Parse slot ID to get slide index
    const match = slot.slotId.match(/slot-(\d+)-/)
    if (!match) return

    const slideIndex = parseInt(match[1], 10)
    const slideContent = slideMap.get(slideIndex)
    if (!slideContent) return

    // Find slot definition for type
    const slotDef = analysis.slots.find(s => s.id === slot.slotId)
    const type = slotDef?.type || 'text'

    slideContent.items.push({
      slotId: slot.slotId,
      type,
      content: slot.content
    })
  })

  // Sort items within each slide by position (title first, then body)
  const typeOrder: Record<string, number> = {
    title: 0,
    heading: 1,
    subtitle: 2,
    body: 3,
    cta: 4,
    caption: 5
  }

  slideMap.forEach(slide => {
    slide.items.sort((a, b) => {
      const orderA = typeOrder[a.type] ?? 10
      const orderB = typeOrder[b.type] ?? 10
      return orderA - orderB
    })
  })

  return Array.from(slideMap.values()).sort((a, b) => a.slideIndex - b.slideIndex)
}
