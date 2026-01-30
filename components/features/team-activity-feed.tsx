"use client"

import * as React from "react"
import {
  IconEye,
  IconThumbUp,
  IconMessageCircle,
  IconShare,
  IconSparkles,
  IconFilter,
  IconSortDescending,
} from "@tabler/icons-react"
import { formatDistanceToNow } from "date-fns"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * Represents a team member's post activity item with engagement metrics.
 */
export interface TeamActivityItem {
  /** Unique identifier for the post */
  id: string
  /** Author information */
  author: {
    /** Display name of the author */
    name: string
    /** Professional headline or title */
    headline: string
    /** Avatar image URL, or null for fallback */
    avatar: string | null
  }
  /** Post content text */
  content: string
  /** Engagement metrics for the post */
  metrics: {
    /** Number of times the post was viewed */
    impressions: number
    /** Number of reactions (likes) received */
    reactions: number
    /** Number of comments on the post */
    comments: number
    /** Number of times the post was reposted/shared */
    reposts: number
  }
  /** ISO 8601 timestamp of when the post was published */
  postedAt: string
  /** Optional post type for badge display */
  postType?: "text" | "article" | "image" | "video" | "poll"
}

/**
 * Props for the TeamActivityFeed component.
 */
export interface TeamActivityFeedProps {
  /** Array of team activity posts to display */
  posts?: TeamActivityItem[]
  /** Callback fired when user clicks "Remix" on a post */
  onRemix?: (postId: string) => void
  /** Whether the feed is in a loading state */
  isLoading?: boolean
  /** Additional CSS classes to apply to the container */
  className?: string
  /** Compact mode - hides filters and shows fewer posts */
  compact?: boolean
}

/** Maximum character count before content is truncated */
const CONTENT_TRUNCATE_LENGTH = 200

/**
 * Sample data for development and testing purposes.
 * Contains 5 realistic team member posts with varied content and metrics.
 */
