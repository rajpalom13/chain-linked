"use client"

import * as React from "react"
import {
  IconX,
  IconSparkles,
  IconEye,
  IconThumbUp,
  IconClick,
  IconChartLine,
} from "@tabler/icons-react"
import { formatDistanceToNow, format } from "date-fns"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { cn } from "@/lib/utils"

/**
 * Daily metrics data point for a post
 */
export interface PostMetrics {
  /** Date string in ISO format (YYYY-MM-DD) */
  date: string
  /** Number of impressions on this date */
  impressions: number
  /** Number of engagements on this date */
  engagements: number
  /** Number of likes on this date */
  likes: number
  /** Number of comments on this date */
  comments: number
  /** Number of shares on this date */
  shares: number
  /** Number of link clicks on this date */
  clicks: number
}

/**
 * Top comment on a post
 */
export interface TopComment {
  /** Unique identifier for the comment */
  id: string
  /** Commenter name */
  authorName: string
  /** Comment text */
  content: string
  /** Number of likes on this comment */
  likes: number
}

/**
 * Audience breakdown segment
 */
export interface AudienceSegment {
  /** Segment label (e.g., "Software Engineer", "Product Manager") */
  label: string
  /** Percentage of audience in this segment */
  percentage: number
}

/**
 * Complete post performance data
 */
export interface PostPerformanceData {
  /** Unique identifier for the post */
  id: string
  /** Post content text */
  content: string
  /** ISO 8601 timestamp of when the post was published */
  publishedAt: string
  /** Author information */
  author: {
    /** Display name of the author */
    name: string
    /** Avatar image URL, or undefined for fallback */
    avatarUrl?: string
  }
  /** Total impressions across all days */
  totalImpressions: number
  /** Total engagements across all days */
  totalEngagements: number
  /** Overall engagement rate as a percentage */
  engagementRate: number
  /** Daily metrics data for charting */
  metrics: PostMetrics[]
  /** Top comments on the post (optional) */
  topComments?: TopComment[]
  /** Audience breakdown by job title/industry (optional) */
  audienceBreakdown?: AudienceSegment[]
}

/**
 * Props for the PostPerformance component
 */
export interface PostPerformanceProps {
  /** Post performance data to display */
  post?: PostPerformanceData
  /** Whether the component is in a loading state */
  isLoading?: boolean
  /** Callback fired when the close button is clicked */
  onClose?: () => void
  /** Callback fired when the remix button is clicked */
  onRemix?: (postId: string) => void
  /** Additional CSS classes to apply to the container */
  className?: string
}

/**
 * Sample data for development and testing purposes.
 */
export const samplePostPerformance: PostPerformanceData = {
  id: "post-perf-1",
  content:
    "Just shipped a feature that took 3 months to build. The key insight? We spent 80% of the time talking to customers and only 20% actually coding. The result: 95% adoption rate in the first week. Sometimes the best engineering is knowing when NOT to engineer. Here's what I learned about building products that people actually want...",
  publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  author: {
    name: "Sarah Chen",
    avatarUrl: undefined,
  },
  totalImpressions: 45230,
  totalEngagements: 2856,
  engagementRate: 6.3,
  metrics: [
    { date: "2024-01-06", impressions: 12450, engagements: 890, likes: 650, comments: 145, shares: 95, clicks: 234 },
    { date: "2024-01-07", impressions: 9820, engagements: 720, likes: 520, comments: 112, shares: 88, clicks: 198 },
    { date: "2024-01-08", impressions: 7560, engagements: 485, likes: 345, comments: 78, shares: 62, clicks: 156 },
    { date: "2024-01-09", impressions: 5890, engagements: 312, likes: 225, comments: 52, shares: 35, clicks: 112 },
    { date: "2024-01-10", impressions: 4230, engagements: 218, likes: 158, comments: 34, shares: 26, clicks: 78 },
    { date: "2024-01-11", impressions: 3120, engagements: 145, likes: 105, comments: 22, shares: 18, clicks: 54 },
    { date: "2024-01-12", impressions: 2160, engagements: 86, likes: 62, comments: 14, shares: 10, clicks: 32 },
  ],
  topComments: [
    {
      id: "comment-1",
      authorName: "John Doe",
      content: "This is exactly what we experienced at our startup. Customer discovery is underrated!",
      likes: 45,
    },
    {
      id: "comment-2",
      authorName: "Jane Smith",
      content: "Would love to hear more about your interview process with customers.",
      likes: 32,
    },
  ],
  audienceBreakdown: [
    { label: "Software Engineers", percentage: 35 },
    { label: "Product Managers", percentage: 25 },
    { label: "Founders/CEOs", percentage: 18 },
    { label: "Designers", percentage: 12 },
    { label: "Other", percentage: 10 },
  ],
}

/**
 * Chart configuration for Recharts styling
 */
const chartConfig = {
  impressions: {
    label: "Impressions",
    color: "oklch(0.55 0.15 230)",
  },
  engagements: {
    label: "Engagements",
    color: "oklch(0.65 0.18 250)",
  },
} satisfies ChartConfig

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
 * Formats a number into a compact, human-readable string.
 * @param num - The number to format
 * @returns Formatted string (e.g., "1.2K", "3.4M")
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

/**
 * Formats a date string for display in charts
 * @param dateString - ISO date string (YYYY-MM-DD)
 * @returns Formatted date string (e.g., "Jan 15")
 */
function formatChartDate(dateString: string): string {
  const date = new Date(dateString)
  return format(date, "MMM d")
}

/**
 * Loading skeleton for the post performance component.
 */
function PostPerformanceSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Post Preview Skeleton */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>

        {/* Metrics Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </div>

        {/* Chart Skeleton */}
        <Skeleton className="h-[200px] w-full" />

        {/* Actions Skeleton */}
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-20" />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Renders a single metric card.
 */
function MetricCard({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  className?: string
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        <span>{label}</span>
      </div>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

/**
 * Renders the engagement breakdown section.
 */
function EngagementBreakdown({ metrics }: { metrics: PostMetrics[] }) {
  // Calculate totals from all days
  const totals = metrics.reduce(
    (acc, day) => ({
      likes: acc.likes + day.likes,
      comments: acc.comments + day.comments,
      shares: acc.shares + day.shares,
      clicks: acc.clicks + day.clicks,
    }),
    { likes: 0, comments: 0, shares: 0, clicks: 0 }
  )

  const total = totals.likes + totals.comments + totals.shares + totals.clicks

  const breakdownItems = [
    { label: "Likes", value: totals.likes, color: "bg-blue-500" },
    { label: "Comments", value: totals.comments, color: "bg-green-500" },
    { label: "Shares", value: totals.shares, color: "bg-purple-500" },
    { label: "Clicks", value: totals.clicks, color: "bg-orange-500" },
  ]

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Engagement Breakdown</h4>
      <div className="space-y-2">
        {breakdownItems.map((item) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0
          return (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium tabular-nums">
                  {formatNumber(item.value)} ({percentage.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", item.color)}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Empty state component displayed when there is no post data.
 */
function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          <IconChartLine className="size-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-sm mb-1">No post selected</h3>
        <p className="text-xs text-muted-foreground max-w-[240px]">
          Select a post to view detailed performance analytics.
        </p>
      </CardContent>
    </Card>
  )
}

/**
 * PostPerformance displays detailed analytics for a single LinkedIn post,
 * including metrics over time, engagement breakdown, and performance insights.
 *
 * Features:
 * - Post content preview with author info
 * - Key metrics summary (impressions, engagements, engagement rate)
 * - Line chart showing metrics over 7 days
 * - Engagement breakdown (likes, comments, shares, clicks)
 * - Actions: Remix and Close
 *
 * @example
 * ```tsx
 * <PostPerformance
 *   post={postData}
 *   onClose={() => console.log("Close")}
 *   onRemix={(id) => console.log("Remix:", id)}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With loading state
 * <PostPerformance isLoading />
 * ```
 *
 * @example
 * ```tsx
 * // With sample data
 * import { PostPerformance, samplePostPerformance } from "@/components/features/post-performance"
 *
 * <PostPerformance post={samplePostPerformance} />
 * ```
 */
export function PostPerformance({
  post,
  isLoading = false,
  onClose,
  onRemix,
  className,
}: PostPerformanceProps) {
  if (isLoading) {
    return (
      <div className={className}>
        <PostPerformanceSkeleton />
      </div>
    )
  }

  if (!post) {
    return (
      <div className={className}>
        <EmptyState />
      </div>
    )
  }

  const relativeTime = formatDistanceToNow(new Date(post.publishedAt), {
    addSuffix: true,
  })

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <IconChartLine className="size-5" />
              Post Performance
            </CardTitle>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="size-8"
                aria-label="Close"
              >
                <IconX className="size-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Post Preview */}
          <div className="space-y-3 p-3 rounded-lg bg-muted/30 border">
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                {post.author.avatarUrl && (
                  <AvatarImage src={post.author.avatarUrl} alt={post.author.name} />
                )}
                <AvatarFallback className="text-sm font-medium">
                  {getInitials(post.author.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm">{post.author.name}</span>
                <p className="text-xs text-muted-foreground">{relativeTime}</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed line-clamp-3">{post.content}</p>
          </div>

          {/* Key Metrics Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              icon={IconEye}
              label="Impressions"
              value={formatNumber(post.totalImpressions)}
            />
            <MetricCard
              icon={IconThumbUp}
              label="Engagements"
              value={formatNumber(post.totalEngagements)}
            />
            <MetricCard
              icon={IconChartLine}
              label="Eng. Rate"
              value={`${post.engagementRate.toFixed(1)}%`}
            />
            <MetricCard
              icon={IconClick}
              label="Total Clicks"
              value={formatNumber(
                post.metrics.reduce((acc, m) => acc + m.clicks, 0)
              )}
            />
          </div>

          {/* Performance Chart */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Performance Over Time</h4>
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[200px] w-full"
            >
              <LineChart
                data={post.metrics}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={formatChartDate}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) =>
                    value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
                  }
                  width={40}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => formatChartDate(value as string)}
                      indicator="dot"
                    />
                  }
                />
                <Line
                  dataKey="impressions"
                  type="monotone"
                  stroke="var(--color-impressions)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  dataKey="engagements"
                  type="monotone"
                  stroke="var(--color-engagements)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          </div>

          {/* Engagement Breakdown */}
          <EngagementBreakdown metrics={post.metrics} />

          {/* Audience Breakdown (if available) */}
          {post.audienceBreakdown && post.audienceBreakdown.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Audience Breakdown</h4>
              <div className="flex flex-wrap gap-2">
                {post.audienceBreakdown.map((segment) => (
                  <Badge
                    key={segment.label}
                    variant="secondary"
                    className="text-xs"
                  >
                    {segment.label}: {segment.percentage}%
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="default"
              size="sm"
              onClick={() => onRemix?.(post.id)}
              className="gap-1.5"
            >
              <IconSparkles className="size-4" />
              Remix
            </Button>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
