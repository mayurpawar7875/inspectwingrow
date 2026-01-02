-- Drop the unique constraint on user_id + session_date to allow multiple sessions per day
-- This enables organizers to attend both morning and evening markets on the same day

ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_user_id_session_date_key;

-- Add a new unique constraint on user_id + session_date + market_id to prevent duplicate sessions for the same market on the same day
CREATE UNIQUE INDEX IF NOT EXISTS sessions_user_market_date_key ON public.sessions (user_id, session_date, market_id);