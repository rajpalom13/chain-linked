"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconSearch,
  IconThumbUp,
  IconMessageCircle,
  IconShare,
  IconSparkles,
  IconBulb,
  IconFilter,
} from "@tabler/icons-react"
import { formatDistanceToNow } from "date-fns"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useDraft } from "@/lib/store/draft-context"
import { inspirationToast } from "@/lib/toast-utils"

/**
 * Represents an author of an inspiration post.
 */
export interface InspirationPostAuthor {
  /** Display name of the author */
  name: string
  /** Professional headline or title */
  headline: string
  /** Avatar image URL, optional */
  avatar?: string
}

/**
 * Engagement metrics for an inspiration post.
 */
export interface InspirationPostMetrics {
  /** Number of reactions (likes) received */
  reactions: number
  /** Number of comments on the post */
  comments: number
  /** Number of times the post was reposted/shared */
  reposts: number
}

/**
 * Represents a curated viral post for inspiration.
 */
export interface InspirationPost {
  /** Unique identifier for the post */
  id: string
  /** Author information */
  author: InspirationPostAuthor
  /** Post content text */
  content: string
  /** Category classification */
  category: string
  /** Engagement metrics for the post */
  metrics: InspirationPostMetrics
  /** ISO 8601 timestamp of when the post was published */
  postedAt: string
}

/**
 * Props for the InspirationFeed component.
 */
export interface InspirationFeedProps {
  /** Array of inspiration posts to display */
  posts?: InspirationPost[]
  /** Callback fired when user clicks "Remix" on a post */
  onRemix?: (postId: string) => void
  /** Callback fired when category filter changes */
  onCategoryChange?: (category: string) => void
  /** Whether the feed is in a loading state */
  isLoading?: boolean
  /** Additional CSS classes to apply to the container */
  className?: string
}

/** Available category options for filtering */
export const INSPIRATION_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "thought-leadership", label: "Thought Leadership" },
  { id: "personal-stories", label: "Personal Stories" },
  { id: "industry-news", label: "Industry News" },
  { id: "how-to", label: "How-To" },
  { id: "engagement-hooks", label: "Engagement Hooks" },
  { id: "sales-biz-dev", label: "Sales/Biz Dev" },
] as const

/** Category type derived from the constants */
export type InspirationCategory = (typeof INSPIRATION_CATEGORIES)[number]["id"]

/** Maximum character count before content is truncated */
const CONTENT_TRUNCATE_LENGTH = 180

/**
 * Sample data for development and testing purposes.
 * Contains 10 realistic inspiration posts across all categories.
 */
