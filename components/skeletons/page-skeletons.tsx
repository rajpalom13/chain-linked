"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

/**
 * Dashboard Page Skeleton
 * Displays: Quick actions grid + Calendar/Goals row + Team activity
 */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 animate-in fade-in duration-300">
      {/* Welcome Section */}
      <div className="px-4 lg:px-6">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-80" />

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-[100px] border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-lg" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Calendar and Goals Row */}
      <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-3 lg:px-6">
        {/* Calendar Skeleton */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="size-5" />
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="size-8" />
                <Skeleton className="size-8" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
            {/* Calendar grid - 5 rows */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Goals Skeleton */}
        <Card className="border-border/50">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Team Activity Skeleton */}
      <div className="px-4 lg:px-6">
        <Card className="border-border/50">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-4 border rounded-lg">
                <Skeleton className="size-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-4 pt-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * Compose Page Skeleton
 * Displays: Two-column layout with editor and preview
 */
export function ComposeSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 animate-in fade-in duration-300">
      <div className="px-4 lg:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor Column */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-full" />
                  <div>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48 mt-1" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center gap-2 p-2 border rounded-lg">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="size-8" />
                ))}
              </div>
              {/* Textarea */}
              <Skeleton className="h-64 w-full rounded-lg" />
              {/* Character counter */}
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-2 w-48 rounded-full" />
              </div>
              {/* Hashtags */}
              <div className="flex gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-20 rounded-full" />
                ))}
              </div>
              {/* Action buttons */}
              <div className="flex gap-2 pt-4">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 flex-1" />
              </div>
            </CardContent>
          </Card>

          {/* Preview Column */}
          <Card className="border-border/50">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              {/* LinkedIn Preview Card */}
              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-12 rounded-full" />
                  <div>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48 mt-1" />
                    <Skeleton className="h-3 w-24 mt-1" />
                  </div>
                </div>
                <Skeleton className="h-32 w-full" />
                <div className="flex justify-between pt-2 border-t">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-16" />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

/**
 * Schedule Page Skeleton
 * Displays: Calendar and scheduled posts list side by side
 */
export function ScheduleSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
        {/* Calendar Skeleton */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="size-5" />
                <Skeleton className="h-6 w-32" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="size-8" />
                <Skeleton className="size-8" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Legend */}
            <div className="flex items-center gap-4 mb-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <Skeleton className="size-2.5 rounded-full" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Scheduled Posts List Skeleton */}
        <Card className="border-border/50">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Today section */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-16" />
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Skeleton className="size-10" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                  <Skeleton className="size-8" />
                </div>
              ))}
            </div>
            {/* Tomorrow section */}
            <div className="space-y-3">
              <Skeleton className="h-5 w-20" />
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Skeleton className="size-10" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
                <Skeleton className="size-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * Templates Page Skeleton
 * Displays: Search/filter bar and template grid
 */
export function TemplatesSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 animate-in fade-in duration-300">
      <div className="px-4 lg:px-6">
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64 mt-1" />
              </div>
              <Skeleton className="h-10 w-36" />
            </div>
            {/* Search and filters */}
            <div className="flex flex-wrap gap-4 pt-4">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-10 w-40" />
              <div className="flex gap-1">
                <Skeleton className="size-10" />
                <Skeleton className="size-10" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Template grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-32" />
                      <div className="flex gap-1">
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="size-6" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <div className="flex gap-2">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <Skeleton key={j} className="h-5 w-14 rounded-full" />
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <Skeleton className="h-4 w-20" />
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="size-8" />
                        <Skeleton className="size-8" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * Inspiration Page Skeleton
 * Displays: Swipe interface and inspiration feed grid
 */
