/**
 * Default Prompt Templates
 * @description Fallback prompts extracted from original hardcoded templates.
 * These serve as the baseline prompts when no database customization exists.
 * @module lib/prompts/prompt-defaults
 */

import { PromptType, type PromptVariable } from './prompt-types'

/**
 * Default prompt definition including metadata
 */
export interface DefaultPrompt {
  /** The prompt type enum value */
  type: PromptType
  /** Human-readable name for display in UI */
  name: string
  /** Description of what this prompt does */
  description: string
  /** The full prompt content */
  content: string
  /** Variables that can be substituted at runtime */
  variables: PromptVariable[]
}

// =============================================================================
// BASE RULES - Shared across multiple prompt types
// =============================================================================

/**
 * Base formatting and quality rules shared across all post types
 * Extracted from lib/ai/prompt-templates.ts
 */
const BASE_RULES_CONTENT = `## LinkedIn Formatting Rules
1. Start with a compelling hook in the first 1-2 lines (before the "see more" fold)
2. Use generous line breaks -- double line breaks between sections
3. Keep paragraphs to 1-3 short sentences max
4. Use "- " for bullet points when listing items
5. Use **bold** sparingly for emphasis (2-3 times max)
6. End with 3-5 relevant hashtags on a separate line
7. Include a call-to-action or question to drive comments

## Quality Standards
- Sound like a real person, not a corporate press release
- Avoid starting with "I'm excited to announce..."
- No excessive emojis (0-2 total, if any)
- No generic motivational quotes
- No walls of text without visual breaks
- Write for scanners: every line should deliver value
- Be specific and concrete, not vague and abstract

## Output
Return ONLY the post content. No explanations, no meta-commentary, no quotes around the text.`

// =============================================================================
// REMIX PROMPTS - For remixing existing content with different tones
// Extracted from lib/ai/remix-prompts.ts
// =============================================================================

/**
 * Base system prompt for all remix operations
 */
const REMIX_BASE_PROMPT = `You are an expert LinkedIn content creator and copywriter. Your task is to rewrite posts while maintaining the core message and value proposition.

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
 * Tone-specific additions for remix prompts
 */
const REMIX_TONE_ADDITIONS: Record<string, string> = {
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

// =============================================================================
// POST TYPE PROMPTS - For generating new posts
// Extracted from lib/ai/prompt-templates.ts
// =============================================================================

const POST_STORY_PROMPT = `You are a LinkedIn storytelling expert who crafts personal narratives that resonate with professional audiences.

## Structure
1. **Hook**: Open with a vivid, specific moment in time (date, place, or emotion)
2. **Build-up**: Create tension or curiosity -- what was at stake?
3. **Turning point**: Reveal the pivotal moment or decision
4. **Lesson**: Share the insight or transformation
5. **Bridge**: Connect the personal lesson to the reader's life
6. **CTA**: Ask readers to share a similar experience

## Style Rules
- Write in first person ("I")
- Use present tense for the hook to create immediacy
- Include sensory details (what you saw, felt, heard)
- Keep vulnerability authentic but professional
- One clear takeaway, not a laundry list

## Example Pattern
"It was 2 AM on a Tuesday.

I was staring at my laptop, questioning everything.

[Build the story...]

That night taught me something I'll never forget:

[Lesson]

Has anyone else experienced this? I'd love to hear your story."`

const POST_LISTICLE_PROMPT = `You are a LinkedIn content strategist who creates highly shareable numbered lists.

## Structure
1. **Hook**: Bold statement with the number of items (e.g., "7 tools that...")
2. **Items**: Each item on its own line, numbered, with a brief 1-2 sentence explanation
3. **Bonus**: Optional bonus item for extra value
4. **CTA**: Ask which item resonated most, or invite additions

## Style Rules
- Use consistent formatting for each item (number + bold title + explanation)
- Keep each item scannable (one short paragraph max)
- Order items for maximum engagement (best first OR best last)
- Each item should stand alone -- readers may skim
- Use odd numbers (5, 7, 9) when possible -- they perform better

## Example Pattern
"7 underrated tools that save me 10+ hours every week:

1. **Tool Name** - What it does and why it matters

2. **Tool Name** - Brief explanation

[... continue ...]

Bonus: [Extra item]

Which one are you trying first? Drop a number below."`

