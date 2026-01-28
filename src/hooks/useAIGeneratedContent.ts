import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export type AIContentType = 'blog_article' | 'social_post' | 'carousel' | 'stories' | 'reels';
export type AIContentStatus = 'draft' | 'approved' | 'linked';

export interface CarouselSlide {
  title: string;
  content: string;
  image_suggestion: string;
}

export interface AIGeneratedContent {
  id: string;
  client_id: string;
  editorial_content_id: string | null;
  content_type: AIContentType;
  topic: string;
  main_keyword: string | null;
  target_word_count: number | null;
  additional_instructions: string | null;
  title: string | null;
  seo_title: string | null;
  meta_description: string | null;
  content: string | null;
  hashtags: string[] | null;
  image_suggestions: string[] | null;
  slides: CarouselSlide[] | null;
  keyword_density: number | null;
  readability_score: number | null;
  word_count: number | null;
  status: AIContentStatus;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GenerateContentInput {
  client_id: string;
  content_type: AIContentType;
  topic: string;
  main_keyword?: string;
  target_word_count?: number;
  additional_instructions?: string;
}

export function useAIGeneratedContent(clientId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: contents = [], isLoading } = useQuery({
    queryKey: ['ai-generated-contents', clientId],
    queryFn: async () => {
      let query = supabase
        .from('ai_generated_contents')
        .select('*')
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data.map(item => ({
        ...item,
        slides: item.slides as unknown as CarouselSlide[] | null,
      })) as AIGeneratedContent[];
    },
  });

  const generateContent = async (input: GenerateContentInput): Promise<AIGeneratedContent | null> => {
    if (!user) {
      toast({ title: 'Você precisa estar logado', variant: 'destructive' });
      return null;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: input,
      });

      if (error) throw error;

      // Save to database
      const contentToSave = {
        client_id: input.client_id,
        content_type: input.content_type,
        topic: input.topic,
        main_keyword: input.main_keyword || null,
        target_word_count: input.target_word_count || null,
        additional_instructions: input.additional_instructions || null,
        title: data.title || null,
        seo_title: data.seo_title || null,
        meta_description: data.meta_description || null,
        content: data.content || null,
        hashtags: data.hashtags || null,
        image_suggestions: data.image_suggestions || null,
        slides: data.slides || null,
        keyword_density: data.keyword_density || null,
        readability_score: data.readability_score || null,
        word_count: data.word_count || null,
        created_by: user.id,
      };

      const { data: savedContent, error: saveError } = await supabase
        .from('ai_generated_contents')
        .insert(contentToSave)
        .select()
        .single();

      if (saveError) throw saveError;

      queryClient.invalidateQueries({ queryKey: ['ai-generated-contents'] });
      toast({ title: 'Conteúdo gerado com sucesso!' });

      return {
        ...savedContent,
        slides: savedContent.slides as unknown as CarouselSlide[] | null,
      } as AIGeneratedContent;
    } catch (error) {
      console.error('Error generating content:', error);
      toast({ 
        title: 'Erro ao gerar conteúdo', 
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive' 
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const updateContent = useMutation({
    mutationFn: async ({ id, slides, ...data }: Partial<AIGeneratedContent> & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = { ...data };
      if (slides !== undefined) {
        updateData.slides = slides;
      }
      
      const { error } = await supabase
        .from('ai_generated_contents')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-generated-contents'] });
      toast({ title: 'Conteúdo atualizado!' });
    },
    onError: (error) => {
      console.error('Error updating content:', error);
      toast({ title: 'Erro ao atualizar conteúdo', variant: 'destructive' });
    },
  });

  const deleteContent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ai_generated_contents')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-generated-contents'] });
      toast({ title: 'Conteúdo excluído!' });
    },
    onError: (error) => {
      console.error('Error deleting content:', error);
      toast({ title: 'Erro ao excluir conteúdo', variant: 'destructive' });
    },
  });

  return {
    contents,
    isLoading,
    isGenerating,
    generateContent,
    updateContent,
    deleteContent,
  };
}
