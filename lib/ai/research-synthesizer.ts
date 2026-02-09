/**
 * Research Synthesizer
 * @description Cross-topic synthesis module for deep research pipeline.
 * Analyzes enriched results across multiple topics to find cross-cutting themes,
 * unique angles, and synthesized context for better post generation.
 * @module lib/ai/research-synthesizer
 */

import { createOpenAIClient, chatCompletion } from '@/lib/ai/openai-client'

/**
 * Enriched research result with topic and content
 */
interface EnrichedResult {
  url: string
  title: string
  content: string
  enrichedContent: string
  keyInsights: string[]
  topic: string
  score: number
  trendAnalysis?: string
}

/**
 * Synthesis output with cross-cutting themes and unique angles
 */
export interface SynthesisResult {
  /** Themes that span multiple topics */
  crossTopicThemes: string[]
  /** Unique angles not obvious from individual topics */
  uniqueAngles: string[]
  /** Combined synthesized context for injection into prompts */
  synthesizedContext: string
}

/**
 * Groups enriched results by their topic
 * @param results - Array of enriched results
 * @returns Record mapping topic to results
 */
function groupByTopic(results: EnrichedResult[]): Record<string, EnrichedResult[]> {
  const groups: Record<string, EnrichedResult[]> = {}
  for (const result of results) {
    if (!groups[result.topic]) {
      groups[result.topic] = []
    }
    groups[result.topic].push(result)
  }
  return groups
}

/**
 * Builds a summary of results grouped by topic for the synthesis prompt
 * @param grouped - Results grouped by topic
 * @returns Formatted summary string
 */
function buildTopicSummary(grouped: Record<string, EnrichedResult[]>): string {
  const sections: string[] = []

  for (const [topic, results] of Object.entries(grouped)) {
    const topicSection = [`## Topic: ${topic}`]
    for (const result of results.slice(0, 5)) {
      topicSection.push(`- **${result.title}**: ${result.keyInsights.slice(0, 2).join('; ') || result.content.slice(0, 200)}`)
    }
    sections.push(topicSection.join('\n'))
  }

  return sections.join('\n\n')
}

/**
 * Synthesizes insights across multiple research topics using AI
 * Takes all enriched results, groups by topic, and uses an LLM to find
 * cross-cutting themes and unique angles.
 * @param results - All enriched research results from multiple topics
 * @returns Promise resolving to synthesis result with themes, angles, and context
 * @example
 * ```typescript
 * const synthesis = await synthesizeResearch(allEnrichedResults)
 * // Use synthesis.synthesizedContext in post generation prompts
 * ```
 */
export async function synthesizeResearch(
  results: EnrichedResult[]
): Promise<SynthesisResult> {
  if (results.length === 0) {
    return {
      crossTopicThemes: [],
      uniqueAngles: [],
      synthesizedContext: '',
    }
  }

  const grouped = groupByTopic(results)
  const topicCount = Object.keys(grouped).length

  // If only one topic, return basic synthesis without LLM
  if (topicCount <= 1) {
    const insights = results.flatMap((r) => r.keyInsights).filter(Boolean)
    return {
      crossTopicThemes: [],
      uniqueAngles: insights.slice(0, 3),
      synthesizedContext: insights.join('\n'),
    }
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    console.warn('[Synthesizer] OPENROUTER_API_KEY not configured, returning basic synthesis')
    const insights = results.flatMap((r) => r.keyInsights).filter(Boolean)
    return {
      crossTopicThemes: [],
      uniqueAngles: insights.slice(0, 5),
      synthesizedContext: insights.join('\n'),
    }
  }

  const client = createOpenAIClient({ apiKey })
  const topicSummary = buildTopicSummary(grouped)

  const systemPrompt = `You are a research analyst specializing in finding connections between different domains.
Your job is to analyze research results across multiple topics and identify:
1. Cross-cutting themes that appear in multiple topics
2. Unique angles that could make compelling LinkedIn content
3. Surprising connections between seemingly unrelated topics

Return your analysis in the following JSON format:
{
  "crossTopicThemes": ["theme1", "theme2", ...],
  "uniqueAngles": ["angle1", "angle2", ...],
  "synthesizedContext": "A paragraph summarizing the key cross-topic insights..."
}

Be concise. Each theme/angle should be 1-2 sentences max. Return valid JSON only.`

  const userMessage = `Analyze these research findings across ${topicCount} topics and find connections:

${topicSummary}

Identify cross-cutting themes, unique angles for LinkedIn content, and synthesize the key insights.`

  try {
    const response = await chatCompletion(client, {
      systemPrompt,
      userMessage,
      temperature: 0.5,
      maxTokens: 600,
    })

    const content = response.content.trim()

    // Try to parse as JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        crossTopicThemes: Array.isArray(parsed.crossTopicThemes) ? parsed.crossTopicThemes : [],
        uniqueAngles: Array.isArray(parsed.uniqueAngles) ? parsed.uniqueAngles : [],
        synthesizedContext: typeof parsed.synthesizedContext === 'string' ? parsed.synthesizedContext : content,
      }
    }

    // Fallback: use raw content
    return {
      crossTopicThemes: [],
      uniqueAngles: [],
      synthesizedContext: content,
    }
  } catch (error) {
    console.error('[Synthesizer] Failed to synthesize research:', error)
    // Fallback to basic combination of insights
    const insights = results.flatMap((r) => r.keyInsights).filter(Boolean)
    return {
      crossTopicThemes: [],
      uniqueAngles: insights.slice(0, 5),
      synthesizedContext: insights.join('\n'),
    }
  }
}
