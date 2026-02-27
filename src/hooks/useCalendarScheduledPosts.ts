import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import type { EditorialContent, ContentType } from '@/hooks/useEditorialCalendar';

/**
 * Fetches social_scheduled_posts for a date range and converts them
 * into EditorialContent-compatible items so they can be displayed on the calendar.
 */
export function useCalendarScheduledPosts(
  clientId?: string,
  startDate?: Date,
  endDate?: Date
) {
  return useQuery({
    queryKey: ['calendar-scheduled-posts', clientId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from('social_scheduled_posts')
        .select('*')
        .not('status', 'eq', 'cancelled')
        .order('scheduled_at', { ascending: true });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      if (startDate) {
        query = query.gte('scheduled_at', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('scheduled_at', endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      // Convert to EditorialContent-compatible format
      return (data || []).map((post): EditorialContent & {
        _isScheduledPost: true;
        _scheduledPostStatus: string;
        _scheduledAt: string;
        _mediaUrls: string[];
      } => {
        const platform = post.platform as string;
        let contentType: ContentType = 'other';
        if (platform === 'instagram') contentType = 'instagram';
        else if (platform === 'facebook') contentType = 'facebook';

        // Map social post status to editorial content status
        const statusMap: Record<string, EditorialContent['status']> = {
          draft: 'draft',
          scheduled: 'approved',
          publishing: 'approved',
          published: 'published',
          failed: 'rejected',
        };

        return {
          id: `sp_${post.id}`,
          client_id: post.client_id,
          title: post.caption
            ? (post.caption.length > 50 ? post.caption.substring(0, 50) + '...' : post.caption)
            : `Post ${platform.charAt(0).toUpperCase() + platform.slice(1)}`,
          description: post.caption,
          content_type: contentType,
          scheduled_date: format(new Date(post.scheduled_at), 'yyyy-MM-dd'),
          status: statusMap[post.status] || 'draft',
          campaign_id: null,
          created_by: post.created_by,
          created_at: post.created_at,
          updated_at: post.updated_at,
          _isScheduledPost: true,
          _scheduledPostStatus: post.status,
          _scheduledAt: post.scheduled_at,
          _mediaUrls: (post.media_urls as unknown as string[]) || [],
        };
      });
    },
    enabled: true,
  });
}
