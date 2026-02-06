"use client"

/**
 * Remix Dialog Component
 * @description Modal for remixing posts with AI using user's content style and context
 * @module components/features/remix-dialog
 */

import * as React from "react"
import {
  IconSparkles,
  IconLoader2,
  IconX,
  IconInfoCircle,
  IconCopy,
  IconCheck,
  IconRefresh,
  IconWand,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ScrollArea } from "@/components/ui/scroll-area"

/**
 * Props for RemixDialog
 */
export interface RemixDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback when dialog should close */
  onClose: () => void
  /** Original post content to remix */
  originalContent: string
  /** Original post author (for display) */
  originalAuthor?: string
  /** Callback when content is remixed successfully */
  onRemixed: (content: string) => void
  /** Whether user has an API key configured (for showing warning) */
  hasApiKey?: boolean
}

/**
 * Tone options for post remix
 */
const TONE_OPTIONS = [
  {
    value: 'match-my-style',
    label: 'Match My Style',
    description: 'Analyze your posts and match your voice',
    icon: IconWand,
  },
  {
    value: 'professional',
    label: 'Professional',
    description: 'Authoritative and industry-focused',
  },
  {
    value: 'casual',
    label: 'Casual',
    description: 'Conversational and relatable',
  },
  {
    value: 'inspiring',
    label: 'Inspiring',
    description: 'Motivational and uplifting',
  },
  {
    value: 'educational',
    label: 'Educational',
    description: 'Informative how-to content',
  },
  {
    value: 'thought-provoking',
    label: 'Thought-Provoking',
    description: 'Challenges conventional thinking',
  },
]

/**
 * Length options for post remix
 */
const LENGTH_OPTIONS = [
  {
    value: 'short',
    label: 'Short',
    description: '400-700 chars',
    emoji: '⚡',
  },
  {
    value: 'medium',
    label: 'Medium',
    description: '1200-1800 chars',
    emoji: '📝',
  },
  {
    value: 'long',
    label: 'Long',
    description: '2200-2900 chars',
    emoji: '📚',
  },
]

/**
 * Remix Dialog for transforming posts with AI
 *
 * @example
 * ```tsx
 * const [showRemix, setShowRemix] = useState(false)
 * const [selectedPost, setSelectedPost] = useState('')
 *
 * <RemixDialog
 *   isOpen={showRemix}
 *   onClose={() => setShowRemix(false)}
 *   originalContent={selectedPost}
 *   onRemixed={(content) => {
 *     setMyPost(content)
 *     setShowRemix(false)
 *   }}
 *   apiKey={apiKey}
 * />
 * ```
 */
