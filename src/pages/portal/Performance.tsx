import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, Target, MousePointer, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function Performance() {
  const { clientId } = useAuth();

  const metrics = [
    {
      title: 'ROAS',
      value: '-',
      change: null,
      icon: TrendingUp,
      description: 'Retorno sobre investimento em anúncios',
    },
    {
      title: 'CPA',
      value: '-',
      change: null,
      icon: Target,
      description: 'Custo por aquisição',
    },
    {
      title: 'Gasto Total',
      value: '-',
      change: null,
      icon: DollarSign,
      description: 'Investimento no período',
    },
    {
      title: 'Conversões',
      value: '-',
      change: null,
      icon: MousePointer,
      description: 'Total de conversões',
    },
  ];

  if (!clientId) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Performance</h1>
          <p className="text-muted-foreground mt-1">
            Seu perfil ainda não está vinculado a um cliente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Performance</h1>
        <p className="text-muted-foreground mt-1">
          Métricas do Google Ads em tempo real
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.title} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{metric.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/50 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-1">
            Integração Pendente
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Os dados do Google Ads serão exibidos aqui quando a integração estiver configurada.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
