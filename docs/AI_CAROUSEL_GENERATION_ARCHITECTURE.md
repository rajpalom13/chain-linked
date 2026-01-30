# AI Carousel Generation Architecture

## Feature Overview

**Goal**: Allow users to describe what they want a carousel for, select a template, and have AI automatically fill all template slides with relevant, high-quality content.

**User Flow**:
1. User clicks "AI Generate" in canvas editor
2. User enters a detailed topic/purpose description
3. User selects a template from available options
4. AI analyzes the template structure and generates content for each slide
5. Generated content fills the exact template layout
6. User can edit/refine the generated carousel

---

## Architecture Design

### System Components

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI Carousel Generator                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐     ┌──────────────────┐     ┌───────────────┐ │
│  │   User Input    │────▶│ Template Analyzer │────▶│ Prompt Builder│ │
│  │   - Topic       │     │ - Extract slots   │     │ - System msg  │ │
│  │   - Template    │     │ - Element types   │     │ - User msg    │ │
│  │   - Tone        │     │ - Slide purposes  │     │ - Examples    │ │
│  │   - Audience    │     └──────────────────┘     └───────────────┘ │
│  └─────────────────┘                                      │         │
│                                                           ▼         │
│  ┌─────────────────┐     ┌──────────────────┐     ┌───────────────┐ │
│  │  Slide Builder  │◀────│ Content Parser   │◀────│  AI Service   │ │
│  │  - Fill slots   │     │ - JSON extraction│     │ - OpenRouter  │ │
│  │  - Apply styles │     │ - Validation     │     │ - GPT-4       │ │
│  │  - Positioning  │     │ - Error handling │     │ - Streaming   │ │
│  └─────────────────┘     └──────────────────┘     └───────────────┘ │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    Canvas Editor                                 ││
│  │                    (Existing Component)                          ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### 1. Template Slot Definition

```typescript
/**
 * Defines a fillable slot in a template
 */
interface TemplateSlot {
  /** Unique identifier for this slot */
  id: string;
  /** Slide index (0-based) */
  slideIndex: number;
  /** Element ID within the slide */
  elementId: string;
  /** Type of content expected */
  type: 'title' | 'subtitle' | 'body' | 'bullet' | 'number' | 'cta' | 'author';
  /** Character limit for this slot */
  maxLength: number;
  /** Placeholder/example content */
  placeholder: string;
  /** Purpose description for AI */
  purpose: string;
  /** Whether this slot is required */
  required: boolean;
}

/**
 * Template analysis result
 */
interface TemplateAnalysis {
  templateId: string;
  templateName: string;
  totalSlides: number;
  slideBreakdown: SlideBreakdown[];
  slots: TemplateSlot[];
  brandColors: string[];
  fonts: string[];
}

/**
 * Individual slide analysis
 */
interface SlideBreakdown {
  index: number;
  purpose: 'hook' | 'content' | 'data' | 'quote' | 'cta' | 'intro' | 'conclusion';
  elements: number;
  hasImage: boolean;
  backgroundColor: string;
}
```

### 2. Generation Request

```typescript
/**
 * User input for AI generation
 */
interface CarouselGenerationRequest {
  /** Main topic or purpose */
  topic: string;
  /** Target audience description */
  audience?: string;
  /** Key points to include */
  keyPoints?: string[];
  /** Content tone */
  tone: 'professional' | 'casual' | 'educational' | 'inspirational' | 'storytelling';
  /** Industry/niche context */
  industry?: string;
  /** Selected template ID */
  templateId: string;
  /** Call-to-action preference */
  ctaType?: 'follow' | 'comment' | 'share' | 'link' | 'dm' | 'custom';
  /** Custom CTA text if type is custom */
  customCta?: string;
}
```

### 3. Generation Response

```typescript
/**
 * AI-generated content for slots
 */
interface GeneratedSlotContent {
  slotId: string;
  content: string;
  confidence: number; // 0-1 quality score
}

/**
 * Complete generation result
 */
interface CarouselGenerationResult {
  success: boolean;
  slots: GeneratedSlotContent[];
  suggestedTitle: string;
  metadata: {
    tokensUsed: number;
    generationTime: number;
    model: string;
  };
  error?: string;
}
```

---

## Template Analysis System

### Slot Detection Algorithm

