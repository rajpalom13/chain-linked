/**
 * Prompt Versions API
 * @description GET: Get version history for a prompt
 * @module app/api/prompts/[id]/versions/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PromptService, PromptServiceError } from '@/lib/prompts'

/**
 * Validates that a string is a valid UUID
 * @param id - String to validate
 * @returns True if valid UUID format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * GET /api/prompts/[id]/versions
 * Returns the version history for a prompt
 *
 * Versions are ordered by version number descending (newest first)
 *
 * @param request - Next.js request object
 * @param context - Route context with params
 * @returns JSON array of PromptVersion objects
 * @example
 * GET /api/prompts/550e8400-e29b-41d4-a716-446655440000/versions
 *
 * Response:
 * {
 *   "data": [
 *     {
 *       "id": "...",
 *       "promptId": "550e8400-e29b-41d4-a716-446655440000",
 *       "version": 3,
 *       "content": "...",
 *       "variables": [],
 *       "changeNotes": "Fixed hook section",
 *       "createdBy": "user-uuid",
 *       "createdAt": "2024-01-30T10:00:00Z"
 *     },
 *     ...
 *   ]
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate authentication
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Await params (Next.js 15+ requirement)
    const { id } = await params

    // Validate ID format
    if (!id || !isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid prompt ID format' },
        { status: 400 }
      )
    }

    // Verify prompt exists
    const prompt = await PromptService.getPromptById(id)

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      )
    }

    // Get version history
    const versions = await PromptService.getVersionHistory(id)

    return NextResponse.json({
      data: versions,
      promptId: id,
      promptName: prompt.name,
      currentVersion: prompt.version,
    })
  } catch (error) {
    console.error('[API /api/prompts/[id]/versions GET] Error:', error)

    if (error instanceof PromptServiceError) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        FETCH_ERROR: 500,
      }

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: statusMap[error.code] ?? 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch version history' },
      { status: 500 }
    )
  }
}
