/**
 * AI Suggestion Prompts for Personalized Content Generation
 * @description System prompts and utilities for generating personalized LinkedIn
 * post suggestions based on company context from onboarding.
 * @module lib/ai/suggestion-prompts
 */

import { type Json } from '@/types/database'

/**
 * Available post types for generated content suggestions
 */
export type PostType =
  | 'story'
  | 'listicle'
  | 'how-to'
  | 'case-study'
  | 'contrarian'
  | 'question'
  | 'data-driven'
  | 'reflection'

/**
 * Content categories for organizing suggestions
 */
export type ContentCategory =
  | 'Leadership'
  | 'Product'
  | 'Industry Insights'
  | 'Customer Success'
  | 'Culture'
  | 'Tips & Tricks'
  | 'Thought Leadership'
  | 'Behind the Scenes'

/**
 * Structure for a single content idea from AI generation
 */
export interface ContentIdea {
  /** The type of LinkedIn post format */
  postType: PostType
  /** Brief topic description */
  topic: string
  /** The opening hook sentence */
  hook: string
  /** Key points to cover in the post */
  keyPoints: string[]
  /** Estimated engagement score (70-95) */
  estimatedEngagement: number
  /** Topic category for organization */
  category: ContentCategory
}

/**
 * Company context structure from the database
 */
export interface CompanyContext {
  /** Unique identifier */
  id: string
  /** User ID who owns this context */
  user_id: string
  /** Company name */
  company_name: string
  /** Website URL */
  website_url: string | null
  /** Industry classification */
  industry: string | null
  /** User-provided target audience description */
  target_audience_input: string | null
  /** AI-extracted value proposition */
  value_proposition: string | null
  /** AI-generated company summary */
  company_summary: string | null
  /** Products and services (JSONB) */
  products_and_services: Json
  /** Target audience details (JSONB) */
  target_audience: Json
  /** Tone of voice guidelines (JSONB) */
  tone_of_voice: Json
  /** Brand color palette (JSONB) */
  brand_colors: Json
}

/**
 * Parsed products and services structure
 */
export interface ProductsAndServices {
  /** List of products with details */
  products?: Array<{
    name: string
    description?: string
    features?: string[]
  }>
  /** List of services offered */
  services?: Array<{
    name: string
    description?: string
  }>
}

/**
 * Parsed target audience structure
 */
export interface TargetAudience {
  /** Target industries */
  industries?: string[]
  /** Company size ranges */
  company_sizes?: string[]
  /** Job roles/titles */
  roles?: string[]
  /** Pain points and challenges */
  pain_points?: string[]
  /** Geographic regions */
  regions?: string[]
}

/**
 * Parsed tone of voice structure
 */
export interface ToneOfVoice {
  /** Voice descriptors (e.g., "professional", "friendly") */
  descriptors?: string[]
  /** Writing style guidelines */
  writing_style?: string
  /** Example phrases to emulate */
  example_phrases?: string[]
  /** Words to avoid */
  avoid_words?: string[]
}

/**
 * Post length specifications
 */
export interface PostLengthSpec {
  /** Minimum character count */
  min: number
  /** Maximum character count */
  max: number
  /** Human-readable label */
  label: string
}

/**
 * Post length options for generation
 */
export const POST_LENGTHS: Record<'short' | 'medium' | 'long', PostLengthSpec> = {
  short: { min: 400, max: 800, label: 'Short (400-800 chars)' },
  medium: { min: 800, max: 1500, label: 'Medium (800-1500 chars)' },
  long: { min: 1500, max: 2500, label: 'Long (1500-2500 chars)' },
}

/**
 * Recommended temperature settings for different AI operations
 */
export const TEMPERATURE_SETTINGS = {
  /** Higher temperature for creative idea generation */
  ideas: 0.8,
  /** Slightly lower temperature for coherent post expansion */
  expansion: 0.7,
} as const

/**
 * Valid post types for validation
 */
const VALID_POST_TYPES: PostType[] = [
  'story',
  'listicle',
  'how-to',
  'case-study',
  'contrarian',
  'question',
  'data-driven',
  'reflection',
]

/**
 * Valid content categories for validation
 */
