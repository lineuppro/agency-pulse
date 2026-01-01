import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

async function refreshAccessToken(): Promise<string> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google OAuth credentials not configured');
  }

  console.log('Refreshing Google access token for Drive...');

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
    const errorText = await response.text();
    console.error('Token refresh error:', errorText);
    throw new Error(`Failed to refresh token: ${errorText}`);
  }

  const data: TokenResponse = await response.json();
  console.log('Access token refreshed successfully');
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Manual authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No Authorization header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Validate user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError?.message);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Authenticated user:', user.id);

    const { clientId, action, fileId } = await req.json();

    if (!clientId) {
      return new Response(JSON.stringify({ error: 'Client ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get client's Google Drive folder ID
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('google_drive_id, name')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('Client error:', clientError);
      return new Response(JSON.stringify({ error: 'Client not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!client.google_drive_id) {
      return new Response(JSON.stringify({ 
        error: 'Google Drive folder not configured for this client',
        files: [] 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Client:', client.name, 'Drive folder:', client.google_drive_id);

    // Get fresh access token
    const accessToken = await refreshAccessToken();

    if (action === 'getContent' && fileId) {
      // Get file content (export as text for Google Docs)
      console.log('Getting content for file:', fileId);
      
      // First get file metadata to determine type
      const metaResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=mimeType,name`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      );

      if (!metaResponse.ok) {
        const errorText = await metaResponse.text();
        console.error('File metadata error:', errorText);
        return new Response(JSON.stringify({ error: 'Failed to get file metadata' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const fileMeta = await metaResponse.json();
      console.log('File metadata:', fileMeta);

      let content = '';

      if (fileMeta.mimeType === 'application/vnd.google-apps.document') {
        // Export Google Doc as plain text
        const exportResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          }
        );
        
        if (exportResponse.ok) {
          content = await exportResponse.text();
        }
      } else if (fileMeta.mimeType === 'application/vnd.google-apps.spreadsheet') {
        // Export Google Sheet as CSV
        const exportResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          }
        );
        
        if (exportResponse.ok) {
          content = await exportResponse.text();
        }
      } else if (fileMeta.mimeType?.startsWith('text/')) {
        // Download text files directly
        const downloadResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          {
            headers: { 'Authorization': `Bearer ${accessToken}` },
          }
        );
        
        if (downloadResponse.ok) {
          content = await downloadResponse.text();
        }
      }

      return new Response(JSON.stringify({ 
        content,
        filename: fileMeta.name,
        mimeType: fileMeta.mimeType 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // List files in the folder
    console.log('Listing files in folder:', client.google_drive_id);
    
    const listResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${client.google_drive_id}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,modifiedTime,size,webViewLink)&orderBy=modifiedTime+desc&pageSize=50`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error('Drive API error:', listResponse.status, errorText);
      return new Response(JSON.stringify({ error: 'Failed to list files from Drive' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const listData = await listResponse.json();
    console.log('Found', listData.files?.length || 0, 'files');

    return new Response(JSON.stringify({ 
      files: listData.files || [],
      clientName: client.name 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('google-drive-files error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
