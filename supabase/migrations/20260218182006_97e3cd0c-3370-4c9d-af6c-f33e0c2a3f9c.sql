
-- Fix gestor RLS policies: add explicit WITH CHECK for INSERT operations
-- PostgreSQL requires WITH CHECK for INSERT/UPDATE in ALL policies

-- ============ tasks ============
DROP POLICY IF EXISTS "Gestors can manage tasks for their clients" ON public.tasks;
CREATE POLICY "Gestors can manage tasks for their clients"
ON public.tasks FOR ALL
TO authenticated
USING (client_id IN (SELECT get_gestor_client_ids(auth.uid())))
WITH CHECK (client_id IN (SELECT get_gestor_client_ids(auth.uid())));

-- ============ editorial_contents ============
DROP POLICY IF EXISTS "Gestors can manage editorial contents for their clients" ON public.editorial_contents;
CREATE POLICY "Gestors can manage editorial contents for their clients"
ON public.editorial_contents FOR ALL
TO authenticated
USING (client_id IN (SELECT get_gestor_client_ids(auth.uid())))
WITH CHECK (client_id IN (SELECT get_gestor_client_ids(auth.uid())));

-- ============ editorial_campaigns ============
DROP POLICY IF EXISTS "Gestors can manage campaigns for their clients" ON public.editorial_campaigns;
CREATE POLICY "Gestors can manage campaigns for their clients"
ON public.editorial_campaigns FOR ALL
TO authenticated
USING (client_id IN (SELECT get_gestor_client_ids(auth.uid())))
WITH CHECK (client_id IN (SELECT get_gestor_client_ids(auth.uid())));

-- ============ editorial_content_comments ============
DROP POLICY IF EXISTS "Gestors can manage editorial comments for their clients" ON public.editorial_content_comments;
CREATE POLICY "Gestors can manage editorial comments for their clients"
ON public.editorial_content_comments FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.editorial_contents ec
  WHERE ec.id = editorial_content_comments.editorial_content_id
    AND ec.client_id IN (SELECT get_gestor_client_ids(auth.uid()))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.editorial_contents ec
  WHERE ec.id = editorial_content_comments.editorial_content_id
    AND ec.client_id IN (SELECT get_gestor_client_ids(auth.uid()))
));

-- ============ meeting_agendas ============
DROP POLICY IF EXISTS "Gestors can manage agendas for their clients" ON public.meeting_agendas;
CREATE POLICY "Gestors can manage agendas for their clients"
ON public.meeting_agendas FOR ALL
TO authenticated
USING (client_id IN (SELECT get_gestor_client_ids(auth.uid())))
WITH CHECK (client_id IN (SELECT get_gestor_client_ids(auth.uid())));

-- ============ task_comments ============
DROP POLICY IF EXISTS "Gestors can manage task comments for their clients" ON public.task_comments;
CREATE POLICY "Gestors can manage task comments for their clients"
ON public.task_comments FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tasks t
  WHERE t.id = task_comments.task_id
    AND t.client_id IN (SELECT get_gestor_client_ids(auth.uid()))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.tasks t
  WHERE t.id = task_comments.task_id
    AND t.client_id IN (SELECT get_gestor_client_ids(auth.uid()))
));

-- ============ task_attachments ============
DROP POLICY IF EXISTS "Gestors can manage task attachments for their clients" ON public.task_attachments;
CREATE POLICY "Gestors can manage task attachments for their clients"
ON public.task_attachments FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tasks t
  WHERE t.id = task_attachments.task_id
    AND t.client_id IN (SELECT get_gestor_client_ids(auth.uid()))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.tasks t
  WHERE t.id = task_attachments.task_id
    AND t.client_id IN (SELECT get_gestor_client_ids(auth.uid()))
));

