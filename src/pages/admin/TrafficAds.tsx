import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useClientContext } from '@/contexts/ClientContext';
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
  MessageSquare, Send, Loader2, Bot, User, Megaphone, ArrowUpRight, ArrowDownRight,
  Percent, Zap, ShoppingCart, Filter
} from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/traffic/DataTable';
import { FunnelChart } from '@/components/traffic/FunnelChart';
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
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatNumber = (value: number, decimals = 0) => {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
};

const formatPercent = (value: number) => {
  return `${value.toFixed(2)}%`;
};

const getQualityScoreBadge = (qs: number | null) => {
  if (qs === null) return <Badge variant="secondary">N/A</Badge>;
  if (qs >= 7) return <Badge className="bg-green-500/20 text-green-600 border-green-500/30">{qs}</Badge>;
  if (qs >= 5) return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30">{qs}</Badge>;
  return <Badge className="bg-red-500/20 text-red-600 border-red-500/30">{qs}</Badge>;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': case 'ENABLED': return 'bg-green-500/15 text-green-600 border-green-500/30';
    case 'PAUSED': return 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getRoasColor = (roas: number) => {
  if (roas >= 3) return 'text-green-500';
  if (roas >= 1) return 'text-yellow-500';
  return 'text-red-500';
};

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': case 'high': return 'border-red-500/50 bg-red-500/10';
    case 'warning': case 'medium': return 'border-yellow-500/50 bg-yellow-500/10';
    default: return 'border-blue-500/50 bg-blue-500/10';
  }
};

