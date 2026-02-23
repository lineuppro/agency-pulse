import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export type ReactionType = 'like' | 'heart' | 'celebrate' | 'thinking';

export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  parent_comment_id: string | null;
  user_name?: string;
  reactions: CommentReaction[];
  replies: TaskComment[];
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  user_name?: string;
}

export interface TaskActivityLog {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: any;
  created_at: string;
  user_name?: string;
}

export function useTaskDetailsV2(taskId: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [activityLog, setActivityLog] = useState<TaskActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTaskDetails = useCallback(async () => {
    if (!taskId) return;
    
    setLoading(true);
    try {
      const [commentsRes, attachmentsRes, activityRes, reactionsRes] = await Promise.all([
        supabase
          .from('task_comments')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: true }),
        supabase
          .from('task_attachments')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: false }),
        supabase
          .from('task_activity_log')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: false }),
        supabase
          .from('task_comment_reactions')
          .select('*'),
      ]);

      if (commentsRes.error) throw commentsRes.error;
      if (attachmentsRes.error) throw attachmentsRes.error;
      if (activityRes.error) throw activityRes.error;

      // Fetch user names for all unique user_ids
      const userIds = new Set<string>();
      commentsRes.data?.forEach(c => userIds.add(c.user_id));
      attachmentsRes.data?.forEach(a => userIds.add(a.user_id));
      activityRes.data?.forEach(a => userIds.add(a.user_id));

      const profilesRes = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', Array.from(userIds));

      const userMap = new Map<string, string>();
      profilesRes.data?.forEach(p => {
        userMap.set(p.user_id, p.full_name || p.email.split('@')[0]);
      });

      // Build reactions map
      const reactionsMap = new Map<string, CommentReaction[]>();
      (reactionsRes.data || []).forEach(r => {
        const existing = reactionsMap.get(r.comment_id) || [];
        existing.push(r as CommentReaction);
        reactionsMap.set(r.comment_id, existing);
      });

      // Build comments with reactions and nested replies
      const allComments = (commentsRes.data || []).map(c => ({
        ...c,
        user_name: userMap.get(c.user_id) || 'Usuário',
        reactions: reactionsMap.get(c.id) || [],
        replies: [] as TaskComment[],
      }));

      // Separate root comments and replies
      const rootComments: TaskComment[] = [];
      const repliesMap = new Map<string, TaskComment[]>();

      allComments.forEach(comment => {
        if (comment.parent_comment_id) {
          const existing = repliesMap.get(comment.parent_comment_id) || [];
          existing.push(comment);
          repliesMap.set(comment.parent_comment_id, existing);
        } else {
          rootComments.push(comment);
        }
      });

      // Attach replies to parent comments
      rootComments.forEach(comment => {
        comment.replies = repliesMap.get(comment.id) || [];
      });

      setComments(rootComments);
      setAttachments(
        (attachmentsRes.data || []).map(a => ({
          ...a,
          user_name: userMap.get(a.user_id) || 'Usuário',
        }))
      );
      setActivityLog(
        (activityRes.data || []).map(a => ({
          ...a,
          user_name: userMap.get(a.user_id) || 'Usuário',
        }))
      );
    } catch (error) {
      console.error('Error fetching task details:', error);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTaskDetails();
  }, [fetchTaskDetails]);

  const addComment = async (content: string, parentCommentId?: string) => {
    if (!taskId || !user) return;

    try {
      const { error } = await supabase.from('task_comments').insert([{
        task_id: taskId,
        user_id: user.id,
        content,
        parent_comment_id: parentCommentId || null,
      }]);

      if (error) throw error;

      // Log activity
      await supabase.from('task_activity_log').insert([{
        task_id: taskId,
        user_id: user.id,
        action: parentCommentId ? 'reply_added' : 'comment_added',
        details: { content_preview: content.substring(0, 100) },
      }]);

      toast({ title: parentCommentId ? 'Resposta adicionada!' : 'Comentário adicionado!' });
      fetchTaskDetails();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({ title: 'Erro ao adicionar comentário', variant: 'destructive' });
    }
  };

  const toggleReaction = async (commentId: string, reactionType: ReactionType) => {
    if (!user) return;

    try {
      // Check if reaction exists
      const { data: existing } = await supabase
        .from('task_comment_reactions')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .eq('reaction_type', reactionType)
        .maybeSingle();

      if (existing) {
        // Remove reaction
        await supabase
          .from('task_comment_reactions')
          .delete()
          .eq('id', existing.id);
      } else {
        // Add reaction
        await supabase.from('task_comment_reactions').insert([{
          comment_id: commentId,
          user_id: user.id,
          reaction_type: reactionType,
        }]);
      }

      fetchTaskDetails();
    } catch (error) {
      console.error('Error toggling reaction:', error);
      toast({ title: 'Erro ao reagir', variant: 'destructive' });
    }
  };

  const uploadAttachment = async (file: File) => {
    if (!taskId || !user) return;

    try {
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${taskId}/${Date.now()}_${sanitizedFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('task_attachments').insert([{
        task_id: taskId,
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
      }]);

      if (dbError) {
        await supabase.storage.from('task-attachments').remove([filePath]);
        throw dbError;
      }

      await supabase.from('task_activity_log').insert([{
        task_id: taskId,
        user_id: user.id,
        action: 'attachment_added',
        details: { file_name: file.name },
      }]);

      toast({ title: 'Arquivo anexado!' });
      fetchTaskDetails();
    } catch (error: unknown) {
      console.error('Error uploading attachment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({ 
        title: 'Erro ao anexar arquivo', 
        description: errorMessage,
        variant: 'destructive' 
      });
    }
  };

  const deleteAttachment = async (attachmentId: string, filePath: string) => {
    try {
      await supabase.storage.from('task-attachments').remove([filePath]);
      const { error } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) throw error;

      if (taskId && user) {
        await supabase.from('task_activity_log').insert([{
          task_id: taskId,
          user_id: user.id,
          action: 'attachment_removed',
          details: {},
        }]);
      }

      toast({ title: 'Arquivo removido!' });
      fetchTaskDetails();
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast({ title: 'Erro ao remover arquivo', variant: 'destructive' });
    }
  };

  const getAttachmentUrl = async (filePath: string) => {
    const { data } = await supabase.storage
      .from('task-attachments')
      .createSignedUrl(filePath, 3600);
    return data?.signedUrl;
  };

  const updateComment = async (commentId: string, content: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('task_comments')
        .update({ content })
        .eq('id', commentId)
        .eq('user_id', user.id);

      if (error) throw error;
      toast({ title: 'Comentário atualizado!' });
      fetchTaskDetails();
    } catch (error) {
      console.error('Error updating comment:', error);
      toast({ title: 'Erro ao atualizar comentário', variant: 'destructive' });
    }
  };

  return {
    comments,
    attachments,
    activityLog,
    loading,
    addComment,
    updateComment,
    toggleReaction,
    uploadAttachment,
    deleteAttachment,
    getAttachmentUrl,
    refetch: fetchTaskDetails,
    currentUserId: user?.id,
  };
}
