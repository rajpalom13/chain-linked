"use client"

/**
 * Analytics Filter Bar Component (FE-001)
 * @description Top-level filter controls for the analytics dashboard including
 * metric selector, time period toggle, content type filter, and compare toggle.
 * All filter values are persisted in URL search params.
 * @module components/features/analytics-filter-bar
 */

import { useCallback } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import {
  IconArrowsExchange,
  IconCalendar,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { AnalyticsV2Filters } from "@/hooks/use-analytics-v2"

/** Available metric options for the analytics dashboard */
const METRIC_OPTIONS = [
  { value: "impressions", label: "Impressions" },
  { value: "unique_reach", label: "Unique Reach" },
  { value: "reactions", label: "Reactions" },
  { value: "comments", label: "Comments" },
  { value: "reposts", label: "Reposts" },
  { value: "saves", label: "Saves" },
  { value: "sends", label: "Sends" },
  { value: "engagements", label: "Engagements" },
  { value: "engagements_rate", label: "Engagement Rate" },
] as const

/** Content type options for filtering posts */
const CONTENT_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "text", label: "Text" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "carousel", label: "Carousel" },
  { value: "document", label: "Document" },
] as const

/** Preset time periods */
const PERIOD_OPTIONS = ["7d", "30d", "90d", "1y"] as const

/**
 * Props for the AnalyticsFilterBar component
 */
interface AnalyticsFilterBarProps {
  /** Current filter values */
  filters: AnalyticsV2Filters
  /** Callback when any filter changes */
  onFiltersChange: (filters: AnalyticsV2Filters) => void
}

/**
 * Analytics Filter Bar with URL-synced filter controls
 * @param props - Component props
 * @param props.filters - Current filter state
 * @param props.onFiltersChange - Handler for filter state changes
 * @returns Filter bar with metric selector, period toggle, content type, and compare controls
 */
export function AnalyticsFilterBar({ filters, onFiltersChange }: AnalyticsFilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  /**
   * Update filters and sync to URL search params
   */
  const updateFilters = useCallback(
    (updates: Partial<AnalyticsV2Filters>) => {
      const newFilters = { ...filters, ...updates }
      onFiltersChange(newFilters)

      // Sync to URL
      const params = new URLSearchParams(searchParams.toString())
      params.set("metric", newFilters.metric)
      params.set("period", newFilters.period)
      params.set("contentType", newFilters.contentType)
      params.set("compare", String(newFilters.compare))
      params.set("granularity", newFilters.granularity)

      if (newFilters.period === "custom" && newFilters.startDate && newFilters.endDate) {
        params.set("startDate", newFilters.startDate)
        params.set("endDate", newFilters.endDate)
      } else {
        params.delete("startDate")
        params.delete("endDate")
      }

      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [filters, onFiltersChange, router, pathname, searchParams]
  )

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {/* Metric Selector */}
        <Select
          value={filters.metric}
          onValueChange={(value) => updateFilters({ metric: value })}
        >
          <SelectTrigger className="w-[160px]" aria-label="Select metric">
            <SelectValue placeholder="Metric" />
          </SelectTrigger>
          <SelectContent>
            {METRIC_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Time Period Toggle (desktop) */}
        <ToggleGroup
          type="single"
          value={filters.period === "custom" ? "" : filters.period}
          onValueChange={(value) => {
            if (value) updateFilters({ period: value })
          }}
          variant="outline"
          className="hidden sm:flex"
        >
          {PERIOD_OPTIONS.map((p) => (
            <ToggleGroupItem
              key={p}
              value={p}
              aria-label={`Last ${p}`}
              className="transition-all data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
            >
              {p.toUpperCase()}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {/* Time Period Select (mobile) */}
        <Select
          value={filters.period === "custom" ? "custom" : filters.period}
          onValueChange={(value) => {
            if (value !== "custom") {
              updateFilters({ period: value })
            }
          }}
        >
          <SelectTrigger className="w-[120px] sm:hidden" aria-label="Select time range">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((p) => (
              <SelectItem key={p} value={p}>
                Last {p.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom Date Range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={filters.period === "custom" ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
            >
              <IconCalendar className="size-3.5" />
              <span className="hidden sm:inline">Custom</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="start">
            <div className="grid gap-3">
              <p className="text-sm font-medium">Custom Date Range</p>
              <div className="grid gap-2">
                <Label htmlFor="analytics-start-date">Start Date</Label>
                <Input
                  id="analytics-start-date"
                  type="date"
                  value={filters.startDate || ""}
                  onChange={(e) =>
                    updateFilters({
                      period: "custom",
                      startDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="analytics-end-date">End Date</Label>
                <Input
                  id="analytics-end-date"
                  type="date"
                  value={filters.endDate || ""}
                  onChange={(e) =>
                    updateFilters({
                      period: "custom",
                      endDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Content Type Filter */}
        <Select
          value={filters.contentType}
          onValueChange={(value) => updateFilters({ contentType: value })}
        >
          <SelectTrigger className="w-[130px]" aria-label="Filter by content type">
            <SelectValue placeholder="Content Type" />
          </SelectTrigger>
          <SelectContent>
            {CONTENT_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Compare Toggle */}
        <Button
          variant={filters.compare ? "default" : "outline"}
          size="sm"
          className={cn(
            "gap-1.5 transition-all",
            filters.compare && "bg-primary text-primary-foreground"
          )}
          onClick={() => updateFilters({ compare: !filters.compare })}
        >
          <IconArrowsExchange className="size-3.5" />
          Compare
        </Button>
      </div>
    </div>
  )
}
