-- Allow admins to delete markets even when historical references exist by cascading deletes
ALTER TABLE public.employee_allocations DROP CONSTRAINT IF EXISTS employee_allocations_market_id_fkey;
ALTER TABLE public.employee_allocations ADD CONSTRAINT employee_allocations_market_id_fkey
  FOREIGN KEY (market_id) REFERENCES public.markets(id) ON DELETE CASCADE;

ALTER TABLE public.assets_usage DROP CONSTRAINT IF EXISTS assets_usage_market_id_fkey;
ALTER TABLE public.assets_usage ADD CONSTRAINT assets_usage_market_id_fkey
  FOREIGN KEY (market_id) REFERENCES public.markets(id) ON DELETE CASCADE;

ALTER TABLE public.market_inspection_updates DROP CONSTRAINT IF EXISTS market_inspection_updates_market_id_fkey;
ALTER TABLE public.market_inspection_updates ADD CONSTRAINT market_inspection_updates_market_id_fkey
  FOREIGN KEY (market_id) REFERENCES public.markets(id) ON DELETE CASCADE;

ALTER TABLE public.asset_requests DROP CONSTRAINT IF EXISTS asset_requests_market_id_fkey;
ALTER TABLE public.asset_requests ADD CONSTRAINT asset_requests_market_id_fkey
  FOREIGN KEY (market_id) REFERENCES public.markets(id) ON DELETE SET NULL;

ALTER TABLE public.bms_stall_feedbacks DROP CONSTRAINT IF EXISTS bms_stall_feedbacks_market_id_fkey;
ALTER TABLE public.bms_stall_feedbacks ADD CONSTRAINT bms_stall_feedbacks_market_id_fkey
  FOREIGN KEY (market_id) REFERENCES public.markets(id) ON DELETE SET NULL;