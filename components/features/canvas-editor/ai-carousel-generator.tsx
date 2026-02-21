'use client';

/**
 * AI Carousel Generator Component
 * Dialog for generating carousel slide content using AI
 * Supports topic input, slide count, tone selection, and optional template application
 * Features polished UI with visual tone selector, animated progress, and modern styling
 * @module components/features/canvas-editor/ai-carousel-generator
 */

import { useState, useCallback, useEffect } from 'react';
import {
  IconSparkles,
  IconLoader2,
  IconAlertTriangle,
  IconBriefcase,
  IconMessageCircle,
  IconSchool,
  IconHeart,
  IconWand,
  IconCheck,
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { canvasTemplates } from '@/lib/canvas-templates';
import type {
  CanvasSlide,
  CanvasTextElement,
  CanvasTemplate,
} from '@/types/canvas-editor';

/**
 * Available tone options with icons and descriptions for the visual selector
 */
const TONE_OPTIONS = [
  {
    value: 'professional' as const,
    label: 'Professional',
    description: 'Formal & authoritative',
    icon: <IconBriefcase className="h-4 w-4" />,
  },
  {
    value: 'casual' as const,
    label: 'Casual',
    description: 'Friendly & relatable',
    icon: <IconMessageCircle className="h-4 w-4" />,
  },
  {
    value: 'educational' as const,
    label: 'Educational',
    description: 'Clear & instructive',
    icon: <IconSchool className="h-4 w-4" />,
  },
  {
    value: 'inspirational' as const,
    label: 'Inspirational',
    description: 'Motivating & uplifting',
    icon: <IconHeart className="h-4 w-4" />,
  },
];

/**
 * Tone type derived from the tone options
 */
type ToneOption = (typeof TONE_OPTIONS)[number]['value'];

/**
 * Props for the AiCarouselGenerator component
 * @property open - Whether the dialog is open
 * @property onOpenChange - Callback for open state changes
 * @property onGenerated - Callback with the generated slides
 */
export interface AiCarouselGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (slides: CanvasSlide[]) => void;
}

/**
 * AI-parsed slide content structure
 */
interface ParsedSlideContent {
  title: string;
  body: string;
  slideType: 'hook' | 'content' | 'cta';
}

/**
 * Animated progress messages for the generation overlay
 */
const GENERATION_STEPS = [
  { label: 'Understanding your topic', duration: 2000 },
  { label: 'Crafting compelling headlines', duration: 2500 },
  { label: 'Writing slide content', duration: 3000 },
  { label: 'Polishing language & flow', duration: 2000 },
  { label: 'Finalizing your carousel', duration: 1500 },
];

/**
 * Generate a unique ID for elements and slides
 * @returns A unique string ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Determine font size based on text length
 * Shorter text gets larger fonts, longer text gets smaller fonts
 * @param text - The text to size
 * @param role - Whether this is a title or body text
 * @returns Appropriate font size in pixels
 */
function getSmartFontSize(text: string, role: 'title' | 'body'): number {
  const length = text.length;
  if (role === 'title') {
    if (length <= 20) return 72;
    if (length <= 40) return 56;
    if (length <= 60) return 48;
    return 40;
  }
  // body
  if (length <= 80) return 32;
  if (length <= 150) return 28;
  if (length <= 250) return 24;
  return 22;
}

/**
 * Build the AI system prompt for carousel content generation
 * @param slideCount - Number of slides to generate
 * @param tone - Desired tone for the content
 * @returns System prompt string
 */
