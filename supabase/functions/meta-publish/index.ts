import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userSupabase = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userSupabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { scheduledPostId } = await req.json();

    // Get scheduled post
    const { data: post, error: postError } = await supabase
      .from('scheduled_posts')
      .select('*, meta_connections!inner(*)')
      .eq('id', scheduledPostId)
      .single();

    if (postError || !post) {
      console.error('Post not found:', postError);
      return new Response(JSON.stringify({ error: 'Post not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get meta connection for the client
    const { data: connection, error: connError } = await supabase
      .from('meta_connections')
      .select('*')
      .eq('client_id', post.client_id)
      .single();

    if (connError || !connection) {
      await supabase
        .from('scheduled_posts')
        .update({ status: 'failed', error_message: 'Meta connection not found' })
        .eq('id', scheduledPostId);
      
      return new Response(JSON.stringify({ error: 'Meta connection not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update status to publishing
    await supabase
      .from('scheduled_posts')
      .update({ status: 'publishing' })
      .eq('id', scheduledPostId);

    const accessToken = connection.access_token;
    const mediaUrls = post.media_urls as string[];
    let caption = post.caption || '';
    
    if (post.hashtags && post.hashtags.length > 0) {
      caption += '\n\n' + post.hashtags.join(' ');
    }

    let metaPostId = null;

    try {
      // Publish to Instagram if applicable
      if ((post.platform === 'instagram' || post.platform === 'both') && connection.instagram_account_id) {
        const igAccountId = connection.instagram_account_id;

        if (post.post_type === 'carousel' && mediaUrls.length > 1) {
          // Create carousel container
          const childIds: string[] = [];
          
          for (const url of mediaUrls) {
            const childResponse = await fetch(
              `https://graph.facebook.com/v21.0/${igAccountId}/media`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  image_url: url,
                  is_carousel_item: true,
                  access_token: accessToken,
                }),
              }
            );
            const childData = await childResponse.json();
            if (childData.id) {
              childIds.push(childData.id);
            }
          }

          // Create carousel container
          const carouselResponse = await fetch(
            `https://graph.facebook.com/v21.0/${igAccountId}/media`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                media_type: 'CAROUSEL',
                children: childIds.join(','),
                caption,
                access_token: accessToken,
              }),
            }
          );
          const carouselData = await carouselResponse.json();

          if (carouselData.id) {
            // Publish the carousel
            const publishResponse = await fetch(
              `https://graph.facebook.com/v21.0/${igAccountId}/media_publish`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  creation_id: carouselData.id,
                  access_token: accessToken,
                }),
              }
            );
            const publishData = await publishResponse.json();
            metaPostId = publishData.id;
          }
        } else if (post.post_type === 'video' || post.post_type === 'reel') {
          // Create video/reel container
          const videoUrl = mediaUrls[0];
          const mediaResponse = await fetch(
            `https://graph.facebook.com/v21.0/${igAccountId}/media`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                video_url: videoUrl,
                caption,
                media_type: post.post_type === 'reel' ? 'REELS' : 'VIDEO',
                access_token: accessToken,
              }),
            }
          );
          const mediaData = await mediaResponse.json();

          if (mediaData.id) {
            // Wait for processing and publish
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            const publishResponse = await fetch(
              `https://graph.facebook.com/v21.0/${igAccountId}/media_publish`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  creation_id: mediaData.id,
                  access_token: accessToken,
                }),
              }
            );
            const publishData = await publishResponse.json();
            metaPostId = publishData.id;
          }
        } else {
          // Single image post
          const imageUrl = mediaUrls[0];
          const mediaResponse = await fetch(
            `https://graph.facebook.com/v21.0/${igAccountId}/media`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                image_url: imageUrl,
                caption,
                access_token: accessToken,
              }),
            }
          );
          const mediaData = await mediaResponse.json();

          if (mediaData.error) {
            throw new Error(mediaData.error.message);
          }

          if (mediaData.id) {
            const publishResponse = await fetch(
              `https://graph.facebook.com/v21.0/${igAccountId}/media_publish`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  creation_id: mediaData.id,
                  access_token: accessToken,
                }),
              }
            );
            const publishData = await publishResponse.json();
            
            if (publishData.error) {
              throw new Error(publishData.error.message);
            }
            
            metaPostId = publishData.id;
          }
        }
      }

      // Publish to Facebook if applicable
      if ((post.platform === 'facebook' || post.platform === 'both') && connection.facebook_page_id) {
        const pageId = connection.facebook_page_id;

        if (mediaUrls.length > 0) {
          // Post with photo
          const photoResponse = await fetch(
            `https://graph.facebook.com/v21.0/${pageId}/photos`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: mediaUrls[0],
                message: caption,
                access_token: accessToken,
              }),
            }
          );
          const photoData = await photoResponse.json();
          
          if (photoData.error) {
            throw new Error(photoData.error.message);
          }
          
          if (!metaPostId) {
            metaPostId = photoData.post_id || photoData.id;
          }
        } else {
          // Text-only post
          const postResponse = await fetch(
            `https://graph.facebook.com/v21.0/${pageId}/feed`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                message: caption,
                access_token: accessToken,
              }),
            }
          );
          const postData = await postResponse.json();
          
          if (postData.error) {
            throw new Error(postData.error.message);
          }
          
          if (!metaPostId) {
            metaPostId = postData.id;
          }
        }
      }

      // Update post as published
      await supabase
        .from('scheduled_posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          meta_post_id: metaPostId,
        })
        .eq('id', scheduledPostId);

      console.log('Post published successfully:', metaPostId);

      return new Response(JSON.stringify({ success: true, metaPostId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (publishError) {
      console.error('Publish error:', publishError);
      
      await supabase
        .from('scheduled_posts')
        .update({
          status: 'failed',
          error_message: publishError.message,
        })
        .eq('id', scheduledPostId);

      return new Response(JSON.stringify({ error: publishError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Meta publish error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
