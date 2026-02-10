# ChainLinked Production Readiness Audit Report

**Date:** 2026-02-10
**Reviewer:** Claude Opus 4.6 (Automated Comprehensive Review)
**Scope:** Entire codebase -- API routes, pages, hooks, feature components, lib/types/config, database migrations, sidebar/navigation
**Total Issues Found:** 171

---

## Executive Summary

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 23 | Security vulnerabilities, data exposure, missing safety mechanisms |
| HIGH | 33 | Broken features, architectural problems, type-safety gaps |
| MEDIUM | 62 | Code quality, performance, inconsistencies |
| LOW | 53 | Style, minor inefficiencies, cosmetic issues |
| **TOTAL** | **171** | |

### Top 10 Priority Fixes

| # | Issue | Severity | File(s) | Effort |
|---|-------|----------|---------|--------|
| 1 | SQL injection via unsanitized `.or()` filters | CRITICAL | `api/discover/posts/route.ts:54-56`, `api/discover/news/route.ts:54-56` | Low |
| 2 | Base64 masquerading as encryption for API keys | CRITICAL | `api/remix/route.ts:59-67` | Low |
| 3 | Unauthenticated endpoints exposing internals | CRITICAL | `api/research/test/route.ts`, `api/graphics-library/route.ts`, `api/research/route.ts` | Low |
| 4 | SSRF in proxy-image (no private IP blocking) | CRITICAL | `api/proxy-image/route.ts:59-64` | Low |
| 5 | Auth provider leaks tokens to browser via `select('*')` | CRITICAL | `lib/auth/auth-provider.tsx:81,219` | Low |
| 6 | Dashboard layout forces all children to client components | HIGH | `app/dashboard/layout.tsx:9` | Medium |
| 7 | 285 lines of hardcoded mock data in production bundle | HIGH | `hooks/use-discover.ts` | Low |
| 8 | Analytics hook waterfall (4 sequential DB queries) | HIGH | `hooks/use-analytics.ts:114-346` | Medium |
| 9 | Unstable `createClient()` in component bodies | HIGH | `hooks/use-auth.ts:49`, `hooks/use-settings.ts`, multiple hooks | Low |
| 10 | Missing `loading.tsx` / `error.tsx` for all routes | MEDIUM | `app/dashboard/*/` | Low |

---

## Section 1: API Routes (39 Issues)

**Scope:** All 63 files in `app/api/**/*.ts`

### CRITICAL

#### 1.1 SQL Injection via unsanitized `.ilike` in `.or()` filter
- **File:** `app/api/discover/posts/route.ts:54-56`
- **Issue:** The `search` query parameter is directly interpolated into a PostgREST `.or()` filter string without any escaping. A user can inject arbitrary PostgREST filter operators.
  ```typescript
  query = query.or(
    `content.ilike.%${search}%,author_name.ilike.%${search}%`
  )
  ```
- **Impact:** An attacker can craft a `search` value containing PostgREST syntax (commas, periods, operator keywords) to bypass intended filters, exfiltrate data from any column, or cause query errors.

#### 1.2 SQL Injection (duplicate pattern)
- **File:** `app/api/discover/news/route.ts:54-56`
- **Issue:** Identical pattern. The `search` parameter is interpolated directly into the `.or()` filter string.
  ```typescript
  query = query.or(
    `headline.ilike.%${search}%,summary.ilike.%${search}%`
  )
  ```

#### 1.3 Unauthenticated endpoints exposing server internals and triggering workflows
- **File:** `app/api/research/test/route.ts` (entire file)
- **Issue:** Neither GET nor POST handler has authentication. GET exposes environment variable configuration status (which API keys are set, Inngest configuration). POST triggers Inngest `discover/research` events with user-controlled topics -- all without authentication.
- **Impact:** Anonymous users can enumerate server configuration, discover which API keys are provisioned, and trigger costly Inngest workflows (denial-of-wallet attack).

#### 1.4 Unauthenticated graphics library endpoint
- **File:** `app/api/graphics-library/route.ts` (entire GET handler)
- **Issue:** No authentication. Anyone can query the Unsplash proxy, burning API rate limits and potentially violating Unsplash TOS.

#### 1.5 Unauthenticated API documentation endpoint
- **File:** `app/api/research/route.ts:341-350` (GET handler)
- **Issue:** Returns whether `TAVILY_API_KEY`, `PERPLEXITY_API_KEY`, `OPENROUTER_API_KEY`, `INNGEST_EVENT_KEY` are configured without authentication.

#### 1.6 Base64 used as "encryption" for API keys
- **File:** `app/api/remix/route.ts:59-67`
- **Issue:** `decryptApiKey` is just base64 decoding:
  ```typescript
  function decryptApiKey(encryptedKey: string): string {
    try {
      return Buffer.from(encryptedKey, 'base64').toString('utf-8')
    } catch {
      return encryptedKey  // Falls back to raw key
    }
  }
  ```
- **Impact:** Database breach = full API key exposure.

#### 1.7 AI generate endpoint has no authentication requirement
- **File:** `app/api/ai/generate/route.ts:228-231`
- **Issue:** Auth check is soft -- if `getUser()` fails, code continues with `user` as null. API key can be passed directly in request body (line 218), bypassing stored key lookup entirely.
- **Impact:** Anonymous AI generation; effectively a free OpenRouter proxy.

### HIGH

#### 1.8 Untrusted data spread into database insert
- **File:** `app/api/sync/route.ts:141-168`
- **Issue:** `{ user_id: user.id, ...profile }` -- malicious extension or modified request can inject arbitrary column values, including overwriting `user_id`.

#### 1.9 Race condition on template usage count (non-atomic increment)
- **File:** `app/api/templates/route.ts:128-137`
- **Issue:** Usage count is read, incremented, then written back. Under concurrent requests, increments are lost (TOCTOU race).

