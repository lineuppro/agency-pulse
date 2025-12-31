import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAccessToken(): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');

  console.log('Checking OAuth credentials...', {
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    hasRefreshToken: !!refreshToken,
    refreshTokenLength: refreshToken?.length || 0,
  });

  if (!clientId || !clientSecret || !refreshToken) {
    const missing = [];
    if (!clientId) missing.push('GOOGLE_CLIENT_ID');
    if (!clientSecret) missing.push('GOOGLE_CLIENT_SECRET');
    if (!refreshToken) missing.push('GOOGLE_REFRESH_TOKEN');
    throw new Error(`Missing Google OAuth credentials: ${missing.join(', ')}`);
  }

  console.log('Requesting access token from Google...');
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

  const responseText = await response.text();
  console.log('Token refresh response status:', response.status);

  if (!response.ok) {
    console.error('Token refresh error response:', responseText);
    // Try to parse for more specific error
    try {
      const errorData = JSON.parse(responseText);
      throw new Error(`Token refresh failed: ${errorData.error} - ${errorData.error_description || 'No description'}`);
    } catch (parseError) {
      throw new Error(`Token refresh failed (${response.status}): ${responseText.substring(0, 200)}`);
    }
  }

  const data = JSON.parse(responseText);
  console.log('Access token obtained successfully');
  return data.access_token;
}

async function fetchGoogleAdsMetrics(customerId: string, accessToken: string, dateRange: string) {
  const developerToken = Deno.env.get('GOOGLE_DEVELOPER_TOKEN');
  
  if (!developerToken) {
    throw new Error('Missing Google Developer Token');
  }

  // Remove hyphens from customer ID
  const cleanCustomerId = customerId.replace(/-/g, '');
  
  // Define date range
  let dateCondition: string;
  switch (dateRange) {
    case 'TODAY':
      dateCondition = "segments.date DURING TODAY";
      break;
    case 'YESTERDAY':
      dateCondition = "segments.date DURING YESTERDAY";
      break;
    case 'LAST_7_DAYS':
      dateCondition = "segments.date DURING LAST_7_DAYS";
      break;
    case 'LAST_30_DAYS':
      dateCondition = "segments.date DURING LAST_30_DAYS";
      break;
    case 'THIS_MONTH':
      dateCondition = "segments.date DURING THIS_MONTH";
      break;
    default:
      dateCondition = "segments.date DURING LAST_30_DAYS";
  }

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
    WHERE ${dateCondition}
  `;

  console.log('Fetching Google Ads metrics for customer:', cleanCustomerId);
  console.log('Query:', query);

  const response = await fetch(
    `https://googleads.googleapis.com/v18/customers/${cleanCustomerId}/googleAds:searchStream`,
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
    console.error('Google Ads API error:', { status: response.status, body: errorText });
    // Try to parse for more specific error
    try {
      const errorData = JSON.parse(errorText);
      const details = errorData.error?.details?.[0]?.errors?.[0]?.message || 
                      errorData.error?.message || 
                      errorText.substring(0, 300);
      throw new Error(`Google Ads API error (${response.status}): ${details}`);
    } catch (parseError) {
      throw new Error(`Google Ads API error (${response.status}): ${errorText.substring(0, 300)}`);
    }
  }

  const data = await response.json();
  console.log('Google Ads API response:', JSON.stringify(data));
  
  // Parse and aggregate metrics
  let totalCostMicros = 0;
  let totalConversions = 0;
  let totalConversionsValue = 0;
  let totalClicks = 0;
  let totalImpressions = 0;

  if (data && Array.isArray(data)) {
    for (const batch of data) {
      if (batch.results) {
        for (const result of batch.results) {
          const metrics = result.metrics || {};
          totalCostMicros += parseInt(metrics.costMicros || '0', 10);
          totalConversions += parseFloat(metrics.conversions || '0');
          totalConversionsValue += parseFloat(metrics.conversionsValue || '0');
          totalClicks += parseInt(metrics.clicks || '0', 10);
          totalImpressions += parseInt(metrics.impressions || '0', 10);
        }
      }
    }
  }

  const totalSpend = totalCostMicros / 1_000_000; // Convert micros to currency
  const roas = totalSpend > 0 ? (totalConversionsValue / totalSpend) : 0;
  const cpa = totalConversions > 0 ? (totalSpend / totalConversions) : 0;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCpc = totalClicks > 0 ? (totalSpend / totalClicks) : 0;

  return {
    spend: totalSpend,
    conversions: totalConversions,
    conversionsValue: totalConversionsValue,
    clicks: totalClicks,
    impressions: totalImpressions,
    roas: roas,
    cpa: cpa,
    ctr: ctr,
    avgCpc: avgCpc,
  };
}

serve(async (req) => {
  console.log('=== google-ads-metrics function invoked ===');
  console.log('Method:', req.method);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { clientId, dateRange = 'LAST_30_DAYS' } = body;
    console.log('Request body:', { clientId, dateRange });

    if (!clientId) {
      console.error('Missing clientId in request');
      return new Response(
        JSON.stringify({ error: 'Client ID is required', details: 'clientId parameter is missing from request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client's Google Ads ID from database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('google_ads_id, name')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('Client fetch error:', clientError);
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!client.google_ads_id) {
      return new Response(
        JSON.stringify({ error: 'Client has no Google Ads ID configured', clientName: client.name }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching metrics for client: ${client.name} (${client.google_ads_id})`);

    // Get access token
    const accessToken = await getAccessToken();
    
    // Fetch metrics from Google Ads API
    const metrics = await fetchGoogleAdsMetrics(client.google_ads_id, accessToken, dateRange);

    return new Response(
      JSON.stringify({ 
        success: true, 
        clientName: client.name,
        dateRange,
        metrics 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('Error stack:', stack);
    return new Response(
      JSON.stringify({ error: message, details: stack?.substring(0, 500) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