function buildCarouselSystemPrompt(slideCount: number, tone: ToneOption): string {
  return `You are an expert LinkedIn carousel content creator. Generate content for a ${slideCount}-slide LinkedIn carousel.

## Structure
- Slide 1: Hook/Title slide - A compelling headline that stops scrollers
- Slides 2 to ${slideCount - 1}: Content slides - Each with a clear heading and supporting text
- Slide ${slideCount}: CTA slide - A call-to-action encouraging engagement

## Tone
Use a ${tone} tone throughout.

## Output Format
Return ONLY a JSON array with exactly ${slideCount} objects. Each object must have:
- "title": string (slide heading, 3-8 words)
- "body": string (supporting text, 1-3 sentences)
- "slideType": "hook" | "content" | "cta"

Example:
[
  {"title": "Your Hook Here", "body": "Supporting context that draws people in.", "slideType": "hook"},
  {"title": "Key Point", "body": "Explanation of the point with value.", "slideType": "content"},
  {"title": "Take Action", "body": "Follow for more insights like this.", "slideType": "cta"}
]

Return ONLY valid JSON. No markdown, no code blocks, no extra text.`;
}

/**
 * Parse the AI response into structured slide content
 * @param responseText - Raw AI response text
 * @param slideCount - Expected number of slides
 * @returns Array of parsed slide content
 * @throws Error if parsing fails
 */
function parseAiResponse(responseText: string, slideCount: number): ParsedSlideContent[] {
  // Try to extract JSON from the response
  let jsonString = responseText.trim();

  // Remove markdown code fences if present
  if (jsonString.startsWith('```')) {
    jsonString = jsonString.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  // Find JSON array in response
  const arrayMatch = jsonString.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    jsonString = arrayMatch[0];
  }

  const parsed = JSON.parse(jsonString);

  if (!Array.isArray(parsed)) {
    throw new Error('Response is not an array');
  }

  return parsed.slice(0, slideCount).map((item: Record<string, unknown>, index: number) => ({
    title: typeof item.title === 'string' ? item.title : `Slide ${index + 1}`,
    body: typeof item.body === 'string' ? item.body : '',
    slideType:
      index === 0
        ? 'hook' as const
        : index === parsed.length - 1
          ? 'cta' as const
          : 'content' as const,
  }));
}

/**
 * Convert parsed slide content into CanvasSlide objects
 * Uses smart font sizing and applies template colors if provided
 * @param content - Array of parsed slide content
 * @param template - Optional template to apply visual styling from
 * @returns Array of CanvasSlide objects
 */
function contentToSlides(
  content: ParsedSlideContent[],
  template?: CanvasTemplate
): CanvasSlide[] {
  // Default colors per slide type
  const defaultColors = {
    hook: { bg: '#1e293b', titleColor: '#ffffff', bodyColor: '#94a3b8' },
    content: { bg: '#ffffff', titleColor: '#1e293b', bodyColor: '#475569' },
    cta: { bg: '#3b82f6', titleColor: '#ffffff', bodyColor: '#e0f2fe' },
  };

  // If a template is provided, try to use its styling
  const getSlideStyle = (type: ParsedSlideContent['slideType'], index: number) => {
    if (template && template.defaultSlides[index]) {
      const templateSlide = template.defaultSlides[index];
      return {
        bg: templateSlide.backgroundColor,
        titleColor: template.brandColors[0] === templateSlide.backgroundColor
          ? template.brandColors[1] || '#ffffff'
          : template.brandColors[0] || '#ffffff',
        bodyColor: template.brandColors[3] || template.brandColors[2] || '#94a3b8',
      };
    }
    return defaultColors[type];
  };

  return content.map((slide, index) => {
    const style = getSlideStyle(slide.slideType, index);
    const titleFontSize = getSmartFontSize(slide.title, 'title');
    const bodyFontSize = getSmartFontSize(slide.body, 'body');

    const elements: CanvasTextElement[] = [];

    // Slide number for content slides
    if (slide.slideType === 'content') {
      elements.push({
        id: generateId(),
        type: 'text',
        x: 80,
        y: 80,
        width: 200,
        height: 40,
        rotation: 0,
        text: String(index).padStart(2, '0'),
        fontSize: 18,
        fontFamily: 'Inter',
        fontWeight: 'bold',
        fill: style.bodyColor,
        align: 'left',
      });
    }

    // Title element
    const titleY = slide.slideType === 'hook' ? 340 : slide.slideType === 'cta' ? 360 : 180;
    elements.push({
      id: generateId(),
      type: 'text',
      x: 80,
      y: titleY,
      width: 920,
      height: titleFontSize * 2.5,
      rotation: 0,
      text: slide.title,
      fontSize: titleFontSize,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fill: style.titleColor,
      align: slide.slideType === 'cta' ? 'center' : 'left',
      lineHeight: 1.15,
    });

    // Body element
    const bodyY = titleY + titleFontSize * 2.5 + 30;
    elements.push({
      id: generateId(),
      type: 'text',
      x: 80,
      y: bodyY,
      width: 920,
      height: 300,
      rotation: 0,
      text: slide.body,
      fontSize: bodyFontSize,
      fontFamily: 'Inter',
      fontWeight: 'normal',
      fill: style.bodyColor,
      align: slide.slideType === 'cta' ? 'center' : 'left',
      lineHeight: 1.6,
    });

    return {
      id: generateId(),
      elements,
      backgroundColor: style.bg,
    };
  });
}

