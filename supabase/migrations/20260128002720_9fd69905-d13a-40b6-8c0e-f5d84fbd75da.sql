
-- Add archived_at column to tasks for auto-archiving
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone DEFAULT NULL;

-- Create task_comments table
CREATE TABLE public.task_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create task_attachments table
CREATE TABLE public.task_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create task_activity_log table
CREATE TABLE public.task_activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL, -- 'created', 'updated', 'status_changed', 'comment_added', 'attachment_added', 'attachment_removed', 'archived', 'unarchived'
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS for task_comments: Admins can manage all, clients can view/create on their tasks
CREATE POLICY "Admins can manage all task comments"
  ON public.task_comments FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view comments on their tasks"
  ON public.task_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND t.client_id = get_user_client_id(auth.uid())
    )
  );

CREATE POLICY "Clients can create comments on their tasks"
  ON public.task_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND t.client_id = get_user_client_id(auth.uid())
    )
  );

-- RLS for task_attachments: Same pattern
CREATE POLICY "Admins can manage all task attachments"
  ON public.task_attachments FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view attachments on their tasks"
  ON public.task_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND t.client_id = get_user_client_id(auth.uid())
    )
  );

CREATE POLICY "Clients can create attachments on their tasks"
  ON public.task_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND t.client_id = get_user_client_id(auth.uid())
    )
  );

-- RLS for task_activity_log: Read-only for clients
CREATE POLICY "Admins can manage all task activity logs"
  ON public.task_activity_log FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view activity logs on their tasks"
  ON public.task_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND t.client_id = get_user_client_id(auth.uid())
    )
  );

CREATE POLICY "Authenticated users can insert activity logs"
  ON public.task_activity_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Update tasks RLS to allow clients to update (for comments, etc.)
DROP POLICY IF EXISTS "Clients can view their own tasks" ON public.tasks;

CREATE POLICY "Clients can view their own tasks"
  ON public.tasks FOR SELECT
  USING (client_id = get_user_client_id(auth.uid()) OR has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_log_task_id ON public.task_activity_log(task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_archived_at ON public.tasks(archived_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status_completed ON public.tasks(status) WHERE status = 'completed';

-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for task-attachments bucket
CREATE POLICY "Authenticated users can upload task attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view task attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'task-attachments' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete task attachments"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'task-attachments' AND has_role(auth.uid(), 'admin'));

-- Trigger to update updated_at on comments
CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
