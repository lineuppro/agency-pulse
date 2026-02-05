import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type MetaPlatform = 'instagram' | 'facebook' | 'both';
export type MetaPostType = 'image' | 'video' | 'carousel' | 'reel' | 'story';
export type ScheduledPostStatus = 'scheduled' | 'publishing' | 'published' | 'failed';

export interface ScheduledPost {
  id: string;
  client_id: string;
  editorial_content_id: string | null;
  platform: MetaPlatform;
  post_type: MetaPostType;
  media_urls: string[];
  caption: string | null;
  hashtags: string[] | null;
  scheduled_at: string;
  published_at: string | null;
  status: ScheduledPostStatus;
  meta_post_id: string | null;
  error_message: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduledPostInput {
  client_id: string;
  editorial_content_id?: string;
  platform: MetaPlatform;
  post_type: MetaPostType;
  media_urls: string[];
  caption?: string;
  hashtags?: string[];
  scheduled_at: string;
}

export function useScheduledPosts(clientId: string | null) {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchPosts = async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_posts')
        .select('*')
        .eq('client_id', clientId)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      
      // Cast the data to handle the enum types
      setPosts((data || []) as unknown as ScheduledPost[]);
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [clientId]);

  const createPost = async (input: CreateScheduledPostInput) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('scheduled_posts')
        .insert({
          ...input,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Post agendado!',
        description: `Post agendado para ${new Date(input.scheduled_at).toLocaleString('pt-BR')}`,
      });

      await fetchPosts();
      return data as unknown as ScheduledPost;
    } catch (error: any) {
      console.error('Error creating scheduled post:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao agendar post',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updatePost = async (postId: string, updates: Partial<CreateScheduledPostInput>) => {
    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .update(updates)
        .eq('id', postId);

      if (error) throw error;

      toast({
        title: 'Post atualizado',
        description: 'Agendamento atualizado com sucesso',
      });

      await fetchPosts();
      return true;
    } catch (error: any) {
      console.error('Error updating scheduled post:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao atualizar post',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      toast({
        title: 'Post removido',
        description: 'Agendamento removido com sucesso',
      });

      await fetchPosts();
      return true;
    } catch (error: any) {
      console.error('Error deleting scheduled post:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao remover post',
        variant: 'destructive',
      });
      return false;
    }
  };

  const publishNow = async (postId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('meta-publish', {
        body: { scheduledPostId: postId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Post publicado!',
        description: 'O post foi publicado com sucesso',
      });

      await fetchPosts();
      return true;
    } catch (error: any) {
      console.error('Error publishing post:', error);
      toast({
        title: 'Erro ao publicar',
        description: error.message || 'Falha ao publicar post',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    posts,
    loading,
    createPost,
    updatePost,
    deletePost,
    publishNow,
    refetch: fetchPosts,
  };
}
