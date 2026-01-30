/**
 * Page Transition Component
 * @description Smooth page transitions using Framer Motion
 * @module components/page-transition
 */

"use client"

import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { useContext, useRef } from "react"

/**
 * Hook to freeze the router context to prevent premature unmounting
 * This is needed for exit animations to work properly in Next.js App Router
 */
function useFrozenRouter(Component: React.ReactNode) {
  const context = useContext(LayoutRouterContext)
  const frozen = useRef(context).current

  return frozen
}

/**
 * Page transition variants for consistent animations
 */
const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -8,
  },
}

/**
 * Transition configuration for smooth animations
 * Uses a custom cubic-bezier for a more natural feel
 */
const pageTransition = {
  type: "tween" as const,
  ease: [0.16, 1, 0.3, 1] as const,
  duration: 0.25,
}

/**
 * Props for PageTransition component
 */
interface PageTransitionProps {
  children: React.ReactNode
  className?: string
}

/**
 * PageTransition component that wraps page content with Framer Motion animations
 *
 * @param props - Component props
 * @param props.children - Page content to animate
 * @param props.className - Optional className for the wrapper
 * @returns Animated page wrapper
 *
 * @example
 * ```tsx
 * // In template.tsx or layout.tsx
 * <PageTransition>
 *   {children}
 * </PageTransition>
 * ```
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

/**
 * FrozenRouter component for proper exit animations
 * Use this in template.tsx for better animation support
 */
export function FrozenRouter({ children }: { children: React.ReactNode }) {
  const frozen = useFrozenRouter(children)

  return (
    <LayoutRouterContext.Provider value={frozen}>
      {children}
    </LayoutRouterContext.Provider>
  )
}
