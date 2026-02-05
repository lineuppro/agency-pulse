import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  TrendingUp, DollarSign, RefreshCw, Eye, MousePointerClick, BarChart3, Users, Radio
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useMetaAdsMetrics, DateRange } from '@/hooks/useMetaAdsMetrics';
import { useToast } from '@/hooks/use-toast';
import { MetaAdsCard } from '@/components/meta/MetaAdsCard';
import { MetaConnectButton } from '@/components/meta/MetaConnectButton';

interface Client {
  id: string;
  name: string;
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

export default function MetaAdsPerformance() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange>('LAST_30_DAYS');
  const [loadingClients, setLoadingClients] = useState(true);
  const { 
    metrics, 
    campaigns, 
    configured, 
    loading, 
    error, 
    fetchMetrics 
  } = useMetaAdsMetrics();
  const { toast } = useToast();

  useEffect(() => {
    async function loadClients() {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
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
      
      if (data && data.length > 0) {
        setSelectedClientId(data[0].id);
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meta Ads</h1>
          <p className="text-muted-foreground mt-1">
            Métricas de campanhas Facebook e Instagram
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
                  {client.name}
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

      {/* Meta Connect Button */}
      {selectedClientId && (
        <Card>
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="font-medium">Conexão Meta</p>
              <p className="text-sm text-muted-foreground">
                Conecte sua conta Meta para visualizar métricas de anúncios
              </p>
            </div>
            <MetaConnectButton clientId={selectedClientId} />
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!selectedClientId && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Radio className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">
              Selecione um cliente
            </h3>
            <p className="text-sm text-muted-foreground text-center">
              Escolha um cliente acima para visualizar as métricas
            </p>
          </CardContent>
        </Card>
      )}

      {/* Meta Ads Not Configured Warning */}
      {selectedClientId && configured === false && (
        <Card className="border-warning/50 bg-warning/10">
          <CardContent className="py-4">
            <p className="text-sm text-warning">
              O cliente <strong>{selectedClient?.name}</strong> não possui Meta Ads configurado. 
              Use o botão "Conectar Meta" acima para vincular a conta.
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

      {/* Meta Ads Content */}
      {selectedClientId && configured && (
        <>
          {/* Meta Metrics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetaAdsCard
              title="Gasto Total"
              value={metrics ? formatCurrency(metrics.spend) : '-'}
              icon={DollarSign}
              description="Investimento no período"
              loading={loading}
            />
            <MetaAdsCard
              title="ROAS"
              value={metrics ? formatNumber(metrics.roas, 2) + 'x' : '-'}
              icon={TrendingUp}
              description="Retorno sobre investimento"
              loading={loading}
            />
            <MetaAdsCard
              title="Alcance"
              value={metrics ? formatNumber(metrics.reach) : '-'}
              icon={Users}
              description="Pessoas alcançadas"
              loading={loading}
            />
            <MetaAdsCard
              title="Impressões"
              value={metrics ? formatNumber(metrics.impressions) : '-'}
              icon={Eye}
              description="Total de impressões"
              loading={loading}
            />
            <MetaAdsCard
              title="Cliques"
              value={metrics ? formatNumber(metrics.clicks) : '-'}
              icon={MousePointerClick}
              description="Total de cliques"
              loading={loading}
            />
            <MetaAdsCard
              title="CPC"
              value={metrics ? formatCurrency(metrics.cpc) : '-'}
              icon={DollarSign}
              description="Custo por clique"
              loading={loading}
            />
            <MetaAdsCard
              title="CPM"
              value={metrics ? formatCurrency(metrics.cpm) : '-'}
              icon={DollarSign}
              description="Custo por mil impressões"
              loading={loading}
            />
            <MetaAdsCard
              title="CTR"
              value={metrics ? formatPercent(metrics.ctr) : '-'}
              icon={BarChart3}
              description="Taxa de cliques"
              loading={loading}
            />
          </div>

          {/* Meta Campaigns Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Campanhas Meta Ads</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-12 animate-pulse bg-muted rounded" />
                  ))}
                </div>
              ) : campaigns && campaigns.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campanha</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Gasto</TableHead>
                      <TableHead className="text-right">Cliques</TableHead>
                      <TableHead className="text-right">Conv.</TableHead>
                      <TableHead className="text-right">ROAS</TableHead>
                      <TableHead className="text-right">CPA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium max-w-[250px] truncate">
                          {campaign.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant={campaign.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {campaign.status === 'ACTIVE' ? 'Ativo' : campaign.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(campaign.spend)}</TableCell>
                        <TableCell className="text-right">{formatNumber(campaign.clicks)}</TableCell>
                        <TableCell className="text-right">{formatNumber(campaign.conversions)}</TableCell>
                        <TableCell className="text-right">
                          <span className={campaign.roas >= 2 ? 'text-green-600' : campaign.roas >= 1 ? 'text-yellow-600' : 'text-red-600'}>
                            {formatNumber(campaign.roas, 2)}x
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(campaign.cpa)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma campanha encontrada no período
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
