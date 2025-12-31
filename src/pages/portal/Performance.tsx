import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendingUp, DollarSign, Target, MousePointer, BarChart3, RefreshCw, Eye, MousePointerClick } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGoogleAdsMetrics, DateRange } from '@/hooks/useGoogleAdsMetrics';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatNumber = (value: number, decimals = 0) => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

const formatPercent = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);
};

export default function Performance() {
  const { clientId } = useAuth();
  const { metrics, loading, error, fetchMetrics } = useGoogleAdsMetrics();
  const [dateRange, setDateRange] = useState<DateRange>('LAST_30_DAYS');

  useEffect(() => {
    if (clientId) {
      fetchMetrics(clientId, dateRange);
    }
  }, [clientId, dateRange]);

  const handleRefresh = () => {
    if (clientId) {
      fetchMetrics(clientId, dateRange);
    }
  };

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

  const metricsCards = [
    {
      title: 'ROAS',
      value: metrics ? formatNumber(metrics.roas, 2) + 'x' : '-',
      icon: TrendingUp,
      description: 'Retorno sobre investimento em anúncios',
    },
    {
      title: 'CPA',
      value: metrics ? formatCurrency(metrics.cpa) : '-',
      icon: Target,
      description: 'Custo por aquisição',
    },
    {
      title: 'Gasto Total',
      value: metrics ? formatCurrency(metrics.spend) : '-',
      icon: DollarSign,
      description: 'Investimento no período',
    },
    {
      title: 'Conversões',
      value: metrics ? formatNumber(metrics.conversions) : '-',
      icon: MousePointer,
      description: 'Total de conversões',
    },
    {
      title: 'Cliques',
      value: metrics ? formatNumber(metrics.clicks) : '-',
      icon: MousePointerClick,
      description: 'Total de cliques',
    },
    {
      title: 'Impressões',
      value: metrics ? formatNumber(metrics.impressions) : '-',
      icon: Eye,
      description: 'Total de impressões',
    },
    {
      title: 'CTR',
      value: metrics ? formatPercent(metrics.ctr) : '-',
      icon: BarChart3,
      description: 'Taxa de cliques',
    },
    {
      title: 'CPC Médio',
      value: metrics ? formatCurrency(metrics.avgCpc) : '-',
      icon: DollarSign,
      description: 'Custo por clique médio',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Performance</h1>
          <p className="text-muted-foreground mt-1">
            Métricas do Google Ads em tempo real
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAY">Hoje</SelectItem>
              <SelectItem value="YESTERDAY">Ontem</SelectItem>
              <SelectItem value="LAST_7_DAYS">Últimos 7 dias</SelectItem>
              <SelectItem value="LAST_30_DAYS">Últimos 30 dias</SelectItem>
              <SelectItem value="THIS_MONTH">Este mês</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricsCards.map((metric) => (
          <Card key={metric.title} className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loading ? (
                  <div className="h-8 w-24 animate-pulse bg-muted rounded" />
                ) : (
                  metric.value
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
