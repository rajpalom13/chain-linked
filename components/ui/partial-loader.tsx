"use client"

/**
 * Partial Loader Component
 * @description Progressive loading wrapper with staggered skeleton animations
 * @module components/ui/partial-loader
 */

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { IconRefresh, IconAlertCircle } from "@tabler/icons-react"

/**
 * Props for the PartialLoader component
 */
interface PartialLoaderProps {
  /** Whether the content is loading */
  isLoading: boolean
  /** Error state with optional message */
  error?: string | null
  /** Callback to retry loading on error */
  onRetry?: () => void
  /** The content to display when loaded */
  children: React.ReactNode
  /** Skeleton to display while loading */
  skeleton?: React.ReactNode
  /** Number of skeleton items to show (if using default skeleton) */
  skeletonCount?: number
  /** Delay before showing skeleton (ms) - prevents flash for fast loads */
  delay?: number
  /** Minimum loading duration (ms) - prevents jarring quick transitions */
  minDuration?: number
  /** Additional CSS classes */
  className?: string
  /** Animation stagger delay between items (ms) */
  staggerDelay?: number
}

/**
 * Animated skeleton with shimmer effect
 */
export function AnimatedSkeleton({
  className,
  delay = 0,
  ...props
}: React.ComponentProps<typeof Skeleton> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: delay / 1000, duration: 0.3 }}
    >
      <Skeleton
        className={cn(
          "relative overflow-hidden",
          "before:absolute before:inset-0",
          "before:-translate-x-full before:animate-[shimmer_2s_infinite]",
          "before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
          className
        )}
        {...props}
      />
    </motion.div>
  )
}

/**
 * Default card skeleton with staggered animation
 */
function DefaultCardSkeleton({ index, staggerDelay }: { index: number; staggerDelay: number }) {
  const delay = index * staggerDelay

  return (
    <motion.div
      className="p-4 border rounded-lg space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay / 1000, duration: 0.3 }}
    >
      <div className="flex items-center gap-3">
        <AnimatedSkeleton className="size-10 rounded-full" delay={delay} />
        <div className="space-y-2 flex-1">
          <AnimatedSkeleton className="h-4 w-32" delay={delay + 50} />
          <AnimatedSkeleton className="h-3 w-48" delay={delay + 100} />
        </div>
      </div>
      <AnimatedSkeleton className="h-4 w-full" delay={delay + 150} />
      <AnimatedSkeleton className="h-4 w-3/4" delay={delay + 200} />
    </motion.div>
  )
}

/**
 * Error state with retry button
 */
function ErrorState({
  error,
  onRetry,
}: {
  error: string
  onRetry?: () => void
}) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-8 text-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="rounded-full bg-destructive/10 p-3 mb-4">
        <IconAlertCircle className="size-6 text-destructive" />
      </div>
      <h3 className="font-medium text-sm mb-1">Something went wrong</h3>
      <p className="text-xs text-muted-foreground max-w-[280px] mb-4">
        {error}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="gap-2"
        >
          <IconRefresh className="size-4" />
          Try Again
        </Button>
      )}
    </motion.div>
  )
}

/**
 * PartialLoader - Progressive loading wrapper with staggered skeleton animations.
 * Prevents UI flash for fast loads and provides smooth transitions.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <PartialLoader isLoading={isLoading}>
 *   <MyContent />
 * </PartialLoader>
 *
 * // With custom skeleton
 * <PartialLoader
 *   isLoading={isLoading}
 *   skeleton={<MyCustomSkeleton />}
 * >
 *   <MyContent />
 * </PartialLoader>
 *
 * // With error handling
 * <PartialLoader
 *   isLoading={isLoading}
 *   error={error}
 *   onRetry={refetch}
 * >
 *   <MyContent />
 * </PartialLoader>
 * ```
 */
export function PartialLoader({
  isLoading,
  error,
  onRetry,
  children,
  skeleton,
  skeletonCount = 3,
  delay = 100,
  minDuration = 300,
  className,
  staggerDelay = 100,
}: PartialLoaderProps) {
  const [showSkeleton, setShowSkeleton] = React.useState(false)
  const [shouldRender, setShouldRender] = React.useState(!isLoading)
  const loadStartTime = React.useRef<number | null>(null)

  // Handle delayed skeleton display (prevents flash for fast loads)
  React.useEffect(() => {
    if (isLoading) {
      loadStartTime.current = Date.now()
      const timer = setTimeout(() => {
        setShowSkeleton(true)
      }, delay)
      return () => clearTimeout(timer)
    } else {
      // Ensure minimum duration before hiding skeleton
      const elapsed = loadStartTime.current
        ? Date.now() - loadStartTime.current
        : minDuration

      const remainingTime = Math.max(0, minDuration - elapsed)

      const timer = setTimeout(() => {
        setShowSkeleton(false)
        setShouldRender(true)
      }, remainingTime)

      return () => clearTimeout(timer)
    }
  }, [isLoading, delay, minDuration])

  // Error state
  if (error) {
    return (
      <div className={className}>
        <ErrorState error={error} onRetry={onRetry} />
      </div>
    )
  }

  return (
    <AnimatePresence mode="wait">
      {isLoading && showSkeleton ? (
        <motion.div
          key="skeleton"
          className={cn("space-y-4", className)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {skeleton || (
            Array.from({ length: skeletonCount }).map((_, i) => (
              <DefaultCardSkeleton
                key={i}
                index={i}
                staggerDelay={staggerDelay}
              />
            ))
          )}
        </motion.div>
      ) : shouldRender ? (
        <motion.div
          key="content"
          className={className}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

/**
 * Staggered container for multiple items with progressive reveal
 */
export function StaggeredContainer({
  children,
  className,
  staggerDelay = 50,
}: {
  children: React.ReactNode
  className?: string
  staggerDelay?: number
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay / 1000,
          },
        },
      }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Staggered item for use within StaggeredContainer
 */
export function StaggeredItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}
