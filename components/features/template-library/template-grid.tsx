/**
 * Template Grid
 * @description Responsive grid wrapper for template cards
 * @module components/features/template-library/template-grid
 */

import type * as React from "react"

/**
 * Props for the TemplateGrid component
 */
interface TemplateGridProps {
  /** Template card elements */
  children: React.ReactNode
}

/**
 * Responsive grid layout for template cards
 * @param props - Component props
 * @returns Grid container with responsive columns
 */
export function TemplateGrid({ children }: TemplateGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  )
}
