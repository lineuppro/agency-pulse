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
  Edit,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { ContentType, ContentStatus, EditorialContent } from '@/hooks/useEditorialCalendar';
import { getContentTypeLabel, getContentStatusLabel } from '@/hooks/useEditorialCalendar';

interface ContentDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: EditorialContent | null;
  isAdmin?: boolean;
  onEdit?: (content: EditorialContent) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: ContentStatus) => void;
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

export function ContentDetailModal({
  open,
  onOpenChange,
  content,
  isAdmin = false,
  onEdit,
  onDelete,
  onStatusChange,
}: ContentDetailModalProps) {
  if (!content) return null;

  const typeConfig = contentTypeConfig[content.content_type];
  const TypeIcon = typeConfig.icon;
  const StatusIcon = statusConfig[content.status].icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', typeConfig.bgColor)}>
              <TypeIcon className={cn('h-5 w-5', typeConfig.color)} />
            </div>
            <div>
              <DialogTitle className="text-left">{content.title}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {getContentTypeLabel(content.content_type)}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {format(new Date(content.scheduled_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>
            <Badge variant="outline" className={cn(statusConfig[content.status].color)}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {getContentStatusLabel(content.status)}
            </Badge>
          </div>

          {content.description && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2">Descrição</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {content.description}
                </p>
              </div>
            </>
          )}

          <Separator />

          <div className="text-xs text-muted-foreground">
            Criado em {format(new Date(content.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isAdmin && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onEdit?.(content);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>

              {content.status === 'draft' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onStatusChange?.(content.id, 'pending_approval');
                    onOpenChange(false);
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar para Aprovação
                </Button>
              )}

              {content.status === 'approved' && (
                <Button
                  onClick={() => {
                    onStatusChange?.(content.id, 'published');
                    onOpenChange(false);
                  }}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Marcar como Publicado
                </Button>
              )}

              <Button
                variant="destructive"
                onClick={() => {
                  onDelete?.(content.id);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </>
          )}

          {!isAdmin && content.status === 'pending_approval' && (
            <>
              <Button
                variant="outline"
                className="text-emerald-600 hover:text-emerald-700"
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
                onClick={() => {
                  onStatusChange?.(content.id, 'rejected');
                  onOpenChange(false);
                }}
              >
                <X className="h-4 w-4 mr-2" />
                Solicitar Alteração
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
