-- Create enum for content types
CREATE TYPE public.content_type AS ENUM (
  'instagram',
  'facebook',
  'blog',
  'email',
  'google_ads',
  'other'
);

-- Create enum for content status
CREATE TYPE public.content_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'published'
);

-- Create editorial_contents table
CREATE TABLE public.editorial_contents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type public.content_type NOT NULL,
  scheduled_date DATE NOT NULL,
  status public.content_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.editorial_contents ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage all contents
CREATE POLICY "Admins can manage all editorial contents"
ON public.editorial_contents
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create policy for clients to view their own contents
CREATE POLICY "Clients can view their editorial contents"
ON public.editorial_contents
FOR SELECT
USING (client_id = get_user_client_id(auth.uid()));

-- Create policy for clients to update status of their contents (approve/reject)
CREATE POLICY "Clients can update status of their contents"
ON public.editorial_contents
FOR UPDATE
USING (client_id = get_user_client_id(auth.uid()))
WITH CHECK (client_id = get_user_client_id(auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_editorial_contents_updated_at
BEFORE UPDATE ON public.editorial_contents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_editorial_contents_client_id ON public.editorial_contents(client_id);
CREATE INDEX idx_editorial_contents_scheduled_date ON public.editorial_contents(scheduled_date);
CREATE INDEX idx_editorial_contents_status ON public.editorial_contents(status);