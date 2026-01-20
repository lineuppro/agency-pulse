import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ContentType = 'instagram' | 'facebook' | 'blog' | 'email' | 'google_ads' | 'other';
export type ContentStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'published';

export interface EditorialContent {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  content_type: ContentType;
  scheduled_date: string;
  status: ContentStatus;
  campaign_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateContentData {
  client_id: string;
  title: string;
  description?: string;
  content_type: ContentType;
  scheduled_date: string;
  status?: ContentStatus;
}

export interface UpdateContentData {
  id: string;
  title?: string;
  description?: string;
  content_type?: ContentType;
  scheduled_date?: string;
  status?: ContentStatus;
}

export function useEditorialCalendar(clientId?: string, startDate?: Date, endDate?: Date, campaignId?: string) {
  const queryClient = useQueryClient();

  const { data: contents = [], isLoading, error, refetch } = useQuery({
    queryKey: ['editorial-contents', clientId, startDate?.toISOString(), endDate?.toISOString(), campaignId],
    queryFn: async () => {
      let query = supabase
        .from('editorial_contents')
        .select('*')
        .order('scheduled_date', { ascending: true });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      if (startDate) {
        query = query.gte('scheduled_date', startDate.toISOString().split('T')[0]);
      }

      if (endDate) {
        query = query.lte('scheduled_date', endDate.toISOString().split('T')[0]);
      }

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching editorial contents:', error);
        throw error;
      }

      return data as EditorialContent[];
    },
    enabled: true,
  });

  const createContent = useMutation({
    mutationFn: async (data: CreateContentData) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: result, error } = await supabase
        .from('editorial_contents')
        .insert({
          ...data,
          created_by: userData.user.id,
          status: data.status || 'draft',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating content:', error);
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editorial-contents'] });
      toast.success('Conteúdo criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating content:', error);
      toast.error('Erro ao criar conteúdo');
    },
  });

  const updateContent = useMutation({
    mutationFn: async (data: UpdateContentData) => {
      const { id, ...updateData } = data;

      const { data: result, error } = await supabase
        .from('editorial_contents')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating content:', error);
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editorial-contents'] });
      toast.success('Conteúdo atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating content:', error);
      toast.error('Erro ao atualizar conteúdo');
    },
  });

  const deleteContent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('editorial_contents')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting content:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editorial-contents'] });
      toast.success('Conteúdo excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting content:', error);
      toast.error('Erro ao excluir conteúdo');
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ContentStatus }) => {
      const { data: result, error } = await supabase
        .from('editorial_contents')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating status:', error);
        throw error;
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['editorial-contents'] });
      const statusMessages: Record<ContentStatus, string> = {
        draft: 'Conteúdo movido para rascunho',
        pending_approval: 'Conteúdo enviado para aprovação',
        approved: 'Conteúdo aprovado!',
        rejected: 'Conteúdo rejeitado',
        published: 'Conteúdo publicado!',
      };
      toast.success(statusMessages[variables.status]);
    },
    onError: (error) => {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    },
  });

  return {
    contents,
    isLoading,
    error,
    refetch,
    createContent,
    updateContent,
    deleteContent,
    updateStatus,
  };
}

export function getContentTypeLabel(type: ContentType): string {
  const labels: Record<ContentType, string> = {
    instagram: 'Instagram',
    facebook: 'Facebook',
    blog: 'Blog',
    email: 'Email Marketing',
    google_ads: 'Google Ads',
    other: 'Outros',
  };
  return labels[type];
}

export function getContentStatusLabel(status: ContentStatus): string {
  const labels: Record<ContentStatus, string> = {
    draft: 'Rascunho',
    pending_approval: 'Aguardando Aprovação',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    published: 'Publicado',
  };
  return labels[status];
}
