import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Sparkles, Loader2, Plus, Calendar, FileText, 
  Trash2, Copy, Save, Eye, X, CalendarIcon, UserPlus 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMeetingAgendas, MeetingAgenda, AgendaTask } from '@/hooks/useMeetingAgendas';
import { cn } from '@/lib/utils';

type TaskCategory = 'ads' | 'dev' | 'automation' | 'creative';

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

export default function AdminMeetingAgenda() {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingAgenda, setViewingAgenda] = useState<MeetingAgenda | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formDate, setFormDate] = useState<Date>(new Date());
  const [formTitle, setFormTitle] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formTasks, setFormTasks] = useState<AgendaTask[]>([]);
  const [newTask, setNewTask] = useState<AgendaTask>({ title: '', category: 'ads' });

  const { agendas, isLoading, fetchAgendas, createAgenda, updateAgenda, deleteAgenda, generateSummary, fetchAgendaTasks } = useMeetingAgendas(selectedClientId);

  const { data: clients } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: clientUsers } = useQuery({
    queryKey: ['client-users', selectedClientId],
    queryFn: async () => {
      if (!selectedClientId) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .eq('client_id', selectedClientId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedClientId,
  });

  useEffect(() => {
    if (selectedClientId) {
      fetchAgendas();
    }
  }, [selectedClientId, fetchAgendas]);

  const resetForm = () => {
    setFormDate(new Date());
    setFormTitle('');
    setFormNotes('');
    setFormSummary('');
    setFormTasks([]);
    setNewTask({ title: '', category: 'ads' });
    setViewingAgenda(null);
  };

  const handleOpenNewAgenda = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleViewAgenda = async (agenda: MeetingAgenda) => {
    setViewingAgenda(agenda);
    setFormDate(new Date(agenda.meeting_date));
    setFormTitle(agenda.title || '');
    setFormNotes(agenda.notes || '');
    setFormSummary(agenda.generated_summary || '');
    
    // Fetch tasks linked to this agenda
    const tasks = await fetchAgendaTasks(agenda.id);
    setFormTasks(tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description || undefined,
      category: t.category as TaskCategory,
      assigned_to: t.assigned_to || undefined,
      due_date: t.due_date || undefined,
    })));
    
    setIsDialogOpen(true);
  };

  const handleGenerateSummary = async () => {
    if (!formNotes.trim()) {
      toast({ title: 'Adicione anotações', description: 'Escreva as anotações da reunião primeiro.', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    try {
      const summary = await generateSummary(formNotes);
      if (summary) {
        setFormSummary(summary);
        toast({ title: 'Resumo gerado!' });
      }
    } catch (error) {
      toast({ 
        title: 'Erro ao gerar resumo', 
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive' 
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleAddTask = () => {
    if (!newTask.title.trim()) return;
    setFormTasks([...formTasks, { ...newTask }]);
    setNewTask({ title: '', category: 'ads' });
  };

  const handleRemoveTask = (index: number) => {
    setFormTasks(formTasks.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      toast({ title: 'Título obrigatório', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (viewingAgenda) {
        // Update existing agenda
        await updateAgenda(viewingAgenda.id, {
          title: formTitle,
          notes: formNotes,
          generated_summary: formSummary || null,
          meeting_date: formDate.toISOString(),
        });
        toast({ title: 'Pauta atualizada!' });
      } else {
        // Create new agenda with tasks
        const newTasks = formTasks.filter(t => !t.id); // Only new tasks
        const agenda = await createAgenda(formTitle, formNotes, formDate, formSummary || null, newTasks);
        if (agenda) {
          toast({ title: 'Pauta criada com sucesso!' });
        }
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (agendaId: string) => {
    const success = await deleteAgenda(agendaId);
    if (success) {
      toast({ title: 'Pauta excluída!' });
      setIsDialogOpen(false);
      resetForm();
    }
  };

  const handleCopy = () => {
    const content = formSummary || formNotes;
    navigator.clipboard.writeText(content);
    toast({ title: 'Copiado para a área de transferência!' });
  };

  const selectedClient = clients?.find(c => c.id === selectedClientId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pautas de Reunião</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie pautas, anotações e tarefas de reuniões
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients?.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleOpenNewAgenda} disabled={!selectedClientId}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Pauta
          </Button>
        </div>
      </div>

      {!selectedClientId ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">Selecione um cliente</h3>
            <p className="text-sm text-muted-foreground">
              Escolha um cliente para visualizar e gerenciar pautas
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse border-border/50">
              <CardHeader className="h-20 bg-muted/30" />
              <CardContent className="h-12 bg-muted/20" />
            </Card>
          ))}
        </div>
      ) : agendas.length === 0 ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">Nenhuma pauta</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie a primeira pauta de reunião para {selectedClient?.name}
            </p>
            <Button onClick={handleOpenNewAgenda}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Pauta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agendas.map((agenda) => (
            <Card 
              key={agenda.id} 
              className="border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => handleViewAgenda(agenda)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(agenda.meeting_date), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  {agenda.generated_summary && (
                    <Badge variant="secondary" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      IA
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base mt-2 line-clamp-2">
                  {agenda.title || 'Sem título'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {agenda.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {agenda.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog for create/view/edit agenda */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { resetForm(); } setIsDialogOpen(open); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {viewingAgenda ? 'Detalhes da Pauta' : 'Nova Pauta de Reunião'}
            </DialogTitle>
            <DialogDescription>
              {selectedClient?.name}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 py-2">
              {/* Date and Title */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Data da Reunião</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formDate ? format(formDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={formDate}
                        onSelect={(date) => date && setFormDate(date)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ex: Reunião Mensal - Janeiro"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Anotações da Reunião</Label>
                <Textarea
                  id="notes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Digite aqui tudo que foi discutido na reunião, tarefas definidas, responsáveis, prazos..."
                  rows={6}
                  className="resize-none"
                />
              </div>

              {/* Tasks Section */}
              <div className="space-y-3">
                <Label>Tarefas Definidas na Reunião</Label>
                
                {formTasks.length > 0 && (
                  <div className="space-y-2">
                    {formTasks.map((task, index) => {
                      const assignedUser = clientUsers?.find(u => u.user_id === task.assigned_to);
                      return (
                        <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
                          <Badge className={cn("shrink-0", categoryColors[task.category])}>
                            {categoryLabels[task.category]}
                          </Badge>
                          <span className="flex-1 text-sm truncate">{task.title}</span>
                          {assignedUser && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {assignedUser.full_name || assignedUser.email}
                            </Badge>
                          )}
                          {task.id ? (
                            <Badge variant="secondary" className="text-xs">Existente</Badge>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleRemoveTask(index)}
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {!viewingAgenda && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        placeholder="Nova tarefa..."
                        className="flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTask())}
                      />
                      <Select
                        value={newTask.category}
                        onValueChange={(v) => setNewTask({ ...newTask, category: v as TaskCategory })}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(categoryLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Select
                        value={newTask.assigned_to || "unassigned"}
                        onValueChange={(v) => setNewTask({ ...newTask, assigned_to: v === "unassigned" ? undefined : v })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Responsável (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Sem responsável</SelectItem>
                          {clientUsers?.map((user) => (
                            <SelectItem key={user.user_id} value={user.user_id}>
                              {user.full_name || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="secondary" onClick={handleAddTask}>
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                )}
                
                {!viewingAgenda && formTasks.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Estas tarefas serão criadas automaticamente na página de Tarefas
                  </p>
                )}
              </div>

              {/* AI Summary */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Resumo Formatado</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleGenerateSummary}
                    disabled={generating || !formNotes.trim()}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-3 w-3" />
                        Gerar com IA
                      </>
                    )}
                  </Button>
                </div>
                <Textarea
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder="O resumo formatado aparecerá aqui após gerar com IA, ou você pode escrever manualmente..."
                  rows={8}
                  className="resize-none font-mono text-sm"
                />
              </div>
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex gap-2">
              {viewingAgenda && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir pauta?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. A pauta será removida permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleDelete(viewingAgenda.id)}
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {(formSummary || formNotes) && (
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
