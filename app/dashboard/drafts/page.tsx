"use client"

/**
 * Saved Drafts Page
 * @description Displays all saved drafts from Compose, Swipe, Discover, and Research.
 * Users can search, filter, edit, copy, and delete drafts.
 * @module app/dashboard/drafts/page
 */

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  IconClipboardCopy,
  IconEdit,
  IconFileText,
  IconSearch,
  IconTrash,
  IconAlertCircle,
  IconRefresh,
  IconFilter,
  IconSortDescending,
  IconNotebook,
} from "@tabler/icons-react"
import { PageContent } from "@/components/shared/page-content"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { usePageMeta } from "@/lib/dashboard-context"
import { useDraft } from "@/lib/store/draft-context"
import { useDrafts, type SavedDraft, type DraftSource, type DraftSortBy } from "@/hooks/use-drafts"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  staggerContainerVariants,
  staggerItemVariants,
  cardHoverProps,
} from "@/lib/animations"

/**
 * Maximum content preview length in characters
 */
const PREVIEW_MAX_LENGTH = 200

/**
 * Source labels for display
 */
const SOURCE_LABELS: Record<DraftSource, string> = {
  compose: "Compose",
  swipe: "Swipe",
  discover: "Discover",
  inspiration: "Inspiration",
  research: "Research",
}

/**
 * Source badge colors using Tailwind classes
 */
const SOURCE_COLORS: Record<DraftSource, string> = {
  compose: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  swipe: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  discover: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  inspiration: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  research: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
}

/**
 * Sort options for the dropdown
 */
const SORT_OPTIONS: { value: DraftSortBy; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "longest", label: "Longest first" },
  { value: "shortest", label: "Shortest first" },
]

/**
 * Filter options including "all" plus each source
 */
const FILTER_OPTIONS: { value: DraftSource | "all"; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "compose", label: "Compose" },
  { value: "swipe", label: "Swipe" },
  { value: "discover", label: "Discover" },
  { value: "inspiration", label: "Inspiration" },
  { value: "research", label: "Research" },
]

/**
 * Truncate text to a maximum length, appending ellipsis if needed
 * @param text - The text to truncate
 * @param maxLength - Maximum character count
 * @returns Truncated text
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + "..."
}

/**
 * Format a date string into a human-readable relative or absolute label
 * @param dateString - ISO date string
 * @returns Formatted date label
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  })
}

/* =============================================================================
   SKELETON COMPONENT
   ============================================================================= */

/**
 * Loading skeleton for the drafts page
 * @returns Skeleton placeholder UI
 */
function DraftsSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-7 w-40 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-48" />
      </div>

      {/* Filter bar skeleton */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 flex-1 max-w-sm" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Grid skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex items-center justify-between pt-2">
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

/* =============================================================================
   EMPTY STATE COMPONENT
   ============================================================================= */

/**
 * Empty state shown when no drafts exist
 * @param props - Component props
 * @param props.hasFilters - Whether search/filter is active (changes message)
 * @returns Empty state UI
 */
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  const router = useRouter()

  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="rounded-full bg-muted/50 p-6 mb-6">
        <IconNotebook className="h-12 w-12 text-muted-foreground/50" />
      </div>
      <h3 className="text-lg font-semibold mb-2">
        {hasFilters ? "No matching drafts" : "No saved drafts yet"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {hasFilters
          ? "Try adjusting your search or filter to find what you're looking for."
          : "Drafts you save from Compose, Swipe, Discover, and Research will appear here."}
      </p>
      {!hasFilters && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/compose")}
          >
            <IconEdit className="mr-2 h-4 w-4" />
            Start writing
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/swipe")}
          >
            <IconFileText className="mr-2 h-4 w-4" />
            Browse suggestions
          </Button>
        </div>
      )}
    </motion.div>
  )
}

/* =============================================================================
   DRAFT CARD COMPONENT
   ============================================================================= */

/**
 * Props for the DraftCard component
 */
interface DraftCardProps {
  /** The saved draft data */
  draft: SavedDraft
  /** Callback when the Edit button is clicked */
  onEdit: (draft: SavedDraft) => void
  /** Callback when the Delete button is clicked */
  onDelete: (draft: SavedDraft) => void
  /** Callback when the Copy button is clicked */
  onCopy: (draft: SavedDraft) => void
}

/**
 * Individual draft card displaying a content preview with actions
 * @param props - Component props
 * @returns Draft card UI
 */
