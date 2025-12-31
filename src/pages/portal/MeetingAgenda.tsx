import { useEffect, useState } from 'react';
import { Sparkles, CheckCircle, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

export default function MeetingAgenda() {
  const { clientId } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTasks = async () => {
      if (!clientId) {
        setLoading(false);
        return;
      }

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

    fetchTasks();
  }, [clientId]);

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  const generateSummary = async () => {
    setGenerating(true);
    // AI summary generation will be implemented in Phase 4
    setTimeout(() => {
      setSummary(`## Resumo da Reunião

### ✅ O que foi feito:
${completedTasks.length > 0 
  ? completedTasks.map(t => `- ${t.title}`).join('\n')
  : '- Nenhuma tarefa concluída ainda'}

### 🔄 Em andamento:
${inProgressTasks.length > 0
  ? inProgressTasks.map(t => `- ${t.title}`).join('\n')
  : '- Nenhuma tarefa em progresso'}

### 📋 Próximos passos:
${pendingTasks.length > 0
  ? pendingTasks.map(t => `- ${t.title}`).join('\n')
  : '- Nenhuma tarefa pendente'}
`);
      setGenerating(false);
      toast({ title: 'Resumo gerado!' });
    }, 1500);
  };

  if (!clientId) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pauta de Reunião</h1>
          <p className="text-muted-foreground mt-1">
            Seu perfil ainda não está vinculado a um cliente.
          </p>
        </div>
        <Card className="border-border/50 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-muted-foreground text-center">
              Entre em contato com o administrador para vincular seu acesso.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pauta de Reunião</h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe o progresso das suas entregas
          </p>
        </div>
        <Button onClick={generateSummary} disabled={generating || tasks.length === 0}>
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Gerar Resumo com IA
            </>
          )}
        </Button>
      </div>

      {summary && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Resumo Gerado por IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-sm font-sans text-foreground bg-transparent p-0 m-0">
                {summary}
              </pre>
            </div>
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
              Nenhuma tarefa concluída ainda
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {completedTasks.slice(0, 6).map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/20">
                  <CheckCircle className="h-4 w-4 text-success shrink-0" />
                  <span className="text-sm text-foreground truncate">{task.title}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
