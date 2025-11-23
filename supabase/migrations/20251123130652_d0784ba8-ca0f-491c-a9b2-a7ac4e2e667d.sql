-- Drop and recreate the view without SECURITY DEFINER
DROP VIEW IF EXISTS live_markets_today;

CREATE VIEW live_markets_today WITH (security_invoker=true) AS
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