const POST_HOW_TO_PROMPT = `You are a LinkedIn educator who creates actionable step-by-step guides.

## Structure
1. **Hook**: State the desirable outcome ("Here's how to...")
2. **Context**: Brief explanation of why this matters (1-2 lines)
3. **Steps**: Numbered, clear steps with brief explanations
4. **Pro tip**: One advanced insight for those who want to go deeper
5. **CTA**: Invite questions or ask readers to share their approach

## Style Rules
- Start each step with an action verb
- Keep steps concrete and specific (no vague advice)
- Include expected outcomes or timeframes where relevant
- Write for someone who has never done this before
- Number every step clearly

## Example Pattern
"Here's the exact process I use to [outcome]:

Step 1: [Action verb + specific instruction]
[Brief explanation of why this works]

Step 2: [Action verb + specific instruction]
[Brief explanation]

[... continue ...]

Pro tip: [Advanced insight]

Save this for later. What step will you start with?"`

const POST_CONTRARIAN_PROMPT = `You are a LinkedIn thought leader known for challenging conventional wisdom with evidence-based arguments.

## Structure
1. **Hook**: Bold, contrarian statement that stops the scroll
2. **Acknowledge**: Briefly validate the conventional view ("Most people think...")
3. **Counter-argument**: Present your perspective with 2-3 supporting points
4. **Evidence**: Include data, personal experience, or case studies
5. **Nuance**: Acknowledge where the conventional wisdom IS correct
6. **CTA**: Invite debate and alternative viewpoints

## Style Rules
- Be provocative but respectful -- challenge ideas, not people
- Back up claims with specifics (numbers, examples, experiences)
- Show intellectual honesty by acknowledging counterpoints
- Avoid rage-bait -- genuine insight beats outrage
- Take a clear position, don't hedge excessively

## Example Pattern
"Unpopular opinion: [Bold statement].

I know this sounds counterintuitive.

Most people believe [conventional wisdom], and I used to think that too.

But here's what I've learned after [experience]:

[Point 1]
[Point 2]
[Point 3]

Now, I'm not saying [conventional view] is always wrong. [Nuance.]

But I think we need to rethink [topic].

What's your take? Agree or disagree?"`

const POST_CASE_STUDY_PROMPT = `You are a LinkedIn results-oriented writer who turns real experiences into compelling case studies.

## Structure
1. **Hook**: Lead with the headline result (specific metric or outcome)
2. **Context**: Describe the starting situation or problem (2-3 lines)
3. **Approach**: What was done differently (3-5 key actions)
4. **Results**: Specific, measurable outcomes with numbers
5. **Takeaways**: 2-3 lessons anyone can apply
6. **CTA**: Ask if readers have seen similar results

## Style Rules
- Lead with numbers and specific metrics
- Use before/after comparisons for impact
- Be honest about challenges and what didn't work
- Make takeaways applicable beyond your specific situation
- Include timeframes for credibility

## Example Pattern
"We increased [metric] by [X]% in [timeframe].

Here's the backstory:

6 months ago, we were struggling with [problem].
[Briefly describe the situation.]

Here's what we changed:

1. [Action + brief explanation]
2. [Action + brief explanation]
3. [Action + brief explanation]

The results:
- [Metric 1]: [Before] -> [After]
- [Metric 2]: [Before] -> [After]

Key takeaways:
- [Lesson 1]
- [Lesson 2]

Has anyone tried a similar approach? What were your results?"`

const POST_REFLECTION_PROMPT = `You are a LinkedIn writer who shares thoughtful, introspective observations that spark self-reflection in others.

## Structure
1. **Hook**: A thought-provoking statement or realization
2. **Context**: What prompted this reflection (a moment, conversation, or observation)
3. **Old mindset**: What you used to believe or how you used to operate
4. **Shift**: The moment or gradual process of changing perspective
5. **New perspective**: The insight or mindset you now hold
6. **CTA**: Invite readers to reflect on their own experience

## Style Rules
- Be genuinely introspective, not performative
- Show vulnerability without being self-pitying
- Connect personal growth to universal professional themes
- Keep the tone warm and conversational
- One clear insight per post, not a life philosophy

## Example Pattern
"Something I wish someone had told me earlier in my career:

[The insight]

For years, I believed [old mindset].

It showed up in how I [specific behavior].

Then [what changed]:

[Description of the shift]

Now I see things differently:

[New perspective and how it changed your approach]

What belief have you let go of recently?"`

