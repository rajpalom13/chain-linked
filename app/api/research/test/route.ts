/**
 * Research Workflow Test API
 * @description Test endpoint to verify Inngest workflow is properly configured
 * @module app/api/research/test/route
 */

import { NextResponse } from 'next/server'
import { inngest } from '@/lib/inngest/client'

/**
 * GET /api/research/test
 * @description Tests the Inngest configuration and returns diagnostic information
 */
export async function GET() {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    inngestConfigured: false,
    tavilyConfigured: false,
    perplexityConfigured: false,
    openrouterConfigured: false,
    supabaseConfigured: false,
    devServerHint: 'Run: npx inngest-cli@latest dev',
    dashboardUrl: 'http://127.0.0.1:8288',
    errors: [] as string[],
  }

  // Check Inngest
  if (process.env.INNGEST_EVENT_KEY) {
    diagnostics.inngestConfigured = true
  } else if (process.env.NODE_ENV === 'development') {
    diagnostics.inngestConfigured = true // OK in dev mode
    diagnostics.errors.push('INNGEST_EVENT_KEY not set (OK for dev mode if dev server is running)')
  } else {
    diagnostics.errors.push('INNGEST_EVENT_KEY is required in production')
  }

  // Check Tavily
  if (process.env.TAVILY_API_KEY) {
    diagnostics.tavilyConfigured = true
  } else {
    diagnostics.errors.push('TAVILY_API_KEY not configured - web search will be skipped')
  }

  // Check Perplexity
  if (process.env.PERPLEXITY_API_KEY) {
    diagnostics.perplexityConfigured = true
  } else {
    diagnostics.errors.push('PERPLEXITY_API_KEY not configured - enrichment will be skipped')
  }

  // Check OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    diagnostics.openrouterConfigured = true
  } else {
    diagnostics.errors.push('OPENROUTER_API_KEY not configured - post generation will be skipped')
  }

  // Check Supabase
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    diagnostics.supabaseConfigured = true
  } else {
    diagnostics.errors.push('Supabase not fully configured')
  }

  return NextResponse.json(diagnostics)
}

/**
 * POST /api/research/test
 * @description Sends a test event to Inngest to verify the workflow is triggered
 */
export async function POST() {
  try {
    console.log('[Research/Test] Sending test event to Inngest...')

    // Send a test event (won't actually run full workflow - just tests event sending)
    const result = await inngest.send({
      name: 'discover/research',
      data: {
        userId: 'test-user-id',
        sessionId: 'test-session-' + Date.now(),
        topics: ['test topic'],
        depth: 'basic',
        maxResultsPerTopic: 1,
        generatePosts: false, // Don't actually generate
      },
    })

    console.log('[Research/Test] Event sent successfully:', result)

    return NextResponse.json({
      success: true,
      message: 'Test event sent to Inngest',
      result,
      nextSteps: [
        '1. Check Inngest Dev Server dashboard at http://127.0.0.1:8288',
        '2. Look for the "discover/research" event',
        '3. The workflow should start processing',
        '4. If not running, start the dev server: npx inngest-cli@latest dev',
      ],
    })
  } catch (error) {
    console.error('[Research/Test] Failed to send test event:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        troubleshooting: [
          '1. Make sure Inngest Dev Server is running: npx inngest-cli@latest dev',
          '2. Check that INNGEST_EVENT_KEY is set in .env.local',
          '3. Restart the Next.js dev server after adding env vars',
        ],
      },
      { status: 500 }
    )
  }
}
