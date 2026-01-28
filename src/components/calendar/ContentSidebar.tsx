import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
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
  ChevronDown,
  ChevronUp,
  Target,
  BookOpen,
  Hash,
  Image as ImageIcon,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { ContentType, ContentStatus, EditorialContent } from '@/hooks/useEditorialCalendar';
import { getContentTypeLabel, getContentStatusLabel } from '@/hooks/useEditorialCalendar';
import { useLinkedAIContent } from '@/hooks/useLinkedAIContent';

interface ContentSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: EditorialContent | null;
  isAdmin?: boolean;
  campaignName?: string;
  onSave?: (data: { 
    id: string; 
    title: string; 
    description?: string; 
    content_type: ContentType;
    scheduled_date: string;
    status: ContentStatus;
  }) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: ContentStatus) => void;
  isLoading?: boolean;
}

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

const contentTypes: ContentType[] = ['instagram', 'facebook', 'blog', 'email', 'google_ads', 'other'];
const statuses: ContentStatus[] = ['draft', 'pending_approval', 'approved', 'rejected', 'published'];

// Helper to get SEO score color
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

export function ContentSidebar({
  open,
  onOpenChange,
  content,
  isAdmin = false,
  campaignName,
  onSave,
  onDelete,
  onStatusChange,
  isLoading = false,
}: ContentSidebarProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<ContentType>('instagram');
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [hasChanges, setHasChanges] = useState(false);
  const [isAIContentOpen, setIsAIContentOpen] = useState(true);
  const [isFullContentOpen, setIsFullContentOpen] = useState(false);

  // Fetch linked AI content
  const { data: aiContent, isLoading: isAIContentLoading } = useLinkedAIContent(content?.id);

  // Sync form state with content
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

  if (!content) return null;

  const typeConfig = contentTypeConfig[content.content_type];
  const TypeIcon = typeConfig.icon;

  const handleSave = () => {
    if (!scheduledDate) return;
    
    onSave?.({
      id: content.id,
      title,
      description: description || undefined,
      content_type: contentType,
      scheduled_date: format(scheduledDate, 'yyyy-MM-dd'),
      status,
    });
  };

  const handleDelete = () => {
    if (window.confirm('Tem certeza que deseja excluir este conteúdo?')) {
      onDelete?.(content.id);
      onOpenChange(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const hasAIContent = !!aiContent;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg p-0 flex flex-col h-full">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', typeConfig.bgColor)}>
              <TypeIcon className={cn('h-5 w-5', typeConfig.color)} />
            </div>
            <div className="flex-1">
              <SheetTitle className="text-left">
                {isAdmin ? 'Editar Conteúdo' : 'Detalhes do Conteúdo'}
              </SheetTitle>
              <p className="text-sm text-muted-foreground">
                {getContentTypeLabel(content.content_type)}
              </p>
            </div>
            {hasAIContent && (
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Gerado por IA
              </Badge>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6">
            {/* Campaign info */}
            {campaignName && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Campanha: <span className="font-medium">{campaignName}</span></span>
              </div>
            )}

            {/* AI Content Section - SEO Metrics */}
            {hasAIContent && (
              <Collapsible open={isAIContentOpen} onOpenChange={setIsAIContentOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="font-medium">Métricas de SEO</span>
                    </div>
                    {isAIContentOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-4">
                  {/* SEO Score Card */}
                  <div className="p-4 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">Score de Legibilidade</span>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-2xl font-bold", getSEOScoreColor(aiContent?.readability_score))}>
                          {aiContent?.readability_score || 'N/A'}
                        </span>
                        <Badge variant="outline" className={cn("text-xs", getSEOScoreColor(aiContent?.readability_score))}>
                          {getSEOScoreLabel(aiContent?.readability_score)}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Palavras:</span>
                        <span className="font-medium">{aiContent?.word_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Densidade:</span>
                        <span className="font-medium">{aiContent?.keyword_density?.toFixed(1) || 0}%</span>
                      </div>
                    </div>
                  </div>

                  {/* SEO Title */}
                  {aiContent?.seo_title && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Título SEO</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{aiContent.seo_title.length}/60</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(aiContent.seo_title!, 'Título SEO')}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm p-2 rounded-md bg-muted/50">{aiContent.seo_title}</p>
                    </div>
                  )}

                  {/* Meta Description */}
                  {aiContent?.meta_description && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Meta Descrição</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{aiContent.meta_description.length}/150</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopy(aiContent.meta_description!, 'Meta descrição')}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm p-2 rounded-md bg-muted/50">{aiContent.meta_description}</p>
                    </div>
                  )}

                  {/* Main Keyword */}
                  {aiContent?.main_keyword && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Palavra-chave Principal</Label>
                      <Badge variant="outline">{aiContent.main_keyword}</Badge>
                    </div>
                  )}

                  {/* Hashtags */}
                  {aiContent?.hashtags && aiContent.hashtags.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Hashtags</Label>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6" 
                          onClick={() => handleCopy(aiContent.hashtags!.join(' '), 'Hashtags')}
                        >
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

                  {/* Image Suggestions */}
                  {aiContent?.image_suggestions && aiContent.image_suggestions.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" />
                        Sugestões de Imagem
                      </Label>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        {aiContent.image_suggestions.map((suggestion, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Carousel Slides */}
                  {aiContent?.slides && aiContent.slides.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        Slides do Carrossel ({aiContent.slides.length})
                      </Label>
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
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Full Content (collapsible for AI content) */}
            {hasAIContent && aiContent?.content && (
              <>
                <Separator />
                <Collapsible open={isFullContentOpen} onOpenChange={setIsFullContentOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="font-medium">Conteúdo Completo</span>
                      </div>
                      {isFullContentOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <div className="relative">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => handleCopy(aiContent.content!, 'Conteúdo')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <div className="p-3 rounded-md bg-muted/50 max-h-[300px] overflow-y-auto">
                        <p className="text-sm whitespace-pre-wrap pr-8">{aiContent.content}</p>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}

            <Separator />

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              {isAdmin ? (
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título do conteúdo"
                />
              ) : (
                <p className="text-sm py-2">{title}</p>
              )}
            </div>

            {/* Content Type */}
            <div className="space-y-2">
              <Label>Tipo de Conteúdo</Label>
              {isAdmin ? (
                <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contentTypes.map((type) => {
                      const config = contentTypeConfig[type];
                      const Icon = config.icon;
                      return (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            <Icon className={cn('h-4 w-4', config.color)} />
                            {getContentTypeLabel(type)}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm py-2">{getContentTypeLabel(contentType)}</p>
              )}
            </div>

            {/* Scheduled Date */}
            <div className="space-y-2">
              <Label>Data Programada</Label>
              {isAdmin ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduledDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {scheduledDate ? format(scheduledDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : 'Selecionar data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarPicker
                      mode="single"
                      selected={scheduledDate}
                      onSelect={setScheduledDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <p className="text-sm py-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {scheduledDate && format(scheduledDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              {isAdmin ? (
                <Select value={status} onValueChange={(v) => setStatus(v as ContentStatus)}>
                  <SelectTrigger>
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
              ) : (
                <div className="py-2">
                  <Badge variant="outline" className={cn(statusConfig[status].color)}>
                    {React.createElement(statusConfig[status].icon, { className: 'h-3 w-3 mr-1' })}
                    {getContentStatusLabel(status)}
                  </Badge>
                </div>
              )}
            </div>

            {/* Description (only if no AI content with full content) */}
            {(!hasAIContent || !aiContent?.content) && (
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                {isAdmin ? (
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descrição ou observações sobre o conteúdo..."
                    rows={4}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap py-2">
                    {description || 'Sem descrição'}
                  </p>
                )}
              </div>
            )}

            <Separator />

            {/* Created at info */}
            <div className="text-xs text-muted-foreground">
              Criado em {format(new Date(content.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>

            {/* Client actions for pending approval */}
            {!isAdmin && content.status === 'pending_approval' && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 text-emerald-600 hover:text-emerald-700"
                  onClick={() => {
                    onStatusChange?.(content.id, 'approved');
                    onOpenChange(false);
                  }}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Aprovar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    onStatusChange?.(content.id, 'rejected');
                    onOpenChange(false);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Solicitar Alteração
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Admin actions - fixed at bottom */}
        {isAdmin && (
          <div className="border-t px-6 py-4 shrink-0">
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isLoading || !title.trim()}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
