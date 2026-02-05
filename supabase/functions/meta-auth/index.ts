import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_APP_ID = Deno.env.get('META_APP_ID')!;
const META_APP_SECRET = Deno.env.get('META_APP_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate token using getUser instead of getClaims
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth validation failed:', authError?.message);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, clientId, code, redirectUri } = await req.json();

    if (action === 'get-auth-url') {
      // Generate OAuth URL for Meta Login
      const scopes = [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'instagram_basic',
        'instagram_content_publish',
        'ads_read',
        'business_management',
      ].join(',');

      const state = JSON.stringify({ clientId });
      const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}&response_type=code`;

      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'exchange-code') {
      // Exchange authorization code for access token
      const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${META_APP_SECRET}&code=${code}`;

      const tokenResponse = await fetch(tokenUrl);
      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error('Meta token exchange error:', tokenData.error);
        return new Response(JSON.stringify({ error: tokenData.error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get long-lived token
      const longLivedUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`;

      const longLivedResponse = await fetch(longLivedUrl);
      const longLivedData = await longLivedResponse.json();

      const accessToken = longLivedData.access_token || tokenData.access_token;
      const expiresIn = longLivedData.expires_in || tokenData.expires_in || 5184000; // 60 days default

      // Get user's pages
      const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`;
      const pagesResponse = await fetch(pagesUrl);
      const pagesData = await pagesResponse.json();

      let facebookPageId = null;
      let facebookPageName = null;
      let instagramAccountId = null;
      let instagramUsername = null;
      let pageAccessToken = accessToken;

      if (pagesData.data && pagesData.data.length > 0) {
        const page = pagesData.data[0];
        facebookPageId = page.id;
        facebookPageName = page.name;
        pageAccessToken = page.access_token;

        // Get Instagram Business Account linked to the page
        const igUrl = `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${pageAccessToken}`;
        const igResponse = await fetch(igUrl);
        const igData = await igResponse.json();

        if (igData.instagram_business_account) {
          instagramAccountId = igData.instagram_business_account.id;

          // Get Instagram username
          const igUserUrl = `https://graph.facebook.com/v21.0/${instagramAccountId}?fields=username&access_token=${pageAccessToken}`;
          const igUserResponse = await fetch(igUserUrl);
          const igUserData = await igUserResponse.json();
          instagramUsername = igUserData.username;
        }
      }

      const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

      // Store connection in database
      const { error: upsertError } = await supabase
        .from('meta_connections')
        .upsert({
          client_id: clientId,
          facebook_page_id: facebookPageId,
          facebook_page_name: facebookPageName,
          instagram_account_id: instagramAccountId,
          instagram_username: instagramUsername,
          access_token: pageAccessToken,
          token_expires_at: tokenExpiresAt,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'client_id' });

      if (upsertError) {
        console.error('Supabase upsert error:', upsertError);
        return new Response(JSON.stringify({ error: 'Failed to save connection' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        connection: {
          facebookPageName,
          instagramUsername,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'disconnect') {
      const { error: deleteError } = await supabase
        .from('meta_connections')
        .delete()
        .eq('client_id', clientId);

      if (deleteError) {
        return new Response(JSON.stringify({ error: 'Failed to disconnect' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Meta auth error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
