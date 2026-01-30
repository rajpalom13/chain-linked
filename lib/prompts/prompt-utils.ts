/**
 * Prompt Utilities
 * @description Helper functions for prompt variable substitution, validation,
 * and context building.
 * @module lib/prompts/prompt-utils
 */

/**
 * Substitute variables in a prompt template.
 * Variables use the format {{variableName}}.
 *
 * @param template - Template string with {{variable}} placeholders
 * @param variables - Key-value pairs for substitution
 * @returns Processed template with variables replaced
 * @example
 * const result = substituteVariables(
 *   "Hello {{name}}, welcome to {{company}}!",
 *   { name: "John", company: "Acme" }
 * )
 * // Returns: "Hello John, welcome to Acme!"
 */
export function substituteVariables(
  template: string,
  variables: Record<string, string | undefined>
): string {
  if (!template) return ''
  if (!variables || Object.keys(variables).length === 0) return template

  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key]
    // Return the original placeholder if no value provided
    return value !== undefined && value !== '' ? value : match
  })
}

/**
 * Extract all variable keys from a template.
 * Identifies unique variable names used in {{variableName}} format.
 *
 * @param template - Template string to analyze
 * @returns Array of unique variable keys found in the template
 * @example
 * const vars = extractVariableKeys("Hello {{name}}, your {{item}} is ready")
 * // Returns: ["name", "item"]
 */
export function extractVariableKeys(template: string): string[] {
  if (!template) return []

  const regex = /\{\{(\w+)\}\}/g
  const variables = new Set<string>()
  let match: RegExpExecArray | null

  while ((match = regex.exec(template)) !== null) {
    variables.add(match[1])
  }

  return Array.from(variables)
}

/**
 * Validation result for variable checking
 */
export interface VariableValidationResult {
  /** Whether all required variables are provided */
  valid: boolean
  /** List of required variable keys that are missing */
  missing: string[]
  /** List of provided variables that aren't used in the template */
  unused: string[]
}

/**
 * Validate that all required variables are provided for a template.
 *
 * @param template - Template string with variable placeholders
 * @param variables - Provided variables
 * @param requiredVars - List of variable keys that must be provided
 * @returns Validation result with missing and unused variable lists
 * @example
 * const result = validateVariables(
 *   "Hello {{name}}, from {{company}}",
 *   { name: "John" },
 *   ["name", "company"]
 * )
 * // Returns: { valid: false, missing: ["company"], unused: [] }
 */
export function validateVariables(
  template: string,
  variables: Record<string, string | undefined>,
  requiredVars: string[]
): VariableValidationResult {
  const templateVars = extractVariableKeys(template)
  const providedKeys = Object.keys(variables).filter(
    (key) => variables[key] !== undefined && variables[key] !== ''
  )

  // Find missing required variables
  const missing = requiredVars.filter(
    (reqVar) => !providedKeys.includes(reqVar)
  )

  // Find provided variables that aren't in the template
  const unused = providedKeys.filter(
    (provided) => !templateVars.includes(provided)
  )

  return {
    valid: missing.length === 0,
    missing,
    unused,
  }
}

/**
 * User context for personalizing prompts
 */
export interface UserContext {
  /** User's industry or niche */
  industry?: string
  /** Desired tone for the content */
  tone?: string
  /** Company or brand name */
  company?: string
  /** User's job title or headline */
  headline?: string
  /** Additional custom instructions */
  customInstructions?: string
}

/**
 * Build a complete prompt by combining base prompt content with user context.
 * Appends user context information as additional instructions.
 *
 * @param basePrompt - The core prompt content
 * @param userContext - Optional user-specific context to append
 * @returns Complete prompt with context information
 * @example
 * const prompt = buildPromptWithContext(
 *   "You are a LinkedIn expert...",
 *   { industry: "SaaS", tone: "professional", company: "Acme Inc" }
 * )
 */
export function buildPromptWithContext(
  basePrompt: string,
  userContext?: UserContext
): string {
  if (!userContext) return basePrompt

  const contextParts: string[] = []

  if (userContext.industry) {
    contextParts.push(`Industry/Niche: ${userContext.industry}`)
  }

  if (userContext.tone) {
    contextParts.push(`Preferred Tone: ${userContext.tone}`)
  }

  if (userContext.company) {
    contextParts.push(`Company/Brand: ${userContext.company}`)
  }

  if (userContext.headline) {
    contextParts.push(`User's Role: ${userContext.headline}`)
  }

  if (userContext.customInstructions) {
    contextParts.push(
      `Additional Instructions: ${userContext.customInstructions}`
    )
  }

  if (contextParts.length === 0) {
    return basePrompt
  }

  const contextSection = `

## User Context
${contextParts.join('\n')}`

  return basePrompt + contextSection
}