// Metric card component for cleaner code
function MetricCard({ 
  icon: Icon, label, value, subValue, loading, iconColor, valueColor 
}: { 
  icon: any; label: string; value: string; subValue?: string; loading: boolean; iconColor?: string; valueColor?: string;
}) {
  return (
    <Card className="border-border/50 relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", iconColor || "bg-primary/10")}>
            <Icon className={cn("h-4 w-4", iconColor ? "text-inherit" : "text-primary")} />
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <>
            <p className={cn("text-xl font-bold", valueColor)}>{value}</p>
            {subValue && <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function TrafficAds() {
  const { selectedClientId: globalClientId, clients: globalClients } = useClientContext();
  const [dateRange, setDateRange] = useState<MetaDateRange>('last_30d');
  const [activeTab, setActiveTab] = useState<'google' | 'meta'>('google');
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  // AI Chat state
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const { session } = useAuth();
  const { toast } = useToast();

  const selectedClientId = globalClientId !== 'all' ? globalClientId : '';
  const clients = globalClients as Client[];

  const { metrics: metaMetrics, campaigns: metaCampaigns, loading: metaLoading, error: metaError, fetchMetrics: fetchMetaMetrics } = useMetaAdsMetrics();
  const { data: metaConnection, isLoading: isLoadingMetaConnection } = useMetaAdsConnection(selectedClientId);
  const { data: googleData, loading: googleLoading, error: googleError, fetchDetailedData: fetchGoogleData } = useGoogleAdsDetailed();

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

  // AI Chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isChatLoading || !session?.access_token) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: chatInput.trim() };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    let assistantContent = '';

    try {
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

      if (!response.ok) throw new Error(`Error ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const upsertAssistant = (chunk: string) => {
        assistantContent += chunk;
        setChatMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
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
      toast({ title: 'Erro', description: 'Falha ao enviar mensagem para a IA', variant: 'destructive' });
      setChatMessages(prev => prev.filter(m => m.id !== userMessage.id));
    } finally {
      setIsChatLoading(false);
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const googleMetrics = googleData?.metrics;
  const previousMetrics = googleData?.previousMetrics;
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

        <div className="flex items-center gap-3 flex-wrap">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as MetaDateRange)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {dateRangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>



          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>

          <Button
            variant={showChat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowChat(!showChat)}
            className="gap-2"
          >
            <Bot className="h-4 w-4" />
            Análise IA
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className={cn("grid gap-6", showChat ? "lg:grid-cols-3" : "lg:grid-cols-1")}>
        {/* Dashboard Content */}
        <div className={cn(showChat ? "lg:col-span-2" : "lg:col-span-1", "space-y-6")}>
          {/* Platform Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'google' | 'meta')}>
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="google" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Google Ads
              </TabsTrigger>
              <TabsTrigger value="meta" className="gap-2">
                <Facebook className="h-4 w-4" />
                Meta Ads
              </TabsTrigger>
            </TabsList>

            {/* ==================== GOOGLE ADS ==================== */}
            <TabsContent value="google" className="space-y-6 mt-6">
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
                        <AlertTriangle className={`h-5 w-5 ${alert.severity === 'critical' ? 'text-red-500' : alert.severity === 'warning' ? 'text-yellow-500' : 'text-blue-500'}`} />
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
                  {/* Metrics Grid - 6 cards */}
                  <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                    <MetricCard icon={DollarSign} label="Investimento" value={formatCurrency(googleMetrics?.spend || 0)} loading={googleLoading} iconColor="bg-blue-500/10 text-blue-500" />
                    <MetricCard icon={ShoppingCart} label="Conversões" value={formatNumber(googleMetrics?.conversions || 0)} subValue={`Valor: ${formatCurrency(googleMetrics?.conversionsValue || 0)}`} loading={googleLoading} iconColor="bg-green-500/10 text-green-500" />
                    <MetricCard icon={TrendingUp} label="ROAS" value={`${formatNumber(googleMetrics?.roas || 0, 2)}x`} loading={googleLoading} iconColor="bg-purple-500/10 text-purple-500" valueColor={getRoasColor(googleMetrics?.roas || 0)} />
                    <MetricCard icon={Target} label="CPA" value={formatCurrency(googleMetrics?.cpa || 0)} loading={googleLoading} iconColor="bg-orange-500/10 text-orange-500" />
                    <MetricCard icon={MousePointerClick} label="Cliques" value={formatNumber(googleMetrics?.clicks || 0)} subValue={`CTR: ${formatPercent(googleMetrics?.ctr || 0)}`} loading={googleLoading} iconColor="bg-cyan-500/10 text-cyan-500" />
                    <MetricCard icon={Eye} label="Impressões" value={formatNumber(googleMetrics?.impressions || 0)} subValue={`CPC: ${formatCurrency(googleMetrics?.avgCpc || 0)}`} loading={googleLoading} iconColor="bg-indigo-500/10 text-indigo-500" />
                  </div>

                  {/* Funnel + Keywords side by side */}
                  <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="border-border/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Filter className="h-4 w-4 text-primary" />
                          Funil de Performance
                        </CardTitle>
                        <CardDescription>Impressões → Cliques → Conversões</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <FunnelChart
                          steps={[
                            { label: 'Impressões', value: googleMetrics?.impressions || 0, formattedValue: formatNumber(googleMetrics?.impressions || 0), color: 'hsl(var(--primary))' },
                            { label: 'Cliques', value: googleMetrics?.clicks || 0, formattedValue: formatNumber(googleMetrics?.clicks || 0), color: 'hsl(210, 70%, 50%)' },
                            { label: 'Conversões', value: googleMetrics?.conversions || 0, formattedValue: formatNumber(googleMetrics?.conversions || 0), color: 'hsl(142, 60%, 45%)' },
                          ]}
                        />
                      </CardContent>
                    </Card>

                    <Card className="border-border/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Hash className="h-4 w-4 text-primary" />
                          Top Palavras-chave
                        </CardTitle>
                        <CardDescription>Por gasto e conversões</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        {googleLoading ? (
                          <div className="space-y-2 p-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                        ) : (
                          <DataTable
                            data={googleData?.keywords || []}
                            searchPlaceholder="Buscar palavra-chave..."
                            emptyMessage="Nenhuma palavra-chave encontrada"
                            maxHeight="320px"
                            columns={[
                              { key: 'keyword', label: 'Palavra-chave', minWidth: 160, searchable: true, searchValue: (kw) => kw.keyword, sortValue: (kw) => kw.keyword, render: (kw) => <span className="font-medium" title={kw.keyword}>{kw.keyword}</span> },
                              { key: 'spend', label: 'Gasto', align: 'right', sortValue: (kw) => kw.spend, render: (kw) => formatCurrency(kw.spend) },
                              { key: 'clicks', label: 'Cliques', align: 'right', sortValue: (kw) => kw.clicks, render: (kw) => formatNumber(kw.clicks) },
                              { key: 'conversions', label: 'Conv.', align: 'right', sortValue: (kw) => kw.conversions, render: (kw) => formatNumber(kw.conversions) },
                              { key: 'qs', label: 'QS', align: 'center', sortValue: (kw) => kw.qualityScore ?? -1, render: (kw) => getQualityScoreBadge(kw.qualityScore) },
                            ]}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Campaigns Table */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Megaphone className="h-4 w-4 text-primary" />
                        Campanhas
                      </CardTitle>
                      <CardDescription>Performance detalhada por campanha</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      {googleLoading ? (
                        <div className="space-y-2 p-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                      ) : (
                        <DataTable
                          data={googleData?.campaigns || []}
                          searchPlaceholder="Buscar campanha..."
                          emptyMessage="Nenhuma campanha encontrada"
                          columns={[
                            { key: 'name', label: 'Campanha', minWidth: 200, searchable: true, searchValue: (c) => c.name, sortValue: (c) => c.name, render: (c) => <span className="font-medium" title={c.name}>{c.name}</span> },
                            { key: 'status', label: 'Status', sortValue: (c) => c.status, render: (c) => <Badge variant="outline" className={cn('text-xs', getStatusColor(c.status))}>{c.status === 'ENABLED' ? 'Ativo' : c.status === 'PAUSED' ? 'Pausado' : c.status}</Badge> },
                            { key: 'spend', label: 'Investimento', align: 'right', sortValue: (c) => c.spend, render: (c) => formatCurrency(c.spend) },
                            { key: 'impressions', label: 'Impressões', align: 'right', sortValue: (c) => c.impressions || 0, render: (c) => formatNumber(c.impressions || 0) },
                            { key: 'clicks', label: 'Cliques', align: 'right', sortValue: (c) => c.clicks || 0, render: (c) => formatNumber(c.clicks || 0) },
                            { key: 'ctr', label: 'CTR', align: 'right', sortValue: (c) => c.ctr || 0, render: (c) => formatPercent(c.ctr || 0) },
                            { key: 'conversions', label: 'Conv.', align: 'right', sortValue: (c) => c.conversions, render: (c) => formatNumber(c.conversions) },
                            { key: 'roas', label: 'ROAS', align: 'right', sortValue: (c) => c.roas, render: (c) => <span className={cn('font-semibold', getRoasColor(c.roas))}>{c.roas.toFixed(2)}x</span> },
                          ]}
                        />
                      )}
                    </CardContent>
                  </Card>

                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* Search Terms */}
                    <Card className="border-border/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Search className="h-4 w-4 text-primary" />
                          Termos de Pesquisa
                        </CardTitle>
                        <CardDescription>Termos que geraram conversões</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        {googleLoading ? (
                          <div className="space-y-2 p-4">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                        ) : (
                          <DataTable
                            data={googleData?.searchTerms?.converting || []}
                            searchPlaceholder="Buscar termo..."
                            emptyMessage="Nenhum termo encontrado"
                            maxHeight="300px"
                            columns={[
                              { key: 'term', label: 'Termo', minWidth: 160, searchable: true, searchValue: (st) => st.searchTerm, sortValue: (st) => st.searchTerm, render: (st) => <span className="font-medium" title={st.searchTerm}>{st.searchTerm}</span> },
                              { key: 'clicks', label: 'Cliques', align: 'right', sortValue: (st) => st.clicks, render: (st) => formatNumber(st.clicks) },
                              { key: 'conv', label: 'Conv.', align: 'right', sortValue: (st) => st.conversions, render: (st) => <span className="font-semibold text-green-500">{formatNumber(st.conversions)}</span> },
                              { key: 'spend', label: 'Gasto', align: 'right', sortValue: (st) => st.spend, render: (st) => formatCurrency(st.spend) },
                            ]}
                          />
                        )}
                      </CardContent>
                    </Card>

                    {/* Opportunities */}
                    <Card className="border-border/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-yellow-500" />
                          Oportunidades
                        </CardTitle>
                        <CardDescription>Sugestões de otimização</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        {googleLoading ? (
                          <div className="space-y-2 p-4">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                        ) : googleData?.opportunities && googleData.opportunities.length > 0 ? (
                          <ScrollArea className="h-[300px]">
                            <div className="space-y-3 p-4">
                              {googleData.opportunities.map((opp, i) => (
                                <div key={i} className={cn("rounded-lg border p-3", getSeverityColor(opp.severity))}>
                                  <div className="flex items-start gap-2">
                                    <Zap className={cn("h-4 w-4 mt-0.5 shrink-0", opp.severity === 'high' ? 'text-red-500' : opp.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500')} />
                                    <div>
                                      <p className="text-sm font-medium">{opp.title}</p>
                                      <p className="text-xs text-muted-foreground mt-0.5">{opp.description}</p>
                                      {opp.impact && <p className="text-xs font-medium text-primary mt-1">{opp.impact}</p>}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        ) : (
                          <div className="text-center py-8 text-sm text-muted-foreground">
                            <Lightbulb className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                            Nenhuma oportunidade identificada
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </TabsContent>

            {/* ==================== META ADS ==================== */}
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
                              <p className="font-medium text-foreground">{metaConnection.ad_account_name || metaConnection.ad_account_id}</p>
                              <p className="text-sm text-muted-foreground">ID: {metaConnection.ad_account_id}</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              <Link2Off className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">Conta não conectada</p>
                              <p className="text-sm text-muted-foreground">Conecte uma conta Meta Ads</p>
                            </div>
                          </>
                        )}
                      </div>
                      <Button variant={metaConnection ? 'outline' : 'default'} onClick={() => setIsConnectModalOpen(true)}>
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
                  {/* Metrics Grid - 6 cards */}
                  <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                    <MetricCard icon={DollarSign} label="Investimento" value={formatCurrency(metaMetrics?.spend || 0)} loading={metaLoading} iconColor="bg-blue-500/10 text-blue-500" />
                    <MetricCard icon={Users} label="Alcance" value={formatNumber(metaMetrics?.reach || 0)} subValue={`Impr: ${formatNumber(metaMetrics?.impressions || 0)}`} loading={metaLoading} iconColor="bg-purple-500/10 text-purple-500" />
                    <MetricCard icon={MousePointerClick} label="Cliques" value={formatNumber(metaMetrics?.clicks || 0)} subValue={`CTR: ${formatPercent(metaMetrics?.ctr || 0)}`} loading={metaLoading} iconColor="bg-cyan-500/10 text-cyan-500" />
                    <MetricCard icon={DollarSign} label="CPC" value={formatCurrency(metaMetrics?.cpc || 0)} subValue={`CPM: ${formatCurrency(metaMetrics?.cpm || 0)}`} loading={metaLoading} iconColor="bg-orange-500/10 text-orange-500" />
                    <MetricCard icon={Target} label="Conversões" value={formatNumber(metaMetrics?.conversions || 0)} subValue={`Custo/Res: ${formatCurrency(metaMetrics?.costPerResult || 0)}`} loading={metaLoading} iconColor="bg-green-500/10 text-green-500" />
                    <MetricCard icon={TrendingUp} label="ROAS" value={`${(metaMetrics?.roas || 0).toFixed(2)}x`} loading={metaLoading} iconColor="bg-indigo-500/10 text-indigo-500" valueColor={getRoasColor(metaMetrics?.roas || 0)} />
                  </div>

                  {/* Funnel */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Filter className="h-4 w-4 text-primary" />
                        Funil de Performance
                      </CardTitle>
                      <CardDescription>Impressões → Cliques → Conversões</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FunnelChart
                        steps={[
                          { label: 'Impressões', value: metaMetrics?.impressions || 0, formattedValue: formatNumber(metaMetrics?.impressions || 0), color: 'hsl(var(--primary))' },
                          { label: 'Alcance', value: metaMetrics?.reach || 0, formattedValue: formatNumber(metaMetrics?.reach || 0), color: 'hsl(210, 70%, 50%)' },
                          { label: 'Cliques', value: metaMetrics?.clicks || 0, formattedValue: formatNumber(metaMetrics?.clicks || 0), color: 'hsl(38, 70%, 50%)' },
                          { label: 'Conversões', value: metaMetrics?.conversions || 0, formattedValue: formatNumber(metaMetrics?.conversions || 0), color: 'hsl(142, 60%, 45%)' },
                        ]}
                      />
                    </CardContent>
                  </Card>

                  {/* Campaigns Table */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Megaphone className="h-4 w-4 text-primary" />
                        Campanhas
                      </CardTitle>
                      <CardDescription>Performance detalhada por campanha</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      {metaLoading ? (
                        <div className="space-y-2 p-4">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                      ) : (
                        <DataTable
                          data={metaCampaigns}
                          searchPlaceholder="Buscar campanha..."
                          emptyMessage="Nenhuma campanha encontrada"
                          columns={[
                            { key: 'name', label: 'Campanha', minWidth: 220, searchable: true, searchValue: (c) => c.name, sortValue: (c) => c.name, render: (c) => <span className="font-medium" title={c.name}>{c.name}</span> },
                            { key: 'status', label: 'Status', sortValue: (c) => c.status, render: (c) => <Badge variant="outline" className={cn('text-xs', getStatusColor(c.status))}>{c.status === 'ACTIVE' ? 'Ativo' : c.status === 'PAUSED' ? 'Pausado' : c.status}</Badge> },
                            { key: 'objective', label: 'Objetivo', sortValue: (c) => c.objective, render: (c) => <span className="text-muted-foreground">{c.objective}</span> },
                            { key: 'spend', label: 'Investimento', align: 'right', sortValue: (c) => c.spend, render: (c) => formatCurrency(c.spend) },
                            { key: 'impressions', label: 'Impressões', align: 'right', sortValue: (c) => c.impressions, render: (c) => formatNumber(c.impressions) },
                            { key: 'clicks', label: 'Cliques', align: 'right', sortValue: (c) => c.clicks, render: (c) => formatNumber(c.clicks) },
                            { key: 'ctr', label: 'CTR', align: 'right', sortValue: (c) => c.ctr, render: (c) => formatPercent(c.ctr) },
                            { key: 'cpc', label: 'CPC', align: 'right', sortValue: (c) => c.cpc, render: (c) => formatCurrency(c.cpc) },
                            { key: 'conversions', label: 'Conv.', align: 'right', sortValue: (c) => c.conversions, render: (c) => formatNumber(c.conversions) },
                            { key: 'roas', label: 'ROAS', align: 'right', sortValue: (c) => c.roas, render: (c) => <span className={cn('font-semibold', getRoasColor(c.roas))}>{c.roas.toFixed(2)}x</span> },
                          ]}
                        />
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* AI Chat Panel - fixed height with proper scroll */}
        {showChat && (
          <div className="lg:col-span-1">
            <Card className="border-border/50 sticky top-6" style={{ height: 'calc(100vh - 180px)' }}>
              <CardHeader className="pb-3 shrink-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  Assistente IA
                </CardTitle>
                <CardDescription>
                  Analise suas campanhas de {activeTab === 'google' ? 'Google Ads' : 'Meta Ads'}
                </CardDescription>
              </CardHeader>
              <div className="flex flex-col flex-1 overflow-hidden" style={{ height: 'calc(100% - 88px)' }}>
                {/* Messages area with overflow scroll */}
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4">
                  <div className="space-y-4 py-2">
                    {chatMessages.length === 0 && (
                      <div className="text-center py-8">
                        <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Pergunte sobre ROAS, CPA, oportunidades de otimização...
                        </p>
                        <div className="mt-4 space-y-2">
                          {[
                            'Qual campanha tem o melhor ROAS?',
                            'Como otimizar meu CPA?',
                            'Analise a performance geral',
                          ].map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => { setChatInput(suggestion); }}
                              className="block w-full text-left text-xs px-3 py-2 rounded-lg border border-border hover:bg-muted/50 transition-colors text-muted-foreground"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {chatMessages.map((message) => (
                      <div key={message.id} className={cn('flex gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                        {message.role === 'assistant' && (
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                            <Bot className="h-3.5 w-3.5 text-primary" />
                          </div>
                        )}
                        <div className={cn(
                          'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                          message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        )}>
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        </div>
                        {message.role === 'user' && (
                          <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                            <User className="h-3.5 w-3.5 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    ))}
                    {isChatLoading && chatMessages[chatMessages.length - 1]?.role === 'user' && (
                      <div className="flex gap-3">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Bot className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="bg-muted rounded-lg px-3 py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </div>
                
                {/* Chat Input - pinned at bottom */}
                <div className="p-4 border-t border-border shrink-0">
                  <form onSubmit={(e) => { e.preventDefault(); sendChatMessage(); }} className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Pergunte sobre suas campanhas..."
                      disabled={isChatLoading}
                      className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={!chatInput.trim() || isChatLoading}>
                      {isChatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </form>
                </div>
              </div>
            </Card>
          </div>
        )}
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
