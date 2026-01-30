# Swipe Feature - AI-Generated Content Implementation Plan

## Executive Summary

Transform the static swipe section into a dynamic, AI-powered content suggestion system that generates personalized LinkedIn post ideas based on the user's company context from onboarding.

---

## 1. Current State Analysis

### 1.1 What Exists

**Database Tables:**
- `company_context` - Rich AI-extracted company data from onboarding:
  - `value_proposition` - Core value proposition
  - `company_summary` - Company overview
  - `products_and_services` (JSONB) - Products with descriptions
  - `target_audience` (JSONB) - Industries, company size, roles, pain points
  - `tone_of_voice` (JSONB) - Brand voice descriptors, writing style, examples
  - `brand_colors` (JSONB) - Brand color palette
  - `industry` - Company industry
- `inspiration_posts` - External viral posts (currently used by swipe)
- `swipe_preferences` - Records user swipe actions
- `scheduled_posts` - For scheduling posts

**Current Swipe Implementation:**
- Uses `inspiration_posts` table (external content, not personalized)
- Records swipe actions to `swipe_preferences`
- Has remix and edit-and-post functionality
- Good UI with animations, keyboard support, touch gestures

**Inngest Setup:**
- Working `company/analyze` workflow as a template
- Multi-step orchestration pattern established
- Status tracking in database

**AI Capabilities:**
- 9 post type templates (Story, Listicle, How-To, etc.)
- Tone-based generation (professional, casual, inspiring, etc.)
- Company context integration in prompts
- OpenRouter/OpenAI integration

### 1.2 What's Missing

1. **No personalized content generation** - Swipe uses generic inspiration_posts
2. **No wishlist/queue** - Users can't save liked suggestions for later
3. **No Inngest workflow** for generating personalized suggestions
4. **No database table** for AI-generated suggestions per user

---

## 2. Architecture Design

### 2.1 New Database Schema

#### Table: `generated_suggestions`
Stores AI-generated post suggestions personalized to each user.

```sql
CREATE TABLE generated_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Content
  content TEXT NOT NULL,
  post_type VARCHAR(50), -- 'story', 'listicle', 'how-to', etc.
  tone VARCHAR(50), -- 'professional', 'casual', etc.
  category VARCHAR(100), -- Topic category for filtering

  -- Generation metadata
  prompt_context JSONB, -- Snapshot of company context used
  generation_batch_id UUID, -- Groups suggestions from same generation run
  estimated_engagement INTEGER CHECK (estimated_engagement >= 0 AND estimated_engagement <= 100),

  -- Status tracking
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'used', 'dismissed', 'expired')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  used_at TIMESTAMPTZ,

  -- Indexes for performance
  CONSTRAINT unique_content_per_user UNIQUE (user_id, content)
);

-- Indexes
CREATE INDEX idx_generated_suggestions_user_status ON generated_suggestions(user_id, status);
CREATE INDEX idx_generated_suggestions_batch ON generated_suggestions(generation_batch_id);
CREATE INDEX idx_generated_suggestions_expires ON generated_suggestions(expires_at) WHERE status = 'active';

-- RLS Policies
ALTER TABLE generated_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own suggestions"
  ON generated_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own suggestions"
  ON generated_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can insert (for Inngest)
CREATE POLICY "Service role can insert suggestions"
  ON generated_suggestions FOR INSERT
  WITH CHECK (true);
```

#### Table: `swipe_wishlist`
Stores liked suggestions for later review, scheduling, or posting.

```sql
CREATE TABLE swipe_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suggestion_id UUID REFERENCES generated_suggestions(id) ON DELETE SET NULL,

  -- Content (stored separately for when suggestion is deleted)
  content TEXT NOT NULL,
  post_type VARCHAR(50),
  category VARCHAR(100),

  -- User actions
  notes TEXT, -- User's personal notes
  is_scheduled BOOLEAN DEFAULT FALSE,
  scheduled_post_id UUID REFERENCES scheduled_posts(id) ON DELETE SET NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'saved' CHECK (status IN ('saved', 'scheduled', 'posted', 'removed')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_wishlist_item UNIQUE (user_id, content)
);

-- Indexes
CREATE INDEX idx_swipe_wishlist_user_status ON swipe_wishlist(user_id, status);

-- RLS Policies
ALTER TABLE swipe_wishlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own wishlist"
  ON swipe_wishlist FOR ALL
  USING (auth.uid() = user_id);
```