export const sampleInspirationPosts: InspirationPost[] = [
  {
    id: "insp-1",
    author: {
      name: "Alex Hormozi",
      headline: "CEO at Acquisition.com | Scaling Businesses",
      avatar: undefined,
    },
    content:
      "The best sales people don't sell. They diagnose.\n\nThey ask questions until the prospect sells themselves.\n\nStop pitching. Start asking.\n\nHere's the framework I've used to close $100M+ in deals...",
    category: "sales-biz-dev",
    metrics: {
      reactions: 15420,
      comments: 892,
      reposts: 2341,
    },
    postedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "insp-2",
    author: {
      name: "Sahil Bloom",
      headline: "Writer & Entrepreneur | 1M+ Newsletter",
      avatar: undefined,
    },
    content:
      "I failed 17 job interviews before landing my first role.\n\nEach rejection felt like the end.\n\nBut here's what I learned: Rejection is redirection.\n\nThat 18th interview led me to the career I never knew I needed.",
    category: "personal-stories",
    metrics: {
      reactions: 28930,
      comments: 1456,
      reposts: 3892,
    },
    postedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "insp-3",
    author: {
      name: "Lenny Rachitsky",
      headline: "Author of Lenny's Newsletter | Ex-Airbnb PM",
      avatar: undefined,
    },
    content:
      "Hot take: Most product roadmaps are fiction.\n\nThe best PMs I know:\n\n1. Plan in 2-week cycles\n2. Stay close to customers\n3. Ship fast, learn faster\n4. Cut scope ruthlessly\n\nPredictability is a myth. Adaptability is reality.",
    category: "thought-leadership",
    metrics: {
      reactions: 8745,
      comments: 567,
      reposts: 1234,
    },
    postedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "insp-4",
    author: {
      name: "Wes Kao",
      headline: "Co-founder Maven | Writing & Strategy",
      avatar: undefined,
    },
    content:
      "How to write hooks that stop the scroll:\n\n1. Start with a bold claim\n2. Create a knowledge gap\n3. Promise transformation\n4. Use specificity (numbers work)\n5. Trigger curiosity\n\nThe first line determines if anyone reads the rest.",
    category: "how-to",
    metrics: {
      reactions: 12340,
      comments: 789,
      reposts: 2156,
    },
    postedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "insp-5",
    author: {
      name: "Justin Welsh",
      headline: "Solopreneur | Building a $5M/year one-person business",
      avatar: undefined,
    },
    content:
      "Unpopular opinion:\n\nYou don't need a morning routine.\nYou don't need to wake up at 5am.\nYou don't need to meditate.\n\nYou need to find what works for YOU.\n\nThe best routine is the one you'll actually stick to.",
    category: "engagement-hooks",
    metrics: {
      reactions: 34560,
      comments: 2134,
      reposts: 4567,
    },
    postedAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "insp-6",
    author: {
      name: "Packy McCormick",
      headline: "Founder Not Boring | Tech Optimist",
      avatar: undefined,
    },
    content:
      "OpenAI just announced GPT-5 preview access.\n\nWhat this means for businesses:\n\n- Agents that actually work\n- 10x coding productivity\n- New categories of products\n\nWe're entering the age of abundant intelligence. Here's how to prepare...",
    category: "industry-news",
    metrics: {
      reactions: 19870,
      comments: 1234,
      reposts: 3456,
    },
    postedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "insp-7",
    author: {
      name: "Chris Donnelly",
      headline: "Founder & CEO | Personal Branding Expert",
      avatar: undefined,
    },
    content:
      "I've ghostwritten for 50+ executives.\n\nThe ones who grow fastest all do this:\n\nThey share failures, not just wins.\n\nVulnerability builds trust faster than any achievement ever will.",
    category: "personal-stories",
    metrics: {
      reactions: 7890,
      comments: 456,
      reposts: 1023,
    },
    postedAt: new Date(Date.now() - 60 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "insp-8",
    author: {
      name: "Shaan Puri",
      headline: "Host of My First Million | Investor",
      avatar: undefined,
    },
    content:
      "The 5-second rule for content:\n\nIf your hook doesn't work in 5 seconds, nothing else matters.\n\nSpend 80% of your time on the first line.\n\nGreat content with a bad hook = invisible.\nOkay content with a great hook = viral.",
    category: "how-to",
    metrics: {
      reactions: 23450,
      comments: 987,
      reposts: 3210,
    },
    postedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "insp-9",
    author: {
      name: "April Dunford",
      headline: "Positioning Expert | Author of Obviously Awesome",
      avatar: undefined,
    },
    content:
      "Stop saying you're \"the Uber of X.\"\n\nHere's why analogies fail:\n\n1. They make you forgettable\n2. They position you as derivative\n3. They confuse more than clarify\n\nInstead: Define your own category. Own the language.",
    category: "thought-leadership",
    metrics: {
      reactions: 11234,
      comments: 678,
      reposts: 1890,
    },
    postedAt: new Date(Date.now() - 84 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "insp-10",
    author: {
      name: "Morgan Housel",
      headline: "Partner at Collaborative Fund | Author of Psychology of Money",
      avatar: undefined,
    },
    content:
      "Agree or disagree?\n\nThe best business advice:\n\nDo something so good that people can't help but talk about it.\n\nMarketing amplifies. It can't create something from nothing.\n\nBuild remarkable first. Promote second.",
    category: "engagement-hooks",
    metrics: {
      reactions: 45670,
      comments: 2890,
      reposts: 5678,
    },
    postedAt: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
  },
]

/**
 * Formats a number into a compact, human-readable string.
 * @param num - The number to format
 * @returns Formatted string (e.g., "1.2K", "3.4M")
 */
function formatMetricNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

/**
 * Generates initials from a full name.
 * @param name - Full name to extract initials from
 * @returns Two-letter initials string
 */
function getInitials(name: string): string {
  const parts = name.split(" ").filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * Returns the display label for a category ID.
 * @param categoryId - The category ID
 * @returns Human-readable category label
 */
function getCategoryLabel(categoryId: string): string {
  const category = INSPIRATION_CATEGORIES.find((c) => c.id === categoryId)
  return category?.label ?? categoryId
}

/**
 * Returns a badge variant based on category.
 * @param category - The category ID
 * @returns Badge variant string
 */
function getCategoryBadgeVariant(
  category: string
): "default" | "secondary" | "outline" {
  switch (category) {
    case "thought-leadership":
      return "default"
    case "personal-stories":
      return "secondary"
    case "industry-news":
      return "default"
    case "how-to":
      return "secondary"
    case "engagement-hooks":
      return "outline"
    case "sales-biz-dev":
      return "default"
    default:
      return "outline"
  }
}

/**
 * Renders a single metric item with icon and value.
 */
function MetricItem({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType
  value: number
  label: string
}) {
  return (
    <div
      className="flex items-center gap-1 text-muted-foreground"
      title={`${value.toLocaleString()} ${label}`}
    >
      <Icon className="size-3.5" />
      <span className="text-xs">{formatMetricNumber(value)}</span>
    </div>
  )
}

/**
 * Loading skeleton for a single inspiration post card.
 */
function InspirationCardSkeleton() {
  return (
    <Card className="h-full">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start gap-3">
          <Skeleton className="size-9 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5 min-w-0">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-3/4" />
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-3">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-10" />
          </div>
          <Skeleton className="h-7 w-16" />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton grid for the inspiration feed.
 */
function LoadingSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <InspirationCardSkeleton key={index} />
      ))}
    </div>
  )
}

