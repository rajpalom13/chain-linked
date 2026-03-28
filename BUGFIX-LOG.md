# ChainLinked Bug Fix Log

Tracking all fixes applied from `Bugfix.md`. Branch: `fix/chainlinked-bugfix-batch`

---

## Batch 1 — Critical + Isolated UI Fixes

### Fix 1: Issue #9 — React Error #185 (Infinite Loop in Advanced AI Mode)

**Status:** Fixed
**Priority:** CRITICAL
**Problem:** Infinite update loop crashes the UI when editing a saved draft in Advanced AI mode.

**Root Cause:** The `onMessagesChange` effect in `compose-advanced-mode.tsx` fired on every `messages` array update, notifying the parent which could trigger re-renders feeding back into the component. The `hasGeneratedPost` detection also called `setHasGeneratedPost` unconditionally on every messages change.

**Changes:**

| File | Change |
|------|--------|
| `components/features/compose/compose-advanced-mode.tsx` | Added ref-based guard (`lastNotifiedRef`) to skip redundant `onMessagesChange` notifications. Added `prevHasGeneratedRef` to only call `setHasGeneratedPost` when the value actually changes. |
| `components/features/post-composer.tsx` | Imported `ErrorBoundary` and wrapped `<ComposeAdvancedMode>` in it. Users see a friendly fallback message instead of a raw React crash. |

---

### Fix 2: Issue #1 — Onboarding Overlay Blocks Dashboard

**Status:** Fixed
**Priority:** HIGH
**Problem:** No skip, dismiss, or continue option on the onboarding overlay — blocks all dashboard access.

**Root Cause:** The `DashboardTour` component only rendered dismiss controls inside the `TourTooltip`. If the tooltip failed to position (target element not found), the user had no way to exit. No localStorage fallback existed for dismissed state.

**Changes:**

| File | Change |
|------|--------|
| `components/features/dashboard-tour/dashboard-tour.tsx` | Added a persistent "Dismiss Tour" button (top-right, z-10000) that's always visible when the tour is active, regardless of tooltip state. Tour now renders even when `targetRect` is null (dismiss button still shows). |
| `hooks/use-dashboard-tour.ts` | Added `TOUR_DISMISSED_KEY` localStorage persistence. `completeTour()` now writes to localStorage immediately. Tour activation checks localStorage before starting — prevents reappearance after dismissal even if the DB update is slow. |

---

### Fix 3: Bug #7 — LinkedIn Disconnect Button Non-Functional

**Status:** Fixed
**Priority:** HIGH
**Problem:** The Disconnect button had no visible effect. After clicking, the UI still showed "Connected" with the Disconnect option visible. PostHog AbortError on page reload.

**Root Cause (API):** The disconnect endpoint (`/api/linkedin/disconnect`) only deleted `linkedin_tokens`. The `use-settings.ts` hook determines `linkedinConnected` via `!!linkedinData || !!profileData?.linkedin_connected_at` — both remained truthy after disconnect because `linkedin_profiles` row and `profiles.linkedin_connected_at` were never cleared.

**Root Cause (UI):** `window.location.reload()` caused PostHog's tracking call to abort and could redirect to the production URL instead of staying on the current host.

**Changes:**

| File | Change |
|------|--------|
| `app/api/linkedin/disconnect/route.ts` | Now clears all 3 data sources: deletes `linkedin_tokens`, sets `profiles.linkedin_connected_at` to `null`, and deletes `linkedin_profiles` row. |
| `app/dashboard/settings/page.tsx` | Added `isDisconnecting` loading state. Replaced `window.location.reload()` with `await refetch()` to update UI via React state. Added toast success/error feedback. Button shows "Disconnecting..." spinner while in progress. |
| `components/features/settings.tsx` | Added `isDisconnecting` loading state. Added `isLinkedinConnected` local state derived from prop. Replaced `window.location.reload()` with `setLinkedinConnected(false)` for immediate UI update. Added toast import and success/error feedback. All JSX references updated to use local state. |

---

### Fix 4: Bug #3 — 'Find Your Team' Redirects to Dashboard

**Status:** Fixed
**Priority:** MEDIUM
**Problem:** Clicking "Find Your Team" on the Team page redirected to the main dashboard instead of showing team search.