#### Table: `suggestion_generation_runs`
Tracks generation job runs for audit and debugging.

```sql
CREATE TABLE suggestion_generation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Run metadata
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  suggestions_requested INTEGER DEFAULT 10,
  suggestions_generated INTEGER DEFAULT 0,

  -- Context used
  company_context_id UUID REFERENCES company_context(id),
  post_types_used TEXT[], -- Which post types were used

  -- Tracking
  inngest_run_id VARCHAR(255),
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  CONSTRAINT unique_pending_run UNIQUE (user_id, status)
    WHERE status IN ('pending', 'generating')
);

-- RLS Policies
ALTER TABLE suggestion_generation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own runs"
  ON suggestion_generation_runs FOR SELECT
  USING (auth.uid() = user_id);
```

### 2.2 Inngest Workflow Design

#### Event: `swipe/generate-suggestions`

**Trigger Conditions:**
- User explicitly clicks "Refresh" / "Generate New Ideas"
- User first accesses swipe page with 0 active suggestions
- NOT auto-triggered when count drops below threshold

**Workflow Steps:**

```
Step 1: Validate & Prepare
├── Check if user has completed onboarding
├── Fetch company_context for the user
├── Check active suggestion count (abort if >= 10)
├── Create suggestion_generation_run record
└── Update status to 'generating'

Step 2: Generate Content Ideas (via OpenAI)
├── Build prompt with company context:
│   ├── Value proposition
│   ├── Products/services
│   ├── Target audience & pain points
│   ├── Tone of voice
│   └── Industry
├── Request 10 diverse post ideas
├── Specify mixed post types (2 stories, 2 listicles, 2 how-tos, etc.)
└── Include engagement prediction

Step 3: Expand Each Idea (parallel or batched)
├── For each idea, generate full post content
├── Apply user's tone of voice
├── Add appropriate hooks and CTAs
├── Estimate engagement score (70-95 range for generated)
└── Categorize by topic

Step 4: Save Results
├── Insert into generated_suggestions
├── Mark generation run as completed
└── Return success with count

Step 5: Send Notification Event
└── Emit 'swipe/suggestions-ready' event
```

### 2.3 API Endpoints

#### `POST /api/swipe/generate`
Triggers new suggestion generation.

```typescript
// Request
{ force?: boolean } // Force regeneration even if suggestions exist

// Response
{
  success: boolean,
  runId: string,
  status: 'pending' | 'generating' | 'completed',
  message: string
}
```

#### `GET /api/swipe/suggestions`
Fetches active suggestions for the user.

```typescript
// Query params
?status=active&limit=10&offset=0

// Response
{
  suggestions: GeneratedSuggestion[],
  total: number,
  hasMore: boolean,
  canGenerate: boolean // True if < 10 active suggestions
}
```

#### `GET /api/swipe/generation-status`
Polls generation status.

```typescript
// Query params
?runId=uuid

// Response
{
  status: 'pending' | 'generating' | 'completed' | 'failed',
  progress: number, // 0-100
  suggestionsGenerated: number,
  error?: string
}
```

#### `POST /api/swipe/wishlist`
Add suggestion to wishlist.

```typescript
// Request
{
  suggestionId: string,
  content: string,
  postType?: string,
  category?: string
}

// Response
{ success: boolean, wishlistItemId: string }
```

#### `GET /api/swipe/wishlist`
Get user's wishlist items.

```typescript
// Query params
?status=saved&limit=20

// Response
{
  items: WishlistItem[],
  total: number
}
```

#### `POST /api/swipe/wishlist/:id/schedule`
Schedule a wishlist item.

