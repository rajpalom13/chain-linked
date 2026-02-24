/**
 * Template Grid Skeleton
 * @description Loading skeleton placeholder for the template grid
 * @module components/features/template-library/template-grid-skeleton
 */

import { Skeleton } from "@/components/ui/skeleton"

/**
 * Loading skeleton for the template grid
 * @returns Skeleton placeholder cards matching the template card layout
 */
export function TemplateGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={`skeleton-${i}`} className="rounded-xl border border-t-2 border-border/50 border-t-muted p-5 space-y-3">
          <div className="flex items-start justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-20 w-full" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <div className="flex items-center justify-between pt-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}
