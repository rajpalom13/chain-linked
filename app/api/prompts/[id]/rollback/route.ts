/**
 * Rollback Prompt API
 * @description POST: Rollback a prompt to a specific version
 * @module app/api/prompts/[id]/rollback/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PromptService, PromptServiceError } from '@/lib/prompts'

/**
 * Checks if the current user has admin role
 * @param supabase - Supabase client instance
 * @returns True if user is admin, false otherwise
 */
async function isAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  return user.user_metadata?.role === 'admin'
}

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
 * POST /api/prompts/[id]/rollback
 * Rolls back a prompt to a specific version
 *
 * Note: This doesn't actually revert history - it creates a new version
 * with the content from the specified version. The version history
 * remains intact for audit purposes.
 *
 * Body:
 * - version: number (required) - The version number to rollback to
 *
 * Requires admin role
 *
 * @param request - Next.js request object
 * @param context - Route context with params
 * @returns JSON with updated prompt
 * @example
 * POST /api/prompts/550e8400-e29b-41d4-a716-446655440000/rollback
 * {
 *   "version": 2
 * }
 *
 * Response:
 * {
 *   "data": { ... updated prompt ... },
 *   "message": "Rolled back to version 2",
 *   "newVersion": 4
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate authentication and admin role
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

    if (!(await isAdmin(supabase))) {
      return NextResponse.json(
        { error: 'Admin role required' },
        { status: 403 }
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

    // Parse request body
    const body = await request.json()
    const { version } = body as { version?: number }

    // Validate version parameter
    if (version === undefined || version === null) {
      return NextResponse.json(
        { error: 'version is required' },
        { status: 400 }
      )
    }

    if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
      return NextResponse.json(
        { error: 'version must be a positive integer' },
        { status: 400 }
      )
    }

    // Get current prompt to check if version exists and for comparison
    const currentPrompt = await PromptService.getPromptById(id)

    if (!currentPrompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      )
    }

    // Check if trying to rollback to current version
    if (version === currentPrompt.version) {
      return NextResponse.json(
        { error: 'Cannot rollback to current version' },
        { status: 400 }
      )
    }

    // Rollback via service
    const updatedPrompt = await PromptService.rollbackToVersion(id, version)

    return NextResponse.json({
      data: updatedPrompt,
      message: `Rolled back to version ${version}`,
      previousVersion: currentPrompt.version,
      newVersion: updatedPrompt.version,
    })
  } catch (error) {
    console.error('[API /api/prompts/[id]/rollback POST] Error:', error)

    if (error instanceof PromptServiceError) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        VERSION_NOT_FOUND: 404,
        UPDATE_ERROR: 500,
      }

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: statusMap[error.code] ?? 500 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to rollback prompt' },
      { status: 500 }
    )
  }
}
