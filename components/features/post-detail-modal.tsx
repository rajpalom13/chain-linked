"use client"

import * as React from "react"
import {
  IconBookmark,
  IconCalendar,
  IconEye,
  IconLoader2,
  IconMessageCircle,
  IconShare,
  IconSparkles,
  IconTag,
  IconThumbUp,
  IconUsers,
  IconX,
} from "@tabler/icons-react"
import { formatDistanceToNow } from "date-fns"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Represents an author of an inspiration post.
 */
export interface InspirationPostAuthor {
  /** Display name of the author */
  name: string
  /** Professional headline or title */
  headline: string
  /** Avatar image URL, optional */
  avatarUrl?: string
  /** Number of followers the author has */
  followerCount: number
}

/**
 * Engagement metrics for an inspiration post.
 */
export interface InspirationPostMetrics {
  /** Number of likes/reactions received */
  likes: number
  /** Number of comments on the post */
  comments: number
  /** Number of times the post was shared/reposted */
  shares: number
  /** Number of impressions (views), optional */
  impressions?: number
}

/**
 * Represents a curated viral post for inspiration with full details.
 */
export interface InspirationPost {
  /** Unique identifier for the post */
  id: string
  /** Author information */
  author: InspirationPostAuthor
  /** Full post content text */
  content: string
  /** ISO 8601 timestamp of when the post was published */
  publishedAt: string
  /** Engagement metrics for the post */
  metrics: InspirationPostMetrics
  /** Category classification */
  category: string
  /** Tags associated with the post, optional */
  tags?: string[]
}

/**
 * Props for the PostDetailModal component.
 */
export interface PostDetailModalProps {
  /** The post to display, or null if no post is selected */
  post: InspirationPost | null
  /** Whether the modal is currently open */
  isOpen: boolean
  /** Callback fired when the modal should be closed */
  onClose: () => void
  /** Callback fired when user clicks "Remix" on a post */
  onRemix: (postId: string) => void
  /** Callback fired when user clicks "Save" on a post, optional */
  onSave?: (postId: string) => void
  /** Whether the remix action is currently loading */
  isRemixing?: boolean
  /** Whether the save action is currently loading */
  isSaving?: boolean
  /** Additional CSS classes to apply to the dialog content */
  className?: string
}

/**
 * Sample data for development and testing purposes.
 * Contains a realistic inspiration post with full details.
 */
export const sampleInspirationPost: InspirationPost = {
  id: "post-detail-1",
  author: {
    name: "Alex Hormozi",
    headline: "CEO at Acquisition.com | Helping business owners scale",
    avatarUrl: undefined,
    followerCount: 2340000,
  },
  content: `The best sales people don't sell. They diagnose.

They ask questions until the prospect sells themselves.

Stop pitching. Start asking.

Here's the framework I've used to close $100M+ in deals:

1. Identify the pain
Ask: "What's the biggest challenge you're facing right now?"

2. Quantify the impact
Ask: "How much is this costing you monthly?"

3. Explore failed solutions
Ask: "What have you tried before?"

4. Paint the future
Ask: "What would life look like if this was solved?"

5. Create urgency
Ask: "What happens if nothing changes?"

The prospect should be doing 80% of the talking.

Your job isn't to convince. It's to understand.

When you truly understand their problem better than they do, the sale happens naturally.

Agree or disagree?`,
  publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  category: "Sales & Business Development",
  tags: ["sales", "business", "growth", "entrepreneurship", "closing"],
  metrics: {
    likes: 15420,
    comments: 892,
    shares: 2341,
    impressions: 458000,
  },
}

/**
 * Additional sample posts for testing different states.
 */
