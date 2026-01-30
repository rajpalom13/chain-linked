"use client"

/**
 * RemixModal Component
 * @description Modal for AI-powered post remix with tone selection and custom instructions
 * @module components/features/remix-modal
 */

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconLoader2,
  IconRefresh,
  IconCopy,
  IconWand,
  IconSettings,
  IconAlertCircle,
  IconSparkles,
  IconBriefcase,
  IconMessage,
  IconBulb,
  IconBook,
  IconPencil,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { useRemix, isApiKeyMissingError, isApiKeyInvalidError, isRateLimitError } from "@/hooks/use-remix"
import { TONE_OPTIONS, type RemixTone } from "@/lib/ai/remix-prompts"
import { remixToast, dismissToast } from "@/lib/toast-utils"
import { useDraft } from "@/lib/store/draft-context"

/**
 * Props for the RemixModal component
 */
export interface RemixModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback fired when the modal should be closed */
  onClose: () => void
  /** Original post content to remix */
  originalContent: string
  /** Optional author name for attribution */
  authorName?: string
  /** Optional post ID for tracking */
  postId?: string
}

/**
 * Tone option icon mapping
 */
const TONE_ICONS: Record<RemixTone, React.ElementType> = {
  'match-my-style': IconWand,
  professional: IconBriefcase,
  casual: IconMessage,
  inspiring: IconSparkles,
  educational: IconBook,
  'thought-provoking': IconBulb,
}

/**
 * Truncates content to a specified length with ellipsis
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
 * RemixModal provides a dialog for AI-powered post remix with tone selection.
 *
 * Features:
 * - Original post preview (read-only)
 * - Tone selector with 5 options (professional, casual, thought-leader, storyteller, preserve)
 * - Optional custom instructions
 * - AI-generated remix with loading state
 * - Copy to clipboard functionality
 * - Load directly to composer
 * - Error handling with helpful messages
 *
 * @example
 * ```tsx
 * <RemixModal
 *   isOpen={isRemixModalOpen}
 *   onClose={() => setIsRemixModalOpen(false)}
 *   originalContent="Original LinkedIn post content..."
 *   authorName="John Doe"
 * />
 * ```
 */
