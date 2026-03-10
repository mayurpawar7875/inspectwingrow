DROP POLICY IF EXISTS "BDOs can view their own submissions" ON public.bdo_market_submissions;

CREATE POLICY "BDOs can view their own submissions"
  ON public.bdo_market_submissions FOR SELECT
  USING (auth.uid() = submitted_by OR has_role(auth.uid(), 'admin'::user_role));