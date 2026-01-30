/**
 * Carousel Builder
 * @description Builds canvas slides from AI-generated content
 * @module lib/ai/carousel-builder
 */

import type {
  CanvasTemplate,
  CanvasSlide,
  CanvasTextElement,
  CanvasElement
} from '@/types/canvas-editor'
import type { TemplateAnalysis, TemplateSlot } from './template-analyzer'

/**
 * Generated content for a single slot
 */
export interface GeneratedSlotContent {
  /** Slot ID matching TemplateSlot.id */
  slotId: string
  /** AI-generated content */
  content: string
  /** Confidence score 0-1 */
  confidence?: number
}

/**
 * Result of carousel building
 */
export interface CarouselBuildResult {
  slides: CanvasSlide[]
  filledSlots: number
  totalSlots: number
  warnings: string[]
}

/**
 * Generates a unique ID for elements
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Builds canvas slides from AI-generated content
 * @param template - The original template
 * @param analysis - Template analysis with slot definitions
 * @param generatedContent - AI-generated content for slots
 * @returns Built slides ready for the canvas editor
 */
export function buildSlidesFromContent(
  template: CanvasTemplate,
  analysis: TemplateAnalysis,
  generatedContent: GeneratedSlotContent[]
): CarouselBuildResult {
  const warnings: string[] = []
  let filledSlots = 0

  // Create content map for quick lookup
  const contentMap = new Map<string, string>(
    generatedContent.map(c => [c.slotId, c.content])
  )

  // Deep clone template slides
  const slides: CanvasSlide[] = JSON.parse(
    JSON.stringify(template.defaultSlides)
  )

  // Process each slide
  slides.forEach((slide, slideIndex) => {
    // Generate new unique ID for slide
    slide.id = generateId()

    // Get slots for this slide
    const slideSlots = analysis.slots.filter(s => s.slideIndex === slideIndex)

    // Process each element
    slide.elements = slide.elements.map(element => {
      // Generate new ID for element
      const newElement = { ...element, id: generateId() }

      if (element.type !== 'text') {
        return newElement
      }

      // Find matching slot
      const slot = slideSlots.find(s => s.elementId === element.id)
      if (!slot) {
        return newElement
      }

      // Get generated content
      const newContent = contentMap.get(slot.id)
      if (!newContent) {
        warnings.push(`No content generated for slot: ${slot.id}`)
        return newElement
      }

      filledSlots++

      // Apply content with optimized font size
      const textElement = newElement as CanvasTextElement
      const optimizedFontSize = calculateOptimalFontSize(
        newContent,
        slot.originalFontSize,
        textElement.width || 400
      )

      return {
        ...textElement,
        text: newContent,
        fontSize: optimizedFontSize
      }
    })
  })

  return {
    slides,
    filledSlots,
    totalSlots: analysis.totalSlots,
    warnings
  }
}

/**
 * Calculates optimal font size based on content length
 * @param text - The text content
 * @param baseFontSize - Original font size from template
 * @param containerWidth - Width of the text container
 * @returns Optimized font size
 */
function calculateOptimalFontSize(
  text: string,
  baseFontSize: number,
  containerWidth: number
): number {
  const charCount = text.length

  // Title-sized text (large fonts)
  if (baseFontSize >= 72) {
    if (charCount > 50) return 48
    if (charCount > 40) return 56
    if (charCount > 25) return 64
    return baseFontSize
  }

  // Heading-sized text
  if (baseFontSize >= 48) {
    if (charCount > 100) return 32
    if (charCount > 80) return 36
    if (charCount > 50) return 42
    return baseFontSize
  }

  // Subheading-sized text
  if (baseFontSize >= 36) {
    if (charCount > 120) return 28
    if (charCount > 80) return 32
    return baseFontSize
  }

  // Body text
  if (baseFontSize >= 28) {
    if (charCount > 250) return 22
    if (charCount > 200) return 24
    if (charCount > 150) return 26
    return baseFontSize
  }

  // Small text - generally keep as is
  return baseFontSize
}

/**
 * Merges user edits with AI-generated content
 * Useful for partial regeneration
 * @param existingSlides - Current slides with user edits
 * @param newContent - Newly generated content for specific slots
 * @param slotsToUpdate - Array of slot IDs to update
 * @returns Updated slides
 */
