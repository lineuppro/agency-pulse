import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all scheduled posts whose scheduled_at is in the past and status is 'scheduled'
    const now = new Date().toISOString();
    console.log(`[social-scheduler] Checking for posts to publish at ${now}`);

    const { data: pendingPosts, error: fetchError } = await supabase
      .from('social_scheduled_posts')
      .select('id, scheduled_at, platform, client_id')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true });

    if (fetchError) {
      console.error('[social-scheduler] Error fetching pending posts:', fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingPosts || pendingPosts.length === 0) {
      console.log('[social-scheduler] No pending posts to publish');
      return new Response(
        JSON.stringify({ message: 'No pending posts', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[social-scheduler] Found ${pendingPosts.length} post(s) to publish`);

    const results: { postId: string; success: boolean; error?: string }[] = [];

    for (const post of pendingPosts) {
      try {
        console.log(`[social-scheduler] Publishing post ${post.id} (${post.platform}) scheduled for ${post.scheduled_at}`);

        // Call the existing social-publish function
        const publishUrl = `${supabaseUrl}/functions/v1/social-publish`;
        const response = await fetch(publishUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ postId: post.id }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error(`[social-scheduler] Failed to publish post ${post.id}:`, data);
          results.push({ postId: post.id, success: false, error: data.error });
        } else {
          console.log(`[social-scheduler] Successfully published post ${post.id}`);
          results.push({ postId: post.id, success: true });
        }
      } catch (err: any) {
        console.error(`[social-scheduler] Error publishing post ${post.id}:`, err);
        results.push({ postId: post.id, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`[social-scheduler] Done. Success: ${successCount}, Failed: ${failCount}`);

    return new Response(
      JSON.stringify({
        processed: results.length,
        success: successCount,
        failed: failCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[social-scheduler] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
