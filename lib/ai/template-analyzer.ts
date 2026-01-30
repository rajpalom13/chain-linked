/**
 * Template Analyzer
 * @description Analyzes canvas templates to extract fillable slots for AI generation
 * @module lib/ai/template-analyzer
 */

import type {
  CanvasTemplate,
  CanvasSlide,
  CanvasTextElement,
  CanvasElement
} from '@/types/canvas-editor'

/**
 * Slot type definitions for different content areas
 */
export type SlotType = 'title' | 'subtitle' | 'heading' | 'body' | 'bullet' | 'number' | 'cta' | 'author' | 'caption'

/**
 * Slide purpose based on position and content
 */
export type SlidePurpose = 'hook' | 'content' | 'data' | 'quote' | 'cta' | 'intro' | 'conclusion'

/**
 * Defines a fillable slot in a template
 */
export interface TemplateSlot {
  /** Unique identifier for this slot */
  id: string
  /** Slide index (0-based) */
  slideIndex: number
  /** Element ID within the slide */
  elementId: string
  /** Type of content expected */
  type: SlotType
  /** Character limit for this slot */
  maxLength: number
  /** Placeholder/example content */
  placeholder: string
  /** Purpose description for AI */
  purpose: string
  /** Whether this slot is required */
  required: boolean
  /** Original font size */
  originalFontSize: number
  /** Original element position */
  position: { x: number; y: number }
}

/**
 * Individual slide analysis
 */
export interface SlideBreakdown {
  index: number
  purpose: SlidePurpose
  elementCount: number
  textElementCount: number
  hasImage: boolean
  backgroundColor: string
  slots: TemplateSlot[]
}

/**
 * Template analysis result
 */
export interface TemplateAnalysis {
  templateId: string
  templateName: string
  category: string
  totalSlides: number
  slideBreakdown: SlideBreakdown[]
  slots: TemplateSlot[]
  brandColors: string[]
  fonts: string[]
  totalSlots: number
  requiredSlots: number
}

/**
 * Analyzes a template to extract fillable slots
 * @param template - The canvas template to analyze
 * @returns Complete template analysis with all slots
 */
export function analyzeTemplate(template: CanvasTemplate): TemplateAnalysis {
  const slideBreakdowns: SlideBreakdown[] = []
  const allSlots: TemplateSlot[] = []

  template.defaultSlides.forEach((slide, slideIndex) => {
    const purpose = detectSlidePurpose(slide, slideIndex, template.defaultSlides.length)
    const slots = extractSlotsFromSlide(slide, slideIndex, purpose)

    slideBreakdowns.push({
      index: slideIndex,
      purpose,
      elementCount: slide.elements.length,
      textElementCount: slide.elements.filter(el => el.type === 'text').length,
      hasImage: slide.elements.some(el => el.type === 'image'),
      backgroundColor: slide.backgroundColor || '#ffffff',
      slots
    })

    allSlots.push(...slots)
  })

  return {
    templateId: template.id,
    templateName: template.name,
    category: template.category,
    totalSlides: template.defaultSlides.length,
    slideBreakdown: slideBreakdowns,
    slots: allSlots,
    brandColors: template.brandColors,
    fonts: template.fonts,
    totalSlots: allSlots.length,
    requiredSlots: allSlots.filter(s => s.required).length
  }
}

/**
 * Detects the purpose of a slide based on position and content
 * @param slide - The slide to analyze
 * @param index - Slide index (0-based)
 * @param total - Total number of slides
 * @returns The detected slide purpose
 */
function detectSlidePurpose(
  slide: CanvasSlide,
  index: number,
  total: number
): SlidePurpose {
  // First slide is always the hook
  if (index === 0) return 'hook'

  // Last slide is always the CTA
  if (index === total - 1) return 'cta'

  // Analyze elements to determine purpose
  const textElements = slide.elements.filter(el => el.type === 'text') as CanvasTextElement[]

  // Check for large numbers (numbered content slides)
  const hasLargeNumber = textElements.some(el =>
    el.fontSize && el.fontSize >= 72 &&
    /^\d{1,2}$/.test((el.text || '').trim())
  )

  if (hasLargeNumber) return 'content'

  // Check for quote indicators
  const hasQuoteMarks = textElements.some(el =>
    (el.text || '').includes('"') || (el.text || '').includes('"')
  )

  if (hasQuoteMarks) return 'quote'

  // Check for data/chart indicators
  const hasDataKeywords = textElements.some(el => {
    const text = (el.text || '').toLowerCase()
    return text.includes('%') || text.includes('stats') || text.includes('data')
  })

  if (hasDataKeywords) return 'data'

  // Default to content
  return 'content'
}

/**
 * Extracts fillable slots from a slide
 * @param slide - The slide to extract slots from
 * @param slideIndex - The slide index
 * @param slidePurpose - The detected slide purpose
 * @returns Array of template slots
 */
function extractSlotsFromSlide(
  slide: CanvasSlide,
  slideIndex: number,
  slidePurpose: SlidePurpose
): TemplateSlot[] {
  const slots: TemplateSlot[] = []

  slide.elements.forEach(element => {
    if (element.type === 'text') {
      const slot = analyzeTextElement(
        element as CanvasTextElement,
        slideIndex,
        slidePurpose
      )
      if (slot) {
        slots.push(slot)
      }
    }
  })

  // Sort slots by vertical position (top to bottom)
  slots.sort((a, b) => a.position.y - b.position.y)

  return slots
}

