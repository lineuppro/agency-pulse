import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * This edge function handles two operations:
 * 1. "exchange" - Exchanges a short-lived token for a long-lived one (60 days)
 * 2. "refresh" - Refreshes all tokens that are expiring within 7 days
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
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
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const META_APP_ID = Deno.env.get('META_APP_ID');
    const META_APP_SECRET = Deno.env.get('META_APP_SECRET');

    if (!META_APP_ID || !META_APP_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Meta App credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action, clientId, accessToken } = body;

    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'exchange') {
      // Exchange short-lived token for long-lived token
      if (!accessToken) {
        return new Response(
          JSON.stringify({ error: 'accessToken is required for exchange' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Exchanging short-lived token for long-lived token...');

      const url = new URL('https://graph.facebook.com/v22.0/oauth/access_token');
      url.searchParams.set('grant_type', 'fb_exchange_token');
      url.searchParams.set('client_id', META_APP_ID);
      url.searchParams.set('client_secret', META_APP_SECRET);
      url.searchParams.set('fb_exchange_token', accessToken);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (!response.ok || data.error) {
        console.error('Token exchange failed:', data);
        // If exchange fails, return the original token (it might already be long-lived)
        return new Response(
          JSON.stringify({
            success: true,
            longLivedToken: accessToken,
            expiresAt: null,
            exchanged: false,
            message: 'Token exchange failed - using original token. It may already be long-lived or invalid for exchange.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const longLivedToken = data.access_token;
      const expiresIn = data.expires_in; // seconds
      const expiresAt = expiresIn
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : null;

      console.log(`Token exchanged successfully. Expires in ${expiresIn} seconds.`);

      // If clientId provided, update the stored token
      if (clientId) {
        const { error: updateError } = await supabase
          .from('client_meta_ads')
          .update({
            access_token: longLivedToken,
            token_expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('client_id', clientId);

        if (updateError) {
          console.error('Failed to update stored token:', updateError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          longLivedToken,
          expiresAt,
          exchanged: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'refresh') {
      // Refresh all tokens expiring within 7 days
      console.log('Checking for tokens that need refresh...');

      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: expiringConnections, error: fetchError } = await supabase
        .from('client_meta_ads')
        .select('id, client_id, access_token, ad_account_name, token_expires_at')
        .not('token_expires_at', 'is', null)
        .lt('token_expires_at', sevenDaysFromNow);

      if (fetchError) {
        throw new Error(`Failed to fetch expiring connections: ${fetchError.message}`);
      }

      if (!expiringConnections || expiringConnections.length === 0) {
        return new Response(
          JSON.stringify({ success: true, refreshed: 0, message: 'No tokens need refreshing.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Found ${expiringConnections.length} tokens to refresh.`);

      let refreshed = 0;
      const results: Array<{ clientId: string; accountName: string | null; success: boolean; error?: string }> = [];

      for (const conn of expiringConnections) {
        try {
          const url = new URL('https://graph.facebook.com/v22.0/oauth/access_token');
          url.searchParams.set('grant_type', 'fb_exchange_token');
          url.searchParams.set('client_id', META_APP_ID);
          url.searchParams.set('client_secret', META_APP_SECRET);
          url.searchParams.set('fb_exchange_token', conn.access_token);

          const response = await fetch(url.toString());
          const data = await response.json();

          if (!response.ok || data.error) {
            results.push({
              clientId: conn.client_id,
              accountName: conn.ad_account_name,
              success: false,
              error: data.error?.message || 'Exchange failed',
            });
            continue;
          }

          const expiresIn = data.expires_in;
          const expiresAt = expiresIn
            ? new Date(Date.now() + expiresIn * 1000).toISOString()
            : null;

          await supabase
            .from('client_meta_ads')
            .update({
              access_token: data.access_token,
              token_expires_at: expiresAt,
              updated_at: new Date().toISOString(),
            })
            .eq('id', conn.id);

          refreshed++;
          results.push({
            clientId: conn.client_id,
            accountName: conn.ad_account_name,
            success: true,
          });
        } catch (err) {
          results.push({
            clientId: conn.client_id,
            accountName: conn.ad_account_name,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true, refreshed, total: expiringConnections.length, results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'check') {
      // Check token status for a specific client
      if (!clientId) {
        return new Response(
          JSON.stringify({ error: 'clientId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: conn, error: connError } = await supabase
        .from('client_meta_ads')
        .select('access_token, token_expires_at, ad_account_id')
        .eq('client_id', clientId)
        .single();

      if (connError || !conn) {
        return new Response(
          JSON.stringify({ error: 'Connection not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Test token validity with a simple API call
      const testUrl = `https://graph.facebook.com/v22.0/me?access_token=${conn.access_token}`;
      const testResponse = await fetch(testUrl);
      const testData = await testResponse.json();

      const isValid = testResponse.ok && !testData.error;

      return new Response(
        JSON.stringify({
          success: true,
          isValid,
          expiresAt: conn.token_expires_at,
          error: testData.error?.message || null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "exchange", "refresh", or "check".' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('meta-token-refresh error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
