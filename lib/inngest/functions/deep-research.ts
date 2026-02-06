/**
 * Deep Research Workflow
 * @description Inngest function that orchestrates content discovery using Tavily, Perplexity, and OpenAI
 * Uses parallel execution for maximum performance
 * @see https://www.inngest.com/docs/guides/step-parallelism
 * @module lib/inngest/functions/deep-research
 */

import { inngest, type PostType, type ResearchSessionStatus } from '../client'
import { searchContent, type TavilySearchResult } from '@/lib/research/tavily-client'
import { createPerplexityClient } from '@/lib/perplexity/client'
import { createOpenAIClient, chatCompletion } from '@/lib/ai/openai-client'
import { createClient } from '@supabase/supabase-js'

/**
 * Supabase admin client for background jobs
 */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}

/**
 * Research result after Tavily search
 */
interface SearchResult {
  url: string
  title: string
  content: string
  score: number
  topic: string
  publishedDate?: string
}

/**
 * Enriched result after Perplexity research
 */
interface EnrichedResult extends SearchResult {
  enrichedContent: string
  keyInsights: string[]
  trendAnalysis?: string
  expertOpinions?: string[]
}

/**
 * Generated post content
 */
interface GeneratedPost {
  sourceId: string
  content: string
  postType: PostType
  hook: string
  cta?: string
  wordCount: number
  sourceUrl: string
  sourceTitle: string
}

/**
 * Post generation system prompts by type
 * Optimized for high-engagement LinkedIn content with proven viral patterns
 */
