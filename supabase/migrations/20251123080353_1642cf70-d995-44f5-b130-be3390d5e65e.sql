-- Asset Management tables
CREATE TABLE IF NOT EXISTS public.asset_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_name TEXT NOT NULL,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  available_quantity INTEGER NOT NULL DEFAULT 0,
  issued_quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.asset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL,
  requester_role TEXT NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.asset_inventory(id),
  quantity INTEGER NOT NULL,
  market_id UUID REFERENCES public.markets(id),
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  request_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approval_date TIMESTAMPTZ,
  approved_by UUID,
  rejection_reason TEXT,
  expected_return_date DATE,
  actual_return_date DATE,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.asset_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.asset_requests(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.asset_inventory(id),
  payment_mode TEXT NOT NULL,
  amount_received NUMERIC NOT NULL,
  payment_proof_url TEXT,
  payment_date DATE NOT NULL,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  verification_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BDO tables
CREATE TABLE IF NOT EXISTS public.bdo_market_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  market_name TEXT NOT NULL,
  market_opening_date DATE,
  google_map_location TEXT NOT NULL,
  location_type TEXT NOT NULL CHECK (location_type IN ('society', 'residential_colony')),
  flats_occupancy TEXT,
  customer_reach TEXT,
  rent TEXT,
  video_url TEXT,
  video_file_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'market_created')),
  market_id UUID REFERENCES public.markets(id) ON DELETE SET NULL,
  submission_metadata JSONB,
  service_agreement_url TEXT,
  stalls_accommodation_count INTEGER,
  documents_status TEXT,
  documents_uploaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.bdo_stall_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_name TEXT NOT NULL,
  stall_name TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  address TEXT NOT NULL,
  date_of_starting_markets DATE NOT NULL,
  submitted_by UUID NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);