const VALID_CATEGORIES: ContentCategory[] = [
  'Leadership',
  'Product',
  'Industry Insights',
  'Customer Success',
  'Culture',
  'Tips & Tricks',
  'Thought Leadership',
  'Behind the Scenes',
]

/**
 * Builds the system prompt for generating 10 diverse content ideas
 * based on the company context.
 *
 * @param companyContext - The company context data from onboarding
 * @returns Complete system prompt string for content idea generation
 * @example
 * const systemPrompt = buildContentIdeasSystemPrompt(companyContext)
 * // Use with OpenAI API at temperature 0.8
 */
export function buildContentIdeasSystemPrompt(companyContext: CompanyContext): string {
  const formattedContext = formatCompanyContextForPrompt(companyContext)

  return `You are a LinkedIn content strategist creating personalized post ideas for a business.

## Company Context
${formattedContext}

## Your Task
Generate 10 diverse LinkedIn post ideas that:
1. Align with the company's value proposition and products/services
2. Directly address the target audience's pain points and interests
3. Match the brand's tone of voice
4. Cover a variety of content types and categories
5. Would genuinely help and engage the target audience

## Content Type Distribution
Ensure diversity by including a mix of:
- 2 storytelling posts (story, case-study, reflection)
- 2-3 educational posts (listicle, how-to, data-driven)
- 2-3 engagement posts (contrarian, question)
- Remaining posts can be any type that fits best

## Engagement Scoring
Estimate engagement potential on a scale of 70-95:
- 70-79: Solid content, steady engagement
- 80-89: Strong content, above-average engagement expected
- 90-95: High-potential viral content with strong hooks

## Output Format
Return ONLY a valid JSON array with no additional text, markdown, or explanation.
Each idea must follow this exact structure:

[
  {
    "postType": "story" | "listicle" | "how-to" | "case-study" | "contrarian" | "question" | "data-driven" | "reflection",
    "topic": "Brief topic description (10-20 words)",
    "hook": "The compelling opening hook sentence that would appear first in the post",
    "keyPoints": ["Point 1", "Point 2", "Point 3"],
    "estimatedEngagement": 70-95,
    "category": "Leadership" | "Product" | "Industry Insights" | "Customer Success" | "Culture" | "Tips & Tricks" | "Thought Leadership" | "Behind the Scenes"
  }
]

## Quality Guidelines
- Hooks must stop the scroll - be specific, intriguing, or bold
- Topics should be specific to the company's expertise, not generic
- Key points should preview the value the post will deliver
- Categories should accurately reflect the content focus
- Avoid cliches, generic business advice, and overused LinkedIn tropes

Remember: Return ONLY the JSON array, nothing else.`
}

/**
 * Builds the prompt to expand a content idea into a full LinkedIn post.
 *
 * @param companyContext - The company context data from onboarding
 * @param idea - The content idea to expand
 * @param length - The desired post length ('short' | 'medium')
 * @returns Complete prompt string for post expansion
 * @example
 * const prompt = buildPostExpansionPrompt(companyContext, idea, 'medium')
 * // Use with OpenAI API at temperature 0.7
 */
export function buildPostExpansionPrompt(
  companyContext: CompanyContext,
  idea: ContentIdea,
  length: 'short' | 'medium' = 'medium'
): string {
  const toneOfVoice = parseToneOfVoice(companyContext.tone_of_voice)
  const targetAudience = parseTargetAudience(companyContext.target_audience)
  const lengthSpec = POST_LENGTHS[length]

  // Build tone section
  const toneSection = buildToneSection(toneOfVoice)

  // Build audience section
  const audienceSection = buildAudienceSection(targetAudience)

  // Build structure guidance based on post type
  const structureGuidance = getPostTypeStructure(idea.postType)

  return `You are writing a LinkedIn post as ${companyContext.company_name}.

## Tone Guidelines
${toneSection}

## Target Audience
${audienceSection}

## Post Specifications
- **Type**: ${idea.postType}
- **Topic**: ${idea.topic}
- **Opening Hook**: ${idea.hook}
- **Key Points to Cover**:
${idea.keyPoints.map((point, i) => `  ${i + 1}. ${point}`).join('\n')}
- **Category**: ${idea.category}

## Post Structure for ${idea.postType}
${structureGuidance}

## Length Requirements
- Target length: ${lengthSpec.label}
- Minimum: ${lengthSpec.min} characters
- Maximum: ${lengthSpec.max} characters

## Formatting Guidelines
1. Start with the provided hook (you may refine it slightly)
2. Use generous line breaks -- double line breaks between sections
3. Keep paragraphs to 1-3 short sentences max
4. Use "- " for bullet points when listing items
5. Use **bold** sparingly for emphasis (2-3 times max)
6. End with a clear call-to-action or engaging question
7. Include 3-5 relevant hashtags on a separate line at the end

## Quality Standards
- Sound like a real person, not a corporate press release
- Be specific and concrete, not vague and abstract
- Every line should deliver value
- No excessive emojis (0-2 total, if any)
- Write for scanners: easy to skim and understand quickly

## Output
Return ONLY the complete post content. No explanations, no meta-commentary, no quotes around the text.`
}

