"use client"

/**
 * Goals Tracker Component
 * @description Tracks posting goals with progress indicators, kebab menus, dialog editing, and streak display
 * @module components/features/goals-tracker
 */

import * as React from "react"
import {
  IconFlame,
  IconPencil,
  IconCheck,
  IconTarget,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
  IconDotsVertical,
  IconTrash,
  IconPlus,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Represents a posting goal with period, target, and progress tracking
 */
export interface Goal {
  /** Unique identifier for the goal */
  id: string
  /** The time period for this goal */
  period: "daily" | "weekly" | "monthly"
  /** Target number of posts for the period */
  target: number
  /** Current number of posts completed */
  current: number
  /** Start date of the goal period (ISO string) */
  startDate: string
  /** End date of the goal period (ISO string) */
  endDate: string
}

/**
 * Props for the GoalsTracker component
 */
export interface GoalsTrackerProps {
  /** Array of goals to display and track */
  goals?: Goal[]
  /** Current posting streak in days */
  currentStreak?: number
  /** Best posting streak achieved in days */
  bestStreak?: number
  /** Callback when a goal target is updated */
  onUpdateGoal?: (goalId: string, target: number) => void
  /** Callback when a goal is removed */
  onRemoveGoal?: (goalId: string) => void
  /** Callback when a new goal is created */
  onCreateGoal?: (period: "daily" | "weekly" | "monthly", target: number) => void
  /** Whether the component is in a loading state */
  isLoading?: boolean
}

/** All available goal periods */
const ALL_PERIODS: Goal["period"][] = ["daily", "weekly", "monthly"]

/** Period display labels for the dialog */
const PERIOD_LABELS: Record<Goal["period"], string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
}

/**
 * Returns a human-readable label for the goal period
 * @param period - The period type (daily, weekly, monthly)
 * @returns Formatted period label
 */
function getPeriodLabel(period: Goal["period"]): string {
  switch (period) {
    case "daily":
      return "Today"
    case "weekly":
      return "This Week"
    case "monthly":
      return "This Month"
    default:
      return period
  }
}

/**
 * Calculates the progress percentage for a goal
 * @param current - Current progress value
 * @param target - Target value
 * @returns Progress percentage (0-100)
 */
function calculateProgress(current: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(Math.round((current / target) * 100), 100)
}

/**
 * Determines the status of a goal based on progress and time remaining
 * @param goal - The goal to evaluate
 * @returns Object with status type, message, and variant for styling
 */
function getGoalStatus(goal: Goal): {
  type: "on-track" | "behind" | "reached" | "at-risk"
  message: string
  variant: "default" | "secondary" | "destructive" | "outline"
  Icon: typeof IconTrendingUp
} {
  const progress = calculateProgress(goal.current, goal.target)
  const now = new Date()
  const endDate = new Date(goal.endDate)
  const startDate = new Date(goal.startDate)

  // Calculate time progress
  const totalDuration = endDate.getTime() - startDate.getTime()
  const elapsed = now.getTime() - startDate.getTime()
  const timeProgress = Math.min((elapsed / totalDuration) * 100, 100)

  // Goal reached
  if (goal.current >= goal.target) {
    return {
      type: "reached",
      message: "Goal reached!",
      variant: "default",
      Icon: IconCheck,
    }
  }

  // Ahead of schedule (progress > time elapsed)
  if (progress >= timeProgress) {
    return {
      type: "on-track",
      message: "On track",
      variant: "secondary",
      Icon: IconTrendingUp,
    }
  }

  // Significantly behind (less than half expected progress)
  if (progress < timeProgress * 0.5) {
    return {
      type: "behind",
      message: "Falling behind",
      variant: "destructive",
      Icon: IconTrendingDown,
    }
  }

  // Slightly behind
  return {
    type: "at-risk",
    message: "At risk",
    variant: "outline",
    Icon: IconMinus,
  }
}

/**
 * Custom progress bar component with visual percentage indicator
 * @param props - Component props
 * @param props.value - Progress value (0-100)
 * @param props.className - Additional CSS classes for the track
 * @param props.indicatorClassName - Additional CSS classes for the fill
 * @returns Progress bar element
 */