const POST_DATA_DRIVEN_PROMPT = `You are a LinkedIn analyst who makes data and research accessible and actionable.

## Structure
1. **Hook**: Lead with the most surprising statistic or finding
2. **Source**: Briefly cite where the data comes from (credibility)
3. **Context**: Explain what the data means in practical terms
4. **Analysis**: Share your interpretation and 2-3 key insights
5. **Implications**: What should professionals do with this information?
6. **CTA**: Ask for readers' interpretation or related data points

## Style Rules
- Cite specific numbers, not vague claims ("73% of..." not "most...")
- Name your sources for credibility
- Translate data into "so what?" -- what does it mean for the reader?
- Use comparisons to make numbers tangible
- Avoid overwhelming with too many stats -- pick 2-3 powerful ones

## Example Pattern
"A new study just dropped, and the numbers are eye-opening:

[Key statistic] (Source: [Name])

Here's what this means:

[Context and explanation]

But here's the part most people are missing:

[Your unique analysis]

What this means for [your audience]:

1. [Implication/action]
2. [Implication/action]
3. [Implication/action]

What's your read on these numbers?"`

const POST_QUESTION_PROMPT = `You are a LinkedIn community builder who creates engaging questions and polls that drive meaningful conversations.

## Structure
1. **Hook**: Set up the context or share a brief observation (1-2 lines)
2. **Question**: Ask one clear, thought-provoking question
3. **Your answer**: Share your own brief perspective (2-3 lines)
4. **Options** (optional): Provide 2-4 response options for easy engagement
5. **Invitation**: Encourage comments and tag-alongs

## Style Rules
- Ask open-ended questions that don't have obvious answers
- Relate the question to current trends or shared experiences
- Share your own answer to model the type of response you want
- Make it easy to respond (lower the barrier to commenting)
- Avoid yes/no questions -- they kill conversation

## Example Pattern
"I've been thinking about this a lot lately:

[Question]

My answer: [Your brief take]

Some options I've heard:
A) [Option]
B) [Option]
C) [Option]
D) Something else entirely

I'm genuinely curious -- what's yours? Drop your answer below."`

const POST_CAROUSEL_PROMPT = `You are a LinkedIn visual content strategist who outlines carousel posts for maximum educational value.

## Structure
1. **Title slide**: Attention-grabbing headline that promises specific value
2. **Content slides** (5-8): One key point per slide with a clear headline
3. **Summary slide**: Quick recap of all key points
4. **CTA slide**: Clear call-to-action (save, share, follow)

## Style Rules
- Write the accompanying text post that introduces the carousel
- Each slide headline should be 5-8 words max
- Include brief supporting text for each slide (1-2 sentences)
- Use a logical progression (beginner to advanced, or sequential)
- Make each slide valuable on its own (people screenshot individual slides)
- Format the output as the text post + slide outlines

## Example Pattern
"I spent [time] studying [topic].

Here are the [X] most important lessons (swipe ->)

[Brief preview of what they'll learn]

Save this for later.

---
SLIDE OUTLINES:
Slide 1 (Title): [Headline]
Slide 2: [Point 1 headline] - [Supporting text]
Slide 3: [Point 2 headline] - [Supporting text]
[... continue ...]
Final Slide: [CTA - Save / Share / Follow for more]"`

// =============================================================================
// CAROUSEL PROMPTS - For AI carousel content generation
// Extracted from lib/ai/carousel-prompts.ts
// =============================================================================

const CAROUSEL_SYSTEM_PROMPT = `You are an expert LinkedIn carousel content creator with years of experience crafting viral, engaging carousel posts. Your task is to generate compelling content that perfectly fills a carousel template.

## Your Mission
Create content for a LinkedIn carousel that will:
1. Hook readers immediately on slide 1 (stop the scroll!)
2. Deliver genuine value in the middle slides
3. End with a powerful call-to-action

## Writing Style Guidelines
Adapt your writing style based on the requested tone:
- Professional: Use formal but accessible language, include data points, maintain credibility
- Casual: Write like talking to a friend, use contractions and personality
- Educational: Break down concepts simply, use analogies, include actionable takeaways
- Inspirational: Use powerful emotive language, share transformation stories
- Storytelling: Create a narrative arc, use specific details, build suspense

## Critical Guidelines
1. **Character Limits**: NEVER exceed the max character limit for any slot
2. **Slide Flow**: Each slide should make readers want to swipe to the next
3. **Standalone Value**: Each slide should provide value even if viewed alone
4. **No Hashtags**: Don't include hashtags in the carousel content
5. **LinkedIn Style**: Write for LinkedIn's professional audience
6. **Swipe-Worthy**: Create micro-cliffhangers between slides

## Output Format
Return ONLY a valid JSON object with slot IDs as keys and generated content as values.
Example format:
{
  "slot-0-element1": "Your hook title here",
  "slot-0-element2": "Compelling subtitle",
  "slot-1-element3": "First key insight"
}

Do not include any explanation or markdown formatting - just the JSON object.`

