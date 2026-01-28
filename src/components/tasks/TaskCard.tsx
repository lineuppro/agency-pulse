import { Calendar, Tag, User, FileText, GripVertical, MessageSquare, Paperclip } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type TaskStatus = 'pending' | 'in_progress' | 'completed';
type TaskCategory = 'ads' | 'dev' | 'automation' | 'creative';

interface Task {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  category: TaskCategory;
  due_date: string | null;
  assigned_to: string | null;
  meeting_agenda_id: string | null;
  created_at: string;
  archived_at?: string | null;
  clients?: { name: string } | null;
  meeting_agendas?: { title: string; meeting_date: string } | null;
  comments_count?: number;
  attachments_count?: number;
}

const categoryLabels: Record<TaskCategory, string> = {
  ads: 'Anúncios',
  dev: 'Desenvolvimento',
  automation: 'Automação',
  creative: 'Criativo',
};

const categoryColors: Record<TaskCategory, string> = {
  ads: 'bg-blue-500/10 text-blue-500',
  dev: 'bg-green-500/10 text-green-500',
  automation: 'bg-purple-500/10 text-purple-500',
  creative: 'bg-orange-500/10 text-orange-500',
};

interface TaskCardProps {
  task: Task;
  getUserName: (userId: string | null) => string | null;
  onClick: () => void;
}

export function TaskCard({ task, getUserName, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-2 mb-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-foreground truncate">
              {task.title}
            </h4>
            <p className="text-xs text-muted-foreground">
              {task.clients?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`${categoryColors[task.category]} text-xs`}>
            <Tag className="h-3 w-3 mr-1" />
            {categoryLabels[task.category]}
          </Badge>
          {task.due_date && (
            <Badge variant="outline" className="text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              {new Date(task.due_date).toLocaleDateString('pt-BR')}
            </Badge>
          )}
          {task.meeting_agendas && (
            <Badge variant="secondary" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              Reunião
            </Badge>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between">
          {task.assigned_to && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{getUserName(task.assigned_to)}</span>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {(task.comments_count ?? 0) > 0 && (
              <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <MessageSquare className="h-3 w-3" />
                <span>{task.comments_count}</span>
              </div>
            )}
            {(task.attachments_count ?? 0) > 0 && (
              <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <Paperclip className="h-3 w-3" />
                <span>{task.attachments_count}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TaskCardOverlayProps {
  task: Task;
}

export function TaskCardOverlay({ task }: TaskCardOverlayProps) {
  return (
    <Card className="border-border/50 shadow-lg cursor-grabbing rotate-3">
      <CardContent className="p-4">
        <div className="flex items-start gap-2 mb-2">
          <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-foreground truncate">
              {task.title}
            </h4>
            <p className="text-xs text-muted-foreground">
              {task.clients?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`${categoryColors[task.category]} text-xs`}>
            <Tag className="h-3 w-3 mr-1" />
            {categoryLabels[task.category]}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
