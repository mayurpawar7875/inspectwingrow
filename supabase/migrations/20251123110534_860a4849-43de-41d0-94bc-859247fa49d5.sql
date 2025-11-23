-- Create app_settings table for application configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- General settings
  org_name TEXT NOT NULL DEFAULT 'Wingrow Agritech',
  org_email TEXT,
  primary_color TEXT NOT NULL DEFAULT '#3B82F6',
  secondary_color TEXT NOT NULL DEFAULT '#10B981',
  collection_sheet_url TEXT,
  
  -- Time windows
  attendance_start TIME NOT NULL DEFAULT '06:00',
  attendance_end TIME NOT NULL DEFAULT '18:00',
  outside_rates_start TIME NOT NULL DEFAULT '06:00',
  outside_rates_end TIME NOT NULL DEFAULT '18:00',
  market_video_start TIME NOT NULL DEFAULT '06:00',
  market_video_end TIME NOT NULL DEFAULT '18:00',
  
  -- Attendance settings
  gps_accuracy_meters INTEGER NOT NULL DEFAULT 50,
  geofence_radius_meters INTEGER NOT NULL DEFAULT 100,
  face_recognition_required BOOLEAN NOT NULL DEFAULT FALSE,
  grace_minutes INTEGER NOT NULL DEFAULT 15,
  
  -- Data settings
  retention_days INTEGER NOT NULL DEFAULT 90
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage settings
CREATE POLICY "Admins can manage settings"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Add updated_at trigger
CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Insert default settings (only one row should exist)
INSERT INTO public.app_settings (org_name, org_email, primary_color, secondary_color)
VALUES ('Wingrow Agritech', 'info@wingrowagritech.com', '#3B82F6', '#10B981')
ON CONFLICT DO NOTHING;