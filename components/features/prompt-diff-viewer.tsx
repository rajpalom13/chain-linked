/**
 * Prompt Diff Viewer Component
 * @description Side-by-side comparison of two prompt versions with line-level highlighting
 * @module components/features/prompt-diff-viewer
 */

"use client"

import * as React from "react"
import type { PromptVersion } from "@/lib/prompts/prompt-types"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import {
  IconGitCompare,
  IconPlus,
  IconMinus,
  IconArrowsExchange,
  IconCopy,
  IconCheck,
} from "@tabler/icons-react"
import { toast } from "sonner"

/**
 * Props for PromptDiffViewer component
 */
interface PromptDiffViewerProps {
  /** First version (typically older) */
  version1: PromptVersion
  /** Second version (typically newer) */
  version2: PromptVersion
  /** Optional additional class name */
  className?: string
  /** Callback to close the diff viewer */
  onClose?: () => void
}

/**
 * Line diff result
 */
interface LineDiff {
  type: "unchanged" | "added" | "removed" | "modified"
  lineNumber1?: number
  lineNumber2?: number
  content1?: string
  content2?: string
}

/**
 * Compute a simple line-by-line diff between two strings
 * Uses a basic LCS-like approach for visualization
 * @param content1 - First content string
 * @param content2 - Second content string
 * @returns Array of line diffs
 */
function computeLineDiff(content1: string, content2: string): LineDiff[] {
  const lines1 = content1.split("\n")
  const lines2 = content2.split("\n")
  const diffs: LineDiff[] = []

  // Create sets for quick lookup
  const set1 = new Set(lines1)
  const set2 = new Set(lines2)

  const maxLines = Math.max(lines1.length, lines2.length)
  let idx1 = 0
  let idx2 = 0

  while (idx1 < lines1.length || idx2 < lines2.length) {
    const line1 = lines1[idx1]
    const line2 = lines2[idx2]

    if (idx1 >= lines1.length) {
      // Line only in version 2 (added)
      diffs.push({
        type: "added",
        lineNumber2: idx2 + 1,
        content2: line2,
      })
      idx2++
    } else if (idx2 >= lines2.length) {
      // Line only in version 1 (removed)
      diffs.push({
        type: "removed",
        lineNumber1: idx1 + 1,
        content1: line1,
      })
      idx1++
    } else if (line1 === line2) {
      // Lines are the same
      diffs.push({
        type: "unchanged",
        lineNumber1: idx1 + 1,
        lineNumber2: idx2 + 1,
        content1: line1,
        content2: line2,
      })
      idx1++
      idx2++
    } else {
      // Lines are different
      // Check if line1 exists later in lines2 (it was moved/added before)
      const line1InLater2 = lines2.slice(idx2 + 1).includes(line1)
      // Check if line2 exists later in lines1 (it was moved/removed before)
      const line2InLater1 = lines1.slice(idx1 + 1).includes(line2)

      if (line1InLater2 && !line2InLater1) {
        // line2 was added
        diffs.push({
          type: "added",
          lineNumber2: idx2 + 1,
          content2: line2,
        })
        idx2++
      } else if (line2InLater1 && !line1InLater2) {
        // line1 was removed
        diffs.push({
          type: "removed",
          lineNumber1: idx1 + 1,
          content1: line1,
        })
        idx1++
      } else {
        // Lines are modified at the same position
        diffs.push({
          type: "modified",
          lineNumber1: idx1 + 1,
          lineNumber2: idx2 + 1,
          content1: line1,
          content2: line2,
        })
        idx1++
        idx2++
      }
    }
  }

  return diffs
}

/**
 * Diff statistics
 */
interface DiffStats {
  added: number
  removed: number
  modified: number
  unchanged: number
}

/**
 * Calculate diff statistics
 */
function getDiffStats(diffs: LineDiff[]): DiffStats {
  return diffs.reduce(
    (acc, diff) => {
      acc[diff.type]++
      return acc
    },
    { added: 0, removed: 0, modified: 0, unchanged: 0 }
  )
}

/**
 * Version header with metadata
 */