/**
 * Renders a single inspiration post card.
 */
function InspirationCard({
  post,
  onRemix,
}: {
  post: InspirationPost
  onRemix?: (postId: string) => void
}) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const shouldTruncate = post.content.length > CONTENT_TRUNCATE_LENGTH
  const displayContent =
    shouldTruncate && !isExpanded
      ? `${post.content.slice(0, CONTENT_TRUNCATE_LENGTH)}...`
      : post.content

  const relativeTime = formatDistanceToNow(new Date(post.postedAt), {
    addSuffix: true,
  })

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="pt-4 flex flex-col flex-1 gap-3">
        {/* Author Section */}
        <div className="flex items-start gap-3">
          <Avatar className="size-9 shrink-0">
            {post.author.avatar && (
              <AvatarImage src={post.author.avatar} alt={post.author.name} />
            )}
            <AvatarFallback className="text-xs font-medium">
              {getInitials(post.author.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">
                {post.author.name}
              </span>
              <Badge
                variant={getCategoryBadgeVariant(post.category)}
                className="text-[10px] shrink-0"
              >
                {getCategoryLabel(post.category)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {post.author.headline}
            </p>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {displayContent}
          </p>
          {shouldTruncate && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-medium text-primary hover:underline mt-1"
            >
              {isExpanded ? "see less" : "see more"}
            </button>
          )}
        </div>

        {/* Metrics and Actions Section */}
        <div className="pt-2 border-t space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex gap-3">
              <MetricItem
                icon={IconThumbUp}
                value={post.metrics.reactions}
                label="reactions"
              />
              <MetricItem
                icon={IconMessageCircle}
                value={post.metrics.comments}
                label="comments"
              />
              <MetricItem
                icon={IconShare}
                value={post.metrics.reposts}
                label="reposts"
              />
            </div>
            <span className="text-[10px] text-muted-foreground">
              {relativeTime}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRemix?.(post.id)}
            className="w-full gap-1.5"
          >
            <IconSparkles className="size-3.5" />
            Remix
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Empty state component displayed when there are no matching posts.
 */
function EmptyState({ searchQuery }: { searchQuery?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <IconBulb className="size-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-base mb-2">No inspiration found</h3>
        <p className="text-sm text-muted-foreground max-w-[300px]">
          {searchQuery
            ? `No posts match "${searchQuery}". Try adjusting your search or filter.`
            : "No posts available in this category. Try selecting a different filter."}
        </p>
      </CardContent>
    </Card>
  )
}

/**
 * InspirationFeed displays a curated grid of viral posts categorized by niche
 * for content inspiration, with filtering, search, and remix capabilities.
 *
 * @example
 * ```tsx
 * <InspirationFeed
 *   posts={inspirationPosts}
 *   onRemix={(postId) => console.log("Remix post:", postId)}
 *   onCategoryChange={(category) => console.log("Category:", category)}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With loading state
 * <InspirationFeed isLoading />
 * ```
 *
 * @example
 * ```tsx
 * // With sample data
 * import { InspirationFeed, sampleInspirationPosts } from "@/components/features/inspiration-feed"
 *
 * <InspirationFeed posts={sampleInspirationPosts} />
 * ```
 */
export function InspirationFeed({
  posts,
  onRemix,
  onCategoryChange,
  isLoading = false,
  className,
}: InspirationFeedProps) {
  const router = useRouter()
  const { loadForRemix } = useDraft()

  const [activeCategory, setActiveCategory] =
    React.useState<InspirationCategory>("all")
  const [searchQuery, setSearchQuery] = React.useState("")

  /**
   * Handles category tab change.
   */
  const handleCategoryChange = React.useCallback(
    (category: string) => {
      setActiveCategory(category as InspirationCategory)
      onCategoryChange?.(category)
    },
    [onCategoryChange]
  )

  /**
   * Handles remixing a post - loads it into composer and navigates
   */
  const handleRemix = React.useCallback(
    (postId: string) => {
      const post = posts?.find((p) => p.id === postId)
      if (!post) return

      // Load content into draft context
      loadForRemix(post.id, post.content, post.author.name)

      // Call optional callback
      onRemix?.(postId)

      // Show success toast
      inspirationToast.remixed()

      // Navigate to compose page
      router.push("/dashboard/compose")
    },
    [posts, loadForRemix, onRemix, router]
  )

  /**
   * Filters posts based on active category and search query.
   */
  const filteredPosts = React.useMemo(() => {
    if (!posts) return []

    return posts.filter((post) => {
      // Category filter
      const matchesCategory =
        activeCategory === "all" || post.category === activeCategory

      // Search filter (searches content, author name, and headline)
      const matchesSearch =
        searchQuery === "" ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.author.headline.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesCategory && matchesSearch
    })
  }, [posts, activeCategory, searchQuery])

  return (
    <Card className={cn("", className)}>
      <CardHeader className="space-y-4">
        {/* Title and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <IconBulb className="size-5 text-primary" />
            <CardTitle className="text-lg">Inspiration Feed</CardTitle>
          </div>
          <div className="relative w-full sm:w-64">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search inspiration..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="overflow-x-auto -mx-6 px-6 pb-1">
          <Tabs
            value={activeCategory}
            onValueChange={handleCategoryChange}
            className="w-full"
          >
            <TabsList className="inline-flex w-auto">
              {INSPIRATION_CATEGORIES.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="text-xs whitespace-nowrap"
                >
                  {category.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <LoadingSkeletonGrid />
        ) : filteredPosts.length === 0 ? (
          <EmptyState searchQuery={searchQuery || undefined} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPosts.map((post) => (
              <InspirationCard key={post.id} post={post} onRemix={handleRemix} />
            ))}
          </div>
        )}

        {/* Pagination Placeholder */}
        {!isLoading && filteredPosts.length > 0 && (
          <div className="flex items-center justify-center pt-6 mt-6 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <IconFilter className="size-4" />
              <span>
                Showing {filteredPosts.length} of {posts?.length ?? 0} posts
              </span>
            </div>
            {/* TODO: Add pagination or infinite scroll controls here */}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