-- ============ task_activity_log ============
DROP POLICY IF EXISTS "Gestors can manage task activity for their clients" ON public.task_activity_log;
CREATE POLICY "Gestors can manage task activity for their clients"
ON public.task_activity_log FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tasks t
  WHERE t.id = task_activity_log.task_id
    AND t.client_id IN (SELECT get_gestor_client_ids(auth.uid()))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.tasks t
  WHERE t.id = task_activity_log.task_id
    AND t.client_id IN (SELECT get_gestor_client_ids(auth.uid()))
));

-- ============ ai_generated_contents ============
DROP POLICY IF EXISTS "Gestors can manage AI content for their clients" ON public.ai_generated_contents;
CREATE POLICY "Gestors can manage AI content for their clients"
ON public.ai_generated_contents FOR ALL
TO authenticated
USING (client_id IN (SELECT get_gestor_client_ids(auth.uid())))
WITH CHECK (client_id IN (SELECT get_gestor_client_ids(auth.uid())));

-- ============ client_ai_settings ============
DROP POLICY IF EXISTS "Gestors can manage AI settings for their clients" ON public.client_ai_settings;
CREATE POLICY "Gestors can manage AI settings for their clients"
ON public.client_ai_settings FOR ALL
TO authenticated
USING (client_id IN (SELECT get_gestor_client_ids(auth.uid())))
WITH CHECK (client_id IN (SELECT get_gestor_client_ids(auth.uid())));

-- ============ social_connections ============
DROP POLICY IF EXISTS "Gestors can manage social connections for their clients" ON public.social_connections;
CREATE POLICY "Gestors can manage social connections for their clients"
ON public.social_connections FOR ALL
TO authenticated
USING (client_id IN (SELECT get_gestor_client_ids(auth.uid())))
WITH CHECK (client_id IN (SELECT get_gestor_client_ids(auth.uid())));

-- ============ social_scheduled_posts ============
DROP POLICY IF EXISTS "Gestors can manage social posts for their clients" ON public.social_scheduled_posts;
CREATE POLICY "Gestors can manage social posts for their clients"
ON public.social_scheduled_posts FOR ALL
TO authenticated
USING (client_id IN (SELECT get_gestor_client_ids(auth.uid())))
WITH CHECK (client_id IN (SELECT get_gestor_client_ids(auth.uid())));

-- ============ scheduled_posts ============
DROP POLICY IF EXISTS "Gestors can manage scheduled posts for their clients" ON public.scheduled_posts;
CREATE POLICY "Gestors can manage scheduled posts for their clients"
ON public.scheduled_posts FOR ALL
TO authenticated
USING (client_id IN (SELECT get_gestor_client_ids(auth.uid())))
WITH CHECK (client_id IN (SELECT get_gestor_client_ids(auth.uid())));

-- ============ meta_connections ============
DROP POLICY IF EXISTS "Gestors can manage meta connections for their clients" ON public.meta_connections;
CREATE POLICY "Gestors can manage meta connections for their clients"
ON public.meta_connections FOR ALL
TO authenticated
USING (client_id IN (SELECT get_gestor_client_ids(auth.uid())))
WITH CHECK (client_id IN (SELECT get_gestor_client_ids(auth.uid())));

-- ============ chat_sessions ============
DROP POLICY IF EXISTS "Gestors can manage chat sessions for their clients" ON public.chat_sessions;
CREATE POLICY "Gestors can manage chat sessions for their clients"
ON public.chat_sessions FOR ALL
TO authenticated
USING (client_id IN (SELECT get_gestor_client_ids(auth.uid())))
WITH CHECK (client_id IN (SELECT get_gestor_client_ids(auth.uid())));

-- ============ documents_knowledge ============
DROP POLICY IF EXISTS "Gestors can manage documents for their clients" ON public.documents_knowledge;
CREATE POLICY "Gestors can manage documents for their clients"
ON public.documents_knowledge FOR ALL
TO authenticated
USING (client_id IN (SELECT get_gestor_client_ids(auth.uid())))
WITH CHECK (client_id IN (SELECT get_gestor_client_ids(auth.uid())));