```typescript
// Request
{
  scheduledFor: string, // ISO datetime
  timezone: string,
  visibility: 'PUBLIC' | 'CONNECTIONS'
}

// Response
{ success: boolean, scheduledPostId: string }
```

### 2.4 Hook Updates

#### New Hook: `useGeneratedSuggestions`
Replaces `useSwipeSuggestions` for the swipe interface.

```typescript
interface UseGeneratedSuggestionsReturn {
  // Suggestions
  suggestions: GeneratedSuggestion[]
  remainingSuggestions: GeneratedSuggestion[]

  // Loading states
  isLoading: boolean
  isGenerating: boolean
  generationProgress: number

  // Actions
  generateNew: () => Promise<void>
  markAsUsed: (id: string) => void
  dismissSuggestion: (id: string) => void

  // Status
  canGenerate: boolean // True if < 10 active
  activeCount: number
  error: string | null
}
```

#### New Hook: `useSwipeWishlist`
Manages the wishlist functionality.

```typescript
interface UseSwipeWishlistReturn {
  // Items
  items: WishlistItem[]

  // Loading
  isLoading: boolean

  // Actions
  addToWishlist: (suggestion: GeneratedSuggestion) => Promise<boolean>
  removeFromWishlist: (id: string) => Promise<boolean>
  scheduleFromWishlist: (id: string, scheduleOptions: ScheduleOptions) => Promise<boolean>

  // Counts
  totalItems: number
  scheduledCount: number
}
```

---

## 3. UI/UX Design

### 3.1 Swipe Page Updates

**Header Section:**
- Show active suggestion count badge
- "Generate Ideas" button (disabled if >= 10 or generating)
- Generation progress indicator when active

**Card Stack:**
- Display `generated_suggestions` instead of `inspiration_posts`
- Show post type badge (Story, Listicle, etc.)
- Show estimated engagement score
- Visual indicator for "personalized for you"

**Swipe Actions:**
- **Swipe Right (Like)**: Add to wishlist, show toast, mark as used
- **Swipe Left (Skip)**: Mark as dismissed
- **Edit & Post**: Navigate to composer with content
- **Remix**: Open remix dialog

**Empty State:**
- When no suggestions: Show "Generate Ideas" CTA
- When generating: Show progress animation
- When failed: Show error with retry button

### 3.2 New Wishlist View

**Location:** Tab in swipe page or dedicated route `/dashboard/swipe/wishlist`

**Features:**
- List view of saved suggestions
- Quick actions: Schedule, Edit & Post, Remove
- Schedule picker inline or modal
- Sort by: Date added, Category, Engagement score
- Filter by: Status (saved, scheduled), Category

### 3.3 Schedule Flow

**From Swipe Card:**
1. User swipes right → Added to wishlist
2. Toast appears: "Added to wishlist - Schedule now?"
3. Quick schedule modal or link to wishlist

**From Wishlist:**
1. User clicks "Schedule" on item
2. Schedule modal opens with date/time picker
3. Creates scheduled_posts entry
4. Updates wishlist item status to 'scheduled'

---

## 4. AI Generation Prompts

### 4.1 Content Ideas Generation Prompt

```typescript
const CONTENT_IDEAS_SYSTEM_PROMPT = `You are a LinkedIn content strategist creating personalized post ideas.

Based on the company context provided, generate 10 diverse LinkedIn post ideas that:
1. Align with the company's value proposition and products
2. Address the target audience's pain points
3. Match the brand's tone of voice
4. Cover a mix of content types

Return a JSON array with the following structure for each idea:
[
  {
    "postType": "story" | "listicle" | "how-to" | "case-study" | "contrarian" | "question" | "data-driven",
    "topic": "Brief topic description",
    "hook": "The opening hook sentence",
    "keyPoints": ["Point 1", "Point 2", "Point 3"],
    "estimatedEngagement": 70-95,
    "category": "Leadership" | "Product" | "Industry Insights" | "Customer Success" | "Culture" | "Tips & Tricks"
  }
]

Ensure diversity in post types and topics. Focus on ideas that would genuinely help the target audience.`
```