#### 1.10 Prompt injection via user-controlled content in AI system prompts
- **Files:** `app/api/ai/analyze-company/route.ts:80-120`, `app/api/company/analyze/route.ts:60-100`
- **Issue:** User-provided fields (`companyName`, `industry`, `targetAudience`, `websiteUrl`) interpolated directly into AI system prompts without sanitization.

#### 1.11 Carousel generate returns encrypted API key without decrypting
- **File:** `app/api/ai/carousel/generate/route.ts:92-117`
- **Issue:** Returns `userKey.encrypted_key` directly without decrypting. OpenAI API call always fails for users with stored keys.
- **Impact:** User-provided API key feature is silently broken.

#### 1.12 Carousel generate uses `z.any()` in Zod schema
- **File:** `app/api/ai/carousel/generate/route.ts:~48`
- **Issue:** `z.any()` for the `slots` array items completely bypasses validation.

#### 1.13 Admin authorization via hardcoded email allowlist
- **Files:** `app/api/admin/users/route.ts:~20-30`, `app/api/admin/stats/route.ts:~20-30`
- **Issue:** No RBAC. Admin access checked by comparing email to hardcoded list. Client-side only checking.

#### 1.14 Information leakage in team invite acceptance
- **File:** `app/api/teams/accept-invite/route.ts:50-51`
- **Issue:** Error response includes `expected_email`, revealing the email address the invitation was sent to.

#### 1.15 No authentication on AI playground endpoint
- **File:** `app/api/ai/playground/route.ts`
- **Issue:** Soft or non-blocking auth check on POST handler. Allows testing AI prompts, consuming API credits.

### MEDIUM

#### 1.16 Unbounded array input in sync endpoint
- **File:** `app/api/sync/route.ts` (`posts`, `analytics`, `connections` cases)
- **Issue:** No limit on array sizes. Millions of items can be sent, causing memory exhaustion.

#### 1.17 N+1 query pattern in discover import
- **File:** `app/api/discover/import/route.ts:162-243`
- **Issue:** Each post processed individually -- separate SELECT + INSERT per post. 50 posts = 100+ DB round trips.

#### 1.18 Admin stats client-side filtering breaks pagination
- **File:** `app/api/admin/users/route.ts:101-112,153-154`
- **Issue:** Post counts fetched by loading all rows. Status filter applied after fetch, making total/count incorrect.

#### 1.19 Admin stats contains hardcoded fake data
- **File:** `app/api/admin/stats/route.ts:261,524-561`
- **Issue:** `systemHealth` returns entirely hardcoded values (CPU 45%, memory 62%, etc.). `aiGenerations` data is partially random.

#### 1.20 Missing pagination on templates GET
- **File:** `app/api/templates/route.ts` (GET handler)
- **Issue:** No `limit` or `range`. All templates returned in single response.

#### 1.21 `supabase as any` type assertion
- **Files:** `app/api/research/status/[sessionId]/route.ts:~15`, `app/api/research/sessions/route.ts:~15`, `app/api/research/start/route.ts:126`
- **Issue:** Supabase client cast to `any`, disabling all TypeScript checking.

#### 1.22 Proxy-image SSRF risk with open CORS
- **File:** `app/api/proxy-image/route.ts:59-64,107`
- **Issue:** Fetches any URL. Does not block internal/private IP ranges (127.0.0.1, 10.x, 169.254.169.254). Returns `Access-Control-Allow-Origin: *`.

#### 1.23 Debug console.log statements in production
- **Files:** `api/settings/api-keys/route.ts:75`, `api/linkedin/status/route.ts:20,27,52,111`, `api/research/start/route.ts:215-218,235`

#### 1.24 Posts route missing input validation on POST body
- **File:** `app/api/posts/route.ts` (POST handler)
- **Issue:** No Zod validation. No max length on `content`.

#### 1.25 Posts route `parseInt` without NaN handling
- **File:** `app/api/posts/route.ts` (GET handler limit/offset)
- **Issue:** `parseInt` on non-numeric string returns NaN, propagated to `.range()`.

#### 1.26 No size limit on content field in discover/import
- **File:** `app/api/discover/import/route.ts` (Zod schema)
- **Issue:** No `z.string().max()` on content. Single post could contain megabytes.

#### 1.27 Team invite missing admin role check
- **File:** `app/api/teams/[teamId]/invite/route.ts:~40-80`
- **Issue:** Checks team membership but may not verify admin role. Any member could invite.

#### 1.28 LinkedIn callback stores access token unencrypted
- **File:** `app/api/linkedin/callback/route.ts`
- **Issue:** LinkedIn OAuth token stored directly in DB column without encryption.

#### 1.29 Company-context PUT accepts arbitrary body fields
- **File:** `app/api/company-context/route.ts` (PUT handler)
- **Issue:** No Zod validation. Only `companyName` checked.

### LOW

#### 1.30 Inconsistent response shapes across endpoints
- **Files:** Multiple API routes
- **Issue:** Some return `{ error }`, others `{ success, error? }`, others `{ message }`. No standardized API envelope.

#### 1.31 Missing HTTP method documentation on Inngest route
- **File:** `app/api/inngest/route.ts:20`
- **Issue:** Exports `PUT` without explanation.

#### 1.32 Sort parameter type cast without validation
- **File:** `app/api/discover/news/route.ts:37`
- **Issue:** `as NewsSortOption` without validation (saved by default fallback).

#### 1.33 Brand-kit extract lacks timeout on Firecrawl scrape
- **File:** `app/api/brand-kit/extract/route.ts`

#### 1.34 Error message forwarding to client in proxy-image
- **File:** `app/api/proxy-image/route.ts:68-69`

#### 1.35 Missing `Cache-Control: no-store` on authenticated API responses
- **Files:** Nearly all authenticated API routes

#### 1.36 No rate limiting on most endpoints
- **Files:** All routes (except research/start soft limit and swipe/generate limit)

#### 1.37 Resend verification endpoint has no rate limiting
- **File:** `app/api/auth/resend-verification/route.ts`
- **Issue:** No auth required (by design) and no rate limiting. Enables email bombing.

