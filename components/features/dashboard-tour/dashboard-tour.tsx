/**
 * Dashboard Tour Orchestrator
 * @description Main component that renders the tour overlay and tooltip via a portal.
 * Includes a persistent dismiss button so the tour can always be closed.
 * @module components/features/dashboard-tour/dashboard-tour
 */

'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'framer-motion'
import { IconX } from '@tabler/icons-react'
import { useDashboardTour } from '@/hooks/use-dashboard-tour'
import { TOUR_STEPS } from './tour-steps'
import { TourOverlay } from './tour-overlay'
import { TourTooltip } from './tour-tooltip'

/**
 * Dashboard Tour Component
 * Orchestrates the tour overlay and tooltip, rendering them via a portal to document.body.
 * A persistent dismiss button is always visible when the tour is active so the user
 * can exit even if the tooltip fails to position.
 * @returns Tour UI or null if inactive
 */
export function DashboardTour() {
  const {
    isActive,
    currentStepIndex,
    targetRect,
    nextStep,
    skipTour,
    closeTour,
  } = useDashboardTour()

  // Wait for client-side mount before using portals
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isActive) return null

  const currentStep = TOUR_STEPS[currentStepIndex] ?? null

  // Fallback rect centers the tooltip on screen when the target element isn't found yet
  const fallbackRect = { top: 120, left: window.innerWidth / 2 - 20, width: 40, height: 40 }
  const effectiveRect = targetRect ?? fallbackRect

  return createPortal(
    <>
      {/* Persistent dismiss button — always visible when tour is active */}
      <button
        onClick={closeTour}
        className="fixed top-4 right-4 z-[10000] flex items-center gap-1.5 rounded-full bg-background/95 border border-border shadow-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background transition-colors backdrop-blur-sm"
        aria-label="Dismiss tour"
      >
        <IconX className="size-3.5" />
        Dismiss Tour
      </button>

      {/* Overlay is purely visual (pointer-events-none) — only show when we have a real target */}
      {targetRect && <TourOverlay targetRect={targetRect} />}

      {/* Tooltip with skip/next — always visible when tour is active */}
      {currentStep && (
        <AnimatePresence mode="wait">
          <TourTooltip
            key={`tour-tooltip-${currentStep.id}`}
            step={currentStep}
            targetRect={effectiveRect}
            currentIndex={currentStepIndex}
            totalSteps={TOUR_STEPS.length}
            onNext={nextStep}
            onSkip={skipTour}
            onClose={closeTour}
          />
        </AnimatePresence>
      )}
    </>,
    document.body,
  )
}