export const sampleTeamPosts: TeamActivityItem[] = [
  {
    id: "post-1",
    author: {
      name: "Sarah Chen",
      headline: "VP of Engineering at TechCorp",
      avatar: null,
    },
    content:
      "Excited to share that our team just shipped a major feature that's been 6 months in the making! The key lesson? Breaking down complex problems into smaller, manageable pieces makes all the difference. Huge thanks to everyone who contributed to this milestone.",
    metrics: {
      impressions: 12450,
      reactions: 342,
      comments: 56,
      reposts: 23,
    },
    postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    postType: "text",
  },
  {
    id: "post-2",
    author: {
      name: "Marcus Johnson",
      headline: "Product Manager | Building the future of work",
      avatar: null,
    },
    content:
      "Just published my thoughts on why async communication is the secret to high-performing remote teams. After 3 years of remote work, here are the frameworks that actually work. Thread below with actionable tips you can implement today.",
    metrics: {
      impressions: 8920,
      reactions: 215,
      comments: 89,
      reposts: 45,
    },
    postedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    postType: "article",
  },
  {
    id: "post-3",
    author: {
      name: "Emily Rodriguez",
      headline: "Design Lead | UX Strategist",
      avatar: null,
    },
    content:
      "Design systems are not about consistency for consistency's sake. They're about freeing your team to focus on solving real user problems instead of reinventing the wheel. Here's how we built ours from scratch in 8 weeks.",
    metrics: {
      impressions: 5670,
      reactions: 178,
      comments: 34,
      reposts: 12,
    },
    postedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    postType: "text",
  },
  {
    id: "post-4",
    author: {
      name: "David Kim",
      headline: "Head of Growth | Data-Driven Marketing",
      avatar: null,
    },
    content:
      "We A/B tested 47 different CTAs over 6 months. The results surprised us: personalization beat generic messaging by 312%. But here's the catch - context matters more than you think. The best performing CTA in one segment was the worst in another.",
    metrics: {
      impressions: 15230,
      reactions: 456,
      comments: 123,
      reposts: 67,
    },
    postedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    postType: "poll",
  },
  {
    id: "post-5",
    author: {
      name: "Lisa Thompson",
      headline: "Engineering Manager | Team Builder",
      avatar: null,
    },
    content:
      "Hot take: The best engineers I've worked with aren't the ones who write the most clever code. They're the ones who write code that others can understand, maintain, and build upon. Technical excellence is meaningless if it doesn't scale with your team.",
    metrics: {
      impressions: 9840,
      reactions: 389,
      comments: 156,
      reposts: 78,
    },
    postedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    postType: "text",
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
 * Returns the badge variant and label for a post type.
 * @param postType - The type of post
 * @returns Object with variant and label for the badge
 */
function getPostTypeBadge(postType?: TeamActivityItem["postType"]): {
  variant: "default" | "secondary" | "outline"
  label: string
} | null {
  switch (postType) {
    case "article":
      return { variant: "default", label: "Article" }
    case "image":
      return { variant: "secondary", label: "Image" }
    case "video":
      return { variant: "secondary", label: "Video" }
    case "poll":
      return { variant: "outline", label: "Poll" }
    default:
      return null
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
      <Icon className="size-4" />
      <span className="text-xs">{formatMetricNumber(value)}</span>
    </div>
  )
}

/**
 * Loading skeleton for a single post card.
 */
function PostCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Renders a single post card in the activity feed.
 */
function PostCard({
  post,
  onRemix,
}: {
  post: TeamActivityItem
  onRemix?: (postId: string) => void
}) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const shouldTruncate = post.content.length > CONTENT_TRUNCATE_LENGTH
  const displayContent =
    shouldTruncate && !isExpanded
      ? `${post.content.slice(0, CONTENT_TRUNCATE_LENGTH)}...`
      : post.content

  const postTypeBadge = getPostTypeBadge(post.postType)
  const relativeTime = formatDistanceToNow(new Date(post.postedAt), {
    addSuffix: true,
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="size-10">
            {post.author.avatar && (
              <AvatarImage src={post.author.avatar} alt={post.author.name} />
            )}
            <AvatarFallback className="text-sm font-medium">
              {getInitials(post.author.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">
                {post.author.name}
              </span>
              {postTypeBadge && (
                <Badge variant={postTypeBadge.variant} className="text-[10px]">
                  {postTypeBadge.label}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {post.author.headline}
            </p>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {relativeTime}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {displayContent}
          </p>
          {shouldTruncate && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm font-medium text-primary hover:underline mt-1"
            >
              {isExpanded ? "see less" : "see more"}
            </button>
          )}
        </div>
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex gap-4">
            <MetricItem
              icon={IconEye}
              value={post.metrics.impressions}
              label="impressions"
            />
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRemix?.(post.id)}
            className="gap-1.5"
          >
            <IconSparkles className="size-4" />
            Remix
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Empty state component displayed when there are no posts.
 */
function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-3 mb-4">
          <IconMessageCircle className="size-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-sm mb-1">No team activity yet</h3>
        <p className="text-xs text-muted-foreground max-w-[240px]">
          When your team members post content, their activity will appear here.
        </p>
      </CardContent>
    </Card>
  )
}

/**
 * TeamActivityFeed displays a real-time feed of posts from team members
 * with their engagement metrics, filtering, sorting, and the ability to remix post ideas.
 *
 * @example
 * ```tsx
 * <TeamActivityFeed
 *   posts={teamPosts}
 *   onRemix={(postId) => console.log("Remix post:", postId)}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With loading state
 * <TeamActivityFeed isLoading />
 * ```
 *
 * @example
 * ```tsx
 * // With sample data
 * import { TeamActivityFeed, sampleTeamPosts } from "@/components/features/team-activity-feed"
 *
 * <TeamActivityFeed posts={sampleTeamPosts} />
 * ```
 */
export function TeamActivityFeed({
  posts,
  onRemix,
  isLoading = false,
  className,
  compact = false,
}: TeamActivityFeedProps) {
  const [filterType, setFilterType] = React.useState<string>("all")
  const [sortBy, setSortBy] = React.useState<string>("recent")

  // Filter and sort posts
  const filteredAndSortedPosts = React.useMemo(() => {
    if (!posts) return []

    // Filter by post type
    let filtered = posts
    if (filterType !== "all") {
      filtered = posts.filter(post => post.postType === filterType)
    }

    // Sort posts
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "engagement":
          // Sort by total engagement (reactions + comments + reposts)
          const engagementA = a.metrics.reactions + a.metrics.comments + a.metrics.reposts
          const engagementB = b.metrics.reactions + b.metrics.comments + b.metrics.reposts
          return engagementB - engagementA
        case "impressions":
          return b.metrics.impressions - a.metrics.impressions
        case "recent":
        default:
          return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
      }
    })

    return sorted
  }, [posts, filterType, sortBy])

  // Compact mode: simpler loading state
  if (isLoading) {
    if (compact) {
      return (
        <div className={cn("space-y-3", className)}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
              <Skeleton className="size-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </div>
      )
    }
    return (
      <div className={cn("space-y-4", className)}>
        <Card hover>
          <CardHeader className="pb-4">
            <CardTitle>Team Activity</CardTitle>
          </CardHeader>
        </Card>
        {Array.from({ length: 3 }).map((_, index) => (
          <PostCardSkeleton key={index} />
        ))}
      </div>
    )
  }

  // Empty state
  if (!posts || posts.length === 0) {
    if (compact) {
      return (
        <div className={cn("py-6 text-center text-sm text-muted-foreground", className)}>
          No recent activity from team members
        </div>
      )
    }
    return (
      <div className={className}>
        <Card hover>
          <CardHeader className="pb-4">
            <CardTitle>Team Activity</CardTitle>
          </CardHeader>
        </Card>
        <EmptyState />
      </div>
    )
  }

  // Compact mode: simplified list without filters
  if (compact) {
    return (
      <div className={cn("space-y-3", className)}>
        {filteredAndSortedPosts.map((post) => (
          <div key={post.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
            <Avatar className="size-8 flex-shrink-0">
              {post.author.avatar && (
                <AvatarImage src={post.author.avatar} alt={post.author.name} />
              )}
              <AvatarFallback className="text-xs">
                {getInitials(post.author.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium truncate">{post.author.name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.postedAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {post.content}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <IconEye className="size-3" />
                  {formatMetricNumber(post.metrics.impressions)}
                </span>
                <span className="flex items-center gap-1">
                  <IconThumbUp className="size-3" />
                  {formatMetricNumber(post.metrics.reactions)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Full mode with filters
  return (
    <div className={cn("space-y-4", className)}>
      {/* Filter and Sort Controls */}
      <Card hover>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Team Activity</CardTitle>
            <div className="flex items-center gap-2">
              {/* Post Type Filter */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px]">
                  <IconFilter className="size-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="text">Text Posts</SelectItem>
                  <SelectItem value="article">Articles</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="poll">Polls</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort By */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]">
                  <IconSortDescending className="size-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="engagement">Most Engaging</SelectItem>
                  <SelectItem value="impressions">Most Views</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filtered and Sorted Posts */}
      {filteredAndSortedPosts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <IconFilter className="size-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-sm mb-1">No posts match your filters</h3>
            <p className="text-xs text-muted-foreground max-w-[240px] mb-3">
              Try adjusting your filter settings to see more activity.
            </p>
            <Button variant="outline" size="sm" onClick={() => {
              setFilterType("all")
              setSortBy("recent")
            }}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        filteredAndSortedPosts.map((post) => (
          <PostCard key={post.id} post={post} onRemix={onRemix} />
        ))
      )}
    </div>
  )
}
