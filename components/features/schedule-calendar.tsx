"use client"

import * as React from "react"
import {
  IconChevronLeft,
  IconChevronRight,
  IconCalendarEvent,
  IconLoader2,
} from "@tabler/icons-react"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isPast,
  addMonths,
  subMonths,
} from "date-fns"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * Represents a scheduled post item for the calendar view.
 */
export interface ScheduledPostItem {
  /** Unique identifier for the scheduled post */
  id: string
  /** The content/body text of the post */
  content: string
  /** Date object for when the post is scheduled to be published */
  scheduledFor: Date
  /** Current status of the scheduled post */
  status: "pending" | "posted" | "failed"
  /** Platform for the post (e.g., "linkedin") */
  platform: string
}

/**
 * Props for the ScheduleCalendar component.
 */
export interface ScheduleCalendarProps {
  /** Array of scheduled posts to display on the calendar */
  posts?: ScheduledPostItem[]
  /** The currently displayed month (defaults to current month) */
  currentMonth?: Date
  /** Callback fired when the month is changed via navigation */
  onMonthChange?: (date: Date) => void
  /** Callback fired when a post indicator is clicked */
  onPostClick?: (post: ScheduledPostItem) => void
  /** Callback fired when a date cell is clicked */
  onDateClick?: (date: Date) => void
  /** Callback fired when a post needs to be rescheduled */
  onReschedule?: (post: ScheduledPostItem, newDate: Date) => void
  /** Whether the component is in a loading state */
  isLoading?: boolean
  /** Additional CSS classes to apply to the container */
  className?: string
}

/** Day names for the calendar header */
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/**
 * Sample data for development and testing purposes.
 * Contains 10 scheduled posts spread across the current month.
 */
export const sampleScheduledPostItems: ScheduledPostItem[] = [
  {
    id: "cal-post-1",
    content:
      "Excited to announce our new product launch! After months of development, we're ready to share what we've been working on.",
    scheduledFor: new Date(new Date().getFullYear(), new Date().getMonth(), 5, 9, 0),
    status: "posted",
    platform: "linkedin",
  },
  {
    id: "cal-post-2",
    content:
      "5 key insights from leading a remote team for 3 years. Thread incoming...",
    scheduledFor: new Date(new Date().getFullYear(), new Date().getMonth(), 8, 14, 30),
    status: "posted",
    platform: "linkedin",
  },
  {
    id: "cal-post-3",
    content:
      "The biggest mistake I see in product development? Building features nobody asked for.",
    scheduledFor: new Date(new Date().getFullYear(), new Date().getMonth(), 12, 10, 0),
    status: "failed",
    platform: "linkedin",
  },
  {
    id: "cal-post-4",
    content:
      "We're hiring! Looking for a Senior Frontend Engineer to join our growing team.",
    scheduledFor: new Date(new Date().getFullYear(), new Date().getMonth(), 15, 8, 0),
    status: "pending",
    platform: "linkedin",
  },
  {
    id: "cal-post-5",
    content:
      "Just published a new blog post on scaling engineering teams effectively.",
    scheduledFor: new Date(new Date().getFullYear(), new Date().getMonth(), 15, 16, 0),
    status: "pending",
    platform: "linkedin",
  },
  {
    id: "cal-post-6",
    content:
      "What I learned from interviewing 100 candidates for tech roles.",
    scheduledFor: new Date(new Date().getFullYear(), new Date().getMonth(), 18, 11, 0),
    status: "pending",
    platform: "linkedin",
  },
  {
    id: "cal-post-7",
    content:
      "Unpopular opinion: The best code is no code. Sometimes the most elegant solution is the one you never had to build.",
    scheduledFor: new Date(new Date().getFullYear(), new Date().getMonth(), 22, 9, 30),
    status: "pending",
    platform: "linkedin",
  },
  {
    id: "cal-post-8",
    content:
      "Our Q3 results are in. Here's what we learned and how we plan to build on this momentum.",
    scheduledFor: new Date(new Date().getFullYear(), new Date().getMonth(), 25, 10, 0),
    status: "pending",
    platform: "linkedin",
  },
  {
    id: "cal-post-9",
    content:
      "The future of work is hybrid. Here's how we're making it work for our team.",
    scheduledFor: new Date(new Date().getFullYear(), new Date().getMonth(), 28, 14, 0),
    status: "pending",
    platform: "linkedin",
  },
  {
    id: "cal-post-10",
    content:
      "Monthly reflection: What went well and what we're improving next month.",
    scheduledFor: new Date(new Date().getFullYear(), new Date().getMonth(), 28, 17, 0),
    status: "pending",
    platform: "linkedin",
  },
]

/**
 * Returns the CSS class for a post status indicator dot.
 * @param status - The post status
 * @returns Tailwind CSS classes for the dot color
 */
function getStatusDotClass(status: ScheduledPostItem["status"]): string {
  switch (status) {
    case "posted":
      return "bg-blue-500"
    case "failed":
      return "bg-red-500"
    case "pending":
    default:
      return "bg-green-500"
  }
}

/**
 * Gets posts for a specific date.
 * @param posts - All scheduled posts
 * @param date - The date to filter by
 * @returns Array of posts scheduled for that date
 */
