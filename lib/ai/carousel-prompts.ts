/**
 * Carousel Prompts
 * @description Prompt templates for AI carousel generation
 * @module lib/ai/carousel-prompts
 */

import type { TemplateAnalysis, TemplateSlot } from './template-analyzer'

/**
 * Tone options for carousel generation
 */
export type CarouselTone =
  | 'professional'
  | 'casual'
  | 'educational'
  | 'inspirational'
  | 'storytelling'
  | 'match-my-style'

/**
 * CTA type options
 */
export type CtaType =
  | 'none'
  | 'follow'
  | 'comment'
  | 'share'
  | 'link'
  | 'dm'
  | 'save'
  | 'custom'

/**
 * User context data fetched from Supabase for personalised generation
 */
export interface UserContext {
  /** User's full name (first + last from linkedin_profiles) */
  name?: string
  /** LinkedIn headline */
  headline?: string
  /** Industry from profile or company_context */
  industry?: string
  /** Company name from company_context */
  companyName?: string
  /** Company value proposition */
  valueProposition?: string
  /** Company products/services */
  productsAndServices?: string
  /** Target audience description */
  targetAudience?: string
  /** Tone of voice from company_context */
  toneOfVoice?: string
  /** Recent published posts (content snippets) */
  recentPosts?: string[]
  /** Saved wishlist items (content snippets) */
  savedIdeas?: string[]
}

/**
 * Request data for carousel generation
 */
export interface CarouselGenerationInput {
  topic: string
  audience?: string
  industry?: string
  keyPoints?: string[]
  tone: CarouselTone
  ctaType?: CtaType
  customCta?: string
  templateAnalysis: TemplateAnalysis
  /** Personalisation context from user's profile, posts, and company */
  userContext?: UserContext
  /** Additional context provided by the user for generation */
  additionalContext?: string
}

/**
 * Tone-specific writing guidance
 */
const TONE_GUIDANCE: Record<CarouselTone, string> = {
  professional: `
- Use formal but accessible language
- Include data points and statistics where relevant
- Maintain credibility with expert terminology
- Keep sentences clear and concise
- Avoid slang and casual expressions`,

  casual: `
- Write like you're talking to a friend
- Use conversational language and contractions
- Add personality and occasional humor
- Keep it relatable and down-to-earth
- Use "you" and "I" to create connection`,

  educational: `
- Break down complex concepts simply
- Use analogies and examples
- Structure content for easy learning
- Build from basic to advanced
- Include actionable takeaways`,

  inspirational: `
- Use powerful, emotive language
- Share transformation stories
- Include motivational quotes or insights
- Create a sense of possibility
- End with an empowering message`,

  storytelling: `
- Create a narrative arc across slides
- Use specific details and examples
- Include conflict/challenge and resolution
- Make it personal and relatable
- Build suspense between slides`,

  'match-my-style': `
- Deeply analyze the author's recent posts and replicate their exact writing voice
- Mirror their sentence structures, paragraph lengths, and formatting habits
- Use similar vocabulary, expressions, and rhetorical devices
- Match their level of formality, humor, and storytelling approach
- If their posts use specific patterns (e.g., numbered lists, bold hooks, emoji usage), replicate those
- The goal is for this content to be indistinguishable from their other posts`
}

/**
 * CTA-specific text suggestions
 */
const CTA_TEMPLATES: Record<CtaType, string> = {
  none: '',
  follow: 'Follow for more insights on [topic]',
  comment: 'What\'s your experience with this? Comment below!',
  share: 'Share this with someone who needs to see it',
  link: 'Click the link in bio to learn more',
  dm: 'DM me "[keyword]" for [offer]',
  save: 'Save this for later reference',
  custom: ''
}

/**
 * Builds the system prompt for carousel generation
 * @param input - Generation input data
 * @returns Complete system prompt
 */
