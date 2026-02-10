# ChainLinked Codebase Review Report

**Date:** 2026-02-09
**Reviewed by:** Claude Opus 4.6 (5 parallel review agents)
**Scope:** Full codebase - 57 API routes, 70+ components, 45+ hooks, middleware, auth, Chrome extension, type definitions

---

## Executive Summary

| Area | Critical | High | Medium | Low | Total |
|------|----------|------|--------|-----|-------|
| API Routes | 5 | 8 | 12 | 13 | 38 |
| Components | 2 | 6 | 8 | 7 | 23 |
| Hooks & Services | 1 | 6 | 7 | 7 | 21 |
| Auth & Middleware | 0 | 3 | 6 | 11 | 20 |
| Extension & Types | 2 | 8 | 11 | 9 | 30 |
| **TOTAL** | **10** | **31** | **44** | **47** | **132** |

---

## Part 1: API Routes (38 bugs)

### CRITICAL

#### API-1: Filter Injection in Supabase `.or()` Query
- **File:** `app/api/discover/posts/route.ts`, Lines 54-56
- **Description:** The `search` query parameter is directly interpolated into a Supabase `.or()` filter string without sanitizing special PostgREST filter characters (commas, parentheses, periods, percent signs). An attacker can craft a search string that injects additional filter conditions, potentially bypassing row-level security or accessing data they should not see.
- **Code:**
  ```typescript
  query = query.or(`content.ilike.%${search}%,author_name.ilike.%${search}%`)
  ```
- **Suggested Fix:** Escape special PostgREST characters in the search string before interpolation, or use individual `.ilike()` calls chained with `.or`:
  ```typescript
  const sanitized = search.replace(/[%,().]/g, '\\$&')
  query = query.or(`content.ilike.%${sanitized}%,author_name.ilike.%${sanitized}%`)
  ```

#### API-2: Arbitrary Column Injection via `full_backup` Sync
- **File:** `app/api/sync/route.ts`, Lines 141-165
- **Description:** The `full_backup` sync case uses the spread operator to directly spread user-provided data into database upsert operations. An attacker can include arbitrary column names in the request body (e.g., `user_id`, `id`, `role`, `is_admin`), which will be written directly to the database, potentially escalating privileges or corrupting data.
- **Code pattern:**
  ```typescript
  const syncData = body.data
  // Later:
  await supabase.from(tableName).upsert({ ...item, user_id: user.id })
  ```
- **Suggested Fix:** Define an explicit allowlist of columns for each table and filter the incoming data to only include those columns before upserting:
  ```typescript
  const ALLOWED_COLUMNS: Record<string, string[]> = {
    linkedin_profiles: ['headline', 'industry', ...],
  }
  const filtered = pick(item, ALLOWED_COLUMNS[tableName] || [])
  await supabase.from(tableName).upsert({ ...filtered, user_id: user.id })
  ```

#### API-3: Fake Encryption for API Keys (Base64 Only)
- **File:** `app/api/remix/route.ts`, Lines 59-66
- **Description:** The `decryptApiKey` function uses `Buffer.from(encrypted, 'base64').toString('utf-8')`, which is base64 decoding, not decryption. Any stored API keys are trivially reversible by anyone with database read access. This is a critical security issue for the BYOK (Bring Your Own Key) feature.
- **Code:**
  ```typescript
  function decryptApiKey(encrypted: string): string {
    return Buffer.from(encrypted, 'base64').toString('utf-8')
  }
  ```
- **Suggested Fix:** Implement proper AES-256-GCM encryption using a server-side key stored in environment variables:
  ```typescript
  import { decrypt } from '@/lib/crypto'
  function decryptApiKey(encrypted: string): string {
    return decrypt(encrypted, process.env.ENCRYPTION_KEY!)
  }
  ```

#### API-4: Missing Authentication on Research Test Endpoint
- **File:** `app/api/research/test/route.ts`, entire file
- **Description:** Both GET and POST handlers have zero authentication checks. The GET endpoint reveals whether API keys (TAVILY_API_KEY, OPENAI_API_KEY, INNGEST_EVENT_KEY) are configured. The POST endpoint can trigger Inngest events with a hardcoded fake user ID (`test-user-id`), which could consume API credits or trigger background workflows.
- **Suggested Fix:** Add authentication guards or restrict to development environment only:
  ```typescript
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }
  ```

#### API-5: Unauthenticated AI Generation Access
- **File:** `app/api/ai/generate/route.ts`, Lines 225-231
- **Description:** Authentication is optional in this endpoint. If the user provides an API key in the request body, the endpoint proceeds without requiring any Supabase authentication. This allows anonymous users to use the AI generation service if they supply any API key string, and there is no rate limiting.
- **Suggested Fix:** Always require Supabase authentication, regardless of whether a BYOK key is provided:
  ```typescript
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  ```

### HIGH

#### API-6: Missing Authentication on Graphics Library Proxy
- **File:** `app/api/graphics-library/route.ts`, entire file
- **Description:** The GET handler has no authentication check at all. This endpoint proxies requests to the Unsplash API using the server's API key. Any unauthenticated user can use this endpoint to search Unsplash, consuming the application's rate-limited API quota.
- **Suggested Fix:** Add authentication:
  ```typescript
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  ```

#### API-7: Missing Authentication on Research Status Endpoint
- **File:** `app/api/research/route.ts`, GET handler
- **Description:** The GET endpoint reveals API configuration status (whether TAVILY_API_KEY is set, whether Inngest is configured) without requiring authentication. This is information disclosure about the server's infrastructure.
- **Suggested Fix:** Add authentication guard before returning configuration status.

