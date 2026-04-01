/**
 * AI Status API Route
 * @description Returns the status of AI configuration (whether API keys or OAuth are set).
 * @route GET /api/ai/status
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Returns AI configuration status.
 * @returns JSON with hasKey boolean
 */
export async function GET() {
  const hasEnvKey = !!process.env.OPENROUTER_API_KEY

  // Also check for active OAuth connection
  let hasOAuth = false
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('openai_connections')
        .select('is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()
      hasOAuth = !!data
    }
  } catch {
    // Non-blocking
  }

  return NextResponse.json({ hasKey: hasEnvKey || hasOAuth })
}