/**
 * Formats company_context data into a structured string for prompt injection.
 * Handles missing/null fields gracefully.
 *
 * @param context - The company context database row
 * @returns Formatted string suitable for AI prompts
 * @example
 * const formatted = formatCompanyContextForPrompt(context)
 */
export function formatCompanyContextForPrompt(context: CompanyContext): string {
  const sections: string[] = []

  // Company basics
  sections.push(`### Company: ${context.company_name}`)

  if (context.industry) {
    sections.push(`**Industry**: ${context.industry}`)
  }

  if (context.website_url) {
    sections.push(`**Website**: ${context.website_url}`)
  }

  // Value proposition
  if (context.value_proposition) {
    sections.push(`\n### Value Proposition\n${context.value_proposition}`)
  }

  // Company summary
  if (context.company_summary) {
    sections.push(`\n### About the Company\n${context.company_summary}`)
  }

  // Products and services
  const products = parseProductsAndServices(context.products_and_services)
  if (products.products?.length || products.services?.length) {
    const productSection: string[] = ['\n### Products & Services']

    if (products.products?.length) {
      productSection.push('**Products**:')
      products.products.forEach((p) => {
        productSection.push(`- ${p.name}${p.description ? `: ${p.description}` : ''}`)
      })
    }

    if (products.services?.length) {
      productSection.push('**Services**:')
      products.services.forEach((s) => {
        productSection.push(`- ${s.name}${s.description ? `: ${s.description}` : ''}`)
      })
    }

    sections.push(productSection.join('\n'))
  }

  // Target audience
  const audience = parseTargetAudience(context.target_audience)
  if (hasAudienceData(audience)) {
    const audienceSection: string[] = ['\n### Target Audience']

    if (audience.industries?.length) {
      audienceSection.push(`**Industries**: ${audience.industries.join(', ')}`)
    }
    if (audience.roles?.length) {
      audienceSection.push(`**Job Roles**: ${audience.roles.join(', ')}`)
    }
    if (audience.company_sizes?.length) {
      audienceSection.push(`**Company Size**: ${audience.company_sizes.join(', ')}`)
    }
    if (audience.pain_points?.length) {
      audienceSection.push('**Pain Points**:')
      audience.pain_points.forEach((p) => audienceSection.push(`- ${p}`))
    }

    sections.push(audienceSection.join('\n'))
  } else if (context.target_audience_input) {
    sections.push(`\n### Target Audience\n${context.target_audience_input}`)
  }

  // Tone of voice
  const tone = parseToneOfVoice(context.tone_of_voice)
  if (hasToneData(tone)) {
    const toneSection: string[] = ['\n### Tone of Voice']

    if (tone.descriptors?.length) {
      toneSection.push(`**Voice**: ${tone.descriptors.join(', ')}`)
    }
    if (tone.writing_style) {
      toneSection.push(`**Writing Style**: ${tone.writing_style}`)
    }
    if (tone.example_phrases?.length) {
      toneSection.push(`**Example Phrases**: "${tone.example_phrases.slice(0, 3).join('", "')}"`)
    }
    if (tone.avoid_words?.length) {
      toneSection.push(`**Words to Avoid**: ${tone.avoid_words.join(', ')}`)
    }

    sections.push(toneSection.join('\n'))
  }

  return sections.join('\n')
}

