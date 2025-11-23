-- Create view for live markets today
CREATE OR REPLACE VIEW live_markets_today AS
SELECT DISTINCT
  m.id as market_id,
  m.name as market_name,
  m.city,
  COUNT(DISTINCT s.id) as active_sessions,
  MAX(med.created_at) as last_upload_time
FROM markets m
INNER JOIN sessions s ON s.market_id = m.id
LEFT JOIN media med ON med.session_id = s.id
WHERE s.session_date = CURRENT_DATE
  AND s.status = 'active'
GROUP BY m.id, m.name, m.city;

-- Create attendance records table for tracking all employee attendance
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  mm_session_id UUID REFERENCES market_manager_sessions(id) ON DELETE CASCADE,
  punch_in_time TIMESTAMPTZ,
  punch_out_time TIMESTAMPTZ,
  punch_in_lat NUMERIC,
  punch_in_lng NUMERIC,
  punch_out_lat NUMERIC,
  punch_out_lng NUMERIC,
  selfie_url TEXT,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'present',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- Policies for attendance_records
CREATE POLICY "Users can view their own attendance"
  ON attendance_records FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Users can insert their own attendance"
  ON attendance_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all attendance"
  ON attendance_records FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Create trigger for updated_at
CREATE TRIGGER update_attendance_records_updated_at
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Grant permissions
GRANT SELECT ON live_markets_today TO authenticated;
GRANT ALL ON attendance_records TO authenticated;