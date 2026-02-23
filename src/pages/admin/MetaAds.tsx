import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientContext } from '@/contexts/ClientContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DollarSign, 
  Eye, 
  Users, 
  MousePointer, 
  TrendingUp, 
  Target,
  RefreshCw,
  AlertCircle,
  Link2,
  Link2Off,
  Facebook
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  useMetaAdsMetrics, 
  useMetaAdsConnection,
  type MetaDateRange 
} from '@/hooks/useMetaAdsMetrics';
import { MetaAdsConnectModal } from '@/components/meta-ads/MetaAdsConnectModal';

const dateRangeOptions: { value: MetaDateRange; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last_7d', label: 'Últimos 7 dias' },
  { value: 'last_30d', label: 'Últimos 30 dias' },
  { value: 'this_month', label: 'Este mês' },
];

export default function MetaAds() {
  const { selectedClientId: globalClientId } = useClientContext();
  const selectedClientId = globalClientId !== 'all' ? globalClientId : '';
  const [dateRange, setDateRange] = useState<MetaDateRange>('last_30d');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  const { metrics, campaigns, loading, error, fetchMetrics } = useMetaAdsMetrics();
  const { data: connection, isLoading: isLoadingConnection } = useMetaAdsConnection(selectedClientId);

  // Fetch metrics when client or date range changes
  useEffect(() => {
    if (selectedClientId && connection) {
      fetchMetrics(selectedClientId, dateRange);
    }
  }, [selectedClientId, dateRange, connection]);

  const handleRefresh = () => {
    if (selectedClientId && connection) {
      fetchMetrics(selectedClientId, dateRange);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-success/10 text-success';
      case 'PAUSED':
        return 'bg-warning/10 text-warning';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRoasColor = (roas: number) => {
    if (roas >= 3) return 'text-success';
    if (roas >= 1) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Facebook className="h-8 w-8 text-[#1877F2]" />
            Meta Ads
          </h1>
          <p className="text-muted-foreground mt-1">
            Métricas e performance de campanhas do Facebook e Instagram Ads
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as MetaDateRange)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {dateRangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={loading || !connection}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={loading || !connection}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      {selectedClientId && (
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isLoadingConnection ? (
                  <Skeleton className="h-10 w-10 rounded-full" />
                ) : connection ? (
                  <>
                    <div className="h-10 w-10 rounded-full bg-[#1877F2]/10 flex items-center justify-center">
                      <Link2 className="h-5 w-5 text-[#1877F2]" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {connection.ad_account_name || connection.ad_account_id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ID da conta: {connection.ad_account_id}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Link2Off className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Conta não conectada</p>
                      <p className="text-sm text-muted-foreground">
                        Conecte uma conta Meta Ads para ver as métricas
                      </p>
                    </div>
                  </>
                )}
              </div>

              <Button
                variant={connection ? 'outline' : 'default'}
                onClick={() => setIsConnectModalOpen(true)}
              >
                {connection ? 'Gerenciar Conexão' : 'Conectar Conta'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Metrics Cards */}
      {connection && (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Investimento
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="text-2xl font-bold">{formatCurrency(metrics?.spend || 0)}</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Impressões
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="text-2xl font-bold">{formatNumber(metrics?.impressions || 0)}</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Alcance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="text-2xl font-bold">{formatNumber(metrics?.reach || 0)}</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <MousePointer className="h-4 w-4" />
                  Cliques
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="text-2xl font-bold">{formatNumber(metrics?.clicks || 0)}</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardDescription>CTR</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{formatPercent(metrics?.ctr || 0)}</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardDescription>CPC Médio</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <p className="text-2xl font-bold">{formatCurrency(metrics?.cpc || 0)}</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Conversões
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{formatNumber(metrics?.conversions || 0)}</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  ROAS
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className={cn('text-2xl font-bold', getRoasColor(metrics?.roas || 0))}>
                    {(metrics?.roas || 0).toFixed(2)}x
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Campaigns Table */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Campanhas</CardTitle>
              <CardDescription>Performance detalhada por campanha</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhuma campanha encontrada para o período selecionado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campanha</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Objetivo</TableHead>
                        <TableHead className="text-right">Investimento</TableHead>
                        <TableHead className="text-right">Impressões</TableHead>
                        <TableHead className="text-right">Cliques</TableHead>
                        <TableHead className="text-right">CTR</TableHead>
                        <TableHead className="text-right">CPC</TableHead>
                        <TableHead className="text-right">ROAS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {campaign.name}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn('font-normal', getStatusColor(campaign.status))}>
                              {campaign.status === 'ACTIVE' ? 'Ativo' : 
                               campaign.status === 'PAUSED' ? 'Pausado' : campaign.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {campaign.objective.replace(/_/g, ' ')}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(campaign.spend)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(campaign.impressions)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(campaign.clicks)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPercent(campaign.ctr)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(campaign.cpc)}
                          </TableCell>
                          <TableCell className={cn('text-right font-medium', getRoasColor(campaign.roas))}>
                            {campaign.roas.toFixed(2)}x
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Connect Modal */}
      <MetaAdsConnectModal
        open={isConnectModalOpen}
        onOpenChange={setIsConnectModalOpen}
        clientId={selectedClientId}
        existingConnection={connection}
      />
    </div>
  );
}
