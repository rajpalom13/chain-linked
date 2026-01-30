/**
 * Discover Page
 * @description Industry trends discovery page with curated content by topic,
 * search, sorting, infinite scroll support, and deep research mode
 * @module app/dashboard/discover/page
 */

"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useInView } from "react-intersection-observer"
import {
  IconAdjustmentsHorizontal,
  IconAlertCircle,
  IconArrowsSort,
  IconClock,
  IconFlame,
  IconInbox,
  IconLoader2,
  IconRefresh,
  IconSearch,
  IconTelescope,
  IconTrendingUp,
} from "@tabler/icons-react"

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  DiscoverContentCard,
  DiscoverContentCardSkeleton,
} from "@/components/features/discover-content-card"
import { ManageTopicsModal } from "@/components/features/manage-topics-modal"
import { RemixDialog } from "@/components/features/remix-dialog"
import { ResearchSection } from "@/components/features/research-section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  useDiscover,
  type DiscoverArticle,
  type DiscoverSortOption,
} from "@/hooks/use-discover"
import { useApiKeys } from "@/hooks/use-api-keys"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { useDraft } from "@/lib/store/draft-context"
import { cn } from "@/lib/utils"

/**
 * Sort option display configuration
 */
const SORT_OPTIONS: { value: DiscoverSortOption; label: string; icon: React.ElementType }[] = [
  { value: "engagement", label: "Most Engagement", icon: IconTrendingUp },
  { value: "recent", label: "Most Recent", icon: IconClock },
  { value: "viral", label: "Trending / Viral", icon: IconFlame },
]

/**
 * Topic tab button component with optional post count badge
 * @param props - Tab button props
 * @param props.name - Topic display name
 * @param props.isActive - Whether this tab is currently active
 * @param props.onClick - Click handler
 * @param props.postCount - Optional post count to display
 * @returns Rendered topic tab button
 */
function TopicTab({
  name,
  isActive,
  onClick,
  postCount,
}: {
  name: string
  isActive: boolean
  onClick: () => void
  postCount?: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 text-sm font-medium whitespace-nowrap transition-all border-b-2 flex items-center gap-1.5",
        isActive
          ? "text-foreground border-primary"
          : "text-muted-foreground border-transparent hover:text-foreground hover:border-muted-foreground/30"
      )}
    >
      {name}
      {postCount != null && postCount > 0 && (
        <Badge
          variant="secondary"
          className={cn(
            "text-[10px] px-1.5 py-0 h-4 font-normal",
            isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}
        >
          {postCount}
        </Badge>
      )}
    </button>
  )
}

/**
 * Empty state component with illustration
 * @param props - Empty state props
 * @param props.topic - Current topic name for display
 * @param props.isSearch - Whether the empty state is from a search query
 * @returns Rendered empty state card
 */
function EmptyState({ topic, isSearch }: { topic: string; isSearch?: boolean }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          {isSearch ? (
            <IconSearch className="size-8 text-muted-foreground/50" />
          ) : (
            <IconInbox className="size-8 text-muted-foreground/50" />
          )}
        </div>
        <h3 className="font-semibold text-lg mb-1">
          {isSearch ? "No matching posts found" : "No content yet for this topic"}
        </h3>
        <p className="text-muted-foreground text-sm max-w-md">
          {isSearch
            ? "Try adjusting your search terms or browse a different topic."
            : `We're still gathering articles about "${topic}". Check back soon or try another topic.`}
        </p>
      </CardContent>
    </Card>
  )
}

/**
 * Error state component with retry action
 * @param props - Error state props
 * @param props.message - Error message to display
 * @param props.onRetry - Callback to retry the failed operation
 * @returns Rendered error state card
 */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="border-destructive bg-destructive/5">
      <CardContent className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2 text-destructive">
          <IconAlertCircle className="size-5" />
          <span>{message}</span>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <IconRefresh className="mr-2 size-4" />
          Retry
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton grid for the content area
 * @param props - Skeleton props
 * @param props.count - Number of skeleton cards to show
 * @returns Rendered skeleton grid
 */
function ContentGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <DiscoverContentCardSkeleton key={i} />
      ))}
    </div>
  )
}

/**
 * Main discover content component with search, sort, infinite scroll, and research mode
 * @returns Rendered discover content area
 */
function DiscoverContent() {
  const router = useRouter()
  const { loadForRemix } = useDraft()
  const {
    topics,
    activeTopic,
    articles,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    sort,
    searchQuery,
    setActiveTopic,
    setSort,
    setSearchQuery,
    addTopic,
    removeTopic,
    updateTopics,
    retry,
    refresh,
    loadMore,
  } = useDiscover()

  // Modal states
  const [isManageTopicsOpen, setIsManageTopicsOpen] = React.useState(false)
  const [isRemixOpen, setIsRemixOpen] = React.useState(false)
  const [articleToRemix, setArticleToRemix] = React.useState<DiscoverArticle | null>(null)

  // Research mode state
  const [isResearchMode, setIsResearchMode] = React.useState(false)

  // Search input state (debounced)
  const [searchInput, setSearchInput] = React.useState("")
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // API key status for remix feature
  const { status: apiKeyStatus } = useApiKeys()
  const hasApiKey = apiKeyStatus?.hasKey ?? false

  // Infinite scroll observer
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: "200px",
  })

  /**
   * Trigger load more when sentinel comes into view
   */
  React.useEffect(() => {
    if (inView && hasMore && !isLoading && !isLoadingMore) {
      loadMore()
    }
  }, [inView, hasMore, isLoading, isLoadingMore, loadMore])

  /**
   * Debounce search input
   */
  React.useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(searchInput)
    }, 400)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchInput, setSearchQuery])

  /**
   * Handle remix button click on an article
   */
  const handleRemix = React.useCallback((article: DiscoverArticle) => {
    setArticleToRemix(article)
    setIsRemixOpen(true)
  }, [])

  /**
   * Handle when remix is complete
   */
  const handleRemixComplete = React.useCallback(
    (remixedContent: string) => {
      if (articleToRemix) {
        loadForRemix(articleToRemix.id, remixedContent, articleToRemix.source)
        router.push("/dashboard/compose")
      }
      setIsRemixOpen(false)
      setArticleToRemix(null)
    },
    [articleToRemix, loadForRemix, router]
  )

  /**
   * Get active topic name for display
   */
  const activeTopicName = React.useMemo(() => {
    return topics.find((t) => t.slug === activeTopic)?.name || activeTopic
  }, [topics, activeTopic])

  /**
   * Build original content for remix from article
   */
  const originalContentForRemix = React.useMemo(() => {
    if (!articleToRemix) return ""
    return `${articleToRemix.title}\n\n${articleToRemix.description}`
  }, [articleToRemix])

  /**
   * Get the current sort label
   */
  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label || "Sort"

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Discover</h1>
          <p className="text-muted-foreground mt-1">
            Explore trending industry content and find inspiration for your next post.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant={isResearchMode ? "default" : "outline"}
            onClick={() => setIsResearchMode(!isResearchMode)}
            className="gap-2"
            title={isResearchMode ? "Exit Research Mode" : "Enter Research Mode"}
          >
            <IconTelescope className="size-4" />
            <span className="hidden sm:inline">
              {isResearchMode ? "Exit Research" : "Deep Research"}
            </span>
          </Button>
          <Button variant="ghost" size="icon" onClick={refresh} title="Refresh feed">
            <IconRefresh className="size-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsManageTopicsOpen(true)}
            className="gap-2"
          >
            <IconAdjustmentsHorizontal className="size-4" />
            <span className="hidden sm:inline">Manage Topics</span>
          </Button>
        </div>
      </div>

      {/* Research Mode Section */}
      {isResearchMode && (
        <ResearchSection
          onRemix={handleRemix}
          showClose
          onClose={() => setIsResearchMode(false)}
        />
      )}

      {/* Search & Sort Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 shrink-0">
              <IconArrowsSort className="size-4" />
              <span className="hidden sm:inline">{currentSortLabel}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(value) => setSort(value as DiscoverSortOption)}
            >
              {SORT_OPTIONS.map((option) => {
                const Icon = option.icon
                return (
                  <DropdownMenuRadioItem
                    key={option.value}
                    value={option.value}
                    className="gap-2"
                  >
                    <Icon className="size-4" />
                    {option.label}
                  </DropdownMenuRadioItem>
                )
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Topic Tabs */}
      <div className="border-b -mx-4 md:-mx-6 px-4 md:px-6">
        <ScrollArea className="w-full">
          <div className="flex">
            {topics.map((topic) => (
              <TopicTab
                key={topic.id}
                name={topic.name}
                isActive={topic.slug === activeTopic}
                onClick={() => setActiveTopic(topic.slug)}
                postCount={topic.postCount}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Content Section */}
      {error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : isLoading ? (
        <ContentGridSkeleton count={6} />
      ) : articles.length === 0 ? (
        <EmptyState topic={activeTopicName} isSearch={searchQuery.length > 0} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {articles.map((article) => (
              <DiscoverContentCard
                key={article.id}
                article={article}
                onRemix={handleRemix}
              />
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          {hasMore && (
            <div ref={loadMoreRef} className="flex justify-center py-6">
              {isLoadingMore ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <IconLoader2 className="size-5 animate-spin" />
                  <span className="text-sm">Loading more posts...</span>
                </div>
              ) : (
                <Button variant="ghost" onClick={loadMore} className="gap-2">
                  <IconRefresh className="size-4" />
                  Load more
                </Button>
              )}
            </div>
          )}

          {/* End of feed indicator */}
          {!hasMore && articles.length > 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              You have seen all posts for this topic.
            </p>
          )}
        </>
      )}

      {/* Manage Topics Modal */}
      <ManageTopicsModal
        isOpen={isManageTopicsOpen}
        onClose={() => setIsManageTopicsOpen(false)}
        topics={topics}
        onAddTopic={addTopic}
        onRemoveTopic={removeTopic}
        onUpdateTopics={updateTopics}
      />

      {/* Remix Dialog */}
      <RemixDialog
        isOpen={isRemixOpen}
        onClose={() => {
          setIsRemixOpen(false)
          setArticleToRemix(null)
        }}
        originalContent={originalContentForRemix}
        originalAuthor={articleToRemix?.source}
        onRemixed={handleRemixComplete}
        hasApiKey={hasApiKey}
      />
    </div>
  )
}

/**
 * Discover page loading skeleton
 * @returns Full page skeleton for initial load
 */
function DiscoverSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header Skeleton */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-72 bg-muted animate-pulse rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-10 bg-muted animate-pulse rounded" />
          <div className="h-10 w-36 bg-muted animate-pulse rounded" />
        </div>
      </div>

      {/* Search Bar Skeleton */}
      <div className="flex gap-3">
        <div className="h-10 flex-1 max-w-md bg-muted animate-pulse rounded" />
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
      </div>

      {/* Tabs Skeleton */}
      <div className="border-b pb-2 -mx-4 md:-mx-6 px-4 md:px-6">
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-32 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>

      {/* Content Grid Skeleton */}
      <ContentGridSkeleton count={6} />
    </div>
  )
}

/**
 * Discover page component
 * @description Main page for discovering trending industry content by topic
 * @returns Discover page with sidebar, header, search, sort, and content grid
 */
export default function DiscoverPage() {
  const { isLoading: authLoading } = useAuthContext()

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title="Discover" />
        <main id="main-content" className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            {authLoading ? <DiscoverSkeleton /> : <DiscoverContent />}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
