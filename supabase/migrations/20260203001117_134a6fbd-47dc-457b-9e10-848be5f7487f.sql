-- Add subtitle column for social media posts
ALTER TABLE public.ai_generated_contents 
ADD COLUMN IF NOT EXISTS subtitle text;

-- Create editorial content comments table
CREATE TABLE public.editorial_content_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  editorial_content_id uuid NOT NULL REFERENCES public.editorial_contents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES public.editorial_content_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create editorial content reactions table
CREATE TABLE public.editorial_content_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.editorial_content_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_reaction_type CHECK (reaction_type IN ('like', 'heart', 'celebrate', 'thinking')),
  CONSTRAINT unique_user_reaction UNIQUE (comment_id, user_id, reaction_type)
);

-- Indexes for performance
CREATE INDEX idx_editorial_comments_content_id ON public.editorial_content_comments(editorial_content_id);
CREATE INDEX idx_editorial_comments_parent_id ON public.editorial_content_comments(parent_comment_id);
CREATE INDEX idx_editorial_reactions_comment_id ON public.editorial_content_reactions(comment_id);

-- Enable RLS
ALTER TABLE public.editorial_content_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_content_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for comments
CREATE POLICY "Admins can manage all editorial comments"
ON public.editorial_content_comments
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients can view comments on their contents"
ON public.editorial_content_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.editorial_contents ec
    WHERE ec.id = editorial_content_comments.editorial_content_id
    AND ec.client_id = public.get_user_client_id(auth.uid())
  )
);

CREATE POLICY "Clients can create comments on their contents"
ON public.editorial_content_comments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.editorial_contents ec
    WHERE ec.id = editorial_content_comments.editorial_content_id
    AND ec.client_id = public.get_user_client_id(auth.uid())
  )
);

-- RLS policies for reactions
CREATE POLICY "Admins can manage all editorial reactions"
ON public.editorial_content_reactions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view reactions on their client contents"
ON public.editorial_content_reactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.editorial_content_comments ecc
    JOIN public.editorial_contents ec ON ec.id = ecc.editorial_content_id
    WHERE ecc.id = editorial_content_reactions.comment_id
    AND ec.client_id = public.get_user_client_id(auth.uid())
  )
);

CREATE POLICY "Users can add reactions to their client content comments"
ON public.editorial_content_reactions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.editorial_content_comments ecc
    JOIN public.editorial_contents ec ON ec.id = ecc.editorial_content_id
    WHERE ecc.id = editorial_content_reactions.comment_id
    AND ec.client_id = public.get_user_client_id(auth.uid())
  )
);

CREATE POLICY "Users can remove their own reactions"
ON public.editorial_content_reactions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger for updated_at on comments
CREATE TRIGGER update_editorial_content_comments_updated_at
BEFORE UPDATE ON public.editorial_content_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();