function getPostsForDate(
  posts: ScheduledPostItem[],
  date: Date
): ScheduledPostItem[] {
  return posts.filter((post) => isSameDay(post.scheduledFor, date))
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
 * Loading skeleton for the calendar component.
 */
function CalendarSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <div className="flex items-center gap-2">
            <Skeleton className="size-8" />
            <Skeleton className="size-8" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAY_NAMES.map((day) => (
            <Skeleton key={day} className="h-8 w-full" />
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Empty state component displayed when there are no scheduled posts.
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <IconCalendarEvent className="size-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-sm mb-1">No scheduled posts</h3>
      <p className="text-xs text-muted-foreground max-w-[280px]">
        Schedule your LinkedIn posts to see them on the calendar.
      </p>
    </div>
  )
}

/**
 * Renders a single day cell in the calendar.
 */
function DayCell({
  date,
  posts,
  isCurrentMonth,
  onDateClick,
  onPostClick,
}: {
  date: Date
  posts: ScheduledPostItem[]
  isCurrentMonth: boolean
  onDateClick?: (date: Date) => void
  onPostClick?: (post: ScheduledPostItem) => void
}) {
  const dayPosts = getPostsForDate(posts, date)
  const today = isToday(date)
  const past = isPast(date) && !today

  return (
    <div
      className={cn(
        "min-h-20 p-1 border rounded-md transition-colors cursor-pointer",
        "hover:bg-muted/50",
        !isCurrentMonth && "bg-muted/30",
        past && isCurrentMonth && "text-muted-foreground",
        today && "ring-2 ring-primary ring-offset-2"
      )}
      onClick={() => onDateClick?.(date)}
      role="button"
      tabIndex={0}
      aria-label={`${format(date, "MMMM d, yyyy")}${dayPosts.length > 0 ? `, ${dayPosts.length} scheduled posts` : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onDateClick?.(date)
        }
      }}
    >
      {/* Date number */}
      <div
        className={cn(
          "text-sm font-medium mb-1",
          today && "text-primary font-bold",
          !isCurrentMonth && "text-muted-foreground/50"
        )}
      >
        {format(date, "d")}
      </div>

      {/* Post indicators */}
      {dayPosts.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {dayPosts.slice(0, 4).map((post) => (
            <TooltipProvider key={post.id}>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <button
                    className={cn(
                      "size-2.5 rounded-full transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary",
                      getStatusDotClass(post.status)
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      onPostClick?.(post)
                    }}
                    aria-label={`${post.status} post: ${truncateContent(post.content, 30)}`}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  <p className="text-xs font-medium capitalize mb-1">
                    {post.status}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {truncateContent(post.content, 60)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(post.scheduledFor, "h:mm a")}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          {dayPosts.length > 4 && (
            <span className="text-xs text-muted-foreground">
              +{dayPosts.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * ScheduleCalendar displays a monthly calendar view of scheduled posts,
 * allowing users to visualize their content schedule and interact with posts.
 *
 * Posts are displayed as colored dots on their scheduled dates:
 * - Green: Pending posts waiting to be published
 * - Blue: Successfully posted content
 * - Red: Failed posts that need attention
 *
 * @example
 * ```tsx
 * // Basic usage with sample data
 * import { ScheduleCalendar, sampleScheduledPostItems } from "@/components/features/schedule-calendar"
 *
 * <ScheduleCalendar
 *   posts={sampleScheduledPostItems}
 *   onDateClick={(date) => console.log("Date clicked:", date)}
 *   onPostClick={(post) => console.log("Post clicked:", post)}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With controlled month and navigation
 * const [currentMonth, setCurrentMonth] = useState(new Date())
 *
 * <ScheduleCalendar
 *   posts={posts}
 *   currentMonth={currentMonth}
 *   onMonthChange={setCurrentMonth}
 *   onPostClick={(post) => openEditModal(post)}
 *   onDateClick={(date) => openScheduleModal(date)}
 * />
 * ```
 *
 * @example
 * ```tsx
 * // With loading state
 * <ScheduleCalendar isLoading />
 * ```
 */
export function ScheduleCalendar({
  posts = [],
  currentMonth: controlledMonth,
  onMonthChange,
  onPostClick,
  onDateClick,
  onReschedule,
  isLoading = false,
  className,
}: ScheduleCalendarProps) {
  const [internalMonth, setInternalMonth] = React.useState(new Date())

  // Use controlled or internal month state
  const currentMonth = controlledMonth ?? internalMonth

  /**
   * Handles month navigation.
   * @param direction - Direction to navigate ("prev" or "next")
   */
  const handleMonthChange = (direction: "prev" | "next") => {
    const newMonth = direction === "prev"
      ? subMonths(currentMonth, 1)
      : addMonths(currentMonth, 1)

    if (onMonthChange) {
      onMonthChange(newMonth)
    } else {
      setInternalMonth(newMonth)
    }
  }

  /**
   * Navigates to the current month (today).
   */
  const handleTodayClick = () => {
    const today = new Date()
    if (onMonthChange) {
      onMonthChange(today)
    } else {
      setInternalMonth(today)
    }
  }

  // Calculate calendar days
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  if (isLoading) {
    return (
      <div className={className}>
        <CalendarSkeleton />
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <IconCalendarEvent className="size-5" />
            {format(currentMonth, "MMMM yyyy")}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTodayClick}
              className="text-xs"
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => handleMonthChange("prev")}
              aria-label="Previous month"
            >
              <IconChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => handleMonthChange("next")}
              aria-label="Next month"
            >
              <IconChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {posts.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Legend */}
            <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-green-500" />
                <span>Pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-blue-500" />
                <span>Posted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-red-500" />
                <span>Failed</span>
              </div>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAY_NAMES.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date) => (
                <DayCell
                  key={date.toISOString()}
                  date={date}
                  posts={posts}
                  isCurrentMonth={isSameMonth(date, currentMonth)}
                  onDateClick={onDateClick}
                  onPostClick={onPostClick}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
