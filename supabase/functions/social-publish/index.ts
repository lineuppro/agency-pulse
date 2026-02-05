import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PublishRequest {
  postId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { postId } = await req.json() as PublishRequest;

    if (!postId) {
      return new Response(
        JSON.stringify({ error: 'postId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Publishing post: ${postId}`);

    // Fetch the scheduled post
    const { data: post, error: postError } = await supabase
      .from('social_scheduled_posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      console.error('Post not found:', postError);
      return new Response(
        JSON.stringify({ error: 'Post not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to publishing
    await supabase
      .from('social_scheduled_posts')
      .update({ status: 'publishing' })
      .eq('id', postId);

    // Fetch the social connection for this client and platform
    const { data: connection, error: connectionError } = await supabase
      .from('social_connections')
      .select('*')
      .eq('client_id', post.client_id)
      .eq('platform', post.platform)
      .single();

    if (connectionError || !connection) {
      console.error('Connection not found:', connectionError);
      await supabase
        .from('social_scheduled_posts')
        .update({ 
          status: 'failed', 
          error_message: 'Conexão com a plataforma não encontrada' 
        })
        .eq('id', postId);
      return new Response(
        JSON.stringify({ error: 'Social connection not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = connection.access_token;
    const mediaUrls = (post.media_urls as string[]) || [];
    const caption = post.caption || '';
    const hashtags = (post.hashtags as string[]) || [];
    const fullCaption = hashtags.length > 0 
      ? `${caption}\n\n${hashtags.join(' ')}`
      : caption;

    let platformPostId: string | null = null;

    try {
      if (post.platform === 'instagram') {
        // Instagram publishing flow (2-step process)
        if (!connection.platform_user_id) {
          throw new Error('Instagram account ID not found');
        }

        const instagramAccountId = connection.platform_user_id;

        // Step 1: Create media container
        console.log('Creating Instagram media container...');
        const containerResponse = await fetch(
          `https://graph.facebook.com/v19.0/${instagramAccountId}/media`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url: mediaUrls[0], // For now, single image
              caption: fullCaption,
              access_token: accessToken,
            }),
          }
        );

        const containerData = await containerResponse.json();
        console.log('Container response:', containerData);

        if (containerData.error) {
          throw new Error(containerData.error.message);
        }

        const containerId = containerData.id;

        // Wait a bit for media to process
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Step 2: Publish the container
        console.log('Publishing Instagram media...');
        const publishResponse = await fetch(
          `https://graph.facebook.com/v19.0/${instagramAccountId}/media_publish`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              creation_id: containerId,
              access_token: accessToken,
            }),
          }
        );

        const publishData = await publishResponse.json();
        console.log('Publish response:', publishData);

        if (publishData.error) {
          throw new Error(publishData.error.message);
        }

        platformPostId = publishData.id;

      } else if (post.platform === 'facebook') {
        // Facebook publishing flow
        if (!connection.page_id) {
          throw new Error('Facebook page ID not found');
        }

        const pageId = connection.page_id;

        // Post to Facebook page
        console.log('Publishing to Facebook...');
        const response = await fetch(
          `https://graph.facebook.com/v19.0/${pageId}/photos`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: mediaUrls[0],
              message: fullCaption,
              access_token: accessToken,
            }),
          }
        );

        const data = await response.json();
        console.log('Facebook response:', data);

        if (data.error) {
          throw new Error(data.error.message);
        }

        platformPostId = data.post_id || data.id;
      }

      // Update post as published
      await supabase
        .from('social_scheduled_posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          platform_post_id: platformPostId,
          error_message: null,
        })
        .eq('id', postId);

      console.log(`Post ${postId} published successfully!`);

      return new Response(
        JSON.stringify({ success: true, platformPostId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (publishError: any) {
      console.error('Error publishing:', publishError);

      // Update post as failed
      await supabase
        .from('social_scheduled_posts')
        .update({
          status: 'failed',
          error_message: publishError.message || 'Erro ao publicar',
        })
        .eq('id', postId);

      return new Response(
        JSON.stringify({ error: publishError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Error in social-publish:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