function DraftCard({ draft, onEdit, onDelete, onCopy }: DraftCardProps) {
  return (
    <motion.div variants={staggerItemVariants} {...cardHoverProps}>
      <Card className="group relative border-border/50 hover:border-border transition-colors h-full">
        <CardContent className="p-4 flex flex-col h-full">
          {/* Header: source badge + date */}
          <div className="flex items-center justify-between mb-3">
            <Badge
              variant="outline"
              className={SOURCE_COLORS[draft.source]}
            >
              {SOURCE_LABELS[draft.source]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDate(draft.updatedAt)}
            </span>
          </div>

          {/* Content preview */}
          <p className="text-sm leading-relaxed text-foreground/90 flex-1 mb-4 whitespace-pre-line">
            {truncateText(draft.content, PREVIEW_MAX_LENGTH)}
          </p>

          {/* Footer: word count + actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <IconFileText className="h-3.5 w-3.5" />
              <span>{draft.wordCount} words</span>
              {draft.postType && (
                <>
                  <span className="text-border">|</span>
                  <span className="capitalize">{draft.postType.replace(/-/g, " ")}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(draft)}
                title="Edit in Compose"
              >
                <IconEdit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onCopy(draft)}
                title="Copy to clipboard"
              >
                <IconClipboardCopy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(draft)}
                title="Delete draft"
              >
                <IconTrash className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* =============================================================================
   MAIN CONTENT COMPONENT
   ============================================================================= */

/**
 * Drafts page content with data fetching, filtering, and actions
 * @returns Drafts content UI
 */
function DraftsContent() {
  const router = useRouter()
  const { loadForRemix } = useDraft()
  const { drafts, isLoading, error, deleteDraft, refetch } = useDrafts()
  const { confirm, ConfirmDialogComponent } = useConfirmDialog()

  // Local filter/sort state
  const [searchQuery, setSearchQuery] = React.useState("")
  const [sourceFilter, setSourceFilter] = React.useState<DraftSource | "all">("all")
  const [sortBy, setSortBy] = React.useState<DraftSortBy>("newest")

  /**
   * Filtered and sorted drafts based on current search, filter, and sort
   */
  const filteredDrafts = React.useMemo(() => {
    let result = [...drafts]

    // Apply source filter
    if (sourceFilter !== "all") {
      result = result.filter(d => d.source === sourceFilter)
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(d =>
        d.content.toLowerCase().includes(query) ||
        (d.postType && d.postType.toLowerCase().includes(query)) ||
        (d.category && d.category.toLowerCase().includes(query))
      )
    }

    // Apply sorting
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        break
      case "oldest":
        result.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
        break
      case "longest":
        result.sort((a, b) => b.wordCount - a.wordCount)
        break
      case "shortest":
        result.sort((a, b) => a.wordCount - b.wordCount)
        break
    }

    return result
  }, [drafts, searchQuery, sourceFilter, sortBy])

  const hasFilters = searchQuery.trim() !== "" || sourceFilter !== "all"

  /**
   * Handle editing a draft - loads content into composer and navigates
   */
  const handleEdit = React.useCallback((draft: SavedDraft) => {
    loadForRemix(draft.id, draft.content, "Draft")
    toast.success("Draft loaded into composer")
    router.push("/dashboard/compose")
  }, [loadForRemix, router])

  /**
   * Handle copying draft content to clipboard
   */
  const handleCopy = React.useCallback(async (draft: SavedDraft) => {
    try {
      await navigator.clipboard.writeText(draft.content)
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Failed to copy to clipboard")
    }
  }, [])

  /**
   * Handle deleting a draft with confirmation
   */
  const handleDelete = React.useCallback(async (draft: SavedDraft) => {
    const confirmed = await confirm({
      title: "Delete draft?",
      description: "This draft will be permanently removed. This action cannot be undone.",
      variant: "destructive",
      confirmText: "Delete",
    })

    if (confirmed) {
      await deleteDraft(draft.id, draft.table)
    }
  }, [confirm, deleteDraft])

  // Error state
  if (error && !isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2 text-destructive">
              <IconAlertCircle className="h-5 w-5" />
              <span>Failed to load drafts: {error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              <IconRefresh className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return <DraftsSkeleton />
  }

  return (
    <PageContent>
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Saved Drafts</h1>
        <p className="text-sm text-muted-foreground">
          {drafts.length === 0
            ? "Save content from across the platform to edit later."
            : `${drafts.length} draft${drafts.length === 1 ? "" : "s"} saved`}
        </p>
      </div>

      {/* Search and filter bar */}
      {(drafts.length > 0 || hasFilters) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search input */}
          <div className="relative flex-1 max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search drafts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Source filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <IconFilter className="h-4 w-4" />
                {sourceFilter === "all"
                  ? "All sources"
                  : SOURCE_LABELS[sourceFilter]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {FILTER_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setSourceFilter(option.value)}
                  className={sourceFilter === option.value ? "bg-accent" : ""}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <IconSortDescending className="h-4 w-4" />
                {SORT_OPTIONS.find(o => o.value === sortBy)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={sortBy === option.value ? "bg-accent" : ""}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Drafts grid or empty state */}
      {filteredDrafts.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainerVariants}
          initial="initial"
          animate="animate"
        >
          <AnimatePresence mode="popLayout">
            {filteredDrafts.map((draft) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onCopy={handleCopy}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Confirm dialog portal */}
      <ConfirmDialogComponent />
    </PageContent>
  )
}

/* =============================================================================
   PAGE COMPONENT
   ============================================================================= */

/**
 * Saved Drafts page component
 * @returns Drafts page with grid layout, search/filter, and draft management actions
 */
export default function DraftsPage() {
  usePageMeta({ title: "Drafts" })
  const { isLoading: authLoading } = useAuthContext()

  return authLoading ? <DraftsSkeleton /> : <DraftsContent />
}
