-- Enum para plataforma de publicação
CREATE TYPE public.meta_platform AS ENUM ('instagram', 'facebook', 'both');

-- Enum para tipo de post
CREATE TYPE public.meta_post_type AS ENUM ('image', 'video', 'carousel', 'reel', 'story');

-- Enum para status de agendamento
CREATE TYPE public.scheduled_post_status AS ENUM ('scheduled', 'publishing', 'published', 'failed');

-- Tabela de conexões Meta (OAuth tokens por cliente)
CREATE TABLE public.meta_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  facebook_page_id TEXT,
  facebook_page_name TEXT,
  instagram_account_id TEXT,
  instagram_username TEXT,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

-- Tabela de posts agendados
CREATE TABLE public.scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  editorial_content_id UUID REFERENCES public.editorial_contents(id) ON DELETE SET NULL,
  platform meta_platform NOT NULL DEFAULT 'instagram',
  post_type meta_post_type NOT NULL DEFAULT 'image',
  media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  caption TEXT,
  hashtags TEXT[],
  scheduled_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  status scheduled_post_status NOT NULL DEFAULT 'scheduled',
  meta_post_id TEXT,
  error_message TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de configuração Meta Ads por cliente
CREATE TABLE public.client_meta_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  ad_account_id TEXT NOT NULL,
  ad_account_name TEXT,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

-- Enable RLS
ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_meta_ads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meta_connections
CREATE POLICY "Admins can manage all meta connections"
ON public.meta_connections FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view their meta connection"
ON public.meta_connections FOR SELECT
USING (client_id = get_user_client_id(auth.uid()));

-- RLS Policies for scheduled_posts
CREATE POLICY "Admins can manage all scheduled posts"
ON public.scheduled_posts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view their scheduled posts"
ON public.scheduled_posts FOR SELECT
USING (client_id = get_user_client_id(auth.uid()));

-- RLS Policies for client_meta_ads
CREATE POLICY "Admins can manage all meta ads configs"
ON public.client_meta_ads FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view their meta ads config"
ON public.client_meta_ads FOR SELECT
USING (client_id = get_user_client_id(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_meta_connections_updated_at
BEFORE UPDATE ON public.meta_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_posts_updated_at
BEFORE UPDATE ON public.scheduled_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_meta_ads_updated_at
BEFORE UPDATE ON public.client_meta_ads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();