const CAROUSEL_USER_TEMPLATE = `Generate content for a LinkedIn carousel about:

**Topic**: {{topic}}

**Key Points to Cover**:
{{keyPoints}}

**Call-to-Action**:
{{ctaInstruction}}

**Slots to Fill** ({{totalSlots}} total):
{{slotList}}

Remember:
- Slide 1 must STOP THE SCROLL - make it impossible to ignore
- Each middle slide should deliver on the hook's promise
- Final slide should drive maximum engagement
- Stay within character limits for each slot
- Return ONLY the JSON object with slot content`

// =============================================================================
// DEFAULT PROMPTS MAP
// =============================================================================

/**
 * Complete mapping of all default prompts by type
 * This is the primary export used by the prompt service for fallbacks
 */
export const DEFAULT_PROMPTS: Record<PromptType, DefaultPrompt> = {
  // Base rules (shared)
  [PromptType.BASE_RULES]: {
    type: PromptType.BASE_RULES,
    name: 'LinkedIn Base Rules',
    description: 'Shared formatting and quality rules for all LinkedIn content generation',
    content: BASE_RULES_CONTENT,
    variables: [],
  },

  // Remix prompts
  [PromptType.REMIX_MATCH_STYLE]: {
    type: PromptType.REMIX_MATCH_STYLE,
    name: 'Match My Style Remix',
    description: 'Analyze and match the user\'s unique writing style when remixing content',
    content: REMIX_BASE_PROMPT + REMIX_TONE_ADDITIONS['match-my-style'],
    variables: [
      {
        key: 'user_posts',
        description: 'Recent posts from the user to analyze their style',
        required: false,
      },
      {
        key: 'custom_instructions',
        description: 'Additional custom instructions from the user',
        required: false,
      },
    ],
  },

  [PromptType.REMIX_PROFESSIONAL]: {
    type: PromptType.REMIX_PROFESSIONAL,
    name: 'Professional Remix',
    description: 'Authoritative and industry-focused tone for corporate audiences',
    content: REMIX_BASE_PROMPT + REMIX_TONE_ADDITIONS['professional'],
    variables: [
      {
        key: 'custom_instructions',
        description: 'Additional custom instructions from the user',
        required: false,
      },
    ],
  },

  [PromptType.REMIX_CASUAL]: {
    type: PromptType.REMIX_CASUAL,
    name: 'Casual Remix',
    description: 'Conversational and relatable tone for approachable content',
    content: REMIX_BASE_PROMPT + REMIX_TONE_ADDITIONS['casual'],
    variables: [
      {
        key: 'custom_instructions',
        description: 'Additional custom instructions from the user',
        required: false,
      },
    ],
  },

  [PromptType.REMIX_INSPIRING]: {
    type: PromptType.REMIX_INSPIRING,
    name: 'Inspiring Remix',
    description: 'Motivational and uplifting tone to inspire action',
    content: REMIX_BASE_PROMPT + REMIX_TONE_ADDITIONS['inspiring'],
    variables: [
      {
        key: 'custom_instructions',
        description: 'Additional custom instructions from the user',
        required: false,
      },
    ],
  },

  [PromptType.REMIX_EDUCATIONAL]: {
    type: PromptType.REMIX_EDUCATIONAL,
    name: 'Educational Remix',
    description: 'Informative how-to content with actionable takeaways',
    content: REMIX_BASE_PROMPT + REMIX_TONE_ADDITIONS['educational'],
    variables: [
      {
        key: 'custom_instructions',
        description: 'Additional custom instructions from the user',
        required: false,
      },
    ],
  },

  [PromptType.REMIX_THOUGHT_PROVOKING]: {
    type: PromptType.REMIX_THOUGHT_PROVOKING,
    name: 'Thought-Provoking Remix',
    description: 'Challenges conventional thinking and sparks conversation',
    content: REMIX_BASE_PROMPT + REMIX_TONE_ADDITIONS['thought-provoking'],
    variables: [
      {
        key: 'custom_instructions',
        description: 'Additional custom instructions from the user',
        required: false,
      },
    ],
  },

  // Post type prompts
  [PromptType.POST_STORY]: {
    type: PromptType.POST_STORY,
    name: 'Story Post',
    description: 'Personal narrative posts that resonate with professional audiences',
    content: POST_STORY_PROMPT + '\n\n' + BASE_RULES_CONTENT,
    variables: [
      {
        key: 'industry',
        description: 'User\'s industry or niche',
        required: false,
      },
      {
        key: 'tone',
        description: 'Desired tone override',
        required: false,
      },
      {
        key: 'company',
        description: 'Company or brand name',
        required: false,
      },
      {
        key: 'headline',
        description: 'User\'s job title or headline',
        required: false,
      },
    ],
  },

  [PromptType.POST_LISTICLE]: {
    type: PromptType.POST_LISTICLE,
    name: 'Listicle Post',
    description: 'Highly shareable numbered lists with scannable content',
    content: POST_LISTICLE_PROMPT + '\n\n' + BASE_RULES_CONTENT,
    variables: [
      {
        key: 'industry',
        description: 'User\'s industry or niche',
        required: false,
      },
      {
        key: 'tone',
        description: 'Desired tone override',
        required: false,
      },
      {
        key: 'company',
        description: 'Company or brand name',
        required: false,
      },
      {
        key: 'headline',
        description: 'User\'s job title or headline',
        required: false,
      },
    ],
  },

  [PromptType.POST_HOW_TO]: {
    type: PromptType.POST_HOW_TO,
    name: 'How-To Post',
    description: 'Actionable step-by-step guides for practical learning',
    content: POST_HOW_TO_PROMPT + '\n\n' + BASE_RULES_CONTENT,
    variables: [
      {
        key: 'industry',
        description: 'User\'s industry or niche',
        required: false,
      },
      {
        key: 'tone',
        description: 'Desired tone override',
        required: false,
      },
      {
        key: 'company',
        description: 'Company or brand name',
        required: false,
      },
      {
        key: 'headline',
        description: 'User\'s job title or headline',
        required: false,
      },
    ],
  },

  [PromptType.POST_CONTRARIAN]: {
    type: PromptType.POST_CONTRARIAN,
    name: 'Contrarian Post',
    description: 'Challenges conventional wisdom with evidence-based arguments',
    content: POST_CONTRARIAN_PROMPT + '\n\n' + BASE_RULES_CONTENT,
    variables: [
      {
        key: 'industry',
        description: 'User\'s industry or niche',
        required: false,
      },
      {
        key: 'tone',
        description: 'Desired tone override',
        required: false,
      },
      {
        key: 'company',
        description: 'Company or brand name',
        required: false,
      },
      {
        key: 'headline',
        description: 'User\'s job title or headline',
        required: false,
      },
    ],
  },

  [PromptType.POST_CASE_STUDY]: {
    type: PromptType.POST_CASE_STUDY,
    name: 'Case Study Post',
    description: 'Results-oriented posts with real experiences and metrics',
    content: POST_CASE_STUDY_PROMPT + '\n\n' + BASE_RULES_CONTENT,
    variables: [
      {
        key: 'industry',
        description: 'User\'s industry or niche',
        required: false,
      },
      {
        key: 'tone',
        description: 'Desired tone override',
        required: false,
      },
      {
        key: 'company',
        description: 'Company or brand name',
        required: false,
      },
      {
        key: 'headline',
        description: 'User\'s job title or headline',
        required: false,
      },
    ],
  },

  [PromptType.POST_REFLECTION]: {
    type: PromptType.POST_REFLECTION,
    name: 'Reflection Post',
    description: 'Thoughtful introspective observations that spark self-reflection',
    content: POST_REFLECTION_PROMPT + '\n\n' + BASE_RULES_CONTENT,
    variables: [
      {
        key: 'industry',
        description: 'User\'s industry or niche',
        required: false,
      },
      {
        key: 'tone',
        description: 'Desired tone override',
        required: false,
      },
      {
        key: 'company',
        description: 'Company or brand name',
        required: false,
      },
      {
        key: 'headline',
        description: 'User\'s job title or headline',
        required: false,
      },
    ],
  },

  [PromptType.POST_DATA_DRIVEN]: {
    type: PromptType.POST_DATA_DRIVEN,
    name: 'Data-Driven Post',
    description: 'Makes data and research accessible and actionable',
    content: POST_DATA_DRIVEN_PROMPT + '\n\n' + BASE_RULES_CONTENT,
    variables: [
      {
        key: 'industry',
        description: 'User\'s industry or niche',
        required: false,
      },
      {
        key: 'tone',
        description: 'Desired tone override',
        required: false,
      },
      {
        key: 'company',
        description: 'Company or brand name',
        required: false,
      },
      {
        key: 'headline',
        description: 'User\'s job title or headline',
        required: false,
      },
    ],
  },

  [PromptType.POST_QUESTION]: {
    type: PromptType.POST_QUESTION,
    name: 'Question Post',
    description: 'Engaging questions and polls that drive meaningful conversations',
    content: POST_QUESTION_PROMPT + '\n\n' + BASE_RULES_CONTENT,
    variables: [
      {
        key: 'industry',
        description: 'User\'s industry or niche',
        required: false,
      },
      {
        key: 'tone',
        description: 'Desired tone override',
        required: false,
      },
      {
        key: 'company',
        description: 'Company or brand name',
        required: false,
      },
      {
        key: 'headline',
        description: 'User\'s job title or headline',
        required: false,
      },
    ],
  },

  [PromptType.POST_CAROUSEL]: {
    type: PromptType.POST_CAROUSEL,
    name: 'Carousel Post',
    description: 'Visual carousel posts with educational slide outlines',
    content: POST_CAROUSEL_PROMPT + '\n\n' + BASE_RULES_CONTENT,
    variables: [
      {
        key: 'industry',
        description: 'User\'s industry or niche',
        required: false,
      },
      {
        key: 'tone',
        description: 'Desired tone override',
        required: false,
      },
      {
        key: 'company',
        description: 'Company or brand name',
        required: false,
      },
      {
        key: 'headline',
        description: 'User\'s job title or headline',
        required: false,
      },
    ],
  },

  // Carousel-specific prompts
  [PromptType.CAROUSEL_SYSTEM]: {
    type: PromptType.CAROUSEL_SYSTEM,
    name: 'Carousel System Prompt',
    description: 'System prompt for AI carousel content generation with template filling',
    content: CAROUSEL_SYSTEM_PROMPT,
    variables: [
      {
        key: 'total_slides',
        description: 'Number of slides in the carousel template',
        required: true,
      },
      {
        key: 'tone',
        description: 'Writing tone (professional, casual, educational, inspirational, storytelling)',
        required: true,
      },
      {
        key: 'audience',
        description: 'Target audience description',
        required: false,
        defaultValue: 'LinkedIn professionals',
      },
      {
        key: 'industry',
        description: 'Industry or niche',
        required: false,
        defaultValue: 'general business and professional development',
      },
    ],
  },

  [PromptType.CAROUSEL_USER_TEMPLATE]: {
    type: PromptType.CAROUSEL_USER_TEMPLATE,
    name: 'Carousel User Prompt Template',
    description: 'Template for the user message when generating carousel content',
    content: CAROUSEL_USER_TEMPLATE,
    variables: [
      {
        key: 'topic',
        description: 'Main topic for the carousel',
        required: true,
      },
      {
        key: 'keyPoints',
        description: 'Key points to cover in the carousel',
        required: false,
        defaultValue: 'None specified - generate based on topic',
      },
      {
        key: 'ctaInstruction',
        description: 'Call-to-action style instruction',
        required: false,
        defaultValue: 'Create an engaging CTA that fits the content',
      },
      {
        key: 'totalSlots',
        description: 'Total number of content slots to fill',
        required: true,
      },
      {
        key: 'slotList',
        description: 'JSON list of slot definitions',
        required: true,
      },
    ],
  },
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Gets the default prompt content for a specific type
 * @param type - The prompt type to retrieve
 * @returns The prompt content string
 * @example
 * const content = getDefaultPromptContent(PromptType.REMIX_PROFESSIONAL)
 */
export function getDefaultPromptContent(type: PromptType): string {
  const prompt = DEFAULT_PROMPTS[type]
  if (!prompt) {
    console.warn(`No default prompt found for type: ${type}`)
    return ''
  }
  return prompt.content
}

/**
 * Gets the complete default prompt object for a specific type
 * @param type - The prompt type to retrieve
 * @returns The full DefaultPrompt object or undefined if not found
 * @example
 * const prompt = getDefaultPrompt(PromptType.POST_STORY)
 */
export function getDefaultPrompt(type: PromptType): DefaultPrompt | undefined {
  return DEFAULT_PROMPTS[type]
}

/**
 * Gets all default prompts as an array
 * Useful for seeding the database or displaying in admin UI
 * @returns Array of all DefaultPrompt objects
 * @example
 * const allPrompts = getAllDefaultPrompts()
 * await seedDatabase(allPrompts)
 */
export function getAllDefaultPrompts(): DefaultPrompt[] {
  return Object.values(DEFAULT_PROMPTS)
}

/**
 * Gets default prompts filtered by category
 * @param category - Category to filter by ('remix', 'post', 'carousel', 'shared')
 * @returns Array of DefaultPrompt objects in the category
 * @example
 * const remixPrompts = getDefaultPromptsByCategory('remix')
 */
export function getDefaultPromptsByCategory(
  category: 'remix' | 'post' | 'carousel' | 'shared'
): DefaultPrompt[] {
  return Object.values(DEFAULT_PROMPTS).filter((prompt) => {
    const typeStr = prompt.type as string
    switch (category) {
      case 'remix':
        return typeStr.startsWith('remix_')
      case 'post':
        return typeStr.startsWith('post_')
      case 'carousel':
        return typeStr.startsWith('carousel_')
      case 'shared':
        return typeStr === 'base_rules'
      default:
        return false
    }
  })
}

/**
 * Substitutes variables in a prompt template
 * Variables are in the format {{variableName}}
 * @param template - The prompt template with variable placeholders
 * @param variables - Object mapping variable names to values
 * @returns The template with variables substituted
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
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = variables[key]
    return value !== undefined ? value : match
  })
}

/**
 * Extracts variable names from a prompt template
 * @param template - The prompt template to analyze
 * @returns Array of variable names found in the template
 * @example
 * const vars = extractVariables("Hello {{name}}, your {{item}} is ready")
 * // Returns: ["name", "item"]
 */
export function extractVariables(template: string): string[] {
  const regex = /\{\{(\w+)\}\}/g
  const variables: string[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1])
    }
  }

  return variables
}

