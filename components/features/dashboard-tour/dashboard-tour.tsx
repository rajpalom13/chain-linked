/**
 * Dashboard Tour Orchestrator
 * @description Main component that renders the tour overlay and tooltip via a portal
 * @module components/features/dashboard-tour/dashboard-tour
 */

'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'framer-motion'
import { useDashboardTour } from '@/hooks/use-dashboard-tour'
import { TOUR_STEPS } from './tour-steps'
import { TourOverlay } from './tour-overlay'
import { TourTooltip } from './tour-tooltip'

/**
 * Dashboard Tour Component
 * Orchestrates the tour overlay and tooltip, rendering them via a portal to document.body
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

  if (!mounted || !isActive || !targetRect) return null

  const currentStep = TOUR_STEPS[currentStepIndex]
  if (!currentStep) return null

  return createPortal(
    <>
      {/* Overlay is purely visual (pointer-events-none) */}
      <TourOverlay targetRect={targetRect} />

      {/* Tooltip handles all interaction */}
      <AnimatePresence mode="wait">
        <TourTooltip
          key={`tour-tooltip-${currentStep.id}`}
          step={currentStep}
          targetRect={targetRect}
          currentIndex={currentStepIndex}
          totalSteps={TOUR_STEPS.length}
          onNext={nextStep}
          onSkip={skipTour}
          onClose={closeTour}
        />
      </AnimatePresence>
    </>,
    document.body,
  )
}
