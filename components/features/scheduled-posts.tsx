"use client"

import * as React from "react"
import {
  IconCalendar,
  IconClock,
  IconDots,
  IconEdit,
  IconTrash,
  IconSend,
  IconCalendarEvent,
  IconPhoto,
  IconLoader2,
  IconAlertCircle,
  IconPlus,
} from "@tabler/icons-react"
import { format, isToday, isTomorrow, isThisWeek, addDays } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * Represents a scheduled LinkedIn post with its metadata and status.
 */
export interface ScheduledPost {
  /** Unique identifier for the scheduled post */
  id: string
  /** The content/body text of the post */
  content: string
  /** ISO 8601 date string for when the post is scheduled to be published */
  scheduledFor: string
  /** Current status of the scheduled post */
  status: "pending" | "posting" | "failed"
  /** Optional array of media URLs attached to the post */
  mediaUrls?: string[]
}

/**
 * Props for the ScheduledPosts component.
 */
export interface ScheduledPostsProps {
  /** Array of scheduled posts to display */
  posts?: ScheduledPost[]
  /** Callback fired when user clicks Edit on a post */
  onEdit?: (postId: string) => void
  /** Callback fired when user clicks Delete on a post */
  onDelete?: (postId: string) => void
  /** Callback fired when user clicks Post Now on a post */
  onPostNow?: (postId: string) => void
  /** Callback fired when user clicks Schedule New button */
  onScheduleNew?: () => void
  /** Whether the component is in a loading state */
  isLoading?: boolean
  /** Additional CSS classes to apply to the container */
  className?: string
}

/** Maximum character count before content is truncated */
const CONTENT_TRUNCATE_LENGTH = 120

/**
 * Sample data for development and testing purposes.
 * Contains 5 scheduled posts with varied statuses and dates.
 */
export const sampleScheduledPosts: ScheduledPost[] = [
  {
    id: "scheduled-1",
    content:
      "Excited to share our Q1 results! We've exceeded all expectations and I want to thank our incredible team for their dedication. Here's what we learned along the way and how we plan to build on this momentum.",
    scheduledFor: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // Today, 2 hours from now
    status: "pending",
    mediaUrls: ["https://example.com/chart.png"],
  },
  {
    id: "scheduled-2",
    content:
      "5 lessons from leading remote teams for 3 years: 1. Over-communicate intentionally 2. Trust by default 3. Async-first, sync when needed 4. Document everything 5. Celebrate wins publicly. What would you add?",
    scheduledFor: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(), // Today, 5 hours from now
    status: "posting",
  },
  {
    id: "scheduled-3",
    content:
      "The biggest mistake I see in product development? Building features nobody asked for. Talk to your users. Validate early. Ship fast. Learn faster. Your roadmap should be a conversation, not a monologue.",
    scheduledFor: addDays(new Date(), 1).toISOString(), // Tomorrow
    status: "pending",
  },
  {
    id: "scheduled-4",
    content:
      "We're hiring! Looking for a Senior Frontend Engineer to join our growing team. Must love TypeScript, have experience with React, and be passionate about building great user experiences. DM me for details!",
    scheduledFor: addDays(new Date(), 3).toISOString(), // This week
    status: "failed",
    mediaUrls: [
      "https://example.com/hiring.png",
      "https://example.com/team.jpg",
    ],
  },
  {
    id: "scheduled-5",
    content:
      "Unpopular opinion: The best code is no code. Before writing a single line, ask yourself - can we solve this with a simpler approach? Sometimes the most elegant solution is the one you never had to build.",
    scheduledFor: addDays(new Date(), 10).toISOString(), // Later
    status: "pending",
  },
]

/**
 * Date group labels for organizing scheduled posts.
 */
type DateGroup = "Today" | "Tomorrow" | "This Week" | "Later"

/**
 * Determines which date group a scheduled post belongs to.
 * @param dateString - ISO 8601 date string
 * @returns The date group label
 */
function getDateGroup(dateString: string): DateGroup {
  const date = new Date(dateString)

  if (isToday(date)) {
    return "Today"
  }
  if (isTomorrow(date)) {
    return "Tomorrow"
  }
  if (isThisWeek(date, { weekStartsOn: 1 })) {
    return "This Week"
  }
  return "Later"
}

/**
 * Groups posts by their date category.
 * @param posts - Array of scheduled posts
 * @returns Object with posts grouped by date category
 */
