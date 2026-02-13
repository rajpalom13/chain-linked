/**
 * Tone & CTA Step
 * @description Step 3 of AI carousel generation - tone and call-to-action configuration
 * @module components/features/canvas-editor/tone-cta-step
 */

'use client'

import { useCallback } from 'react'
import {
  IconArrowLeft,
  IconSparkles,
  IconLoader2,
  IconBriefcase,
  IconMessageCircle,
  IconSchool,
  IconHeart,
  IconBook,
  IconUserPlus,
  IconMessage,
  IconShare,
  IconLink,
  IconMail,
  IconBookmark,
  IconPencil,
  IconX,
  IconFingerprint,
} from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import type { CarouselTone, CtaType } from '@/lib/ai/carousel-prompts'
import type { CarouselFormData } from './enhanced-ai-carousel-generator'

/**
 * Props for ToneCtaStep
 */
interface ToneCtaStepProps {
  /** Current form data */
  formData: CarouselFormData
  /** Callback to update form data */
  onChange: (data: CarouselFormData) => void
  /** Callback to go back */
  onBack: () => void
  /** Callback to generate */
  onGenerate: () => void
  /** Whether generation is in progress */
  isGenerating: boolean
}

/**
 * Tone option configuration
 */
interface ToneOption {
  value: CarouselTone
  label: string
  description: string
  icon: React.ReactNode
}

/**
 * CTA option configuration
 */
interface CtaOption {
  value: CtaType
  label: string
  example: string
  icon: React.ReactNode
}

/**
 * Available tone options
 */
const TONE_OPTIONS: ToneOption[] = [
  {
    value: 'match-my-style',
    label: 'Match My Style',
    description: 'Writes like you, based on your past posts',
    icon: <IconFingerprint className="w-5 h-5" />
  },
  {
    value: 'professional',
    label: 'Professional',
    description: 'Formal, credible, and authoritative',
    icon: <IconBriefcase className="w-5 h-5" />
  },
  {
    value: 'casual',
    label: 'Casual',
    description: 'Friendly, conversational, and relatable',
    icon: <IconMessageCircle className="w-5 h-5" />
  },
  {
    value: 'educational',
    label: 'Educational',
    description: 'Clear, instructive, and actionable',
    icon: <IconSchool className="w-5 h-5" />
  },
  {
    value: 'inspirational',
    label: 'Inspirational',
    description: 'Motivating, uplifting, and empowering',
    icon: <IconHeart className="w-5 h-5" />
  },
  {
    value: 'storytelling',
    label: 'Storytelling',
    description: 'Narrative, engaging, and personal',
    icon: <IconBook className="w-5 h-5" />
  }
]

/**
 * Available CTA options
 */
const CTA_OPTIONS: CtaOption[] = [
  {
    value: 'none',
    label: 'None',
    example: 'No call-to-action — end with a strong closing statement',
    icon: <IconX className="w-5 h-5" />
  },
  {
    value: 'follow',
    label: 'Follow',
    example: 'Follow for more insights on...',
    icon: <IconUserPlus className="w-5 h-5" />
  },
  {
    value: 'comment',
    label: 'Comment',
    example: 'What\'s your experience? Comment below!',
    icon: <IconMessage className="w-5 h-5" />
  },
  {
    value: 'share',
    label: 'Share',
    example: 'Share this with someone who needs it',
    icon: <IconShare className="w-5 h-5" />
  },
  {
    value: 'save',
    label: 'Save',
    example: 'Save this for later reference',
    icon: <IconBookmark className="w-5 h-5" />
  },
  {
    value: 'dm',
    label: 'DM',
    example: 'DM me "keyword" for...',
    icon: <IconMail className="w-5 h-5" />
  },
  {
    value: 'link',
    label: 'Link',
    example: 'Click the link in bio to learn more',
    icon: <IconLink className="w-5 h-5" />
  },
  {
    value: 'custom',
    label: 'Custom',
    example: 'Write your own CTA',
    icon: <IconPencil className="w-5 h-5" />
  }
]

/**
 * Selection card component
 */
function SelectionCard<T extends string>({
  value,
  currentValue,
  label,
  description,
  icon,
  onSelect
}: {
  value: T
  currentValue: T
  label: string
  description?: string
  icon: React.ReactNode
  onSelect: (value: T) => void
}) {
  const isSelected = value === currentValue

  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all',
        'hover:border-primary/50',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border'
      )}
    >
      <div
        className={cn(
          'p-2 rounded-lg',
          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{label}</p>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {description}
          </p>
        )}
      </div>
    </button>
  )
}

/**
 * Tone & CTA Step Component
 *
 * Allows users to select the content tone and call-to-action style.
 * Includes custom CTA option for personalized endings.
 *
 * @param props - Component props
 * @returns Step component JSX
 */
export function ToneCtaStep({
  formData,
  onChange,
  onBack,
  onGenerate,
  isGenerating
}: ToneCtaStepProps) {
  const updateField = useCallback(<K extends keyof CarouselFormData>(
    field: K,
    value: CarouselFormData[K]
  ) => {
    onChange({ ...formData, [field]: value })
  }, [formData, onChange])

  return (
    <div className="space-y-6">
      {/* Tone selection */}
      <div className="space-y-3">
        <Label className="text-base">Content Tone</Label>
        <p className="text-sm text-muted-foreground">
          How should your carousel sound?
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TONE_OPTIONS.map(option => (
            <SelectionCard
              key={option.value}
              value={option.value}
              currentValue={formData.tone}
              label={option.label}
              description={option.description}
              icon={option.icon}
              onSelect={value => updateField('tone', value)}
            />
          ))}
        </div>
      </div>

      {/* CTA selection */}
      <div className="space-y-3">
        <Label className="text-base">Call-to-Action Style</Label>
        <p className="text-sm text-muted-foreground">
          What action should readers take after viewing?
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {CTA_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateField('ctaType', option.value)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                'hover:border-primary/50',
                formData.ctaType === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border'
              )}
            >
              <div
                className={cn(
                  'p-2 rounded-lg',
                  formData.ctaType === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {option.icon}
              </div>
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>

        {/* Selected CTA example */}
        {formData.ctaType && formData.ctaType !== 'custom' && formData.ctaType !== 'none' && (
          <p className="text-sm text-muted-foreground italic">
            Example: "{CTA_OPTIONS.find(o => o.value === formData.ctaType)?.example}"
          </p>
        )}

        {/* Custom CTA input */}
        {formData.ctaType === 'custom' && (
          <div className="space-y-2">
            <Label htmlFor="customCta">Your Custom CTA</Label>
            <Input
              id="customCta"
              placeholder="e.g., Book a free consultation in the link below..."
              value={formData.customCta}
              onChange={e => updateField('customCta', e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-muted rounded-lg p-4 space-y-2">
        <p className="font-medium">Generation Summary</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Topic: {formData.topic.substring(0, 50)}...</li>
          <li>• Tone: {TONE_OPTIONS.find(t => t.value === formData.tone)?.label}</li>
          <li>• CTA: {CTA_OPTIONS.find(c => c.value === formData.ctaType)?.label}</li>
          {formData.audience && <li>• Audience: {formData.audience}</li>}
          {formData.keyPoints.length > 0 && (
            <li>• Key points: {formData.keyPoints.length} specified</li>
          )}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isGenerating}
        >
          <IconArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
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
              Generate Carousel
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
