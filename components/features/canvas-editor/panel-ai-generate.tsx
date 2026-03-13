'use client';

/**
 * AI Generate Panel Component
 * Inline AI content generator for the editor left panel
 * Features polished UI with card sections, visual tone selector,
 * animated generation progress, and clear visual hierarchy
 * @module components/features/canvas-editor/panel-ai-generate
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  IconSparkles,
  IconLoader2,
  IconCheck,
  IconBriefcase,
  IconMessageCircle,
  IconSchool,
  IconHeart,
  IconBook,
  IconFingerprint,
  IconUserPlus,
  IconMessage,
  IconShare,
  IconBookmark,
  IconMail,
  IconLink,
  IconX,
  IconPencil,
  IconWand,
  IconBulb,
  IconBold,
  IconItalic,
  IconChevronDown,
  IconChevronUp,
  IconLayoutList,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { transformSelection, isTextStyled, stripUnicodeFont } from '@/lib/unicode-fonts';
import type { CarouselTone, CtaType } from '@/lib/ai/carousel-prompts';
import type { CanvasTemplate, CanvasSlide, CanvasTextElement } from '@/types/canvas-editor';
import type { LeftPanelTab } from '@/types/canvas-editor';

/**
 * Editable text entry for a single text element within a slide
 */
interface EditableTextEntry {
  elementId: string;
  text: string;
  /** Label hint based on font size (e.g. "Title", "Body") */
  label: string;
}

/**
 * Extract editable text entries from generated slides
 */
function extractEditableTexts(slides: CanvasSlide[]): EditableTextEntry[][] {
  return slides.map((slide) => {
    const textEls = (slide.elements || []).filter(
      (el): el is CanvasTextElement => el.type === 'text'
    );
    // Sort by fontSize descending so the title comes first
    const sorted = [...textEls].sort((a, b) => (b.fontSize || 0) - (a.fontSize || 0));
    return sorted.map((el, idx) => ({
      elementId: el.id,
      text: el.text,
      label: idx === 0 ? 'Title' : `Text ${idx}`,
    }));
  });
}

/**
 * Single slide text editor with inline formatting toolbar
 */
