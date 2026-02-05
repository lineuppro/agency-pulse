import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, TrendingDown, DollarSign, Target, MousePointer, 
  BarChart3, RefreshCw, Eye, MousePointerClick, AlertTriangle,
  Lightbulb, Minus, Search, Hash
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useGoogleAdsDetailed, DateRange, KeywordData, Opportunity, Alert } from '@/hooks/useGoogleAdsDetailed';
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

const getQualityScoreBadge = (qs: number | null) => {
  if (qs === null) return <Badge variant="secondary">N/A</Badge>;
  if (qs >= 7) return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">{qs}</Badge>;
  if (qs >= 5) return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">{qs}</Badge>;
  return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">{qs}</Badge>;
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'border-red-500/50 bg-red-500/10';
    case 'warning':
    case 'medium':
      return 'border-yellow-500/50 bg-yellow-500/10';
    default:
      return 'border-blue-500/50 bg-blue-500/10';
  }
};

export default function AdminPerformance() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [dateRange, setDateRange] = useState<DateRange>('LAST_30_DAYS');
  const [loadingClients, setLoadingClients] = useState(true);
  const { data, loading, error, fetchDetailedData } = useGoogleAdsDetailed();
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
      
      const clientWithAds = data?.find(c => c.google_ads_id);
      if (clientWithAds) {
        setSelectedClientId(clientWithAds.id);
      }
    }

    loadClients();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      fetchDetailedData(selectedClientId, dateRange);
    }
  }, [selectedClientId, dateRange]);

  const handleRefresh = () => {
    if (selectedClientId) {
      fetchDetailedData(selectedClientId, dateRange);
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const metrics = data?.metrics;

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Performance</h1>
          <p className="text-muted-foreground mt-1">
            Métricas completas do Google Ads
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

      {/* Alerts */}
      {data?.alerts && data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((alert, i) => (
            <Card key={i} className={`${getSeverityColor(alert.severity)}`}>
              <CardContent className="py-3 flex items-center gap-3">
                <AlertTriangle className={`h-5 w-5 ${
                  alert.severity === 'critical' ? 'text-red-500' :
                  alert.severity === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                }`} />
                <div>
                  <p className="font-medium text-sm">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
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

      {/* No Google Ads Warning */}
      {selectedClientId && selectedClient && !selectedClient.google_ads_id && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="py-4">
            <p className="text-sm text-yellow-600">
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
        <>
          {/* Metrics Cards */}
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

          {/* Tabs for detailed data */}
          <Tabs defaultValue="keywords" className="space-y-4">
            <TabsList>
              <TabsTrigger value="keywords" className="gap-2">
                <Hash className="h-4 w-4" />
                Palavras-chave
              </TabsTrigger>
              <TabsTrigger value="searchterms" className="gap-2">
                <Search className="h-4 w-4" />
                Termos de Pesquisa
              </TabsTrigger>
              <TabsTrigger value="campaigns" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Campanhas
              </TabsTrigger>
              <TabsTrigger value="opportunities" className="gap-2">
                <Lightbulb className="h-4 w-4" />
                Oportunidades
              </TabsTrigger>
            </TabsList>

            {/* Keywords Tab */}
            <TabsContent value="keywords">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Top Palavras-chave</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-2">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="h-12 animate-pulse bg-muted rounded" />
                      ))}
                    </div>
                  ) : data?.keywords && data.keywords.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Palavra-chave</TableHead>
                          <TableHead>Match</TableHead>
                          <TableHead className="text-right">Gasto</TableHead>
                          <TableHead className="text-right">Cliques</TableHead>
                          <TableHead className="text-right">Conv.</TableHead>
                          <TableHead className="text-right">CPC</TableHead>
                          <TableHead className="text-center">QS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.keywords.slice(0, 10).map((kw, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium max-w-[200px] truncate">
                              {kw.keyword}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {kw.matchType.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(kw.spend)}</TableCell>
                            <TableCell className="text-right">{formatNumber(kw.clicks)}</TableCell>
                            <TableCell className="text-right">{formatNumber(kw.conversions)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(kw.avgCpc)}</TableCell>
                            <TableCell className="text-center">{getQualityScoreBadge(kw.qualityScore)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Nenhuma palavra-chave encontrada no período
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Search Terms Tab */}
            <TabsContent value="searchterms">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Converting Terms */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Termos que Converteram
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="space-y-2">
                        {[1,2,3].map(i => (
                          <div key={i} className="h-10 animate-pulse bg-muted rounded" />
                        ))}
                      </div>
                    ) : data?.searchTerms?.converting && data.searchTerms.converting.length > 0 ? (
                      <div className="space-y-2">
                        {data.searchTerms.converting.slice(0, 8).map((term, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-green-500/5 border border-green-500/20">
                            <span className="text-sm truncate max-w-[200px]">{term.searchTerm}</span>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-green-500/20 text-green-600">
                                {term.conversions} conv
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatCurrency(term.spend)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        Nenhum termo com conversão
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Non-Converting Terms */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Minus className="h-5 w-5 text-red-500" />
                      Termos para Negativar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="space-y-2">
                        {[1,2,3].map(i => (
                          <div key={i} className="h-10 animate-pulse bg-muted rounded" />
                        ))}
                      </div>
                    ) : data?.searchTerms?.nonConverting && data.searchTerms.nonConverting.length > 0 ? (
                      <div className="space-y-2">
                        {data.searchTerms.nonConverting.slice(0, 8).map((term, i) => (
                          <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/20">
                            <span className="text-sm truncate max-w-[200px]">{term.searchTerm}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-red-500">
                                {term.clicks} cliques
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatCurrency(term.spend)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        Nenhum termo identificado
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Campaigns Tab */}
            <TabsContent value="campaigns">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance por Campanha</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-2">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="h-12 animate-pulse bg-muted rounded" />
                      ))}
                    </div>
                  ) : data?.campaigns && data.campaigns.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campanha</TableHead>
                          <TableHead className="text-right">Gasto</TableHead>
                          <TableHead className="text-right">Conv.</TableHead>
                          <TableHead className="text-right">ROAS</TableHead>
                          <TableHead className="text-right">CPA</TableHead>
                          <TableHead className="text-right">CTR</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.campaigns.map((campaign, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium max-w-[250px] truncate">
                              {campaign.name}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(campaign.spend)}</TableCell>
                            <TableCell className="text-right">{formatNumber(campaign.conversions)}</TableCell>
                            <TableCell className="text-right">
                              <span className={campaign.roas >= 2 ? 'text-green-600' : campaign.roas >= 1 ? 'text-yellow-600' : 'text-red-600'}>
                                {formatNumber(campaign.roas, 2)}x
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(campaign.cpa)}</TableCell>
                            <TableCell className="text-right">{formatPercent(campaign.ctr)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Nenhuma campanha encontrada
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Opportunities Tab */}
            <TabsContent value="opportunities">
              <div className="space-y-4">
                {loading ? (
                  <div className="space-y-4">
                    {[1,2,3].map(i => (
                      <div key={i} className="h-24 animate-pulse bg-muted rounded" />
                    ))}
                  </div>
                ) : data?.opportunities && data.opportunities.length > 0 ? (
                  data.opportunities.map((opp, i) => (
                    <Card key={i} className={getSeverityColor(opp.severity)}>
                      <CardContent className="py-4">
                        <div className="flex items-start gap-4">
                          <Lightbulb className={`h-6 w-6 mt-1 ${
                            opp.severity === 'high' ? 'text-red-500' :
                            opp.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{opp.title}</h4>
                              <Badge variant={opp.severity === 'high' ? 'destructive' : 'secondary'}>
                                {opp.severity === 'high' ? 'Alta Prioridade' : 
                                 opp.severity === 'medium' ? 'Média' : 'Baixa'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{opp.description}</p>
                            <p className="text-sm font-medium text-primary">{opp.impact}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-1">
                        Nenhuma oportunidade identificada
                      </h3>
                      <p className="text-sm text-muted-foreground text-center">
                        As campanhas parecem estar otimizadas no momento
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
