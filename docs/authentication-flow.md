# ChainLinked Authentication Flow

Comprehensive documentation of the authentication system in ChainLinked, covering all auth flows, session management, middleware protection, and integrations.

---

## Table of Contents

1. [Authentication Overview](#1-authentication-overview)
2. [Sign Up Flow](#2-sign-up-flow)
3. [Login Flow](#3-login-flow)
4. [Google OAuth](#4-google-oauth)
5. [Email Verification](#5-email-verification)
6. [Password Reset](#6-password-reset)
7. [LinkedIn OAuth Integration](#7-linkedin-oauth-integration)
8. [Chrome Extension Authentication](#8-chrome-extension-authentication)
9. [Team Invitation Flow](#9-team-invitation-flow)
10. [Middleware Protection](#10-middleware-protection)
11. [Session Management](#11-session-management)
12. [Account Deletion](#12-account-deletion)
13. [Auth Context / Hooks](#13-auth-context--hooks)
14. [Security Considerations](#14-security-considerations)

---

## 1. Authentication Overview

ChainLinked uses **Supabase Auth** as its authentication foundation, built on top of GoTrue. The system supports multiple authentication methods:

- **Email/password** sign up and sign in
- **Google OAuth** via Supabase's built-in OAuth provider
- **Google token exchange** for the Chrome extension (via `chrome.identity.getAuthToken`)
- **Magic links** for email verification and resend flows

### Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **PKCE flow** (`flowType: 'pkce'`) | Enhanced security for public clients (browser, extension) |
| **Admin API for signup** | Auto-confirms users (bypasses email verification), avoids rate limits on confirmation emails |
| **Resend for transactional email** | Branded email templates for welcome, verification, and password reset emails instead of Supabase's default mailer |
| **Server-side session refresh** | Middleware refreshes sessions on every request via `@supabase/ssr` |
| **Cookie-based sessions** | Both server (`createServerClient`) and browser (`createBrowserClient`) use cookies for session storage |

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (server-side only, never exposed to client) |
| `NEXT_PUBLIC_APP_URL` | Application base URL (e.g., `https://chainlinked.ai`) |

### Relevant Files

| File | Purpose |
|------|---------|
| `lib/supabase/server.ts` | Server-side Supabase client factory |
| `lib/supabase/client.ts` | Browser-side Supabase client factory |
| `middleware.ts` | Session refresh, route protection, onboarding guards |
| `hooks/use-auth.ts` | Client-side auth state management hook |

---

## 2. Sign Up Flow

Users create accounts through the `/signup` page using email/password or Google OAuth.

### Flow Diagram

```
User fills signup form (/signup)
        |
        v
POST /api/auth/signup
  - Validates email format and password length (min 6 chars)
  - Creates user via supabaseAdmin.auth.admin.createUser()
    with email_confirm: true (auto-confirmed, no verification email)
  - Sends branded welcome email via Resend (fire-and-forget)
  - Returns { success: true, user: { id, email } }
        |
        v
Client receives success
  - Calls supabase.auth.signInWithPassword() to establish session
  - Redirects to /onboarding
  - router.refresh() to sync server state
        |
        v
Onboarding flow begins
```

### Key Implementation Details

- **File**: `app/api/auth/signup/route.ts`
- Users are created with `email_confirm: true`, meaning they are auto-confirmed without needing to verify their email.
- The admin client (`SUPABASE_SERVICE_ROLE_KEY`) is used to bypass rate limits.
- A branded **WelcomeEmail** is sent via Resend in a fire-and-forget pattern (does not block the response).
- Client-side password validation includes a strength indicator (Weak/Fair/Good/Strong/Very Strong).
- Duplicate email detection returns HTTP 409 with a user-friendly message.

### Validation Rules

- Email: must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Password: minimum 6 characters

---

## 3. Login Flow

Users sign in through the `/login` page using email/password or Google OAuth.

### Flow Diagram

```
User enters credentials (/login)
        |
        v
supabase.auth.signInWithPassword({ email, password })
        |
        +-- Success --> router.push(redirectTo) --> /dashboard (or redirect param)
        |                router.refresh()
        |
        +-- "Invalid login credentials" --> toast.error("Invalid email or password")
        |
        +-- "Email not confirmed" --> router.push(/verify-email?email=...)
```

### Key Implementation Details

- **File**: `app/login/page.tsx`
- Sign-in uses the **browser Supabase client** (`createClient` from `lib/supabase/client.ts`).
- The `redirect` query parameter is preserved from middleware redirects and honored after successful login.
- Redirect URLs are sanitized via `sanitizeRedirect()` to prevent open redirect attacks (only allows paths starting with `/`, not `//`).
- If the user's email is not confirmed, they are redirected to `/verify-email` with their email pre-filled.
- Error messages from the URL (e.g., from OAuth failures) are displayed as toasts via Sonner.
- The login page shows a "Resend verification email" button when errors contain "expired", "verification", or "verify".

---

## 4. Google OAuth

Google sign-in is available on both the login and signup pages.

### Flow Diagram

```
User clicks "Continue with Google"
        |
        v
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: '{origin}/api/auth/callback?redirect={redirectTo}',
    queryParams: { access_type: 'offline', prompt: 'consent' }
  }
})
        |
        v
Browser redirects to Google consent screen
        |
        v
Google redirects to Supabase (PKCE code exchange)
        |
        v
Supabase redirects to /api/auth/callback?code=...
        |
        v
GET /api/auth/callback
  - Exchanges PKCE code for session via exchangeCodeForSession()
  - Checks if user profile exists in `profiles` table
    - If no profile: creates one, redirects to /onboarding
    - If profile exists but onboarding incomplete: redirects to appropriate onboarding step
    - If profile exists and onboarding complete: redirects to /dashboard (or `next` param)
        |
        v
User lands on dashboard or onboarding
```

### Key Implementation Details

- **Files**: `app/login/page.tsx`, `app/signup/page.tsx`, `app/api/auth/callback/route.ts`
- `access_type: 'offline'` requests a refresh token from Google.
- `prompt: 'consent'` forces the consent screen every time (ensures fresh refresh token).
- The callback handler creates a profile record for new OAuth users if one doesn't exist (fallback for database trigger).
- Profile data populated from Google includes: `full_name` (from `user_metadata.full_name` or `user_metadata.name`), `avatar_url` (from `user_metadata.avatar_url` or `user_metadata.picture`).

---

## 5. Email Verification

While signup auto-confirms users, the email verification flow exists for cases where email confirmation is required (e.g., accounts created through Supabase directly, or when re-verification is needed).

### Flow Diagram

```
User lands on /verify-email (redirected from login due to "Email not confirmed")
        |
        v
User clicks "Resend verification email"
        |
        v
POST /api/auth/resend-verification
  - Generates magic link via supabaseAdmin.auth.admin.generateLink({ type: 'magiclink' })
  - Sends branded EmailVerificationEmail via Resend
  - Link expires in 24 hours
        |
        v
User clicks link in email
        |
        v
GET /api/auth/callback?code=...
  - Exchanges code for session
  - Redirects to /dashboard or /onboarding
```

### Key Implementation Details

- **Files**: `app/verify-email/page.tsx`, `app/api/auth/resend-verification/route.ts`
- The resend endpoint uses the admin API to generate magic links (avoids Supabase rate limits on `resend` OTP).
- Returns a generic success message ("If an account exists...") for non-existent emails to prevent user enumeration.
- Rate limit errors return HTTP 429.
- The verify-email page pre-fills the email from the `?email=` query parameter.

---

## 6. Password Reset

### Flow Diagram

```
User clicks "Forgot password?" on login page
        |
        v
/forgot-password page
  - User enters email, submits form
        |
        v
POST /api/auth/reset-password
  - Generates recovery link via supabaseAdmin.auth.admin.generateLink({ type: 'recovery' })
  - Extracts hashed_token from response
  - Builds direct reset URL: /reset-password?token_hash={hash}&type=recovery
  - Sends branded PasswordResetEmail via Resend (1 hour expiry)
        |
        v
User clicks link in email
        |
        v
/reset-password?token_hash=...&type=recovery
  - Page verifies token via supabase.auth.verifyOtp({ token_hash, type: 'recovery' })
  - On success: establishes session, shows password form
  - On failure: shows "Invalid or expired link" with option to request new one
        |
        v
User enters new password and confirms
  - supabase.auth.updateUser({ password })
  - Shows success, links to /login
```

### Key Implementation Details

- **Files**: `app/forgot-password/page.tsx`, `app/reset-password/page.tsx`, `app/api/auth/reset-password/route.ts`
- Uses a **direct token_hash approach** (bypasses PKCE) so the link works across browsers/devices.
- The forgot-password page includes a 60-second cooldown timer for resend to prevent abuse.
- The reset-password page sets `<meta name="referrer" content="no-referrer" />` to prevent token leakage via HTTP Referer header.
- Generic success messages ("If an account exists...") prevent user enumeration.
- The `/api/auth/callback` route also handles recovery flows: if `next` param is `/reset-password`, it skips the profile check and redirects directly.

---

## 7. LinkedIn OAuth Integration

LinkedIn OAuth is used to connect a user's LinkedIn account for posting and analytics, not for authentication.

### Connect Flow Diagram

```
User clicks "Connect LinkedIn" in settings
        |
        v
GET /api/linkedin/connect
  - Verifies user is authenticated via Supabase
  - Generates CSRF state token (random string)
  - Stores state and redirect URL in httpOnly cookies (10 min TTL)
  - Redirects to LinkedIn authorization URL
        |
        v
LinkedIn consent screen
        |
        v
LinkedIn redirects to /api/linkedin/callback?code=...&state=...
        |
        v
GET /api/linkedin/callback
  - Validates state cookie matches state param (CSRF protection)
  - Clears state/redirect cookies
  - Exchanges code for tokens via exchangeCodeForTokens()
  - Extracts user info from ID token or /userinfo endpoint
  - Encrypts access_token and refresh_token before storage
  - Upserts tokens to `linkedin_tokens` table
  - Upserts profile to `linkedin_profiles` table
  - Updates `profiles` table with LinkedIn avatar and name
  - Redirects to original page with ?linkedin_connected=true
```

### Disconnect Flow

```
POST /api/linkedin/disconnect
  - Verifies user is authenticated
  - Retrieves stored (encrypted) access token
  - Attempts to revoke token with LinkedIn API (best-effort)
  - Deletes tokens from `linkedin_tokens` table
  - Returns { success: true }
```

### Key Implementation Details

- **Files**: `app/api/linkedin/connect/route.ts`, `app/api/linkedin/callback/route.ts`, `app/api/linkedin/disconnect/route.ts`
- Tokens are **encrypted** before database storage using `lib/crypto` (encrypt/safeDecrypt).
- CSRF protection uses a random state parameter stored in an httpOnly cookie.
- The LinkedIn URN format is `urn:li:person:{sub}` where `sub` comes from the ID token or userinfo endpoint.
- Token storage uses upsert with `onConflict: 'user_id'` to handle reconnection.

---

## 8. Chrome Extension Authentication

The Chrome extension authenticates via two mechanisms:

### Mechanism 1: Auto-Login from Webapp Session (Extension Callback)

```
Extension opens webapp URL: /login?redirect=/auth/extension-callback
        |
        v
User signs in (email/password or Google OAuth)
        |
        v
Middleware detects redirect=/auth/extension-callback
  - Allows redirect to /auth/extension-callback (special case)
        |
        v
/auth/extension-callback page loads
  - Gets session via supabase.auth.getUser() + getSession()
  - If no session yet, listens to onAuthStateChange for up to 5 seconds
  - Posts session to extension via window.postMessage({
      type: '__CL_AUTH_SESSION__',
      payload: { access_token, refresh_token, expires_in, expires_at, ... }
    }, origin)
  - Extension's webapp-relay content script picks up the message
        |
        v
Extension receives session, user can close tab
```

### Mechanism 2: Google Token Exchange (Direct Extension Auth)

```
Extension calls chrome.identity.getAuthToken()
  - Gets Google access token directly from Chrome
        |
        v
POST /api/auth/google-token
  - Validates Google token via googleapis.com/oauth2/v2/userinfo
  - Finds or creates Supabase user via admin API
  - Generates magic link token via admin.generateLink({ type: 'magiclink' })
  - Verifies OTP via Supabase /auth/v1/verify endpoint
  - Returns full Supabase session { access_token, refresh_token, ... }
        |
        v
Extension stores session and uses it for API calls
```

### Key Implementation Details

- **Files**: `app/auth/extension-callback/page.tsx`, `app/api/auth/google-token/route.ts`
- The google-token endpoint includes CORS headers for cross-origin extension requests.
- For existing users in the google-token flow, user metadata is updated with latest Google info.
- Profile records are upserted for new users in the google-token flow.
- The extension-callback page has a 5-second timeout waiting for session hydration.

---

## 9. Team Invitation Flow

### Flow Diagram

```
Team admin sends invitation (creates record in team_invitations table)
  - Invitation includes: email, team_id, role, token (UUID), expires_at
        |
        v
Invitee receives email with link: /invite/{token}
        |
        v
/invite/[token] page loads
  - Fetches invitation by token via useInvitations() hook
  - Checks invitation status (valid, expired, cancelled, already_accepted)
  - Checks if user is authenticated
        |
        +-- Not authenticated:
        |     - Shows team/company info and inviter details
        |     - "Sign In" button -> /login?redirect=/invite/{token}
        |     - "Create Account" button -> /signup?redirect=/invite/{token}
        |     - Stores token in sessionStorage as pendingInviteToken
        |
        +-- Authenticated, email matches:
        |     - Shows invitation details and role
        |     - If user is in another team, shows warning about leaving
        |     - "Accept Invitation" button -> acceptInvitation(token)
        |     - On success: redirects to /dashboard after 2 seconds
        |
        +-- Authenticated, email mismatch:
              - Shows error with both emails
              - "Sign Out & Login" button to switch accounts
```

### Middleware Handling of Invite Redirects

When a logged-in user is on `/login` or `/signup` with `?redirect=/invite/{token}`:

1. Middleware checks if the user has completed onboarding.
2. If onboarding is not complete, redirects to the appropriate onboarding step first.
3. If onboarding is complete, redirects directly to the invite page.

### Key Implementation Details

- **File**: `app/invite/[token]/page.tsx`
- The invitation page handles multiple states: loading, invalid, expired, already_accepted, email_mismatch, not_authenticated, ready, accepting, success, error.
- Email matching is case-insensitive.
- If the user is already a member of another team, a warning is shown that accepting will remove them from their current team.
- The `useInvitations` hook handles the `getInvitationByToken` and `acceptInvitation` logic.

---

## 10. Middleware Protection

The middleware (`middleware.ts`) handles session refresh, route protection, and onboarding enforcement.

### Route Classification

| Category | Paths | Behavior |
|----------|-------|----------|
| **Protected** | `/dashboard/*`, `/composer/*`, `/schedule/*`, `/team/*`, `/templates/*`, `/settings/*`, `/onboarding/*` | Redirect to `/login?redirect={path}` if not authenticated |
| **Auth pages** | `/login`, `/signup` (exact match only) | Redirect to `/dashboard` if already authenticated |
| **Public** | `/`, `/invite/*`, `/verify-email`, `/forgot-password`, `/reset-password`, `/api/*` | No auth required |
| **Static** | `_next/static`, `_next/image`, `favicon.ico`, image files | Excluded from middleware entirely |

### Middleware Processing Order

```
1. Create Supabase server client with cookie-based session
2. Refresh session via supabase.auth.getUser()
3. Handle stray OAuth ?code= parameters (redirect to /api/auth/callback)
4. Check protected routes -> redirect to /login if unauthenticated
5. Check auth pages -> redirect authenticated users:
   a. If redirect=/invite/*, check onboarding first
   b. If redirect=/auth/extension-callback, allow
   c. Default: redirect to /dashboard
6. Fetch profile (with 8s timeout, fail-open) for dashboard/onboarding routes
7. Onboarding guard for /dashboard/*:
   - If onboarding not complete -> redirect to appropriate onboarding step
8. Onboarding completion guard:
   - If on onboarding page but already completed -> redirect to /dashboard
9. Pass through with refreshed cookies
```

### Onboarding Step Routing

The middleware routes users to the correct onboarding step based on their profile:

| Condition | Destination |
|-----------|-------------|
| No `onboarding_type` set | `/onboarding` (role selection) |
| `onboarding_type === 'member'` | `/onboarding/join` |
| `onboarding_type === 'owner'` or other | `/onboarding/step{N}` (N = `onboarding_current_step`, clamped 1-4) |

### Fail-Open Strategy

Profile queries in middleware use `Promise.race` with an 8-second timeout. If the query times out or errors, the request is allowed through (fail-open) to prevent blocking users due to database issues.

### Cookie Preservation

The `redirectWithCookies()` helper ensures that any session cookies set during the middleware's Supabase client initialization are carried over to redirect responses.

---

## 11. Session Management

### Server-Side Sessions

- **File**: `lib/supabase/server.ts`
- Created via `createServerClient` from `@supabase/ssr`.
- Reads cookies from Next.js `cookies()` API.
- Used in Server Components, API routes, and middleware.
- Cookie writes in Server Components are wrapped in try-catch (silently fails in read-only contexts like RSC; middleware handles refresh).

### Client-Side Sessions

- **File**: `lib/supabase/client.ts`
- Created via `createBrowserClient` from `@supabase/ssr`.
- Configuration:
  - `autoRefreshToken: true` - Automatically refreshes tokens before expiry.
  - `persistSession: true` - Persists session across page loads via cookies.
  - `detectSessionInUrl: true` - Detects OAuth callback parameters in URL.
  - `flowType: 'pkce'` - Uses PKCE for secure code exchange.

### Session Lifecycle

```
1. User signs in (password, OAuth, or magic link)
2. Supabase issues access_token + refresh_token
3. Tokens stored in cookies by @supabase/ssr
4. Middleware refreshes session on every request (getUser())
5. Client auto-refreshes tokens before expiry (autoRefreshToken: true)
6. Auth state changes broadcast via onAuthStateChange:
   - SIGNED_IN: update state, fetch profile
   - SIGNED_OUT: clear state
   - TOKEN_REFRESHED: update session tokens
7. Sign out clears cookies and redirects to /login
```

---

## 12. Account Deletion

### Flow Diagram

```
User initiates account deletion from settings
        |
        v
POST /api/auth/delete-account
  - Verifies user is authenticated via supabase.auth.getUser()
  - Creates admin client with SUPABASE_SERVICE_ROLE_KEY
        |
        v
Data cleanup (sequential, ordered by dependencies):
  1. Delete from 28+ tables by user_id:
     team_members, team_join_requests, team_invitations,
     sync_metadata, extension_settings, capture_stats,
     captured_apis, post_analytics_daily, post_analytics_accumulative,
     profile_analytics_daily, profile_analytics_accumulative,
     analytics_summary_cache, analytics_history, audience_history,
     audience_data, post_analytics, my_posts, feed_posts,
     comments, followers, connections, linkedin_analytics,
     linkedin_profiles, linkedin_tokens, company_context,
     brand_kits, drafts, templates
  2. Delete owned teams:
     - Find teams where owner_id = user
     - Delete team_members, team_join_requests, team_invitations for those teams
     - Delete the teams themselves
  3. Delete owned companies
  4. Delete profile record
        |
        v
  5. Delete auth user via supabaseAdmin.auth.admin.deleteUser(userId)
     (irreversible)
        |
        v
Returns { success: true }
```

### Key Implementation Details

- **File**: `app/api/auth/delete-account/route.ts`
- Uses the admin client to bypass RLS for data cleanup.
- Table deletions log warnings but continue on failure (table may not exist or have no rows).
- The auth user deletion is the final step and is irreversible.
- Dependent records are deleted before parent records (e.g., team_members before teams).

---

## 13. Auth Context / Hooks

### `useAuth` Hook

**File**: `hooks/use-auth.ts`

The `useAuth` hook provides a reactive authentication state for client components.

#### Interface

```typescript
interface UseAuthReturn {
  user: User | null           // Supabase User object
  profile: Tables<'profiles'> | null  // Profile from profiles table
  session: Session | null     // Full Supabase session (access/refresh tokens)
  isLoading: boolean          // True during initial session check
  isAuthenticated: boolean    // Convenience boolean
  signOut: () => Promise<void>     // Signs out and redirects to /login
  refreshProfile: () => Promise<void>  // Re-fetches profile from database
}
```

#### Behavior

1. **Initialization**: Calls `supabase.auth.getSession()` to get the current session, then fetches the profile from the `profiles` table.
2. **Real-time updates**: Subscribes to `supabase.auth.onAuthStateChange()` for:
   - `SIGNED_IN` - Updates user, session, fetches profile
   - `SIGNED_OUT` - Clears all state
   - `TOKEN_REFRESHED` - Updates session tokens only
3. **Cleanup**: Unsubscribes from auth state changes on unmount.

#### Usage Example

```typescript
const { user, isAuthenticated, isLoading, signOut } = useAuth()

if (isLoading) return <Spinner />
if (!isAuthenticated) return <Redirect to="/login" />
```

---

## 14. Security Considerations

### Open Redirect Prevention

All redirect URLs are sanitized through `sanitizeRedirect()`:
- Must start with `/`
- Must not start with `//` (prevents protocol-relative URLs)
- Defaults to `/dashboard` if invalid

This is implemented in both the middleware and the `/api/auth/callback` route.

### CSRF Protection

- **Supabase Auth**: Uses PKCE flow (`flowType: 'pkce'`), which provides built-in CSRF protection via code verifier/challenge.
- **LinkedIn OAuth**: Uses a random state parameter stored in an httpOnly cookie, validated on callback.

### Token Security

- **LinkedIn tokens**: Encrypted at rest in the database using `lib/crypto` (encrypt/safeDecrypt).
- **Supabase session tokens**: Stored in httpOnly cookies by `@supabase/ssr` (not accessible to JavaScript).
- **Service role key**: Only used server-side, never exposed to the client.
- **Google token exchange**: CORS headers restrict requests to the app's own origin.

### User Enumeration Prevention

- Signup returns HTTP 409 for duplicate emails (acceptable trade-off for UX).
- Password reset always returns generic "If an account exists..." messages.
- Resend verification returns generic success for non-existent emails.

### Password Requirements

- Minimum 6 characters (enforced both client-side and server-side).
- Client-side strength indicator encourages stronger passwords (length, mixed case, numbers, special characters).

### Referrer Leakage Prevention

- The reset-password page includes `<meta name="referrer" content="no-referrer" />` to prevent the token_hash from leaking in Referer headers.

### Row Level Security (RLS)

- All database operations from the browser client go through Supabase RLS policies.
- Admin operations (signup, delete account, token generation) use the service role key to bypass RLS.
- The server-side Supabase client (`lib/supabase/server.ts`) uses the anon key and respects RLS.

### Session Refresh

- Middleware calls `supabase.auth.getUser()` on every request to refresh the session.
- The browser client has `autoRefreshToken: true` for proactive token refresh.
- Important: no logic runs between `createServerClient` and `getUser()` in middleware (as per Supabase SSR requirements).

### Fail-Open Design

- Middleware profile queries have an 8-second timeout with fail-open behavior. This prevents database outages from locking users out entirely, at the cost of briefly allowing access to pages that require onboarding completion checks.
