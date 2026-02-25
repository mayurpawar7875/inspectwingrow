
-- Allow market managers to view all stall confirmations
CREATE POLICY "Market managers can view all stall confirmations"
ON public.stall_confirmations
FOR SELECT
USING (has_role(auth.uid(), 'market_manager'::user_role));

-- Allow market managers to view all collections
CREATE POLICY "Market managers can view all collections"
ON public.collections
FOR SELECT
USING (has_role(auth.uid(), 'market_manager'::user_role));

-- Allow market managers to view all offers
CREATE POLICY "Market managers can view all offers"
ON public.offers
FOR SELECT
USING (has_role(auth.uid(), 'market_manager'::user_role));

-- Allow market managers to view all non-available commodities
CREATE POLICY "Market managers can view all commodities"
ON public.non_available_commodities
FOR SELECT
USING (has_role(auth.uid(), 'market_manager'::user_role));

-- Allow market managers to view all organiser feedback
CREATE POLICY "Market managers can view all feedback"
ON public.organiser_feedback
FOR SELECT
USING (has_role(auth.uid(), 'market_manager'::user_role));

-- Allow market managers to view all next day planning
CREATE POLICY "Market managers can view all planning"
ON public.next_day_planning
FOR SELECT
USING (has_role(auth.uid(), 'market_manager'::user_role));

-- Allow market managers to view all attendance records
CREATE POLICY "Market managers can view all attendance"
ON public.attendance_records
FOR SELECT
USING (has_role(auth.uid(), 'market_manager'::user_role));

-- Allow market managers to view all media
CREATE POLICY "Market managers can view all media"
ON public.media
FOR SELECT
USING (has_role(auth.uid(), 'market_manager'::user_role));

-- Allow market managers to view all stall inspections
CREATE POLICY "Market managers can view all inspections"
ON public.stall_inspections
FOR SELECT
USING (has_role(auth.uid(), 'market_manager'::user_role));
