/**
 * Template Auto-Generate Cron Job (Smart)
 * @description Inngest cron function that runs every 4 hours to auto-generate
 * AI-powered templates across ALL categories (default + custom) for each user
 * with company context. Accounts for hardcoded AI templates already present in
 * the UI and only generates the gap up to MAX_AI_TEMPLATES_PER_CATEGORY.
 * @module lib/inngest/functions/template-auto-generate
 */

import { createClient } from '@supabase/supabase-js'
import { inngest } from '../client'
import {
  createOpenAIClient,
  chatCompletion,
} from '@/lib/ai/openai-client'
import {
  formatCompanyContextForPrompt,
  type CompanyContext,
} from '@/lib/ai/suggestion-prompts'
import { ANTI_AI_PROMPT_CONSTRAINTS } from '@/lib/ai/anti-ai-rules'

/** Maximum total AI templates (hardcoded + DB) allowed per category */
const MAX_AI_TEMPLATES_PER_CATEGORY = 4

/** Delay between AI API calls to avoid rate limits (ms) */
const API_CALL_DELAY_MS = 1500

/**
 * The 5 built-in template categories.
 * Must stay in sync with DEFAULT_CATEGORIES in hooks/use-template-categories.ts
 */
const DEFAULT_CATEGORIES = [
  'Thought Leadership',
  'Personal Story',
  'How-To',
  'Engagement',
  'Sales',
] as const

/**
 * Number of hardcoded AI templates per category already rendered in the UI.
 * Sourced from AI_TEMPLATE_CATEGORIES in template-library/constants.ts.
 * The cron subtracts these from MAX so it only generates the gap.
 *
 * Breakdown:
 *   Engagement: 3  (ai-hook-1 Contrarian Take, ai-hook-3 Pattern Interrupt, ai-list-1 Tools & Resources)
 *   Thought Leadership: 2  (ai-hook-2 Bold Statement, ai-list-2 Lessons Learned)
 *   Personal Story: 2  (ai-story-1 Failure to Success, ai-story-2 Behind the Scenes)
 *   How-To: 2  (ai-howto-1 Step-by-Step Guide, ai-howto-2 Common Mistakes)
 *   Sales: 0  (no hardcoded AI templates)
 */
const HARDCODED_AI_COUNTS: Record<string, number> = {
  'Engagement': 3,
  'Thought Leadership': 2,
  'Personal Story': 2,
  'How-To': 2,
  'Sales': 0,
}

/**
 * Supabase admin client for background jobs (bypasses RLS)
 */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, serviceKey)
}

/**
 * Builds the system prompt for generating template content
 * @param companyContext - User's company context for personalization
 * @param categoryName - The category to generate templates for
 * @param count - Number of templates to generate
 * @returns System prompt string
 */
function buildTemplateGenerationPrompt(
  companyContext: CompanyContext,
  categoryName: string,
  count: number
): string {
  const formattedContext = formatCompanyContextForPrompt(companyContext)

  return `You are a LinkedIn content strategist creating reusable POST TEMPLATES for a business.

## Company Context
${formattedContext}

## Your Task
Generate exactly ${count} reusable LinkedIn post template(s) for the category: "${categoryName}"

Each template must:
1. Be a reusable framework with [placeholder] slots (e.g. [your result], [timeframe], [specific example])
2. Focus specifically on the "${categoryName}" theme
3. Be personalized to the company's industry, audience, and tone
4. Follow the bracket-placeholder style so users can fill in their own details
5. Be 200-600 characters long (concise, scannable)

## Template Style Examples
Use this bracket-placeholder format:

Example 1:
Name: "Quick Win Share"
Content: "Last week we helped [client type] achieve [specific result] in just [timeframe].\\n\\nThe key? [1-sentence insight].\\n\\nIf you're struggling with [pain point], try this:\\n\\n1. [Step 1]\\n2. [Step 2]\\n3. [Step 3]\\n\\nWhat's your biggest challenge with [topic]?"

Example 2:
Name: "Industry Hot Take"
Content: "Most [job title]s think [common belief].\\n\\nAfter [X years/months] working with [audience], I've seen the opposite.\\n\\n[Your contrarian insight with 1 concrete example]\\n\\nThe data backs this up: [specific metric or observation].\\n\\nWhat's your experience?"

${ANTI_AI_PROMPT_CONSTRAINTS}

## Output Format
Return ONLY a valid JSON array. No markdown, no explanation, no code fences.

[
  {
    "name": "Short descriptive template name (2-5 words)",
    "content": "Template content with [placeholder] slots and \\n for line breaks",
    "tags": ["tag1", "tag2", "tag3"]
  }
]`
}