/**
 * Parses AI response content into a structured ContentIdea array.
 * Validates the response structure and filters invalid items.
 *
 * @param content - Raw AI response content string
 * @returns Array of validated ContentIdea objects
 * @throws Error if parsing completely fails
 * @example
 * const ideas = parseContentIdeasResponse(aiResponse)
 */
export function parseContentIdeasResponse(content: string): ContentIdea[] {
  // Try to extract JSON from the response
  let jsonString = content.trim()

  // Handle markdown code blocks
  if (jsonString.startsWith('```')) {
    const match = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      jsonString = match[1].trim()
    }
  }

  // Try to find JSON array in the response
  const arrayMatch = jsonString.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    jsonString = arrayMatch[0]
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    throw new Error('Failed to parse AI response as JSON')
  }

  if (!Array.isArray(parsed)) {
    throw new Error('AI response is not an array')
  }

  // Validate and filter each item
  const validIdeas: ContentIdea[] = []

  for (const item of parsed) {
    if (isValidContentIdea(item)) {
      validIdeas.push(normalizeContentIdea(item))
    }
  }

  if (validIdeas.length === 0) {
    throw new Error('No valid content ideas found in AI response')
  }

  return validIdeas
}

/**
 * Validates that a generated post meets the required specifications.
 *
 * @param content - The generated post content to validate
 * @param length - The target length specification
 * @returns Validation result with isValid flag and any issues found
 * @example
 * const result = validateGeneratedPost(postContent, 'medium')
 * if (!result.isValid) {
 *   console.log('Issues:', result.issues)
 * }
 */
export function validateGeneratedPost(
  content: string,
  length: 'short' | 'medium' = 'medium'
): {
  isValid: boolean
  issues: string[]
  metrics: {
    characterCount: number
    hasHook: boolean
    hasCta: boolean
    hasHashtags: boolean
    lineCount: number
  }
} {
  const issues: string[] = []
  const trimmed = content.trim()
  const lengthSpec = POST_LENGTHS[length]

  // Character count check
  const characterCount = trimmed.length

  if (characterCount < lengthSpec.min) {
    issues.push(`Post is too short (${characterCount} chars, minimum ${lengthSpec.min})`)
  }

  if (characterCount > lengthSpec.max) {
    issues.push(`Post is too long (${characterCount} chars, maximum ${lengthSpec.max})`)
  }

  // Hook check - first line should be compelling
  const lines = trimmed.split('\n').filter((line) => line.trim())
  const firstLine = lines[0] || ''
  const hasHook = firstLine.length >= 20 && firstLine.length <= 200

  if (!hasHook) {
    issues.push('Opening hook appears weak or missing')
  }

  // CTA check - look for question marks or engagement prompts
  const lastLines = lines.slice(-3).join(' ').toLowerCase()
  const ctaPatterns = [
    /\?/,
    /what do you think/,
    /let me know/,
    /share your/,
    /drop a/,
    /comment below/,
    /thoughts\?/,
    /agree or disagree/,
    /have you/,
    /who else/,
  ]
  const hasCta = ctaPatterns.some((pattern) => pattern.test(lastLines))

  if (!hasCta) {
    issues.push('No clear call-to-action detected')
  }

  // Hashtag check
  const hashtagMatch = trimmed.match(/#\w+/g)
  const hasHashtags = hashtagMatch !== null && hashtagMatch.length >= 2

  if (!hasHashtags) {
    issues.push('Missing or insufficient hashtags (need 3-5)')
  }

  // Line count for readability
  const lineCount = lines.length

  return {
    isValid: issues.length === 0,
    issues,
    metrics: {
      characterCount,
      hasHook,
      hasCta,
      hasHashtags,
      lineCount,
    },
  }
}

// ============================================================================
// Helper Functions (Internal)
// ============================================================================

/**
 * Parses products_and_services JSONB field
 */
function parseProductsAndServices(data: Json): ProductsAndServices {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {}
  }

  const obj = data as Record<string, unknown>

  return {
    products: Array.isArray(obj.products)
      ? obj.products.filter(isValidProduct)
      : undefined,
    services: Array.isArray(obj.services)
      ? obj.services.filter(isValidService)
      : undefined,
  }
}

