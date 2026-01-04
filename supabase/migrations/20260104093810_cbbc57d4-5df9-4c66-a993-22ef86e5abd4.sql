-- Allow users to update their own attendance records (needed for punch-out/finalize to persist)
CREATE POLICY "Users can update their own attendance"
ON public.attendance_records
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow admins to update any attendance record
CREATE POLICY "Admins can update all attendance"
ON public.attendance_records
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.user_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.user_role));