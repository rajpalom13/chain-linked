"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  IconAlertTriangle,
  IconBold,
  IconBrandLinkedin,
  IconCalendar,
  IconCheck,
  IconClipboardCopy,
  IconFile,
  IconHash,
  IconItalic,
  IconList,
  IconLoader2,
  IconMessageCircle,
  IconMoodSmile,
  IconPencil,
  IconPhoto,
  IconRepeat,
  IconSend,
  IconThumbUp,
  IconWorld,
  IconX,
} from "@tabler/icons-react"

import { trackPostCreated, trackPostScheduled, trackFeatureUsed } from "@/lib/analytics"
import { cn } from "@/lib/utils"
import { type PostTypeId } from "@/lib/ai/post-types"
import { type GoalCategory, GOAL_LABELS } from "@/lib/ai/post-types"
import { type UnicodeFontStyle, transformSelection, convertMarkdownToUnicode } from "@/lib/unicode-fonts"
import { useDraft } from "@/lib/store/draft-context"
import { toast } from "sonner"
import { postToast, showSuccess } from "@/lib/toast-utils"
import { useAutoSave, formatLastSaved } from "@/hooks/use-auto-save"
import { fadeSlideUpVariants } from "@/lib/animations"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { EmojiPicker } from "./emoji-picker"
import { type MediaFile } from "./media-upload"
import { ScheduleModal } from "./schedule-modal"
import { AIGenerationDialog } from "./ai-generation-dialog"
import { AIInlinePanel, type GenerationContext } from "./ai-inline-panel"
import { PostActionsMenu } from "./post-actions-menu"
import { PostGoalSelector } from "./post-goal-selector"
import { FontPicker } from "./font-picker"
import { LinkedInStatusBadge } from "./linkedin-status-badge"
import { usePostingConfig } from "@/hooks/use-posting-config"

/**
 * Props for the PostComposer component
 */
export interface PostComposerProps {
  /** Initial content to populate the editor with */
  initialContent?: string
  /** Callback fired when the "Post Now" button is clicked */
  onPost?: (content: string) => Promise<unknown>
  /** Callback fired when the "Schedule" button is clicked (after modal confirms) */
  onSchedule?: (content: string) => void
  /** Callback fired when schedule is confirmed with date - used to save to database */
  onScheduleConfirm?: (content: string, scheduledFor: Date, timezone: string) => Promise<void>
  /** Maximum character limit for the post (defaults to 3000 for LinkedIn) */
  maxLength?: number
  /** User profile information for the preview */
  userProfile?: {
    name: string
    headline: string
    avatarUrl?: string
  }
  /** Callback fired when AI generates a post, providing the generation context */
  onGenerationContext?: (ctx: GenerationContext) => void
}

/** Default LinkedIn character limit */
const DEFAULT_MAX_LENGTH = 3000

/** Default user profile for preview */
const DEFAULT_USER_PROFILE = {
  name: "Your Name",
  headline: "Your Professional Headline",
  avatarUrl: undefined,
}

/**
 * Parses text for preview rendering.
 * Since bold/italic are now Unicode characters (rendered natively),
 * this only handles: - list items, #hashtags, and line breaks.
 * @param text - The raw text content to parse
 * @returns Parsed text with HTML elements
 */
function parseMarkdownLikeSyntax(text: string): React.ReactNode[] {
  if (!text) return []

  const lines = text.split("\n")
  const elements: React.ReactNode[] = []

  lines.forEach((line, lineIndex) => {
    // Parse hashtags within a line
    const parseInlineFormatting = (content: string): React.ReactNode[] => {
      const parts: React.ReactNode[] = []
      let remaining = content
      let keyIndex = 0

      while (remaining.length > 0) {
        const hashtagMatch = remaining.match(/#(\w+)/)

        if (!hashtagMatch) {
          if (remaining) parts.push(remaining)
          break
        }

        const index = hashtagMatch.index!
        if (index > 0) {
          parts.push(remaining.slice(0, index))
        }

        parts.push(
          <span
            key={`hashtag-${lineIndex}-${keyIndex++}`}
            className="text-primary font-medium"
          >
            #{hashtagMatch[1]}
          </span>
        )
        remaining = remaining.slice(index + hashtagMatch[0].length)
      }

      return parts
    }

    // Check if line is a list item
    if (line.trim().startsWith("- ")) {
      const content = line.trim().slice(2)
      elements.push(
        <div key={`line-${lineIndex}`} className="flex items-start gap-2">
          <span className="text-muted-foreground mt-1.5">*</span>
          <span>{parseInlineFormatting(content)}</span>
        </div>
      )
    } else if (line.trim() === "") {
      elements.push(<br key={`line-${lineIndex}`} />)
    } else {
      elements.push(
        <p key={`line-${lineIndex}`} className="mb-2">
          {parseInlineFormatting(line)}
        </p>
      )
    }
  })

  return elements
}

/**
 * Extracts hashtags from text content
 * @param text - The text to extract hashtags from
 * @returns Array of unique hashtags without the # symbol
 */
function extractHashtags(text: string): string[] {
  const matches = text.match(/#(\w+)/g)
  if (!matches) return []
  return [...new Set(matches.map((tag) => tag.slice(1)))]
}

/**
 * A rich text editor for composing LinkedIn posts with AI generation and live preview.
 *
 * Features:
 * - Two-column layout: left = AI generation, right = editable LinkedIn preview
 * - Double-click preview to enter inline edit mode with formatting toolbar
 * - Goal-based post type selection (Tell a Story, Teach, Engage, Visual)
 * - Always-expanded AI generation panel with tone and length controls
 * - Unicode font picker for LinkedIn-compatible text styling
 * - Rich text formatting via markdown-like syntax (bold, italic, lists)
 * - Real-time character counter with code-point-aware LinkedIn limit
 * - Emoji picker, media attachments, scheduling
 * - Framer Motion animations throughout
 *
 * @example
 * ```tsx
 * <PostComposer
 *   onPost={async (content) => await publishToLinkedIn(content)}
 *   onSchedule={(content) => openScheduleDialog(content)}
 * />
 * ```
 */
export function PostComposer({
  initialContent = "",
  onPost,
  onSchedule,
  onScheduleConfirm,
  maxLength = DEFAULT_MAX_LENGTH,
  userProfile = DEFAULT_USER_PROFILE,
  onGenerationContext,
}: PostComposerProps) {
  const router = useRouter()
  const { isPostingEnabled, disabledMessage } = usePostingConfig()
  const { draft, setContent: setDraftContent, setScheduledFor, clearDraft } = useDraft()

  // Initialize content from draft context if available, otherwise use initialContent
  const [content, setContent] = React.useState(() => draft.content || initialContent)
  const [isPosting, setIsPosting] = React.useState(false)
  const [isScheduling, setIsScheduling] = React.useState(false)
  const [showScheduleModal, setShowScheduleModal] = React.useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false)
  const [showAIDialog, setShowAIDialog] = React.useState(false)
  const [isEditing, setIsEditing] = React.useState(false)
  const [mediaFiles, setMediaFiles] = React.useState<MediaFile[]>([])
  const [hasApiKey, setHasApiKey] = React.useState<boolean>(false)
  const [selectedGoal, setSelectedGoal] = React.useState<GoalCategory | undefined>(undefined)
  const [selectedFormat, setSelectedFormat] = React.useState<PostTypeId | undefined>(undefined)
  const [activeFontStyle, setActiveFontStyle] = React.useState<UnicodeFontStyle>('normal')
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const editingZoneRef = React.useRef<HTMLDivElement>(null)
  const cursorPositionRef = React.useRef({ start: 0, end: 0 })

  // Auto-save status indicator
  const { isSaving, lastSaved } = useAutoSave(content, 1500)

  // Click-outside detection for edit mode
  React.useEffect(() => {
    if (!isEditing) return

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement
      // Don't exit if clicking inside any Radix popover/portal (FontPicker, EmojiPicker)
      if (
        target.closest('[data-radix-popper-content-wrapper]') ||
        target.closest('[data-radix-menu-content]') ||
        target.closest('[role="dialog"]')
      ) return
      if (editingZoneRef.current && !editingZoneRef.current.contains(target)) {
        setIsEditing(false)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      // Don't close edit mode if a popover/dialog is open — let it handle Escape first
      if (e.key === 'Escape') {
        const hasOpenPopover = document.querySelector(
          '[data-radix-popper-content-wrapper], [data-radix-menu-content], [role="dialog"][data-state="open"]'
        )
        if (hasOpenPopover) return
        setIsEditing(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isEditing])

  // Auto-resize textarea when in edit mode
  React.useEffect(() => {
    if (!isEditing) return
    const textarea = textareaRef.current
    if (!textarea) return

    function resize() {
      if (!textarea) return
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }

    resize()
    textarea.addEventListener('input', resize)
    return () => {
      textarea.removeEventListener('input', resize)
    }
  }, [isEditing, content])

  // Focus textarea when entering edit mode
  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isEditing])

  // Sync content with draft context (when loaded from template or remix)
  // We intentionally exclude 'content' from deps to prevent infinite loops
  React.useEffect(() => {
    if (draft.content && draft.content !== content) {
      setContent(draft.content)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.content])

  // Fetch user's OpenAI API key status for AI generation
  React.useEffect(() => {
    let cancelled = false
    async function fetchApiKeyStatus() {
      try {
        const response = await fetch('/api/settings/api-keys')
        if (cancelled) return
        if (response.ok) {
          const data = await response.json()
          if (!cancelled) {
            setHasApiKey(data.hasKey === true)
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch API key status:', error)
        }
      }
    }
    fetchApiKeyStatus()
    return () => { cancelled = true }
  }, [])

  /**
   * Saves the current textarea cursor position to cursorPositionRef.
   * Called on select/click/keyup so we always have the latest position,
   * even after focus moves to a popover.
   */
  const saveCursorPosition = () => {
    const textarea = textareaRef.current
    if (textarea) {
      cursorPositionRef.current = {
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
      }
    }
  }

  // Update draft when content changes
  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    setDraftContent(newContent)
  }

  // Code-point-aware character counting for accurate LinkedIn limits
  const characterCount = [...content].length
  const isOverLimit = characterCount > maxLength
  const hashtags = extractHashtags(content)
  const characterPercentage = Math.min((characterCount / maxLength) * 100, 100)

  /**
   * Applies a Unicode font style to the selected text, or sets it for future typing.
   * Uses cursorPositionRef so it works reliably even if focus has shifted.
   */
  const applyUnicodeFont = (style: UnicodeFontStyle) => {
    const { start, end } = cursorPositionRef.current
    if (start === end) {
      // No selection — set for future typing
      setActiveFontStyle(style)
      return
    }

    const result = transformSelection(content, start, end, style)
    handleContentChange(result.text)
    setActiveFontStyle(style)
    cursorPositionRef.current = { start, end: result.newEnd }

    setTimeout(() => {
      const textarea = textareaRef.current
      if (textarea) {
        textarea.focus()
        textarea.setSelectionRange(start, result.newEnd)
      }
    }, 0)
  }

  /**
   * Handles the Post Now / Save as Draft button click
   */
  const handlePost = async () => {
    if (!onPost || isOverLimit || !content.trim()) return

    setIsPosting(true)
    try {
      const result = await onPost(content)
      // Handle draft response when posting is disabled
      if (result && typeof result === 'object' && 'draft' in result && (result as { draft?: boolean }).draft) {
        toast.info("Saved as draft", {
          description: (result as { message?: string }).message || disabledMessage,
        })
        clearDraft()
        setContent("")
      } else {
        trackPostCreated("text", "manual")
        clearDraft()
        setContent("")
        postToast.published()
      }
    } catch (error) {
      console.error("Failed to post:", error)
      postToast.failed(error instanceof Error ? error.message : undefined)
    } finally {
      setIsPosting(false)
    }
  }

  /**
   * Copies content to clipboard and shows a toast with an "Open LinkedIn" action button
   */
  const handleCopyToLinkedIn = async () => {
    if (!content.trim()) return

    try {
      await navigator.clipboard.writeText(content)
      toast.success("Content copied!", {
        description: "Paste it into a new LinkedIn post.",
        action: {
          label: "Open LinkedIn",
          onClick: () => {
            window.open("https://www.linkedin.com/feed/", "_blank", "noopener,noreferrer")
          },
        },
        duration: 6000,
      })
    } catch {
      toast.error("Failed to copy", {
        description: "Please select the text and copy manually.",
      })
    }
  }

  /**
   * Opens the schedule modal
   */
  const handleScheduleClick = () => {
    if (isOverLimit || !content.trim()) return
    setShowScheduleModal(true)
  }

  /**
   * Handles the schedule confirmation from the modal
   */
  const handleScheduleConfirm = async (scheduledFor: Date, timezone: string) => {
    setIsScheduling(true)
    try {
      if (onScheduleConfirm) {
        await onScheduleConfirm(content, scheduledFor, timezone)
      }

      trackPostScheduled(scheduledFor.toISOString())
      setScheduledFor(scheduledFor)

      if (onSchedule) {
        onSchedule(content)
      }

      setShowScheduleModal(false)
      const formattedDate = scheduledFor.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
      postToast.scheduled(formattedDate)

      clearDraft()
      setContent("")
      router.push("/dashboard/schedule")
    } catch (error) {
      console.error("Failed to schedule post:", error)
      postToast.failed(error instanceof Error ? error.message : "Failed to schedule post")
    } finally {
      setIsScheduling(false)
    }
  }

  /**
   * Inserts formatting syntax at the saved cursor position.
   * Uses cursorPositionRef so it works even when focus has moved to a popover.
   * @param prefix - The prefix to insert (e.g., "**" for bold)
   * @param suffix - The suffix to insert (e.g., "**" for bold)
   */
  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    const { start, end } = cursorPositionRef.current
    const clampedStart = Math.min(start, content.length)
    const clampedEnd = Math.min(end, content.length)
    const selectedText = content.slice(clampedStart, clampedEnd)

    const newContent =
      content.slice(0, clampedStart) + prefix + selectedText + suffix + content.slice(clampedEnd)
    handleContentChange(newContent)

    const newPosition = selectedText
      ? clampedStart + prefix.length + selectedText.length + suffix.length
      : clampedStart + prefix.length
    cursorPositionRef.current = { start: newPosition, end: newPosition }

    setTimeout(() => {
      const textarea = textareaRef.current
      if (textarea) {
        textarea.focus()
        textarea.setSelectionRange(newPosition, newPosition)
      }
    }, 0)
  }

  /**
   * Inserts an emoji at the saved cursor position.
   * Uses cursorPositionRef so it works even when focus has moved to the emoji popover.
   * @param emoji - The emoji to insert
   */
  const insertEmoji = (emoji: string) => {
    const { start, end } = cursorPositionRef.current
    const clampedStart = Math.min(start, content.length)
    const clampedEnd = Math.min(end, content.length)

    const newContent = content.slice(0, clampedStart) + emoji + content.slice(clampedEnd)
    handleContentChange(newContent)

    const newPosition = clampedStart + emoji.length
    cursorPositionRef.current = { start: newPosition, end: newPosition }

    // Ensure we're in edit mode so the textarea is mounted, then focus and set cursor
    if (!isEditing) setIsEditing(true)
    setTimeout(() => {
      const textarea = textareaRef.current
      if (textarea) {
        textarea.focus()
        textarea.setSelectionRange(newPosition, newPosition)
      }
    }, 0)
  }

  /**
   * Handles file selection from the toolbar buttons
   */
  const handleFileSelect = (files: FileList, type: "image" | "document") => {
    const newMediaFiles: MediaFile[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const mediaFile: MediaFile = {
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        type: type === "image" ? "image" : "document",
        previewUrl: URL.createObjectURL(file),
        uploadProgress: 100,
        status: "complete",
      }
      newMediaFiles.push(mediaFile)
    }

    setMediaFiles((prev) => [...prev, ...newMediaFiles])
    postToast.mediaSaved()
  }

  /**
   * Removes a media file from the list
   */
  const handleRemoveMedia = (id: string) => {
    setMediaFiles((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file) {
        URL.revokeObjectURL(file.previewUrl)
      }
      return prev.filter((f) => f.id !== id)
    })
  }

  /**
   * Enters edit mode on the right-side preview
   */
  const enterEditMode = () => {
    setIsEditing(true)
  }

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column — AI Generation Only */}
        <motion.div
          variants={fadeSlideUpVariants}
          initial="initial"
          animate="animate"
        >
          <Card className="flex flex-col">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle>AI Generation</CardTitle>
                  <LinkedInStatusBadge variant="badge" showReconnect={false} />
                </div>
                {/* Auto-save indicator */}
                {(isSaving || lastSaved) && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {isSaving ? (
                      <>
                        <IconLoader2 className="size-3 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : lastSaved ? (
                      <>
                        <IconCheck className="size-3 text-green-500" />
                        <span>Saved {formatLastSaved(lastSaved)}</span>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
              <CardDescription>
                Generate post content with AI assistance
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-3">
              {/* Posting Disabled Warning */}
              {!isPostingEnabled && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
                  <IconAlertTriangle className="size-4 shrink-0" />
                  <span>{disabledMessage}</span>
                </div>
              )}

              {/* Goal Selector */}
              <PostGoalSelector
                selectedGoal={selectedGoal}
                selectedFormat={selectedFormat}
                onGoalChange={setSelectedGoal}
                onFormatChange={setSelectedFormat}
                excludeGoals={['visual']}
              />

              {/* AI Inline Panel — always expanded */}
              <AIInlinePanel
                isExpanded={true}
                onToggle={() => {}}
                onGenerated={(generatedContent) => {
                  handleContentChange(convertMarkdownToUnicode(generatedContent))
                  trackFeatureUsed("ai_generation_inline")
                  showSuccess('Post generated!')
                  setIsEditing(false)
                }}
                hasApiKey={hasApiKey}
                defaultPostType={selectedFormat}
                selectedGoal={selectedGoal ? GOAL_LABELS[selectedGoal]?.label : undefined}
                onAdvancedClick={() => {
                  setShowAIDialog(true)
                }}
                onGenerationContext={onGenerationContext}
                persistFields={true}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column — Editable Preview + Toolbar + Actions */}
        <motion.div
          variants={fadeSlideUpVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.1 }}
        >
          <Card className="flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <IconBrandLinkedin className="size-4 text-[#0A66C2]" />
                LinkedIn Preview
              </CardTitle>
              <CardDescription>
                {isEditing
                  ? "Editing — click outside or press Escape to finish"
                  : "Double-click the content area to edit"}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col gap-3">
              {/* LinkedIn Post Preview Card */}
              <div className="rounded-lg border bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-700/60 overflow-hidden">
                {/* Profile Header */}
                <div className="flex items-start gap-3 p-4 pb-3">
                  <Avatar className="size-12 ring-1 ring-border/50">
                    {userProfile.avatarUrl ? (
                      <AvatarImage src={userProfile.avatarUrl} alt={userProfile.name} />
                    ) : null}
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                      {userProfile.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold leading-tight text-sm">{userProfile.name}</h4>
                    <p className="text-muted-foreground text-xs leading-tight mt-0.5 line-clamp-1">
                      {userProfile.headline}
                    </p>
                    <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                      <span>Just now</span>
                      <span className="leading-none">&#183;</span>
                      <IconWorld className="size-3" />
                    </p>
                  </div>
                </div>

                {/* Editing Zone — wraps content + toolbar + media buttons */}
                <div ref={editingZoneRef}>
                  {/* Post Content — dual mode */}
                  <div className="px-4 pb-3">
                    {isEditing ? (
                      /* Edit mode: borderless textarea styled to match preview */
                      <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => {
                          handleContentChange(e.target.value)
                          saveCursorPosition()
                        }}
                        onSelect={saveCursorPosition}
                        onKeyUp={saveCursorPosition}
                        onClick={saveCursorPosition}
                        placeholder="What do you want to talk about?"
                        className={cn(
                          "w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground",
                          "min-h-[120px]",
                          isOverLimit && "text-destructive"
                        )}
                        aria-label="Post content"
                        aria-describedby="character-count"
                      />
                    ) : (
                      /* Preview mode: rendered content with double-click to edit */
                      <div
                        className="group relative cursor-text min-h-[120px]"
                        onDoubleClick={enterEditMode}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') enterEditMode()
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label="Double-click to edit post content"
                      >
                        {content.trim() ? (
                          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {parseMarkdownLikeSyntax(content)}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="rounded-full bg-muted/60 p-3 mb-2">
                              <IconPencil className="size-5 text-muted-foreground/50" />
                            </div>
                            <p className="text-muted-foreground text-sm italic">
                              Your post content will appear here...
                            </p>
                          </div>
                        )}
                        {/* Double-click hint on hover */}
                        <div className="absolute inset-0 flex items-center justify-center rounded-md bg-muted/30 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
                          <span className="rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
                            Double-click to edit
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Formatting Toolbar — visible only in edit mode */}
                  <AnimatePresence>
                    {isEditing && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-wrap items-center gap-1 border-t px-4 py-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => applyUnicodeFont('bold')}
                                aria-label="Bold"
                              >
                                <IconBold className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Bold (Unicode)</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => applyUnicodeFont('italic')}
                                aria-label="Italic"
                              >
                                <IconItalic className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Italic (Unicode)</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => insertFormatting("\n- ", "")}
                                aria-label="List"
                              >
                                <IconList className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>List item (- text)</TooltipContent>
                          </Tooltip>

                          <Separator orientation="vertical" className="mx-1 h-6" />

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => insertFormatting("#")}
                                aria-label="Hashtag"
                              >
                                <IconHash className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Add hashtag</TooltipContent>
                          </Tooltip>

                          <Separator orientation="vertical" className="mx-1 h-6" />

                          {/* Unicode Font Picker */}
                          <FontPicker
                            activeFontStyle={activeFontStyle}
                            onFontSelect={(style) => applyUnicodeFont(style)}
                          />

                          <Separator orientation="vertical" className="mx-1 h-6" />

                          {/* Emoji Picker */}
                          <EmojiPicker
                            isOpen={showEmojiPicker}
                            onClose={() => setShowEmojiPicker(false)}
                            onSelect={(emoji) => {
                              insertEmoji(emoji)
                              setShowEmojiPicker(false)
                            }}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Add emoji"
                                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                >
                                  <IconMoodSmile className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Add emoji</TooltipContent>
                            </Tooltip>
                          </EmojiPicker>

                          {/* Image Attachment */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Add image"
                                onClick={() => {
                                  const input = document.createElement("input")
                                  input.type = "file"
                                  input.accept = "image/*"
                                  input.multiple = true
                                  input.onchange = (e) => {
                                    const files = (e.target as HTMLInputElement).files
                                    if (files) handleFileSelect(files, "image")
                                  }
                                  input.click()
                                }}
                              >
                                <IconPhoto className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Add image</TooltipContent>
                          </Tooltip>

                          {/* Document Attachment */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Add document"
                                onClick={() => {
                                  const input = document.createElement("input")
                                  input.type = "file"
                                  input.accept = ".pdf,.doc,.docx"
                                  input.onchange = (e) => {
                                    const files = (e.target as HTMLInputElement).files
                                    if (files) handleFileSelect(files, "document")
                                  }
                                  input.click()
                                }}
                              >
                                <IconFile className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Add document</TooltipContent>
                          </Tooltip>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Media Preview */}
                {mediaFiles.length > 0 && (
                  <div className="border-t px-4 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium">
                        Attached media ({mediaFiles.length})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-muted-foreground"
                        onClick={() => {
                          mediaFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl))
                          setMediaFiles([])
                        }}
                      >
                        Clear all
                      </Button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {mediaFiles.map((file) => (
                        <div
                          key={file.id}
                          className="group relative aspect-square overflow-hidden rounded-md border bg-muted"
                        >
                          {file.type === "image" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={file.previewUrl}
                              alt={file.file.name}
                              className="size-full object-cover"
                            />
                          ) : (
                            <div className="flex size-full flex-col items-center justify-center gap-1 text-muted-foreground">
                              <IconFile className="size-6" />
                              <span className="max-w-full truncate px-1 text-xs">
                                {file.file.name}
                              </span>
                            </div>
                          )}
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute right-1 top-1 size-5 opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={() => handleRemoveMedia(file.id)}
                            aria-label={`Remove ${file.file.name}`}
                          >
                            <IconX className="size-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Engagement Stats (Placeholder) */}
                <div className="text-muted-foreground flex items-center px-4 py-2 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-flex -space-x-1">
                      <span className="inline-flex items-center justify-center size-4 rounded-full bg-[#378FE9] text-[8px] text-white ring-1 ring-white dark:ring-zinc-900">&#128077;</span>
                      <span className="inline-flex items-center justify-center size-4 rounded-full bg-[#DF704D] text-[8px] text-white ring-1 ring-white dark:ring-zinc-900">&#10084;</span>
                    </span>
                    <span className="tabular-nums">0</span>
                  </span>
                  <span className="ml-auto flex items-center gap-2 tabular-nums">
                    <span>0 comments</span>
                    <span className="leading-none">&#183;</span>
                    <span>0 reposts</span>
                  </span>
                </div>

                {/* LinkedIn Action Buttons */}
                <div className="flex items-center justify-around border-t py-0.5 px-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground flex-1 gap-1.5 text-xs font-medium"
                    disabled
                  >
                    <IconThumbUp className="size-4" />
                    Like
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground flex-1 gap-1.5 text-xs font-medium"
                    disabled
                  >
                    <IconMessageCircle className="size-4" />
                    Comment
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground flex-1 gap-1.5 text-xs font-medium"
                    disabled
                  >
                    <IconRepeat className="size-4" />
                    Repost
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground flex-1 gap-1.5 text-xs font-medium"
                    disabled
                  >
                    <IconSend className="size-4" />
                    Send
                  </Button>
                </div>
              </div>

              {/* Character Counter — always visible below preview card */}
              <div id="character-count" className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-2 flex-1 overflow-hidden rounded-full bg-muted",
                    isOverLimit && "bg-destructive/20"
                  )}
                >
                  <div
                    className={cn(
                      "h-full transition-all duration-300",
                      isOverLimit ? "bg-destructive" : "bg-primary"
                    )}
                    style={{ width: `${characterPercentage}%` }}
                  />
                </div>
                <span
                  className={cn(
                    "text-sm tabular-nums whitespace-nowrap",
                    isOverLimit
                      ? "text-destructive font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {characterCount.toLocaleString()}/{maxLength.toLocaleString()}
                </span>
              </div>

              {/* Hashtag Display — always visible when hashtags exist */}
              {hashtags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground text-xs">Hashtags:</span>
                  {hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>

            {/* Action Buttons — moved from left footer */}
            <CardFooter className="flex justify-between gap-2 border-t pt-4">
              <div className="flex items-center gap-2">
                <PostActionsMenu content={content} variant="ghost" />
                {/* Copy & Post to LinkedIn fallback button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyToLinkedIn}
                      disabled={!content.trim()}
                      className="gap-1.5"
                    >
                      <IconClipboardCopy className="size-4" />
                      <IconBrandLinkedin className="size-4 text-[#0077b5]" />
                      Copy & Post
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Copy content to clipboard and open LinkedIn to paste
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleScheduleClick}
                  disabled={isScheduling || isPosting || isOverLimit || !content.trim()}
                >
                  {isScheduling ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : (
                    <IconCalendar className="size-4" />
                  )}
                  Schedule
                </Button>
                <Button
                  onClick={handlePost}
                  disabled={isPosting || isScheduling || isOverLimit || !content.trim()}
                  variant={isPostingEnabled ? "default" : "secondary"}
                >
                  {isPosting ? (
                    <IconLoader2 className="size-4 animate-spin" />
                  ) : isPostingEnabled ? (
                    <IconSend className="size-4" />
                  ) : (
                    <IconFile className="size-4" />
                  )}
                  {isPostingEnabled ? "Post Now" : "Save as Draft"}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </motion.div>
      </div>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={handleScheduleConfirm}
        postPreview={{
          content,
          mediaCount: mediaFiles.length,
        }}
        isSubmitting={isScheduling}
      />

      {/* AI Generation Dialog (Advanced fallback) */}
      <AIGenerationDialog
        isOpen={showAIDialog}
        onClose={() => setShowAIDialog(false)}
        onGenerated={(generatedContent) => {
          handleContentChange(convertMarkdownToUnicode(generatedContent))
          trackFeatureUsed("ai_generation_dialog")
          showSuccess('Post generated successfully!')
          setIsEditing(false)
        }}
        hasApiKey={hasApiKey}
        defaultPostType={selectedFormat}
      />
    </TooltipProvider>
  )
}
