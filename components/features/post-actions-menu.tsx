"use client"

/**
 * Post Actions Menu Component
 * @description Actions menu for composed posts (copy, open LinkedIn)
 * @module components/features/post-actions-menu
 */

import * as React from "react"
import {
  IconCopy,
  IconCheck,
  IconBrandLinkedin,
  IconExternalLink,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { postToast, showSuccess } from "@/lib/toast-utils"

/**
 * Props for PostActionsMenu
 */
export interface PostActionsMenuProps {
  /** Post content to copy */
  content: string
  /** Button variant */
  variant?: "default" | "outline" | "ghost"
  /** Button size */
  size?: "default" | "sm" | "lg"
  /** Custom button text */
  buttonText?: string
}

/**
 * Post Actions Menu with copy and LinkedIn shortcuts
 *
 * @example
 * ```tsx
 * <PostActionsMenu
 *   content={postContent}
 *   variant="outline"
 *   buttonText="Share Options"
 * />
 * ```
 */
export function PostActionsMenu({
  content,
  variant = "outline",
  size = "default",
  buttonText,
}: PostActionsMenuProps) {
  const [copied, setCopied] = React.useState(false)

  /**
   * Copies content to clipboard
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      showSuccess("Post copied to clipboard!")

      // Reset after 2 seconds
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
      postToast.failed("Failed to copy to clipboard")
    }
  }

  /**
   * Opens LinkedIn in new tab with post intent
   * Note: LinkedIn doesn't support pre-filled text via URL params
   * User will need to paste manually
   */
  const handleOpenLinkedIn = () => {
    // Copy to clipboard first
    handleCopy()

    // Open LinkedIn feed in new tab
    window.open("https://www.linkedin.com/feed/", "_blank")

    // Show helpful toast
    showSuccess("LinkedIn opened! Paste your post (Ctrl+V)")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          {buttonText || (
            <>
              <IconBrandLinkedin className="size-4" />
              Quick Actions
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleCopy}>
          {copied ? (
            <IconCheck className="mr-2 size-4 text-green-500" />
          ) : (
            <IconCopy className="mr-2 size-4" />
          )}
          <span>{copied ? "Copied!" : "Copy to Clipboard"}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleOpenLinkedIn}>
          <IconExternalLink className="mr-2 size-4" />
          <div className="flex flex-col">
            <span>Copy & Open LinkedIn</span>
            <span className="text-muted-foreground text-xs">
              Opens LinkedIn, text copied
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
