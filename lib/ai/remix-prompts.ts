/**
 * AI Remix System Prompts
 * @description System prompts for post rewriting with different tones and user context
 * @module lib/ai/remix-prompts
 */

/**
 * Available tone options for remix
 */
export type RemixTone =
  | 'match-my-style'
  | 'professional'
  | 'casual'
  | 'inspiring'
  | 'educational'
  | 'thought-provoking'

/**
 * User's content profile for personalized remixing
 */
export interface UserContentProfile {
  /** User's recent posts for style analysis */
  recentPosts: {
    content: string
    reactions?: number
    comments?: number
    impressions?: number
  }[]
  /** Common topics/niches the user posts about */
  niches?: string[]
  /** Average post length */
  avgPostLength?: number
  /** Common hashtags used */
  commonHashtags?: string[]
  /** Engagement metrics */
  avgEngagementRate?: number
}

/**
 * Tone option with label and description
 */
export interface ToneOption {
  /** Unique identifier for the tone */
  id: RemixTone
  /** Display label */
  label: string
  /** Description of the tone style */
  description: string
}

/**
 * Available tone options for the UI
 */
export const TONE_OPTIONS: ToneOption[] = [
  {
    id: 'match-my-style',
    label: 'Match My Style',
    description: 'Analyze your posts and match your unique voice',
  },
  {
    id: 'professional',
    label: 'Professional',
    description: 'Authoritative and industry-focused',
  },
  {
    id: 'casual',
    label: 'Casual',
    description: 'Conversational and relatable',
  },
  {
    id: 'inspiring',
    label: 'Inspiring',
    description: 'Motivational and uplifting',
  },
  {
    id: 'educational',
    label: 'Educational',
    description: 'Informative how-to content',
  },
  {
    id: 'thought-provoking',
    label: 'Thought-Provoking',
    description: 'Challenges conventional thinking',
  },
]

/**
 * Base system prompt for all remix operations
 */
const BASE_PROMPT = `You are an expert LinkedIn content creator and copywriter. Your task is to rewrite posts while maintaining the core message and value proposition.

## Guidelines:
1. Keep the essential meaning and key points of the original post
2. Maintain any important hashtags, but feel free to suggest better alternatives
3. Follow LinkedIn best practices:
   - Strong opening hook in the first line
   - Use white space and line breaks for readability
   - Include a clear call-to-action when appropriate
   - Optimal length: 100-250 words for maximum engagement
4. Never plagiarize - transform the content significantly
5. Remove any @mentions from the original (respect attribution)
6. Keep emojis minimal and professional unless the tone calls for more

## Output:
Return ONLY the rewritten post content. No explanations, no preamble, no quotes around the text.`

/**
 * Tone-specific prompt additions
 */
const TONE_PROMPTS: Record<RemixTone, string> = {
  'match-my-style': `
## Tone: Match My Style
- Analyze the writing patterns from the user's previous posts
- Match their exact sentence structure, vocabulary level, and formatting style
- Replicate their emoji usage (or lack thereof)
- Use similar hashtag patterns
- Match their typical post length
- The goal is to make this post indistinguishable from their own writing`,

  professional: `
## Tone: Professional
- Use formal language and industry terminology
- Maintain a polished, corporate-appropriate voice
- Focus on data, insights, and professional value
- Avoid slang, contractions, and casual expressions
- Structure content with clear logic and progression`,

  casual: `
## Tone: Casual
- Write like you're talking to a friend or colleague
- Use contractions and conversational language
- Include personal touches and relatable moments
- Feel free to use appropriate emojis sparingly
- Be authentic and approachable`,

  inspiring: `
## Tone: Inspiring
- Focus on motivation and upliftment
- Share encouraging perspectives and success stories
- Use empowering language that inspires action
- Include calls to aspire and achieve
- Make the reader feel capable and motivated`,

  educational: `
## Tone: Educational
- Focus on teaching and explaining
- Break down complex concepts into digestible parts
- Use clear, structured formatting (bullets, numbered lists)
- Include actionable takeaways
- Provide how-to guidance and practical tips`,

  'thought-provoking': `
## Tone: Thought-Provoking
- Challenge conventional wisdom and assumptions
- Pose questions that make readers think differently
- Share unique perspectives and contrarian views
- Encourage deeper reflection
- Start conversations and debates`,
}

/**
 * Gets the complete system prompt for a remix operation
 * @param tone - The desired tone for the remix
 * @param customInstructions - Optional custom instructions from the user
 * @returns Complete system prompt
 * @example
 * const prompt = getRemixSystemPrompt('professional')
 */
export function getRemixSystemPrompt(
  tone: RemixTone,
  customInstructions?: string
): string {
  let prompt = BASE_PROMPT + TONE_PROMPTS[tone]

  if (customInstructions?.trim()) {
    prompt += `

## Custom Instructions from User:
${customInstructions.trim()}`
  }

  return prompt
}

/**
 * Formats the user message for the remix request
 * @param originalContent - The original post content to remix
 * @returns Formatted user message
 * @example
 * const message = formatRemixUserMessage('Original post content...')
 */
export function formatRemixUserMessage(originalContent: string): string {
  return `Please rewrite the following LinkedIn post:

---
${originalContent.trim()}
---

Remember: Return ONLY the rewritten content, nothing else.`
}

/**
 * Validates content before sending for remix
 * @param content - The content to validate
 * @returns Object with isValid flag and optional error message
 */
export function validateRemixContent(content: string): {
  isValid: boolean
  error?: string
} {
  const trimmed = content.trim()

  if (!trimmed) {
    return { isValid: false, error: 'Content cannot be empty' }
  }

  if (trimmed.length < 10) {
    return { isValid: false, error: 'Content is too short to remix' }
  }

  if (trimmed.length > 5000) {
    return { isValid: false, error: 'Content exceeds maximum length (5000 characters)' }
  }

  return { isValid: true }
}

/**
 * Estimates the cost of a remix operation
 * @param inputLength - Character length of the input content
 * @returns Estimated cost in USD (approximate)
 */
export function estimateRemixCost(inputLength: number): number {
  // Rough estimation based on GPT-4o-mini pricing
  // Input: ~$0.15/1M tokens, Output: ~$0.60/1M tokens
  // Average ~4 chars per token
  const estimatedInputTokens = Math.ceil(inputLength / 4) + 500 // +500 for system prompt
  const estimatedOutputTokens = Math.ceil(inputLength / 3) // Output usually shorter

  const inputCost = (estimatedInputTokens / 1_000_000) * 0.15
  const outputCost = (estimatedOutputTokens / 1_000_000) * 0.60

  return inputCost + outputCost
}
