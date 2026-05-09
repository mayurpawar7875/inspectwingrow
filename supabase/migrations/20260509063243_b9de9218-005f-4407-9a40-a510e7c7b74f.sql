WITH task_counts AS (
  SELECT
    s.id AS session_id,
    s.user_id,
    (CASE WHEN s.punch_in_time IS NOT NULL THEN 1 ELSE 0 END)
    + (SELECT COUNT(DISTINCT m.media_type)
         FROM media m
        WHERE m.session_id = s.id
          AND m.media_type IN ('outside_rates','rate_board','market_video','cleaning_video','customer_feedback','selfie_gps'))
    + (CASE WHEN EXISTS (SELECT 1 FROM stall_confirmations sc
                          WHERE sc.market_id = s.market_id AND sc.market_date = s.session_date) THEN 1 ELSE 0 END)
    + (CASE WHEN EXISTS (SELECT 1 FROM offers o
                          WHERE o.session_id = s.id) THEN 1 ELSE 0 END)
    + (CASE WHEN EXISTS (SELECT 1 FROM non_available_commodities n
                          WHERE n.session_id = s.id) THEN 1 ELSE 0 END)
    + (CASE WHEN EXISTS (SELECT 1 FROM stall_inspections i
                          WHERE i.session_id = s.id) THEN 1 ELSE 0 END)
    + (CASE WHEN EXISTS (SELECT 1 FROM organiser_feedback f
                          WHERE f.session_id = s.id) THEN 1 ELSE 0 END)
    + (CASE WHEN EXISTS (SELECT 1 FROM next_day_planning np
                          WHERE np.session_id = s.id) THEN 1 ELSE 0 END)
    AS completed
  FROM sessions s
)
UPDATE attendance_records ar
SET completed_tasks = tc.completed,
    total_tasks = 13,
    status = CASE
      WHEN (tc.completed::numeric / 13) * 100 >= 95 THEN 'full_day'
      WHEN (tc.completed::numeric / 13) * 100 >= 55 THEN 'half_day'
      ELSE 'absent'
    END,
    updated_at = now()
FROM task_counts tc
WHERE ar.session_id = tc.session_id
  AND ar.user_id = tc.user_id
  AND ar.status IN ('present','half_day','absent','full_day')
  AND COALESCE(ar.role::text, 'employee') = 'employee';