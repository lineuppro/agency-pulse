import { Instagram, Facebook, FileText, Mail, Megaphone, MoreHorizontal, Check, X, Clock, Send, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import type { ContentType, ContentStatus, EditorialContent } from '@/hooks/useEditorialCalendar';
import { getContentTypeLabel, getContentStatusLabel } from '@/hooks/useEditorialCalendar';

interface ContentCardProps {
  content: EditorialContent & {
    _isScheduledPost?: boolean;
    _scheduledPostStatus?: string;
    _scheduledAt?: string;
    _mediaUrls?: string[];
  };
  compact?: boolean;
  isAdmin?: boolean;
  onEdit?: (content: EditorialContent) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: ContentStatus) => void;
  onClick?: (content: EditorialContent) => void;
}

const contentTypeConfig: Record<ContentType, { icon: typeof Instagram; color: string; bgColor: string }> = {
  instagram: { 
    icon: Instagram, 
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
  },
  facebook: { 
    icon: Facebook, 
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  blog: { 
    icon: FileText, 
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  email: { 
    icon: Mail, 
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  google_ads: { 
    icon: Megaphone, 
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  other: { 
    icon: MoreHorizontal, 
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
};

const statusConfig: Record<ContentStatus, { icon: typeof Clock; color: string; bgColor: string }> = {
  draft: { 
    icon: FileText, 
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  pending_approval: { 
    icon: Clock, 
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  approved: { 
    icon: Check, 
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  rejected: { 
    icon: X, 
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  published: { 
    icon: Send, 
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
};

export function ContentCard({
  content,
  compact = false,
  isAdmin = false,
  onEdit,
  onDelete,
  onStatusChange,
  onClick,
}: ContentCardProps) {
  const typeConfig = contentTypeConfig[content.content_type];
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig[content.status].icon;
  const isScheduledPost = !!(content as any)._isScheduledPost;

  const scheduledPostStatusLabels: Record<string, { label: string; color: string }> = {
    draft: { label: 'Rascunho', color: 'text-muted-foreground' },
    scheduled: { label: 'Agendado', color: 'text-amber-600 dark:text-amber-400' },
    publishing: { label: 'Publicando', color: 'text-blue-600 dark:text-blue-400' },
    published: { label: 'Publicado', color: 'text-emerald-600 dark:text-emerald-400' },
    failed: { label: 'Falhou', color: 'text-destructive' },
    cancelled: { label: 'Cancelado', color: 'text-muted-foreground' },
  };

  if (compact) {
    const compactCard = (
      <button
        onClick={() => onClick?.(content)}
        className={cn(
          'w-full text-left p-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors',
          typeConfig.bgColor,
          isScheduledPost && 'border border-dashed border-primary/40',
          'hover:opacity-80 cursor-pointer'
        )}
      >
        {isScheduledPost && <Send className="h-3 w-3 flex-shrink-0 text-primary" />}
        <TypeIcon className={cn('h-3 w-3 flex-shrink-0', typeConfig.color)} />
        <span className="truncate font-medium">{content.title}</span>
      </button>
    );

    if (isScheduledPost) {
      const spData = content as any;
      const spStatus = scheduledPostStatusLabels[spData._scheduledPostStatus] || scheduledPostStatusLabels.scheduled;
      const mediaUrls: string[] = spData._mediaUrls || [];
      const scheduledAt = spData._scheduledAt ? new Date(spData._scheduledAt) : null;

      return (
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            {compactCard}
          </HoverCardTrigger>
          <HoverCardContent className="w-64 p-3" side="right" align="start">
            {mediaUrls.length > 0 && (
              <div className="mb-2 rounded-md overflow-hidden">
                <img
                  src={mediaUrls[0]}
                  alt="Preview"
                  className="w-full h-32 object-cover"
                />
              </div>
            )}
            <div className="space-y-1.5">
              {scheduledAt && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{format(scheduledAt, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <div className={cn('p-1 rounded', typeConfig.bgColor)}>
                  <TypeIcon className={cn('h-3 w-3', typeConfig.color)} />
                </div>
                <span className="text-xs font-medium capitalize">{content.content_type}</span>
              </div>
              <Badge variant="outline" className={cn('text-xs', spStatus.color)}>
                {spStatus.label}
              </Badge>
              {content.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{content.description}</p>
              )}
            </div>
          </HoverCardContent>
        </HoverCard>
      );
    }

    return compactCard;
  }

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-all hover:shadow-md cursor-pointer',
        'bg-card'
      )}
      onClick={() => onClick?.(content)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn('p-1.5 rounded-md', typeConfig.bgColor)}>
            <TypeIcon className={cn('h-4 w-4', typeConfig.color)} />
          </div>
          <div className="min-w-0">
            <h4 className="font-medium text-sm truncate">{content.title}</h4>
            <p className="text-xs text-muted-foreground">{getContentTypeLabel(content.content_type)}</p>
          </div>
        </div>

        {(isAdmin || content.status === 'pending_approval') && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick?.(content); }}>
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </DropdownMenuItem>
              
              {isAdmin && (
                <>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(content); }}>
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  
                  {content.status === 'draft' && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange?.(content.id, 'pending_approval'); }}>
                      <Send className="h-4 w-4 mr-2" />
                      Enviar para Aprovação
                    </DropdownMenuItem>
                  )}
                  
                  {content.status === 'approved' && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onStatusChange?.(content.id, 'published'); }}>
                      <Check className="h-4 w-4 mr-2" />
                      Marcar como Publicado
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDelete?.(content.id); }}
                  >
                    Excluir
                  </DropdownMenuItem>
                </>
              )}

              {!isAdmin && content.status === 'pending_approval' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-emerald-600"
                    onClick={(e) => { e.stopPropagation(); onStatusChange?.(content.id, 'approved'); }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Aprovar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); onStatusChange?.(content.id, 'rejected'); }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Solicitar Alteração
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {content.description && (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
          {content.description}
        </p>
      )}

      <div className="mt-2 flex items-center gap-2">
        <Badge variant="outline" className={cn('text-xs', statusConfig[content.status].color)}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {getContentStatusLabel(content.status)}
        </Badge>
      </div>
    </div>
  );
}