/**
 * Analyzes a text element to create a slot definition
 * @param element - The text element to analyze
 * @param slideIndex - The slide index
 * @param slidePurpose - The slide purpose
 * @returns Template slot or null if element is decorative
 */
function analyzeTextElement(
  element: CanvasTextElement,
  slideIndex: number,
  slidePurpose: SlidePurpose
): TemplateSlot | null {
  const text = element.text || ''

  // Skip decorative elements
  // - Single characters or just numbers (slide numbers, bullet points)
  // - Very short text that's likely decorative
  if (text.length <= 2 && /^[\d\W]+$/.test(text)) {
    return null
  }

  // Skip slide number elements (typically large numbers like "01", "02")
  if (/^0?\d$/.test(text.trim()) && element.fontSize && element.fontSize >= 60) {
    return null
  }

  const fontSize = element.fontSize || 32
  const { type, maxLength } = determineSlotTypeAndLength(fontSize, slidePurpose, text)

  return {
    id: `slot-${slideIndex}-${element.id}`,
    slideIndex,
    elementId: element.id,
    type,
    maxLength,
    placeholder: text,
    purpose: generateSlotPurpose(type, slidePurpose, slideIndex),
    required: type === 'title' || type === 'cta' || type === 'heading',
    originalFontSize: fontSize,
    position: { x: element.x, y: element.y }
  }
}

/**
 * Determines slot type and max length based on font size and context
 * @param fontSize - The font size of the element
 * @param slidePurpose - The slide purpose
 * @param text - The placeholder text
 * @returns Object with type and maxLength
 */
function determineSlotTypeAndLength(
  fontSize: number,
  slidePurpose: SlidePurpose,
  text: string
): { type: SlotType; maxLength: number } {
  // CTA slides have special handling
  if (slidePurpose === 'cta') {
    if (fontSize >= 48) {
      return { type: 'cta', maxLength: 80 }
    }
    if (fontSize >= 32) {
      return { type: 'body', maxLength: 150 }
    }
    return { type: 'caption', maxLength: 100 }
  }

  // Hook/intro slides
  if (slidePurpose === 'hook' || slidePurpose === 'intro') {
    if (fontSize >= 56) {
      return { type: 'title', maxLength: 60 }
    }
    if (fontSize >= 36) {
      return { type: 'subtitle', maxLength: 120 }
    }
    return { type: 'body', maxLength: 200 }
  }

  // Content slides
  if (fontSize >= 56) {
    return { type: 'heading', maxLength: 50 }
  }
  if (fontSize >= 40) {
    return { type: 'heading', maxLength: 80 }
  }
  if (fontSize >= 28) {
    return { type: 'body', maxLength: 250 }
  }

  return { type: 'body', maxLength: 300 }
}

/**
 * Generates a purpose description for AI context
 * @param type - The slot type
 * @param slidePurpose - The slide purpose
 * @param slideIndex - The slide index
 * @returns Human-readable purpose description
 */
function generateSlotPurpose(
  type: SlotType,
  slidePurpose: SlidePurpose,
  slideIndex: number
): string {
  const slideNum = slideIndex + 1

  switch (slidePurpose) {
    case 'hook':
      if (type === 'title') {
        return `Slide ${slideNum}: Main hook/headline that grabs attention and makes readers want to swipe`
      }
      if (type === 'subtitle') {
        return `Slide ${slideNum}: Supporting text that adds context to the hook`
      }
      return `Slide ${slideNum}: Additional hook context`

    case 'cta':
      if (type === 'cta') {
        return `Slide ${slideNum}: Final call-to-action that drives engagement (follow, like, comment, save)`
      }
      return `Slide ${slideNum}: Supporting CTA text`

    case 'content':
      if (type === 'heading') {
        return `Slide ${slideNum}: Key point or insight heading`
      }
      return `Slide ${slideNum}: Detailed explanation or supporting content`

    case 'quote':
      if (type === 'title' || type === 'heading') {
        return `Slide ${slideNum}: Quote or key statement`
      }
      return `Slide ${slideNum}: Quote attribution or context`

    case 'data':
      if (type === 'heading') {
        return `Slide ${slideNum}: Data point or statistic headline`
      }
      return `Slide ${slideNum}: Data explanation or context`

    default:
      return `Slide ${slideNum}: ${type} content`
  }
}

/**
 * Gets a summary of the template structure for AI prompts
 * @param analysis - The template analysis
 * @returns Formatted string describing the template structure
 */
export function getTemplateStructureSummary(analysis: TemplateAnalysis): string {
  const lines: string[] = [
    `Template: ${analysis.templateName} (${analysis.totalSlides} slides)`,
    '',
    'Slide Structure:'
  ]

  analysis.slideBreakdown.forEach(slide => {
    lines.push(`\nSlide ${slide.index + 1} (${slide.purpose}):`)
    slide.slots.forEach(slot => {
      lines.push(`  - ${slot.type}: max ${slot.maxLength} chars`)
      lines.push(`    Purpose: ${slot.purpose}`)
    })
  })

  return lines.join('\n')
}

/**
 * Validates that all required slots have content
 * @param analysis - The template analysis
 * @param content - Map of slot ID to content
 * @returns Object with isValid boolean and missing slot IDs
 */
export function validateSlotContent(
  analysis: TemplateAnalysis,
  content: Map<string, string>
): { isValid: boolean; missingSlots: string[] } {
  const missingSlots: string[] = []

  analysis.slots.forEach(slot => {
    if (slot.required && !content.has(slot.id)) {
      missingSlots.push(slot.id)
    }
  })

  return {
    isValid: missingSlots.length === 0,
    missingSlots
  }
}
