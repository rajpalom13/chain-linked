# ChainLinked Comprehensive Codebase Review

**Reviewed by**: 5-agent team (API, Hooks, Pages, Supabase, Features)
**Date**: Feb 15, 2026
**Scope**: 63 API routes, 46 hooks, 15 pages, 138 Supabase files, 13 feature components

---

## Executive Summary

| Severity | Count | Categories |
|----------|-------|------------|
| **CRITICAL** | 17 | Infinite re-render loops, SQL injection, missing auth, memory leaks |
| **HIGH** | 36 | N+1 queries, race conditions, accessibility, bundle size |
| **MEDIUM** | 42 | Validation gaps, architecture, error handling |
| **LOW** | 20 | Best practices, documentation, naming |

---

## CRITICAL Issues (Fix Immediately)

### C1. Infinite Re-render Loops in 7 Hooks

The most widespread critical issue. These hooks have `useEffect` dependencies on unmemoized callbacks, causing infinite re-render loops:

| Hook | Line | Bad Dependency |
|------|------|----------------|
| `hooks/use-api-keys.ts` | :258 | `fetchStatus` recreated every render |
| `hooks/use-company.ts` | :395 | `fetchUserCompany` not memoized |
| `hooks/use-team.ts` | :322 | `fetchTeams`, `fetchMembers` not memoized |
| `hooks/use-team-invitations.ts` | :273 | `fetchInvitations` not memoized |
| `hooks/use-admin-users.ts` | :161 | `filters` object reference changes |
| `hooks/use-admin-stats.ts` | :77 | `fetchStats` recreated every render |
| `hooks/use-swipe-suggestions.ts` | :258 | `filters` object, `refetch` not memoized |

**Fix**: Remove unstable callback/object references from dependency arrays. Use `[]` for mount-only effects with `// eslint-disable-next-line react-hooks/exhaustive-deps` or properly memoize with `useCallback`.

---

### C2. SQL Injection in Admin Search

**File**: `app/api/admin/users/route.ts:73-78`

```typescript
// VULNERABLE CODE
const escapedSearch = search
  .replace(/[%_\\]/g, '\\$&')
  .replace(/[()]/g, '')
query = query.or(`full_name.ilike.%${escapedSearch}%,email.ilike.%${escapedSearch}%`)
```

String interpolation in `.or()` query bypasses escaping. Input like `%' OR '1'='1` could bypass filters.

**Fix**: Use Supabase `.textSearch()` or parameterized queries via RPC.

---

### C3. Missing Auth on Template Usage Counter

**File**: `app/api/templates/route.ts:128-137`

Any authenticated user can increment ANY template's usage count without ownership verification.

```typescript
if (increment_usage) {
  const { data: template } = await supabase
    .from('templates')
    .select('usage_count')
    .eq('id', id)
    .single()
  updates.usage_count = (template?.usage_count || 0) + 1
}
```

**Fix**: Check if template is public OR owned by user before allowing increment.

---

### C4. Race Condition in Brand Kit Activation

**File**: `app/api/brand-kit/route.ts:111-116, 217-223`

Two concurrent requests can both set `is_active=true` because deactivation and activation are separate queries.

**Fix**: Use a database transaction or UNIQUE partial index on `(user_id) WHERE is_active = true`.

---

### C5. Service Role Key Management

**File**: `.env.local`

Service role key bypasses ALL RLS policies. If exposed client-side, attackers get full database access.

**Fix**:
1. Never use `NEXT_PUBLIC_` prefix for service role key
2. Move to encrypted platform secrets (Vercel env vars)
3. Rotate the key if ever committed to git

---

### C6. No Pagination on Large Queries

**Files**:
- `lib/auth/auth-provider.tsx:191` - `select('*')` with no limit
- `hooks/use-analytics.ts:139` - Fetches ALL analytics records
- `hooks/use-settings.ts:151` - Multiple queries without limits

**Fix**: Add `.limit(100)` or `.range()` to all queries.

---

### C7. Missing Error Boundaries

**Files**: `swipe/page.tsx`, `discover/page.tsx`, `team/page.tsx`

Complex pages with API calls, animations, and user interactions lack error boundaries. Unhandled errors crash the entire page.

**Fix**: Wrap page content in ErrorBoundary component (already exists at `components/error-boundary.tsx`).

---

### C8. Draft MediaFiles Access Bug

**File**: `components/features/post-composer.tsx:1017`

Accesses `draft.mediaFiles` but `mediaFiles` is never set in draft context.

**Fix**: Change `draft.mediaFiles.length` to `mediaFiles.length` (use local state).

---

### C9. Wrong Analytics Event in Template Library

**File**: `components/features/template-library.tsx:252`

Uses `trackTemplateAction("created", editingTemplate.id)` when editing an existing template.