const POST_PROMPTS: Record<PostType, string> = {
  'thought-leadership': `You are an elite LinkedIn ghostwriter who has studied 10,000+ viral posts. Create thought leadership content that stops the scroll.

## HOOK FORMULA (First 2 lines - CRITICAL)
Use ONE of these proven patterns:
- Bold prediction: "By [year], [surprising change] will happen."
- Contrarian opener: "[Common belief] is wrong. Here's why:"
- Pattern interrupt: A single provocative statement. Then a line break.
- Confession: "I used to believe [X]. I was completely wrong."

## STRUCTURE
1. Hook (2 lines max) - Stop the scroll
2. Context (2-3 lines) - Why this matters NOW
3. Insight (3-5 points) - Your unique perspective with evidence
4. Bridge (1-2 lines) - Connect to reader's reality
5. CTA (1 line) - Thought-provoking question

## FORMATTING RULES
- Double line breaks between ALL sections (this is crucial for readability)
- Short paragraphs (1-3 sentences max)
- Use "→" for subtle bullet points
- Bold (**text**) for 2-3 key phrases only
- End with 3-4 relevant hashtags

## CHARACTER TARGET: 1500-2200 characters

Write like a confident expert sharing hard-won insights, not a marketer selling something.`,

  'storytelling': `You are an elite LinkedIn storyteller who creates emotionally resonant narratives that drive massive engagement.

## HOOK FORMULA (First 2 lines)
Use ONE of these patterns:
- Time anchor: "It was [specific time]. I was [vivid situation]."
- Dialogue: "My [mentor/boss/client] said: '[memorable quote]'"
- Outcome first: "I [surprising result]. Here's how it started:"
- Vulnerability: "I failed at [X]. Publicly. Here's what happened next."

## STORY STRUCTURE
1. Hook - Drop reader into a specific moment (time, place, emotion)
2. Setup - Paint the scene in 2-3 lines
3. Tension - What was at stake? What went wrong?
4. Turning point - The pivotal moment or realization
5. Lesson - One clear, universal insight
6. Bridge - How this applies to the reader
7. CTA - Invite them to share their story

## FORMATTING RULES
- Short paragraphs (2-3 lines max)
- Use dialogue when possible
- Include sensory details (what you saw, felt, heard)
- Double line breaks between sections
- End with 3-4 relevant hashtags

## CHARACTER TARGET: 1800-2500 characters

Make the reader FEEL something. The best stories are specific, vulnerable, and end with universal truth.`,

  'educational': `You are an elite LinkedIn educator who makes complex topics simple and actionable.

## HOOK FORMULA (First 2 lines)
Use ONE of these patterns:
- Myth-buster: "Here's what most people get wrong about [X]:"
- Promise: "I spent [time] learning [X]. Here's everything in [Y] minutes:"
- Curiosity gap: "[X] changed everything for me. Let me explain."
- Direct value: "The [X] framework that [specific result]:"

## STRUCTURE
1. Hook - Promise specific value
2. Context - Why this matters (2 lines)
3. Framework/Steps - Numbered, actionable points
4. Example - Real-world application
5. Pro tip - Advanced insight
6. CTA - Ask what they'll implement first

## FORMATTING RULES
- Number every main point (1. 2. 3.)
- Start each point with a bold title
- Keep explanations under each point to 1-2 sentences
- Use "→" for sub-bullets if needed
- Double line breaks between numbered sections
- End with 3-4 relevant hashtags

## CHARACTER TARGET: 1500-2200 characters

Every sentence should teach something. No fluff, no filler.`,

  'contrarian': `You are an elite LinkedIn contrarian who challenges conventional wisdom with evidence and nuance.

## HOOK FORMULA (First 2 lines)
Use ONE of these patterns:
- Direct challenge: "Unpopular opinion: [bold statement]"
- Question the obvious: "Everyone says [X]. But what if [Y]?"
- Confession: "I disagree with [respected figure/common advice]. Here's why:"
- Data contradiction: "[Stat] says one thing. Reality says another."

## STRUCTURE
1. Hook - Bold contrarian statement
2. Acknowledge - "I know this sounds [crazy/counterintuitive]..."
3. Evidence - 2-3 supporting points with specifics
4. Nuance - Where the conventional view IS correct
5. Reframe - Your new mental model
6. CTA - "Agree or disagree? Tell me why."

## FORMATTING RULES
- Lead with your strongest point
- Back up claims with numbers or examples
- Acknowledge counterarguments (shows intellectual honesty)
- Double line breaks between sections
- End with 3-4 relevant hashtags

## CHARACTER TARGET: 1500-2000 characters

Be provocative but fair. Challenge ideas, not people. The goal is discussion, not outrage.`,

  'data-driven': `You are an elite LinkedIn analyst who makes data fascinating and actionable.

## HOOK FORMULA (First 2 lines)
Use ONE of these patterns:
- Surprising stat: "[X]% of [audience] do [surprising thing]. (Source: [Name])"
- Contrast: "The data says [X]. Most people believe [Y]."
- Trend alert: "New research from [Source]: [key finding]"
- Counter-intuitive: "Here's a stat that will change how you think about [X]:"

## STRUCTURE
1. Hook - Lead with the most surprising number
2. Source - Name your source (builds credibility)
3. Context - What this means in plain language
4. Analysis - Your unique interpretation (2-3 insights)
5. Implications - What professionals should do about it
6. CTA - Ask for their interpretation

## FORMATTING RULES
- Cite specific numbers (not "most" but "73%")
- Name your sources (builds trust)
- Use comparisons to make numbers tangible
- Pick 2-3 key stats, not a data dump
- Double line breaks between sections
- End with 3-4 relevant hashtags

## CHARACTER TARGET: 1400-1900 characters

Translate data into "so what?" Make numbers tell a story.`,

  'how-to': `You are an elite LinkedIn educator who creates step-by-step guides people actually save.

## HOOK FORMULA (First 2 lines)
Use ONE of these patterns:
- Result-first: "Here's exactly how I [achieved X] in [timeframe]:"
- Problem-solution: "Struggling with [X]? Here's the fix:"
- Steal my process: "The exact [X] process I use (steal it):"
- Save time: "Skip [X months/years] of trial and error. Here's how:"

## STRUCTURE
1. Hook - Promise a specific outcome
2. Context - Why this works (1-2 lines)
3. Steps - Numbered, actionable (5-7 steps)
4. Pro tip - One advanced insight
5. CTA - "Which step will you try first?"

## FORMATTING RULES
- Start each step with an action verb
- Keep each step to 1-2 sentences
- Bold the step title
- Add expected outcomes where relevant
- Double line breaks between steps
- End with "Save this for later. 🔖" + 3-4 hashtags

## CHARACTER TARGET: 1600-2200 characters

Write for someone doing this for the first time. Be specific enough to follow without prior knowledge.`,

  'listicle': `You are an elite LinkedIn content creator who writes listicles that people save and share.

## HOOK FORMULA (First 2 lines)
Use ONE of these patterns:
- Curated value: "[X] [tools/lessons/tips] that [specific benefit]:"
- Time-saver: "I [researched/tested] [X]. Here's what works:"
- Collection: "[X] things I wish I knew [time ago]:"
- Ranked: "My top [X] [items], ranked:"

## STRUCTURE
1. Hook - Clear promise with a number
2. Items - Numbered list (use odd numbers: 5, 7, 9)
3. Each item: Bold title + 1-2 line explanation
4. Bonus (optional) - Extra value
5. CTA - "Which one are you trying first?"

## FORMATTING RULES
- Use odd numbers (5, 7, 9 perform better)
- Bold the title of each item
- Keep explanations scannable (1-2 sentences)
- Order: best first OR best last (not in the middle)
- Double line breaks between items
- End with 3-4 relevant hashtags

## CHARACTER TARGET: 1400-2000 characters

Every item should stand alone. Readers skim—make each point valuable.`,
}