**Root Cause:** The button was a `<Link href="/onboarding/join">`. The `/onboarding/join` page uses `useOnboardingGuard`, which redirects users who have completed onboarding back to `/dashboard` — making the team search inaccessible.

**Changes:**

| File | Change |
|------|--------|
| `components/features/no-team-state.tsx` | Replaced `<Link href="/onboarding/join">` with an inline `<Dialog>` containing `<TeamSearch>`. Users now search for teams and submit join requests directly from a modal without leaving the dashboard. Removed `next/link` import; added `TeamSearch` and `TeamSearchResult` imports. Added `handleSelectTeam` with `submitRequest` from `useJoinRequests`. |

---

## Batch 2 — Template & Carousel Fixes

### Fix 5: Bug #1/Issue #8 — Template Deletion and Template Instruction Leak

**Status:** Fixed
**Priority:** HIGH

**Part A — Template not being deleted**
**Root Cause:** `handleDelete` in `template-library.tsx` called `onDeleteTemplate?.(id)` without `await`. The async delete operation was fire-and-forget, and the toast showed before the operation completed. If the operation failed, there was no feedback.

**Part B — Template instructions leaking into Additional Instructions field**
**Root Cause:** `buildAISuggestion()` populated the `context` field with template instructions (`"Using the ... template as a starting point"`). This `context` flows to `aiSuggestion.context` → `initialContext` prop on `ComposeBasicMode` → visible "Additional Instructions" field.

**Changes:**

| File | Change |
|------|--------|
| `components/features/template-library/template-library.tsx` | `handleDelete`: wrapped `onDeleteTemplate` call with `await Promise.resolve()` so the delete completes before showing the toast. `handleBulkDelete`: added `await` to each delete call in the loop. `buildAISuggestion`: cleared `context` to empty string so internal template instructions don't leak into the user-visible Additional Instructions field. |

---

### Fix 6: Bug #4/Issue #3 — Delete Element Button Non-Functional in Carousel Editor

**Status:** Fixed
**Priority:** HIGH
**Problem:** The Delete Element button in the carousel editor does nothing; the keyboard Delete key works.

**Root Cause:** The button used `onClick={onDeleteElement}` which passes the React MouseEvent as the first argument to `deleteElement(elementId?: string)`. The function treats the truthy MouseEvent as an element ID, attempts to find and delete an element with that "ID", and silently fails. The keyboard shortcut calls `deleteElement()` with no arguments, correctly using `state.selectedElementId`.

**Changes:**

| File | Change |
|------|--------|
| `components/features/canvas-editor/property-panel.tsx` | Changed `onClick={onDeleteElement}` to `onClick={() => onDeleteElement()}` to prevent the MouseEvent from being passed as the elementId parameter. |

---

### Fix 7: Issue #4 — AI Generating Content with Outdated Year

**Status:** Fixed
**Priority:** MEDIUM
**Problem:** AI-generated post suggestions reference 2024 instead of the current year.

**Root Cause:** None of the AI system prompts injected the current date. The AI model's training data defaulted to an older year when generating time-sensitive content.

**Changes:**

| File | Change |
|------|--------|
| `lib/ai/compose-system-prompt.ts` | Added `Today's date is ${currentDate}. Always reference the current year when writing time-sensitive content.` to the compose conversation system prompt. |
| `lib/ai/series-system-prompt.ts` | Same date injection added to the series conversation system prompt. |
| `lib/ai/prompt-templates.ts` | Same date injection added to `getSystemPromptForType()` which powers basic mode AI generation. |

---

## Batch 3 — Create Post & Draft Persistence

### Fix 8: Bug #8/Issue #10 — Content/Media Lost on Mode Switch

**Status:** Fixed
**Priority:** HIGH
**Problem:** Content cleared when switching between Basic and Advanced modes.

**Root Cause:** Both modes were already `display: none` toggled (content preserved), but users had no warning that AI chat progress might be lost on switch.

**Changes:**

| File | Change |
|------|--------|
| `components/features/post-composer.tsx` | Added `window.confirm()` dialog before mode switch when content exists, warning that AI chat progress may be lost. Content itself is preserved across switches. |

---

### Fix 9: Issue #6 — No Pre-Validation for Mixed Media Upload

**Status:** Fixed
**Priority:** HIGH
**Problem:** No warning when attaching both an image and a document; publish fails with raw error.

**Root Cause:** `handlePost` had no client-side media type validation before calling the publish API.

