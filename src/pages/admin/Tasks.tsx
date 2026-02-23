import { useEffect, useState } from 'react';
import { Plus, Archive, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useClientContext } from '@/contexts/ClientContext';
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
import { TaskColumn } from '@/components/tasks/TaskColumn';
import { TaskCardOverlay } from '@/components/tasks/TaskCard';
import { TaskDetailSidebar } from '@/components/tasks/TaskDetailSidebar';

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

interface UserProfile {
  user_id: string;
  full_name: string | null;
  email: string;
  client_id: string | null;
}

const categoryLabels: Record<TaskCategory, string> = {
  ads: 'Anúncios',
  dev: 'Desenvolvimento',
  automation: 'Automação',
  creative: 'Criativo',
};

export default function AdminTasks() {
  const { user } = useAuth();
  const { clients, selectedClientId } = useClientContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
      activationConstraint: { distance: 8 },
    })
  );

  const fetchData = async () => {
    try {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      let tasksQuery = supabase
        .from('tasks')
        .select('*, clients(name), meeting_agendas(title, meeting_date)')
        .order('created_at', { ascending: false });

      if (showArchived) {
        tasksQuery = tasksQuery.not('archived_at', 'is', null);
      } else {
        tasksQuery = tasksQuery.is('archived_at', null);
      }

      const [tasksRes, usersRes] = await Promise.all([
        tasksQuery,
        supabase.from('profiles').select('user_id, full_name, email, client_id'),
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (usersRes.error) throw usersRes.error;

      const tasksToArchive = (tasksRes.data || []).filter(
        (t) => t.status === 'completed' && !t.archived_at && new Date(t.updated_at) < sixtyDaysAgo
      );

      if (tasksToArchive.length > 0) {
        await supabase
          .from('tasks')
          .update({ archived_at: new Date().toISOString() })
          .in('id', tasksToArchive.map((t) => t.id));
      }

      const taskIds = (tasksRes.data || []).map((t) => t.id);
      const [commentsCountRes, attachmentsCountRes] = await Promise.all([
        supabase.from('task_comments').select('task_id').in('task_id', taskIds),
        supabase.from('task_attachments').select('task_id').in('task_id', taskIds),
      ]);

      const commentsCount: Record<string, number> = {};
      const attachmentsCount: Record<string, number> = {};
      commentsCountRes.data?.forEach((c) => { commentsCount[c.task_id] = (commentsCount[c.task_id] || 0) + 1; });
      attachmentsCountRes.data?.forEach((a) => { attachmentsCount[a.task_id] = (attachmentsCount[a.task_id] || 0) + 1; });

      const tasksWithCounts = (tasksRes.data || [])
        .filter((t) => !tasksToArchive.find((ta) => ta.id === t.id))
        .map((t) => ({
          ...t,
          comments_count: commentsCount[t.id] || 0,
          attachments_count: attachmentsCount[t.id] || 0,
        }));

      setTasks(tasksWithCounts as Task[]);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Erro ao carregar dados', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [showArchived]);

  // Pre-fill client when global selector changes
  useEffect(() => {
    if (selectedClientId !== 'all') {
      setFormData(prev => ({ ...prev, client_id: selectedClientId, assigned_to: '' }));
    }
  }, [selectedClientId]);

  const getAvailableUsers = (clientId: string) => {
    const clientUsers = users.filter((u) => u.client_id === clientId);
    const adminUser = users.find((u) => u.user_id === user?.id);
    const allUsers = [...clientUsers];
    if (adminUser && !allUsers.find((u) => u.user_id === adminUser.user_id)) {
      allUsers.unshift(adminUser);
    }
    return allUsers;
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return null;
    const userProfile = users.find((u) => u.user_id === userId);
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
      setFormData({ client_id: selectedClientId !== 'all' ? selectedClientId : '', title: '', description: '', category: 'ads', due_date: '', assigned_to: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating task:', error);
      toast({ title: 'Erro ao criar tarefa', variant: 'destructive' });
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
      if (error) throw error;
      if (user) {
        await supabase.from('task_activity_log').insert([{ task_id: taskId, user_id: user.id, action: 'status_changed', details: { new_status: newStatus } }]);
      }
      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
      toast({ title: 'Status atualizado!' });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
      if (error) throw error;
      if (user) {
        await supabase.from('task_activity_log').insert([{ task_id: taskId, user_id: user.id, action: 'updated', details: updates }]);
      }
      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));
      // Update selected task if it's open
      if (selectedTask?.id === taskId) {
        setSelectedTask(prev => prev ? { ...prev, ...updates } : prev);
      }
      toast({ title: 'Tarefa atualizada!' });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({ title: 'Erro ao atualizar tarefa', variant: 'destructive' });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      setTasks(tasks.filter((t) => t.id !== taskId));
      toast({ title: 'Tarefa excluída!' });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({ title: 'Erro ao excluir tarefa', variant: 'destructive' });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const overId = over.id as string;
    const columns: TaskStatus[] = ['pending', 'in_progress', 'completed'];
    if (columns.includes(overId as TaskStatus)) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.status !== overId) {
        updateTaskStatus(taskId, overId as TaskStatus);
      }
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsSidebarOpen(true);
  };

  const columns: { key: TaskStatus; label: string }[] = [
    { key: 'pending', label: 'Pendente' },
    { key: 'in_progress', label: 'Em Progresso' },
    { key: 'completed', label: 'Concluído' },
  ];

  const filteredTasks = selectedClientId === 'all'
    ? tasks
    : tasks.filter((t) => t.client_id === selectedClientId);

  const getTasksByStatus = (status: TaskStatus) =>
    filteredTasks.filter((t) => t.status === status);

  const availableUsersForForm = formData.client_id ? getAvailableUsers(formData.client_id) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tarefas</h1>
          <p className="text-muted-foreground mt-1">Gerencie as entregas de todos os clientes</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
            <Label htmlFor="show-archived" className="text-sm flex items-center gap-1 cursor-pointer">
              {showArchived ? (<><ArchiveRestore className="h-4 w-4" />Arquivadas</>) : (<><Archive className="h-4 w-4" />Ver arquivadas</>)}
            </Label>
          </div>
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
                <DialogDescription>Crie uma nova tarefa para um cliente.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente *</Label>
                  <Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v, assigned_to: '' })}>
                    <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Ex: Criar campanha de remarketing" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Detalhes da tarefa..." rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria *</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as TaskCategory })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Data de Entrega</Label>
                    <Input id="due_date" type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Responsável</Label>
                  <Select value={formData.assigned_to} onValueChange={(v) => setFormData({ ...formData, assigned_to: v })} disabled={!formData.client_id}>
                    <SelectTrigger>
                      <SelectValue placeholder={formData.client_id ? 'Selecione um responsável' : 'Selecione um cliente primeiro'} />
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
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={!formData.client_id || !formData.title}>Criar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {clients.length === 0 && !loading ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-center">Você precisa criar um cliente antes de adicionar tarefas.</p>
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {columns.map((column) => (
              <TaskColumn key={column.key} status={column.key} label={column.label} tasks={getTasksByStatus(column.key)} loading={loading} getUserName={getUserName} onTaskClick={handleTaskClick} />
            ))}
          </div>
          <DragOverlay>{activeTask ? <TaskCardOverlay task={activeTask} /> : null}</DragOverlay>
        </DndContext>
      )}

      <TaskDetailSidebar
        task={selectedTask}
        open={isSidebarOpen}
        onClose={() => { setIsSidebarOpen(false); setSelectedTask(null); }}
        onDelete={deleteTask}
        onUpdate={updateTask}
        isAdmin={true}
        getUserName={getUserName}
        users={users}
        clients={clients}
      />
    </div>
  );
}
