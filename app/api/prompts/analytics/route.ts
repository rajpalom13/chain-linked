/**
 * Prompt Analytics API
 * @description GET: Get usage analytics for prompts
 * @module app/api/prompts/analytics/route
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  PromptService,
  PromptServiceError,
  PromptType,
  isValidPromptType,
  isValidPromptFeature,
  type UsageFilter,
  type PromptFeature,
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
 * Validates that a string is a valid ISO date
 * @param dateStr - String to validate
 * @returns True if valid date format
 */
function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr)
  return !isNaN(date.getTime())
}

/**
 * GET /api/prompts/analytics
 * Get usage analytics for prompts
 *
 * Query params:
 * - promptId: UUID - Filter by specific prompt
 * - promptType: PromptType - Filter by prompt type
 * - feature: 'remix' | 'compose' | 'carousel' | 'playground' - Filter by feature
 * - startDate: ISO date string - Start of date range
 * - endDate: ISO date string - End of date range
 * - limit: number - Maximum results (default 1000)
 * - offset: number - Pagination offset
 *
 * Access control:
 * - Admins can see all analytics
 * - Regular users can only see their own usage (userId filter is enforced)
 *
 * @param request - Next.js request object
 * @returns JSON with aggregated usage analytics
 * @example
 * GET /api/prompts/analytics?promptType=remix_professional&startDate=2024-01-01&endDate=2024-01-31
 *
 * Response:
 * {
 *   "data": {
 *     "totalUsages": 1234,
 *     "totalTokens": 567890,
 *     "avgTokens": 460,
 *     "successCount": 1200,
 *     "errorCount": 34,
 *     "successRate": 97,
 *     "avgResponseTimeMs": 1250,
 *     "byFeature": { "remix": 500, "compose": 400, ... },
 *     "byModel": { "gpt-4o-mini": 800, "gpt-4o": 434 },
 *     "dailyUsage": [ { "date": "2024-01-01", "count": 50, "tokens": 23000 }, ... ]
 *   }
 * }
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
    const promptIdParam = searchParams.get('promptId')
    const promptTypeParam = searchParams.get('promptType')
    const featureParam = searchParams.get('feature')
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    // Build filter object
    const filter: UsageFilter = {}

    // Validate and set promptId
    if (promptIdParam) {
      if (!isValidUUID(promptIdParam)) {
        return NextResponse.json(
          { error: 'Invalid promptId format' },
          { status: 400 }
        )
      }
      filter.promptId = promptIdParam
    }

    // Validate and set promptType
    if (promptTypeParam) {
      if (!isValidPromptType(promptTypeParam)) {
        return NextResponse.json(
          { error: `Invalid prompt type: ${promptTypeParam}` },
          { status: 400 }
        )
      }
      filter.promptType = promptTypeParam as PromptType
    }

    // Validate and set feature
    if (featureParam) {
      if (!isValidPromptFeature(featureParam)) {
        return NextResponse.json(
          { error: `Invalid feature: ${featureParam}. Must be one of: remix, compose, carousel, playground` },
          { status: 400 }
        )
      }
      filter.feature = featureParam as PromptFeature
    }

    // Validate and set date range
    if (startDateParam) {
      if (!isValidDate(startDateParam)) {
        return NextResponse.json(
          { error: 'Invalid startDate format. Use ISO date string.' },
          { status: 400 }
        )
      }
      filter.startDate = startDateParam
    }

    if (endDateParam) {
      if (!isValidDate(endDateParam)) {
        return NextResponse.json(
          { error: 'Invalid endDate format. Use ISO date string.' },
          { status: 400 }
        )
      }
      filter.endDate = endDateParam
    }

    // Validate date range logic
    if (filter.startDate && filter.endDate) {
      if (new Date(filter.startDate) > new Date(filter.endDate)) {
        return NextResponse.json(
          { error: 'startDate must be before endDate' },
          { status: 400 }
        )
      }
    }

    // Parse pagination
    if (limitParam) {
      const limit = parseInt(limitParam, 10)
      if (isNaN(limit) || limit < 1 || limit > 10000) {
        return NextResponse.json(
          { error: 'limit must be a number between 1 and 10000' },
          { status: 400 }
        )
      }
      filter.limit = limit
    }

    if (offsetParam) {
      const offset = parseInt(offsetParam, 10)
      if (isNaN(offset) || offset < 0) {
        return NextResponse.json(
          { error: 'offset must be a non-negative number' },
          { status: 400 }
        )
      }
      filter.offset = offset
    }

    // Check admin status for access control
    const userIsAdmin = await isAdmin(supabase)

    // Non-admins can only see their own analytics
    if (!userIsAdmin) {
      filter.userId = user.id
    }

    // Fetch analytics from service
    const analytics = await PromptService.getUsageAnalytics(filter)

    return NextResponse.json({
      data: analytics,
      filters: {
        promptId: filter.promptId,
        promptType: filter.promptType,
        feature: filter.feature,
        startDate: filter.startDate,
        endDate: filter.endDate,
        userId: userIsAdmin ? filter.userId : user.id,
        isAdminView: userIsAdmin,
      },
    })
  } catch (error) {
    console.error('[API /api/prompts/analytics GET] Error:', error)

    if (error instanceof PromptServiceError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