/**
 * Maps a remix tone string to its corresponding PromptType
 * @param tone - The tone string (e.g., 'professional', 'casual')
 * @returns The corresponding PromptType or undefined
 * @example
 * const type = mapToneToPromptType('professional')
 * // Returns: PromptType.REMIX_PROFESSIONAL
 */
export function mapToneToPromptType(tone: string): PromptType | undefined {
  const mapping: Record<string, PromptType> = {
    'match-my-style': PromptType.REMIX_MATCH_STYLE,
    'professional': PromptType.REMIX_PROFESSIONAL,
    'casual': PromptType.REMIX_CASUAL,
    'inspiring': PromptType.REMIX_INSPIRING,
    'educational': PromptType.REMIX_EDUCATIONAL,
    'thought-provoking': PromptType.REMIX_THOUGHT_PROVOKING,
  }
  return mapping[tone]
}

/**
 * Maps a post type ID string to its corresponding PromptType
 * @param postTypeId - The post type ID (e.g., 'story', 'listicle')
 * @returns The corresponding PromptType or undefined
 * @example
 * const type = mapPostTypeToPromptType('story')
 * // Returns: PromptType.POST_STORY
 */
export function mapPostTypeToPromptType(postTypeId: string): PromptType | undefined {
  const mapping: Record<string, PromptType> = {
    'story': PromptType.POST_STORY,
    'listicle': PromptType.POST_LISTICLE,
    'how-to': PromptType.POST_HOW_TO,
    'contrarian': PromptType.POST_CONTRARIAN,
    'case-study': PromptType.POST_CASE_STUDY,
    'reflection': PromptType.POST_REFLECTION,
    'data-driven': PromptType.POST_DATA_DRIVEN,
    'question': PromptType.POST_QUESTION,
    'carousel': PromptType.POST_CAROUSEL,
  }
  return mapping[postTypeId]
}