export function buildCarouselSystemPrompt(input: CarouselGenerationInput): string {
  const { templateAnalysis, tone, audience, industry, userContext } = input

  // Build template structure description
  const structureDesc = buildStructureDescription(templateAnalysis)

  // Build slot requirements
  const slotRequirements = buildSlotRequirements(templateAnalysis.slots)

  // Build personalisation section from user context
  const personalisationSection = buildPersonalisationSection(userContext, tone)

  const systemPrompt = `You are an expert LinkedIn carousel content creator with years of experience crafting viral, engaging carousel posts. Your task is to generate compelling, personalised content that perfectly fills a carousel template.

## Your Mission
Create content for a ${templateAnalysis.totalSlides}-slide LinkedIn carousel that will:
1. Hook readers immediately on slide 1 (stop the scroll!)
2. Deliver genuine value in the middle slides
3. End with a powerful call-to-action
${personalisationSection}
## Writing Style
${TONE_GUIDANCE[tone]}

## Audience Context
- Target audience: ${audience || userContext?.targetAudience || 'LinkedIn professionals'}
- Industry/niche: ${industry || userContext?.industry || 'general business and professional development'}

## Template Structure
${structureDesc}

## Content Slots to Fill
${slotRequirements}

## Critical Guidelines
1. **Character Limits**: NEVER exceed the max character limit for any slot
2. **Slide Flow**: Each slide should make readers want to swipe to the next
3. **Standalone Value**: Each slide should provide value even if viewed alone
4. **No Hashtags**: Don't include hashtags in the carousel content
5. **LinkedIn Style**: Write for LinkedIn's professional audience
6. **Swipe-Worthy**: Create micro-cliffhangers between slides
7. **Use the REAL author name**: If any slot asks for a name, handle, or author, use the person's REAL name from the Author Profile section. NEVER invent a name or alias.

## Output Format
Return ONLY a valid JSON object with slot IDs as keys and generated content as values.
Example format:
{
  "slot-0-element1": "Your hook title here",
  "slot-0-element2": "Compelling subtitle",
  "slot-1-element3": "First key insight"
}

Do not include any explanation or markdown formatting - just the JSON object.`

  return systemPrompt
}

/**
 * Builds a personalisation section from user context data.
 * Gives the AI real author info, writing-style cues from past posts,
 * and saved content ideas so it never invents placeholder names.
 * @param ctx - User context (may be undefined if no data is available)
 * @returns Markdown section for the system prompt, or empty string
 */
function buildPersonalisationSection(ctx?: UserContext, tone?: CarouselTone): string {
  if (!ctx) return ''

  const lines: string[] = []

  // Author profile
  if (ctx.name || ctx.headline || ctx.companyName) {
    lines.push('## Author Profile')
    if (ctx.name) lines.push(`- Name: ${ctx.name}`)
    if (ctx.headline) lines.push(`- Headline: ${ctx.headline}`)
    if (ctx.companyName) lines.push(`- Company: ${ctx.companyName}`)
    if (ctx.valueProposition) lines.push(`- Value proposition: ${ctx.valueProposition}`)
    if (ctx.productsAndServices) lines.push(`- Products/services: ${ctx.productsAndServices}`)
    lines.push('')
  }

  // Tone of voice
  if (ctx.toneOfVoice) {
    lines.push(`## Brand Voice`)
    lines.push(ctx.toneOfVoice)
    lines.push('')
  }

  // Recent posts for style reference
  if (ctx.recentPosts && ctx.recentPosts.length > 0) {
    lines.push('## Recent Posts (for style reference)')
    if (tone === 'match-my-style') {
      lines.push('CRITICAL: You MUST deeply analyze these posts and replicate the author\'s exact writing style, voice, vocabulary, and formatting patterns. The generated content should be indistinguishable from these posts.')
    } else {
      lines.push('Match the writing style and voice of these recent posts by the same author:')
    }
    ctx.recentPosts.forEach((post, i) => {
      lines.push(`${i + 1}. "${post}"`)
    })
    lines.push('')
  }

  // Saved ideas for inspiration
  if (ctx.savedIdeas && ctx.savedIdeas.length > 0) {
    lines.push('## Saved Ideas (content the author found interesting)')
    if (tone === 'match-my-style') {
      lines.push('The author saves content they resonate with. Use these as cues for their content preferences and interests:')
    }
    ctx.savedIdeas.forEach((idea, i) => {
      lines.push(`${i + 1}. "${idea}"`)
    })
    lines.push('')
  }

  return lines.length > 0 ? '\n' + lines.join('\n') : ''
}

/**
 * Builds structure description from template analysis
 */
function buildStructureDescription(analysis: TemplateAnalysis): string {
  const lines: string[] = [
    `Template: "${analysis.templateName}" with ${analysis.totalSlides} slides`,
    ''
  ]

  analysis.slideBreakdown.forEach(slide => {
    const purposeLabel = slide.purpose.charAt(0).toUpperCase() + slide.purpose.slice(1)
    lines.push(`Slide ${slide.index + 1} (${purposeLabel}):`)
    lines.push(`  - Background: ${slide.backgroundColor}`)
    lines.push(`  - Text elements: ${slide.textElementCount}`)
    if (slide.hasImage) lines.push(`  - Has image placeholder`)
    lines.push('')
  })

  return lines.join('\n')
}

/**
 * Builds slot requirements description
 */
function buildSlotRequirements(slots: TemplateSlot[]): string {
  const lines: string[] = []

  slots.forEach(slot => {
    const required = slot.required ? ' [REQUIRED]' : ''
    lines.push(`- ${slot.id}${required}`)
    lines.push(`  Type: ${slot.type}`)
    lines.push(`  Max characters: ${slot.maxLength}`)
    lines.push(`  Purpose: ${slot.purpose}`)
    lines.push(`  Example/placeholder: "${slot.placeholder.substring(0, 50)}${slot.placeholder.length > 50 ? '...' : ''}"`)
    lines.push('')
  })

  return lines.join('\n')
}

