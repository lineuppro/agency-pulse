import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function getGoogleAccessToken(): Promise<string | null> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    console.log('Google OAuth credentials not configured');
    return null;
  }

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

  if (!response.ok) return null;
  const data = await response.json();
  return data.access_token;
}

async function executeQuery(customerId: string, accessToken: string, query: string): Promise<any[]> {
  const developerToken = Deno.env.get('GOOGLE_DEVELOPER_TOKEN');
  if (!developerToken) return [];

  const cleanId = customerId.replace(/-/g, '');
  const response = await fetch(
    `https://googleads.googleapis.com/v22/customers/${cleanId}/googleAds:searchStream`,
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

  if (!response.ok) return [];
  const data = await response.json();
  return data[0]?.results || [];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No auth header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { clientId, dateRange = 'LAST_30_DAYS' } = await req.json();

    if (!clientId) {
      return new Response(JSON.stringify({ error: 'clientId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('google_ads_id, name')
      .eq('id', clientId)
      .single();

    if (!client?.google_ads_id) {
      return new Response(JSON.stringify({ 
        error: 'No Google Ads ID',
        metrics: null, campaigns: [], keywords: [],
        searchTerms: { converting: [], nonConverting: [] },
        opportunities: [], alerts: [],
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const accessToken = await getGoogleAccessToken();
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Failed to get Google token' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Fetching Google Ads for ${client.name}, period: ${dateRange}`);

    // Fetch metrics
    const metricsQuery = `SELECT metrics.cost_micros, metrics.conversions, metrics.conversions_value, metrics.clicks, metrics.impressions, metrics.ctr, metrics.average_cpc FROM customer WHERE segments.date DURING ${dateRange}`;
    const metricsResults = await executeQuery(client.google_ads_id, accessToken, metricsQuery);
    
    let metrics = null;
    if (metricsResults.length > 0) {
      const m = metricsResults[0].metrics;
      const spend = parseInt(m.costMicros || '0') / 1000000;
      const conversions = parseFloat(m.conversions || '0');
      const conversionsValue = parseFloat(m.conversionsValue || '0');
      const clicks = parseInt(m.clicks || '0');
      const impressions = parseInt(m.impressions || '0');
      
      metrics = {
        spend,
        conversions,
        conversionsValue,
        clicks,
        impressions,
        ctr: parseFloat(m.ctr || '0') * 100,
        avgCpc: parseInt(m.averageCpc || '0') / 1000000,
        roas: spend > 0 ? conversionsValue / spend : 0,
        cpa: conversions > 0 ? spend / conversions : 0,
      };
    }

    // Fetch campaigns
    const campaignsQuery = `SELECT campaign.id, campaign.name, campaign.status, metrics.cost_micros, metrics.conversions, metrics.conversions_value, metrics.clicks, metrics.impressions, metrics.ctr FROM campaign WHERE segments.date DURING ${dateRange} AND campaign.status = 'ENABLED' ORDER BY metrics.cost_micros DESC LIMIT 10`;
    const campaignsResults = await executeQuery(client.google_ads_id, accessToken, campaignsQuery);
    
    const campaigns = campaignsResults.map(r => {
      const spend = parseInt(r.metrics.costMicros || '0') / 1000000;
      const conversions = parseFloat(r.metrics.conversions || '0');
      const convValue = parseFloat(r.metrics.conversionsValue || '0');
      return {
        id: r.campaign.id,
        name: r.campaign.name,
        status: r.campaign.status,
        spend,
        conversions,
        clicks: parseInt(r.metrics.clicks || '0'),
        impressions: parseInt(r.metrics.impressions || '0'),
        ctr: parseFloat(r.metrics.ctr || '0') * 100,
        roas: spend > 0 ? convValue / spend : 0,
        cpa: conversions > 0 ? spend / conversions : 0,
      };
    });

    // Fetch keywords
    const keywordsQuery = `SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, campaign.name, ad_group.name, metrics.cost_micros, metrics.clicks, metrics.conversions, metrics.impressions, metrics.average_cpc, metrics.ctr, ad_group_criterion.quality_info.quality_score FROM keyword_view WHERE segments.date DURING ${dateRange} AND metrics.impressions > 0 ORDER BY metrics.cost_micros DESC LIMIT 15`;
    const keywordsResults = await executeQuery(client.google_ads_id, accessToken, keywordsQuery);
    
    const keywords = keywordsResults.map(r => ({
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

    // Fetch search terms
    const searchQuery = `SELECT search_term_view.search_term, campaign.name, metrics.clicks, metrics.impressions, metrics.conversions, metrics.cost_micros, metrics.ctr FROM search_term_view WHERE segments.date DURING ${dateRange} AND metrics.impressions > 5 ORDER BY metrics.cost_micros DESC LIMIT 30`;
    const searchResults = await executeQuery(client.google_ads_id, accessToken, searchQuery);
    
    const allTerms = searchResults.map(r => ({
      searchTerm: r.searchTermView?.searchTerm || 'N/A',
      campaignName: r.campaign?.name || 'N/A',
      clicks: parseInt(r.metrics.clicks || '0'),
      impressions: parseInt(r.metrics.impressions || '0'),
      conversions: parseFloat(r.metrics.conversions || '0'),
      spend: parseInt(r.metrics.costMicros || '0') / 1000000,
      ctr: parseFloat(r.metrics.ctr || '0') * 100,
    }));

    const searchTerms = {
      converting: allTerms.filter(t => t.conversions > 0).slice(0, 10),
      nonConverting: allTerms.filter(t => t.conversions === 0 && t.clicks >= 3).slice(0, 10),
    };

    // Generate simple opportunities
    const opportunities: any[] = [];
    const lowQS = keywords.filter(k => k.qualityScore !== null && k.qualityScore <= 4);
    if (lowQS.length > 0) {
      opportunities.push({
        type: 'low_quality_score',
        severity: 'high',
        title: `${lowQS.length} palavras com QS baixo`,
        description: 'Palavras com Quality Score ≤ 4',
        impact: 'Otimize para reduzir CPC',
      });
    }

    const highSpend = searchTerms.nonConverting.filter(t => t.spend > 50);
    if (highSpend.length > 0) {
      opportunities.push({
        type: 'negative_keyword',
        severity: 'high',
        title: `${highSpend.length} termos para negativar`,
        description: 'Termos sem conversão com alto gasto',
        impact: `Economia de R$ ${highSpend.reduce((s, t) => s + t.spend, 0).toFixed(0)}`,
      });
    }

    console.log(`Fetched: ${campaigns.length} campaigns, ${keywords.length} keywords`);

    return new Response(JSON.stringify({
      metrics,
      previousMetrics: null,
      campaigns,
      keywords,
      searchTerms,
      opportunities,
      alerts: [],
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('google-ads-detailed error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
