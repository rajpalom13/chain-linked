"use client"

/**
 * Page Content Wrapper
 * @description Standardized content wrapper for dashboard pages with consistent
 * spacing. Page-level entrance animations are handled by the global
 * PageTransition component in app/template.tsx — this wrapper only
 * provides layout structure, not animation.
 * @module components/shared/page-content
 */

import { cn } from "@/lib/utils"

/**
 * Props for the PageContent component
 */
interface PageContentProps {
  /** Page content */
  children: React.ReactNode
  /** Additional CSS classes */
  className?: string
  /** @deprecated No longer used — kept for API compatibility */
  noAnimation?: boolean
}

/**
 * Consistent page content wrapper with standard padding.
 * Page entrance animation is handled by PageTransition (app/template.tsx).
 * @param props - Component props
 * @returns Wrapped content with standard layout spacing
 */
export function PageContent({ children, className }: PageContentProps) {
  return (
    <div className={cn("flex flex-col gap-4 p-4 md:gap-6 md:p-6", className)}>
      {children}
    </div>
  )
}