```typescript
/**
 * Analyzes a template to extract fillable slots
 */
function analyzeTemplate(template: CanvasTemplate): TemplateAnalysis {
  const slots: TemplateSlot[] = [];

  template.defaultSlides.forEach((slide, slideIndex) => {
    // Determine slide purpose based on position and content
    const purpose = detectSlidePurpose(slide, slideIndex, template.defaultSlides.length);

    slide.elements.forEach(element => {
      if (element.type === 'text') {
        const slot = analyzeTextElement(element, slideIndex, purpose);
        if (slot) slots.push(slot);
      }
    });
  });

  return {
    templateId: template.id,
    templateName: template.name,
    totalSlides: template.defaultSlides.length,
    slideBreakdown: analyzeSlides(template.defaultSlides),
    slots,
    brandColors: template.brandColors,
    fonts: template.fonts
  };
}

/**
 * Detects the purpose of a slide based on position and content
 */
function detectSlidePurpose(
  slide: CanvasSlide,
  index: number,
  total: number
): SlideBreakdown['purpose'] {
  if (index === 0) return 'hook';
  if (index === total - 1) return 'cta';

  // Analyze elements to determine purpose
  const hasLargeNumber = slide.elements.some(el =>
    el.type === 'text' &&
    el.fontSize && el.fontSize >= 72 &&
    /^\d+$/.test(el.text?.trim() || '')
  );

  if (hasLargeNumber) return 'content';

  // Check for quote indicators
  const hasQuoteMarks = slide.elements.some(el =>
    el.type === 'text' && el.text?.includes('"')
  );

  if (hasQuoteMarks) return 'quote';

  return 'content';
}

/**
 * Analyzes a text element to create a slot definition
 */
function analyzeTextElement(
  element: CanvasTextElement,
  slideIndex: number,
  slidePurpose: string
): TemplateSlot | null {
  const text = element.text || '';

  // Skip decorative elements (single characters, numbers for styling)
  if (text.length <= 2 && /^[\d\W]+$/.test(text)) return null;

  // Determine slot type based on font size and position
  const fontSize = element.fontSize || 32;
  let type: TemplateSlot['type'];
  let maxLength: number;

  if (fontSize >= 56) {
    type = 'title';
    maxLength = 60;
  } else if (fontSize >= 40) {
    type = 'subtitle';
    maxLength = 100;
  } else if (fontSize >= 28) {
    type = 'body';
    maxLength = 250;
  } else {
    type = 'body';
    maxLength = 300;
  }

  // Special case for CTA slides
  if (slidePurpose === 'cta') {
    if (fontSize >= 48) type = 'cta';
  }

  return {
    id: `slot-${slideIndex}-${element.id}`,
    slideIndex,
    elementId: element.id,
    type,
    maxLength,
    placeholder: text,
    purpose: generateSlotPurpose(type, slidePurpose, slideIndex),
    required: type === 'title' || type === 'cta'
  };
}
```

---

## AI Prompt Engineering

### System Prompt Template

```typescript
const CAROUSEL_SYSTEM_PROMPT = `You are an expert LinkedIn carousel content creator. Your task is to generate engaging, professional content that fills a carousel template.

## Your Goals:
1. Create content that hooks readers on slide 1
2. Deliver valuable insights in the middle slides
3. End with a compelling call-to-action

## Content Guidelines:
- Write in a {{TONE}} tone
- Target audience: {{AUDIENCE}}
- Industry context: {{INDUSTRY}}
- Keep each piece of content within its character limit
- Use power words and emotional triggers
- Make each slide self-contained but connected to the narrative

## Template Structure:
{{TEMPLATE_STRUCTURE}}

## Output Format:
Return a JSON object with slot IDs as keys and generated content as values:
{
  "slot-0-title": "Your hook title here",
  "slot-0-subtitle": "Engaging subtitle",
  "slot-1-heading": "First key point",
  ...
}

## Quality Requirements:
- No generic or filler content
- Specific, actionable insights
- Conversational but professional
- LinkedIn-optimized formatting
- No hashtags in slides (save for final post)`;
```

### User Prompt Template

```typescript
const CAROUSEL_USER_PROMPT = `Generate content for a LinkedIn carousel about:

**Topic**: {{TOPIC}}

**Key Points to Cover** (if any):
{{KEY_POINTS}}

**Call-to-Action Type**: {{CTA_TYPE}}

**Slots to Fill**:
{{SLOTS_JSON}}

Generate compelling content for each slot. Remember:
- Slide 1 must hook the reader immediately
- Middle slides should deliver on the hook's promise
- Final slide should drive engagement

