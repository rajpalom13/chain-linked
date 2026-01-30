/**
 * Research Section Component
 * @description Deep research interface with Inngest workflow for discovering content
 * Uses Tavily for search, Perplexity for enrichment, OpenAI for post generation
 * @module components/features/research-section
 */

"use client"

import * as React from "react"
import {
  IconAlertCircle,
  IconArticle,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconCopy,
  IconEdit,
  IconExternalLink,
  IconFlask,
  IconLoader2,
  IconPlus,
  IconRocket,
  IconSearch,
  IconSparkles,
  IconTrash,
  IconX,
} from "@tabler/icons-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import {
  useResearch,
  type ResearchResult,
  type ResearchOptions,
  type ResearchStatus,
  type GeneratedPost,
} from "@/hooks/use-research"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import type { DiscoverArticle } from "@/hooks/use-discover"

/**
 * Available topic filters for research
 */
const RESEARCH_TOPICS = [
  { id: "ai", label: "Artificial Intelligence", slug: "artificial-intelligence" },
  { id: "sales", label: "Sales Enablement", slug: "sales-enablement" },
  { id: "marketing", label: "Marketing", slug: "marketing" },
  { id: "leadership", label: "Leadership", slug: "leadership" },
  { id: "remote", label: "Remote Work", slug: "remote-work" },
  { id: "saas", label: "SaaS / B2B", slug: "saas-growth" },
  { id: "startup", label: "Startups", slug: "startups" },
  { id: "productivity", label: "Productivity", slug: "productivity" },
]

/**
 * Status display configuration
 */
const STATUS_CONFIG: Record<ResearchStatus, { label: string; icon: React.ElementType }> = {
  pending: { label: "Starting research...", icon: IconLoader2 },
  initializing: { label: "Initializing session...", icon: IconLoader2 },
  searching: { label: "Searching the web with Tavily...", icon: IconSearch },
  enriching: { label: "Enriching results with Perplexity AI...", icon: IconFlask },
  generating: { label: "Generating LinkedIn posts with AI...", icon: IconSparkles },
  saving: { label: "Saving results...", icon: IconLoader2 },
  completed: { label: "Research complete!", icon: IconCheck },
  failed: { label: "Research failed", icon: IconAlertCircle },
}

/**
 * Maximum content length before truncation
 */
const MAX_CONTENT_LENGTH = 200

/**
 * Props for ResearchSection
 */
interface ResearchSectionProps {
  /** Callback when a result is selected for remix */
  onRemix?: (article: DiscoverArticle) => void
  /** Callback when results are added to feed */
  onAddToFeed?: (result: ResearchResult) => void
  /** Callback when a generated post should be used in composer */
  onUseInComposer?: (content: string) => void
  /** Whether to show the close button */
  showClose?: boolean
  /** Callback when close is clicked */
  onClose?: () => void
}

/**
 * Gets initials from a name for avatar fallback
 * @param name - Name to get initials from
 * @returns Up to 2 character initials
 */
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

/**
 * Progress indicator component for research workflow
 */
