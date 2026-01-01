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
    throw new Error(`Failed to refresh token: ${errorText}`);
  }

  const data: TokenResponse = await response.json();
  return data.access_token;
}

async function getFileContent(accessToken: string, fileId: string, mimeType: string): Promise<string> {
  let content = '';

  if (mimeType === 'application/vnd.google-apps.document') {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    if (response.ok) content = await response.text();
  } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    if (response.ok) content = await response.text();
  } else if (mimeType?.startsWith('text/')) {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    if (response.ok) content = await response.text();
  }

  return content;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Manual authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Validate user is admin
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userRole?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { clientId } = await req.json();

    if (!clientId) {
      return new Response(JSON.stringify({ error: 'Client ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get client's Drive folder
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('google_drive_id, name')
      .eq('id', clientId)
      .single();

    if (clientError || !client?.google_drive_id) {
      return new Response(JSON.stringify({ 
        error: 'Client not found or Drive not configured',
        synced: 0 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Syncing documents for client:', client.name);

    const accessToken = await refreshAccessToken();

    // List files
    const listResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${client.google_drive_id}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,modifiedTime)&pageSize=50`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!listResponse.ok) {
      throw new Error('Failed to list files from Drive');
    }

    const listData = await listResponse.json();
    const files = listData.files || [];
    console.log('Found', files.length, 'files to process');

    let synced = 0;
    let skipped = 0;

    for (const file of files) {
      try {
        // Check if already synced and not modified
        const { data: existing } = await supabaseAdmin
          .from('documents_knowledge')
          .select('id, metadata')
          .eq('client_id', clientId)
          .eq('metadata->>file_id', file.id)
          .single();

        if (existing) {
          const existingModified = existing.metadata?.modifiedTime;
          if (existingModified === file.modifiedTime) {
            console.log('Skipping unchanged file:', file.name);
            skipped++;
            continue;
          }
        }

        // Get file content
        const content = await getFileContent(accessToken, file.id, file.mimeType);
        
        if (!content || content.length < 10) {
          console.log('Skipping file with no content:', file.name);
          skipped++;
          continue;
        }

        // Truncate content if too long (max ~10k chars for reasonable embedding)
        const truncatedContent = content.substring(0, 10000);

        const docData = {
          client_id: clientId,
          content: truncatedContent,
          metadata: {
            file_id: file.id,
            filename: file.name,
            mimeType: file.mimeType,
            modifiedTime: file.modifiedTime,
            synced_at: new Date().toISOString(),
          },
        };

        if (existing) {
          // Update existing
          await supabaseAdmin
            .from('documents_knowledge')
            .update(docData)
            .eq('id', existing.id);
          console.log('Updated document:', file.name);
        } else {
          // Insert new
          await supabaseAdmin
            .from('documents_knowledge')
            .insert(docData);
          console.log('Inserted document:', file.name);
        }

        synced++;
      } catch (fileError) {
        console.error('Error processing file:', file.name, fileError);
        skipped++;
      }
    }

    console.log('Sync complete. Synced:', synced, 'Skipped:', skipped);

    return new Response(JSON.stringify({ 
      success: true,
      synced,
      skipped,
      total: files.length,
      clientName: client.name
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('sync-drive-documents error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
