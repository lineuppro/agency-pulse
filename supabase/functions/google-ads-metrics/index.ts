import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

Deno.serve(async (req) => {
  console.log('=== google-ads-metrics function invoked ===');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message || 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { clientId, dateRange = 'LAST_30_DAYS' } = body;

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'Client ID is required', details: 'clientId parameter is missing from request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch client config with service key
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('google_ads_id, name')
      .eq('id', clientId)
      .maybeSingle();

    if (clientError || !client) {
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

    const accessToken = await getAccessToken();
    const metrics = await fetchGoogleAdsMetrics(client.google_ads_id, accessToken, dateRange);

    return new Response(
      JSON.stringify({
        success: true,
        clientName: client.name,
        dateRange,
        metrics,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('google-ads-metrics error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