function groupPostsByDate(
  posts: ScheduledPost[]
): Record<DateGroup, ScheduledPost[]> {
  const groups: Record<DateGroup, ScheduledPost[]> = {
    Today: [],
    Tomorrow: [],
    "This Week": [],
    Later: [],
  }

  // Sort posts by scheduled date
  const sortedPosts = [...posts].sort(
    (a, b) =>
      new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
  )

  for (const post of sortedPosts) {
    const group = getDateGroup(post.scheduledFor)
    groups[group].push(post)
  }

  return groups
}

/**
 * Formats the scheduled date/time for display.
 * @param dateString - ISO 8601 date string
 * @returns Formatted date/time string
 */
function formatScheduledTime(dateString: string): string {
  const date = new Date(dateString)

  if (isToday(date)) {
    return `Today at ${format(date, "h:mm a")}`
  }
  if (isTomorrow(date)) {
    return `Tomorrow at ${format(date, "h:mm a")}`
  }
  return format(date, "MMM d, yyyy 'at' h:mm a")
}

/**
 * Returns the badge configuration for a post status.
 * @param status - The post status
 * @returns Badge variant and label
 */
function getStatusBadge(status: ScheduledPost["status"]): {
  variant: "default" | "secondary" | "destructive" | "outline"
  label: string
  icon: React.ElementType
} {
  switch (status) {
    case "posting":
      return {
        variant: "default",
        label: "Posting",
        icon: IconLoader2,
      }
    case "failed":
      return {
        variant: "destructive",
        label: "Failed",
        icon: IconAlertCircle,
      }
    case "pending":
    default:
      return {
        variant: "secondary",
        label: "Pending",
        icon: IconClock,
      }
  }
}

/**
 * Truncates content to a specified length with ellipsis.
 * @param content - The content to truncate
 * @param maxLength - Maximum character length
 * @returns Truncated content with ellipsis if needed
 */
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content
  }
  return `${content.slice(0, maxLength).trim()}...`
}

/**
 * Loading skeleton for a single scheduled post card.
 */
function ScheduledPostSkeleton() {
  return (
    <div className="flex items-start gap-4 p-4 border rounded-lg">
      <Skeleton className="size-10 rounded-md shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
      <Skeleton className="size-8 rounded-md" />
    </div>
  )
}

/**
 * Loading skeleton for the entire component.
 */
