-- Allow Market Managers to view all active employees for allocation purposes
CREATE POLICY "Market managers can read all employees" 
ON public.employees 
FOR SELECT 
USING (has_role(auth.uid(), 'market_manager'::user_role));