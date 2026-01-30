/**
 * Post Stats Card Component
 * @description Displays post generation and publishing statistics
 * @module components/admin/post-stats-card
 */

"use client"

import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconMinus,
  IconFileText,
  IconCalendarEvent,
  IconSparkles,
} from "@tabler/icons-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * Props for the PostStatsCard component
 */
interface PostStatsCardProps {
  /** Total posts created on the platform */
  totalPosts: number
  /** Total posts change percentage */
  totalPostsChange: number
  /** Posts currently scheduled */
  scheduledPosts: number
  /** Scheduled posts change percentage */
  scheduledPostsChange: number
  /** Total AI generation runs */
  aiGenerations: number
  /** AI generations change percentage */
  aiGenerationsChange: number
}

/**
 * Formats a number with thousand separators
 * @param num - Number to format
 * @returns Formatted string with commas
 */
function formatNumber(num: number): string {
  return num.toLocaleString("en-US")
}

/**
 * Returns the appropriate trend icon and color based on the change value
 * @param change - Percentage change value
 * @returns Object with icon component and color class
 */
function getTrendIndicator(change: number): {
  Icon: typeof IconArrowUpRight
  colorClass: string
} {
  if (change > 0) {
    return { Icon: IconArrowUpRight, colorClass: "text-chart-4" }
  } else if (change < 0) {
    return { Icon: IconArrowDownRight, colorClass: "text-destructive" }
  }
  return { Icon: IconMinus, colorClass: "text-muted-foreground" }
}

/**
 * Individual stat item within the card
 */
function StatItem({
  icon,
  label,
  value,
  change,
}: {
  icon: React.ReactNode
  label: string
  value: string
  change: number
}) {
  const { Icon: TrendIcon, colorClass } = getTrendIndicator(change)

  return (
    <div className="flex items-start justify-between rounded-lg border p-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          {label}
        </div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <div className={`flex items-center gap-1 text-xs ${colorClass}`}>
          <TrendIcon className="size-3" />
          <span>
            {change > 0 ? "+" : ""}
            {change.toFixed(1)}%
          </span>
          <span className="text-muted-foreground">vs last month</span>
        </div>
      </div>
    </div>
  )
}

/**
 * PostStatsCard Component
 *
 * Displays a card with post-related statistics including total posts created,
 * scheduled posts, and AI generation counts with trend indicators.
 *
 * @param props - Component props
 * @returns Card displaying post statistics
 *
 * @example
 * ```tsx
 * <PostStatsCard
 *   totalPosts={5621}
 *   totalPostsChange={15.3}
 *   scheduledPosts={342}
 *   scheduledPostsChange={-3.1}
 *   aiGenerations={12847}
 *   aiGenerationsChange={24.7}
 * />
 * ```
 */
export function PostStatsCard({
  totalPosts,
  totalPostsChange,
  scheduledPosts,
  scheduledPostsChange,
  aiGenerations,
  aiGenerationsChange,
}: PostStatsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconFileText className="size-5" />
          Content Statistics
        </CardTitle>
        <CardDescription>
          Post creation and AI generation metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <StatItem
          icon={<IconFileText className="size-4" />}
          label="Total Posts"
          value={formatNumber(totalPosts)}
          change={totalPostsChange}
        />
        <StatItem
          icon={<IconCalendarEvent className="size-4" />}
          label="Scheduled"
          value={formatNumber(scheduledPosts)}
          change={scheduledPostsChange}
        />
        <StatItem
          icon={<IconSparkles className="size-4" />}
          label="AI Generations"
          value={formatNumber(aiGenerations)}
          change={aiGenerationsChange}
        />
      </CardContent>
    </Card>
  )
}
