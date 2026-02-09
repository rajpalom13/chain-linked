/**
 * Inngest Client Configuration
 * @description Centralized Inngest client for background job processing
 * @module lib/inngest/client
 */

import { Inngest } from 'inngest'

/**
 * Post type for AI generation
 */
export type PostType =
  | 'thought-leadership'
  | 'storytelling'
  | 'educational'
  | 'contrarian'
  | 'data-driven'
  | 'how-to'
  | 'listicle'

/**
 * Research depth level
 */
export type ResearchDepth = 'basic' | 'deep'

/**
 * Research session status
 */
export type ResearchSessionStatus =
  | 'pending'
  | 'initializing'
  | 'searching'
  | 'enriching'
  | 'generating'
  | 'saving'
  | 'completed'
  | 'failed'

/**
 * Event types for type-safe event triggering
 */
export type InngestEvents = {
  // Company Analysis Events
  'company/analyze': {
    data: {
      userId: string
      companyContextId: string
      companyName: string
      websiteUrl: string
      industry?: string
      targetAudienceInput?: string
    }
  }
  'company/analyze.completed': {
    data: {
      userId: string
      companyContextId: string
      success: boolean
    }
  }

  // Deep Research Events
  'discover/research': {
    data: {
      /** User requesting research */
      userId: string
      /** Unique session identifier */
      sessionId: string
      /** Topics to research (max 5) */
      topics: string[]
      /** Research depth level */
      depth: ResearchDepth
      /** Max results per topic (default: 5) */
      maxResultsPerTopic?: number
      /** Whether to generate LinkedIn posts from results */
      generatePosts?: boolean
      /** Types of posts to generate */
      postTypes?: PostType[]
      /** Optional company context for personalized generation */
      companyContextId?: string
      /** Whether to apply user's writing style to generated posts */
      useMyStyle?: boolean
    }
  }

  'discover/research.completed': {
    data: {
      userId: string
      sessionId: string
      /** Number of discover posts created */
      postsDiscovered: number
      /** Number of AI-generated posts created */
      postsGenerated: number
      /** Topics that were researched */
      topics: string[]
      /** Total duration in milliseconds */
      duration: number
    }
  }

  'discover/research.failed': {
    data: {
      userId: string
      sessionId: string
      /** Error message */
      error: string
      /** Which step failed */
      step: string
    }
  }

  'discover/research.progress': {
    data: {
      userId: string
      sessionId: string
      /** Current step name */
      step: string
      /** Progress percentage (0-100) */
      progress: number
      /** Optional status message */
      message?: string
    }
  }

  // Scheduled Research Events
  'discover/research.scheduled': {
    data: {
      /** Schedule configuration ID */
      scheduleId: string
      /** User ID for the schedule */
      userId: string
    }
  }

  // Daily Content Ingest Events
  'discover/ingest': {
    data: {
      /** Batch ID for grouping ingested items */
      batchId: string
      /** Topics to ingest for */
      topics: string[]
      /** Max results per topic */
      maxResultsPerTopic?: number
    }
  }

  'discover/ingest.completed': {
    data: {
      /** Batch ID */
      batchId: string
      /** Number of new posts ingested */
      postsIngested: number
      /** Topics that were searched */
      topicsSearched: number
    }
  }

  // Swipe Suggestion Generation Events
  'swipe/generate-suggestions': {
    data: {
      /** User requesting suggestion generation */
      userId: string
      /** Unique generation run ID */
      runId: string
    }
  }

  'swipe/suggestions-ready': {
    data: {
      /** User who requested generation */
      userId: string
      /** Generation run ID */
      runId: string
      /** Number of suggestions generated */
      count: number
      /** Whether generation was successful */
      success: boolean
    }
  }
}

/**
 * Check if Inngest is properly configured
 */
function validateInngestConfig() {
  const eventKey = process.env.INNGEST_EVENT_KEY
  const signingKey = process.env.INNGEST_SIGNING_KEY
  const isDev = process.env.NODE_ENV === 'development'

  if (!eventKey && !isDev) {
    console.warn('[Inngest] INNGEST_EVENT_KEY is not configured - events will not be sent in production')
  }

  if (!signingKey && !isDev) {
    console.warn('[Inngest] INNGEST_SIGNING_KEY is not configured - webhook verification will fail in production')
  }

  return { eventKey, signingKey, isDev }
}

const config = validateInngestConfig()

/**
 * Inngest client instance
 * Used for defining and triggering background functions
 *
 * IMPORTANT: In development, you MUST run the Inngest Dev Server:
 * ```bash
 * npx inngest-cli@latest dev
 * ```
 * Then open http://127.0.0.1:8288 to view the dashboard
 */
export const inngest = new Inngest({
  id: 'chainlinked',
  name: 'ChainLinked',
  // Explicitly set event key for reliable event sending
  eventKey: config.eventKey,
})

/**
 * Type helper for extracting event data
 */
export type EventData<T extends keyof InngestEvents> = InngestEvents[T]['data']
