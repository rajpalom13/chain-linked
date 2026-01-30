/**
 * Admin Content Overview Page
 * @description Aggregate content statistics, top posts, and AI generation metrics
 * @module app/admin/content/page
 */

"use client"

import {
  IconFileText,
  IconPhoto,
  IconPresentation,
  IconSparkles,
  IconTemplate,
  IconTrendingUp,
} from "@tabler/icons-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

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

import type { TopPost } from "@/types/admin"

/**
 * Content type distribution data for the pie chart
 */
const CONTENT_TYPE_DATA = [
  { name: "Text Posts", value: 3842, color: "var(--color-chart-1)" },
  { name: "Carousels", value: 987, color: "var(--color-chart-2)" },
  { name: "AI Generated", value: 1534, color: "var(--color-chart-3)" },
  { name: "Remixed", value: 458, color: "var(--color-chart-4)" },
]

/**
 * AI generation statistics data for the bar chart
 */
const AI_STATS_DATA = [
  { type: "Posts", runs: 6842, avgTokens: 420 },
  { type: "Carousels", runs: 3215, avgTokens: 680 },
  { type: "Remixes", runs: 2790, avgTokens: 350 },
]

/**
 * Top performing posts sample data
 */
const TOP_POSTS: TopPost[] = [
  {
    id: "p1",
    author: "Emily Davis",
    preview: "5 lessons I learned from scaling a startup to $10M ARR...",
    impressions: 24500,
    engagements: 1840,
    createdAt: "2026-01-20T10:00:00Z",
  },
  {
    id: "p2",
    author: "Michael Brown",
    preview: "The hiring mistake most founders make (and how to fix it)...",
    impressions: 18900,
    engagements: 1320,
    createdAt: "2026-01-22T14:30:00Z",
  },
  {
    id: "p3",
    author: "Sarah Chen",
    preview: "I asked 100 CEOs their #1 productivity hack. Here are the results...",
    impressions: 15200,
    engagements: 1150,
    createdAt: "2026-01-18T09:00:00Z",
  },
  {
    id: "p4",
    author: "Amanda Lee",
    preview: "Why your LinkedIn profile is costing you opportunities...",
    impressions: 12800,
    engagements: 980,
    createdAt: "2026-01-25T11:15:00Z",
  },
  {
    id: "p5",
    author: "Maria Garcia",
    preview: "The framework I use to write viral LinkedIn posts (step by step)...",
    impressions: 11400,
    engagements: 870,
    createdAt: "2026-01-19T16:00:00Z",
  },
]

/**
 * Most used template names
 */
const MOST_USED_TEMPLATES = [
  { name: "Storytelling Framework", uses: 342, type: "Post" },
  { name: "Problem-Solution", uses: 287, type: "Post" },
  { name: "Listicle (5 Items)", uses: 234, type: "Carousel" },
  { name: "Hot Take", uses: 198, type: "Post" },
  { name: "How-To Guide", uses: 176, type: "Carousel" },
  { name: "Before/After", uses: 152, type: "Post" },
]

/**
 * Formats a number with commas for display
 * @param num - Number to format
 * @returns Formatted number string
 */
function formatNumber(num: number): string {
  return num.toLocaleString("en-US")
}

/**
 * Formats a date string
 * @param dateStr - ISO date string
 * @returns Short formatted date
 */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

/**
 * ContentStatCard Component
 * Displays a single aggregate stat with icon
 *
 * @param props - Component props
 * @param props.icon - Icon element
 * @param props.label - Metric label
 * @param props.value - Formatted metric value
 * @returns A stat card component
 */
function ContentStatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <Card className="hover-lift">
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          {icon}
          {label}
        </CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}

/**
 * AdminContentPage Component
 *
 * Shows aggregate content statistics, content type distribution (pie chart),
 * top performing posts, most used templates, and AI generation metrics.
 *
 * @returns The admin content overview page
 */
export default function AdminContentPage() {
  const totalContent = CONTENT_TYPE_DATA.reduce((sum, d) => sum + d.value, 0)
  const totalAiRuns = AI_STATS_DATA.reduce((sum, d) => sum + d.runs, 0)
  const avgTokens = Math.round(
    AI_STATS_DATA.reduce((sum, d) => sum + d.avgTokens * d.runs, 0) / totalAiRuns
  )

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Content Overview</h2>
        <p className="text-muted-foreground">
          Aggregate content statistics and performance across all users.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
        <ContentStatCard
          icon={<IconFileText className="size-4" />}
          label="Total Content"
          value={formatNumber(totalContent)}
        />
        <ContentStatCard
          icon={<IconPresentation className="size-4" />}
          label="Carousels Created"
          value={formatNumber(987)}
        />
        <ContentStatCard
          icon={<IconSparkles className="size-4" />}
          label="AI Generations"
          value={formatNumber(totalAiRuns)}
        />
        <ContentStatCard
          icon={<IconTrendingUp className="size-4" />}
          label="Avg Tokens per Generation"
          value={formatNumber(avgTokens)}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Content Type Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconPhoto className="size-5" />
              Content Type Distribution
            </CardTitle>
            <CardDescription>
              Breakdown of content created by type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={CONTENT_TYPE_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {CONTENT_TYPE_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatNumber(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* AI Generation Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconSparkles className="size-5" />
              AI Generation by Type
            </CardTitle>
            <CardDescription>
              Total AI runs and average token usage by content type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={AI_STATS_DATA}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="type"
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
                    formatter={(value: number) => formatNumber(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar
                    dataKey="runs"
                    fill="var(--color-chart-1)"
                    radius={[4, 4, 0, 0]}
                    name="Total Runs"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Performing Posts */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Posts</CardTitle>
            <CardDescription>
              Highest engagement posts across all users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead>Post</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">Engagements</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TOP_POSTS.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium truncate max-w-[280px]">
                            {post.preview}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {post.author} - {formatDate(post.createdAt)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(post.impressions)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(post.engagements)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Most Used Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconTemplate className="size-5" />
              Most Used Templates
            </CardTitle>
            <CardDescription>
              Templates ranked by usage count
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {MOST_USED_TEMPLATES.map((template, index) => (
                <div
                  key={template.name}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{template.name}</p>
                      <Badge variant="outline" className="text-xs mt-0.5">
                        {template.type}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-muted-foreground">
                    {formatNumber(template.uses)} uses
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
