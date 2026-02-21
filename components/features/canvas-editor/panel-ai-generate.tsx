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
  IconSettings,
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
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { CarouselTone, CtaType } from '@/lib/ai/carousel-prompts';
import type { CanvasTemplate, CanvasSlide } from '@/types/canvas-editor';

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
 * Props for the PanelAiGenerate component
 * @property currentTemplate - The currently selected canvas template
 * @property currentSlides - Current slides in the canvas
 * @property onGenerated - Callback invoked with generated slides
 * @property onOpenAdvanced - Callback to open the advanced generation dialog
 */
interface PanelAiGenerateProps {
  currentTemplate: CanvasTemplate | null;
  currentSlides: CanvasSlide[];
  onGenerated: (slides: CanvasSlide[]) => void;
  onOpenAdvanced: () => void;
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
 * @param props.onOpenAdvanced - Callback to open advanced dialog
 * @returns AI generator panel JSX
 */
export function PanelAiGenerate({
  currentTemplate,
  currentSlides,
  onGenerated,
  onOpenAdvanced,
}: PanelAiGenerateProps) {
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<CarouselTone>('professional');
  const [ctaType, setCtaType] = useState<string>('follow');
  const [additionalContext, setAdditionalContext] = useState('');
  const [showContext, setShowContext] = useState(false);

  useEffect(() => {
    if (currentTemplate?.defaultTone) {
      setTone(currentTemplate.defaultTone as CarouselTone);
    }
  }, [currentTemplate]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  const [pendingSlides, setPendingSlides] = useState<CanvasSlide[] | null>(null);

  /**
   * Generate carousel content from the API
   */
  const handleGenerate = useCallback(async () => {
    if (!currentTemplate) {
      toast.error('Please select a template first');
      return;
    }

    if (topic.trim().length < 10) {
      toast.error('Please describe your topic in more detail (min 10 chars)');
      return;
    }

    setIsGenerating(true);
    setGeneratedPreview(null);
    setPendingSlides(null);

    try {
      const { analyzeTemplate } = await import('@/lib/ai/template-analyzer');
      const { buildSlidesFromContent } = await import('@/lib/ai/carousel-builder');

      const templateAnalysis = analyzeTemplate(currentTemplate);

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

      const result = buildSlidesFromContent(currentTemplate, templateAnalysis, slots);
      setPendingSlides(result.slides);
      setGeneratedPreview(`${result.slides.length} slides generated`);
      toast.success('Content generated!');
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate');
    } finally {
      setIsGenerating(false);
    }
  }, [currentTemplate, topic, tone, ctaType, additionalContext]);

  /**
   * Apply generated slides to the editor
   */
  const handleApply = useCallback(() => {
    if (pendingSlides) {
      onGenerated(pendingSlides);
      setGeneratedPreview(null);
      setPendingSlides(null);
      setTopic('');
      toast.success('Content applied to carousel!');
    }
  }, [pendingSlides, onGenerated]);

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
            {/* No template warning */}
            {!currentTemplate && (
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
                  disabled={!currentTemplate || topic.trim().length < 10 || isGenerating}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 shadow-sm transition-all hover:shadow-md"
                  size="sm"
                >
                  <IconSparkles className="mr-2 h-4 w-4" />
                  Generate Content
                </Button>
              </>
            )}

            {/* Generated preview */}
            {generatedPreview && pendingSlides && !isGenerating && (
              <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900/50 dark:bg-green-950/20">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
                    <IconCheck className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-xs font-medium text-green-700 dark:text-green-400">
                    {generatedPreview}
                  </span>
                </div>

                {/* Mini slide previews */}
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {pendingSlides.map((slide, i) => (
                    <div
                      key={slide.id}
                      className="h-8 w-8 shrink-0 rounded border border-border/50"
                      style={{ backgroundColor: slide.backgroundColor || '#fff' }}
                    >
                      <div className="flex h-full items-center justify-center text-[8px] font-bold opacity-40">
                        {i + 1}
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleApply}
                  size="sm"
                  className="w-full"
                >
                  <IconCheck className="mr-2 h-3.5 w-3.5" />
                  Apply to Canvas
                </Button>
              </div>
            )}

            {/* Advanced options link */}
            <button
              type="button"
              onClick={onOpenAdvanced}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-muted-foreground/25 py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent/50 hover:text-foreground"
            >
              <IconSettings className="h-3.5 w-3.5" />
              Advanced Multi-Step Generator
            </button>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
