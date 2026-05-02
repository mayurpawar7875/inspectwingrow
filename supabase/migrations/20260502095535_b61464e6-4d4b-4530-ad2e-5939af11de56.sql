create unique index if not exists sessions_one_per_user_day_from_2026_05_02
on public.sessions (user_id, session_date)
where session_date >= date '2026-05-02';