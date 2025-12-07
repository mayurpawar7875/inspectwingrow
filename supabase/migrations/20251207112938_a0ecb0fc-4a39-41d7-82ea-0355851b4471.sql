-- Allow admins and BDOs to view all profiles for employee name lookups
CREATE POLICY "Admins and BDOs can view all profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::user_role) OR 
  has_role(auth.uid(), 'bdo'::user_role) OR
  has_role(auth.uid(), 'market_manager'::user_role)
);