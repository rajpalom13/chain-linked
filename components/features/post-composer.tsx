"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconBold,
  IconCalendar,
  IconCheck,
  IconFile,
  IconHash,
  IconItalic,
  IconList,
  IconLoader2,
  IconMessageCircle,
  IconMoodSmile,
  IconPhoto,
  IconRepeat,
  IconSend,
  IconThumbUp,
  IconWorld,
  IconX,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { useDraft } from "@/lib/store/draft-context"
import { postToast } from "@/lib/toast-utils"
import { useAutoSave, formatLastSaved } from "@/hooks/use-auto-save"
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
import { MediaUpload, type MediaFile } from "./media-upload"
import { ScheduleModal } from "./schedule-modal"

/**
 * Props for the PostComposer component
 */
export interface PostComposerProps {
  /** Initial content to populate the editor with */
  initialContent?: string
  /** Callback fired when the "Post Now" button is clicked */
  onPost?: (content: string) => Promise<void>
  /** Callback fired when the "Schedule" button is clicked */
  onSchedule?: (content: string) => void
  /** Maximum character limit for the post (defaults to 3000 for LinkedIn) */
  maxLength?: number
  /** User profile information for the preview */
  userProfile?: {
    name: string
    headline: string
    avatarUrl?: string
  }
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
 * Parses markdown-like syntax and converts to styled HTML for preview
 * Supports: **bold**, *italic*, - list items, #hashtags
 * @param text - The raw text content to parse
 * @returns Parsed text with HTML elements
 */
function parseMarkdownLikeSyntax(text: string): React.ReactNode[] {
  if (!text) return []

  const lines = text.split("\n")
  const elements: React.ReactNode[] = []

  lines.forEach((line, lineIndex) => {
    // Parse inline formatting within a line
    const parseInlineFormatting = (content: string): React.ReactNode[] => {
      const parts: React.ReactNode[] = []
      let remaining = content
      let keyIndex = 0

      while (remaining.length > 0) {
        // Check for bold (**text**)
        const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
        // Check for italic (*text*)
        const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/)
        // Check for hashtags (#hashtag)
        const hashtagMatch = remaining.match(/#(\w+)/)

        const matches = [
          { type: "bold", match: boldMatch, priority: boldMatch?.index ?? Infinity },
          { type: "italic", match: italicMatch, priority: italicMatch?.index ?? Infinity },
          { type: "hashtag", match: hashtagMatch, priority: hashtagMatch?.index ?? Infinity },
        ].filter((m) => m.match !== null)

        if (matches.length === 0) {
          if (remaining) {
            parts.push(remaining)
          }
          break
        }

        // Process the earliest match
        const earliest = matches.reduce((prev, curr) =>
          curr.priority < prev.priority ? curr : prev
        )

        const match = earliest.match!
        const index = match.index!

        // Add text before the match
        if (index > 0) {
          parts.push(remaining.slice(0, index))
        }

        // Add the formatted element
        switch (earliest.type) {
          case "bold":
            parts.push(
              <strong key={`bold-${lineIndex}-${keyIndex++}`} className="font-semibold">
                {match[1]}
              </strong>
            )
            remaining = remaining.slice(index + match[0].length)
            break
          case "italic":
            parts.push(
              <em key={`italic-${lineIndex}-${keyIndex++}`} className="italic">
                {match[1]}
              </em>
            )
            remaining = remaining.slice(index + match[0].length)
            break
          case "hashtag":
            parts.push(
              <span
                key={`hashtag-${lineIndex}-${keyIndex++}`}
                className="text-primary font-medium"
              >
                #{match[1]}
              </span>
            )
            remaining = remaining.slice(index + match[0].length)
            break
        }
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
 * A rich text editor for composing LinkedIn posts with live preview.
 *
 * Features:
 * - Two-column layout with editor and LinkedIn-style preview
 * - Rich text formatting via markdown-like syntax (bold, italic, lists)
 * - Real-time character counter with LinkedIn's 3000 character limit
 * - Emoji picker button (placeholder)
 * - Hashtag extraction and suggestions (placeholder)
 * - Media attachment buttons (image, document)
 * - Post Now and Schedule action buttons with loading states
 *
 * @example
 * ```tsx
 * // Basic usage
 * <PostComposer
 *   onPost={async (content) => {
 *     await publishToLinkedIn(content)
 *   }}
 *   onSchedule={(content) => {
 *     openScheduleDialog(content)
 *   }}
 * />
 *
 * // With initial content and custom user profile
 * <PostComposer
 *   initialContent="Check out our latest product launch!"
 *   userProfile={{
 *     name: "Jane Doe",
 *     headline: "CEO at TechCorp",
 *     avatarUrl: "/avatars/jane.jpg"
 *   }}
 *   maxLength={2000}
 * />
 * ```
 */
export function PostComposer({
  initialContent = "",
  onPost,
  onSchedule,
  maxLength = DEFAULT_MAX_LENGTH,
  userProfile = DEFAULT_USER_PROFILE,
}: PostComposerProps) {
  const router = useRouter()
  const { draft, setContent: setDraftContent, setScheduledFor, clearDraft } = useDraft()

  // Initialize content from draft context if available, otherwise use initialContent
  const [content, setContent] = React.useState(() => draft.content || initialContent)
  const [isPosting, setIsPosting] = React.useState(false)
  const [isScheduling, setIsScheduling] = React.useState(false)
  const [showScheduleModal, setShowScheduleModal] = React.useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false)
  const [mediaFiles, setMediaFiles] = React.useState<MediaFile[]>([])
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Auto-save status indicator
  const { isSaving, lastSaved } = useAutoSave(content, 1500)

  // Sync content with draft context (when loaded from template or remix)
  // We intentionally exclude 'content' from deps to prevent infinite loops
  React.useEffect(() => {
    if (draft.content && draft.content !== content) {
      setContent(draft.content)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.content])

  // Update draft when content changes
  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    setDraftContent(newContent)
  }

  const characterCount = content.length
  const isOverLimit = characterCount > maxLength
  const hashtags = extractHashtags(content)
  const characterPercentage = Math.min((characterCount / maxLength) * 100, 100)

  /**
   * Handles the Post Now button click
   */
  const handlePost = async () => {
    if (!onPost || isOverLimit || !content.trim()) return

    setIsPosting(true)
    try {
      await onPost(content)
      clearDraft()
      setContent("")
      postToast.published()
    } catch (error) {
      console.error("Failed to post:", error)
      postToast.failed(error instanceof Error ? error.message : undefined)
    } finally {
      setIsPosting(false)
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
  const handleScheduleConfirm = async (scheduledFor: Date, _timezone: string) => {
    setIsScheduling(true)
    try {
      // Save to draft context
      setScheduledFor(scheduledFor)

      // Call the optional onSchedule callback
      if (onSchedule) {
        onSchedule(content)
      }

      // Close modal and show success toast
      setShowScheduleModal(false)
      const formattedDate = scheduledFor.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
      postToast.scheduled(formattedDate)

      // Navigate to schedule page
      router.push("/dashboard/schedule")
    } finally {
      setIsScheduling(false)
    }
  }

  /**
   * Inserts formatting syntax at the current cursor position
   * @param prefix - The prefix to insert (e.g., "**" for bold)
   * @param suffix - The suffix to insert (e.g., "**" for bold)
   */
  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.slice(start, end)

    const newContent =
      content.slice(0, start) + prefix + selectedText + suffix + content.slice(end)
    handleContentChange(newContent)

    // Set cursor position after formatting
    setTimeout(() => {
      textarea.focus()
      const newPosition = selectedText
        ? start + prefix.length + selectedText.length + suffix.length
        : start + prefix.length
      textarea.setSelectionRange(newPosition, newPosition)
    }, 0)
  }

  /**
   * Inserts an emoji at the current cursor position
   * @param emoji - The emoji to insert
   */
  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd

    const newContent = content.slice(0, start) + emoji + content.slice(end)
    handleContentChange(newContent)

    // Set cursor position after emoji
    setTimeout(() => {
      textarea.focus()
      const newPosition = start + emoji.length
      textarea.setSelectionRange(newPosition, newPosition)
    }, 0)
  }

  /**
   * Handles file selection from the toolbar buttons
   * @param files - The FileList from the input
   * @param type - Expected file type
   */
  const handleFileSelect = (files: FileList, type: "image" | "document") => {
    const newMediaFiles: MediaFile[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      // Create a MediaFile entry
      const mediaFile: MediaFile = {
        id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        type: type === "image" ? "image" : "document",
        previewUrl: URL.createObjectURL(file),
        uploadProgress: 100, // Simulated complete for now
        status: "complete",
      }
      newMediaFiles.push(mediaFile)
    }

    setMediaFiles((prev) => [...prev, ...newMediaFiles])
    postToast.mediaSaved()
  }

  /**
   * Removes a media file from the list
   * @param id - The file ID to remove
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

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Editor Column */}
        <Card className="flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>Post Editor</CardTitle>
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
              Compose your LinkedIn post with rich text formatting
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-1 flex-col gap-4">
            {/* Formatting Toolbar */}
            <div className="flex flex-wrap items-center gap-1 rounded-md border p-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => insertFormatting("**")}
                    aria-label="Bold"
                  >
                    <IconBold className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bold (**text**)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => insertFormatting("*")}
                    aria-label="Italic"
                  >
                    <IconItalic className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Italic (*text*)</TooltipContent>
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
            </div>

            {/* Textarea */}
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="What do you want to talk about?"
                className={cn(
                  "border-input bg-background placeholder:text-muted-foreground h-full min-h-[200px] w-full resize-none rounded-md border px-3 py-2 text-sm shadow-xs transition-colors",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-[3px]",
                  isOverLimit && "border-destructive focus-visible:border-destructive"
                )}
                aria-label="Post content"
                aria-describedby="character-count"
              />
            </div>

            {/* Media Preview */}
            {mediaFiles.length > 0 && (
              <div className="rounded-md border p-3">
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

            {/* Character Counter & Media Buttons */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
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

              {/* Character Count */}
              <div id="character-count" className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-2 w-24 overflow-hidden rounded-full bg-muted",
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
                    "text-sm tabular-nums",
                    isOverLimit
                      ? "text-destructive font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {characterCount.toLocaleString()}/{maxLength.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Hashtag Suggestions (Placeholder) */}
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

          <CardFooter className="flex justify-end gap-2 border-t pt-4">
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
            >
              {isPosting ? (
                <IconLoader2 className="size-4 animate-spin" />
              ) : (
                <IconSend className="size-4" />
              )}
              Post Now
            </Button>
          </CardFooter>
        </Card>

        {/* Preview Column */}
        <Card className="flex flex-col">
          <CardHeader className="pb-4">
            <CardTitle>LinkedIn Preview</CardTitle>
            <CardDescription>
              See how your post will appear on LinkedIn
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1">
            {/* LinkedIn Post Preview Card */}
            <div className="rounded-lg border bg-white shadow-sm dark:bg-zinc-900">
              {/* Profile Header */}
              <div className="flex items-start gap-3 p-4">
                <Avatar className="size-12">
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

                <div className="flex-1">
                  <h4 className="font-semibold leading-tight">{userProfile.name}</h4>
                  <p className="text-muted-foreground text-sm leading-tight">
                    {userProfile.headline}
                  </p>
                  <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                    <span>Just now</span>
                    <span>*</span>
                    <IconWorld className="size-3" />
                  </p>
                </div>
              </div>

              {/* Post Content */}
              <div className="px-4 pb-4">
                {content.trim() ? (
                  <div className="text-sm leading-relaxed">
                    {parseMarkdownLikeSyntax(content)}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm italic">
                    Your post content will appear here...
                  </p>
                )}
              </div>

              {/* Engagement Stats (Placeholder) */}
              <div className="text-muted-foreground flex items-center gap-4 border-t px-4 py-2 text-xs">
                <span>0 reactions</span>
                <span>0 comments</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-around border-t py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground flex-1"
                  disabled
                >
                  <IconThumbUp className="size-4" />
                  Like
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground flex-1"
                  disabled
                >
                  <IconMessageCircle className="size-4" />
                  Comment
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground flex-1"
                  disabled
                >
                  <IconRepeat className="size-4" />
                  Repost
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground flex-1"
                  disabled
                >
                  <IconSend className="size-4" />
                  Send
                </Button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex-col items-start gap-2 border-t pt-4 text-sm">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Tip:</strong> Use{" "}
              <code className="bg-muted rounded px-1 py-0.5 text-xs">**bold**</code> for
              bold, <code className="bg-muted rounded px-1 py-0.5 text-xs">*italic*</code>{" "}
              for italic, and{" "}
              <code className="bg-muted rounded px-1 py-0.5 text-xs">- item</code> for
              lists.
            </p>
          </CardFooter>
        </Card>
      </div>

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        onSchedule={handleScheduleConfirm}
        postPreview={{
          content,
          mediaCount: draft.mediaFiles.length,
        }}
        isSubmitting={isScheduling}
      />
    </TooltipProvider>
  )
}
