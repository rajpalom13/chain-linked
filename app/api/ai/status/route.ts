/**
 * AI Status API Route
 * @description Returns the status of AI configuration (whether API keys are set).
 * @route GET /api/ai/status
 */

import { NextResponse } from 'next/server'

/**
 * Returns AI configuration status.
 * @returns JSON with hasKey boolean
 */
export async function GET() {
  const hasKey = !!process.env.OPENROUTER_API_KEY
  return NextResponse.json({ hasKey })
}