/**
 * Estimate the token count for a string.
 * Uses a rough approximation based on word and character count.
 *
 * Note: This is a rough estimate. For accurate token counts,
 * use the tiktoken library or OpenAI's tokenizer API.
 *
 * Approximation method:
 * - Average English word is ~4-5 characters
 * - GPT tokens average ~4 characters or ~0.75 words
 *
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 * @example
 * const tokens = estimateTokens("Hello world, this is a test.")
 * // Returns approximately 8
 */
export function estimateTokens(text: string): number {
  if (!text) return 0

  // Remove extra whitespace and normalize
  const normalized = text.trim().replace(/\s+/g, ' ')

  // Method 1: Character-based (~4 chars per token)
  const charEstimate = Math.ceil(normalized.length / 4)

  // Method 2: Word-based (~0.75 words per token on average)
  const words = normalized.split(/\s+/).filter(Boolean)
  const wordEstimate = Math.ceil(words.length / 0.75)

  // Average the two methods for better accuracy
  return Math.ceil((charEstimate + wordEstimate) / 2)
}

/**
 * Calculate the estimated cost for API usage based on token counts.
 *
 * @param inputTokens - Number of input/prompt tokens
 * @param outputTokens - Number of output/completion tokens
 * @param model - The model being used
 * @returns Estimated cost in USD
 * @example
 * const cost = estimateCost(1000, 500, 'gpt-4o-mini')
 * // Returns approximately 0.000375 (USD)
 */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  // Pricing per 1K tokens (as of 2024)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 0.0025, output: 0.01 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-4': { input: 0.03, output: 0.06 },
    'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    'o1-preview': { input: 0.015, output: 0.06 },
    'o1-mini': { input: 0.003, output: 0.012 },
  }

  // Default to gpt-4o-mini pricing if model not found
  const modelPricing = pricing[model] || pricing['gpt-4o-mini']

  const inputCost = (inputTokens / 1000) * modelPricing.input
  const outputCost = (outputTokens / 1000) * modelPricing.output

  return inputCost + outputCost
}

/**
 * Truncate text to fit within a token limit.
 * Attempts to truncate at word boundaries when possible.
 *
 * @param text - Text to truncate
 * @param maxTokens - Maximum token limit
 * @param suffix - Suffix to append when truncated (default: "...")
 * @returns Truncated text
 * @example
 * const truncated = truncateToTokenLimit(longText, 100)
 */
export function truncateToTokenLimit(
  text: string,
  maxTokens: number,
  suffix: string = '...'
): string {
  if (!text) return ''

  const currentTokens = estimateTokens(text)
  if (currentTokens <= maxTokens) {
    return text
  }

  // Estimate character limit (rough: 4 chars per token)
  const suffixTokens = estimateTokens(suffix)
  const targetTokens = maxTokens - suffixTokens
  const targetChars = targetTokens * 4

  // Truncate and find word boundary
  let truncated = text.slice(0, targetChars)

  // Find last space to avoid cutting words
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > targetChars * 0.8) {
    truncated = truncated.slice(0, lastSpace)
  }

  return truncated.trim() + suffix
}

/**
 * Sanitize user input for safe inclusion in prompts.
 * Removes or escapes potentially problematic content.
 *
 * @param input - Raw user input
 * @returns Sanitized input safe for prompt inclusion
 * @example
 * const safe = sanitizePromptInput(userInput)
 */
export function sanitizePromptInput(input: string): string {
  if (!input) return ''

  return (
    input
      // Remove control characters except newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Limit consecutive newlines
      .replace(/\n{4,}/g, '\n\n\n')
      // Trim excessive whitespace
      .replace(/[ \t]{4,}/g, '   ')
      .trim()
  )
}

/**
 * Format a prompt for logging or display (truncated if too long).
 *
 * @param prompt - The prompt to format
 * @param maxLength - Maximum length before truncation
 * @returns Formatted prompt string
 */
export function formatPromptForLog(prompt: string, maxLength = 200): string {
  if (!prompt) return '[empty]'

  const singleLine = prompt.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()

  if (singleLine.length <= maxLength) {
    return singleLine
  }

  return singleLine.slice(0, maxLength - 3) + '...'
}

/**
 * Check if a prompt contains any unsubstituted variables.
 *
 * @param prompt - The prompt to check
 * @returns True if unsubstituted variables remain
 * @example
 * const hasVars = hasUnsubstitutedVariables("Hello {{name}}")
 * // Returns: true
 */
export function hasUnsubstitutedVariables(prompt: string): boolean {
  return /\{\{\w+\}\}/.test(prompt)
}

/**
 * Get a list of unsubstituted variables in a prompt.
 *
 * @param prompt - The prompt to check
 * @returns Array of unsubstituted variable names
 * @example
 * const vars = getUnsubstitutedVariables("Hello {{name}}, from {{company}}")
 * // Returns: ["name", "company"]
 */
export function getUnsubstitutedVariables(prompt: string): string[] {
  return extractVariableKeys(prompt)
}
