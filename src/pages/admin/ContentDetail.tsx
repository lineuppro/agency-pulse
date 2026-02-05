import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft,
  Instagram,
  Facebook,
  FileText,
  Mail,
  Megaphone,
  MoreHorizontal,
  Calendar,
  Clock,
  Check,
  X,
  Send,
  Trash2,
  Save,
  FolderOpen,
  Sparkles,
  Copy,
  Target,
  BookOpen,
  Hash,
  Image as ImageIcon,
  Layers,
  MessageSquare,
  Heart,
  ThumbsUp,
  PartyPopper,
  HelpCircle,
  Reply,
  ChevronDown,
  ChevronUp,
  CalendarPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useEditorialCalendar, type ContentType, type ContentStatus } from '@/hooks/useEditorialCalendar';
import { getContentTypeLabel, getContentStatusLabel } from '@/hooks/useEditorialCalendar';
import { useLinkedAIContent } from '@/hooks/useLinkedAIContent';
import { useEditorialContentComments, type ReactionType } from '@/hooks/useEditorialContentComments';
import { useEditorialCampaigns } from '@/hooks/useEditorialCampaigns';
import { SchedulePostModal } from '@/components/social/SchedulePostModal';
import { ScheduledPostsList } from '@/components/social/ScheduledPostsList';