/**
 * Parses AI response into template objects
 * @param content - Raw AI response string
 * @returns Parsed template array
 */
function parseTemplateResponse(content: string): Array<{
  name: string
  content: string
  tags: string[]
}> {
  let jsonString = content.trim()

  // Strip markdown code fences
  if (jsonString.startsWith('```')) {
    const match = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      jsonString = match[1].trim()
    }
  }

  // Extract JSON array
  const arrayMatch = jsonString.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    jsonString = arrayMatch[0]
  }

  const parsed: unknown = JSON.parse(jsonString)
  if (!Array.isArray(parsed)) {
    throw new Error('AI response is not an array')
  }

  const templates: Array<{ name: string; content: string; tags: string[] }> = []

  for (const item of parsed) {
    if (
      item &&
      typeof item === 'object' &&
      typeof (item as Record<string, unknown>).name === 'string' &&
      typeof (item as Record<string, unknown>).content === 'string'
    ) {
      const obj = item as Record<string, unknown>
      templates.push({
        name: String(obj.name),
        content: String(obj.content),
        tags: Array.isArray(obj.tags)
          ? (obj.tags as unknown[]).filter((t): t is string => typeof t === 'string')
          : [],
      })
    }
  }

  return templates
}

/**
 * Sleep utility for API rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Smart Template Auto-Generate Cron Function
 *
 * For each eligible user:
 * 1. Collects ALL categories: 5 defaults + custom from template_categories
 * 2. Counts existing AI templates per category:
 *    - Hardcoded (from HARDCODED_AI_COUNTS, same for all users)
 *    - Database (is_ai_generated = true, per user per category)
 * 3. If total < MAX_AI_TEMPLATES_PER_CATEGORY, generates the gap
 * 4. Saves to templates table with is_ai_generated = true
 */
