-- Create storage bucket for social media files
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-media', 'social-media', true);

-- Policy: Anyone can view files (necessary for Meta API to access media URLs)
CREATE POLICY "Public read access for social media"
ON storage.objects FOR SELECT
USING (bucket_id = 'social-media');

-- Policy: Authenticated admins can upload files
CREATE POLICY "Admins can upload social media files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'social-media' 
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Policy: Authenticated admins can update files
CREATE POLICY "Admins can update social media files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'social-media' 
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Policy: Authenticated admins can delete files
CREATE POLICY "Admins can delete social media files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'social-media' 
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);