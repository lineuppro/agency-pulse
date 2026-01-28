import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_name?: string;
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

export function useTaskDetails(taskId: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [activityLog, setActivityLog] = useState<TaskActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTaskDetails = async () => {
    if (!taskId) return;
    
    setLoading(true);
    try {
      const [commentsRes, attachmentsRes, activityRes] = await Promise.all([
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

      setComments(
        (commentsRes.data || []).map(c => ({
          ...c,
          user_name: userMap.get(c.user_id) || 'Usuário',
        }))
      );
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
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  const addComment = async (content: string) => {
    if (!taskId || !user) return;

    try {
      const { error } = await supabase.from('task_comments').insert([{
        task_id: taskId,
        user_id: user.id,
        content,
      }]);

      if (error) throw error;

      // Log activity
      await supabase.from('task_activity_log').insert([{
        task_id: taskId,
        user_id: user.id,
        action: 'comment_added',
        details: { content_preview: content.substring(0, 100) },
      }]);

      toast({ title: 'Comentário adicionado!' });
      fetchTaskDetails();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({ title: 'Erro ao adicionar comentário', variant: 'destructive' });
    }
  };

  const uploadAttachment = async (file: File) => {
    if (!taskId || !user) return;

    try {
      // Sanitize file name and create a safe path
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${taskId}/${Date.now()}_${sanitizedFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      const { error: dbError } = await supabase.from('task_attachments').insert([{
        task_id: taskId,
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
      }]);

      if (dbError) {
        console.error('Database insert error:', dbError);
        // Try to clean up the uploaded file
        await supabase.storage.from('task-attachments').remove([filePath]);
        throw dbError;
      }

      // Log activity
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
      // Delete from storage
      await supabase.storage.from('task-attachments').remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) throw error;

      // Log activity
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
      .createSignedUrl(filePath, 3600); // 1 hour
    return data?.signedUrl;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logActivity = async (action: string, details: any = {}) => {
    if (!taskId || !user) return;

    try {
      await supabase.from('task_activity_log').insert([{
        task_id: taskId,
        user_id: user.id,
        action,
        details,
      }]);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  return {
    comments,
    attachments,
    activityLog,
    loading,
    addComment,
    uploadAttachment,
    deleteAttachment,
    getAttachmentUrl,
    logActivity,
    refetch: fetchTaskDetails,
  };
}
