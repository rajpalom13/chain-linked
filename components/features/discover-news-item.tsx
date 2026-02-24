/**
 * Discover News Item Component
 * @description Renders a single news/article item in compact or featured variant
 * for the LinkedIn-style discover feed
 * @module components/features/discover-news-item
 */

"use client"

import * as React from "react"
import {
  IconClock,
  IconExternalLink,
  IconHeart,
  IconMessage,
  IconRepeat,
  IconSparkles,
} from "@tabler/icons-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn, getInitials, formatMetricNumber } from "@/lib/utils"
import { MarkdownContent } from "@/components/shared/markdown-content"
import type { DiscoverArticle } from "@/hooks/use-discover"

/**
 * Props for DiscoverNewsItem
 * @param article - The article data to display
 * @param onRemix - Callback when remix button is clicked
 * @param variant - Display variant: 'compact' for list items, 'featured' for top stories
 */
interface DiscoverNewsItemProps {
  article: DiscoverArticle
  onRemix: (article: DiscoverArticle) => void
  variant: "compact" | "featured"
}

/**
 * Format a relative time string from an ISO date
 * @param dateStr - ISO date string
 * @returns Human-readable relative time (e.g., "2h ago", "3d ago")
 */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}


/**
 * Strip any residual markdown syntax from a title for plain-text rendering.
 * Removes heading prefixes, bold/italic markers, and citation references.
 * Acts as a defensive safeguard in case the data layer passes through unclean text.
 * @param text - Title string that may contain markdown artifacts
 * @returns Clean plain text
 */
function stripMarkdownFromTitle(text: string): string {
  return text
    .replace(/\[(?:\d+|Context)\]/g, "")
    .replace(/^#{1,6}\s+/, "")
    .replace(/\*\*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
}

/**
 * Compact news item for the main feed list
 * ~64px height, single-row layout with source icon, headline, time
 * @param props - Component props
 * @returns Rendered compact news item
 */
function CompactItem({ article, onRemix }: Omit<DiscoverNewsItemProps, "variant">) {
  const [isHovered, setIsHovered] = React.useState(false)

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer",
        "border-b border-border/50 last:border-b-0",
        "hover:bg-muted/50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Source Avatar */}
      <Avatar className="size-8 shrink-0">
        {article.authorAvatarUrl && (
          <AvatarImage src={article.authorAvatarUrl} alt={article.authorName || article.source} />
        )}
        <AvatarFallback
          className="text-[10px] font-semibold"
          style={{ backgroundColor: article.sourceColor + "20", color: article.sourceColor }}
        >
          {getInitials(article.authorName || article.source)}
        </AvatarFallback>
      </Avatar>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium leading-snug line-clamp-1 group-hover:text-primary transition-colors">
          {stripMarkdownFromTitle(article.title)}
        </h3>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          <span
            className="font-medium"
            style={{ color: article.sourceColor }}
          >
            {article.authorName || article.source}
          </span>
          <span className="flex items-center gap-0.5">
            <IconClock className="size-3" />
            {formatRelativeTime(article.publishedAt)}
          </span>
          {article.likesCount != null && article.likesCount > 0 && (
            <span className="flex items-center gap-0.5">
              <IconHeart className="size-3" />
              {formatMetricNumber(article.likesCount)}
            </span>
          )}
        </div>
      </div>

      {/* Hover Actions */}
      <div className={cn(
        "flex items-center gap-1 shrink-0 transition-opacity",
        isHovered ? "opacity-100" : "opacity-0"
      )}>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 gap-1 text-xs"
          onClick={(e) => {
            e.stopPropagation()
            onRemix(article)
          }}
        >
          <IconSparkles className="size-3" />
          Remix
        </Button>
        {article.url && (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <IconExternalLink className="size-3.5" />
          </a>
        )}
      </div>
    </div>
  )
}

/**
 * Featured news item for the top stories section
 * Larger layout with 2-line headline, description, and engagement metrics
 * @param props - Component props
 * @returns Rendered featured news item
 */
function FeaturedItem({ article, onRemix }: Omit<DiscoverNewsItemProps, "variant">) {
  return (
    <div
      className={cn(
        "group flex flex-col gap-3 p-4 rounded-lg transition-all cursor-pointer",
        "border border-border/50 bg-card",
        "hover:shadow-md hover:border-border hover:-translate-y-0.5"
      )}
    >
      {/* Source Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="size-6 shrink-0">
            {article.authorAvatarUrl && (
              <AvatarImage src={article.authorAvatarUrl} alt={article.authorName || article.source} />
            )}
            <AvatarFallback
              className="text-[9px] font-semibold"
              style={{ backgroundColor: article.sourceColor + "20", color: article.sourceColor }}
            >
              {getInitials(article.authorName || article.source)}
            </AvatarFallback>
          </Avatar>
          <span
            className="text-xs font-semibold"
            style={{ color: article.sourceColor }}
          >
            {article.authorName || article.source}
          </span>
          {article.authorHeadline && (
            <span className="text-xs text-muted-foreground hidden sm:inline truncate max-w-[200px]">
              {article.authorHeadline}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <IconClock className="size-3" />
          {formatRelativeTime(article.publishedAt)}
        </span>
      </div>

      {/* Headline */}
      <h3 className="text-base font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
        {stripMarkdownFromTitle(article.title)}
      </h3>

      {/* Description */}
      {article.description && (
        <MarkdownContent
          content={article.description.slice(0, 300)}
          className="text-sm text-muted-foreground leading-relaxed"
          maxLines={3}
          compact
        />
      )}

      {/* Engagement + Actions */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {article.likesCount != null && article.likesCount > 0 && (
            <span className="flex items-center gap-1">
              <IconHeart className="size-3.5" />
              {formatMetricNumber(article.likesCount)}
            </span>
          )}
          {article.commentsCount != null && article.commentsCount > 0 && (
            <span className="flex items-center gap-1">
              <IconMessage className="size-3.5" />
              {formatMetricNumber(article.commentsCount)}
            </span>
          )}
          {article.repostsCount != null && article.repostsCount > 0 && (
            <span className="flex items-center gap-1">
              <IconRepeat className="size-3.5" />
              {formatMetricNumber(article.repostsCount)}
            </span>
          )}
          {article.isViral && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-orange-500/10 text-orange-600">
              Trending
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              onRemix(article)
            }}
          >
            <IconSparkles className="size-3" />
            Remix
          </Button>
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <IconExternalLink className="size-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Discover News Item component
 * Renders either a compact list item or featured card based on variant prop
 * @param props - Component props
 * @returns Rendered news item in the specified variant
 * @example
 * <DiscoverNewsItem article={article} onRemix={handleRemix} variant="compact" />
 */
export function DiscoverNewsItem({ article, onRemix, variant }: DiscoverNewsItemProps) {
  if (variant === "featured") {
    return <FeaturedItem article={article} onRemix={onRemix} />
  }
  return <CompactItem article={article} onRemix={onRemix} />
}
