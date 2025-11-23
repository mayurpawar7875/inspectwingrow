-- Enable RLS for Asset Management tables
ALTER TABLE public.asset_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bdo_market_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bdo_stall_submissions ENABLE ROW LEVEL SECURITY;

-- Policies for asset_inventory
CREATE POLICY "Anyone can view asset inventory" ON public.asset_inventory FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage asset inventory" ON public.asset_inventory FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Policies for asset_requests
CREATE POLICY "Users can view their own requests" ON public.asset_requests FOR SELECT USING (auth.uid() = requester_id);
CREATE POLICY "Users can create their own requests" ON public.asset_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update their own pending requests" ON public.asset_requests FOR UPDATE USING (auth.uid() = requester_id AND status = 'pending');
CREATE POLICY "Admins can view all requests" ON public.asset_requests FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage all requests" ON public.asset_requests FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Policies for asset_payments
CREATE POLICY "Users can view their own payments" ON public.asset_payments FOR SELECT USING (auth.uid() = requester_id);
CREATE POLICY "Users can create their own payments" ON public.asset_payments FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Admins can view all payments" ON public.asset_payments FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage all payments" ON public.asset_payments FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Policies for bdo_market_submissions
CREATE POLICY "BDOs can view their own submissions" ON public.bdo_market_submissions FOR SELECT USING (
  auth.uid() = submitted_by OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'bdo')
);
CREATE POLICY "BDOs can create submissions" ON public.bdo_market_submissions FOR INSERT WITH CHECK (
  auth.uid() = submitted_by AND (has_role(auth.uid(), 'bdo') OR has_role(auth.uid(), 'admin'))
);
CREATE POLICY "BDOs can update their own pending submissions" ON public.bdo_market_submissions FOR UPDATE USING (
  auth.uid() = submitted_by AND status = 'pending_review' AND (has_role(auth.uid(), 'bdo') OR has_role(auth.uid(), 'admin'))
);
CREATE POLICY "BDOs can update documents on approved submissions" ON public.bdo_market_submissions FOR UPDATE USING (
  auth.uid() = submitted_by AND has_role(auth.uid(), 'bdo') AND status = 'approved'
) WITH CHECK (
  auth.uid() = submitted_by AND has_role(auth.uid(), 'bdo') AND status = 'approved'
);
CREATE POLICY "Admins can manage all submissions" ON public.bdo_market_submissions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Policies for bdo_stall_submissions
CREATE POLICY "BDOs can create stall submissions" ON public.bdo_stall_submissions FOR INSERT WITH CHECK (auth.uid() = submitted_by AND has_role(auth.uid(), 'bdo'));
CREATE POLICY "BDOs can view their own submissions" ON public.bdo_stall_submissions FOR SELECT USING (auth.uid() = submitted_by);
CREATE POLICY "Admins can view all stall submissions" ON public.bdo_stall_submissions FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update stall submissions" ON public.bdo_stall_submissions FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Triggers for updated_at
CREATE TRIGGER update_asset_inventory_updated_at BEFORE UPDATE ON public.asset_inventory FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_asset_requests_updated_at BEFORE UPDATE ON public.asset_requests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_asset_payments_updated_at BEFORE UPDATE ON public.asset_payments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_bdo_market_submissions_updated_at BEFORE UPDATE ON public.bdo_market_submissions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_bdo_stall_submissions_updated_at BEFORE UPDATE ON public.bdo_stall_submissions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to update inventory on approval
CREATE OR REPLACE FUNCTION public.update_inventory_on_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    UPDATE public.asset_inventory
    SET 
      available_quantity = available_quantity - NEW.quantity,
      issued_quantity = issued_quantity + NEW.quantity,
      updated_at = NOW()
    WHERE id = NEW.asset_id;
  END IF;
  
  IF NEW.status = 'returned' AND OLD.status = 'approved' THEN
    UPDATE public.asset_inventory
    SET 
      available_quantity = available_quantity + NEW.quantity,
      issued_quantity = issued_quantity - NEW.quantity,
      updated_at = NOW()
    WHERE id = NEW.asset_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_inventory_trigger
  AFTER UPDATE ON public.asset_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inventory_on_approval();