import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  Instagram,
  Facebook,
  FileText,
  Mail,
  Megaphone,
  MoreHorizontal,
  MessageSquare,
  Eye,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { EditorialContent, ContentType, ContentStatus } from '@/hooks/useEditorialCalendar';
import { getContentTypeLabel, getContentStatusLabel } from '@/hooks/useEditorialCalendar';

interface ContentListViewProps {
  contents: EditorialContent[];
  isAdmin?: boolean;
  clientName?: string;
}

type SortField = 'scheduled_date' | 'status' | 'content_type' | 'title';
type SortDirection = 'asc' | 'desc';

const contentTypeConfig: Record<ContentType, { icon: typeof Instagram; color: string }> = {
  instagram: { icon: Instagram, color: 'text-pink-600' },
  facebook: { icon: Facebook, color: 'text-blue-600' },
  blog: { icon: FileText, color: 'text-emerald-600' },
  email: { icon: Mail, color: 'text-amber-600' },
  google_ads: { icon: Megaphone, color: 'text-orange-600' },
  other: { icon: MoreHorizontal, color: 'text-muted-foreground' },
};

const statusConfig: Record<ContentStatus, { color: string; bgColor: string }> = {
  draft: { color: 'text-muted-foreground', bgColor: 'bg-muted' },
  pending_approval: { color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  approved: { color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  rejected: { color: 'text-destructive', bgColor: 'bg-destructive/10' },
  published: { color: 'text-primary', bgColor: 'bg-primary/10' },
};

export function ContentListView({ contents, isAdmin = false, clientName }: ContentListViewProps) {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>('scheduled_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const sortedContents = useMemo(() => {
    return [...contents].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'scheduled_date':
          comparison = a.scheduled_date.localeCompare(b.scheduled_date);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'content_type':
          comparison = a.content_type.localeCompare(b.content_type);
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [contents, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleContentClick = (content: EditorialContent) => {
    const basePath = isAdmin ? '/admin' : '/portal';
    navigate(`${basePath}/calendar/${content.id}`);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    );
  };

  if (contents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">Nenhum conteúdo encontrado</h3>
        <p className="text-muted-foreground">
          Não há conteúdos programados para o período selecionado.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('scheduled_date')}
            >
              Data <SortIcon field="scheduled_date" />
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('status')}
            >
              Status <SortIcon field="status" />
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => handleSort('content_type')}
            >
              Tipo <SortIcon field="content_type" />
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-muted/50 w-[40%]"
              onClick={() => handleSort('title')}
            >
              Título <SortIcon field="title" />
            </TableHead>
            <TableHead className="text-center">
              <MessageSquare className="h-4 w-4 inline" />
            </TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedContents.map((content) => {
            const typeConfig = contentTypeConfig[content.content_type];
            const TypeIcon = typeConfig.icon;
            const status = statusConfig[content.status];

            return (
              <TableRow 
                key={content.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleContentClick(content)}
              >
                <TableCell className="font-medium">
                  {format(new Date(content.scheduled_date), "dd 'de' MMM", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="secondary" 
                    className={cn('text-xs', status.bgColor, status.color)}
                  >
                    {getContentStatusLabel(content.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <TypeIcon className={cn('h-4 w-4', typeConfig.color)} />
                    <span className="text-sm">{getContentTypeLabel(content.content_type)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium line-clamp-1">{content.title}</span>
                  {content.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {content.description}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="text-xs">
                    0
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContentClick(content);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