function LoadingSkeleton() {
  return (
    <Card hover>
      <CardHeader>
        <CardTitle>Scheduled Posts</CardTitle>
        <CardAction>
          <Skeleton className="h-9 w-32" />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-5 w-20" />
        <div className="space-y-3">
          <ScheduledPostSkeleton />
          <ScheduledPostSkeleton />
        </div>
        <Skeleton className="h-5 w-24" />
        <div className="space-y-3">
          <ScheduledPostSkeleton />
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Renders a single scheduled post card.
 */
function ScheduledPostCard({
  post,
  onEdit,
  onDelete,
  onPostNow,
}: {
  post: ScheduledPost
  onEdit?: (postId: string) => void
  onDelete?: (postId: string) => void
  onPostNow?: (postId: string) => void
}) {
  const statusBadge = getStatusBadge(post.status)
  const StatusIcon = statusBadge.icon
  const hasMedia = post.mediaUrls && post.mediaUrls.length > 0
  const isPosting = post.status === "posting"

  return (
    <div
      className={cn(
        "flex items-start gap-4 p-4 border rounded-lg transition-colors",
        "hover:bg-muted/50",
        isPosting && "opacity-75"
      )}
    >
      {/* Calendar/Media Icon */}
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-md",
          "bg-muted text-muted-foreground"
        )}
      >
        {hasMedia ? (
          <IconPhoto className="size-5" />
        ) : (
          <IconCalendarEvent className="size-5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-sm leading-relaxed">
          {truncateContent(post.content, CONTENT_TRUNCATE_LENGTH)}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <IconCalendar className="size-3" />
            <span>{formatScheduledTime(post.scheduledFor)}</span>
          </div>
          <Badge
            variant={statusBadge.variant}
            className={cn(
              "text-[10px] gap-1",
              isPosting && "[&>svg]:animate-spin"
            )}
          >
            <StatusIcon className="size-3" />
            {statusBadge.label}
          </Badge>
          {hasMedia && (
            <span className="text-xs text-muted-foreground">
              {post.mediaUrls!.length} attachment
              {post.mediaUrls!.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            disabled={isPosting}
          >
            <IconDots className="size-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit?.(post.id)}>
            <IconEdit className="size-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onPostNow?.(post.id)}>
            <IconSend className="size-4" />
            Post Now
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete?.(post.id)}
          >
            <IconTrash className="size-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/**
 * Renders a date group header.
 */
function DateGroupHeader({ label }: { label: DateGroup }) {
  return (
    <h3 className="text-sm font-medium text-muted-foreground mb-3">{label}</h3>
  )
}

/**
 * Empty state component displayed when there are no scheduled posts.
 */
function EmptyState({ onScheduleNew }: { onScheduleNew?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-primary/10 p-5 mb-4">
        <IconCalendarEvent className="size-10 text-primary" />
      </div>
      <h3 className="font-semibold text-base mb-2">No scheduled posts yet</h3>
      <p className="text-sm text-muted-foreground max-w-[320px] mb-6">
        Schedule your LinkedIn posts in advance to maintain a consistent posting
        schedule and reach your audience at optimal times.
      </p>

      {/* Tutorial Tips */}
      <div className="w-full max-w-[400px] mb-6 p-4 rounded-lg border bg-muted/30 text-left">
        <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
          <IconCalendar className="size-3.5" />
          Pro Tips for Scheduling
        </p>
        <ul className="text-xs text-muted-foreground space-y-1.5 ml-5 list-disc">
          <li>Best posting times: Tue-Thu, 8-10 AM or 12-1 PM</li>
          <li>Schedule 3-5 posts per week for optimal engagement</li>
          <li>Mix content types: insights, stories, and questions</li>
        </ul>
      </div>

      {onScheduleNew && (
        <Button size="default" onClick={onScheduleNew} className="gap-2">
          <IconPlus className="size-4" />
          Schedule Your First Post
        </Button>
      )}
    </div>
  )
}

/**
 * ScheduledPosts displays a queue of scheduled LinkedIn posts organized by date,
 * allowing users to view, edit, delete, or immediately publish their scheduled content.
 *
 * Posts are grouped into four categories: Today, Tomorrow, This Week, and Later.
 * Each post displays a content preview, scheduled time, status badge, and action menu.
 *
 * @example
 * ```tsx
 * // Basic usage with callbacks
 * <ScheduledPosts
 *   posts={scheduledPosts}
 *   onEdit={(postId) => console.log("Edit:", postId)}
 *   onDelete={(postId) => console.log("Delete:", postId)}
 *   onPostNow={(postId) => console.log("Post now:", postId)}
 *   onScheduleNew={() => console.log("Schedule new")}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With loading state
 * <ScheduledPosts isLoading />
 * ```
 *
 * @example
 * ```tsx
 * // With sample data for development
 * import { ScheduledPosts, sampleScheduledPosts } from "@/components/features/scheduled-posts"
 *
 * <ScheduledPosts posts={sampleScheduledPosts} />
 * ```
 */
export function ScheduledPosts({
  posts,
  onEdit,
  onDelete,
  onPostNow,
  onScheduleNew,
  isLoading = false,
  className,
}: ScheduledPostsProps) {
  if (isLoading) {
    return (
      <div className={className}>
        <LoadingSkeleton />
      </div>
    )
  }

  const hasPosts = posts && posts.length > 0
  const groupedPosts = hasPosts ? groupPostsByDate(posts) : null
  const dateGroupOrder: DateGroup[] = ["Today", "Tomorrow", "This Week", "Later"]

  return (
    <Card hover className={className}>
      <CardHeader>
        <CardTitle>Scheduled Posts</CardTitle>
        <CardAction>
          <Button size="sm" onClick={onScheduleNew}>
            <IconPlus className="size-4" />
            Schedule New
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {!hasPosts ? (
          <EmptyState onScheduleNew={onScheduleNew} />
        ) : (
          <div className="space-y-6">
            {dateGroupOrder.map((group) => {
              const groupPosts = groupedPosts![group]
              if (groupPosts.length === 0) return null

              return (
                <div key={group}>
                  <DateGroupHeader label={group} />
                  <div className="space-y-3">
                    {groupPosts.map((post) => (
                      <ScheduledPostCard
                        key={post.id}
                        post={post}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onPostNow={onPostNow}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
