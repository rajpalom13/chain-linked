/**
 * Tour Overlay Component
 * @description Full-screen SVG spotlight overlay with animated cutout for the dashboard tour.
 * Purely visual — pointer-events are disabled so the tooltip remains interactive.
 * @module components/features/dashboard-tour/tour-overlay
 */

'use client'

import { motion } from 'framer-motion'

/** Padding around the highlighted element */
const PADDING = 8
/** Border radius of the spotlight cutout */
const BORDER_RADIUS = 12

/**
 * Target rectangle dimensions for the spotlight cutout
 */
export interface TargetRect {
  top: number
  left: number
  width: number
  height: number
}

/**
 * Props for the TourOverlay component
 */
interface TourOverlayProps {
  /** Bounding rect of the currently highlighted element */
  targetRect: TargetRect
}

/**
 * Full-screen overlay with an animated spotlight cutout
 * Uses an SVG mask to create a transparent window over the target element.
 * pointer-events are disabled so all interaction flows through to the tooltip.
 * @param props - Overlay props
 * @returns SVG overlay with animated spotlight mask
 */
export function TourOverlay({ targetRect }: TourOverlayProps) {
  const x = targetRect.left - PADDING
  const y = targetRect.top - PADDING
  const w = targetRect.width + PADDING * 2
  const h = targetRect.height + PADDING * 2

  return (
    <div
      className="fixed inset-0 z-[9998] pointer-events-none"
      aria-hidden="true"
    >
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="tour-spotlight-mask">
            {/* White = visible (overlay shows), black = hidden (cutout) */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <motion.rect
              fill="black"
              rx={BORDER_RADIUS}
              ry={BORDER_RADIUS}
              initial={{ x, y, width: w, height: h, opacity: 0 }}
              animate={{ x, y, width: w, height: h, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.5)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>
    </div>
  )
}
