/**
 * Admin Constants
 * @description Configuration constants for the admin panel
 * @module lib/admin/constants
 */

/**
 * List of email addresses with admin access.
 * Used for client-side admin role checking until proper RBAC is implemented.
 */
export const ADMIN_EMAILS: string[] = [
  "admin@chainlinked.com",
  "founder@chainlinked.com",
]

/**
 * Local storage keys for admin data persistence.
 * These will be replaced with database tables when ready.
 */
export const ADMIN_STORAGE_KEYS = {
  PROMPTS: "chainlinked_admin_prompts",
  SETTINGS: "chainlinked_admin_settings",
  FEATURE_FLAGS: "chainlinked_admin_feature_flags",
} as const

/**
 * Default feature flags for the application
 */
export const DEFAULT_FEATURE_FLAGS = [
  {
    key: "ai_generation",
    name: "AI Content Generation",
    description: "Enable AI-powered post and carousel content generation",
    enabled: true,
  },
  {
    key: "carousel_creator",
    name: "Carousel Creator",
    description: "Enable the visual carousel creator with PDF export",
    enabled: true,
  },
  {
    key: "swipe_interface",
    name: "Swipe Interface",
    description: "Enable the Tinder-style post suggestion swipe interface",
    enabled: true,
  },
  {
    key: "team_features",
    name: "Team Collaboration",
    description: "Enable team activity feeds, leaderboards, and collaboration tools",
    enabled: true,
  },
  {
    key: "prompt_playground",
    name: "Prompt Playground",
    description: "Enable the prompt playground for users to experiment with AI prompts",
    enabled: false,
  },
  {
    key: "post_scheduling",
    name: "Post Scheduling",
    description: "Enable the post scheduling and queue management features",
    enabled: true,
  },
  {
    key: "linkedin_posting",
    name: "Direct LinkedIn Posting",
    description: "Allow users to post directly to LinkedIn from the app",
    enabled: false,
  },
  {
    key: "analytics_export",
    name: "Analytics Export",
    description: "Allow users to export analytics data as CSV or PDF",
    enabled: false,
  },
] as const

/**
 * Default admin settings
 */
export const DEFAULT_ADMIN_SETTINGS = [
  {
    key: "default_ai_model",
    label: "Default AI Model",
    value: "gpt-4o-mini",
    description: "The default OpenAI model used for AI content generation",
    type: "select" as const,
    options: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
  },
  {
    key: "max_ai_generations_per_day",
    label: "Max AI Generations Per Day",
    value: 50,
    description: "Maximum number of AI generations a user can run per day",
    type: "number" as const,
  },
  {
    key: "max_scheduled_posts",
    label: "Max Scheduled Posts",
    value: 20,
    description: "Maximum number of posts a user can have scheduled at once",
    type: "number" as const,
  },
  {
    key: "default_post_prompt",
    label: "Default Post System Prompt",
    value: "You are a LinkedIn content expert. Generate engaging professional posts.",
    description: "The default system prompt used for post generation",
    type: "text" as const,
  },
  {
    key: "default_carousel_prompt",
    label: "Default Carousel System Prompt",
    value: "You are a LinkedIn carousel expert. Generate slide content that tells a story.",
    description: "The default system prompt used for carousel generation",
    type: "text" as const,
  },
  {
    key: "default_remix_prompt",
    label: "Default Remix System Prompt",
    value: "You are a content remixer. Take the given content and create a fresh LinkedIn post.",
    description: "The default system prompt used for content remixing",
    type: "text" as const,
  },
]

/**
 * Default system prompts
 */
export const DEFAULT_PROMPTS = [
  {
    id: "prompt-post-default",
    name: "Default Post Generator",
    type: "post" as const,
    content: "You are a LinkedIn content expert specializing in professional storytelling. Create engaging posts that drive meaningful engagement and establish thought leadership. Use hooks, storytelling, and clear calls-to-action.",
    isActive: true,
    version: 1,
    versionHistory: [],
    usageCount: 245,
    updatedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "prompt-post-storytelling",
    name: "Storytelling Post",
    type: "post" as const,
    content: "You are a master storyteller for LinkedIn. Transform topics into compelling narratives with a strong hook, rising tension, and a meaningful takeaway. Use personal anecdotes and relatable situations.",
    isActive: false,
    version: 2,
    versionHistory: [
      {
        version: 1,
        content: "You are a storyteller for LinkedIn. Write narrative posts.",
        savedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    usageCount: 89,
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "prompt-carousel-default",
    name: "Default Carousel Generator",
    type: "carousel" as const,
    content: "You are a LinkedIn carousel content expert. Generate structured slide content that progressively builds on a topic. Each slide should have a clear heading and concise supporting text. Start with a hook slide and end with a CTA.",
    isActive: true,
    version: 1,
    versionHistory: [],
    usageCount: 156,
    updatedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "prompt-remix-default",
    name: "Default Content Remixer",
    type: "remix" as const,
    content: "You are a content remix specialist. Take the provided content and create a fresh, original LinkedIn post that captures the key insights while adding a unique perspective. Maintain professional tone and optimize for engagement.",
    isActive: true,
    version: 1,
    versionHistory: [],
    usageCount: 67,
    updatedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
  },
]
