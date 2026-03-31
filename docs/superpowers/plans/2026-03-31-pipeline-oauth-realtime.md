# Enhanced Pipeline + ChatGPT OAuth + Supabase Real-Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete multi-step post-generation pipeline with LLM verification and web fact-checking, add ChatGPT OAuth so users can connect their accounts without API keys, and enable Supabase real-time across all data hooks.

**Architecture:** Three independent workstreams: (1) Post pipeline adds verification and fact-checking steps after generation via new API routes and a pipeline orchestrator, (2) ChatGPT OAuth uses the Codex device-code flow ported from the health app reference, storing tokens in Supabase instead of MongoDB, (3) Real-time replaces polling with Supabase channel subscriptions on all hooks.

**Tech Stack:** Next.js 16, Vercel AI SDK, OpenRouter, Tavily API, Supabase (PostgreSQL + Realtime), Zod, React 19

---

## Workstream A: Enhanced Post-Generation Pipeline

### Task A1: Create Pipeline Orchestrator and Types

**Files:**
- Create: `lib/ai/pipeline/types.ts`
- Create: `lib/ai/pipeline/orchestrator.ts`

- [ ] **Step 1: Create pipeline type definitions**

```typescript
// lib/ai/pipeline/types.ts
export type PipelineStage = 'generate' | 'verify-rules' | 'fact-check' | 'refine'

export interface PipelineStep {
  stage: PipelineStage
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped'
  result?: string
  issues?: PipelineIssue[]
  metadata?: Record<string, unknown>
  durationMs?: number
}

export interface PipelineIssue {
  type: 'rule-violation' | 'factual-error' | 'style-issue'
  severity: 'error' | 'warning'
  description: string
  suggestion?: string
  source?: string
}

export interface PipelineResult {
  originalPost: string
  finalPost: string
  steps: PipelineStep[]
  totalDurationMs: number
  wasRefined: boolean
  issues: PipelineIssue[]
}

export interface PipelineConfig {
  enableVerification: boolean
  enableFactCheck: boolean
  enableAutoRefine: boolean
  maxRefinementAttempts: number
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  enableVerification: true,
  enableFactCheck: true,
  enableAutoRefine: true,
  maxRefinementAttempts: 2,
}
```

- [ ] **Step 2: Create the pipeline orchestrator**

```typescript
// lib/ai/pipeline/orchestrator.ts
import { PipelineConfig, PipelineResult, PipelineStep, PipelineIssue, DEFAULT_PIPELINE_CONFIG } from './types'

export class PostPipeline {
  private steps: PipelineStep[] = []
  private config: PipelineConfig

  constructor(config: Partial<PipelineConfig> = {}) {
    this.config = { ...DEFAULT_PIPELINE_CONFIG, ...config }
  }

  async run(params: {
    generatedPost: string
    contentRules: string[]
    userId: string
    apiKey: string
  }): Promise<PipelineResult> {
    const startTime = Date.now()
    let currentPost = params.generatedPost
    const allIssues: PipelineIssue[] = []

    // Step 1: Verify rules
    if (this.config.enableVerification) {
      const verifyStep = await this.verifyRules(currentPost, params.contentRules, params.apiKey)
      this.steps.push(verifyStep)
      if (verifyStep.issues) allIssues.push(...verifyStep.issues)
    }

    // Step 2: Fact-check
    if (this.config.enableFactCheck) {
      const factStep = await this.factCheck(currentPost, params.apiKey)
      this.steps.push(factStep)
      if (factStep.issues) allIssues.push(...factStep.issues)
    }

    // Step 3: Auto-refine if issues found
    let wasRefined = false
    if (this.config.enableAutoRefine && allIssues.some(i => i.severity === 'error')) {
      for (let attempt = 0; attempt < this.config.maxRefinementAttempts; attempt++) {
        const refineStep = await this.refine(currentPost, allIssues, params.contentRules, params.apiKey)
        this.steps.push(refineStep)
        if (refineStep.result) {
          currentPost = refineStep.result
          wasRefined = true
        }
        if (refineStep.status === 'passed') break
      }
    }

    return {
      originalPost: params.generatedPost,
      finalPost: currentPost,
      steps: this.steps,
      totalDurationMs: Date.now() - startTime,
      wasRefined,
      issues: allIssues,
    }
  }

  // Individual step methods are implemented in Tasks A2, A3, A4
  async verifyRules(_post: string, _rules: string[], _apiKey: string): Promise<PipelineStep> {
    throw new Error('Not implemented - see Task A2')
  }

  async factCheck(_post: string, _apiKey: string): Promise<PipelineStep> {
    throw new Error('Not implemented - see Task A3')
  }

  async refine(_post: string, _issues: PipelineIssue[], _rules: string[], _apiKey: string): Promise<PipelineStep> {
    throw new Error('Not implemented - see Task A4')
  }
}
```

- [ ] **Step 3: Commit**
```bash
git add lib/ai/pipeline/types.ts lib/ai/pipeline/orchestrator.ts
git commit -m "feat(pipeline): add post pipeline orchestrator and type definitions"
```

---

### Task A2: Content Rules Verification Step

**Files:**
- Create: `lib/ai/pipeline/verify-rules.ts`
- Modify: `lib/ai/pipeline/orchestrator.ts`

- [ ] **Step 1: Create the verification module**

```typescript
// lib/ai/pipeline/verify-rules.ts
import { createOpenAIClient, chatCompletion, DEFAULT_MODEL } from '@/lib/ai/openai-client'
import { PipelineStep, PipelineIssue } from './types'

const VERIFY_SYSTEM_PROMPT = `You are a content compliance checker for LinkedIn posts. Your job is to verify if a post follows the provided content rules.

