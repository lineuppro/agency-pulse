import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

export default function AdminChats() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Conversas</h1>
        <p className="text-muted-foreground mt-1">
          Visualize as conversas dos clientes com o assistente IA
        </p>
      </div>

      <Card className="border-border/50 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">
            Nenhuma conversa ainda
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            As conversas dos clientes com o assistente IA aparecerão aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
