/**
 * Suggestions Ready Handler
 * @description Inngest function that handles the swipe/suggestions-ready event,
 * performing post-generation cleanup such as expiring old suggestions and
 * cleaning up stale generation runs.
 * @module lib/inngest/functions/suggestions-ready
 */

import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'

/**
 * Supabase admin client for background jobs
 * Uses service role key to bypass RLS
 */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}

/**
 * Suggestions Ready Handler
 * Triggered after the generate-suggestions workflow completes and saves results.
 * Performs post-generation cleanup:
 * - Expires suggestions past their expiration date
 * - Cleans up old completed/failed generation runs (older than 7 days)
 */
export const suggestionsReadyHandler = inngest.createFunction(
  {
    id: 'swipe-suggestions-ready',
    name: 'Suggestions Ready Handler',
    retries: 1,
  },
  { event: 'swipe/suggestions-ready' },
  async ({ event, step }) => {
    const { userId, runId, count, success } = event.data
    const supabase = getSupabaseAdmin()

    console.log(
      `[SuggestionsReady] Handling completion for user ${userId}, run ${runId}: ${count} suggestions, success=${success}`
    )

    // Step 1: Expire old suggestions past their expiration date
    const expiredCount = await step.run('expire-old-suggestions', async () => {
      const { data, error } = await supabase
        .from('generated_suggestions')
        .update({ status: 'expired' })
        .eq('user_id', userId)
        .eq('status', 'active')
        .lt('expires_at', new Date().toISOString())
        .select('id')

      if (error) {
        console.error('[SuggestionsReady] Failed to expire old suggestions:', error)
        return 0
      }

      const count = data?.length ?? 0
      if (count > 0) {
        console.log(`[SuggestionsReady] Expired ${count} old suggestions for user ${userId}`)
      }
      return count
    })

    // Step 2: Clean up old generation runs (completed/failed, older than 7 days)
    const cleanedRuns = await step.run('cleanup-old-runs', async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const { data, error } = await supabase
        .from('suggestion_generation_runs')
        .delete()
        .eq('user_id', userId)
        .in('status', ['completed', 'failed'])
        .lt('created_at', sevenDaysAgo)
        .select('id')

      if (error) {
        console.error('[SuggestionsReady] Failed to clean up old runs:', error)
        return 0
      }

      const count = data?.length ?? 0
      if (count > 0) {
        console.log(`[SuggestionsReady] Cleaned up ${count} old generation runs for user ${userId}`)
      }
      return count
    })

    return {
      success: true,
      userId,
      runId,
      suggestionsGenerated: count,
      expiredSuggestions: expiredCount,
      cleanedRuns,
    }
  }
)
