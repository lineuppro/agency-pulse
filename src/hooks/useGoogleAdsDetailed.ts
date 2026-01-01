import { useState, useCallback } from 'react';
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

export interface CampaignData {
  id: string;
  name: string;
  status: string;
  spend: number;
  conversions: number;
  clicks: number;
  impressions: number;
  ctr: number;
  roas: number;
  cpa: number;
}

export interface KeywordData {
  keyword: string;
  matchType: string;
  campaignName: string;
  adGroupName: string;
  spend: number;
  clicks: number;
  conversions: number;
  impressions: number;
  avgCpc: number;
  qualityScore: number | null;
  ctr: number;
}

export interface SearchTermData {
  searchTerm: string;
  campaignName: string;
  clicks: number;
  impressions: number;
  conversions: number;
  spend: number;
  ctr: number;
}

export interface Opportunity {
  type: 'negative_keyword' | 'low_quality_score' | 'budget_reallocation' | 'high_cpc';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  data?: any;
}

export interface Alert {
  type: 'performance_drop' | 'spend_spike' | 'conversion_drop' | 'cpc_increase';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
}

export interface GoogleAdsDetailedData {
  metrics: GoogleAdsMetrics | null;
  previousMetrics: GoogleAdsMetrics | null;
  campaigns: CampaignData[];
  keywords: KeywordData[];
  searchTerms: {
    converting: SearchTermData[];
    nonConverting: SearchTermData[];
  };
  opportunities: Opportunity[];
  alerts: Alert[];
}

export type DateRange = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH';

export function useGoogleAdsDetailed() {
  const [data, setData] = useState<GoogleAdsDetailedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDetailedData = useCallback(async (clientId: string, dateRange: DateRange = 'LAST_30_DAYS') => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const { data: responseData, error: fnError } = await supabase.functions.invoke('google-ads-detailed', {
        body: { clientId, dateRange },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao buscar dados detalhados');
      }

      if (responseData?.error && !responseData?.metrics) {
        // No data but not a critical error
        setData({
          metrics: null,
          previousMetrics: null,
          campaigns: [],
          keywords: [],
          searchTerms: { converting: [], nonConverting: [] },
          opportunities: [],
          alerts: [],
        });
        return null;
      }

      setData(responseData);
      return responseData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar dados';
      console.error('useGoogleAdsDetailed error:', err);
      setError(message);
      toast({
        title: 'Erro ao buscar dados',
        description: message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    data,
    loading,
    error,
    fetchDetailedData,
  };
}
