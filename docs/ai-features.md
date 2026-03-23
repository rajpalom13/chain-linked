# ChainLinked AI Features

Comprehensive documentation of ChainLinked's AI-powered content creation system. All AI features are built on top of OpenAI models accessed through OpenRouter, with a unified prompt management system, user context personalization, and content rules enforcement.

---

## Table of Contents

1. [AI Overview](#ai-overview)
2. [Post Generation](#post-generation)
3. [Compose Chat (Advanced Mode)](#compose-chat-advanced-mode)
4. [Compose Series](#compose-series)
5. [Edit with AI](#edit-with-ai)
6. [Post Remix](#post-remix)
7. [Carousel Generation](#carousel-generation)
8. [Carousel Caption](#carousel-caption)
9. [Company Analysis](#company-analysis)
10. [Prompt Playground](#prompt-playground)
11. [AI Context System](#ai-context-system)
12. [Streaming](#streaming)
13. [Models and Configuration](#models-and-configuration)
14. [Content Rules Integration](#content-rules-integration)
15. [Anti-AI Writing Rules](#anti-ai-writing-rules)
16. [Prompt Management System](#prompt-management-system)

---

## AI Overview

ChainLinked integrates AI across the entire content creation workflow: from generating new posts, to remixing existing ones, to creating carousel slide content, to analyzing companies for onboarding context. The system is designed to produce LinkedIn-optimized content that sounds authentically human rather than AI-generated.

### Architecture

All AI features follow a consistent pattern:

1. **Authentication** -- Every API route requires a valid Supabase session.
2. **User context fetching** -- The system pulls the user's LinkedIn profile, company context, recent posts, top-performing posts, and saved ideas from Supabase to personalize AI output.
3. **Prompt assembly** -- A system prompt is built from the centralized prompt service (`lib/prompts/`), augmented with user context, content rules, and anti-AI writing guidelines.
4. **AI call** -- The prompt is sent to an OpenAI model via OpenRouter.
5. **Usage logging** -- Token usage, response time, and metadata are logged to the `PromptService` for analytics.
6. **Response** -- The generated content is returned to the frontend.

### Key Directories

| Path | Purpose |
|------|---------|
| `app/api/ai/` | All AI API route handlers |
| `lib/ai/` | Prompt templates, OpenAI client, anti-AI rules, style analyzer, carousel prompts |
| `lib/prompts/` | Centralized prompt management service, types, defaults, caching |
| `components/features/` | Frontend AI dialogs, panels, and editors |
| `hooks/` | Custom hooks for AI features (e.g., `use-remix`, `use-prompt-analytics`) |

---

## Post Generation

**Endpoint:** `POST /api/ai/generate`
**Source:** `app/api/ai/generate/route.ts`
**Frontend:** `components/features/ai-generation-dialog.tsx`, `components/features/ai-inline-panel.tsx`

Generates a complete LinkedIn post from a topic description. This is the primary content creation entry point.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `topic` | `string` | Yes | Main topic or idea for the post |
| `tone` | `string` | No | One of: `match-my-style`, `professional`, `casual`, `inspiring`, `educational`, `thought-provoking`. Default: `professional` |
| `length` | `string` | No | One of: `short` (400-700 chars), `medium` (1200-1800 chars), `long` (2200-2900 chars). Default: `medium` |
| `context` | `string` | No | Additional instructions or requirements. Placed at highest-weight position in the prompt. |
| `postType` | `string` | No | Post type ID (e.g., `story`, `listicle`, `how-to`, `contrarian`, `case-study`, `reflection`, `data-driven`, `question`, `carousel`) for type-specific prompt templates |

### Post Type Templates

When a `postType` is provided, the system loads a specialized prompt template from `lib/ai/prompt-templates.ts` that defines the role, structure, hook patterns, and style rules for that specific format. Available types:

- **story** -- Personal narrative with vivid moments, tension, and a universal lesson
- **listicle** -- Numbered items with bold titles and scannable format (odd numbers preferred)
- **how-to** -- Step-by-step actionable guide with action verbs
- **contrarian** -- Challenges conventional wisdom with evidence-based arguments
- **case-study** -- Results-focused with before/after metrics and timeline
- **reflection** -- Introspective observation connecting personal growth to professional themes
- **data-driven** -- Leads with statistics and translates data into actionable insights
- **question** -- Community engagement through open-ended questions
- **carousel** -- Outlines carousel posts with slide-by-slide structure

### Prompt Assembly Flow

1. If `postType` is set, the system maps it to a `PromptType` enum and fetches the prompt from `PromptService.getPromptWithFallback()`. If the type is unknown, it falls back to the legacy template from `getSystemPromptForType()`.
2. If no `postType` is set, a generic system prompt is built using `buildSystemPrompt()` with user context (name, headline, industry, recent topics, top posts, recent post text, saved ideas).
3. Content rules from the `content_rules` table (both personal and team-level) are injected.
4. If additional `context` is provided, it is appended at the end of the system prompt with explicit override instructions.
5. The user message is built with the topic, length requirements, and any user context.

### "Match My Style" Tone

When the tone is `match-my-style`, the system:
- Fetches up to 15 recent posts (instead of 10) and 10 wishlist items
- Includes longer excerpts (400 chars instead of 200) for style analysis
- Adds explicit instructions to replicate the user's exact voice, sentence structures, vocabulary, and formatting habits

### Response

```json
{
  "content": "The generated LinkedIn post...",
  "metadata": {
    "model": "openai/gpt-4.1",
    "tokensUsed": 847,
    "tone": "professional",
    "length": "medium",
    "postType": "story",
    "promptSource": "database",
    "userContext": {
      "hasProfile": true,
      "hasRecentPosts": true
    }
  }
}
```

### Frontend Components

**AIGenerationDialog** (`components/features/ai-generation-dialog.tsx`) -- Modal dialog with post type selector, topic textarea, tone dropdown, length cards (short/medium/long), and additional context field.

**AIInlinePanel** (`components/features/ai-inline-panel.tsx`) -- Collapsible inline panel that replaces the modal in the compose section. Shows a dashed-border "Generate with AI" trigger button that expands to reveal the same fields. Supports `persistFields`, `initialTopic/Tone/Length/Context` props for pre-filling from templates, and a `systemContext` prop for hidden context. Exposes generation context via the `onGenerationContext` callback.

---

## Compose Chat (Advanced Mode)

**Endpoint:** `POST /api/ai/compose-chat`
**Source:** `app/api/ai/compose-chat/route.ts`
**Frontend:** `components/features/compose/compose-advanced-mode.tsx`

A multi-turn streaming chat interface for iterative post creation. The AI asks contextual clarifying questions through MCQ tool calls before generating the final post.

### How It Works

1. The user enters the chat and provides a topic.
2. The AI uses the `presentOptions` tool to present multiple-choice questions for clarification (e.g., target audience, angle, format).
3. The user selects an option or types a custom answer.
4. After 2-3 rounds of clarification, the AI calls the `generatePost` tool with the final post content.
5. The user can accept the post, try again, or continue iterating with follow-up messages.

### Tools

| Tool | Schema | Purpose |
|------|--------|---------|
| `presentOptions` | `{ question: string, options: [{ id, label, description? }] }` | Present MCQ options with a "Type your own" option |
| `generatePost` | `{ post: string, summary: string }` | Generate the final LinkedIn post content |

### Streaming

Uses the Vercel AI SDK (`@ai-sdk/react`) with `useChat` hook and `DefaultChatTransport` pointing to `/api/ai/compose-chat`. The backend uses `streamText()` from the `ai` package, returning `result.toUIMessageStreamResponse()`.

### Conversation Persistence

- Messages are persisted through the `onMessagesChange` callback
- Supports restoring from `persistedMessages` on page load
- Detects "New Chat" resets via `conversationId` transitions
- Maximum 8 tool call steps per conversation (`stopWhen: stepCountIs(8)`)

### Rich User Context

The compose chat fetches the most comprehensive user context of all AI features:
- LinkedIn profile (name, headline, industry, summary)
- User profile with company onboarding data (company_name, company_description, company_products, company_icp, company_value_props)
- Detailed company context from `company_context` table (company_name, company_summary, industry, value_proposition, products_and_services, target_audience, tone_of_voice)
- Recent posts (up to 20 for match-my-style, 10 otherwise)
- Top 5 posts by impressions

---

## Compose Series

**Endpoint:** `POST /api/ai/compose-series`
**Source:** `app/api/ai/compose-series/route.ts`
**Frontend:** `components/features/compose/compose-series-mode.tsx`

Generates a series of 2-5 related LinkedIn posts around a central theme. Uses the same conversational MCQ pattern as Compose Chat but with a `generateSeries` tool instead of `generatePost`.

### Tools

| Tool | Schema | Purpose |
|------|--------|---------|
| `presentOptions` | Same as Compose Chat | Present MCQ options for clarification |
| `generateSeries` | `{ posts: [{ post, subtopic, summary }], seriesTheme: string }` | Generate 2-5 related posts |

### Frontend

The `ComposeSeriesMode` component renders a `SeriesPreviewSlider` for navigating between generated posts with prev/next buttons and dot indicators. Users can accept all posts or regenerate.

### Configuration

- Uses `buildSeriesConversationPrompt()` from `lib/ai/series-system-prompt.ts`
- Maximum output tokens: 4000 (vs 2000 for single posts)
- Maximum 10 tool call steps (`stopWhen: stepCountIs(10)`)

---

## Edit with AI

**Endpoint:** `POST /api/ai/edit-selection`
**Source:** `app/api/ai/edit-selection/route.ts`
**Frontend:** `components/features/compose/edit-with-ai-popup.tsx`, `components/features/compose/inline-diff-view.tsx`

Allows users to select text within a post and edit it with AI-powered suggestions. Provides a Copilot-style inline diff experience.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `selectedText` | `string` | Yes | The text the user has selected |
| `instruction` | `string` | Yes | How the AI should edit the selection |
| `fullPostContent` | `string` | Yes | The complete post content for context |

### System Prompt Rules

- Returns ONLY the edited replacement text
- Preserves all leading/trailing whitespace and newlines
- Maintains formatting style unless instruction says otherwise
- Can expand or shorten text based on the instruction
- Keeps tone consistent with the rest of the post
- Includes condensed anti-AI writing constraints (`ANTI_AI_PROMPT_CONSTRAINTS`)

### Response

```json
{
  "editedText": "The edited replacement text..."
}
```

### Frontend UX

**EditWithAIPopup** -- A floating popup that appears near selected text. Initially shows a compact "Edit with AI" pill button. On click, expands to a 320px-wide input form with a text field and send button. Supports keyboard navigation (Escape to close).

**InlineDiffView** -- Renders the full post content with an inline diff showing the AI suggestion:
- Original text shown with red strikethrough (`bg-red-500/15`)
- AI suggestion shown with green highlight (`bg-green-500/15`)
- Accept/Reject buttons with animated entrance
- Slices the content at `selectionStart`/`selectionEnd` positions

### Configuration

- Model: `openai/gpt-4.1` via OpenRouter (`@ai-sdk/openai-compatible`)
- Uses `generateText()` from the `ai` package (non-streaming)
- Temperature: 0.7
- Max output tokens: 1000

---

## Post Remix

**Endpoint:** `POST /api/ai/remix`
**Source:** `app/api/ai/remix/route.ts`
**Frontend:** `components/features/remix-modal.tsx`, `components/features/remix-dialog.tsx`

Takes an existing LinkedIn post and transforms it into the user's own voice with a different style or tone. The most context-rich AI feature, performing deep writing style analysis.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `originalContent` | `string` | Yes | The post to remix (minimum 20 characters) |
| `tone` | `string` | No | Tone for the remix. Default: `match-my-style` |
| `length` | `string` | No | Target length: `short`, `medium`, `long`. Default: `medium` |
| `customInstructions` | `string` | No | Additional remix instructions |

### Writing Style Analysis

For `match-my-style` tone, the system performs deep analysis of the user's last 20 posts:

- **Average post length** in characters
- **Emoji usage** detection
- **Hashtag patterns**
- **Bullet point usage**
- **Average sentence length** in words
- **Common phrases** via trigram frequency analysis
- **Top performing posts** ranked by weighted engagement (reactions + comments*3 + reposts*5)
- **Content niches** extracted from `user_niches` table or hashtag analysis

This analysis is injected into the system prompt as a "Writing Style Analysis" section.

### Prompt Assembly

1. Maps tone to `PromptType` via `mapToneToPromptType()` (e.g., `match-my-style` -> `PromptType.REMIX_MATCH_STYLE`)
2. Fetches base prompt from `PromptService.getPromptWithFallback()`
3. Builds full system prompt via `buildRemixSystemPrompt()` which adds:
   - User profile section (name, headline, industry)
   - Writing style analysis section (for match-my-style)
   - Top performing posts for reference
   - Content niches/topics
   - Length requirements
   - Remix rules (never copy, add perspective, maintain value, optimize hooks, etc.)
4. Injects content rules (personal + team)

### Response

```json
{
  "content": "The remixed post...",
  "originalContent": "The original post...",
  "metadata": {
    "model": "openai/gpt-4.1",
    "tokensUsed": 1023,
    "tone": "match-my-style",
    "length": "medium",
    "promptSource": "service",
    "userContext": {
      "hasProfile": true,
      "postsAnalyzed": 20,
      "nichesDetected": 5,
      "styleMatched": true
    }
  }
}
```

### Frontend Components

**RemixModal** (`components/features/remix-modal.tsx`) -- Full-featured remix dialog with original post preview, tone selection (with icons), custom instructions, editable result textarea, copy/regenerate/use-this actions, and token usage display. Uses the `useRemix` hook.

**RemixDialog** (`components/features/remix-dialog.tsx`) -- Lighter remix dialog with tone selector, length selection (short/medium/long cards), and custom instructions. On success, auto-redirects to the Composer via `onRemixed` callback with `RemixSettings`.

---

## Carousel Generation

**Endpoint:** `POST /api/ai/carousel/generate`
**Source:** `app/api/ai/carousel/generate/route.ts`
**Frontend:** `components/features/canvas-editor/ai-content-generator.tsx`, `components/features/canvas-editor/ai-carousel-generator.tsx`, `components/features/canvas-editor/enhanced-ai-carousel-generator.tsx`

Generates AI content for carousel slides based on a template's structure. Template-aware: analyzes the template's slots (title, body, heading, subtitle, CTA, caption) and generates content that fits each slot's character limits.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `topic` | `string` | Yes | Carousel topic (minimum 10 characters) |
| `audience` | `string` | No | Target audience |
| `industry` | `string` | No | Industry context |
| `keyPoints` | `string[]` | No | Specific points to cover |
| `tone` | `string` | Yes | One of: `professional`, `casual`, `educational`, `inspirational`, `storytelling`, `match-my-style` |
| `ctaType` | `string` | No | CTA style: `none`, `follow`, `comment`, `share`, `link`, `dm`, `save`, `custom` |
| `templateAnalysis` | `object` | Yes | Template structure analysis with slots, slide breakdown, brand colors, fonts |

### Template Analysis

The frontend uses `lib/ai/template-analyzer.ts` to analyze the current template and produce a `TemplateAnalysis` object containing:
- Template metadata (ID, name, category, total slides)
- Per-slide breakdown (purpose, element counts, background color)
- Slot definitions (ID, slide index, element ID, type, max length, placeholder, purpose, required flag, font size, position)
- Brand colors and fonts

### Content Generation Flow

1. Request is validated with Zod schema
2. User context is fetched (profile, company, recent posts, wishlist)
3. System and user prompts are built via `buildCarouselSystemPrompt()` and `buildCarouselUserPrompt()` from `lib/ai/carousel-prompts.ts`
4. AI generates content mapped to slot IDs
5. Response is parsed via `parseCarouselResponse()`
6. Content is validated and truncated to fit slot character limits
7. A secondary AI call generates an optional LinkedIn caption for the carousel

### Response

```json
{
  "success": true,
  "slots": [
    { "slotId": "slot-0-title-abc", "content": "5 Habits That Changed Everything" },
    { "slotId": "slot-0-body-def", "content": "Based on 3 years of tracking..." }
  ],
  "caption": "I spent 3 years tracking my daily habits...",
  "metadata": {
    "tokensUsed": 1432,
    "generationTime": 4521,
    "model": "gpt-4o"
  }
}
```

### Frontend Components

**AiContentGenerator** -- Dialog that generates content for the current template. Shows a topic input, tone selector, CTA selector, and optional audience field. Generated content is displayed in a paginated slide-by-slide preview with dot navigation. Uses `buildSlidesFromContent()` from `lib/ai/carousel-builder.ts` to apply content to template slides.

**AiCarouselGenerator** -- Standalone carousel generator with a slide count slider (3-10), visual tone cards, optional template selection for styling, and animated generation progress overlay with step-by-step indicators. Calls `/api/ai/generate` with a carousel-specific system prompt and parses the JSON response into slides.

**EnhancedAiCarouselGenerator** -- Multi-step wizard for carousel creation:
1. **Template Selection** -- Choose from available templates
2. **Topic Input** -- Describe the carousel topic, audience, industry, and key points
3. **Style Configuration** -- Select tone and CTA type
4. **Preview** -- Review generated slides with regenerate option

Features polished step indicators with connected progress lines and animated generation progress overlay.

### Configuration

- Model: `openai/gpt-4o` via OpenRouter (note: carousel uses gpt-4o specifically, not gpt-4.1)
- Temperature: 0.7
- Max tokens: 2000

---

## Carousel Caption

**Endpoint:** `POST /api/ai/carousel-caption`
**Source:** `app/api/ai/carousel-caption/route.ts`

Generates a LinkedIn post caption to accompany a carousel document post.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `carouselContent` | `string` | Yes | Combined text content from carousel slides (truncated to 3000 chars) |
| `topic` | `string` | No | Topic/theme for the caption |
| `tone` | `string` | No | Default: `professional` |

### Caption Rules

The system prompt instructs the AI to:
- Write a hook in lines 1-2 with a surprising insight or relatable problem
- Briefly introduce the carousel content in lines 3-5
- Include a CTA like "Swipe through to learn..." or "Save this for later"
- Add 3-5 relevant hashtags
- Keep between 500-1500 characters
- Not summarize every slide (leave curiosity gaps)
- Not start with "I'm excited to share..."

### Configuration

- Model: `DEFAULT_MODEL` (`openai/gpt-4.1`)
- Temperature: 0.8
- Max tokens: 800

---

## Company Analysis

**Endpoint:** `POST /api/ai/analyze-company`
**Source:** `app/api/ai/analyze-company/route.ts`

Analyzes a company's website to extract structured business context used during onboarding to personalize all future AI-generated content.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `websiteUrl` | `string` | Yes | Company website URL |
| `companyName` | `string` | Yes | Company name |
| `industry` | `string` | No | Industry hint |
| `targetAudience` | `string` | No | Target audience hint |

### Extracted Data Structure

The AI returns a structured JSON object containing:

- **valueProposition** -- 1-2 sentence value proposition
- **productsAndServices** -- Array of `{ name, description }` objects
- **targetAudience** -- Object with `industries[]`, `companySize`, `roles[]`, `painPoints[]`
- **toneOfVoice** -- Object with `descriptors[]`, `writingStyle`, `examples[]`
- **brandColors** -- Array of hex color codes
- **summary** -- 2-3 sentence company summary

This data is stored in the `company_context` table and used by all other AI features for personalization.

### Configuration

- Model: `DEFAULT_MODEL` (`openai/gpt-4.1`)
- Temperature: 0.4 (lower for factual extraction)
- Timeout: 60000ms (longer for analysis)
- Max tokens: 2000

---

## Prompt Playground

**Endpoint:** `POST /api/ai/playground`
**Source:** `app/api/ai/playground/route.ts`
**Frontend:** `components/features/prompt-playground.tsx`, `components/features/prompt-analytics.tsx`

A full-featured prompt testing environment for iterating on system and user prompts with configurable model parameters, run history, and analytics.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `systemPrompt` | `string` | Yes | System prompt text |
| `userPrompt` | `string` | Yes | User prompt text |
| `model` | `string` | No | Model override (default: `openai/gpt-4.1`) |
| `temperature` | `number` | No | 0.0-2.0 (default: 0.7) |
| `maxTokens` | `number` | No | 100-4000 (default: 1200) |
| `topP` | `number` | No | 0.0-1.0 |
| `promptId` | `string` | No | Saved prompt ID for analytics tracking |
| `promptVersion` | `number` | No | Prompt version being tested |

### Response

```json
{
  "content": "Generated response...",
  "metadata": {
    "model": "openai/gpt-4.1",
    "tokensUsed": 523,
    "promptTokens": 312,
    "completionTokens": 211,
    "finishReason": "stop",
    "estimatedCost": 0.0023,
    "temperature": 0.7,
    "maxTokens": 1200,
    "topP": null
  }
}
```

### Cost Estimation

The playground estimates costs based on per-1M-token pricing for each model:

| Model | Input (per 1M) | Output (per 1M) |
|-------|----------------|-----------------|
| `openai/gpt-4o` | $2.50 | $10.00 |
| `openai/gpt-4o-mini` | $0.15 | $0.60 |
| `openai/gpt-3.5-turbo` | $0.50 | $1.50 |
| `openai/gpt-4.1` | $2.00 | $8.00 |
| `openai/gpt-4.1-mini` | $0.40 | $1.60 |
| `openai/gpt-4.1-nano` | $0.10 | $0.40 |

### Frontend

**PromptPlayground** (`components/features/prompt-playground.tsx`) -- Interactive prompt editor with:
- System and user prompt text areas with syntax highlighting
- Variable management system for dynamic prompt content
- Template library for loading pre-built prompts
- Model parameter controls (model selector, temperature slider, max tokens, top-p)
- Response comparison view (side-by-side)
- Run history panel
- Raw JSON output view
- Export functionality
- Database integration for prompt versioning and activation

**PromptAnalytics** (`components/features/prompt-analytics.tsx`) -- Dashboard displaying:
- Total usage count, success rate, tokens used, average response time
- Feature breakdown (remix, compose, carousel, playground) with progress bars
- Model usage breakdown
- Daily usage bar chart
- Time range filtering (today, last 7/30 days, this month/quarter/year)
- Feature filtering

---

## AI Context System

Every AI feature in ChainLinked benefits from a rich context system that personalizes AI output based on the user's profile, company, writing history, and preferences.

### Context Sources

| Source | Database Table | Data Points |
|--------|---------------|-------------|
| LinkedIn Profile | `linkedin_profiles` | first_name, last_name, headline, industry, summary |
| User Profile | `profiles` | company_name, company_description, company_products, company_icp, company_value_props |
| Company Context | `company_context` | company_name, company_summary, industry, value_proposition, products_and_services, target_audience, tone_of_voice |
| Recent Posts | `my_posts` | Post content (10-20 most recent, ordered by posted_at) |
| Top Posts | `my_posts` | Top 3-5 posts by impressions/engagement |
| Saved Ideas | `swipe_wishlist` | Content from saved/wishlisted posts |
| User Niches | `user_niches` | User's content niches/topics |
| Content Rules | `content_rules` | Personal and team content rules |

### Context Flow

1. **Profile data** provides identity (name, headline, industry) for the AI to understand who is writing.
2. **Company context** (from company analysis onboarding) provides business context (products, ICP, value props, brand tone) so AI can write on-brand.
3. **Recent posts** serve as writing style samples. For `match-my-style`, up to 20 posts are included with longer excerpts (400-500 chars vs 200-300 chars).
4. **Top-performing posts** show the AI what content resonates with the user's audience.
5. **Saved ideas** from the swipe wishlist indicate content preferences and topics of interest.
6. **Content rules** are mandatory constraints injected into every system prompt.

### Brand Kit / Tone of Voice

The `company_context.tone_of_voice` field stores a JSONB object with:
- `descriptors` -- Array of tone words (e.g., "professional", "friendly", "authoritative")
- `writingStyle` -- Brief description of writing style
- `examples` -- 2-3 short example phrases that capture the brand voice

This is parsed and injected into carousel, compose, and series prompts.

---

## Streaming

ChainLinked uses two approaches for AI responses:

### Non-Streaming (JSON Response)

Used by: `/api/ai/generate`, `/api/ai/remix`, `/api/ai/edit-selection`, `/api/ai/carousel/generate`, `/api/ai/carousel-caption`, `/api/ai/analyze-company`, `/api/ai/playground`

These endpoints use the `chatCompletion()` function from `lib/ai/openai-client.ts` which wraps `client.chat.completions.create()` from the OpenAI SDK. The full response is returned as a JSON object with content and metadata.

### Streaming (UI Message Stream)

Used by: `/api/ai/compose-chat`, `/api/ai/compose-series`

These endpoints use the Vercel AI SDK (`ai` package):
- **Backend**: `streamText()` from `ai` with `createOpenAICompatible()` from `@ai-sdk/openai-compatible`, returning `result.toUIMessageStreamResponse()`
- **Frontend**: `useChat()` from `@ai-sdk/react` with `DefaultChatTransport` configured with the API endpoint and extra body parameters (e.g., `{ tone }`)

Tool calls (`presentOptions`, `generatePost`, `generateSeries`) are rendered as UI components. The tool part types follow the AI SDK v6 convention: `tool-${toolName}` with states `input-streaming`, `input-available`, `output-available`, `output-error`.

---

## Models and Configuration

### Default Model

The default model for all features is `openai/gpt-4.1` accessed through OpenRouter. This is defined as `DEFAULT_MODEL` in `lib/ai/openai-client.ts`.

### Model Usage by Feature

| Feature | Model | Temperature | Max Tokens |
|---------|-------|-------------|------------|
| Post Generation | `openai/gpt-4.1` | 0.8 | 1500 |
| Compose Chat | `openai/gpt-4.1` | 0.8 | 2000 |
| Compose Series | `openai/gpt-4.1` | 0.8 | 4000 |
| Edit Selection | `openai/gpt-4.1` | 0.7 | 1000 |
| Post Remix | `openai/gpt-4.1` | 0.85 | 1500 |
| Carousel Generation | `openai/gpt-4o` | 0.7 | 2000 |
| Carousel Caption | `openai/gpt-4.1` | 0.8 | 800 |
| Company Analysis | `openai/gpt-4.1` | 0.4 | 2000 |
| Prompt Playground | Configurable (default: `openai/gpt-4.1`) | Configurable (default: 0.7) | Configurable (default: 1200) |

### OpenRouter Client Configuration

All AI calls go through OpenRouter (`https://openrouter.ai/api/v1`). The client is created via `createOpenAIClient()` in `lib/ai/openai-client.ts`:

- **Base URL**: `https://openrouter.ai/api/v1`
- **Default timeout**: 30000ms (60000ms for company analysis)
- **Max retries**: 2
- **Headers**: `HTTP-Referer` (app URL) and `X-Title` ("ChainLinked")

### API Key Resolution

API keys are resolved in priority order:
1. Key provided in the request body
2. User's encrypted key from `user_api_keys` table (decrypted via `lib/crypto.ts`)
3. System environment variable `OPENROUTER_API_KEY`

---

## Content Rules Integration

Content rules are user-defined constraints that are injected into every AI prompt. They ensure consistent brand compliance and content standards.

### How It Works

1. Personal rules are fetched from `content_rules` where `user_id` matches and `team_id` is null.
2. Team rules are fetched by first finding the user's team via `team_members`, then querying `content_rules` for that `team_id`.
3. All rules are filtered by `is_active = true` and ordered by `priority` (descending).
4. Rules are appended to the system prompt under a `## MANDATORY Content Rules` section.

### Injection Format

```
## MANDATORY Content Rules
The following rules MUST be followed in all generated content:
- Never use the word "synergy" in any context
- Always include a question at the end of posts
- Keep posts under 2000 characters
```

### Coverage

Content rules are injected into ALL AI endpoints:
- `/api/ai/generate`
- `/api/ai/compose-chat`
- `/api/ai/compose-series`
- `/api/ai/edit-selection`
- `/api/ai/remix`

Content rules injection is always non-blocking: if the query fails, the AI call proceeds without rules.

---

## Anti-AI Writing Rules

A comprehensive set of rules defined in `lib/ai/anti-ai-rules.ts` that ensure AI-generated content sounds authentically human. These rules are injected into every content-generating prompt.

### Key Components

**Banned Words** -- A table of 25+ AI-fingerprint words (e.g., "delve", "tapestry", "leverage", "seamless", "navigate") with suggested replacements.

**Banned Phrases** -- Categories include:
- Scene-setter openers ("Here's the thing...", "Let's unpack this")
- Faux-depth phrases ("At its core...", "When it comes to...")
- Transition crutches ("Furthermore...", "Moreover...")
- Hedging phrases ("It is important to note...")
- Assistant voice ("Hope this helps!", "Great question!")

**Banned Structural Patterns** -- The "perfectly packaged mini-essay", the "LinkedIn formula", symmetrical paragraph structures, "Not X, But Y" constructions.

**Banned Formatting** -- Em dashes (the #1 AI tell, absolutely banned), excessive bolding, excessive colons, emoji bookends.

**Positive Guidance** -- How to sound human: add specific details AI rarely invents (numbers, constraints, named tools), include tradeoffs and edge cases, add lived details, take positions, mix sentence lengths, start with specific moments.

### Two Versions

- `ANTI_AI_WRITING_RULES` -- Full version (~4000 chars) used in post generation, compose, and remix prompts
- `ANTI_AI_PROMPT_CONSTRAINTS` -- Condensed version (~1500 chars) used in space-constrained prompts like edit-selection

---

## Prompt Management System

The prompt management system (`lib/prompts/`) provides centralized control over all AI prompts with versioning, caching, and analytics.

### Components

| File | Purpose |
|------|---------|
| `lib/prompts/prompt-types.ts` | `PromptType` enum, variable definitions, analytics types |
| `lib/prompts/prompt-service.ts` | `PromptService` class with CRUD, fallback, and usage logging |
| `lib/prompts/prompt-defaults.ts` | Default prompt templates for all types |
| `lib/prompts/prompt-cache.ts` | In-memory prompt caching |
| `lib/prompts/prompt-utils.ts` | Variable substitution and validation utilities |
| `lib/prompts/index.ts` | Public API exports |

### Prompt Types

All prompts are classified by `PromptType` enum:
- **Remix tones**: `remix_professional`, `remix_casual`, `remix_inspiring`, `remix_educational`, `remix_thought_provoking`, `remix_match_style`
- **Post types**: `post_story`, `post_listicle`, `post_how_to`, `post_contrarian`, `post_case_study`, `post_reflection`, `post_data_driven`, `post_question`, `post_carousel`
- **Carousel**: `carousel_system`, `carousel_user_template`
- **Shared**: `base_rules`

### Usage Analytics

Every AI call logs usage data through `PromptService.logUsage()`:
- Prompt type and version
- User ID and feature name (compose, remix, carousel, playground)
- Token counts (input, output, total)
- Model used
- Response time in milliseconds
- Success/failure status
- Feature-specific metadata (tone, length, post type, etc.)

This data powers the Prompt Analytics dashboard.

### Prompt Resolution

`PromptService.getPromptWithFallback()` resolves prompts in order:
1. Database prompt (from `prompts` table, versioned)
2. Default prompt (from `prompt-defaults.ts`)
3. Hardcoded fallback

This allows prompts to be edited in the database (via the Prompt Playground) without code changes, while maintaining reliable defaults.
