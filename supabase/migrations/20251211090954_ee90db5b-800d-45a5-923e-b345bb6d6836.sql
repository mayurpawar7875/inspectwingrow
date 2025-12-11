-- Allow Market Managers to view all sessions for employee allocation purposes
CREATE POLICY "Market managers can view all sessions" 
ON public.sessions 
FOR SELECT 
USING (has_role(auth.uid(), 'market_manager'::user_role));