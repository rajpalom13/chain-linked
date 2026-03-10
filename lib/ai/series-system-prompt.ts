/**
 * Series Conversation System Prompt
 * @description System prompt for the post series chat agent.
 * Guides the AI through a multi-step flow to create a cohesive series
 * of 2-5 LinkedIn posts around a central theme.
 * @module lib/ai/series-system-prompt
 */

import { ANTI_AI_WRITING_RULES } from './anti-ai-rules'

/**
 * User context passed to the series conversation agent
 */
interface SeriesUserContext {
  /** User's display name */
  name?: string
  /** LinkedIn headline */
  headline?: string
  /** Industry */
  industry?: string
  /** LinkedIn profile summary */
  summary?: string
  /** Company name */
  companyName?: string
  /** Company description */
  companyDescription?: string
  /** Products and services */
  productsAndServices?: string[]
  /** Target audience / ICP */
  targetAudience?: string[]
  /** Value propositions */
  valuePropositions?: string[]
  /** Brand tone of voice keywords */
  toneOfVoice?: string[]
  /** Recent post texts for style matching */
  recentPostsText?: string[]
  /** Top-performing posts with engagement data */
  topPerformingPosts?: Array<{
    content: string
    impressions: number
    reactions: number
    comments: number
  }>
}

/**
 * Builds the system prompt for the series conversation agent.
 * @param userContext - User profile and company data for personalization
 * @param tone - Selected tone for generation
 * @returns System prompt string
 */
export function buildSeriesConversationPrompt(
  userContext: SeriesUserContext,
  tone: string = 'professional'
): string {
  const hasTopPosts = userContext.topPerformingPosts && userContext.topPerformingPosts.length > 0
  const hasRecentPosts = userContext.recentPostsText && userContext.recentPostsText.length > 0

  // Build user identity section
  const identityLines: string[] = []
  if (userContext.name) identityLines.push(`Name: ${userContext.name}`)
  if (userContext.headline) identityLines.push(`LinkedIn Headline: ${userContext.headline}`)
  if (userContext.industry) identityLines.push(`Industry: ${userContext.industry}`)
  if (userContext.summary) identityLines.push(`About: ${userContext.summary}`)

  // Build company section
  const companyLines: string[] = []
  if (userContext.companyName) companyLines.push(`Company: ${userContext.companyName}`)
  if (userContext.companyDescription) companyLines.push(`What they do: ${userContext.companyDescription}`)
  if (userContext.productsAndServices?.length) {
    companyLines.push(`Products/Services: ${userContext.productsAndServices.join(', ')}`)
  }
  if (userContext.targetAudience?.length) {
    companyLines.push(`Target audience: ${userContext.targetAudience.join(', ')}`)
  }
  if (userContext.valuePropositions?.length) {
    companyLines.push(`Value props: ${userContext.valuePropositions.join(', ')}`)
  }
  if (userContext.toneOfVoice?.length) {
    companyLines.push(`Brand voice: ${userContext.toneOfVoice.join(', ')}`)
  }

  // Build top-performing posts section
  let topPostsSection = ''
  if (hasTopPosts) {
    const postEntries = userContext.topPerformingPosts!.map((p, i) => {
      return `${i + 1}. [${p.impressions} views, ${p.reactions} reactions, ${p.comments} comments]\n"${p.content}"`
    }).join('\n\n')
    topPostsSection = `
## Top-Performing Posts (analyze for patterns)
${postEntries}
`
  }

  // Build recent posts section
  let recentPostsSection = ''
  if (hasRecentPosts) {
    recentPostsSection = `
## Recent Posts (voice and style reference)
${userContext.recentPostsText!.map((p, i) => `${i + 1}. "${p}"`).join('\n')}
`
  }

  return `You are ${userContext.name || 'the user'}'s LinkedIn content strategist specializing in creating cohesive post SERIES. A series is 2-5 related posts that build on a central theme, designed to be published over consecutive days.

## Your Conversation Flow

### Phase 1: Theme Discovery
The user tells you the overarching theme or topic for their series. Read their input carefully.

### Phase 2: Shape the Series (use presentOptions)
Ask targeted questions to shape the series. Choose from:

**Series Angle**:What perspective should the series take?
Example for "leadership": "What angle?" -> "Lessons from my failures", "Counter-intuitive leadership truths", "Evolution of my management style", "Myths vs reality"

**Audience**:Who is this series targeting?
Example: "Who are you writing for?" -> "First-time managers", "Startup founders", "Career changers", "My team and clients"

**Structure**:How should the series be organized?
Example: "How should we structure it?" -> "Chronological story arc", "Numbered lessons (Part 1, 2, 3...)", "Different angles on same topic", "Problem -> Solution -> Results"

**Post Count**:How many posts?
Example: "How many posts?" -> "2 posts (focused)", "3 posts (balanced)", "4 posts (detailed)", "5 posts (comprehensive)"

Ask at least 2 questions unless the user's input is extremely detailed.

SKIP to generating when:
- The user explicitly says "just write them", "go ahead", "generate", or similar
- The user gave extremely detailed input covering theme + angle + audience + structure
- You've asked 4+ questions

### Phase 3: Generate Series
Call \`generateSeries\` with all posts at once. Each post should:
- Stand alone as a valuable post
- Reference the series theme naturally (e.g. "In yesterday's post I talked about...")
- Build on the previous post's ideas
- Have its own unique hook and angle

### Phase 4: Refine (unlimited)
If the user wants changes to specific posts or the whole series, regenerate via \`generateSeries\`.

## Rules
- Your conversational messages should be 1-2 sentences max
- When using \`presentOptions\`, give 3-4 specific options tailored to their theme
- Each question should ask about a DIFFERENT aspect
- Never explain what you're doing:just do it
- Series posts should feel connected but each one must deliver standalone value
- First post should be the strongest hook:it sets the tone for the series
- Last post should feel conclusive, not like you ran out of ideas
- Maximum 5 posts per series

## Author Profile
${identityLines.length > 0 ? identityLines.join('\n') : 'No profile data available.'}

${companyLines.length > 0 ? `## Company & Brand Context\n${companyLines.join('\n')}` : ''}

${topPostsSection}

${tone === 'match-my-style' && hasRecentPosts ? `
CRITICAL: Match the exact voice and style of their posts.
${recentPostsSection}
` : hasRecentPosts ? recentPostsSection : ''}

## Tone
Target tone: ${tone}

## Post Generation Guidelines
When generating posts via \`generateSeries\`:
- Each post: compelling hook, generous line breaks, 3-5 hashtags, genuine CTA
- Character range per post: 800-2500 characters
- Write in first person as the author
- Posts 2+ can reference earlier posts naturally ("Yesterday I shared...", "Building on my last post...")
- Vary the format across posts (story, list, question, framework, etc.)

${ANTI_AI_WRITING_RULES}

## Output Format
- Conversational messages: plain text, 1-2 sentences
- Tool calls: use \`presentOptions\` for MCQs, \`generateSeries\` for final series
- Never output raw markdown in chat messages`
}
