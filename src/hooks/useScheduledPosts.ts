import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type SocialPlatform = Database['public']['Enums']['social_platform'];
type SocialPostType = Database['public']['Enums']['social_post_type'];
type SocialPostStatus = Database['public']['Enums']['social_post_status'];

export interface ScheduledPost {
  id: string;
  client_id: string;
  editorial_content_id: string | null;
  platform: SocialPlatform;
  post_type: SocialPostType;
  media_urls: string[];
  caption: string | null;
  hashtags: string[] | null;
  scheduled_at: string;
  published_at: string | null;
  status: SocialPostStatus;
  platform_post_id: string | null;
  error_message: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateScheduledPostInput {
  client_id: string;
  editorial_content_id?: string;
  platform: SocialPlatform;
  post_type?: SocialPostType;
  media_urls: string[];
  caption?: string;
  hashtags?: string[];
  scheduled_at: string;
}

export interface UpdateScheduledPostInput {
  id: string;
  caption?: string;
  hashtags?: string[];
  scheduled_at?: string;
  media_urls?: string[];
  status?: SocialPostStatus;
}

export function useScheduledPosts(editorialContentId?: string | null, clientId?: string) {
  const queryClient = useQueryClient();

  // Fetch scheduled posts for a specific editorial content or client
  const { data: scheduledPosts = [], isLoading, refetch } = useQuery({
    queryKey: ['scheduled-posts', editorialContentId, clientId],
    queryFn: async () => {
      let query = supabase
        .from('social_scheduled_posts')
        .select('*')
        .order('scheduled_at', { ascending: true });

      if (editorialContentId) {
        query = query.eq('editorial_content_id', editorialContentId);
      } else if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(post => ({
        ...post,
        media_urls: (post.media_urls as unknown as string[]) || [],
      })) as ScheduledPost[];
    },
    enabled: !!(editorialContentId || clientId),
  });

  // Create a new scheduled post
  const createScheduledPost = useMutation({
    mutationFn: async (input: CreateScheduledPostInput) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('social_scheduled_posts')
        .insert({
          client_id: input.client_id,
          editorial_content_id: input.editorial_content_id,
          platform: input.platform,
          post_type: input.post_type || 'image',
          media_urls: input.media_urls,
          caption: input.caption,
          hashtags: input.hashtags,
          scheduled_at: input.scheduled_at,
          status: 'scheduled',
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-scheduled-posts'] });
      toast.success('Post agendado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating scheduled post:', error);
      toast.error('Erro ao agendar post');
    },
  });

  // Update a scheduled post
  const updateScheduledPost = useMutation({
    mutationFn: async (input: UpdateScheduledPostInput) => {
      const { id, ...updates } = input;
      const { data, error } = await supabase
        .from('social_scheduled_posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
      toast.success('Agendamento atualizado!');
    },
    onError: (error) => {
      console.error('Error updating scheduled post:', error);
      toast.error('Erro ao atualizar agendamento');
    },
  });

  // Cancel a scheduled post (soft delete)
  const deleteScheduledPost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('social_scheduled_posts')
        .update({ status: 'cancelled' })
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-scheduled-posts'] });
      toast.success('Agendamento cancelado!');
    },
    onError: (error) => {
      console.error('Error cancelling scheduled post:', error);
      toast.error('Erro ao cancelar agendamento');
    },
  });

  // Hard delete a scheduled post
  const hardDeleteScheduledPost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('social_scheduled_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-scheduled-posts'] });
      toast.success('Post excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting scheduled post:', error);
      toast.error('Erro ao excluir post');
    },
  });

  // Publish a post immediately
  const publishNow = useMutation({
    mutationFn: async (postId: string) => {
      const { data, error } = await supabase.functions.invoke('social-publish', {
        body: { postId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
      toast.success('Post publicado com sucesso!');
    },
    onError: (error) => {
      console.error('Error publishing post:', error);
      toast.error('Erro ao publicar post');
    },
  });

  return {
    scheduledPosts,
    isLoading,
    refetch,
    createScheduledPost,
    updateScheduledPost,
    deleteScheduledPost,
    hardDeleteScheduledPost,
    publishNow,
  };
}
