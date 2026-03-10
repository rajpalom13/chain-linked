"use client"

/**
 * Inline Diff View
 * @description Shows a Copilot-style inline diff preview for AI text edits.
 * Displays the original selected text with strikethrough and the AI suggestion
 * highlighted, with Accept/Reject controls.
 * @module components/features/compose/inline-diff-view
 */

import * as React from "react"
import { motion } from "framer-motion"
import { IconCheck, IconX } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface InlineDiffViewProps {
  /** Full post content */
  content: string
  /** Start index of the selection that was edited */
  selectionStart: number
  /** End index of the selection that was edited */
  selectionEnd: number
  /** The AI-suggested replacement text */
  suggestion: string
  /** Called when user accepts the suggestion */
  onAccept: () => void
  /** Called when user rejects the suggestion */
  onReject: () => void
}

/**
 * Renders post content with an inline diff showing the AI suggestion.
 * Original selected text shown with red strikethrough, suggestion shown with green highlight.
 * @param props - Component props
 * @returns Inline diff view JSX element
 */
export function InlineDiffView({
  content,
  selectionStart,
  selectionEnd,
  suggestion,
  onAccept,
  onReject,
}: InlineDiffViewProps) {
  const before = content.slice(0, selectionStart)
  const original = content.slice(selectionStart, selectionEnd)
  const after = content.slice(selectionEnd)

  return (
    <div className="min-h-[120px]">
      {/* Diff content */}
      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
        {/* Text before selection */}
        {before}
        {/* Original text — strikethrough with red tint */}
        <span
          className={cn(
            "bg-red-500/15 text-red-700 dark:text-red-400 line-through",
            "decoration-red-500/50 rounded-sm px-0.5"
          )}
        >
          {original}
        </span>
        {/* Suggested replacement — green tint */}
        <motion.span
          initial={{ opacity: 0, backgroundColor: "oklch(0.85 0.15 150 / 0.3)" }}
          animate={{ opacity: 1, backgroundColor: "oklch(0.85 0.15 150 / 0.15)" }}
          transition={{ duration: 0.4 }}
          className={cn(
            "text-green-700 dark:text-green-400 rounded-sm px-0.5",
            "bg-green-500/15"
          )}
        >
          {suggestion}
        </motion.span>
        {/* Text after selection */}
        {after}
      </div>

      {/* Accept / Reject controls */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50"
      >
        <Button
          size="sm"
          onClick={onAccept}
          className="gap-1.5 h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
        >
          <IconCheck className="size-3.5" />
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onReject}
          className="gap-1.5 h-7 text-xs"
        >
          <IconX className="size-3.5" />
          Reject
        </Button>
        <span className="text-[11px] text-muted-foreground ml-1">
          AI suggestion — review before accepting
        </span>
      </motion.div>
    </div>
  )
}
