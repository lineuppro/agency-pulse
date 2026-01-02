-- 1. Create meeting_agendas table for history
CREATE TABLE public.meeting_agendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT,
  notes TEXT,
  generated_summary TEXT,
  meeting_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_agendas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all agendas"
  ON public.meeting_agendas FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view their agendas"
  ON public.meeting_agendas FOR SELECT
  USING (client_id = public.get_user_client_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_meeting_agendas_updated_at
  BEFORE UPDATE ON public.meeting_agendas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add assigned_to column to tasks
ALTER TABLE public.tasks
ADD COLUMN assigned_to UUID;