For each rule, check if the post complies. Report violations with:
- The rule that was violated
- How it was violated
- A specific suggestion to fix it

Respond in JSON format:
{
  "compliant": boolean,
  "violations": [
    {
      "rule": "the rule text",
      "violation": "how it was violated",
      "suggestion": "specific fix suggestion",
      "severity": "error" | "warning"
    }
  ],
  "notes": "optional overall assessment"
}`

export async function verifyContentRules(
  post: string,
  rules: string[],
  apiKey: string
): Promise<PipelineStep> {
  const startTime = Date.now()

  if (rules.length === 0) {
    return {
      stage: 'verify-rules',
      status: 'skipped',
      durationMs: Date.now() - startTime,
      metadata: { reason: 'no content rules configured' },
    }
  }

  try {
    const client = createOpenAIClient({ apiKey })
    const rulesText = rules.map((r, i) => `${i + 1}. ${r}`).join('\n')

    const response = await chatCompletion(client, {
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: VERIFY_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `## Content Rules:\n${rulesText}\n\n## Post to Verify:\n${post}`,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const result = JSON.parse(response.content)
    const issues: PipelineIssue[] = (result.violations || []).map((v: Record<string, string>) => ({
      type: 'rule-violation' as const,
      severity: v.severity === 'warning' ? 'warning' as const : 'error' as const,
      description: `Rule: "${v.rule}" - ${v.violation}`,
      suggestion: v.suggestion,
    }))

    return {
      stage: 'verify-rules',
      status: result.compliant ? 'passed' : 'failed',
      issues,
      durationMs: Date.now() - startTime,
      metadata: {
        rulesChecked: rules.length,
        violationsFound: issues.length,
        tokens: response.totalTokens,
        notes: result.notes,
      },
    }
  } catch (error) {
    return {
      stage: 'verify-rules',
      status: 'failed',
      durationMs: Date.now() - startTime,
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
    }
  }
}
```

- [ ] **Step 2: Wire into orchestrator**

Replace the `verifyRules` method in `lib/ai/pipeline/orchestrator.ts`:
```typescript
import { verifyContentRules } from './verify-rules'

// Inside PostPipeline class, replace verifyRules method:
async verifyRules(post: string, rules: string[], apiKey: string): Promise<PipelineStep> {
  return verifyContentRules(post, rules, apiKey)
}
```

- [ ] **Step 3: Commit**
```bash
git add lib/ai/pipeline/verify-rules.ts lib/ai/pipeline/orchestrator.ts
git commit -m "feat(pipeline): add LLM-based content rules verification step"
```

---

### Task A3: Tavily Fact-Checking Step

**Files:**
- Create: `lib/ai/pipeline/fact-check.ts`
- Modify: `lib/ai/pipeline/orchestrator.ts`

- [ ] **Step 1: Install Tavily SDK**
```bash
npm install @tavily/core
```

- [ ] **Step 2: Create the fact-checking module**

```typescript
// lib/ai/pipeline/fact-check.ts
import { tavily } from '@tavily/core'
import { createOpenAIClient, chatCompletion, DEFAULT_MODEL } from '@/lib/ai/openai-client'
import { PipelineStep, PipelineIssue } from './types'

const EXTRACT_CLAIMS_PROMPT = `Extract all factual claims from this LinkedIn post that can be verified. Only extract specific, verifiable claims (statistics, dates, company facts, market data, scientific claims). Skip opinions, personal experiences, and subjective statements.

Respond in JSON:
{
  "claims": [
    { "claim": "the specific factual claim", "searchQuery": "optimized search query to verify this" }
  ]
}`

const ASSESS_CLAIMS_PROMPT = `You are a fact-checker. Given a claim and search results, assess whether the claim is accurate.

Respond in JSON:
{
  "assessments": [
    {
      "claim": "the claim",
      "verdict": "verified" | "disputed" | "unverifiable",
      "explanation": "brief explanation with source reference",
      "severity": "error" | "warning",
      "suggestion": "correction if disputed"
    }
  ]
}`

