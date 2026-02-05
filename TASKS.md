# ChainLinked Development Tasks

## Workflow Rules
See [RULES.md](./RULES.md) for the development workflow.

---

## Task List

### Task 1: Partial Loading with Placeholders for Slow Data Fetches
**Status:** Completed
**Priority:** High
**Description:**
Enhance UX by implementing partial loading with skeleton placeholders during slow data fetches to prevent user drop-offs.

**Acceptance Criteria:**
- [x] Create a `PartialLoader` component that shows skeleton while data loads
- [x] Implement progressive loading for dashboard page (already exists)
- [x] Add staggered skeleton animations for better perceived performance
- [x] Implement loading states for:
  - Team activity feed (already exists)
  - Analytics cards (already exists)
  - Calendar section (already exists)
  - Goals tracker (already exists)
- [x] Add error boundaries with retry buttons (already exists)
- [ ] Test on slow networks (throttled 3G)

**Files Created/Modified:**
- Created: `components/ui/partial-loader.tsx` - PartialLoader, AnimatedSkeleton, StaggeredContainer
- Verified: `components/error-boundary.tsx` - Already has retry functionality
- Verified: `app/dashboard/page.tsx` - Already has component-level loading states
- Verified: `components/features/team-activity-feed.tsx` - Already has skeleton loading

---

### Task 2: Chrome Extension Installation Prompt at Login
**Status:** Pending
**Priority:** High
**Description:**
Add a confirmation popup prompting users to install the Chrome extension if missing at login.

**Acceptance Criteria:**
- [ ] Create extension detection utility
- [ ] Create `ExtensionInstallPrompt` dialog component
- [ ] Show popup after successful login if extension not detected
- [ ] Store "don't show again" preference in localStorage
- [ ] Add link to Chrome Web Store
- [ ] Track conversion metrics for extension installs

**Files to Modify:**
- `app/login/page.tsx`
- Create: `lib/extension/detect.ts`
- Create: `components/features/extension-install-prompt.tsx`

---

### Task 3: Extension Capture Verification
**Status:** Pending
**Priority:** Medium
**Description:**
Verify the Chrome extension is capturing all LinkedIn data correctly and completely.

**Acceptance Criteria:**
- [ ] Review `auto-capture.ts` for capture completeness
- [ ] Verify all page types are captured:
  - Creator analytics
  - Post analytics
  - Audience demographics
  - Profile views
  - Company analytics
  - Content calendar
  - Profile data
- [ ] Check data validation is working
- [ ] Verify retry mechanism for failed captures
- [ ] Test capture on each LinkedIn page type
- [ ] Document any missing data points

**Files to Review:**
- `extension/src/content/auto-capture.ts`
- `extension/src/content/dom-extractor.ts`
- `extension/src/content/company-extractor.ts`
- `extension/src/shared/validators.ts`

---

### Task 4: Front-End Quality Audit
**Status:** Pending
**Priority:** Medium
**Description:**
Audit the front-end for quality, UX issues, and potential improvements.

**Acceptance Criteria:**
- [ ] Check all pages load without console errors
- [ ] Verify responsive design on mobile/tablet/desktop
- [ ] Test dark mode on all pages
- [ ] Verify accessibility (focus states, aria labels)
- [ ] Check loading states are consistent
- [ ] Verify error states are handled gracefully
- [ ] Test form validation
- [ ] Check for TypeScript errors

**Pages to Audit:**
- Dashboard
- Compose
- Schedule
- Templates
- Inspiration
- Analytics
- Team
- Settings
- Login/Signup

---

## Completed Tasks

### Task 1 - Partial Loading (2026-02-05)
- Created `components/ui/partial-loader.tsx` with:
  - `PartialLoader` - Progressive loading wrapper with delay handling
  - `AnimatedSkeleton` - Skeleton with shimmer effect
  - `StaggeredContainer` / `StaggeredItem` - For progressive reveal
- Verified existing infrastructure already has:
  - Component-level loading states in dashboard
  - Skeleton components in team-activity-feed
  - ErrorBoundary with retry functionality
  - Shimmer animation in globals.css

---

## Notes

### Scoring Analysis (Read-Only Report)

**Current Implementation:**

1. **Swipe Interface Suggestions:**
   - `estimatedEngagement` scores (70-95) are **AI-predicted** values
   - Generated via `lib/ai/suggestion-prompts.ts`
   - Based on content category and AI analysis
   - NOT based on actual user/team post performance

2. **User Posts (from Extension):**
   - Raw metrics captured: `impressions`, `reactions`, `comments`, `reposts`
   - Stored in `my_posts` and `inspiration_posts` tables
   - `engagement_score` field exists but not consistently calculated

3. **Team Posts:**
   - `useTeamPosts` hook fetches from `my_posts` table
   - Displays raw metrics only
   - No engagement scoring applied

**Recommendation:**
Consider implementing a calculated engagement score for actual posts:
```
engagement_rate = ((reactions + comments + reposts) / impressions) * 100
```

---

*Last Updated: 2026-02-05*
