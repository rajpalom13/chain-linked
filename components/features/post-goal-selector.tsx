"use client"

/**
 * Post Goal Selector Component
 * @description Visual card-based selector for choosing post goals (narrative,
 * educational, engagement, visual) with optional format refinement chips.
 * Replaces the confusing PostTypeSelector dropdown with an intuitive two-tier UI.
 * @module components/features/post-goal-selector
 */

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  IconBook,
  IconSchool,
  IconMessages,
  IconPresentation,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import {
  type PostTypeId,
  type PostTypeDefinition,
  getPostTypesGrouped,
} from "@/lib/ai/post-types"
import { GOAL_LABELS, type GoalCategory } from "@/lib/ai/post-types"
import { Badge } from "@/components/ui/badge"
import {
  staggerContainerVariants,
  staggerScaleItemVariants,
  scalePopVariants,
  staggerFastContainerVariants,
} from "@/lib/animations"

/**
 * Props for PostGoalSelector component
 */
export interface PostGoalSelectorProps {
  /** Currently selected goal category */
  selectedGoal?: GoalCategory
  /** Currently selected format (post type ID) */
  selectedFormat?: PostTypeId
  /** Callback when a goal is clicked */
  onGoalChange: (goal: GoalCategory | undefined) => void
  /** Callback when a format chip is clicked */
  onFormatChange: (format: PostTypeId | undefined) => void
  /** Goal categories to exclude from display */
  excludeGoals?: GoalCategory[]
}

/**
 * Icon mapping for goal categories
 */
const GOAL_ICONS: Record<GoalCategory, React.ComponentType<{ className?: string }>> = {
  narrative: IconBook,
  educational: IconSchool,
  engagement: IconMessages,
  visual: IconPresentation,
}

/**
 * Border accent colors for goal cards
 */
const GOAL_ACCENT_COLORS: Record<GoalCategory, string> = {
  narrative: 'border-l-blue-500',
  educational: 'border-l-emerald-500',
  engagement: 'border-l-orange-500',
  visual: 'border-l-purple-500',
}

/**
 * Background tint when goal card is selected
 */
const GOAL_SELECTED_BG: Record<GoalCategory, string> = {
  narrative: 'bg-blue-500/5 border-blue-500/30',
  educational: 'bg-emerald-500/5 border-emerald-500/30',
  engagement: 'bg-orange-500/5 border-orange-500/30',
  visual: 'bg-purple-500/5 border-purple-500/30',
}

/**
 * Icon tint colors
 */
const GOAL_ICON_COLORS: Record<GoalCategory, string> = {
  narrative: 'text-blue-500',
  educational: 'text-emerald-500',
  engagement: 'text-orange-500',
  visual: 'text-purple-500',
}

/**
 * Visual card-based post goal selector.
 *
 * Two-tier selection:
 * 1. Goal cards (always visible) — 4 high-level categories
 * 2. Format chips (shown after goal selection) — specific post formats within the category
 *
 * @param props - Component props
 * @returns PostGoalSelector JSX element
 *
 * @example
 * <PostGoalSelector
 *   selectedGoal={goal}
 *   selectedFormat={format}
 *   onGoalChange={setGoal}
 *   onFormatChange={setFormat}
 *   excludeGoals={['visual']}
 * />
 */
export function PostGoalSelector({
  selectedGoal,
  selectedFormat,
  onGoalChange,
  onFormatChange,
  excludeGoals = [],
}: PostGoalSelectorProps) {
  const grouped = React.useMemo(() => getPostTypesGrouped(), [])

  /** Goal categories to display */
  const goals = React.useMemo(() => {
    const allGoals: GoalCategory[] = ['narrative', 'educational', 'engagement', 'visual']
    return allGoals.filter((g) => !excludeGoals.includes(g))
  }, [excludeGoals])

  /** Formats available for the selected goal */
  const formats: PostTypeDefinition[] = React.useMemo(() => {
    if (!selectedGoal) return []
    return grouped[selectedGoal] || []
  }, [selectedGoal, grouped])

  /**
   * Handles goal card click — toggle selection
   */
  const handleGoalClick = (goal: GoalCategory) => {
    if (selectedGoal === goal) {
      onGoalChange(undefined)
      onFormatChange(undefined)
    } else {
      onGoalChange(goal)
      onFormatChange(undefined)
    }
  }

  /**
   * Handles format chip click — toggle selection
   */
  const handleFormatClick = (formatId: PostTypeId) => {
    if (selectedFormat === formatId) {
      onFormatChange(undefined)
    } else {
      onFormatChange(formatId)
    }
  }

  return (
    <div className="space-y-3">
      {/* Tier 1: Goal Cards */}
      <motion.div
        className="grid grid-cols-2 gap-2"
        variants={staggerContainerVariants}
        initial="initial"
        animate="animate"
      >
        {goals.map((goal) => {
          const meta = GOAL_LABELS[goal]
          const Icon = GOAL_ICONS[goal]
          const isSelected = selectedGoal === goal

          return (
            <motion.button
              key={goal}
              type="button"
              variants={staggerScaleItemVariants}
              onClick={() => handleGoalClick(goal)}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border border-l-[3px] p-3 text-left transition-all",
                "hover:bg-accent/50 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2",
                GOAL_ACCENT_COLORS[goal],
                isSelected
                  ? GOAL_SELECTED_BG[goal]
                  : "border-border"
              )}
            >
              <Icon className={cn("size-5 shrink-0 mt-0.5", GOAL_ICON_COLORS[goal])} />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{meta.label}</p>
                <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                  {meta.description}
                </p>
              </div>
            </motion.button>
          )
        })}
      </motion.div>

      {/* Tier 2: Format Chips */}
      <AnimatePresence mode="wait">
        {selectedGoal && formats.length > 0 && (
          <motion.div
            key={selectedGoal}
            variants={staggerFastContainerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-wrap gap-1.5"
          >
            {formats.map((format) => {
              const isActive = selectedFormat === format.id

              return (
                <motion.div key={format.id} variants={scalePopVariants}>
                  <Badge
                    variant={isActive ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer select-none transition-all text-xs px-2.5 py-1",
                      "hover:bg-accent hover:text-accent-foreground",
                      isActive && "hover:bg-primary hover:text-primary-foreground"
                    )}
                    onClick={() => handleFormatClick(format.id as PostTypeId)}
                  >
                    {format.label}
                  </Badge>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
