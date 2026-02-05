import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface MetaAdsMetrics {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  cpc: number;
  cpm: number;
  ctr: number;
  frequency: number;
  conversions: number;
  conversionsValue: number;
  roas: number;
  cpa: number;
}

export interface MetaAdsCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  ctr: number;
  conversions: number;
  roas: number;
  cpa: number;
}

export type DateRange = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH';

export function useMetaAdsMetrics() {
  const [metrics, setMetrics] = useState<MetaAdsMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<MetaAdsCampaign[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMetrics = async (clientId: string, dateRange: DateRange = 'LAST_30_DAYS') => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const { data, error: fnError } = await supabase.functions.invoke('meta-ads-metrics', {
        body: { clientId, dateRange },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Unknown error');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setConfigured(data.configured);
      
      if (data.configured) {
        setMetrics(data.metrics);
        setCampaigns(data.campaigns || []);
      } else {
        setMetrics(null);
        setCampaigns([]);
      }

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
    configured,
    loading,
    error,
    fetchMetrics,
  };
}
