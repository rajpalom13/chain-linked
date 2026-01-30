/**
 * Research Session Status API
 * @description Get the status of a research session
 * @module app/api/research/status/[sessionId]/route
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ResearchSession } from '@/types/database'

/**
 * GET /api/research/status/:sessionId
 * @description Get the status of a specific research session
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any // Type assertion for new tables not in schema
  const { sessionId } = await params

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Validate session ID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(sessionId)) {
    return NextResponse.json({ error: 'Invalid session ID format' }, { status: 400 })
  }

  // Fetch session
  const { data: session, error: fetchError } = await db
    .from('research_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle() as { data: ResearchSession | null; error: Error | null }

  if (fetchError) {
    console.error('[Research/Status] Failed to fetch session:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // Calculate progress based on status
  const progressMap: Record<string, { step: string; percentage: number }> = {
    pending: { step: 'Waiting to start', percentage: 0 },
    initializing: { step: 'Initializing session', percentage: 5 },
    searching: { step: 'Searching web for content', percentage: 20 },
    enriching: { step: 'Enriching results with AI', percentage: 50 },
    generating: { step: 'Generating LinkedIn posts', percentage: 75 },
    saving: { step: 'Saving results', percentage: 90 },
    completed: { step: 'Completed', percentage: 100 },
    failed: { step: 'Failed', percentage: 0 },
  }

  const progress = progressMap[session.status] || { step: 'Unknown', percentage: 0 }

  // Calculate duration if completed
  let duration: number | null = null
  if (session.completed_at && session.started_at) {
    duration = new Date(session.completed_at).getTime() - new Date(session.started_at).getTime()
  }

  return NextResponse.json({
    sessionId: session.id,
    status: session.status,
    progress,
    topics: session.topics,
    depth: session.depth,
    results: {
      postsDiscovered: session.posts_discovered || 0,
      postsGenerated: session.posts_generated || 0,
    },
    timing: {
      startedAt: session.started_at,
      completedAt: session.completed_at,
      duration,
    },
    error: session.error_message || null,
    failedStep: session.failed_step || null,
  })
}
