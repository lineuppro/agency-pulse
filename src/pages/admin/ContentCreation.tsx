import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Zap, 
  FileText, 
  Instagram, 
  Layers, 
  Play,
  Settings2,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { BlogArticleForm } from '@/components/content-creation/BlogArticleForm';
import { SocialPostForm } from '@/components/content-creation/SocialPostForm';
import { CarouselForm } from '@/components/content-creation/CarouselForm';
import { StoriesReelsForm } from '@/components/content-creation/StoriesReelsForm';
import { ContentPreview } from '@/components/content-creation/ContentPreview';
import { ClientAISettingsModal } from '@/components/content-creation/ClientAISettingsModal';
import { useAIGeneratedContent, type AIGeneratedContent, type AIContentType } from '@/hooks/useAIGeneratedContent';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ContentCreation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<AIContentType>('blog_article');
  const [generatedContent, setGeneratedContent] = useState<AIGeneratedContent | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isPublishing, setIsPublishing] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { isGenerating, generateContent } = useAIGeneratedContent(selectedClientId || undefined);

  const handleGenerate = async (input: {
    topic: string;
    main_keyword?: string;
    target_word_count?: number;
    additional_instructions?: string;
  }) => {
    if (!selectedClientId) return;

    const content = await generateContent({
      client_id: selectedClientId,
      content_type: activeTab,
      ...input,
    });

    if (content) {
      setGeneratedContent(content);
    }
  };

  const contentTypes = [
    { id: 'blog_article' as const, label: 'Artigo Blog', icon: FileText },
    { id: 'social_post' as const, label: 'Post Feed', icon: Instagram },
    { id: 'carousel' as const, label: 'Carrossel', icon: Layers },
    { id: 'stories' as const, label: 'Stories/Reels', icon: Play },
  ];

  const getContentTypeForCalendar = (type: AIContentType) => {
    switch (type) {
      case 'blog_article': return 'blog';
      case 'social_post': return 'instagram';
      case 'carousel': return 'instagram';
      case 'stories': return 'instagram';
      case 'reels': return 'instagram';
      default: return 'other';
    }
  };

  const handlePublishToCalendar = async () => {
    if (!generatedContent || !selectedDate || !user) return;
    
    setIsPublishing(true);
    try {
      const { error } = await supabase
        .from('editorial_contents')
        .insert({
          client_id: generatedContent.client_id,
          title: generatedContent.title || generatedContent.topic,
          description: generatedContent.meta_description || generatedContent.content?.substring(0, 200) || '',
          content_type: getContentTypeForCalendar(generatedContent.content_type) as 'instagram' | 'facebook' | 'blog' | 'email' | 'google_ads' | 'other',
          scheduled_date: format(selectedDate, 'yyyy-MM-dd'),
          status: 'draft',
          created_by: user.id,
        });

      if (error) throw error;

      // Link AI content to editorial content
      await supabase
        .from('ai_generated_contents')
        .update({ status: 'linked' })
        .eq('id', generatedContent.id);

      queryClient.invalidateQueries({ queryKey: ['editorial-contents'] });
      toast({ title: 'Conteúdo publicado no calendário!' });
      setIsCalendarModalOpen(false);
      setGeneratedContent(null);
    } catch (error) {
      console.error('Error publishing to calendar:', error);
      toast({ title: 'Erro ao publicar no calendário', variant: 'destructive' });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Criação de Conteúdo</h1>
            <p className="text-muted-foreground">
              Gere artigos e posts otimizados com IA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedClientId && (
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setIsSettingsOpen(true)}
              title="Configurações de IA do cliente"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {!selectedClientId ? (
        <Card className="flex-1 flex items-center justify-center">
          <CardContent className="text-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Selecione um cliente</h3>
            <p className="text-muted-foreground">
              Escolha um cliente acima para começar a gerar conteúdo com IA
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          {/* Left Panel - Forms */}
          <Card className="flex flex-col min-h-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Tipo de Conteúdo</CardTitle>
              <CardDescription>
                Escolha o formato e preencha as informações
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
              <Tabs 
                value={activeTab} 
                onValueChange={(v) => setActiveTab(v as AIContentType)} 
                className="flex flex-col flex-1 min-h-0"
              >
                <TabsList className="grid grid-cols-4 mb-4 h-auto p-1">
                  {contentTypes.map((type) => (
                    <TabsTrigger 
                      key={type.id} 
                      value={type.id}
                      className="flex items-center gap-2 py-2.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                    >
                      <type.icon className="h-4 w-4" />
                      <span className="text-sm font-medium hidden sm:inline">{type.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className="flex-1 overflow-y-auto min-h-0">
                  <TabsContent value="blog_article" className="mt-0 h-full">
                    <BlogArticleForm 
                      onGenerate={handleGenerate}
                      isGenerating={isGenerating}
                    />
                  </TabsContent>

                  <TabsContent value="social_post" className="mt-0 h-full">
                    <SocialPostForm 
                      onGenerate={handleGenerate}
                      isGenerating={isGenerating}
                    />
                  </TabsContent>

                  <TabsContent value="carousel" className="mt-0 h-full">
                    <CarouselForm 
                      onGenerate={handleGenerate}
                      isGenerating={isGenerating}
                    />
                  </TabsContent>

                  <TabsContent value="stories" className="mt-0 h-full">
                    <StoriesReelsForm 
                      onGenerate={handleGenerate}
                      isGenerating={isGenerating}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </CardContent>
          </Card>

          {/* Right Panel - Preview */}
          <Card className="flex flex-col min-h-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Conteúdo Gerado
              </CardTitle>
              <CardDescription>
                Visualize e edite o conteúdo antes de salvar
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto min-h-0">
              {isGenerating ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Gerando conteúdo...</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Isso pode levar alguns segundos
                    </p>
                  </div>
                </div>
              ) : generatedContent ? (
                <ContentPreview 
                  content={generatedContent}
                  onClear={() => setGeneratedContent(null)}
                  onPublishToCalendar={() => setIsCalendarModalOpen(true)}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>O conteúdo gerado aparecerá aqui</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <ClientAISettingsModal
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        clientId={selectedClientId}
      />

      <Dialog open={isCalendarModalOpen} onOpenChange={setIsCalendarModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Publicar no Calendário</DialogTitle>
            <DialogDescription>
              Selecione a data para publicar o conteúdo no calendário editorial.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            <Label className="mb-2 text-sm text-muted-foreground">Data de Publicação</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ptBR}
              className="rounded-md border"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCalendarModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePublishToCalendar} disabled={!selectedDate || isPublishing}>
              {isPublishing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Publicando...
                </>
              ) : (
                'Publicar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