export function mergeGeneratedContent(
  existingSlides: CanvasSlide[],
  newContent: GeneratedSlotContent[],
  slotsToUpdate: string[]
): CanvasSlide[] {
  const contentMap = new Map<string, string>(
    newContent
      .filter(c => slotsToUpdate.includes(c.slotId))
      .map(c => [c.slotId, c.content])
  )

  // Parse slot IDs to get slide and element indices
  const slotParsed = new Map<string, { slideIndex: number; elementId: string }>()
  slotsToUpdate.forEach(slotId => {
    const match = slotId.match(/slot-(\d+)-(.+)/)
    if (match) {
      slotParsed.set(slotId, {
        slideIndex: parseInt(match[1], 10),
        elementId: match[2]
      })
    }
  })

  return existingSlides.map((slide, slideIndex) => ({
    ...slide,
    elements: slide.elements.map(element => {
      if (element.type !== 'text') return element

      // Find if this element should be updated
      for (const [slotId, parsed] of slotParsed) {
        if (parsed.slideIndex === slideIndex) {
          const newText = contentMap.get(slotId)
          if (newText) {
            return {
              ...element,
              text: newText
            } as CanvasTextElement
          }
        }
      }

      return element
    })
  }))
}

/**
 * Creates a preview of how content will look in the template
 * Returns simplified slide representations for preview UI
 */
export interface SlidePreview {
  slideIndex: number
  backgroundColor: string
  contentAreas: Array<{
    type: string
    content: string
    x: number
    y: number
    width: number
    height: number
    fontSize: number
  }>
}

/**
 * Generates preview data for the generated carousel
 * @param template - The template being used
 * @param analysis - Template analysis
 * @param generatedContent - Generated content
 * @returns Array of slide previews
 */
export function generatePreviewData(
  template: CanvasTemplate,
  analysis: TemplateAnalysis,
  generatedContent: GeneratedSlotContent[]
): SlidePreview[] {
  const contentMap = new Map<string, string>(
    generatedContent.map(c => [c.slotId, c.content])
  )

  return template.defaultSlides.map((slide, slideIndex) => {
    const slideSlots = analysis.slots.filter(s => s.slideIndex === slideIndex)

    const contentAreas = slideSlots.map(slot => {
      const content = contentMap.get(slot.id) || slot.placeholder
      const element = slide.elements.find(el => el.id === slot.elementId) as CanvasTextElement | undefined

      return {
        type: slot.type,
        content,
        x: element?.x || 0,
        y: element?.y || 0,
        width: element?.width || 400,
        height: element?.height || 100,
        fontSize: calculateOptimalFontSize(
          content,
          slot.originalFontSize,
          element?.width || 400
        )
      }
    })

    return {
      slideIndex,
      backgroundColor: slide.backgroundColor || '#ffffff',
      contentAreas
    }
  })
}

/**
 * Estimates the visual quality of generated content
 * Based on character limits and content appropriateness
 */
export interface ContentQualityScore {
  overall: number // 0-100
  breakdown: {
    lengthAppropriate: number
    hasHook: boolean
    hasCta: boolean
    contentComplete: boolean
  }
}

/**
 * Scores the quality of generated content
 * @param analysis - Template analysis
 * @param generatedContent - Generated content
 * @returns Quality score breakdown
 */
export function scoreContentQuality(
  analysis: TemplateAnalysis,
  generatedContent: GeneratedSlotContent[]
): ContentQualityScore {
  const contentMap = new Map<string, string>(
    generatedContent.map(c => [c.slotId, c.content])
  )

  let lengthScore = 0
  let totalSlots = 0

  // Check length appropriateness
  analysis.slots.forEach(slot => {
    const content = contentMap.get(slot.id)
    if (content) {
      totalSlots++
      const ratio = content.length / slot.maxLength
      // Ideal is 50-90% of max length
      if (ratio >= 0.5 && ratio <= 0.9) {
        lengthScore += 100
      } else if (ratio >= 0.3 && ratio <= 1.0) {
        lengthScore += 70
      } else if (ratio > 1.0) {
        lengthScore += 30 // Over limit
      } else {
        lengthScore += 50 // Too short
      }
    }
  })

  const avgLengthScore = totalSlots > 0 ? lengthScore / totalSlots : 0

  // Check for hook (first slide)
  const hookSlots = analysis.slots.filter(s => s.slideIndex === 0)
  const hasHook = hookSlots.some(s => contentMap.has(s.id))

  // Check for CTA (last slide)
  const lastSlideIndex = analysis.totalSlides - 1
  const ctaSlots = analysis.slots.filter(s => s.slideIndex === lastSlideIndex)
  const hasCta = ctaSlots.some(s => contentMap.has(s.id))

  // Check content completeness
  const requiredSlots = analysis.slots.filter(s => s.required)
  const contentComplete = requiredSlots.every(s => contentMap.has(s.id))

  // Calculate overall score
  const overall = Math.round(
    avgLengthScore * 0.4 +
    (hasHook ? 20 : 0) +
    (hasCta ? 20 : 0) +
    (contentComplete ? 20 : 0)
  )

  return {
    overall,
    breakdown: {
      lengthAppropriate: Math.round(avgLengthScore),
      hasHook,
      hasCta,
      contentComplete
    }
  }
}