### 4.2 Post Expansion Prompt

```typescript
const POST_EXPANSION_PROMPT = `You are writing a LinkedIn post in the voice of {companyName}.

Tone guidelines:
{toneDescriptors}
Writing style: {writingStyle}
Example phrases to emulate: {examples}

Post specifications:
- Type: {postType}
- Topic: {topic}
- Hook: {hook}
- Key points to cover: {keyPoints}

Target audience:
- Industries: {industries}
- Roles: {roles}
- Pain points: {painPoints}

Write a complete LinkedIn post (400-800 characters for short, 800-1500 for medium).
Include:
- Compelling opening hook (first 1-2 lines)
- Value-packed content
- Clear call-to-action
- 3-5 relevant hashtags

Format with line breaks for readability. Use bullet points or numbers where appropriate.
Return ONLY the post content, no additional commentary.`
```

---

## 5. Implementation Tasks

### Phase 1: Database & Infrastructure (Priority: Critical)

#### Task 1.1: Create Database Migration
**File:** `supabase/migrations/20250130_create_swipe_suggestions.sql`
- Create `generated_suggestions` table
- Create `swipe_wishlist` table
- Create `suggestion_generation_runs` table
- Add RLS policies
- Add indexes

#### Task 1.2: Update Database Types
**File:** `types/database.ts`
- Add TypeScript types for new tables
- Add helper type aliases

### Phase 2: Inngest Workflow (Priority: Critical)

#### Task 2.1: Create Inngest Client Events
**File:** `lib/inngest/client.ts`
- Add `swipe/generate-suggestions` event type
- Add `swipe/suggestions-ready` event type

#### Task 2.2: Create Generation Workflow
**File:** `lib/inngest/functions/generate-suggestions.ts`
- Implement multi-step workflow
- Fetch company context
- Generate content ideas
- Expand each idea
- Save to database

#### Task 2.3: Register Workflow
**File:** `app/api/inngest/route.ts`
- Add new workflow to serve function

### Phase 3: AI Prompts (Priority: High)

#### Task 3.1: Create Suggestion Prompts
**File:** `lib/ai/suggestion-prompts.ts`
- Content ideas generation prompt
- Post expansion prompt
- Company context formatting utilities

### Phase 4: API Endpoints (Priority: High)

#### Task 4.1: Create Generation Trigger API
**File:** `app/api/swipe/generate/route.ts`
- POST handler to trigger generation
- Validation and rate limiting

#### Task 4.2: Create Suggestions API
**File:** `app/api/swipe/suggestions/route.ts`
- GET handler for fetching suggestions
- Status filtering and pagination

#### Task 4.3: Create Generation Status API
**File:** `app/api/swipe/generation-status/route.ts`
- GET handler for polling generation progress

#### Task 4.4: Create Wishlist API
**File:** `app/api/swipe/wishlist/route.ts`
- CRUD operations for wishlist items

#### Task 4.5: Create Wishlist Schedule API
**File:** `app/api/swipe/wishlist/[id]/schedule/route.ts`
- POST handler for scheduling wishlist items

### Phase 5: React Hooks (Priority: High)

#### Task 5.1: Create Generated Suggestions Hook
**File:** `hooks/use-generated-suggestions.ts`
- Fetch and manage generated suggestions
- Generation trigger and polling
- Mark as used/dismissed

#### Task 5.2: Create Wishlist Hook
**File:** `hooks/use-swipe-wishlist.ts`
- CRUD operations for wishlist
- Schedule integration

### Phase 6: UI Components (Priority: Medium)

#### Task 6.1: Update Swipe Page
**File:** `app/dashboard/swipe/page.tsx`
- Use new `useGeneratedSuggestions` hook
- Add generation button and progress
- Update empty state

#### Task 6.2: Create Wishlist View Component
**File:** `components/features/swipe-wishlist.tsx`
- List view of wishlist items
- Quick actions (schedule, edit, remove)
- Schedule modal integration

