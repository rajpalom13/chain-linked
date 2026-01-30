/**
 * Research Sessions List API
 * @description List user's research sessions
 * @module app/api/research/sessions/route
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ResearchSession } from '@/types/database'

/**
 * GET /api/research/sessions
 * @description List research sessions for the authenticated user
 */
export async function GET(request: Request) {
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

  // Parse query parameters
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  // Build query
  let query = db
    .from('research_sessions')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  // Apply status filter if provided
  if (status) {
    const validStatuses = [
      'pending',
      'initializing',
      'searching',
      'enriching',
      'generating',
      'saving',
      'completed',
      'failed',
    ]
    if (validStatuses.includes(status)) {
      query = query.eq('status', status)
    }
  }

  const { data: sessions, error: fetchError, count } = await query as {
    data: ResearchSession[] | null
    error: Error | null
    count: number | null
  }

  if (fetchError) {
    console.error('[Research/Sessions] Failed to fetch sessions:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }

  // Transform sessions for response
  const transformedSessions = (sessions || []).map((session) => ({
    id: session.id,
    topics: session.topics,
    depth: session.depth,
    status: session.status,
    postsDiscovered: session.posts_discovered || 0,
    postsGenerated: session.posts_generated || 0,
    startedAt: session.started_at,
    completedAt: session.completed_at,
    createdAt: session.created_at,
    error: session.error_message || null,
  }))

  return NextResponse.json({
    sessions: transformedSessions,
    pagination: {
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit,
    },
  })
}
