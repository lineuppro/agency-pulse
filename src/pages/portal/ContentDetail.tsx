import { useState } from 'react';
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
  FolderOpen,
  Sparkles,
  Copy,
  Layers,
  MessageSquare,
  Heart,
  ThumbsUp,
  PartyPopper,
  HelpCircle,
  Reply,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEditorialCalendar, type ContentType, type ContentStatus } from '@/hooks/useEditorialCalendar';
import { getContentTypeLabel, getContentStatusLabel } from '@/hooks/useEditorialCalendar';
import { useLinkedAIContent } from '@/hooks/useLinkedAIContent';
import { useEditorialContentComments, type ReactionType } from '@/hooks/useEditorialContentComments';
import { useEditorialCampaigns } from '@/hooks/useEditorialCampaigns';

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

export default function PortalContentDetail() {
  const { contentId } = useParams<{ contentId: string }>();
  const navigate = useNavigate();
  const { clientId } = useAuth();
  
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

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

  // Linked AI content
  const { data: aiContent } = useLinkedAIContent(contentId);

  // Comments
  const { comments, addComment, toggleReaction, currentUserId } = 
    useEditorialContentComments(contentId);

  // Campaigns
  const { campaigns } = useEditorialCampaigns(clientId || undefined);
  const campaignName = content?.campaign_id 
    ? campaigns.find(c => c.id === content.campaign_id)?.name 
    : undefined;

  // Status mutation
  const { updateStatus } = useEditorialCalendar(clientId || undefined);

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
        <Button variant="outline" onClick={() => navigate('/portal/calendar')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Calendário
        </Button>
      </div>
    );
  }

  const typeConfig = contentTypeConfig[content.content_type];
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig[content.status].icon;
  const hasAIContent = !!aiContent;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const handleApprove = () => {
    updateStatus.mutate({ id: content.id, status: 'approved' });
  };

  const handleReject = () => {
    updateStatus.mutate({ id: content.id, status: 'rejected' });
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
          <Button variant="ghost" size="icon" onClick={() => navigate('/portal/calendar')}>
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
                <span>•</span>
                <span>{format(new Date(content.scheduled_date), "dd 'de' MMMM", { locale: ptBR })}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={cn('gap-1', statusConfig[content.status].bgColor, statusConfig[content.status].color)}>
            <StatusIcon className="h-3 w-3" />
            {getContentStatusLabel(content.status)}
          </Badge>

          {content.status === 'pending_approval' && (
            <>
              <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={handleReject}>
                <X className="h-4 w-4 mr-2" />
                Rejeitar
              </Button>
              <Button onClick={handleApprove}>
                <Check className="h-4 w-4 mr-2" />
                Aprovar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 overflow-hidden">
        {/* Left - Info */}
        <div className="col-span-3 space-y-4 overflow-y-auto">
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
                <Label className="text-xs text-muted-foreground">Data de Publicação</Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(content.scheduled_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <div className="flex items-center gap-2">
                  <TypeIcon className={cn('h-4 w-4', typeConfig.color)} />
                  <span>{getContentTypeLabel(content.content_type)}</span>
                </div>
              </div>

              {hasAIContent && (
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Gerado por IA
                </Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="col-span-5 flex flex-col min-h-0 overflow-hidden">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-3 shrink-0">
              <CardTitle className="text-sm">Conteúdo</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden space-y-4">
              {/* AI Generated Title */}
              {hasAIContent && aiContent?.title ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Título (Gerado por IA)</Label>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleCopy(aiContent.title!, 'Título')}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="font-medium p-3 rounded-md bg-muted/50">{aiContent.title}</p>
                </div>
              ) : (
                <div>
                  <Label className="text-xs text-muted-foreground">Título</Label>
                  <p className="font-medium">{content.title}</p>
                </div>
              )}

              {/* AI Generated Subtitle for social posts */}
              {hasAIContent && (content.content_type === 'instagram' || content.content_type === 'facebook') && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Subtítulo para Designer</Label>
                    {aiContent?.subtitle && (
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleCopy(aiContent.subtitle!, 'Subtítulo')}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm p-3 rounded-md bg-muted/50">
                    {aiContent?.subtitle || <span className="text-muted-foreground italic">Não gerado (conteúdo anterior à funcionalidade)</span>}
                  </p>
                </div>
              )}

              {content.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Tema/Briefing</Label>
                  <p className="text-sm">{content.description}</p>
                </div>
              )}

              {/* AI Generated Content */}
              {hasAIContent && aiContent?.content && (
                <div className="flex-1 space-y-2 min-h-0 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Conteúdo</Label>
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
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    Slides ({aiContent.slides.length})
                  </Label>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {aiContent.slides.map((slide, i) => (
                        <div key={i} className="p-3 rounded-md bg-muted/50 space-y-1">
                          <span className="text-xs font-medium text-primary">Slide {i + 1}</span>
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
                      <p className="text-xs">Adicione um comentário para iniciar a conversa</p>
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
    </div>
  );
}
