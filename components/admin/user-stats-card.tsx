/**
 * User Stats Card Component
 * @description Displays user-related statistics with trend indicators
 * @module components/admin/user-stats-card
 */

"use client"

import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconMinus,
  IconUsers,
  IconUserPlus,
  IconBrandLinkedin,
} from "@tabler/icons-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * Props for the UserStatsCard component
 */
interface UserStatsCardProps {
  /** Total registered users */
  totalUsers: number
  /** Change percentage from previous period */
  totalUsersChange: number
  /** Users active in last 7 days */
  activeUsers: number
  /** Active users change percentage */
  activeUsersChange: number
  /** Users with LinkedIn connected */
  linkedinConnections: number
  /** LinkedIn connections change percentage */
  linkedinConnectionsChange: number
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
 * UserStatsCard Component
 *
 * Displays a card with user-related statistics including total users,
 * active users, and LinkedIn connection counts with trend indicators.
 *
 * @param props - Component props
 * @returns Card displaying user statistics
 *
 * @example
 * ```tsx
 * <UserStatsCard
 *   totalUsers={1284}
 *   totalUsersChange={12.5}
 *   activeUsers={847}
 *   activeUsersChange={8.2}
 *   linkedinConnections={512}
 *   linkedinConnectionsChange={15.3}
 * />
 * ```
 */
export function UserStatsCard({
  totalUsers,
  totalUsersChange,
  activeUsers,
  activeUsersChange,
  linkedinConnections,
  linkedinConnectionsChange,
}: UserStatsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IconUsers className="size-5" />
          User Statistics
        </CardTitle>
        <CardDescription>
          Platform user metrics and growth trends
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <StatItem
          icon={<IconUsers className="size-4" />}
          label="Total Users"
          value={formatNumber(totalUsers)}
          change={totalUsersChange}
        />
        <StatItem
          icon={<IconUserPlus className="size-4" />}
          label="Active (7 days)"
          value={formatNumber(activeUsers)}
          change={activeUsersChange}
        />
        <StatItem
          icon={<IconBrandLinkedin className="size-4" />}
          label="LinkedIn Connected"
          value={formatNumber(linkedinConnections)}
          change={linkedinConnectionsChange}
        />
      </CardContent>
    </Card>
  )
}
