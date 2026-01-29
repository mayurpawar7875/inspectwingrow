-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add bms_executive to user_role enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'bms_executive' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE public.user_role ADD VALUE 'bms_executive';
  END IF;
END $$;

-- Create BMS Asset Inspections table
CREATE TABLE public.bms_asset_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  inspection_week DATE NOT NULL,
  inspection_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  inspection_status TEXT NOT NULL DEFAULT 'on_time',
  gps_lat NUMERIC,
  gps_lng NUMERIC,
  selfie_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, inspection_week)
);

-- Create BMS Asset Inspection Items table
CREATE TABLE public.bms_asset_inspection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.bms_asset_inspections(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.asset_inventory(id),
  actual_quantity INTEGER NOT NULL,
  available_quantity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Advance Requests table
CREATE TABLE public.advance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  required_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bms_asset_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bms_asset_inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advance_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for bms_asset_inspections
CREATE POLICY "BMS Executives can create their own inspections"
ON public.bms_asset_inspections FOR INSERT
WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'bms_executive'));

CREATE POLICY "BMS Executives can view their own inspections"
ON public.bms_asset_inspections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins and MMs can view all inspections"
ON public.bms_asset_inspections FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'market_manager'));

CREATE POLICY "Admins can manage all inspections"
ON public.bms_asset_inspections FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS policies for bms_asset_inspection_items
CREATE POLICY "Users can create items for their inspections"
ON public.bms_asset_inspection_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.bms_asset_inspections 
  WHERE id = inspection_id AND user_id = auth.uid()
));

CREATE POLICY "Users can view items from their inspections"
ON public.bms_asset_inspection_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.bms_asset_inspections 
  WHERE id = inspection_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'market_manager'))
));

CREATE POLICY "Admins can manage all inspection items"
ON public.bms_asset_inspection_items FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS policies for advance_requests
CREATE POLICY "Users can create their own advance requests"
ON public.advance_requests FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can view their own advance requests"
ON public.advance_requests FOR SELECT
USING (auth.uid() = requester_id);

CREATE POLICY "Admins and MMs can view all advance requests"
ON public.advance_requests FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'market_manager'));

CREATE POLICY "Admins and MMs can update advance requests"
ON public.advance_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'market_manager'));

CREATE POLICY "Admins can manage all advance requests"
ON public.advance_requests FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Add triggers for updated_at
CREATE TRIGGER update_bms_asset_inspections_updated_at
BEFORE UPDATE ON public.bms_asset_inspections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_advance_requests_updated_at
BEFORE UPDATE ON public.advance_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();