function VersionHeader({
  version,
  label,
  onCopy,
  copied,
}: {
  version: PromptVersion
  label: string
  onCopy: () => void
  copied: boolean
}) {
  return (
    <div className="flex items-center justify-between p-3 border-b bg-muted/30">
      <div className="flex items-center gap-2">
        <Badge variant="outline">{label}</Badge>
        <Badge variant="secondary">v{version.version}</Badge>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">
          {format(new Date(version.createdAt), "MMM d, yyyy 'at' h:mm a")}
        </span>
        <Button variant="ghost" size="sm" onClick={onCopy} className="h-7 px-2">
          {copied ? (
            <IconCheck className="size-3.5 text-green-500" />
          ) : (
            <IconCopy className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  )
}

/**
 * Unified diff view line
 */
function DiffLine({
  diff,
  showVersion1,
}: {
  diff: LineDiff
  showVersion1: boolean
}) {
  const content = showVersion1 ? diff.content1 : diff.content2
  const lineNumber = showVersion1 ? diff.lineNumber1 : diff.lineNumber2

  // Determine styling based on diff type and which version we're showing
  let bgClass = ""
  let textClass = ""
  let icon = null

  if (diff.type === "added") {
    if (!showVersion1) {
      bgClass = "bg-green-500/10"
      textClass = "text-green-700 dark:text-green-400"
      icon = <IconPlus className="size-3.5" />
    } else {
      // Empty line in version 1 where version 2 has an addition
      return (
        <div className="flex items-start min-h-[1.625rem] bg-muted/20">
          <span className="w-10 px-2 text-xs text-muted-foreground/50 border-r shrink-0 text-right">
            -
          </span>
          <span className="px-2 text-muted-foreground/30 text-sm italic">
            (line added in newer version)
          </span>
        </div>
      )
    }
  } else if (diff.type === "removed") {
    if (showVersion1) {
      bgClass = "bg-red-500/10"
      textClass = "text-red-700 dark:text-red-400"
      icon = <IconMinus className="size-3.5" />
    } else {
      // Empty line in version 2 where version 1 had content
      return (
        <div className="flex items-start min-h-[1.625rem] bg-muted/20">
          <span className="w-10 px-2 text-xs text-muted-foreground/50 border-r shrink-0 text-right">
            -
          </span>
          <span className="px-2 text-muted-foreground/30 text-sm italic">
            (line removed in newer version)
          </span>
        </div>
      )
    }
  } else if (diff.type === "modified") {
    bgClass = "bg-yellow-500/10"
    textClass = "text-yellow-700 dark:text-yellow-400"
    icon = <IconArrowsExchange className="size-3.5" />
  }

  return (
    <div className={cn("flex items-start min-h-[1.625rem]", bgClass)}>
      <span
        className={cn(
          "w-10 px-2 text-xs text-muted-foreground border-r shrink-0 text-right",
          diff.type !== "unchanged" && textClass
        )}
      >
        {lineNumber ?? "-"}
      </span>
      <div className={cn("flex-1 px-2 text-sm font-mono whitespace-pre-wrap break-all", textClass)}>
        {content || " "}
      </div>
      {icon && (
        <span className={cn("px-2 shrink-0", textClass)}>{icon}</span>
      )}
    </div>
  )
}

/**
 * Prompt Diff Viewer Component
 * @description Shows side-by-side comparison of two prompt versions with highlighted differences
 * @param props - Component props
 * @param props.version1 - First version to compare (typically older)
 * @param props.version2 - Second version to compare (typically newer)
 * @param props.className - Optional additional class name
 * @param props.onClose - Optional callback to close the viewer
 * @returns Side-by-side diff viewer component
 * @example
 * ```tsx
 * <PromptDiffViewer
 *   version1={olderVersion}
 *   version2={newerVersion}
 *   onClose={() => setShowDiff(false)}
 * />
 * ```
 */
export function PromptDiffViewer({
  version1,
  version2,
  className,
  onClose,
}: PromptDiffViewerProps) {
  const [copied1, setCopied1] = React.useState(false)
  const [copied2, setCopied2] = React.useState(false)

  // Ensure version1 is always the older one
  const [older, newer] = React.useMemo(() => {
    return version1.version < version2.version
      ? [version1, version2]
      : [version2, version1]
  }, [version1, version2])

  // Compute line diffs
  const diffs = React.useMemo(() => {
    return computeLineDiff(older.content, newer.content)
  }, [older.content, newer.content])

  // Get statistics
  const stats = React.useMemo(() => getDiffStats(diffs), [diffs])

  /**
   * Copy content to clipboard
   */
  const handleCopy = React.useCallback(
    async (content: string, setVersion: (copied: boolean) => void) => {
      try {
        await navigator.clipboard.writeText(content)
        setVersion(true)
        toast.success("Copied to clipboard")
        setTimeout(() => setVersion(false), 2000)
      } catch {
        toast.error("Failed to copy to clipboard")
      }
    },
    []
  )

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      {/* Header with stats */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <IconGitCompare className="size-5 text-muted-foreground" />
          <h3 className="font-semibold">
            Comparing v{older.version} with v{newer.version}
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-sm">
            {stats.added > 0 && (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <IconPlus className="size-4" />
                {stats.added} added
              </span>
            )}
            {stats.removed > 0 && (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <IconMinus className="size-4" />
                {stats.removed} removed
              </span>
            )}
            {stats.modified > 0 && (
              <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                <IconArrowsExchange className="size-4" />
                {stats.modified} modified
              </span>
            )}
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Change notes comparison */}
      {(older.changeNotes || newer.changeNotes) && (
        <div className="grid grid-cols-2 divide-x border-b">
          <div className="p-3">
            {older.changeNotes && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Notes:</span> {older.changeNotes}
              </p>
            )}
          </div>
          <div className="p-3">
            {newer.changeNotes && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Notes:</span> {newer.changeNotes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Side-by-side diff */}
      <div className="grid grid-cols-2 divide-x">
        {/* Version 1 (older) */}
        <div className="flex flex-col">
          <VersionHeader
            version={older}
            label="Older"
            onCopy={() => handleCopy(older.content, setCopied1)}
            copied={copied1}
          />
          <ScrollArea className="h-[400px]">
            <div className="divide-y">
              {diffs.map((diff, index) => (
                <DiffLine key={index} diff={diff} showVersion1={true} />
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Version 2 (newer) */}
        <div className="flex flex-col">
          <VersionHeader
            version={newer}
            label="Newer"
            onCopy={() => handleCopy(newer.content, setCopied2)}
            copied={copied2}
          />
          <ScrollArea className="h-[400px]">
            <div className="divide-y">
              {diffs.map((diff, index) => (
                <DiffLine key={index} diff={diff} showVersion1={false} />
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 p-3 border-t bg-muted/30 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-green-500/20" /> Added
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-red-500/20" /> Removed
        </span>
        <span className="flex items-center gap-1">
          <span className="size-3 rounded bg-yellow-500/20" /> Modified
        </span>
      </div>
    </div>
  )
}
