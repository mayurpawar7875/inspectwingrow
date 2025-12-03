-- Add attendance tracking columns to market_manager_sessions
ALTER TABLE public.market_manager_sessions 
ADD COLUMN IF NOT EXISTS working_hours NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS attendance_status TEXT DEFAULT 'pending' CHECK (attendance_status IN ('pending', 'absent', 'half_day', 'full_day'));