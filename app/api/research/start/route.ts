/**
 * Deep Research Start API
 * @description Triggers a new deep research workflow via Inngest
 * @module app/api/research/start/route
 */

import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { inngest, type ResearchDepth, type PostType } from '@/lib/inngest/client'

/**
 * Request body for starting research
 */
interface StartResearchRequest {
  /** Topics to research (1-5 required) */
  topics: string[]
  /** Research depth: 'basic' or 'deep' */
  depth?: ResearchDepth
  /** Max results per topic (1-10) */
  maxResultsPerTopic?: number
  /** Whether to generate LinkedIn posts */
  generatePosts?: boolean
  /** Types of posts to generate */
  postTypes?: PostType[]
  /** Company context ID for personalization */
  companyContextId?: string
}

/**
 * Validate request body
 */
function validateRequest(body: StartResearchRequest): string | null {
  if (!body.topics || !Array.isArray(body.topics)) {
    return 'topics must be an array'
  }

  if (body.topics.length === 0) {
    return 'At least one topic is required'
  }

  if (body.topics.length > 5) {
    return 'Maximum 5 topics allowed'
  }

  // Validate each topic
  for (const topic of body.topics) {
    if (typeof topic !== 'string' || topic.trim().length < 2) {
      return 'Each topic must be a string with at least 2 characters'
    }
    if (topic.length > 200) {
      return 'Each topic must be less than 200 characters'
    }
  }

  if (body.depth && !['basic', 'deep'].includes(body.depth)) {
    return 'depth must be "basic" or "deep"'
  }

  if (body.maxResultsPerTopic !== undefined) {
    if (typeof body.maxResultsPerTopic !== 'number' || body.maxResultsPerTopic < 1 || body.maxResultsPerTopic > 10) {
      return 'maxResultsPerTopic must be a number between 1 and 10'
    }
  }

  const validPostTypes: PostType[] = [
    'thought-leadership',
    'storytelling',
    'educational',
    'contrarian',
    'data-driven',
    'how-to',
    'listicle',
  ]

  if (body.postTypes) {
    if (!Array.isArray(body.postTypes)) {
      return 'postTypes must be an array'
    }
    for (const type of body.postTypes) {
      if (!validPostTypes.includes(type)) {
        return `Invalid post type: ${type}`
      }
    }
  }

  return null
}

/**
 * Estimate workflow duration based on parameters
 */
function estimateDuration(body: StartResearchRequest): number {
  const topicCount = body.topics.length
  const resultsPerTopic = body.maxResultsPerTopic || 5
  const depth = body.depth || 'basic'
  const generatePosts = body.generatePosts !== false

  // Base times in seconds
  const searchTime = depth === 'deep' ? 10 : 5
  const enrichTime = 8
  const generateTime = generatePosts ? 15 : 0

  // Calculate estimated duration
  const totalResults = topicCount * resultsPerTopic
  const enrichResults = Math.min(10, totalResults) // We only enrich top 10

  return (
    5 + // Initialization
    (topicCount * searchTime) + // Tavily search
    (enrichResults * enrichTime) + // Perplexity enrichment
    (generatePosts ? Math.min(5, enrichResults) * 3 * generateTime / 5 : 0) + // Post generation
    5 // Finalization
  )
}

/**
 * POST /api/research/start
 * @description Starts a new deep research workflow
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any // Type assertion for new tables not in schema

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse request body
  let body: StartResearchRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    )
  }

  // Validate request
  const validationError = validateRequest(body)
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 })
  }

  // Check for rate limiting - max 5 active sessions per user
  const { data: activeSessions, error: sessionError } = await db
    .from('research_sessions')
    .select('id')
    .eq('user_id', user.id)
    .in('status', ['pending', 'initializing', 'searching', 'enriching', 'generating', 'saving'])

  if (sessionError) {
    console.error('[Research/Start] Failed to check active sessions:', sessionError)
  }

  if (activeSessions && activeSessions.length >= 5) {
    return NextResponse.json(
      {
        error: 'Too many active research sessions. Please wait for existing sessions to complete.',
        activeSessions: activeSessions.length,
      },
      { status: 429 }
    )
  }

  // Generate session ID
  const sessionId = randomUUID()

  // Clean topic strings
  const cleanedTopics = body.topics.map((t) => t.trim())

  // Create session record
  const { error: insertError } = await db.from('research_sessions').insert({
    id: sessionId,
    user_id: user.id,
    topics: cleanedTopics,
    depth: body.depth || 'basic',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  if (insertError) {
    console.error('[Research/Start] Failed to create session:', insertError)
    return NextResponse.json(
      { error: 'Failed to create research session' },
      { status: 500 }
    )
  }

  // Check Inngest configuration
  const inngestEventKey = process.env.INNGEST_EVENT_KEY
  const isDev = process.env.NODE_ENV === 'development'

  if (!inngestEventKey && !isDev) {
    console.error('[Research/Start] INNGEST_EVENT_KEY not configured in production')
    return NextResponse.json(
      { error: 'Workflow service not configured' },
      { status: 503 }
    )
  }

  // Trigger Inngest workflow
  try {
    console.log(`[Research/Start] Sending event to Inngest for session ${sessionId}`)
    console.log(`[Research/Start] Topics: ${cleanedTopics.join(', ')}`)
    console.log(`[Research/Start] Depth: ${body.depth || 'basic'}`)
    console.log(`[Research/Start] Environment: ${isDev ? 'development' : 'production'}`)

    const sendResult = await inngest.send({
      name: 'discover/research',
      data: {
        userId: user.id,
        sessionId,
        topics: cleanedTopics,
        depth: body.depth || 'basic',
        maxResultsPerTopic: body.maxResultsPerTopic || 5,
        generatePosts: body.generatePosts !== false,
        postTypes: body.postTypes || ['thought-leadership', 'educational', 'storytelling'],
        companyContextId: body.companyContextId,
      },
    })

    console.log('[Research/Start] Inngest event sent successfully:', sendResult)
  } catch (error) {
    console.error('[Research/Start] Failed to trigger Inngest workflow:', error)

    // Update session status to failed
    await db
      .from('research_sessions')
      .update({ status: 'failed', error_message: 'Failed to start workflow' })
      .eq('id', sessionId)

    return NextResponse.json(
      { error: 'Failed to start research workflow' },
      { status: 500 }
    )
  }

  const estimatedDuration = estimateDuration(body)

  return NextResponse.json({
    sessionId,
    status: 'started',
    message: 'Research workflow queued. Check /api/research/status/' + sessionId + ' for progress.',
    estimatedDuration,
    topics: cleanedTopics,
    // Development hint
    ...(isDev && {
      devNote: 'In development, ensure Inngest Dev Server is running: npx inngest-cli@latest dev',
      dashboardUrl: 'http://127.0.0.1:8288',
    }),
  })
}

/**
 * GET /api/research/start
 * @description Returns API information
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/research/start',
    method: 'POST',
    description: 'Start a new deep research workflow',
    parameters: {
      topics: 'string[] (required, 1-5 topics)',
      depth: '"basic" | "deep" (optional, default: "basic")',
      maxResultsPerTopic: 'number (optional, 1-10, default: 5)',
      generatePosts: 'boolean (optional, default: true)',
      postTypes: 'string[] (optional, default: ["thought-leadership", "educational", "storytelling"])',
      companyContextId: 'string (optional, for personalized generation)',
    },
  })
}
