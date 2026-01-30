/**
 * Single Prompt API
 * @description GET: Get prompt, PUT: Update prompt, DELETE: Delete prompt
 * @module app/api/prompts/[id]/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  PromptService,
  PromptServiceError,
  isValidPromptType,
  type SavePromptInput,
  type PromptVariable,
  type PromptType,
} from '@/lib/prompts'

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
 * GET /api/prompts/[id]
 * Get a single prompt by ID
 *
 * @param request - Next.js request object
 * @param context - Route context with params
 * @returns JSON with prompt data
 * @example
 * GET /api/prompts/550e8400-e29b-41d4-a716-446655440000
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

    // Fetch prompt
    const prompt = await PromptService.getPromptById(id)

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: prompt })
  } catch (error) {
    console.error('[API /api/prompts/[id] GET] Error:', error)

    if (error instanceof PromptServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch prompt' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/prompts/[id]
 * Update an existing prompt
 *
 * Body (all optional):
 * - name: string
 * - description: string
 * - content: string
 * - variables: PromptVariable[]
 * - isActive: boolean (use /activate endpoint instead for explicit activation)
 * - changeNotes: string
 *
 * Requires admin role
 *
 * @param request - Next.js request object
 * @param context - Route context with params
 * @returns JSON with updated prompt
 * @example
 * PUT /api/prompts/550e8400-e29b-41d4-a716-446655440000
 * {
 *   "name": "Updated Name",
 *   "content": "Updated content...",
 *   "changeNotes": "Fixed typo in hook section"
 * }
 */
export async function PUT(
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

    // Get existing prompt
    const existingPrompt = await PromptService.getPromptById(id)

    if (!existingPrompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()

    const { name, description, content, variables, setActive, changeNotes } = body as {
      name?: string
      description?: string
      content?: string
      variables?: PromptVariable[]
      setActive?: boolean
      changeNotes?: string
    }

    // Build update input - use existing values as defaults
    const updateInput: SavePromptInput = {
      id,
      type: existingPrompt.type as PromptType,
      name: name?.trim() ?? existingPrompt.name,
      description: description !== undefined ? description?.trim() : existingPrompt.description ?? undefined,
      content: content?.trim() ?? existingPrompt.content,
      variables: variables ?? existingPrompt.variables,
      setActive: setActive,
      changeNotes: changeNotes?.trim(),
    }

    // Update prompt via service
    const updatedPrompt = await PromptService.savePrompt(updateInput)

    return NextResponse.json({
      data: updatedPrompt,
      message: 'Prompt updated successfully',
    })
  } catch (error) {
    console.error('[API /api/prompts/[id] PUT] Error:', error)

    if (error instanceof PromptServiceError) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        DELETE_DENIED: 403,
        FETCH_ERROR: 500,
        INSERT_ERROR: 500,
        UPDATE_ERROR: 500,
      }

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: statusMap[error.code] ?? 500 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update prompt' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/prompts/[id]
 * Delete a prompt
 *
 * Note: Default prompts cannot be deleted
 *
 * Requires admin role
 *
 * @param request - Next.js request object
 * @param context - Route context with params
 * @returns JSON with success message
 * @example
 * DELETE /api/prompts/550e8400-e29b-41d4-a716-446655440000
 */
export async function DELETE(
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

    // Delete prompt via service
    await PromptService.deletePrompt(id)

    return NextResponse.json({
      message: 'Prompt deleted successfully',
    })
  } catch (error) {
    console.error('[API /api/prompts/[id] DELETE] Error:', error)

    if (error instanceof PromptServiceError) {
      const statusMap: Record<string, number> = {
        NOT_FOUND: 404,
        DELETE_DENIED: 403,
        DELETE_ERROR: 500,
      }

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: statusMap[error.code] ?? 500 }
      )
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete prompt' },
      { status: 500 }
    )
  }
}
