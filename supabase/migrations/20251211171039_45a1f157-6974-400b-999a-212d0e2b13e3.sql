-- Fix: Farmer Contact Information Publicly Accessible
-- Drop the overly permissive policy that allows anyone to view farmers
DROP POLICY IF EXISTS "Everyone can view farmers" ON public.farmers;

-- Create restrictive policy for authenticated users only
CREATE POLICY "Authenticated users can view farmers"
  ON public.farmers FOR SELECT
  TO authenticated
  USING (true);