-- Company Context / ICP Table
-- Stores AI-analyzed company information from onboarding

CREATE TABLE IF NOT EXISTS public.company_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic company info (from user input)
  company_name TEXT NOT NULL,
  website_url TEXT,
  industry TEXT,
  target_audience_input TEXT,

  -- AI-extracted value proposition
  value_proposition TEXT,
  company_summary TEXT,

  -- Products and services (JSONB array)
  products_and_services JSONB DEFAULT '[]'::jsonb,

  -- Target audience / ICP (JSONB object)
  target_audience JSONB DEFAULT '{}'::jsonb,
  -- Structure: { industries: [], companySize: "", roles: [], painPoints: [] }

  -- Tone of voice (JSONB object)
  tone_of_voice JSONB DEFAULT '{}'::jsonb,
  -- Structure: { descriptors: [], writingStyle: "", examples: [] }

  -- Brand colors (JSONB array of hex codes)
  brand_colors JSONB DEFAULT '[]'::jsonb,

  -- Raw scraped content (for reference)
  scraped_content TEXT,
  perplexity_research TEXT,

  -- Processing status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scraping', 'researching', 'analyzing', 'completed', 'failed')),
  error_message TEXT,

  -- Inngest job tracking
  inngest_run_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_company_context_user_id ON public.company_context(user_id);
CREATE INDEX IF NOT EXISTS idx_company_context_status ON public.company_context(status);

-- Unique constraint: one company context per user (can be updated)
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_context_user_unique ON public.company_context(user_id);

-- Enable RLS
ALTER TABLE public.company_context ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own company context"
  ON public.company_context FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company context"
  ON public.company_context FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company context"
  ON public.company_context FOR UPDATE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_company_context_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_company_context_updated_at
  BEFORE UPDATE ON public.company_context
  FOR EACH ROW
  EXECUTE FUNCTION update_company_context_updated_at();
