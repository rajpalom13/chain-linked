/**
 * Template Empty State
 * @description Friendly empty state shown when no templates match the current filter
 * @module components/features/template-library/template-empty-state
 */

import { IconPlus, IconSparkles, IconTemplate } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"

/**
 * Props for the TemplateEmptyState component
 */
interface TemplateEmptyStateProps {
  /** Current search query */
  searchQuery: string
  /** Current category filter */
  categoryFilter: string
  /** Callback to create a new template */
  onCreateNew: () => void
}

/**
 * Empty state for when no templates exist or match filters
 * @param props - Component props
 * @returns Friendly empty state with call to action
 */
export function TemplateEmptyState({
  searchQuery,
  categoryFilter,
  onCreateNew,
}: TemplateEmptyStateProps) {
  const isFiltered = searchQuery || categoryFilter !== "all"

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="relative">
        <div className="rounded-full bg-gradient-to-br from-primary/15 via-primary/10 to-secondary/5 p-6">
          <IconTemplate className="text-primary/60 size-10" />
        </div>
        <div className="absolute -right-1 -top-1 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 p-1.5 shadow-lg">
          <IconSparkles className="size-3 text-white" />
        </div>
      </div>
      <div className="max-w-[300px]">
        <h3 className="text-lg font-semibold">
          {isFiltered ? "No templates found" : "Start your template library"}
        </h3>
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
          {isFiltered
            ? "Try adjusting your search or filter criteria"
            : "Templates help you create consistent, high-quality posts faster. Create your first one or browse AI suggestions below."}
        </p>
      </div>
      {!isFiltered && (
        <Button onClick={onCreateNew} className="gap-2">
          <IconPlus className="size-4" />
          Create Template
        </Button>
      )}
    </div>
  )
}