export const sampleInspirationPosts: InspirationPost[] = [
  sampleInspirationPost,
  {
    id: "post-detail-2",
    author: {
      name: "Sahil Bloom",
      headline: "Writer & Entrepreneur | 1M+ Newsletter Subscribers",
      avatarUrl: undefined,
      followerCount: 1850000,
    },
    content: `I failed 17 job interviews before landing my first role.

Each rejection felt like the end.

But here's what I learned: Rejection is redirection.

That 18th interview led me to the career I never knew I needed.

Every "no" was preparing me for the right "yes."

If you're going through rejection right now, keep going.

The breakthrough is closer than you think.`,
    publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    category: "Personal Stories",
    tags: ["career", "motivation", "growth"],
    metrics: {
      likes: 28930,
      comments: 1456,
      shares: 3892,
      impressions: 720000,
    },
  },
  {
    id: "post-detail-3",
    author: {
      name: "Lenny Rachitsky",
      headline: "Author of Lenny's Newsletter | Ex-Airbnb PM",
      avatarUrl: undefined,
      followerCount: 890000,
    },
    content: `Hot take: Most product roadmaps are fiction.

The best PMs I know:

1. Plan in 2-week cycles
2. Stay close to customers
3. Ship fast, learn faster
4. Cut scope ruthlessly

Predictability is a myth. Adaptability is reality.

Your roadmap should be a compass, not a contract.`,
    publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    category: "Thought Leadership",
    tags: ["product", "management", "strategy"],
    metrics: {
      likes: 8745,
      comments: 567,
      shares: 1234,
    },
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
 * Returns the badge variant based on category.
 * @param category - The category string
 * @returns Badge variant string
 */
function getCategoryBadgeVariant(
  category: string
): "default" | "secondary" | "outline" {
  const lowerCategory = category.toLowerCase()
  if (
    lowerCategory.includes("thought") ||
    lowerCategory.includes("leadership")
  ) {
    return "default"
  }
  if (lowerCategory.includes("personal") || lowerCategory.includes("story")) {
    return "secondary"
  }
  if (lowerCategory.includes("sales") || lowerCategory.includes("business")) {
    return "default"
  }
  if (lowerCategory.includes("how-to") || lowerCategory.includes("tutorial")) {
    return "secondary"
  }
  return "outline"
}

/**
 * Loading skeleton for the post detail modal.
 */
function PostDetailSkeleton() {
  return (
    <div className="space-y-4">
      {/* Author Header Skeleton */}
      <div className="flex items-start gap-4">
        <Skeleton className="size-14 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      {/* Content Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      {/* Metrics Skeleton */}
      <div className="flex gap-6 pt-4">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  )
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
      className="flex items-center gap-1.5 text-muted-foreground"
      title={`${value.toLocaleString()} ${label}`}
    >
      <Icon className="size-4" />
      <span className="text-sm font-medium">{formatMetricNumber(value)}</span>
      <span className="text-xs hidden sm:inline">{label}</span>
    </div>
  )
}

/**
 * PostDetailModal displays a full-screen modal with complete details of an
 * inspiration post, including author info, content, metrics, and action buttons.
 *
 * @example
 * ```tsx
 * const [selectedPost, setSelectedPost] = useState<InspirationPost | null>(null)
 * const [isOpen, setIsOpen] = useState(false)
 *
 * <PostDetailModal
 *   post={selectedPost}
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onRemix={(postId) => console.log("Remix:", postId)}
 *   onSave={(postId) => console.log("Save:", postId)}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With loading states
 * <PostDetailModal
 *   post={sampleInspirationPost}
 *   isOpen={true}
 *   onClose={handleClose}
 *   onRemix={handleRemix}
 *   isRemixing={isRemixLoading}
 *   isSaving={isSaveLoading}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // Using sample data for testing
 * import { PostDetailModal, sampleInspirationPost } from "@/components/features/post-detail-modal"
 *
 * <PostDetailModal
 *   post={sampleInspirationPost}
 *   isOpen={true}
 *   onClose={() => {}}
 *   onRemix={(id) => console.log(id)}
 * />
 * ```
 */
export function PostDetailModal({
  post,
  isOpen,
  onClose,
  onRemix,
  onSave,
  isRemixing = false,
  isSaving = false,
  className,
}: PostDetailModalProps) {
  /**
   * Handles the remix button click.
   */
  const handleRemix = React.useCallback(() => {
    if (post && !isRemixing) {
      onRemix(post.id)
    }
  }, [post, isRemixing, onRemix])

  /**
   * Handles the save button click.
   */
  const handleSave = React.useCallback(() => {
    if (post && onSave && !isSaving) {
      onSave(post.id)
    }
  }, [post, onSave, isSaving])

  /**
   * Calculates the relative time from the published date.
   */
  const relativeTime = React.useMemo(() => {
    if (!post) return ""
    return formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })
  }, [post])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden",
          className
        )}
      >
        {/* Hidden title for accessibility */}
        <DialogHeader className="sr-only">
          <DialogTitle>
            {post ? `Post by ${post.author.name}` : "Post Details"}
          </DialogTitle>
          <DialogDescription>
            View the full details of this inspiration post
          </DialogDescription>
        </DialogHeader>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          {!post ? (
            <PostDetailSkeleton />
          ) : (
            <div className="space-y-5">
              {/* Author Header */}
              <div className="flex items-start gap-4">
                <Avatar className="size-14 shrink-0">
                  {post.author.avatarUrl && (
                    <AvatarImage
                      src={post.author.avatarUrl}
                      alt={post.author.name}
                    />
                  )}
                  <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                    {getInitials(post.author.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base leading-tight">
                    {post.author.name}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-snug mt-0.5">
                    {post.author.headline}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <IconUsers className="size-3.5" />
                      {formatMetricNumber(post.author.followerCount)} followers
                    </span>
                    <span className="flex items-center gap-1">
                      <IconCalendar className="size-3.5" />
                      {relativeTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* Category Badge and Tags */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={getCategoryBadgeVariant(post.category)}>
                  {post.category}
                </Badge>
                {post.tags && post.tags.length > 0 && (
                  <>
                    <span className="text-muted-foreground">|</span>
                    <div className="flex items-center gap-1">
                      <IconTag className="size-3.5 text-muted-foreground" />
                      <div className="flex flex-wrap gap-1">
                        {post.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Post Content */}
              <div className="py-2">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
              </div>

              {/* Metrics Bar */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 py-3 border-t border-b">
                <MetricItem
                  icon={IconThumbUp}
                  value={post.metrics.likes}
                  label="likes"
                />
                <MetricItem
                  icon={IconMessageCircle}
                  value={post.metrics.comments}
                  label="comments"
                />
                <MetricItem
                  icon={IconShare}
                  value={post.metrics.shares}
                  label="shares"
                />
                {post.metrics.impressions && (
                  <MetricItem
                    icon={IconEye}
                    value={post.metrics.impressions}
                    label="impressions"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <DialogFooter className="flex-row gap-2 pt-4 border-t sm:justify-between">
          <DialogClose asChild>
            <Button variant="ghost" size="sm">
              <IconX className="size-4" />
              Close
            </Button>
          </DialogClose>

          <div className="flex items-center gap-2">
            {onSave && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={!post || isSaving}
              >
                {isSaving ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : (
                  <IconBookmark className="size-4" />
                )}
                Save
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleRemix}
              disabled={!post || isRemixing}
            >
              {isRemixing ? (
                <IconLoader2 className="size-4 animate-spin" />
              ) : (
                <IconSparkles className="size-4" />
              )}
              Remix
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
