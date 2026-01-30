/**
 * Topic Input Step
 * @description Step 2 of AI carousel generation - topic and context input
 * @module components/features/canvas-editor/topic-input-step
 */

'use client'

import { useState, useCallback } from 'react'
import { IconArrowLeft, IconPlus, IconX, IconBulb } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

import type { TemplateAnalysis } from '@/lib/ai/template-analyzer'
import type { CarouselFormData } from './enhanced-ai-carousel-generator'

/**
 * Props for TopicInputStep
 */
interface TopicInputStepProps {
  /** Current form data */
  formData: CarouselFormData
  /** Callback to update form data */
  onChange: (data: CarouselFormData) => void
  /** Template analysis with slot info */
  templateAnalysis: TemplateAnalysis
  /** Callback to go back */
  onBack: () => void
  /** Callback to proceed */
  onNext: () => void
}

/**
 * Example topics for inspiration
 */
const EXAMPLE_TOPICS = [
  '5 productivity hacks for remote workers',
  'How to grow your LinkedIn following in 30 days',
  'Common mistakes new entrepreneurs make',
  'The future of AI in marketing',
  'Building a personal brand from scratch'
]

/**
 * Key Points Input Component
 */
function KeyPointsInput({
  points,
  onChange
}: {
  points: string[]
  onChange: (points: string[]) => void
}) {
  const [inputValue, setInputValue] = useState('')

  const addPoint = useCallback(() => {
    const trimmed = inputValue.trim()
    if (trimmed && points.length < 5 && !points.includes(trimmed)) {
      onChange([...points, trimmed])
      setInputValue('')
    }
  }, [inputValue, points, onChange])

  const removePoint = useCallback((index: number) => {
    onChange(points.filter((_, i) => i !== index))
  }, [points, onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addPoint()
    }
  }, [addPoint])

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a key point to include..."
          disabled={points.length >= 5}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={addPoint}
          disabled={!inputValue.trim() || points.length >= 5}
        >
          <IconPlus className="w-4 h-4" />
        </Button>
      </div>

      {points.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {points.map((point, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="pr-1 gap-1"
            >
              {point}
              <button
                type="button"
                onClick={() => removePoint(index)}
                className="ml-1 hover:bg-muted rounded p-0.5"
              >
                <IconX className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {points.length}/5 key points added (optional)
      </p>
    </div>
  )
}

/**
 * Topic Input Step Component
 *
 * Collects topic, audience, and key points for carousel generation.
 * Shows template context and provides example topics.
 *
 * @param props - Component props
 * @returns Step component JSX
 */
export function TopicInputStep({
  formData,
  onChange,
  templateAnalysis,
  onBack,
  onNext
}: TopicInputStepProps) {
  const [showExamples, setShowExamples] = useState(false)

  const isValid = formData.topic.trim().length >= 10

  const updateField = useCallback(<K extends keyof CarouselFormData>(
    field: K,
    value: CarouselFormData[K]
  ) => {
    onChange({ ...formData, [field]: value })
  }, [formData, onChange])

  const selectExample = useCallback((example: string) => {
    updateField('topic', example)
    setShowExamples(false)
  }, [updateField])

  return (
    <div className="space-y-6">
      {/* Template context */}
      <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center"
          style={{
            backgroundColor: templateAnalysis.brandColors[0] || '#3b82f6'
          }}
        >
          <span className="text-white font-bold text-lg">
            {templateAnalysis.totalSlides}
          </span>
        </div>
        <div>
          <p className="font-medium">{templateAnalysis.templateName}</p>
          <p className="text-sm text-muted-foreground">
            {templateAnalysis.totalSlots} content areas to fill
          </p>
        </div>
      </div>

      {/* Topic input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="topic">What's your carousel about? *</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setShowExamples(!showExamples)}
          >
            <IconBulb className="w-3 h-3 mr-1" />
            {showExamples ? 'Hide examples' : 'See examples'}
          </Button>
        </div>

        {showExamples && (
          <div className="flex flex-wrap gap-2 pb-2">
            {EXAMPLE_TOPICS.map((example, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectExample(example)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-full border transition-colors',
                  'hover:bg-primary hover:text-primary-foreground hover:border-primary'
                )}
              >
                {example}
              </button>
            ))}
          </div>
        )}

        <Textarea
          id="topic"
          placeholder="Describe your carousel topic in detail. The more specific you are, the better the content will be.

Example: 5 actionable productivity tips for busy entrepreneurs who work from home and struggle with focus"
          value={formData.topic}
          onChange={e => updateField('topic', e.target.value)}
          className="min-h-[120px] resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {formData.topic.length} characters
          {formData.topic.length < 10 && ' (minimum 10)'}
        </p>
      </div>

      {/* Audience input */}
      <div className="space-y-2">
        <Label htmlFor="audience">Target Audience (optional)</Label>
        <Input
          id="audience"
          placeholder="e.g., Startup founders, Marketing professionals, Remote workers..."
          value={formData.audience}
          onChange={e => updateField('audience', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Who should resonate with this content?
        </p>
      </div>

      {/* Industry input */}
      <div className="space-y-2">
        <Label htmlFor="industry">Industry/Niche (optional)</Label>
        <Input
          id="industry"
          placeholder="e.g., SaaS, E-commerce, Healthcare, Finance..."
          value={formData.industry}
          onChange={e => updateField('industry', e.target.value)}
        />
      </div>

      {/* Key points */}
      <div className="space-y-2">
        <Label>Key Points to Include (optional)</Label>
        <KeyPointsInput
          points={formData.keyPoints}
          onChange={points => updateField('keyPoints', points)}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
        >
          <IconArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!isValid}
        >
          Continue
        </Button>
      </div>
    </div>
  )
}
