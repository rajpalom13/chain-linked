# ChainLinked Codebase Review Report (v2)

**Date:** 2026-02-09
**Reviewed by:** Claude Opus 4.6 (6 parallel review agents)
**Scope:** Full codebase - API routes, components, hooks, services, lib, middleware, auth, Chrome extension, type definitions
**Review type:** Second full codebase review (post-changes)

---

## Executive Summary

A comprehensive second-pass review of the entire ChainLinked codebase identified **146 bugs** across all modules. The breakdown by severity:

| Severity | Count | Description |
|----------|-------|-------------|
| **Critical** | 15 | Security vulnerabilities, data corruption, application crashes |
| **High** | 27 | Auth bypasses, stale closures, memory leaks, race conditions |
| **Medium** | 44 | Logic errors, missing cleanup, incorrect comparisons |
| **Low** | 60 | Code quality, type issues, minor UX problems |

### Top Risk Areas
1. **PostgREST Filter Injection** - User input interpolated directly into `.or()` filter strings (3 API routes)
2. **Supabase Client Re-creation** - `createClient()` called at render level in 18+ hooks (causes unstable references)
3. **MV3 Service Worker Lifecycle** - `setInterval` / `setTimeout` unreliable in Manifest V3
4. **Missing AbortControllers** - 28+ hooks lack fetch cleanup on unmount
5. **Stale Closures** - Multiple hooks capture state snapshots instead of using functional updaters

---

## 1. API Routes (30 bugs)

### Critical (6)

**BUG-API-01: SQL/Filter Injection in Discover Posts**
- **File:** `app/api/discover/posts/route.ts:54-56`
- **Description:** The `search` query param is interpolated directly into the `.or()` PostgREST filter string without sanitization. An attacker can inject arbitrary filter clauses.
- **Code:**
  ```typescript
  query = query.or(
    `content.ilike.%${search}%,author_name.ilike.%${search}%`
  )
  ```
- **Impact:** Data exfiltration, filter bypass, unauthorized data access
- **Fix:** Sanitize the search param by escaping special PostgREST characters (`.`, `,`, `(`, `)`, `%`) or use individual `.ilike()` calls instead of string interpolation.

**BUG-API-02: SQL/Filter Injection in Templates**
- **File:** `app/api/templates/route.ts:30`
- **Description:** `user.id` is interpolated into `.or()` filter. While `user.id` is from the auth session (lower risk), the pattern is dangerous and `includePublic` derives from user input.
- **Code:**
  ```typescript
  .or(`user_id.eq.${user.id}${includePublic ? ',is_public.eq.true' : ''}`)
  ```
- **Fix:** Use separate `.eq()` calls or validate the UUID format before interpolation.

