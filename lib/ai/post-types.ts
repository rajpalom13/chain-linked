/**
 * Post Type Taxonomy
 * @description Defines the classification system for LinkedIn post types,
 * including type metadata, icons, colors, and helper functions.
 * @module lib/ai/post-types
 */

/**
 * Post type definition with metadata for display and generation
 */
export interface PostTypeDefinition {
  /** Unique identifier for the post type */
  id: string
  /** Human-readable label */
  label: string
  /** Tabler icon name for display */
  icon: string
  /** Brief description of what this post type entails */
  description: string
  /** Tailwind color name for styling */
  color: string
  /** Category grouping for organization */
  category: 'narrative' | 'educational' | 'engagement' | 'visual'
  /** Example hook line to illustrate the format */
  exampleHook: string
}

/**
 * Comprehensive post type taxonomy for LinkedIn content
 *
 * Each type defines a distinct content format with its own structure,
 * tone expectations, and engagement patterns.
 */
export const POST_TYPES = {
  STORY: {
    id: 'story',
    label: 'Personal Story',
    icon: 'IconBook',
    description: 'Share a personal experience or lesson learned',
    color: 'blue',
    category: 'narrative',
    exampleHook: '"3 years ago I made a decision that changed my career forever..."',
  },
  LISTICLE: {
    id: 'listicle',
    label: 'Listicle',
    icon: 'IconList',
    description: 'Numbered list of tips, tools, or insights',
    color: 'emerald',
    category: 'educational',
    exampleHook: '"7 tools that saved me 10 hours every week:"',
  },
  HOW_TO: {
    id: 'how-to',
    label: 'How-To Guide',
    icon: 'IconRoute',
    description: 'Step-by-step tutorial or process',
    color: 'violet',
    category: 'educational',
    exampleHook: '"Here\'s the exact process I use to close 6-figure deals:"',
  },
  CONTRARIAN: {
    id: 'contrarian',
    label: 'Contrarian Take',
    icon: 'IconArrowsShuffle',
    description: 'Challenge conventional wisdom with a hot take',
    color: 'red',
    category: 'engagement',
    exampleHook: '"Unpopular opinion: hustle culture is ruining the tech industry."',
  },
  CASE_STUDY: {
    id: 'case-study',
    label: 'Case Study',
    icon: 'IconChartBar',
    description: 'Real results and data from an experience',
    color: 'amber',
    category: 'narrative',
    exampleHook: '"We increased revenue by 340% in 6 months. Here\'s how:"',
  },
  REFLECTION: {
    id: 'reflection',
    label: 'Personal Reflection',
    icon: 'IconMoodSmile',
    description: 'Thoughtful observation or mindset shift',
    color: 'rose',
    category: 'narrative',
    exampleHook: '"Something I wish someone had told me 5 years ago:"',
  },
  DATA_DRIVEN: {
    id: 'data-driven',
    label: 'Data-Driven',
    icon: 'IconChartDots',
    description: 'Statistics and research-backed insights',
    color: 'cyan',
    category: 'educational',
    exampleHook: '"A new study just revealed something surprising about remote work:"',
  },
  QUESTION: {
    id: 'question',
    label: 'Question / Poll',
    icon: 'IconMessageQuestion',
    description: 'Engage audience with a thought-provoking question',
    color: 'orange',
    category: 'engagement',
    exampleHook: '"What\'s the one skill you wish you\'d learned 10 years ago?"',
  },
  CAROUSEL: {
    id: 'carousel',
    label: 'Carousel Post',
    icon: 'IconPresentation',
    description: 'Multi-slide educational content',
    color: 'purple',
    category: 'visual',
    exampleHook: '"Swipe through to learn the 5 pillars of great leadership ->"',
  },
} as const

/**
 * Union type of all valid post type IDs
 */
export type PostTypeId = typeof POST_TYPES[keyof typeof POST_TYPES]['id']

/**
 * All post type keys as a union type
 */
export type PostTypeKey = keyof typeof POST_TYPES

/**
 * Category labels for grouping post types in the UI
 */
