/**
 * Activate Prompt API
 * @description POST: Activate a prompt (deactivates others of same type)
 * @module app/api/prompts/[id]/activate/route
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
 * POST /api/prompts/[id]/activate
 * Activates this prompt and deactivates others of the same type
 *
 * The activation is atomic - the database trigger ensures only one
 * prompt of each type can be active at a time.
 *
 * Requires admin role
 *
 * @param request - Next.js request object
 * @param context - Route context with params
 * @returns JSON with success message
 * @example
 * POST /api/prompts/550e8400-e29b-41d4-a716-446655440000/activate
 *
 * Response:
 * {
 *   "message": "Prompt activated successfully",
 *   "promptId": "550e8400-e29b-41d4-a716-446655440000",
 *   "promptType": "remix_professional"
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

    // Get prompt to return its type in the response
    const prompt = await PromptService.getPromptById(id)

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      )
    }

    // Check if already active
    if (prompt.isActive) {
      return NextResponse.json({
        message: 'Prompt is already active',
        promptId: id,
        promptType: prompt.type,
      })
    }

    // Activate prompt via service
    await PromptService.activatePrompt(id)

    return NextResponse.json({
      message: 'Prompt activated successfully',
      promptId: id,
      promptType: prompt.type,
    })
  } catch (error) {
    console.error('[API /api/prompts/[id]/activate POST] Error:', error)

    if (error instanceof PromptServiceError) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        ACTIVATION_ERROR: 500,
      }

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: statusMap[error.code] ?? 500 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to activate prompt' },
      { status: 500 }
    )
  }
}
