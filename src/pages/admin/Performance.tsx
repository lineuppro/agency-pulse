import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendingUp, DollarSign, Target, MousePointer, BarChart3, RefreshCw, Eye, MousePointerClick } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useGoogleAdsMetrics, DateRange } from '@/hooks/useGoogleAdsMetrics';
import { useToast } from '@/hooks/use-toast';

interface Client {
  id: string;
  name: string;
  google_ads_id: string | null;
}

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

export default function AdminPerformance() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange>('LAST_30_DAYS');
  const [loadingClients, setLoadingClients] = useState(true);
  const { metrics, loading, error, fetchMetrics } = useGoogleAdsMetrics();
  const { toast } = useToast();

  useEffect(() => {
    async function loadClients() {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, google_ads_id')
        .order('name');

      if (error) {
        toast({
          title: 'Erro',
          description: 'Falha ao carregar clientes',
          variant: 'destructive',
        });
        return;
      }

      setClients(data || []);
      setLoadingClients(false);
      
      // Auto-select first client with google_ads_id
      const clientWithAds = data?.find(c => c.google_ads_id);
      if (clientWithAds) {
        setSelectedClientId(clientWithAds.id);
      }
    }

    loadClients();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      fetchMetrics(selectedClientId, dateRange);
    }
  }, [selectedClientId, dateRange]);

  const handleRefresh = () => {
    if (selectedClientId) {
      fetchMetrics(selectedClientId, dateRange);
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const metricsCards = [
    {
      title: 'ROAS',
      value: metrics ? formatNumber(metrics.roas, 2) + 'x' : '-',
      icon: TrendingUp,
      description: 'Retorno sobre investimento',
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
      description: 'Custo por clique',
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Performance</h1>
          <p className="text-muted-foreground mt-1">
            Métricas do Google Ads por cliente
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Select 
            value={selectedClientId} 
            onValueChange={setSelectedClientId}
            disabled={loadingClients}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name} {!client.google_ads_id && '(sem Ads)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleRefresh} 
            disabled={loading || !selectedClientId}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {!selectedClientId && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              Selecione um cliente
            </h3>
            <p className="text-sm text-muted-foreground text-center">
              Escolha um cliente acima para visualizar as métricas do Google Ads
            </p>
          </CardContent>
        </Card>
      )}

      {selectedClientId && selectedClient && !selectedClient.google_ads_id && (
        <Card className="border-warning/50 bg-warning/10">
          <CardContent className="py-4">
            <p className="text-sm text-warning">
              O cliente <strong>{selectedClient.name}</strong> não possui ID do Google Ads configurado.
            </p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {selectedClientId && selectedClient?.google_ads_id && (
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
      )}
    </div>
  );
}