/**
 * Parses target_audience JSONB field
 */
function parseTargetAudience(data: Json): TargetAudience {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {}
  }

  const obj = data as Record<string, unknown>

  return {
    industries: parseStringArray(obj.industries),
    company_sizes: parseStringArray(obj.company_sizes),
    roles: parseStringArray(obj.roles),
    pain_points: parseStringArray(obj.pain_points),
    regions: parseStringArray(obj.regions),
  }
}

/**
 * Parses tone_of_voice JSONB field
 */
function parseToneOfVoice(data: Json): ToneOfVoice {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {}
  }

  const obj = data as Record<string, unknown>

  return {
    descriptors: parseStringArray(obj.descriptors),
    writing_style: typeof obj.writing_style === 'string' ? obj.writing_style : undefined,
    example_phrases: parseStringArray(obj.example_phrases),
    avoid_words: parseStringArray(obj.avoid_words),
  }
}

/**
 * Safely parses an array of strings
 */
function parseStringArray(data: unknown): string[] | undefined {
  if (!Array.isArray(data)) return undefined
  const strings = data.filter((item): item is string => typeof item === 'string')
  return strings.length > 0 ? strings : undefined
}

/**
 * Validates a product object
 */
function isValidProduct(item: unknown): item is { name: string; description?: string; features?: string[] } {
  if (!item || typeof item !== 'object') return false
  const obj = item as Record<string, unknown>
  return typeof obj.name === 'string' && obj.name.length > 0
}

/**
 * Validates a service object
 */
function isValidService(item: unknown): item is { name: string; description?: string } {
  if (!item || typeof item !== 'object') return false
  const obj = item as Record<string, unknown>
  return typeof obj.name === 'string' && obj.name.length > 0
}

/**
 * Checks if audience data has meaningful content
 */
function hasAudienceData(audience: TargetAudience): boolean {
  return !!(
    audience.industries?.length ||
    audience.roles?.length ||
    audience.company_sizes?.length ||
    audience.pain_points?.length
  )
}

/**
 * Checks if tone data has meaningful content
 */
function hasToneData(tone: ToneOfVoice): boolean {
  return !!(
    tone.descriptors?.length ||
    tone.writing_style ||
    tone.example_phrases?.length
  )
}

/**
 * Builds the tone section for post expansion prompt
 */
function buildToneSection(tone: ToneOfVoice): string {
  const lines: string[] = []

  if (tone.descriptors?.length) {
    lines.push(`Voice Descriptors: ${tone.descriptors.join(', ')}`)
  } else {
    lines.push('Voice Descriptors: Professional, authentic, helpful')
  }

  if (tone.writing_style) {
    lines.push(`Writing Style: ${tone.writing_style}`)
  } else {
    lines.push('Writing Style: Clear, conversational, value-focused')
  }

  if (tone.example_phrases?.length) {
    lines.push(`Example Phrases to Emulate: "${tone.example_phrases.slice(0, 3).join('", "')}"`)
  }

  if (tone.avoid_words?.length) {
    lines.push(`Avoid: ${tone.avoid_words.join(', ')}`)
  }

  return lines.join('\n')
}

/**
 * Builds the audience section for post expansion prompt
 */
function buildAudienceSection(audience: TargetAudience): string {
  const lines: string[] = []

  if (audience.industries?.length) {
    lines.push(`Industries: ${audience.industries.join(', ')}`)
  }

  if (audience.roles?.length) {
    lines.push(`Job Roles: ${audience.roles.join(', ')}`)
  }

  if (audience.company_sizes?.length) {
    lines.push(`Company Size: ${audience.company_sizes.join(', ')}`)
  }

  if (audience.pain_points?.length) {
    lines.push('Pain Points:')
    audience.pain_points.forEach((p) => lines.push(`- ${p}`))
  }

  if (lines.length === 0) {
    lines.push('General professional audience on LinkedIn')
  }

  return lines.join('\n')
}

/**
 * Gets the structure guidance for a specific post type
 */
