/**
 * Discover Page
 * @description Perplexity-powered news discovery page with topic selection
 * overlay, two-column layout (main feed + trending sidebar), pill-based topic filters,
 * search, sorting, infinite scroll, and deep research mode
 * @module app/dashboard/discover/page
 */

"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useInView } from "react-intersection-observer"
import {
  IconAdjustmentsHorizontal,
  IconAlertCircle,
  IconInbox,
  IconLoader2,
  IconRefresh,
  IconSearch,
  IconTelescope,
} from "@tabler/icons-react"

import { ErrorBoundary } from "@/components/error-boundary"
import { PageContent } from "@/components/shared/page-content"
import { ArticleDetailDialog } from "@/components/features/article-detail-dialog"
import { DiscoverNewsCard } from "@/components/features/discover-news-card"
import { DiscoverTrendingSidebar } from "@/components/features/discover-trending-sidebar"
import { TopicSelectionOverlay } from "@/components/features/topic-selection-overlay"
import { ManageTopicsModal } from "@/components/features/manage-topics-modal"
import { RemixDialog } from "@/components/features/remix-dialog"
import { ResearchSection } from "@/components/features/research-section"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { usePageMeta } from "@/lib/dashboard-context"
import {
  useDiscoverNews,
  type NewsArticle,
} from "@/hooks/use-discover-news"
import { useApiKeys } from "@/hooks/use-api-keys"
import { useAuthContext } from "@/lib/auth/auth-provider"
import { useDraft } from "@/lib/store/draft-context"
import { cn } from "@/lib/utils"

/**
 * Pill-style topic filter button with optional article count
 * @param props - Topic pill props
 * @param props.name - Topic display name
 * @param props.isActive - Whether this pill is currently selected
 * @param props.onClick - Click handler to activate this topic
 * @param props.postCount - Optional number of articles for this topic
 * @returns Rendered topic pill badge button
 */
function TopicPill({
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
    <button onClick={onClick}>
      <Badge
        variant={isActive ? "default" : "outline"}
        className={cn(
          "cursor-pointer transition-colors text-xs px-3 py-1 whitespace-nowrap",
          isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted"
        )}
      >
        {name}
        {postCount != null && postCount > 0 && (
          <span className="ml-1 opacity-70">{postCount}</span>
        )}
      </Badge>
    </button>
  )
}

/**
 * Empty state component displayed when no articles match the current filters
 * @param props - Empty state props
 * @param props.topic - Current topic name for contextual messaging
 * @param props.isSearch - Whether the empty state results from a search query
 * @returns Rendered empty state card with icon and descriptive text
 */
function EmptyState({ topic, isSearch }: { topic: string; isSearch?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <motion.div
            className="rounded-full bg-gradient-to-br from-primary/15 to-secondary/15 p-5 mb-4"
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 18 }}
          >
            {isSearch ? (
              <IconSearch className="size-9 text-primary/70" />
            ) : (
              <IconInbox className="size-9 text-primary/70" />
            )}
          </motion.div>
          <motion.h3
            className="font-semibold text-lg mb-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.4 }}
          >
            {isSearch ? "No matching articles found" : "No news articles yet for this topic"}
          </motion.h3>
          <motion.p
            className="text-muted-foreground text-sm max-w-md"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.4 }}
          >
            {isSearch
              ? "Try adjusting your search terms or browse a different topic."
              : `We're still gathering news about "${topic}". Check back soon or try another topic.`}
          </motion.p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/**
 * Error state component with retry action for failed data fetches
 * @param props - Error state props
 * @param props.message - Error message to display to the user
 * @param props.onRetry - Callback invoked when the user clicks the retry button
 * @returns Rendered error state card with destructive styling and retry button
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
 * Non-blocking inline banner shown while the Inngest ingest workflow is
 * populating the discover feed with fresh articles from Perplexity
 * @returns Rendered slim banner with animated spinner and progress text
 */
