import { Instagram, Facebook, FileText, Mail, Megaphone, MoreHorizontal, Check, X, Clock, Send, Eye } from 'lucide-react';
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
import type { ContentType, ContentStatus, EditorialContent } from '@/hooks/useEditorialCalendar';
import { getContentTypeLabel, getContentStatusLabel } from '@/hooks/useEditorialCalendar';

interface ContentCardProps {
  content: EditorialContent;
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

  if (compact) {
    return (
      <button
        onClick={() => onClick?.(content)}
        className={cn(
          'w-full text-left p-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors',
          typeConfig.bgColor,
          'hover:opacity-80 cursor-pointer'
        )}
      >
        <TypeIcon className={cn('h-3 w-3 flex-shrink-0', typeConfig.color)} />
        <span className="truncate font-medium">{content.title}</span>
      </button>
    );
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
