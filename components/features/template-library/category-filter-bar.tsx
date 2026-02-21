"use client"

/**
 * Category Filter Bar
 * @description Horizontal scrollable pills for filtering templates by category,
 * with an inline "+" button to manage custom categories via a popover.
 * @module components/features/template-library/category-filter-bar
 */

import * as React from "react"
import { IconLoader2, IconPlus, IconX } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import type { MergedCategory, TemplateCategory } from "@/hooks/use-template-categories"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { getCategoryColor } from "./constants"

/**
 * Props for the CategoryFilterBar component
 */
interface CategoryFilterBarProps {
  /** Merged list of default + custom categories */
  categories: MergedCategory[]
  /** Currently active category filter ("all" or category name) */
  activeCategory: string
  /** Callback when category selection changes */
  onCategoryChange: (category: string) => void
  /** Count of templates per category name */
  templateCounts: Record<string, number>
  /** Create a new custom category */
  onCreateCategory: (name: string) => Promise<TemplateCategory | null>
  /** Delete a custom category by ID */
  onDeleteCategory: (id: string) => Promise<boolean>
  /** Whether a save operation is in progress */
  isSaving: boolean
}

/**
 * Horizontal scrollable category pills with a manage-categories popover
 * @param props - Component props
 * @returns Category filter UI with inline add/remove for custom categories
 */
export function CategoryFilterBar({
  categories,
  activeCategory,
  onCategoryChange,
  templateCounts,
  onCreateCategory,
  onDeleteCategory,
  isSaving,
}: CategoryFilterBarProps) {
  const [newCategoryName, setNewCategoryName] = React.useState("")
  const [popoverOpen, setPopoverOpen] = React.useState(false)

  const totalCount = Object.values(templateCounts).reduce((a, b) => a + b, 0)
  const customCategories = categories.filter((c) => !c.isDefault)

  /**
   * Handle creating a new category from the popover
   */
  const handleAdd = async () => {
    const trimmed = newCategoryName.trim()
    if (!trimmed) return

    const result = await onCreateCategory(trimmed)
    if (result) {
      setNewCategoryName("")
    }
  }

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {/* All pill */}
      <button
        onClick={() => onCategoryChange("all")}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
          activeCategory === "all"
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-border/80"
        )}
      >
        All
        <span className="text-[10px] opacity-70">{totalCount}</span>
      </button>

      {/* Category pills */}
      {categories.map((cat) => {
        const count = templateCounts[cat.name] ?? 0
        const colors = getCategoryColor(cat.name)
        const isActive = activeCategory === cat.name

        return (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.name)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              isActive
                ? `border-transparent ${colors.badgeBg} ${colors.badgeText}`
                : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-border/80"
            )}
          >
            {cat.name}
            {count > 0 && (
              <span className="text-[10px] opacity-70">{count}</span>
            )}
          </button>
        )
      })}

      {/* Add category button with popover */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-border p-1.5 text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground"
            aria-label="Manage categories"
          >
            <IconPlus className="size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-3">
          <p className="mb-2 text-xs font-medium">Custom Categories</p>

          {/* Add new category */}
          <div className="flex gap-1.5">
            <Input
              placeholder="Category name..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd()
              }}
              className="h-8 text-xs"
              aria-label="New category name"
            />
            <Button
              size="sm"
              className="h-8 shrink-0"
              disabled={!newCategoryName.trim() || isSaving}
              onClick={handleAdd}
            >
              {isSaving ? (
                <IconLoader2 className="size-3.5 animate-spin" />
              ) : (
                "Add"
              )}
            </Button>
          </div>

          {/* List of custom categories */}
          {customCategories.length > 0 && (
            <div className="mt-3 space-y-1">
              {customCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-muted/50"
                >
                  <span className="truncate">{cat.name}</span>
                  <button
                    onClick={() => onDeleteCategory(cat.id)}
                    className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                    aria-label={`Delete ${cat.name} category`}
                  >
                    <IconX className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {customCategories.length === 0 && (
            <p className="mt-3 text-xs text-muted-foreground text-center py-2">
              No custom categories yet
            </p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