const contentTypeConfig: Record<ContentType, { icon: typeof Instagram; color: string; bgColor: string }> = {
  instagram: { icon: Instagram, color: 'text-pink-600', bgColor: 'bg-pink-100 dark:bg-pink-900/30' },
  facebook: { icon: Facebook, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  blog: { icon: FileText, color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  email: { icon: Mail, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  google_ads: { icon: Megaphone, color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  other: { icon: MoreHorizontal, color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

const statusConfig: Record<ContentStatus, { icon: typeof Clock; color: string; bgColor: string }> = {
  draft: { icon: FileText, color: 'text-muted-foreground', bgColor: 'bg-muted' },
  pending_approval: { icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  approved: { icon: Check, color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  rejected: { icon: X, color: 'text-destructive', bgColor: 'bg-destructive/10' },
  published: { icon: Send, color: 'text-primary', bgColor: 'bg-primary/10' },
};

const reactionIcons: Record<ReactionType, typeof ThumbsUp> = {
  like: ThumbsUp,
  heart: Heart,
  celebrate: PartyPopper,
  thinking: HelpCircle,
};

const contentTypes: ContentType[] = ['instagram', 'facebook', 'blog', 'email', 'google_ads', 'other'];
const statuses: ContentStatus[] = ['draft', 'pending_approval', 'approved', 'rejected', 'published'];

function getSEOScoreColor(score: number | null | undefined): string {
  if (!score) return 'text-muted-foreground';
  if (score >= 70) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-destructive';
}

function getSEOScoreLabel(score: number | null | undefined): string {
  if (!score) return 'N/A';
  if (score >= 70) return 'Excelente';
  if (score >= 50) return 'Bom';
  return 'Precisa melhorar';
}

export default function AdminContentDetail() {
  const { contentId } = useParams<{ contentId: string }>();
  const navigate = useNavigate();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<ContentType>('instagram');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [hasChanges, setHasChanges] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  // Fetch content
  const { data: content, isLoading: isContentLoading } = useQuery({
    queryKey: ['editorial-content', contentId],
    queryFn: async () => {
      if (!contentId) return null;
      const { data, error } = await supabase
        .from('editorial_contents')
        .select('*')
        .eq('id', contentId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!contentId,
  });

  // Fetch client info
  const { data: client } = useQuery({
    queryKey: ['client', content?.client_id],
    queryFn: async () => {
      if (!content?.client_id) return null;
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('id', content.client_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!content?.client_id,
  });

  // Linked AI content
  const { data: aiContent, isLoading: isAILoading } = useLinkedAIContent(contentId);

  // Comments
  const { comments, isLoading: isCommentsLoading, addComment, toggleReaction, currentUserId } = 
    useEditorialContentComments(contentId);

  // Campaigns
  const { campaigns } = useEditorialCampaigns(content?.client_id);
  const campaignName = content?.campaign_id 
    ? campaigns.find(c => c.id === content.campaign_id)?.name 
    : undefined;

  // Update/delete mutations
  const { updateContent, deleteContent, updateStatus } = useEditorialCalendar();

  // Sync form with content
  useEffect(() => {
    if (content) {
      setTitle(content.title);
      setDescription(content.description || '');
      setContentType(content.content_type);
      setScheduledDate(new Date(content.scheduled_date));
      setStatus(content.status);
      setHasChanges(false);
    }
  }, [content]);

  // Track changes
  useEffect(() => {
    if (content) {
      const changed = 
        title !== content.title ||
        description !== (content.description || '') ||
        contentType !== content.content_type ||
        (scheduledDate && format(scheduledDate, 'yyyy-MM-dd') !== content.scheduled_date) ||
        status !== content.status;
      setHasChanges(changed);
    }
  }, [title, description, contentType, scheduledDate, status, content]);

  if (isContentLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Conteúdo não encontrado</p>
        <Button variant="outline" onClick={() => navigate('/admin/calendar')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Calendário
        </Button>
      </div>
    );
  }

  const typeConfig = contentTypeConfig[content.content_type];
  const TypeIcon = typeConfig.icon;
  const hasAIContent = !!aiContent;
  
  // Check if content can be scheduled (approved or published status)
  const canSchedule = ['approved', 'published'].includes(content.status);
  const isSocialContent = ['instagram', 'facebook'].includes(content.content_type);

  const handleSave = () => {
    if (!scheduledDate) return;
    
    updateContent.mutate({
      id: content.id,
      title,
      description: description || undefined,
      content_type: contentType,
      scheduled_date: format(scheduledDate, 'yyyy-MM-dd'),
      status,
    }, {
      onSuccess: () => {
        setHasChanges(false);
        toast.success('Conteúdo salvo com sucesso!');
      },
    });
  };

  const handleDelete = () => {
    if (window.confirm('Tem certeza que deseja excluir este conteúdo?')) {
      deleteContent.mutate(content.id, {
        onSuccess: () => navigate('/admin/calendar'),
      });
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addComment.mutate({ content: newComment }, {
      onSuccess: () => setNewComment(''),
    });
  };

  const handleReply = (parentId: string) => {
    if (!replyContent.trim()) return;
    addComment.mutate({ content: replyContent, parentCommentId: parentId }, {
      onSuccess: () => {
        setReplyContent('');
        setReplyingTo(null);
      },
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/calendar')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', typeConfig.bgColor)}>
              <TypeIcon className={cn('h-6 w-6', typeConfig.color)} />
            </div>
            <div>
              <h1 className="text-xl font-bold line-clamp-1">{content.title}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{getContentTypeLabel(content.content_type)}</span>
                {client && (
                  <>
                    <span>•</span>
                    <span>{client.name}</span>
                  </>
                )}
                {hasAIContent && (
                  <>
                    <span>•</span>
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Sparkles className="h-3 w-3" />
                      Gerado por IA
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => {
                const config = statusConfig[s];
                const Icon = config.icon;
                return (
                  <SelectItem key={s} value={s}>
                    <div className="flex items-center gap-2">
                      <Icon className={cn('h-4 w-4', config.color)} />
                      {getContentStatusLabel(s)}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>

          <Button onClick={handleSave} disabled={!hasChanges || updateContent.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>

          {canSchedule && isSocialContent && (
            <Button 
              variant="default"
              onClick={() => setIsScheduleModalOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              Agendar Publicação
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 overflow-hidden">
        {/* Left Sidebar - Info & SEO */}
        <div className="col-span-3 space-y-4 overflow-y-auto">
          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaignName && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{campaignName}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs">Tipo de Conteúdo</Label>
                <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypes.map((t) => {
                      const config = contentTypeConfig[t];
                      const Icon = config.icon;
                      return (
                        <SelectItem key={t} value={t}>
                          <div className="flex items-center gap-2">
                            <Icon className={cn('h-4 w-4', config.color)} />
                            {getContentTypeLabel(t)}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Data de Publicação</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, "dd 'de' MMMM", { locale: ptBR }) : 'Selecionar'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          {/* SEO Metrics */}
          {hasAIContent && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Métricas SEO
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Score</span>
                    <div className="flex items-center gap-1">
                      <span className={cn("text-xl font-bold", getSEOScoreColor(aiContent?.readability_score))}>
                        {aiContent?.readability_score || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("text-xs", getSEOScoreColor(aiContent?.readability_score))}>
                    {getSEOScoreLabel(aiContent?.readability_score)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 rounded-md bg-muted/50">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      Palavras
                    </span>
                    <span className="font-medium">{aiContent?.word_count || 0}</span>
                  </div>
                  <div className="p-2 rounded-md bg-muted/50">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      Densidade
                    </span>
                    <span className="font-medium">{aiContent?.keyword_density?.toFixed(1) || 0}%</span>
                  </div>
                </div>

                {aiContent?.main_keyword && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Palavra-chave</Label>
                    <Badge variant="outline" className="mt-1">{aiContent.main_keyword}</Badge>
                  </div>
                )}


                {aiContent?.seo_title && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Título SEO</Label>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleCopy(aiContent.seo_title!, 'Título SEO')}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm p-2 rounded-md bg-muted/50">{aiContent.seo_title}</p>
                  </div>
                )}

                {aiContent?.meta_description && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Meta Descrição</Label>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleCopy(aiContent.meta_description!, 'Meta descrição')}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm p-2 rounded-md bg-muted/50">{aiContent.meta_description}</p>
                  </div>
                )}

                {aiContent?.hashtags && aiContent.hashtags.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Hashtags</Label>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleCopy(aiContent.hashtags!.join(' '), 'Hashtags')}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {aiContent.hashtags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {tag.startsWith('#') ? tag : `#${tag}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {aiContent?.image_suggestions && aiContent.image_suggestions.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      Sugestões de Imagem
                    </Label>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      {aiContent.image_suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-primary">•</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Scheduled Posts List */}
          {isSocialContent && (
            <ScheduledPostsList editorialContentId={contentId} />
          )}
        </div>

        {/* Main Content Area */}
        <div className="col-span-5 flex flex-col min-h-0 overflow-hidden">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-sm">Conteúdo</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden space-y-4">
              {/* AI Generated Title */}
              {hasAIContent && aiContent?.title ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Título</Label>
                    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => handleCopy(aiContent.title!, 'Título')}>
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </Button>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50 text-sm font-medium">
                    {aiContent.title}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs">Título</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
              )}

              {/* AI Generated Subtitle for social posts */}
              {hasAIContent && (content.content_type === 'instagram' || content.content_type === 'facebook') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Subtítulo</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2" 
                      onClick={() => handleCopy(aiContent?.subtitle || '', 'Subtítulo')}
                      disabled={!aiContent?.subtitle}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </Button>
                  </div>
                  <div className="p-3 rounded-md bg-muted/50 text-sm">
                    {aiContent?.subtitle || <span className="text-muted-foreground italic">Não gerado (conteúdo anterior à funcionalidade)</span>}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs">Tema/Briefing</Label>
                <Textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Tema ou briefing do conteúdo..."
                />
              </div>

              {/* AI Generated Content */}
              {hasAIContent && aiContent?.content && (
                <div className="flex-1 space-y-2 min-h-0 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Conteúdo Gerado</Label>
                    <Button variant="ghost" size="sm" onClick={() => handleCopy(aiContent.content!, 'Conteúdo')}>
                      <Copy className="h-3 w-3 mr-1" />
                      Copiar
                    </Button>
                  </div>
                  <ScrollArea className="flex-1 h-[300px]">
                    <div className="p-4 rounded-md bg-muted/50 whitespace-pre-wrap text-sm">
                      {aiContent.content}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Carousel Slides */}
              {hasAIContent && aiContent?.slides && aiContent.slides.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    Slides ({aiContent.slides.length})
                  </Label>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {aiContent.slides.map((slide, i) => (
                        <div key={i} className="p-3 rounded-md bg-muted/50 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-primary">Slide {i + 1}</span>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5"
                              onClick={() => handleCopy(`${slide.title}\n\n${slide.content}`, `Slide ${i + 1}`)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm font-medium">{slide.title}</p>
                          <p className="text-xs text-muted-foreground">{slide.content}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Comments Section */}
        <div className="col-span-4 flex flex-col min-h-0 overflow-hidden">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Comentários ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
              <ScrollArea className="flex-1 px-6">
                <div className="space-y-4 py-4">
                  {comments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum comentário ainda</p>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="space-y-2">
                        <div className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {comment.user_name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{comment.user_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(comment.created_at), "dd/MM 'às' HH:mm")}
                              </span>
                            </div>
                            <p className="text-sm">{comment.content}</p>
                            <div className="flex items-center gap-2">
                              {(['like', 'heart', 'celebrate', 'thinking'] as ReactionType[]).map((type) => {
                                const Icon = reactionIcons[type];
                                const count = comment.reactions?.filter(r => r.reaction_type === type).length || 0;
                                const hasReacted = comment.reactions?.some(r => r.reaction_type === type && r.user_id === currentUserId);
                                return (
                                  <Button
                                    key={type}
                                    variant="ghost"
                                    size="sm"
                                    className={cn("h-6 px-2 gap-1", hasReacted && "bg-primary/10 text-primary")}
                                    onClick={() => toggleReaction.mutate({ commentId: comment.id, reactionType: type })}
                                  >
                                    <Icon className="h-3 w-3" />
                                    {count > 0 && <span className="text-xs">{count}</span>}
                                  </Button>
                                );
                              })}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                              >
                                <Reply className="h-3 w-3 mr-1" />
                                Responder
                              </Button>
                            </div>

                            {/* Reply input */}
                            {replyingTo === comment.id && (
                              <div className="flex gap-2 mt-2">
                                <Input
                                  placeholder="Escreva uma resposta..."
                                  value={replyContent}
                                  onChange={(e) => setReplyContent(e.target.value)}
                                  className="h-8 text-sm"
                                />
                                <Button size="sm" className="h-8" onClick={() => handleReply(comment.id)}>
                                  Enviar
                                </Button>
                              </div>
                            )}

                            {/* Replies */}
                            {comment.replies && comment.replies.length > 0 && (
                              <div className="mt-3 ml-4 border-l-2 pl-4 space-y-3">
                                {comment.replies.map((reply) => (
                                  <div key={reply.id} className="flex gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarFallback className="text-xs">
                                        {reply.user_name?.charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-xs">{reply.user_name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {format(new Date(reply.created_at), "dd/MM 'às' HH:mm")}
                                        </span>
                                      </div>
                                      <p className="text-sm">{reply.content}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              {/* Add comment */}
              <div className="p-4 border-t shrink-0">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Adicionar comentário..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                  <Button 
                    onClick={handleAddComment} 
                    disabled={!newComment.trim() || addComment.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Schedule Post Modal */}
      {content && (
        <SchedulePostModal
          open={isScheduleModalOpen}
          onOpenChange={setIsScheduleModalOpen}
          clientId={content.client_id}
          editorialContentId={contentId}
          defaultCaption={aiContent?.content || aiContent?.subtitle || ''}
          defaultHashtags={aiContent?.hashtags || []}
        />
      )}
    </div>
  );
}