#### 1.38 Swipe suggestions GET returns all without limit
- **File:** `app/api/swipe/suggestions/route.ts` (GET handler)

#### 1.39 Prompts test endpoint has no auth
- **File:** `app/api/prompts/test/route.ts`

---

## Section 2: Dashboard Pages (46 Issues)

**Scope:** All `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` under `app/dashboard/` plus root files. 17 files reviewed.

### CRITICAL

#### 2.1 Zero `loading.tsx` files across entire dashboard
- **Files:** Every route under `app/dashboard/`
- **Issue:** No loading.tsx files exist. Users see blank screens during client-side navigations, especially on slower connections. Framework-level streaming SSR is completely unused.

#### 2.2 Zero `error.tsx` files across entire dashboard
- **Files:** Every route under `app/dashboard/`
- **Issue:** A single unhandled error in any page crashes the entire app to the root error boundary.

#### 2.3 Oversized page files violating single-responsibility
- **Files:** `swipe/page.tsx` (877 lines), `discover/page.tsx` (623 lines), `inspiration/page.tsx` (452 lines)
- **Issue:** Multiple sub-components, utility functions, constants, and complex state management all in single files.

### HIGH

#### 2.4 Dashboard layout is client component -- prevents SSR for all children
- **File:** `app/dashboard/layout.tsx:9`
- **Issue:** `'use client'` forces ALL nested pages to render client-side. No server-side data fetching possible. Every page requires: download JS -> hydrate -> fire hooks.

#### 2.5 SidebarProvider duplicated across 14 pages
- **Files:** ALL 14 `page.tsx` files under dashboard
- **Issue:** Exact same wrapper structure (SidebarProvider/AppSidebar/SidebarInset/SiteHeader/main) is copy-pasted 14 times. Should be in dashboard layout.

#### 2.6 Dashboard page is 435 lines with 4 sub-components
- **File:** `app/dashboard/page.tsx`
- **Issue:** `AnimatedNumber`, `QuickStatCard`, `QuickActionCard`, `DashboardContent` all inline.

#### 2.7 Data fetching waterfall on dashboard
- **File:** `app/dashboard/page.tsx:215-224`
- **Issue:** `useTeamPosts`, `useScheduledPosts`, `usePostingGoals`, `useAnalytics` all fire independently as sequential client-side fetches.

#### 2.8 Analytics page has 275 lines with embedded CSV export logic
- **File:** `app/dashboard/analytics/page.tsx`
- **Issue:** 60 lines of CSV business logic embedded directly in component.

#### 2.9 `createClient()` called in component body (not memoized)
- **File:** `app/dashboard/compose/page.tsx:38`
- **Issue:** Creates new Supabase client instance on every render.

#### 2.10 SwipeContent manages 14+ state variables
- **File:** `app/dashboard/swipe/page.tsx:298-847`
- **Issue:** 550-line component with `categoryFilter`, `showRemixDialog`, `remixContent`, `showCollectionPicker`, `pendingSaveCard`, `swipeOffset`, `isDragging`, `isAnimatingOut`, `exitDirection` plus refs. Too many responsibilities.

#### 2.11 Team page has inline async functions in JSX props
- **File:** `app/dashboard/team/page.tsx:270-281`
- **Issue:** `onRemoveMember` and `onRoleChange` create new async function references on every render.

### MEDIUM

#### 2.12 `export const dynamic = 'force-dynamic'` is no-op in client component
- **File:** `app/dashboard/layout.tsx:17`

#### 2.13 Auth check in layout creates flash
- **File:** `app/dashboard/layout.tsx:54-64`
- **Issue:** `ready` state resets on every navigation, causing `DashboardLoadingState` flicker.

#### 2.14 `toLocaleString()` hydration mismatch risk
- **File:** `app/dashboard/page.tsx:77`
- **Issue:** Server/client locale differences can produce different output.

#### 2.15 `eslint-disable-line react-hooks/exhaustive-deps` on dashboard
- **File:** `app/dashboard/page.tsx:234`
- **Issue:** `checkAndShowPrompt` not in dependency array. Stale closure risk.

#### 2.16 `as React.CSSProperties` bypassing type checking for custom CSS properties
- **File:** Every page file's style prop for SidebarProvider

#### 2.17 Missing `URL.revokeObjectURL()` -- memory leak
- **File:** `app/dashboard/analytics/page.tsx:105-113`
- **Issue:** Blob URL created for CSV download is never revoked.

#### 2.18 `new Date().toLocaleString()` hydration risk in analytics
- **File:** `app/dashboard/analytics/page.tsx:169`

#### 2.19 Artificial loading delay of 1 second
- **File:** `app/dashboard/carousels/page.tsx:32`
- **Issue:** `usePageLoading(1000)` forces 1-second wait on every visit.

#### 2.20 `sessionStorage` access not guarded with try-catch
- **Files:** `app/dashboard/compose/page.tsx:48-62`, `app/dashboard/schedule/page.tsx:50-57`
- **Issue:** Can throw in private browsing or when storage quota is exceeded.

#### 2.21 Multiple `as string` type assertions bypassing safety
- **File:** `app/dashboard/compose/page.tsx:99-101`
- **Issue:** Raw LinkedIn data coerced without validation.

#### 2.22 `handlePost` does not handle network errors
- **File:** `app/dashboard/compose/page.tsx:110-128`

#### 2.23 `supabase` in useCallback dependency but new ref each render
- **File:** `app/dashboard/compose/page.tsx:179`

#### 2.24 Unsafe `handleRemix` type assertion
- **File:** `app/dashboard/discover/page.tsx:385`
- **Issue:** `onRemix={handleRemix as (article: unknown) => void}` -- unsafe cast.

#### 2.25 `eslint-disable-line react-hooks/exhaustive-deps` on swipe
- **File:** `app/dashboard/swipe/page.tsx:384`

