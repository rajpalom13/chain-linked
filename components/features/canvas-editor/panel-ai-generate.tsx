'use client';

/**
 * AI Generate Panel Component
 * Inline AI content generator for the editor left panel
 * @module components/features/canvas-editor/panel-ai-generate
 */

import { useState, useCallback, useEffect } from 'react';
import {
  IconSparkles,
  IconLoader2,
  IconCheck,
  IconSettings,
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import type { CarouselTone, CtaType } from '@/lib/ai/carousel-prompts';
import type { CanvasTemplate, CanvasSlide } from '@/types/canvas-editor';

const TONE_OPTIONS: { value: CarouselTone; label: string }[] = [
  { value: 'match-my-style', label: 'Match My Style' },
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'educational', label: 'Educational' },
  { value: 'inspirational', label: 'Inspirational' },
  { value: 'storytelling', label: 'Storytelling' },
];

const CTA_OPTIONS: { value: CtaType | 'none'; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'follow', label: 'Follow me' },
  { value: 'comment', label: 'Comment below' },
  { value: 'share', label: 'Share this' },
  { value: 'save', label: 'Save for later' },
  { value: 'dm', label: 'DM me' },
  { value: 'link', label: 'Link in bio' },
];

/**
 * Props for the PanelAiGenerate component
 */
interface PanelAiGenerateProps {
  currentTemplate: CanvasTemplate | null;
  currentSlides: CanvasSlide[];
  onGenerated: (slides: CanvasSlide[]) => void;
  onOpenAdvanced: () => void;
}

/**
 * Inline AI content generator panel
 * Simplified form with topic, tone, CTA, and generate button
 * @param props - Component props
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
      <div className="shrink-0 border-b px-4 py-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <IconSparkles className="h-4 w-4 text-primary" />
          AI Generate
        </h3>
      </div>

      {/* Content */}
      <div className="relative flex-1 min-h-0">
        <ScrollArea className="absolute inset-0">
          <div className="space-y-4 p-4">
          {!currentTemplate && (
            <p className="text-xs text-muted-foreground">
              Select a template first to generate AI content.
            </p>
          )}

          {/* Topic */}
          <div className="space-y-1.5">
            <Label className="text-xs">Topic</Label>
            <Textarea
              placeholder="e.g., 5 productivity tips for remote workers..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="min-h-[72px] resize-none text-xs"
              rows={3}
            />
          </div>

          {/* Tone */}
          <div className="space-y-1.5">
            <Label className="text-xs">Tone</Label>
            <Select value={tone} onValueChange={(v) => setTone(v as CarouselTone)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* CTA */}
          <div className="space-y-1.5">
            <Label className="text-xs">Call-to-Action</Label>
            <Select value={ctaType} onValueChange={setCtaType}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CTA_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Context */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Additional Context
              <span className="text-muted-foreground ml-1">(Optional)</span>
            </Label>
            <Textarea
              placeholder="e.g., Include a statistic about AI adoption, mention my SaaS product..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              className="min-h-[56px] resize-none text-xs"
              rows={2}
            />
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={!currentTemplate || topic.trim().length < 10 || isGenerating}
            className="w-full"
            size="sm"
          >
            {isGenerating ? (
              <>
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <IconSparkles className="mr-2 h-4 w-4" />
                Generate
              </>
            )}
          </Button>

          {/* Generated preview */}
          {generatedPreview && pendingSlides && (
            <div className="rounded-md border bg-muted/50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium">
                <IconCheck className="h-4 w-4 text-green-500" />
                {generatedPreview}
              </div>
              <Button
                onClick={handleApply}
                size="sm"
                className="w-full"
              >
                Apply to Canvas
              </Button>
            </div>
          )}

          {/* Advanced options link */}
          <button
            type="button"
            onClick={onOpenAdvanced}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed py-2 text-xs text-muted-foreground hover:bg-accent/50 transition-colors"
          >
            <IconSettings className="h-3.5 w-3.5" />
            Advanced Options
          </button>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
