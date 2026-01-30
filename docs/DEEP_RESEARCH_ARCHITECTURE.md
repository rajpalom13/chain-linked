# Deep Research Architecture

## Overview

The Deep Research system is an event-driven, durable workflow that automatically discovers, enriches, and transforms industry content into LinkedIn-ready posts. It orchestrates three AI services (Tavily, Perplexity, OpenAI) through Inngest to create a robust content discovery pipeline.

## Goals

1. **Automated Content Discovery**: Continuously find relevant industry content based on user-defined topics
2. **Multi-Source Enrichment**: Combine web search, deep research, and AI analysis for comprehensive insights
3. **Post Generation**: Transform raw research into engaging LinkedIn post drafts
4. **Fault Tolerance**: Handle API failures gracefully with automatic retries and fallbacks
5. **Scalability**: Process multiple topics/users concurrently without blocking

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TRIGGER LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Manual    │  │  Scheduled  │  │   Webhook   │  │  Real-time  │        │
│  │   Trigger   │  │    Cron     │  │   Trigger   │  │  Subscribe  │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │                │
│         └────────────────┴────────────────┴────────────────┘                │
│                                    │                                        │
│                                    ▼                                        │
│                        ┌──────────────────────┐                            │
│                        │  discover/research   │  ← Inngest Event           │
│                        │       Event          │                            │
│                        └──────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INNGEST WORKFLOW LAYER                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    deepResearchWorkflow                              │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ STEP 1: Initialize Research Session                         │   │   │
│  │  │ • Create research_sessions record                           │   │   │
│  │  │ • Set status to 'processing'                                │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                              │                                      │   │
│  │                              ▼                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ STEP 2: Tavily Web Search (Parallel per topic)              │   │   │
│  │  │ • Search web for each topic                                 │   │   │
│  │  │ • Extract URLs, titles, snippets                            │   │   │
│  │  │ • Score relevance                                           │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                              │                                      │   │
│  │                              ▼                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ STEP 3: Perplexity Deep Research (Parallel per result)      │   │   │
│  │  │ • Enrich top results with deeper context                    │   │   │
│  │  │ • Extract key insights and trends                           │   │   │
│  │  │ • Identify expert opinions                                  │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                              │                                      │   │
│  │                              ▼                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ STEP 4: OpenAI Content Generation (Batch)                   │   │   │
│  │  │ • Transform research into LinkedIn posts                    │   │   │
│  │  │ • Generate multiple post variations                         │   │   │
│  │  │ • Add engagement hooks and CTAs                             │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                              │                                      │   │
│  │                              ▼                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │ STEP 5: Save to Database                                    │   │   │
│  │  │ • Insert into discover_posts                                │   │   │
│  │  │ • Update research_sessions                                  │   │   │
│  │  │ • Emit completion event                                     │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            AI SERVICE LAYER                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │      TAVILY      │  │    PERPLEXITY    │  │     OPENAI       │         │
│  │                  │  │                  │  │   (via Router)   │         │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤         │
│  │ • Web Search     │  │ • Deep Research  │  │ • Post Generate  │         │
│  │ • URL Discovery  │  │ • Trend Analysis │  │ • Hook Creation  │         │
│  │ • Snippet Extract│  │ • Expert Insights│  │ • CTA Addition   │         │
│  │ • Relevance Score│  │ • Citation Track │  │ • Tone Matching  │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATA LAYER (Supabase)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐         │
│  │ research_sessions│  │  discover_posts  │  │ generated_posts  │         │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤         │
│  │ • Session ID     │  │ • Post ID        │  │ • Post ID        │         │
│  │ • User ID        │  │ • Content        │  │ • Original ID    │         │
│  │ • Topics         │  │ • Author Info    │  │ • Generated Text │         │
│  │ • Status         │  │ • Engagement     │  │ • Post Type      │         │
│  │ • Results Count  │  │ • Topics         │  │ • Status         │         │
│  │ • Error Info     │  │ • Source         │  │ • Created At     │         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Event Definitions

### Trigger Events

