-- Drop the existing live_markets_today view
DROP VIEW IF EXISTS live_markets_today;

-- Recreate live_markets_today view based on market schedule
CREATE VIEW live_markets_today AS
SELECT 
  m.id as market_id,
  m.name as market_name,
  m.city,
  COUNT(DISTINCT s.id) as active_sessions,
  MAX(media.captured_at) as last_upload_time
FROM markets m
INNER JOIN market_schedule ms ON m.id = ms.market_id
LEFT JOIN sessions s ON m.id = s.market_id 
  AND s.session_date = CURRENT_DATE 
  AND s.status = 'active'
LEFT JOIN media ON s.id = media.session_id
WHERE ms.day_of_week = EXTRACT(DOW FROM CURRENT_DATE)::integer
  AND ms.is_active = true
  AND m.is_active = true
GROUP BY m.id, m.name, m.city;