-- Drop the existing view
DROP VIEW IF EXISTS live_markets_today;

-- Create updated view that shows markets based on schedule
CREATE OR REPLACE VIEW live_markets_today AS
SELECT 
  m.id as market_id,
  m.name as market_name,
  m.city,
  COALESCE(COUNT(DISTINCT s.id), 0) as active_sessions,
  MAX(med.captured_at) as last_upload_time
FROM markets m
INNER JOIN market_schedule ms ON m.id = ms.market_id
LEFT JOIN sessions s ON m.id = s.market_id 
  AND s.session_date = CURRENT_DATE 
  AND s.status = 'active'
LEFT JOIN media med ON s.id = med.session_id
WHERE ms.is_active = true
  AND ms.day_of_week = EXTRACT(DOW FROM CURRENT_DATE)::integer
GROUP BY m.id, m.name, m.city;