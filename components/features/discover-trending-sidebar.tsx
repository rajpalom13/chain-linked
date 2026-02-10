/**
 * Discover Trending Sidebar Component
 * @description Right sidebar for the discover page showing top headlines and trending topics
 * @module components/features/discover-trending-sidebar
 */

"use client"

import * as React from "react"
import {
  IconExternalLink,
  IconFlame,
  IconNews,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { NewsArticle, Topic } from "@/hooks/use-discover-news"

/**
 * Props for DiscoverTrendingSidebar
 * @param articles - All articles to derive top headlines from
 * @param topics - Available topic list
 * @param activeTopic - Currently selected topic slug
 * @param onTopicClick - Callback when a topic chip is clicked
 * @param onArticleClick - Callback when a top headline is clicked
 */
interface DiscoverTrendingSidebarProps {
  articles: NewsArticle[]
  topics: Topic[]
  activeTopic: string
  onTopicClick: (topicSlug: string) => void
  onArticleClick?: (article: NewsArticle) => void
}

/**
 * Format a relative time string from an ISO date
 * @param dateStr - ISO date string
 * @returns Human-readable relative time
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
 * Discover Trending Sidebar component
 * Shows "Top Headlines" (top 5 by recency) and "Trending Topics" (topic chips with post counts)
 * @param props - Component props
 * @returns Rendered sidebar with top headlines and trending topics
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
   * Top 5 articles by recency
   */
  const topHeadlines = React.useMemo(() => {
    return [...articles]
      .sort((a, b) => {
        const dateA = new Date(a.publishedDate || a.createdAt).getTime()
        const dateB = new Date(b.publishedDate || b.createdAt).getTime()
        return dateB - dateA
      })
      .slice(0, 5)
  }, [articles])

  /**
   * Topics with article counts, excluding "All"
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
      {/* Top Headlines */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <IconNews className="size-4 text-blue-500" />
          Top Headlines
        </h3>
        <div className="space-y-1">
          {topHeadlines.length > 0 ? (
            topHeadlines.map((article, index) => (
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
                  index === 0 && "text-blue-500",
                  index === 1 && "text-blue-400",
                  index === 2 && "text-blue-300",
                  index > 2 && "text-muted-foreground"
                )}>
                  {index + 1}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug line-clamp-2">
                    {article.headline}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">
                      {article.sourceName}
                    </span>
                    <span>
                      {formatRelativeTime(article.publishedDate || article.createdAt)}
                    </span>
                    <a
                      href={article.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <p className="text-xs text-muted-foreground px-2 py-4">
              No headlines available yet.
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
                {topic.postCount != null && topic.postCount > 0 && (
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