function ProgressBar({
  value,
  className,
  indicatorClassName,
}: {
  value: number
  className?: string
  indicatorClassName?: string
}) {
  return (
    <div
      className={cn(
        "bg-secondary relative h-2.5 w-full overflow-hidden rounded-full",
        className
      )}
    >
      <div
        className={cn(
          "bg-primary h-full rounded-full transition-all duration-500 ease-out",
          indicatorClassName
        )}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  )
}

/**
 * Circular progress ring SVG component for visual goal tracking
 * @param props - Component props
 * @param props.value - Progress value (0-100)
 * @param props.size - Diameter of the ring in pixels
 * @param props.strokeWidth - Width of the ring stroke
 * @param props.className - Additional CSS classes for the indicator stroke
 * @returns SVG progress ring element
 */
function ProgressRing({
  value,
  size = 48,
  strokeWidth = 4,
  className,
}: {
  value: number
  size?: number
  strokeWidth?: number
  className?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (Math.min(value, 100) / 100) * circumference

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        fill="none"
        className="stroke-secondary"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        className={cn("stroke-primary transition-all duration-700 ease-out", className)}
        style={{
          strokeDasharray: circumference,
          strokeDashoffset: offset,
        }}
      />
    </svg>
  )
}

/**
 * Dialog for creating or editing a posting goal
 * @param props.open - Whether dialog is open
 * @param props.onOpenChange - Callback to toggle open state
 * @param props.editingGoal - Goal being edited (null for create mode)
 * @param props.usedPeriods - Periods already in use (filtered out of selector during creation)
 * @param props.onSave - Callback with period and target when saved
 */
