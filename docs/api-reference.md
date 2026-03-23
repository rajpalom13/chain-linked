# ChainLinked API Reference

Complete reference for all API routes in the ChainLinked platform. All endpoints are Next.js App Router route handlers under `app/api/`.

**Base URL:** `https://chainlinked.ai/api` (production) or `http://localhost:3000/api` (development)

**Authentication:** Unless otherwise noted, all endpoints require an authenticated Supabase session. Unauthenticated requests receive a `401 Unauthorized` response.

---

## Table of Contents

- [Authentication](#authentication)
- [AI Generation](#ai-generation)
- [Analytics](#analytics)
- [LinkedIn Integration](#linkedin-integration)
- [Team Management](#team-management)
- [Brand Kit](#brand-kit)
- [Carousel Templates](#carousel-templates)
- [Content Discovery](#content-discovery)
- [Inspiration & Research](#inspiration--research)
- [Influencers](#influencers)
- [Company Context](#company-context)
- [Posts & Drafts](#posts--drafts)
- [Templates](#templates)
- [Settings](#settings)
- [Swipe Suggestions](#swipe-suggestions)
- [Prompt Management](#prompt-management)
- [User Profile](#user-profile)
- [Extension Sync](#extension-sync)
- [Onboarding](#onboarding)
- [Webhooks & Background Jobs](#webhooks--background-jobs)
- [Utilities](#utilities)

---

## Authentication

### POST `/api/auth/signup`

Creates a new user account with auto-confirmation (bypasses email verification).

- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "minimum6chars",
    "name": "Optional Name"
  }
  ```
- **Response (200):**
  ```json
  {
    "success": true,
    "user": { "id": "uuid", "email": "user@example.com" }
  }
  ```
- **Errors:**
  - `400` - Missing email/password, invalid email format, password too short
  - `409` - Account already exists
  - `500` - Unexpected error
- **Side Effects:** Sends a welcome email via Resend (fire-and-forget).

---

### GET `/api/auth/callback`

Handles OAuth callbacks (Google OAuth, email verification, password recovery). Exchanges PKCE auth code for a session and redirects to the appropriate page.

- **Auth Required:** No (this is the auth callback itself)
- **Query Params:**
  - `code` - Authorization code from Supabase
  - `redirect` / `next` - Post-auth redirect path (sanitized, defaults to `/dashboard`)
  - `error`, `error_description`, `error_code` - Error params from OAuth provider
- **Response:** Redirects to dashboard, onboarding, reset-password, or login with error message.
- **Error Handling:** Maps PKCE, expired, and access-denied errors to user-friendly messages. Password recovery errors redirect to `/forgot-password`.

---

### POST `/api/auth/resend-verification`

Generates a verification link via Supabase admin API and sends it via Resend.

- **Auth Required:** No
- **Request Body:**
  ```json
  { "email": "user@example.com" }
  ```
- **Response (200):**
  ```json
  { "success": true, "message": "Verification email sent. Please check your inbox." }
  ```
- **Errors:**
  - `400` - Missing/invalid email
  - `429` - Rate limited
  - `500` - Failed to generate link or send email
- **Security:** Returns generic success message for unknown emails to prevent user enumeration.

---

### POST `/api/auth/reset-password`

Generates a password reset link and sends it via Resend with a branded template.

- **Auth Required:** No
- **Request Body:**
  ```json
  { "email": "user@example.com" }
  ```
- **Response (200):**
  ```json
  { "success": true, "message": "If an account exists with this email, a reset link has been sent." }
  ```
- **Errors:**
  - `400` - Missing/invalid email or invalid request body
  - `429` - Rate limited
  - `500` - Failed to send email
- **Security:** Always returns success to prevent user enumeration.

---

### POST `/api/auth/google-token`

Exchanges a Google access token (from Chrome extension's `chrome.identity.getAuthToken`) for a Supabase session.

- **Auth Required:** No
- **CORS:** Enabled for Chrome extension requests
- **Request Body:**
  ```json
  { "google_access_token": "ya29..." }
  ```
- **Response (200):**
  ```json
  {
    "success": true,
    "session": {
      "access_token": "...",
      "refresh_token": "...",
      "expires_in": 3600,
      "expires_at": 1234567890,
      "token_type": "bearer",
      "user": { ... }
    }
  }
  ```
- **Errors:**
  - `400` - Missing token or could not retrieve email
  - `401` - Invalid/expired Google token
  - `500` - Failed to create user or session
- **Supports:** `OPTIONS` for CORS preflight.

---

### POST `/api/auth/delete-account`

Permanently deletes the authenticated user's account and all associated data.

- **Auth Required:** Yes
- **Request Body:** None
- **Response (200):**
  ```json
  { "success": true }
  ```
- **Errors:**
  - `401` - Unauthorized
  - `500` - Failed to delete account
- **Side Effects:** Deletes data from 25+ tables, owned teams, companies, profile, and the auth user record. Uses admin client with service role key.

---

## AI Generation

### POST `/api/ai/generate`

Generates a LinkedIn post using AI with user context and advanced prompting.

- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "topic": "Required topic or idea",
    "tone": "professional|casual|inspiring|educational|thought-provoking|match-my-style",
    "length": "short|medium|long",
    "context": "Optional additional instructions",
    "apiKey": "Optional OpenAI/OpenRouter API key",
    "postType": "Optional post type ID (story, listicle, etc.)"
  }
  ```
- **Response (200):**
  ```json
  {
    "content": "Generated post text...",
    "metadata": {
      "model": "openai/gpt-4.1",
      "tokensUsed": 1500,
      "tone": "professional",
      "length": "medium",
      "postType": null,
      "promptSource": "default|database|fallback",
      "userContext": { "hasProfile": true, "hasRecentPosts": true }
    }
  }
  ```
- **Errors:**
  - `400` - Missing topic or API key
  - `401` - Unauthorized or invalid API key
  - `402` - Insufficient quota
  - `429` - Rate limit exceeded
  - `500` - Generation failed
- **Features:** Fetches user profile, recent posts, writing patterns, content rules (personal + team), and wishlist items for context. Uses centralized prompt service with fallback.

---

### POST `/api/ai/edit-selection`

Edits a selected portion of text within a post per user instruction.

- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "selectedText": "Text to edit",
    "instruction": "How to edit it",
    "fullPostContent": "Full post for context"
  }
  ```
- **Response (200):**
  ```json
  { "editedText": "Edited replacement text" }
  ```
- **Errors:** `400` - Missing text/instruction, `401` - Unauthorized, `500` - Failed

---

### POST `/api/ai/remix`

Remixes a post with comprehensive user context, writing style analysis, and content rules.

- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "originalContent": "Post to remix (min 20 chars)",
    "tone": "match-my-style|professional|casual|inspiring|educational|thought-provoking",
    "length": "short|medium|long",
    "customInstructions": "Optional instructions",
    "apiKey": "Optional API key"
  }
  ```
- **Response (200):**
  ```json
  {
    "content": "Remixed post text...",
    "originalContent": "Original post...",
    "metadata": {
      "model": "...",
      "tokensUsed": 1200,
      "tone": "match-my-style",
      "length": "medium",
      "promptSource": "service",
      "userContext": {
        "hasProfile": true,
        "postsAnalyzed": 20,
        "nichesDetected": 3,
        "styleMatched": true
      }
    }
  }
  ```
- **Features:** Analyzes writing patterns (emoji usage, hashtags, bullet points, sentence length, common phrases), fetches top performing posts, user niches, and content rules.

---

### POST `/api/ai/compose-chat`

Streaming chat endpoint for advanced compose mode with tool calls.

- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "messages": [{ "role": "user", "content": "Write a post about..." }],
    "tone": "professional"
  }
  ```
- **Response:** Server-Sent Events stream (Vercel AI SDK `toUIMessageStreamResponse`).
- **Tools Available:**
  - `presentOptions` - Presents MCQ options for clarification
  - `generatePost` - Generates the final LinkedIn post
- **Features:** Rich user context (profile, company, brand, top posts, recent posts). Max 8 steps.

---

### POST `/api/ai/compose-series`

Streaming chat endpoint for generating a series of related LinkedIn posts.

- **Auth Required:** Yes
- **Request Body:** Same as compose-chat
- **Response:** Server-Sent Events stream
- **Tools Available:**
  - `presentOptions` - MCQ clarification
  - `generateSeries` - Generates 2-5 related posts with subtopics
- **Features:** Same rich context as compose-chat. Max 10 steps, 4000 max output tokens.

---

### POST `/api/ai/carousel/generate`

Generates carousel content based on template structure with slot-based content fitting.

- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "topic": "Topic (min 10 chars)",
    "tone": "professional|casual|educational|inspirational|storytelling|match-my-style",
    "audience": "Optional target audience",
    "industry": "Optional industry",
    "keyPoints": ["Optional", "key", "points"],
    "additionalContext": "Optional context",
    "ctaType": "none|follow|comment|share|link|dm|save|custom",
    "customCta": "Optional custom CTA text",
    "templateAnalysis": { "templateId": "...", "slots": [...], ... }
  }
  ```
- **Response (200):**
  ```json
  {
    "success": true,
    "slots": [{ "slotId": "slide-0-title", "content": "Generated text" }],
    "caption": "LinkedIn caption for the carousel...",
    "metadata": { "tokensUsed": 800, "generationTime": 3500, "model": "gpt-4o" }
  }
  ```
- **Features:** Template-aware generation, auto-generates LinkedIn caption, validates content fits template slot constraints.

---

### POST `/api/ai/carousel-caption`

Generates a LinkedIn post caption for carousel content.

- **Auth Required:** Yes (optional, works without user context)
- **Request Body:**
  ```json
  {
    "carouselContent": "Combined slide text...",
    "topic": "Optional topic",
    "tone": "professional"
  }
  ```
- **Response (200):**
  ```json
  {
    "content": "Generated caption...",
    "metadata": { "model": "...", "tokensUsed": 500 }
  }
  ```

---

### POST `/api/ai/playground`

Runs arbitrary system + user prompts with configurable model parameters. For prompt experimentation.

- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "systemPrompt": "You are...",
    "userPrompt": "Generate...",
    "model": "openai/gpt-4o",
    "temperature": 0.7,
    "maxTokens": 1200,
    "topP": 0.9,
    "apiKey": "Optional",
    "promptId": "Optional prompt ID",
    "promptVersion": 1
  }
  ```
- **Response (200):**
  ```json
  {
    "content": "Generated text...",
    "metadata": {
      "model": "...",
      "tokensUsed": 800,
      "promptTokens": 400,
      "completionTokens": 400,
      "finishReason": "stop",
      "estimatedCost": 0.0032,
      "temperature": 0.7,
      "maxTokens": 1200
    }
  }
  ```

---

### POST `/api/ai/analyze-company`

AI-powered website analysis to extract company context for onboarding.

- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "websiteUrl": "https://example.com",
    "companyName": "Example Inc",
    "industry": "Optional industry hint",
    "targetAudience": "Optional audience hint"
  }
  ```
- **Response (200):**
  ```json
  {
    "success": true,
    "analysis": {
      "valueProposition": "...",
      "productsAndServices": [{ "name": "...", "description": "..." }],
      "targetAudience": { "industries": [], "companySize": "...", "roles": [], "painPoints": [] },
      "toneOfVoice": { "descriptors": [], "writingStyle": "...", "examples": [] },
      "brandColors": ["#hex"],
      "summary": "..."
    },
    "metadata": { "model": "...", "tokensUsed": 1500 }
  }
  ```

---

## Analytics

### GET `/api/analytics`

Fetches latest LinkedIn analytics with trend history.

- **Auth Required:** Yes
- **Query Params:**
  - `days` - Number of days of history (default: 30, max: 365)
- **Response (200):**
  ```json
  {
    "current": { "impressions": 1000, "members_reached": 500, ... },
    "history": [{ "date": "2024-01-01", "impressions": 100, ... }]
  }
  ```

### POST `/api/analytics`

Saves analytics data from extension sync.

- **Auth Required:** Yes
- **Request Body:** Analytics fields (impressions, members_reached, engagements, etc.)
- **Response (200):** `{ "analytics": { ... } }`
- **Side Effects:** Also upserts into analytics_history for trend tracking.

---

### GET `/api/analytics/v2`

Post-level analytics via Supabase RPC functions with caching.

- **Auth Required:** Yes
- **Query Params:**
  - `metric` - `impressions|unique_reach|reactions|comments|reposts|saves|sends|engagements|engagements_rate`
  - `period` - `7d|30d|90d|1y|custom`
  - `contentType` - `all|TEXT|IMAGE|VIDEO|ARTICLE|DOCUMENT` (filter by media type)
  - `source` - `all|platform|extension|linkedin` (filter by post source)
  - `granularity` - `daily|weekly|monthly|quarterly|yearly`
  - `compare` - `true|false` (include comparison period)
  - `startDate`, `endDate` - Required when period is `custom`
- **Response (200):**
  ```json
  {
    "current": [{ "date": "2024-01-01", "value": 150 }],
    "comparison": null,
    "summary": { "total": 5000, "average": 166, "change": 12.5, "compCount": 30 }
  }
  ```
- **Caching:** Uses `analytics_summary_cache` table with 4-hour TTL.

---

### GET `/api/analytics/v2/profile`

Profile-level analytics (followers, profile views, search appearances, connections).

- **Auth Required:** Yes
- **Query Params:** Same as `/api/analytics/v2` but with profile metrics: `followers|profile_views|search_appearances|connections`
- **Response (200):** Same shape as v2 plus `accumulativeTotal` in summary.

---

## LinkedIn Integration

### GET `/api/linkedin/connect`

Initiates LinkedIn OAuth flow by redirecting to LinkedIn authorization page.

- **Auth Required:** Yes
- **Query Params:**
  - `redirect` - Post-connection redirect path (default: `/dashboard/settings`)
- **Response:** `302` redirect to LinkedIn authorization URL
- **Side Effects:** Sets CSRF state and redirect cookies (10-minute TTL).

---

### GET `/api/linkedin/callback`

Handles LinkedIn OAuth callback: token exchange, profile storage, and redirect.

- **Auth Required:** Yes (via Supabase session)
- **Query Params:** `code`, `state`, `error`, `error_description`
- **Response:** Redirects to success/error page
- **Side Effects:** Encrypts and stores tokens, upserts LinkedIn profile, updates main profile with LinkedIn avatar.

---

### POST `/api/linkedin/disconnect`

Disconnects the user's LinkedIn account.

- **Auth Required:** Yes
- **Response (200):**
  ```json
  { "success": true, "message": "LinkedIn account disconnected" }
  ```
- **Side Effects:** Revokes token with LinkedIn (best effort), deletes tokens from database.

---

### GET `/api/linkedin/status`

Returns LinkedIn connection status including token validity and profile name.

- **Auth Required:** Yes
- **Response (200):**
  ```json
  {
    "connected": true,
    "expiresAt": "2024-12-31T00:00:00Z",
    "profileName": "John Doe",
    "needsReconnect": false
  }
  ```
- **Fallbacks:** Checks linkedin_tokens, profiles.linkedin_access_token, linkedin_profiles, and profiles.linkedin_connected_at in order.

### DELETE `/api/linkedin/status`

Alternative way to disconnect LinkedIn (deletes tokens).

---

### POST `/api/linkedin/post`

Creates a text or image post on LinkedIn via the official API.

- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "content": "Post text (max 3000 chars)",
    "visibility": "PUBLIC|CONNECTIONS|LOGGED_IN",
    "mediaUrls": ["Optional image URLs"],
    "mediaBase64": [{ "data": "base64...", "contentType": "image/jpeg" }],
    "scheduledPostId": "Optional - updates scheduled post status"
  }
  ```
- **Response (200):**
  ```json
  {
    "success": true,
    "postId": "...",
    "linkedinPostUrn": "urn:li:share:...",
    "message": "Post published successfully"
  }
  ```
- **Safety Gate:** If posting is disabled via config, saves as draft instead and returns `{ success: false, draft: true }`.
- **Side Effects:** Logs post in my_posts table, updates scheduled_posts if applicable.

---

### POST `/api/linkedin/post-document`

Creates a document (carousel/PDF) post on LinkedIn.

- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "content": "Caption text (max 3000 chars)",
    "visibility": "PUBLIC",
    "pdfBase64": "Base64-encoded PDF data",
    "documentTitle": "Optional display title"
  }
  ```
- **Response (200):** Same shape as `/api/linkedin/post`
- **Limits:** Max 25MB document size, 60-second function timeout.

---

### POST/DELETE/PATCH `/api/linkedin/voyager/post`

LinkedIn post operations via Voyager API (fallback/alternative).

- **POST** - Create a post with Zod-validated body (content, visibility, mediaUrls, articleUrl, originalPostUrn)
- **DELETE** - Delete a post by `activityUrn` query param
- **PATCH** - Edit a post with `{ activityUrn, content }` body
- **Auth Required:** Yes
- **Side Effects:** Logs to my_posts table.

---

### GET `/api/linkedin/voyager/metrics`

Retrieves LinkedIn analytics via Voyager API.

- **Auth Required:** Yes
- **Query Params:**
  - `type` - `summary|post|profile|profile-stats|content|recent-posts`
  - `period` - Analytics period (e.g., `LAST_30_DAYS`)
  - `activityUrn` - Required for `type=post`
  - `limit` - For content/recent-posts types
- **Response:** Varies by type. Always includes `{ success: true, source: "voyager_api" }`.
- **Side Effects:** Caches results in linkedin_analytics, post_analytics, and linkedin_profiles tables.

---

## Team Management

### GET `/api/teams`

Fetches the current user's teams with member counts and company info.

- **Auth Required:** Yes
- **Response (200):**
  ```json
  {
    "teams": [{
      "id": "uuid",
      "name": "Team Name",
      "logo_url": null,
      "owner_id": "uuid",
      "role": "owner|admin|member",
      "member_count": 5,
      "company": { "id": "...", "name": "...", "logo_url": null }
    }]
  }
  ```

### POST `/api/teams`

Creates a new team.

- **Request Body:** `{ "name": "Team Name", "company_id": "optional", "logo_url": "optional" }`
- **Response (200):** `{ "team": { ... } }`

### PATCH `/api/teams`

Updates team details (owner/admin only).

- **Request Body:** `{ "id": "team-id", "name": "New Name", "logo_url": "..." }`

### DELETE `/api/teams?id=team-id`

Deletes a team (owner only). Cascades to members, invitations, and join requests.

---

### GET `/api/teams/search?q=searchterm`

Searches discoverable teams by name (case-insensitive, fuzzy matching).

- **Auth Required:** Yes
- **Query Params:** `q` - Search query (min 2 chars)
- **Response (200):**
  ```json
  {
    "teams": [{
      "id": "uuid",
      "name": "Team Name",
      "logo_url": null,
      "member_count": 5,
      "company_name": "Company Inc",
      "discoverable": true
    }]
  }
  ```
- **Features:** Searches by team name and company name, with trigram similarity fallback via RPC.

---

### GET/POST `/api/teams/accept-invite`

- **GET** `?token=xxx` - Get invitation details (public, no auth required for viewing)
- **POST** `{ "token": "xxx" }` - Accept a team invitation
  - Validates email match, expiration, and status
  - Enforces single-team-per-member (removes from other teams)
  - Copies company context and brand kit from team owner
  - Sends welcome email

---

### GET/POST/DELETE `/api/teams/join-request`

- **GET** - Get user's pending join request
- **POST** `{ "team_id": "uuid", "message": "optional" }` - Submit join request (team must be discoverable)
- **DELETE** `?id=requestId` - Cancel a pending request
- **Side Effects:** Notifies team owners/admins via email.

---

### GET/PATCH/DELETE `/api/teams/[teamId]/members`

- **GET** - List all team members with profile and LinkedIn data
- **PATCH** `{ "user_id": "...", "role": "admin|member" }` - Update member role (owner only)
- **DELETE** `?userId=xxx` - Remove a member (owner/admin or self, with permission checks)

---

### GET/POST/DELETE/PATCH `/api/teams/[teamId]/invite`

- **GET** `?status=pending|all` - List invitations (admin/owner only)
- **POST** `{ "emails": ["a@b.com"], "role": "member|admin" }` - Send invitations via Resend email
- **DELETE** `?invitationId=xxx` - Cancel an invitation
- **PATCH** `{ "invitation_id": "xxx" }` - Resend an invitation with new token

---

### GET/PATCH `/api/teams/[teamId]/join-requests`

- **GET** - List pending join requests (admin/owner only)
- **PATCH** `{ "request_id": "uuid", "action": "approve|reject", "review_note": "optional" }` - Approve/reject a request
  - On approval: creates team member record, copies company context

---

## Brand Kit

### GET/POST/PUT/DELETE `/api/brand-kit`

Full CRUD for brand kit management.

- **GET** - Fetch user's brand kits (camelCase response)
- **POST** - Create a brand kit (requires `websiteUrl` and `primaryColor`). Auto-activates new kit.
- **PUT** - Update a brand kit by ID. If `isActive: true`, deactivates others.
- **DELETE** `?id=uuid` - Delete a brand kit
- **Auth Required:** Yes

---

### POST `/api/brand-kit/extract`

Extracts brand elements from a website URL using Firecrawl (CSS/HTML) and Brandfetch (brand API) in parallel.

- **Auth Required:** Yes
- **Request Body:** `{ "url": "https://example.com" }`
- **Response (200):**
  ```json
  {
    "success": true,
    "brandKit": {
      "websiteUrl": "...",
      "primaryColor": "#0066CC",
      "secondaryColor": "#...",
      "accentColor": "#...",
      "backgroundColor": "#...",
      "textColor": "#...",
      "fontPrimary": "Inter",
      "fontSecondary": "...",
      "logoUrl": "https://...",
      "rawExtraction": { ... }
    }
  }
  ```
- **Errors:** `422` - Both extraction methods failed

---

## Carousel Templates

### GET/POST/PUT/DELETE `/api/carousel-templates`

Full CRUD for custom carousel templates.

- **GET** - Fetch user's saved templates
- **POST** - Create template (requires `name` and `slides` array)
- **PUT** - Update template by ID
- **DELETE** `?id=uuid` - Delete template
- **Auth Required:** Yes

---

### GET/POST/DELETE `/api/carousel-templates/categories`

Manage user-defined template categories.

- **GET** - List categories
- **POST** `{ "name": "Category Name" }` - Create/upsert category (max 50 chars)
- **DELETE** `?id=uuid` - Delete category

---

### GET/POST/DELETE `/api/carousel-templates/favorites`

Manage template favorites.

- **GET** - Get favorited template IDs
- **POST** `{ "templateId": "template-id" }` - Add favorite (upsert)
- **DELETE** `?templateId=template-id` - Remove favorite

---

## Content Discovery

### GET `/api/discover/posts`

Fetches curated/scraped industry posts for the Discover tab.

- **Auth Required:** Yes
- **Query Params:**
  - `topic` - Filter by topic (array contains match)
  - `cluster` - Filter by primary_cluster
  - `tags` - Comma-separated tags (array overlap)
  - `page` - Page number (default: 1)
  - `limit` - Results per page (default: 12, max: 50)
  - `sort` - `engagement|recent|viral`
  - `search` - Full-text search in content/author name
- **Response (200):**
  ```json
  {
    "posts": [...],
    "pagination": { "page": 1, "limit": 12, "total": 100, "hasMore": true },
    "fallback": false
  }
  ```

---

### GET `/api/discover/news`

Fetches Perplexity-sourced news articles.

- **Auth Required:** Yes
- **Query Params:** `topic`, `page`, `limit`, `sort` (recent|relevance), `search`
- **Response (200):** `{ "articles": [...], "pagination": { ... } }`

---

### POST `/api/discover/news/seed`

Triggers news article ingestion pipeline for specified topics.

- **Auth Required:** Yes
- **Request Body:** `{ "topics": ["ai", "marketing"], "force": false }`
- **Response (200):**
  ```json
  {
    "seeded": true,
    "reason": "triggered|success|already_exists|no_api_key|no_results",
    "message": "...",
    "batchId": "uuid"
  }
  ```
- **Pipeline:** OpenRouter/Perplexity (primary) -> direct Perplexity -> Tavily (fallback). Uses Inngest for async processing.

---

### GET/POST `/api/discover/topics`

Manage user's discover topic preferences.

- **GET** - Get selected topics and selection status
- **POST** `{ "topics": ["ai", "marketing", ...] }` - Save topics (1-20 required)
- **Side Effects:** Triggers content ingest via Inngest for saved topics.

---

### POST `/api/discover/import`

Imports scraped LinkedIn posts from Apify or manual sources.

- **Auth Required:** Yes
- **Request Body:** Zod-validated array of posts with `linkedin_url`, `author_name`, `content`, metrics, etc.
- **Response (200):**
  ```json
  {
    "summary": { "total": 50, "new": 45, "updated": 3, "skipped": 2 },
    "errors": ["optional error messages"]
  }
  ```
- **Features:** Auto-classifies topics by keyword, calculates engagement rate, deduplicates by URL.

---

## Inspiration & Research

### GET `/api/inspiration/search`

AI-powered search that understands intent, maps to clusters/tags, and returns ranked results.

- **Auth Required:** Yes
- **Query Params:**
  - `q` - Search query
  - `page` - Zero-based page number
  - `limit` - Max results (default: 24, max: 50)
- **Response (200):**
  ```json
  {
    "posts": [{
      "id": "...",
      "author": { "name": "...", "headline": "...", "avatar": "..." },
      "content": "...",
      "category": "AI",
      "tags": ["machine-learning"],
      "primaryCluster": "AI",
      "metrics": { "likes": 100, "comments": 20, ... },
      "source": "discover|following",
      "relevanceScore": 85.5,
      "linkedinUrl": "..."
    }],
    "totalCount": 150,
    "searchMeta": { "searchTerms": [...], "clusters": [...], "tags": [...], "intent": "..." }
  }
  ```
- **Features:** Uses LLM to analyze search intent, queries discover_posts and influencer_posts in parallel, deduplicates, and ranks by computed relevance score.

---

### GET/POST `/api/research`

Content research using Tavily API.

- **GET** - Returns API configuration status
- **POST** - Performs search or saves a post directly
  - Search: `{ "query": "...", "topics": [...], "maxResults": 10, "searchDepth": "basic|advanced", "saveResults": false }`
  - Direct save: `{ "savePost": { "url": "...", "title": "...", "content": "...", "topics": [...] } }`
- **Response (200):** `{ "posts": [...], "query": "...", "summary": "AI summary", "count": 10, "saved": false }`

---

### POST `/api/research/start`

Starts a deep research workflow via Inngest.

- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "topics": ["topic1", "topic2"],
    "depth": "basic|deep",
    "maxResultsPerTopic": 5,
    "generatePosts": true,
    "postTypes": ["thought-leadership", "educational", "storytelling"],
    "companyContextId": "optional",
    "useMyStyle": false
  }
  ```
- **Response (200):** `{ "sessionId": "uuid", "status": "started", "estimatedDuration": 60, ... }`
- **Rate Limit:** Max 5 active sessions per user.

### GET `/api/research/start`

Returns endpoint documentation.

---

### GET `/api/research/status/[sessionId]`

Polls research session status with progress tracking.

- **Auth Required:** Yes
- **Response (200):**
  ```json
  {
    "sessionId": "uuid",
    "status": "pending|initializing|searching|enriching|generating|saving|completed|failed",
    "progress": { "step": "Searching web...", "percentage": 20 },
    "results": { "postsDiscovered": 15, "postsGenerated": 5 },
    "timing": { "startedAt": "...", "completedAt": "...", "duration": 45000 }
  }
  ```

---

### GET/PATCH/DELETE `/api/research/posts`

Manage AI-generated posts from research sessions.

- **GET** - List generated posts with filters (`sessionId`, `status`, `postType`, `limit`, `offset`)
- **PATCH** `{ "postId": "...", "content": "...", "status": "draft|scheduled|posted|archived" }` - Update post
- **DELETE** `?postId=xxx` - Delete a generated post

---

### GET `/api/research/sessions`

List user's research sessions with pagination.

- **Query Params:** `status`, `limit` (max 50), `offset`
- **Response (200):** `{ "sessions": [...], "pagination": { "total": 10, "hasMore": false } }`

---

### GET/POST `/api/research/test`

Diagnostic endpoint for Inngest workflow configuration.

- **GET** - Returns configuration status for Inngest, Tavily, Perplexity, OpenRouter, Supabase
- **POST** - Sends a test event to Inngest

---

## Influencers

### GET/POST/DELETE/PATCH `/api/influencers`

Manage followed LinkedIn influencers.

- **GET** - List active followed influencers
- **POST** `{ "linkedin_url": "https://linkedin.com/in/username", "author_name": "optional" }` - Follow an influencer (validates URL, upserts)
- **DELETE** `{ "id": "record-id" }` - Unfollow an influencer
- **PATCH** `{ "influencer_id": "uuid" }` - Trigger on-demand scrape for an influencer
- **Side Effects:** POST and PATCH trigger scrape via Inngest `influencer/follow` event.

---

### GET `/api/influencers/posts`

Returns approved posts from followed influencers for the Inspiration feed.

- **Auth Required:** Yes
- **Query Params:** `page`, `limit` (default 24), `influencer_id`, `cluster`, `search`
- **Response (200):** `{ "posts": [...], "totalCount": 100 }`
- **Joins:** `followed_influencers` table for author info.

---

## Company Context

### GET/PUT `/api/company-context`

Get or update company context for the authenticated user.

- **GET** - Returns company context record or null
- **PUT** - Upserts company context with fields: `companyName` (required), `websiteUrl`, `industry`, `targetAudienceInput`, `valueProposition`, `companySummary`, `productsAndServices`, `targetAudience`, `toneOfVoice`, `brandColors`

---

### GET `/api/company-context/status`

Polls company analysis workflow status.

- **Response (200):**
  ```json
  {
    "status": "pending|scraping|researching|analyzing|completed|failed",
    "progress": 50,
    "currentStep": "Researching company information...",
    "errorMessage": null,
    "completedAt": null
  }
  ```

---

### POST `/api/company-context/trigger`

Creates/updates company context and triggers analysis workflow via Inngest.

- **Request Body:** `{ "companyName": "...", "websiteUrl": "...", "industry": "...", "targetAudienceInput": "..." }`
- **Response (200):** `{ "success": true, "companyContextId": "uuid", "status": "pending" }`

---

### POST `/api/company/analyze`

Alternative AI-powered company analysis that returns structured context for the profiles table.

- **Auth Required:** Yes
- **Request Body:** `{ "websiteUrl": "https://...", "companyName": "optional hint" }`
- **Response (200):**
  ```json
  {
    "success": true,
    "data": {
      "companyName": "...",
      "companyDescription": "2-3 paragraphs",
      "companyProducts": "bullet points",
      "companyIcp": "detailed paragraph",
      "companyValueProps": "bullet points",
      "websiteUrl": "...",
      "confidenceScore": 85
    }
  }
  ```

---

## Posts & Drafts

### GET/POST/DELETE `/api/posts`

Manage user posts and scheduled posts.

- **GET** - Fetch posts by type
  - Query: `type=my_posts|feed_posts|scheduled|team_posts`, `limit`, `offset`
  - `team_posts` enriches with author profile data
- **POST** - Create scheduled post: `{ "content": "...", "scheduled_for": "ISO date", "timezone": "UTC", "media_urls": [] }`
- **DELETE** `?id=post-id` - Delete a scheduled post

---

### POST `/api/drafts/auto-save`

Auto-saves drafts (designed for `navigator.sendBeacon()` on page unload).

- **Auth Required:** Yes
- **Request Body:**
  ```json
  {
    "content": "Post text",
    "postType": "general",
    "source": "compose|swipe|inspiration|carousel|discover|research",
    "topic": "optional",
    "tone": "optional",
    "context": "optional",
    "wordCount": 150,
    "draftId": "optional existing draft ID for in-place update"
  }
  ```
- **Response (200):** `{ "success": true, "id": "draft-uuid" }`
- **Features:** Deduplicates by content, supports both JSON and text/plain content types.

---

### POST `/api/drafts/bulk-delete`

Soft-deletes multiple drafts by setting status to archived.

- **Request Body:** `{ "items": [{ "id": "uuid", "table": "generated_posts|scheduled_posts" }] }`
- **Limit:** Max 100 items per request.
- **Response (200):** `{ "success": true, "deleted": 5, "errors": 0 }`

---

## Templates

### GET/POST/PATCH/DELETE `/api/templates`

Full CRUD for post templates.

- **GET** - Fetch user's templates and public templates
  - Query: `category` filter, `public=false` to exclude public templates
  - Ordered by `usage_count` descending
- **POST** `{ "name": "...", "content": "...", "category": "optional", "tags": [], "is_public": false }`
- **PATCH** - Update template or increment usage count
  - `{ "id": "...", "name": "...", ... }` or `{ "id": "...", "increment_usage": true }`
  - Public templates can have usage incremented by non-owners
- **DELETE** `?id=template-id`

---

## Settings

### GET/POST/DELETE/PATCH `/api/settings/api-keys`

BYOK (Bring Your Own Key) API key management.

- **GET** - Check if user has API key configured (returns hint, validity status)
  - Falls back to checking `OPENROUTER_API_KEY` environment variable
- **POST** `{ "provider": "openai", "apiKey": "sk-or-v1-..." }` - Save/update API key
  - Validates format, tests with OpenRouter API, encrypts before storage
- **DELETE** - Remove API key
- **PATCH** - Re-validate existing API key (decrypts, tests, updates validity status)

---

## Swipe Suggestions

### GET/PATCH `/api/swipe/suggestions`

Fetch and manage AI-generated suggestions for the swipe feature.

- **GET** - Fetch suggestions with filters
  - Query: `status=active|used|dismissed|expired`, `limit` (max 50), `offset`
  - Response includes `canGenerate` flag (true if under 10 active suggestions)
- **PATCH** `{ "suggestionId": "uuid", "status": "active|used|dismissed|expired" }` - Update suggestion status

---

### POST/DELETE `/api/swipe/generate`

Trigger AI suggestion generation.

- **POST** - Starts generation via Inngest
  - Validates company context exists, checks active suggestion count (max 10), prevents concurrent runs
  - Response: `{ "success": true, "runId": "uuid", "suggestionsRequested": 8 }`
- **DELETE** - Cancels an active generation run

---

### GET `/api/swipe/generation-status`

Poll generation run status.

- **Query Params:** `runId` (optional, defaults to latest run)
- **Response (200):**
  ```json
  {
    "runId": "uuid",
    "status": "pending|generating|completed|failed|cancelled",
    "progress": 50,
    "suggestionsRequested": 10,
    "suggestionsGenerated": 5,
    "postTypesUsed": ["thought-leadership"],
    "createdAt": "...",
    "completedAt": null
  }
  ```

---

## Prompt Management

Admin-only endpoints for managing AI prompt templates.

### GET/POST `/api/prompts`

- **GET** - List prompts with optional filters (`type`, `isActive`, `isDefault`)
- **POST** - Create a new prompt (admin only)

### GET/PUT/DELETE `/api/prompts/[id]`

- **GET** - Get a single prompt by ID
- **PUT** - Update a prompt (admin only)
- **DELETE** - Delete a prompt (admin only)

### POST `/api/prompts/[id]/activate`

Activate a prompt (deactivates others of the same type). Admin only.

### POST `/api/prompts/[id]/rollback`

Rollback a prompt to a specific version. Admin only.

### GET `/api/prompts/[id]/versions`

Get version history for a prompt, ordered by version number descending.

### GET `/api/prompts/analytics`

Get usage analytics for prompts with filters by type, feature, date range.

### POST `/api/prompts/test`

Test a prompt with configurable parameters, variable substitution, and detailed response metadata.

- **Request Body:** `{ "systemPrompt": "...", "userPrompt": "...", "variables": { "key": "value" }, "model": "optional", "temperature": 0.7 }`

---

## User Profile

### GET/PATCH `/api/user`

- **GET** - Get current user profile with LinkedIn data (joins `linkedin_profiles`)
- **PATCH** - Update profile fields: `name`, `linkedin_profile_url`, `avatar_url`, `company_name`, `company_website`

---

### GET/POST `/api/user/style`

Writing style profile management.

- **GET** - Fetch user's writing style profile with `needsRefresh` flag
- **POST** - Analyze writing style from last 50 own posts and 30 saved items
  - Returns: sentence length, vocabulary level, tone, formatting style, hook patterns, emoji usage, CTA patterns, signature phrases, content themes
  - Requires at least some posts or saved content

---

## Extension Sync

### GET/POST `/api/sync`

Handles data sync from Chrome extension.

- **GET** - Returns last sync timestamps for each data type
- **POST** - Syncs data from extension
  - `type`: `profile|analytics|audience|posts|full_backup`
  - Each type validates with Zod schemas (for full_backup)
  - **Side Effects:** On first-ever sync, triggers Inngest `sync/first-data` event for immediate analytics backfill

---

## Onboarding

### POST `/api/onboarding/complete`

Marks onboarding as complete.

- **Auth Required:** Yes
- **Response (200):** `{ "success": true, "onboarding_completed": true, "onboarding_current_step": 4, "team_id": "optional" }`
- **Side Effects:** For owner-path users, auto-creates company and team from company_context data.

---

## Webhooks & Background Jobs

### GET/POST/PUT `/api/inngest`

Inngest webhook handler for background job processing.

- **Auth Required:** No (Inngest signing key validation)
- **Registered Workflows:**
  - `analyzeCompanyWorkflow` - Company context analysis
  - `deepResearchWorkflow` - Multi-step content research
  - `generateSuggestionsWorkflow` - Swipe suggestion generation
  - `suggestionsReadyHandler` - Post-generation notification
  - `dailyContentIngest` - Scheduled daily content ingestion
  - `onDemandContentIngest` - User-triggered content ingestion
  - `swipeAutoRefill` - Auto-refill swipe suggestions
  - `analyticsPipeline` - Analytics data processing
  - `analyticsSummaryCompute` - Summary cache computation
  - `analyticsBackfill` - Historical analytics backfill
  - `firstSyncBackfill` - First-time sync data processing
  - `templateAutoGenerate` - Automatic template generation
  - `influencerPostScrape` - Influencer post scraping
  - `viralPostIngest` - Viral post detection and ingestion
  - `publishScheduledPosts` - Scheduled post publishing

---

## Utilities

### GET `/api/proxy-image?url=<encoded-url>`

Proxies external images to bypass CORS restrictions for canvas rendering.

- **Auth Required:** Yes
- **Allowed Hostnames:** `media.licdn.com`, `img.logo.dev`, `images.unsplash.com`, `cdn.brandfetch.io`, `*.linkedin.com`
- **Security:** SSRF protection (blocks private/internal IPs), validates content type and size (max 10MB)
- **Response:** Image binary with CORS headers and 24-hour cache

---

### POST `/api/image/remove-background`

Removes image background using the remove.bg API.

- **Auth Required:** Yes
- **Accepts:**
  - FormData with `image_file` field
  - JSON with `{ "image_base64": "..." }`
- **Max Size:** 12MB
- **Response:** PNG image with transparent background
- **Errors:** `402` - Credits exhausted, `413` - Too large, `415` - Unsupported content type, `503` - API not configured

---

### GET `/api/graphics-library?q=business&page=1&per_page=20`

Proxies search requests to the Unsplash API for free stock photos.

- **Auth Required:** No
- **Response (200):** Unsplash search results or empty results with error if API key not configured

---

### POST `/api/remix`

Alternative remix endpoint (simpler than `/api/ai/remix`, fetches user API key from database).

- **Auth Required:** Yes
- **Request Body:** `{ "content": "...", "tone": "match-my-style|professional|...", "instructions": "optional" }`
- **Response (200):** `{ "remixedContent": "...", "originalContent": "...", "tokensUsed": { ... }, "model": "..." }`

---

### GET `/api/mentions/search?q=searchterm`

Searches local connections for @mention autocomplete (fallback when Chrome extension is unavailable).

- **Auth Required:** Yes
- **Response (200):**
  ```json
  {
    "results": [{
      "name": "John Doe",
      "urn": "urn:li:person:abc123",
      "headline": "CEO at Company",
      "avatarUrl": "https://...",
      "publicIdentifier": "johndoe"
    }]
  }
  ```
- **Features:** SQL-based search via RPC with JS fallback. Extracts Voyager MiniProfile data from stored connections.

---

## Common Error Responses

All endpoints follow a consistent error format:

```json
{
  "error": "Human-readable error message",
  "code": "optional_error_code",
  "details": "optional additional details"
}
```

### Standard HTTP Status Codes

| Code | Meaning |
|------|---------|
| `400` | Bad Request - Invalid input or missing required fields |
| `401` | Unauthorized - Authentication required or invalid credentials |
| `402` | Payment Required - API quota exceeded |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Resource does not exist |
| `409` | Conflict - Duplicate resource or state conflict |
| `413` | Payload Too Large - File/content exceeds size limit |
| `415` | Unsupported Media Type |
| `422` | Unprocessable Entity - Validation failed |
| `429` | Too Many Requests - Rate limited |
| `500` | Internal Server Error |
| `503` | Service Unavailable - External service not configured |
| `504` | Gateway Timeout - External API timeout |