```typescript
// Main research trigger
'discover/research': {
  data: {
    userId: string              // User requesting research
    sessionId: string           // Unique session identifier
    topics: string[]            // Topics to research (max 5)
    depth: 'basic' | 'deep'     // Research depth
    maxResultsPerTopic: number  // Max results per topic (default: 5)
    generatePosts: boolean      // Whether to generate posts
    postTypes?: string[]        // Types of posts to generate
  }
}

// Scheduled research (cron-triggered)
'discover/research.scheduled': {
  data: {
    scheduleId: string          // Schedule configuration ID
    userId: string              // User ID for the schedule
  }
}
```

### Completion Events

```typescript
// Research completed successfully
'discover/research.completed': {
  data: {
    userId: string
    sessionId: string
    postsCreated: number
    postsGenerated: number
    topics: string[]
    duration: number            // Duration in milliseconds
  }
}

// Research failed
'discover/research.failed': {
  data: {
    userId: string
    sessionId: string
    error: string
    step: string                // Which step failed
  }
}
```

---

## Workflow Steps Detail

### Step 1: Initialize Research Session

**Purpose**: Create tracking record and validate inputs

```typescript
await step.run('initialize-session', async () => {
  // 1. Validate topics (min 1, max 5)
  // 2. Create research_sessions record
  // 3. Set status to 'initializing'
  // 4. Return session context
})
```

**Database State**:
```sql
INSERT INTO research_sessions (
  id, user_id, topics, status, started_at
) VALUES (
  $sessionId, $userId, $topics, 'initializing', NOW()
)
```

### Step 2: Tavily Web Search (Parallel)

**Purpose**: Discover relevant web content across all topics

```typescript
const searchResults = await step.run('tavily-search', async () => {
  // Execute searches in parallel for each topic
  const results = await Promise.all(
    topics.map(topic => tavilySearch(topic, {
      maxResults: maxResultsPerTopic,
      searchDepth: depth === 'deep' ? 'advanced' : 'basic',
      includeAnswer: true,
    }))
  )
  return results.flat()
})
```

**Tavily Configuration**:
- `search_depth`: 'basic' (faster) or 'advanced' (comprehensive)
- `max_results`: 5-10 per topic
- `include_answer`: true (for AI summary)
- `topic`: 'general' or 'news'

### Step 3: Perplexity Deep Research (Parallel)

**Purpose**: Enrich top results with deeper context and insights

```typescript
const enrichedResults = await step.run('perplexity-enrich', async () => {
  // Take top N results based on relevance score
  const topResults = searchResults
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  // Enrich each result in parallel
  const enriched = await Promise.all(
    topResults.map(result => perplexityResearch({
      query: `Provide deep insights about: ${result.title}`,
      context: result.content,
      recencyFilter: 'month',
    }))
  )
  return enriched
})
```

**Perplexity Configuration**:
- `model`: 'sonar' (or 'sonar-pro' for advanced research)
- `search_recency_filter`: 'month' | 'week'
- `max_tokens`: 1024
- `temperature`: 0.3

### Step 4: OpenAI Content Generation

**Purpose**: Transform research into LinkedIn-ready posts

```typescript
const generatedPosts = await step.run('generate-posts', async () => {
  const posts = []

  for (const result of enrichedResults) {
    // Generate multiple post variations
    const variations = await Promise.all([
      generatePost(result, 'thought-leadership'),
      generatePost(result, 'storytelling'),
      generatePost(result, 'educational'),
    ])
    posts.push(...variations)
  }

  return posts
})
```

**Post Types**:
| Type | Description | Hook Style |
|------|-------------|------------|
| `thought-leadership` | Industry insights and opinions | Bold statement or question |
| `storytelling` | Narrative-driven content | Personal anecdote opener |
| `educational` | How-to and tips | "X things you need to know" |
| `contrarian` | Challenge common beliefs | "Unpopular opinion:" |
| `data-driven` | Statistics and research | "Did you know X% of..." |

### Step 5: Save Results

**Purpose**: Persist all data and emit completion event

