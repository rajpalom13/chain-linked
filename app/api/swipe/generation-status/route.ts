/**
 * Swipe Generation Status API Route
 * @description GET endpoint to poll for generation run status
 * @module app/api/swipe/generation-status/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Progress values for each status
 */
const STATUS_PROGRESS: Record<string, number> = {
  pending: 0,
  generating: 50,
  completed: 100,
  failed: 100
}

/**
 * GET /api/swipe/generation-status
 * Returns the current status of a generation run
 * @param request - Next.js request object with query params
 * @returns JSON response with run status and progress
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const runId = searchParams.get('runId')

    // If no runId provided, get the latest run for this user
    let query = supabase
      .from('suggestion_generation_runs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (runId) {
      query = query.eq('id', runId)
    }

    const { data: run, error: fetchError } = await query.limit(1).single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          {
            error: 'No generation runs found',
            hasRuns: false
          },
          { status: 404 }
        )
      }
      console.error('[API] Error fetching generation run:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch generation status' },
        { status: 500 }
      )
    }

    // Calculate progress based on status
    const progress = STATUS_PROGRESS[run.status] ?? 0

    // Build response
    const response: {
      runId: string
      status: string
      progress: number
      suggestionsRequested: number
      suggestionsGenerated: number
      postTypesUsed: string[] | null
      createdAt: string
      completedAt: string | null
      error?: string
    } = {
      runId: run.id,
      status: run.status,
      progress,
      suggestionsRequested: run.suggestions_requested,
      suggestionsGenerated: run.suggestions_generated,
      postTypesUsed: run.post_types_used,
      createdAt: run.created_at,
      completedAt: run.completed_at
    }

    // Include error message if failed
    if (run.status === 'failed' && run.error_message) {
      response.error = run.error_message
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[API] Generation status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
