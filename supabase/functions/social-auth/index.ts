import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InitRequest {
  action: "init";
  clientId: string;
  redirectUrl: string;
}

interface CallbackRequest {
  action: "callback";
  code: string;
  clientId: string;
  redirectUrl: string;
}

interface SelectPageRequest {
  action: "select-page";
  clientId: string;
  accessToken: string;
  pageId: string;
  pageName: string;
  instagramAccountId?: string;
  instagramUsername?: string;
}

interface DisconnectRequest {
  action: "disconnect";
  clientId: string;
  platform: string;
}

type RequestBody = InitRequest | CallbackRequest | SelectPageRequest | DisconnectRequest;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const META_APP_ID = Deno.env.get("META_APP_ID");
    const META_APP_SECRET = Deno.env.get("META_APP_SECRET");

    if (!META_APP_ID || !META_APP_SECRET) {
      console.error("Missing META_APP_ID or META_APP_SECRET");
      return new Response(
        JSON.stringify({ error: "Meta App not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json();
    console.log(`[social-auth] Action: ${body.action}`);

    // =====================
    // ACTION: INIT - Generate OAuth URL
    // =====================
    if (body.action === "init") {
      const { clientId, redirectUrl } = body as InitRequest;

      if (!clientId || !redirectUrl) {
        return new Response(
          JSON.stringify({ error: "Missing clientId or redirectUrl" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Permissions needed for posting
      const scopes = [
        "pages_manage_posts",
        "pages_read_engagement",
        "instagram_basic",
        "instagram_content_publish",
        "business_management",
      ].join(",");

      // State contains clientId and redirect URL for callback
      const state = JSON.stringify({ clientId, redirectUrl });
      const encodedState = encodeURIComponent(btoa(state));

      const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
        `client_id=${META_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
        `&scope=${scopes}` +
        `&state=${encodedState}` +
        `&response_type=code`;

      console.log(`[social-auth] Generated OAuth URL for client ${clientId}`);

      return new Response(
        JSON.stringify({ url: oauthUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================
    // ACTION: CALLBACK - Exchange code for token
    // =====================
    if (body.action === "callback") {
      const { code, clientId, redirectUrl } = body as CallbackRequest;

      if (!code || !clientId) {
        return new Response(
          JSON.stringify({ error: "Missing code or clientId" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[social-auth] Processing callback for client ${clientId}`);

      // Exchange code for access token
      const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` +
        `client_id=${META_APP_ID}` +
        `&client_secret=${META_APP_SECRET}` +
        `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
        `&code=${code}`;

      const tokenResponse = await fetch(tokenUrl);
      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error("[social-auth] Token exchange error:", tokenData.error);
        return new Response(
          JSON.stringify({ error: tokenData.error.message || "Failed to exchange code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const shortLivedToken = tokenData.access_token;
      console.log("[social-auth] Got short-lived token");

      // Exchange for long-lived token
      const longLivedUrl = `https://graph.facebook.com/v19.0/oauth/access_token?` +
        `grant_type=fb_exchange_token` +
        `&client_id=${META_APP_ID}` +
        `&client_secret=${META_APP_SECRET}` +
        `&fb_exchange_token=${shortLivedToken}`;

      const longLivedResponse = await fetch(longLivedUrl);
      const longLivedData = await longLivedResponse.json();

      if (longLivedData.error) {
        console.error("[social-auth] Long-lived token error:", longLivedData.error);
        return new Response(
          JSON.stringify({ error: longLivedData.error.message || "Failed to get long-lived token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const accessToken = longLivedData.access_token;
      const expiresIn = longLivedData.expires_in || 5184000; // 60 days default
      console.log(`[social-auth] Got long-lived token, expires in ${expiresIn}s`);

      // Get user's pages
      const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?` +
        `fields=id,name,access_token,instagram_business_account{id,username}` +
        `&access_token=${accessToken}`;

      const pagesResponse = await fetch(pagesUrl);
      const pagesData = await pagesResponse.json();

      if (pagesData.error) {
        console.error("[social-auth] Pages fetch error:", pagesData.error);
        return new Response(
          JSON.stringify({ error: pagesData.error.message || "Failed to fetch pages" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const pages = pagesData.data || [];
      console.log(`[social-auth] Found ${pages.length} pages`);

      if (pages.length === 0) {
        return new Response(
          JSON.stringify({ error: "No Facebook pages found. Please create a Facebook page first." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If only one page, save it directly
      if (pages.length === 1) {
        const page = pages[0];
        const pageAccessToken = page.access_token;
        const instagramAccount = page.instagram_business_account;

        // Calculate token expiration
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        // Save Facebook connection
        const { error: fbError } = await supabase
          .from("social_connections")
          .upsert({
            client_id: clientId,
            platform: "facebook",
            access_token: pageAccessToken,
            token_expires_at: expiresAt,
            platform_user_id: page.id,
            platform_username: page.name,
            page_id: page.id,
            page_name: page.name,
          }, { onConflict: "client_id,platform" });

        if (fbError) {
          console.error("[social-auth] Error saving Facebook connection:", fbError);
        } else {
          console.log(`[social-auth] Saved Facebook connection for page ${page.name}`);
        }

        // Save Instagram connection if available
        if (instagramAccount) {
          const { error: igError } = await supabase
            .from("social_connections")
            .upsert({
              client_id: clientId,
              platform: "instagram",
              access_token: pageAccessToken, // Same token for Instagram
              token_expires_at: expiresAt,
              platform_user_id: instagramAccount.id,
              platform_username: instagramAccount.username,
              page_id: page.id, // Link to Facebook page
              page_name: page.name,
            }, { onConflict: "client_id,platform" });

          if (igError) {
            console.error("[social-auth] Error saving Instagram connection:", igError);
          } else {
            console.log(`[social-auth] Saved Instagram connection for @${instagramAccount.username}`);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "Connected successfully",
            facebook: { id: page.id, name: page.name },
            instagram: instagramAccount ? { id: instagramAccount.id, username: instagramAccount.username } : null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Multiple pages - return list for selection
      const pagesForSelection = pages.map((page: any) => ({
        id: page.id,
        name: page.name,
        accessToken: page.access_token,
        instagram: page.instagram_business_account
          ? {
              id: page.instagram_business_account.id,
              username: page.instagram_business_account.username,
            }
          : null,
      }));

      return new Response(
        JSON.stringify({
          requiresSelection: true,
          pages: pagesForSelection,
          expiresIn,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================
    // ACTION: SELECT-PAGE - Save selected page
    // =====================
    if (body.action === "select-page") {
      const { clientId, accessToken, pageId, pageName, instagramAccountId, instagramUsername } =
        body as SelectPageRequest;

      if (!clientId || !accessToken || !pageId) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[social-auth] Saving selected page ${pageName} for client ${clientId}`);

      const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days

      // Save Facebook connection
      const { error: fbError } = await supabase
        .from("social_connections")
        .upsert({
          client_id: clientId,
          platform: "facebook",
          access_token: accessToken,
          token_expires_at: expiresAt,
          platform_user_id: pageId,
          platform_username: pageName,
          page_id: pageId,
          page_name: pageName,
        }, { onConflict: "client_id,platform" });

      if (fbError) {
        console.error("[social-auth] Error saving Facebook connection:", fbError);
        return new Response(
          JSON.stringify({ error: "Failed to save Facebook connection" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Save Instagram connection if available
      if (instagramAccountId && instagramUsername) {
        const { error: igError } = await supabase
          .from("social_connections")
          .upsert({
            client_id: clientId,
            platform: "instagram",
            access_token: accessToken,
            token_expires_at: expiresAt,
            platform_user_id: instagramAccountId,
            platform_username: instagramUsername,
            page_id: pageId,
            page_name: pageName,
          }, { onConflict: "client_id,platform" });

        if (igError) {
          console.error("[social-auth] Error saving Instagram connection:", igError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Page connected successfully",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =====================
    // ACTION: DISCONNECT - Remove connection
    // =====================
    if (body.action === "disconnect") {
      const { clientId, platform } = body as DisconnectRequest;

      if (!clientId || !platform) {
        return new Response(
          JSON.stringify({ error: "Missing clientId or platform" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[social-auth] Disconnecting ${platform} for client ${clientId}`);

      const { error } = await supabase
        .from("social_connections")
        .delete()
        .eq("client_id", clientId)
        .eq("platform", platform);

      if (error) {
        console.error("[social-auth] Error disconnecting:", error);
        return new Response(
          JSON.stringify({ error: "Failed to disconnect" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[social-auth] Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
