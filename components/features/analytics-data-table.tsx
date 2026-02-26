"use client"

/**
 * Analytics Data Table Component (FE-006)
 * @description TanStack React Table displaying analytics data with sortable columns,
 * granularity toggle, and CSV export functionality.
 * @module components/features/analytics-data-table
 */

import { useMemo, useState } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { motion } from "framer-motion"
import {
  IconDownload,
  IconArrowUp,
  IconArrowDown,
  IconSelector,
  IconTable,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { fadeSlideUpVariants } from "@/lib/animations"
import { toast } from "sonner"
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

/**
 * Props for the AnalyticsDataTable component
 */
interface AnalyticsDataTableProps {
  /** Analytics data points */
  data: AnalyticsDataPoint[]
  /** Currently selected metric */
  metric: string
  /** Current granularity setting */
  granularity: string
  /** Callback when granularity changes */
  onGranularityChange: (granularity: string) => void
  /** Whether data is loading */
  isLoading: boolean
}

/**
 * Row data shape for the table
 */
interface TableRowData {
  /** Formatted date string */
  date: string
  /** Raw date for sorting */
  rawDate: string
  /** Metric value */
  value: number
}

/**
 * Format date for display in the table
 * @param dateStr - ISO date string
 * @returns Formatted date
 */
function formatTableDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/**
 * Format a numeric value for display
 * @param value - The number to format
 * @param isRate - Whether this is a rate/percentage metric
 * @returns Formatted string
 */
function formatValue(value: number, isRate: boolean): string {
  if (isRate) return `${value.toFixed(2)}%`
  return value.toLocaleString()
}

/**
 * Export analytics data to CSV file
 * @param data - Table row data
 * @param metric - Metric name for column header
 */
function exportToCSV(data: TableRowData[], metric: string) {
  const label = METRIC_LABELS[metric] || metric
  const isRate = metric === "engagements_rate"

  const rows = [
    `Date,${label}`,
    ...data.map((row) => `${row.rawDate},${isRate ? row.value.toFixed(2) : row.value}`),
  ]

  const csvContent = rows.join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", `analytics_${metric}_${new Date().toISOString().split("T")[0]}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  toast.success("CSV exported successfully")
}

/**
 * Analytics Data Table with sortable columns, granularity toggle, and CSV export
 * @param props - Component props
 * @param props.data - Analytics data points
 * @param props.metric - Selected metric name
 * @param props.granularity - Current data granularity
 * @param props.onGranularityChange - Granularity change handler
 * @param props.isLoading - Loading state
 * @returns Data table card with controls
 */
export function AnalyticsDataTable({
  data,
  metric,
  granularity,
  onGranularityChange,
  isLoading,
}: AnalyticsDataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const metricLabel = METRIC_LABELS[metric] || metric
  const isRate = metric === "engagements_rate"

  const tableData: TableRowData[] = useMemo(
    () =>
      data.map((d) => ({
        date: formatTableDate(d.date),
        rawDate: d.date,
        value: d.value,
      })),
    [data]
  )

  const columns: ColumnDef<TableRowData>[] = useMemo(
    () => [
      {
        accessorKey: "rawDate",
        header: ({ column }) => {
          const sorted = column.getIsSorted()
          return (
            <button
              type="button"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              onClick={() => column.toggleSorting(sorted === "asc")}
            >
              Date
              {sorted === "asc" ? (
                <IconArrowUp className="size-3.5" />
              ) : sorted === "desc" ? (
                <IconArrowDown className="size-3.5" />
              ) : (
                <IconSelector className="size-3.5 text-muted-foreground" />
              )}
            </button>
          )
        },
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {row.original.date}
          </span>
        ),
      },
      {
        accessorKey: "value",
        header: ({ column }) => {
          const sorted = column.getIsSorted()
          return (
            <button
              type="button"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              onClick={() => column.toggleSorting(sorted === "asc")}
            >
              {metricLabel}
              {sorted === "asc" ? (
                <IconArrowUp className="size-3.5" />
              ) : sorted === "desc" ? (
                <IconArrowDown className="size-3.5" />
              ) : (
                <IconSelector className="size-3.5 text-muted-foreground" />
              )}
            </button>
          )
        },
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {formatValue(row.original.value, isRate)}
          </span>
        ),
      },
    ],
    [metricLabel, isRate]
  )

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      variants={fadeSlideUpVariants}
      initial="initial"
      animate="animate"
    >
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IconTable className="size-5" />
                Data Table
              </CardTitle>
              <CardDescription>
                {metricLabel} data by {granularity} intervals
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {/* Granularity Toggle */}
              <ToggleGroup
                type="single"
                value={granularity}
                onValueChange={(value) => {
                  if (value) onGranularityChange(value)
                }}
                variant="outline"
                className="shrink-0"
              >
                <ToggleGroupItem
                  value="daily"
                  aria-label="Daily granularity"
                  className={cn(
                    "text-xs transition-all",
                    "data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                  )}
                >
                  Daily
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="weekly"
                  aria-label="Weekly granularity"
                  className={cn(
                    "text-xs transition-all",
                    "data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                  )}
                >
                  Weekly
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="monthly"
                  aria-label="Monthly granularity"
                  className={cn(
                    "text-xs transition-all",
                    "data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                  )}
                >
                  Monthly
                </ToggleGroupItem>
              </ToggleGroup>

              {/* CSV Export */}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => exportToCSV(tableData, metric)}
                disabled={tableData.length === 0}
              >
                <IconDownload className="size-3.5" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {tableData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No data available for the selected filters.
              </p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-auto rounded-md border border-border/50">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