Return ONLY the JSON object with slot content.`;
```

---

## Component Architecture

### 1. Enhanced AI Carousel Generator Dialog

```typescript
// components/features/canvas-editor/enhanced-ai-carousel-generator.tsx

interface EnhancedAiCarouselGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: (slides: CanvasSlide[]) => void;
  templates: CanvasTemplate[];
}

/**
 * Multi-step AI carousel generation dialog
 *
 * Steps:
 * 1. Select template (visual grid)
 * 2. Describe topic and audience
 * 3. Configure tone and CTA
 * 4. Preview and generate
 */
export function EnhancedAiCarouselGenerator({
  open,
  onOpenChange,
  onGenerated,
  templates
}: EnhancedAiCarouselGeneratorProps) {
  // State
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<CanvasTemplate | null>(null);
  const [formData, setFormData] = useState<CarouselGenerationRequest>({...});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSlides, setGeneratedSlides] = useState<CanvasSlide[] | null>(null);

  // Template analysis
  const templateAnalysis = useMemo(() =>
    selectedTemplate ? analyzeTemplate(selectedTemplate) : null
  , [selectedTemplate]);

  // Generation handler
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await generateCarouselContent(formData, templateAnalysis!);
      const slides = buildSlidesFromContent(selectedTemplate!, result);
      setGeneratedSlides(slides);
      setStep(4);
    } catch (error) {
      toast.error('Failed to generate carousel');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        {/* Progress indicator */}
        <StepIndicator current={step} total={4} />

        {/* Step 1: Template Selection */}
        {step === 1 && (
          <TemplateSelectionStep
            templates={templates}
            selected={selectedTemplate}
            onSelect={setSelectedTemplate}
            onNext={() => setStep(2)}
          />
        )}

        {/* Step 2: Topic & Audience */}
        {step === 2 && (
          <TopicInputStep
            formData={formData}
            onChange={setFormData}
            templateAnalysis={templateAnalysis}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}

        {/* Step 3: Tone & CTA */}
        {step === 3 && (
          <ToneCtaStep
            formData={formData}
            onChange={setFormData}
            onBack={() => setStep(2)}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        )}

        {/* Step 4: Preview & Apply */}
        {step === 4 && generatedSlides && (
          <PreviewStep
            slides={generatedSlides}
            onBack={() => setStep(3)}
            onApply={() => {
              onGenerated(generatedSlides);
              onOpenChange(false);
            }}
            onRegenerate={handleGenerate}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
```

### 2. Template Selection Grid

```typescript
// components/features/canvas-editor/template-selection-step.tsx

interface TemplateSelectionStepProps {
  templates: CanvasTemplate[];
  selected: CanvasTemplate | null;
  onSelect: (template: CanvasTemplate) => void;
  onNext: () => void;
}

export function TemplateSelectionStep({
  templates,
  selected,
  onSelect,
  onNext
}: TemplateSelectionStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Choose Your Template</h2>
        <p className="text-muted-foreground mt-2">
          Select a template and AI will fill it with your content
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
        {templates.map(template => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={selected?.id === template.id}
            onClick={() => onSelect(template)}
          />
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onNext}
          disabled={!selected}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
```

### 3. Topic Input Step

