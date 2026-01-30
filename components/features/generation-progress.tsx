"use client"

/**
 * Generation Progress Component
 * @description Displays progress indicator for AI suggestion generation
 * @module components/features/generation-progress
 */

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  IconLoader2,
  IconSparkles,
  IconCheck,
  IconAlertCircle,
  IconBrain,
  IconFileText,
  IconDeviceFloppy,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"

/**
 * Generation status type
 */
export type GenerationStatus = "preparing" | "generating" | "expanding" | "saving" | "completed" | "error"

/**
 * Props for the GenerationProgress component
 */
export interface GenerationProgressProps {
  /** Current progress percentage (0-100) */
  progress: number
  /** Whether generation is currently in progress */
  isGenerating: boolean
  /** Error message if generation failed */
  error?: string | null
  /** Optional CSS class name */
  className?: string
}

/**
 * Status configuration for each generation phase
 */
const STATUS_CONFIG: Record<GenerationStatus, {
  label: string
  description: string
  Icon: React.ElementType
  color: string
}> = {
  preparing: {
    label: "Preparing",
    description: "Analyzing your company context...",
    Icon: IconBrain,
    color: "text-blue-500",
  },
  generating: {
    label: "Generating Ideas",
    description: "Creating personalized post ideas...",
    Icon: IconSparkles,
    color: "text-amber-500",
  },
  expanding: {
    label: "Expanding Posts",
    description: "Writing full-length post content...",
    Icon: IconFileText,
    color: "text-purple-500",
  },
  saving: {
    label: "Saving",
    description: "Storing your new suggestions...",
    Icon: IconDeviceFloppy,
    color: "text-green-500",
  },
  completed: {
    label: "Complete",
    description: "Your suggestions are ready!",
    Icon: IconCheck,
    color: "text-green-500",
  },
  error: {
    label: "Error",
    description: "Something went wrong",
    Icon: IconAlertCircle,
    color: "text-destructive",
  },
}

/**
 * Determines the current status based on progress percentage
 * @param progress - Progress percentage (0-100)
 * @param error - Whether there's an error
 * @returns The current generation status
 */
function getStatusFromProgress(progress: number, error: boolean): GenerationStatus {
  if (error) return "error"
  if (progress >= 100) return "completed"
  if (progress >= 80) return "saving"
  if (progress >= 40) return "expanding"
  if (progress >= 10) return "generating"
  return "preparing"
}

/**
 * GenerationProgress displays an animated progress indicator for AI suggestion generation.
 *
 * Features:
 * - Animated progress bar with smooth transitions
 * - Status text that changes based on progress phase
 * - Completion animation with confetti-like effect
 * - Error state display
 * - Framer Motion animations for smooth UX
 *
 * @example
 * ```tsx
 * // Basic usage
 * <GenerationProgress
 *   progress={45}
 *   isGenerating={true}
 * />
 *
 * // With error
 * <GenerationProgress
 *   progress={30}
 *   isGenerating={false}
 *   error="Failed to connect to AI service"
 * />
 * ```
 */
export function GenerationProgress({
  progress,
  isGenerating,
  error,
  className,
}: GenerationProgressProps) {
  const status = getStatusFromProgress(progress, !!error)
  const config = STATUS_CONFIG[status]
  const StatusIcon = config.Icon

  return (
    <AnimatePresence mode="wait">
      {(isGenerating || error) && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className={cn("overflow-hidden", className)}
        >
          <Card className={cn(
            "border-border/50",
            error && "border-destructive/50 bg-destructive/5",
            status === "completed" && "border-green-500/50 bg-green-500/5"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {/* Icon */}
                <motion.div
                  key={status}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className={cn(
                    "flex items-center justify-center size-10 rounded-full",
                    status === "error" ? "bg-destructive/10" : "bg-primary/10"
                  )}
                >
                  {status === "completed" ? (
                    <StatusIcon className={cn("size-5", config.color)} />
                  ) : status === "error" ? (
                    <StatusIcon className={cn("size-5", config.color)} />
                  ) : (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <IconLoader2 className={cn("size-5", config.color)} />
                    </motion.div>
                  )}
                </motion.div>

                {/* Text and Progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <motion.span
                      key={config.label}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm font-medium"
                    >
                      {config.label}
                    </motion.span>
                    {!error && (
                      <motion.span
                        key={progress}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                        className="text-sm font-medium tabular-nums text-muted-foreground"
                      >
                        {Math.round(progress)}%
                      </motion.span>
                    )}
                  </div>

                  <motion.p
                    key={config.description}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-muted-foreground mb-2"
                  >
                    {error || config.description}
                  </motion.p>

                  {/* Progress Bar */}
                  {!error && (
                    <motion.div
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      style={{ transformOrigin: "left" }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                    >
                      <Progress
                        value={progress}
                        className={cn(
                          "h-2",
                          status === "completed" && "[&>div]:bg-green-500"
                        )}
                      />
                    </motion.div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Compact inline version of the generation progress indicator
 */
export function GenerationProgressInline({
  progress,
  isGenerating,
}: {
  progress: number
  isGenerating: boolean
}) {
  if (!isGenerating) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="flex items-center gap-2 text-sm text-muted-foreground"
    >
      <IconLoader2 className="size-4 animate-spin text-primary" />
      <span>Generating...</span>
      <span className="tabular-nums font-medium">{Math.round(progress)}%</span>
    </motion.div>
  )
}