#### Task 6.3: Create Generation Progress Component
**File:** `components/features/generation-progress.tsx`
- Progress bar with status text
- Step indicators
- Error display

#### Task 6.4: Update Swipe Card Component
**File:** `components/features/swipe-card.tsx`
- Add "Personalized" indicator
- Show post type badge
- Add "Add to Wishlist" action

### Phase 7: Integration & Polish (Priority: Medium)

#### Task 7.1: Add Toast Notifications
- Generation started
- Generation completed
- Added to wishlist
- Scheduled successfully

#### Task 7.2: Add Loading Skeletons
- Generation in progress skeleton
- Wishlist loading skeleton

#### Task 7.3: Add Error Handling
- API error boundaries
- Retry mechanisms
- User-friendly error messages

---

## 6. Technical Considerations

### 6.1 Rate Limiting
- Limit to 1 generation run per user per hour
- Max 10 active suggestions per user
- Use `suggestion_generation_runs` table to track

### 6.2 Token Management
- Use user's API key if available (BYOK)
- Fall back to platform API key
- Track token usage per generation

### 6.3 Content Quality
- Generate more suggestions than needed (15) and filter
- Use engagement scoring to rank
- Allow user dismissal for learning

### 6.4 Performance
- Batch API calls for efficiency
- Use parallel step execution where possible
- Implement proper caching for company context

### 6.5 Error Recovery
- Inngest automatic retries (2 attempts)
- Partial save on partial failure
- Clear error messages for user

---

## 7. Success Metrics

### 7.1 Generation Quality
- Average estimated engagement score
- User like rate (swipe right / total)
- Posts that make it to scheduled/posted

### 7.2 Feature Adoption
- Users who generate suggestions
- Suggestions generated per user
- Wishlist usage rate

### 7.3 Conversion
- Suggestions → Composer opens
- Suggestions → Scheduled posts
- Suggestions → Posted content

---

## 8. Future Enhancements

### 8.1 Learning from Preferences
- Use swipe history to personalize generation
- Adjust tone/topics based on likes
- A/B test different prompt strategies

### 8.2 Content Calendar Integration
- Auto-suggest posting times
- Fill gaps in posting schedule
- Seasonal/trending topic suggestions

### 8.3 Team Features
- Shared suggestion pool
- Content approval workflow
- Team engagement analytics

---

## 9. File Structure Summary

```
supabase/migrations/
└── 20250130_create_swipe_suggestions.sql    [NEW]

types/
└── database.ts                               [UPDATE]

lib/inngest/
├── client.ts                                 [UPDATE]
└── functions/
    └── generate-suggestions.ts               [NEW]

lib/ai/
└── suggestion-prompts.ts                     [NEW]

app/api/
├── inngest/route.ts                          [UPDATE]
└── swipe/
    ├── generate/route.ts                     [NEW]
    ├── suggestions/route.ts                  [NEW]
    ├── generation-status/route.ts            [NEW]
    └── wishlist/
        ├── route.ts                          [NEW]
        └── [id]/
            └── schedule/route.ts             [NEW]

hooks/
├── use-generated-suggestions.ts              [NEW]
└── use-swipe-wishlist.ts                     [NEW]

components/features/
├── swipe-wishlist.tsx                        [NEW]
├── generation-progress.tsx                   [NEW]
└── swipe-card.tsx                            [UPDATE]

app/dashboard/swipe/
├── page.tsx                                  [UPDATE]
└── wishlist/
    └── page.tsx                              [NEW]
```

---

## 10. Execution Order

1. **Database Migration** - Create tables first (blocks everything)
2. **Database Types** - Update TypeScript types
3. **AI Prompts** - Create prompt templates
4. **Inngest Workflow** - Create generation logic
5. **API Endpoints** - Create all endpoints
6. **React Hooks** - Create frontend data hooks
7. **UI Components** - Update swipe page and create new components
8. **Integration Testing** - End-to-end flow validation
9. **Polish** - Toast notifications, loading states, error handling

---

*Document Version: 1.0*
*Created: 2025-01-30*
*Status: Ready for Implementation*
