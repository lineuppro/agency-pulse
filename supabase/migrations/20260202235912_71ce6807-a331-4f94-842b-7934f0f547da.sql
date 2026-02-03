-- Add parent_comment_id for threaded replies
ALTER TABLE public.task_comments 
ADD COLUMN parent_comment_id UUID REFERENCES public.task_comments(id) ON DELETE CASCADE;

-- Create index for faster reply lookups
CREATE INDEX idx_task_comments_parent ON public.task_comments(parent_comment_id);

-- Create table for comment reactions
CREATE TABLE public.task_comment_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.task_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'heart', 'celebrate', 'thinking')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id, reaction_type)
);

-- Enable RLS
ALTER TABLE public.task_comment_reactions ENABLE ROW LEVEL SECURITY;

-- Policies for reactions - same access pattern as comments
CREATE POLICY "Admins can manage all reactions"
ON public.task_comment_reactions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view reactions on their client tasks"
ON public.task_comment_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.task_comments tc
    JOIN public.tasks t ON t.id = tc.task_id
    WHERE tc.id = comment_id
    AND t.client_id = public.get_user_client_id(auth.uid())
  )
);

CREATE POLICY "Users can add reactions to their client task comments"
ON public.task_comment_reactions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.task_comments tc
    JOIN public.tasks t ON t.id = tc.task_id
    WHERE tc.id = comment_id
    AND t.client_id = public.get_user_client_id(auth.uid())
  )
);

CREATE POLICY "Users can remove their own reactions"
ON public.task_comment_reactions
FOR DELETE
USING (auth.uid() = user_id);