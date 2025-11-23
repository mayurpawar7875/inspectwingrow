-- Create enum types (with proper syntax)
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('employee', 'admin', 'market_manager', 'bms_executive', 'bdo');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.session_status AS ENUM ('active', 'finalized', 'locked', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.media_type AS ENUM ('outside_rates', 'selfie_gps', 'cash_deposit');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;