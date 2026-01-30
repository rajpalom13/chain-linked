/**
 * Prompts API - List and Create
 * @description GET: List prompts with filters, POST: Create new prompt
 * @module app/api/prompts/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  PromptService,
  PromptServiceError,
  PromptType,
  isValidPromptType,
  type SavePromptInput,
  type PromptVariable,
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
 * GET /api/prompts
 * List prompts with optional filters
 *
 * Query params:
 * - type: PromptType enum value
 * - isActive: boolean
 * - isDefault: boolean
 *
 * @param request - Next.js request object
 * @returns JSON array of prompts
 * @example
 * GET /api/prompts?type=remix_professional&isActive=true
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const typeParam = searchParams.get('type')
    const isActiveParam = searchParams.get('isActive')
    const isDefaultParam = searchParams.get('isDefault')

    // Build filters
    const filters: {
      type?: PromptType
      isActive?: boolean
      isDefault?: boolean
    } = {}

    // Validate and set type filter
    if (typeParam) {
      if (!isValidPromptType(typeParam)) {
        return NextResponse.json(
          { error: `Invalid prompt type: ${typeParam}` },
          { status: 400 }
        )
      }
      filters.type = typeParam as PromptType
    }

    // Parse boolean filters
    if (isActiveParam !== null) {
      filters.isActive = isActiveParam === 'true'
    }

    if (isDefaultParam !== null) {
      filters.isDefault = isDefaultParam === 'true'
    }

    // Fetch prompts from service
    const prompts = await PromptService.listPrompts(filters)

    return NextResponse.json({ data: prompts })
  } catch (error) {
    console.error('[API /api/prompts GET] Error:', error)

    if (error instanceof PromptServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/prompts
 * Create a new prompt
 *
 * Body:
 * - type: PromptType (required)
 * - name: string (required)
 * - description: string (optional)
 * - content: string (required)
 * - variables: PromptVariable[] (optional)
 * - isDefault: boolean (optional, admin only)
 * - setActive: boolean (optional)
 *
 * Requires admin role
 *
 * @param request - Next.js request object
 * @returns JSON with created prompt
 * @example
 * POST /api/prompts
 * {
 *   "type": "remix_professional",
 *   "name": "Custom Professional Remix",
 *   "content": "You are an expert...",
 *   "setActive": true
 * }
 */
export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json()

    const { type, name, description, content, variables, setActive } = body as {
      type?: string
      name?: string
      description?: string
      content?: string
      variables?: PromptVariable[]
      setActive?: boolean
    }

    // Validate required fields
    if (!type) {
      return NextResponse.json(
        { error: 'type is required' },
        { status: 400 }
      )
    }

    if (!isValidPromptType(type)) {
      return NextResponse.json(
        { error: `Invalid prompt type: ${type}` },
        { status: 400 }
      )
    }

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      )
    }

    // Build save input
    const saveInput: SavePromptInput = {
      type: type as PromptType,
      name: name.trim(),
      description: description?.trim(),
      content: content.trim(),
      variables: variables ?? [],
      setActive: setActive ?? false,
    }

    // Create prompt via service
    const createdPrompt = await PromptService.savePrompt(saveInput)

    return NextResponse.json(
      { data: createdPrompt, message: 'Prompt created successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('[API /api/prompts POST] Error:', error)

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
      { error: error instanceof Error ? error.message : 'Failed to create prompt' },
      { status: 500 }
    )
  }
}
