/**
 * Apify REST API Client
 * @description Thin wrapper around Apify's REST API for running actors and fetching results.
 * Used by cron jobs to scrape LinkedIn profiles via the linkedin-profile-scraper actor.
 * @module lib/apify/client
 */

/** Apify API base URL */
const APIFY_BASE_URL = 'https://api.apify.com/v2'

/** Default timeout for actor runs (5 minutes) */
const DEFAULT_RUN_TIMEOUT_MS = 300_000

/** Poll interval when waiting for actor run completion */
const POLL_INTERVAL_MS = 5_000

/**
 * Actor run status from Apify API
 */
type ActorRunStatus = 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED-OUT' | 'ABORTED'

/**
 * Actor run result from Apify API
 */
interface ActorRunResult {
  /** Run ID */
  id: string
  /** Status of the run */
  status: ActorRunStatus
  /** Default dataset ID containing results */
  defaultDatasetId: string
}

/**
 * Gets the Apify API token from environment
 * @returns API token string
 * @throws Error if APIFY_API_TOKEN is not set
 */
function getApiToken(): string {
  const token = process.env.APIFY_API_TOKEN
  if (!token) {
    throw new Error('APIFY_API_TOKEN environment variable is not set')
  }
  return token
}

/**
 * Runs an Apify actor and waits for completion
 * @param actorId - The actor ID (e.g., 'apify/linkedin-profile-scraper')
 * @param input - Input object for the actor
 * @param timeoutMs - Maximum time to wait for completion (default: 5 minutes)
 * @returns Actor run result with dataset ID
 * @throws Error if the run fails or times out
 * @example
 * const result = await runActor('apify/linkedin-profile-scraper', {
 *   profileUrls: ['https://linkedin.com/in/username']
 * })
 */
export async function runActor(
  actorId: string,
  input: Record<string, unknown>,
  timeoutMs: number = DEFAULT_RUN_TIMEOUT_MS
): Promise<ActorRunResult> {
  const token = getApiToken()

  // Start the actor run
  const startResponse = await fetch(
    `${APIFY_BASE_URL}/acts/${encodeURIComponent(actorId)}/runs?token=${token}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }
  )

  if (!startResponse.ok) {
    const errorText = await startResponse.text()
    throw new Error(`Apify actor start failed (${startResponse.status}): ${errorText}`)
  }

  const { data: runData } = await startResponse.json() as { data: ActorRunResult }
  const runId = runData.id

  // Poll for completion
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const statusResponse = await fetch(
      `${APIFY_BASE_URL}/actor-runs/${runId}?token=${token}`
    )

    if (!statusResponse.ok) {
      throw new Error(`Apify run status check failed (${statusResponse.status})`)
    }

    const { data: statusData } = await statusResponse.json() as { data: ActorRunResult }

    if (statusData.status === 'SUCCEEDED') {
      return statusData
    }

    if (statusData.status === 'FAILED' || statusData.status === 'TIMED-OUT' || statusData.status === 'ABORTED') {
      throw new Error(`Apify actor run ${statusData.status}: ${runId}`)
    }

    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  throw new Error(`Apify actor run timed out after ${timeoutMs}ms: ${runId}`)
}

/**
 * Fetches items from an Apify dataset
 * @param datasetId - The dataset ID to fetch items from
 * @returns Array of dataset items
 * @example
 * const items = await getDatasetItems<LinkedInPost>(result.defaultDatasetId)
 */
export async function getDatasetItems<T = unknown>(datasetId: string): Promise<T[]> {
  const token = getApiToken()

  const response = await fetch(
    `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${token}&format=json`
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Apify dataset fetch failed (${response.status}): ${errorText}`)
  }

  return response.json() as Promise<T[]>
}