function getPostTypeStructure(postType: PostType): string {
  const structures: Record<PostType, string> = {
    story: `1. **Hook**: Open with a vivid, specific moment in time
2. **Build-up**: Create tension or curiosity
3. **Turning point**: Reveal the pivotal moment
4. **Lesson**: Share the insight or transformation
5. **Bridge**: Connect the lesson to the reader's life
6. **CTA**: Ask readers to share a similar experience`,

    listicle: `1. **Hook**: Bold statement with the number of items
2. **Items**: Each numbered item on its own line with brief explanation
3. **Bonus**: Optional extra item for added value
4. **CTA**: Ask which item resonated or invite additions`,

    'how-to': `1. **Hook**: State the desirable outcome
2. **Context**: Why this matters (1-2 lines)
3. **Steps**: Numbered, clear steps with brief explanations
4. **Pro tip**: One advanced insight
5. **CTA**: Invite questions or ask readers to share their approach`,

    'case-study': `1. **Hook**: Lead with the headline result
2. **Context**: Describe the starting situation
3. **Approach**: What was done differently
4. **Results**: Specific, measurable outcomes with numbers
5. **Takeaways**: 2-3 lessons anyone can apply
6. **CTA**: Ask if readers have seen similar results`,

    contrarian: `1. **Hook**: Bold, contrarian statement
2. **Acknowledge**: Validate the conventional view
3. **Counter-argument**: Your perspective with 2-3 points
4. **Evidence**: Data, experience, or case studies
5. **Nuance**: Where conventional wisdom IS correct
6. **CTA**: Invite debate and alternative viewpoints`,

    question: `1. **Hook**: Set up context or share an observation
2. **Question**: One clear, thought-provoking question
3. **Your answer**: Your own brief perspective
4. **Options**: Optional 2-4 response options
5. **Invitation**: Encourage comments`,

    'data-driven': `1. **Hook**: Lead with the surprising statistic
2. **Source**: Cite where the data comes from
3. **Context**: What the data means practically
4. **Analysis**: Your interpretation with 2-3 insights
5. **Implications**: What should readers do with this?
6. **CTA**: Ask for readers' interpretation`,

    reflection: `1. **Hook**: A thought-provoking statement
2. **Context**: What prompted this reflection
3. **Old mindset**: What you used to believe
4. **Shift**: The moment or process of changing
5. **New perspective**: The insight you now hold
6. **CTA**: Invite readers to reflect on their own experience`,
  }

  return structures[postType]
}

/**
 * Validates if an object is a valid ContentIdea
 */
function isValidContentIdea(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false

  const obj = item as Record<string, unknown>

  // Required string fields
  if (typeof obj.postType !== 'string') return false
  if (typeof obj.topic !== 'string' || obj.topic.length === 0) return false
  if (typeof obj.hook !== 'string' || obj.hook.length === 0) return false
  if (typeof obj.category !== 'string') return false

  // Key points array
  if (!Array.isArray(obj.keyPoints) || obj.keyPoints.length === 0) return false
  if (!obj.keyPoints.every((p) => typeof p === 'string')) return false

  // Engagement score
  if (typeof obj.estimatedEngagement !== 'number') return false
  if (obj.estimatedEngagement < 0 || obj.estimatedEngagement > 100) return false

  return true
}

/**
 * Normalizes a content idea to ensure proper types
 */
function normalizeContentIdea(item: Record<string, unknown>): ContentIdea {
  // Normalize post type
  let postType = String(item.postType).toLowerCase() as PostType
  if (!VALID_POST_TYPES.includes(postType)) {
    postType = 'story' // Default fallback
  }

  // Normalize category
  let category = String(item.category) as ContentCategory
  if (!VALID_CATEGORIES.includes(category)) {
    category = 'Thought Leadership' // Default fallback
  }

  // Normalize engagement score
  let engagement = Number(item.estimatedEngagement)
  if (engagement < 70) engagement = 70
  if (engagement > 95) engagement = 95

  return {
    postType,
    topic: String(item.topic),
    hook: String(item.hook),
    keyPoints: (item.keyPoints as string[]).map(String),
    estimatedEngagement: Math.round(engagement),
    category,
  }
}