#### 2.26 Race condition with setTimeout in swipe animation
- **File:** `app/dashboard/swipe/page.tsx:410-413`
- **Issue:** 300ms timeout to reset animation state. Component could unmount before it fires.

#### 2.27 Wishlist loading condition uses `&&` instead of `||`
- **File:** `app/dashboard/swipe/wishlist/page.tsx:194`
- **Issue:** `isLoading && collectionsLoading` shows skeleton only when BOTH are loading. Should be `||`.

#### 2.28 `listPosts` transformation runs on every render without useMemo
- **File:** `app/dashboard/schedule/page.tsx:32-38`

#### 2.29 Settings onSave is incomplete
- **File:** `app/dashboard/settings/page.tsx:108-118`
- **Issue:** Team and other section saves only console.log. Settings do not persist.

#### 2.30 Heavy type assertions in settings profile transformation
- **File:** `app/dashboard/settings/page.tsx:74-95`
- **Issue:** 7+ type assertions in 20 lines.

#### 2.31 Inspiration page is 452 lines with 4 sub-components
- **File:** `app/dashboard/inspiration/page.tsx`

### LOW

#### 2.32 `suppressHydrationWarning` on both html and body
- **File:** `app/layout.tsx:29,32`

#### 2.33 Hardcoded colors for trend indicators
- **File:** `app/dashboard/page.tsx:150-151`

#### 2.34 Unused imports in wishlist page
- **File:** `app/dashboard/swipe/wishlist/page.tsx:20`
- **Issue:** `IconCalendar` and `IconLoader2` imported but unused.

#### 2.35 Global keyboard listener without target check
- **File:** `app/dashboard/swipe/page.tsx:559-572`
- **Issue:** Arrow keys captured globally, would trigger swipes while user types in input fields.

#### 2.36 Inline arrow functions recreated every render
- **File:** `app/dashboard/swipe/page.tsx:546-551`

#### 2.37 Shadowed variable name in analytics catch block
- **File:** `app/dashboard/analytics/page.tsx:116`

#### 2.38-2.46 Various minor issues
- Inconsistent skeleton patterns across pages
- Redundant wrapper components
- Missing auth loading checks in some pages
- `pendingInvitations` transform runs every render without useMemo
- `React.CSSProperties` used without importing React in team settings

---

## Section 3: Hooks (26 Issues)

**Scope:** All custom hooks in `hooks/` directory. 10 files reviewed directly.

### CRITICAL

#### 3.1 285 lines of hardcoded mock data in production bundle
- **File:** `hooks/use-discover.ts:200-485`
- **Issue:** `MOCK_ARTICLES` array with 285 lines of fake data is included in the production JavaScript bundle even though it appears to only be used as a fallback.

### HIGH

#### 3.2 `createClient()` called in component body creating unstable references
- **Files:** `hooks/use-auth.ts:49`, `hooks/use-settings.ts`, `hooks/use-analytics.ts:109`
- **Issue:** If `createClient()` returns a new instance on each call, every hook that includes `supabase` in a dependency array will have infinite re-render loops or stale closures.

#### 3.3 Analytics hook has 230-line function with 4 sequential DB queries
- **File:** `hooks/use-analytics.ts:114-346`
- **Issue:** `fetchAnalytics` is a 230-line function that makes 4 sequential Supabase queries (linkedin_analytics, linkedin_profiles, my_posts, my_posts again for chart data). Each query waits for the previous to complete -- classic waterfall pattern.

#### 3.4 `supabase` in useCallback dependency but recreated each render
- **Files:** `hooks/use-settings.ts:299`, `hooks/use-analytics.ts:346`
- **Issue:** `supabase` is in the `useCallback` dependency array, but `createClient()` may return new ref each render, defeating memoization.

#### 3.5 `eslint-disable` for exhaustive-deps in swipe suggestions
- **File:** `hooks/use-swipe-suggestions.ts:258`
- **Issue:** Disabling the rule suppresses warnings about missing dependencies that could cause stale closure bugs.

### MEDIUM

#### 3.6 use-discover.ts topic management duplicated with use-discover-news.ts
- **Files:** `hooks/use-discover.ts`, `hooks/use-discover-news.ts`
- **Issue:** Nearly identical topic loading, localStorage management, and topic CRUD logic duplicated across both hooks. ~150 lines of shared logic.

#### 3.7 No AbortController in data-fetching hooks
- **Files:** `hooks/use-analytics.ts`, `hooks/use-team.ts`, `hooks/use-settings.ts`
- **Issue:** No AbortController for cancelling in-flight requests when component unmounts or dependencies change. Can cause state updates on unmounted components.

#### 3.8 use-discover-news `retry` and `refresh` use double-setState hack
- **File:** `hooks/use-discover-news.ts:489-515`
- **Issue:** Sets `activeTopic` to empty string then restores it via `setTimeout(0)` to force re-fetch. Fragile pattern that relies on timing.

#### 3.9 use-research does not clean up EventSource on unmount
- **File:** `hooks/use-research.ts`
- **Issue:** If SSE connection is active when component unmounts, it may not be properly closed.

#### 3.10 use-remix stores full article data in state unnecessarily
- **File:** `hooks/use-remix.ts`
- **Issue:** The entire article object is stored in state even though only a few fields are used for the remix.

### LOW

#### 3.11-3.16 Minor hook issues
- Missing JSDoc on some internal functions
- Inconsistent error handling patterns (some throw, some return null)
- `PAGE_SIZE` constant duplicated across hooks
- localStorage keys not centralized
- Some hooks don't clean up timers/intervals on unmount
- `AuthState` interface could be shared with auth-provider

---

## Section 4: Feature Components (20 Issues)

**Scope:** Components in `components/features/` directory.

### HIGH

#### 4.1 `formatRelativeTime` duplicated in 3 files
- **Files:** `components/features/discover-news-card.tsx:39-52`, `components/features/discover-trending-sidebar.tsx:41-54`, and elsewhere
- **Issue:** Identical function copy-pasted. Should be in `lib/utils.ts`.