export async function factCheckPost(
  post: string,
  apiKey: string
): Promise<PipelineStep> {
  const startTime = Date.now()
  const tavilyApiKey = process.env.TAVILY_API_KEY

  if (!tavilyApiKey) {
    return {
      stage: 'fact-check',
      status: 'skipped',
      durationMs: Date.now() - startTime,
      metadata: { reason: 'TAVILY_API_KEY not configured' },
    }
  }

  try {
    const client = createOpenAIClient({ apiKey })
    const tvly = tavily({ apiKey: tavilyApiKey })

    // Step 1: Extract verifiable claims
    const extractResponse = await chatCompletion(client, {
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: EXTRACT_CLAIMS_PROMPT },
        { role: 'user', content: post },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const { claims } = JSON.parse(extractResponse.content)

    if (!claims || claims.length === 0) {
      return {
        stage: 'fact-check',
        status: 'passed',
        durationMs: Date.now() - startTime,
        metadata: { reason: 'No verifiable claims found', tokens: extractResponse.totalTokens },
      }
    }

    // Step 2: Search for each claim (parallel, max 5)
    const claimsToCheck = claims.slice(0, 5)
    const searchResults = await Promise.all(
      claimsToCheck.map(async (c: { claim: string; searchQuery: string }) => {
        try {
          const result = await tvly.search(c.searchQuery, {
            maxResults: 3,
            searchDepth: 'basic',
            includeAnswer: true,
          })
          return { claim: c.claim, results: result }
        } catch {
          return { claim: c.claim, results: null }
        }
      })
    )

    // Step 3: Assess claims with search results
    const searchContext = searchResults.map(s => {
      if (!s.results) return `Claim: "${s.claim}"\nSearch: No results found`
      const sources = s.results.results.map((r: { title: string; content: string; url: string }) =>
        `- ${r.title}: ${r.content} (${r.url})`
      ).join('\n')
      return `Claim: "${s.claim}"\nAnswer: ${s.results.answer || 'N/A'}\nSources:\n${sources}`
    }).join('\n\n---\n\n')

    const assessResponse = await chatCompletion(client, {
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: ASSESS_CLAIMS_PROMPT },
        { role: 'user', content: searchContext },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const { assessments } = JSON.parse(assessResponse.content)
    const issues: PipelineIssue[] = (assessments || [])
      .filter((a: Record<string, string>) => a.verdict === 'disputed')
      .map((a: Record<string, string>) => ({
        type: 'factual-error' as const,
        severity: a.severity === 'warning' ? 'warning' as const : 'error' as const,
        description: `Claim: "${a.claim}" - ${a.explanation}`,
        suggestion: a.suggestion,
        source: 'tavily-fact-check',
      }))

    const hasErrors = issues.some(i => i.severity === 'error')

    return {
      stage: 'fact-check',
      status: hasErrors ? 'failed' : 'passed',
      issues,
      durationMs: Date.now() - startTime,
      metadata: {
        claimsExtracted: claims.length,
        claimsChecked: claimsToCheck.length,
        disputedClaims: issues.length,
        totalTokens: (extractResponse.totalTokens || 0) + (assessResponse.totalTokens || 0),
      },
    }
  } catch (error) {
    return {
      stage: 'fact-check',
      status: 'failed',
      durationMs: Date.now() - startTime,
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
    }
  }
}
```

- [ ] **Step 3: Wire into orchestrator**

Replace the `factCheck` method in `lib/ai/pipeline/orchestrator.ts`:
```typescript
import { factCheckPost } from './fact-check'

// Inside PostPipeline class, replace factCheck method:
async factCheck(post: string, apiKey: string): Promise<PipelineStep> {
  return factCheckPost(post, apiKey)
}
```

- [ ] **Step 4: Commit**
```bash
git add lib/ai/pipeline/fact-check.ts lib/ai/pipeline/orchestrator.ts
git commit -m "feat(pipeline): add Tavily-powered fact-checking verification step"
```

---

### Task A4: Auto-Refinement Step

**Files:**
- Create: `lib/ai/pipeline/refine.ts`
- Modify: `lib/ai/pipeline/orchestrator.ts`

- [ ] **Step 1: Create the refinement module**

```typescript
// lib/ai/pipeline/refine.ts
import { createOpenAIClient, chatCompletion, DEFAULT_MODEL } from '@/lib/ai/openai-client'
import { ANTI_AI_WRITING_RULES } from '@/lib/ai/anti-ai-rules'
import { PipelineStep, PipelineIssue } from './types'

const REFINE_SYSTEM_PROMPT = `You are a LinkedIn post editor. You will receive a post along with specific issues found during quality checks. Your job is to fix ONLY the identified issues while preserving the post's voice, structure, and intent.

Rules:
1. Fix each identified issue specifically
2. Do NOT rewrite the entire post - make surgical edits
3. Preserve the author's writing style and voice
4. Keep the same length (within 10%)
5. Return ONLY the corrected post text, nothing else

${ANTI_AI_WRITING_RULES}`

export async function refinePost(
  post: string,
  issues: PipelineIssue[],
  contentRules: string[],
  apiKey: string
): Promise<PipelineStep> {
  const startTime = Date.now()

  if (issues.length === 0) {
    return {
      stage: 'refine',
      status: 'passed',
      result: post,
      durationMs: Date.now() - startTime,
      metadata: { reason: 'No issues to fix' },
    }
  }

  try {
    const client = createOpenAIClient({ apiKey })

    const issuesText = issues.map((issue, i) => {
      let text = `${i + 1}. [${issue.type}] ${issue.description}`
      if (issue.suggestion) text += `\n   Suggestion: ${issue.suggestion}`
      return text
    }).join('\n')

    const rulesText = contentRules.length > 0
      ? `\n\nContent Rules to follow:\n${contentRules.map(r => `- ${r}`).join('\n')}`
      : ''

    const response = await chatCompletion(client, {
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: REFINE_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `## Original Post:\n${post}\n\n## Issues Found:\n${issuesText}${rulesText}\n\n## Instructions:\nFix the issues above. Return only the corrected post.`,
        },
      ],
      temperature: 0.3,
    })

    return {
      stage: 'refine',
      status: 'passed',
      result: response.content,
      durationMs: Date.now() - startTime,
      metadata: {
        issuesAddressed: issues.length,
        tokens: response.totalTokens,
      },
    }
  } catch (error) {
    return {
      stage: 'refine',
      status: 'failed',
      result: post,
      durationMs: Date.now() - startTime,
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
    }
  }
}
```

- [ ] **Step 2: Wire into orchestrator**

Replace the `refine` method in `lib/ai/pipeline/orchestrator.ts`:
```typescript
import { refinePost } from './refine'

