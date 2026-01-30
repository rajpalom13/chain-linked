# Company Analysis Architecture

## Overview

This document outlines the architecture for the AI-powered company analysis workflow used during onboarding. The system uses Firecrawl for website scraping, Perplexity for company research, and OpenAI for structured analysis, all orchestrated through Inngest background jobs.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ONBOARDING STEP 3                                    │
│                                                                              │
│  User Input:                                                                 │
│  ├── Company Name (required)                                                │
│  ├── Website URL (required)                                                 │
│  ├── Industry (optional)                                                    │
│  └── Target Audience Description (optional)                                 │
│                                                                              │
│  [Analyze Company] Button → Creates DB record → Triggers Inngest Event      │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         INNGEST WORKFLOW                                     │
│                         "company/analyze"                                    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 1: FIRECRAWL - Website Scraping                                │   │
│  │                                                                      │   │
│  │ • Scrape main page content                                          │   │
│  │ • Extract text, headings, meta descriptions                         │   │
│  │ • Identify product/service pages                                    │   │
│  │ • Extract brand colors from CSS                                     │   │
│  │                                                                      │   │
│  │ Output: Raw website content, metadata, colors                       │   │
│  │ Status: "scraping" → Update DB                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 2: PERPLEXITY - Company Research                               │   │
│  │                                                                      │   │
│  │ • Search for company information online                             │   │
│  │ • Find recent news and announcements                                │   │
│  │ • Identify market position and competitors                          │   │
│  │ • Gather customer reviews and sentiment                             │   │
│  │                                                                      │   │
│  │ Output: Research summary, market insights                           │   │
│  │ Status: "researching" → Update DB                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 3: OPENAI - Structured Analysis                                │   │
│  │                                                                      │   │
│  │ Input: Scraped content + Perplexity research + User hints           │   │
│  │                                                                      │   │
│  │ Extract:                                                            │   │
│  │ • Value Proposition (1-2 sentences)                                 │   │
│  │ • Products & Services (array of {name, description})                │   │
│  │ • Target Audience / ICP:                                            │   │
│  │   - Industries (array)                                              │   │
│  │   - Company Size (string)                                           │   │
│  │   - Roles/Job Titles (array)                                        │   │
│  │   - Pain Points (array)                                             │   │
│  │ • Tone of Voice:                                                    │   │
│  │   - Descriptors (array: "professional", "friendly", etc.)           │   │
│  │   - Writing Style (string)                                          │   │
│  │   - Example Phrases (array)                                         │   │
│  │ • Brand Colors (array of hex codes)                                 │   │
│  │ • Company Summary (2-3 sentences)                                   │   │
│  │                                                                      │   │
│  │ Status: "analyzing" → Update DB                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ STEP 4: SAVE TO DATABASE                                            │   │
│  │                                                                      │   │
│  │ • Update company_context record with all extracted data             │   │
│  │ • Set status to "completed"                                         │   │
│  │ • Set completed_at timestamp                                        │   │
│  │                                                                      │   │
│  │ Status: "completed" → Update DB                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND POLLING                                     │
│                                                                              │
│  • Poll /api/company-context/status every 2 seconds                         │
│  • Show progress indicator based on status field                            │
│  • When status = "completed", redirect to next step                         │
│  • When status = "failed", show error and retry option                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Table: `company_context`

```sql
CREATE TABLE public.company_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- User input
  company_name TEXT NOT NULL,
  website_url TEXT,
  industry TEXT,
  target_audience_input TEXT,

  -- AI-extracted fields
  value_proposition TEXT,
  company_summary TEXT,
  products_and_services JSONB DEFAULT '[]'::jsonb,
  target_audience JSONB DEFAULT '{}'::jsonb,
  tone_of_voice JSONB DEFAULT '{}'::jsonb,
  brand_colors JSONB DEFAULT '[]'::jsonb,

  -- Raw data (for debugging/reprocessing)
  scraped_content TEXT,
  perplexity_research TEXT,

  -- Job tracking
  status TEXT DEFAULT 'pending',  -- pending, scraping, researching, analyzing, completed, failed
  error_message TEXT,
  inngest_run_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  UNIQUE(user_id)
);
```

## File Structure

