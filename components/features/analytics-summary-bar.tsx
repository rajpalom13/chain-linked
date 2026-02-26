"use client"

/**
 * Analytics Summary Bar Component (FE-002)
 * @description Displays summary statistics for the selected analytics metric
 * including total, average, and percentage change with animated number transitions.
 * @module components/features/analytics-summary-bar
 */

import { useEffect } from "react"
import { motion, useSpring, useTransform } from "framer-motion"
import {
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
} from "@tabler/icons-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import type { AnalyticsSummary } from "@/hooks/use-analytics-v2"

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

/**
 * Props for the AnalyticsSummaryBar component
 */
interface AnalyticsSummaryBarProps {
  /** Summary statistics from the API */
  summary: AnalyticsSummary | null
  /** Currently selected metric */
  metric: string
  /** Whether data is loading */
  isLoading: boolean
}

/**
 * Animated number counter with spring physics
 * @param props.value - Target value to animate to
 * @param props.decimals - Number of decimal places
 * @param props.suffix - Suffix to append (e.g., "%")
 * @returns Animated number span
 */
function AnimatedNumber({
  value,
  decimals = 0,
  suffix = "",
}: {
  value: number
  decimals?: number
  suffix?: string
}) {
  const spring = useSpring(0, { stiffness: 50, damping: 20 })
  const display = useTransform(spring, (current) => {
    if (decimals > 0) {
      return `${current.toFixed(decimals)}${suffix}`
    }
    return `${Math.round(current).toLocaleString()}${suffix}`
  })

  useEffect(() => {
    if (value === 0) {
      spring.jump(0)
    } else {
      spring.set(value)
    }
  }, [spring, value])

  return <motion.span>{display}</motion.span>
}

/**
 * Analytics Summary Bar showing total, average, and change for the selected metric
 * @param props - Component props
 * @param props.summary - Summary stats (total, average, change)
 * @param props.metric - Current metric name
 * @param props.isLoading - Whether data is loading
 * @returns Summary bar card with animated numbers
 */
export function AnalyticsSummaryBar({ summary, metric, isLoading }: AnalyticsSummaryBarProps) {
  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-4">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-7 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!summary) return null

  const label = METRIC_LABELS[metric] || metric
  const isRate = metric === "engagements_rate"
  const change = summary.change
  const isPositive = change > 0
  const isNeutral = change === 0

  const TrendIcon = isNeutral ? IconMinus : isPositive ? IconTrendingUp : IconTrendingDown

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="border-border/50">
        <CardContent className="py-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Total */}
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {isRate ? "Avg Rate" : `Total ${label}`}
              </p>
              <p className="text-2xl font-bold tabular-nums text-primary">
                <AnimatedNumber
                  value={summary.total}
                  decimals={isRate ? 2 : 0}
                  suffix={isRate ? "%" : ""}
                />
              </p>
            </div>

            {/* Average */}
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Daily Average
              </p>
              <p className="text-2xl font-bold tabular-nums">
                <AnimatedNumber
                  value={summary.average}
                  decimals={summary.average < 10 ? 1 : 0}
                  suffix={isRate ? "%" : ""}
                />
              </p>
            </div>

            {/* Change */}
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                vs Previous Period
              </p>
              <div className="flex items-center gap-1.5">
                <p
                  className={cn(
                    "text-2xl font-bold tabular-nums",
                    isNeutral && "text-muted-foreground",
                    isPositive && "text-emerald-600 dark:text-emerald-400",
                    !isPositive && !isNeutral && "text-red-600 dark:text-red-400"
                  )}
                >
                  {isPositive && "+"}
                  <AnimatedNumber value={change} decimals={1} suffix="%" />
                </p>
                <TrendIcon
                  className={cn(
                    "size-5",
                    isNeutral && "text-muted-foreground",
                    isPositive && "text-emerald-600 dark:text-emerald-400",
                    !isPositive && !isNeutral && "text-red-600 dark:text-red-400"
                  )}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
