-- Fix handle_updated_at function to set search_path
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-media', 'employee-media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload their own media" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'employee-media' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own media" ON storage.objects FOR SELECT USING (
  bucket_id = 'employee-media' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all media" ON storage.objects FOR SELECT USING (
  bucket_id = 'employee-media' AND public.has_role(auth.uid(), 'admin')
);

-- Auth trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.employees (id, email, full_name, phone, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'username'
  );
  
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_stalls_updated_at BEFORE UPDATE ON public.stalls FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();