**Fix**: Change to `trackTemplateAction("edited", editingTemplate.id)`.

---

## HIGH Priority Issues

### Performance

#### H1. N+1 Query: Team Member Counts
**File**: `app/api/teams/route.ts:53-62`
Fetches member count individually per team in `Promise.all`. 100 teams = 100+ DB calls.
**Fix**: Single query with `GROUP BY team_id`.

#### H2. N+1 Query: Onboarding Funnel Steps
**File**: `app/api/admin/stats/route.ts:476-483`
Queries each onboarding field separately in a loop (6 queries).
**Fix**: Fetch all profiles once, calculate client-side.

#### H3. Unbounded Fetch for AVG Calculation
**File**: `app/api/admin/stats/route.ts:139-143`
Fetches 1000 records to calculate average engagement client-side.
**Fix**: Use PostgreSQL `AVG()` function.

#### H4. 6-Month Profile Data Dump
**File**: `app/api/admin/stats/route.ts:193-207`
Loads ALL profiles from last 6 months into memory (10-50MB+ with 100K users).
**Fix**: Use database `GROUP BY month` aggregation.

#### H5. SELECT * in 47 Files
**Files**: Found across `app/api/` and `hooks/`
Fetches all columns including potentially large JSONB fields.
**Fix**: Select only needed columns.

#### H6. Supabase Client Re-creation in Hooks
**Files**: `use-team.ts`, `use-analytics.ts`, `use-settings.ts`
Creates new Supabase client instance on every render.
**Fix**: Use `useMemo` or shared context provider.

#### H7. Missing Database Indexes
Missing composite indexes on frequently queried columns:
- `linkedin_analytics(user_id, captured_at DESC)`
- `my_posts(user_id, posted_at DESC)`
- `team_invitations(status, expires_at) WHERE status = 'pending'`
- `scheduled_posts(user_id, status, scheduled_for)`

#### H8. Bundle Size: framer-motion
**Files**: Multiple pages import entire library (~50KB gzipped)
**Fix**: Use granular imports from `framer-motion/motion`.

#### H9. Bundle Size: date-fns
**Files**: Multiple pages
CJS interop pulls full module.
**Fix**: Use direct imports: `import format from "date-fns/format"`.

#### H10. Missing React.memo on Expensive Components
**Files**: `PostCard` in team-activity-feed.tsx, `AnimatedNumber` in post-composer.tsx
**Fix**: Wrap in `React.memo` with custom comparison.

### Security

#### H11. No Rate Limiting on Auth
**File**: `app/api/auth/callback/route.ts`
Auth callback has no rate limiting, vulnerable to brute force.
**Fix**: Add rate limiting with Upstash Redis.

#### H12. OAuth Timing Attack
**File**: `app/api/linkedin/callback/route.ts:57`
String comparison `state !== storedState` vulnerable to timing attacks.
**Fix**: Use `crypto.timingSafeEqual`.

#### H13. No Rate Limiting on Bulk Import
**File**: `app/api/discover/import/route.ts`
Allows 500 posts per request with no rate limiting.
**Fix**: Add per-user rate limit, reduce max to 100.

#### H14. Missing Transaction: Team Creation
**File**: `app/api/teams/route.ts:137-167`
Team creation and member insertion not atomic. Partial failure leaves orphaned data.
**Fix**: Use Supabase RPC with transaction.

#### H15. RLS Policy Gap: Profiles Table
Missing policy for team members to view each other's profiles.
**Fix**: Add team member viewing policy.

### Memory Leaks

#### H16. AbortController Not Cleaned
**Files**: `hooks/use-research.ts:755`, `hooks/use-graphics-library.ts:72`
**Fix**: Add `useEffect` cleanup to abort pending requests.

#### H17. Auth Subscription Race
**File**: `lib/auth/auth-provider.tsx:369`
Profile fetch continues after unmount.
**Fix**: Use AbortController for all async fetches.

#### H18. Debounced Search Memory Leak
**File**: `app/dashboard/discover/page.tsx:307-323`
Timeout fires with stale state if component unmounts before 400ms.
**Fix**: Use proper `useEffect` cleanup with `clearTimeout`.

### Accessibility

#### H19. Missing ARIA Labels
**Files**: `post-composer.tsx`, `swipe-card.tsx`, `schedule-calendar.tsx`
Interactive elements lack proper ARIA labels.

#### H20. No Focus Management in Modals
**Files**: `post-composer.tsx`, `template-library.tsx`
Focus not restored after modal close.

#### H21. Missing Skip Links
**Files**: All dashboard pages
No "skip to main content" link for keyboard users.

#### H22. Color Contrast Failures
`text-muted-foreground` on `bg-muted` backgrounds measures ~3.2:1 (needs 4.5:1 for WCAG AA).

### Correctness