export const templateAutoGenerate = inngest.createFunction(
  {
    id: 'template-auto-generate',
    name: 'Template Auto-Generate',
    retries: 1,
  },
  { cron: '0 */4 * * *' },
  async ({ step }) => {
    const supabase = getSupabaseAdmin()

    console.log('[TemplateAutoGen] Starting smart auto-generation run')

    // Step 1: Fetch users with company context
    const eligibleUsers = await step.run('fetch-eligible-users', async () => {
      const { data: contexts, error } = await supabase
        .from('company_context')
        .select('*')
        .not('company_name', 'is', null)

      if (error) {
        console.error('[TemplateAutoGen] Failed to fetch company contexts:', error)
        return []
      }

      console.log(`[TemplateAutoGen] Found ${contexts?.length ?? 0} users with company context`)
      return (contexts ?? []) as CompanyContext[]
    })

    if (eligibleUsers.length === 0) {
      console.log('[TemplateAutoGen] No eligible users, skipping')
      return { success: true, totalUsers: 0, templatesGenerated: 0, categoriesProcessed: 0 }
    }

    // Validate API key availability
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      console.error('[TemplateAutoGen] OPENROUTER_API_KEY not configured')
      return { success: false, error: 'Missing OPENROUTER_API_KEY' }
    }

    // Step 2: Process each user smartly
    const results = await step.run('process-users', async () => {
      const client = createOpenAIClient({ apiKey, timeout: 60000 })
      let totalGenerated = 0
      let totalCategories = 0

      for (const context of eligibleUsers) {
        try {
          // Build the full category list for this user: defaults + custom
          const allCategoryNames = new Set<string>(DEFAULT_CATEGORIES)

          // Fetch custom categories
          const { data: customCategories, error: catError } = await supabase
            .from('template_categories')
            .select('id, name')
            .eq('user_id', context.user_id)

          if (!catError && customCategories) {
            for (const cat of customCategories) {
              allCategoryNames.add(cat.name)
            }
          }

          console.log(
            `[TemplateAutoGen] User ${context.user_id} (${context.company_name}): ` +
            `${allCategoryNames.size} total categories (${DEFAULT_CATEGORIES.length} default + ` +
            `${(customCategories?.length ?? 0)} custom)`
          )

          // Fetch DB AI template counts per category for this user in one query
          const { data: dbCounts, error: countError } = await supabase
            .from('templates')
            .select('category')
            .eq('user_id', context.user_id)
            .eq('is_ai_generated', true)

          if (countError) {
            console.error(`[TemplateAutoGen] Count error for user ${context.user_id}:`, countError)
            continue
          }

          // Build a map of category → DB AI template count
          const dbCountMap: Record<string, number> = {}
          if (dbCounts) {
            for (const row of dbCounts) {
              const cat = row.category ?? 'Other'
              dbCountMap[cat] = (dbCountMap[cat] ?? 0) + 1
            }
          }

          // Process each category
          for (const categoryName of allCategoryNames) {
            const hardcoded = HARDCODED_AI_COUNTS[categoryName] ?? 0
            const dbAiCount = dbCountMap[categoryName] ?? 0
            const totalExisting = hardcoded + dbAiCount
            const needed = MAX_AI_TEMPLATES_PER_CATEGORY - totalExisting

            if (needed <= 0) {
              console.log(
                `[TemplateAutoGen]   "${categoryName}": ${hardcoded} hardcoded + ${dbAiCount} DB = ${totalExisting}, at max`
              )
              continue
            }

            console.log(
              `[TemplateAutoGen]   "${categoryName}": ${hardcoded} hardcoded + ${dbAiCount} DB = ${totalExisting}, need ${needed} more`
            )

            totalCategories++

            // Generate templates via AI
            const batchId = crypto.randomUUID()
            const prompt = buildTemplateGenerationPrompt(context, categoryName, needed)

            try {
              const response = await chatCompletion(client, {
                systemPrompt: prompt,
                userMessage: `Generate ${needed} reusable LinkedIn post template(s) for the "${categoryName}" category. Return JSON only.`,
                temperature: 0.8,
                maxTokens: 2048,
              })

              const templates = parseTemplateResponse(response.content)

              // Insert generated templates (cap at needed count)
              const toInsert = templates.slice(0, needed).map((t) => ({
                user_id: context.user_id,
                name: t.name,
                content: t.content,
                category: categoryName,
                tags: t.tags,
                is_public: false,
                is_ai_generated: true,
                ai_generation_batch_id: batchId,
                usage_count: 0,
              }))

              if (toInsert.length > 0) {
                const { error: insertError } = await supabase
                  .from('templates')
                  .insert(toInsert)

                if (insertError) {
                  console.error(
                    `[TemplateAutoGen]   Insert error for "${categoryName}":`,
                    insertError
                  )
                } else {
                  totalGenerated += toInsert.length
                  console.log(
                    `[TemplateAutoGen]   Generated ${toInsert.length} templates for "${categoryName}"`
                  )
                }
              }

              // Rate limit between API calls
              await sleep(API_CALL_DELAY_MS)
            } catch (aiError) {
              console.error(
                `[TemplateAutoGen]   AI generation failed for "${categoryName}":`,
                aiError
              )
            }
          }
        } catch (userError) {
          console.error(`[TemplateAutoGen] Error processing user ${context.user_id}:`, userError)
        }
      }

      return { totalGenerated, totalCategories }
    })

    // Step 3: Log summary
    const summary = {
      totalUsers: eligibleUsers.length,
      templatesGenerated: results.totalGenerated,
      categoriesProcessed: results.totalCategories,
    }

    console.log('[TemplateAutoGen] === Smart Auto-Generate Summary ===')
    console.log(`[TemplateAutoGen] Users checked: ${summary.totalUsers}`)
    console.log(`[TemplateAutoGen] Categories needing templates: ${summary.categoriesProcessed}`)
    console.log(`[TemplateAutoGen] Templates generated: ${summary.templatesGenerated}`)

    return { success: true, ...summary }
  }
)