/**
 * Update research session status in database
 */
async function updateSessionStatus(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  sessionId: string,
  status: ResearchSessionStatus,
  additionalFields?: Record<string, unknown>
) {
  const { error } = await supabase
    .from('research_sessions')
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...additionalFields,
    })
    .eq('id', sessionId)

  if (error) {
    console.error(`[DeepResearch] Failed to update status to ${status}:`, error)
  }
}

/**
 * Extract hook (first line) from post content
 */
function extractHook(content: string): string {
  const firstLine = content.split('\n')[0]?.trim() || ''
  return firstLine.length > 100 ? firstLine.slice(0, 100) + '...' : firstLine
}

/**
 * Deep Research Workflow
 * Orchestrates: Tavily → Perplexity → OpenAI → Database
 * Uses parallel execution for maximum performance
 */
export const deepResearchWorkflow = inngest.createFunction(
  {
    id: 'deep-research',
    name: 'Deep Research Workflow',
    retries: 2,
    // Enable parallel optimization for better throughput
    // @see https://www.inngest.com/docs/guides/step-parallelism
    onFailure: async ({ error, event }) => {
      const supabase = getSupabaseAdmin()
      // Type assertion for event data since onFailure has generic typing
      const eventData = event.data as { sessionId?: string; userId?: string } | undefined
      const sessionId = eventData?.sessionId
      const userId = eventData?.userId

      if (!sessionId) {
        console.error('[DeepResearch] Workflow failed but no sessionId in event data:', error)
        return
      }

      // Update session status to failed
      await supabase
        .from('research_sessions')
        .update({
          status: 'failed',
          error_message: error.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      console.error(`[DeepResearch] Workflow failed for session ${sessionId} (user: ${userId}):`, error)
    },
  },
  { event: 'discover/research' },
  async ({ event, step }) => {
    const {
      userId,
      sessionId,
      topics,
      depth,
      maxResultsPerTopic = 5,
      generatePosts = true,
      postTypes = ['thought-leadership', 'educational', 'storytelling'],
      companyContextId,
    } = event.data

    const supabase = getSupabaseAdmin()
    const startTime = Date.now()

    console.log(`[DeepResearch] Starting workflow for session ${sessionId}`)
    console.log(`[DeepResearch] Topics: ${topics.join(', ')}`)
    console.log(`[DeepResearch] Depth: ${depth}, MaxResults: ${maxResultsPerTopic}`)

    // Validate inputs
    if (!topics || topics.length === 0) {
      throw new Error('At least one topic is required')
    }

    if (topics.length > 5) {
      throw new Error('Maximum 5 topics allowed')
    }

    // Step 1: Initialize research session
    await step.run('initialize-session', async () => {
      console.log(`[DeepResearch] Step 1: Initializing session ${sessionId}`)
      await updateSessionStatus(supabase, sessionId, 'initializing', {
        started_at: new Date().toISOString(),
      })
      return { initialized: true }
    })

    // Step 2: Tavily Web Search - PARALLEL for all topics
    const searchResults = await step.run('tavily-search-parallel', async () => {
      console.log(`[DeepResearch] Step 2: Starting parallel Tavily search for ${topics.length} topics`)
      await updateSessionStatus(supabase, sessionId, 'searching')

      // Check if Tavily is configured
      if (!process.env.TAVILY_API_KEY) {
        console.warn('[DeepResearch] TAVILY_API_KEY not configured, skipping web search')
        return [] as SearchResult[]
      }

      // Search all topics in PARALLEL using Promise.all
      const searchPromises = topics.map(async (topic: string) => {
        console.log(`[DeepResearch] Searching topic: "${topic}"`)
        try {
          const response = await searchContent(topic, {
            maxResults: maxResultsPerTopic,
            searchDepth: depth === 'deep' ? 'advanced' : 'basic',
            includeAnswer: true,
          })

          console.log(`[DeepResearch] Found ${response.results.length} results for "${topic}"`)

          return response.results.map((result: TavilySearchResult) => ({
            url: result.url,
            title: result.title,
            content: result.content,
            score: result.score,
            topic,
            publishedDate: result.publishedDate,
          }))
        } catch (error) {
          console.error(`[DeepResearch] Tavily search failed for topic "${topic}":`, error)
          return []
        }
      })

      // Execute all searches in parallel
      const results = await Promise.all(searchPromises)
      const allResults: SearchResult[] = results.flat()

      // Sort by relevance score and deduplicate by URL
      const seen = new Set<string>()
      const uniqueResults = allResults
        .sort((a, b) => b.score - a.score)
        .filter((result) => {
          if (seen.has(result.url)) return false
          seen.add(result.url)
          return true
        })

      console.log(`[DeepResearch] Total unique results: ${uniqueResults.length}`)
      return uniqueResults
    })

    // Step 3: Perplexity Deep Research - PARALLEL for top results
    const enrichedResults = await step.run('perplexity-enrich-parallel', async () => {
      console.log(`[DeepResearch] Step 3: Starting parallel Perplexity enrichment`)
      await updateSessionStatus(supabase, sessionId, 'enriching')

      // Take top results for enrichment (max 10)
      const topResults = searchResults.slice(0, Math.min(10, searchResults.length))

      if (topResults.length === 0) {
        console.log('[DeepResearch] No results to enrich')
        return [] as EnrichedResult[]
      }

      // Check if Perplexity is configured
      const perplexity = createPerplexityClient()
      if (!perplexity) {
        console.warn('[DeepResearch] Perplexity not configured, using raw search results')
        return topResults.map((result) => ({
          ...result,
          enrichedContent: result.content,
          keyInsights: [],
        })) as EnrichedResult[]
      }

      console.log(`[DeepResearch] Enriching ${topResults.length} results in parallel`)

      // Enrich all results in PARALLEL using Promise.all
      const enrichPromises = topResults.map(async (result) => {
        try {
          const researchPrompt = `Provide a deeper analysis of this topic: "${result.title}"

Context: ${result.content.slice(0, 2000)}

Please provide:
1. Key insights and main takeaways (3-5 bullet points)
2. Current trends related to this topic
3. Expert opinions or notable perspectives
4. Actionable implications for professionals

Be concise and factual.`

          const research = await perplexity.research(researchPrompt)

          // Extract key insights from the response
          const insightMatches = research.match(/(?:key insights?|takeaways?|main points?)[\s\S]*?(?=(?:current trends|expert|actionable|$))/i)
          const keyInsights = insightMatches
            ? insightMatches[0]
                .split(/[\n•\-\d\.]+/)
                .filter((s) => s.trim().length > 20)
                .slice(0, 5)
            : []

          return {
            ...result,
            enrichedContent: research,
            keyInsights,
            trendAnalysis: research,
          } as EnrichedResult
        } catch (error) {
          console.error(`[DeepResearch] Perplexity enrichment failed for "${result.title}":`, error)
          // Use original content as fallback
          return {
            ...result,
            enrichedContent: result.content,
            keyInsights: [],
          } as EnrichedResult
        }
      })

      // Execute all enrichments in parallel
      const enriched = await Promise.all(enrichPromises)
      console.log(`[DeepResearch] Successfully enriched ${enriched.length} results`)
      return enriched
    })

    // Step 4: Save discover posts to database
    const savedPosts = await step.run('save-discover-posts', async () => {
      console.log(`[DeepResearch] Step 4: Saving ${enrichedResults.length} discover posts`)

      if (enrichedResults.length === 0) {
        return []
      }

      const postsToInsert = enrichedResults.map((result) => ({
        linkedin_url: result.url,
        author_name: new URL(result.url).hostname.replace('www.', ''),
        author_headline: `Content from ${new URL(result.url).hostname}`,
        content: result.enrichedContent || result.content,
        post_type: 'article',
        likes_count: 0,
        comments_count: 0,
        reposts_count: 0,
        posted_at: result.publishedDate || new Date().toISOString(),
        scraped_at: new Date().toISOString(),
        topics: [result.topic],
        is_viral: false,
        engagement_rate: result.score * 5, // Scale 0-1 to 0-5
        source: 'research',
      }))

      // Check for existing URLs to avoid duplicates
      const urls = postsToInsert.map((p) => p.linkedin_url)
      const { data: existing } = await supabase
        .from('discover_posts')
        .select('linkedin_url')
        .in('linkedin_url', urls)

      const existingUrls = new Set(existing?.map((e: { linkedin_url: string }) => e.linkedin_url) || [])
      const newPosts = postsToInsert.filter((p) => !existingUrls.has(p.linkedin_url))

      if (newPosts.length > 0) {
        const { data, error } = await supabase
          .from('discover_posts')
          .insert(newPosts)
          .select('id, linkedin_url')

        if (error) {
          console.error('[DeepResearch] Failed to save discover posts:', error)
          return []
        }

        console.log(`[DeepResearch] Saved ${data?.length || 0} new discover posts`)
        return data || []
      }

      console.log('[DeepResearch] All posts already exist, skipping insert')
      return []
    })

    // Step 5: Generate LinkedIn posts with OpenAI - PARALLEL (if enabled)
    let generatedPosts: GeneratedPost[] = []

    if (generatePosts && enrichedResults.length > 0) {
      generatedPosts = await step.run('generate-posts-parallel', async () => {
        console.log(`[DeepResearch] Step 5: Generating LinkedIn posts in parallel`)
        await updateSessionStatus(supabase, sessionId, 'generating')

        const apiKey = process.env.OPENROUTER_API_KEY

        if (!apiKey) {
          console.warn('[DeepResearch] OPENROUTER_API_KEY not configured, skipping post generation')
          return [] as GeneratedPost[]
        }

        const client = createOpenAIClient({ apiKey })

        // Get company context if provided
        let companyContext = ''
        if (companyContextId) {
          const { data: context } = await supabase
            .from('company_context')
            .select('company_name, company_summary, tone_of_voice, target_audience')
            .eq('id', companyContextId)
            .maybeSingle()

          if (context) {
            companyContext = `
Company Context:
- Company: ${context.company_name}
- Summary: ${context.company_summary || 'N/A'}
- Tone: ${JSON.stringify(context.tone_of_voice) || 'Professional'}
- Target Audience: ${JSON.stringify(context.target_audience) || 'Professionals'}

Adapt the post to match this company's voice and target audience.
`
          }
        }

        // Generate posts for top results - PARALLEL
        const typesToGenerate: PostType[] = postTypes.slice(0, 3) // Max 3 types per result
        const resultsToProcess = enrichedResults.slice(0, 5) // Max 5 results

        console.log(`[DeepResearch] Generating ${typesToGenerate.length} post types for ${resultsToProcess.length} results`)

        // Create all generation tasks
        const generationTasks: { result: EnrichedResult; postType: PostType }[] = []
        for (const result of resultsToProcess) {
          for (const postType of typesToGenerate) {
            generationTasks.push({ result, postType })
          }
        }

        console.log(`[DeepResearch] Total generation tasks: ${generationTasks.length}`)

        // Execute all generations in PARALLEL using Promise.all
        const generationPromises = generationTasks.map(async ({ result, postType }) => {
          try {
            const systemPrompt = POST_PROMPTS[postType as PostType] + companyContext

            const userMessage = `Research Topic: ${result.topic}
Title: ${result.title}
URL: ${result.url}

Research Content:
${result.enrichedContent?.slice(0, 3000) || result.content.slice(0, 3000)}

${result.keyInsights.length > 0 ? `Key Insights:\n${result.keyInsights.join('\n')}` : ''}

Transform this research into a LinkedIn post following the specified format.`

            const response = await chatCompletion(client, {
              systemPrompt,
              userMessage,
              temperature: 0.7,
              maxTokens: 800,
            })

            const content = response.content.trim()
            const hook = extractHook(content)

            return {
              sourceId: result.url,
              content,
              postType,
              hook,
              wordCount: content.split(/\s+/).length,
              sourceUrl: result.url,
              sourceTitle: result.title,
            } as GeneratedPost
          } catch (error) {
            console.error(`[DeepResearch] Post generation failed for type ${postType}:`, error)
            return null
          }
        })

        // Execute all generations in parallel
        const results = await Promise.all(generationPromises)
        const posts = results.filter((p): p is GeneratedPost => p !== null)

        console.log(`[DeepResearch] Successfully generated ${posts.length} posts`)
        return posts
      })

      // Step 6: Save generated posts to database
      if (generatedPosts.length > 0) {
        await step.run('save-generated-posts', async () => {
          console.log(`[DeepResearch] Step 6: Saving ${generatedPosts.length} generated posts`)
          await updateSessionStatus(supabase, sessionId, 'saving')

          const postsToInsert = generatedPosts.map((post) => ({
            user_id: userId,
            research_session_id: sessionId,
            content: post.content,
            post_type: post.postType,
            hook: post.hook,
            word_count: post.wordCount,
            source_url: post.sourceUrl,
            source_title: post.sourceTitle,
            status: 'draft',
          }))

          const { error } = await supabase.from('generated_posts').insert(postsToInsert)

          if (error) {
            console.error('[DeepResearch] Failed to save generated posts:', error)
            // Don't throw - we still have discover posts saved
          } else {
            console.log(`[DeepResearch] Saved ${postsToInsert.length} generated posts`)
          }
        })
      }
    }

    // Step 7: Finalize session
    await step.run('finalize-session', async () => {
      const duration = Date.now() - startTime

      console.log(`[DeepResearch] Step 7: Finalizing session ${sessionId}`)
      console.log(`[DeepResearch] Posts discovered: ${savedPosts.length}`)
      console.log(`[DeepResearch] Posts generated: ${generatedPosts.length}`)
      console.log(`[DeepResearch] Total duration: ${duration}ms`)

      await supabase
        .from('research_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          posts_discovered: savedPosts.length,
          posts_generated: generatedPosts.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
    })

    // Emit completion event
    await step.sendEvent('research-completed', {
      name: 'discover/research.completed',
      data: {
        userId,
        sessionId,
        postsDiscovered: savedPosts.length,
        postsGenerated: generatedPosts.length,
        topics,
        duration: Date.now() - startTime,
      },
    })

    const finalDuration = Date.now() - startTime
    console.log(`[DeepResearch] ✅ Session ${sessionId} completed successfully in ${finalDuration}ms`)

    return {
      success: true,
      sessionId,
      postsDiscovered: savedPosts.length,
      postsGenerated: generatedPosts.length,
      duration: finalDuration,
    }
  }
)