export const POST_TYPE_CATEGORIES: Record<PostTypeDefinition['category'], string> = {
  narrative: 'Storytelling',
  educational: 'Educational',
  engagement: 'Engagement',
  visual: 'Visual',
}

/**
 * Goal category type extracted from PostTypeDefinition
 */
export type GoalCategory = PostTypeDefinition['category']

/**
 * Goal labels with descriptions and icon names for the PostGoalSelector cards
 */
export const GOAL_LABELS: Record<GoalCategory, { label: string; description: string; icon: string }> = {
  narrative: { label: 'Tell a Story', description: 'Share an experience or lesson', icon: 'IconBook' },
  educational: { label: 'Teach Something', description: 'Share knowledge or a framework', icon: 'IconSchool' },
  engagement: { label: 'Start a Conversation', description: 'Spark debate or ask a question', icon: 'IconMessages' },
  visual: { label: 'Visual Content', description: 'Create a carousel or slide deck', icon: 'IconPresentation' },
}

/**
 * Retrieves a post type definition by its ID
 * @param id - The post type ID to look up (e.g., 'story', 'listicle')
 * @returns The post type definition, or undefined if not found
 * @example
 * const storyType = getPostType('story')
 * // => { id: 'story', label: 'Personal Story', ... }
 */
export function getPostType(id: string): PostTypeDefinition | undefined {
  return Object.values(POST_TYPES).find((type) => type.id === id)
}

/**
 * Returns all post type definitions as a flat array
 * @returns Array of all post type definitions
 * @example
 * const allTypes = getAllPostTypes()
 * // => [{ id: 'story', ... }, { id: 'listicle', ... }, ...]
 */
export function getAllPostTypes(): PostTypeDefinition[] {
  return Object.values(POST_TYPES)
}

/**
 * Returns post types grouped by their category
 * @returns Object with category keys mapping to arrays of post type definitions
 * @example
 * const grouped = getPostTypesGrouped()
 * // => { narrative: [...], educational: [...], engagement: [...], visual: [...] }
 */
export function getPostTypesGrouped(): Record<PostTypeDefinition['category'], PostTypeDefinition[]> {
  const grouped: Record<PostTypeDefinition['category'], PostTypeDefinition[]> = {
    narrative: [],
    educational: [],
    engagement: [],
    visual: [],
  }

  for (const type of getAllPostTypes()) {
    grouped[type.category].push(type)
  }

  return grouped
}

/**
 * Retrieves the system prompt fragment for a given post type.
 * This is a lightweight accessor -- full prompts live in prompt-templates.ts.
 * @param id - The post type ID
 * @returns A short structural guideline string, or empty string if not found
 * @example
 * const prompt = getPostTypePrompt('listicle')
 */
export function getPostTypePrompt(id: string): string {
  const type = getPostType(id)
  if (!type) return ''

  const prompts: Record<PostTypeId, string> = {
    'story': 'Structure: Hook with a vivid moment -> Build tension -> Reveal the lesson -> Reflect and connect to audience.',
    'listicle': 'Structure: Bold hook with the count -> Numbered items with one-line explanations -> Closing CTA.',
    'how-to': 'Structure: State the outcome -> Step-by-step numbered instructions -> Pro tips -> Summary CTA.',
    'contrarian': 'Structure: Bold contrarian statement -> Acknowledge the conventional view -> Present your counter-argument with evidence -> Invite debate.',
    'case-study': 'Structure: Headline result/metric -> Context (the problem) -> What was done -> Results with numbers -> Key takeaways.',
    'reflection': 'Structure: Set the scene or trigger -> Share the old mindset -> Describe the shift -> New perspective and takeaway.',
    'data-driven': 'Structure: Surprising stat as hook -> Provide context for the data -> Analysis/insight -> What it means for the reader.',
    'question': 'Structure: Set up the context -> Ask the main question -> Share your own brief answer -> Invite others to respond.',
    'carousel': 'Structure: Attention-grabbing title slide -> One key point per slide -> Summary slide -> CTA to save/share.',
  }

  return prompts[type.id as PostTypeId] ?? ''
}
