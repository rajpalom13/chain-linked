/**
 * Discover Trending Sidebar Component
 * @description Right sidebar for the discover page showing top picks and trending topics
 * @module components/features/discover-trending-sidebar
 */

"use client"

import * as React from "react"
import {
  IconExternalLink,
  IconFlame,
  IconHeart,
  IconTrophy,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { MarkdownContent } from "@/components/shared/markdown-content"
import { cn } from "@/lib/utils"
import type { DiscoverArticle, Topic } from "@/hooks/use-discover"

/**
 * Props for DiscoverTrendingSidebar
 * @param articles - All articles to derive top picks from
 * @param topics - Available topic list
 * @param activeTopic - Currently selected topic slug
 * @param onTopicClick - Callback when a topic chip is clicked
 * @param onArticleClick - Callback when a top pick article is clicked
 */
interface DiscoverTrendingSidebarProps {
  articles: DiscoverArticle[]
  topics: Topic[]
  activeTopic: string
  onTopicClick: (topicSlug: string) => void
  onArticleClick?: (article: DiscoverArticle) => void
}

/**
 * Format large numbers with K/M suffix
 * @param num - Number to format
 * @returns Formatted string
 */
function formatCount(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

/**
 * Strip markdown syntax and citation references from a title string
 * for display as clean plain text. Removes heading markers (###),
 * bold/italic markers (** / *), citation references [N], and extra whitespace.
 * @param text - Raw title string potentially containing markdown
 * @returns Cleaned plain-text title
 */
function stripMarkdownFromTitle(text: string): string {
  return text
    // Remove citation references like [1], [2][3], [Context]
    .replace(/\[(?:\d+|Context)\]/g, "")
    // Remove heading markers (### Header -> Header)
    .replace(/^#{1,6}\s+/gm, "")
    // Remove bold markers (**text** -> text)
    .replace(/\*\*(.*?)\*\*/g, "$1")
    // Remove italic markers (*text* -> text)
    .replace(/\*(.*?)\*/g, "$1")
    // Remove inline code markers (`text` -> text)
    .replace(/`(.*?)`/g, "$1")
    // Remove link syntax [text](url) -> text
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    // Collapse multiple spaces into one
    .replace(/\s{2,}/g, " ")
    .trim()
}

/**
 * Discover Trending Sidebar component
 * Shows "Today's Top Picks" (top 5 by engagement) and "Trending Topics" (topic chips with post counts)
 * @param props - Component props
 * @returns Rendered sidebar with top picks and trending topics
 * @example
 * <DiscoverTrendingSidebar
 *   articles={articles}
 *   topics={topics}
 *   activeTopic="all"
 *   onTopicClick={setActiveTopic}
 * />
 */
export function DiscoverTrendingSidebar({
  articles,
  topics,
  activeTopic,
  onTopicClick,
  onArticleClick,
}: DiscoverTrendingSidebarProps) {
  /**
   * Top 5 articles by total engagement (likes + comments + reposts)
   */
  const topPicks = React.useMemo(() => {
    return [...articles]
      .sort((a, b) => {
        const engA = (a.likesCount || 0) + (a.commentsCount || 0) + (a.repostsCount || 0)
        const engB = (b.likesCount || 0) + (b.commentsCount || 0) + (b.repostsCount || 0)
        return engB - engA
      })
      .slice(0, 5)
  }, [articles])

  /**
   * Topics with post counts, excluding "All"
   */
  const topicsWithCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    for (const article of articles) {
      const topic = article.topic
      if (topic) {
        counts[topic] = (counts[topic] || 0) + 1
      }
    }

    return topics
      .filter((t) => t.slug !== "all")
      .map((t) => ({
        ...t,
        postCount: t.postCount || counts[t.slug] || 0,
      }))
      .sort((a, b) => (b.postCount || 0) - (a.postCount || 0))
  }, [topics, articles])

  return (
    <aside className="w-80 shrink-0 space-y-6 hidden lg:block">
      {/* Today's Top Picks */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <IconTrophy className="size-4 text-amber-500" />
          Today&apos;s Top Picks
        </h3>
        <div className="space-y-1">
          {topPicks.length > 0 ? (
            topPicks.map((article, index) => (
              <button
                key={article.id}
                className={cn(
                  "w-full flex items-start gap-3 p-2.5 rounded-md text-left transition-colors",
                  "hover:bg-muted/70"
                )}
                onClick={() => onArticleClick?.(article)}
              >
                {/* Rank Number */}
                <span className={cn(
                  "text-lg font-bold shrink-0 w-5 text-center leading-tight",
                  index === 0 && "text-amber-500",
                  index === 1 && "text-zinc-400",
                  index === 2 && "text-amber-700",
                  index > 2 && "text-muted-foreground"
                )}>
                  {index + 1}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug line-clamp-2">
                    {stripMarkdownFromTitle(article.title)}
                  </p>
                  {article.description && (
                    <MarkdownContent
                      content={article.description.slice(0, 200)}
                      className="text-xs text-muted-foreground mt-0.5 line-clamp-2"
                      compact
                      maxLines={2}
                    />
                  )}
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span
                      className="font-medium"
                      style={{ color: article.sourceColor }}
                    >
                      {article.authorName || article.source}
                    </span>
                    {article.likesCount != null && article.likesCount > 0 && (
                      <span className="flex items-center gap-0.5">
                        <IconHeart className="size-3" />
                        {formatCount(article.likesCount)}
                      </span>
                    )}
                    {article.url && (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-foreground transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <p className="text-xs text-muted-foreground px-2 py-4">
              No top picks available yet.
            </p>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Trending Topics */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <IconFlame className="size-4 text-orange-500" />
          Trending Topics
        </h3>
        <div className="flex flex-wrap gap-2">
          {topicsWithCounts.map((topic) => (
            <button
              key={topic.id}
              onClick={() => onTopicClick(topic.slug)}
            >
              <Badge
                variant={topic.slug === activeTopic ? "default" : "outline"}
                className={cn(
                  "cursor-pointer transition-colors text-xs",
                  topic.slug === activeTopic
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                {topic.name}
                {topic.postCount > 0 && (
                  <span className="ml-1 opacity-70">
                    {topic.postCount}
                  </span>
                )}
              </Badge>
            </button>
          ))}
          {topicsWithCounts.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Select topics to see trends.
            </p>
          )}
        </div>
      </div>
    </aside>
  )
}
