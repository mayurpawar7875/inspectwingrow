
-- Update has_role function with explicit GRANT
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.has_role(uuid, user_role) TO authenticated, anon;