function GoalFormDialog({
  open,
  onOpenChange,
  editingGoal,
  usedPeriods,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingGoal: Goal | null
  usedPeriods: Goal["period"][]
  onSave: (period: Goal["period"], target: number) => void
}) {
  const isEditMode = editingGoal !== null
  const [period, setPeriod] = React.useState<Goal["period"] | "">(
    editingGoal?.period ?? ""
  )
  const [targetValue, setTargetValue] = React.useState(
    editingGoal?.target.toString() ?? ""
  )

  // Reset form state when the dialog opens with a different goal
  React.useEffect(() => {
    if (open) {
      setPeriod(editingGoal?.period ?? "")
      setTargetValue(editingGoal?.target.toString() ?? "")
    }
  }, [open, editingGoal])

  const availablePeriods = ALL_PERIODS.filter(
    (p) => !usedPeriods.includes(p) || p === editingGoal?.period
  )

  const parsedTarget = parseInt(targetValue, 10)
  const isValid = (isEditMode || period !== "") && !isNaN(parsedTarget) && parsedTarget >= 1

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    const selectedPeriod = isEditMode ? editingGoal!.period : (period as Goal["period"])
    onSave(selectedPeriod, parsedTarget)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Goal" : "Create Goal"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? `Update your ${PERIOD_LABELS[editingGoal!.period].toLowerCase()} posting target.`
                : "Set a new posting goal to track your content creation."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Period selector */}
            <div className="grid gap-2">
              <Label htmlFor="goal-period">Period</Label>
              {isEditMode ? (
                <Input
                  id="goal-period"
                  value={PERIOD_LABELS[editingGoal!.period]}
                  disabled
                />
              ) : (
                <Select
                  value={period}
                  onValueChange={(v) => setPeriod(v as Goal["period"])}
                >
                  <SelectTrigger id="goal-period" className="w-full">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePeriods.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PERIOD_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Target input */}
            <div className="grid gap-2">
              <Label htmlFor="goal-target">Target Posts</Label>
              <Input
                id="goal-target"
                type="number"
                min={1}
                placeholder="e.g. 5"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                autoFocus={isEditMode}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid}>
              {isEditMode ? "Save Changes" : "Create Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Individual goal card component with progress tracking, kebab menu, and editing via dialog
 * @param props.goal - The goal data
 * @param props.onEditGoal - Callback when "Edit" is selected from kebab menu
 * @param props.onRemoveGoal - Callback when goal is removed
 */
function GoalCard({
  goal,
  onEditGoal,
  onRemoveGoal,
}: {
  goal: Goal
  onEditGoal?: (goal: Goal) => void
  onRemoveGoal?: (goalId: string) => void
}) {
  const [showRemoveDialog, setShowRemoveDialog] = React.useState(false)

  const progress = calculateProgress(goal.current, goal.target)
  const status = getGoalStatus(goal)

  const periodTooltips = {
    daily: "Track your daily posting goal. Resets every day at midnight.",
    weekly: "Track your weekly posting goal. Resets every Monday.",
    monthly: "Track your monthly posting goal. Resets on the 1st of each month.",
  }

  return (
    <>
      <div className="bg-muted/50 space-y-3 rounded-lg p-4 transition-colors duration-200 hover:bg-muted/70">
        <div className="flex items-center justify-between">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-help">
                  <IconTarget className="text-muted-foreground size-4" />
                  <span className="text-sm font-medium">{getPeriodLabel(goal.period)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{periodTooltips[goal.period]}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex items-center gap-1.5">
            <Badge variant={status.variant} className="gap-1">
              <status.Icon className="size-3" />
              {status.message}
            </Badge>
            {/* Kebab menu */}
            {(onEditGoal || onRemoveGoal) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <IconDotsVertical className="size-4" />
                    <span className="sr-only">Goal actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEditGoal && (
                    <DropdownMenuItem onClick={() => onEditGoal(goal)}>
                      <IconPencil className="size-4 mr-2" />
                      Edit Goal
                    </DropdownMenuItem>
                  )}
                  {onRemoveGoal && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setShowRemoveDialog(true)}
                    >
                      <IconTrash className="size-4 mr-2" />
                      Remove Goal
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Progress Ring */}
          <div className="relative flex-shrink-0">
            <ProgressRing
              value={progress}
              size={48}
              strokeWidth={4}
              className={cn(
                status.type === "reached" && "stroke-green-500",
                status.type === "behind" && "stroke-destructive",
                status.type === "at-risk" && "stroke-yellow-500"
              )}
            />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums">
              {progress}%
            </span>
          </div>

          {/* Progress Bar and Stats */}
          <div className="flex-1 space-y-2">
            <ProgressBar
              value={progress}
              className="h-2"
              indicatorClassName={cn(
                status.type === "reached" && "bg-green-500",
                status.type === "behind" && "bg-destructive",
                status.type === "at-risk" && "bg-yellow-500"
              )}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-semibold tabular-nums">{goal.current}</span>
                <span className="text-muted-foreground text-sm">/</span>
                <span className="text-lg font-semibold tabular-nums">{goal.target}</span>
                <span className="text-muted-foreground text-sm">posts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Remove Goal Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove your {goal.period} posting goal? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onRemoveGoal?.(goal.id)
                setShowRemoveDialog(false)
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/**
 * Streak display component with fire icon and best streak comparison
 */
function StreakSection({
  currentStreak,
  bestStreak,
}: {
  currentStreak: number
  bestStreak: number
}) {
  const isNewBest = currentStreak >= bestStreak && currentStreak > 0

  return (
    <div className="bg-muted/50 flex items-center justify-between rounded-lg p-4">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-3 cursor-help">
              <div
                className={cn(
                  "flex size-10 items-center justify-center rounded-full",
                  currentStreak > 0
                    ? "bg-orange-500/10 text-orange-500"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <IconFlame className="size-5" />
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold tabular-nums">{currentStreak}</span>
                  <span className="text-muted-foreground text-sm">
                    {currentStreak === 1 ? "day" : "days"}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">Current Streak</p>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>Your posting streak shows consecutive days you&apos;ve posted at least once. Keep posting daily to maintain your streak!</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="text-right">
        {isNewBest && currentStreak > 0 ? (
          <Badge variant="default" className="gap-1">
            <IconTrendingUp className="size-3" />
            New best!
          </Badge>
        ) : (
          <div className="text-muted-foreground text-sm">
            Best: <span className="font-medium tabular-nums">{bestStreak}</span> days
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Loading skeleton for the goals tracker
 */
function GoalsTrackerSkeleton() {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Goal card skeletons */}
        {[1, 2].map((i) => (
          <div key={i} className="space-y-3 rounded-lg bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-2.5 w-full" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-12" />
            </div>
          </div>
        ))}
        {/* Streak skeleton */}
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-5 w-24" />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * GoalsTracker component for tracking posting goals with visual progress indicators.
 *
 * Displays posting goals for different time periods (daily, weekly, monthly) with:
 * - Progress bars showing completion percentage
 * - Status badges indicating if user is on track, behind, or has reached their goal
 * - Kebab menu on each goal card with Edit and Remove actions via dialog
 * - "Add Goal" button for creating new goals
 * - Streak tracking with current and best streak display
 * - "Create First Goal" placeholder when no goals are set
 *
 * @example
 * ```tsx
 * <GoalsTracker
 *   goals={goals}
 *   currentStreak={10}
 *   bestStreak={15}
 *   onUpdateGoal={(id, target) => updateGoal(id, target)}
 *   onRemoveGoal={(id) => removeGoal(id)}
 *   onCreateGoal={(period, target) => createGoal(period, target)}
 * />
 * ```
 */
export function GoalsTracker({
  goals = [],
  currentStreak = 0,
  bestStreak = 0,
  onUpdateGoal,
  onRemoveGoal,
  onCreateGoal,
  isLoading = false,
}: GoalsTrackerProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingGoal, setEditingGoal] = React.useState<Goal | null>(null)

  if (isLoading) {
    return <GoalsTrackerSkeleton />
  }

  // Sort goals by period priority (daily > weekly > monthly)
  const sortedGoals = [...goals].sort((a, b) => {
    const priority = { daily: 0, weekly: 1, monthly: 2 }
    return priority[a.period] - priority[b.period]
  })

  // Calculate overall progress summary
  const totalCurrent = goals.reduce((sum, g) => sum + g.current, 0)
  const totalTarget = goals.reduce((sum, g) => sum + g.target, 0)
  const overallProgress = calculateProgress(totalCurrent, totalTarget)

  // Check if we have any data to show
  const hasGoals = goals.length > 0
  const hasStreakData = currentStreak > 0 || bestStreak > 0
  const usedPeriods = goals.map((g) => g.period)
  const canAddGoal = usedPeriods.length < ALL_PERIODS.length

  /** Open the dialog in create mode */
  const handleOpenCreate = () => {
    setEditingGoal(null)
    setDialogOpen(true)
  }

  /** Open the dialog in edit mode */
  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setDialogOpen(true)
  }

  /** Handle save from dialog (routes to create or update) */
  const handleDialogSave = (period: Goal["period"], target: number) => {
    if (editingGoal) {
      onUpdateGoal?.(editingGoal.id, target)
    } else {
      onCreateGoal?.(period, target)
    }
  }

  return (
    <>
      <Card hover>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconTarget className="size-5" />
                Posting Goals
              </CardTitle>
              <CardDescription>
                Track your content creation progress across different time periods
              </CardDescription>
            </div>
            {canAddGoal && onCreateGoal && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={handleOpenCreate}
              >
                <IconPlus className="size-3.5" />
                Add Goal
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall progress summary */}
          {goals.length > 0 && (
            <div className="bg-primary/5 space-y-2 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium tabular-nums">{overallProgress}%</span>
              </div>
              <ProgressBar value={overallProgress} className="h-1.5" />
            </div>
          )}

          {/* Individual goal cards */}
          {sortedGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEditGoal={onUpdateGoal ? handleEditGoal : undefined}
              onRemoveGoal={onRemoveGoal}
            />
          ))}

          {/* Empty state for goals */}
          {!hasGoals && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="rounded-full bg-gradient-to-br from-primary/15 to-secondary/10 p-4">
                <IconTarget className="size-7 text-primary" />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">No posting goals yet</h4>
                <p className="text-muted-foreground text-xs max-w-[220px]">
                  Set a posting goal to start tracking your content creation progress.
                </p>
              </div>
              {onCreateGoal && (
                <Button
                  variant="default"
                  size="sm"
                  className="gap-1.5 mt-1"
                  onClick={handleOpenCreate}
                >
                  <IconPlus className="size-3.5" />
                  Create First Goal
                </Button>
              )}
            </div>
          )}

          {/* Streak section - only show if there's streak data or goals */}
          {(hasStreakData || hasGoals) && (
            <StreakSection currentStreak={currentStreak} bestStreak={bestStreak} />
          )}
        </CardContent>
      </Card>

      {/* Goal create / edit dialog */}
      <GoalFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingGoal={editingGoal}
        usedPeriods={usedPeriods}
        onSave={handleDialogSave}
      />
    </>
  )
}
