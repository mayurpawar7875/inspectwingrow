-- Create bdo_sessions table for BDO and Market Manager attendance tracking
CREATE TABLE public.bdo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  punch_in_time TIMESTAMP WITH TIME ZONE,
  punch_in_lat NUMERIC,
  punch_in_lng NUMERIC,
  punch_in_selfie_url TEXT,
  punch_out_time TIMESTAMP WITH TIME ZONE,
  punch_out_lat NUMERIC,
  punch_out_lng NUMERIC,
  working_hours NUMERIC DEFAULT 0,
  attendance_status TEXT DEFAULT 'pending' CHECK (attendance_status IN ('pending', 'absent', 'half_day', 'full_day')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, session_date)
);

-- Create indexes for efficient querying
CREATE INDEX idx_bdo_sessions_user_id ON public.bdo_sessions(user_id);
CREATE INDEX idx_bdo_sessions_session_date ON public.bdo_sessions(session_date);
CREATE INDEX idx_bdo_sessions_status ON public.bdo_sessions(status);

-- Enable RLS
ALTER TABLE public.bdo_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "BDOs and MMs can create their own sessions"
ON public.bdo_sessions FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND 
  (has_role(auth.uid(), 'bdo') OR has_role(auth.uid(), 'market_manager'))
);

CREATE POLICY "BDOs and MMs can view their own sessions"
ON public.bdo_sessions FOR SELECT
USING (
  auth.uid() = user_id OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "BDOs and MMs can update their own sessions"
ON public.bdo_sessions FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all BDO sessions"
ON public.bdo_sessions FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_bdo_sessions_updated_at
BEFORE UPDATE ON public.bdo_sessions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.bdo_sessions;