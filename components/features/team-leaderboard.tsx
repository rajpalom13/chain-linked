"use client"

import * as React from "react"
import {
  IconTrophy,
  IconChartBar,
  IconArrowUp,
  IconArrowDown,
  IconMinus,
} from "@tabler/icons-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

/**
 * Statistics for a team member on the leaderboard
 */
export interface TeamMemberStats {
  /** Unique identifier for the team member */
  id: string
  /** Display name of the team member */
  name: string
  /** Avatar image URL, or undefined for fallback */
  avatarUrl?: string
  /** Job title or role */
  role: string
  /** Number of posts published this week */
  postsThisWeek: number
  /** Number of posts published this month */
  postsThisMonth: number
  /** Total engagement count (likes, comments, shares) */
  totalEngagement: number
  /** Engagement rate as a percentage */
  engagementRate: number
  /** Current rank position */
  rank: number
  /** Change in rank from previous period (positive = moved up, negative = moved down, 0 = no change) */
  rankChange: number
}

/**
 * Time range options for the leaderboard
 */
export type LeaderboardTimeRange = "week" | "month" | "all-time"

/**
 * Props for the TeamLeaderboard component
 */
export interface TeamLeaderboardProps {
  /** Array of team member statistics to display */
  members?: TeamMemberStats[]
  /** Currently selected time range */
  timeRange?: LeaderboardTimeRange
  /** Callback fired when time range selection changes */
  onTimeRangeChange?: (range: LeaderboardTimeRange) => void
  /** Callback fired when a member row is clicked */
  onMemberClick?: (memberId: string) => void
  /** Whether the component is in a loading state */
  isLoading?: boolean
  /** ID of the current user to highlight their row */
  currentUserId?: string
  /** Additional CSS classes to apply to the container */
  className?: string
}

/**
 * Generates initials from a full name.
 * @param name - Full name to extract initials from
 * @returns Two-letter initials string
 */
function getInitials(name: string): string {
  const parts = name.split(" ").filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * Returns the styling for rank position badges.
 * @param rank - The rank position (1, 2, 3, or other)
 * @returns Object with background and text color classes
 */
function getRankStyle(rank: number): { bg: string; text: string } {
  switch (rank) {
    case 1:
      return { bg: "bg-yellow-500/20", text: "text-yellow-600 dark:text-yellow-400" }
    case 2:
      return { bg: "bg-slate-300/30", text: "text-slate-600 dark:text-slate-300" }
    case 3:
      return { bg: "bg-amber-600/20", text: "text-amber-700 dark:text-amber-500" }
    default:
      return { bg: "bg-muted", text: "text-muted-foreground" }
  }
}

/**
 * Returns the rank change indicator with icon and color.
 * @param change - The rank change value
 * @returns Object with Icon component and color class
 */
function getRankChangeIndicator(change: number): {
  Icon: React.ElementType
  color: string
  label: string
} {
  if (change > 0) {
    return {
      Icon: IconArrowUp,
      color: "text-green-600 dark:text-green-400",
      label: `Up ${change}`,
    }
  }
  if (change < 0) {
    return {
      Icon: IconArrowDown,
      color: "text-red-600 dark:text-red-400",
      label: `Down ${Math.abs(change)}`,
    }
  }
  return {
    Icon: IconMinus,
    color: "text-muted-foreground",
    label: "No change",
  }
}

/**
 * Loading skeleton for a single leaderboard row.
 */
function LeaderboardRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 border-b last:border-b-0">
      <Skeleton className="size-8 rounded-full" />
      <Skeleton className="size-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-6" />
      </div>
    </div>
  )
}

/**
 * Loading skeleton for the entire leaderboard.
 */
function LeaderboardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-56" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {Array.from({ length: 5 }).map((_, index) => (
          <LeaderboardRowSkeleton key={index} />
        ))}
      </CardContent>
    </Card>
  )
}

/**
 * Renders a single leaderboard row for a team member.
 */