/**
 * Builds the user prompt for carousel generation
 * @param input - Generation input data
 * @returns Complete user prompt
 */
export function buildCarouselUserPrompt(input: CarouselGenerationInput): string {
  const { topic, keyPoints, ctaType, customCta, templateAnalysis, additionalContext } = input

  // Format key points
  const keyPointsText = keyPoints && keyPoints.length > 0
    ? keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')
    : 'None specified - generate based on topic'

  // Format CTA instruction
  let ctaInstruction = ''
  if (ctaType === 'none') {
    ctaInstruction = 'Do NOT include any call-to-action on the last slide. End with a strong closing statement instead.'
  } else if (ctaType) {
    if (ctaType === 'custom' && customCta) {
      ctaInstruction = `Use this CTA approach: "${customCta}"`
    } else {
      ctaInstruction = `CTA style: ${CTA_TEMPLATES[ctaType]}`
    }
  } else {
    ctaInstruction = 'Create an engaging CTA that fits the content'
  }

  // Build slot list for clarity
  const slotList = templateAnalysis.slots.map(slot => ({
    id: slot.id,
    type: slot.type,
    maxLength: slot.maxLength,
    slide: slot.slideIndex + 1
  }))

  const userPrompt = `Generate content for a LinkedIn carousel about:

**Topic**: ${topic}

**Key Points to Cover**:
${keyPointsText}

**Call-to-Action**:
${ctaInstruction}

**Slots to Fill** (${templateAnalysis.totalSlots} total):
${JSON.stringify(slotList, null, 2)}
${additionalContext ? `\n**Additional Context**:\n${additionalContext}\n` : ''}
Remember:
- Slide 1 must STOP THE SCROLL - make it impossible to ignore
- Each middle slide should deliver on the hook's promise
- Final slide should drive maximum engagement
- Stay within character limits for each slot
- Return ONLY the JSON object with slot content`

  return userPrompt
}

/**
 * Parses the AI response to extract slot content
 * @param response - Raw AI response text
 * @param expectedSlots - Expected slot definitions
 * @returns Parsed content map or null if parsing fails
 */
export function parseCarouselResponse(
  response: string,
  expectedSlots: TemplateSlot[]
): Map<string, string> | null {
  try {
    // Clean up response - remove markdown code fences if present
    let cleaned = response.trim()

    // Remove markdown code blocks
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7)
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3)
    }

    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3)
    }

    cleaned = cleaned.trim()

    // Try to find JSON object in the response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON object found in response')
      return null
    }

    const parsed = JSON.parse(jsonMatch[0])

    if (typeof parsed !== 'object' || parsed === null) {
      console.error('Parsed response is not an object')
      return null
    }

    // Build content map
    const contentMap = new Map<string, string>()

    Object.entries(parsed).forEach(([key, value]) => {
      if (typeof value === 'string') {
        contentMap.set(key, value)
      }
    })

    // Validate that we have content for required slots
    const missingRequired = expectedSlots
      .filter(s => s.required && !contentMap.has(s.id))
      .map(s => s.id)

    if (missingRequired.length > 0) {
      console.warn('Missing required slots:', missingRequired)
    }

    return contentMap

  } catch (error) {
    console.error('Failed to parse carousel response:', error)
    return null
  }
}

/**
 * Validates content against slot constraints
 * @param content - Content map
 * @param slots - Slot definitions
 * @returns Validation result with any issues
 */
export function validateContent(
  content: Map<string, string>,
  slots: TemplateSlot[]
): { isValid: boolean; issues: string[] } {
  const issues: string[] = []

  slots.forEach(slot => {
    const text = content.get(slot.id)

    if (!text && slot.required) {
      issues.push(`Missing required content for ${slot.id}`)
      return
    }

    if (text && text.length > slot.maxLength) {
      issues.push(
        `Content for ${slot.id} exceeds limit (${text.length}/${slot.maxLength} chars)`
      )
    }

    if (text && text.length < 5 && slot.required) {
      issues.push(`Content for ${slot.id} is too short`)
    }
  })

  return {
    isValid: issues.length === 0,
    issues
  }
}

/**
 * Truncates content to fit within slot limits
 * Attempts to truncate intelligently at word boundaries
 * @param content - Original content
 * @param maxLength - Maximum allowed length
 * @returns Truncated content
 */
export function truncateToFit(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content
  }

  // Try to truncate at a word boundary
  const truncated = content.substring(0, maxLength - 3)
  const lastSpace = truncated.lastIndexOf(' ')

  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + '...'
  }

  return truncated + '...'
}
