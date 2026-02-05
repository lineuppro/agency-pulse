-- Create enum for social platforms
CREATE TYPE public.social_platform AS ENUM ('instagram', 'facebook', 'linkedin', 'tiktok', 'twitter');

-- Create table for social media connections per client
CREATE TABLE public.social_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  platform_user_id TEXT,
  platform_username TEXT,
  page_id TEXT,
  page_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, platform)
);

-- Enable RLS
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage all social connections"
ON public.social_connections
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view their social connections"
ON public.social_connections
FOR SELECT
USING (client_id = get_user_client_id(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_social_connections_updated_at
BEFORE UPDATE ON public.social_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create enum for post status
CREATE TYPE public.social_post_status AS ENUM ('draft', 'scheduled', 'publishing', 'published', 'failed', 'cancelled');

-- Create enum for post type
CREATE TYPE public.social_post_type AS ENUM ('image', 'video', 'carousel', 'story', 'reel', 'text');

-- Create table for scheduled posts
CREATE TABLE public.social_scheduled_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  editorial_content_id UUID REFERENCES public.editorial_contents(id) ON DELETE SET NULL,
  platform social_platform NOT NULL,
  post_type social_post_type NOT NULL DEFAULT 'image',
  media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  caption TEXT,
  hashtags TEXT[],
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  status social_post_status NOT NULL DEFAULT 'scheduled',
  platform_post_id TEXT,
  error_message TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_scheduled_posts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage all scheduled posts"
ON public.social_scheduled_posts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view their scheduled posts"
ON public.social_scheduled_posts
FOR SELECT
USING (client_id = get_user_client_id(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_social_scheduled_posts_updated_at
BEFORE UPDATE ON public.social_scheduled_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for scheduler queries
CREATE INDEX idx_social_scheduled_posts_status_scheduled_at 
ON public.social_scheduled_posts(status, scheduled_at) 
WHERE status = 'scheduled';