**Changes:**

| File | Change |
|------|--------|
| `components/features/post-composer.tsx` | Added pre-publish validation: if both image and document files are attached, blocks submission with toast "LinkedIn only supports an image or a document, not both." Also improved error message in the catch block to always show user-readable text. |

---

### Fix 10: Issue #7 — Post Series Draft Saved as Single Post

**Status:** Fixed
**Priority:** HIGH
**Problem:** Series drafts opened as a single post with all content in one paragraph.

**Root Cause:** `parseDraftSource()` in `use-drafts.ts` had `'series'` missing from its `validSources` array. All series drafts were mapped to `source: 'compose'`, so the series detection logic (`if (d.source === "series")`) in the drafts page never triggered. The draft loaded as a single post with concatenated content.

**Changes:**

| File | Change |
|------|--------|
| `hooks/use-drafts.ts` | Added `'series'` to `validSources` array in `parseDraftSource()`. Series drafts now correctly return `source: 'series'`, enabling the restore flow. |
| `components/features/compose/series-post-carousel.tsx` | Added formatting toolbar (Bold, Italic, List buttons) visible when editing a series post. Added Esc hint. Series posts now have basic formatting tools like single post mode. |
| `app/dashboard/compose/page.tsx` | Added confirmation dialog when switching between Single Post and Post Series tabs if there's unsaved content. |

---

### Fix 11: Bug #6/Issue #13 — Export Button Non-Functional

**Status:** Fixed
**Priority:** HIGH
**Problem:** Export button in Settings does nothing — no download, no loading state.

**Root Cause:** The Export button had no `onClick` handler.

**Changes:**

| File | Change |
|------|--------|
| `app/dashboard/settings/page.tsx` | Implemented `handleExportData` in `AccountSection`: fetches posts, analytics, templates, and drafts from Supabase; serializes to JSON; triggers browser download as `chainlinked-export-YYYY-MM-DD.json`. Added `isExporting` loading state with spinner. Added toast success/error feedback. |

---

## Batch 4 — MEDIUM/LOW Polish

### Fix 12: Bug #5 — Settings Button Next to Invite

**Status:** Already Resolved
**Priority:** MEDIUM

**Finding:** The Team header already has a properly labeled "Manage" dropdown with "Team Settings" and "Leave Team" options. The Invite button has a label ("Invite Members"). No orphaned icon-only settings button was found in Team Activity or Team Settings.

---

### Fix 13: Bug #10/Issue #5 — Clear All and Remove Buttons Overlap

**Status:** Fixed
**Priority:** MEDIUM
**Problem:** Clear All button overlaps with individual remove buttons in the media upload area.

**Root Cause:** Clear All was positioned `absolute right-2 top-2` floating over the media thumbnails, overlapping with individual per-image remove buttons.

**Changes:**

| File | Change |
|------|--------|
| `components/features/post-composer.tsx` | Moved "Clear all" from absolute-positioned overlay to its own row above the media grid. Only shows when 2+ files attached. Uses ghost variant for subtler appearance. Individual remove buttons now have full independent hit areas. |

---

### Fix 14: Issue #11 — Theme Toggle Button Placement

**Status:** Fixed
**Priority:** LOW
**Problem:** Floating theme toggle in bottom-right covers content and conflicts with Create Post CTA.

**Changes:**

| File | Change |
|------|--------|
| `app/layout.tsx` | Removed the fixed bottom-right `AnimatedThemeToggler` from the root layout. |
| `components/site-header.tsx` | Added `AnimatedThemeToggler` to the right side of the top navbar header, styled as an 8x8 inline button matching the header design. |

---

### Fix 15: Issue #12 — Discover Topics Dead Loading State

**Status:** Fixed
**Priority:** LOW
**Problem:** Loading state shows only a passive skeleton with no content or interaction.

**Changes:**

| File | Change |
|------|--------|
| `app/dashboard/discover/page.tsx` | Added `LoadingTip` component with 5 rotating tips (3-second interval) displayed above the skeleton during loading. Tips provide context: "Curating the latest industry insights...", "Finding trending topics...", etc. |

---

### Fix 16: Issue #15 — Inconsistent Theme Transition Animation

**Status:** Fixed
**Priority:** LOW
**Problem:** Settings theme cards produce an abrupt instant change vs. the floating toggle's smooth circular expansion.

