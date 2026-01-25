-- Add type column to notifications table for categorizing notifications
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general';

-- Add index for filtering by type
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- Create a function to broadcast app update notifications
CREATE OR REPLACE FUNCTION public.broadcast_app_update(
  p_version TEXT,
  p_title TEXT,
  p_message TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (title, body, type, target_user_id)
  VALUES (
    p_title,
    p_message,
    'update',
    NULL -- NULL means broadcast to all users
  );
END;
$$;