/**
 * Preview Step
 * @description Step 4 of AI carousel generation - preview and apply
 * @module components/features/canvas-editor/preview-step
 */

'use client'

import { useState, useCallback } from 'react'
import {
  IconArrowLeft,
  IconCheck,
  IconRefresh,
  IconLoader2,
  IconChevronLeft,
  IconChevronRight
} from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

import type { CanvasSlide, CanvasTextElement } from '@/types/canvas-editor'

/**
 * Props for PreviewStep
 */
interface PreviewStepProps {
  /** Generated slides to preview */
  slides: CanvasSlide[]
  /** Template name */
  templateName: string
  /** Callback to go back */
  onBack: () => void
  /** Callback to apply slides */
  onApply: () => void
  /** Callback to regenerate */
  onRegenerate: () => void
  /** Whether regeneration is in progress */
  isRegenerating: boolean
}

/**
 * Mini slide preview component
 */
function SlidePreview({
  slide,
  index,
  isSelected,
  onClick
}: {
  slide: CanvasSlide
  index: number
  isSelected: boolean
  onClick: () => void
}) {
  // Get text elements for preview
  const textElements = slide.elements.filter(el => el.type === 'text') as CanvasTextElement[]

  // Find the main title (largest font or first element)
  const sortedBySize = [...textElements].sort((a, b) =>
    (b.fontSize || 0) - (a.fontSize || 0)
  )
  const mainText = sortedBySize[0]?.text || ''

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-shrink-0 w-24 aspect-square rounded-lg border-2 overflow-hidden transition-all',
        'hover:border-primary/50',
        isSelected ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-border'
      )}
      style={{ backgroundColor: slide.backgroundColor || '#ffffff' }}
    >
      <div className="w-full h-full flex flex-col items-center justify-center p-2">
        <span className="text-xs font-bold opacity-40">
          {index + 1}
        </span>
        <p
          className="text-[8px] text-center line-clamp-3 mt-1"
          style={{ color: isDarkBackground(slide.backgroundColor) ? '#fff' : '#000' }}
        >
          {mainText.substring(0, 40)}
        </p>
      </div>
    </button>
  )
}

/**
 * Determines if a background color is dark
 */
function isDarkBackground(color?: string): boolean {
  if (!color) return false

  // Remove # if present
  const hex = color.replace('#', '')

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance < 0.5
}

/**
 * Large slide preview component
 */
function LargeSlidePreview({ slide }: { slide: CanvasSlide }) {
  const textElements = slide.elements.filter(el => el.type === 'text') as CanvasTextElement[]
  const isDark = isDarkBackground(slide.backgroundColor)

  return (
    <div
      className="w-full aspect-square rounded-xl overflow-hidden shadow-lg"
      style={{ backgroundColor: slide.backgroundColor || '#ffffff' }}
    >
      <div className="w-full h-full p-6 flex flex-col justify-center">
        {textElements.map((element, index) => {
          // Calculate relative font size (scale down for preview)
          const fontSize = Math.min((element.fontSize || 32) * 0.35, 32)

          return (
            <p
              key={element.id || index}
              className={cn(
                'leading-tight',
                element.fontWeight === 'bold' && 'font-bold'
              )}
              style={{
                fontSize: `${fontSize}px`,
                color: element.fill || (isDark ? '#ffffff' : '#1e293b'),
                textAlign: (element.align as 'left' | 'center' | 'right') || 'left',
                marginTop: index > 0 ? '0.5em' : 0
              }}
            >
              {element.text}
            </p>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Preview Step Component
 *
 * Shows the generated carousel with slide navigation.
 * Allows users to apply the carousel or regenerate.
 *
 * @param props - Component props
 * @returns Step component JSX
 */
export function PreviewStep({
  slides,
  templateName,
  onBack,
  onApply,
  onRegenerate,
  isRegenerating
}: PreviewStepProps) {
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0)

  const currentSlide = slides[selectedSlideIndex]

  const goToPrevious = useCallback(() => {
    setSelectedSlideIndex(i => Math.max(0, i - 1))
  }, [])

  const goToNext = useCallback(() => {
    setSelectedSlideIndex(i => Math.min(slides.length - 1, i + 1))
  }, [slides.length])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-semibold">Your Carousel is Ready!</h2>
        <p className="text-muted-foreground mt-1">
          Preview your {slides.length}-slide carousel using {templateName}
        </p>
      </div>

      {/* Main preview */}
      <div className="flex gap-6">
        {/* Large preview */}
        <div className="flex-1 relative">
          <LargeSlidePreview slide={currentSlide} />

          {/* Navigation arrows */}
          <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none px-2">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={goToPrevious}
              disabled={selectedSlideIndex === 0}
              className="pointer-events-auto shadow-lg"
            >
              <IconChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={goToNext}
              disabled={selectedSlideIndex === slides.length - 1}
              className="pointer-events-auto shadow-lg"
            >
              <IconChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Slide indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 text-sm">
            {selectedSlideIndex + 1} / {slides.length}
          </div>
        </div>
      </div>

      {/* Slide thumbnails */}
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-2">
          {slides.map((slide, index) => (
            <SlidePreview
              key={slide.id}
              slide={slide}
              index={index}
              isSelected={index === selectedSlideIndex}
              onClick={() => setSelectedSlideIndex(index)}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Content summary */}
      <div className="bg-muted rounded-lg p-4">
        <p className="font-medium mb-2">Slide {selectedSlideIndex + 1} Content</p>
        <div className="space-y-1 text-sm text-muted-foreground max-h-24 overflow-y-auto">
          {(currentSlide.elements.filter(el => el.type === 'text') as CanvasTextElement[]).map(
            (element, index) => (
              <p key={index} className="truncate">
                • {element.text}
              </p>
            )
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isRegenerating}
          >
            <IconArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onRegenerate}
            disabled={isRegenerating}
          >
            {isRegenerating ? (
              <IconLoader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <IconRefresh className="w-4 h-4 mr-2" />
            )}
            Regenerate
          </Button>
        </div>
        <Button
          onClick={onApply}
          disabled={isRegenerating}
          size="lg"
        >
          <IconCheck className="w-4 h-4 mr-2" />
          Apply to Editor
        </Button>
      </div>
    </div>
  )
}
