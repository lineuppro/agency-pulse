-- Add UPDATE policy for storage objects (needed for potential overwrites)
CREATE POLICY "Authenticated users can update task attachments"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL);