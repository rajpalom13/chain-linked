'use client';

/**
 * Post to LinkedIn Dialog Component
 * @description Full-featured two-panel compose dialog for posting carousel content
 * directly to LinkedIn. Left panel is a clean AI generation section. Right panel
 * is a live LinkedIn-style post preview with the user's real profile, double-click
 * editable caption, formatting toolbar, and navigable carousel slides.
 * @module components/features/canvas-editor/post-to-linkedin-dialog
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  IconBrandLinkedin,
  IconLoader2,
  IconCheck,
  IconAlertTriangle,
  IconBold,
  IconItalic,
  IconList,
  IconHash,
  IconMoodSmile,
  IconWorld,
  IconThumbUp,
  IconMessageCircle,
  IconRepeat,
  IconSend,
  IconPencil,
} from '@tabler/icons-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuthContext } from '@/lib/auth/auth-provider';
import { useLinkedInPost } from '@/hooks/use-linkedin-post';
import { useLinkedInDocumentPost } from '@/hooks/use-linkedin-document-post';
import {
  exportSlideToDataUrl,
  exportCarouselToPDF,
} from '@/lib/canvas-pdf-export';
import {
  transformSelection,
  convertMarkdownToUnicode,
  isTextStyled,
  type UnicodeFontStyle,
} from '@/lib/unicode-fonts';
import { countCharactersWithMentions } from '@/lib/linkedin/mentions';
import { AIInlinePanel } from '@/components/features/ai-inline-panel';
import { FontPicker } from '@/components/features/font-picker';
import { EmojiPicker } from '@/components/features/emoji-picker';
import { CarouselDocumentPreview } from '@/components/features/carousel-document-preview';
import type { CanvasSlide } from '@/types/canvas-editor';
import type { CanvasStageRef } from './canvas-stage';
import type { LinkedInVisibility } from '@/lib/linkedin/types';
import type { DocumentPostStage } from '@/lib/linkedin/types';

/**
 * Maximum character length for LinkedIn post captions
 */
const MAX_CAPTION_LENGTH = 3000;

/**
 * Props for the PostToLinkedInDialog component
 */
interface PostToLinkedInDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Current carousel slides */
  slides: CanvasSlide[];
  /** Ref to the canvas stage for exporting slides */
  stageRef: React.RefObject<CanvasStageRef | null>;
  /** Current slide index (to restore after export) */
  currentSlideIndex: number;
  /** Function to set the current slide index */
  setCurrentSlide: (index: number) => void;
}

/**
 * Stage labels for progress display
 */
const STAGE_LABELS: Record<DocumentPostStage, string> = {
  'generating-pdf': 'Generating PDF from slides...',
  'uploading-document': 'Uploading document to LinkedIn...',
  'creating-post': 'Creating your post...',
  'complete': 'Post published successfully!',
  'error': 'Something went wrong',
};

/**
 * Post to LinkedIn Dialog — full compose experience
 * Left: AI generation | Right: LinkedIn-style live preview with double-click editing
 * @param props - Component props
 * @returns Dialog JSX element
 */
export function PostToLinkedInDialog({
  open,
  onOpenChange,
  slides,
  stageRef,
  currentSlideIndex,
  setCurrentSlide,
}: PostToLinkedInDialogProps) {
  const { user, profile } = useAuthContext();

  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<LinkedInVisibility>('PUBLIC');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [slideImages, setSlideImages] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeFontStyle, setActiveFontStyle] = useState<UnicodeFontStyle>('normal');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editingZoneRef = useRef<HTMLDivElement>(null);
  const cursorPositionRef = useRef({ start: 0, end: 0 });

  // LinkedIn connection status
  const {
    isConnected,
    isLoading: isLoadingConnection,
    connectionStatus,
    connectLinkedIn,
  } = useLinkedInPost();

  // Document posting hook
  const {
    postDocument,
    stage,
    isPosting,
    error: postError,
  } = useLinkedInDocumentPost();

  // ─── User profile data ───
  const linkedinProfile = profile?.linkedin_profile;
  const rawData = linkedinProfile?.raw_data as Record<string, unknown> | null;

  const profileName = (rawData?.name as string | undefined)
    || (linkedinProfile?.first_name && linkedinProfile?.last_name
      ? `${linkedinProfile.first_name} ${linkedinProfile.last_name}`
      : linkedinProfile?.first_name || undefined)
    || profile?.full_name
    || user?.user_metadata?.name || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'Your Name';

  const profileHeadline = linkedinProfile?.headline
    || (rawData?.headline as string | undefined)
    || profile?.linkedin_headline
    || 'Your Professional Headline';

  const profileAvatar = (rawData?.profilePhotoUrl as string | undefined)
    || linkedinProfile?.profile_picture_url
    || profile?.linkedin_avatar_url
    || profile?.avatar_url
    || user?.user_metadata?.avatar_url || user?.user_metadata?.picture
    || undefined;

  const profileInitials = (profileName as string)
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  /**
   * Extract text content from slides for AI context
   */
  const extractSlideText = useCallback((): string => {
    return slides
      .flatMap((slide) => slide.elements)
      .filter((el): el is Extract<typeof el, { type: 'text' }> => el.type === 'text')
      .map((el) => el.text)
      .filter(Boolean)
      .join('\n');
  }, [slides]);

  /**
   * Generate PDF and slide preview images from current slides
   */
  const generatePdf = useCallback(async () => {
    const stage = stageRef.current?.getStage();
    if (!stage || slides.length === 0) return;

    setIsGeneratingPdf(true);

    try {
      const originalSlideIndex = currentSlideIndex;
      const highResDataUrls: string[] = [];
      const previewDataUrls: string[] = [];

      for (let i = 0; i < slides.length; i++) {
        setCurrentSlide(i);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        await new Promise((resolve) => setTimeout(resolve, 100));

        const highResUrl = exportSlideToDataUrl(stage, 2);
        highResDataUrls.push(highResUrl);

        const previewUrl = exportSlideToDataUrl(stage, 0.5);
        previewDataUrls.push(previewUrl);
      }

      setCurrentSlide(originalSlideIndex);

      const blob = await exportCarouselToPDF(highResDataUrls, {
        format: 'pdf',
        quality: 'medium',
        pixelRatio: 2,
      });

      setPdfBlob(blob);
      setSlideImages(previewDataUrls);
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast.error('Failed to generate PDF from slides');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [slides, stageRef, currentSlideIndex, setCurrentSlide]);

  // Auto-generate PDF when dialog opens
  useEffect(() => {
    if (open && !pdfBlob && !isGeneratingPdf) {
      generatePdf();
    }
  }, [open, pdfBlob, isGeneratingPdf, generatePdf]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setPdfBlob(null);
      setSlideImages([]);
      setCaption('');
      setVisibility('PUBLIC');
      setActiveFontStyle('normal');
      setShowEmojiPicker(false);
      setIsEditing(false);
    }
  }, [open]);

  // Fetch API key status for AI generation
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function fetchApiKeyStatus() {
      try {
        const response = await fetch('/api/settings/api-keys');
        if (cancelled) return;
        if (response.ok) {
          const data = await response.json();
          if (!cancelled) setHasApiKey(data.hasKey === true);
        }
      } catch (error) {
        if (!cancelled) console.error('Failed to fetch API key status:', error);
      }
    }
    fetchApiKeyStatus();
    return () => { cancelled = true; };
  }, [open]);

  // Click-outside detection for edit mode (same pattern as PostComposer)
  useEffect(() => {
    if (!isEditing) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (
        target.closest('[data-radix-popper-content-wrapper]') ||
        target.closest('[data-radix-menu-content]') ||
        target.closest('[role="dialog"]')
      ) return;
      if (editingZoneRef.current && !editingZoneRef.current.contains(target)) {
        setIsEditing(false);
      }
    }

    function handleEscKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        const hasOpenPopover = document.querySelector(
          '[data-radix-popper-content-wrapper], [data-radix-menu-content]'
        );
        if (hasOpenPopover) return;
        setIsEditing(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isEditing]);

  // Auto-resize textarea in edit mode
  useEffect(() => {
    if (!isEditing) return;
    const textarea = textareaRef.current;
    if (!textarea) return;

    function resize() {
      if (!textarea) return;
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }

    resize();
    textarea.addEventListener('input', resize);
    return () => { textarea.removeEventListener('input', resize); };
  }, [isEditing, caption]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  /**
   * Saves the current textarea cursor position
   */
  const saveCursorPosition = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      cursorPositionRef.current = {
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
      };
    }
  };

  /**
   * Applies a Unicode font style to selected text or toggles for future typing
   */
  const applyUnicodeFont = (style: UnicodeFontStyle) => {
    const { start, end } = cursorPositionRef.current;
    if (start === end) {
      setActiveFontStyle((prev) => prev === style ? 'normal' : style);
      return;
    }

    const selectedText = caption.slice(start, end);
    const alreadyStyled = isTextStyled(selectedText, style);
    const targetStyle = alreadyStyled ? 'normal' : style;
    const result = transformSelection(caption, start, end, targetStyle);
    setCaption(result.text);
    setActiveFontStyle(targetStyle);
    cursorPositionRef.current = { start, end: result.newEnd };

    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(start, result.newEnd);
      }
    }, 0);
  };

  /**
   * Handles keyboard shortcuts in the caption textarea
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMod = e.metaKey || e.ctrlKey;

    if (isMod && e.key === 'b') {
      e.preventDefault();
      saveCursorPosition();
      applyUnicodeFont('bold');
      return;
    }

    if (isMod && e.key === 'i') {
      e.preventDefault();
      saveCursorPosition();
      applyUnicodeFont('italic');
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      const textarea = e.currentTarget;
      const cursorPos = textarea.selectionStart;
      const textBefore = caption.slice(0, cursorPos);
      const lastNewline = textBefore.lastIndexOf('\n');
      const currentLine = textBefore.slice(lastNewline + 1);

      if (currentLine.trimStart().startsWith('- ')) {
        const lineContent = currentLine.trimStart().slice(2);
        if (lineContent.trim() === '') {
          e.preventDefault();
          const lineStart = lastNewline + 1;
          const newCaption = caption.slice(0, lineStart) + '\n' + caption.slice(cursorPos);
          setCaption(newCaption);
          const newPos = lineStart + 1;
          cursorPositionRef.current = { start: newPos, end: newPos };
          setTimeout(() => { textareaRef.current?.setSelectionRange(newPos, newPos); }, 0);
        } else {
          e.preventDefault();
          const indent = currentLine.match(/^(\s*)/)?.[1] ?? '';
          const insertion = '\n' + indent + '- ';
          const newCaption = caption.slice(0, cursorPos) + insertion + caption.slice(cursorPos);
          setCaption(newCaption);
          const newPos = cursorPos + insertion.length;
          cursorPositionRef.current = { start: newPos, end: newPos };
          setTimeout(() => { textareaRef.current?.setSelectionRange(newPos, newPos); }, 0);
        }
      }
    }
  };

  /**
   * Inserts formatting syntax at the saved cursor position
   */
  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    const { start, end } = cursorPositionRef.current;
    const clampedStart = Math.min(start, caption.length);
    const clampedEnd = Math.min(end, caption.length);
    const selectedText = caption.slice(clampedStart, clampedEnd);

    const newCaption =
      caption.slice(0, clampedStart) + prefix + selectedText + suffix + caption.slice(clampedEnd);
    setCaption(newCaption);

    const newPosition = selectedText
      ? clampedStart + prefix.length + selectedText.length + suffix.length
      : clampedStart + prefix.length;
    cursorPositionRef.current = { start: newPosition, end: newPosition };

    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  /**
   * Inserts an emoji at the saved cursor position
   */
  const insertEmoji = (emoji: string) => {
    const { start, end } = cursorPositionRef.current;
    const clampedStart = Math.min(start, caption.length);
    const clampedEnd = Math.min(end, caption.length);

    const newCaption = caption.slice(0, clampedStart) + emoji + caption.slice(clampedEnd);
    setCaption(newCaption);

    const newPosition = clampedStart + emoji.length;
    cursorPositionRef.current = { start: newPosition, end: newPosition };

    if (!isEditing) setIsEditing(true);
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        textarea.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  /**
   * Handle AI-generated content
   */
  const handleAIGenerated = (content: string) => {
    const converted = convertMarkdownToUnicode(content);
    setCaption(converted);
    setIsEditing(false);
  };

  /**
   * Handle posting to LinkedIn
   */
  const handlePost = async () => {
    if (!caption.trim()) {
      toast.error('Please write a caption for your post');
      return;
    }

    if (!pdfBlob) {
      toast.error('No document available. Please wait for PDF generation.');
      return;
    }

    const result = await postDocument({
      content: caption,
      visibility,
      pdfBlob,
      documentTitle: 'Carousel',
    });

    if (result.success) {
      if (result.draft) {
        toast.info(result.message || 'Saved as draft (posting is disabled)');
      } else {
        toast.success('Posted to LinkedIn successfully!');
      }
      onOpenChange(false);
    } else {
      toast.error(result.error || 'Failed to post to LinkedIn');
    }
  };

  const characterCount = countCharactersWithMentions(caption);
  const isOverLimit = characterCount > MAX_CAPTION_LENGTH;
  const characterPercentage = Math.min((characterCount / MAX_CAPTION_LENGTH) * 100, 100);
  const isProcessing = isPosting || isGeneratingPdf;

  return (
    <Dialog open={open} onOpenChange={isProcessing ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconBrandLinkedin className="h-5 w-5 text-[#0A66C2]" />
            Post to LinkedIn
          </DialogTitle>
          <DialogDescription>
            Generate a caption with AI, then preview and edit your post.
          </DialogDescription>
        </DialogHeader>

        {/* Two-panel layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* ─── LEFT PANEL: AI Generation (clean) ─── */}
          <div className="flex flex-col gap-4">
            {/* Connection status */}
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                isConnected
                  ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300'
                  : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300'
              )}
            >
              {isLoadingConnection ? (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              ) : isConnected ? (
                <>
                  <IconCheck className="h-4 w-4" />
                  <span>
                    Connected{connectionStatus?.profileName ? ` as ${connectionStatus.profileName}` : ''}
                  </span>
                </>
              ) : (
                <>
                  <IconAlertTriangle className="h-4 w-4" />
                  <span>LinkedIn not connected</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="ml-auto h-auto p-0 text-amber-700 dark:text-amber-300"
                    onClick={connectLinkedIn}
                  >
                    Connect
                  </Button>
                </>
              )}
            </div>

            {/* AI panel — always expanded */}
            <AIInlinePanel
              isExpanded={true}
              onToggle={() => {}}
              onGenerated={handleAIGenerated}
              hasApiKey={hasApiKey}
              persistFields
              initialContext={(() => {
                const slideText = extractSlideText();
                const contextParts = [
                  'IMPORTANT CONTEXT: The user is posting a LinkedIn carousel document (PDF) alongside this caption.',
                  `The carousel has ${slides.length} slides.`,
                  'The caption you generate will appear ABOVE the carousel in the LinkedIn feed.',
                  'Write a compelling caption that hooks readers and encourages them to swipe through all the slides.',
                  'Do NOT repeat the slide content verbatim — instead, tease the key insights to create curiosity.',
                ];
                if (slideText.trim()) {
                  contextParts.push(
                    '',
                    'Here is the text content from the carousel slides for reference:',
                    '---',
                    slideText.slice(0, 1000),
                    '---',
                  );
                }
                return contextParts.join('\n');
              })()}
            />

            {/* Visibility */}
            <div className="space-y-1.5">
              <Label className="text-xs">Visibility</Label>
              <RadioGroup
                value={visibility}
                onValueChange={(value) => setVisibility(value as LinkedInVisibility)}
                className="flex gap-4"
              >
                <label className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value="PUBLIC" />
                  <span className="text-sm">Public</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <RadioGroupItem value="CONNECTIONS" />
                  <span className="text-sm">Connections only</span>
                </label>
              </RadioGroup>
            </div>
          </div>

          {/* ─── RIGHT PANEL: LinkedIn Post Preview ─── */}
          <div className="flex flex-col gap-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <IconBrandLinkedin className="size-3.5 text-[#0A66C2]" />
              LinkedIn Preview
            </Label>

            <div className="rounded-lg border bg-white shadow-sm dark:bg-zinc-900 dark:border-zinc-700/60 overflow-hidden">
              {/* Profile header */}
              <div className="flex items-start gap-3 p-4 pb-3">
                <Avatar className="size-12 ring-1 ring-border/50">
                  {profileAvatar ? (
                    <AvatarImage src={profileAvatar} alt={profileName as string} />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                    {profileInitials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold leading-tight text-sm">{profileName}</h4>
                  <p className="text-muted-foreground text-xs leading-tight mt-0.5 line-clamp-1">
                    {profileHeadline}
                  </p>
                  <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
                    <span>Just now</span>
                    <span className="leading-none">&#183;</span>
                    <IconWorld className="size-3" />
                  </p>
                </div>
              </div>

              {/* Editing zone — caption + formatting toolbar */}
              <div ref={editingZoneRef}>
                {/* Caption area — dual mode (edit / preview) */}
                <div className="px-4 pb-3">
                  {isEditing ? (
                    <textarea
                      ref={textareaRef}
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onSelect={saveCursorPosition}
                      onClick={saveCursorPosition}
                      onKeyUp={saveCursorPosition}
                      placeholder="What do you want to talk about?"
                      className={cn(
                        'w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground',
                        'min-h-[100px]',
                        isOverLimit && 'text-destructive'
                      )}
                      aria-label="Post caption"
                    />
                  ) : (
                    <div
                      className="group relative cursor-text min-h-[100px]"
                      onDoubleClick={() => setIsEditing(true)}
                      onKeyDown={(e) => { if (e.key === 'Enter') setIsEditing(true); }}
                      tabIndex={0}
                      role="button"
                      aria-label="Double-click to edit caption"
                    >
                      {caption.trim() ? (
                        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                          {caption}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-6 text-center">
                          <div className="rounded-full bg-muted/60 p-3 mb-2">
                            <IconPencil className="size-5 text-muted-foreground/50" />
                          </div>
                          <p className="text-muted-foreground text-sm italic">
                            Your caption will appear here...
                          </p>
                          <p className="text-muted-foreground/60 text-xs mt-1">
                            Use AI on the left to generate, or double-click to type
                          </p>
                        </div>
                      )}
                      {/* Double-click hint on hover */}
                      {caption.trim() && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-md bg-muted/30 opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
                          <span className="rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
                            Double-click to edit
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Formatting toolbar — visible only in edit mode */}
                {isEditing && (
                  <div className="flex flex-wrap items-center gap-1 border-t px-4 py-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={activeFontStyle === 'bold' || activeFontStyle === 'boldItalic' ? 'secondary' : 'ghost'}
                          size="icon-sm"
                          onClick={() => { saveCursorPosition(); applyUnicodeFont('bold'); }}
                          aria-label="Bold"
                        >
                          <IconBold className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Bold ({typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent) ? '\u2318' : 'Ctrl'}+B)</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={activeFontStyle === 'italic' || activeFontStyle === 'boldItalic' ? 'secondary' : 'ghost'}
                          size="icon-sm"
                          onClick={() => { saveCursorPosition(); applyUnicodeFont('italic'); }}
                          aria-label="Italic"
                        >
                          <IconItalic className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Italic ({typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent) ? '\u2318' : 'Ctrl'}+I)</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon-sm" onClick={() => insertFormatting('\n- ', '')} aria-label="List">
                          <IconList className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>List item</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon-sm" onClick={() => insertFormatting('#')} aria-label="Hashtag">
                          <IconHash className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Add hashtag</TooltipContent>
                    </Tooltip>

                    <Separator orientation="vertical" className="mx-0.5 h-5" />

                    <FontPicker
                      activeFontStyle={activeFontStyle}
                      onFontSelect={(style) => applyUnicodeFont(style)}
                    />

                    <Separator orientation="vertical" className="mx-0.5 h-5" />

                    <EmojiPicker
                      isOpen={showEmojiPicker}
                      onClose={() => setShowEmojiPicker(false)}
                      onOpenChange={setShowEmojiPicker}
                      onSelect={(emoji) => {
                        insertEmoji(emoji);
                        setShowEmojiPicker(false);
                      }}
                    >
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Add emoji"
                        onClick={(e) => {
                          e.preventDefault();
                          saveCursorPosition();
                          setShowEmojiPicker(!showEmojiPicker);
                        }}
                      >
                        <IconMoodSmile className="size-4" />
                      </Button>
                    </EmojiPicker>
                  </div>
                )}
              </div>

              {/* Character counter — below toolbar / caption */}
              <div className="flex items-center gap-2 px-4 pb-2">
                <Progress
                  value={characterPercentage}
                  className={cn('h-1 flex-1', isOverLimit && '[&>div]:bg-destructive')}
                />
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'
                  )}
                >
                  {characterCount}/{MAX_CAPTION_LENGTH}
                </span>
              </div>

              {/* Carousel slides */}
              {isGeneratingPdf || slideImages.length === 0 ? (
                <div className="flex aspect-square items-center justify-center border-t bg-muted/30">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <IconLoader2 className="h-6 w-6 animate-spin" />
                    <span className="text-xs">Generating {slides.length} slides...</span>
                  </div>
                </div>
              ) : (
                <CarouselDocumentPreview
                  slideImages={slideImages}
                  onRemove={() => {}}
                  className="rounded-none border-0 border-t [&_[aria-label='Remove carousel']]:hidden"
                />
              )}

              {/* Engagement stats */}
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

              {/* LinkedIn action buttons */}
              <div className="flex items-center justify-around border-t py-0.5 px-2">
                <Button variant="ghost" size="sm" className="text-muted-foreground flex-1 gap-1.5 text-xs font-medium" disabled>
                  <IconThumbUp className="size-4" /> Like
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground flex-1 gap-1.5 text-xs font-medium" disabled>
                  <IconMessageCircle className="size-4" /> Comment
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground flex-1 gap-1.5 text-xs font-medium" disabled>
                  <IconRepeat className="size-4" /> Repost
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground flex-1 gap-1.5 text-xs font-medium" disabled>
                  <IconSend className="size-4" /> Send
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Posting progress */}
        {isPosting && stage && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {stage === 'complete' ? (
                <IconCheck className="h-4 w-4 text-green-500" />
              ) : stage === 'error' ? (
                <IconAlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <IconLoader2 className="h-4 w-4 animate-spin" />
              )}
              <span>{STAGE_LABELS[stage]}</span>
            </div>
            <Progress
              value={
                stage === 'uploading-document' ? 33
                  : stage === 'creating-post' ? 66
                    : stage === 'complete' ? 100
                      : 0
              }
              className="h-1.5"
            />
          </div>
        )}

        {postError && !isPosting && (
          <p className="text-sm text-destructive">{postError}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handlePost}
            disabled={isProcessing || !isConnected || !caption.trim() || !pdfBlob || isOverLimit}
            className="bg-[#0A66C2] text-white hover:bg-[#004182]"
          >
            {isPosting ? (
              <><IconLoader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...</>
            ) : (
              <><IconBrandLinkedin className="mr-2 h-4 w-4" /> Post to LinkedIn</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