export function RemixDialog({
  isOpen,
  onClose,
  originalContent,
  originalAuthor,
  onRemixed,
  hasApiKey = true,
}: RemixDialogProps) {
  const [tone, setTone] = React.useState('match-my-style')
  const [length, setLength] = React.useState<'short' | 'medium' | 'long'>('medium')
  const [customInstructions, setCustomInstructions] = React.useState('')
  const [isRemixing, setIsRemixing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [remixedContent, setRemixedContent] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  /**
   * Resets form when dialog opens/closes
   */
  React.useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setCustomInstructions('')
        setError(null)
        setRemixedContent(null)
        setCopied(false)
      }, 300)
    }
  }, [isOpen])

  /**
   * Handles the remix button click
   */
  const handleRemix = async () => {
    if (!originalContent.trim()) {
      setError('No content to remix')
      return
    }

    setIsRemixing(true)
    setError(null)
    setRemixedContent(null)

    try {
      const response = await fetch('/api/ai/remix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          originalContent: originalContent.trim(),
          tone,
          length,
          customInstructions: customInstructions.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remix post')
      }

      setRemixedContent(data.content)
    } catch (err) {
      console.error('Remix error:', err)
      setError(err instanceof Error ? err.message : 'Failed to remix post. Please try again.')
    } finally {
      setIsRemixing(false)
    }
  }

  /**
   * Handles copying remixed content
   */
  const handleCopy = async () => {
    if (!remixedContent) return

    try {
      await navigator.clipboard.writeText(remixedContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = remixedContent
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  /**
   * Handles using the remixed content
   */
  const handleUseContent = () => {
    if (remixedContent) {
      onRemixed(remixedContent)
      onClose()
    }
  }

  /**
   * Handles regenerating with same settings
   */
  const handleRegenerate = () => {
    setRemixedContent(null)
    handleRemix()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconSparkles className="size-5 text-primary" />
            Remix Post with AI
          </DialogTitle>
          <DialogDescription>
            Transform this post into your own authentic voice using AI that understands your
            writing style.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full max-h-[60vh]">
            <div className="space-y-5 py-4 pr-4">
              {/* Original Post Preview */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-muted-foreground text-xs uppercase tracking-wide">
                  Original Post
                  {originalAuthor && (
                    <span className="normal-case text-foreground font-medium">
                      by {originalAuthor}
                    </span>
                  )}
                </Label>
                <div className="bg-muted/50 rounded-lg p-3 text-sm max-h-48 overflow-y-auto border">
                  <p className="whitespace-pre-wrap">{originalContent}</p>
                </div>
              </div>

              {/* Tone Selection */}
              <div className="space-y-2">
                <Label htmlFor="tone" className="flex items-center gap-1.5">
                  Remix Style
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <IconInfoCircle className="size-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        &ldquo;Match My Style&rdquo; analyzes your previous posts to match your unique voice
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Select value={tone} onValueChange={setTone} disabled={isRemixing}>
                  <SelectTrigger id="tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium flex items-center gap-1.5">
                            {option.icon && <option.icon className="size-3.5" />}
                            {option.label}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {option.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Length Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">Post Length</Label>
                <div className="grid grid-cols-3 gap-3">
                  {LENGTH_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setLength(option.value as 'short' | 'medium' | 'long')}
                      disabled={isRemixing}
                      className={cn(
                        'border-input bg-background ring-offset-background flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all',
                        'hover:border-primary hover:bg-accent',
                        'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                        'disabled:pointer-events-none disabled:opacity-50',
                        length === option.value &&
                          'border-primary bg-primary/5 ring-primary ring-1'
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{option.emoji}</span>
                        <span className="font-medium text-sm">{option.label}</span>
                      </div>
                      <span className="text-muted-foreground text-xs">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Instructions */}
              <div className="space-y-2">
                <Label htmlFor="instructions" className="flex items-center gap-1.5">
                  Custom Instructions
                  <span className="text-muted-foreground text-xs">(Optional)</span>
                </Label>
                <Textarea
                  id="instructions"
                  placeholder="e.g., 'Add a personal story about my experience' or 'Focus on the actionable takeaways'"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="min-h-[70px] resize-none"
                  disabled={isRemixing}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border border-destructive/20 p-3 text-sm">
                  <IconX className="mt-0.5 size-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* No API Key Warning */}
              {!hasApiKey && !error && (
                <div className="bg-primary/10 text-primary flex items-start gap-2 rounded-lg border border-primary/20 p-3 text-sm">
                  <IconInfoCircle className="mt-0.5 size-4 shrink-0" />
                  <p>
                    You need to add your OpenAI API key in{' '}
                    <strong>Settings → API Keys</strong> to use AI remix.
                  </p>
                </div>
              )}

              {/* Remixed Content Preview */}
              {remixedContent && (
                <div className="space-y-2">
                  <Label className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-primary">
                      <IconSparkles className="size-3.5" />
                      Remixed Post
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopy}
                        className="h-7 px-2 text-xs"
                      >
                        {copied ? (
                          <>
                            <IconCheck className="size-3.5 mr-1" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <IconCopy className="size-3.5 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRegenerate}
                        disabled={isRemixing}
                        className="h-7 px-2 text-xs"
                      >
                        <IconRefresh className="size-3.5 mr-1" />
                        Regenerate
                      </Button>
                    </div>
                  </Label>
                  <div className="bg-primary/5 rounded-lg p-4 text-sm border border-primary/20 max-h-48 overflow-y-auto">
                    <p className="whitespace-pre-wrap">{remixedContent}</p>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {remixedContent.length} characters
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} disabled={isRemixing}>
            Cancel
          </Button>
          {remixedContent ? (
            <Button onClick={handleUseContent}>
              <IconCheck className="size-4 mr-1" />
              Use This Version
            </Button>
          ) : (
            <Button onClick={handleRemix} disabled={isRemixing || !hasApiKey}>
              {isRemixing ? (
                <>
                  <IconLoader2 className="size-4 animate-spin" />
                  Remixing...
                </>
              ) : (
                <>
                  <IconSparkles className="size-4" />
                  Remix Post
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