function ResearchProgress({
  status,
  progress,
  postsDiscovered,
  postsGenerated,
}: {
  status: ResearchStatus | null
  progress: { step: string; percentage: number } | null
  postsDiscovered: number
  postsGenerated: number
}) {
  if (!status || status === "completed" || status === "failed") return null

  const config = STATUS_CONFIG[status]
  const Icon = config?.icon || IconLoader2
  const isAnimated = true // Always animated since we filter out completed/failed above

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center justify-center size-10 rounded-full bg-primary/10",
            isAnimated && "animate-pulse"
          )}>
            <Icon className={cn(
              "size-5 text-primary",
              isAnimated && "animate-spin"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{config?.label || progress?.step}</p>
            <p className="text-xs text-muted-foreground">
              {progress?.step || "Processing..."}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            {progress?.percentage || 0}%
          </div>
        </div>

        <Progress value={progress?.percentage || 0} className="h-2" />

        {(postsDiscovered > 0 || postsGenerated > 0) && (
          <div className="flex gap-4 text-xs text-muted-foreground">
            {postsDiscovered > 0 && (
              <span className="flex items-center gap-1">
                <IconSearch className="size-3" />
                {postsDiscovered} articles found
              </span>
            )}
            {postsGenerated > 0 && (
              <span className="flex items-center gap-1">
                <IconSparkles className="size-3" />
                {postsGenerated} posts generated
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Research result card component
 * @param props - Card props
 * @returns Rendered research result card
 */
function ResearchResultCard({
  result,
  onRemix,
  onAddToFeed,
}: {
  result: ResearchResult
  onRemix?: (article: DiscoverArticle) => void
  onAddToFeed?: (result: ResearchResult) => void
}) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [isAdding, setIsAdding] = React.useState(false)

  const isLongContent = result.description.length > MAX_CONTENT_LENGTH
  const displayContent = isExpanded
    ? result.description
    : isLongContent
      ? result.description.slice(0, MAX_CONTENT_LENGTH) + "..."
      : result.description

  /**
   * Convert ResearchResult to DiscoverArticle for remix
   */
  const toDiscoverArticle = (): DiscoverArticle => ({
    id: result.id,
    source: result.source,
    sourceColor: result.sourceColor,
    title: result.title,
    description: result.description,
    url: result.url,
    topic: result.topics[0] || "research",
    publishedAt: result.publishedAt,
    authorName: result.source,
    authorHeadline: `Research from ${result.source}`,
    authorAvatarUrl: null,
    authorProfileUrl: result.url,
    likesCount: 0,
    commentsCount: 0,
    repostsCount: 0,
    engagementRate: result.relevanceScore,
    isViral: false,
  })

  /**
   * Handle add to feed click
   */
  const handleAddToFeed = async () => {
    if (result.addedToFeed || isAdding) return

    setIsAdding(true)
    if (onAddToFeed) {
      await onAddToFeed(result)
    }
    setIsAdding(false)
  }

  return (
    <Card
      className={cn(
        "flex flex-col h-full overflow-hidden transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        result.addedToFeed && "border-green-500/50 bg-green-50/5"
      )}
    >
      <CardContent className="flex flex-col flex-1 p-4 gap-3">
        {/* Source Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="size-8 shrink-0">
              <AvatarFallback
                className="text-xs font-medium"
                style={{ backgroundColor: result.sourceColor + "20", color: result.sourceColor }}
              >
                {getInitials(result.source)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <span
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: result.sourceColor }}
              >
                {result.source}
              </span>
              {result.relevanceScore > 3 && (
                <Badge
                  variant="secondary"
                  className="ml-2 text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary"
                >
                  High Relevance
                </Badge>
              )}
            </div>
          </div>
          {result.url && (
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              title="View source"
            >
              <IconExternalLink className="size-4" />
            </a>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm leading-snug line-clamp-2">
          {result.title}
        </h3>

        {/* Content */}
        <div className="flex-1">
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
            {displayContent}
          </p>
          {isLongContent && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-primary font-medium mt-1 flex items-center gap-0.5 hover:underline"
            >
              {isExpanded ? (
                <>
                  Show less
                  <IconChevronUp className="size-3" />
                </>
              ) : (
                <>
                  Read more
                  <IconChevronDown className="size-3" />
                </>
              )}
            </button>
          )}
        </div>

        {/* Topic Tags */}
        {result.topics.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {result.topics.slice(0, 3).map((topic) => (
              <Badge key={topic} variant="outline" className="text-[10px] px-1.5 py-0">
                {topic}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-2 border-t">
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => onRemix?.(toDiscoverArticle())}
          >
            <IconSparkles className="size-3.5" />
            Remix
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-1.5",
              result.addedToFeed && "text-green-600 border-green-600"
            )}
            onClick={handleAddToFeed}
            disabled={result.addedToFeed || isAdding}
          >
            {isAdding ? (
              <IconLoader2 className="size-3.5 animate-spin" />
            ) : result.addedToFeed ? (
              <>
                <IconCheck className="size-3.5" />
                Added
              </>
            ) : (
              <>
                <IconPlus className="size-3.5" />
                Add to Feed
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Skeleton loader for research result cards
 */
function ResearchResultSkeleton() {
  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardContent className="flex flex-col flex-1 p-4 gap-3">
        {/* Header Skeleton */}
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-full bg-muted animate-pulse" />
          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
        </div>
        {/* Title Skeleton */}
        <div className="space-y-1.5">
          <div className="h-4 w-full bg-muted animate-pulse rounded" />
          <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
        </div>
        {/* Content Skeleton */}
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-full bg-muted animate-pulse rounded" />
          <div className="h-3 w-full bg-muted animate-pulse rounded" />
          <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
        </div>
        {/* Actions Skeleton */}
        <div className="flex gap-2 pt-2 border-t">
          <div className="h-8 flex-1 bg-muted animate-pulse rounded" />
          <div className="h-8 w-28 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Post type display configuration
 */
const POST_TYPE_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  "thought-leadership": {
    label: "Thought Leadership",
    color: "#6366F1",
    description: "Bold statements and expert perspectives",
  },
  "storytelling": {
    label: "Storytelling",
    color: "#EC4899",
    description: "Narrative-driven, emotional content",
  },
  "educational": {
    label: "Educational",
    color: "#10B981",
    description: "How-to guides and learning content",
  },
  "contrarian": {
    label: "Contrarian",
    color: "#F59E0B",
    description: "Provocative takes and debates",
  },
  "data-driven": {
    label: "Data-Driven",
    color: "#3B82F6",
    description: "Statistics and insights",
  },
  "how-to": {
    label: "How-To",
    color: "#8B5CF6",
    description: "Step-by-step guides",
  },
  "listicle": {
    label: "Listicle",
    color: "#14B8A6",
    description: "Numbered lists and tips",
  },
}

/**
 * Generated post card component
 */
function GeneratedPostCard({
  post,
  onCopy,
  onRemix,
  onUseInComposer,
  onDelete,
}: {
  post: GeneratedPost
  onCopy: (post: GeneratedPost) => void
  onRemix?: (article: DiscoverArticle) => void
  onUseInComposer?: (content: string) => void
  onDelete: (postId: string) => void
}) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const typeConfig = POST_TYPE_CONFIG[post.postType] || {
    label: post.postType,
    color: "#6B7280",
    description: "",
  }

  /**
   * Convert GeneratedPost to DiscoverArticle for remix
   */
  const toDiscoverArticle = (): DiscoverArticle => ({
    id: post.id,
    source: post.sourceTitle || "AI Generated",
    sourceColor: typeConfig.color,
    title: post.hook || post.content.split("\n")[0] || "Generated Post",
    description: post.content,
    url: post.sourceUrl || "",
    topic: post.postType,
    publishedAt: post.createdAt,
    authorName: "AI Generated",
    authorHeadline: `${typeConfig.label} post`,
    authorAvatarUrl: null,
    authorProfileUrl: post.sourceUrl || null,
    likesCount: 0,
    commentsCount: 0,
    repostsCount: 0,
    engagementRate: 0,
    isViral: false,
  })

  const displayContent = isExpanded
    ? post.content
    : post.content.length > 300
      ? post.content.slice(0, 300) + "..."
      : post.content

  const handleCopy = async () => {
    await navigator.clipboard.writeText(post.content)
    onCopy(post)
    toast.success("Post copied to clipboard!")
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    await onDelete(post.id)
    setIsDeleting(false)
  }

  return (
    <Card
      className={cn(
        "flex flex-col overflow-hidden transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        post.isCopied && "border-green-500/50 bg-green-50/5"
      )}
    >
      <CardContent className="flex flex-col flex-1 p-4 gap-3">
        {/* Header with post type */}
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant="secondary"
            className="text-xs font-semibold"
            style={{ backgroundColor: typeConfig.color + "20", color: typeConfig.color }}
          >
            {typeConfig.label}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>{post.wordCount} words</span>
            {post.estimatedReadTime && (
              <>
                <span>•</span>
                <span>{Math.ceil(post.estimatedReadTime / 60)} min read</span>
              </>
            )}
          </div>
        </div>

        {/* Hook/First line highlight */}
        {post.hook && (
          <div className="text-sm font-semibold text-foreground leading-snug">
            {post.hook}
          </div>
        )}

        {/* Content */}
        <div className="flex-1">
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {displayContent}
          </p>
          {post.content.length > 300 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-primary font-medium mt-2 flex items-center gap-0.5 hover:underline"
            >
              {isExpanded ? (
                <>
                  Show less
                  <IconChevronUp className="size-3" />
                </>
              ) : (
                <>
                  Show full post
                  <IconChevronDown className="size-3" />
                </>
              )}
            </button>
          )}
        </div>

        {/* Source info */}
        {post.sourceTitle && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <IconArticle className="size-3" />
            <span className="truncate">Based on: {post.sourceTitle}</span>
            {post.sourceUrl && (
              <a
                href={post.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline shrink-0"
              >
                <IconExternalLink className="size-3" />
              </a>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-3 border-t">
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={handleCopy}
          >
            {post.isCopied ? (
              <>
                <IconCheck className="size-3.5" />
                Copied
              </>
            ) : (
              <>
                <IconCopy className="size-3.5" />
                Copy
              </>
            )}
          </Button>
          {onRemix && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => onRemix(toDiscoverArticle())}
            >
              <IconSparkles className="size-3.5" />
              Remix
            </Button>
          )}
          {onUseInComposer && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => onUseInComposer(post.content)}
            >
              <IconEdit className="size-3.5" />
              Edit
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <IconLoader2 className="size-3.5 animate-spin" />
            ) : (
              <IconTrash className="size-3.5" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Research Section component for deep content research
 * @param props - Component props
 * @returns Rendered research section with search, filters, and results
 * @example
 * ```tsx
 * <ResearchSection
 *   onRemix={(article) => handleRemix(article)}
 *   onAddToFeed={(result) => handleAddToFeed(result)}
 *   showClose
 *   onClose={() => setShowResearch(false)}
 * />
 * ```
 */
export function ResearchSection({
  onRemix,
  onAddToFeed,
  onUseInComposer,
  showClose = false,
  onClose,
}: ResearchSectionProps) {
  const {
    results,
    generatedPosts,
    isResearching,
    status,
    progress,
    error,
    summary,
    postsDiscovered,
    postsGenerated,
    research,
    quickSearch,
    clearResults,
    addToFeed,
    markPostCopied,
    deleteGeneratedPost,
  } = useResearch()

  const [query, setQuery] = React.useState("")
  const [selectedTopics, setSelectedTopics] = React.useState<string[]>([])
  const [isFiltersOpen, setIsFiltersOpen] = React.useState(false)
  const [researchMode, setResearchMode] = React.useState<"quick" | "deep">("deep")
  const [activeTab, setActiveTab] = React.useState<"posts" | "sources">("posts")

  /**
   * Handle search form submission
   */
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || isResearching) return

    const options: ResearchOptions = {
      topics: selectedTopics,
      maxResultsPerTopic: 5,
      depth: researchMode === "deep" ? "deep" : "basic",
      generatePosts: researchMode === "deep",
    }

    if (researchMode === "quick") {
      await quickSearch(query.trim(), options)
    } else {
      await research(query.trim(), options)
    }
  }

  /**
   * Toggle topic selection
   */
  const toggleTopic = (topicSlug: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topicSlug)
        ? prev.filter((t) => t !== topicSlug)
        : [...prev, topicSlug]
    )
  }

  /**
   * Handle add to feed action
   */
  const handleAddToFeed = async (result: ResearchResult) => {
    const success = await addToFeed(result)
    if (success && onAddToFeed) {
      onAddToFeed(result)
    }
  }

  /**
   * Clear search and results
   */
  const handleClear = () => {
    setQuery("")
    clearResults()
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <IconSearch className="size-5 text-primary" />
            Deep Research
          </CardTitle>
          {showClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <IconX className="size-4" />
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Search the web for industry insights, trends, and content ideas
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search for topics, trends, or content ideas..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 pr-9"
                disabled={isResearching}
              />
              {query && !isResearching && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <IconX className="size-4" />
                </button>
              )}
            </div>
            <Button type="submit" disabled={!query.trim() || isResearching}>
              {isResearching ? (
                <>
                  <IconLoader2 className="mr-2 size-4 animate-spin" />
                  Researching...
                </>
              ) : (
                <>
                  <IconSearch className="mr-2 size-4" />
                  Research
                </>
              )}
            </Button>
          </div>

          {/* Research Mode Toggle */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={researchMode === "quick" ? "default" : "outline"}
              size="sm"
              onClick={() => setResearchMode("quick")}
              className="gap-1.5"
            >
              <IconRocket className="size-3.5" />
              Quick Search
            </Button>
            <Button
              type="button"
              variant={researchMode === "deep" ? "default" : "outline"}
              size="sm"
              onClick={() => setResearchMode("deep")}
              className="gap-1.5"
            >
              <IconFlask className="size-3.5" />
              Deep Research
            </Button>
            <span className="text-xs text-muted-foreground ml-2">
              {researchMode === "quick"
                ? "Fast web search with Tavily"
                : "Full AI workflow: Tavily → Perplexity → GPT-4"}
            </span>
          </div>

          {/* Filters Collapsible */}
          <Collapsible open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 h-8">
                {isFiltersOpen ? (
                  <IconChevronUp className="size-4" />
                ) : (
                  <IconChevronDown className="size-4" />
                )}
                {selectedTopics.length > 0
                  ? `${selectedTopics.length} topic${selectedTopics.length > 1 ? "s" : ""} selected`
                  : "Filter by topics"}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              {/* Topic Checkboxes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {RESEARCH_TOPICS.map((topic) => (
                  <div key={topic.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`topic-${topic.id}`}
                      checked={selectedTopics.includes(topic.slug)}
                      onCheckedChange={() => toggleTopic(topic.slug)}
                    />
                    <Label
                      htmlFor={`topic-${topic.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {topic.label}
                    </Label>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </form>

        {/* Progress Indicator (for Deep Research) */}
        {isResearching && researchMode === "deep" && (
          <ResearchProgress
            status={status}
            progress={progress}
            postsDiscovered={postsDiscovered}
            postsGenerated={postsGenerated}
          />
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive">
            <IconAlertCircle className="size-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* AI Summary */}
        {summary && !isResearching && (
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <IconSparkles className="size-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-primary mb-1">
                    AI Summary
                  </p>
                  <p className="text-sm text-muted-foreground">{summary}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State (Quick Search) */}
        {isResearching && researchMode === "quick" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <ResearchResultSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Results - Tabbed Interface for Deep Research with generated posts */}
        {!isResearching && (generatedPosts.length > 0 || results.length > 0) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {generatedPosts.length > 0
                  ? `${generatedPosts.length} LinkedIn posts generated`
                  : `Found ${results.length} result${results.length !== 1 ? "s" : ""}`}
                {results.length > 0 && generatedPosts.length > 0 && ` from ${results.length} sources`}
              </p>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                Clear results
              </Button>
            </div>

            {/* Show tabs only when we have generated posts */}
            {generatedPosts.length > 0 ? (
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "posts" | "sources")}>
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="posts" className="gap-2">
                    <IconSparkles className="size-4" />
                    Generated Posts ({generatedPosts.length})
                  </TabsTrigger>
                  <TabsTrigger value="sources" className="gap-2">
                    <IconSearch className="size-4" />
                    Source Articles ({results.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="posts" className="mt-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {generatedPosts.map((post) => (
                      <GeneratedPostCard
                        key={post.id}
                        post={post}
                        onCopy={(p) => markPostCopied(p.id)}
                        onRemix={onRemix}
                        onUseInComposer={onUseInComposer}
                        onDelete={deleteGeneratedPost}
                      />
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="sources" className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {results.map((result) => (
                      <ResearchResultCard
                        key={result.id}
                        result={result}
                        onRemix={onRemix}
                        onAddToFeed={handleAddToFeed}
                      />
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              /* Quick search - just show results without tabs */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {results.map((result) => (
                  <ResearchResultCard
                    key={result.id}
                    result={result}
                    onRemix={onRemix}
                    onAddToFeed={handleAddToFeed}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State - No results yet */}
        {!isResearching && results.length === 0 && !error && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center size-12 rounded-full bg-muted mb-3">
              <IconSearch className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Enter a search query to discover industry content and trends
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Use "Quick Search" for fast results or "Deep Research" for AI-enriched content
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