**Changes:**

| File | Change |
|------|--------|
| `app/dashboard/settings/page.tsx` | Theme card `onClick` now uses `document.startViewTransition` with a circular clip-path animation originating from the clicked card center, matching the floating toggle's expansion effect. Falls back to instant switch in browsers without View Transition API support. |

---

## Additional Fixes (Post-Batch)

### Single Post: Documents Hidden When Mixed with Images

**Status:** Fixed
**Problem:** When both images and documents were attached in single post mode, only images showed — documents were hidden.

**Root Cause:** The media preview only rendered documents when `docFiles.length > 0 && imageFiles.length === 0`. There was no branch for showing documents below images.

**Changes:**

| File | Change |
|------|--------|
| `components/features/post-composer.tsx` | Added a "Documents below images" section that renders when both images and documents are attached. Uses the same red-icon card style as document-only mode, with hover-to-reveal destructive X remove button. |

---

### Media Persistence Across Tab Switches

**Status:** Fixed
**Problem:** Media files disappeared when switching between Single Post / Post Series tabs.

**Root Cause:** Media files were stored in PostComposer's local state only, never synced to the draft context. Tab switches preserved the mounted component, but navigating away and back lost everything.

**Changes:**

| File | Change |
|------|--------|
| `components/features/post-composer.tsx` | `mediaFiles` state now initializes from `draft.mediaFiles` on mount (restores media from draft context). A `useEffect` syncs local `mediaFiles` back to draft context whenever they change, enabling persistence across tab switches and navigation. |

---

### Export Format Changed to CSV

**Status:** Fixed
**Problem:** Export button downloaded JSON, which is not user-friendly for non-technical users.

**Changes:**

| File | Change |
|------|--------|
| `app/dashboard/settings/page.tsx` | Changed export from JSON to CSV. Added `toCsv()` helper that converts arrays of objects to properly quoted CSV strings. Output file is sectioned (Posts, Analytics, Templates, Drafts) with headers. Downloads as `chainlinked-export-YYYY-MM-DD.csv`. |

---

### Data Visibility After LinkedIn Disconnect — By Design

**Status:** Not a bug
**Explanation:** Posts, analytics, templates, and drafts remain visible after disconnecting LinkedIn. This is correct behavior — the data belongs to the user and is stored in ChainLinked's database. Disconnecting only removes the OAuth token (ability to publish/sync). Reconnecting restores full functionality with all data intact. Deleting user data on disconnect would be destructive and unexpected.

---

## Invite Flow Fixes & Enhancements

### Invite: Per-Email Role Assignment with Drag-and-Drop

**Status:** Implemented
**Problem:** All invited emails received the same role (Member or Admin). No way to assign different roles per person in one batch.

**Changes:**

| File | Change |
|------|--------|
| `components/features/invite-team-dialog.tsx` | Replaced single role selector with two drag-and-drop zones (Members / Admin). Emails land in Members by default. Drag badges between zones to reassign roles. Badges are compact (11px text, truncated, `overflow-hidden`) to prevent overflow. Invitations grouped by role before sending to the API. |

---

### Invite: Re-Inviting Removed Members Fails with "Already in Team"

**Status:** Fixed
**Problem:** After removing a member and sending a new invitation, the removed user saw "Already a team member" when clicking the invite link.

**Root Cause:** Old `team_invitations` records with `status: 'accepted'` were never cleaned up when a member was removed. Re-inviting the same email could hit a unique constraint conflict, silently failing the insert.

**Changes:**

| File | Change |
|------|--------|
| `app/api/teams/[teamId]/members/route.ts` | Member removal now also deletes old `accepted/cancelled/expired` invitations for the removed member's email, clearing the way for re-invitation. |
| `app/api/teams/[teamId]/invite/route.ts` | Invite creation now deletes stale `accepted/cancelled/expired` invitation records for the same email+team before inserting, as a safety net against constraint conflicts. |

---

### Invite: Welcome Email Not Sent / Crashes Flow

**Status:** Fixed
**Problem:** Team join email was not being received. If the email send failed, it could crash the invitation acceptance.

**Root Cause:** The welcome email in `accept-invite` was not wrapped in try/catch. A Resend API failure would throw an unhandled exception, potentially blocking the team join response.

**Changes:**

