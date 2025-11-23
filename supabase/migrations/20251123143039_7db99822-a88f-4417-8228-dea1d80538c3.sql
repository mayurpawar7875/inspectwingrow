-- Add missing columns to collections table
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS stall_confirmation_id UUID REFERENCES public.stall_confirmations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS collected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS farmer_name TEXT,
ADD COLUMN IF NOT EXISTS stall_name TEXT,
ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_collections_stall_confirmation 
ON public.collections(stall_confirmation_id);

CREATE INDEX IF NOT EXISTS idx_collections_collected_by 
ON public.collections(collected_by);

-- Add missing columns to attendance_records table
ALTER TABLE public.attendance_records 
ADD COLUMN IF NOT EXISTS market_id UUID REFERENCES public.markets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS role user_role,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS total_tasks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_tasks INTEGER DEFAULT 0;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_attendance_records_market 
ON public.attendance_records(market_id);

-- Add missing column to stall_confirmations table
ALTER TABLE public.stall_confirmations 
ADD COLUMN IF NOT EXISTS rent_amount NUMERIC(10, 2);

-- Add comment to explain the columns
COMMENT ON COLUMN collections.stall_confirmation_id IS 'Links collection to a specific stall confirmation';
COMMENT ON COLUMN collections.mode IS 'Payment mode: cash or online';
COMMENT ON COLUMN collections.collected_by IS 'User ID of the person who collected the payment';
COMMENT ON COLUMN collections.screenshot_url IS 'URL to payment screenshot/proof';
COMMENT ON COLUMN attendance_records.market_id IS 'Market where attendance was recorded';
COMMENT ON COLUMN attendance_records.role IS 'User role at time of attendance';
COMMENT ON COLUMN attendance_records.city IS 'City where the market is located';
COMMENT ON COLUMN stall_confirmations.rent_amount IS 'Rent amount for the stall';