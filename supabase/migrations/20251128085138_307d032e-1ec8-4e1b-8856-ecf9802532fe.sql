-- Security Fix 1: Remove public access to employees table
DROP POLICY IF EXISTS "Public can check username for login" ON public.employees;

-- Create a secure RPC function for authentication that only returns user_id
-- This prevents exposing email addresses and other employee data
CREATE OR REPLACE FUNCTION public.get_employee_id_by_username(lookup_username TEXT)
RETURNS TABLE(user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT id
  FROM public.employees
  WHERE username = lookup_username OR email = lookup_username
  LIMIT 1;
END;
$$;

-- Grant execute permission for authentication flow
GRANT EXECUTE ON FUNCTION public.get_employee_id_by_username(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_employee_id_by_username(TEXT) TO authenticated;

COMMENT ON FUNCTION public.get_employee_id_by_username IS 'Secure authentication lookup - returns only user_id without exposing employee emails or other sensitive data';

-- Security Fix 2: Recreate live_markets_today view with security_invoker
-- This makes the view respect RLS policies of underlying tables
DROP VIEW IF EXISTS public.live_markets_today;

CREATE VIEW public.live_markets_today 
WITH (security_invoker = true)
AS
SELECT 
  m.id as market_id,
  m.name as market_name,
  m.city,
  COUNT(DISTINCT s.id) as active_sessions,
  MAX(med.captured_at) as last_upload_time
FROM public.markets m
LEFT JOIN public.sessions s ON s.market_id = m.id 
  AND s.session_date = CURRENT_DATE 
  AND s.status IN ('active', 'completed')
LEFT JOIN public.media med ON med.session_id = s.id
LEFT JOIN public.market_schedule ms ON ms.market_id = m.id
WHERE m.is_active = true
  AND ms.is_active = true
  AND ms.day_of_week = EXTRACT(DOW FROM CURRENT_DATE)::INTEGER
GROUP BY m.id, m.name, m.city;

COMMENT ON VIEW public.live_markets_today IS 'Secure view that respects RLS policies of underlying tables (security_invoker = true). Only authenticated users can access.';