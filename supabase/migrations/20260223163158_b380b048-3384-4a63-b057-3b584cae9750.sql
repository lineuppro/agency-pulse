-- Add website_url column to clients table
ALTER TABLE public.clients ADD COLUMN website_url text DEFAULT NULL;