export function InspirationSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 animate-in fade-in duration-300">
      <div className="px-4 lg:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Swipe Interface Skeleton */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent>
              {/* Card stack */}
              <div className="relative h-[400px]">
                <div className="absolute inset-0 border-2 border-dashed rounded-xl">
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-12 rounded-full" />
                      <div>
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-48 mt-1" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-32 w-full" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex justify-center gap-4 mt-4">
                <Skeleton className="size-14 rounded-full" />
                <Skeleton className="size-14 rounded-full" />
                <Skeleton className="size-14 rounded-full" />
              </div>
            </CardContent>
          </Card>

          {/* Inspiration Feed Skeleton */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-56 mt-1" />
                </div>
                <Skeleton className="h-10 w-64" />
              </div>
              {/* Category tabs */}
              <div className="flex gap-2 pt-4 overflow-x-auto">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-28 rounded-full flex-shrink-0" />
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-10 rounded-full" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-28" />
                            <Skeleton className="h-5 w-20 rounded-full" />
                          </div>
                          <Skeleton className="h-4 w-40 mt-1" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Skeleton className="h-24 w-full" />
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-9 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

/**
 * Carousels Page Skeleton
 * Displays: Template selector, slide preview, and editor
 */
export function CarouselsSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 animate-in fade-in duration-300">
      <div className="px-4 lg:px-6">
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64 mt-1" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Panel - Templates & Slides */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="size-8" />
                  </div>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 border rounded-lg">
                      <Skeleton className="size-6" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="size-6" />
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-20" />
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>

              {/* Center - Preview */}
              <div className="lg:col-span-2 flex flex-col items-center justify-center">
                <Skeleton className="w-full max-w-md aspect-square rounded-xl" />
                <div className="flex items-center gap-2 mt-4">
                  <Skeleton className="size-8" />
                  <div className="flex gap-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="size-2 rounded-full" />
                    ))}
                  </div>
                  <Skeleton className="size-8" />
                </div>
              </div>

              {/* Right Panel - Editor */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-32 w-full" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * Analytics Page Skeleton
 * Displays: Metric cards, chart, goals, leaderboard, and post performance
 */
export function AnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 animate-in fade-in duration-300">
      {/* Analytics Cards */}
      <div className="grid gap-4 px-4 lg:px-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="size-8" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-28" />
              <div className="flex items-center gap-2 mt-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts and Goals Row */}
      <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-3 lg:px-6">
        {/* Performance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56 mt-1" />
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-12" />
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>

        {/* Goals Tracker */}
        <Card className="border-border/50">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard and Post Performance Row */}
      <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-2 lg:px-6">
        {/* Team Leaderboard */}
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-56 mt-1" />
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-16" />
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24 mt-1" />
                </div>
                <div className="text-right">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-4 w-16 mt-1" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Post Performance */}
        <Card className="border-border/50">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mini chart */}
            <Skeleton className="h-[150px] w-full" />
            {/* Metrics grid */}
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="text-center space-y-1">
                  <Skeleton className="h-6 w-16 mx-auto" />
                  <Skeleton className="h-4 w-12 mx-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * Team Page Skeleton
 * Displays: Team activity feed
 */
export function TeamSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 animate-in fade-in duration-300">
      <div className="px-4 lg:px-6">
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64 mt-1" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 p-4 border rounded-lg">
                <Skeleton className="size-12 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-24 ml-auto" />
                  </div>
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-16 w-full" />
                  <div className="flex gap-6 pt-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * Swipe Page Skeleton
 * Displays: Centered swipe card stack with action buttons
 */
export function SwipeSkeleton() {
  return (
    <div className="flex flex-col items-center gap-6 p-4 md:p-6 animate-in fade-in duration-300">
      {/* Filter Bar */}
      <div className="flex w-full max-w-md items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4" />
          <Skeleton className="h-10 w-[180px]" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>

      {/* Card Stack */}
      <div className="relative h-[400px] w-full max-w-md">
        {/* Background cards */}
        <div className="absolute inset-0 scale-[0.94] translate-y-4">
          <Skeleton className="h-full w-full rounded-xl opacity-30" />
        </div>
        <div className="absolute inset-0 scale-[0.97] translate-y-2">
          <Skeleton className="h-full w-full rounded-xl opacity-50" />
        </div>
        {/* Top card */}
        <Card className="absolute inset-0">
          <CardContent className="flex h-full flex-col p-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-32 rounded-full" />
            </div>
            {/* Content */}
            <div className="mt-4 flex-1 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            {/* Footer */}
            <div className="mt-4 pt-3 border-t">
              <Skeleton className="h-4 w-32 mx-auto" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        <Skeleton className="size-11 md:size-10 rounded-full" />
        <Skeleton className="size-11 md:size-10 rounded-full" />
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>

      {/* Keyboard Hint */}
      <Skeleton className="h-4 w-48" />

      {/* Stats Card */}
      <Card className="w-full max-w-md">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4" />
            <Skeleton className="h-5 w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="grid grid-cols-3 gap-2 pt-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="text-center space-y-1">
                <Skeleton className="h-6 w-8 mx-auto" />
                <Skeleton className="h-3 w-12 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Settings Page Skeleton
 * Displays: Multi-tab settings interface
 */
export function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 animate-in fade-in duration-300">
      <div className="px-4 lg:px-6">
        <Card className="border-border/50">
          <CardHeader>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            {/* Tabs */}
            <div className="flex gap-2 border-b pb-4 mb-6 overflow-x-auto">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-28 flex-shrink-0" />
              ))}
            </div>

            {/* Settings Content */}
            <div className="space-y-6 max-w-2xl">
              {/* Avatar section */}
              <div className="flex items-center gap-6">
                <Skeleton className="size-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-9 w-32" />
                </div>
              </div>

              {/* Form fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>

              {/* Toggle switches */}
              <div className="space-y-4 pt-4 border-t">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Skeleton className="h-5 w-40" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-6 w-11 rounded-full" />
                  </div>
                ))}
              </div>

              {/* Save button */}
              <div className="pt-4">
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
