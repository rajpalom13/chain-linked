# ChainLinked QA Fixes - Auth & Onboarding

## Summary
Deep QA audit identified **15 issues** across the auth system and onboarding flow.
- 3 HIGH priority (security/broken flows)
- 7 MEDIUM priority (reliability/UX)
- 5 LOW priority (polish/edge cases)

---

## HIGH PRIORITY

### FIX-01: Open Redirect Vulnerability in OAuth
- **File**: `app/login/page.tsx` (line ~141)
- **Problem**: The `redirectTo` parameter from the URL is passed directly to OAuth without validation. An attacker could craft `?redirect=https://evil.com` to redirect users after login.
- **Fix**: Validate `redirectTo` against an allowlist of internal paths. Only allow paths starting with `/`.
- **Also affects**: `app/signup/page.tsx` (same pattern)

### FIX-02: Step 5 Dead-End When Step 3 Skipped
- **File**: `app/onboarding/step5/page.tsx` (lines ~285-301)
- **Problem**: If user skips Step 3 (company analysis), Step 5 shows "No analysis data" with no recovery path. Users get stuck and can't complete onboarding.
- **Fix**: Allow Step 5 completion even without company context data. Show empty-state UI with option to manually enter data or go back to Step 3.

### FIX-03: Signup Profile Race Condition
- **File**: `app/signup/page.tsx` (lines ~135-141)
- **Problem**: After signup, client-side code does a profile upsert that races with the `handle_new_user` DB trigger. Can cause confusing errors.
- **Fix**: Remove the redundant client-side profile upsert since the DB trigger now handles it reliably with ON CONFLICT and EXCEPTION handling.

---

## MEDIUM PRIORITY

### FIX-04: Middleware Step Bounds Not Capped
- **File**: `middleware.ts` (line ~142)
- **Problem**: If `onboarding_current_step` has a corrupted value > 5, middleware redirects to `/onboarding/step6` which doesn't exist, causing a 404.
- **Fix**: Cap step value with `Math.min(Math.max(step, 1), 5)`.

### FIX-05: Step Validation Range Mismatch
- **File**: `services/onboarding.ts` (line ~704)
- **Problem**: `updateOnboardingStepInDatabase()` validates `step > 6` but TOTAL_STEPS is 5. Allows invalid step 6.
- **Fix**: Change validation to `step > 5`.

### FIX-06: Step 3 Infinite Polling (No Timeout)
- **File**: `app/onboarding/step3/page.tsx` (line ~185)
- **Problem**: Company context analysis polling has no timeout. If Inngest job fails silently, users are stuck in loading state forever.
- **Fix**: Add 5-minute max polling timeout with error UI and retry option.

### FIX-07: Auth Provider Loading State Race
- **File**: `lib/auth/auth-provider.tsx` (lines ~350-366)
- **Problem**: `setIsLoading(false)` is called BEFORE profile fetch completes. Components briefly render with `isAuthenticated=true` but `profile=null`.
- **Fix**: Defer `setIsLoading(false)` until after profile fetch completes (or fails).

### FIX-08: x-forwarded-host Not Validated in Auth Callback
- **File**: `app/api/auth/callback/route.ts` (lines ~106-110)
- **Problem**: Auth callback trusts the `x-forwarded-host` header for redirect without validation. Could be spoofed.
- **Fix**: Validate against `NEXT_PUBLIC_APP_URL` or ignore the header entirely.

### FIX-09: No Timeout on Middleware Profile Fetch
- **File**: `middleware.ts`
- **Problem**: Unlike auth provider (5s timeout), middleware has no timeout on profile DB query. Slow DB delays all requests.
- **Fix**: Add AbortController with 3-second timeout to middleware profile fetch.

### FIX-10: Invitation Redirect Bypasses Onboarding
- **File**: `middleware.ts` (lines ~89-98)
- **Problem**: Users clicking invite links while on `/login` or `/signup` skip the onboarding completion check entirely.
- **Fix**: Add onboarding check before allowing invitation redirects.

---

## LOW PRIORITY

### FIX-11: LinkedIn profile_url Never Saved in PATCH
- **File**: `app/api/user/route.ts` (line ~57)
- **Problem**: PATCH handler reads `linkedin_profile_url` from body but only updates `full_name`.
- **Fix**: Include `linkedin_profile_url` in the update query.

### FIX-12: Step 5 Auto-Save Failures Silent
- **File**: `app/onboarding/step5/page.tsx` (lines ~250-264)
- **Problem**: Background PUT to `/api/company-context` has no error feedback or retry.
- **Fix**: Add toast on save failure.

### FIX-13: Email Confirmation Logic Fragile
- **File**: `app/signup/page.tsx` (line ~148)
- **Problem**: Uses `identities?.length === 0` to detect verification needed. Should check `email_confirmed_at`.
- **Fix**: Use `!data.session` as primary check (no session = needs verification).

### FIX-14: Brand Kit Skip Has No Warning
- **File**: `app/onboarding/step4/page.tsx` (lines ~151-162)
- **Problem**: Users can skip brand kit extraction without knowing carousels won't have brand styling.
- **Fix**: Add confirmation dialog when skipping.

### FIX-15: User API PATCH Incomplete
- **File**: `app/api/user/route.ts`
- **Problem**: PATCH endpoint only updates `full_name`, ignoring other fields sent by the client.
- **Fix**: Accept and update all valid profile fields.
