-- Create audience_history table for tracking follower trends
-- This table stores daily snapshots of audience/follower counts for trend analysis

CREATE TABLE IF NOT EXISTS audience_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    date DATE NOT NULL,
    total_followers INTEGER DEFAULT 0,
    new_followers INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Create index for efficient queries by user and date
CREATE INDEX IF NOT EXISTS idx_audience_history_user_date ON audience_history(user_id, date);

-- Add comment for documentation
COMMENT ON TABLE audience_history IS 'Historical tracking of audience/follower counts for trend analysis';

-- Note: This table is synced from the Chrome extension via the supabase-sync-bridge.ts
-- Storage key: linkedin_audience_history
-- Fields synced: date, total_followers, new_followers
