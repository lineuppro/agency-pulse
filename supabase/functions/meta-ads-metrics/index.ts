import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetaInsightsResponse {
  data: Array<{
    spend?: string;
    impressions?: string;
    reach?: string;
    clicks?: string;
    ctr?: string;
    cpc?: string;
    cpm?: string;
    actions?: Array<{
      action_type: string;
      value: string;
    }>;
    cost_per_action_type?: Array<{
      action_type: string;
      value: string;
    }>;
    purchase_roas?: Array<{
      action_type: string;
      value: string;
    }>;
  }>;
  paging?: {
    cursors?: {
      after?: string;
    };
  };
}

interface MetaCampaignsResponse {
  data: Array<{
    id: string;
    name: string;
    status: string;
    objective: string;
    insights?: {
      data: Array<{
        spend?: string;
        impressions?: string;
        reach?: string;
        clicks?: string;
        ctr?: string;
        cpc?: string;
        actions?: Array<{
          action_type: string;
          value: string;
        }>;
        purchase_roas?: Array<{
          action_type: string;
          value: string;
        }>;
      }>;
    };
  }>;
}

function getDateRange(range: string): { since: string; until: string } {
  const today = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  switch (range) {
    case 'today':
      return { since: formatDate(today), until: formatDate(today) };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { since: formatDate(yesterday), until: formatDate(yesterday) };
    }
    case 'last_7d': {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return { since: formatDate(sevenDaysAgo), until: formatDate(today) };
    }
    case 'last_30d': {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return { since: formatDate(thirtyDaysAgo), until: formatDate(today) };
    }
    case 'this_month': {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return { since: formatDate(firstDay), until: formatDate(today) };
    }
    default: {
      const defaultDaysAgo = new Date(today);
      defaultDaysAgo.setDate(defaultDaysAgo.getDate() - 30);
      return { since: formatDate(defaultDaysAgo), until: formatDate(today) };
    }
  }
}

async function fetchAccountInsights(
  adAccountId: string,
  accessToken: string,
  dateRange: { since: string; until: string }
): Promise<MetaInsightsResponse> {
  const fields = [
    'spend',
    'impressions',
    'reach',
    'clicks',
    'ctr',
    'cpc',
    'cpm',
    'actions',
    'cost_per_action_type',
    'purchase_roas',
  ].join(',');

  const url = new URL(`https://graph.facebook.com/v22.0/${adAccountId}/insights`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('fields', fields);
  url.searchParams.set('time_range', JSON.stringify(dateRange));
  url.searchParams.set('level', 'account');

  console.log('Fetching account insights from:', url.toString().replace(accessToken, '[REDACTED]'));

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!response.ok) {
    console.error('Meta API error:', data);
    throw new Error(data.error?.message || `Meta API error: ${response.status}`);
  }

  return data;
}

async function fetchCampaigns(
  adAccountId: string,
  accessToken: string,
  dateRange: { since: string; until: string }
): Promise<MetaCampaignsResponse> {
  const insightFields = [
    'spend',
    'impressions',
    'reach',
    'clicks',
    'ctr',
    'cpc',
    'actions',
    'purchase_roas',
  ].join(',');

  const url = new URL(`https://graph.facebook.com/v22.0/${adAccountId}/campaigns`);
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('fields', `id,name,status,objective,insights.time_range(${JSON.stringify(dateRange)}){${insightFields}}`);
  url.searchParams.set('limit', '50');

  console.log('Fetching campaigns from:', url.toString().replace(accessToken, '[REDACTED]'));

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!response.ok) {
    console.error('Meta Campaigns API error:', data);
    throw new Error(data.error?.message || `Meta API error: ${response.status}`);
  }

  return data;
}

function parseInsights(insights: MetaInsightsResponse['data'][0] | undefined) {
  if (!insights) {
    return {
      spend: 0,
      impressions: 0,
      reach: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      cpm: 0,
      conversions: 0,
      costPerResult: 0,
      roas: 0,
    };
  }

  const spend = parseFloat(insights.spend || '0');
  const impressions = parseInt(insights.impressions || '0', 10);
  const reach = parseInt(insights.reach || '0', 10);
  const clicks = parseInt(insights.clicks || '0', 10);
  const ctr = parseFloat(insights.ctr || '0');
  const cpc = parseFloat(insights.cpc || '0');
  const cpm = parseFloat(insights.cpm || '0');

  // Extract conversions (purchases or leads)
  let conversions = 0;
  if (insights.actions) {
    const purchaseAction = insights.actions.find(a => a.action_type === 'purchase');
    const leadAction = insights.actions.find(a => a.action_type === 'lead');
    const completeAction = insights.actions.find(a => a.action_type === 'omni_complete_registration');
    conversions = parseInt(purchaseAction?.value || leadAction?.value || completeAction?.value || '0', 10);
  }

  // Extract cost per result
  let costPerResult = 0;
  if (insights.cost_per_action_type) {
    const purchaseCost = insights.cost_per_action_type.find(a => a.action_type === 'purchase');
    const leadCost = insights.cost_per_action_type.find(a => a.action_type === 'lead');
    costPerResult = parseFloat(purchaseCost?.value || leadCost?.value || '0');
  }

  // Extract ROAS
  let roas = 0;
  if (insights.purchase_roas) {
    const roasData = insights.purchase_roas.find(a => a.action_type === 'omni_purchase');
    roas = parseFloat(roasData?.value || '0');
  }

  return {
    spend,
    impressions,
    reach,
    clicks,
    ctr,
    cpc,
    cpm,
    conversions,
    costPerResult,
    roas,
  };
}

Deno.serve(async (req) => {
  console.log('=== meta-ads-metrics function invoked ===');
  console.log('Method:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth validation failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message || 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('Authenticated user:', user.id);

    const body = await req.json();
    const { clientId, dateRange = 'last_30d' } = body;
    console.log('Request body:', { clientId, dateRange });

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'Client ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client's Meta Ads credentials
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: metaAds, error: metaError } = await supabase
      .from('client_meta_ads')
      .select('access_token, ad_account_id, ad_account_name')
      .eq('client_id', clientId)
      .single();

    if (metaError || !metaAds) {
      console.error('Meta Ads config not found:', metaError);
      return new Response(
        JSON.stringify({ 
          error: 'Meta Ads não configurado', 
          details: 'Este cliente não possui uma conta Meta Ads vinculada.' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { access_token, ad_account_id, ad_account_name } = metaAds;
    
    // Ensure ad_account_id has the 'act_' prefix
    const formattedAccountId = ad_account_id.startsWith('act_') ? ad_account_id : `act_${ad_account_id}`;
    
    console.log(`Fetching Meta Ads metrics for account: ${formattedAccountId} (${ad_account_name})`);

    const dateRangeParams = getDateRange(dateRange);
    console.log('Date range:', dateRangeParams);

    // Fetch account-level insights
    const accountInsights = await fetchAccountInsights(formattedAccountId, access_token, dateRangeParams);
    const metrics = parseInsights(accountInsights.data?.[0]);

    // Fetch campaign-level data
    const campaignsResponse = await fetchCampaigns(formattedAccountId, access_token, dateRangeParams);
    
    const campaigns = campaignsResponse.data.map(campaign => {
      const campaignInsights = campaign.insights?.data?.[0];
      const parsed = parseInsights(campaignInsights);
      
      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        objective: campaign.objective,
        ...parsed,
      };
    });

    console.log(`Successfully fetched ${campaigns.length} campaigns`);

    return new Response(
      JSON.stringify({
        success: true,
        accountName: ad_account_name,
        dateRange,
        metrics,
        campaigns,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Meta Ads metrics error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