// Inside PostPipeline class, replace refine method:
async refine(post: string, issues: PipelineIssue[], rules: string[], apiKey: string): Promise<PipelineStep> {
  return refinePost(post, issues, rules, apiKey)
}
```

- [ ] **Step 3: Commit**
```bash
git add lib/ai/pipeline/refine.ts lib/ai/pipeline/orchestrator.ts
git commit -m "feat(pipeline): add auto-refinement step for fixing verified issues"
```

---

### Task A5: Pipeline API Route

**Files:**
- Create: `app/api/ai/pipeline/route.ts`
- Create: `lib/ai/pipeline/index.ts`

- [ ] **Step 1: Create the barrel export**

```typescript
// lib/ai/pipeline/index.ts
export { PostPipeline } from './orchestrator'
export { verifyContentRules } from './verify-rules'
export { factCheckPost } from './fact-check'
export { refinePost } from './refine'
export type { PipelineResult, PipelineStep, PipelineIssue, PipelineConfig, PipelineStage } from './types'
export { DEFAULT_PIPELINE_CONFIG } from './types'
```

- [ ] **Step 2: Create the pipeline API route**

```typescript
// app/api/ai/pipeline/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createClient } from '@/lib/supabase/server'
import { PostPipeline } from '@/lib/ai/pipeline'
import type { PipelineConfig } from '@/lib/ai/pipeline'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { generatedPost, pipelineConfig } = body as {
      generatedPost: string
      pipelineConfig?: Partial<PipelineConfig>
    }

    if (!generatedPost) {
      return NextResponse.json({ error: 'generatedPost is required' }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 })
    }

    // Fetch content rules
    const [personalRulesResult, teamMemberResult] = await Promise.all([
      supabase
        .from('content_rules')
        .select('rule_text')
        .eq('user_id', user.id)
        .is('team_id', null)
        .eq('is_active', true)
        .order('priority', { ascending: false }),
      supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .limit(1),
    ])

    let teamRules: string[] = []
    if (teamMemberResult.data?.[0]?.team_id) {
      const { data } = await supabase
        .from('content_rules')
        .select('rule_text')
        .eq('team_id', teamMemberResult.data[0].team_id)
        .eq('is_active', true)
        .order('priority', { ascending: false })
      teamRules = (data || []).map(r => r.rule_text)
    }

    const personalRules = (personalRulesResult.data || []).map(r => r.rule_text)
    const allRules = [...teamRules, ...personalRules]

    // Run pipeline
    const pipeline = new PostPipeline(pipelineConfig)
    const result = await pipeline.run({
      generatedPost,
      contentRules: allRules,
      userId: user.id,
      apiKey,
    })

    return NextResponse.json(result)
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json(
      { error: 'Pipeline failed' },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 3: Commit**
```bash
git add lib/ai/pipeline/index.ts app/api/ai/pipeline/route.ts
git commit -m "feat(pipeline): add pipeline API route with content rules integration"
```

---

### Task A6: Integrate Pipeline into Generate Route

**Files:**
- Modify: `app/api/ai/generate/route.ts`

- [ ] **Step 1: Add pipeline integration to existing generate route**

After the existing AI generation call, add pipeline processing. The generate route currently returns `{ content, aiMetadata }`. Add an optional `runPipeline` flag:

```typescript
// Add to imports:
import { PostPipeline } from '@/lib/ai/pipeline'
import type { PipelineConfig } from '@/lib/ai/pipeline'

// Add to request body interface:
// runPipeline?: boolean
// pipelineConfig?: Partial<PipelineConfig>

// After the existing chatCompletion call and before returning:
if (body.runPipeline !== false) {
  const pipeline = new PostPipeline(body.pipelineConfig)
  const pipelineResult = await pipeline.run({
    generatedPost: content,
    contentRules: allRules, // already fetched above
    userId: user.id,
    apiKey,
  })
  
  return NextResponse.json({
    content: pipelineResult.finalPost,
    originalContent: pipelineResult.wasRefined ? pipelineResult.originalPost : undefined,
    pipeline: {
      steps: pipelineResult.steps,
      totalDurationMs: pipelineResult.totalDurationMs,
      wasRefined: pipelineResult.wasRefined,
      issues: pipelineResult.issues,
    },
    aiMetadata,
  })
}
```

- [ ] **Step 2: Commit**
```bash
git add app/api/ai/generate/route.ts
git commit -m "feat(pipeline): integrate verification pipeline into generate route"
```

---

### Task A7: Pipeline Status UI Component

**Files:**
- Create: `components/features/compose/pipeline-status.tsx`

- [ ] **Step 1: Create the pipeline status component**

```typescript
// components/features/compose/pipeline-status.tsx
'use client'

import { IconCheck, IconX, IconLoader2, IconAlertTriangle, IconArrowRight } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import type { PipelineStep, PipelineIssue } from '@/lib/ai/pipeline'

interface PipelineStatusProps {
  steps: PipelineStep[]
  issues: PipelineIssue[]
  isRunning: boolean
  totalDurationMs?: number
  wasRefined?: boolean
  className?: string
}

const STAGE_LABELS: Record<string, string> = {
  'generate': 'Generate Post',
  'verify-rules': 'Check Content Rules',
  'fact-check': 'Verify Facts',
  'refine': 'Auto-Refine',
}

function StepIcon({ status }: { status: PipelineStep['status'] }) {
  switch (status) {
    case 'passed':
      return <IconCheck className="h-4 w-4 text-green-500" />
    case 'failed':
      return <IconX className="h-4 w-4 text-red-500" />
    case 'running':
      return <IconLoader2 className="h-4 w-4 text-blue-500 animate-spin" />
    case 'skipped':
      return <IconArrowRight className="h-4 w-4 text-muted-foreground" />
    default:
      return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
  }
}

export function PipelineStatus({ steps, issues, isRunning, totalDurationMs, wasRefined, className }: PipelineStatusProps) {
  if (steps.length === 0 && !isRunning) return null

  const errors = issues.filter(i => i.severity === 'error')
  const warnings = issues.filter(i => i.severity === 'warning')

  return (
    <div className={cn('rounded-lg border bg-card p-4 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Quality Pipeline</h4>
        {totalDurationMs && (
          <span className="text-xs text-muted-foreground">{(totalDurationMs / 1000).toFixed(1)}s</span>
        )}
      </div>

      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <StepIcon status={step.status} />
            <span className={cn(
              step.status === 'skipped' && 'text-muted-foreground',
              step.status === 'failed' && 'text-red-500',
            )}>
              {STAGE_LABELS[step.stage] || step.stage}
            </span>
            {step.durationMs && (
              <span className="text-xs text-muted-foreground ml-auto">{(step.durationMs / 1000).toFixed(1)}s</span>
            )}
          </div>
        ))}
      </div>

      {(errors.length > 0 || warnings.length > 0) && (
        <div className="space-y-1 pt-2 border-t">
          {errors.map((issue, i) => (
            <div key={`e-${i}`} className="flex items-start gap-2 text-xs text-red-500">
              <IconX className="h-3 w-3 mt-0.5 shrink-0" />
              <div>
                <p>{issue.description}</p>
                {issue.suggestion && <p className="text-muted-foreground mt-0.5">Fix: {issue.suggestion}</p>}
              </div>
            </div>
          ))}
          {warnings.map((issue, i) => (
            <div key={`w-${i}`} className="flex items-start gap-2 text-xs text-yellow-600">
              <IconAlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              <p>{issue.description}</p>
            </div>
          ))}
        </div>
      )}

      {wasRefined && (
        <p className="text-xs text-green-600 pt-1">Post was automatically refined to fix issues.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add components/features/compose/pipeline-status.tsx
git commit -m "feat(pipeline): add pipeline status UI component"
```

---

## Workstream B: ChatGPT OAuth Integration

### Task B1: OpenAI OAuth Library

**Files:**
- Create: `lib/auth/openai-oauth.ts`

- [ ] **Step 1: Create the OAuth library (ported from health app, adapted for Supabase)**

```typescript
// lib/auth/openai-oauth.ts
import { createHash, randomBytes } from 'crypto'

export const CODEX_CLIENT_ID = process.env.OPENAI_CLIENT_ID || 'app_EMoamEEZ73f0CkXaXp7hrann'
export const OPENAI_AUTH_URL = 'https://auth.openai.com/oauth/authorize'
export const OPENAI_TOKEN_URL = 'https://auth.openai.com/oauth/token'
export const OPENAI_DEVICE_CODE_URL = 'https://auth.openai.com/api/accounts/deviceauth/usercode'
export const OPENAI_DEVICE_TOKEN_URL = 'https://auth.openai.com/api/accounts/deviceauth/token'
export const OPENAI_DEVICE_VERIFICATION_URL = 'https://auth.openai.com/codex/device'
export const OPENAI_SCOPES = 'openid profile email offline_access'

export interface DeviceCodeResponse {
  deviceAuthId: string
  userCode: string
  verificationUrl: string
  expiresIn: number
  interval: number
}

export interface OAuthTokens {
  accessToken: string
  idToken: string
  refreshToken: string
  expiresIn: number
}

export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(32).toString('base64url')
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
  return { codeVerifier, codeChallenge }
}

export async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const { codeVerifier, codeChallenge } = generatePKCE()

  const response = await fetch(OPENAI_DEVICE_CODE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CODEX_CLIENT_ID,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      scope: OPENAI_SCOPES,
    }),
  })

  if (!response.ok) {
    throw new Error(`Device code request failed: ${response.status}`)
  }

  const data = await response.json()
  return {
    deviceAuthId: data.device_auth_id,
    userCode: data.user_code,
    verificationUrl: OPENAI_DEVICE_VERIFICATION_URL,
    expiresIn: data.expires_in || 600,
    interval: data.interval || 5,
    // Store codeVerifier for later token exchange
    ...({ _codeVerifier: codeVerifier } as Record<string, string>),
  }
}

export async function pollDeviceToken(
  deviceAuthId: string,
  userCode: string
): Promise<{ status: 'pending' | 'expired' | 'authorized'; authorizationCode?: string; codeVerifier?: string }> {
  const response = await fetch(OPENAI_DEVICE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device_auth_id: deviceAuthId,
      user_code: userCode,
    }),
  })

  if (response.status === 403 || response.status === 404) {
    return { status: 'pending' }
  }
  if (response.status === 410) {
    return { status: 'expired' }
  }

  const data = await response.json()
  return {
    status: 'authorized',
    authorizationCode: data.authorization_code,
    codeVerifier: data.code_verifier,
  }
}

export async function exchangeCodeForTokens(
  authorizationCode: string,
  codeVerifier: string
): Promise<OAuthTokens> {
  const response = await fetch(OPENAI_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: CODEX_CLIENT_ID,
      code: authorizationCode,
      code_verifier: codeVerifier,
    }),
  })

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    idToken: data.id_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  }
}

export async function refreshTokens(refreshToken: string): Promise<OAuthTokens> {
  const response = await fetch(OPENAI_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: CODEX_CLIENT_ID,
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    idToken: data.id_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
  }
}

export function parseJWTClaims(token: string): Record<string, unknown> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('Invalid JWT')
  const payload = Buffer.from(parts[1], 'base64url').toString('utf-8')
  return JSON.parse(payload)
}
```

- [ ] **Step 2: Commit**
```bash
git add lib/auth/openai-oauth.ts
git commit -m "feat(oauth): add OpenAI Codex device-code OAuth library"
```

---

### Task B2: Supabase Migration for OAuth Storage

**Files:**
- Create: `supabase/migrations/20260331_openai_oauth.sql`

- [ ] **Step 1: Create migration for OAuth tables**

```sql
-- supabase/migrations/20260331_openai_oauth.sql

-- Store user's OpenAI OAuth credentials
CREATE TABLE IF NOT EXISTS openai_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auth_method TEXT NOT NULL CHECK (auth_method IN ('manual', 'oauth-device')),
  api_key TEXT, -- encrypted at rest by Supabase
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  token_expires_at TIMESTAMPTZ,
  email TEXT,
  account_id TEXT,
  plan_type TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Store active device code sessions (short-lived)
CREATE TABLE IF NOT EXISTS openai_device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_auth_id TEXT NOT NULL,
  user_code TEXT NOT NULL,
  code_verifier TEXT NOT NULL,
  verification_url TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  poll_interval INTEGER DEFAULT 5,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_openai_connection_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER openai_connections_updated_at
  BEFORE UPDATE ON openai_connections
  FOR EACH ROW EXECUTE FUNCTION update_openai_connection_timestamp();

-- RLS policies
ALTER TABLE openai_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE openai_device_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connections" ON openai_connections
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own connections" ON openai_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own connections" ON openai_connections
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own connections" ON openai_connections
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own device sessions" ON openai_device_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Cleanup expired sessions (run via pg_cron)
CREATE OR REPLACE FUNCTION cleanup_expired_device_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM openai_device_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 2: Apply migration via Supabase MCP**

- [ ] **Step 3: Commit**
```bash
git add supabase/migrations/20260331_openai_oauth.sql
git commit -m "feat(oauth): add Supabase migration for OpenAI OAuth storage"
```

---

### Task B3: OAuth API Routes

**Files:**
- Create: `app/api/auth/openai/route.ts`
- Create: `app/api/auth/openai/poll/route.ts`
- Create: `app/api/auth/openai/disconnect/route.ts`
- Create: `app/api/auth/openai/status/route.ts`

- [ ] **Step 1: Create device code initiation route**

```typescript
// app/api/auth/openai/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requestDeviceCode, generatePKCE } from '@/lib/auth/openai-oauth'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  if (body.mode === 'device-code') {
    try {
      const { codeVerifier, codeChallenge } = generatePKCE()

      const response = await fetch('https://auth.openai.com/api/accounts/deviceauth/usercode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.OPENAI_CLIENT_ID || 'app_EMoamEEZ73f0CkXaXp7hrann',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          scope: 'openid profile email offline_access',
        }),
      })

      if (!response.ok) {
        throw new Error(`Device code request failed: ${response.status}`)
      }

      const data = await response.json()

      // Clean up existing session
      await supabase.from('openai_device_sessions').delete().eq('user_id', user.id)

      // Store new session
      await supabase.from('openai_device_sessions').insert({
        user_id: user.id,
        device_auth_id: data.device_auth_id,
        user_code: data.user_code,
        code_verifier: codeVerifier,
        verification_url: 'https://auth.openai.com/codex/device',
        expires_at: new Date(Date.now() + (data.expires_in || 600) * 1000).toISOString(),
        poll_interval: data.interval || 5,
      })

      return NextResponse.json({
        userCode: data.user_code,
        verificationUrl: 'https://auth.openai.com/codex/device',
        expiresIn: data.expires_in || 600,
        interval: data.interval || 5,
      })
    } catch (err) {
      return NextResponse.json({ error: 'Failed to start device code flow' }, { status: 500 })
    }
  }

  if (body.apiKey) {
    // Manual API key mode
    try {
      const validateRes = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${body.apiKey}` },
      })

      if (!validateRes.ok) {
        return NextResponse.json({ error: 'Invalid API key' }, { status: 400 })
      }

      await supabase.from('openai_connections').upsert({
        user_id: user.id,
        auth_method: 'manual',
        api_key: body.apiKey,
        is_active: true,
      }, { onConflict: 'user_id' })

      return NextResponse.json({ success: true, method: 'manual' })
    } catch {
      return NextResponse.json({ error: 'Failed to save API key' }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}
```

- [ ] **Step 2: Create polling route**

```typescript
// app/api/auth/openai/poll/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, parseJWTClaims } from '@/lib/auth/openai-oauth'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: session } = await supabase
    .from('openai_device_sessions')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'No active session' }, { status: 404 })
  }

  if (new Date(session.expires_at) < new Date()) {
    await supabase.from('openai_device_sessions').delete().eq('id', session.id)
    return NextResponse.json({ status: 'expired' })
  }

  // Poll OpenAI
  const pollResponse = await fetch('https://auth.openai.com/api/accounts/deviceauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      device_auth_id: session.device_auth_id,
      user_code: session.user_code,
    }),
  })

  if (pollResponse.status === 403 || pollResponse.status === 404) {
    return NextResponse.json({ status: 'pending' })
  }

  if (pollResponse.status === 410) {
    await supabase.from('openai_device_sessions').delete().eq('id', session.id)
    return NextResponse.json({ status: 'expired' })
  }

  // Authorized - exchange for tokens
  const pollData = await pollResponse.json()
  const tokens = await exchangeCodeForTokens(
    pollData.authorization_code,
    session.code_verifier
  )

  // Parse JWT for user info
  let email = ''
  let accountId = ''
  let planType = ''
  try {
    const claims = parseJWTClaims(tokens.idToken)
    email = (claims.email as string) || ''
    const authClaims = claims['https://api.openai.com/auth'] as Record<string, string> | undefined
    if (authClaims) {
      accountId = authClaims.chatgpt_account_id || ''
      planType = authClaims.chatgpt_plan_type || ''
    }
  } catch { /* JWT parsing is best-effort */ }

  // Store connection
  await supabase.from('openai_connections').upsert({
    user_id: user.id,
    auth_method: 'oauth-device',
    api_key: tokens.accessToken,
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    id_token: tokens.idToken,
    token_expires_at: new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
    email,
    account_id: accountId,
    plan_type: planType,
    is_active: true,
  }, { onConflict: 'user_id' })

  // Clean up device session
  await supabase.from('openai_device_sessions').delete().eq('id', session.id)

  return NextResponse.json({ status: 'authorized', email, planType })
}
```

- [ ] **Step 3: Create status and disconnect routes**

```typescript
// app/api/auth/openai/status/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: connection } = await supabase
    .from('openai_connections')
    .select('auth_method, email, plan_type, is_active, updated_at')
    .eq('user_id', user.id)
    .single()

  if (!connection) {
    return NextResponse.json({ connected: false })
  }

  return NextResponse.json({
    connected: connection.is_active,
    method: connection.auth_method,
    email: connection.email,
    planType: connection.plan_type,
    updatedAt: connection.updated_at,
  })
}

// app/api/auth/openai/disconnect/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await supabase.from('openai_connections').delete().eq('user_id', user.id)
  await supabase.from('openai_device_sessions').delete().eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Commit**
```bash
git add app/api/auth/openai/
git commit -m "feat(oauth): add OpenAI device code flow API routes"
```

---

### Task B4: ChatGPT Connection UI Component

**Files:**
- Create: `components/features/settings/chatgpt-connection.tsx`
- Create: `hooks/use-openai-connection.ts`

- [ ] **Step 1: Create the connection hook**

```typescript
// hooks/use-openai-connection.ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface ConnectionStatus {
  connected: boolean
  method?: string
  email?: string
  planType?: string
  updatedAt?: string
}

export function useOpenAIConnection() {
  const [status, setStatus] = useState<ConnectionStatus>({ connected: false })
  const [isLoading, setIsLoading] = useState(true)
  const [deviceCode, setDeviceCode] = useState<{
    userCode: string
    verificationUrl: string
  } | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/openai/status')
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus({ connected: false })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const startDeviceFlow = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'device-code' }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      setDeviceCode({ userCode: data.userCode, verificationUrl: data.verificationUrl })
      setIsPolling(true)

      // Start polling
      pollingRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch('/api/auth/openai/poll', { method: 'POST' })
          const pollData = await pollRes.json()

          if (pollData.status === 'authorized') {
            clearInterval(pollingRef.current!)
            pollingRef.current = null
            setIsPolling(false)
            setDeviceCode(null)
            await fetchStatus()
          } else if (pollData.status === 'expired') {
            clearInterval(pollingRef.current!)
            pollingRef.current = null
            setIsPolling(false)
            setDeviceCode(null)
          }
        } catch { /* continue polling */ }
      }, (data.interval || 5) * 1000)

      return data
    } catch (err) {
      throw err
    }
  }, [fetchStatus])

  const disconnect = useCallback(async () => {
    await fetch('/api/auth/openai/disconnect', { method: 'POST' })
    setStatus({ connected: false })
  }, [])

  const saveApiKey = useCallback(async (apiKey: string) => {
    const res = await fetch('/api/auth/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    await fetchStatus()
  }, [fetchStatus])

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

  return { status, isLoading, deviceCode, isPolling, startDeviceFlow, disconnect, saveApiKey, refetch: fetchStatus }
}
```

- [ ] **Step 2: Create the connection UI component**

```typescript
// components/features/settings/chatgpt-connection.tsx
'use client'