```
lib/
├── inngest/
│   ├── client.ts                    # Inngest client configuration
│   └── functions/
│       └── analyze-company.ts       # Main workflow function
├── firecrawl/
│   ├── client.ts                    # Firecrawl client
│   └── scraper.ts                   # Website scraping logic
├── perplexity/
│   ├── client.ts                    # Perplexity client
│   └── research.ts                  # Company research logic

app/api/
├── inngest/
│   └── route.ts                     # Inngest webhook handler
├── company-context/
│   ├── route.ts                     # CRUD for company context
│   ├── status/
│   │   └── route.ts                 # Poll job status
│   └── trigger/
│       └── route.ts                 # Trigger analysis workflow

app/onboarding/
├── step3/
│   └── page.tsx                     # Updated to trigger workflow
└── step4/
    └── page.tsx                     # Review extracted data (was sales, now review)
```

## API Endpoints

### POST /api/company-context/trigger
Triggers the company analysis workflow.

**Request:**
```json
{
  "companyName": "Acme Inc",
  "websiteUrl": "https://acme.com",
  "industry": "Technology / SaaS",
  "targetAudienceInput": "B2B SaaS founders..."
}
```

**Response:**
```json
{
  "success": true,
  "companyContextId": "uuid",
  "status": "pending"
}
```

### GET /api/company-context/status
Returns current analysis status.

**Response:**
```json
{
  "status": "analyzing",
  "progress": 75,
  "currentStep": "Extracting company insights...",
  "data": null
}
```

### GET /api/company-context
Returns completed company context.

**Response:**
```json
{
  "id": "uuid",
  "companyName": "Acme Inc",
  "valueProposition": "...",
  "productsAndServices": [...],
  "targetAudience": {...},
  "toneOfVoice": {...},
  "brandColors": ["#0066cc", "#ff6600"],
  "status": "completed"
}
```

## Environment Variables

```env
# Inngest (get from https://app.inngest.com)
INNGEST_EVENT_KEY=your_event_key
INNGEST_SIGNING_KEY=your_signing_key

# Firecrawl (get from https://firecrawl.dev)
FIRECRAWL_API_KEY=fc-your_api_key

# Perplexity (get from https://perplexity.ai)
PERPLEXITY_API_KEY=pplx-your_api_key

# OpenRouter (already configured)
OPENROUTER_API_KEY=sk-or-v1-xxx
```

## Onboarding Flow (Simplified)

### Before (6 steps with sales focus):
1. Step 1: Profile setup
2. Step 2: Connect tools (OpenAI + LinkedIn) → Now LinkedIn only
3. Step 3: Company context input + trigger AI
4. Step 4: Review AI-extracted brand context ✅ KEEP (useful)
5. Step 5: Review business profile ❌ REMOVE (redundant with step 4)
6. Step 6: Sales process configuration ❌ REMOVE (not LinkedIn-focused)

### After (4 steps, LinkedIn focused):
1. **Step 1: Welcome / Profile** - Basic user info (keep as-is)
2. **Step 2: Connect LinkedIn** - OAuth connection only (OpenAI removed)
3. **Step 3: Company Context** - Input + trigger Inngest workflow
4. **Step 4: Review & Complete** - Review extracted data, edit, complete onboarding

### Files to Delete:
- `app/onboarding/step5/` - Redundant review step
- `app/onboarding/step6/` - Sales configuration
- `components/Sales.tsx` - Sales motion/framework selector
- `components/ReviewProfile.tsx` - Redundant profile review

## Implementation Tasks

- [ ] 1. Apply database migration for `company_context` table
- [ ] 2. Create Firecrawl client and scraper module
- [ ] 3. Create Perplexity client and research module
- [ ] 4. Create Inngest workflow function
- [ ] 5. Create Inngest API route handler
- [ ] 6. Create company-context API routes (trigger, status, get)
- [ ] 7. Update onboarding step 3 to use new workflow
- [ ] 8. Create new step 4 (review & complete)
- [ ] 9. Remove old steps 4, 5, 6 (sales-focused)
- [ ] 10. Update onboarding progress indicators
- [ ] 11. Test end-to-end flow

## Error Handling

- **Firecrawl fails**: Continue with Perplexity research only
- **Perplexity fails**: Continue with scraped content only
- **OpenAI fails**: Retry up to 3 times, then mark as failed
- **All fail**: Show error, allow manual input fallback

## Usage in Content Generation

Once `company_context` is saved, it's used for:

1. **Post Generation** - AI uses ICP and tone to write relevant content
2. **Content Suggestions** - Topics based on products/services and pain points
3. **Audience Targeting** - LinkedIn targeting recommendations
4. **Brand Consistency** - Maintain tone of voice across posts
