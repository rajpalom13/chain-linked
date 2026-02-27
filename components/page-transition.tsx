/**
 * Page Transition Component
 * @description Smooth page transitions using Framer Motion.
 *
 * IMPORTANT: This component uses inline animation values (objects) instead of
 * variant labels (strings) to prevent Framer Motion variant propagation.
 * When a parent motion.div uses string labels like initial="initial" and
 * animate="animate", those labels propagate down to ALL descendant motion
 * components that use matching label names — causing children to inherit the
 * parent's animation timing and potentially stay stuck at opacity:0.
 *
 * By using inline objects for initial/animate/exit, the PageTransition wrapper
 * does NOT propagate any animation context, so child motion components inside
 * dashboard pages can manage their own animation lifecycles independently.
 *
 * @module components/page-transition
 */

"use client"

import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"

/**
 * Transition configuration for smooth page animations
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
 * PageTransition component that wraps page content with Framer Motion animations.
 *
 * Uses inline animation objects (not variant labels) to avoid propagating
 * animation state to child motion components. This ensures child animations
 * in dashboard pages trigger independently during client-side navigation.
 *
 * @param props - Component props
 * @param props.children - Page content to animate
 * @param props.className - Optional className for the wrapper
 * @returns Animated page wrapper
 *
 * @example
 * ```tsx
 * // In template.tsx
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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={pageTransition}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