| File | Change |
|------|--------|
| `app/api/teams/accept-invite/route.ts` | Welcome email now wrapped in try/catch with error logging. Email failures don't block invitation acceptance. Owner notification was already wrapped (no change). |

---

### Invite: Pending Invitations Not Updating After Acceptance

**Status:** Fixed
**Problem:** After an invited user accepts, the owner's pending invitations list still showed the invitation as pending until manual page refresh.

**Root Cause:** The `useTeamInvitations` hook only fetched once on mount and never auto-refreshed.

**Changes:**

| File | Change |
|------|--------|
| `hooks/use-team-invitations.ts` | Added window focus listener to refetch invitations when the tab regains focus. Added 30-second polling interval for background refresh. Accepted invitations now disappear automatically. |

---

### Invite: New Users See "Invalid Invite" After Clicking Email Link

**Status:** Fixed
**Problem:** Unauthenticated users clicking an invite link saw "Invalid invite" instead of the invitation details with sign up prompt.

**Root Cause:** The invite page used `getInvitationByToken` which queried `team_invitations` directly from the browser Supabase client. Unauthenticated users have no SELECT permission due to RLS policies, so the query returned null.

**Changes:**

| File | Change |
|------|--------|
| `app/api/teams/accept-invite/route.ts` | GET endpoint now uses `adminClient` (service role) to bypass RLS for token lookups. The token itself serves as authorization — anyone with a valid token can view invitation details. |
| `app/invite/[token]/page.tsx` | Replaced direct `getInvitationByToken` Supabase query with a fetch to `/api/teams/accept-invite?token=...`. Works for both authenticated and unauthenticated users. |

---

### Invite: Unified Drag-and-Drop UI in Team Settings

**Status:** Implemented
**Problem:** Team Settings used a different invite modal (`InviteTeamModal`) with individual input fields, while Team Header used the updated `InviteTeamDialog` with drag-and-drop role zones.

**Changes:**

| File | Change |
|------|--------|
| `components/features/team-management.tsx` | Replaced `InviteTeamModal` import with `InviteTeamDialog`. Updated props (`onSuccess` → `onInvited`). Both invite entry points now share the same drag-and-drop UI. |

---

### Invite: Role Privilege Tooltips

**Status:** Implemented
**Problem:** Users had no way to understand the difference between Member and Admin roles when assigning.

**Changes:**

| File | Change |
|------|--------|
| `components/features/invite-team-dialog.tsx` | Added `ⓘ` tooltip icon next to each role zone header. Hover shows privilege list — Members: create posts, view activity, access templates, view own analytics. Admin: manage members, edit settings, send invitations, view all analytics. |

---

### Invite: Unregistered Users See Choice Page Instead of Signup Redirect

**Status:** Fixed
**Problem:** Unregistered users clicking an invite link saw an intermediate page with "Create Account" and "Sign In" buttons instead of being redirected directly to signup.

**Root Cause:** The invite page set `status('not_authenticated')` and rendered a choice UI. Per the invite flow spec, unregistered users should go directly to the signup page.

**Changes:**

| File | Change |
|------|--------|
| `app/invite/[token]/page.tsx` | Unauthenticated users are now auto-redirected to `/signup?invite={token}&redirect=/invite/{token}` instead of showing a choice page. The invite token is also stored in `sessionStorage` for post-signup handling. |

---

### LinkedIn: New Users Can't Post Despite Being Connected

**Status:** Fixed
**Problem:** New users who connected LinkedIn via OAuth saw "Connected" in settings but got "LinkedIn not connected" when trying to post.

**Root Cause:** The OAuth callback (`/api/linkedin/callback`) stored tokens using the regular Supabase client which is subject to RLS policies. New users may not have INSERT/SELECT permissions on `linkedin_tokens` table, causing the upsert to silently fail. The tokens were never stored, so the post API couldn't find them.

**Changes:**

| File | Change |
|------|--------|
| `app/api/linkedin/callback/route.ts` | Token upsert now uses `adminClient` (service role) to bypass RLS. Ensures tokens are always stored regardless of the user's RLS permissions. |
| `app/api/linkedin/post/route.ts` | Token read and refresh now use `adminClient` to bypass RLS. Ensures the post API can always access tokens for authenticated users. |

---

### Email: Post Published Notification Not Sent

**Status:** Fixed
**Problem:** Users did not receive an email notification when their post was published on LinkedIn.

