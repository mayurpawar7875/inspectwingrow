-- Add missing columns to markets table
ALTER TABLE public.markets
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS day_of_week INTEGER,
ADD COLUMN IF NOT EXISTS lat NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS lng NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.markets.day_of_week IS '0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';
COMMENT ON COLUMN public.markets.is_active IS 'Whether the market is currently active/operational';