```typescript
await step.run('save-results', async () => {
  // 1. Insert discover_posts (raw research)
  await supabase.from('discover_posts').insert(
    enrichedResults.map(r => ({
      linkedin_url: r.url,
      author_name: r.source,
      content: r.content,
      topics: r.topics,
      source: 'research',
      is_viral: false,
    }))
  )

  // 2. Insert generated_posts (AI posts)
  await supabase.from('generated_posts').insert(
    generatedPosts.map(p => ({
      discover_post_id: p.sourceId,
      content: p.content,
      post_type: p.type,
      status: 'draft',
    }))
  )

  // 3. Update session status
  await supabase.from('research_sessions').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    posts_discovered: enrichedResults.length,
    posts_generated: generatedPosts.length,
  }).eq('id', sessionId)
})

// Emit completion event
await step.sendEvent('research-completed', {
  name: 'discover/research.completed',
  data: { userId, sessionId, postsCreated, postsGenerated }
})
```

---

## Error Handling Strategy

### Retry Configuration

```typescript
export const deepResearchWorkflow = inngest.createFunction(
  {
    id: 'deep-research',
    name: 'Deep Research Workflow',
    retries: 3,
    onFailure: async ({ error, event, step }) => {
      // Log failure and update session status
      await step.run('handle-failure', async () => {
        await supabase.from('research_sessions').update({
          status: 'failed',
          error_message: error.message,
          failed_step: step?.name,
        }).eq('id', event.data.sessionId)
      })

      // Emit failure event
      await step.sendEvent('research-failed', {
        name: 'discover/research.failed',
        data: {
          userId: event.data.userId,
          sessionId: event.data.sessionId,
          error: error.message,
          step: step?.name,
        }
      })
    },
  },
  { event: 'discover/research' },
  handler
)
```

### Fallback Strategies

| Service | Primary | Fallback | Behavior |
|---------|---------|----------|----------|
| Tavily | Tavily API | Cached results | Use recent cached results for same topic |
| Perplexity | Perplexity API | OpenAI | Use GPT-4 with web browsing prompt |
| OpenAI | OpenRouter | Direct OpenAI | Fall back to direct API if router fails |

### Rate Limiting

```typescript
const rateLimits = {
  tavily: { requests: 100, window: '1m' },
  perplexity: { requests: 50, window: '1m' },
  openai: { requests: 60, window: '1m' },
}

// Implemented via step.sleep() for backoff
if (isRateLimited) {
  await step.sleep('rate-limit-backoff', '30s')
}
```

---

## Database Schema

### research_sessions

```sql
CREATE TABLE research_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  topics TEXT[] NOT NULL,
  depth TEXT NOT NULL DEFAULT 'basic',
  status TEXT NOT NULL DEFAULT 'pending',
  -- Status: pending, initializing, searching, enriching, generating, saving, completed, failed

  -- Results
  posts_discovered INTEGER DEFAULT 0,
  posts_generated INTEGER DEFAULT 0,

  -- Error tracking
  error_message TEXT,
  failed_step TEXT,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Inngest tracking
  inngest_run_id TEXT
);

-- Indexes
CREATE INDEX idx_research_sessions_user ON research_sessions(user_id);
CREATE INDEX idx_research_sessions_status ON research_sessions(status);
CREATE INDEX idx_research_sessions_created ON research_sessions(created_at DESC);
```

### generated_posts (New Table)

```sql
CREATE TABLE generated_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  discover_post_id UUID REFERENCES discover_posts(id),
  research_session_id UUID REFERENCES research_sessions(id),

  -- Content
  content TEXT NOT NULL,
  post_type TEXT NOT NULL, -- thought-leadership, storytelling, educational, etc.
  hook TEXT, -- Opening line
  cta TEXT, -- Call to action

  -- Metadata
  word_count INTEGER,
  estimated_read_time INTEGER, -- seconds

  -- Status
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, posted, archived

  -- Source tracking
  source_url TEXT,
  source_title TEXT,
  source_snippet TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_generated_posts_user ON generated_posts(user_id);
CREATE INDEX idx_generated_posts_session ON generated_posts(research_session_id);
CREATE INDEX idx_generated_posts_status ON generated_posts(status);
CREATE INDEX idx_generated_posts_type ON generated_posts(post_type);
```