function SeedingBanner() {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex items-center gap-3 py-3">
        <IconLoader2 className="size-4 text-primary animate-spin shrink-0" />
        <p className="text-sm text-muted-foreground">
          Gathering fresh news for your topics via Perplexity AI. This may take up to a minute.
        </p>
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton for the two-column content layout (main feed + sidebar)
 * @returns Rendered skeleton with featured cards, compact list items, and sidebar placeholders
 */
function ContentSkeleton() {
  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0 space-y-4">
        {/* Top stories skeleton */}
        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                <div className="h-3 w-12 bg-muted animate-pulse rounded" />
              </div>
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-3 w-full bg-muted animate-pulse rounded" />
              <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
              <div className="flex gap-1.5">
                <div className="h-4 w-12 bg-muted animate-pulse rounded-full" />
                <div className="h-4 w-16 bg-muted animate-pulse rounded-full" />
              </div>
            </div>
          ))}
        </div>
        {/* Latest skeleton */}
        <div className="border-t my-4" />
        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
        <div className="rounded-lg border overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-full bg-muted animate-pulse rounded" />
                <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Sidebar skeleton */}
      <div className="w-80 shrink-0 space-y-6 hidden lg:block">
        <div className="space-y-3">
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 w-full bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Main discover content component with Perplexity news-style two-column layout,
 * topic pills, search, sort, infinite scroll, and deep research mode
 * @returns Rendered discover content area with header, topic pills, main feed,
 * trending sidebar, topic selection overlay, and remix dialog
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
    searchQuery,
    showTopicSelection,
    isLoadingTopics,
    isSeeding,
    setActiveTopic,
    setSearchQuery,
    addTopic,
    removeTopic,
    updateTopics,
    completeTopicSelection,
    retry,
    refresh,
    loadMore,
  } = useDiscoverNews()

  /** Modal visibility state for manage topics dialog */
  const [isManageTopicsOpen, setIsManageTopicsOpen] = React.useState(false)
  /** Modal visibility state for remix dialog */
  const [isRemixOpen, setIsRemixOpen] = React.useState(false)
  /** Article currently selected for remixing */
  const [articleToRemix, setArticleToRemix] = React.useState<NewsArticle | null>(null)
  /** Article detail dialog state */
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  /** Article currently being viewed in detail dialog */
  const [articleToView, setArticleToView] = React.useState<NewsArticle | null>(null)

  /** Research mode toggle state */
  const [isResearchMode, setIsResearchMode] = React.useState(false)

  /** Local search input value before debounce */
  const [searchInput, setSearchInput] = React.useState("")
  /** Timer ref for debounced search */
  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  /** API key status for determining remix feature availability */
  const { status: apiKeyStatus } = useApiKeys()
  /** Whether the user has configured an API key for remix */
  const hasApiKey = apiKeyStatus?.hasKey ?? false

  /** Intersection observer ref and state for infinite scroll sentinel */
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: "200px",
  })

  /** Mounted ref guard for async operations */
  const mountedRef = React.useRef(true)
  React.useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  /**
   * Trigger load more when the infinite scroll sentinel comes into view
   */
  React.useEffect(() => {
    if (inView && hasMore && !isLoading && !isLoadingMore && mountedRef.current) {
      loadMore()
    }
  }, [inView, hasMore, isLoading, isLoadingMore, loadMore])

  /**
   * Debounce search input by 400ms before updating the hook query
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
   * Handle article card click to open the detail dialog
   * @param article - The article to view in detail
   */
  const handleArticleClick = React.useCallback((article: NewsArticle) => {
    setArticleToView(article)
    setIsDetailOpen(true)
  }, [])

  /**
   * Handle remix button click on an article by opening the remix dialog
   * @param article - The article to remix
   */
  const handleRemix = React.useCallback((article: NewsArticle) => {
    setArticleToRemix(article)
    setIsRemixOpen(true)
  }, [])

  /**
   * Handle successful remix completion by loading the draft and navigating to compose
   * @param remixedContent - The remixed content string from the dialog
   */
  const handleRemixComplete = React.useCallback(
    (remixedContent: string) => {
      if (articleToRemix) {
        loadForRemix(articleToRemix.id, remixedContent, articleToRemix.sourceName)
        router.push("/dashboard/compose")
      }
      setIsRemixOpen(false)
      setArticleToRemix(null)
    },
    [articleToRemix, loadForRemix, router]
  )

  /**
   * Get the display name for the currently active topic
   */
  const activeTopicName = React.useMemo(() => {
    return topics.find((t) => t.slug === activeTopic)?.name || activeTopic
  }, [topics, activeTopic])

  /**
   * Build original content string for the remix dialog from the selected article
   */
  const originalContentForRemix = React.useMemo(() => {
    if (!articleToRemix) return ""
    return `${articleToRemix.headline}\n\n${articleToRemix.summary}`
  }, [articleToRemix])

  return (
    <PageContent>
      {/* Header Section */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Discover</h1>
          <p className="text-muted-foreground mt-1">
            Stay informed with the latest industry news and find inspiration for your next post.
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
          onRemix={handleRemix as (article: unknown) => void}
          showClose
          onClose={() => setIsResearchMode(false)}
        />
      )}

      {/* Topic Pills */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-1">
          {topics.map((topic) => (
            <TopicPill
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

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Content Section - Two column layout */}
      {error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : isLoading ? (
        <ContentSkeleton />
      ) : (
        <>
          {isSeeding && <SeedingBanner />}
          {articles.length === 0 ? (
            <EmptyState topic={activeTopicName} isSearch={searchQuery.length > 0} />
          ) : (
            <div className="flex gap-6">
              {/* Main Feed */}
              <div className="flex-1 min-w-0">
                {/* Top Stories - first 3 articles as featured */}
                {articles.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Top Stories</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {articles.slice(0, 3).map((article) => (
                        <DiscoverNewsCard key={article.id} article={article} onRemix={handleRemix} onClick={handleArticleClick} variant="featured" />
                      ))}
                    </div>
                  </div>
                )}

                {/* Divider */}
                {articles.length > 3 && <div className="border-t my-4" />}

                {/* Latest News - remaining articles as compact */}
                {articles.length > 3 && (
                  <div>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Latest</h2>
                    <div className="rounded-lg border bg-card overflow-hidden">
                      {articles.slice(3).map((article) => (
                        <DiscoverNewsCard key={article.id} article={article} onRemix={handleRemix} onClick={handleArticleClick} variant="compact" />
                      ))}
                    </div>
                  </div>
                )}

                {/* Infinite scroll sentinel */}
                {hasMore && (
                  <div ref={loadMoreRef} className="flex justify-center py-6">
                    {isLoadingMore ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <IconLoader2 className="size-5 animate-spin" />
                        <span className="text-sm">Loading more articles...</span>
                      </div>
                    ) : (
                      <Button variant="ghost" onClick={loadMore} className="gap-2">
                        <IconRefresh className="size-4" />
                        Load more
                      </Button>
                    )}
                  </div>
                )}

                {/* End of feed */}
                {!hasMore && articles.length > 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    You have seen all articles for this topic.
                  </p>
                )}
              </div>

              {/* Sidebar */}
              <DiscoverTrendingSidebar
                articles={articles}
                topics={topics}
                activeTopic={activeTopic}
                onTopicClick={setActiveTopic}
                onArticleClick={handleArticleClick}
              />
            </div>
          )}
        </>
      )}

      {/* Topic Selection Overlay for first-time users */}
      <TopicSelectionOverlay
        isOpen={showTopicSelection}
        onComplete={completeTopicSelection}
      />

      {/* Manage Topics Modal */}
      <ManageTopicsModal
        isOpen={isManageTopicsOpen}
        onClose={() => setIsManageTopicsOpen(false)}
        topics={topics}
        onAddTopic={addTopic}
        onRemoveTopic={removeTopic}
        onUpdateTopics={updateTopics}
      />

      {/* Article Detail Dialog */}
      <ArticleDetailDialog
        article={articleToView}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setArticleToView(null)
        }}
        onRemix={(article) => {
          setIsDetailOpen(false)
          setArticleToView(null)
          handleRemix(article)
        }}
      />

      {/* Remix Dialog */}
      <RemixDialog
        isOpen={isRemixOpen}
        onClose={() => {
          setIsRemixOpen(false)
          setArticleToRemix(null)
        }}
        originalContent={originalContentForRemix}
        originalAuthor={articleToRemix?.sourceName}
        onRemixed={handleRemixComplete}
        hasApiKey={hasApiKey}
      />
    </PageContent>
  )
}

/**
 * Full-page loading skeleton for the Discover page during auth initialization
 * @returns Rendered skeleton with placeholder header, search bar, topic pills, and content area
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

      {/* Topic Pills Skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-7 w-24 bg-muted animate-pulse rounded-full" />
        ))}
      </div>

      {/* Search Bar Skeleton */}
      <div className="flex gap-3">
        <div className="h-10 flex-1 max-w-md bg-muted animate-pulse rounded" />
        <div className="h-10 w-32 bg-muted animate-pulse rounded" />
      </div>

      {/* Content Skeleton */}
      <ContentSkeleton />
    </div>
  )
}

/**
 * Discover page root component
 * @description Main page for discovering trending industry news organized by topic,
 * featuring a Perplexity-powered layout with featured top stories, compact latest feed,
 * trending sidebar, and first-time topic selection overlay
 * @returns Discover page content with news feed and topic management
 */
export default function DiscoverPage() {
  usePageMeta({ title: "Discover" })
  const { isLoading: authLoading } = useAuthContext()

  return authLoading ? <DiscoverSkeleton /> : (
    <ErrorBoundary>
      <DiscoverContent />
    </ErrorBoundary>
  )
}
