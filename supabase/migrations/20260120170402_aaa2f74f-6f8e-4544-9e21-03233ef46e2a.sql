-- Create editorial_campaigns table
CREATE TABLE public.editorial_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  instagram_count INTEGER NOT NULL DEFAULT 0,
  facebook_count INTEGER NOT NULL DEFAULT 0,
  blog_count INTEGER NOT NULL DEFAULT 0,
  email_count INTEGER NOT NULL DEFAULT 0,
  google_ads_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add campaign_id to editorial_contents
ALTER TABLE public.editorial_contents 
ADD COLUMN campaign_id UUID REFERENCES public.editorial_campaigns(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.editorial_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS policies for editorial_campaigns
CREATE POLICY "Admins can manage all campaigns"
ON public.editorial_campaigns
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view their campaigns"
ON public.editorial_campaigns
FOR SELECT
USING (client_id = get_user_client_id(auth.uid()));

-- Create index for better performance
CREATE INDEX idx_editorial_contents_campaign_id ON public.editorial_contents(campaign_id);
CREATE INDEX idx_editorial_campaigns_client_id ON public.editorial_campaigns(client_id);
CREATE INDEX idx_editorial_campaigns_dates ON public.editorial_campaigns(start_date, end_date);

-- Trigger for updated_at
CREATE TRIGGER update_editorial_campaigns_updated_at
BEFORE UPDATE ON public.editorial_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();