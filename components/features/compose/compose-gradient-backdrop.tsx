"use client"

/**
 * Compose Gradient Backdrop
 * @description Ambient gradient background that transitions between blue (basic)
 * and warm red (advanced) modes using CSS transitions.
 * @module components/features/compose/compose-gradient-backdrop
 */

import type { ComposeMode } from "@/types/compose"

/**
 * Props for ComposeGradientBackdrop
 */
interface ComposeGradientBackdropProps {
  /** Current compose mode */
  mode: ComposeMode
}

/**
 * Ambient gradient backdrop that smoothly transitions between compose modes.
 * Uses oklch colors and CSS transition for the crossfade effect.
 * @param props - Component props
 * @returns Absolutely-positioned gradient div
 */
export function ComposeGradientBackdrop({ mode }: ComposeGradientBackdropProps) {
  const isBasic = mode === 'basic'

  return (
    <div
      className="absolute inset-0 -z-10 rounded-xl pointer-events-none transition-all duration-700"
      style={{
        background: isBasic
          ? 'radial-gradient(ellipse at top left, oklch(0.97 0.02 230 / 0.5), transparent 70%)'
          : 'radial-gradient(ellipse at top left, oklch(0.97 0.02 25 / 0.5), transparent 70%)',
      }}
    />
  )
}
