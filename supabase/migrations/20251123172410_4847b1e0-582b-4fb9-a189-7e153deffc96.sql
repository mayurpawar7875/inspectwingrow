-- Create market_location_visits table
CREATE TABLE public.market_location_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  selfie_url TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  location_name TEXT NOT NULL,
  location_type TEXT NOT NULL CHECK (location_type IN ('residential_complex', 'open_space')),
  occupied_flats INTEGER,
  nearby_population TEXT,
  nearest_local_mandi TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT
);

-- Enable RLS
ALTER TABLE public.market_location_visits ENABLE ROW LEVEL SECURITY;

-- Employees can create their own visits
CREATE POLICY "Employees can create their own visits"
ON public.market_location_visits
FOR INSERT
WITH CHECK (auth.uid() = employee_id);

-- Employees can view their own visits
CREATE POLICY "Employees can view their own visits"
ON public.market_location_visits
FOR SELECT
USING (auth.uid() = employee_id OR has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'bdo'::user_role));

-- Admins and BDOs can view all visits
CREATE POLICY "Admins and BDOs can view all visits"
ON public.market_location_visits
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'bdo'::user_role));

-- Admins and BDOs can update visits
CREATE POLICY "Admins and BDOs can update visits"
ON public.market_location_visits
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'bdo'::user_role));

-- Add trigger for updated_at
CREATE TRIGGER update_market_location_visits_updated_at
BEFORE UPDATE ON public.market_location_visits
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create storage bucket for location visit selfies
INSERT INTO storage.buckets (id, name, public)
VALUES ('location-visit-selfies', 'location-visit-selfies', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for location visit selfies
CREATE POLICY "Users can upload their own location visit selfies"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'location-visit-selfies' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own location visit selfies"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'location-visit-selfies' AND
  (auth.uid()::text = (storage.foldername(name))[1] OR 
   has_role(auth.uid(), 'admin'::user_role) OR 
   has_role(auth.uid(), 'bdo'::user_role))
);