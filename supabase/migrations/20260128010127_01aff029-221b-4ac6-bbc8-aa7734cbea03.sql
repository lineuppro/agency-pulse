-- Table for storing AI settings per client (admin only)
CREATE TABLE public.client_ai_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  -- Custom prompt instructions for content generation
  brand_voice TEXT, -- Tom de voz da marca
  target_audience TEXT, -- Público-alvo
  brand_keywords TEXT[], -- Palavras-chave da marca
  content_guidelines TEXT, -- Diretrizes gerais de conteúdo
  default_word_count INTEGER DEFAULT 1500, -- Quantidade padrão de palavras para artigos
  custom_prompt TEXT, -- Prompt personalizado adicional
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

-- Enable RLS
ALTER TABLE public.client_ai_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage AI settings (clients should NOT see this)
CREATE POLICY "Admins can manage all AI settings"
  ON public.client_ai_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Table for storing generated content (articles, posts, etc.)
CREATE TABLE public.ai_generated_contents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  editorial_content_id UUID REFERENCES public.editorial_contents(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('blog_article', 'social_post', 'carousel', 'stories', 'reels')),
  -- Input data
  topic TEXT NOT NULL,
  main_keyword TEXT, -- For SEO articles
  target_word_count INTEGER,
  additional_instructions TEXT,
  -- Generated content
  title TEXT,
  seo_title TEXT, -- <60 chars
  meta_description TEXT, -- 100-120 chars
  content TEXT, -- Main content (article body or post caption)
  hashtags TEXT[],
  image_suggestions TEXT[], -- Briefing for designer
  slides JSONB, -- For carousels: [{title, content, image_suggestion}]
  -- SEO metrics (for articles)
  keyword_density DECIMAL(4,2),
  readability_score DECIMAL(4,2), -- Flesch Reading Ease
  word_count INTEGER,
  -- Metadata
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'linked')),
  version INTEGER DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_generated_contents ENABLE ROW LEVEL SECURITY;

-- Only admins can manage generated content (clients should NOT see this)
CREATE POLICY "Admins can manage all generated content"
  ON public.ai_generated_contents
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Table for storing reference content (library of successful content)
CREATE TABLE public.content_references (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('blog_article', 'social_post', 'carousel', 'stories', 'reels')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  notes TEXT,
  is_global BOOLEAN DEFAULT false, -- Global references available to all clients
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_references ENABLE ROW LEVEL SECURITY;

-- Only admins can manage content references
CREATE POLICY "Admins can manage all content references"
  ON public.content_references
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_client_ai_settings_updated_at
  BEFORE UPDATE ON public.client_ai_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_generated_contents_updated_at
  BEFORE UPDATE ON public.ai_generated_contents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();