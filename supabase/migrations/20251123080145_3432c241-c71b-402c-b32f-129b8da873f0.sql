-- Enable RLS for additional tables
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.non_available_commodities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organiser_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.next_day_planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stall_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stall_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_schedule ENABLE ROW LEVEL SECURITY;

-- Policies for offers
CREATE POLICY "Users can view their own offers" ON public.offers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own offers" ON public.offers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own offers" ON public.offers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own offers" ON public.offers FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all offers" ON public.offers FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Policies for non_available_commodities
CREATE POLICY "Users can manage their own commodities" ON public.non_available_commodities FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all commodities" ON public.non_available_commodities FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Policies for organiser_feedback
CREATE POLICY "Users can manage their own feedback" ON public.organiser_feedback FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all feedback" ON public.organiser_feedback FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Policies for next_day_planning
CREATE POLICY "Users can manage their own planning" ON public.next_day_planning FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all planning" ON public.next_day_planning FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Policies for stall_confirmations
CREATE POLICY "Users can manage their confirmations" ON public.stall_confirmations FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "Admins can view all confirmations" ON public.stall_confirmations FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Policies for stall_inspections
CREATE POLICY "Users can manage inspections in their sessions" ON public.stall_inspections FOR ALL USING (
  EXISTS (SELECT 1 FROM public.sessions WHERE sessions.id = stall_inspections.session_id AND sessions.user_id = auth.uid())
);
CREATE POLICY "Admins can view all inspections" ON public.stall_inspections FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Policies for collections
CREATE POLICY "Admins can manage collections" ON public.collections FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (target_user_id = auth.uid() OR target_user_id IS NULL);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (target_user_id = auth.uid());
CREATE POLICY "Admins can manage all notifications" ON public.notifications FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies for farmers
CREATE POLICY "Everyone can view farmers" ON public.farmers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage farmers" ON public.farmers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies for employee_leaves
CREATE POLICY "Users can view their own leaves" ON public.employee_leaves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own leaves" ON public.employee_leaves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all leaves" ON public.employee_leaves FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies for market_schedule
CREATE POLICY "Everyone can view schedule" ON public.market_schedule FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage schedule" ON public.market_schedule FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_non_available_commodities_updated_at BEFORE UPDATE ON public.non_available_commodities FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_organiser_feedback_updated_at BEFORE UPDATE ON public.organiser_feedback FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_next_day_planning_updated_at BEFORE UPDATE ON public.next_day_planning FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_stall_inspections_updated_at BEFORE UPDATE ON public.stall_inspections FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_farmers_updated_at BEFORE UPDATE ON public.farmers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_employee_leaves_updated_at BEFORE UPDATE ON public.employee_leaves FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();