# Onboarding Flow Documentation

This document describes the complete onboarding system for ChainLinked, covering both the "Create Team" (owner) and "Join Team" (member) paths from signup through to the active dashboard.

---

## Table of Contents

1. [Onboarding Overview](#onboarding-overview)
2. [Two Onboarding Paths](#two-onboarding-paths)
3. [Create Team Flow (Owner Path)](#create-team-flow-owner-path)
4. [Join Team Flow (Member Path)](#join-team-flow-member-path)
5. [Company Context Analysis](#company-context-analysis)
6. [Brand Kit Extraction](#brand-kit-extraction)
7. [Dashboard Tour](#dashboard-tour)
8. [Progress Tracking](#progress-tracking)
9. [Onboarding State Management](#onboarding-state-management)
10. [Skip and Resume Logic](#skip-and-resume-logic)

---

## Onboarding Overview

After a user signs up and authenticates, they land on `/onboarding` where they choose one of two paths: creating a new company/team (owner) or joining an existing one (member). The selection is persisted to the `profiles.onboarding_type` column (`'owner'` or `'member'`).

If a user has already selected a path, the entry page detects this and redirects them to resume where they left off. If `onboarding_completed` is already `true`, the user is sent straight to `/dashboard`.

### High-Level Flow Diagram

```
                    +-----------------+
                    |   /onboarding   |
                    | (Role Selection)|
                    +--------+--------+
                             |
              +--------------+--------------+
              |                             |
    +---------v----------+       +----------v---------+
    |  Owner Path        |       |  Member Path       |
    |  "Set up a new     |       |  "Join as an       |
    |   company"         |       |   individual"      |
    +--------+-----------+       +----------+----------+
             |                              |
    +--------v-----------+       +----------v----------+
    | Step 1: Connect    |       | Connect LinkedIn    |
    | LinkedIn           |       | (required)          |
    +--------+-----------+       +----------+----------+
             |                              |
    +--------v-----------+       +----------v----------+
    | Step 2: Company    |       | Search for Company  |
    | Context Analysis   |       | (optional/skip)     |
    +--------+-----------+       +----------+----------+
             |                              |
    +--------v-----------+          +-------+--------+
    | Step 3: Brand Kit  |          |                |
    | Extraction         |    +-----v-----+    +-----v------+
    +--------+-----------+    | Send Join |    | Skip &     |
             |                | Request   |    | Enter      |
    +--------v-----------+    +-----+-----+    | Dashboard  |
    | Step 4: Review &   |          |          +-----+------+
    | Complete           |    +-----v------+         |
    +--------+-----------+    | Pending    |         |
             |                | Approval   |         |
    +--------v-----------+    +-----+------+         |
    | /onboarding/company|          |                |
    | (Create Company)   |    +-----v------+         |
    +--------+-----------+    | Approved   +---------+
             |                +-----+------+         |
    +--------v-----------+          |                |
    | /onboarding/invite |          |                |
    | (Invite Teammates) |          |                |
    +--------+-----------+          |                |
             |                      |                |
             +-------+--------------+----------------+
                     |
              +------v------+
              |  /dashboard |
              | (Tour runs  |
              |  on first   |
              |  visit)     |
              +-------------+
```

---

## Two Onboarding Paths

### Path Selection (`/onboarding`)

**File:** `app/onboarding/page.tsx`

The entry page renders two selectable `RoleCard` components:

| Card | `onboarding_type` | Description | Destination |
|------|-------------------|-------------|-------------|
| "I'm setting up a new company" | `owner` | Full 4-step onboarding with AI analysis | `/onboarding/step1` |
| "I'm joining as an individual" | `member` | Lightweight 2-step flow | `/onboarding/join` |

The selection is saved to `profiles.onboarding_type` via Supabase before navigation.

### Resumption Logic

On mount, the entry page checks the user's profile:

- If `onboarding_completed === true` --> redirect to `/dashboard`
- If `onboarding_type === 'member'` --> redirect to `/onboarding/join`
- If `onboarding_type === 'owner'` --> redirect to `/onboarding/step{currentOnboardingStep}`
- Otherwise --> show the role selection UI

---

## Create Team Flow (Owner Path)

The owner path consists of 4 numbered steps followed by company creation and team invitation. Each step page uses the `useOnboardingGuard` hook to prevent step-skipping.

### Step 1: Connect LinkedIn

**File:** `app/onboarding/step1/page.tsx`

**Purpose:** Link the user's LinkedIn account via the browser extension.

**Key behavior:**
- Renders the `ConnectTools` component which handles LinkedIn extension connection
- The "Next" button is disabled until `linkedinConnected` is `true`
- On success, calls `updateOnboardingStepInDatabase(2)`, refreshes the auth profile, and navigates to `/onboarding/step2`
- Tracks the step completion via `trackOnboardingStep(1, true)`

**Required:** Yes. LinkedIn connection is mandatory to proceed.

### Step 2: Company Context Analysis

**File:** `app/onboarding/step2/page.tsx`

**Purpose:** Collect company info and trigger AI-powered website analysis.

**Form fields:**
- Company Name (required)
- Company Website URL (required)
- Industry (dropdown, optional)
- Target Audience (textarea, optional)

**Key behavior:**
- Clicking "Analyze Website" sends a POST to `/api/company-context/trigger` which starts an Inngest workflow
- The page polls `/api/company-context/status` every 2 seconds (with a 5-minute timeout) to track progress
- An animated `AnalyzingState` component shows three progress stages: Scraping, Researching, Analyzing
- On completion, navigates to `/onboarding/step3`
- On failure, shows the error and allows retry

**Skippable:** Yes. A "Skip" button calls `updateOnboardingStepInDatabase(3)` and advances to Step 3 with basic data only.

### Step 3: Brand Kit Extraction

**File:** `app/onboarding/step3/page.tsx`

**Purpose:** Automatically extract brand colors, fonts, and logo from the company website.

**Key behavior:**
- On mount, fetches company context from `/api/company-context` to get the `website_url` saved in Step 2
- Auto-triggers brand extraction using the `useBrandKit` hook (no manual URL entry needed)
- Shows an animated `ExtractingAnimation` with three stages: Scraping website styles, Fetching brand assets, Analyzing colors/fonts/logo
- Uses two data sources: Firecrawl (CSS analysis) and Brandfetch (brand registry)
- After extraction, renders `BrandKitPreview` with editable color swatches, font previews, and logo display
- "Save & Continue" persists the brand kit and advances to Step 4
- If no URL is available (user skipped Step 2), shows a message directing them back or to skip

**Skippable:** Yes, with a confirmation dialog warning that carousels will lack brand styling. Users can set this up later in Settings.

### Step 4: Review and Complete

**File:** `app/onboarding/step4/page.tsx`

**Purpose:** Review all AI-extracted company context and brand kit, with inline editing capabilities.

**Displayed sections:**
- Company Info (value proposition, summary) -- editable via compose-style textarea
- Products & Services -- editable via dialog (add/edit/delete individual entries)
- Target Audience (industries, company size, roles, pain points) -- editable via compose-style textarea
- Tone of Voice (descriptors, writing style, example phrases) -- editable via compose-style textarea
- Brand Kit -- rendered via `BrandKitPreview` with editable color and font popovers
- Content Rules -- editable via `ContentRulesEditor`

**Key behavior:**
- Loads company context from `/api/company-context` and brand kit from `/api/brand-kit`
- All edits are auto-saved to the database via PUT endpoints
- Completing this step calls `completeOnboardingInDatabase()` which sets `onboarding_completed = true` in the profiles table
- Navigates to `/onboarding/company` after completion

### Company Creation

**File:** `app/onboarding/company/page.tsx`

**Purpose:** Create the company entity and associated team in the database.

**Key behavior:**
- Uses the `CompanySetupForm` component which collects company name and optional logo upload
- On completion, marks both `company_onboarding_completed` and `onboarding_completed` as `true`
- Navigates to `/onboarding/invite?teamId={id}&company={name}` if a team was created

**Skippable:** Yes. Skip marks both onboarding flags complete and goes to dashboard.

### Invite Teammates

**File:** `app/onboarding/invite/page.tsx`

**Purpose:** Invite team members by email.

**Key behavior:**
- Uses the `InviteTeammatesForm` component with the team ID from the URL or from company data
- On completion or skip, navigates to `/dashboard`
- If no company/team exists, redirects back to `/onboarding/company`

**Skippable:** Yes. Users can skip and invite teammates later from Settings.

---

## Join Team Flow (Member Path)

### Step 1: Connect LinkedIn

**File:** `app/onboarding/join/page.tsx` (step `'connect'`)

- Renders the `ConnectTools` component in compact mode
- LinkedIn connection is required to proceed
- "Next" button advances to the search step

### Step 2: Search for Company

**File:** `app/onboarding/join/page.tsx` (step `'search'`)

- Renders a `TeamSearch` component for searching existing teams
- Selecting a team transitions to the join request sub-step
- "Skip & Enter Platform" completes onboarding without joining any team

### Step 2b: Send Join Request

**File:** `app/onboarding/join/page.tsx` (step `'request'`)

- Shows the selected team card (name, company, member count)
- Optional message field (max 500 characters) for introducing yourself
- "Send Request & Enter Platform" submits the join request via `useJoinRequests().submitRequest()` and then calls `completeOnboardingInDatabase()` to mark onboarding done
- After submission, navigates to the dashboard

### Pending Approval Screen

**File:** `app/onboarding/join/pending/page.tsx`

**Purpose:** Waiting screen shown when a join request is pending.

**Key behavior:**
- Uses the `PendingApprovalScreen` component
- Polls `/api/teams/join-request` every 10 seconds
- On approval: shows a success toast and redirects to `/dashboard`
- On rejection: shows an error toast and redirects to `/onboarding/join`
- User can cancel their request, which redirects back to `/onboarding/join`

---

## Company Context Analysis

The company context analysis pipeline runs as an Inngest workflow triggered from Step 2.

### Trigger

POST `/api/company-context/trigger` with:
```json
{
  "companyName": "Acme Inc",
  "websiteUrl": "https://acme.com",
  "industry": "Technology / SaaS",
  "targetAudienceInput": "B2B SaaS founders..."
}
```

### Pipeline Steps

1. **Scraping** (Firecrawl) -- Crawls the company website to extract raw content, HTML structure, and metadata
2. **Researching** (Perplexity) -- Uses AI to research the company across the web for additional context
3. **Analyzing** (OpenAI) -- Processes all gathered data to extract structured company insights

### Extracted Data

| Field | Description |
|-------|-------------|
| Value Proposition | Core value proposition statement |
| Products & Services | List of products with descriptions |
| Target Audience / ICP | Industries, company sizes, target roles, pain points |
| Tone of Voice | Brand tone descriptors, writing style, example phrases |
| Brand Colors | Color palette from the website |

### Status Polling

GET `/api/company-context/status` returns:
```json
{
  "status": "scraping|researching|analyzing|completed|failed",
  "progress": 0-100,
  "currentStep": "Human-readable description...",
  "errorMessage": "...",
  "completedAt": "ISO date"
}
```

The client polls every 2 seconds with a 5-minute maximum polling duration. If the timeout is exceeded, the user is shown an error and can retry or skip.

---

## Brand Kit Extraction

Brand kit extraction happens automatically in Step 3, using the company URL from Step 2.

### Data Sources

| Source | What It Provides |
|--------|-----------------|
| **Firecrawl** | CSS analysis of the website to detect colors, fonts from stylesheets |
| **Brandfetch** | Brand registry lookup for official logos, colors, and font information |

### Extracted Elements

| Element | Fields |
|---------|--------|
| Colors | `primaryColor`, `secondaryColor`, `accentColor`, `backgroundColor`, `textColor` (all hex) |
| Typography | `fontPrimary`, `fontSecondary` (font family names) |
| Logo | `logoUrl` (URL to the brand logo) |

### Extraction Flow

```
Step 2 saves website URL
         |
         v
Step 3 mounts --> GET /api/company-context --> extract website_url
         |
         v
useBrandKit().extractBrandKit(url) --> POST /api/brand-kit/extract
         |
         v
  +--------------+    +--------------+
  | Firecrawl    |    | Brandfetch   |
  | (CSS scrape) |    | (registry)   |
  +--------------+    +--------------+
         |                   |
         +-------+-----------+
                 |
                 v
       Merged brand kit data
                 |
                 v
  BrandKitPreview (editable)
                 |
                 v
  User clicks "Save & Continue"
                 |
                 v
  POST /api/brand-kit (persist to brand_kits table)
```

### Editing

The `BrandKitPreview` component supports inline editing:
- **Colors:** Click a color swatch to open a popover with hex text input and native color picker
- **Fonts:** Click a font preview to open a popover with text input for font family
- **Logo:** Displayed with previews on light, dark, and brand-colored backgrounds
- **Live Preview:** A sample card at the bottom shows how the brand looks applied to content

---

## Dashboard Tour

**File:** `components/features/dashboard-tour/tour-steps.ts`

After onboarding is complete and the user lands on the dashboard for the first time, a guided tour walks them through the key interface elements.

### Tour Steps

| Step | Target Selector | Title | Description |
|------|----------------|-------|-------------|
| 1 | `[data-tour="welcome-section"]` | Welcome to ChainLinked | Overview of the command center |
| 2 | `[data-tour="quick-create"]` | Create a Post | How to compose new LinkedIn posts |
| 3 | `[data-tour="sidebar-overview"]` | Overview Hub | Dashboard, Analytics, Team Activity navigation |
| 4 | `[data-tour="sidebar-content"]` | Content Tools | Drafts, Inspiration, Carousel Creator, Templates |
| 5 | `[data-tour="quick-stats"]` | Your LinkedIn Metrics | Impressions, Followers, Engagement, Profile Views |
| 6 | `[data-tour="schedule-section"]` | Schedule & Upcoming Posts | Content calendar and scheduled posts |

Each step uses a `targetSelector` (CSS data attribute) to locate the element, and the tooltip is positioned relative to the target (`top`, `bottom`, `left`, or `right`).

---

## Progress Tracking

### Database Fields (profiles table)

| Column | Type | Purpose |
|--------|------|---------|
| `onboarding_type` | `text` (`'owner'` or `'member'`) | Which path the user chose |
| `onboarding_step` | `integer` (1-4) | Current step in the owner flow |
| `onboarding_completed` | `boolean` | Whether full onboarding is done |
| `company_onboarding_completed` | `boolean` | Whether company creation is done |

### How Steps Are Updated

Each step page calls `updateOnboardingStepInDatabase(nextStep)` from `services/onboarding.ts` before navigating forward. This function:

1. Updates `profiles.onboarding_step` in Supabase
2. Refreshes the auth context profile via `refreshProfile()`

### Analytics Tracking

Each step completion calls `trackOnboardingStep(stepNumber, completed)` where `completed` is `true` for normal completion and `false` when the user skips.

---

## Onboarding State Management

### Auth Context

The `useAuthContext()` hook exposes the following onboarding-related values:

- `hasCompletedOnboarding` -- derived from `profiles.onboarding_completed`
- `hasCompletedCompanyOnboarding` -- derived from `profiles.company_onboarding_completed`
- `currentOnboardingStep` -- derived from `profiles.onboarding_step`
- `refreshProfile()` -- re-fetches the profile from the database to sync state

### Onboarding Guard Hook

**File:** `hooks/use-onboarding-guard.ts`

The `useOnboardingGuard()` hook is used by every step page to enforce sequential access:

1. **Multi-layer validation:** Reads `onboarding_step` from both localStorage (`chainlinked_onboarding_step`) and the database (via auth context)
2. **Reconciliation:** Takes the higher of the two values to prevent regression
3. **Step-skipping prevention:** Users can only access step N+1 if their highest completed step is N. Attempting to jump ahead redirects to the maximum allowed step
4. **Completion redirect:** If `onboarding_completed` is `true`, redirects to `/dashboard`
5. **Loading state:** Returns `{ checking: boolean }` so step pages can show a loader while validation runs

### localStorage Persistence

Key: `chainlinked_onboarding_step`

This provides instant synchronous validation on page load (before the database round-trip completes), preventing flash-of-wrong-content. It is cleared when onboarding completes.

### Layout and Progress Bar

**File:** `app/onboarding/layout.tsx`

The layout wraps all onboarding pages and provides:
- `OnboardingNavbar` -- minimal branding header with theme toggle
- `OnboardingProgress` -- a 4-step progress indicator (hidden on the role selection page and join path)
- Page transition animations

The progress bar labels are: **Connect** (LinkedIn & tools) -> **Company** (AI analysis) -> **Brand Kit** (Brand identity) -> **Review** (Complete setup).

---

## Skip and Resume Logic

### Skippable Steps

| Step | Skippable? | Consequence of Skipping |
|------|-----------|------------------------|
| Step 1 (Connect LinkedIn) | No | LinkedIn is required for core functionality |
| Step 2 (Company Context) | Yes | No AI-generated company context; Step 3 will show "No website URL found" |
| Step 3 (Brand Kit) | Yes (with confirmation) | Carousels and templates will lack brand styling; can be set up later in Settings |
| Step 4 (Review) | No | This is the completion step |
| Company Creation | Yes | User proceeds without a company entity |
| Invite Teammates | Yes | User enters dashboard solo; can invite later |
| Join: Company Search | Yes | User enters dashboard without a team |

### Resume Behavior

Onboarding state is durable across sessions:

1. **Owner path:** The `onboarding_step` value in the database tracks the highest reached step. When the user returns to `/onboarding`, they are redirected to `/onboarding/step{N}` where N is their current step.
2. **Member path:** If `onboarding_type === 'member'`, returning to `/onboarding` redirects to `/onboarding/join`. The join page manages its own internal step state (`connect` -> `search` -> `request`) using React state, which does not persist across sessions (the user restarts from the connect step).
3. **Pending request:** If a member has submitted a join request and returns later, the `/onboarding/join/pending` page resumes polling for approval.

### Back Navigation

Every step page includes a "Back" button that navigates to the previous step. The onboarding guard allows backward navigation since users can access any step at or below their highest completed step.

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `app/onboarding/page.tsx` | Role selection (owner vs member) |
| `app/onboarding/layout.tsx` | Shared layout with navbar and progress bar |
| `app/onboarding/step1/page.tsx` | LinkedIn connection |
| `app/onboarding/step2/page.tsx` | Company context + AI analysis trigger |
| `app/onboarding/step3/page.tsx` | Brand kit extraction |
| `app/onboarding/step4/page.tsx` | Review, edit, and complete |
| `app/onboarding/company/page.tsx` | Company entity creation |
| `app/onboarding/company-context/page.tsx` | Standalone company context form |
| `app/onboarding/brand-kit/page.tsx` | Standalone brand kit setup |
| `app/onboarding/invite/page.tsx` | Invite teammates by email |
| `app/onboarding/join/page.tsx` | Member join flow (connect + search + request) |
| `app/onboarding/join/pending/page.tsx` | Pending approval polling screen |
| `hooks/use-onboarding-guard.ts` | Step-skipping prevention and routing guard |
| `services/onboarding.ts` | Database operations for onboarding state |
| `components/OnboardingProgress.tsx` | 4-step progress indicator |
| `components/onboarding-navbar.tsx` | Minimal branding header |
| `components/features/company-setup-form.tsx` | Company creation form |
| `components/features/company-onboarding-form.tsx` | Company context form with AI analysis |
| `components/features/brand-kit-preview.tsx` | Brand kit display and editing |
| `components/features/pending-approval-screen.tsx` | Join request waiting screen |
| `components/features/dashboard-tour/tour-steps.ts` | Dashboard tour step definitions |
