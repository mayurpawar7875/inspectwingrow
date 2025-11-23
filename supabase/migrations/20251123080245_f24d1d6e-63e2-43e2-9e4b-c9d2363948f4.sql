-- Market Manager tables
CREATE TABLE IF NOT EXISTS public.market_manager_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_date DATE NOT NULL,
  day_of_week INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.employee_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.market_manager_sessions(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES public.markets(id),
  employee_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.market_manager_punchin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.market_manager_sessions(id) ON DELETE CASCADE,
  selfie_url TEXT NOT NULL,
  gps_lat NUMERIC NOT NULL,
  gps_lng NUMERIC NOT NULL,
  punched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.market_land_search (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.market_manager_sessions(id) ON DELETE CASCADE,
  place_name TEXT NOT NULL,
  address TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  is_finalized BOOLEAN NOT NULL DEFAULT FALSE,
  opening_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stall_searching_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.market_manager_sessions(id) ON DELETE CASCADE,
  farmer_name TEXT NOT NULL,
  stall_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  is_interested BOOLEAN NOT NULL DEFAULT FALSE,
  joining_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assets_money_recovery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.market_manager_sessions(id) ON DELETE CASCADE,
  farmer_name TEXT NOT NULL,
  stall_name TEXT NOT NULL,
  item_name TEXT NOT NULL,
  received_amount NUMERIC NOT NULL DEFAULT 0,
  pending_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assets_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.market_manager_sessions(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  market_id UUID NOT NULL REFERENCES public.markets(id),
  asset_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  return_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bms_stall_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.market_manager_sessions(id) ON DELETE CASCADE,
  feedback_text TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.market_inspection_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.market_manager_sessions(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES public.markets(id),
  update_notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.market_manager_punchout (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.market_manager_sessions(id) ON DELETE CASCADE,
  gps_lat NUMERIC NOT NULL,
  gps_lng NUMERIC NOT NULL,
  punched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);