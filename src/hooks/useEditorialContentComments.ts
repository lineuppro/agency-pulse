import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface EditorialContentComment {
  id: string;
  editorial_content_id: string;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
  replies?: EditorialContentComment[];
  reactions?: CommentReaction[];
}

export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  reaction_type: 'like' | 'heart' | 'celebrate' | 'thinking';
  created_at: string;
}

export type ReactionType = 'like' | 'heart' | 'celebrate' | 'thinking';

export function useEditorialContentComments(editorialContentId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const queryKey = ['editorial-content-comments', editorialContentId];

  // Fetch comments with user profiles and reactions
  const { data: comments = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!editorialContentId) return [];

      // Fetch all comments for this content
      const { data: commentsData, error: commentsError } = await supabase
        .from('editorial_content_comments')
        .select('*')
        .eq('editorial_content_id', editorialContentId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      // Get unique user IDs
      const userIds = [...new Set(commentsData.map(c => c.user_id))];

      // Fetch profiles for all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Fetch all reactions for these comments
      const commentIds = commentsData.map(c => c.id);
      const { data: reactionsData } = await supabase
        .from('editorial_content_reactions')
        .select('*')
        .in('comment_id', commentIds);

      const reactionsMap = new Map<string, CommentReaction[]>();
      reactionsData?.forEach(r => {
        const existing = reactionsMap.get(r.comment_id) || [];
        existing.push(r as CommentReaction);
        reactionsMap.set(r.comment_id, existing);
      });

      // Build comment tree
      const commentsWithMeta: EditorialContentComment[] = commentsData.map(c => {
        const profile = profileMap.get(c.user_id);
        return {
          ...c,
          user_name: profile?.full_name || profile?.email?.split('@')[0] || 'Usuário',
          user_email: profile?.email,
          reactions: reactionsMap.get(c.id) || [],
          replies: [],
        };
      });

      // Organize into tree (top-level and replies)
      const topLevelComments: EditorialContentComment[] = [];
      const repliesMap = new Map<string, EditorialContentComment[]>();

      commentsWithMeta.forEach(comment => {
        if (comment.parent_comment_id) {
          const existing = repliesMap.get(comment.parent_comment_id) || [];
          existing.push(comment);
          repliesMap.set(comment.parent_comment_id, existing);
        } else {
          topLevelComments.push(comment);
        }
      });

      // Attach replies to parent comments
      topLevelComments.forEach(comment => {
        comment.replies = repliesMap.get(comment.id) || [];
      });

      return topLevelComments;
    },
    enabled: !!editorialContentId,
  });

  // Add comment
  const addComment = useMutation({
    mutationFn: async ({ 
      content, 
      parentCommentId 
    }: { 
      content: string; 
      parentCommentId?: string;
    }) => {
      if (!editorialContentId || !user) throw new Error('Missing required data');

      const { data, error } = await supabase
        .from('editorial_content_comments')
        .insert({
          editorial_content_id: editorialContentId,
          user_id: user.id,
          content,
          parent_comment_id: parentCommentId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: 'Comentário adicionado!' });
    },
    onError: (error) => {
      console.error('Error adding comment:', error);
      toast({ title: 'Erro ao adicionar comentário', variant: 'destructive' });
    },
  });

  // Toggle reaction
  const toggleReaction = useMutation({
    mutationFn: async ({ 
      commentId, 
      reactionType 
    }: { 
      commentId: string; 
      reactionType: ReactionType;
    }) => {
      if (!user) throw new Error('User not authenticated');

      // Check if reaction exists
      const { data: existing } = await supabase
        .from('editorial_content_reactions')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .eq('reaction_type', reactionType)
        .maybeSingle();

      if (existing) {
        // Remove reaction
        const { error } = await supabase
          .from('editorial_content_reactions')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Add reaction
        const { error } = await supabase
          .from('editorial_content_reactions')
          .insert({
            comment_id: commentId,
            user_id: user.id,
            reaction_type: reactionType,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error) => {
      console.error('Error toggling reaction:', error);
      toast({ title: 'Erro ao reagir', variant: 'destructive' });
    },
  });

  return {
    comments,
    isLoading,
    addComment,
    toggleReaction,
    currentUserId: user?.id,
  };
}
