import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addDays, differenceInDays, format } from 'date-fns';
import type { ContentType } from './useEditorialCalendar';

export interface EditorialCampaign {
  id: string;
  client_id: string;
  name: string;
  start_date: string;
  end_date: string;
  notes: string | null;
  instagram_count: number;
  facebook_count: number;
  blog_count: number;
  email_count: number;
  google_ads_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignData {
  client_id: string;
  name: string;
  start_date: string;
  end_date: string;
  notes?: string;
  instagram_count: number;
  facebook_count: number;
  blog_count: number;
  email_count: number;
  google_ads_count: number;
}

interface ContentToCreate {
  client_id: string;
  campaign_id: string;
  title: string;
  content_type: ContentType;
  scheduled_date: string;
  status: 'draft';
  created_by: string;
}

export function useEditorialCampaigns(clientId?: string) {
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading, error } = useQuery({
    queryKey: ['editorial-campaigns', clientId],
    queryFn: async () => {
      let query = supabase
        .from('editorial_campaigns')
        .select('*')
        .order('start_date', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching campaigns:', error);
        throw error;
      }

      return data as EditorialCampaign[];
    },
  });

  const createCampaign = useMutation({
    mutationFn: async (data: CreateCampaignData) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      // Create the campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('editorial_campaigns')
        .insert({
          ...data,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (campaignError) {
        console.error('Error creating campaign:', campaignError);
        throw campaignError;
      }

      // Generate content items
      const contentsToCreate: ContentToCreate[] = [];
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      const totalDays = differenceInDays(endDate, startDate) + 1;

      const contentTypes: { type: ContentType; count: number; label: string }[] = [
        { type: 'instagram', count: data.instagram_count, label: 'Instagram' },
        { type: 'facebook', count: data.facebook_count, label: 'Facebook' },
        { type: 'blog', count: data.blog_count, label: 'Blog' },
        { type: 'email', count: data.email_count, label: 'Email Marketing' },
        { type: 'google_ads', count: data.google_ads_count, label: 'Google Ads' },
      ];

      for (const { type, count, label } of contentTypes) {
        if (count > 0) {
          const interval = Math.floor(totalDays / count);
          
          for (let i = 0; i < count; i++) {
            const daysToAdd = Math.min(i * interval, totalDays - 1);
            const scheduledDate = addDays(startDate, daysToAdd);
            
            contentsToCreate.push({
              client_id: data.client_id,
              campaign_id: campaign.id,
              title: `${label} ${i + 1}/${count} - ${data.name}`,
              content_type: type,
              scheduled_date: format(scheduledDate, 'yyyy-MM-dd'),
              status: 'draft',
              created_by: userData.user.id,
            });
          }
        }
      }

      // Insert all content items
      if (contentsToCreate.length > 0) {
        const { error: contentsError } = await supabase
          .from('editorial_contents')
          .insert(contentsToCreate);

        if (contentsError) {
          console.error('Error creating campaign contents:', contentsError);
          // Don't throw, campaign was already created
          toast.error('Campanha criada, mas houve erro ao criar alguns conteúdos');
        }
      }

      return campaign;
    },
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: ['editorial-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['editorial-contents'] });
      toast.success(`Campanha "${campaign.name}" criada com sucesso!`);
    },
    onError: (error) => {
      console.error('Error creating campaign:', error);
      toast.error('Erro ao criar campanha');
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('editorial_campaigns')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting campaign:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editorial-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['editorial-contents'] });
      toast.success('Campanha excluída com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting campaign:', error);
      toast.error('Erro ao excluir campanha');
    },
  });

  return {
    campaigns,
    isLoading,
    error,
    createCampaign,
    deleteCampaign,
  };
}