#### API-8: Information Leak in Team Invite Acceptance
- **File:** `app/api/teams/accept-invite/route.ts`, Lines 50-51
- **Description:** When a user tries to accept an invite meant for a different email, the error response includes the expected email address. This leaks personally identifiable information (the invitee's email address) to any authenticated user who has the invite token.
- **Code:**
  ```typescript
  return NextResponse.json({
    error: `This invitation was sent to ${invitation.email}. Please sign in with that email.`
  }, { status: 403 })
  ```
- **Suggested Fix:** Return a generic message without revealing the expected email:
  ```typescript
  return NextResponse.json({
    error: 'This invitation was not sent to your email address. Please sign in with the correct account.'
  }, { status: 403 })
  ```

#### API-9: Non-Atomic Team Deletion (Data Loss Risk)
- **File:** `app/api/teams/route.ts`, DELETE handler, Lines ~180-210
- **Description:** Team deletion performs three sequential operations without a transaction: (1) delete team members, (2) delete team invitations, (3) delete team. If step 3 fails, the members and invitations are already permanently deleted, leaving the team in an orphaned state with no way to recover the membership data.
- **Suggested Fix:** Use a Supabase RPC function that wraps all three deletes in a database transaction, or restructure with CASCADE foreign keys so deleting the team automatically cascades to members and invitations.

#### API-10: Non-Atomic Team Creation (Orphan Team Risk)
- **File:** `app/api/teams/route.ts`, POST handler
- **Description:** Team creation inserts the team row, then inserts the creator as a team member. If the member insert fails, a rollback delete of the team is attempted, but this rollback itself can fail, leaving an orphaned team with no members.
- **Suggested Fix:** Use a Supabase RPC function with a database transaction to create both the team and owner membership atomically.

#### API-11: Potential Open Redirect via LinkedIn Connect
- **File:** `app/api/linkedin/connect/route.ts`, Line ~34
- **Description:** The `redirectTo` parameter from the query string is stored in a cookie and later used to redirect the user after OAuth completion. While there is a basic check that it starts with `/`, this may not prevent all open redirect attack vectors (e.g., `//evil.com` as a protocol-relative URL if the check is not precise).
- **Suggested Fix:** Apply a strict sanitization function:
  ```typescript
  function sanitizeRedirect(url: string): string {
    if (url && url.startsWith('/') && !url.startsWith('//')) {
      return url
    }
    return '/dashboard'
  }
  ```

#### API-12: Missing Decryption for User API Keys in Carousel Generate
- **File:** `app/api/ai/carousel/generate/route.ts`, Lines 105-107
- **Description:** A comment says "In production, decrypt the key here" but the code returns the encrypted (base64-encoded) key directly to the OpenAI client, which means BYOK users' carousel generation will silently fail or send garbled API keys.
- **Code:**
  ```typescript
  // In production, decrypt the key here
  apiKey = userKeyRecord.encrypted_key // Should be decrypted
  ```
- **Suggested Fix:** Actually decrypt the key:
  ```typescript
  apiKey = decryptApiKey(userKeyRecord.encrypted_key)
  ```

#### API-13: Race Condition in Template Usage Count
- **File:** `app/api/templates/route.ts`, Lines 128-136
- **Description:** The PATCH handler reads the current `usage_count`, increments it in JavaScript, then writes it back. Two concurrent requests will both read the same value and write the same incremented value, losing one increment.
- **Code:**
  ```typescript
  const { data: template } = await supabase.from('templates').select('usage_count')...
  updates.usage_count = (template?.usage_count || 0) + 1
  ```
- **Suggested Fix:** Use a Supabase RPC function with `UPDATE templates SET usage_count = usage_count + 1` or use a database trigger for atomic increment.

### MEDIUM

#### API-14: Admin Pagination Broken by Client-Side Filtering
- **File:** `app/api/admin/users/route.ts`, Lines 140-184
- **Description:** The admin users endpoint fetches all profiles from the database, then applies status and `linkedinConnected` filters in JavaScript after fetching. This causes: (1) incorrect total counts for pagination, (2) pages with fewer items than expected, (3) performance issues as the dataset grows since all rows are fetched.
- **Suggested Fix:** Apply all filters at the database level using Supabase query conditions before `.range()`.

#### API-15: Admin Authorization via Hardcoded Email List
- **Files:** `app/api/admin/users/route.ts` and `app/api/admin/stats/route.ts`
- **Description:** Admin access is determined by checking if the user's email is in a hardcoded `ADMIN_EMAILS` environment variable. If this variable is not set, or if an admin's email changes, access control breaks. This is fragile and does not scale.
- **Suggested Fix:** Add an `is_admin` or `role` column to the `profiles` table and check against it in the database.

#### API-16: Hardcoded and Random Data in Admin Stats
- **File:** `app/api/admin/stats/route.ts`, Lines ~250-270
- **Description:** The admin stats endpoint returns hardcoded values for system health (always "healthy"), `aiGenerations` (always 0 for overview), and uses `Math.random()` for weekly `aiGenerations` data.
- **Code:**
  ```typescript
  aiGenerations: Math.floor(Math.random() * 50) // Fake data
  ```
- **Suggested Fix:** Either implement actual metrics tracking or clearly label these values as placeholders.

#### API-17: parseInt Without NaN Validation
- **File:** `app/api/posts/route.ts`, Lines 24-25 (also affects `swipe/wishlist/route.ts`, `discover/posts/route.ts`)
- **Description:** `limit` and `offset` are parsed with `parseInt()` but never checked for `NaN`. If a user sends `?limit=abc`, `parseInt` returns `NaN`, and `Math.min(NaN, 50)` returns `NaN`.
- **Suggested Fix:**
  ```typescript
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 50)
  const offset = parseInt(searchParams.get('offset') || '0', 10) || 0
  ```

#### API-18: Missing try-catch Around LinkedIn Post Creation
- **File:** `app/api/linkedin/post/route.ts`, Line ~109
- **Description:** The `createPost` function call is not wrapped in its own try-catch. If the LinkedIn API call throws an unexpected error, it will propagate as an unhandled exception.
- **Suggested Fix:** Wrap the LinkedIn API call in try-catch with specific error handling.

#### API-19: Type Safety Bypassed with `as any`
- **Files:** `app/api/research/status/[sessionId]/route.ts`, `app/api/research/sessions/route.ts`, `app/api/research/posts/route.ts`
- **Description:** Multiple research routes use `supabase as any` to bypass TypeScript type checking. Schema changes will not produce compile-time errors.
- **Suggested Fix:** Add the `research_sessions` and `research_results` tables to the generated Supabase database types.

#### API-20: Missing Input Validation on Carousel Template Slides
- **File:** `app/api/carousel-templates/route.ts`, Lines 168-173
- **Description:** The POST handler checks that `slides` is a non-empty array but does not validate individual slide object structure. Malformed slide data will be stored and could cause runtime errors.
- **Suggested Fix:** Add Zod schema validation for the slides array.

#### API-21: Missing Request Body Size Validation
- **Files:** All POST/PUT/PATCH endpoints that call `request.json()`
- **Description:** None of the API routes enforce a maximum request body size. An attacker could send extremely large JSON payloads consuming server memory.
- **Suggested Fix:** Add body size limits via Next.js route segment config or validate content length.

#### API-22: Unsafe User Metadata Access in Auth Callback
- **File:** `app/api/auth/callback/route.ts`, Lines 104-105
- **Description:** The code accesses `user.user_metadata?.full_name` etc. with optional chaining but does not validate that these are strings. A malicious OAuth provider could return non-string metadata.
- **Suggested Fix:**
  ```typescript
  const fullName = typeof user.user_metadata?.full_name === 'string'
    ? user.user_metadata.full_name : null
  ```

#### API-23: Duplicate Authentication Boilerplate
- **Files:** All 57 API route files
- **Description:** Nearly every endpoint repeats the same 5-line authentication pattern. This violates DRY and makes it easy to accidentally omit the check (as seen in API-4, API-5, API-6).
- **Suggested Fix:** Create an `authenticatedHandler` wrapper:
  ```typescript
  export function withAuth(handler: (req: Request, user: User, supabase: Client) => Promise<Response>) {
    return async (req: Request) => {
      const supabase = await createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      return handler(req, user, supabase)
    }
  }
  ```

#### API-24: No Rate Limiting on AI Endpoints
- **Files:** `app/api/ai/generate/route.ts`, `app/api/ai/remix/route.ts`, `app/api/ai/carousel/generate/route.ts`, `app/api/ai/playground/route.ts`, `app/api/ai/analyze-company/route.ts`
- **Description:** None of the AI-powered endpoints have rate limiting. An authenticated user can make unlimited requests, potentially generating large OpenAI/OpenRouter bills.
- **Suggested Fix:** Implement rate limiting using Supabase or Upstash Redis rate limiter.

#### API-25: Error Response Inconsistency
- **Files:** All API routes
- **Description:** Error response formats are inconsistent. Some return `{ error: 'message' }`, some return `{ error: 'message', message: 'details' }`, and some include additional fields. This makes client-side error handling unreliable.
- **Suggested Fix:** Define a standard error response type and use it consistently.

### LOW

#### API-26: Missing `updated_at` Timestamp in User Profile PATCH
- **File:** `app/api/user/route.ts`, Lines 60-65
- **Description:** The PATCH handler builds an update payload but never includes an `updated_at` timestamp.
- **Suggested Fix:** Add `updated_at: new Date().toISOString()` to the payload.

#### API-27: Overly Broad SELECT in Multiple Endpoints
- **Files:** `app/api/user/route.ts` (`select('*, linkedin_profiles (*)')`), `app/api/swipe/wishlist/route.ts` (`select('*')`), `app/api/admin/users/route.ts` (`select('*')`)
- **Description:** Using `select('*')` fetches all columns including potentially sensitive data and large text fields.
- **Suggested Fix:** Explicitly list only the columns needed for each endpoint.

#### API-28: Inconsistent Error Logging Prefixes
- **Files:** Multiple API route files
- **Description:** Error logs use inconsistent prefix patterns making log aggregation difficult.
- **Suggested Fix:** Standardize log prefixes, e.g., `[api/route-name] message`.

#### API-29: Missing `radix` Parameter in parseInt Calls
- **Files:** Multiple routes using `parseInt()`
- **Description:** Several `parseInt` calls omit the radix parameter.
- **Suggested Fix:** Always pass `10` as the second argument.

#### API-30: Carousel Template PUT Allows `usageCount` Override
- **File:** `app/api/carousel-templates/route.ts`, Line 276
- **Description:** The PUT handler accepts `usageCount` in the request body, allowing users to arbitrarily inflate popularity metrics.
- **Suggested Fix:** Remove `usageCount` from accepted update fields.

#### API-31: Missing CORS Headers
- **Files:** All API routes
- **Description:** None of the API routes explicitly set CORS headers. If APIs need to be called from the Chrome extension, requests will be blocked.
- **Suggested Fix:** Add appropriate CORS headers if cross-origin access is needed.

#### API-32: No Pagination Limit Enforcement
- **Files:** `app/api/carousel-templates/route.ts`, `app/api/templates/route.ts`, `app/api/prompts/route.ts`
- **Description:** Several GET endpoints fetch all matching records without enforcing a maximum limit.
- **Suggested Fix:** Add default pagination with reasonable limits (max 100 items per page).

#### API-33: LinkedIn Voyager Routes Trust Extension-Provided Cookies
- **Files:** `app/api/linkedin/voyager/post/route.ts`, `app/api/linkedin/voyager/metrics/route.ts`
- **Description:** These endpoints accept LinkedIn session cookies from the request body. A compromised client could send stolen cookies through this endpoint.
- **Suggested Fix:** Store LinkedIn cookies server-side and retrieve by user ID.

#### API-34: Brand Kit Extract Has No URL Validation (SSRF Risk)
- **File:** `app/api/brand-kit/extract/route.ts`
- **Description:** Accepts a URL to analyze without validating protocol, domain, or response content type. An attacker could provide an internal network URL.
- **Suggested Fix:** Validate HTTPS protocol, reject private/internal IPs, check response content type.

#### API-35: Swipe Generate Triggers Inngest Without Idempotency
- **File:** `app/api/swipe/generate/route.ts`
- **Description:** No idempotency key on the Inngest event. Double-clicking generates duplicate suggestions and doubles API costs.
- **Suggested Fix:** Add idempotency check or cooldown period per user.

#### API-36: Prompts Rollback Does Not Verify Version Belongs to Prompt
- **File:** `app/api/prompts/[id]/rollback/route.ts`
- **Description:** Activates a version by `versionId` without verifying it belongs to the prompt identified by `[id]`. A user could activate a version from a different prompt.
- **Suggested Fix:** Add `.eq('prompt_id', params.id)` to the version lookup query.

#### API-37: Research Start Does Not Validate Topic Length
- **File:** `app/api/research/start/route.ts`
- **Description:** Accepts a `topic` string without length validation. Extremely long topics consume excessive AI tokens.
- **Suggested Fix:** Add max length validation (e.g., 500 characters).

#### API-38: Settings API Keys Stored Without Hash for Verification
- **File:** `app/api/settings/api-keys/route.ts`
- **Description:** No hash of the full key is stored, meaning verification requires full decryption. Complicates key rotation.
- **Suggested Fix:** Store a SHA-256 hash alongside the encrypted version.

---

## Part 2: Components (23 bugs)

### CRITICAL

#### CMP-1: Memory Leak - ObjectURL Not Cleaned Up on Unmount
- **File:** `components/features/post-composer.tsx`, Line ~476
- **Description:** `URL.createObjectURL(file)` is called in `handleFileSelect` but if the component unmounts while files are still attached, the object URLs are never revoked. The cleanup only happens on explicit file removal by the user.
- **Suggested Fix:** Add a `useEffect` cleanup that iterates over all current media files and revokes their ObjectURLs on component unmount.

#### CMP-2: Race Condition in PDF Export Loop
- **File:** `components/features/canvas-editor/canvas-editor.tsx`, Lines 225-235
- **Description:** The export function iterates over slides, calls `setCurrentSlide(i)`, then waits for one `requestAnimationFrame` plus a 100ms `setTimeout` before capturing. React re-renders are not guaranteed to complete in that time. On slower machines, the canvas may not reflect the correct slide before capture, producing incorrect or blank PDF pages.
- **Suggested Fix:** Use a callback ref or explicit Konva stage `batchDraw()` completion callback to confirm the slide has actually rendered before capturing.

### HIGH

#### CMP-3: Timer Leak in handleSave
- **File:** `components/features/settings.tsx`, Lines ~453-456
- **Description:** `setTimeout(() => setSaveStatus('idle'), 3000)` in the `finally` block. If the component unmounts during that 3-second window, `setSaveStatus` is called on an unmounted component.
- **Suggested Fix:** Store the timeout ID in a ref and clear it in a cleanup function on unmount.

#### CMP-4: Memory Leak - setInterval Not Cleaned Up
- **File:** `components/features/media-upload.tsx`, Line ~280
- **Description:** `setInterval` for progress simulation continues running if component unmounts during upload.
- **Suggested Fix:** Store the interval ID and clear it in a `useEffect` cleanup function.

#### CMP-5: Timer Leak in handleCopy (repeated pattern)
- **File:** `components/features/post-actions-menu.tsx`, Line 71
- **Description:** `setTimeout(() => setCopied(false), 2000)` without storing the timeout ID. Pattern repeated in multiple files.
- **Suggested Fix:** Use a ref to store the timeout ID and clear it on unmount.

#### CMP-6: Props Not Synced to State
- **File:** `components/features/settings.tsx`, Lines ~276-277, ~301
- **Description:** `profileName` and `profileEmail` state are initialized from the `user` prop, and `members` state is initialized from `teamMembers` prop, but none of these update if props change. After parent re-fetch, the settings form shows stale values.
- **Suggested Fix:** Add `useEffect` hooks that sync state with props when props change.

#### CMP-7: Global Keyboard Event Listener Interference
- **File:** `components/features/swipe-interface.tsx`, Lines ~270-283
- **Description:** Adds `window.addEventListener("keydown")` that captures ArrowLeft, ArrowRight, ArrowUp, and ArrowDown globally. Interferes with accessibility navigation, input fields, and other components.
- **Suggested Fix:** Only listen when the swipe interface has focus, or check if `e.target` is within the component's DOM tree.

#### CMP-8: useExtensionPrompt Infinite Re-trigger Risk
- **File:** `components/features/extension-install-prompt.tsx`, Lines ~291-295
- **Description:** `useEffect` has `checkAndShowPrompt` in its dependency array, but `checkAndShowPrompt` depends on `isChecking`. When `isChecking` changes, `checkAndShowPrompt` gets a new reference, potentially triggering an infinite loop (mitigated only by the `if (isChecking) return` guard).
- **Suggested Fix:** Remove `isChecking` from `checkAndShowPrompt`'s dependency array, or use a ref for the checking state.

### MEDIUM

#### CMP-9: Shared saveStatus Across Unrelated Tabs
- **File:** `components/features/settings.tsx`
- **Description:** A single `saveStatus` state is used across all 7 settings tabs. Saving in one tab and switching shows "Saved" in the wrong context.
- **Suggested Fix:** Track `saveStatus` per-tab or clear on tab change.

#### CMP-10: Stale Closure in useMemo
- **File:** `components/features/post-detail-modal.tsx`, Lines ~411-414
- **Description:** `relativeTime` useMemo depends on `[post]` but should depend on `[post?.publishedAt]` for precision. Dependency is too broad.
- **Suggested Fix:** Change dependency to `[post?.publishedAt]`.

#### CMP-11: Missing ObjectURL Cleanup on Logo Change
- **File:** `components/features/company-setup-form.tsx`, Lines 226-232
- **Description:** Cleanup revokes URL on unmount, but if user selects a new logo, the previous ObjectURL is not revoked before creating a new one.
- **Suggested Fix:** Revoke the previous `logoUrl` inside `handleFileSelect` before creating a new one.

#### CMP-12: Local isSaved State Not Synced With External Source
- **File:** `components/features/discover-content-card.tsx`, Line 116
- **Description:** `isSaved` state is purely local (initialized as `false`). Re-rendering from parent always shows the article as unsaved.
- **Suggested Fix:** Accept an `isSaved` prop from the parent component.

#### CMP-13: Missing Error Handling for clipboard.writeText
- **File:** `components/features/research-section.tsx`, Line ~507
- **Description:** `navigator.clipboard.writeText(post.content)` called without try/catch. Throws on older browsers or insecure contexts.
- **Suggested Fix:** Wrap in try/catch and show an error toast on failure.

#### CMP-14: Sparkline Data Regenerated Every Render
- **File:** `components/features/analytics-cards.tsx`, Line ~213
- **Description:** `generateSparklineData(trend.isPositive)` uses `Math.random()` and is called inside render without memoization. Sparkline bars jump to new values on every re-render.
- **Suggested Fix:** Memoize with `useMemo` or move generation into `useState` initializer.

#### CMP-15: setTimeout Not Cleaned Up After Invitation
- **File:** `components/features/invite-teammates-form.tsx`, Line ~277
- **Description:** `setTimeout(() => { onComplete() }, 1500)` after successful invitation. Timer continues if component unmounts.
- **Suggested Fix:** Store timer ID in ref, clear on unmount.

#### CMP-16: useEffect Triggered on Every Modal Open
- **File:** `components/features/manage-topics-modal.tsx`, Lines ~92-97
- **Description:** `setTimeout(() => inputRef.current?.focus(), 100)` not cleaned up. Rapid open/close creates multiple focus attempts.
- **Suggested Fix:** Return a cleanup function that clears the timeout.

### LOW

#### CMP-17: Duplicated Utility Functions Across Files
- **Files:** `post-detail-modal.tsx`, `team-leaderboard.tsx`, `post-performance.tsx`, `team-activity-feed.tsx`, `discover-content-card.tsx`, `inspiration-post-card.tsx`, `research-section.tsx`
- **Description:** `formatMetricNumber()`, `getInitials()`, etc. duplicated across 7+ files.
- **Suggested Fix:** Extract into shared utility functions in `lib/utils.ts`.

#### CMP-18: Missing aria-label on Interactive Elements
- **Files:** `emoji-picker.tsx`, `brand-kit-preview.tsx`, `wishlist-collection-sidebar.tsx`
- **Description:** Color swatches, emoji pickers, icon buttons lack `aria-label` attributes.
- **Suggested Fix:** Add descriptive `aria-label` attributes.

#### CMP-19: Hardcoded Sample Data in Production Components
- **Files:** `post-detail-modal.tsx`, `team-leaderboard.tsx`, `post-performance.tsx`, `scheduled-posts.tsx`, `team-activity-feed.tsx`, `goals-tracker.tsx`
- **Description:** Multiple components export sample/mock data alongside production code, increasing bundle size.
- **Suggested Fix:** Move sample data to `__fixtures__` or `__tests__` directories.

#### CMP-20: Missing Error Boundary Around Canvas Stage
- **File:** `components/features/canvas-editor/canvas-editor.tsx`
- **Description:** Dynamically imported Konva `CanvasStage` has no error boundary. If Konva crashes, the entire editor UI crashes.
- **Suggested Fix:** Wrap in an error boundary component.

#### CMP-21: Falsy Check Instead of Null Check on Metrics
- **File:** `components/features/post-detail-modal.tsx`, Line 524
- **Description:** `{post.metrics.impressions && (...)}` -- if impressions is `0`, the section won't render. Zero is a valid displayable value.
- **Suggested Fix:** Change to `{post.metrics.impressions != null && (...)}`.

#### CMP-22: No Debounce on Form Watch for localStorage
- **File:** `components/features/company-onboarding-form.tsx`, Lines ~178-185
- **Description:** `form.watch()` triggers `saveCompanyContextToStorage()` on every keystroke. Dozens of `localStorage.setItem()` calls per second.
- **Suggested Fix:** Debounce the save call (e.g., 500ms).

#### CMP-23: Index as Key in Sparkline Bars
- **Files:** `team-leaderboard.tsx`, `post-performance.tsx`, `analytics-cards.tsx`
- **Description:** Array index used as `key` in sparkline bars with random data regeneration. React cannot efficiently reconcile.
- **Suggested Fix:** Use stable keys or memoize the data.

---

## Part 3: Hooks & Services (21 bugs)

### CRITICAL

#### HK-1: Infinite Re-render Loop from `createClient()` in useCallback Dependencies
- **Files:** `hooks/use-analytics.ts` (lines 130, 287), `hooks/use-settings.ts` (lines 126, 299), `hooks/use-templates.ts` (lines 90, 155), `hooks/use-scheduled-posts.ts` (lines 104, 178), `hooks/use-posting-goals.ts` (lines 160, 256), `hooks/use-post-analytics.ts` (lines 152, 264), `hooks/use-swipe-suggestions.ts` (lines 118, 191), `hooks/use-company.ts` (lines 91, 197), `hooks/use-swipe-actions.ts` (lines 144, 202), `hooks/use-inspiration.ts` (lines 230, 511), `hooks/use-swipe-wishlist.ts` (line 119), `hooks/use-generated-suggestions.ts` (line 126)
- **Description:** `const supabase = createClient()` is called at the top of each hook function body on every render. When this `supabase` variable is listed in a `useCallback` dependency array (e.g., `[supabase, ...]`), it causes the callback to be re-created every render, which triggers `useEffect(() => { fetchX() }, [fetchX])` on every render, leading to infinite fetch loops. Contrast with `lib/auth/auth-provider.tsx` (line 153) which correctly uses `useMemo(() => createClient(), [])`.
- **Note:** Whether this fires infinitely depends on `createBrowserClient`'s internal singleton behavior. If the library returns the exact same object reference each time, dependency arrays are stable. However, this is an implementation detail that could break with library upgrades, and the code pattern is incorrect regardless.
- **Suggested Fix:** Memoize: `const supabase = useMemo(() => createClient(), [])` or remove `supabase` from all dependency arrays.

### HIGH

#### HK-2: Stale Closure in `useAuth` Hook
- **File:** `hooks/use-auth.ts`, Lines 49, 54-66
- **Description:** `const supabase = createClient()` on every render (line 49) with `[supabase]` in dependency array (line 66). Same infinite loop pattern. Additionally, this hook is separate from `AuthProvider`'s `useAuthContext` and appears to be an older redundant implementation.
- **Suggested Fix:** Remove this hook entirely (AuthProvider supersedes it), or memoize the client.

#### HK-3: Race Condition in `useDiscover` Retry/Refresh
- **File:** `hooks/use-discover.ts`, Lines 770-797
- **Description:** `retry` and `refresh` functions use `state.activeTopic` from stale closure. The pattern of setting state to empty then restoring via `setTimeout(0)` captures `currentTopic` at callback creation time. If the active topic changes between creation and invocation, the wrong topic is restored.
- **Suggested Fix:** Read `activeTopic` from the state setter's previous value, or use a ref.

#### HK-4: Stale Closure in `useCarousel`
- **File:** `hooks/use-carousel.ts`, Lines 141-169
- **Description:** `addSlide` uses `slides.length` from closure (line 148). `removeSlide` reads `slides.length` and `currentSlideIndex` from closure (lines 155, 160, 164-168). Multiple rapid operations use stale values.
- **Suggested Fix:** Use functional updater form of setState or update index in the same callback where slides change.

#### HK-5: Missing AbortController in Nearly All Hooks
- **Files:** `use-analytics.ts`, `use-settings.ts`, `use-templates.ts`, `use-team.ts`, `use-scheduled-posts.ts`, `use-posting-goals.ts`, `use-post-analytics.ts`, `use-brand-kit.ts`, `use-api-keys.ts`, `use-linkedin-post.ts`, `use-swipe-suggestions.ts`, `use-swipe-actions.ts`, `use-wishlist-collections.ts`, `use-swipe-wishlist.ts`, `use-generated-suggestions.ts`, `use-prompts.ts`, `use-admin-stats.ts`, `use-discover.ts`, `use-company.ts`
- **Description:** When a component unmounts while a fetch is in flight, the response handler attempts to call setState on an unmounted component. Only `use-research.ts` and `lib/auth/auth-provider.tsx` properly use AbortController.
- **Suggested Fix:** Add AbortController signals to all fetch calls within useEffect-triggered fetches, abort in cleanup.

#### HK-6: Cleanup Return Ignored in Onboarding Guard
- **File:** `hooks/use-onboarding-guard.ts`, Lines 234-237
- **Description:** Inside the `verify` async function, `return () => clearTimeout(timeout)` is from the async function, not from the `useEffect` callback. React ignores it. The `setTimeout` will never be cleared.
- **Suggested Fix:** Move timeout management to the `useEffect` level with a ref.

### MEDIUM

#### HK-7: Race Condition in Template Usage Increment
- **File:** `hooks/use-templates.ts`, Lines 271-291
- **Description:** `incrementUsage` reads `rawTemplates` from closure. The update is not atomic -- reads current count from local state and increments.
- **Suggested Fix:** Use a Supabase RPC function for atomic increment.

#### HK-8: Auto-Select Stale Closure in `usePostAnalytics`
- **File:** `hooks/use-post-analytics.ts`, Lines 253-255
- **Description:** `selectedPost` captured at callback creation time. If a post was selected between renders but before fetch completes, this may overwrite the user's selection.
- **Suggested Fix:** Use a ref to track if a post has been selected.

#### HK-9: Initial Fetch Inefficiency in `useSwipeSuggestions`
- **File:** `hooks/use-swipe-suggestions.ts`, Lines 255-258
- **Description:** `fetchCategories` fetches ALL rows from `inspiration_posts` just to get unique categories (`select('category')` with no limit).
- **Suggested Fix:** Add a limit or use a `DISTINCT` approach. Add cleanup/abort logic.

#### HK-10: CanUndo/CanRedo Computed from Refs
- **File:** `hooks/use-canvas-editor.ts`, Lines 531-532
- **Description:** `canUndo`/`canRedo` calculated from ref values that don't trigger re-renders. After `saveToHistory` adds an entry without dispatch, the UI won't update.
- **Suggested Fix:** Track history index in state if the UI needs to react to it.

#### HK-11: `loadMore` Stale Closure in `useDiscover`
- **File:** `hooks/use-discover.ts`, Lines 642-671
- **Description:** Rapid `loadMore` invocations can both pass the `isLoadingMore` guard due to stale closure, causing duplicate fetches.
- **Suggested Fix:** Use a ref for the `isLoadingMore` guard.

#### HK-12: No Timeout on Webhook Call
- **File:** `services/onboarding.ts`, Lines 150-194
- **Description:** Webhook call to external URL has no timeout or abort controller. If the server hangs, the user waits indefinitely.
- **Suggested Fix:** Add AbortController with 30-second timeout.

#### HK-13: Multiple Supabase Client Instantiations in Service Functions
- **File:** `services/onboarding.ts` (lines 83, 114, 151, 372, 421, 468, 510, 557, 617, 710, 767, 821)
- **Description:** Every function creates a new `createClient()` instance. Could lead to inconsistent session state.
- **Suggested Fix:** Create a single module-level client or pass as parameter.

### LOW

#### HK-14: `useAutoSave` Uses JSON.stringify for Deep Comparison
- **File:** `hooks/use-auto-save.ts`, Lines 33-34
- **Description:** `JSON.stringify` called on every render. Expensive for large objects and not order-stable for object keys.
- **Suggested Fix:** Use `lodash.isEqual` or track changes via a version number.

#### HK-15: `useIsMobile` Returns `false` During SSR
- **File:** `hooks/use-mobile.ts`, Line 18
- **Description:** Initial state is `undefined`, return value is `!!isMobile`. During SSR this returns `false`, potentially causing hydration mismatch.
- **Suggested Fix:** Return `isMobile` as `boolean | undefined`.

#### HK-16: DraftProvider Does Not Revoke Object URLs
- **File:** `lib/store/draft-context.tsx`
- **Description:** When media files are removed via `removeMediaFile` or `clearMediaFiles`, object URLs are never revoked.
- **Suggested Fix:** Call `URL.revokeObjectURL(file.previewUrl)` before filtering.

#### HK-17: Unnecessary Database Updates on Every Step Visit
- **File:** `hooks/use-onboarding-guard.ts`, Lines 186-189
- **Description:** `updateOnboardingStepInDatabase(currentPathStep)` called every time user navigates to any step page, even revisiting the same step.
- **Suggested Fix:** Only call when `currentPathStep > highestStep`, not `>=`.

#### HK-18: Filter Clear Doesn't Trigger Refetch
- **File:** `hooks/use-swipe-suggestions.ts`, Lines 261-265
- **Description:** When a user clears a filter back to `undefined`, the effect won't trigger a refetch, leaving stale filtered data.
- **Suggested Fix:** Track initial render and always refetch when filters change from any value.

#### HK-19: Stale Collections in `deleteCollection`
- **File:** `hooks/use-wishlist-collections.ts`, Lines 212-256
- **Description:** `deleteCollection` reads stale `collections` from closure. Rapid deletions may use wrong data.
- **Suggested Fix:** Use a ref or functional updater pattern.

#### HK-20: Admin Hooks Fetch Without Client-Side Admin Check
- **Files:** `hooks/use-admin-stats.ts`, `hooks/use-admin-settings.ts`, `hooks/use-admin-users.ts`, `hooks/use-admin-prompts.ts`
- **Description:** Hooks fetch from `/api/admin/*` on mount without checking if user is admin. Non-admin users trigger unnecessary requests.
- **Suggested Fix:** Accept an `isAdmin` prop and only fetch when confirmed admin.

---

## Part 4: Auth & Middleware (20 bugs)

### HIGH

#### AUTH-1: localStorage Step Tampering Bypasses Onboarding
- **File:** `hooks/use-onboarding-guard.ts`, Line 171
- **Description:** Reconciliation uses `Math.max(dbStep, localStep)`. Since localStorage is user-writable, a user can set `chainlinked_onboarding_step` to `4`. The guard reconciles to step 4 and writes it back to the database (line 187), skipping all onboarding.
- **Suggested Fix:** Database must be the sole authority. Never let localStorage override upward:
  ```typescript
  const highestStep = dbStep
  setLocalStep(dbStep)
  ```

#### AUTH-2: Middleware Misses Application Routes
- **File:** `middleware.ts`, Lines 71-74
- **Description:** `protectedPaths` only includes 7 paths: `/dashboard`, `/composer`, `/schedule`, `/team`, `/templates`, `/settings`, `/onboarding`. Routes like `/analytics`, `/discover`, `/inspiration`, `/carousels`, `/prompts`, `/swipe` are unprotected. New routes will be unprotected by default.
- **Suggested Fix:** Invert to deny-by-default:
  ```typescript
  const publicPaths = ['/login', '/signup', '/forgot-password', '/api/auth', '/']
  const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))
  if (!isPublicPath && !user) { /* redirect to login */ }
  ```

#### AUTH-3: LinkedIn Access Token Exposed to Client
- **File:** `lib/auth/auth-provider.tsx`, Lines 168-172
- **Description:** AuthProvider fetches profile with `select('*')` returning `linkedin_access_token`. Token stored in React state, accessible to browser extensions, PostHog session replay, and XSS attacks.
- **Suggested Fix:** Select only needed columns excluding the access token. Add RLS policies to prevent client reads.

### MEDIUM

#### AUTH-4: Middleware Fail-Open on Invite Redirect
- **File:** `middleware.ts`, Lines 96-117
- **Description:** If profile query times out, `inviteProfile` is `null`, code falls through to redirect to invite page -- allowing a user who hasn't completed onboarding to accept invites.
- **Suggested Fix:** When timeout fires during invite flow, redirect to onboarding instead of falling through.

#### AUTH-5: Open Redirect via Auth Callback
- **File:** `app/api/auth/callback/route.ts`, Line 54
- **Description:** `sanitizeRedirect` only checks `startsWith('/')` and `!startsWith('//')`. Paths like `/\example.com` can bypass in some environments. The `next` parameter is controlled by the OAuth callback URL assembled client-side.
- **Suggested Fix:** Strengthen to reject backslashes and use allowlist:
  ```typescript
  function sanitizeRedirect(url: string): string {
    if (!url || !url.startsWith('/') || url.startsWith('//') || url.includes('\\')) {
      return '/dashboard'
    }
    const allowedPrefixes = ['/dashboard', '/onboarding', '/settings', '/composer', '/schedule', '/team', '/templates']
    if (!allowedPrefixes.some(prefix => url.startsWith(prefix))) {
      return '/dashboard'
    }
    return url
  }
  ```

#### AUTH-6: User Enumeration in Resend Verification
- **File:** `app/api/auth/resend-verification/route.ts`, Lines 18-86
- **Description:** Error at line 62 distinguishes between "not found" and valid emails, enabling user enumeration. No server-side rate limiting.
- **Suggested Fix:** Return same generic success message regardless of whether email exists.

#### AUTH-7: Onboarding Step-Skip Logic
- **File:** `hooks/use-onboarding-guard.ts`, Lines 171-189
- **Description:** Guard writes step to database just by visiting a page. User on step 1 visits step 2 (allowed since `2 <= 1+1`), which updates DB to 2. Then step 3 is accessible without completing step 2.
- **Suggested Fix:** Remove the guard's DB write. Only advance on explicit `handleNext`.

#### AUTH-8: Profile Fetch Timeout Causes Re-Onboarding
- **File:** `lib/auth/auth-provider.tsx`, Lines 350-367
- **Description:** When profile fetch times out, profile is `null`, `hasCompletedOnboarding` becomes `false`, redirecting a user who completed onboarding back to it.
- **Suggested Fix:** Retry on timeout, or keep stale profile data as fallback.

#### AUTH-9: PostHog Session Recording Captures Sensitive Data
- **File:** `components/posthog-provider.tsx`, Lines 78-103
- **Description:** `recordBody: true` with masking only for top-level fields. Does not mask nested data, response bodies, LinkedIn tokens, or auth endpoints.
- **Suggested Fix:** Add comprehensive masking, disable `recordBody` for `/api/auth/*` and `/api/user/*`.

### LOW

#### AUTH-10: Missing CSRF on Resend Verification
- **File:** `app/api/auth/resend-verification/route.ts`, Line 18
- **Description:** POST accepts requests without CSRF token. Malicious sites could trigger cross-origin POSTs.
- **Suggested Fix:** Verify `Origin` or `Referer` header.

#### AUTH-11: `useAuthContext` Returns Silent Defaults Outside Provider
- **File:** `lib/auth/auth-provider.tsx`, Lines 436-454
- **Description:** Returns safe defaults (`isLoading: true`) instead of throwing, masking bugs where components are accidentally outside the provider.
- **Suggested Fix:** Add development-mode warning via `console.warn`.

#### AUTH-12: Signup Auto-Confirm Bypasses Onboarding
- **File:** `app/signup/page.tsx`, Lines 137-141
- **Description:** When Supabase auto-confirms, signup routes to `/dashboard` via client-side navigation, bypassing middleware's onboarding check.
- **Suggested Fix:** Route to `/onboarding/step1` instead of `/dashboard` for new signups.

#### AUTH-13: Auth Callback Creates Incomplete Profile
- **File:** `app/api/auth/callback/route.ts`, Lines 100-112
- **Description:** Fallback profile creation omits `onboarding_completed`, `onboarding_current_step`, `company_onboarding_completed` fields, relying on database defaults.
- **Suggested Fix:** Explicitly set onboarding fields in the insert.

#### AUTH-14: User ID Leaked to External Webhook
- **File:** `services/onboarding.ts`, Lines 150-164
- **Description:** `user_id` sent to external webhook URL. Since `NEXT_PUBLIC_` prefix exposes the URL to the client, the internal UUID is visible.
- **Suggested Fix:** Route through a server-side API endpoint.

#### AUTH-15: isLoading Never Set to False on Login Success
- **File:** `app/login/page.tsx`, Lines 131-135
- **Description:** On successful sign-in, `setIsLoading(false)` is never called. If navigation is slow, the button stays in loading state.
- **Suggested Fix:** Informational -- navigation replaces the page. But add `finally` block for robustness.

#### AUTH-16: Onboarding Layout Remounts Children on Navigation
- **File:** `app/onboarding/layout.tsx`, Line 1
- **Description:** `key={pathname}` on `<main>` causes full child unmount/remount. Form data lost on back navigation.
- **Suggested Fix:** Remove `key={pathname}` or persist form state in context.

#### AUTH-17: Onboarding Entry Does Not Clamp Step Number
- **File:** `app/onboarding/page.tsx`, Line 46
- **Description:** Navigates to `/onboarding/step${step}` without clamping. Out-of-range values (0, 5, negative) result in 404.
- **Suggested Fix:** `const step = Math.min(Math.max(currentOnboardingStep || 1, 1), 4)`.

#### AUTH-18: Multiple Supabase Client Instantiations in Service Functions
- **File:** `services/onboarding.ts` (throughout)
- **Description:** Every function creates a new client. Could lead to inconsistent session state during token refresh.
- **Suggested Fix:** Export a singleton or verify library de-duplication.

#### AUTH-19: TOCTOU Race in `updateOnboardingStepInDatabase`
- **File:** `services/onboarding.ts`, Lines 720-731
- **Description:** Reads current step, then conditionally updates. Between read and write, another request could update the step.
- **Suggested Fix:** Use conditional update in single SQL: `.update({step}).eq('id', userId).lt('onboarding_current_step', step)`.

#### AUTH-20: Unsanitized Error Messages from URL Parameters
- **File:** `app/login/page.tsx`, Lines 59-66
- **Description:** `errorParam` and `successParam` from URL search params passed directly to `toast.error()` and `toast.success()`. Could display misleading phishing messages via URL manipulation.
- **Suggested Fix:** Use predefined error messages mapped by error codes.

---

## Part 5: Extension & Types (30 bugs)

### CRITICAL

#### EXT-1: Missing Database Table Types for Sync Bridge
- **File:** `extension/src/background/supabase-sync-bridge.ts`, Lines 35-47 vs `types/database.ts`
- **Description:** The sync bridge's `STORAGE_TABLE_MAP` maps 6 keys to Supabase tables that do NOT exist in `database.ts`: `connections`, `comments`, `followers`, `captured_apis`, `capture_stats`, `audience_history`. Any sync operation targeting these tables will fail at runtime or bypass type safety.
- **Suggested Fix:** Add missing table type definitions to `database.ts` or remove stale entries from `STORAGE_TABLE_MAP`.

#### EXT-2: OAuth2 Client ID Exposed in Manifest
- **File:** `extension/manifest.json`, Lines 79-88
- **Description:** Google OAuth `client_id` and extension `key` are committed directly. If the repository is public, attackers could craft phishing consent screens or abuse the Google Cloud project's quota.
- **Suggested Fix:** Use build-time environment variable substitution for `client_id`.

### HIGH

#### EXT-3: Triple-Initialization of Service Worker
- **File:** `extension/src/background/service-worker.ts`, Lines 2913-3012
- **Description:** `initHistoryManager()`, `initializeAlarms()`, `initBackgroundSync()`, and `setupNotificationListeners()` are called in three places: `onInstalled`, `onStartup`, and top-level IIFE. On browser startup after an extension update, all three execute simultaneously, causing triple-initialization with potential race conditions.
- **Suggested Fix:** Consolidate into a single `initialize()` function with a guard variable.

#### EXT-4: `isSyncing` Guard Lost on Service Worker Restart
- **File:** `extension/src/background/background-sync.ts`, Line 312
- **Description:** In-memory boolean resets when MV3 service worker restarts. No real protection against concurrent syncs after restart.
- **Suggested Fix:** Persist a `syncInProgress` flag to `chrome.storage.local` with a staleness timeout.

#### EXT-5: `sleep()` Calls Can Cause Service Worker Termination
- **File:** `extension/src/background/background-sync.ts`, Lines 491-493, 1445-1447
- **Description:** 1-4 second delays between API calls can cause Chrome to terminate the service worker (30s idle / 5min total limit). Leaves sync state inconsistent if terminated mid-cycle.
- **Suggested Fix:** Use `chrome.alarms` for individual endpoint fetches. Persist intermediate state after each endpoint.

#### EXT-6: `ExportFormat` Type Name Collision
- **Files:** `types/canvas-editor.ts` (line 29: `'pdf' | 'png'`) vs `extension/src/shared/types.ts` (line 355: `'json' | 'csv'`)
- **Description:** Two completely different types named `ExportFormat`. Importing from both modules creates ambiguity.
- **Suggested Fix:** Rename to `CanvasExportFormat` and `DataExportFormat`.

#### EXT-7: `TemplateCategory` Type Name Collision
- **Files:** `types/index.ts` (lines 47-54) vs `types/canvas-editor.ts` (line 24)
- **Description:** Completely different unions with the same name.
- **Suggested Fix:** Rename one to `CanvasTemplateCategory` or `PostTemplateCategory`.

#### EXT-8: `TopPost` Type Name Collision
- **Files:** `types/admin.ts` (lines 106-119) vs `extension/src/shared/types.ts` (lines 50-58)
- **Description:** Both export `TopPost` with entirely different shapes.
- **Suggested Fix:** Rename to `AdminTopPost` and `LinkedInTopPost`.

#### EXT-9: `DemographicItem` Type Name Collision
- **Files:** `types/index.ts` (lines 85-89) vs `extension/src/shared/types.ts` (lines 77-81)
- **Description:** Web app has `{ name, value, percentage }`, extension has `{ name, percentage, count? }`. Code consuming from wrong source accesses non-existent fields.
- **Suggested Fix:** Unify or rename distinctly.

#### EXT-10: `BrandKit` Interface Collision
- **Files:** `types/index.ts` (lines 145-151, simplified) vs `types/brand-kit.ts` (lines 78-113, full)
- **Description:** Different import paths give different types silently. `types` barrel gives simplified version, `types/brand-kit` gives full version.
- **Suggested Fix:** Remove simplified `BrandKit` from `types/index.ts`.

### MEDIUM

#### EXT-11: `onInstalled` Overwrites User Settings on Update
- **File:** `extension/src/background/service-worker.ts`, Lines 2943-2949
- **Description:** Unconditionally saves default settings without checking `details.reason`. On every extension update, user settings are overwritten. Also, saved fields don't match the `ExtensionSettings` interface.
- **Suggested Fix:** Only write defaults when `details.reason === 'install'`.

#### EXT-12: Weekly Backup Off-by-One
- **File:** `extension/src/background/alarms.ts`, Lines 91-98
- **Description:** `getDaysUntilWeekday()` adds 7 when `daysUntil === 0`, scheduling for next week instead of today (if time hasn't passed yet).
- **Suggested Fix:** Change `if (daysUntil <= 0)` to `if (daysUntil < 0)`.

#### EXT-13: `startPeriodicSync` Uses setInterval in MV3
- **File:** `extension/src/background/service-worker.ts`, Line 3003
- **Description:** `setInterval` does not prevent service worker termination and is lost when worker stops.
- **Suggested Fix:** Replace with `chrome.alarms`-based implementation.

#### EXT-14: In-Memory Message Queue Lost on Navigation
- **File:** `extension/src/shared/retry-utils.ts`, Lines 314-329
- **Description:** `messageQueue` array is in-memory, lost on page navigation. All queued messages silently discarded.
- **Suggested Fix:** Persist queue to `chrome.storage.local`.

#### EXT-15: Unsafe Array-to-Object Cast in `saveWithSync`
- **File:** `extension/src/background/service-worker.ts`, Line 624
- **Description:** `data as Record<string, unknown>` cast is incorrect when `T` is an array (e.g., `linkedin_my_posts`, `captured_apis`).
- **Suggested Fix:** Add type guard for arrays, handle array data differently.

#### EXT-16: Falsy Values Swallowed by `||`
- **File:** `extension/src/background/service-worker.ts`, Line 644
- **Description:** `result[key] || null` replaces `0`, `false`, `""` with `null`. Counter stored as `0` returns `null`.
- **Suggested Fix:** Change to `result[key] ?? null`.

#### EXT-17: Missing `ensureUserId` in `appendToStorage`
- **File:** `extension/src/background/service-worker.ts`, Line 679
- **Description:** Doesn't call `ensureUserId()` before checking `getCurrentUserId()`. After service worker restart, always takes non-sync path.
- **Suggested Fix:** Add `const userId = await ensureUserId()` before sync check.

#### EXT-18: No Rate-Limit Abort in Background Sync
- **File:** `extension/src/background/background-sync.ts`, Lines 489-543
- **Description:** When 429 or 999 status received, sync continues to next endpoint instead of aborting. Additional requests worsen rate limiting.
- **Suggested Fix:** Break out of loop on 429/999, record remaining endpoints as skipped.

#### EXT-19: No Fetch Timeout on LinkedIn API Calls
- **File:** `extension/src/background/linkedin-api.ts`, Lines 307-312
- **Description:** `fetch` called without AbortController timeout. Hanging connection keeps service worker alive until Chrome force-terminates it.
- **Suggested Fix:** Add AbortController with 30-second timeout.

#### EXT-20: Hardcoded LinkedIn Voyager Client Version
- **File:** `extension/src/background/linkedin-api.ts`, Lines 171-172
- **Description:** `clientVersion: '1.13.8960'` is static. LinkedIn changes versions periodically; outdated versions trigger 999 bot detection.
- **Suggested Fix:** Extract dynamically from LinkedIn page or make configurable.

#### EXT-21: Storage Key Race Condition for Profile Views
- **File:** `extension/src/background/background-sync.ts`, Lines 65-70
- **Description:** `processAnalyticsData` and `processProfileViewsData` both read-modify-write the same `ANALYTICS` storage key. Running nearly simultaneously, they clobber each other's data.
- **Suggested Fix:** Use atomic storage operations or separate storage keys.

### LOW

#### EXT-22: Missing `connect-src` for Google OAuth Domains
- **File:** `extension/manifest.json`, Line 26
- **Description:** CSP allows `https://www.googleapis.com` but not `https://accounts.google.com` or `https://oauth2.googleapis.com`.
- **Suggested Fix:** Add missing domains to `connect-src`.

#### EXT-23: Redundant `host_permissions` Pattern
- **File:** `extension/manifest.json`, Lines 19-23
- **Description:** Both `https://*.linkedin.com/*` and `https://www.linkedin.com/*` listed. Wildcard already covers www.
- **Suggested Fix:** Remove `https://www.linkedin.com/*`.

#### EXT-24: Deprecated `String.substr()` Usage
- **File:** `extension/src/shared/storage.ts`, Lines 98, 176
- **Description:** `Math.random().toString(36).substr(2, 9)` uses deprecated method.
- **Suggested Fix:** Replace with `.substring(2, 11)`.

#### EXT-25: `Math.random()` for UUID Generation
- **File:** `extension/src/background/linkedin-api.ts`, Lines 70-76
- **Description:** Not cryptographically secure. `crypto.randomUUID()` is available in service workers.
- **Suggested Fix:** Replace with `crypto.randomUUID()`.

#### EXT-26: Index Signatures Weaken Type Safety
- **File:** `extension/src/shared/types.ts`, Lines 26, 47, 96, 124, 152
- **Description:** `[key: string]: unknown` on interfaces makes every access `unknown` and prevents flagging typos.
- **Suggested Fix:** Remove index signatures, use explicit optional fields.

#### EXT-27: Missing Default for `onboarding_current_step`
- **File:** `types/database.ts`, Lines 93, 118
- **Description:** Row type is `number` (required), Insert type is `number?` (optional). Without DB default, inserts without this field fail.
- **Suggested Fix:** Add `DEFAULT 1` in database or make Row type nullable.

#### EXT-28: Duplicate Status Type Definitions
- **File:** `types/database.ts`, Lines 598, 1876
- **Description:** `scheduled_posts.status` union defined inline and separately as `ScheduledPostStatus`. Can drift out of sync.
- **Suggested Fix:** Define once, reference everywhere.

#### EXT-29: Non-Nullable Boolean Without DB Default
- **File:** `types/database.ts`, Lines 77, 108
- **Description:** `company_onboarding_completed: boolean` (Row) vs `company_onboarding_completed?: boolean` (Insert). Same for `onboarding_completed`.
- **Suggested Fix:** Ensure `DEFAULT false` in database.

#### EXT-30: String vs Enum Type Mismatch
- **File:** `types/database.ts`, Line 1617 vs 1929
- **Description:** Table definition types `depth` as `string`, but standalone interface uses `ResearchDepth` (`'basic' | 'deep'`). Different levels of type safety depending on which type is used.
- **Suggested Fix:** Use enum types in table Row/Insert/Update definitions.

---

## Top 10 Priority Action Items

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| 1 | Fix Supabase client memoization in all hooks (HK-1) | Prevents infinite fetch loops across 12+ hooks | Medium |
| 2 | Add authentication to unprotected endpoints (API-4, API-5, API-6, API-7) | Prevents unauthorized access and API abuse | Low |
| 3 | Implement real API key encryption (API-3) | Prevents trivial key exposure | Medium |
| 4 | Sanitize search input in discover posts (API-1) | Prevents filter injection attacks | Low |
| 5 | Add column allowlist for sync full_backup (API-2) | Prevents privilege escalation | Medium |
| 6 | Stop exposing linkedin_access_token to client (AUTH-3) | Prevents token theft via XSS/extensions | Low |
| 7 | Adopt deny-by-default route protection (AUTH-2) | Prevents unprotected new routes | Low |
| 8 | Fix localStorage onboarding bypass (AUTH-1) | Prevents onboarding skip | Low |
| 9 | Add AbortController to all hooks (HK-5) | Prevents memory leaks and wasted requests | High |
| 10 | Consolidate service worker initialization (EXT-3) | Prevents race conditions in extension | Medium |

---

## Patterns to Address Systemically

### 1. Authentication Wrapper
Create a reusable `withAuth()` wrapper to eliminate the duplicated 5-line auth pattern across all 57 API routes and prevent future auth omissions.

### 2. Supabase Client Memoization
Establish a pattern where all hooks use `useMemo(() => createClient(), [])` or a shared hook like `useSupabase()`.

### 3. Timer/Subscription Cleanup
Create a `useTimeout()` and `useInterval()` hook that automatically cleans up on unmount, replacing the ~10 instances of leaked timers.

### 4. Type Naming Convention
Adopt domain-prefixed type names to prevent the 5 type collisions found (e.g., `CanvasExportFormat`, `AdminTopPost`, `ExtensionDemographicItem`).

### 5. MV3 Service Worker Compliance
Replace all `setInterval`/`setTimeout` patterns in the extension with `chrome.alarms` and persisted state.