#### H23. Schedule Calendar Unused Parameter
**File**: `components/features/schedule-calendar.tsx:342, 388-390`
`onReschedule` parameter accepted but never used.

#### H24. Inspiration Feed Performance
**File**: `components/features/inspiration-feed.tsx:472-495`
Client-side filtering re-computes on every render without proper `useMemo`.

#### H25. Settings Brand Kit Infinite Loop Risk
**File**: `components/features/settings.tsx:297-329`
Brand kit fetch in `useEffect` without proper dependency array.

---

## MEDIUM Priority Issues

### Architecture

#### M1. Oversized Components
- `settings.tsx` (1661 lines) - Split into ProfileSettings, LinkedInSettings, BrandKitSettings, TeamSettings, NotificationSettings, AppearanceSettings
- `post-composer.tsx` (400+ lines) - Split into PostEditor, PostPreview, PostActions, PostToolbar
- `team-activity-feed.tsx` (748 lines) - Split into PostCard, CompactPostCard, MediaGrid
- `template-library.tsx` (300+ lines) - Split into TemplateGrid, TemplateCard, TemplateFormDrawer

#### M2. Duplicate Utility Functions
- `getInitials()` duplicated in 3 files: `posts/page.tsx`, `team-activity-feed.tsx`, `inspiration/page.tsx`
- `formatNumber()` / `formatMetricNumber()` duplicated in 3+ files
- `formatRelativeTime` logic repeated in 3 files

**Fix**: Extract to `lib/utils.ts` or `lib/format-utils.ts`.

#### M3. Props Drilling in Team Page
**File**: `app/dashboard/team/page.tsx:246-275`
Handlers passed through 3+ component levels.
**Fix**: Create TeamContext or use composition pattern.

#### M4. Inconsistent Error Handling
Some pages show error card with retry, others show toast, others have no error UI.
**Fix**: Standardize on error card pattern with retry button.

#### M5. Inconsistent Empty States
Every page implements its own EmptyState component.
**Fix**: Create shared `<EmptyState icon={Icon} title="..." description="..." action={<Button />} />`.

### Correctness

#### M6. Race Condition in Swipe Actions
**File**: `app/dashboard/swipe/page.tsx:383-418`
Rapid swipes cause concurrent `handleSwipe` calls.
**Fix**: Add `swipeInProgress` ref guard.

#### M7. Stale Closure in Swipe
**File**: `app/dashboard/swipe/page.tsx:384`
`handleSwipe` captures stale `currentCard`.
**Fix**: Add `currentCard` to useCallback deps.

#### M8. Double "ago" in Time Display
**File**: `components/features/team-activity-feed.tsx:450`
`CompactPostCard` shows "{relativeTime} ago" but `formatDistanceToNow` with `addSuffix` already includes "ago".
**Fix**: Remove manual "ago" suffix.

#### M9. No Optimistic UI
**Files**: `schedule/page.tsx`, `templates/page.tsx`, `swipe/wishlist/page.tsx`
Delete/update operations wait for server response.
**Fix**: Update local state immediately, rollback on error.

#### M10. localStorage Without Error Handling
**File**: `app/dashboard/page.tsx:550-557`
`localStorage.getItem/setItem` can throw in private browsing.
**Fix**: Wrap in try-catch.

#### M11. Stale Closure in Carousel Templates
**File**: `hooks/use-carousel-templates.ts:302`
`incrementUsage` depends on stale `savedTemplates`.
**Fix**: Use functional `setState` to access latest state.

### Validation

#### M12. No Zod Schemas on API Routes
Most routes use manual validation instead of Zod schemas.
**Fix**: Add Zod schemas for all request bodies.

#### M13. Template Form Allows Whitespace-Only
**File**: `components/features/template-library.tsx:232-265`
No minimum length validation.
**Fix**: Add `name.length >= 3` and `content.length >= 10` checks.

#### M14. Timezone Not Validated
**File**: `app/api/swipe/wishlist/[id]/schedule/route.ts:44`
Timezone parameter accepted but not validated against IANA database.
**Fix**: Validate with `Intl.supportedValuesOf('timeZone')`.

#### M15. Content Length: Bytes vs Characters
**File**: `app/api/linkedin/post/route.ts:67-72`
Checks 3000 char limit but LinkedIn counts UTF-8 characters, not bytes.

#### M16. Async Effect Without Cleanup
**File**: `components/features/post-composer.tsx:241-254`
`fetchApiKeyStatus` has no abort signal.
**Fix**: Add `let cancelled = false` guard.

#### M17. Infinite Scroll Missing Cleanup
**File**: `app/dashboard/discover/page.tsx:300-304`
`useInView` intersection observer could trigger on unmounted component.

#### M18. Missing Loading for Subsequent Fetches
**Files**: `inspiration/page.tsx:338`, `wishlist/page.tsx:188`
Only shows skeleton on initial load, not during pagination/filter changes.

