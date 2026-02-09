/**
 * Markdown Content Renderer
 * @description Renders markdown-formatted text as properly styled HTML.
 * Used across discover feed, research results, and generated posts.
 * Strips Perplexity-style citation references [N] from content.
 * @module components/shared/markdown-content
 */

"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import { cn } from "@/lib/utils"

/**
 * Props for MarkdownContent
 * @param content - Markdown string to render
 * @param className - Additional CSS classes for the wrapper
 * @param maxLines - Approximate max visible lines via max-height with fade overlay
 * @param compact - If true, reduces spacing for tighter layouts
 */
interface MarkdownContentProps {
  content: string
  className?: string
  maxLines?: number
  compact?: boolean
}

/**
 * Strip citation references like [1], [2][3], [Context] from content
 * These are Perplexity API artifacts that shouldn't be displayed
 * @param text - Raw content string
 * @returns Cleaned content without citation references
 */
function stripCitations(text: string): string {
  return text.replace(/\[(?:\d+|Context)\]/g, "").replace(/\s{2,}/g, " ")
}

/**
 * Renders markdown content with proper HTML formatting and Tailwind styling.
 * Supports bold, italic, links, lists, code, headings, and line breaks.
 * Automatically strips Perplexity citation references.
 * @param props - Component props
 * @returns Rendered markdown as styled HTML
 * @example
 * <MarkdownContent content="**Bold** and *italic* text" className="text-sm" />
 * <MarkdownContent content={longContent} maxLines={4} />
 */
export const MarkdownContent = React.memo(function MarkdownContent({
  content,
  className,
  maxLines,
  compact = false,
}: MarkdownContentProps) {
  const cleaned = stripCitations(content)

  // Calculate max-height from line count (approx 1.5rem per line)
  const maxHeightStyle = maxLines
    ? { maxHeight: `${maxLines * 1.5}rem`, overflow: "hidden" as const }
    : undefined

  return (
    <div className={cn("markdown-content relative", className)}>
      <div style={maxHeightStyle}>
        <ReactMarkdown
          components={{
            p: ({ children }) => (
              <p className={cn("last:mb-0", compact ? "mb-1" : "mb-2")}>{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-foreground">{children}</strong>
            ),
            em: ({ children }) => (
              <em className="italic">{children}</em>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
              >
                {children}
              </a>
            ),
            ul: ({ children }) => (
              <ul className={cn("list-disc list-inside space-y-0.5", compact ? "mb-1" : "mb-2")}>
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className={cn("list-decimal list-inside space-y-0.5", compact ? "mb-1" : "mb-2")}>
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="leading-relaxed">{children}</li>
            ),
            h1: ({ children }) => (
              <p className={cn("font-bold text-foreground", compact ? "mb-0.5" : "mb-1")}>{children}</p>
            ),
            h2: ({ children }) => (
              <p className={cn("font-bold text-foreground", compact ? "mb-0.5" : "mb-1")}>{children}</p>
            ),
            h3: ({ children }) => (
              <p className={cn("font-semibold text-foreground", compact ? "mb-0.5" : "mb-1")}>{children}</p>
            ),
            h4: ({ children }) => (
              <p className={cn("font-semibold text-foreground", compact ? "mb-0.5" : "mb-1")}>{children}</p>
            ),
            code: ({ children }) => (
              <code className="rounded bg-muted px-1 py-0.5 text-[0.9em] font-mono">
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <pre className="rounded-md bg-muted p-3 overflow-x-auto mb-2 text-sm">
                {children}
              </pre>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-primary/30 pl-3 italic text-muted-foreground mb-2">
                {children}
              </blockquote>
            ),
            hr: () => <hr className="my-3 border-border" />,
          }}
        >
          {cleaned}
        </ReactMarkdown>
      </div>
      {/* Gradient fade overlay when content is clamped */}
      {maxLines && (
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none" />
      )}
    </div>
  )
})
