# Comprehensive Testing To-Do List

## Status Legend
- [ ] Not Started
- [x] Completed
- [!] Issue Found & Fixed
- [?] Feature Gap Identified

---

## 1. Wishlist Collections Feature
- [x] Understand wishlist collection structure
- [x] Test creating a new custom collection
  - **RESULT**: Created "🚀 AI Content Ideas" collection with icon and color
  - **UI**: Clean dialog with name, 12 emoji icons, 8 color choices
- [x] Test moving items between collections
  - **RESULT**: Moved item from "All Saved" to "AI Content Ideas" via context menu
  - **UI**: Hover submenu shows all collections with checkmarks for current
- [ ] Test collection deletion
- [!] Verify database sync for collections
  - **ISSUE**: Items were being saved with `collection_id: null` instead of default collection
  - **FIX**: Updated API route to auto-assign default collection when none specified
  - **FIX**: Fixed 7 orphaned items in database via SQL migration

## 2. Deep Research Feature
- [x] Locate deep research feature
  - **LOCATION**: `/dashboard/discover` page, "Deep Research" button
- [x] Test deep research functionality
  - **WORKFLOW**: Tavily → Perplexity → GPT-4 (full AI pipeline)
  - **RESULT**: Searched "AI trends in B2B sales 2026"
- [x] Evaluate quality of generated posts
  - **QUALITY**: Excellent - 15 posts generated from 19 source articles
  - **CATEGORIES**: Thought Leadership, Educational, Storytelling
  - **LENGTH**: 163-227 words each, well-structured with hooks
  - **SOURCES**: LinkedIn, Mirakl, commercetools, b2bmarketingeast, blueflamethinking
- [x] Document findings
  - **FEATURES**: Copy, Remix, Save buttons on each post
  - **TABS**: "Generated Posts" and "Source Articles" views
  - **ASSESSMENT**: Production-ready, high-quality content generation

## 3. Post Quality Evaluation
- [x] Review AI suggestion quality
  - **Personal Story**: 10/10 hook, vivid sensory details, proper structure
  - **Listicle**: 9/10 hook, odd number items (7), bold titles with explanations
- [x] Check post formatting and structure
  - **Formatting**: Double line breaks, short paragraphs, mobile-friendly
  - **Bold text**: Used strategically for key phrases and list item titles
  - **Hashtags**: 5 relevant tags at the end (not spammy)
- [ ] Evaluate engagement score accuracy
- [x] Test remix quality with different styles (tested previously)

## 4. Compose Page & Prompt Improvement
- [x] Analyze current compose prompts
  - **File**: `lib/ai/prompt-templates.ts`
  - **Structure**: BASE_RULES + TYPE_PROMPTS for 9 post types