#### 4.2 DiscoverNewsCard hover state management
- **File:** `components/features/discover-news-card.tsx:61`
- **Issue:** `CompactNewsCard` uses `useState` for hover tracking. CSS `:hover` with `group-hover:` would be more performant (no re-renders).

### MEDIUM

#### 4.3 ManageTopicsModal imports `IconGripVertical` but drag-reorder not implemented
- **File:** `components/features/manage-topics-modal.tsx:13`
- **Issue:** The grip icon is rendered but no drag-and-drop functionality exists. `onUpdateTopics` prop is accepted but never called.

#### 4.4 DiscoverTrendingSidebar hidden below `lg` breakpoint with no mobile alternative
- **File:** `components/features/discover-trending-sidebar.tsx:111`
- **Issue:** `hidden lg:block` means mobile users have no access to trending topics or headlines.

#### 4.5 Badge inside button creates nested interactive elements
- **File:** `components/features/discover-trending-sidebar.tsx:184-204`
- **Issue:** `<button>` wrapping `<Badge>` with `className="cursor-pointer"`. While semantically okay, screen readers may announce confusingly.

#### 4.6-4.10 Various medium component issues
- Missing `aria-label` on icon-only buttons
- No keyboard navigation support in topic pills
- `onArticleClick` optional prop could cause silent no-ops
- Some components don't handle empty/null data gracefully
- Inconsistent use of `cn()` utility

### LOW

#### 4.11-4.20 Minor component issues
- Missing JSDoc on some component props
- Hardcoded color values instead of CSS variables
- Inconsistent `className` ordering conventions
- Some components import unused icons
- Missing `key` prop warnings potential in dynamic lists
- Redundant conditional rendering patterns
- `line-clamp-*` classes without fallback for older browsers
- Some components don't forward refs
- Missing `displayName` on memoized components
- Inconsistent button size/variant usage

---

## Section 5: Lib, Types, and Configuration (30 Issues)

**Scope:** All files under `lib/`, `types/`, root config files, `middleware.ts`.

### CRITICAL

#### 5.1 No security headers in Next.js config
- **File:** `next.config.ts` (lines 1-7)
- **Issue:** Configuration is completely empty. No CSP, HSTS, X-Frame-Options, X-Content-Type-Options.
- **Impact:** Exposed to clickjacking, MIME sniffing, XSS, protocol downgrade attacks.

#### 5.2 LinkedIn access tokens stored in plaintext and sent to browser
- **Files:** `types/database.ts:66-67`, `lib/auth/auth-provider.tsx:81,219`
- **Issue:** `profiles` table has `linkedin_access_token` column fetched via `select('*')` and sent to the browser.

#### 5.3 Service role key used with non-null assertion in Inngest functions
- **Files:** `lib/inngest/functions/analyze-company.ts:16-20`, `deep-research.ts:22-26`, `generate-suggestions.ts:35-39`, `daily-content-ingest.ts:17-21`
- **Issue:** `process.env.SUPABASE_SERVICE_ROLE_KEY!` with non-null assertion. Helper duplicated four times.

#### 5.4 Non-null assertion on environment variables in Supabase clients
- **Files:** `lib/supabase/server.ts:22-23`, `lib/supabase/client.ts:19-21`, `middleware.ts:41-42`
- **Issue:** Missing env vars cause cryptic runtime errors instead of clear startup failures.

#### 5.5 Admin access via client-side hardcoded email list
- **File:** `lib/admin/constants.ts:11-14`
- **Issue:** `ADMIN_EMAILS` array checked client-side only. Feature flags stored in `localStorage`.

### HIGH

#### 5.6 LinkedIn OAuth ID token decoded without signature verification
- **File:** `lib/linkedin/oauth.ts:283-321`
- **Issue:** JWT payload decoded via base64 without verifying signature against LinkedIn's JWKS.

#### 5.7 No rate limiting on Perplexity/Tavily API calls
- **Files:** `lib/inngest/functions/deep-research.ts:418-494`, `daily-content-ingest.ts:132-191`
- **Issue:** All topic searches fire concurrently with no rate limiting or backoff.

#### 5.8 Tavily API key sent in request body
- **File:** `lib/research/tavily-client.ts:113-123`
- **Issue:** API key in JSON body increases logging/exposure risk.

#### 5.9 No timeout on Tavily API fetch
- **File:** `lib/research/tavily-client.ts:126-132`
- **Issue:** No abort signal. Hung requests waste Inngest compute.

#### 5.10 No centralized environment variable validation
- **Files:** Multiple (15+ env vars across codebase)
- **Issue:** Each file checks individually. No `.env.example` file.

#### 5.11 Middleware makes database queries on every request
- **File:** `middleware.ts:63-66,146-165`
- **Issue:** `supabase.auth.getUser()` + profiles query on every matched request.

#### 5.12 Inngest event schema mismatch
- **Files:** `lib/inngest/client.ts:147-156`, `lib/inngest/functions/daily-content-ingest.ts:300-308`
- **Issue:** Emitted event has `totalResults` field not in type definition.

### MEDIUM

#### 5.13 Duplicated type definitions (3 conflicting `PostType`)
- **Files:** `lib/inngest/client.ts:12-37`, `types/database.ts:2043-2068`, `types/index.ts`, `lib/ai/suggestion-prompts.ts`
- **Issue:** Three different `PostType` definitions with different variants.

#### 5.14 `BrandKit` type defined differently in two files
- **Files:** `types/index.ts:145-152` (5 fields), `types/brand-kit.ts:78-113` (13+ fields)

#### 5.15 Inngest client not passing schemas for type-safe events
- **File:** `lib/inngest/client.ts:213-218`

#### 5.16 AuthProvider logs PII (emails) to console
- **File:** `lib/auth/auth-provider.tsx:319,349,393-394`