export function RemixModal({
  isOpen,
  onClose,
  originalContent,
  authorName,
  postId,
}: RemixModalProps) {
  const router = useRouter()
  const { loadForRemix } = useDraft()
  const { isLoading, result, error, remix, reset } = useRemix()

  // Local state
  const [selectedTone, setSelectedTone] = React.useState<RemixTone>('match-my-style')
  const [customInstructions, setCustomInstructions] = React.useState('')
  const [editedContent, setEditedContent] = React.useState('')

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedTone('match-my-style')
      setCustomInstructions('')
      setEditedContent('')
      reset()
    }
  }, [isOpen, reset])

  // Update edited content when result arrives
  React.useEffect(() => {
    if (result?.content) {
      setEditedContent(result.content)
    }
  }, [result?.content])

  /**
   * Handles generating a remix
   */
  const handleGenerate = async () => {
    const loadingToastId = remixToast.generating()

    const remixResult = await remix({
      content: originalContent,
      tone: selectedTone,
      instructions: customInstructions || undefined,
    })

    dismissToast(loadingToastId)

    if (remixResult) {
      remixToast.success()
    }
  }

  /**
   * Handles regenerating with same settings
   */
  const handleRegenerate = () => {
    setEditedContent('')
    handleGenerate()
  }

  /**
   * Copies the remixed content to clipboard
   */
  const handleCopy = async () => {
    if (editedContent) {
      await navigator.clipboard.writeText(editedContent)
      remixToast.copied()
    }
  }

  /**
   * Loads the remixed content into the composer
   */
  const handleUseThis = () => {
    if (editedContent) {
      loadForRemix(postId || 'remix', editedContent, authorName)
      remixToast.loadedToComposer()
      onClose()
      router.push('/dashboard/compose')
    }
  }

  /**
   * Navigates to settings page
   */
  const handleGoToSettings = () => {
    onClose()
    router.push('/dashboard/settings')
  }

  /**
   * Renders error state with appropriate action
   */
  const renderError = () => {
    if (!error) return null

    const isApiKeyError = isApiKeyMissingError(error) || isApiKeyInvalidError(error)
    const isRateLimit = isRateLimitError(error)

    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/5 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <IconAlertCircle className="size-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-destructive">
              {error.message}
            </p>
            {isApiKeyError && (
              <p className="text-xs text-muted-foreground">
                You need an OpenAI API key to use the AI remix feature.
              </p>
            )}
            {isRateLimit && (
              <p className="text-xs text-muted-foreground">
                Please wait a moment before trying again.
              </p>
            )}
          </div>
        </div>
        {isApiKeyError && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoToSettings}
            className="w-full"
          >
            <IconSettings className="size-4" />
            Go to Settings
          </Button>
        )}
        {isRateLimit && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            className="w-full"
          >
            <IconRefresh className="size-4" />
            Try Again
          </Button>
        )}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconWand className="size-5 text-primary" />
            AI Remix Post
          </DialogTitle>
          <DialogDescription>
            Transform this post with AI while keeping the core message intact.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Original Post Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">
              Original Post
            </Label>
            <div className="rounded-md border bg-muted/30 p-3 space-y-2 max-h-32 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">
                {truncateContent(originalContent, 500)}
              </p>
              {authorName && (
                <p className="text-xs text-muted-foreground">
                  By {authorName}
                </p>
              )}
            </div>
          </div>

          {/* Tone Selector */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Select Tone</Label>
            <div className="grid grid-cols-1 gap-2">
              {TONE_OPTIONS.map((tone) => {
                const Icon = TONE_ICONS[tone.id]
                const isSelected = selectedTone === tone.id

                return (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => setSelectedTone(tone.id)}
                    disabled={isLoading}
                    className={cn(
                      "flex items-start gap-3 rounded-md border p-3 text-left transition-all",
                      "hover:bg-accent hover:border-accent-foreground/20",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      isSelected && "border-primary bg-primary/5 ring-1 ring-primary"
                    )}
                    aria-pressed={isSelected}
                  >
                    <div className={cn(
                      "rounded-full p-2 transition-colors",
                      isSelected ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Icon className={cn(
                        "size-4",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "text-sm font-medium",
                        isSelected && "text-primary"
                      )}>
                        {tone.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tone.description}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="space-y-2">
            <Label htmlFor="custom-instructions" className="text-sm font-medium">
              Custom Instructions (Optional)
            </Label>
            <textarea
              id="custom-instructions"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g., Focus on the leadership angle, add a question at the end..."
              disabled={isLoading}
              className={cn(
                "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                "ring-offset-background placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "min-h-[80px] resize-none"
              )}
            />
            <p className="text-xs text-muted-foreground">
              Add specific instructions to customize how the AI rewrites the post.
            </p>
          </div>

          {/* Error State */}
          {error && renderError()}

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3 rounded-md border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <IconLoader2 className="size-4 animate-spin" />
                Generating your remix...
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          )}

          {/* Result */}
          {result && !isLoading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <IconSparkles className="size-4 text-amber-500" />
                  AI-Generated Remix
                </Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-8"
                  >
                    <IconCopy className="size-4" />
                    Copy
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerate}
                    className="h-8"
                  >
                    <IconRefresh className="size-4" />
                    Regenerate
                  </Button>
                </div>
              </div>
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className={cn(
                  "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
                  "ring-offset-background placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "min-h-[200px] resize-y"
                )}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {editedContent.length} characters
                </span>
                <span>
                  Tokens used: {result.metadata.tokensUsed}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {result && !isLoading ? (
            <Button onClick={handleUseThis} disabled={!editedContent}>
              <IconWand className="size-4" />
              Use This
            </Button>
          ) : (
            <Button onClick={handleGenerate} disabled={isLoading}>
              {isLoading ? (
                <>
                  <IconLoader2 className="size-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <IconSparkles className="size-4" />
                  Generate Remix
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
