/**
 * Recent Activity Table Component
 * @description Displays a table/feed of recent platform activity events
 * @module components/admin/recent-activity-table
 */

"use client"

import {
  IconBrandLinkedin,
  IconPencil,
  IconSparkles,
  IconUserPlus,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AdminActivityEvent } from "@/types/admin"

/**
 * Props for the RecentActivityTable component
 */
interface RecentActivityTableProps {
  /** Array of activity events to display */
  activities: AdminActivityEvent[]
  /** Optional title override */
  title?: string
  /** Optional description override */
  description?: string
  /** Whether to show in compact feed mode vs table mode */
  compact?: boolean
}

/**
 * Returns an icon component for a given activity event type
 * @param type - The activity event type
 * @returns Object with icon component and color class
 */
function getActivityIcon(type: AdminActivityEvent["type"]): {
  Icon: typeof IconUserPlus
  colorClass: string
} {
  switch (type) {
    case "signup":
      return { Icon: IconUserPlus, colorClass: "text-chart-4" }
    case "post_created":
      return { Icon: IconPencil, colorClass: "text-chart-1" }
    case "ai_generation":
      return { Icon: IconSparkles, colorClass: "text-chart-2" }
    case "linkedin_connected":
      return { Icon: IconBrandLinkedin, colorClass: "text-chart-3" }
  }
}

/**
 * Returns a human-readable label for an activity type
 * @param type - The activity event type
 * @returns Display label string
 */
function getActivityLabel(type: AdminActivityEvent["type"]): string {
  switch (type) {
    case "signup":
      return "Sign Up"
    case "post_created":
      return "Post Created"
    case "ai_generation":
      return "AI Generation"
    case "linkedin_connected":
      return "LinkedIn Connected"
  }
}

/**
 * Formats a timestamp into a relative time string
 * @param timestamp - ISO timestamp string
 * @returns Human-readable relative time (e.g. "12m ago", "3h ago")
 */
function formatRelativeTime(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  const diffWeeks = Math.floor(diffDays / 7)
  return `${diffWeeks}w ago`
}

/**
 * Formats a timestamp to a readable date/time string
 * @param timestamp - ISO timestamp string
 * @returns Formatted date string
 */
function formatDateTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

/**
 * Compact feed item for the activity feed view
 */
function FeedItem({ activity }: { activity: AdminActivityEvent }) {
  const { Icon, colorClass } = getActivityIcon(activity.type)

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon className={`size-4 ${colorClass}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{activity.userName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {activity.description}
        </p>
      </div>
      <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground">
        {formatRelativeTime(activity.timestamp)}
      </Badge>
    </div>
  )
}

/**
 * RecentActivityTable Component
 *
 * Displays recent platform activity in either a table format or
 * a compact feed format. Shows user actions like signups, posts,
 * AI generations, and LinkedIn connections.
 *
 * @param props - Component props
 * @returns Card with activity table or feed
 *
 * @example
 * ```tsx
 * // Table mode
 * <RecentActivityTable activities={activities} />
 *
 * // Compact feed mode
 * <RecentActivityTable activities={activities} compact />
 * ```
 */
export function RecentActivityTable({
  activities,
  title = "Recent Activity",
  description = "Latest platform events across all users",
  compact = false,
}: RecentActivityTableProps) {
  if (compact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activities.length > 0 ? (
              activities.map((activity) => (
                <FeedItem key={activity.id} activity={activity} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No recent activity
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.length > 0 ? (
                activities.map((activity) => {
                  const { Icon, colorClass } = getActivityIcon(activity.type)
                  return (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">
                        {activity.userName}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className={`size-4 ${colorClass}`} />
                          <span className="text-sm">
                            {getActivityLabel(activity.type)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {activity.description}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className="text-xs text-muted-foreground"
                        >
                          {formatDateTime(activity.timestamp)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No recent activity
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
