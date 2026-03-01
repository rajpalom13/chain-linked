"use client"

/**
 * Compose Mode Toggle
 * @description Animated tab toggle for switching between Basic and Advanced compose modes.
 * Uses Framer Motion layoutId for a sliding pill indicator.
 * @module components/features/compose/compose-mode-toggle
 */

import { motion } from "framer-motion"
import { IconSparkles, IconMessageChatbot } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import type { ComposeMode } from "@/types/compose"

/**
 * Props for ComposeModeToggle
 */
interface ComposeModeToggleProps {
  /** Currently selected mode */
  mode: ComposeMode
  /** Callback when mode changes */
  onModeChange: (mode: ComposeMode) => void
}

/**
 * Tab toggle for switching between Basic and Advanced compose modes.
 * Features a sliding pill animation using Framer Motion layoutId.
 * @param props - Component props
 * @returns Animated toggle JSX element
 */
export function ComposeModeToggle({ mode, onModeChange }: ComposeModeToggleProps) {
  return (
    <div className="flex items-center rounded-lg bg-muted/50 p-1 gap-0.5">
      <button
        onClick={() => onModeChange('basic')}
        className={cn(
          "relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200",
          mode === 'basic'
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {mode === 'basic' && (
          <motion.div
            layoutId="compose-mode-indicator"
            className="absolute inset-0 rounded-md bg-background shadow-sm"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
        <IconSparkles className="relative z-10 size-3.5" />
        <span className="relative z-10">Basic</span>
      </button>

      <button
        onClick={() => onModeChange('advanced')}
        className={cn(
          "relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200",
          mode === 'advanced'
            ? "text-destructive"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {mode === 'advanced' && (
          <motion.div
            layoutId="compose-mode-indicator"
            className="absolute inset-0 rounded-md bg-background shadow-sm"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
        <IconMessageChatbot className="relative z-10 size-3.5" />
        <span className="relative z-10">Advanced</span>
      </button>
    </div>
  )
}
