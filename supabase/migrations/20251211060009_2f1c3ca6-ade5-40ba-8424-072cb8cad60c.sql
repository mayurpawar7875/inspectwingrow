
-- Fix RLS policies for collections table to allow employees to insert/update their own collections

-- Drop the existing admin-only policy
DROP POLICY IF EXISTS "Admins can manage collections" ON public.collections;

-- Create policy for admins to manage all collections
CREATE POLICY "Admins can manage all collections" 
ON public.collections 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Create policy for users to insert their own collections
CREATE POLICY "Users can insert their own collections" 
ON public.collections 
FOR INSERT 
WITH CHECK (auth.uid() = collected_by);

-- Create policy for users to update their own collections
CREATE POLICY "Users can update their own collections" 
ON public.collections 
FOR UPDATE 
USING (auth.uid() = collected_by);

-- Create policy for users to delete their own collections
CREATE POLICY "Users can delete their own collections" 
ON public.collections 
FOR DELETE 
USING (auth.uid() = collected_by);

-- Create policy for users to view their own collections
CREATE POLICY "Users can view their own collections" 
ON public.collections 
FOR SELECT 
USING (auth.uid() = collected_by OR has_role(auth.uid(), 'admin'::user_role));

-- Create payment-screenshots storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-screenshots', 'payment-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for payment-screenshots bucket
CREATE POLICY "Users can upload their own payment screenshots" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'payment-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own payment screenshots" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'payment-screenshots' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::user_role)));

CREATE POLICY "Admins can manage all payment screenshots" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'payment-screenshots' AND has_role(auth.uid(), 'admin'::user_role));
