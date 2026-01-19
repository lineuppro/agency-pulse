import { useEffect, useState } from 'react';
import { Plus, GripVertical, Calendar, Tag, User, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
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
  clients?: { name: string } | null;
  meeting_agendas?: { title: string; meeting_date: string } | null;
}

interface Client {
  id: string;
  name: string;
}

interface UserProfile {
  user_id: string;
  full_name: string | null;
  email: string;
  client_id: string | null;
}

const statusLabels: Record<TaskStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em Progresso',
  completed: 'Concluído',
};

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

interface DraggableTaskCardProps {
  task: Task;
  getUserName: (userId: string | null) => string | null;
}

function DraggableTaskCard({ task, getUserName }: DraggableTaskCardProps) {
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
      className="border-border/50 cursor-grab active:cursor-grabbing hover:border-primary/30 transition-colors"
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-2 mb-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing"
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
        {task.assigned_to && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{getUserName(task.assigned_to)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TaskCardOverlay({ task, getUserName }: DraggableTaskCardProps) {
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

export default function AdminTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('all');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    client_id: '',
    title: '',
    description: '',
    category: 'ads' as TaskCategory,
    due_date: '',
    assigned_to: '',
  });
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const fetchData = async () => {
    try {
      const [tasksRes, clientsRes, usersRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*, clients(name), meeting_agendas(title, meeting_date)')
          .order('created_at', { ascending: false }),
        supabase.from('clients').select('id, name').order('name'),
        supabase.from('profiles').select('user_id, full_name, email, client_id'),
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (usersRes.error) throw usersRes.error;

      setTasks(tasksRes.data || []);
      setClients(clientsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Erro ao carregar dados',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get available users for a specific client (users linked to that client + current admin)
  const getAvailableUsers = (clientId: string) => {
    const clientUsers = users.filter(u => u.client_id === clientId);
    const adminUser = users.find(u => u.user_id === user?.id);
    
    // Combine and deduplicate
    const allUsers = [...clientUsers];
    if (adminUser && !allUsers.find(u => u.user_id === adminUser.user_id)) {
      allUsers.unshift(adminUser);
    }
    
    return allUsers;
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return null;
    const userProfile = users.find(u => u.user_id === userId);
    return userProfile?.full_name || userProfile?.email?.split('@')[0] || null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase.from('tasks').insert({
        client_id: formData.client_id,
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        due_date: formData.due_date || null,
        assigned_to: formData.assigned_to || null,
      });

      if (error) throw error;
      
      toast({ title: 'Tarefa criada com sucesso!' });
      setIsDialogOpen(false);
      setFormData({ client_id: '', title: '', description: '', category: 'ads', due_date: '', assigned_to: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'Erro ao criar tarefa',
        variant: 'destructive',
      });
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;
      
      setTasks(tasks.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      ));
      toast({ title: 'Status atualizado!' });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Erro ao atualizar status',
        variant: 'destructive',
      });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a column
    const columns: TaskStatus[] = ['pending', 'in_progress', 'completed'];
    if (columns.includes(overId as TaskStatus)) {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== overId) {
        updateTaskStatus(taskId, overId as TaskStatus);
      }
    }
  };

  const columns: { key: TaskStatus; label: string }[] = [
    { key: 'pending', label: 'Pendente' },
    { key: 'in_progress', label: 'Em Progresso' },
    { key: 'completed', label: 'Concluído' },
  ];

  const filteredTasks = selectedClientFilter === 'all' 
    ? tasks 
    : tasks.filter(t => t.client_id === selectedClientFilter);

  const getTasksByStatus = (status: TaskStatus) => 
    filteredTasks.filter(t => t.status === status);

  const availableUsersForForm = formData.client_id ? getAvailableUsers(formData.client_id) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tarefas</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as entregas de todos os clientes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedClientFilter} onValueChange={setSelectedClientFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={clients.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Tarefa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Tarefa</DialogTitle>
              <DialogDescription>
                Crie uma nova tarefa para um cliente.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client">Cliente *</Label>
                <Select 
                  value={formData.client_id} 
                  onValueChange={(v) => setFormData({ ...formData, client_id: v, assigned_to: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Criar campanha de remarketing"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes da tarefa..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(v) => setFormData({ ...formData, category: v as TaskCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Data de Entrega</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assigned_to">Responsável</Label>
                <Select 
                  value={formData.assigned_to} 
                  onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}
                  disabled={!formData.client_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.client_id ? "Selecione um responsável" : "Selecione um cliente primeiro"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsersForForm.map((userProfile) => (
                      <SelectItem key={userProfile.user_id} value={userProfile.user_id}>
                        {userProfile.full_name || userProfile.email.split('@')[0]}
                        {userProfile.user_id === user?.id && ' (você)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!formData.client_id || !formData.title}>
                  Criar
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {clients.length === 0 && !loading ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">
              Você precisa criar um cliente antes de adicionar tarefas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {columns.map((column) => (
              <DroppableColumn
                key={column.key}
                status={column.key}
                label={column.label}
                tasks={getTasksByStatus(column.key)}
                loading={loading}
                getUserName={getUserName}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? (
              <TaskCardOverlay task={activeTask} getUserName={getUserName} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

interface DroppableColumnProps {
  status: TaskStatus;
  label: string;
  tasks: Task[];
  loading: boolean;
  getUserName: (userId: string | null) => string | null;
}

function DroppableColumn({ status, label, tasks, loading, getUserName }: DroppableColumnProps) {
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
            <DraggableTaskCard key={task.id} task={task} getUserName={getUserName} />
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