function SlideTextEditor({
  slideIndex,
  entries,
  onChange,
}: {
  slideIndex: number;
  entries: EditableTextEntry[];
  onChange: (slideIndex: number, elementId: string, text: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  /**
   * Apply Unicode bold or italic to the current selection in a textarea
   */
  const applyFormat = useCallback(
    (elementId: string, style: 'bold' | 'italic') => {
      const ta = textareaRefs.current.get(elementId);
      if (!ta) return;

      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      if (start === end) return; // No selection

      const selected = ta.value.slice(start, end);
      const alreadyStyled = isTextStyled(selected, style);

      let newText: string;
      let newEnd: number;

      if (alreadyStyled) {
        // Toggle off: strip back to normal
        const stripped = stripUnicodeFont(selected);
        newText = ta.value.slice(0, start) + stripped + ta.value.slice(end);
        newEnd = start + stripped.length;
      } else {
        const result = transformSelection(ta.value, start, end, style);
        newText = result.text;
        newEnd = result.newEnd;
      }

      onChange(slideIndex, elementId, newText);

      // Restore selection after React re-render
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start, newEnd);
      });
    },
    [slideIndex, onChange]
  );

  /**
   * Handle keyboard shortcuts in the textarea
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>, elementId: string) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key === 'b') {
        e.preventDefault();
        applyFormat(elementId, 'bold');
      } else if (isMod && e.key === 'i') {
        e.preventDefault();
        applyFormat(elementId, 'italic');
      }
    },
    [applyFormat]
  );

  return (
    <div className="rounded-lg border border-border/60 overflow-hidden">
      {/* Slide header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between bg-muted/50 px-3 py-2 text-xs font-semibold hover:bg-muted/80 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary">
            {slideIndex + 1}
          </span>
          Slide {slideIndex + 1}
          <Badge variant="outline" className="text-[9px] px-1 py-0">
            {entries.length} {entries.length === 1 ? 'field' : 'fields'}
          </Badge>
        </span>
        {expanded ? (
          <IconChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <IconChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="space-y-2.5 p-3">
          {entries.map((entry) => (
            <div key={entry.elementId} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {entry.label}
                </span>
                {/* Formatting toolbar */}
                <div className="flex gap-0.5">
                  <button
                    type="button"
                    title="Bold (Ctrl+B)"
                    onClick={() => applyFormat(entry.elementId, 'bold')}
                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <IconBold className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    title="Italic (Ctrl+I)"
                    onClick={() => applyFormat(entry.elementId, 'italic')}
                    className="flex h-5 w-5 items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <IconItalic className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <textarea
                ref={(el) => {
                  if (el) textareaRefs.current.set(entry.elementId, el);
                  else textareaRefs.current.delete(entry.elementId);
                }}
                value={entry.text}
                onChange={(e) => onChange(slideIndex, entry.elementId, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, entry.elementId)}
                className="w-full rounded-md border border-border/50 bg-background px-2.5 py-1.5 text-xs leading-relaxed resize-none focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
                rows={Math.max(2, Math.min(5, Math.ceil(entry.text.length / 35)))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Tone options with icons for the visual selector
 */
const TONE_OPTIONS: { value: CarouselTone; label: string; icon: React.ReactNode }[] = [
  { value: 'match-my-style', label: 'My Style', icon: <IconFingerprint className="h-3.5 w-3.5" /> },
  { value: 'professional', label: 'Professional', icon: <IconBriefcase className="h-3.5 w-3.5" /> },
  { value: 'casual', label: 'Casual', icon: <IconMessageCircle className="h-3.5 w-3.5" /> },
  { value: 'educational', label: 'Educational', icon: <IconSchool className="h-3.5 w-3.5" /> },
  { value: 'inspirational', label: 'Inspirational', icon: <IconHeart className="h-3.5 w-3.5" /> },
  { value: 'storytelling', label: 'Story', icon: <IconBook className="h-3.5 w-3.5" /> },
];

/**
 * CTA options with icons for the visual selector
 */
const CTA_OPTIONS: { value: CtaType | 'none'; label: string; icon: React.ReactNode }[] = [
  { value: 'none', label: 'None', icon: <IconX className="h-3.5 w-3.5" /> },
  { value: 'follow', label: 'Follow', icon: <IconUserPlus className="h-3.5 w-3.5" /> },
  { value: 'comment', label: 'Comment', icon: <IconMessage className="h-3.5 w-3.5" /> },
  { value: 'share', label: 'Share', icon: <IconShare className="h-3.5 w-3.5" /> },
  { value: 'save', label: 'Save', icon: <IconBookmark className="h-3.5 w-3.5" /> },
  { value: 'dm', label: 'DM', icon: <IconMail className="h-3.5 w-3.5" /> },
  { value: 'link', label: 'Link', icon: <IconLink className="h-3.5 w-3.5" /> },
];

/**
 * Animated progress messages shown during AI generation
 */
const PROGRESS_MESSAGES = [
  'Analyzing your topic...',
  'Crafting compelling headlines...',
  'Writing slide content...',
  'Polishing the language...',
  'Finalizing your carousel...',
];

/**
 * Persisted AI generation state that survives tab switches
 * Lifted up to the parent so the component can remount without losing data
 */
export interface AiGenerationState {
  pendingSlides: CanvasSlide[] | null;
  pendingCaption: string | undefined;
  editableTexts: EditableTextEntry[][];
  generatedPreview: string | null;
  hasGenerated: boolean;
  wasApplied: boolean;
  topic: string;
  tone: CarouselTone;
  ctaType: string;
}

/**
 * Default/initial AI generation state
 */
export const DEFAULT_AI_GENERATION_STATE: AiGenerationState = {
  pendingSlides: null,
  pendingCaption: undefined,
  editableTexts: [],
  generatedPreview: null,
  hasGenerated: false,
  wasApplied: false,
  topic: '',
  tone: 'professional',
  ctaType: 'follow',
};

/**
 * Props for the PanelAiGenerate component
 * @property currentTemplate - The currently selected canvas template
 * @property currentSlides - Current slides in the canvas
 * @property onGenerated - Callback invoked with generated slides
 * @property onSwitchTab - Callback to switch the left panel tab (e.g. to slides)
 * @property aiState - Persisted AI generation state from parent
 * @property onAiStateChange - Callback to update persisted AI state
 */
interface PanelAiGenerateProps {
  currentTemplate: CanvasTemplate | null;
  currentSlides: CanvasSlide[];
  onGenerated: (slides: CanvasSlide[], caption?: string) => void;
  onSwitchTab?: (tab: LeftPanelTab) => void;
  aiState: AiGenerationState;
  onAiStateChange: (state: AiGenerationState) => void;
}

/**
 * Animated generation progress overlay
 * Shows cycling progress messages with a smooth progress bar
 * @param props - Component props
 * @param props.topic - The topic being generated
 * @returns Animated progress JSX
 */
function GenerationProgress({ topic }: { topic: string }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % PROGRESS_MESSAGES.length);
    }, 2200);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 8;
      });
    }, 400);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="space-y-4 rounded-lg border bg-gradient-to-b from-primary/5 to-transparent p-4">
      {/* Animated sparkle icon */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <IconWand className="h-6 w-6 animate-pulse text-primary" />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500 ease-out"
            style={{ width: `${Math.min(progress, 95)}%` }}
          />
        </div>

        {/* Cycling message */}
        <p className="text-center text-xs font-medium text-muted-foreground transition-opacity duration-300">
          {PROGRESS_MESSAGES[messageIndex]}
        </p>
      </div>

      {/* Topic preview */}
      <p className="line-clamp-1 text-center text-[11px] text-muted-foreground/60">
        &quot;{topic}&quot;
      </p>
    </div>
  );
}

