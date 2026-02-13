"use client"

/**
 * AI Generation Dialog Component
 * @description Modal for configuring and generating LinkedIn posts with AI,
 * including post type selection for type-specific prompt templates.
 * @module components/features/ai-generation-dialog
 */

import * as React from "react"
import {
  IconSparkles,
  IconLoader2,
  IconX,
  IconInfoCircle,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { type PostTypeId, getPostType } from "@/lib/ai/post-types"
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
import { PostTypeSelector } from "./post-type-selector"

/**
 * Props for AIGenerationDialog
 */
export interface AIGenerationDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback when dialog should close */
  onClose: () => void
  /** Callback when content is generated successfully */
  onGenerated: (content: string) => void
  /** Whether the user has an API key configured (server-side or user-provided) */
  hasApiKey?: boolean
  /** Default post type pre-selected from the composer */
  defaultPostType?: PostTypeId
}

/**
 * Tone options for post generation
 */
const TONE_OPTIONS = [
  {
    value: 'match-my-style',
    label: 'Match My Style',
    description: 'Writes like you, based on your past posts',
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
 * Length options for post generation
 */
const LENGTH_OPTIONS = [
  {
    value: 'short',
    label: 'Short',
    description: '400-700 characters',
    emoji: '⚡',
  },
  {
    value: 'medium',
    label: 'Medium',
    description: '1200-1800 characters',
    emoji: '📝',
  },
  {
    value: 'long',
    label: 'Long',
    description: '2200-2900 characters',
    emoji: '📚',
  },
]

/**
 * AI Generation Dialog for creating LinkedIn posts with post type awareness.
 *
 * When a post type is selected, the dialog sends it to the API so the backend
 * can use a type-specific system prompt for higher-quality output.
 *
 * @param props - Component props
 * @param props.isOpen - Whether the dialog is open
 * @param props.onClose - Callback when dialog should close
 * @param props.onGenerated - Callback when content is generated
 * @param props.hasApiKey - Whether a valid API key exists
 * @param props.defaultPostType - Pre-selected post type from the composer
 *
 * @example
 * ```tsx
 * <AIGenerationDialog
 *   isOpen={showDialog}
 *   onClose={() => setShowDialog(false)}
 *   onGenerated={(content) => setPostContent(content)}
 *   hasApiKey={true}
 *   defaultPostType="story"
 * />
 * ```
 */
export function AIGenerationDialog({
  isOpen,
  onClose,
  onGenerated,
  hasApiKey,
  defaultPostType,
}: AIGenerationDialogProps) {
  const [topic, setTopic] = React.useState('')
  const [tone, setTone] = React.useState('professional')
  const [length, setLength] = React.useState<'short' | 'medium' | 'long'>('medium')
  const [context, setContext] = React.useState('')
  const [postType, setPostType] = React.useState<PostTypeId | undefined>(defaultPostType)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [errorHelpUrl, setErrorHelpUrl] = React.useState<string | null>(null)

  /**
   * Sync the default post type from the parent composer when the dialog opens
   */
  React.useEffect(() => {
    if (isOpen && defaultPostType) {
      setPostType(defaultPostType)
    }
  }, [isOpen, defaultPostType])

  /**
   * Resets form when dialog closes
   */
  React.useEffect(() => {
    if (!isOpen) {
      // Reset form after animation completes
      setTimeout(() => {
        setTopic('')
        setContext('')
        setError(null)
        setErrorHelpUrl(null)
      }, 300)
    }
  }, [isOpen])

  /** The currently resolved post type definition, if any */
  const selectedPostTypeDef = postType ? getPostType(postType) : undefined

  /**
   * Handles the generate button click
   */
  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic for your post')
      return
    }

    if (!hasApiKey) {
      setError('OpenAI API key is required. Please add it in Settings.')
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic.trim(),
          tone,
          length,
          context: context.trim() || undefined,
          postType: postType || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.helpUrl) {
          setErrorHelpUrl(data.helpUrl)
        }
        throw new Error(data.error || 'Failed to generate post')
      }

      onGenerated(data.content)
      onClose()
    } catch (err) {
      console.error('Generation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate post. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconSparkles className="size-5 text-primary" />
            Generate Post with AI
          </DialogTitle>
          <DialogDescription>
            Describe what you want to write about, and AI will create a compelling LinkedIn
            post for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Post Type Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              Post Type
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconInfoCircle className="size-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Select a post type to guide the AI toward a specific content format and structure
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <PostTypeSelector
              value={postType}
              onChange={setPostType}
              disabled={isGenerating}
            />
            {selectedPostTypeDef && (
              <p className="text-xs text-muted-foreground pl-1">
                {selectedPostTypeDef.description} — {selectedPostTypeDef.exampleHook}
              </p>
            )}
          </div>

          {/* Topic Input */}
          <div className="space-y-2">
            <Label htmlFor="topic" className="flex items-center gap-1.5">
              Topic or Main Idea
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="topic"
              placeholder="e.g., 'The importance of work-life balance in tech' or '5 lessons from my first year as a founder'"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="min-h-[80px] resize-none"
              disabled={isGenerating}
            />
          </div>

          {/* Tone Selection */}
          <div className="space-y-2">
            <Label htmlFor="tone" className="flex items-center gap-1.5">
              Tone & Style
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconInfoCircle className="size-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Choose the writing style that best fits your message and audience
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Select value={tone} onValueChange={setTone} disabled={isGenerating}>
              <SelectTrigger id="tone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{option.label}</span>
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
            <Label className="flex items-center gap-1.5">
              Post Length
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <IconInfoCircle className="size-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Longer posts work better for storytelling and detailed insights
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <div className="grid grid-cols-3 gap-3">
              {LENGTH_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setLength(option.value as 'short' | 'medium' | 'long')}
                  disabled={isGenerating}
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

          {/* Additional Context (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="context" className="flex items-center gap-1.5">
              Additional Context
              <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <Textarea
              id="context"
              placeholder="e.g., 'Include statistics about remote work adoption' or 'Mention my experience at TechCorp'"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="min-h-[80px] resize-none"
              disabled={isGenerating}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-destructive/10 text-destructive flex flex-col gap-2 rounded-lg border border-destructive/20 p-3 text-sm">
              <div className="flex items-start gap-2">
                <IconX className="mt-0.5 size-4 shrink-0" />
                <p>{error}</p>
              </div>
              {errorHelpUrl && (
                <a
                  href={errorHelpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-6 text-primary underline hover:no-underline"
                >
                  Go to OpenAI Billing →
                </a>
              )}
            </div>
          )}

          {/* Info Banner */}
          {!hasApiKey && (
            <div className="bg-primary/10 text-primary flex items-start gap-2 rounded-lg border border-primary/20 p-3 text-sm">
              <IconInfoCircle className="mt-0.5 size-4 shrink-0" />
              <p>
                You need to add your OpenAI API key in{' '}
                <strong>Settings → API Keys</strong> to use AI generation.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || !hasApiKey}>
            {isGenerating ? (
              <>
                <IconLoader2 className="size-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <IconSparkles className="size-4" />
                Generate Post
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