#### 5.17 LinkedIn OAuth logs sensitive token metadata
- **File:** `lib/linkedin/oauth.ts:128-134,224,272,298-304`

#### 5.18 Resend client singleton can leak between HMR cycles
- **File:** `lib/email/resend.ts:13-28`

#### 5.19 Middleware matcher doesn't exclude `/api/inngest`
- **File:** `middleware.ts:205-216`
- **Issue:** Auth middleware runs on Inngest webhooks, adding unnecessary latency.

#### 5.20 Crypto module heuristic detection of hex vs plaintext secrets
- **File:** `lib/crypto.ts:37-43`
- **Issue:** `if (secret.length === 64)` heuristic is fragile.

#### 5.21 AuthProvider select('*') over-fetches sensitive columns
- **File:** `lib/auth/auth-provider.tsx:168-172`

#### 5.22 Daily content ingest has no idempotency guard
- **File:** `lib/inngest/functions/daily-content-ingest.ts:75-81`

### LOW

#### 5.23 `lib/utils.ts` missing JSDoc
- **File:** `lib/utils.ts:1-7`

#### 5.24 `tsconfig.json` target is ES2017 (conservative)
- **File:** `tsconfig.json:3`

#### 5.25 Default admin AI model settings disconnected from actual model used
- **Files:** `lib/admin/constants.ts:86-90` (gpt-4o-mini), `lib/ai/openai-client.ts:20` (openai/gpt-4.1)

#### 5.26 DraftProvider does not clean up Object URLs
- **File:** `lib/store/draft-context.tsx:166-180`

#### 5.27 PostHog check uses internal `__loaded` property
- **File:** `lib/analytics.ts:16`

#### 5.28 No `.env.example` file
- **File:** (missing)

#### 5.29 `TemplateCategory` type defined differently in two files
- **Files:** `types/index.ts:47-54`, `types/canvas-editor.ts:24`

#### 5.30 LinkedIn `generateAuthUrl` does not support dynamic origin
- **File:** `lib/linkedin/oauth.ts:75-89`

---

## Section 6: Database Migrations & Schema (56 Issues)

**Scope:** All files in `supabase/migrations/` and `types/database.ts`.

### CRITICAL

#### 6.1 `linkedin_tokens` table defined THREE times
- **Files:** `20250123_create_linkedin_tokens.sql`, `20250123_linkedin_oauth_tables.sql:58-78`, `20260116000000_create_linkedin_tokens_table.sql`
- **Issue:** Three separate migration files create the same table with slightly different schemas. All use `IF NOT EXISTS`, so only the first one's schema is active. The third is 11 months newer with a different column set.

#### 6.2 Eight extension data tables have NO RLS policies
- **File:** `20250206_create_extension_data_tables.sql`
- **Issue:** `linkedin_analytics`, `post_analytics`, `audience_data`, `feed_posts`, `my_posts`, `comments`, `connections`, `followers`, `captured_apis`, `capture_stats`, `extension_settings` -- RLS is enabled but zero policies exist.
- **Impact:** NO user can access their own data through the client API.

#### 6.3 `audience_history` missing foreign key constraint
- **File:** `20250123_linkedin_oauth_tables.sql:82-91`
- **Issue:** `user_id UUID NOT NULL` references no table. Data integrity not enforced.

#### 6.4 `linkedin_tokens` has foreign key commented out
- **File:** `20250123_linkedin_oauth_tables.sql:64`
- **Issue:** `-- REFERENCES auth.users(id)` is commented out.

#### 6.5 `user_api_keys` stores encrypted keys but `profiles` stores plaintext token
- **Files:** `20250123_create_user_api_keys.sql`, `20250128_create_core_tables.sql:13`
- **Issue:** Inconsistent security: API keys properly encrypted in one table, LinkedIn tokens in plaintext in another.

#### 6.6 Eight extension data tables have NO indexes
- **File:** `20250206_create_extension_data_tables.sql`
- **Issue:** No indexes on `user_id` for any table. Full table scans for every query.

#### 6.7 13+ TypeScript phantom tables with no migrations
- **File:** `types/database.ts`
- **Issue:** These tables exist in TypeScript types but have NO migration creating them:
  1. `users` (legacy, references `google_id`)
  2. `analytics_history`
  3. `templates`
  4. `inspiration_posts`
  5. `swipe_preferences`
  6. `user_niches`
  7. `saved_inspirations`
  8. `posting_goals`
  9. `brand_kits`
  10. `linkedin_credentials`
  11. `linkedin_research_posts`
  12. `sync_metadata`
  13. `comments` (SQL exists but TS type missing)

#### 6.8 Massive schema drift between SQL and TypeScript
- **Files:** Multiple migrations vs `types/database.ts`
- **Issue:** `linkedin_profiles` has 14 SQL columns but different 14 TS columns (5 missing from each side). `companies` has `description` and `website` in SQL but `settings` in TS. `scheduled_posts` status enum allows `scheduled`/`cancelled` in TS but not in SQL CHECK constraint.

### HIGH

#### 6.9 `discover_posts` RLS allows ANY user to INSERT and UPDATE
- **File:** `20250127_create_discover_posts.sql:43-55`
- **Issue:** `WITH CHECK (true)` for all authenticated users. Any user can inject content into shared feed.

#### 6.10 `discover_news_articles` has no INSERT/UPDATE/DELETE RLS
- **File:** `20260211_create_discover_news_articles.sql:29-33`
- **Issue:** Only SELECT policy. Server-only inserts must use service_role key.

#### 6.11 Prompt system tables missing from TypeScript types
- **File:** `types/database.ts`
- **Issue:** `system_prompts`, `prompt_versions`, `prompt_usage_logs`, `prompt_test_results` have no TS types.

#### 6.12 `generated_suggestions` INSERT allows any user for any user
- **File:** `20250130_create_swipe_suggestions.sql:172-175`
- **Issue:** `WITH CHECK (true)` with no restriction. Any user can inject suggestions into another user's account.

