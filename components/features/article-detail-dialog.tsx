/**
 * Article Detail Dialog Component
 * @description Full-screen dialog that displays complete article details including
 * headline, summary, source citations, relevance tags, and a remix action button.
 * Opened when a user clicks an article card on the Discover page.
 * @module components/features/article-detail-dialog
 */

"use client"

import * as React from "react"
import {
  IconClock,
  IconExternalLink,
  IconLink,
  IconSparkles,
  IconTag,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type { NewsArticle } from "@/hooks/use-discover-news"

/**
 * Props for ArticleDetailDialog
 * @param article - The news article to display, or null when no article is selected
 * @param isOpen - Whether the dialog is currently open
 * @param onClose - Callback to close the dialog
 * @param onRemix - Callback when the user clicks the remix button
 */
interface ArticleDetailDialogProps {
  article: NewsArticle | null
  isOpen: boolean
  onClose: () => void
  onRemix: (article: NewsArticle) => void
}

/**
 * Extract the domain name from a full URL
 * @param url - Full URL string
 * @returns Domain name without the "www." prefix
 * @example
 * extractDomain("https://www.example.com/article/123") // "example.com"
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "")
  } catch {
    return url
  }
}

/**
 * Format a relative time string from an ISO date
 * @param dateStr - ISO date string
 * @returns Human-readable relative time (e.g. "5m ago", "2h ago", "3d ago")
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
 * Capitalize a topic slug into a display name
 * @param topic - Topic slug (e.g. "remote-work")
 * @returns Capitalized display name (e.g. "Remote Work")
 */
function capitalizeTopicName(topic: string): string {
  return topic
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * Article Detail Dialog component
 * Displays the full details of a news article in a modal dialog, including
 * headline, two-paragraph summary, relevance tags, source citations, and
 * action buttons for reading the full article or remixing it into a post.
 * @param props - Component props
 * @param props.article - The news article data to display
 * @param props.isOpen - Whether the dialog is open
 * @param props.onClose - Handler to close the dialog
 * @param props.onRemix - Handler to remix the article into a post
 * @returns Rendered dialog element
 * @example
 * <ArticleDetailDialog
 *   article={selectedArticle}
 *   isOpen={isDialogOpen}
 *   onClose={() => setIsDialogOpen(false)}
 *   onRemix={handleRemix}
 * />
 */
export function ArticleDetailDialog({
  article,
  isOpen,
  onClose,
  onRemix,
}: ArticleDetailDialogProps) {
  if (!article) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>No article selected</DialogTitle>
            <DialogDescription>
              Select an article to view its details.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  const relativeTime = formatRelativeTime(
    article.publishedDate || article.createdAt
  )
  const topicDisplayName = capitalizeTopicName(article.topic)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {article.sourceName}
            </Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <IconClock className="size-3" />
              {relativeTime}
            </span>
            <Badge variant="outline" className="text-xs capitalize">
              {article.freshness}
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold">
            {article.headline}
          </DialogTitle>
          <DialogDescription>{topicDisplayName}</DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <ScrollArea className="max-h-[60vh]">
          <div className="flex flex-col gap-5 pr-4">
            {/* Summary */}
            <p className="whitespace-pre-line text-base leading-relaxed text-foreground">
              {article.summary}
            </p>

            <Separator />

            {/* Relevance Tags */}
            {article.relevanceTags.length > 0 && (
              <div className="flex flex-col gap-2">
                <h4 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                  <IconTag className="size-4" />
                  Related Topics
                </h4>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {article.relevanceTags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Sources & Citations */}
            <div className="flex flex-col gap-2">
              <h4 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <IconLink className="size-4" />
                Sources &amp; Citations
              </h4>

              {/* Primary source */}
              <div className="flex flex-col gap-1.5">
                <a
                  href={article.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline truncate"
                >
                  <IconExternalLink className="size-3.5 shrink-0" />
                  {extractDomain(article.sourceUrl)}
                </a>
              </div>

              {/* Perplexity citations */}
              {article.perplexityCitations.length > 0 ? (
                <ol className="flex flex-col gap-1 mt-1 list-none">
                  {article.perplexityCitations.map((citation, index) => (
                    <li key={citation} className="text-sm">
                      <a
                        href={citation}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span className="text-xs font-medium text-muted-foreground/70 tabular-nums">
                          {index + 1}.
                        </span>
                        <IconExternalLink className="size-3 shrink-0" />
                        {extractDomain(citation)}
                      </a>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No additional citations available
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" asChild>
            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="gap-1.5"
            >
              <IconExternalLink className="size-4" />
              Read Full Article
            </a>
          </Button>
          <Button size="sm" onClick={() => onRemix(article)} className="gap-1.5">
            <IconSparkles className="size-4" />
            Remix into Post
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