**Root Cause:** The post API (`/api/linkedin/post`) had no email sending logic. The `PostPublishedEmail` template existed but was never used.

**Changes:**

| File | Change |
|------|--------|
| `app/api/linkedin/post/route.ts` | Added post-published email notification after both text and document posts are successfully published. Uses `PostPublishedEmail` template with content preview, publish timestamp, and LinkedIn post link. Wrapped in try/catch — email failures don't block the post response. Uses `adminClient` for profile lookup. |

---

### React: Maximum Update Depth Exceeded (Infinite Loop) — Global Fix

**Status:** Fixed
**Problem:** "Maximum update depth exceeded" error appearing across multiple pages for different users.

**Root Cause:** 14 custom hooks called `const supabase = createClient()` in the component body, creating a NEW Supabase client instance on every render. When this unstable reference was used in `useCallback` or `useEffect` dependency arrays, it caused infinite re-render loops: new supabase → new callback → effect re-fires → state update → re-render → new supabase → repeat.

**Changes:**

| File | Change |
|------|--------|
| `hooks/use-settings.ts` | `createClient()` → `useRef(createClient())` |
| `hooks/use-templates.ts` | Same fix |
| `hooks/use-drafts.ts` | Same fix |
| `hooks/use-inspiration.ts` | Same fix |
| `hooks/use-auth.ts` | Same fix + added `useRef` import |
| `hooks/use-brand-kit.ts` | Same fix |
| `hooks/use-company.ts` | Same fix |
| `hooks/use-followed-influencers.ts` | Same fix |
| `hooks/use-generated-suggestions.ts` | Same fix |
| `hooks/use-invitations.ts` | Same fix |
| `hooks/use-posting-goals.ts` | Same fix |
| `hooks/use-swipe-actions.ts` | Same fix |
| `hooks/use-swipe-suggestions.ts` | Same fix |
| `hooks/use-team-posts.ts` | Same fix |

**Pattern applied:** `const supabase = createClient()` → `const supabaseRef = useRef(createClient()); const supabase = supabaseRef.current`. The ref ensures a stable reference across renders, breaking the infinite loop chain.

---

### Team: Join Requests Not Visible to Team Owner

**Status:** Fixed
**Problem:** When a user searched for a team and sent a join request, the team owner never saw it — there was no UI for incoming join requests.

**Root Cause:** The `JoinRequestsList` component and `useJoinRequests` hook existed, and the API endpoint (`/api/teams/[teamId]/join-requests`) worked, but the component was never rendered in any page.

**Changes:**

| File | Change |
|------|--------|
| `components/features/team-management.tsx` | Added "Requests" as a third tab (alongside Members and Invitations) in the team management panel. Renders `JoinRequestsList` with the current team ID. Owner/admin can now see and approve/reject incoming join requests. |

---

### Team: Members Have No Option to Leave Team

**Status:** Fixed
**Problem:** Regular team members had no way to leave a team. The "Leave Team" option existed in the Manage dropdown but was only visible to owners/admins, and had no click handler.

**Changes:**

| File | Change |
|------|--------|
| `components/features/team-header.tsx` | Added standalone "Leave Team" button visible to all non-admin members. Wired the existing "Leave Team" dropdown item for owners/admins with a working handler. Both trigger a destructive confirmation dialog (with owner-specific warning about team deletion). Uses `/api/teams/[teamId]/members?userId=` DELETE endpoint. Redirects to `/dashboard/team` after leaving. |

---

## Known Limitations

| Area | Limitation | What Would Fix It |
|------|-----------|-------------------|
| **Media persistence** | Blob URLs are session-only. Media survives tab switches within the same page load but is lost on full page refresh or navigation away and back. | Upload media files to the backend (Supabase Storage) immediately on attach, store the returned URL in draft state instead of a blob URL. Requires backend upload endpoint + storage bucket setup. |
| **Series post media** | Media files in series posts are stored in component-local state per post index. They are not persisted to the database when saving a series draft. | Extend the series draft save payload to include media references per post, and restore them on draft load. |
| **Template creation (RLS)** | Template creation may fail silently for users not in a team if the `templates` table has an RLS policy requiring `team_id`. The hook now passes `team_id` when available but users without a team may still be blocked by DB policies. | Review and update RLS policies on `templates` to allow `team_id = NULL` inserts for individual users. |
