import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GoogleAdsMetrics {
  spend: number;
  conversions: number;
  conversionsValue: number;
  clicks: number;
  impressions: number;
  roas: number;
  cpa: number;
  ctr: number;
  avgCpc: number;
}

export type DateRange = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH';

export function useGoogleAdsMetrics() {
  const [metrics, setMetrics] = useState<GoogleAdsMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchMetrics = async (clientId: string, dateRange: DateRange = 'LAST_30_DAYS') => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('google-ads-metrics', {
        body: { clientId, dateRange },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setMetrics(data.metrics);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar métricas';
      setError(message);
      toast({
        title: 'Erro',
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
    loading,
    error,
    fetchMetrics,
  };
}