/**
 * Inline AI content generator panel
 * Simplified form with topic, tone, CTA, and generate button
 * Features visual tone/CTA selectors, animated progress, and polished layout
 * @param props - Component props
 * @param props.currentTemplate - Currently selected template
 * @param props.currentSlides - Current canvas slides
 * @param props.onGenerated - Callback for generated slides
 * @returns AI generator panel JSX
 */
export function PanelAiGenerate({
  currentTemplate,
  currentSlides,
  onGenerated,
  onSwitchTab,
  aiState,
  onAiStateChange,
}: PanelAiGenerateProps) {
  // Local UI state (doesn't need persistence)
  const [additionalContext, setAdditionalContext] = useState('');
  const [showContext, setShowContext] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Derive from persisted state
  const { pendingSlides, pendingCaption, editableTexts, generatedPreview, hasGenerated, wasApplied, topic, tone, ctaType } = aiState;

  /** Helper to update persisted state */
  const updateState = useCallback((partial: Partial<AiGenerationState>) => {
    onAiStateChange({ ...aiState, ...partial });
  }, [aiState, onAiStateChange]);

  const setTopic = useCallback((t: string) => updateState({ topic: t }), [updateState]);
  const setTone = useCallback((t: CarouselTone) => updateState({ tone: t }), [updateState]);
  const setCtaType = useCallback((c: string) => updateState({ ctaType: c }), [updateState]);

  useEffect(() => {
    if (currentTemplate?.defaultTone && !hasGenerated) {
      updateState({ tone: currentTemplate.defaultTone as CarouselTone });
    }
  }, [currentTemplate]);

  /**
   * Generate carousel content from the API
   */
  const handleGenerate = useCallback(async () => {
    // Build an effective template: use the real one, or synthesize from existing slides
    const effectiveTemplate: CanvasTemplate | null = currentTemplate || (
      currentSlides.length > 1
        ? {
            id: 'restored-session',
            name: 'Current Carousel',
            category: 'professional' as const,
            defaultSlides: currentSlides,
            brandColors: [],
            fonts: [],
          }
        : null
    );

    if (!effectiveTemplate) {
      toast.error('Please select a template first');
      return;
    }

    if (topic.trim().length < 10) {
      toast.error('Please describe your topic in more detail (min 10 chars)');
      return;
    }

    setIsGenerating(true);
    updateState({ generatedPreview: null, pendingSlides: null, wasApplied: false });

    try {
      const { analyzeTemplate } = await import('@/lib/ai/template-analyzer');
      const { buildSlidesFromContent } = await import('@/lib/ai/carousel-builder');

      const templateAnalysis = analyzeTemplate(effectiveTemplate);

      const response = await fetch('/api/ai/carousel/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          tone,
          ctaType: ctaType,
          templateAnalysis,
          additionalContext: additionalContext.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Generation failed');
      }

      const data = await response.json();

      if (!data.success || !data.slots) {
        throw new Error(data.error || 'Invalid response');
      }

      const slots = data.slots.map((s: { slotId: string; content: string }) => ({
        slotId: s.slotId,
        content: s.content,
      }));

      const result = buildSlidesFromContent(effectiveTemplate, templateAnalysis, slots);
      updateState({
        pendingSlides: result.slides,
        pendingCaption: data.caption || undefined,
        editableTexts: extractEditableTexts(result.slides),
        generatedPreview: `${result.slides.length} slides generated`,
        hasGenerated: true,
        wasApplied: false,
      });
      toast.success('Content generated! Edit the text below before applying.');
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate');
    } finally {
      setIsGenerating(false);
    }
  }, [currentTemplate, topic, tone, ctaType, additionalContext, updateState, currentSlides]);

  /**
   * Handle text changes from the slide editors
   */
  const handleTextChange = useCallback(
    (slideIndex: number, elementId: string, newText: string) => {
      const updated = [...editableTexts];
      updated[slideIndex] = updated[slideIndex].map((entry) =>
        entry.elementId === elementId ? { ...entry, text: newText } : entry
      );
      updateState({ editableTexts: updated });
    },
    [editableTexts, updateState]
  );

  /**
   * Apply generated slides (with user edits) to the editor
   */
  const handleApply = useCallback(() => {
    if (!pendingSlides) return;

    // Merge edited text back into the pending slides
    const finalSlides = pendingSlides.map((slide, slideIdx) => {
      const slideEdits = editableTexts[slideIdx];
      if (!slideEdits || slideEdits.length === 0) return slide;

      // Build a map of elementId → edited text
      const editMap = new Map(slideEdits.map((e) => [e.elementId, e.text]));

      return {
        ...slide,
        elements: (slide.elements || []).map((el) => {
          if (el.type !== 'text') return el;
          const edited = editMap.get(el.id);
          if (edited !== undefined) {
            return { ...el, text: edited };
          }
          return el;
        }),
      };
    });

    onGenerated(finalSlides, pendingCaption);
    updateState({ wasApplied: true });
    toast.success('Content applied to carousel!');
  }, [pendingSlides, editableTexts, pendingCaption, onGenerated, updateState]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b bg-gradient-to-r from-primary/5 via-transparent to-transparent px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
            <IconSparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          AI Generate
        </h3>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Describe your topic and let AI create content
        </p>
      </div>

      {/* Content */}
      <div className="relative flex-1 min-h-0">
        <ScrollArea className="absolute inset-0">
          <div className="space-y-4 p-4">
            {/* No template warning - only show if no template AND no existing slides with content */}
            {!currentTemplate && currentSlides.length <= 1 && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                <IconBulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Select a template first to generate AI content.
                </p>
              </div>
            )}

            {/* Generation progress */}
            {isGenerating && <GenerationProgress topic={topic} />}

            {/* Topic input section */}
            {!isGenerating && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    What&apos;s your carousel about?
                  </Label>
                  <div className="relative">
                    <Textarea
                      placeholder="e.g., 5 productivity tips for remote workers that actually work..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="min-h-[80px] resize-none border-muted-foreground/20 text-xs transition-colors focus:border-primary/50"
                      rows={3}
                    />
                    {topic.length > 0 && topic.length < 10 && (
                      <span className="absolute bottom-2 right-2 text-[10px] text-muted-foreground">
                        {10 - topic.length} more chars needed
                      </span>
                    )}
                  </div>
                </div>

                {/* Tone selector - visual pill buttons */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Tone</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {TONE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTone(opt.value)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all',
                          tone === opt.value
                            ? 'border-primary bg-primary/10 text-primary shadow-sm'
                            : 'border-border text-muted-foreground hover:border-primary/30 hover:bg-accent/50'
                        )}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CTA selector - compact grid */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Call-to-Action</Label>
                  <div className="grid grid-cols-4 gap-1">
                    {CTA_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setCtaType(opt.value)}
                        className={cn(
                          'flex flex-col items-center gap-0.5 rounded-md border p-1.5 text-[10px] font-medium transition-all',
                          ctaType === opt.value
                            ? 'border-primary bg-primary/10 text-primary shadow-sm'
                            : 'border-border text-muted-foreground hover:border-primary/30 hover:bg-accent/50'
                        )}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional context - collapsible */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowContext(!showContext)}
                    className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span className="flex items-center gap-1">
                      <IconBulb className="h-3 w-3" />
                      Additional Context
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      Optional
                    </Badge>
                  </button>
                  {showContext && (
                    <Textarea
                      placeholder="e.g., Include a statistic about AI adoption, mention my SaaS product..."
                      value={additionalContext}
                      onChange={(e) => setAdditionalContext(e.target.value)}
                      className="min-h-[56px] resize-none text-xs"
                      rows={2}
                    />
                  )}
                </div>

                {/* Generate button */}
                <Button
                  onClick={handleGenerate}
                  disabled={(!currentTemplate && currentSlides.length <= 1) || topic.trim().length < 10 || isGenerating}
                  className={cn(
                    'w-full shadow-sm transition-all hover:shadow-md',
                    hasGenerated
                      ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                      : 'bg-gradient-to-r from-primary to-primary/80'
                  )}
                  size="sm"
                >
                  <IconSparkles className="mr-2 h-4 w-4" />
                  {hasGenerated ? 'Regenerate Content' : 'Generate Content'}
                </Button>
              </>
            )}

            {/* Generated content editor */}
            {generatedPreview && pendingSlides && !isGenerating && (
              <div className="space-y-3">
                {/* Success header */}
                <div className={cn(
                  'flex items-center gap-2 rounded-lg border p-2.5',
                  wasApplied
                    ? 'border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20'
                    : 'border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/20'
                )}>
                  <div className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full',
                    wasApplied ? 'bg-blue-500/20' : 'bg-green-500/20'
                  )}>
                    <IconCheck className={cn(
                      'h-3 w-3',
                      wasApplied ? 'text-blue-600 dark:text-blue-400' : 'text-green-600 dark:text-green-400'
                    )} />
                  </div>
                  <span className={cn(
                    'text-[11px] font-medium',
                    wasApplied ? 'text-blue-700 dark:text-blue-400' : 'text-green-700 dark:text-green-400'
                  )}>
                    {wasApplied
                      ? `${generatedPreview} — applied to canvas`
                      : `${generatedPreview} — edit below, then apply`}
                  </span>
                </div>

                {/* View Slides button */}
                {onSwitchTab && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => onSwitchTab('slides')}
                  >
                    <IconLayoutList className="mr-2 h-3.5 w-3.5" />
                    View Slides
                  </Button>
                )}

                {/* Formatting hint */}
                <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <IconPencil className="h-3 w-3" />
                  Select text and use <kbd className="rounded border bg-muted px-1 py-0.5 text-[9px] font-mono">Ctrl+B</kbd> for bold, <kbd className="rounded border bg-muted px-1 py-0.5 text-[9px] font-mono">Ctrl+I</kbd> for italic
                </p>

                {/* Editable slide text editors */}
                <div className="space-y-2">
                  {editableTexts.map((entries, slideIdx) => (
                    <SlideTextEditor
                      key={slideIdx}
                      slideIndex={slideIdx}
                      entries={entries}
                      onChange={handleTextChange}
                    />
                  ))}
                </div>

                {/* Apply button */}
                <Button
                  onClick={handleApply}
                  size="sm"
                  className="w-full"
                  variant={wasApplied ? 'outline' : 'default'}
                >
                  <IconCheck className="mr-2 h-3.5 w-3.5" />
                  {wasApplied ? 'Re-apply to Canvas' : 'Apply to Canvas'}
                </Button>
              </div>
            )}

          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