- [x] Review AI generation prompts
  - **Improved**: Added proven hook patterns (Bold statement, Question, Contrarian, Story opener)
  - **Added**: Banned phrases list ("I'm excited to announce", "Let's dive in", etc.)
  - **Added**: Quality standards (write like talking to ONE person, be specific, show don't tell)
- [x] Improve prompts for better output
  - **Hook Formulas**: 6 proven patterns added to BASE_RULES
  - **Story prompt**: Detailed 7-part structure with sensory details guidance
  - **Listicle prompt**: Odd numbers, bold titles, standalone items
- [x] Test improved prompts
  - **Test 1 - Personal Story**: "Startup failure" topic → Excellent hook ("My hands tremble..."), vivid storytelling, 1,538 chars
  - **Test 2 - Listicle**: "7 productivity habits" → Proper structure, actionable items, bonus tip, 1,823 chars
  - **Assessment**: Both posts are high-quality, no banned phrases, proper formatting

## 5. LinkedIn Posts & Tone Matching
- [x] Check if extension saves LinkedIn posts
- [x] Query my_posts table for captured posts
- [?] Verify tone matching uses actual posts
- [ ] Test remix with "Match My Style"
  - **FINDING**: Extension does NOT capture user's actual LinkedIn posts
  - **REASON**: The auto-capture only captures analytics data, not post content
  - **IMPACT**: "Match My Style" cannot use real posts - `my_posts` table is empty
  - **RECOMMENDATION**: Add post content capture to extension

## 6. Onboarding Flow
- [x] Understand onboarding steps
- [x] Check database tables for onboarding data
- [x] Verify onboarding state sync
- [x] Test onboarding completion status
  - **STATUS**: User has `onboarding_completed: true`, `onboarding_step: 6`
  - **DATA**: Company context is complete (HigherOps, Finance/Fintech)

## 7. Page-by-Page Testing
- [x] Dashboard page - all buttons/features
- [x] Analytics page - all charts/exports
- [x] Compose page - all formatting options + AI generation tested
- [x] Schedule page - calendar interactions
- [x] Templates page - CRUD operations
- [x] Team page - all tabs
- [x] Settings page - all tabs
- [x] Discover page - Deep Research tested
- [ ] Inspiration page
- [ ] Carousels page
- [ ] Prompt Playground page
- [x] Swipe page - tested swipe, save, remix
- [x] Wishlist page - tested view, collections

## 9. UX Improvements Made
- [x] Moved Settings & Help to profile dropdown
  - **Before**: Appeared both in sidebar AND profile dropdown (duplicate)
  - **After**: Only in profile dropdown when clicking user avatar
  - **Files Changed**: `components/app-sidebar.tsx`
- [x] Redesigned sidebar with modern collapsible sections
  - **Reference**: `e:/agiready/saas` sidebar design
  - **Features Added**:
    - Framer Motion AnimatePresence for smooth collapse/expand animations
    - Tree connector lines showing visual hierarchy (like VS Code)
    - Section headers with chevron rotation (90° on open)
    - Controlled state for collapsible sections
    - Compact layout with better spacing
    - Quick Create button prominently displayed
  - **Files Changed**: `components/app-sidebar.tsx` (complete rewrite)
  - **Unused Components**: `nav-content.tsx`, `nav-main.tsx` (can be removed)
- [x] Sidebar is clean and uncluttered
  - **Main nav**: Dashboard, Analytics, Compose, Schedule, Team
  - **Content section**: Templates, Prompt Playground, Inspiration, Discover, Swipe, Carousels
  - **Profile dropdown**: Settings, Help, Log out

## 8. Extension Data Capture
- [x] Check captured LinkedIn analytics
  - **RESULT**: 5 records from Jan 30 with impressions (0-144)
- [?] Verify post capture functionality
  - **FINDING**: Extension does NOT capture post content
  - **FINDING**: Only captures post analytics (impressions, reactions, etc.)
- [x] Check audience data capture (captured via analytics)
- [x] Review sync metadata

---

## Issues Found & Fixed

### 1. Foreign Key Violation on Swipe Preferences (Error 23503)
- **File**: `hooks/use-swipe-actions.ts`
- **Issue**: `post_id` was being set to AI suggestion IDs which don't exist in posts tables
- **Fix**: Set `post_id: null` for AI suggestions, use `suggestion_content` for learning

### 2. Wishlist Items Not Assigned to Collections
- **File**: `app/api/swipe/wishlist/route.ts`
- **Issue**: Items saved with `collection_id: null` instead of default "All Saved" collection
- **Fix**: Modified POST handler to fetch and assign user's default collection automatically
- **Database Fix**: Updated 7 orphaned items to link to "All Saved" collection

### 3. Remix Dialog Shows Truncated Content
- **Files**: `components/features/remix-dialog.tsx`, `components/features/remix-modal.tsx`
- **Issue**: Original post preview was truncated, showing only half the content
  - `remix-dialog.tsx`: Used `line-clamp-6` limiting to 6 lines
  - `remix-modal.tsx`: Used `truncateContent(originalContent, 500)` limiting to 500 chars
- **Fix**:
  - Removed `line-clamp-6` from remix-dialog.tsx
  - Removed `truncateContent()` call from remix-modal.tsx
  - Increased preview height from `max-h-32` to `max-h-48` for better visibility
  - Full content now scrollable in preview area
- **Verified**: 2026-02-06 via Playwright MCP - Full post content (4 sections, 18+ bullet points) now displays in scrollable preview

---

## Feature Gaps Identified

### 1. No LinkedIn Post Content Capture
- **Current State**: Extension captures analytics but not actual post content
- **Impact**: Cannot match user's writing style, `my_posts` table is empty
- **Recommendation**: Add pattern to capture posts from `/in/{user}/recent-activity/` or feed

---

*Last Updated: 2026-02-06 (Remix dialog fix verified via Playwright)*
