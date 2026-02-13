"use client"

/**
 * Page Content Wrapper
 * @description Standardized content wrapper for dashboard pages with consistent
 * spacing and optional Framer Motion page-enter animation.
 * @module components/shared/page-content
 */

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { pageVariants } from "@/lib/animations"

/**
 * Props for the PageContent component
 */
interface PageContentProps {
  /** Page content */
  children: React.ReactNode
  /** Additional CSS classes */
  className?: string
  /** Disable enter animation (defaults to animated) */
  noAnimation?: boolean
}

/**
 * Consistent page content wrapper with standard padding and optional page-enter animation.
 * @param props - Component props
 * @returns Wrapped content with standard layout spacing
 */
export function PageContent({ children, className, noAnimation }: PageContentProps) {
  if (noAnimation) {
    return (
      <div className={cn("flex flex-col gap-4 p-4 md:gap-6 md:p-6", className)}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      className={cn("flex flex-col gap-4 p-4 md:gap-6 md:p-6", className)}
      variants={pageVariants}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.div>
  )
}
