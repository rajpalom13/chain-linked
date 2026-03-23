# ChainLinked Environment Setup Guide

Complete guide to setting up the ChainLinked development environment from scratch.

---

## 1. Prerequisites

| Tool | Minimum Version | Notes |
|------|----------------|-------|
| **Node.js** | 20.x or later | Next.js 16 requires Node 18.18+; Node 20 LTS recommended |
| **npm** | 10.x+ | Ships with Node 20. Yarn or pnpm also work |
| **Git** | 2.x+ | For cloning the repository |
| **Supabase CLI** (optional) | Latest | Only needed if running Supabase locally |

Verify your setup:

```bash
node -v    # v20.x.x or v22.x.x
npm -v     # 10.x.x
git --version
```

---

## 2. Installation Steps

### Clone the repository

```bash
git clone <repository-url> ChainLinked
cd ChainLinked
```

### Install dependencies

```bash
npm install
```

### Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in the values described in Section 3 below.

### Start the development server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

To also run the Inngest dev server for background jobs:

```bash
npm run dev:all
```

This uses `concurrently` to start both the Next.js dev server and the Inngest CLI dev server.

---

## 3. Environment Variables

All environment variables are defined in `.env.local` (never committed to version control). Copy `.env.example` as your starting point.

### Supabase

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL | [Supabase Dashboard](https://supabase.com/dashboard) > Project Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon/client key for browser-side access | Same location as above |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side service role key (full access, never expose to client) | Same location as above |

**Example format:**

```
NEXT_PUBLIC_SUPABASE_URL=https://baurjucvzdboavbcuxjh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

### App Configuration

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `NEXT_PUBLIC_APP_URL` | Yes | Base URL of the application. Used for OAuth redirects, email links, CORS headers, and extension detection | Set to `http://localhost:3000` for local dev |

**Example format:**

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### LinkedIn OAuth

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `LINKEDIN_CLIENT_ID` | Yes | OAuth 2.0 Client ID | [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps) > Your App > Auth |
| `LINKEDIN_CLIENT_SECRET` | Yes | OAuth 2.0 Client Secret | Same location |
| `LINKEDIN_REDIRECT_URI` | Yes | Callback URL for OAuth flow | Must match the redirect URI registered in your LinkedIn app |

**Example format:**

```
LINKEDIN_CLIENT_ID=86abcdef123456
LINKEDIN_CLIENT_SECRET=WPLk8abcdefgh
LINKEDIN_REDIRECT_URI=http://localhost:3000/api/linkedin/callback
```

### LinkedIn Posting

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `LINKEDIN_POSTING_ENABLED` | No | Safety gate for live posting. Set to `true` to allow real posts to LinkedIn | Self-configured; defaults to `false` |
| `NEXT_PUBLIC_LINKEDIN_POSTING_ENABLED` | No | Client-side flag mirroring the server-side posting gate | Self-configured |
| `LINKEDIN_CLIENT_VERSION` | No | LinkedIn Voyager API client version | Defaults to `1.13.8008` if unset |

**Example format:**

```
LINKEDIN_POSTING_ENABLED=false
```

### AI / LLM (OpenRouter)

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `OPENROUTER_API_KEY` | Yes | API key for OpenRouter (routes to various LLMs). Used for post generation, remix, carousel generation, company analysis, and more | [OpenRouter Dashboard](https://openrouter.ai/keys) |

**Example format:**

```
OPENROUTER_API_KEY=sk-or-v1-abcdef1234567890...
```

### Research Services

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `TAVILY_API_KEY` | No | Tavily search API for deep research and article ingestion | [Tavily Dashboard](https://app.tavily.com/) |
| `PERPLEXITY_API_KEY` | No | Perplexity AI API for research queries (fallback if OpenRouter unavailable) | [Perplexity API Settings](https://www.perplexity.ai/settings/api) |

At least one research provider (Tavily, Perplexity, or OpenRouter with Perplexity model) is needed for the research/discovery features to work.

**Example format:**

```
TAVILY_API_KEY=tvly-abcdef1234567890
PERPLEXITY_API_KEY=pplx-abcdef1234567890
```

### Apify (LinkedIn Scraping)

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `APIFY_API_TOKEN` | No | API token for Apify actors used to scrape LinkedIn posts for the inspiration/viral post features | [Apify Console](https://console.apify.com/account#/integrations) |

**Example format:**

```
APIFY_API_TOKEN=apify_api_abcdef1234567890
```

### Inngest (Background Jobs)

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `INNGEST_EVENT_KEY` | No (dev) / Yes (prod) | Event key for sending events to Inngest | [Inngest Dashboard](https://app.inngest.com/) > Environment > Keys |
| `INNGEST_SIGNING_KEY` | No (dev) / Yes (prod) | Signing key to verify incoming webhooks from Inngest | Same location |

In development mode, the Inngest dev server works without keys. Keys are required for production deployment.

**Example format:**

```
INNGEST_EVENT_KEY=evt_abcdef1234567890
INNGEST_SIGNING_KEY=signkey-prod-abcdef1234567890
```

### PostHog Analytics

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | No | PostHog project API key for product analytics and session replay | [PostHog Dashboard](https://app.posthog.com/) > Project Settings |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | PostHog ingestion host URL | Defaults to `https://us.posthog.com` |

**Example format:**

```
NEXT_PUBLIC_POSTHOG_KEY=phc_abcdef1234567890
NEXT_PUBLIC_POSTHOG_HOST=https://us.posthog.com
```

### Email (Resend)

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `RESEND_API_KEY` | No | API key for transactional emails (team invites, notifications) | [Resend Dashboard](https://resend.com/api-keys) |
| `EMAIL_FROM_ADDRESS` | No | Sender email address | Self-configured; defaults to `team@chainlinked.ai` |
| `EMAIL_FROM_NAME` | No | Sender display name | Self-configured; defaults to `ChainLinked` |

**Example format:**

```
RESEND_API_KEY=re_abcdef1234567890
EMAIL_FROM_ADDRESS=team@chainlinked.ai
EMAIL_FROM_NAME=ChainLinked
```

### Brandfetch

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `BRANDFETCH_API_KEY` | No | API key for fetching company brand assets (logos, colors) | [Brandfetch Dashboard](https://developers.brandfetch.com/) |

**Example format:**

```
BRANDFETCH_API_KEY=bf_abcdef1234567890
```

### Logo.dev

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `NEXT_PUBLIC_LOGO_DEV_TOKEN` | No | Token for Logo.dev logo image service | [Logo.dev Dashboard](https://www.logo.dev/) |

**Example format:**

```
NEXT_PUBLIC_LOGO_DEV_TOKEN=pk_abcdef1234567890
```

### Unsplash

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `UNSPLASH_ACCESS_KEY` | No | Access key for Unsplash image search in graphics library | [Unsplash Developers](https://unsplash.com/developers) > Your Apps |

**Example format:**

```
UNSPLASH_ACCESS_KEY=abcdef1234567890abcdef1234567890
```

### Image Processing

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `REMOVE_BG_API_KEY` | No | API key for remove.bg background removal service | [remove.bg API](https://www.remove.bg/api) |

**Example format:**

```
REMOVE_BG_API_KEY=abcdef1234567890
```

### Firecrawl

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `FIRECRAWL_API_KEY` | No | API key for Firecrawl web scraping service | [Firecrawl Dashboard](https://www.firecrawl.dev/) |

**Example format:**

```
FIRECRAWL_API_KEY=fc-abcdef1234567890
```

### Encryption

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `API_KEY_ENCRYPTION_SECRET` | Yes | Secret used to encrypt/decrypt stored API keys. Must be at least 32 characters | Generate with `openssl rand -hex 32` |

**Example format:**

```
API_KEY_ENCRYPTION_SECRET=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
```

### Onboarding

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `NEXT_PUBLIC_ONBOARDING_WEBHOOK_URL` | No | Webhook URL triggered during user onboarding flow | Self-configured (e.g., a Zapier or Make webhook) |

### Admin Configuration

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `ADMIN_EMAILS` | No | Comma-separated list of admin email addresses | Self-configured |

**Example format:**

```
ADMIN_EMAILS=admin@chainlinked.com,founder@chainlinked.com
```

### Vercel Cron

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `CRON_SECRET` | No | Secret to authenticate cron job requests from Vercel | Generate with `openssl rand -hex 32` |

**Example format:**

```
CRON_SECRET=your_random_secret_string
```

### Chrome Extension

| Variable | Required | Description | Where to get it |
|----------|----------|-------------|-----------------|
| `NEXT_PUBLIC_CHROME_STORE_URL` | No | URL to the Chrome Web Store listing for the extension | Chrome Web Store after publishing |
| `NEXT_PUBLIC_EXTENSION_ID` | No | Chrome extension ID for communication between webapp and extension | Chrome Web Store or `chrome://extensions` in dev mode |

**Example format:**

```
NEXT_PUBLIC_CHROME_STORE_URL=https://chrome.google.com/webstore/detail/chainlinked/abcdefghijklmnop
NEXT_PUBLIC_EXTENSION_ID=abcdefghijklmnop
```

---

## 4. Supabase Setup

### Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project
2. Choose a region close to your users (the production project uses `ap-south-1`)
3. Set a strong database password and save it securely

### Configure environment variables

Copy the following from **Project Settings > API**:
- **Project URL** into `NEXT_PUBLIC_SUPABASE_URL`
- **anon public key** into `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role secret key** into `SUPABASE_SERVICE_ROLE_KEY`

### Database tables

The project uses these tables (apply migrations from the `supabase/migrations` directory if available):

- `users` - Application user accounts
- `linkedin_profiles` - Connected LinkedIn profile data
- `linkedin_analytics` - LinkedIn analytics snapshots
- `analytics_history` - Historical analytics data
- `post_analytics` - Per-post performance metrics
- `audience_data` - Audience demographic data
- `audience_history` - Historical audience changes
- `connections` - LinkedIn connections
- `feed_posts` - LinkedIn feed posts
- `my_posts` - User-authored posts
- `comments` - Post comments
- `followers` - Follower data
- `captured_apis` - Captured API responses from the extension
- `capture_stats` - Extension capture statistics
- `extension_settings` - Per-user extension configuration
- `sync_metadata` - Data sync tracking

### Row Level Security (RLS)

All tables should have RLS enabled. Policies ensure:
- Users can only read/write their own data
- Team members can access shared team data
- Service role key bypasses RLS for server-side operations

### Storage buckets

If the project uses Supabase Storage for image uploads (carousel images, profile photos), create the necessary buckets via the Supabase Dashboard under **Storage**.

### Authentication

Supabase Auth is used for user authentication. Configure the following in **Authentication > Providers**:
- **Email/Password** - Enable email confirmations
- **Google OAuth** - If using Google sign-in (configure OAuth credentials)

Set the **Site URL** in **Authentication > URL Configuration** to match your `NEXT_PUBLIC_APP_URL`.

---

## 5. LinkedIn App Setup

### Create a LinkedIn OAuth Application

1. Go to [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps)
2. Click **Create App**
3. Fill in:
   - **App name**: ChainLinked (or your preferred name)
   - **LinkedIn Page**: Associate with a LinkedIn company page
   - **Logo**: Upload an app logo
4. Click **Create App**

### Configure OAuth 2.0

1. Go to the **Auth** tab of your app
2. Under **OAuth 2.0 settings**, add your redirect URL:
   - Local dev: `http://localhost:3000/api/linkedin/callback`
   - Production: `https://yourdomain.com/api/linkedin/callback`
3. Copy the **Client ID** and **Client Secret** to your `.env.local`

### Required Products & Scopes

Request access to these LinkedIn products (under the **Products** tab):
- **Share on LinkedIn** - For posting content
- **Sign In with LinkedIn using OpenID Connect** - For authentication

Required OAuth scopes:
- `openid` - OpenID Connect
- `profile` - Basic profile access
- `email` - Email address
- `w_member_social` - Post on behalf of the user

### Verification

LinkedIn may require app verification for production use. During development, you can use the app in development mode with your own LinkedIn account.

---

## 6. Running the Development Server

### Start Next.js only

```bash
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

### Start Next.js + Inngest dev server

```bash
npm run dev:all
```

This runs both servers concurrently. The Inngest dev server provides a UI at [http://localhost:8288](http://localhost:8288) for monitoring background functions.

### Start Inngest dev server separately

```bash
npm run dev:inngest
```

### Available scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev` | Start Next.js development server |
| `dev:inngest` | `npx inngest-cli@latest dev` | Start Inngest dev server |
| `dev:all` | `concurrently "npm run dev" "npm run dev:inngest"` | Start both servers |
| `build` | `next build` | Create production build |
| `start` | `next start` | Start production server |
| `lint` | `eslint` | Run ESLint |

---

## 7. Building for Production

### Create a production build

```bash
npm run build
```

This compiles the Next.js application and reports any TypeScript or build errors. Fix all errors before deploying.

### Run the production build locally

```bash
npm run start
```

### Deployment notes

- **Hosting**: Designed for Vercel deployment (Next.js 16 App Router)
- **Environment variables**: Set all required env vars in your hosting provider's dashboard
- **Inngest**: Connect your Inngest account to your hosting provider for production background jobs
- **Domain**: Update `NEXT_PUBLIC_APP_URL` and `LINKEDIN_REDIRECT_URI` to your production domain
- **Supabase**: Ensure your production Supabase project has all migrations applied and RLS policies configured
- **Security headers**: The app configures `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `X-XSS-Protection` headers via `next.config.ts`
- **Remote images**: The Next.js config allows images from `media.licdn.com` (LinkedIn CDN) and `img.logo.dev` (Logo.dev)

---

## 8. Common Issues & Troubleshooting

### "Missing Supabase environment variables"

**Cause**: `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is not set.

**Fix**: Ensure `.env.local` exists and contains both variables. Restart the dev server after making changes (Next.js does not hot-reload env var changes).

### LinkedIn OAuth callback fails

**Cause**: Redirect URI mismatch.

**Fix**:
1. Ensure `LINKEDIN_REDIRECT_URI` in `.env.local` exactly matches the redirect URL registered in your LinkedIn app settings
2. For local development, use `http://localhost:3000/api/linkedin/callback`
3. Do not include trailing slashes

### "OPENROUTER_API_KEY is not configured"

**Cause**: AI features (post generation, remix, carousel) require an OpenRouter API key.

**Fix**: Sign up at [openrouter.ai](https://openrouter.ai), create an API key, and add it to `.env.local`.

### Inngest functions not triggering

**Cause**: Inngest dev server is not running, or keys are missing in production.

**Fix**:
- **Dev**: Run `npm run dev:all` to start both servers, or run `npm run dev:inngest` in a separate terminal
- **Production**: Ensure `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` are set in your hosting environment

### Build fails with type errors

**Cause**: TypeScript strict mode is enabled; all types must be valid.

**Fix**: Run `npm run build` locally and fix all reported errors before deploying.

### PostHog not tracking events

**Cause**: PostHog is disabled when `NEXT_PUBLIC_POSTHOG_KEY` is not set.

**Fix**: This is expected for local development. Add the key only if you need analytics tracking.

### Emails not sending (team invites, verification)

**Cause**: `RESEND_API_KEY` is not configured.

**Fix**: Sign up at [resend.com](https://resend.com), verify your sending domain, and add the API key. In development without Resend, email-dependent features will log warnings but not crash.

### `API_KEY_ENCRYPTION_SECRET` errors

**Cause**: The encryption secret is missing or too short.

**Fix**: Generate a 32+ character secret:

```bash
openssl rand -hex 32
```

Add the output to `API_KEY_ENCRYPTION_SECRET` in `.env.local`.

### Images not loading from LinkedIn

**Cause**: LinkedIn CDN images are blocked by Next.js image optimization.

**Fix**: This should not happen with the default config. Verify `next.config.ts` includes `media.licdn.com` in `remotePatterns`.

### Port 3000 already in use

**Fix**: Kill the existing process or use a different port:

```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9

# Or start on a different port
npx next dev -p 3001
```

---

## Quick Start Checklist

For a minimal working setup, you need these environment variables:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_APP_URL` (set to `http://localhost:3000`)
- [ ] `LINKEDIN_CLIENT_ID`
- [ ] `LINKEDIN_CLIENT_SECRET`
- [ ] `LINKEDIN_REDIRECT_URI`
- [ ] `OPENROUTER_API_KEY` (for AI features)
- [ ] `API_KEY_ENCRYPTION_SECRET`

All other variables enable optional features and can be added as needed.
