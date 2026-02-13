
-- Create junction table for gestor-client relationships
CREATE TABLE public.gestor_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, client_id)
);

ALTER TABLE public.gestor_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all gestor_clients"
ON public.gestor_clients FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Gestors can view their own client assignments"
ON public.gestor_clients FOR SELECT
USING (user_id = auth.uid());

-- Helper function: get all client_ids a gestor has access to
CREATE OR REPLACE FUNCTION public.get_gestor_client_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT gc.client_id
  FROM public.gestor_clients gc
  JOIN public.user_roles ur ON ur.user_id = gc.user_id
  WHERE gc.user_id = _user_id
    AND ur.role = 'gestor'
$$;

-- Helper function: check if user is gestor for a specific client
CREATE OR REPLACE FUNCTION public.is_gestor_for_client(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.gestor_clients gc ON gc.user_id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = 'gestor'
      AND gc.client_id = _client_id
  )
$$;

-- Assign gestor role to allan@promovase.net
UPDATE public.user_roles 
SET role = 'gestor' 
WHERE user_id = '9c299a3e-f431-4506-973a-4e7ac5729814';

-- RLS policies for gestor access on all relevant tables

CREATE POLICY "Gestors can view their assigned clients"
ON public.clients FOR SELECT
USING (id IN (SELECT public.get_gestor_client_ids(auth.uid())));

CREATE POLICY "Gestors can manage tasks for their clients"
ON public.tasks FOR ALL
USING (client_id IN (SELECT public.get_gestor_client_ids(auth.uid())));

CREATE POLICY "Gestors can manage editorial contents for their clients"
ON public.editorial_contents FOR ALL
USING (client_id IN (SELECT public.get_gestor_client_ids(auth.uid())));

CREATE POLICY "Gestors can manage campaigns for their clients"
ON public.editorial_campaigns FOR ALL
USING (client_id IN (SELECT public.get_gestor_client_ids(auth.uid())));

CREATE POLICY "Gestors can manage agendas for their clients"
ON public.meeting_agendas FOR ALL
USING (client_id IN (SELECT public.get_gestor_client_ids(auth.uid())));

CREATE POLICY "Gestors can manage chat sessions for their clients"
ON public.chat_sessions FOR ALL
USING (client_id IN (SELECT public.get_gestor_client_ids(auth.uid())));

CREATE POLICY "Gestors can manage AI content for their clients"
ON public.ai_generated_contents FOR ALL
USING (client_id IN (SELECT public.get_gestor_client_ids(auth.uid())));

CREATE POLICY "Gestors can manage scheduled posts for their clients"
ON public.scheduled_posts FOR ALL
USING (client_id IN (SELECT public.get_gestor_client_ids(auth.uid())));

CREATE POLICY "Gestors can manage social posts for their clients"
ON public.social_scheduled_posts FOR ALL
USING (client_id IN (SELECT public.get_gestor_client_ids(auth.uid())));

CREATE POLICY "Gestors can manage social connections for their clients"
ON public.social_connections FOR ALL
USING (client_id IN (SELECT public.get_gestor_client_ids(auth.uid())));

CREATE POLICY "Gestors can view meta ads for their clients"
ON public.client_meta_ads FOR SELECT
USING (client_id IN (SELECT public.get_gestor_client_ids(auth.uid())));

CREATE POLICY "Gestors can manage AI settings for their clients"
ON public.client_ai_settings FOR ALL
USING (client_id IN (SELECT public.get_gestor_client_ids(auth.uid())));

CREATE POLICY "Gestors can manage meta connections for their clients"
ON public.meta_connections FOR ALL
USING (client_id IN (SELECT public.get_gestor_client_ids(auth.uid())));

CREATE POLICY "Gestors can manage documents for their clients"
ON public.documents_knowledge FOR ALL
USING (client_id IN (SELECT public.get_gestor_client_ids(auth.uid())));

CREATE POLICY "Gestors can manage editorial comments for their clients"
ON public.editorial_content_comments FOR ALL
USING (EXISTS (
  SELECT 1 FROM editorial_contents ec
  WHERE ec.id = editorial_content_comments.editorial_content_id
  AND ec.client_id IN (SELECT public.get_gestor_client_ids(auth.uid()))
));

CREATE POLICY "Gestors can manage task comments for their clients"
ON public.task_comments FOR ALL
USING (EXISTS (
  SELECT 1 FROM tasks t
  WHERE t.id = task_comments.task_id
  AND t.client_id IN (SELECT public.get_gestor_client_ids(auth.uid()))
));

CREATE POLICY "Gestors can manage task attachments for their clients"
ON public.task_attachments FOR ALL
USING (EXISTS (
  SELECT 1 FROM tasks t
  WHERE t.id = task_attachments.task_id
  AND t.client_id IN (SELECT public.get_gestor_client_ids(auth.uid()))
));

CREATE POLICY "Gestors can manage task activity for their clients"
ON public.task_activity_log FOR ALL
USING (EXISTS (
  SELECT 1 FROM tasks t
  WHERE t.id = task_activity_log.task_id
  AND t.client_id IN (SELECT public.get_gestor_client_ids(auth.uid()))
));

CREATE POLICY "Gestors can view profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'gestor'));
