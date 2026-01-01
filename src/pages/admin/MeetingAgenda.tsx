import { useEffect, useState } from 'react';
import { Sparkles, CheckCircle, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

type TaskStatus = 'pending' | 'in_progress' | 'completed';
type TaskCategory = 'ads' | 'dev' | 'automation' | 'creative';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  category: TaskCategory;
  due_date: string | null;
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

export default function AdminMeetingAgenda() {
  const { session } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: clients } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, google_ads_id')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const fetchTasks = async (clientId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClientId) {
      fetchTasks(selectedClientId);
      setSummary(null);
    } else {
      setTasks([]);
    }
  }, [selectedClientId]);

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const generateSummary = async () => {
    if (!selectedClientId || !session?.access_token) return;

    setGenerating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-meeting-summary`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ clientId: selectedClientId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar resumo');
      }

      setSummary(data.summary);
      toast({ title: 'Resumo gerado com sucesso!' });
    } catch (error) {
      console.error('Error generating summary:', error);
      toast({
        title: 'Erro ao gerar resumo',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const selectedClient = clients?.find(c => c.id === selectedClientId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pauta de Reunião</h1>
          <p className="text-muted-foreground mt-1">
            Gere resumos inteligentes para reuniões com clientes
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
          <Button 
            onClick={generateSummary} 
            disabled={generating || !selectedClientId || tasks.length === 0}
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Gerar com IA
              </>
            )}
          </Button>
        </div>
      </div>

      {!selectedClientId ? (
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              Selecione um cliente
            </h3>
            <p className="text-sm text-muted-foreground">
              Escolha um cliente para visualizar as tarefas e gerar a pauta
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {summary && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Resumo Gerado por IA - {selectedClient?.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[400px]">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-sm font-sans text-foreground bg-transparent p-0 m-0">
                      {summary}
                    </pre>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Em Progresso */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-warning" />
                  <CardTitle>Em Progresso</CardTitle>
                </div>
                <CardDescription>
                  Tarefas que estão sendo trabalhadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-16 bg-muted rounded-lg" />
                    ))}
                  </div>
                ) : inProgressTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma tarefa em andamento
                  </p>
                ) : (
                  <div className="space-y-3">
                    {inProgressTasks.map((task) => (
                      <div key={task.id} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium text-foreground">{task.title}</h4>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                          </div>
                          <Badge className={`${categoryColors[task.category]} shrink-0`}>
                            {categoryLabels[task.category]}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pendentes */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Próximos Passos</CardTitle>
                </div>
                <CardDescription>
                  Tarefas aguardando início
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="h-16 bg-muted rounded-lg" />
                    ))}
                  </div>
                ) : pendingTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma tarefa pendente
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pendingTasks.map((task) => (
                      <div key={task.id} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-medium text-foreground">{task.title}</h4>
                            {task.due_date && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Entrega: {new Date(task.due_date).toLocaleDateString('pt-BR')}
                              </p>
                            )}
                          </div>
                          <Badge className={`${categoryColors[task.category]} shrink-0`}>
                            {categoryLabels[task.category]}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Concluídos */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <CardTitle>Concluídos Recentemente</CardTitle>
              </div>
              <CardDescription>
                Entregas finalizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-12 bg-muted rounded-lg" />
                  ))}
                </div>
              ) : completedTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhuma tarefa concluída
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {completedTasks.slice(0, 9).map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/20">
                      <CheckCircle className="h-4 w-4 text-success shrink-0" />
                      <span className="text-sm text-foreground truncate">{task.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
