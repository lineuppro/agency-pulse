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
      // Ensure we always send a valid JWT to the backend function
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const { data, error: fnError } = await supabase.functions.invoke('google-ads-metrics', {
        body: { clientId, dateRange },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (fnError) {
        // Extract more details from the error
        const errorDetails = fnError.message || 'Unknown error';
        const context = (fnError as any).context;
        const status = context?.status || 'N/A';
        const fullMessage = `Status ${status}: ${errorDetails}`;
        console.error('Edge function error:', { status, errorDetails, context, fnError });
        throw new Error(fullMessage);
      }

      if (data?.error) {
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error;
        console.error('API returned error:', data);
        throw new Error(errorMsg);
      }

      setMetrics(data.metrics);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar métricas';
      console.error('useGoogleAdsMetrics error:', err);
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
    loading,
    error,
    fetchMetrics,
  };
}
