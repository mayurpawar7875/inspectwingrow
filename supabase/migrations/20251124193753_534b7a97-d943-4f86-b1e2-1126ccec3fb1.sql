-- First, drop duplicate policies (keeping only the authenticated ones)
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Grant usage on the user_role type to authenticated users
GRANT USAGE ON TYPE user_role TO authenticated;

-- Ensure the has_role function is accessible
GRANT EXECUTE ON FUNCTION public.has_role(uuid, user_role) TO authenticated, anon;