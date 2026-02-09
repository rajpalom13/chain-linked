"use client"

/**
 * Analytics Cards Component
 * @description Enhanced analytics cards with animations, sparklines, and beautiful gradients
 * @module components/features/analytics-cards
 */

import { useEffect, useState } from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'
import {
  IconEye,
  IconSearch,
  IconThumbUp,
  IconUser,
  IconUserPlus,
  IconUsers,
  IconUsersGroup,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  staggerContainerVariants,
  staggerItemVariants,
  cardHoverProps,
} from '@/lib/animations'

/**
 * Metric data structure for analytics cards
 */
interface MetricData {
  value: number
  change: number
}

/**
 * Props for the AnalyticsCards component
 */
export interface AnalyticsCardsProps {
  impressions?: MetricData
  engagementRate?: MetricData
  followers?: MetricData
  profileViews?: MetricData
  searchAppearances?: MetricData
  connections?: MetricData
  membersReached?: MetricData
}

/** Default zero values when no data is available */
const DEFAULT_METRICS: Required<AnalyticsCardsProps> = {
  impressions: { value: 0, change: 0 },
  engagementRate: { value: 0, change: 0 },
  followers: { value: 0, change: 0 },
  profileViews: { value: 0, change: 0 },
  searchAppearances: { value: 0, change: 0 },
  connections: { value: 0, change: 0 },
  membersReached: { value: 0, change: 0 },
}

/**
 * Animated number counter component
 * Shows value immediately when 0, animates only for non-zero values
 */
