"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Props for the Progress component
 */
interface ProgressProps extends React.ComponentProps<"div"> {
  /** The current progress value (0-100) */
  value?: number
  /** Maximum value (defaults to 100) */
  max?: number
  /** Visual indicator color variant */
  variant?: "default" | "success" | "error"
}

/**
 * A progress bar component for displaying completion status.
 *
 * @example
 * ```tsx
 * <Progress value={75} />
 * <Progress value={100} variant="success" />
 * <Progress value={50} variant="error" />
 * ```
 */
function Progress({
  className,
  value = 0,
  max = 100,
  variant = "default",
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        "bg-muted relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className={cn(
          "h-full transition-all duration-300 ease-in-out",
          variant === "default" && "bg-primary",
          variant === "success" && "bg-green-500",
          variant === "error" && "bg-destructive"
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

export { Progress, type ProgressProps }