import { useState } from 'react'
import { IconBrandOpenai, IconCheck, IconCopy, IconExternalLink, IconLoader2, IconUnlink } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useOpenAIConnection } from '@/hooks/use-openai-connection'

export function ChatGPTConnection() {
  const { status, isLoading, deviceCode, isPolling, startDeviceFlow, disconnect, saveApiKey } = useOpenAIConnection()
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleConnect = async () => {
    try {
      await startDeviceFlow()
    } catch {
      toast.error('Failed to start connection flow')
    }
  }

  const handleCopyCode = () => {
    if (deviceCode) {
      navigator.clipboard.writeText(deviceCode.userCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return
    setIsSaving(true)
    try {
      await saveApiKey(apiKey)
      setApiKey('')
      setShowApiKeyInput(false)
      toast.success('API key saved')
    } catch {
      toast.error('Invalid API key')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDisconnect = async () => {
    await disconnect()
    toast.success('ChatGPT disconnected')
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <IconLoader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <IconBrandOpenai className="h-5 w-5" />
          <CardTitle className="text-lg">ChatGPT Connection</CardTitle>
          {status.connected && <Badge variant="secondary" className="text-green-600">Connected</Badge>}
        </div>
        <CardDescription>
          Connect your ChatGPT account to generate posts using your subscription, or enter an API key.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.connected ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{status.email || 'Connected'}</p>
                <p className="text-xs text-muted-foreground">
                  {status.method === 'oauth-device' ? 'OAuth' : 'API Key'} 
                  {status.planType && ` - ${status.planType}`}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleDisconnect}>
                <IconUnlink className="h-4 w-4 mr-1" /> Disconnect
              </Button>
            </div>
          </div>
        ) : deviceCode ? (
          <div className="space-y-3 text-center">
            <p className="text-sm">Enter this code at OpenAI:</p>
            <div className="flex items-center justify-center gap-2">
              <code className="text-2xl font-mono font-bold tracking-widest bg-muted px-4 py-2 rounded-lg">
                {deviceCode.userCode}
              </code>
              <Button variant="ghost" size="icon" onClick={handleCopyCode}>
                {copied ? <IconCheck className="h-4 w-4 text-green-500" /> : <IconCopy className="h-4 w-4" />}
              </Button>
            </div>
            <Button variant="outline" asChild>
              <a href={deviceCode.verificationUrl} target="_blank" rel="noopener noreferrer">
                Open OpenAI <IconExternalLink className="h-4 w-4 ml-1" />
              </a>
            </Button>
            {isPolling && (
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <IconLoader2 className="h-3 w-3 animate-spin" /> Waiting for authorization...
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Button onClick={handleConnect} className="w-full">
              <IconBrandOpenai className="h-4 w-4 mr-2" /> Connect ChatGPT Account
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>
            {showApiKeyInput ? (
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveApiKey()}
                />
                <Button onClick={handleSaveApiKey} disabled={isSaving}>
                  {isSaving ? <IconLoader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="w-full" onClick={() => setShowApiKeyInput(true)}>
                Enter API Key Manually
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Commit**
```bash
git add hooks/use-openai-connection.ts components/features/settings/chatgpt-connection.tsx
git commit -m "feat(oauth): add ChatGPT connection UI and hook"
```

---

## Workstream C: Supabase Real-Time Integration

### Task C1: Create Shared Real-Time Utility

**Files:**
- Create: `lib/supabase/realtime.ts`

- [ ] **Step 1: Create reusable real-time subscription utility**

```typescript
// lib/supabase/realtime.ts
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type TableName = keyof Database['public']['Tables']

interface SubscriptionConfig {
  table: TableName
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  filter?: string
}

/**
 * Creates a Supabase real-time channel with multiple table subscriptions.
 * Returns the channel for cleanup via supabase.removeChannel(channel).
 */
export function subscribeToTables(
  supabase: SupabaseClient<Database>,
  channelName: string,
  configs: SubscriptionConfig[],
  onData: () => void
): RealtimeChannel {
  let channel = supabase.channel(channelName)

  for (const config of configs) {
    channel = channel.on(
      'postgres_changes',
      {
        event: config.event || '*',
        schema: 'public',
        table: config.table as string,
        ...(config.filter ? { filter: config.filter } : {}),
      },
      onData
    )
  }

  channel.subscribe()
  return channel
}
```

- [ ] **Step 2: Commit**
```bash
git add lib/supabase/realtime.ts
git commit -m "feat(realtime): add shared real-time subscription utility"
```

---

### Task C2: Replace Polling in use-generated-suggestions

**Files:**
- Modify: `hooks/use-generated-suggestions.ts`

- [ ] **Step 1: Replace setInterval polling with Supabase real-time**

Add Supabase real-time subscription for `suggestion_generation_runs` table changes. Replace the `setInterval`/`clearInterval` polling pattern with a channel subscription that triggers on status changes. Keep the existing `pollGenerationStatus` function but trigger it from real-time events instead of an interval.

- [ ] **Step 2: Commit**
```bash
git add hooks/use-generated-suggestions.ts
git commit -m "feat(realtime): replace polling with Supabase realtime in suggestions hook"
```

---

### Task C3: Replace Polling in use-research

**Files:**
- Modify: `hooks/use-research.ts`

- [ ] **Step 1: Replace setInterval polling with Supabase real-time**

Same pattern as C2 - subscribe to `research_sessions` table for the active session ID, trigger status check on real-time event instead of polling every 2s.

- [ ] **Step 2: Commit**
```bash
git add hooks/use-research.ts
git commit -m "feat(realtime): replace polling with Supabase realtime in research hook"
```

---

### Task C4: Replace Polling in use-team-invitations

**Files:**
- Modify: `hooks/use-team-invitations.ts`

- [ ] **Step 1: Replace 30s polling and focus listener with real-time**

Subscribe to `team_invitations` table filtered by team_id. Remove `setInterval` and `window.addEventListener('focus')` patterns. Trigger `fetchInvitations()` from real-time events.

- [ ] **Step 2: Commit**
```bash
git add hooks/use-team-invitations.ts
git commit -m "feat(realtime): replace polling with Supabase realtime in team invitations"
```

---

### Task C5: Replace Polling in use-join-requests

**Files:**
- Modify: `hooks/use-join-requests.ts`

- [ ] **Step 1: Add real-time subscription for join requests**

Subscribe to `team_join_requests` table. Trigger `fetchRequests()` on any change.

- [ ] **Step 2: Commit**
```bash
git add hooks/use-join-requests.ts
git commit -m "feat(realtime): add Supabase realtime to join requests hook"
```

---

### Task C6: Add Real-Time to Team Activity Feed

**Files:**
- Modify: `app/dashboard/team/activity/page.tsx`

- [ ] **Step 1: Add real-time subscription for team posts**

In the `useAllTeamPosts` hook (defined inline in the page), add a Supabase channel subscription on `my_posts` table. When a new post is inserted by any team member, trigger `refetch()`.

- [ ] **Step 2: Commit**
```bash
git add app/dashboard/team/activity/page.tsx
git commit -m "feat(realtime): add live updates to team activity feed"
```

---

### Task C7: Add Real-Time to Drafts

**Files:**
- Modify: `hooks/use-drafts.ts`

- [ ] **Step 1: Add real-time subscription for drafts**

Subscribe to `generated_posts` table (filter: `user_id=eq.{userId}`) and `scheduled_posts` table. Trigger `fetchDrafts()` on changes.

- [ ] **Step 2: Commit**
```bash
git add hooks/use-drafts.ts
git commit -m "feat(realtime): add live updates to drafts hook"
```

---

### Task C8: Add Real-Time to Team Management

**Files:**
- Modify: `hooks/use-team.ts`

- [ ] **Step 1: Add real-time subscriptions for team data**

Subscribe to `team_members` and `profiles` tables filtered by team. Trigger `fetchMembers()` on changes so team roster stays current.

- [ ] **Step 2: Commit**
```bash
git add hooks/use-team.ts
git commit -m "feat(realtime): add live updates to team management hook"
```

---

## Final: Environment Variables

Add to `.env.local`:
```
# Tavily (fact-checking)
TAVILY_API_KEY=tvly-...

# OpenAI OAuth (optional - has default)
OPENAI_CLIENT_ID=app_EMoamEEZ73f0CkXaXp7hrann
```
