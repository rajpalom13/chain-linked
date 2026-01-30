/**
 * Discover Content Card Component
 * @description Enhanced card component for displaying industry content with
 * author profiles, engagement metrics, and action buttons
 * @module components/features/discover-content-card
 */

"use client"

import * as React from "react"
import {
  IconBookmark,
  IconHeart,
  IconMessageCircle,
  IconRepeat,
  IconSparkles,
  IconFlame,
  IconChevronDown,
  IconChevronUp,
  IconExternalLink,
} from "@tabler/icons-react"
import { formatDistanceToNowStrict } from "date-fns"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { DiscoverArticle } from "@/hooks/use-discover"

/**
 * Maximum content length before truncation
 */
const MAX_CONTENT_LENGTH = 280

/**
 * Props for DiscoverContentCard
 */
interface DiscoverContentCardProps {
  /** Article data to display */
  article: DiscoverArticle
  /** Callback when remix button is clicked */
  onRemix: (article: DiscoverArticle) => void
  /** Callback when save button is clicked */
  onSave?: (article: DiscoverArticle) => void
}

/**
 * Formats a number into a compact display string (e.g., 1.2K, 3.4M)
 * @param num - Number to format
 * @returns Formatted string
 */
function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`
  }
  return num.toString()
}

/**
 * Returns a human-readable relative time string
 * @param dateStr - ISO date string
 * @returns Relative time string like "2h ago" or "3d ago"
 */
function getRelativeTime(dateStr: string): string {
  try {
    return formatDistanceToNowStrict(new Date(dateStr), { addSuffix: true })
  } catch {
    return ""
  }
}

/**
 * Gets initials from a name for avatar fallback
 * @param name - Full name
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
 * Enhanced content card for displaying industry articles in the Discover page.
 * Includes author profile, engagement metrics, viral badge, and action buttons.
 *
 * @param props - Component props
 * @param props.article - Article data to display
 * @param props.onRemix - Callback when remix button is clicked
 * @param props.onSave - Optional callback when save button is clicked
 * @returns Rendered content card with author info and engagement metrics
 *
 * @example
 * ```tsx
 * <DiscoverContentCard
 *   article={article}
 *   onRemix={(article) => handleRemix(article)}
 *   onSave={(article) => handleSave(article)}
 * />
 * ```
 */
export function DiscoverContentCard({
  article,
  onRemix,
  onSave,
}: DiscoverContentCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [isSaved, setIsSaved] = React.useState(false)

  const contentText = article.description || article.title
  const isLongContent = contentText.length > MAX_CONTENT_LENGTH
  const displayContent = isExpanded
    ? contentText
    : isLongContent
      ? contentText.slice(0, MAX_CONTENT_LENGTH) + "..."
      : contentText

  const relativeTime = getRelativeTime(article.publishedAt)
  const isViral = article.isViral || (article.engagementRate ?? 0) >= 2.0

  /**
   * Handle save button click
   */
  const handleSave = React.useCallback(() => {
    setIsSaved((prev) => !prev)
    if (onSave) {
      onSave(article)
    }
  }, [article, onSave])

  /**
   * Toggle content expansion
   */
  const toggleExpand = React.useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  return (
    <Card
      className={cn(
        "flex flex-col h-full overflow-hidden transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5"
      )}
    >
      <CardContent className="flex flex-col flex-1 p-5 gap-3">
        {/* Author Profile Section */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="size-10 shrink-0">
              <AvatarImage
                src={article.authorAvatarUrl || undefined}
                alt={article.authorName || article.source}
              />
              <AvatarFallback className="text-xs font-medium bg-muted">
                {getInitials(article.authorName || article.source)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate">
                  {article.authorName || article.source}
                </p>
                {isViral && (
                  <Badge
                    variant="secondary"
                    className="gap-1 shrink-0 text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-950"
                  >
                    <IconFlame className="size-3" />
                    Viral
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {article.authorHeadline || article.source}
              </p>
            </div>
          </div>
          {relativeTime && (
            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
              {relativeTime}
            </span>
          )}
        </div>

        {/* Source Label */}
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: article.sourceColor }}
          >
            {article.source}
          </span>
          {article.engagementRate != null && article.engagementRate > 0 && (
            <span className="text-xs text-muted-foreground">
              {article.engagementRate.toFixed(1)}% engagement
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-base leading-snug line-clamp-2">
          {article.title}
        </h3>

        {/* Content / Description */}
        <div className="flex-1">
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {displayContent}
          </p>
          {isLongContent && (
            <button
              onClick={toggleExpand}
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

        {/* Engagement Metrics */}
        <div className="flex items-center gap-4 pt-1 border-t">
          {article.likesCount != null && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <IconHeart className="size-4" />
              <span className="text-xs font-medium">
                {formatCompactNumber(article.likesCount)}
              </span>
            </div>
          )}
          {article.commentsCount != null && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <IconMessageCircle className="size-4" />
              <span className="text-xs font-medium">
                {formatCompactNumber(article.commentsCount)}
              </span>
            </div>
          )}
          {article.repostsCount != null && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <IconRepeat className="size-4" />
              <span className="text-xs font-medium">
                {formatCompactNumber(article.repostsCount)}
              </span>
            </div>
          )}
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
              title="View original post"
            >
              <IconExternalLink className="size-4" />
            </a>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-auto pt-1">
          <Button
            variant="default"
            className="flex-1 gap-2"
            onClick={() => onRemix(article)}
          >
            <IconSparkles className="size-4" />
            Remix
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleSave}
            title={isSaved ? "Remove from saved" : "Save for later"}
            className={cn(
              "shrink-0 transition-colors",
              isSaved && "text-primary border-primary"
            )}
          >
            <IconBookmark
              className={cn("size-4", isSaved && "fill-current")}
            />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Skeleton loader for DiscoverContentCard
 * @returns Animated skeleton matching the card layout
 */
export function DiscoverContentCardSkeleton() {
  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardContent className="flex flex-col flex-1 p-5 gap-3">
        {/* Author Skeleton */}
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            <div className="h-3 w-48 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-3 w-16 bg-muted animate-pulse rounded" />
        </div>

        {/* Source Skeleton */}
        <div className="h-3 w-24 bg-muted animate-pulse rounded" />

        {/* Title Skeleton */}
        <div className="space-y-2">
          <div className="h-5 w-full bg-muted animate-pulse rounded" />
          <div className="h-5 w-3/4 bg-muted animate-pulse rounded" />
        </div>

        {/* Description Skeleton */}
        <div className="flex-1 space-y-2">
          <div className="h-4 w-full bg-muted animate-pulse rounded" />
          <div className="h-4 w-full bg-muted animate-pulse rounded" />
          <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
        </div>

        {/* Metrics Skeleton */}
        <div className="flex gap-4 border-t pt-1">
          <div className="h-4 w-12 bg-muted animate-pulse rounded" />
          <div className="h-4 w-12 bg-muted animate-pulse rounded" />
          <div className="h-4 w-12 bg-muted animate-pulse rounded" />
        </div>

        {/* Button Skeleton */}
        <div className="flex gap-2 mt-auto pt-1">
          <div className="h-10 flex-1 bg-muted animate-pulse rounded" />
          <div className="h-10 w-10 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  )
}
