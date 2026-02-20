/**
 * Swipe Auto-Refill Cron Job
 * @description Inngest cron function that runs every 30 minutes to check all users'
 * active swipe suggestion counts. If a user has fewer than 10 active suggestions
 * and no pending generation run, it triggers the generate-suggestions workflow
 * to refill back to 10.
 * @module lib/inngest/functions/swipe-auto-refill
 */

import { inngest } from '../client'
import { createClient } from '@supabase/supabase-js'

/** Maximum number of active suggestions per user */
const MAX_ACTIVE_SUGGESTIONS = 10

/** Minimum gap before triggering a refill (must be missing at least this many) */
const MIN_REFILL_THRESHOLD = 1

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
 * Swipe Auto-Refill Cron Function
 * Runs every 30 minutes to check and refill swipe suggestions for all users
 */
export const swipeAutoRefill = inngest.createFunction(
  {
    id: 'swipe-auto-refill',
    name: 'Swipe Auto-Refill',
    retries: 1,
  },
  { cron: '*/30 * * * *' },
  async ({ step }) => {
    const supabase = getSupabaseAdmin()

    console.log('[SwipeRefill] Starting auto-refill check')

    // Step 1: Get all users with company context (eligible for suggestion generation)
    const eligibleUsers = await step.run('fetch-eligible-users', async () => {
      const { data: users, error } = await supabase
        .from('company_context')
        .select('user_id, company_name')
        .not('company_name', 'is', null)

      if (error) {
        console.error('[SwipeRefill] Failed to fetch eligible users:', error)
        return []
      }

      console.log(`[SwipeRefill] Found ${users?.length || 0} eligible users with company context`)
      return users || []
    })

    if (eligibleUsers.length === 0) {
      console.log('[SwipeRefill] No eligible users found, skipping')
      return { success: true, message: 'No eligible users', refillsTriggered: 0 }
    }

    // Step 2: Check each user's active suggestion count and trigger refills
    const refillResults = await step.run('check-and-trigger-refills', async () => {
      const results: Array<{
        userId: string
        activeCount: number
        triggered: boolean
        reason: string
      }> = []

      for (const user of eligibleUsers) {
        try {
          // Count active suggestions
          const { count: activeCount, error: countError } = await supabase
            .from('generated_suggestions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.user_id)
            .eq('status', 'active')

          if (countError) {
            console.error(`[SwipeRefill] Error counting suggestions for user ${user.user_id}:`, countError)
            results.push({
              userId: user.user_id,
              activeCount: -1,
              triggered: false,
              reason: 'count_error',
            })
            continue
          }

          const currentActive = activeCount ?? 0
          const deficit = MAX_ACTIVE_SUGGESTIONS - currentActive

          // Skip if already at max
          if (deficit < MIN_REFILL_THRESHOLD) {
            results.push({
              userId: user.user_id,
              activeCount: currentActive,
              triggered: false,
              reason: 'at_max',
            })
            continue
          }

          // Check for existing pending/generating run (don't double-trigger)
          const { data: existingRun, error: runError } = await supabase
            .from('suggestion_generation_runs')
            .select('id, status')
            .eq('user_id', user.user_id)
            .in('status', ['pending', 'generating'])
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (runError) {
            console.error(`[SwipeRefill] Error checking runs for user ${user.user_id}:`, runError)
            results.push({
              userId: user.user_id,
              activeCount: currentActive,
              triggered: false,
              reason: 'run_check_error',
            })
            continue
          }

          if (existingRun) {
            results.push({
              userId: user.user_id,
              activeCount: currentActive,
              triggered: false,
              reason: 'generation_in_progress',
            })
            continue
          }

          // Create a generation run and trigger the workflow
          const { data: newRun, error: insertError } = await supabase
            .from('suggestion_generation_runs')
            .insert({
              user_id: user.user_id,
              status: 'pending',
              suggestions_requested: deficit,
              suggestions_generated: 0,
            })
            .select('id')
            .single()

          if (insertError || !newRun) {
            console.error(`[SwipeRefill] Failed to create run for user ${user.user_id}:`, insertError)
            results.push({
              userId: user.user_id,
              activeCount: currentActive,
              triggered: false,
              reason: 'run_create_error',
            })
            continue
          }

          console.log(
            `[SwipeRefill] Triggering refill for user ${user.user_id}: ` +
            `${currentActive} active, need ${deficit} more`
          )

          results.push({
            userId: user.user_id,
            activeCount: currentActive,
            triggered: true,
            reason: `refilling_${deficit}`,
          })
        } catch (error) {
          console.error(`[SwipeRefill] Unexpected error for user ${user.user_id}:`, error)
          results.push({
            userId: user.user_id,
            activeCount: -1,
            triggered: false,
            reason: 'unexpected_error',
          })
        }
      }

      return results
    })

    // Step 3: Send events for users that need refills
    const triggeredUsers = refillResults.filter(r => r.triggered)

    if (triggeredUsers.length > 0) {
      await step.run('send-refill-events', async () => {
        // We need to fetch the run IDs for the triggered users
        const { data: pendingRuns, error: fetchError } = await supabase
          .from('suggestion_generation_runs')
          .select('id, user_id')
          .in('user_id', triggeredUsers.map(u => u.userId))
          .eq('status', 'pending')
          .order('created_at', { ascending: false })

        if (fetchError || !pendingRuns) {
          console.error('[SwipeRefill] Failed to fetch pending runs:', fetchError)
          return
        }

        // Deduplicate - take only the latest run per user
        const latestRunPerUser = new Map<string, string>()
        for (const run of pendingRuns) {
          if (!latestRunPerUser.has(run.user_id)) {
            latestRunPerUser.set(run.user_id, run.id)
          }
        }

        // Send events to trigger the existing generate-suggestions workflow
        const events = Array.from(latestRunPerUser.entries()).map(([userId, runId]) => ({
          name: 'swipe/generate-suggestions' as const,
          data: { userId, runId },
        }))

        if (events.length > 0) {
          await inngest.send(events)
          console.log(`[SwipeRefill] Sent ${events.length} refill events`)
        }
      })
    }

    // Step 4: Log summary
    const summary = {
      totalUsers: eligibleUsers.length,
      refillsTriggered: triggeredUsers.length,
      atMax: refillResults.filter(r => r.reason === 'at_max').length,
      inProgress: refillResults.filter(r => r.reason === 'generation_in_progress').length,
      errors: refillResults.filter(r => r.reason.includes('error')).length,
    }

    console.log(`[SwipeRefill] === Auto-Refill Summary ===`)
    console.log(`[SwipeRefill] Total users checked: ${summary.totalUsers}`)
    console.log(`[SwipeRefill] Refills triggered: ${summary.refillsTriggered}`)
    console.log(`[SwipeRefill] Already at max: ${summary.atMax}`)
    console.log(`[SwipeRefill] Generation in progress: ${summary.inProgress}`)
    console.log(`[SwipeRefill] Errors: ${summary.errors}`)

    return { success: true, ...summary }
  }
)