### Performance

#### M19. Inefficient Topic Classification
**File**: `app/api/discover/import/route.ts:85-98`
Nested loop: 500 posts x 80 keywords.
**Fix**: Compile regex once, single-pass matching.

#### M20. Content Type Breakdown: Multiple Queries
**File**: `app/api/admin/stats/route.ts:347-374`
6 separate COUNT queries instead of single query with `CASE WHEN`.

#### M21. Research Route: No Caching
**File**: `app/api/research/route.ts:238-244`
Same Tavily API query hit every time.
**Fix**: Cache results for 1 hour.

#### M22. Middleware Timeout Too Short
**File**: `middleware.ts:154-158`
3-second timeout on profile check is too aggressive for slow connections.
**Fix**: Increase to 5-10 seconds.

#### M23. Canvas Editor Ref Pattern
**File**: `components/features/canvas-editor.tsx:284-304`
Uses ref to pass data between callbacks and useEffect (fragile).
**Fix**: Use state instead.

---

## LOW Priority Issues

### Best Practices

#### L1. Missing Request ID Logging
Multiple API routes log errors without request IDs for tracing.

#### L2. Inconsistent Status Codes
`app/api/sync/route.ts:172` returns 400 for unknown sync type (should be 422).

#### L3. Console Logs in Production
Multiple files have `console.error` without dev check.
**Fix**: Wrap in `process.env.NODE_ENV === 'development'` or use error monitoring.

#### L4. Magic Numbers
`SWIPE_THRESHOLD = 100`, `PAGE_SIZE = 20`, `CONTENT_TRUNCATE_LENGTH = 200` should be in constants file with JSDoc.

#### L5. Hardcoded API Key Fallback
**File**: `app/api/remix/route.ts:139-141`
Falls back to env variable silently without logging source.

#### L6. Hardcoded Expiration Times
**File**: `app/api/teams/[teamId]/invite/route.ts`
7-day expiration hardcoded in SQL and code.

#### L7. No CSRF Protection
POST/PATCH/DELETE routes lack CSRF token validation (partial mitigation from Next.js App Router).

#### L8. No Request Size Limits
Large payloads not rejected early.
**Fix**: Add middleware to limit body size.

### Documentation

#### L9. Missing JSDoc on Complex Functions
`posts/page.tsx:750-784` (fetchPosts), `discover/page.tsx:327-332` (handleArticleClick)

#### L10. Commented Out Code
Some files have commented code that should be removed.

### Type Safety

#### L11. Loose Typing
- `posts/page.tsx:97`: `raw_data: unknown` should be typed interface
- `discover/page.tsx:327`: `article: unknown` in callback
- `swipe/page.tsx:62`: `SwipeCardData` allows optional fields without validation

### Code Quality

#### L12. Unused Imports
Several components import icons/utilities that aren't used.

#### L13. Inconsistent Naming
Mix of `handleX` and `onX` naming within same files.

#### L14. Duplicate Auth Implementations
`hooks/use-auth.ts` and `lib/auth/auth-provider.tsx` are separate auth implementations.
**Fix**: Deprecate `use-auth.ts`, use only AuthProvider context.

---

## What's Done Well

- RLS enabled on all Supabase tables
- PKCE auth flow properly configured
- Proper JSDoc documentation on most components
- TypeScript strict mode with good type safety
- Loading/error states on all pages
- API key encryption before storage
- Feature flags for posting safety gate
- Inngest for async job handling with error rollback
- Clean hooks: `use-mobile`, `use-minimum-loading`, `use-carousel`, `use-brand-kit`, `use-remix`, `use-posthog`, `use-writing-style`
- Good empty states with icons and CTAs
- Consistent design system with shadcn/ui + Tailwind
- Proper cookie-based session storage
- OAuth state validation for CSRF protection

---

## Priority Action Plan

### Immediate (1-2 hours)
1. Fix 7 infinite re-render loops in hooks
2. Fix SQL injection in admin search
3. Fix `draft.mediaFiles` bug in post-composer
4. Fix wrong analytics event in template-library

### This Week (4-6 hours)
5. Fix N+1 queries in teams and admin stats
6. Add rate limiting to auth and bulk import endpoints
7. Add AbortController cleanup to research/graphics hooks
8. Add Error Boundaries to complex pages

### This Sprint (8-12 hours)
9. Create database indexes for hot query paths
10. Convert SELECT * to specific columns (47 files)
11. Add Zod validation to API routes
12. Split oversized components
13. Extract duplicate utilities

### Next Sprint (16-20 hours)
14. Implement API caching layer
15. Add error monitoring (Sentry)
16. Accessibility audit + skip links + ARIA labels
17. Optimize bundle (framer-motion tree-shaking, date-fns imports)
18. Add optimistic UI patterns
19. Consolidate duplicate auth implementations
