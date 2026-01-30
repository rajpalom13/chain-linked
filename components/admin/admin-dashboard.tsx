/**
 * Admin Dashboard Component
 * @description Main dashboard component that composes all admin metric cards and charts
 * @module components/admin/admin-dashboard
 */

"use client"

import {
  IconArrowDownRight,
  IconArrowUpRight,
  IconCalendarEvent,
  IconChartBar,
  IconFileText,
  IconPhoto,
  IconPlayerPlay,
  IconRefresh,
  IconSlideshow,
  IconTrendingUp,
  IconUserCheck,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import { UserStatsCard } from "./user-stats-card"
import { PostStatsCard } from "./post-stats-card"
import { SystemHealthCard } from "./system-health-card"
import { RecentActivityTable } from "./recent-activity-table"

import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { AdminDashboardData, AdminMetric, ContentTypeBreakdown, TopPerformingPost } from "@/types/admin"

/** Colors for pie chart segments */
const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
]

/** Icon mapping for content types */
const CONTENT_TYPE_ICONS: Record<string, React.ElementType> = {
  text: IconFileText,
  image: IconPhoto,
  carousel: IconSlideshow,
  video: IconPlayerPlay,
  document: IconFileText,
}

/**
 * Props for the AdminDashboard component
 */
interface AdminDashboardProps {
  /** Dashboard data from API */
  data: AdminDashboardData | null
  /** Whether data is currently loading */
  isLoading: boolean
  /** Error message if fetch failed */
  error?: string | null
  /** Callback to refresh data */
  onRefresh?: () => void
}

/**
 * MetricCard Component
 * Displays a single metric with trend indicator
 *
 * @param props - Component props
 * @param props.metric - The metric data to display
 * @returns A card displaying the metric value and trend
 */
