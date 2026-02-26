"use client"

/**
 * Analytics Trend Chart Component (FE-003 + FE-004 + FE-005)
 * @description Recharts AreaChart displaying the selected metric over time with
 * gradient fill, optional comparison overlay, responsive layout, and tooltips.
 * @module components/features/analytics-trend-chart
 */

import * as React from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  ComposedChart,
} from "recharts"
import { motion } from "framer-motion"
import {
  IconChartLine,
  IconTrendingUp,
} from "@tabler/icons-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { fadeSlideUpVariants } from "@/lib/animations"
import type { AnalyticsDataPoint } from "@/hooks/use-analytics-v2"

/** Metric display labels */
const METRIC_LABELS: Record<string, string> = {
  impressions: "Impressions",
  unique_reach: "Unique Reach",
  reactions: "Reactions",
  comments: "Comments",
  reposts: "Reposts",
  saves: "Saves",
  sends: "Sends",
  engagements: "Engagements",
  engagements_rate: "Engagement Rate",
}

/** Primary chart color (CSS custom property) */
const PRIMARY_COLOR = "oklch(0.55 0.15 230)"
/** Comparison series color */
const COMPARISON_COLOR = "oklch(0.65 0.12 330)"

/**
 * Props for the AnalyticsTrendChart component
 */
interface AnalyticsTrendChartProps {
  /** Current period data points */
  data: AnalyticsDataPoint[]
  /** Comparison period data points (optional) */
  comparisonData: AnalyticsDataPoint[] | null
  /** Currently selected metric name */
  metric: string
  /** Whether comparison mode is active */
  compareActive: boolean
  /** Whether data is loading */
  isLoading: boolean
}

/**
 * Format date for tooltip display
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/**
 * Format date for X-axis tick display
 * @param dateString - ISO date string
 * @returns Short formatted date
 */
function formatAxisDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/**
 * Format Y-axis values with K/M suffixes
 * @param value - Numeric value
 * @returns Formatted string
 */
function formatYAxis(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return String(value)
}

/**
 * Loading skeleton for the chart
 */
function ChartSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-[280px] w-full rounded-lg" />
    </div>
  )
}

/**
 * Empty state with chart icon
 */
function EmptyState() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 text-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="mb-4 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 p-4"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <IconChartLine className="size-8 text-primary" />
      </motion.div>
      <motion.h3
        className="text-lg font-medium"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        No analytics data yet
      </motion.h3>
      <motion.p
        className="mt-1 max-w-sm text-sm text-muted-foreground"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        Analytics data will appear after your first daily sync.
      </motion.p>
    </motion.div>
  )
}

/**
 * Analytics Trend Chart with optional comparison overlay
 * @param props - Component props
 * @param props.data - Current period data points
 * @param props.comparisonData - Previous period data points for overlay
 * @param props.metric - Selected metric name
 * @param props.compareActive - Whether comparison is enabled
 * @param props.isLoading - Loading state
 * @returns AreaChart card with gradient fills and comparison line overlay
 */
export function AnalyticsTrendChart({
  data,
  comparisonData,
  metric,
  compareActive,
  isLoading,
}: AnalyticsTrendChartProps) {
  const metricLabel = METRIC_LABELS[metric] || metric
  const hasData = data.length > 0
  const showComparison = compareActive && comparisonData && comparisonData.length > 0

  const chartConfig: ChartConfig = {
    value: {
      label: metricLabel,
      color: PRIMARY_COLOR,
    },
    ...(showComparison
      ? {
          compValue: {
            label: `Previous ${metricLabel}`,
            color: COMPARISON_COLOR,
          },
        }
      : {}),
  }

  // Merge current and comparison data for the composed chart
  // Align comparison data by relative position (day index)
  const chartData = React.useMemo(() => {
    if (!showComparison) {
      return data.map((d) => ({ date: d.date, value: d.value }))
    }

    return data.map((d, i) => ({
      date: d.date,
      value: d.value,
      compValue: comparisonData[i]?.value ?? null,
    }))
  }, [data, comparisonData, showComparison])

  // Calculate tick interval based on data length
  const tickInterval = React.useMemo(() => {
    if (data.length <= 7) return 0
    if (data.length <= 14) return 1
    if (data.length <= 31) return 4
    if (data.length <= 90) return 13
    return Math.floor(data.length / 8)
  }, [data.length])

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <ChartSkeleton />
      </Card>
    )
  }

  return (
    <motion.div
      variants={fadeSlideUpVariants}
      initial="initial"
      animate="animate"
    >
      <Card className="group relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-primary/5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg dark:from-card dark:via-card dark:to-primary/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />

        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <IconTrendingUp className="size-4 text-primary" />
            </div>
            {metricLabel} Trend
          </CardTitle>
          <CardDescription>
            {showComparison
              ? `Comparing current and previous period ${metricLabel.toLowerCase()}`
              : `Your ${metricLabel.toLowerCase()} over the selected time period`}
          </CardDescription>
        </CardHeader>

        <CardContent className="relative px-2 pt-0 sm:px-6">
          {!hasData ? (
            <EmptyState />
          ) : (
            <motion.div
              key={`${metric}-${compareActive}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <ChartContainer
                config={chartConfig}
                className="aspect-auto h-[280px] w-full"
              >
                {showComparison ? (
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="fill-trend-current" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PRIMARY_COLOR} stopOpacity={0.5} />
                        <stop offset="50%" stopColor={PRIMARY_COLOR} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={PRIMARY_COLOR} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--border)"
                      strokeOpacity={0.5}
                    />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      interval={tickInterval}
                      tickFormatter={formatAxisDate}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={formatYAxis}
                      width={48}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    />
                    <ChartTooltip
                      cursor={{
                        stroke: "var(--primary)",
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                      }}
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value) => formatDate(value as string)}
                          indicator="dot"
                          className="rounded-xl border-border/50 bg-card/95 backdrop-blur-sm"
                        />
                      }
                    />
                    <Area
                      dataKey="value"
                      type="monotone"
                      fill="url(#fill-trend-current)"
                      stroke={PRIMARY_COLOR}
                      strokeWidth={2.5}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                    <Line
                      dataKey="compValue"
                      type="monotone"
                      stroke={COMPARISON_COLOR}
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={false}
                      animationDuration={1200}
                      animationEasing="ease-out"
                      connectNulls={false}
                    />
                  </ComposedChart>
                ) : (
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="fill-trend-main" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PRIMARY_COLOR} stopOpacity={0.5} />
                        <stop offset="50%" stopColor={PRIMARY_COLOR} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={PRIMARY_COLOR} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--border)"
                      strokeOpacity={0.5}
                    />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      interval={tickInterval}
                      tickFormatter={formatAxisDate}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={formatYAxis}
                      width={48}
                      tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    />
                    <ChartTooltip
                      cursor={{
                        stroke: "var(--primary)",
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                      }}
                      content={
                        <ChartTooltipContent
                          labelFormatter={(value) => formatDate(value as string)}
                          indicator="dot"
                          className="rounded-xl border-border/50 bg-card/95 backdrop-blur-sm"
                        />
                      }
                    />
                    <Area
                      dataKey="value"
                      type="monotone"
                      fill="url(#fill-trend-main)"
                      stroke={PRIMARY_COLOR}
                      strokeWidth={2.5}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                )}
              </ChartContainer>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
