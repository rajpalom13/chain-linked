"use client"

/**
 * Saved Drafts Page
 * @description Displays all saved drafts from Compose, Swipe, Discover, and Research.
 * Users can search, filter, edit, copy, and delete drafts.
 * Features polished card design with generation context display, post type badges,
 * and "Continue editing" action.
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
  IconEdit,
  IconFileText,
  IconSearch,
  IconSparkles,
  IconTrash,
  IconAlertCircle,
  IconRefresh,
  IconFilter,
  IconSortDescending,
  IconNotebook,
  IconPencil,
  IconMessageCircle,
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
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  staggerContainerVariants,
  staggerItemVariants,
} from "@/lib/animations"

/**
 * Maximum content preview length in characters
 */
const PREVIEW_MAX_LENGTH = 250

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
 * Source icons for display
 */
const SOURCE_ICONS: Record<DraftSource, React.ReactNode> = {
  compose: <IconPencil className="size-3" />,
  swipe: <IconSparkles className="size-3" />,
  discover: <IconSearch className="size-3" />,
  inspiration: <IconSparkles className="size-3" />,
  research: <IconFileText className="size-3" />,
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
 * Post type badge colors
 */
const POST_TYPE_COLORS: Record<string, string> = {
  'thought-leadership': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  'storytelling': 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  'educational': 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  'contrarian': 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  'data-driven': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  'how-to': 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  'listicle': 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  'general': 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20',
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

/**
 * Format a post type string for display
 * @param postType - Raw post type string (e.g., 'thought-leadership')
 * @returns Formatted display string (e.g., 'Thought Leadership')
 */
function formatPostType(postType: string): string {
  return postType
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
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
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-28 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <Skeleton className="h-px w-full" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32 rounded-md" />
              </div>
            </div>
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
      className="flex flex-col items-center justify-center py-20 px-4 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 mb-6">
        <IconNotebook className="h-16 w-16 text-primary/40" />
      </div>
      <h3 className="text-xl font-semibold mb-2">
        {hasFilters ? "No matching drafts" : "No saved drafts yet"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mb-8 leading-relaxed">
        {hasFilters
          ? "Try adjusting your search or filter to find what you're looking for."
          : "Your drafts will appear here automatically when you generate posts with AI or navigate away from the composer. Start creating to build your collection."}
      </p>
      {!hasFilters && (
        <div className="flex gap-3">
          <Button
            onClick={() => router.push("/dashboard/compose")}
            className="gap-2"
          >
            <IconPencil className="size-4" />
            Start composing
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/swipe")}
            className="gap-2"
          >
            <IconSparkles className="size-4" />
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
  /** Callback when the Edit/Continue editing button is clicked */
  onEdit: (draft: SavedDraft) => void
  /** Callback when the Delete button is clicked */
  onDelete: (draft: SavedDraft) => void
  /** Callback when the Copy button is clicked */
  onCopy: (draft: SavedDraft) => void
}

/**
 * Individual draft card displaying a content preview with generation context and actions.
 * Features post type badge, source indicator, topic/context display, and action buttons.
 * @param props - Component props
 * @returns Draft card UI
 */
function DraftCard({ draft, onEdit, onDelete, onCopy }: DraftCardProps) {
  /** Whether this draft has any generation context (topic/context) */
  const hasContext = Boolean(draft.topic || draft.additionalContext)

  /** Get the color class for the post type badge */
  const postTypeColor = draft.postType
    ? POST_TYPE_COLORS[draft.postType] || POST_TYPE_COLORS['general']
    : null

  return (
    <motion.div variants={staggerItemVariants} layout>
      <Card className="group relative overflow-hidden border-border/60 hover:border-border hover:shadow-md transition-all duration-200 h-full flex flex-col">
        {/* Subtle top accent line based on source */}
        <div className={`h-0.5 w-full ${
          draft.source === 'compose' ? 'bg-blue-500/40' :
          draft.source === 'swipe' ? 'bg-purple-500/40' :
          draft.source === 'discover' ? 'bg-emerald-500/40' :
          draft.source === 'inspiration' ? 'bg-amber-500/40' :
          'bg-rose-500/40'
        }`} />

        <CardContent className="p-5 flex flex-col flex-1 gap-3">
          {/* Header: badges + timestamp */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Source badge */}
              <Badge
                variant="outline"
                className={`${SOURCE_COLORS[draft.source]} gap-1 text-[11px] px-2 py-0.5`}
              >
                {SOURCE_ICONS[draft.source]}
                {SOURCE_LABELS[draft.source]}
              </Badge>

              {/* Post type badge */}
              {draft.postType && draft.postType !== 'general' && postTypeColor && (
                <Badge
                  variant="outline"
                  className={`${postTypeColor} text-[11px] px-2 py-0.5`}
                >
                  {formatPostType(draft.postType)}
                </Badge>
              )}

              {/* Tone badge */}
              {draft.tone && (
                <Badge
                  variant="outline"
                  className="bg-muted/50 text-muted-foreground border-border/50 text-[11px] px-2 py-0.5"
                >
                  {draft.tone}
                </Badge>
              )}
            </div>

            {/* Timestamp */}
            <span className="text-[11px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
              <IconClock className="size-3" />
              {formatDate(draft.updatedAt)}
            </span>
          </div>

          {/* Topic indicator (if available) */}
          {draft.topic && (
            <div className="flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2">
              <IconMessageCircle className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Topic</span>
                <p className="text-xs text-foreground/80 leading-relaxed line-clamp-2">
                  {draft.topic}
                </p>
              </div>
            </div>
          )}

          {/* Content preview */}
          <div className="flex-1">
            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line line-clamp-5">
              {truncateText(draft.content, PREVIEW_MAX_LENGTH)}
            </p>
          </div>

          {/* Separator */}
          <Separator className="bg-border/40" />

          {/* Footer: metadata + actions */}
          <div className="flex items-center justify-between gap-2">
            {/* Metadata */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <IconFileText className="size-3.5" />
              <span>{draft.wordCount} words</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Copy button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onCopy(draft)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <IconClipboardCopy className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy to clipboard</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Delete button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onDelete(draft)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <IconTrash className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete draft</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Continue editing button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(draft)}
                className="gap-1.5 text-xs h-7 ml-1"
              >
                <IconEdit className="size-3" />
                Continue editing
                <IconArrowRight className="size-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/* =============================================================================
   STATS BAR COMPONENT
   ============================================================================= */

/**
 * Props for the StatsBar component
 */
interface StatsBarProps {
  /** Total number of drafts */
  total: number
  /** Breakdown of drafts by source */
  sourceCounts: Record<DraftSource, number>
}

/**
 * Compact stats bar showing draft counts by source
 * @param props - Component props
 * @returns Stats bar UI
 */
function StatsBar({ total, sourceCounts }: StatsBarProps) {
  const activeSources = Object.entries(sourceCounts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)

  if (total === 0) return null

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">
        {total} draft{total !== 1 ? 's' : ''}
      </span>
      <Separator orientation="vertical" className="h-4" />
      {activeSources.map(([source, count]) => (
        <span key={source} className="flex items-center gap-1">
          {SOURCE_ICONS[source as DraftSource]}
          <span>{count}</span>
        </span>
      ))}
    </div>
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
   * Compute source counts for the stats bar
   */
  const sourceCounts = React.useMemo(() => {
    const counts: Record<DraftSource, number> = {
      compose: 0,
      swipe: 0,
      discover: 0,
      inspiration: 0,
      research: 0,
    }
    for (const d of drafts) {
      counts[d.source]++
    }
    return counts
  }, [drafts])

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
        (d.category && d.category.toLowerCase().includes(query)) ||
        (d.topic && d.topic.toLowerCase().includes(query)) ||
        (d.additionalContext && d.additionalContext.toLowerCase().includes(query))
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
   * @param draft - The draft to edit
   */
  const handleEdit = React.useCallback((draft: SavedDraft) => {
    loadForRemix(draft.id, draft.content, "Draft")
    toast.success("Draft loaded into composer")
    router.push("/dashboard/compose")
  }, [loadForRemix, router])

  /**
   * Handle copying draft content to clipboard
   * @param draft - The draft to copy
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
   * @param draft - The draft to delete
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Saved Drafts</h1>
          <p className="text-sm text-muted-foreground">
            {drafts.length === 0
              ? "Save content from across the platform to edit later."
              : "Your auto-saved and manually saved drafts, ready to continue editing."}
          </p>
        </div>

        {/* Stats bar */}
        <StatsBar total={drafts.length} sourceCounts={sourceCounts} />
      </div>

      {/* Search and filter bar */}
      {(drafts.length > 0 || hasFilters) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search input */}
          <div className="relative flex-1 max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search drafts, topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
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

            {/* Refresh button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={refetch}
                    className="text-muted-foreground"
                  >
                    <IconRefresh className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh drafts</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}

      {/* Drafts grid or empty state */}
      {filteredDrafts.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        <motion.div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
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
