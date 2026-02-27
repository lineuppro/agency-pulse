import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MetaAdsMetrics {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  conversions: number;
  costPerResult: number;
  roas: number;
}

export interface MetaAdsCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  roas: number;
}

export interface MetaAdsConnection {
  id: string;
  client_id: string;
  access_token: string;
  ad_account_id: string;
  ad_account_name: string | null;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export type MetaDateRange = 'today' | 'yesterday' | 'last_7d' | 'last_30d' | 'this_month';

// Hook for fetching Meta Ads connection for a client
export function useMetaAdsConnection(clientId: string | null) {
  return useQuery({
    queryKey: ['meta-ads-connection', clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const { data, error } = await supabase
        .from('client_meta_ads')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;
      return data as MetaAdsConnection | null;
    },
    enabled: !!clientId,
  });
}

// Hook for fetching Meta Ads metrics
export function useMetaAdsMetrics() {
  const [metrics, setMetrics] = useState<MetaAdsMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<MetaAdsCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMetrics = async (clientId: string, dateRange: MetaDateRange = 'last_30d') => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const { data, error: fnError } = await supabase.functions.invoke('meta-ads-metrics', {
        body: { clientId, dateRange },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (fnError) {
        const errorDetails = fnError.message || 'Unknown error';
        console.error('Meta Ads edge function error:', fnError);
        throw new Error(errorDetails);
      }

      if (data?.error) {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error;
        console.error('Meta Ads API returned error:', data);
        throw new Error(errorMsg);
      }

      setMetrics(data.metrics);
      setCampaigns(data.campaigns || []);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar métricas do Meta Ads';
      console.error('useMetaAdsMetrics error:', err);
      setError(message);
      toast({
        title: 'Erro ao buscar métricas',
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    metrics,
    campaigns,
    loading,
    error,
    fetchMetrics,
  };
}

// Hook for managing Meta Ads connections
// Hook for exchanging/refreshing Meta tokens
export function useMetaTokenRefresh() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const exchangeToken = async (accessToken: string, clientId?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sessão expirada');

      const { data, error } = await supabase.functions.invoke('meta-token-refresh', {
        body: { action: 'exchange', accessToken, clientId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.exchanged) {
        queryClient.invalidateQueries({ queryKey: ['meta-ads-connection'] });
      }

      return data;
    } catch (err) {
      console.error('Token exchange error:', err);
      return null;
    }
  };

  const refreshExpiring = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sessão expirada');

      const { data, error } = await supabase.functions.invoke('meta-token-refresh', {
        body: { action: 'refresh' },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.refreshed > 0) {
        toast({
          title: 'Tokens renovados',
          description: `${data.refreshed} de ${data.total} tokens foram renovados com sucesso.`,
        });
        queryClient.invalidateQueries({ queryKey: ['meta-ads-connection'] });
      }
    },
    onError: (error) => {
      toast({
        title: 'Erro ao renovar tokens',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const checkToken = async (clientId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sessão expirada');

      const { data, error } = await supabase.functions.invoke('meta-token-refresh', {
        body: { action: 'check', clientId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Token check error:', err);
      return null;
    }
  };

  return { exchangeToken, refreshExpiring, checkToken };
}

// Hook for managing Meta Ads connections
export function useMetaAdsConnectionManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { exchangeToken } = useMetaTokenRefresh();

  // Connect a Meta Ads account (with auto token exchange)
  const connectAccount = useMutation({
    mutationFn: async ({
      clientId,
      accessToken,
      adAccountId,
      adAccountName,
    }: {
      clientId: string;
      accessToken: string;
      adAccountId: string;
      adAccountName?: string;
    }) => {
      // First, try to exchange for a long-lived token
      const exchangeResult = await exchangeToken(accessToken);
      const finalToken = exchangeResult?.longLivedToken || accessToken;
      const tokenExpiresAt = exchangeResult?.expiresAt || null;

      // Check if connection already exists
      const { data: existing } = await supabase
        .from('client_meta_ads')
        .select('id')
        .eq('client_id', clientId)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('client_meta_ads')
          .update({
            access_token: finalToken,
            ad_account_id: adAccountId,
            ad_account_name: adAccountName || null,
            token_expires_at: tokenExpiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('client_id', clientId)
          .select()
          .single();

        if (error) throw error;
        return { ...data, exchanged: exchangeResult?.exchanged };
      } else {
        const { data, error } = await supabase
          .from('client_meta_ads')
          .insert({
            client_id: clientId,
            access_token: finalToken,
            ad_account_id: adAccountId,
            ad_account_name: adAccountName || null,
            token_expires_at: tokenExpiresAt,
          })
          .select()
          .single();

        if (error) throw error;
        return { ...data, exchanged: exchangeResult?.exchanged };
      }
    },
    onSuccess: (data) => {
      const exchangeMsg = data?.exchanged
        ? ' Token convertido para longa duração (~60 dias).'
        : '';
      toast({
        title: 'Conta conectada',
        description: `A conta Meta Ads foi conectada com sucesso.${exchangeMsg}`,
      });
      queryClient.invalidateQueries({ queryKey: ['meta-ads-connection'] });
    },
    onError: (error) => {
      console.error('Connect Meta Ads error:', error);
      toast({
        title: 'Erro ao conectar conta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Disconnect a Meta Ads account
  const disconnectAccount = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from('client_meta_ads')
        .delete()
        .eq('client_id', clientId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Conta desconectada',
        description: 'A conta Meta Ads foi desconectada.',
      });
      queryClient.invalidateQueries({ queryKey: ['meta-ads-connection'] });
    },
    onError: (error) => {
      console.error('Disconnect Meta Ads error:', error);
      toast({
        title: 'Erro ao desconectar conta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    connectAccount,
    disconnectAccount,
  };
}
