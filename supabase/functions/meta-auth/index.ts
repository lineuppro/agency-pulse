import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const META_APP_ID = Deno.env.get('META_APP_ID')!;
const META_APP_SECRET = Deno.env.get('META_APP_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface PageInfo {
  id: string;
  name: string;
  access_token: string;
  instagram_account_id?: string;
  instagram_username?: string;
}

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

    // User client for auth validation
    const userSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service role client for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate token using getUser
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      console.error('[meta-auth] Auth validation failed:', authError?.message);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[meta-auth] User authenticated:', user.id);

    const body = await req.json();
    const { action, clientId, code, redirectUri, selectedPageId, userAccessToken } = body;
    console.log('[meta-auth] Action:', action, 'ClientId:', clientId);

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

      console.log('[meta-auth] Generated auth URL');
      return new Response(JSON.stringify({ authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'exchange-code') {
      console.log('[meta-auth] Exchanging code for token...');
      
      // Exchange authorization code for access token
      const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${META_APP_SECRET}&code=${code}`;

      const tokenResponse = await fetch(tokenUrl);
      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error('[meta-auth] Token exchange error:', tokenData.error);
        return new Response(JSON.stringify({ error: tokenData.error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get long-lived token
      const longLivedUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`;

      const longLivedResponse = await fetch(longLivedUrl);
      const longLivedData = await longLivedResponse.json();

      const userToken = longLivedData.access_token || tokenData.access_token;
      const expiresIn = longLivedData.expires_in || tokenData.expires_in || 5184000;

      console.log('[meta-auth] Got long-lived token, expires in:', expiresIn);

      // Get user's pages
      const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${userToken}&fields=id,name,access_token`;
      const pagesResponse = await fetch(pagesUrl);
      const pagesData = await pagesResponse.json();

      console.log('[meta-auth] Found pages:', pagesData.data?.length || 0);

      if (!pagesData.data || pagesData.data.length === 0) {
        return new Response(JSON.stringify({ 
          error: 'Nenhuma página encontrada. Certifique-se de ter uma página do Facebook vinculada.' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // If multiple pages, return list for selection
      if (pagesData.data.length > 1) {
        const pages: PageInfo[] = [];
        
        for (const page of pagesData.data) {
          const pageInfo: PageInfo = {
            id: page.id,
            name: page.name,
            access_token: page.access_token,
          };

          // Try to get Instagram account for each page
          try {
            const igUrl = `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`;
            const igResponse = await fetch(igUrl);
            const igData = await igResponse.json();

            if (igData.instagram_business_account) {
              const igAccountId = igData.instagram_business_account.id;
              const igUserUrl = `https://graph.facebook.com/v21.0/${igAccountId}?fields=username&access_token=${page.access_token}`;
              const igUserResponse = await fetch(igUserUrl);
              const igUserData = await igUserResponse.json();

              pageInfo.instagram_account_id = igAccountId;
              pageInfo.instagram_username = igUserData.username;
            }
          } catch (e) {
            console.log('[meta-auth] Could not fetch IG for page:', page.id);
          }

          pages.push(pageInfo);
        }

        console.log('[meta-auth] Multiple pages found, returning for selection');
        return new Response(JSON.stringify({ 
          requiresSelection: true,
          pages,
          userAccessToken: userToken,
          expiresIn,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Single page - connect directly
      const page = pagesData.data[0];
      return await connectPage(supabase, clientId, page, userToken, expiresIn);
    }

    if (action === 'select-page') {
      console.log('[meta-auth] Selecting page:', selectedPageId);
      
      // Get page details
      const pageUrl = `https://graph.facebook.com/v21.0/${selectedPageId}?fields=id,name,access_token&access_token=${userAccessToken}`;
      const pageResponse = await fetch(pageUrl);
      const page = await pageResponse.json();

      if (page.error) {
        console.error('[meta-auth] Page fetch error:', page.error);
        return new Response(JSON.stringify({ error: page.error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get page access token from accounts list
      const pagesUrl = `https://graph.facebook.com/v21.0/me/accounts?access_token=${userAccessToken}`;
      const pagesResponse = await fetch(pagesUrl);
      const pagesData = await pagesResponse.json();
      
      const selectedPage = pagesData.data?.find((p: any) => p.id === selectedPageId);
      if (!selectedPage) {
        return new Response(JSON.stringify({ error: 'Página não encontrada' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return await connectPage(supabase, clientId, selectedPage, userAccessToken, 5184000);
    }

    if (action === 'disconnect') {
      console.log('[meta-auth] Disconnecting client:', clientId);
      
      const { error: deleteConnError } = await supabase
        .from('meta_connections')
        .delete()
        .eq('client_id', clientId);

      if (deleteConnError) {
        console.error('[meta-auth] Delete connection error:', deleteConnError);
      }

      const { error: deleteAdsError } = await supabase
        .from('client_meta_ads')
        .delete()
        .eq('client_id', clientId);

      if (deleteAdsError) {
        console.error('[meta-auth] Delete ads config error:', deleteAdsError);
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
    console.error('[meta-auth] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function connectPage(supabase: any, clientId: string, page: any, userToken: string, expiresIn: number) {
  const pageAccessToken = page.access_token;
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  let instagramAccountId = null;
  let instagramUsername = null;

  // Get Instagram Business Account
  try {
    const igUrl = `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${pageAccessToken}`;
    const igResponse = await fetch(igUrl);
    const igData = await igResponse.json();

    if (igData.instagram_business_account) {
      instagramAccountId = igData.instagram_business_account.id;

      const igUserUrl = `https://graph.facebook.com/v21.0/${instagramAccountId}?fields=username&access_token=${pageAccessToken}`;
      const igUserResponse = await fetch(igUserUrl);
      const igUserData = await igUserResponse.json();
      instagramUsername = igUserData.username;
    }
  } catch (e) {
    console.log('[meta-auth] Could not fetch Instagram account:', e);
  }

  console.log('[meta-auth] Saving connection:', {
    pageId: page.id,
    pageName: page.name,
    instagramAccountId,
    instagramUsername,
  });

  // Save to meta_connections
  const { error: upsertError } = await supabase
    .from('meta_connections')
    .upsert({
      client_id: clientId,
      facebook_page_id: page.id,
      facebook_page_name: page.name,
      instagram_account_id: instagramAccountId,
      instagram_username: instagramUsername,
      access_token: pageAccessToken,
      token_expires_at: tokenExpiresAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client_id' });

  if (upsertError) {
    console.error('[meta-auth] Connection upsert error:', upsertError);
    return new Response(JSON.stringify({ error: 'Failed to save connection' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Try to get Ad Accounts and save to client_meta_ads
  try {
    const adAccountsUrl = `https://graph.facebook.com/v21.0/me/adaccounts?access_token=${userToken}&fields=id,name,account_status`;
    const adAccountsResponse = await fetch(adAccountsUrl);
    const adAccountsData = await adAccountsResponse.json();

    console.log('[meta-auth] Found ad accounts:', adAccountsData.data?.length || 0);

    if (adAccountsData.data && adAccountsData.data.length > 0) {
      // Get the first active ad account
      const activeAccount = adAccountsData.data.find((acc: any) => acc.account_status === 1) || adAccountsData.data[0];
      
      // Ad account ID comes as "act_123456", we need just "123456"
      const adAccountId = activeAccount.id.replace('act_', '');

      console.log('[meta-auth] Saving ad account:', {
        adAccountId,
        adAccountName: activeAccount.name,
      });

      const { error: adsUpsertError } = await supabase
        .from('client_meta_ads')
        .upsert({
          client_id: clientId,
          ad_account_id: adAccountId,
          ad_account_name: activeAccount.name,
          access_token: userToken,
          token_expires_at: tokenExpiresAt,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'client_id' });

      if (adsUpsertError) {
        console.error('[meta-auth] Ads config upsert error:', adsUpsertError);
      } else {
        console.log('[meta-auth] Ad account saved successfully');
      }
    }
  } catch (e) {
    console.log('[meta-auth] Could not fetch ad accounts:', e);
  }

  return new Response(JSON.stringify({
    success: true,
    connection: {
      facebookPageName: page.name,
      instagramUsername,
    },
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