/**
 * Animated generation overlay with step-by-step progress
 * @param props - Component props
 * @param props.slideCount - Number of slides being generated
 * @param props.topic - Topic being generated about
 * @returns Animated progress overlay JSX
 */
function GenerationOverlay({
  slideCount,
  topic,
}: {
  slideCount: number;
  topic: string;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStepIndex((prev) =>
        prev < GENERATION_STEPS.length - 1 ? prev + 1 : prev
      );
    }, 2200);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) return prev;
        return prev + Math.random() * 6;
      });
    }, 350);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-5 py-8">
      {/* Animated icon */}
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
          <IconWand className="h-8 w-8 animate-pulse text-primary" />
        </div>
      </div>

      {/* Main text */}
      <div className="text-center">
        <p className="font-semibold">Generating your carousel...</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Creating {slideCount} slides about &quot;{topic.substring(0, 40)}
          {topic.length > 40 ? '...' : ''}&quot;
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500 ease-out"
            style={{ width: `${Math.min(progress, 95)}%` }}
          />
        </div>
      </div>

      {/* Step indicators */}
      <div className="w-full max-w-xs space-y-1.5">
        {GENERATION_STEPS.map((step, i) => (
          <div
            key={step.label}
            className={cn(
              'flex items-center gap-2 text-xs transition-all duration-300',
              i < stepIndex
                ? 'text-muted-foreground'
                : i === stepIndex
                  ? 'font-medium text-primary'
                  : 'text-muted-foreground/40'
            )}
          >
            {i < stepIndex ? (
              <IconCheck className="h-3.5 w-3.5 text-green-500" />
            ) : i === stepIndex ? (
              <IconLoader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/20" />
            )}
            {step.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * AI Carousel Generator Dialog
 * Provides a form for generating carousel content using AI
 * Features visual tone selection, animated slide count stepper,
 * and step-by-step generation progress
 * @param props - Component props
 * @param props.open - Whether the dialog is open
 * @param props.onOpenChange - Callback for open state changes
 * @param props.onGenerated - Callback invoked with generated slides
 * @returns JSX element rendering the AI generation dialog
 */
export function AiCarouselGenerator({
  open,
  onOpenChange,
  onGenerated,
}: AiCarouselGeneratorProps) {
  const [topic, setTopic] = useState('');
  const [slideCount, setSlideCount] = useState(5);
  const [tone, setTone] = useState<ToneOption>('professional');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('none');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle the generate button click
   * Calls the AI API and processes the response into slides
   */
  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) {
      setError('Please enter a topic for your carousel.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const systemPrompt = buildCarouselSystemPrompt(slideCount, tone);

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: `Create a ${slideCount}-slide LinkedIn carousel about: ${topic}`,
          tone,
          length: 'medium',
          context: systemPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: string }).error || `Generation failed (${response.status})`
        );
      }

      const data = await response.json() as { content: string };
      const parsedContent = parseAiResponse(data.content, slideCount);

      // Optionally apply template styling
      const template =
        selectedTemplateId !== 'none'
          ? canvasTemplates.find((t) => t.id === selectedTemplateId)
          : undefined;

      const slides = contentToSlides(parsedContent, template);

      onGenerated(slides);
      onOpenChange(false);

      toast.success('Carousel generated successfully', {
        description: `Created ${slides.length} slides about "${topic}"`,
      });

      // Reset form
      setTopic('');
      setSlideCount(5);
      setTone('professional');
      setSelectedTemplateId('none');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to generate carousel content.';
      setError(message);
      toast.error('Generation failed', { description: message });
    } finally {
      setIsGenerating(false);
    }
  }, [topic, slideCount, tone, selectedTemplateId, onGenerated, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={isGenerating ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <IconSparkles className="h-4 w-4 text-primary" />
            </div>
            AI Carousel Generator
          </DialogTitle>
          <DialogDescription>
            Enter a topic and let AI create carousel slide content for you.
          </DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          <GenerationOverlay slideCount={slideCount} topic={topic} />
        ) : (
          <div className="space-y-5 py-2">
            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3">
                <IconAlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Topic input - larger and more prominent */}
            <div className="space-y-2">
              <Label htmlFor="ai-topic" className="font-medium">
                Topic
              </Label>
              <Textarea
                id="ai-topic"
                placeholder="e.g., 5 habits of successful leaders that set them apart from the rest..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.metaKey && !isGenerating) {
                    handleGenerate();
                  }
                }}
                className="min-h-[80px] resize-none text-sm transition-colors focus:border-primary/50"
                rows={3}
              />
              <p className="text-[11px] text-muted-foreground">
                Be specific for better results. Press {'\u2318'}+Enter to generate.
              </p>
            </div>

            {/* Slide count - visual stepper with preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Number of Slides</Label>
                <Badge variant="secondary" className="font-mono text-xs tabular-nums">
                  {slideCount} slides
                </Badge>
              </div>
              <Slider
                value={[slideCount]}
                onValueChange={(value) => setSlideCount(value[0])}
                min={3}
                max={10}
                step={1}
              />
              {/* Visual slide indicator dots */}
              <div className="flex items-center justify-center gap-1.5">
                {Array.from({ length: slideCount }, (_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-2 rounded-full transition-all duration-300',
                      i === 0
                        ? 'w-4 bg-primary'
                        : i === slideCount - 1
                          ? 'w-4 bg-blue-400'
                          : 'w-2.5 bg-muted-foreground/30'
                    )}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>3 min</span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-1.5 w-3 rounded-full bg-primary" /> Hook
                  <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/30" /> Content
                  <span className="ml-2 inline-block h-1.5 w-3 rounded-full bg-blue-400" /> CTA
                </span>
                <span>10 max</span>
              </div>
            </div>

            {/* Tone - visual card selector */}
            <div className="space-y-2.5">
              <Label className="font-medium">Tone</Label>
              <div className="grid grid-cols-2 gap-2">
                {TONE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTone(option.value)}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg border-2 p-3 text-left transition-all',
                      'hover:border-primary/40',
                      tone === option.value
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors',
                        tone === option.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {option.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium">{option.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Template selection (optional) */}
            <div className="space-y-2">
              <Label className="font-medium">
                Visual Template
                <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 font-normal">
                  Optional
                </Badge>
              </Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No template - use default styling" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No template - use default styling</SelectItem>
                  {canvasTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Apply a template&apos;s color scheme to the generated content.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {!isGenerating && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!topic.trim()}
                className="bg-gradient-to-r from-primary to-primary/80 shadow-sm"
              >
                <IconSparkles className="mr-2 h-4 w-4" />
                Generate Carousel
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
