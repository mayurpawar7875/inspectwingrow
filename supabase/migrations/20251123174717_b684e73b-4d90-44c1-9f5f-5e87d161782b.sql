-- Create reimbursement_requests table
CREATE TABLE IF NOT EXISTS public.reimbursement_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES auth.users(id),
  request_type TEXT NOT NULL CHECK (request_type IN ('flex_overtime', 'other_expenses', 'week_off_working')),
  amount NUMERIC(10, 2) NOT NULL,
  description TEXT,
  receipt_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create storage bucket for reimbursement receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('reimbursement-receipts', 'reimbursement-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on reimbursement_requests
ALTER TABLE public.reimbursement_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reimbursement_requests
CREATE POLICY "Employees can create their own reimbursement requests"
  ON public.reimbursement_requests
  FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Employees can view their own reimbursement requests"
  ON public.reimbursement_requests
  FOR SELECT
  USING (auth.uid() = employee_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reimbursement requests"
  ON public.reimbursement_requests
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all reimbursement requests"
  ON public.reimbursement_requests
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Storage policies for reimbursement receipts
CREATE POLICY "Employees can upload their own receipts"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'reimbursement-receipts' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Employees can view their own receipts"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'reimbursement-receipts' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can view all receipts"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'reimbursement-receipts' 
    AND has_role(auth.uid(), 'admin')
  );

-- Trigger for updated_at
CREATE TRIGGER update_reimbursement_requests_updated_at
  BEFORE UPDATE ON public.reimbursement_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();