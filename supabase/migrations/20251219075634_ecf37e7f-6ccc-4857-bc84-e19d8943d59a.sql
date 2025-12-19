-- First, let's add RLS policies for app_settings
-- Allow all authenticated users to read settings
CREATE POLICY "Authenticated users can read app_settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert settings
CREATE POLICY "Admins can insert app_settings"
ON public.app_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update settings
CREATE POLICY "Admins can update app_settings"
ON public.app_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default settings row if not exists
INSERT INTO public.app_settings (
  org_name,
  primary_color,
  secondary_color,
  gps_accuracy_meters,
  geofence_radius_meters,
  face_recognition_required,
  grace_minutes,
  retention_days,
  attendance_start,
  attendance_end,
  outside_rates_start,
  outside_rates_end,
  market_video_start,
  market_video_end
) 
SELECT 
  'My Organization',
  '#000000',
  '#666666',
  50,
  100,
  false,
  15,
  90,
  '06:00',
  '18:00',
  '06:00',
  '18:00',
  '06:00',
  '18:00'
WHERE NOT EXISTS (SELECT 1 FROM public.app_settings LIMIT 1);