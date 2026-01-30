# Frontend Update Plan

## Scope
- Implement PostHog client analytics integration (events, pageviews, session replay, heatmaps).
- Add a Prompt Playground for rapid prompt iteration (Wording enhancement + Carousel enhancement modes).
- Replace onboarding flow with the 6-step flow from `E:\agiready\canada`.
- Add carousel enhancements: default template selection + favorites + AI content assist.
- Exclude admin panel work.

## Non-Goals
- No admin panel implementation.
- No backend scraping pipeline beyond the provided webhook URL.
- No database migrations; onboarding state will be client-managed when server fields are unavailable.

## High-Level Approach
1. Add new onboarding pages + shared layout and guard hook based on the Canada flow.
2. Introduce onboarding service utilities that use ChainLinked APIs and localStorage.
3. Add Prompt Playground page in the dashboard with two modes.
4. Integrate PostHog into the app provider layer and add pageview tracking.
5. Enhance carousel creator with favorites, defaults, and AI assist entrypoints.

## Onboarding (Canada Flow Port)
### Routes
- `app/onboarding/page.tsx`: redirect to step 1 or dashboard.
- `app/onboarding/layout.tsx`: progress bar + header wrapper.
- `app/onboarding/step1`..`step6`: port from Canada flow.

### Components to Add
- `components/OnboardingProgress.tsx`
- `components/ConnectTools.tsx` (adapted to ChainLinked BYOK)
- `components/signup-form.tsx`
- `components/AiAnalysis.tsx`
- `components/ReviewProfile.tsx`
- `components/Sales.tsx`
- `components/ui/field.tsx` (required by signup-form)
- `components/onboarding-navbar.tsx` (branding for layout)

### Data + State
- Auth: use ChainLinked `createClient()` and existing auth provider.
- Step tracking: store in localStorage (`onboarding_current_step`).
- Profile updates: update `profiles` table for name/email where possible.
- Webhook: use `NEXT_PUBLIC_ONBOARDING_WEBHOOK_URL` for Step 3.
- Webhook outputs: store in localStorage (`webhook_markdown`, `company_json_data`).

### Webhook Integration
- `sendWebsiteToWebhook(website, companyName)` sends payload to configured webhook.
- `fetchWebhookData()` reads localStorage only (no backend table).
- `updateWebhookData()` writes to localStorage (for Review step edits).

## Prompt Playground
### Route
- `app/dashboard/prompts/page.tsx`

### Features
- Mode switcher:
  - Wording enhancement (uses `/api/ai/remix`)
  - Carousel enhancement (uses `/api/ai/generate` with carousel prompt framing)
- Inputs: source content, tone, length, custom instructions.
- Output: editable output with copy + save to draft.
- Track usage events via PostHog.

### Data Flow
- Fetch OpenAI key status from `useApiKeys` and pass to API routes when needed.
- Graceful error handling with `sonner` toasts.

## PostHog Integration
### Client Setup
- Add `posthog-js` and `posthog-js/react`.
- Create `components/posthog-provider.tsx` with:
  - Client init using `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`.
  - Pageview tracking on route change.
  - Identify user (if available) via auth context.

### Events to Capture
- `onboarding_step_completed`
- `prompt_playground_run`
- `carousel_template_favorited`
- `carousel_ai_assist_opened`

## Carousel Enhancements
### Favorites + Default Template
- Store favorite template IDs in localStorage.
- Add default template selector and apply to new carousels.

### AI Assist Entry
- Add "Generate Slide Ideas" button to open a prompt modal.
- Use prompt playground logic or `/api/ai/generate` to fill slides.

## QA Checklist
- Onboarding steps render + navigate correctly (all 6 steps).
- Webhook errors show helpful message when URL is missing or request fails.
- Prompt Playground executes and displays results for both modes.
- PostHog initializes without console errors.
- Carousel editor supports favorites + default template workflow.
- All components include JSDoc where required.

## Environment Variables
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_ONBOARDING_WEBHOOK_URL`
