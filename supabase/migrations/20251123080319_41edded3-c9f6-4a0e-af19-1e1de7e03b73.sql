-- Enable RLS on Market Manager tables
ALTER TABLE public.market_manager_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_manager_punchin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_land_search ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stall_searching_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets_money_recovery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bms_stall_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_inspection_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_manager_punchout ENABLE ROW LEVEL SECURITY;

-- Policies for market_manager_sessions
CREATE POLICY "Market managers can create their sessions" ON public.market_manager_sessions FOR INSERT WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'market_manager'));
CREATE POLICY "Market managers can view their sessions" ON public.market_manager_sessions FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Market managers can update their sessions" ON public.market_manager_sessions FOR UPDATE USING (auth.uid() = user_id);

-- Policies for employee_allocations
CREATE POLICY "Market managers can manage allocations" ON public.employee_allocations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.market_manager_sessions WHERE id = employee_allocations.session_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin')))
);

-- Policies for market_manager_punchin
CREATE POLICY "Market managers can manage punch-in" ON public.market_manager_punchin FOR ALL USING (
  EXISTS (SELECT 1 FROM public.market_manager_sessions WHERE id = market_manager_punchin.session_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin')))
);

-- Policies for market_land_search
CREATE POLICY "Market managers can manage land search" ON public.market_land_search FOR ALL USING (
  EXISTS (SELECT 1 FROM public.market_manager_sessions WHERE id = market_land_search.session_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin')))
);

-- Policies for stall_searching_updates
CREATE POLICY "Market managers can manage stall search" ON public.stall_searching_updates FOR ALL USING (
  EXISTS (SELECT 1 FROM public.market_manager_sessions WHERE id = stall_searching_updates.session_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin')))
);

-- Policies for assets_money_recovery
CREATE POLICY "Market managers can manage money recovery" ON public.assets_money_recovery FOR ALL USING (
  EXISTS (SELECT 1 FROM public.market_manager_sessions WHERE id = assets_money_recovery.session_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin')))
);

-- Policies for assets_usage
CREATE POLICY "Market managers can manage assets usage" ON public.assets_usage FOR ALL USING (
  EXISTS (SELECT 1 FROM public.market_manager_sessions WHERE id = assets_usage.session_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin')))
);

-- Policies for bms_stall_feedbacks
CREATE POLICY "Market managers can manage feedbacks" ON public.bms_stall_feedbacks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.market_manager_sessions WHERE id = bms_stall_feedbacks.session_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin')))
);

-- Policies for market_inspection_updates
CREATE POLICY "Market managers can manage inspections" ON public.market_inspection_updates FOR ALL USING (
  EXISTS (SELECT 1 FROM public.market_manager_sessions WHERE id = market_inspection_updates.session_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin')))
);

-- Policies for market_manager_punchout
CREATE POLICY "Market managers can manage punch-out" ON public.market_manager_punchout FOR ALL USING (
  EXISTS (SELECT 1 FROM public.market_manager_sessions WHERE id = market_manager_punchout.session_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin')))
);

-- Updated_at triggers for market manager tables
CREATE TRIGGER update_mm_sessions_updated_at BEFORE UPDATE ON public.market_manager_sessions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_employee_allocations_updated_at BEFORE UPDATE ON public.employee_allocations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_market_land_search_updated_at BEFORE UPDATE ON public.market_land_search FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_stall_searching_updates_updated_at BEFORE UPDATE ON public.stall_searching_updates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_assets_money_recovery_updated_at BEFORE UPDATE ON public.assets_money_recovery FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_assets_usage_updated_at BEFORE UPDATE ON public.assets_usage FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_bms_stall_feedbacks_updated_at BEFORE UPDATE ON public.bms_stall_feedbacks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_market_inspection_updates_updated_at BEFORE UPDATE ON public.market_inspection_updates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();