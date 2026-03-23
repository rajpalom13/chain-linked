# ChainLinked Documentation

> **The LinkedIn content management platform built for teams.**

ChainLinked is a full-stack SaaS platform that helps teams create, schedule, analyze, and optimize their LinkedIn content from a single workspace. It combines AI-powered writing assistance, deep research pipelines, a visual carousel creator, and real-time analytics into a unified dashboard designed for marketing teams, founders, and content creators.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Technology Stack](#technology-stack)
- [Key Features](#key-features)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Environment Variables](#environment-variables)
- [Further Documentation](#further-documentation)
- [License](#license)

---

## Project Overview

ChainLinked goes beyond simple LinkedIn scheduling. The platform ingests trending content and news articles daily, lets users remix viral posts into their own voice, tracks influencer activity, and surfaces personalized post suggestions through a swipe-based interface. Every team member's performance is tracked with granular analytics that roll up from daily deltas into weekly, monthly, quarterly, and yearly aggregates.

A companion Chrome extension captures LinkedIn data directly from the browser -- profile analytics, post performance metrics, audience demographics, and connection data. The extension syncs this information to Supabase in real time, powering the analytics dashboards and feeding the AI generation pipeline with context about each user's audience.

### Who is it for?

- **Marketing teams** managing multiple LinkedIn profiles
- **Founders and executives** building personal brands
- **Content creators** who want data-driven publishing workflows
- **Agencies** overseeing LinkedIn strategy for multiple clients

---

## Technology Stack

| Category | Technology | Version |
|---|---|---|
| **Framework** | Next.js (App Router) | 16.1.1 |
| **UI Library** | React | 19.2.3 |
| **Component System** | shadcn/ui (new-york style) | -- |
| **Styling** | Tailwind CSS with CSS variables | v4 |
| **Language** | TypeScript (strict mode) | 5.x |
| **Database** | Supabase PostgreSQL with RLS | 55 tables |
| **Auth** | Supabase Auth (email/password, Google OAuth) | -- |
| **AI / LLM** | OpenRouter (GPT-4o, GPT-4o-mini) via Vercel AI SDK | -- |
| **Background Jobs** | Inngest (15 workflow functions, cron schedules) | 3.49.3 |
| **Charts** | Recharts | 2.15.4 |
| **Product Analytics** | PostHog | -- |
| **Rich Text Editor** | Lexical | 0.39.0 |
| **Canvas / Graphics** | Konva + React-Konva | -- |
| **Drag and Drop** | DnD Kit | -- |
| **PDF Export** | pdf-lib, JSZip | -- |
| **Forms** | React Hook Form + Zod 4 | -- |
| **Tables** | TanStack React Table | 8.21.3 |
| **Animation** | Framer Motion, Lottie | -- |
| **Email** | Resend + React Email | -- |
| **Icons** | Tabler Icons + Lucide React | -- |
| **Web Scraping** | Firecrawl, Apify | -- |
| **Research APIs** | Perplexity (sonar-pro), Tavily | -- |
| **Brand Extraction** | Brandfetch, Logo.dev | -- |
| **Image Processing** | Remove.bg, Unsplash | -- |
| **LinkedIn Integration** | Official REST API (UGC/Posts) + Voyager | -- |
| **Testing** | Playwright (e2e) | -- |

---

## Key Features

### Analytics Dashboard
Personal and team performance tracking with daily delta computation and rollups into weekly, monthly, quarterly, and yearly aggregates. Interactive trend charts (Recharts), filterable data tables (TanStack), summary bar, and CSV export.

### Post Composer
Rich text editor powered by Lexical with live LinkedIn preview. Supports AI-powered content generation, @mention resolution, Unicode font styling (bold, italic, serif, script, monospace), configurable default hashtags, post goal selection, and an inline AI panel for rewriting, expanding, and tone adjustment.

### Post Scheduling
Timezone-aware scheduling with a calendar view. An Inngest cron pipeline checks for pending posts every 2 minutes, handles automatic LinkedIn OAuth token refresh, supports visibility controls, and manages drafts with auto-save.

### Team Management
Email-based team invitations via Resend, join request workflow with approval/rejection, role-based access control, team activity feed, and a leaderboard.

### Carousel Creator
Visual canvas editor built with Konva and React-Konva. Supports drag-and-drop slide management (DnD Kit), pre-built templates with brand kit integration, background removal (Remove.bg), Unsplash image search, PDF export (pdf-lib), and a font picker.

### AI Content Generation
Multi-model routing through OpenRouter (GPT-4o, GPT-4o-mini). Writing style analysis and application, configurable research depth, and a content remix feature that transforms any post or article into the user's voice. Includes a version-controlled prompt system with a playground and diff viewer.

### Discover and Inspiration
Daily automated news ingestion via Perplexity across 15+ categories. Trending topic tracking, viral post curation with quality filtering, influencer tracking with Apify scraping, and article detail views with source attribution.

### Swipe Interface
Tinder-style card UI for accepting or dismissing AI-generated post suggestions. Suggestions are based on company context and writing style, with automatic queue refill. Accepted posts flow directly into the compose editor.

### Template Library
CRUD operations for reusable post templates. Category-based organization, usage tracking, auto-generated templates based on company context, and template analytics.

### Brand Kit
Automatic brand extraction from any website URL via Firecrawl. Logo and color palette retrieval (Brandfetch, Logo.dev), AI-generated company context (value proposition, target audience, tone of voice), and Perplexity-powered research enrichment.

### Chrome Extension
Captures LinkedIn data directly from the browser -- profile stats, post metrics, audience data, and connections. Automatic session sync for seamless login, background sync with Supabase, and a popup UI for quick access.

### Onboarding
Dual-path flow: company owner (creates team) vs. individual (joins team). Four-step guided setup covering profile, company context, brand kit, and team invitations. Company analysis triggers automatically on completion.

---

## Getting Started

### Prerequisites

- **Node.js** 20 or later
- **npm** 10 or later
- A **Supabase** project (PostgreSQL database and auth)
- A **LinkedIn** developer app with OAuth 2.0 configured
- An **OpenRouter** API key for AI features
- An **Inngest** account (or use the local dev server)

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/chainlinked.git
cd chainlinked

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local and fill in the required values (see Environment Variables below)

# 4. Run Supabase migrations
npx supabase db push

# 5. Start the development server and Inngest dev server together
npm run dev:all
```

The web application will be available at **http://localhost:3000**.
The Inngest dashboard will be available at **http://127.0.0.1:8288**.

### Building for Production

```bash
npm run build
npm start
```

### Chrome Extension

The Chrome extension has its own build tooling in the `extension/` directory:

```bash
cd extension
npm install
npm run build
```

Load the built extension as an unpacked extension in Chrome, or publish it to the Chrome Web Store.

---

## Project Structure

```
chainlinked/
├── app/                            # Next.js App Router
│   ├── api/                        # 30+ API route groups
│   │   ├── ai/                     #   AI generation endpoints
│   │   ├── analytics/              #   Analytics computation
│   │   ├── brand-kit/              #   Brand extraction
│   │   ├── carousel-templates/     #   Carousel template CRUD
│   │   ├── company/                #   Company context management
│   │   ├── discover/               #   Content discovery
│   │   ├── drafts/                 #   Draft management
│   │   ├── inngest/                #   Inngest webhook handler
│   │   ├── linkedin/               #   LinkedIn OAuth and posting
│   │   ├── posts/                  #   Post management
│   │   ├── research/               #   Deep research pipeline
│   │   ├── swipe/                  #   Swipe suggestions
│   │   ├── teams/                  #   Team management
│   │   ├── templates/              #   Template CRUD
│   │   └── ...                     #   Additional route groups
│   ├── dashboard/                  # Main application pages
│   │   ├── analytics/              #   Analytics dashboard
│   │   ├── carousels/              #   Carousel creator
│   │   ├── compose/                #   Post composer
│   │   ├── discover/               #   Content discovery and news
│   │   ├── drafts/                 #   Draft management
│   │   ├── inspiration/            #   Inspiration feed
│   │   ├── posts/                  #   Post history
│   │   ├── prompts/                #   Prompt management and playground
│   │   ├── schedule/               #   Post scheduling calendar
│   │   ├── settings/               #   User and team settings
│   │   ├── swipe/                  #   Swipe suggestions interface
│   │   ├── team/                   #   Team dashboard and leaderboard
│   │   └── templates/              #   Template library
│   ├── onboarding/                 # Multi-step onboarding flow
│   ├── login/                      # Authentication pages
│   ├── signup/
│   └── privacy/                    # Privacy policy
├── components/
│   ├── features/                   # 80+ feature-specific components
│   ├── shared/                     # Reusable components
│   ├── ui/                         # shadcn/ui component library
│   ├── emails/                     # React Email templates
│   ├── skeletons/                  # Loading skeleton components
│   └── landing/                    # Marketing page components
├── hooks/                          # 50+ custom React hooks
├── lib/
│   ├── ai/                         # AI client, prompts, quality filters, style analysis
│   ├── apify/                      # LinkedIn scraping integration
│   ├── brandfetch/                 # Brand extraction
│   ├── canvas-templates/           # Carousel canvas templates
│   ├── email/                      # Email sending utilities
│   ├── firecrawl/                  # Website scraping
│   ├── graphics-library/           # Graphics asset management
│   ├── image/                      # Image processing utilities
│   ├── inngest/                    # Inngest client + 15 workflow functions
│   ├── linkedin/                   # LinkedIn API client (official + Voyager)
│   ├── perplexity/                 # Perplexity API client
│   ├── prompts/                    # Prompt management utilities
│   ├── research/                   # Tavily search client
│   ├── store/                      # Client-side state stores
│   ├── supabase/                   # Supabase client (server, browser, middleware)
│   ├── team/                       # Team management utilities
│   └── unicode-fonts.ts            # Unicode font transformations
├── services/                       # Service layer (onboarding)
├── types/                          # TypeScript type definitions
├── supabase/
│   └── migrations/                 # 33 SQL migration files
├── extension/                      # Chrome extension (separate build)
│   ├── background/                 # Service worker
│   ├── content/                    # Content scripts
│   ├── popup/                      # Extension popup UI
│   └── manifest.json
├── e2e/                            # Playwright end-to-end tests
├── scripts/                        # Data import and seed scripts
└── public/                         # Static assets
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run dev:inngest` | Start the Inngest local dev server |
| `npm run dev:all` | Run both Next.js and Inngest dev servers concurrently |
| `npm run build` | Create a production build |
| `npm start` | Start the production server |
| `npm run lint` | Run ESLint across the project |

---

## Environment Variables

All required environment variables are documented in `.env.example` at the project root. Copy this file to `.env.local` and fill in the values before starting development.

The variables are organized into the following groups:

| Group | Variables | Purpose |
|---|---|---|
| **Supabase** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Database and auth connectivity |
| **Application** | `NEXT_PUBLIC_APP_URL` | OAuth redirects, email links, extension detection |
| **LinkedIn OAuth** | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`, `LINKEDIN_POSTING_ENABLED` | LinkedIn API access and posting |
| **AI / LLM** | `OPENROUTER_API_KEY` | AI content generation via OpenRouter |
| **Research** | `TAVILY_API_KEY`, `PERPLEXITY_API_KEY` | Web search and research enrichment |
| **Scraping** | `APIFY_API_TOKEN` | LinkedIn profile and post scraping |
| **Email** | `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME` | Transactional emails via Resend |
| **Security** | `API_KEY_ENCRYPTION_SECRET`, `CRON_SECRET` | Token encryption and cron authentication |
| **Inngest** | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | Background job processing |
| **Product Analytics** | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | PostHog analytics |
| **Image and Brand** | `NEXT_PUBLIC_LOGO_DEV_TOKEN`, `UNSPLASH_ACCESS_KEY`, `REMOVE_BG_API_KEY` | Logo lookup, image search, background removal |
| **Chrome Extension** | `NEXT_PUBLIC_CHROME_STORE_URL`, `NEXT_PUBLIC_EXTENSION_ID` | Extension configuration |
| **Admin** | `ADMIN_EMAILS` | Admin email addresses |

For detailed setup instructions for each integration, refer to `docs/INTEGRATIONS.md`.

---

## Further Documentation

| Document | Description |
|---|---|
| [API Reference](./API.md) | API route documentation and endpoint details |
| [Architecture](./ARCHITECTURE.md) | System architecture, data flow diagrams, and design decisions |
| [Database](./DATABASE.md) | Database schema, table descriptions, and migration guide |
| [Features](./FEATURES.md) | Detailed feature specifications and implementation notes |
| [Integrations](./INTEGRATIONS.md) | Third-party integration setup and configuration |

For development standards, coding conventions, and contribution guidelines, refer to the `CLAUDE.md` file in the project root.

---

## Deployment

ChainLinked is designed for deployment on **Vercel**.

- **Framework Preset**: Next.js
- **Build Command**: `next build`
- **Node.js Version**: 20.x
- Set all environment variables from `.env.example` in the Vercel dashboard
- Configure the Inngest Vercel integration for automatic webhook registration
- Set up Vercel Cron for `CRON_SECRET`-protected endpoints

The Inngest serve endpoint at `/api/inngest` will automatically discover and register all 15 workflow functions when connected to the Inngest dashboard.

---

## License

Proprietary. All rights reserved.

This software is the confidential property of ChainLinked. Unauthorized copying, distribution, or modification is strictly prohibited.