```typescript
// components/features/canvas-editor/topic-input-step.tsx

interface TopicInputStepProps {
  formData: CarouselGenerationRequest;
  onChange: (data: CarouselGenerationRequest) => void;
  templateAnalysis: TemplateAnalysis | null;
  onBack: () => void;
  onNext: () => void;
}

export function TopicInputStep({
  formData,
  onChange,
  templateAnalysis,
  onBack,
  onNext
}: TopicInputStepProps) {
  const isValid = formData.topic.trim().length >= 10;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">What's Your Carousel About?</h2>
        <p className="text-muted-foreground mt-2">
          Describe your topic and AI will create {templateAnalysis?.totalSlides} slides
        </p>
      </div>

      {/* Template preview */}
      <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
        <div className="w-16 h-16 bg-background rounded overflow-hidden">
          {/* Mini template preview */}
        </div>
        <div>
          <p className="font-medium">{templateAnalysis?.templateName}</p>
          <p className="text-sm text-muted-foreground">
            {templateAnalysis?.totalSlides} slides • {templateAnalysis?.slots.length} content areas
          </p>
        </div>
      </div>

      {/* Topic input */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="topic">Topic or Purpose *</Label>
          <Textarea
            id="topic"
            placeholder="e.g., 5 productivity hacks for remote workers that actually work..."
            value={formData.topic}
            onChange={e => onChange({ ...formData, topic: e.target.value })}
            className="min-h-[100px]"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Be specific! The more detail you provide, the better the content.
          </p>
        </div>

        <div>
          <Label htmlFor="audience">Target Audience (optional)</Label>
          <Input
            id="audience"
            placeholder="e.g., Startup founders, Marketing professionals..."
            value={formData.audience || ''}
            onChange={e => onChange({ ...formData, audience: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="industry">Industry/Niche (optional)</Label>
          <Input
            id="industry"
            placeholder="e.g., SaaS, E-commerce, Healthcare..."
            value={formData.industry || ''}
            onChange={e => onChange({ ...formData, industry: e.target.value })}
          />
        </div>

        <div>
          <Label>Key Points to Include (optional)</Label>
          <KeyPointsInput
            points={formData.keyPoints || []}
            onChange={points => onChange({ ...formData, keyPoints: points })}
          />
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext} disabled={!isValid}>Continue</Button>
      </div>
    </div>
  );
}
```

---

## API Endpoint

### Route: `/api/ai/carousel/generate`

```typescript
// app/api/ai/carousel/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const requestSchema = z.object({
  topic: z.string().min(10),
  audience: z.string().optional(),
  industry: z.string().optional(),
  keyPoints: z.array(z.string()).optional(),
  tone: z.enum(['professional', 'casual', 'educational', 'inspirational', 'storytelling']),
  ctaType: z.enum(['follow', 'comment', 'share', 'link', 'dm', 'custom']).optional(),
  customCta: z.string().optional(),
  templateAnalysis: z.object({
    templateId: z.string(),
    templateName: z.string(),
    totalSlides: z.number(),
    slots: z.array(z.object({
      id: z.string(),
      slideIndex: z.number(),
      type: z.string(),
      maxLength: z.number(),
      purpose: z.string(),
      required: z.boolean()
    }))
  })
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = requestSchema.parse(body);

    // Build the prompt
    const systemPrompt = buildCarouselSystemPrompt(validatedData);
    const userPrompt = buildCarouselUserPrompt(validatedData);

    // Get API key (user's or system default)
    const apiKey = await getApiKey(supabase, user.id);

    // Call AI
    const response = await generateWithOpenRouter(apiKey, systemPrompt, userPrompt);

    // Parse and validate response
    const slotContent = parseCarouselResponse(response, validatedData.templateAnalysis.slots);

    return NextResponse.json({
      success: true,
      slots: slotContent,
      metadata: {
        tokensUsed: response.usage?.total_tokens || 0,
        model: 'gpt-4'
      }
    });

  } catch (error) {
    console.error('Carousel generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate carousel content' },
      { status: 500 }
    );
  }
}

function buildCarouselSystemPrompt(data: z.infer<typeof requestSchema>): string {
  const { templateAnalysis, tone, audience, industry } = data;

  // Build template structure description
  const structureDesc = templateAnalysis.slots
    .map(slot => `- ${slot.id}: ${slot.type} (max ${slot.maxLength} chars) - ${slot.purpose}`)
    .join('\n');

  return CAROUSEL_SYSTEM_PROMPT
    .replace('{{TONE}}', tone)
    .replace('{{AUDIENCE}}', audience || 'LinkedIn professionals')
    .replace('{{INDUSTRY}}', industry || 'general business')
    .replace('{{TEMPLATE_STRUCTURE}}', structureDesc);
}

function buildCarouselUserPrompt(data: z.infer<typeof requestSchema>): string {
  const { topic, keyPoints, ctaType, templateAnalysis } = data;

  const slotsJson = JSON.stringify(
    templateAnalysis.slots.map(s => ({
      id: s.id,
      type: s.type,
      maxLength: s.maxLength,
      purpose: s.purpose
    })),
    null,
    2
  );

  return CAROUSEL_USER_PROMPT
    .replace('{{TOPIC}}', topic)
    .replace('{{KEY_POINTS}}', keyPoints?.join('\n- ') || 'None specified')
    .replace('{{CTA_TYPE}}', ctaType || 'engagement')
    .replace('{{SLOTS_JSON}}', slotsJson);
}
```

---

## Slide Building Logic

