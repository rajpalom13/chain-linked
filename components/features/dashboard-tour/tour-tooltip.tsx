/**
 * Tour Tooltip Component
 * @description Floating tooltip card with step info, navigation dots, and Next/Skip controls
 * @module components/features/dashboard-tour/tour-tooltip
 */

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { IconX } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import type { TourStep, TourPosition } from './tour-steps'
import type { TargetRect } from './tour-overlay'

/** Gap between tooltip and target element */
const GAP = 16
/** Tooltip width */
const TOOLTIP_WIDTH = 340
/** Minimum margin from viewport edge */
const VIEWPORT_MARGIN = 12

/**
 * Props for the TourTooltip component
 */
interface TourTooltipProps {
  /** Current step data */
  step: TourStep
  /** Bounding rect of the target element */
  targetRect: TargetRect
  /** Current step index (0-based) */
  currentIndex: number
  /** Total number of steps */
  totalSteps: number
  /** Callback for the Next/Finish button */
  onNext: () => void
  /** Callback for the Skip button */
  onSkip: () => void
  /** Callback for the close (X) button */
  onClose: () => void
}

/**
 * Compute tooltip position, flipping to the opposite side if it overflows the viewport
 */
function computePosition(
  targetRect: TargetRect,
  preferred: TourPosition,
  tooltipHeight: number,
): { top: number; left: number; actualPosition: TourPosition } {
  const vw = window.innerWidth
  const vh = window.innerHeight

  const tryPosition = (pos: TourPosition): { top: number; left: number } | null => {
    let top = 0
    let left = 0

    switch (pos) {
      case 'bottom':
        top = targetRect.top + targetRect.height + GAP
        left = targetRect.left + targetRect.width / 2 - TOOLTIP_WIDTH / 2
        if (top + tooltipHeight > vh - VIEWPORT_MARGIN) return null
        break
      case 'top':
        top = targetRect.top - tooltipHeight - GAP
        left = targetRect.left + targetRect.width / 2 - TOOLTIP_WIDTH / 2
        if (top < VIEWPORT_MARGIN) return null
        break
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
        left = targetRect.left + targetRect.width + GAP
        if (left + TOOLTIP_WIDTH > vw - VIEWPORT_MARGIN) return null
        break
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
        left = targetRect.left - TOOLTIP_WIDTH - GAP
        if (left < VIEWPORT_MARGIN) return null
        break
    }

    // Clamp horizontal position
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - TOOLTIP_WIDTH - VIEWPORT_MARGIN))
    // Clamp vertical position
    top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - tooltipHeight - VIEWPORT_MARGIN))

    return { top, left }
  }

  // Try preferred position first
  const result = tryPosition(preferred)
  if (result) return { ...result, actualPosition: preferred }

  // Try opposite, then remaining
  const opposites: Record<TourPosition, TourPosition> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
  }
  const fallbackOrder: TourPosition[] = [
    opposites[preferred],
    ...(['top', 'bottom', 'left', 'right'] as TourPosition[]).filter(
      p => p !== preferred && p !== opposites[preferred]
    ),
  ]

  for (const pos of fallbackOrder) {
    const fallback = tryPosition(pos)
    if (fallback) return { ...fallback, actualPosition: pos }
  }

  // Last resort: position below
  return {
    top: targetRect.top + targetRect.height + GAP,
    left: Math.max(VIEWPORT_MARGIN, (vw - TOOLTIP_WIDTH) / 2),
    actualPosition: 'bottom',
  }
}

/**
 * Floating tooltip card for the tour walkthrough
 * Displays step title, description, progress dots, and navigation controls
 * @param props - Tooltip props
 * @returns Positioned tooltip card
 */
export function TourTooltip({
  step,
  targetRect,
  currentIndex,
  totalSteps,
  onNext,
  onSkip,
  onClose,
}: TourTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipHeight, setTooltipHeight] = useState(200)
  const isLastStep = currentIndex === totalSteps - 1

  // Measure tooltip height after render
  useEffect(() => {
    if (tooltipRef.current) {
      setTooltipHeight(tooltipRef.current.offsetHeight)
    }
  }, [step.id])

  // ESC key dismisses the tour
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const { top, left } = useMemo(
    () => computePosition(targetRect, step.position, tooltipHeight),
    [targetRect, step.position, tooltipHeight],
  )

  return (
    <motion.div
      ref={tooltipRef}
      className="fixed z-[9999] rounded-xl border border-border bg-popover text-popover-foreground shadow-xl"
      style={{ width: TOOLTIP_WIDTH }}
      initial={{ opacity: 0, scale: 0.95, top, left }}
      animate={{ opacity: 1, scale: 1, top, left }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-label={`Tour step ${currentIndex + 1} of ${totalSteps}: ${step.title}`}
    >
      <div className="p-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Close tour"
        >
          <IconX className="size-4" />
        </button>

        {/* Step content */}
        <h3 className="text-sm font-semibold pr-6">{step.title}</h3>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          {step.description}
        </p>

        {/* Footer: dots + buttons */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
          {/* Step dots */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`size-1.5 rounded-full transition-colors ${
                  i === currentIndex
                    ? 'bg-primary'
                    : i < currentIndex
                    ? 'bg-primary/40'
                    : 'bg-muted-foreground/25'
                }`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={onSkip}
            >
              Skip
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={onNext}
            >
              {isLastStep ? 'Finish' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
