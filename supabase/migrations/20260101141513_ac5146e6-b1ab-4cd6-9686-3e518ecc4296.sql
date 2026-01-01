-- Add missing columns to bms_stall_feedbacks table for customer feedback video functionality
ALTER TABLE public.bms_stall_feedbacks 
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS market_id UUID REFERENCES public.markets(id),
ADD COLUMN IF NOT EXISTS video_url TEXT;