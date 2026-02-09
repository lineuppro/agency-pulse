import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DollarSign, Eye, Users, MousePointer, TrendingUp, TrendingDown, Target,
  RefreshCw, AlertCircle, Link2, Link2Off, Facebook, BarChart3, 
  MousePointerClick, AlertTriangle, Lightbulb, Minus, Search, Hash,
  MessageSquare, Send, Loader2, Bot, User, Megaphone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMetaAdsMetrics, useMetaAdsConnection, type MetaDateRange } from '@/hooks/useMetaAdsMetrics';
import { useGoogleAdsDetailed, DateRange } from '@/hooks/useGoogleAdsDetailed';
import { MetaAdsConnectModal } from '@/components/meta-ads/MetaAdsConnectModal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Client {
  id: string;
  name: string;
  google_ads_id: string | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const dateRangeOptions: { value: MetaDateRange; googleValue: DateRange; label: string }[] = [
  { value: 'today', googleValue: 'TODAY', label: 'Hoje' },
  { value: 'yesterday', googleValue: 'YESTERDAY', label: 'Ontem' },
  { value: 'last_7d', googleValue: 'LAST_7_DAYS', label: 'Últimos 7 dias' },
  { value: 'last_30d', googleValue: 'LAST_30_DAYS', label: 'Últimos 30 dias' },
  { value: 'this_month', googleValue: 'THIS_MONTH', label: 'Este mês' },
];

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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE':
    case 'ENABLED':
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