function MetricCard({ metric }: { metric: AdminMetric }) {
  const TrendIcon = metric.trend === "up" ? IconArrowUpRight : IconArrowDownRight
  const trendColor = metric.trend === "up" ? "text-chart-4" : "text-destructive"

  return (
    <Card className="hover-lift">
      <CardHeader className="pb-2">
        <CardDescription>{metric.label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">
          {metric.displayValue}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
          <TrendIcon className="size-4" />
          <span className="font-medium">
            {metric.change > 0 ? "+" : ""}
            {metric.change}%
          </span>
          <span className="text-muted-foreground">from last month</span>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton for the dashboard
 */
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Metric cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
      </div>

      {/* System health and activity skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * Error state display
 */
function DashboardError({
  error,
  onRetry,
}: {
  error: string
  onRetry?: () => void
}) {
  return (
    <Card className="p-8">
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full bg-destructive/10 p-3">
          <IconArrowDownRight className="size-6 text-destructive" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Failed to load dashboard</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        {onRetry && (
          <Button variant="outline" onClick={onRetry}>
            <IconRefresh className="mr-2 size-4" />
            Try Again
          </Button>
        )}
      </div>
    </Card>
  )
}

/**
 * AdminDashboard Component
 *
 * The main admin dashboard that displays platform metrics, charts,
 * system health, and recent activity. Supports loading and error states.
 *
 * @param props - Component props
 * @returns The complete admin dashboard
 *
 * @example
 * ```tsx
 * <AdminDashboard
 *   data={dashboardData}
 *   isLoading={isLoading}
 *   error={error}
 *   onRefresh={refetch}
 * />
 * ```
 */
export function AdminDashboard({
  data,
  isLoading,
  error,
  onRefresh,
}: AdminDashboardProps) {
  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return <DashboardError error={error} onRetry={onRefresh} />
  }

  if (!data) {
    return <DashboardError error="No data available" onRetry={onRefresh} />
  }

  // Build overview metrics array with extended stats
  const activeUsers30d = data.extendedStats?.activeUsers30d ?? 0
  const activeUsers30dChange = data.extendedStats?.activeUsers30dChange ?? 0
  const avgEngagementRate = data.extendedStats?.averageEngagementRate ?? 0

  const overviewMetrics: AdminMetric[] = [
    {
      label: "Total Users",
      value: data.stats.totalUsers,
      displayValue: data.stats.totalUsers.toLocaleString("en-US"),
      change: data.stats.totalUsersChange,
      trend: data.stats.totalUsersChange >= 0 ? "up" : "down",
    },
    {
      label: "Active (30d)",
      value: activeUsers30d,
      displayValue: activeUsers30d.toLocaleString("en-US"),
      change: activeUsers30dChange,
      trend: activeUsers30dChange >= 0 ? "up" : "down",
    },
    {
      label: "Total Posts",
      value: data.stats.totalPosts,
      displayValue: data.stats.totalPosts.toLocaleString("en-US"),
      change: data.stats.totalPostsChange,
      trend: data.stats.totalPostsChange >= 0 ? "up" : "down",
    },
    {
      label: "Scheduled",
      value: data.stats.scheduledPosts,
      displayValue: data.stats.scheduledPosts.toLocaleString("en-US"),
      change: data.stats.scheduledPostsChange,
      trend: data.stats.scheduledPostsChange >= 0 ? "up" : "down",
    },
    {
      label: "Avg Engagement",
      value: avgEngagementRate,
      displayValue: `${avgEngagementRate.toFixed(1)}%`,
      change: 0,
      trend: "neutral",
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Refresh Button */}
      {onRefresh && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <IconRefresh className="mr-2 size-4" />
            Refresh
          </Button>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 stagger-children">
        {overviewMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconUsers className="size-5" />
              User Growth
            </CardTitle>
            <CardDescription>
              Total users over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.userGrowth}>
                  <defs>
                    <linearGradient id="userGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-chart-1)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-chart-1)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="month"
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="var(--color-chart-1)"
                    fill="url(#userGrowthGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Activity Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconCalendarEvent className="size-5" />
              Weekly Activity
            </CardTitle>
            <CardDescription>
              Posts and AI generations this week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.weeklyActivity}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="day"
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="posts"
                    fill="var(--color-chart-1)"
                    radius={[4, 4, 0, 0]}
                    name="Posts"
                  />
                  <Bar
                    dataKey="aiGenerations"
                    fill="var(--color-chart-2)"
                    radius={[4, 4, 0, 0]}
                    name="AI Generations"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Signups Chart */}
      {data.dailySignups && data.dailySignups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconTrendingUp className="size-5" />
              Daily Signups (Last 30 Days)
            </CardTitle>
            <CardDescription>
              New user registrations per day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.dailySignups}>
                  <defs>
                    <linearGradient id="signupsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="var(--color-chart-2)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="var(--color-chart-2)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="date"
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    className="text-xs fill-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="signups"
                    stroke="var(--color-chart-2)"
                    fill="url(#signupsGrad)"
                    strokeWidth={2}
                    name="Signups"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Metrics Row */}
      {data.contentMetrics && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Content Type Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconChartBar className="size-5" />
                Posts by Type
              </CardTitle>
              <CardDescription>
                Breakdown of content types across all posts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="h-[180px] w-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.contentMetrics.contentTypeBreakdown}
                        dataKey="count"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {data.contentMetrics.contentTypeBreakdown.map(
                          (entry, index) => (
                            <Cell
                              key={entry.type}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          )
                        )}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number, name: string) => [
                          `${value} posts`,
                          name.charAt(0).toUpperCase() + name.slice(1),
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-3">
                  {data.contentMetrics.contentTypeBreakdown.map((item, index) => {
                    const Icon = CONTENT_TYPE_ICONS[item.type] || IconFileText
                    return (
                      <div
                        key={item.type}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="size-3 rounded-full"
                            style={{
                              backgroundColor:
                                CHART_COLORS[index % CHART_COLORS.length],
                            }}
                          />
                          <Icon className="size-4 text-muted-foreground" />
                          <span className="text-sm capitalize">{item.type}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium tabular-nums">
                            {item.count.toLocaleString()}
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({item.percentage}%)
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Performing Posts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IconTrendingUp className="size-5" />
                Top Performing Posts
              </CardTitle>
              <CardDescription>
                Highest engagement posts on the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.contentMetrics.topPerformingPosts.length > 0 ? (
                data.contentMetrics.topPerformingPosts.map((post, index) => (
                  <div
                    key={post.id}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {post.authorName}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {post.engagementRate.toFixed(1)}% rate
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {post.contentPreview}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{post.totalEngagement} engagements</span>
                        <span>{post.impressions.toLocaleString()} impressions</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No posts data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Onboarding Funnel */}
      {data.onboardingFunnel && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconUserCheck className="size-5" />
              Onboarding Funnel
            </CardTitle>
            <CardDescription>
              User progression through onboarding steps ({data.onboardingFunnel.overallCompletionRate}% overall completion rate)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.onboardingFunnel.steps.map((step, index) => (
                <div
                  key={step.step}
                  className="relative rounded-lg border p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {step.step}
                      </div>
                      <span className="text-sm font-medium">{step.label}</span>
                    </div>
                    <span className="text-sm font-medium tabular-nums">
                      {step.completionRate}%
                    </span>
                  </div>
                  <Progress value={step.completionRate} className="h-2" />
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{step.usersCompleted.toLocaleString()} users</span>
                    {index > 0 && data.onboardingFunnel!.steps[index - 1] && (
                      <span className={
                        step.usersCompleted < data.onboardingFunnel!.steps[index - 1].usersCompleted
                          ? "text-destructive"
                          : ""
                      }>
                        {step.usersCompleted < data.onboardingFunnel!.steps[index - 1].usersCompleted
                          ? `-${data.onboardingFunnel!.steps[index - 1].usersCompleted - step.usersCompleted} drop`
                          : ""}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <IconUsersGroup className="size-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">Onboarding Summary</div>
                  <div className="text-xs text-muted-foreground">
                    {data.onboardingFunnel.totalStarted.toLocaleString()} started, {data.onboardingFunnel.totalCompleted.toLocaleString()} completed
                  </div>
                </div>
              </div>
              <Badge
                variant={data.onboardingFunnel.overallCompletionRate >= 50 ? "default" : "secondary"}
              >
                {data.onboardingFunnel.overallCompletionRate}% completion
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <UserStatsCard
          totalUsers={data.stats.totalUsers}
          totalUsersChange={data.stats.totalUsersChange}
          activeUsers={data.stats.activeUsers7d}
          activeUsersChange={data.stats.activeUsersChange}
          linkedinConnections={data.stats.linkedinConnections}
          linkedinConnectionsChange={data.stats.linkedinConnectionsChange}
        />
        <PostStatsCard
          totalPosts={data.stats.totalPosts}
          totalPostsChange={data.stats.totalPostsChange}
          scheduledPosts={data.stats.scheduledPosts}
          scheduledPostsChange={data.stats.scheduledPostsChange}
          aiGenerations={data.stats.aiGenerations}
          aiGenerationsChange={data.stats.aiGenerationsChange}
        />
      </div>

      {/* System Health and Activity Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SystemHealthCard health={data.systemHealth} />
        <RecentActivityTable activities={data.recentActivity} compact />
      </div>
    </div>
  )
}
