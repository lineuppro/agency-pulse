import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==================== TYPES ====================

interface GoogleAdsMetrics {
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

interface CampaignData {
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

interface KeywordData {
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

interface SearchTermData {
  searchTerm: string;
  campaignName: string;
  clicks: number;
  impressions: number;
  conversions: number;
  spend: number;
  ctr: number;
}

interface Opportunity {
  type: 'negative_keyword' | 'low_quality_score' | 'budget_reallocation' | 'high_cpc';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  data?: any;
}

interface Alert {
  type: 'performance_drop' | 'spend_spike' | 'conversion_drop' | 'cpc_increase';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
}

// ==================== GOOGLE OAUTH ====================

async function getGoogleAccessToken(): Promise<string | null> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    console.log('Google OAuth credentials not configured');
    return null;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('Failed to refresh Google token');
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error refreshing Google token:', error);
    return null;
  }
}

// ==================== GOOGLE ADS API QUERIES ====================

async function executeGoogleAdsQuery(
  customerId: string, 
  accessToken: string, 
  query: string
): Promise<any[] | null> {
  const developerToken = Deno.env.get('GOOGLE_DEVELOPER_TOKEN');
  if (!developerToken) {
    console.log('GOOGLE_DEVELOPER_TOKEN not configured');
    return null;
  }

  const cleanCustomerId = customerId.replace(/-/g, '');

  try {
    const response = await fetch(
      `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Ads API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data[0]?.results || [];
  } catch (error) {
    console.error('Error executing Google Ads query:', error);
    return null;
  }
}

// Fetch aggregated metrics
async function fetchMetrics(
  customerId: string, 
  accessToken: string, 
  period: string
): Promise<GoogleAdsMetrics | null> {
  const query = `
    SELECT
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.clicks,
      metrics.impressions,
      metrics.ctr,
      metrics.average_cpc
    FROM customer
    WHERE segments.date DURING ${period}
  `;

  const results = await executeGoogleAdsQuery(customerId, accessToken, query);
  if (!results || results.length === 0) return null;

  const m = results[0].metrics;
  const spend = parseInt(m.costMicros || '0') / 1000000;
  const conversions = parseFloat(m.conversions || '0');
  const conversionsValue = parseFloat(m.conversionsValue || '0');
  const clicks = parseInt(m.clicks || '0');
  const impressions = parseInt(m.impressions || '0');
  const ctr = parseFloat(m.ctr || '0') * 100;
  const avgCpc = parseInt(m.averageCpc || '0') / 1000000;
  const roas = spend > 0 ? conversionsValue / spend : 0;
  const cpa = conversions > 0 ? spend / conversions : 0;

  return { spend, conversions, conversionsValue, clicks, impressions, ctr, avgCpc, roas, cpa };
}

// Fetch campaign performance
async function fetchCampaigns(
  customerId: string, 
  accessToken: string, 
  period: string
): Promise<CampaignData[]> {
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.clicks,
      metrics.impressions,
      metrics.ctr
    FROM campaign
    WHERE segments.date DURING ${period}
      AND campaign.status = 'ENABLED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 15
  `;

  const results = await executeGoogleAdsQuery(customerId, accessToken, query);
  if (!results) return [];

  return results.map(r => {
    const spend = parseInt(r.metrics.costMicros || '0') / 1000000;
    const conversions = parseFloat(r.metrics.conversions || '0');
    const convValue = parseFloat(r.metrics.conversionsValue || '0');
    const clicks = parseInt(r.metrics.clicks || '0');
    const impressions = parseInt(r.metrics.impressions || '0');
    
    return {
      id: r.campaign.id,
      name: r.campaign.name,
      status: r.campaign.status,
      spend,
      conversions,
      clicks,
      impressions,
      ctr: parseFloat(r.metrics.ctr || '0') * 100,
      roas: spend > 0 ? convValue / spend : 0,
      cpa: conversions > 0 ? spend / conversions : 0,
    };
  });
}

// Fetch keyword performance
async function fetchKeywords(
  customerId: string, 
  accessToken: string, 
  period: string
): Promise<KeywordData[]> {
  const query = `
    SELECT
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      campaign.name,
      ad_group.name,
      metrics.cost_micros,
      metrics.clicks,
      metrics.conversions,
      metrics.impressions,
      metrics.average_cpc,
      metrics.ctr,
      ad_group_criterion.quality_info.quality_score
    FROM keyword_view
    WHERE segments.date DURING ${period}
      AND metrics.impressions > 0
    ORDER BY metrics.cost_micros DESC
    LIMIT 20
  `;

  const results = await executeGoogleAdsQuery(customerId, accessToken, query);
  if (!results) return [];

  return results.map(r => ({
    keyword: r.adGroupCriterion?.keyword?.text || 'N/A',
    matchType: r.adGroupCriterion?.keyword?.matchType || 'N/A',
    campaignName: r.campaign?.name || 'N/A',
    adGroupName: r.adGroup?.name || 'N/A',
    spend: parseInt(r.metrics.costMicros || '0') / 1000000,
    clicks: parseInt(r.metrics.clicks || '0'),
    conversions: parseFloat(r.metrics.conversions || '0'),
    impressions: parseInt(r.metrics.impressions || '0'),
    avgCpc: parseInt(r.metrics.averageCpc || '0') / 1000000,
    ctr: parseFloat(r.metrics.ctr || '0') * 100,
    qualityScore: r.adGroupCriterion?.qualityInfo?.qualityScore || null,
  }));
}

// Fetch search terms
async function fetchSearchTerms(
  customerId: string, 
  accessToken: string, 
  period: string
): Promise<{ converting: SearchTermData[], nonConverting: SearchTermData[] }> {
  const query = `
    SELECT
      search_term_view.search_term,
      campaign.name,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions,
      metrics.cost_micros,
      metrics.ctr
    FROM search_term_view
    WHERE segments.date DURING ${period}
      AND metrics.impressions > 5
    ORDER BY metrics.cost_micros DESC
    LIMIT 50
  `;

  const results = await executeGoogleAdsQuery(customerId, accessToken, query);
  if (!results) return { converting: [], nonConverting: [] };

  const all = results.map(r => ({
    searchTerm: r.searchTermView?.searchTerm || 'N/A',
    campaignName: r.campaign?.name || 'N/A',
    clicks: parseInt(r.metrics.clicks || '0'),
    impressions: parseInt(r.metrics.impressions || '0'),
    conversions: parseFloat(r.metrics.conversions || '0'),
    spend: parseInt(r.metrics.costMicros || '0') / 1000000,
    ctr: parseFloat(r.metrics.ctr || '0') * 100,
  }));

  const converting = all.filter(t => t.conversions > 0).slice(0, 15);
  const nonConverting = all.filter(t => t.conversions === 0 && t.clicks >= 3).slice(0, 15);

  return { converting, nonConverting };
}

// Generate opportunities based on data
function generateOpportunities(
  keywords: KeywordData[],
  searchTerms: { converting: SearchTermData[], nonConverting: SearchTermData[] },
  campaigns: CampaignData[]
): Opportunity[] {
  const opportunities: Opportunity[] = [];

  // Low Quality Score keywords
  const lowQSKeywords = keywords.filter(k => k.qualityScore !== null && k.qualityScore <= 4);
  if (lowQSKeywords.length > 0) {
    opportunities.push({
      type: 'low_quality_score',
      severity: 'high',
      title: `${lowQSKeywords.length} palavras-chave com Quality Score baixo`,
      description: 'Palavras-chave com QS ≤ 4 têm CPCs mais altos e menor visibilidade.',
      impact: `Potencial redução de ${(lowQSKeywords.length * 15)}% no CPC`,
      data: lowQSKeywords.slice(0, 5).map(k => ({ keyword: k.keyword, qs: k.qualityScore })),
    });
  }

  // Negative keyword suggestions
  const highSpendNoConv = searchTerms.nonConverting.filter(t => t.spend > 50);
  if (highSpendNoConv.length > 0) {
    const totalWasted = highSpendNoConv.reduce((sum, t) => sum + t.spend, 0);
    opportunities.push({
      type: 'negative_keyword',
      severity: 'high',
      title: `${highSpendNoConv.length} termos para negativar`,
      description: 'Termos de pesquisa com alto gasto e zero conversões.',
      impact: `Economia potencial de R$ ${totalWasted.toFixed(2)}/período`,
      data: highSpendNoConv.slice(0, 5).map(t => ({ term: t.searchTerm, spend: t.spend })),
    });
  }

  // Budget reallocation
  const sortedByRoas = [...campaigns].sort((a, b) => b.roas - a.roas);
  const topCampaigns = sortedByRoas.filter(c => c.roas > 2);
  const lowCampaigns = sortedByRoas.filter(c => c.roas < 1 && c.spend > 100);
  
  if (topCampaigns.length > 0 && lowCampaigns.length > 0) {
    opportunities.push({
      type: 'budget_reallocation',
      severity: 'medium',
      title: 'Redistribuir verba entre campanhas',
      description: `${topCampaigns.length} campanhas com ROAS alto e ${lowCampaigns.length} com ROAS baixo.`,
      impact: 'Potencial aumento de ROAS geral em 20-30%',
      data: {
        boost: topCampaigns.slice(0, 3).map(c => ({ name: c.name, roas: c.roas })),
        reduce: lowCampaigns.slice(0, 3).map(c => ({ name: c.name, roas: c.roas })),
      },
    });
  }

  // High CPC keywords
  const avgCpc = keywords.reduce((sum, k) => sum + k.avgCpc, 0) / keywords.length;
  const highCpcKeywords = keywords.filter(k => k.avgCpc > avgCpc * 1.5 && k.conversions === 0);
  if (highCpcKeywords.length > 0) {
    opportunities.push({
      type: 'high_cpc',
      severity: 'medium',
      title: `${highCpcKeywords.length} palavras com CPC acima da média`,
      description: 'Palavras-chave caras sem conversões.',
      impact: 'Ajuste de lances pode reduzir custos',
      data: highCpcKeywords.slice(0, 5).map(k => ({ keyword: k.keyword, cpc: k.avgCpc })),
    });
  }

  return opportunities;
}

// Generate alerts based on comparison
function generateAlerts(
  currentMetrics: GoogleAdsMetrics | null,
  previousMetrics: GoogleAdsMetrics | null
): Alert[] {
  const alerts: Alert[] = [];
  
  if (!currentMetrics || !previousMetrics) return alerts;

  // ROAS drop
  if (previousMetrics.roas > 0) {
    const roasChange = ((currentMetrics.roas - previousMetrics.roas) / previousMetrics.roas) * 100;
    if (roasChange < -20) {
      alerts.push({
        type: 'performance_drop',
        severity: 'critical',
        title: 'Queda significativa no ROAS',
        message: `ROAS caiu ${Math.abs(roasChange).toFixed(1)}% em relação ao período anterior (${previousMetrics.roas.toFixed(2)}x → ${currentMetrics.roas.toFixed(2)}x)`,
      });
    }
  }

  // Conversion drop
  if (previousMetrics.conversions > 0) {
    const convChange = ((currentMetrics.conversions - previousMetrics.conversions) / previousMetrics.conversions) * 100;
    if (convChange < -25) {
      alerts.push({
        type: 'conversion_drop',
        severity: 'warning',
        title: 'Queda nas conversões',
        message: `Conversões caíram ${Math.abs(convChange).toFixed(1)}% (${previousMetrics.conversions.toFixed(0)} → ${currentMetrics.conversions.toFixed(0)})`,
      });
    }
  }

  // CPC increase
  if (previousMetrics.avgCpc > 0) {
    const cpcChange = ((currentMetrics.avgCpc - previousMetrics.avgCpc) / previousMetrics.avgCpc) * 100;
    if (cpcChange > 30) {
      alerts.push({
        type: 'cpc_increase',
        severity: 'warning',
        title: 'Aumento no CPC médio',
        message: `CPC aumentou ${cpcChange.toFixed(1)}% (R$ ${previousMetrics.avgCpc.toFixed(2)} → R$ ${currentMetrics.avgCpc.toFixed(2)})`,
      });
    }
  }

  // Spend spike
  if (previousMetrics.spend > 0) {
    const spendChange = ((currentMetrics.spend - previousMetrics.spend) / previousMetrics.spend) * 100;
    if (spendChange > 50) {
      alerts.push({
        type: 'spend_spike',
        severity: 'info',
        title: 'Aumento significativo no gasto',
        message: `Gasto aumentou ${spendChange.toFixed(1)}% em relação ao período anterior`,
      });
    }
  }

  return alerts;
}

// ==================== MAIN SERVER ====================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { clientId, dateRange = 'LAST_30_DAYS' } = await req.json();

    if (!clientId) {
      return new Response(JSON.stringify({ error: 'clientId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get client's google_ads_id
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('google_ads_id, name')
      .eq('id', clientId)
      .single();

    if (clientError || !client?.google_ads_id) {
      return new Response(JSON.stringify({ 
        error: 'Client not found or no Google Ads ID configured',
        metrics: null,
        campaigns: [],
        keywords: [],
        searchTerms: { converting: [], nonConverting: [] },
        opportunities: [],
        alerts: [],
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = await getGoogleAccessToken();
    if (!accessToken) {
      return new Response(JSON.stringify({ 
        error: 'Failed to authenticate with Google Ads',
        details: 'Check Google OAuth credentials',
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Fetching detailed Google Ads data for client ${client.name}, period: ${dateRange}`);

    // Determine comparison period
    const periodMap: Record<string, string> = {
      'TODAY': 'YESTERDAY',
      'YESTERDAY': 'LAST_7_DAYS',
      'LAST_7_DAYS': 'LAST_14_DAYS',
      'LAST_30_DAYS': 'LAST_60_DAYS',
      'THIS_MONTH': 'LAST_30_DAYS',
    };
    const comparisonPeriod = periodMap[dateRange] || 'LAST_60_DAYS';

    // Fetch all data in parallel
    const [metrics, previousMetrics, campaigns, keywords, searchTerms] = await Promise.all([
      fetchMetrics(client.google_ads_id, accessToken, dateRange),
      fetchMetrics(client.google_ads_id, accessToken, comparisonPeriod),
      fetchCampaigns(client.google_ads_id, accessToken, dateRange),
      fetchKeywords(client.google_ads_id, accessToken, dateRange),
      fetchSearchTerms(client.google_ads_id, accessToken, dateRange),
    ]);

    // Generate insights
    const opportunities = generateOpportunities(keywords, searchTerms, campaigns);
    const alerts = generateAlerts(metrics, previousMetrics);

    console.log(`Fetched: ${campaigns.length} campaigns, ${keywords.length} keywords, ${searchTerms.converting.length + searchTerms.nonConverting.length} search terms`);

    return new Response(JSON.stringify({
      metrics,
      previousMetrics,
      campaigns,
      keywords,
      searchTerms,
      opportunities,
      alerts,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('google-ads-detailed error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
