import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ClientAISettings {
  id: string;
  client_id: string;
  brand_voice: string | null;
  target_audience: string | null;
  brand_keywords: string[] | null;
  content_guidelines: string | null;
  default_word_count: number;
  custom_prompt: string | null;
  created_at: string;
  updated_at: string;
}

export function useClientAISettings(clientId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['client-ai-settings', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      
      const { data, error } = await supabase
        .from('client_ai_settings')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;
      return data as ClientAISettings | null;
    },
    enabled: !!clientId,
  });

  const upsertSettings = useMutation({
    mutationFn: async (data: Partial<ClientAISettings> & { client_id: string }) => {
      const { error } = await supabase
        .from('client_ai_settings')
        .upsert(data, { onConflict: 'client_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-ai-settings', clientId] });
      toast({ title: 'Configurações de IA salvas!' });
    },
    onError: (error) => {
      console.error('Error saving AI settings:', error);
      toast({ title: 'Erro ao salvar configurações', variant: 'destructive' });
    },
  });

  return {
    settings,
    isLoading,
    upsertSettings,
  };
}