function AnimatedNumber({
  value,
  decimals = 0,
  suffix = '',
  prefix = '',
}: {
  value: number
  decimals?: number
  suffix?: string
  prefix?: string
}) {
  const spring = useSpring(0, { stiffness: 50, damping: 20 })
  const display = useTransform(spring, (current) => {
    if (decimals > 0) {
      return `${prefix}${current.toFixed(decimals)}${suffix}`
    }
    return `${prefix}${Math.round(current).toLocaleString()}${suffix}`
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
 * Mini sparkline chart component
 */
function Sparkline({
  data,
  color = 'primary',
  height = 24,
}: {
  data: number[]
  color?: 'primary' | 'secondary' | 'success' | 'destructive'
  height?: number
}) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const colorClasses = {
    primary: 'from-primary/40 to-primary/10',
    secondary: 'from-secondary/40 to-secondary/10',
    success: 'from-success/40 to-success/10',
    destructive: 'from-destructive/40 to-destructive/10',
  }

  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {data.map((value, i) => {
        const normalizedHeight = ((value - min) / range) * 100
        return (
          <motion.div
            key={i}
            className={`flex-1 rounded-t bg-gradient-to-t ${colorClasses[color]}`}
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(normalizedHeight, 10)}%` }}
            transition={{
              duration: 0.5,
              delay: i * 0.05,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
        )
      })}
    </div>
  )
}

/**
 * Generate sample sparkline data based on trend
 */
function generateSparklineData(isPositive: boolean): number[] {
  const base = 50
  const points = 12
  const data: number[] = []

  for (let i = 0; i < points; i++) {
    const trend = isPositive ? i * 2 : -i * 1.5
    const random = (Math.random() - 0.5) * 20
    data.push(Math.max(10, base + trend + random))
  }

  return data
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value)
}

function formatPercentage(value: number): string {
  const sign = value >= 0 ? "+" : ""
  return `${sign}${value.toFixed(1)}%`
}

function getTrend(change: number) {
  const isPositive = change >= 0
  return {
    isPositive,
    Icon: isPositive ? IconTrendingUp : IconTrendingDown,
  }
}

/**
 * Single metric card component with animations
 */
interface MetricCardProps {
  title: string
  value: number
  change: number
  icon: React.ElementType
  suffix?: string
  decimals?: number
  footerText: {
    positive: string
    negative: string
  }
  description: string
  tooltip: string
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  suffix = '',
  decimals = 0,
  footerText,
  description,
  tooltip,
}: MetricCardProps) {
  const trend = getTrend(change)
  const sparklineData = generateSparklineData(trend.isPositive)

  return (
    <motion.div
      variants={staggerItemVariants}
      {...cardHoverProps}
    >
      <Card className="@container/card group relative overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-primary/5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg dark:from-card dark:via-card dark:to-primary/10 card-glow">
        {/* Subtle glow effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />

        <CardHeader className="relative">
          <div className="flex items-start justify-between">
            <div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CardDescription className="flex items-center gap-2 cursor-help">
                      <div className="rounded-lg bg-primary/10 p-1.5">
                        <Icon className="size-3.5 text-primary" />
                      </div>
                      {title}
                    </CardDescription>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <CardTitle className="mt-2 text-2xl font-bold tabular-nums @[250px]/card:text-3xl">
                <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
              </CardTitle>
            </div>
            <CardAction>
              <Badge
                variant="outline"
                className={`gap-1 ${
                  trend.isPositive
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-destructive/30 bg-destructive/10 text-destructive'
                }`}
              >
                <trend.Icon className="size-3" />
                {formatPercentage(change)}
              </Badge>
            </CardAction>
          </div>

          {/* Sparkline */}
          <div className="mt-3">
            <Sparkline
              data={sparklineData}
              color={trend.isPositive ? 'primary' : 'destructive'}
              height={32}
            />
          </div>
        </CardHeader>

        <CardFooter className="relative flex-col items-start gap-1.5 border-t border-border/50 pt-3 text-sm">
          <div className="line-clamp-1 flex items-center gap-2 font-medium">
            {trend.isPositive ? footerText.positive : footerText.negative}
            <trend.Icon className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {description}
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

/**
 * Analytics cards component displaying LinkedIn-specific metrics with animations
 */
export function AnalyticsCards({
  impressions = DEFAULT_METRICS.impressions,
  engagementRate = DEFAULT_METRICS.engagementRate,
  followers = DEFAULT_METRICS.followers,
  profileViews = DEFAULT_METRICS.profileViews,
  searchAppearances = DEFAULT_METRICS.searchAppearances,
  connections = DEFAULT_METRICS.connections,
  membersReached = DEFAULT_METRICS.membersReached,
}: AnalyticsCardsProps) {
  const metrics: MetricCardProps[] = [
    {
      title: 'Total Impressions',
      value: impressions.value,
      change: impressions.change,
      icon: IconEye,
      footerText: {
        positive: 'Content reach growing',
        negative: 'Content reach declining',
      },
      description: 'Views across all posts this period',
      tooltip: 'The total number of times your posts were displayed to LinkedIn members. This includes multiple views by the same person. Higher impressions indicate broader content visibility.',
    },
    {
      title: 'Engagement Rate',
      value: engagementRate.value,
      change: engagementRate.change,
      icon: IconThumbUp,
      suffix: '%',
      decimals: 1,
      footerText: {
        positive: 'Audience more engaged',
        negative: 'Engagement needs focus',
      },
      description: 'Likes, comments, and shares',
      tooltip: 'Percentage of people who engaged with your content (likes, comments, shares, clicks) divided by total impressions. A higher rate means your content resonates with your audience.',
    },
    {
      title: 'Total Followers',
      value: followers.value,
      change: followers.change,
      icon: IconUserPlus,
      footerText: {
        positive: 'Network expanding',
        negative: 'Follower growth slowing',
      },
      description: 'Your total follower count',
      tooltip: 'People who have chosen to follow your LinkedIn profile to see your posts in their feed. Growing your follower base increases your content\'s organic reach.',
    },
    {
      title: 'Profile Views',
      value: profileViews.value,
      change: profileViews.change,
      icon: IconUser,
      footerText: {
        positive: 'Profile visibility up',
        negative: 'Profile visibility down',
      },
      description: 'Unique visitors to your profile',
      tooltip: 'The number of times your LinkedIn profile was viewed by members. High profile views often correlate with increased engagement and connection requests.',
    },
    {
      title: 'Search Appearances',
      value: searchAppearances.value,
      change: searchAppearances.change,
      icon: IconSearch,
      footerText: {
        positive: 'Search visibility up',
        negative: 'Search visibility down',
      },
      description: 'Times you appeared in search results',
      tooltip: 'How often you appeared in LinkedIn search results when members searched for keywords, skills, or job titles. Improving this metric helps with discoverability.',
    },
    {
      title: 'Connections',
      value: connections.value,
      change: connections.change,
      icon: IconUsers,
      footerText: {
        positive: 'Network growing',
        negative: 'Network stable',
      },
      description: 'Your LinkedIn connections',
      tooltip: 'Your first-degree connections on LinkedIn. These are professionals you\'ve directly connected with and can message freely. A larger network expands your content reach.',
    },
    {
      title: 'Members Reached',
      value: membersReached.value,
      change: membersReached.change,
      icon: IconUsersGroup,
      footerText: {
        positive: 'Reach expanding',
        negative: 'Reach steady',
      },
      description: 'Unique members who saw your content',
      tooltip: 'The total number of unique LinkedIn members who saw any of your content during this period. This metric shows your true audience size beyond just impressions.',
    },
  ]

  return (
    <motion.div
      className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @3xl/main:grid-cols-3 @5xl/main:grid-cols-4"
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
    >
      {metrics.map((metric) => (
        <MetricCard key={metric.title} {...metric} />
      ))}
    </motion.div>
  )
}