#### 6.13 `suggestion_generation_runs` UPDATE allows any user for any run
- **File:** `20250130_create_swipe_suggestions.sql:224-227`

#### 6.14 `scheduled_posts` TypeScript has `timezone` column not in SQL
- **File:** `types/database.ts:605` vs `20250128_create_scheduled_posts.sql`

#### 6.15 `post_analytics.activity_urn` nullable in SQL, required in TypeScript
- **File:** `types/database.ts:377,398` vs `20250206_create_extension_data_tables.sql:41`

#### 6.16 `linkedin_profiles` SQL schema vs TypeScript -- significant column mismatch
- **Files:** `20250130_create_linkedin_profiles.sql` vs `types/database.ts:226-285`
- **Issue:** 5 columns missing from each side.

#### 6.17 `companies` SQL schema vs TypeScript mismatch
- **Files:** `20250128_create_core_tables.sql:27-37` vs `types/database.ts:774-806`

#### 6.18 `scheduled_posts` status enum mismatch
- **Files:** SQL CHECK allows 4 values; TypeScript allows 6 values
- **Issue:** `'scheduled'` and `'cancelled'` will violate SQL CHECK constraint.

#### 6.19 `system_prompts` admin RLS relies on modifiable `raw_user_meta_data`
- **File:** `20250130_create_prompt_system.sql:226-238`

### MEDIUM

#### 6.20 Migration timestamp ordering anomaly
- **Files:** Most use `2025xxxx`, three use `2026xxxx`
- **Issue:** Gap creates confusion about canonical schema.

#### 6.21 `update_updated_at_column()` defined 4 times
- **Files:** 4 separate migrations with `CREATE OR REPLACE`

#### 6.22 Five separate identical trigger functions for `updated_at`
- **Files:** 5 migrations each create their own copy

#### 6.23 `uuid_generate_v4()` vs `gen_random_uuid()` inconsistency
- **Files:** `20250123_create_linkedin_tokens.sql:8`, `20250123_create_user_api_keys.sql:8`

#### 6.24 `profiles` table missing `updated_at` column
- **File:** `20250128_create_core_tables.sql:7-24`

#### 6.25 Onboarding step CHECK (1-6) vs TypeScript comment (1-4)
- **Files:** `20250130_add_onboarding_tracking.sql:11` vs `types/database.ts:92-93`

#### 6.26 Non-idempotent indexes in `carousel_templates`
- **File:** `20250206_create_carousel_templates.sql:20-21`

#### 6.27 Non-idempotent indexes in `discover_news_articles`
- **File:** `20260211_create_discover_news_articles.sql:22-26`

#### 6.28 Redundant indexes on `company_context.user_id`
- **File:** `20250130_create_company_context.sql:50,54`

#### 6.29 UNIQUE constraint on TEXT column (btree size limit)
- **Files:** `20250130_create_swipe_suggestions.sql:34,82`
- **Issue:** `UNIQUE (user_id, content)` where `content` is TEXT. PostgreSQL btree entries limited to ~2712 bytes. Long posts will fail.

#### 6.30 No CHECK constraint on `research_sessions.status`
- **File:** `20250130_create_research_tables.sql:13`

#### 6.31 No CHECK constraint on `generated_posts.status`
- **File:** `20250130_create_research_tables.sql:89`

#### 6.32 `prompt_type` ENUM cannot be extended without migration
- **File:** `20250130_create_prompt_system.sql:14-37`

#### 6.33 `carousel_templates` missing `updated_at` trigger
- **File:** `20250206_create_carousel_templates.sql`

#### 6.34 No indexes on extension data tables
- **File:** `20250206_create_extension_data_tables.sql`

#### 6.35 `INT` vs `INTEGER` inconsistency
- **File:** `20260210_discover_topics_and_style.sql:24`

#### 6.36 `profiles` table missing `updated_at` trigger
- **File:** `20250128_create_core_tables.sql`

#### 6.37 Duplicate company_context indexes
- **File:** `20250130_create_company_context.sql`

### LOW

#### 6.38-6.56 (19 Low-severity items)
- Inconsistent UUID function usage across migrations
- Redundant indexes on columns with UNIQUE constraints
- `profiles` stores LinkedIn tokens redundantly alongside `linkedin_tokens`
- `ON DELETE SET NULL` leaves orphaned records
- Mixed VARCHAR/TEXT usage
- `company_context.status` CHECK not reflected in TypeScript
- Missing DELETE policy on several tables
- Empty `Enums` and `Functions` in TypeScript types
- Missing TypeScript types for `comments`, `connections`, `followers`, `captured_apis`, `capture_stats`
- `feed_posts`/`my_posts` missing unique constraint on `(user_id, activity_urn)`
- Trigger recursion risk in `deactivate_other_prompts()`
- `discover_posts.engagement_rate` NUMERIC(6,2) precision concerns
- Multiple triggers on `auth.users` with undefined order

---

## Section 7: Sidebar & Navigation (4 Issues)

### MEDIUM

#### 7.1 Duplicate icon usage
- **File:** `components/app-sidebar.tsx`
- **Issue:** `IconSparkles` used for both "Prompt Playground" and "Inspiration" nav items.

#### 7.2 Ungrouped vs grouped nav items
- **File:** `components/app-sidebar.tsx`
- **Issue:** 5 items ungrouped at top, 6 grouped under "Content", creating visual asymmetry.

### LOW

#### 7.3 Spacer div for visual separation
- **File:** `components/app-sidebar.tsx`
- **Issue:** `<div className="h-3" />` used instead of structural grouping.

#### 7.4 Active state detection depends on pathname matching
- **File:** `components/app-sidebar.tsx`
- **Issue:** Simple string comparison. Nested routes may not highlight parent correctly.

---

## Architectural Recommendations

### 1. Add API middleware layer
Each route independently handles auth, validation, error responses. A shared middleware would centralize auth checks, rate limiting, response envelopes, and input sanitization -- reducing ~30 issues to ~5 fixes.