```typescript
// lib/ai/carousel-builder.ts

/**
 * Builds canvas slides from AI-generated content
 */
export function buildSlidesFromContent(
  template: CanvasTemplate,
  generatedContent: GeneratedSlotContent[]
): CanvasSlide[] {
  // Deep clone template slides
  const slides = JSON.parse(JSON.stringify(template.defaultSlides)) as CanvasSlide[];

  // Create content map for quick lookup
  const contentMap = new Map(
    generatedContent.map(c => [c.slotId, c.content])
  );

  // Fill each slot
  slides.forEach((slide, slideIndex) => {
    slide.id = generateId(); // New unique ID

    slide.elements = slide.elements.map(element => {
      if (element.type !== 'text') {
        return { ...element, id: generateId() };
      }

      // Find matching slot
      const slotId = `slot-${slideIndex}-${element.id}`;
      const newContent = contentMap.get(slotId);

      if (newContent) {
        return {
          ...element,
          id: generateId(),
          text: newContent,
          // Adjust font size based on content length
          fontSize: calculateOptimalFontSize(
            newContent,
            element.fontSize || 32,
            element.width || 400
          )
        };
      }

      return { ...element, id: generateId() };
    });
  });

  return slides;
}

/**
 * Calculates optimal font size based on content length
 */
function calculateOptimalFontSize(
  text: string,
  baseFontSize: number,
  containerWidth: number
): number {
  const charCount = text.length;

  // Larger base sizes should scale down more aggressively
  if (baseFontSize >= 72) {
    if (charCount > 40) return 56;
    if (charCount > 25) return 64;
    return baseFontSize;
  }

  if (baseFontSize >= 48) {
    if (charCount > 80) return 36;
    if (charCount > 50) return 42;
    return baseFontSize;
  }

  if (baseFontSize >= 32) {
    if (charCount > 200) return 24;
    if (charCount > 120) return 28;
    return baseFontSize;
  }

  return baseFontSize;
}
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Day 1)
- [ ] Create `lib/ai/template-analyzer.ts` - Template slot detection
- [ ] Create `lib/ai/carousel-builder.ts` - Slide building from content
- [ ] Add types to `types/canvas-editor.ts`

### Phase 2: API Endpoint (Day 1)
- [ ] Create `app/api/ai/carousel/generate/route.ts`
- [ ] Implement prompt building functions
- [ ] Add response parsing and validation

### Phase 3: UI Components (Day 2)
- [ ] Create `EnhancedAiCarouselGenerator` dialog
- [ ] Create `TemplateSelectionStep` component
- [ ] Create `TopicInputStep` component
- [ ] Create `ToneCtaStep` component
- [ ] Create `PreviewStep` component

### Phase 4: Integration (Day 2)
- [ ] Replace existing AI generator in canvas editor
- [ ] Add step progress indicator
- [ ] Implement keyboard navigation
- [ ] Add loading states and animations

### Phase 5: Polish (Day 3)
- [ ] Add error handling and retry logic
- [ ] Implement content regeneration per slot
- [ ] Add undo for generation
- [ ] Add generation history

---

## File Structure

```
lib/
  ai/
    template-analyzer.ts      # Template slot detection
    carousel-builder.ts       # Slide building logic
    carousel-prompts.ts       # Prompt templates

app/
  api/
    ai/
      carousel/
        generate/
          route.ts            # Generation API endpoint

components/
  features/
    canvas-editor/
      enhanced-ai-carousel-generator.tsx    # Main dialog
      template-selection-step.tsx           # Step 1
      topic-input-step.tsx                  # Step 2
      tone-cta-step.tsx                     # Step 3
      preview-step.tsx                      # Step 4
      step-indicator.tsx                    # Progress UI
      key-points-input.tsx                  # Multi-input component

types/
  canvas-editor.ts            # Extended with new types
```

---

## Success Criteria

1. **User Experience**
   - Template selection is visual and intuitive
   - Topic input provides helpful guidance
   - Generation completes in < 10 seconds
   - Preview shows all slides before applying

2. **Content Quality**
   - Generated content fits within character limits
   - Content matches the selected tone
   - Each slide has a clear purpose
   - CTA is compelling and relevant

3. **Technical**
   - No runtime errors
   - Proper error handling with user feedback
   - Works with all 11 templates
   - Maintains template styling (colors, fonts, positioning)

4. **Performance**
   - Template analysis is instant (client-side)
   - API response is streamed for large carousels
   - No UI blocking during generation
