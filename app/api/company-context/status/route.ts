/**
 * Company Context Status API Route
 * @description Poll the status of company analysis workflow
 * @module app/api/company-context/status/route
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Status to progress mapping
 */
const STATUS_PROGRESS: Record<string, number> = {
  pending: 0,
  scraping: 25,
  researching: 50,
  analyzing: 75,
  completed: 100,
  failed: 0,
}

/**
 * Status to step message mapping
 */
const STATUS_MESSAGES: Record<string, string> = {
  pending: 'Starting analysis...',
  scraping: 'Scraping website content...',
  researching: 'Researching company information...',
  analyzing: 'Extracting company insights...',
  completed: 'Analysis complete!',
  failed: 'Analysis failed',
}

/**
 * GET /api/company-context/status
 * Returns the current analysis status for the authenticated user
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data, error } = await supabase
      .from('company_context')
      .select('id, status, error_message, completed_at')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[API] Error fetching status:', error)
      return NextResponse.json(
        { error: 'Failed to fetch status' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json({
        status: 'not_found',
        progress: 0,
        currentStep: 'No company context found',
        data: null,
      })
    }

    const status = data.status || 'pending'

    return NextResponse.json({
      status,
      progress: STATUS_PROGRESS[status] ?? 0,
      currentStep: STATUS_MESSAGES[status] ?? 'Processing...',
      errorMessage: data.error_message,
      completedAt: data.completed_at,
    })
  } catch (error) {
    console.error('[API] Status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