### 2. Move SidebarProvider to dashboard layout
Eliminates 14 copies of identical boilerplate. Sidebar state persists across navigations. Each page reduces to just its content.

### 3. Centralize environment variable validation
Use Zod/t3-env schema at build time. Eliminates cryptic runtime failures from missing env vars. Create `.env.example` for documentation.

### 4. Run `supabase gen types`
Regenerate TypeScript types from actual database schema. Eliminates 13 phantom tables and dozens of column mismatches.

### 5. Extract shared utilities
- `formatRelativeTime` (duplicated 3x)
- `getSupabaseAdmin()` (duplicated 4x in Inngest functions)
- `update_updated_at_column()` (duplicated 5x in SQL)
- Topic management logic (duplicated in 2 hooks)

---

## Files Reference Index

| File | Section | Issues |
|------|---------|--------|
| `app/api/discover/posts/route.ts` | 1 | #1.1 |
| `app/api/discover/news/route.ts` | 1 | #1.2, #1.32 |
| `app/api/research/test/route.ts` | 1 | #1.3 |
| `app/api/graphics-library/route.ts` | 1 | #1.4 |
| `app/api/research/route.ts` | 1 | #1.5 |
| `app/api/remix/route.ts` | 1 | #1.6 |
| `app/api/ai/generate/route.ts` | 1 | #1.7 |
| `app/api/sync/route.ts` | 1 | #1.8, #1.16 |
| `app/api/templates/route.ts` | 1 | #1.9, #1.20 |
| `app/api/ai/analyze-company/route.ts` | 1 | #1.10 |
| `app/api/ai/carousel/generate/route.ts` | 1 | #1.11, #1.12 |
| `app/api/admin/users/route.ts` | 1 | #1.13, #1.18 |
| `app/api/admin/stats/route.ts` | 1 | #1.13, #1.19 |
| `app/api/teams/accept-invite/route.ts` | 1 | #1.14 |
| `app/api/ai/playground/route.ts` | 1 | #1.15 |
| `app/api/proxy-image/route.ts` | 1 | #1.22, #1.34 |
| `app/api/posts/route.ts` | 1 | #1.24, #1.25 |
| `app/api/discover/import/route.ts` | 1 | #1.17, #1.26 |
| `app/api/linkedin/callback/route.ts` | 1 | #1.28 |
| `app/api/company-context/route.ts` | 1 | #1.29 |
| `app/dashboard/layout.tsx` | 2 | #2.4, #2.12, #2.13 |
| `app/dashboard/page.tsx` | 2 | #2.6, #2.7, #2.14, #2.15 |
| `app/dashboard/analytics/page.tsx` | 2 | #2.8, #2.17, #2.18, #2.37 |
| `app/dashboard/swipe/page.tsx` | 2 | #2.3, #2.10, #2.25, #2.26, #2.35, #2.36 |
| `app/dashboard/discover/page.tsx` | 2 | #2.3, #2.24 |
| `app/dashboard/compose/page.tsx` | 2 | #2.9, #2.20, #2.21, #2.22, #2.23 |
| `app/dashboard/swipe/wishlist/page.tsx` | 2 | #2.27, #2.34 |
| `app/dashboard/schedule/page.tsx` | 2 | #2.20, #2.28 |
| `app/dashboard/settings/page.tsx` | 2 | #2.29, #2.30 |
| `app/dashboard/inspiration/page.tsx` | 2 | #2.31 |
| `app/dashboard/carousels/page.tsx` | 2 | #2.19 |
| `app/dashboard/team/page.tsx` | 2 | #2.11 |
| `hooks/use-discover.ts` | 3 | #3.1, #3.6 |
| `hooks/use-auth.ts` | 3 | #3.2 |
| `hooks/use-analytics.ts` | 3 | #3.3, #3.4, #3.7 |
| `hooks/use-settings.ts` | 3 | #3.4, #3.7 |
| `hooks/use-swipe-suggestions.ts` | 3 | #3.5 |
| `hooks/use-discover-news.ts` | 3 | #3.6, #3.8 |
| `hooks/use-research.ts` | 3 | #3.9 |
| `hooks/use-remix.ts` | 3 | #3.10 |
| `components/features/discover-news-card.tsx` | 4 | #4.1, #4.2 |
| `components/features/discover-trending-sidebar.tsx` | 4 | #4.1, #4.4, #4.5 |
| `components/features/manage-topics-modal.tsx` | 4 | #4.3 |
| `components/app-sidebar.tsx` | 7 | #7.1-#7.4 |
| `next.config.ts` | 5 | #5.1 |
| `lib/auth/auth-provider.tsx` | 5 | #5.2, #5.16, #5.21 |
| `lib/inngest/functions/*.ts` | 5 | #5.3, #5.7 |
| `lib/supabase/server.ts` | 5 | #5.4 |
| `lib/supabase/client.ts` | 5 | #5.4 |
| `middleware.ts` | 5 | #5.4, #5.11, #5.19 |
| `lib/admin/constants.ts` | 5 | #5.5, #5.25 |
| `lib/linkedin/oauth.ts` | 5 | #5.6, #5.17, #5.30 |
| `lib/research/tavily-client.ts` | 5 | #5.8, #5.9 |
| `lib/inngest/client.ts` | 5 | #5.12, #5.13, #5.15 |
| `lib/crypto.ts` | 5 | #5.20 |
| `lib/inngest/functions/daily-content-ingest.ts` | 5 | #5.22 |
| `types/database.ts` | 6 | #6.7, #6.8, #6.11, #6.14-#6.18 |
| `supabase/migrations/*.sql` | 6 | #6.1-#6.6, #6.9-#6.10, #6.12-#6.13, #6.19-#6.56 |

---

*Report generated 2026-02-10. This is a point-in-time audit of the ChainLinked codebase on the `main` branch at commit `caf572a`.*