---

## API Endpoints

### POST /api/research/start

Triggers a new deep research session.

**Request**:
```typescript
{
  topics: string[]           // Required: 1-5 topics
  depth?: 'basic' | 'deep'   // Default: 'basic'
  maxResultsPerTopic?: number // Default: 5, max: 10
  generatePosts?: boolean    // Default: true
  postTypes?: string[]       // Default: all types
}
```

**Response**:
```typescript
{
  sessionId: string
  status: 'started'
  message: 'Research workflow started'
  estimatedDuration: number // seconds
}
```

### GET /api/research/status/:sessionId

Check research session status.

**Response**:
```typescript
{
  sessionId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: {
    step: string
    percentage: number
  }
  results?: {
    postsDiscovered: number
    postsGenerated: number
  }
  error?: string
}
```

### GET /api/research/sessions

List user's research sessions.

**Query Parameters**:
- `status`: Filter by status
- `limit`: Max results (default: 10)
- `offset`: Pagination offset

---

## Scheduled Research (Cron)

### Configuration

Users can configure automatic research schedules:

```typescript
// Schedule options
type ResearchSchedule = {
  frequency: 'daily' | 'weekly' | 'biweekly'
  time: string // HH:mm UTC
  dayOfWeek?: number // 0-6 for weekly
  topics: string[]
  depth: 'basic' | 'deep'
  enabled: boolean
}
```

### Inngest Cron Function

```typescript
export const scheduledResearch = inngest.createFunction(
  {
    id: 'scheduled-research',
    name: 'Scheduled Research',
  },
  { cron: '0 6 * * *' }, // Daily at 6 AM UTC
  async ({ step }) => {
    // 1. Fetch all active schedules
    const schedules = await step.run('fetch-schedules', async () => {
      return await supabase
        .from('research_schedules')
        .select('*')
        .eq('enabled', true)
        .eq('frequency', 'daily')
    })

    // 2. Trigger research for each schedule
    for (const schedule of schedules) {
      await step.sendEvent(`trigger-${schedule.id}`, {
        name: 'discover/research',
        data: {
          userId: schedule.user_id,
          sessionId: crypto.randomUUID(),
          topics: schedule.topics,
          depth: schedule.depth,
          generatePosts: true,
        }
      })
    }
  }
)
```

---

## Performance Considerations

### Parallel Processing

- Topics searched in parallel (max 5 concurrent)
- Results enriched in parallel (max 10 concurrent)
- Post generation batched (max 20 per batch)

### Caching Strategy

```typescript
// Cache Tavily results for 1 hour
const cacheKey = `tavily:${topic}:${depth}`
const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)

const result = await tavilySearch(topic)
await redis.setex(cacheKey, 3600, JSON.stringify(result))
```

### Token Optimization

| Service | Avg Tokens/Request | Cost Estimate |
|---------|-------------------|---------------|
| Tavily | N/A (per search) | $0.01/search |
| Perplexity | ~2000 | ~$0.002/request |
| OpenAI GPT-4 | ~1500 | ~$0.045/request |

---

## Future Enhancements

1. **AgentKit Integration**: Replace sequential steps with multi-agent network for smarter routing
2. **Real-time Updates**: WebSocket notifications for research progress
3. **Content Quality Scoring**: AI-powered scoring of generated posts
4. **A/B Testing**: Generate multiple variations and track performance
5. **User Feedback Loop**: Learn from user edits to improve generation
6. **Multi-language Support**: Research and generate in multiple languages
7. **Competitor Monitoring**: Track specific competitors' content

---

## Monitoring & Observability

### Inngest Dashboard Metrics

- Function invocations per hour
- Success/failure rates
- Average duration per step
- Retry frequency

### Custom Metrics (PostHog)

```typescript
posthog.capture('research_completed', {
  sessionId,
  topics,
  duration,
  postsDiscovered,
  postsGenerated,
})
```

### Alerts

- Failure rate > 10% in 1 hour
- Average duration > 5 minutes
- API quota warnings (80% threshold)
