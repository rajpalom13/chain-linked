-- Individual onboarding path support
-- When onboarding_type = 'member', the user is an individual who doesn't go through
-- the 4-step company setup flow. They connect LinkedIn and optionally join a team.
-- We don't track onboarding_current_step for individuals.

-- Make all teams searchable by default (individuals need to find companies)
-- Teams can still opt out by setting discoverable = false
ALTER TABLE teams ALTER COLUMN discoverable SET DEFAULT true;

-- Update existing teams to be discoverable
UPDATE teams SET discoverable = true WHERE discoverable IS NULL OR discoverable = false;

-- Add index for faster team search by name
CREATE INDEX IF NOT EXISTS idx_teams_name_trgm ON teams USING gin (name gin_trgm_ops);

-- Add index for company name search
CREATE INDEX IF NOT EXISTS idx_companies_name_trgm ON companies USING gin (name gin_trgm_ops);
