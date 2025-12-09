-- Create storage policies for employee-media bucket
-- Allow authenticated users to upload files to employee-media bucket
CREATE POLICY "Authenticated users can upload to employee-media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'employee-media');

-- Allow authenticated users to read their own uploads from employee-media
CREATE POLICY "Authenticated users can read from employee-media"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'employee-media');

-- Allow authenticated users to update their own files in employee-media
CREATE POLICY "Authenticated users can update in employee-media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'employee-media');

-- Allow authenticated users to delete their own files in employee-media
CREATE POLICY "Authenticated users can delete from employee-media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'employee-media');