/**
 * On-Demand Content Ingest (Inngest)
 * @description Inngest event-triggered function that ingests fresh news articles
 * via Perplexity AI for specific topics. Delegates to the shared ingest pipeline.
 * @module lib/inngest/functions/on-demand-content-ingest
 */

import { inngest } from '../client'
import { searchTopics, deduplicateAndSave } from './ingest-articles'

/**
 * On-Demand Content Ingest Function
 * Triggered by the discover/ingest event when the discover feed is empty
 * and needs seeding with fresh content for the given topics.
 */
export const onDemandContentIngest = inngest.createFunction(
  {
    id: 'on-demand-content-ingest',
    name: 'On-Demand Content Ingest',
    retries: 2,
    concurrency: [{ limit: 1, key: 'event.data.batchId' }],
  },
  { event: 'discover/ingest' },
  async ({ event, step }) => {
    const { batchId, topics, maxResultsPerTopic } = event.data
    const resultsPerTopic = maxResultsPerTopic ?? 5
    const logPrefix = '[OnDemandIngest]'

    const validTopics = (topics as string[]).filter((t: string) => t !== 'all')

    if (validTopics.length === 0) {
      console.log(`${logPrefix} No valid topics to ingest`)
      return { success: true, message: 'No valid topics', articlesIngested: 0 }
    }

    // Step 1: Search topics via Perplexity
    const searchResults = await step.run('search-topics-perplexity', async () => {
      return searchTopics(validTopics, resultsPerTopic, logPrefix)
    })

    // Step 2: Deduplicate and save
    const savedCount = await step.run('deduplicate-and-save', async () => {
      return deduplicateAndSave(searchResults, batchId, logPrefix)
    })

    // Step 3: Emit completion event
    await step.sendEvent('ingest-completed', {
      name: 'discover/ingest.completed',
      data: {
        batchId,
        topicsSearched: validTopics.length,
        postsIngested: savedCount,
      },
    })

    return {
      success: true,
      batchId,
      topicsSearched: validTopics.length,
      totalResults: searchResults.length,
      articlesIngested: savedCount,
    }
  }
)