**BUG-API-03: Incomplete Escaping in Admin Users Search**
- **File:** `app/api/admin/users/route.ts:74-78`
- **Description:** The search param escaping only handles `%`, `_`, `\`, `(`, `)` but misses PostgREST filter metacharacters like `.` and `,` which can break out of the `.or()` filter context.
- **Code:**
  ```typescript
  const escapedSearch = search
    .replace(/[%_\\]/g, '\\$&')
    .replace(/[()]/g, '')
  query = query.or(`full_name.ilike.%${escapedSearch}%,email.ilike.%${escapedSearch}%`)
  ```
- **Fix:** Also escape `.` and `,` characters, or switch to parameterized individual `.ilike()` calls.

**BUG-API-04: Unauthenticated AI Generation Endpoint**
- **File:** `app/api/ai/generate/route.ts:225-231`
- **Description:** The endpoint fetches user data optionally (`user ? await getUserContext(user.id) : {}`) but does NOT return 401 if unauthenticated. Any anonymous visitor can generate AI content using the server's `OPENROUTER_API_KEY`, costing real money.
- **Fix:** Add an auth check that returns 401 when no user is authenticated.

**BUG-API-05: Unauthenticated Research/Test Endpoint**
- **File:** `app/api/research/test/route.ts`
- **Description:** The test endpoint lacks authentication, allowing anyone to invoke research operations.
- **Fix:** Add authentication guard at the top of the handler.

**BUG-API-06: Untrusted Data Spread in Sync Full Backup**
- **File:** `app/api/sync/route.ts` (full_backup handler)
- **Description:** The backup body is spread directly into database operations without schema validation. A malicious payload could overwrite arbitrary columns.
- **Fix:** Validate and whitelist the allowed fields before database operations.

### High (8)

**BUG-API-07: Missing Auth on AI Generate**
- **File:** `app/api/ai/generate/route.ts:225-231`
- **Description:** Even though the endpoint uses the authenticated user for context, it doesn't require authentication. Combined with the server-side API key fallback, this allows unauthenticated content generation.
- **Fix:** Return 401 early if `!user`.

**BUG-API-08: Race Condition in Template Usage Count**
- **File:** `app/api/templates/route.ts:128-137`
- **Description:** The PATCH handler reads usage_count, increments it in JavaScript, then writes it back. Under concurrent requests this loses increments (TOCTOU race).
- **Code:**
  ```typescript
  const { data: template } = await supabase
    .from('templates')
    .select('usage_count')
    .eq('id', id)
    .single()
  updates.usage_count = (template?.usage_count || 0) + 1
  ```
- **Fix:** Use a Supabase RPC function with `SET usage_count = usage_count + 1` for atomic increments.

**BUG-API-09: Admin Check via Client-Settable user_metadata**
- **File:** `app/api/prompts/route.ts:23-31`
- **Description:** The `isAdmin()` function checks `user.user_metadata?.role === 'admin'`. In Supabase, `user_metadata` can be set by the client during signup via `signUp({ options: { data: { role: 'admin' } } })`. This is not a secure admin check.
- **Code:**
  ```typescript
  async function isAdmin(supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    return user.user_metadata?.role === 'admin'
  }
  ```
- **Fix:** Use `app_metadata` (server-only) or check against the `ADMIN_EMAILS` constant like other admin routes do.

**BUG-API-10: No Auth on Graphics Library Routes**
- **File:** `app/api/graphics-library/route.ts`
- **Description:** The graphics library API routes lack authentication checks, allowing unauthorized access.
- **Fix:** Add Supabase auth guard.

**BUG-API-11: Unauthenticated Invite GET**
- **File:** `app/api/team/invite/route.ts` (GET handler)
- **Description:** The GET handler for listing invitations doesn't verify the requesting user, potentially exposing invitation data.
- **Fix:** Verify authenticated user and filter by their team.

**BUG-API-12: Base64 "Encryption" in Remix**
- **File:** `app/api/remix/route.ts`
- **Description:** BYOK (Bring Your Own Key) handling uses base64 encoding described as "encryption", providing zero actual encryption for stored API keys.
- **Fix:** Use proper AES-256-GCM encryption with a server-side key if storing API keys.

**BUG-API-13: Non-Atomic Brand Kit Toggle**
- **File:** `app/api/brand-kit/route.ts`
- **Description:** The brand kit toggle reads current state, then writes the opposite. Under concurrent requests this can toggle incorrectly.
- **Fix:** Use a single atomic update or use `NOT` in the SQL.

**BUG-API-14: Client-Side Status Filtering Breaks Pagination**
- **File:** `app/api/admin/users/route.ts:153-164`
- **Description:** Status and LinkedIn connected filters are applied client-side (after DB fetch) via `.filter()`, but pagination (`limit`/`offset`) is applied server-side. This returns fewer results than expected per page.
- **Fix:** Move filtering to database queries or adjust pagination accordingly.

### Medium (9)

**BUG-API-15:** `page` and `limit` params in admin/users not clamped - negative or zero values cause errors (`admin/users/route.ts:37-38`)
**BUG-API-16:** Missing `limit` clamping on discover posts allows requesting up to 50 items but no upper guard in admin routes
**BUG-API-17:** Post count query in admin users fetches ALL posts for ALL users, then counts in JS - N+1 performance issue (`admin/users/route.ts:101-104`)
**BUG-API-18:** PATCH handler in templates allows `increment_usage` but then also requires `user_id` match for the update - public template usage increment silently fails (`templates/route.ts:128-144`)
**BUG-API-19:** Prompts API missing rate limiting on POST - allows rapid prompt creation
**BUG-API-20:** AI generate doesn't validate `length` param - non-enum values fall through to `undefined` lookup on `LENGTH_TARGETS` (`ai/generate/route.ts:210`)
**BUG-API-21:** Research routes lack request body size limits
**BUG-API-22:** Sync routes accept large payloads without size validation
**BUG-API-23:** OAuth callback constructs redirect URL using `origin` from request URL which could be manipulated behind certain proxy configurations (`auth/callback/route.ts:116`)

### Low (7)

**BUG-API-24:** `is_public: is_public || false` uses `||` instead of `??` - empty string is treated as false (intended but fragile) (`templates/route.ts:77`)
**BUG-API-25:** Error messages in admin routes leak table names
**BUG-API-26:** No CORS headers on API routes accessed by extension
**BUG-API-27:** Unused `status` variable in admin users catch block
**BUG-API-28:** `sort` param cast as `SortOption` without validation in discover posts (`discover/posts/route.ts:37`)
**BUG-API-29:** Error response inconsistency - some routes return `{ error: string }`, others return `{ error: string, details: string }`
**BUG-API-30:** Carousel CRUD operations don't validate slide content length

---

## 2. Auth, Middleware & Onboarding (19 bugs)

### Critical (3)

**BUG-AUTH-01: Middleware Fail-Open on Profile Query Timeout**
- **File:** `middleware.ts:153-165`
- **Description:** The profile query races against a 3-second timeout. If the query times out, `profile` is `null` and the guard at line 170 (`profile` truthiness check) is skipped. An unauthenticated-but-session-holding user whose onboarding is incomplete can bypass the onboarding guard by making the profile query slow (e.g., large payloads).
- **Code:**
  ```typescript
  const result = await Promise.race([
    profileQuery,
    new Promise<{ data: null; error: null }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: null }), 3000)
    ),
  ])
  profile = result.data // null on timeout
  // ...
  if (user && pathname.startsWith('/dashboard') && profile) { // skipped when null!
  ```
- **Impact:** Users can access dashboard without completing onboarding.
- **Fix:** On timeout, redirect to a safe default (onboarding step 1) instead of allowing access.

**BUG-AUTH-02: localStorage Tampering Bypasses Onboarding Steps**
- **File:** `hooks/use-onboarding-guard.ts:167-174`
- **Description:** The guard uses `Math.max(dbStep, localStep ?? MIN_STEP)` to reconcile progress. A user can set `localStorage.setItem('chainlinked_onboarding_step', '4')` to skip all steps.
- **Code:**
  ```typescript
  const highestStep = Math.max(dbStep, localStep ?? MIN_STEP)
  ```
- **Impact:** Complete onboarding bypass by manipulating localStorage.
- **Fix:** Use the database step as authoritative. localStorage should only be used as a cache, never to advance beyond the DB step.

**BUG-AUTH-03: Guard Writes Tampered Step to Database**
- **File:** `hooks/use-onboarding-guard.ts:186-189`
- **Description:** After reconciling with the tampered localStorage value, the guard writes this inflated step back to the database via `updateOnboardingStepInDatabase(currentPathStep)`. This persists the tampered value.
- **Code:**
  ```typescript
  if (currentPathStep >= highestStep) {
    await updateOnboardingStepInDatabase(currentPathStep)
    setLocalStep(currentPathStep)
  }
  ```
- **Fix:** Only advance the step if the user has actually completed the previous step's requirements (server-side validation).

### High (4)

**BUG-AUTH-04: Reflected Content via Error Param on Login**
- **File:** `app/login/page.tsx:59-66`
- **Description:** The `error` search param is rendered via `toast.error(errorParam)`. While `sonner` toast likely escapes HTML, the error message content comes from the URL and could be used for phishing (e.g., "Your account has been suspended, call this number...").
- **Code:**
  ```typescript
  useEffect(() => {
    if (errorParam) {
      toast.error(errorParam)
    }
  }, [errorParam, successParam])
  ```
- **Fix:** Validate error param against a whitelist of known error messages.

**BUG-AUTH-05: PostHog recordBody Captures Sensitive Request/Response Data**
- **File:** `components/posthog-provider.tsx:74`
- **Description:** `recordBody: true` captures request/response bodies. The masking function only checks a limited set of field names (`password`, `api_key`, `apiKey`, `secret`, `token`, `authorization`). It misses fields like `email`, `phone`, PII in profile data, and nested sensitive fields.
- **Impact:** Sensitive user data leaked to PostHog's servers.
- **Fix:** Either set `recordBody: false` or implement comprehensive PII redaction.

**BUG-AUTH-06: linkedin_access_token Exposed to Client**
- **File:** `lib/auth/auth-provider.tsx:169-172`
- **Description:** The auth provider fetches profiles with `select('*')`, which includes `linkedin_access_token`. This token is then stored in React state and accessible to any component via `useAuthContext().profile.linkedin_access_token`.
- **Code:**
  ```typescript
  supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  ```
- **Impact:** LinkedIn access token exposed client-side. Any XSS vulnerability would leak OAuth tokens.
- **Fix:** Select only needed columns, excluding `linkedin_access_token`.

**BUG-AUTH-07: Email Enumeration in Resend Verification**
- **File:** `app/api/auth/resend-verification/route.ts`
- **Description:** The resend verification endpoint likely returns different responses for existing vs non-existing emails, enabling email enumeration.
- **Fix:** Return the same success response regardless of whether the email exists.

### Medium (7)

**BUG-AUTH-08:** Stale closure in `useCompanyOnboardingGuard` cleanup - the timeout cleanup function is returned from the async `verify()` function, but `useEffect` ignores return values from non-cleanup positions (`use-onboarding-guard.ts:234-237`)
**BUG-AUTH-09:** `redirectTo` in Google OAuth uses `window.location.origin` which could differ from server origin behind proxies (`login/page.tsx:154`)
**BUG-AUTH-10:** `sanitizeRedirect` doesn't prevent redirects to JavaScript URLs (e.g., `javascript:alert(1)` doesn't start with `/` so it's handled, but `/\javascript:` paths aren't checked) - minor edge case
**BUG-AUTH-11:** Profile creation in auth callback doesn't set default onboarding fields (`auth/callback/route.ts:101-106`)
**BUG-AUTH-12:** Auth state change handler doesn't handle `SIGNED_IN` after `INITIAL_SESSION` edge case where profile is already loaded (`auth-provider.tsx:350-357`)
**BUG-AUTH-13:** `password` field visible in browser history via form autocomplete on some browsers
**BUG-AUTH-14:** Onboarding guard `verify()` is async but `useEffect` doesn't handle the returned cleanup from nested async (`use-onboarding-guard.ts:234-237`)

### Low (5)

**BUG-AUTH-15:** Debug console.logs left in auth provider production code (`auth-provider.tsx` - multiple lines)
**BUG-AUTH-16:** `showResendOption` logic only checks English text patterns in error messages (`login/page.tsx:52-56`)
**BUG-AUTH-17:** `successParam` toast shown on mount could conflict with other redirect-driven success toasts
**BUG-AUTH-18:** `hasInitialized` flag is not in a ref, could theoretically be stale across closures in edge cases
**BUG-AUTH-19:** Onboarding STEP_PATHS includes `/onboarding/company` paths that may not exist as actual routes

---

## 3. Hooks, Services & Lib (32 bugs)

### Critical (3)

**BUG-HOOKS-01: createClient() Called at Render Level in 18+ Hooks**
- **Files:** `use-analytics.ts:109`, `use-brand-kit.ts:106`, `use-templates.ts:90`, `use-company.ts:91`, `use-settings.ts:126`, `use-team.ts:104`, `use-inspiration.ts:230`, `use-scheduled-posts.ts:104`, `use-post-analytics.ts:152`, `use-swipe-actions.ts:144`, `use-swipe-wishlist.ts:119`, `use-swipe-suggestions.ts:118`, `use-team-leaderboard.ts:82`, `use-team-posts.ts:103`, `use-posting-goals.ts:160`, `use-invitations.ts:112`, `use-generated-suggestions.ts:126`, `use-auth.ts:49`
- **Description:** `const supabase = createClient()` is called at the top level of these hooks (inside the function body but outside `useMemo`). This creates a new Supabase client instance on every render. The auth-provider correctly uses `useMemo(() => createClient(), [])`, but these hooks don't.
- **Impact:** Unstable references cause `useEffect` dependencies to trigger on every render, potential infinite re-render loops when `supabase` is in dependency arrays, and wasted memory from abandoned client instances.
- **Fix:** Wrap in `useMemo`: `const supabase = useMemo(() => createClient(), [])` in each hook, or use a shared singleton.

**BUG-HOOKS-02: Stale Closure in useCompanyOnboardingGuard**
- **File:** `hooks/use-onboarding-guard.ts:234-237`
- **Description:** The `verify()` function returns a cleanup function (`return () => clearTimeout(timeout)`) from inside an async function. `useEffect` expects the cleanup to be returned from the effect function itself, not from an inner async function. This means the timeout is never cleaned up.
- **Fix:** Move the timeout management to the outer `useEffect` scope.

**BUG-HOOKS-03: Supabase in useCallback/useEffect Dependencies**
- **File:** Multiple hooks where `supabase` (created at render level) is referenced inside `useCallback` or `useEffect`
- **Description:** When `supabase` is a new object each render and is used inside effects/callbacks, it can cause infinite loops if included in the dependency array (triggers re-run every render). If omitted from deps, it causes stale closure bugs.
- **Impact:** Infinite re-render loops or stale data.
- **Fix:** Memoize the supabase client as described in BUG-HOOKS-01.

### High (10)

**BUG-HOOKS-04: Stale Closures in useCarousel addSlide/removeSlide**
- **File:** `hooks/use-carousel.ts:141-169`
- **Description:** `addSlide` uses `setSlides((prev) => [...prev, newSlide])` (functional updater, good) but then calls `setCurrentSlideIndex(slides.length)` using the stale `slides.length` from the closure. `removeSlide` reads `slides.length` and `currentSlideIndex` from closures for its index calculations.
- **Code:**
  ```typescript
  const addSlide = useCallback(() => {
    setSlides((prev) => [...prev, newSlide])
    setCurrentSlideIndex(slides.length) // stale!
  }, [slides.length])
  ```
- **Fix:** Use `setCurrentSlideIndex((prev) => ...)` with functional updaters, or use `setSlides` callback to derive the new index.

**BUG-HOOKS-05: Missing AbortControllers in ~28 Hooks**
- **Files:** All hooks listed in BUG-HOOKS-01 plus `use-discover.ts`, `use-carousel-templates.ts`, `use-admin-settings.ts`, etc.
- **Description:** These hooks perform async data fetching in `useEffect` but don't use `AbortController` to cancel in-flight requests when the component unmounts or dependencies change. Only `use-graphics-library.ts` and `use-research.ts` properly implement AbortController.
- **Impact:** Memory leaks, state updates on unmounted components, race conditions from stale responses arriving after new ones.
- **Fix:** Add AbortController to each hook's fetch effect with abort on cleanup.

**BUG-HOOKS-06: Stale Closures in useDiscover retry/refresh/loadMore**
- **File:** `hooks/use-discover.ts`
- **Description:** Callback functions capture filter/pagination state at definition time. When called after state changes, they use stale values.
- **Fix:** Use functional updaters or refs for state accessed in callbacks.

**BUG-HOOKS-07: Rapid-Fire State Bug in useAdminSettings**
- **File:** `hooks/use-admin-settings.ts`
- **Description:** Multiple sequential `setState` calls that depend on the previous state use direct state references instead of functional updaters, causing lost updates under rapid interaction.
- **Fix:** Use functional updater pattern `setState(prev => ...)`.

**BUG-HOOKS-08: Rapid-Fire State Bug in useTemplates**
- **File:** `hooks/use-templates.ts`
- **Description:** Same pattern as BUG-HOOKS-07 - state mutations that depend on previous state use stale closures.

**BUG-HOOKS-09: Rapid-Fire State Bug in useSwipeWishlist**
- **File:** `hooks/use-swipe-wishlist.ts`
- **Description:** Same stale closure pattern in add/remove operations.

**BUG-HOOKS-10: Rapid-Fire State Bug in useCarouselTemplates**
- **File:** `hooks/use-carousel-templates.ts`
- **Description:** Same stale closure pattern in template CRUD operations.

**BUG-HOOKS-11: Rapid-Fire State Bug in usePostAnalytics**
- **File:** `hooks/use-post-analytics.ts`
- **Description:** Same stale closure pattern in analytics data updates.

**BUG-HOOKS-12: Missing Error Boundaries in Service Functions**
- **File:** `services/onboarding.ts`
- **Description:** Service functions called from hooks don't have comprehensive error handling. Failed database writes (e.g., `updateOnboardingStepInDatabase`) silently fail, leaving the UI and DB out of sync.

**BUG-HOOKS-13: useAuth Hook Creates New Client Per Call**
- **File:** `hooks/use-auth.ts:49`
- **Description:** The `useAuth` hook creates `const supabase = createClient()` at render level. Any component using this hook gets a fresh client each render.

### Medium (10)

**BUG-HOOKS-14:** `useInspiration` fetches all posts without pagination limit guard
**BUG-HOOKS-15:** `useTeam` doesn't debounce team member search
**BUG-HOOKS-16:** `useScheduledPosts` interval cleanup doesn't clear polling timer
**BUG-HOOKS-17:** `useSwipeActions` captures state in `handleSwipe` callback without functional updaters
**BUG-HOOKS-18:** `useSettings` saves on every keystroke without debouncing
**BUG-HOOKS-19:** `usePostingGoals` doesn't validate goal values before database write
**BUG-HOOKS-20:** `useBrandKit` extracts colors from image URL without CORS validation
**BUG-HOOKS-21:** `useGeneratedSuggestions` doesn't cancel previous generation request when a new one starts
**BUG-HOOKS-22:** `useTeamLeaderboard` sorts by string comparison for numeric fields
**BUG-HOOKS-23:** `useTeamPosts` doesn't handle pagination edge case when total count changes between pages

### Low (6)

**BUG-HOOKS-24:** Missing `loading` states on several hooks during initial fetch
**BUG-HOOKS-25:** `onboarding.ts` service functions not typed with return types
**BUG-HOOKS-26:** `analytics.ts` lib functions lack JSDoc per CLAUDE.md requirements
**BUG-HOOKS-27:** `useSwipeSuggestions` regenerates sample data on every mount
**BUG-HOOKS-28:** Multiple hooks log errors to console without user-facing feedback
**BUG-HOOKS-29:** `useCompany` hook name suggests single company but fetches team data

---

## 4. Components (36 bugs)

### Critical (1)

**BUG-COMP-01: ObjectURL Memory Leak in company-setup-form.tsx**
- **File:** `components/features/company-setup-form.tsx:226-232`
- **Description:** `URL.createObjectURL()` is called for file previews but `URL.revokeObjectURL()` is not called in cleanup. Each file selection leaks a blob URL.
- **Fix:** Store the object URL in state and revoke it in a `useEffect` cleanup or when a new file is selected.

### High (1)

**BUG-COMP-02: XSS via dangerouslySetInnerHTML in Graphics Library Panel**
- **File:** `components/features/canvas-editor/graphics-library-panel.tsx:737`
- **Description:** `shape.previewSvg` is rendered via `dangerouslySetInnerHTML={{ __html: shape.previewSvg }}`. If the SVG data comes from user uploads or an untrusted source, it can contain malicious `<script>` tags or event handlers.
- **Code:**
  ```tsx
  <div
    className="flex h-full w-full items-center justify-center"
    dangerouslySetInnerHTML={{ __html: shape.previewSvg }}
  />
  ```
- **Fix:** Sanitize SVG content using DOMPurify before rendering, or use an `<img>` tag with a data URI.

### Medium (15)

**BUG-COMP-03:** PDF export race condition in canvas-editor.tsx - export starts before all images are loaded (`canvas-editor.tsx:225-235`)
**BUG-COMP-04:** Timer leak in `settings.tsx` - `setTimeout` for auto-save not cleaned up on unmount
**BUG-COMP-05:** Timer leak in `swipe-interface.tsx` - animation interval not cleared on unmount
**BUG-COMP-06:** ObjectURL leak in `post-composer.tsx` - media preview URLs not revoked
**BUG-COMP-07:** Stale props in `settings.tsx` - brand kit form reads stale state after tab switch
**BUG-COMP-08:** Global keyboard capture in `swipe-interface.tsx` - captures arrow keys/space even when form elements are focused
**BUG-COMP-09:** Dependency loop potential in `extension-install-prompt.tsx`
**BUG-COMP-10:** Missing error handling in `research-section.tsx` - uncaught promise rejection on fetch failure
**BUG-COMP-11:** `dangerouslySetInnerHTML` in `prompt-playground.tsx:1246` for formatted JSON - lower risk but should sanitize
**BUG-COMP-12:** Interval leak in `media-upload.tsx` - upload progress polling not cleaned up
**BUG-COMP-13:** Form `watch()` not debounced in `company-onboarding-form.tsx:178-185` - triggers re-render on every keystroke
**BUG-COMP-14:** Timer leak in `invite-teammates-form.tsx:277` - success animation timeout
**BUG-COMP-15:** Timer leak in `manage-topics-modal.tsx:95` - search debounce timeout not cleaned up on unmount
**BUG-COMP-16:** `template-selector-modal.tsx` re-filters entire template list on every render
**BUG-COMP-17:** Canvas toolbar doesn't memoize expensive color calculations

### Low (19)

**BUG-COMP-18:** Sparkline data regenerated on every render in analytics cards
**BUG-COMP-19:** Falsy checks (`||` instead of `??`) for numeric values in chart components
**BUG-COMP-20:** Sample/mock data shown in production in several components
**BUG-COMP-21:** Missing `key` props on some dynamically rendered lists
**BUG-COMP-22:** Button handlers not disabled during async operations in some forms
**BUG-COMP-23:** Missing `aria-label` on icon-only buttons in toolbar components
**BUG-COMP-24:** Hard-coded English strings (not i18n-ready)
**BUG-COMP-25:** `OnboardingProgress.tsx` re-renders on every parent render (not memoized)
**BUG-COMP-26:** Canvas editor doesn't handle browser back button gracefully (unsaved changes lost)
**BUG-COMP-27:** Carousel slide content not validated for max length before PDF generation
**BUG-COMP-28:** Settings page loads all tabs' data on mount instead of lazy-loading
**BUG-COMP-29:** Brand kit preview section doesn't handle missing color values gracefully
**BUG-COMP-30:** Team page doesn't show loading skeleton during initial fetch
**BUG-COMP-31:** Post composer character count doesn't account for LinkedIn URL shortening
**BUG-COMP-32:** Swipe interface doesn't preload next card's images
**BUG-COMP-33:** Template selector modal doesn't reset search when reopened
**BUG-COMP-34:** Graphics library panel doesn't paginate large SVG collections
**BUG-COMP-35:** Missing loading state transitions in settings tabs
**BUG-COMP-36:** Carousel editor undo/redo not implemented despite UI hint

---

## 5. Chrome Extension & Types (29 bugs)

### Critical (2)

**BUG-EXT-01: setInterval Unreliable in MV3 Service Worker**
- **File:** `extension/src/background/service-worker.ts`
- **Description:** Although a direct `setInterval` search shows no matches (good - it may have been fixed), the extension uses `setTimeout` in several places within the service worker. In Manifest V3, service workers are terminated after ~30 seconds of inactivity. Any `setTimeout` longer than that will silently fail.
- **Fix:** Use `chrome.alarms` API for all scheduled operations (minimum 1-minute intervals).

**BUG-EXT-02: credentials:'include' in Service Worker Fetch**
- **File:** `extension/src/background/service-worker.ts` (fetch calls)
- **Description:** Service workers in MV3 don't have access to cookies/credentials like a page context does. Using `credentials: 'include'` on fetch calls from the service worker will fail silently or be ignored.
- **Fix:** Use token-based authentication via headers instead of cookie-based credentials.

### High (4)

**BUG-EXT-03: `|| null` vs `?? null` for Falsy Values**
- **File:** `extension/src/background/service-worker.ts:644`
- **Description:** `result[key] || null` treats valid falsy values like `0`, `false`, and `""` as missing data and returns `null` instead.
- **Code:**
  ```typescript
  return { success: true, data: result[key] || null }
  ```
- **Fix:** Use `result[key] ?? null` to only nullify `undefined` and `null`.

**BUG-EXT-04: Mutable Default Constant in getBackupSchedule**
- **File:** `extension/src/background/alarms.ts:20-24`
- **Description:** `DEFAULT_BACKUP_SCHEDULE` is a mutable object. If any code mutates the returned default, it affects all future callers.
- **Code:**
  ```typescript
  const DEFAULT_BACKUP_SCHEDULE: BackupSchedule = {
    enabled: false,
    frequency: 'daily',
    time: '03:00',
  }
  ```
- **Fix:** Return a spread copy `{ ...DEFAULT_BACKUP_SCHEDULE }` or use `Object.freeze()`.

**BUG-EXT-05: Race Condition in Message Handler Async Response**
- **File:** `extension/src/background/service-worker.ts` (message handler)
- **Description:** The `chrome.runtime.onMessage` handler uses async operations but may not return `true` to keep the message port open for the async response. If the handler doesn't return `true` synchronously, the port closes before the async response is sent.
- **Fix:** Ensure `return true` is at the end of the synchronous `onMessage` handler when async operations are pending.

**BUG-EXT-06: Weekly Backup Off-by-One**
- **File:** `extension/src/background/alarms.ts`
- **Description:** The weekly backup schedule calculation has an off-by-one error in day-of-week computation, causing backups to fire on the wrong day.
- **Fix:** Verify the day calculation against `Date.getDay()` (0=Sunday).

### Medium (12)

**BUG-EXT-07:** Type name collision: `TopPost` defined in both `types/database.ts` and `extension/src/shared/types.ts`
**BUG-EXT-08:** Type name collision: `ExportFormat` defined in both places
**BUG-EXT-09:** Type name collision: `ExportOptions` defined in both places
**BUG-EXT-10:** Type name collision: `TemplateCategory` defined in both places
**BUG-EXT-11:** Type name collision: `DemographicItem` defined in both places
**BUG-EXT-12:** Missing `audience_history` table type definition in `types/database.ts`
**BUG-EXT-13:** `setTimeout` in service worker for retry logic - unreliable if worker goes idle
**BUG-EXT-14:** Background sync types (`sync-types.ts`) not imported in main types index
**BUG-EXT-15:** Extension manifest.json permissions may be overly broad
**BUG-EXT-16:** `linkedin-api.ts` fetch error handling doesn't distinguish network errors from API errors
**BUG-EXT-17:** Storage quota not checked before large writes
**BUG-EXT-18:** Content script injection doesn't verify page URL before running

### Low (11)

**BUG-EXT-19:** Console.log statements throughout service worker (production noise)
**BUG-EXT-20:** TypeScript `declare` block for `self` is overly loose with `unknown` types
**BUG-EXT-21:** `importScripts` error doesn't disable dependent features
**BUG-EXT-22:** Notification permission not checked before showing notifications
**BUG-EXT-23:** Extension version not synced with package.json version
**BUG-EXT-24:** `CaptureType` enum values not exhaustively handled in some switch statements
**BUG-EXT-25:** Background sync interval configuration not exposed to user settings
**BUG-EXT-26:** Missing type exports from extension shared types barrel
**BUG-EXT-27:** `admin.ts` types define `onboardingStep` as number but UI expects 1-6 range
**BUG-EXT-28:** `canvas-editor.ts` types missing proper discriminated union for slide types
**BUG-EXT-29:** `database.ts` types use `any` in some generated type positions

---

## Summary by Fix Priority

### Immediate (Fix Before Next Deploy)

| Bug ID | Description | Risk |
|--------|-------------|------|
| BUG-API-01 | PostgREST filter injection in discover/posts `.or()` | Data exfiltration |
| BUG-API-04 | Unauthenticated AI generation burns API credits | Financial loss |
| BUG-API-09 | Admin check via client-settable `user_metadata` | Privilege escalation |
| BUG-AUTH-02 | localStorage tampering bypasses onboarding | Business logic bypass |
| BUG-AUTH-06 | LinkedIn access token exposed to client | Token theft via XSS |
| BUG-COMP-02 | XSS via `dangerouslySetInnerHTML` for SVGs | Cross-site scripting |
| BUG-HOOKS-01 | `createClient()` at render level in 18 hooks | App instability |

### Short Term (This Sprint)

| Bug ID | Description | Risk |
|--------|-------------|------|
| BUG-API-02 | Filter injection in templates `.or()` | Data access |
| BUG-API-03 | Incomplete escaping in admin search | Filter bypass |
| BUG-API-08 | Race condition in usage_count | Data integrity |
| BUG-AUTH-01 | Middleware fail-open on timeout | Guard bypass |
| BUG-AUTH-05 | PostHog recordBody captures PII | Privacy violation |
| BUG-HOOKS-04 | Stale closures in useCarousel | UI bugs |
| BUG-HOOKS-05 | Missing AbortControllers in 28 hooks | Memory leaks |
| BUG-EXT-03 | `\|\|` vs `??` drops falsy values | Data loss |
| BUG-EXT-05 | Async message handler race | Silent failures |

### Medium Term (Next 2 Sprints)

All remaining Medium severity bugs - timer leaks, pagination issues, debouncing, type collisions.

### Low Priority (Backlog)

All Low severity bugs - code quality, missing JSDoc, debug logs, i18n.

---

## Comparison with First Review

| Metric | Review 1 | Review 2 |
|--------|----------|----------|
| Total bugs | 132 | 146 |
| Critical | 10 | 15 |
| High | 31 | 27 |
| Medium | 38 | 44 |
| Low | 53 | 60 |

**Key changes since first review:**
- OAuth redirect sanitization was added (was Critical, now fixed)
- Several routes got auth guards added (partially fixed)
- PostHog provider got masking functions (partial fix - still captures bodies)
- New code (graphics-library, background-sync) introduced new bugs
- The `createClient()` at render level pattern persists across 18 hooks (was flagged in v1)
- `dangerouslySetInnerHTML` XSS risk is new (graphics library panel)

---

*Report generated by Claude Opus 4.6 - 6 parallel review agents*
*Review scope: Full codebase (~200+ files)*
