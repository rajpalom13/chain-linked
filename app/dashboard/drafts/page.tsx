"use client"

/**
 * Saved Drafts Page
 * @description Compact, clean drafts manager. Shows auto-saved and manually saved
 * drafts in a tight grid with quick actions, search, and source filtering.
 * @module app/dashboard/drafts/page
 */

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import {
  IconArrowRight,
  IconClipboardCopy,
  IconClock,
  IconFileText,
  IconSearch,
  IconSparkles,
  IconTrash,
  IconAlertCircle,
  IconRefresh,
  IconNotebook,
  IconPencil,
  IconX,
  IconDots,
} from "@tabler/icons-react"
import { PageContent } from "@/components/shared/page-content"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { usePageMeta } from "@/lib/dashboard-context"
import { useDraft } from "@/lib/store/draft-context"
import { useDrafts, type SavedDraft, type DraftSource, type DraftSortBy } from "@/hooks/use-drafts"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// ============================================================================
// Constants
// ============================================================================

/** Source display labels */
const SOURCE_LABELS: Record<DraftSource, string> = {
  compose: "Compose",
  swipe: "Swipe",
  discover: "Discover",
  inspiration: "Inspiration",
  research: "Research",
}

/** Source pill colors — subtle, muted tones */
const SOURCE_COLORS: Record<DraftSource, string> = {
  compose: "bg-blue-500/8 text-blue-600 dark:text-blue-400",
  swipe: "bg-purple-500/8 text-purple-600 dark:text-purple-400",
  discover: "bg-emerald-500/8 text-emerald-600 dark:text-emerald-400",
  inspiration: "bg-amber-500/8 text-amber-600 dark:text-amber-400",
  research: "bg-rose-500/8 text-rose-600 dark:text-rose-400",
}

/** Sort options */
const SORT_OPTIONS: { value: DraftSortBy; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "longest", label: "Longest" },
  { value: "shortest", label: "Shortest" },
]

/** Filter options */
const FILTER_OPTIONS: { value: DraftSource | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "compose", label: "Compose" },
  { value: "swipe", label: "Swipe" },
  { value: "discover", label: "Discover" },
  { value: "inspiration", label: "Inspiration" },
  { value: "research", label: "Research" },
]

// ============================================================================
// Utilities
// ============================================================================

/**
 * Format date to relative or short absolute
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

/**
 * Format post type for display
 * @param postType - e.g. 'thought-leadership'
 * @returns e.g. 'Thought Leadership'
 */