export default function TrafficAds() {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [dateRange, setDateRange] = useState<MetaDateRange>('last_30d');
  const [activeTab, setActiveTab] = useState<'google' | 'meta'>('google');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  
  // AI Chat state
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { session } = useAuth();
  const { toast } = useToast();

  // Meta Ads hooks
  const { metrics: metaMetrics, campaigns: metaCampaigns, loading: metaLoading, error: metaError, fetchMetrics: fetchMetaMetrics } = useMetaAdsMetrics();
  const { data: metaConnection, isLoading: isLoadingMetaConnection } = useMetaAdsConnection(selectedClientId);

  // Google Ads hooks
  const { data: googleData, loading: googleLoading, error: googleError, fetchDetailedData: fetchGoogleData } = useGoogleAdsDetailed();

  // Fetch clients
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ['clients-for-traffic-ads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, google_ads_id')
        .order('name');
      if (error) throw error;
      return data as Client[];
    },
  });

  // Set first client as default
  useEffect(() => {
    if (clients.length > 0 && !selectedClientId) {
      const clientWithAds = clients.find(c => c.google_ads_id);
      setSelectedClientId(clientWithAds?.id || clients[0].id);
    }
  }, [clients, selectedClientId]);

  // Fetch data when client or date range changes
  useEffect(() => {
    if (!selectedClientId) return;
    
    const googleRange = dateRangeOptions.find(d => d.value === dateRange)?.googleValue || 'LAST_30_DAYS';
    
    if (activeTab === 'google') {
      fetchGoogleData(selectedClientId, googleRange);
    } else if (metaConnection) {
      fetchMetaMetrics(selectedClientId, dateRange);
    }
  }, [selectedClientId, dateRange, activeTab, metaConnection]);

  const handleRefresh = () => {
    if (!selectedClientId) return;
    
    const googleRange = dateRangeOptions.find(d => d.value === dateRange)?.googleValue || 'LAST_30_DAYS';
    
    if (activeTab === 'google') {
      fetchGoogleData(selectedClientId, googleRange);
    } else if (metaConnection) {
      fetchMetaMetrics(selectedClientId, dateRange);
    }
  };

  // AI Chat functionality
  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, scrollToBottom]);

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading || !session?.access_token) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput.trim(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    let assistantContent = '';

    try {
      // Build context with current ads data
      const currentPlatform = activeTab === 'google' ? 'Google Ads' : 'Meta Ads';
      const currentData = activeTab === 'google' ? googleData : { metrics: metaMetrics, campaigns: metaCampaigns };
      
      const systemContext = `Você é um analista especializado em tráfego pago. O usuário está visualizando dados de ${currentPlatform}.
      
Dados atuais do período selecionado:
${JSON.stringify(currentData, null, 2)}

Forneça análises detalhadas, insights acionáveis e recomendações de otimização baseadas nos dados. Seja direto e prático.`;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-rag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemContext },
            ...chatMessages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: chatInput.trim() },
          ],
          clientId: selectedClientId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const upsertAssistant = (chunk: string) => {
        assistantContent += chunk;
        setChatMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => 
              i === prev.length - 1 ? { ...m, content: assistantContent } : m
            );
          }
          return [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: assistantContent }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      toast({
        title: 'Erro',
        description: 'Falha ao enviar mensagem para a IA',
        variant: 'destructive',
      });
      setChatMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsChatLoading(false);
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const googleMetrics = googleData?.metrics;
  const loading = activeTab === 'google' ? googleLoading : metaLoading;
  const error = activeTab === 'google' ? googleError : metaError;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-primary" />
            Tráfego Pago
          </h1>
          <p className="text-muted-foreground mt-1">
            Métricas e análise de campanhas Google Ads e Meta Ads
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedClientId} onValueChange={setSelectedClientId} disabled={loadingClients}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={(v) => setDateRange(v as MetaDateRange)}>
            <SelectTrigger className="w-[160px]">
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
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ads Data - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Platform Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'google' | 'meta')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="google" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Google Ads
              </TabsTrigger>
              <TabsTrigger value="meta" className="gap-2">
                <Facebook className="h-4 w-4" />
                Meta Ads
              </TabsTrigger>
            </TabsList>

            {/* Google Ads Content */}
            <TabsContent value="google" className="space-y-6 mt-6">
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

              {googleError && (
                <Card className="border-destructive/50 bg-destructive/10">
                  <CardContent className="py-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <p className="text-sm text-destructive">{googleError}</p>
                  </CardContent>
                </Card>
              )}

              {/* Alerts */}
              {googleData?.alerts && googleData.alerts.length > 0 && (
                <div className="space-y-2">
                  {googleData.alerts.map((alert, i) => (
                    <Card key={i} className={getSeverityColor(alert.severity)}>
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

              {selectedClient?.google_ads_id && (
                <>
                  {/* Metrics Cards */}
                  <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                    <Card className="border-border/50">
                      <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          ROAS
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {googleLoading ? (
                          <Skeleton className="h-8 w-16" />
                        ) : (
                          <p className={cn('text-2xl font-bold', getRoasColor(googleMetrics?.roas || 0))}>
                            {formatNumber(googleMetrics?.roas || 0, 2)}x
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-border/50">
                      <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          CPA
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {googleLoading ? (
                          <Skeleton className="h-8 w-20" />
                        ) : (
                          <p className="text-2xl font-bold">{formatCurrency(googleMetrics?.cpa || 0)}</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-border/50">
                      <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Investimento
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {googleLoading ? (
                          <Skeleton className="h-8 w-24" />
                        ) : (
                          <p className="text-2xl font-bold">{formatCurrency(googleMetrics?.spend || 0)}</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-border/50">
                      <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                          <MousePointer className="h-4 w-4" />
                          Conversões
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {googleLoading ? (
                          <Skeleton className="h-8 w-16" />
                        ) : (
                          <p className="text-2xl font-bold">{formatNumber(googleMetrics?.conversions || 0)}</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Keywords Table */}
                  <Card className="border-border/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Hash className="h-5 w-5" />
                        Top Palavras-chave
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {googleLoading ? (
                        <div className="space-y-2">
                          {[1,2,3,4,5].map(i => (
                            <Skeleton key={i} className="h-12 w-full" />
                          ))}
                        </div>
                      ) : googleData?.keywords && googleData.keywords.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Palavra-chave</TableHead>
                              <TableHead className="text-right">Gasto</TableHead>
                              <TableHead className="text-right">Conv.</TableHead>
                              <TableHead className="text-center">QS</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {googleData.keywords.slice(0, 5).map((kw, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium max-w-[200px] truncate">
                                  {kw.keyword}
                                </TableCell>
                                <TableCell className="text-right">{formatCurrency(kw.spend)}</TableCell>
                                <TableCell className="text-right">{formatNumber(kw.conversions)}</TableCell>
                                <TableCell className="text-center">{getQualityScoreBadge(kw.qualityScore)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-muted-foreground text-center py-4">
                          Nenhuma palavra-chave encontrada
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Meta Ads Content */}
            <TabsContent value="meta" className="space-y-6 mt-6">
              {/* Connection Status */}
              {selectedClientId && (
                <Card className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isLoadingMetaConnection ? (
                          <Skeleton className="h-10 w-10 rounded-full" />
                        ) : metaConnection ? (
                          <>
                            <div className="h-10 w-10 rounded-full bg-[#1877F2]/10 flex items-center justify-center">
                              <Link2 className="h-5 w-5 text-[#1877F2]" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {metaConnection.ad_account_name || metaConnection.ad_account_id}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                ID: {metaConnection.ad_account_id}
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
                                Conecte uma conta Meta Ads
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      <Button
                        variant={metaConnection ? 'outline' : 'default'}
                        onClick={() => setIsConnectModalOpen(true)}
                      >
                        {metaConnection ? 'Gerenciar' : 'Conectar'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {metaError && (
                <Card className="border-destructive/50 bg-destructive/5">
                  <CardContent className="p-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <p className="text-destructive">{metaError}</p>
                  </CardContent>
                </Card>
              )}

              {metaConnection && (
                <>
                  {/* Metrics Cards */}
                  <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                    <Card className="border-border/50">
                      <CardHeader className="pb-2">
                        <CardDescription className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Investimento
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {metaLoading ? (
                          <Skeleton className="h-8 w-24" />
                        ) : (
                          <p className="text-2xl font-bold">{formatCurrency(metaMetrics?.spend || 0)}</p>
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
                        {metaLoading ? (
                          <Skeleton className="h-8 w-24" />
                        ) : (
                          <p className="text-2xl font-bold">{formatNumber(metaMetrics?.reach || 0)}</p>
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
                        {metaLoading ? (
                          <Skeleton className="h-8 w-16" />
                        ) : (
                          <p className="text-2xl font-bold">{formatNumber(metaMetrics?.conversions || 0)}</p>
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
                        {metaLoading ? (
                          <Skeleton className="h-8 w-16" />
                        ) : (
                          <p className={cn('text-2xl font-bold', getRoasColor(metaMetrics?.roas || 0))}>
                            {(metaMetrics?.roas || 0).toFixed(2)}x
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
                      {metaLoading ? (
                        <div className="space-y-3">
                          {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                          ))}
                        </div>
                      ) : metaCampaigns.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>Nenhuma campanha encontrada</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Campanha</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Investimento</TableHead>
                                <TableHead className="text-right">Cliques</TableHead>
                                <TableHead className="text-right">ROAS</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {metaCampaigns.slice(0, 5).map((campaign) => (
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
                                  <TableCell className="text-right">
                                    {formatCurrency(campaign.spend)}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {formatNumber(campaign.clicks)}
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
            </TabsContent>
          </Tabs>
        </div>

        {/* AI Chat - 1 column */}
        <div className="lg:col-span-1">
          <Card className="border-border/50 h-[600px] flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                Assistente de Análise
              </CardTitle>
              <CardDescription>
                Pergunte sobre suas campanhas de {activeTab === 'google' ? 'Google Ads' : 'Meta Ads'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 px-4">
                <div className="space-y-4 py-4">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Pergunte sobre ROAS, CPA, oportunidades de otimização...
                      </p>
                    </div>
                  )}
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        'flex gap-3',
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {message.role === 'assistant' && (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={cn(
                          'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                      {message.role === 'user' && (
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <User className="h-4 w-4 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isChatLoading && chatMessages[chatMessages.length - 1]?.role === 'user' && (
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-lg px-3 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>
              
              {/* Chat Input */}
              <div className="p-4 border-t border-border">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendChatMessage();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Pergunte sobre suas campanhas..."
                    disabled={isChatLoading}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!chatInput.trim() || isChatLoading}
                  >
                    {isChatLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Connect Modal */}
      <MetaAdsConnectModal
        open={isConnectModalOpen}
        onOpenChange={setIsConnectModalOpen}
        clientId={selectedClientId}
        existingConnection={metaConnection}
      />
    </div>
  );
}
