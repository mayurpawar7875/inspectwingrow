-- Prevent duplicate sessions for the same user, market, and date.
-- This blocks accidental double-creation from rapid clicks or React re-renders.
CREATE UNIQUE INDEX IF NOT EXISTS sessions_user_market_date_unique
ON public.sessions (user_id, market_id, session_date);