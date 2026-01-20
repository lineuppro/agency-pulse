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
  FolderOpen
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
import { cn } from '@/lib/utils';
import type { ContentType, ContentStatus, EditorialContent } from '@/hooks/useEditorialCalendar';
import { getContentTypeLabel, getContentStatusLabel } from '@/hooks/useEditorialCalendar';

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
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
          </div>
        </SheetHeader>

        <div className="space-y-6 py-4">
          {/* Campaign info */}
          {campaignName && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Campanha: <span className="font-medium">{campaignName}</span></span>
            </div>
          )}

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

          {/* Description */}
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

          {/* Admin actions */}
          {isAdmin && (
            <div className="flex gap-2 pt-2">
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
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
