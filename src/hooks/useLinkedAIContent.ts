import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AIGeneratedContent, CarouselSlide } from './useAIGeneratedContent';

/**
 * Hook to fetch AI-generated content linked to an editorial content item
 */
export function useLinkedAIContent(editorialContentId: string | null | undefined) {
  return useQuery({
    queryKey: ['linked-ai-content', editorialContentId],
    queryFn: async () => {
      if (!editorialContentId) return null;

      const { data, error } = await supabase
        .from('ai_generated_contents')
        .select('*')
        .eq('editorial_content_id', editorialContentId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching linked AI content:', error);
        throw error;
      }

      if (!data) return null;

      return {
        ...data,
        slides: data.slides as unknown as CarouselSlide[] | null,
      } as AIGeneratedContent;
    },
    enabled: !!editorialContentId,
  });
}
