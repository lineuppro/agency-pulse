import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type DateRange = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH';

function getDatePreset(range: DateRange): string {
  switch (range) {
    case 'TODAY':
      return 'today';
    case 'YESTERDAY':
      return 'yesterday';
    case 'LAST_7_DAYS':
      return 'last_7d';
    case 'LAST_30_DAYS':
      return 'last_30d';
    case 'THIS_MONTH':
      return 'this_month';
    default:
      return 'last_30d';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.error('[meta-ads-metrics] No auth header provided');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // User client for auth validation
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service role client for database access (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate token using getUser
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      console.error('[meta-ads-metrics] Auth validation failed:', authError?.message);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[meta-ads-metrics] User authenticated:', user.id);

    const { clientId, dateRange = 'LAST_30_DAYS' } = await req.json();
    console.log('[meta-ads-metrics] Request params:', { clientId, dateRange });

    if (!clientId) {
      console.error('[meta-ads-metrics] clientId is missing');
      return new Response(JSON.stringify({ error: 'clientId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Meta Ads config for client using service role
    console.log('[meta-ads-metrics] Fetching meta ads config for client:', clientId);
    const { data: metaAdsConfig, error: configError } = await supabase
      .from('client_meta_ads')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (configError) {
      console.log('[meta-ads-metrics] Config query error:', configError.message, configError.code);
    }

    if (configError || !metaAdsConfig) {
      console.log('[meta-ads-metrics] Meta Ads not configured for client:', clientId);
      return new Response(JSON.stringify({ 
        error: 'Meta Ads not configured for this client',
        configured: false,
        debug: {
          clientId,
          errorCode: configError?.code,
          errorMessage: configError?.message,
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[meta-ads-metrics] Found config:', {
      adAccountId: metaAdsConfig.ad_account_id,
      adAccountName: metaAdsConfig.ad_account_name,
      tokenExpires: metaAdsConfig.token_expires_at,
    });

    const { ad_account_id, access_token } = metaAdsConfig;
    const datePreset = getDatePreset(dateRange as DateRange);

    // Fetch account insights
    const insightsUrl = new URL(`https://graph.facebook.com/v21.0/act_${ad_account_id}/insights`);
    insightsUrl.searchParams.set('access_token', access_token);
    insightsUrl.searchParams.set('date_preset', datePreset);
    insightsUrl.searchParams.set('fields', 'spend,impressions,reach,clicks,cpc,cpm,ctr,frequency,actions,cost_per_action_type,purchase_roas');

    console.log('[meta-ads-metrics] Fetching insights for account:', ad_account_id);
    const insightsResponse = await fetch(insightsUrl.toString());
    const insightsData = await insightsResponse.json();

    if (insightsData.error) {
      console.error('[meta-ads-metrics] Meta API error:', insightsData.error);
      return new Response(JSON.stringify({ 
        error: insightsData.error.message,
        code: insightsData.error.code,
        configured: true,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse metrics
    const insights = insightsData.data?.[0] || {};
    console.log('[meta-ads-metrics] Raw insights:', JSON.stringify(insights).slice(0, 500));
    
    const spend = parseFloat(insights.spend || '0');
    const impressions = parseInt(insights.impressions || '0', 10);
    const reach = parseInt(insights.reach || '0', 10);
    const clicks = parseInt(insights.clicks || '0', 10);
    const cpc = parseFloat(insights.cpc || '0');
    const cpm = parseFloat(insights.cpm || '0');
    const ctr = parseFloat(insights.ctr || '0');
    const frequency = parseFloat(insights.frequency || '0');

    // Parse conversions from actions
    let conversions = 0;
    let conversionsValue = 0;
    
    if (insights.actions) {
      const purchaseAction = insights.actions.find((a: any) => 
        a.action_type === 'purchase' || a.action_type === 'omni_purchase'
      );
      const leadAction = insights.actions.find((a: any) => 
        a.action_type === 'lead' || a.action_type === 'complete_registration'
      );
      
      conversions = parseInt(purchaseAction?.value || leadAction?.value || '0', 10);
    }

    // Parse ROAS
    let roas = 0;
    if (insights.purchase_roas) {
      roas = parseFloat(insights.purchase_roas[0]?.value || '0');
    }

    // Calculate CPA
    const cpa = conversions > 0 ? spend / conversions : 0;

    // Fetch campaigns
    const campaignsUrl = new URL(`https://graph.facebook.com/v21.0/act_${ad_account_id}/campaigns`);
    campaignsUrl.searchParams.set('access_token', access_token);
    campaignsUrl.searchParams.set('fields', 'id,name,status,objective,insights.date_preset(' + datePreset + '){spend,impressions,clicks,cpc,ctr,actions,purchase_roas}');
    campaignsUrl.searchParams.set('limit', '50');

    console.log('[meta-ads-metrics] Fetching campaigns...');
    const campaignsResponse = await fetch(campaignsUrl.toString());
    const campaignsData = await campaignsResponse.json();

    if (campaignsData.error) {
      console.error('[meta-ads-metrics] Campaigns API error:', campaignsData.error);
    }

    const campaigns = (campaignsData.data || [])
      .filter((c: any) => c.insights?.data?.[0])
      .map((c: any) => {
        const cInsights = c.insights.data[0];
        const cSpend = parseFloat(cInsights.spend || '0');
        const cClicks = parseInt(cInsights.clicks || '0', 10);
        const cImpressions = parseInt(cInsights.impressions || '0', 10);
        
        let cConversions = 0;
        if (cInsights.actions) {
          const purchaseAction = cInsights.actions.find((a: any) => 
            a.action_type === 'purchase' || a.action_type === 'omni_purchase'
          );
          const leadAction = cInsights.actions.find((a: any) => 
            a.action_type === 'lead' || a.action_type === 'complete_registration'
          );
          cConversions = parseInt(purchaseAction?.value || leadAction?.value || '0', 10);
        }

        let cRoas = 0;
        if (cInsights.purchase_roas) {
          cRoas = parseFloat(cInsights.purchase_roas[0]?.value || '0');
        }

        return {
          id: c.id,
          name: c.name,
          status: c.status,
          objective: c.objective,
          spend: cSpend,
          impressions: cImpressions,
          clicks: cClicks,
          cpc: parseFloat(cInsights.cpc || '0'),
          ctr: parseFloat(cInsights.ctr || '0'),
          conversions: cConversions,
          roas: cRoas,
          cpa: cConversions > 0 ? cSpend / cConversions : 0,
        };
      })
      .sort((a: any, b: any) => b.spend - a.spend);

    const metrics = {
      spend,
      impressions,
      reach,
      clicks,
      cpc,
      cpm,
      ctr,
      frequency,
      conversions,
      conversionsValue,
      roas,
      cpa,
    };

    console.log('[meta-ads-metrics] Success:', { spend, impressions, clicks, campaignCount: campaigns.length });

    return new Response(JSON.stringify({
      configured: true,
      metrics,
      campaigns,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[meta-ads-metrics] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
