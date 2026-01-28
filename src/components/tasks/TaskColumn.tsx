import { useSortable } from '@dnd-kit/sortable';
import { Badge } from '@/components/ui/badge';
import { TaskCard } from './TaskCard';

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

interface TaskColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  loading: boolean;
  getUserName: (userId: string | null) => string | null;
  onTaskClick: (task: Task) => void;
}

export function TaskColumn({
  status,
  label,
  tasks,
  loading,
  getUserName,
  onTaskClick,
}: TaskColumnProps) {
  const { setNodeRef, isOver } = useSortable({
    id: status,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">{label}</h3>
        <Badge variant="secondary" className="text-xs">
          {tasks.length}
        </Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-3 min-h-[200px] p-3 rounded-lg border transition-colors ${
          isOver
            ? 'bg-primary/10 border-primary'
            : 'bg-muted/30 border-border/50'
        }`}
      >
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-lg" />
            ))}
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              getUserName={getUserName}
              onClick={() => onTaskClick(task)}
            />
          ))
        )}
        {!loading && tasks.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma tarefa
          </p>
        )}
      </div>
    </div>
  );
}