function LeaderboardRow({
  member,
  timeRange,
  isCurrentUser,
  onClick,
}: {
  member: TeamMemberStats
  timeRange: LeaderboardTimeRange
  isCurrentUser: boolean
  onClick?: () => void
}) {
  const rankStyle = getRankStyle(member.rank)
  const rankChangeIndicator = getRankChangeIndicator(member.rankChange)
  const postsCount = timeRange === "week" ? member.postsThisWeek : member.postsThisMonth

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 w-full text-left transition-colors border-b last:border-b-0",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        isCurrentUser && "bg-primary/5 hover:bg-primary/10"
      )}
    >
      {/* Rank Badge */}
      <div
        className={cn(
          "flex items-center justify-center size-8 rounded-full font-bold text-sm",
          rankStyle.bg,
          rankStyle.text
        )}
        title={`Rank ${member.rank}`}
      >
        {member.rank <= 3 ? (
          <IconTrophy className="size-4" />
        ) : (
          member.rank
        )}
      </div>

      {/* Avatar */}
      <Avatar className="size-10">
        {member.avatarUrl && (
          <AvatarImage src={member.avatarUrl} alt={member.name} />
        )}
        <AvatarFallback className="text-sm font-medium">
          {getInitials(member.name)}
        </AvatarFallback>
      </Avatar>

      {/* Name and Role */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{member.name}</span>
          {isCurrentUser && (
            <Badge variant="secondary" className="text-[10px]">
              You
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{member.role}</p>
      </div>

      {/* Metrics */}
      <div className="flex items-center gap-4 text-sm">
        <div className="text-right min-w-[48px]" title="Posts">
          <span className="font-medium tabular-nums">{postsCount}</span>
          <span className="text-xs text-muted-foreground ml-1">posts</span>
        </div>
        <div className="text-right min-w-[48px]" title="Engagement Rate">
          <span className="font-medium tabular-nums">{member.engagementRate.toFixed(1)}%</span>
        </div>
        <div
          className={cn("flex items-center gap-0.5", rankChangeIndicator.color)}
          title={rankChangeIndicator.label}
        >
          <rankChangeIndicator.Icon className="size-4" />
          {member.rankChange !== 0 && (
            <span className="text-xs tabular-nums">{Math.abs(member.rankChange)}</span>
          )}
        </div>
      </div>
    </button>
  )
}

/**
 * Empty state component displayed when there are no members.
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-3 mb-4">
        <IconChartBar className="size-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-sm mb-1">No team members yet</h3>
      <p className="text-xs text-muted-foreground max-w-[240px] mb-4">
        Add team members to start tracking their LinkedIn performance.
      </p>
      <a
        href="/dashboard/team"
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Set Up Team
      </a>
    </div>
  )
}

/**
 * TeamLeaderboard displays a ranked list of team members with their
 * LinkedIn posting and engagement metrics.
 *
 * Features:
 * - Time range tabs (Week/Month/All Time)
 * - Ranked list with position badges (gold, silver, bronze for top 3)
 * - Avatar, name, and role for each member
 * - Metrics: posts count and engagement rate
 * - Rank change indicator (up/down arrows)
 * - Highlight current user row
 * - Loading skeleton state
 *
 * @example
 * ```tsx
 * <TeamLeaderboard
 *   members={teamMembers}
 *   timeRange="week"
 *   onTimeRangeChange={(range) => console.log("Range:", range)}
 *   onMemberClick={(id) => console.log("Member:", id)}
 *   currentUserId="member-3"
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With loading state
 * <TeamLeaderboard isLoading />
 * ```
 *
 * @example
 * ```tsx
 * // With data
 * <TeamLeaderboard members={teamMembers} />
 * ```
 */
export function TeamLeaderboard({
  members,
  timeRange = "week",
  onTimeRangeChange,
  onMemberClick,
  isLoading = false,
  currentUserId,
  className,
}: TeamLeaderboardProps) {
  // Sort members by rank - must be called before any early returns
  const sortedMembers = React.useMemo(() => {
    if (!members) return []
    return [...members].sort((a, b) => a.rank - b.rank)
  }, [members])

  const handleTimeRangeChange = React.useCallback(
    (value: string) => {
      if (value && onTimeRangeChange) {
        onTimeRangeChange(value as LeaderboardTimeRange)
      }
    },
    [onTimeRangeChange]
  )

  if (isLoading) {
    return (
      <div className={className}>
        <LeaderboardSkeleton />
      </div>
    )
  }

  return (
    <div className={className}>
      <Card>
        <Tabs value={timeRange} onValueChange={handleTimeRangeChange}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <IconTrophy className="size-5 text-yellow-500" />
                Team Leaderboard
              </CardTitle>
              <TabsList>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="all-time">All Time</TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Column Headers */}
            <div className="flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground border-b bg-muted/30">
              <div className="size-8" /> {/* Rank column */}
              <div className="size-10" /> {/* Avatar column */}
              <div className="flex-1">Member</div>
              <div className="flex items-center gap-4">
                <div className="text-right min-w-[48px]">Posts</div>
                <div className="text-right min-w-[48px]">Eng. Rate</div>
                <div className="w-8 text-center">Trend</div>
              </div>
            </div>

            <TabsContent value="week" className="mt-0">
              {sortedMembers.length === 0 ? (
                <EmptyState />
              ) : (
                sortedMembers.map((member) => (
                  <LeaderboardRow
                    key={member.id}
                    member={member}
                    timeRange="week"
                    isCurrentUser={member.id === currentUserId}
                    onClick={onMemberClick ? () => onMemberClick(member.id) : undefined}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="month" className="mt-0">
              {sortedMembers.length === 0 ? (
                <EmptyState />
              ) : (
                sortedMembers.map((member) => (
                  <LeaderboardRow
                    key={member.id}
                    member={member}
                    timeRange="month"
                    isCurrentUser={member.id === currentUserId}
                    onClick={onMemberClick ? () => onMemberClick(member.id) : undefined}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="all-time" className="mt-0">
              {sortedMembers.length === 0 ? (
                <EmptyState />
              ) : (
                sortedMembers.map((member) => (
                  <LeaderboardRow
                    key={member.id}
                    member={member}
                    timeRange="all-time"
                    isCurrentUser={member.id === currentUserId}
                    onClick={onMemberClick ? () => onMemberClick(member.id) : undefined}
                  />
                ))
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  )
}