function formatPostType(postType: string): string {
  return postType
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

// ============================================================================
// Draft Card
// ============================================================================

/**
 * Compact draft card — borderless, tight layout, quick actions via kebab menu
 * @param props - Component props
 * @returns Draft card UI
 */
function DraftCard({
  draft,
  onEdit,
  onDelete,
  onCopy,
}: {
  draft: SavedDraft
  onEdit: (d: SavedDraft) => void
  onDelete: (d: SavedDraft) => void
  onCopy: (d: SavedDraft) => void
}) {
  /** First ~120 chars of content for tight preview */
  const snippet =
    draft.content.length > 120
      ? draft.content.slice(0, 120).trimEnd() + "..."
      : draft.content

  return (
    <motion.button
      type="button"
      onClick={() => onEdit(draft)}
      className="text-left rounded-xl bg-card overflow-hidden transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group"
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      layout
    >
      {/* Color accent gradient based on source */}
      <div
        className={cn(
          "w-full h-28 flex items-end p-3",
          draft.source === "compose"
            ? "bg-gradient-to-br from-blue-500/15 via-blue-400/5 to-transparent"
            : draft.source === "swipe"
              ? "bg-gradient-to-br from-purple-500/15 via-purple-400/5 to-transparent"
              : draft.source === "discover"
                ? "bg-gradient-to-br from-emerald-500/15 via-emerald-400/5 to-transparent"
                : draft.source === "inspiration"
                  ? "bg-gradient-to-br from-amber-500/15 via-amber-400/5 to-transparent"
                  : "bg-gradient-to-br from-rose-500/15 via-rose-400/5 to-transparent"
        )}
      >
        {/* Topic overlay if available */}
        {draft.topic ? (
          <p className="text-xs font-medium text-foreground/70 line-clamp-2 leading-snug">
            {draft.topic}
          </p>
        ) : (
          <div className="text-3xl opacity-20">
            {draft.source === "compose"
              ? "\u270F\uFE0F"
              : draft.source === "swipe"
                ? "\u2728"
                : "\u{1F4AC}"}
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="p-3 space-y-2">
        {/* Badges row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-md",
              SOURCE_COLORS[draft.source]
            )}
          >
            {SOURCE_LABELS[draft.source]}
          </span>
          {draft.postType && draft.postType !== "general" && (
            <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground">
              {formatPostType(draft.postType)}
            </span>
          )}
        </div>

        {/* Text snippet */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {snippet}
        </p>

        {/* Footer: time + actions */}
        <div className="flex items-center justify-between pt-0.5">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <IconClock className="size-2.5" />
            {formatDate(draft.updatedAt)}
            <span className="mx-0.5">&middot;</span>
            {draft.wordCount}w
          </span>

          {/* Kebab menu — stop propagation so card click doesn't fire */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
              >
                <IconDots className="size-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-40"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem onClick={() => onEdit(draft)}>
                <IconArrowRight className="size-3.5 mr-2" />
                Continue editing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCopy(draft)}>
                <IconClipboardCopy className="size-3.5 mr-2" />
                Copy text
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(draft)}
                className="text-destructive focus:text-destructive"
              >
                <IconTrash className="size-3.5 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.button>
  )
}

// ============================================================================
// Loading Skeleton
// ============================================================================

/**
 * Loading skeleton matching the compact card grid
 * @returns Skeleton placeholder UI
 */
function DraftsSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-7 w-32 mb-1.5" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>

      <div className="flex items-center gap-2">
        <Skeleton className="h-8 flex-1 max-w-xs rounded-lg" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-16 rounded-full" />
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden bg-card">
            <Skeleton className="h-28 w-full" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// Empty State
// ============================================================================

/**
 * Empty state with contextual messaging
 * @param props.hasFilters - Whether filters are active
 * @returns Empty state UI
 */
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  const router = useRouter()

  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="rounded-2xl bg-muted/50 p-6 mb-5">
        <IconNotebook className="h-12 w-12 text-muted-foreground/40" />
      </div>
      <h3 className="text-lg font-semibold mb-1">
        {hasFilters ? "No matching drafts" : "No drafts yet"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {hasFilters
          ? "Try adjusting your search or filter."
          : "Drafts are auto-saved when you generate posts or navigate away from the composer."}
      </p>
      {!hasFilters && (
        <Button
          size="sm"
          onClick={() => router.push("/dashboard/compose")}
          className="gap-1.5"
        >
          <IconPencil className="size-3.5" />
          Start composing
        </Button>
      )}
    </motion.div>
  )
}

// ============================================================================
// Main Content
// ============================================================================

/**
 * Drafts page content with filtering, sorting, and card grid
 * @returns Drafts content UI
 */
function DraftsContent() {
  const router = useRouter()
  const { loadForRemix } = useDraft()
  const { drafts, isLoading, error, deleteDraft, refetch } = useDrafts()
  const { confirm, ConfirmDialogComponent } = useConfirmDialog()

  const [searchQuery, setSearchQuery] = React.useState("")
  const [sourceFilter, setSourceFilter] = React.useState<DraftSource | "all">("all")
  const [sortBy, setSortBy] = React.useState<DraftSortBy>("newest")

  /**
   * Filtered and sorted drafts
   */
  const filteredDrafts = React.useMemo(() => {
    let result = [...drafts]

    if (sourceFilter !== "all") {
      result = result.filter((d) => d.source === sourceFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (d) =>
          d.content.toLowerCase().includes(q) ||
          (d.postType && d.postType.toLowerCase().includes(q)) ||
          (d.topic && d.topic.toLowerCase().includes(q)) ||
          (d.additionalContext && d.additionalContext.toLowerCase().includes(q))
      )
    }

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

  /** Source counts for filter pills */
  const sourceCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: drafts.length }
    for (const d of drafts) counts[d.source] = (counts[d.source] || 0) + 1
    return counts
  }, [drafts])

  const hasFilters = searchQuery.trim() !== "" || sourceFilter !== "all"

  const handleEdit = React.useCallback(
    (draft: SavedDraft) => {
      loadForRemix(draft.id, draft.content, "Draft")
      toast.success("Draft loaded into composer")
      router.push("/dashboard/compose")
    },
    [loadForRemix, router]
  )

  const handleCopy = React.useCallback(async (draft: SavedDraft) => {
    try {
      await navigator.clipboard.writeText(draft.content)
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Failed to copy")
    }
  }, [])

  const handleDelete = React.useCallback(
    async (draft: SavedDraft) => {
      const confirmed = await confirm({
        title: "Delete draft?",
        description: "This cannot be undone.",
        variant: "destructive",
        confirmText: "Delete",
      })
      if (confirmed) await deleteDraft(draft.id, draft.table)
    },
    [confirm, deleteDraft]
  )

  if (error && !isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="rounded-lg bg-destructive/5 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-destructive text-sm">
            <IconAlertCircle className="h-4 w-4" />
            <span>Failed to load drafts</span>
          </div>
          <Button variant="ghost" size="sm" onClick={refetch}>
            <IconRefresh className="mr-1.5 h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) return <DraftsSkeleton />

  return (
    <PageContent>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Saved Drafts</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {drafts.length > 0
              ? `${drafts.length} draft${drafts.length !== 1 ? "s" : ""} saved`
              : "Auto-saved from compose and swipe"}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={refetch} className="text-muted-foreground">
          <IconRefresh className="size-4" />
        </Button>
      </div>

      {/* Search + filter pills */}
      {(drafts.length > 0 || hasFilters) && (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <IconSearch className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search drafts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <IconX className="size-3" />
              </button>
            )}
          </div>

          {/* Source filter pills */}
          <div className="flex items-center gap-1 flex-wrap">
            {FILTER_OPTIONS.filter(
              (o) => o.value === "all" || (sourceCounts[o.value] || 0) > 0
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSourceFilter(option.value)}
                className={cn(
                  "text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors",
                  sourceFilter === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {option.label}
                {sourceCounts[option.value] ? (
                  <span className="ml-1 opacity-70">{sourceCounts[option.value]}</span>
                ) : null}
              </button>
            ))}

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ml-1"
                >
                  {SORT_OPTIONS.find((o) => o.value === sortBy)?.label} ↓
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-28">
                {SORT_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={cn(
                      "text-xs",
                      sortBy === option.value && "font-medium"
                    )}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Grid or empty state */}
      {filteredDrafts.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
          initial="initial"
          animate="animate"
          variants={{
            initial: {},
            animate: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
          }}
        >
          <AnimatePresence mode="popLayout">
            {filteredDrafts.map((draft) => (
              <motion.div
                key={draft.id}
                variants={{
                  initial: { opacity: 0, y: 12 },
                  animate: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
                  },
                  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
                }}
                layout
              >
                <DraftCard
                  draft={draft}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onCopy={handleCopy}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <ConfirmDialogComponent />
    </PageContent>
  )
}

// ============================================================================
// Page Export
// ============================================================================

/**
 * Saved Drafts page
 * @returns Drafts page with compact card grid, search, and filtering
 */
export default function DraftsPage() {
  usePageMeta({ title: "Drafts" })
  const { isLoading: authLoading } = useAuthContext()

  return authLoading ? <DraftsSkeleton /> : <DraftsContent />
}
