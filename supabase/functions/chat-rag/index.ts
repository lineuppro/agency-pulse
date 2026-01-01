import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==================== GOOGLE ADS TYPES ====================

interface GoogleAdsMetrics {
  cost: string;
  conversions: string;
  conversionValue: string;
  clicks: number;
  impressions: number;
  ctr: string;
  avgCpc: string;
  roas: string;
  cpa: string;
}

interface CampaignData {
  id: string;
  name: string;
  status: string;
  cost: string;
  conversions: string;
  clicks: number;
  ctr: string;
  roas: string;
}

interface KeywordData {
  keyword: string;
  matchType: string;
  campaignName: string;
  cost: string;
  clicks: number;
  conversions: string;
  avgCpc: string;
  qualityScore: number | null;
}

interface SearchTermData {
  searchTerm: string;
  campaignName: string;
  clicks: number;
  impressions: number;
  conversions: string;
  cost: string;
}

interface DailyMetrics {
  date: string;
  cost: number;
  conversions: number;
  clicks: number;
  impressions: number;
}

interface UserIntent {
  type: 'OVERVIEW' | 'COMPARISON' | 'KEYWORDS' | 'SEARCH_TERMS' | 'CAMPAIGNS' | 'DAILY_REPORT';
  period: string;
  comparisonPeriod?: string;
  limit?: number;
}

// ==================== GOOGLE OAUTH ====================

async function getGoogleAccessToken(): Promise<string | null> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const refreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    console.log('Google OAuth credentials not configured');
    return null;
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      console.error('Failed to refresh Google token');
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error refreshing Google token:', error);
    return null;
  }
}

// ==================== INTENT PARSING ====================

function parseUserIntent(message: string): UserIntent {
  const lowerMessage = message.toLowerCase();
  
  // Check for comparison intent
  const comparisonPatterns = [
    /comparar?\s+(.+?)\s+(com|vs|versus|e)\s+(.+)/i,
    /evolução|evolucao|tendência|tendencia|histórico|historico/i,
    /semana passada.*(semana anterior|última|ultima)/i,
    /mês passado.*(mês anterior|último|ultimo)/i,
  ];
  
  const hasComparison = comparisonPatterns.some(p => p.test(lowerMessage));
  
  // Check for keywords intent
  const keywordPatterns = [
    /palavra[s]?[\s-]?chave/i,
    /keyword[s]?/i,
    /melhor(es)?\s+termo[s]?/i,
    /quality\s*score/i,
    /índice de qualidade/i,
  ];
  
  const hasKeywords = keywordPatterns.some(p => p.test(lowerMessage));
  
  // Check for search terms intent
  const searchTermPatterns = [
    /termo[s]?\s+de\s+pesquisa/i,
    /search\s+term[s]?/i,
    /o que.*(pesquisaram|buscaram)/i,
    /busca[s]?\s+real|reais/i,
  ];
  
  const hasSearchTerms = searchTermPatterns.some(p => p.test(lowerMessage));
  
  // Check for campaign-specific intent
  const campaignPatterns = [
    /campanha[s]?\s+individual|individuais/i,
    /performance\s+por\s+campanha/i,
    /cada\s+campanha/i,
    /todas\s+as\s+campanhas/i,
    /lista[r]?\s+campanha/i,
    /detalhe[s]?\s+(da|das)\s+campanha/i,
  ];
  
  const hasCampaigns = campaignPatterns.some(p => p.test(lowerMessage));
  
  // Check for daily report intent
  const dailyPatterns = [
    /por\s+dia/i,
    /diário|diario/i,
    /dia\s+a\s+dia/i,
    /últimos?\s+\d+\s+dias/i,
    /cada\s+dia/i,
  ];
  
  const hasDailyReport = dailyPatterns.some(p => p.test(lowerMessage));
  
  // Determine period
  let period = 'LAST_30_DAYS';
  let comparisonPeriod: string | undefined;
  
  if (/últim[oa]s?\s*7\s*dias|última\s*semana|semana\s*passada/i.test(lowerMessage)) {
    period = 'LAST_7_DAYS';
    if (hasComparison) comparisonPeriod = 'LAST_14_DAYS'; // Will subtract to get previous week
  } else if (/últim[oa]s?\s*14\s*dias|duas\s*semanas/i.test(lowerMessage)) {
    period = 'LAST_14_DAYS';
  } else if (/últim[oa]s?\s*30\s*dias|último\s*mês|mês\s*passado/i.test(lowerMessage)) {
    period = 'LAST_30_DAYS';
    if (hasComparison) comparisonPeriod = 'LAST_60_DAYS';
  } else if (/últim[oa]s?\s*90\s*dias|3\s*meses|trimestre/i.test(lowerMessage)) {
    period = 'LAST_90_DAYS';
  }
  
  // Determine type based on priority
  let type: UserIntent['type'] = 'OVERVIEW';
  if (hasKeywords) type = 'KEYWORDS';
  else if (hasSearchTerms) type = 'SEARCH_TERMS';
  else if (hasCampaigns) type = 'CAMPAIGNS';
  else if (hasDailyReport) type = 'DAILY_REPORT';
  else if (hasComparison) type = 'COMPARISON';
  
  return {
    type,
    period,
    comparisonPeriod,
    limit: 20,
  };
}

function isAskingAboutAds(message: string): boolean {
  const keywords = [
    'google ads', 'campanha', 'campanhas', 'performance', 'métricas', 'metricas',
    'roas', 'cpa', 'conversões', 'conversoes', 'cliques', 'impressões', 'impressoes',
    'ctr', 'cpc', 'custo', 'gasto', 'resultado', 'resultados', 'anúncios', 'anuncios',
    'ads', 'tráfego pago', 'trafego pago', 'mídia paga', 'midia paga', 'palavra-chave',
    'palavras-chave', 'keyword', 'keywords', 'termo de pesquisa', 'termos de pesquisa',
    'search term', 'quality score', 'índice de qualidade', 'investimento', 'verba',
    'orçamento', 'orcamento', 'semana passada', 'mês passado', 'comparar', 'evolução'
  ];
  const lowerMessage = message.toLowerCase();
  return keywords.some(keyword => lowerMessage.includes(keyword));
}

// ==================== GOOGLE ADS API QUERIES ====================

async function executeGoogleAdsQuery(
  customerId: string, 
  accessToken: string, 
  query: string
): Promise<any[] | null> {
  const developerToken = Deno.env.get('GOOGLE_DEVELOPER_TOKEN');
  if (!developerToken) {
    console.log('GOOGLE_DEVELOPER_TOKEN not configured');
    return null;
  }

  const cleanCustomerId = customerId.replace(/-/g, '');

  try {
    const response = await fetch(
      `https://googleads.googleapis.com/v22/customers/${cleanCustomerId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Ads API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    return data[0]?.results || [];
  } catch (error) {
    console.error('Error executing Google Ads query:', error);
    return null;
  }
}

// Fetch aggregated metrics for a period
async function fetchMetricsByPeriod(
  customerId: string, 
  accessToken: string, 
  period: string
): Promise<GoogleAdsMetrics | null> {
  const query = `
    SELECT
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.clicks,
      metrics.impressions,
      metrics.ctr,
      metrics.average_cpc
    FROM customer
    WHERE segments.date DURING ${period}
  `;

  const results = await executeGoogleAdsQuery(customerId, accessToken, query);
  if (!results || results.length === 0) return null;

  const metrics = results[0].metrics;
  const cost = parseInt(metrics.costMicros || '0') / 1000000;
  const conversions = parseFloat(metrics.conversions || '0');
  const conversionValue = parseFloat(metrics.conversionsValue || '0');
  const clicks = parseInt(metrics.clicks || '0');
  const impressions = parseInt(metrics.impressions || '0');
  const ctr = (parseFloat(metrics.ctr || '0')) * 100;
  const avgCpc = (parseInt(metrics.averageCpc || '0')) / 1000000;
  const roas = cost > 0 ? conversionValue / cost : 0;
  const cpa = conversions > 0 ? cost / conversions : 0;

  return {
    cost: cost.toFixed(2),
    conversions: conversions.toFixed(0),
    conversionValue: conversionValue.toFixed(2),
    clicks,
    impressions,
    ctr: ctr.toFixed(2),
    avgCpc: avgCpc.toFixed(2),
    roas: roas.toFixed(2),
    cpa: cpa.toFixed(2),
  };
}

// Fetch daily metrics for trend analysis
async function fetchDailyMetrics(
  customerId: string, 
  accessToken: string, 
  period: string
): Promise<DailyMetrics[] | null> {
  const query = `
    SELECT
      segments.date,
      metrics.cost_micros,
      metrics.conversions,
      metrics.clicks,
      metrics.impressions
    FROM customer
    WHERE segments.date DURING ${period}
    ORDER BY segments.date DESC
  `;

  const results = await executeGoogleAdsQuery(customerId, accessToken, query);
  if (!results) return null;

  return results.map(r => ({
    date: r.segments.date,
    cost: parseInt(r.metrics.costMicros || '0') / 1000000,
    conversions: parseFloat(r.metrics.conversions || '0'),
    clicks: parseInt(r.metrics.clicks || '0'),
    impressions: parseInt(r.metrics.impressions || '0'),
  }));
}

// Fetch campaign performance
async function fetchCampaignDetails(
  customerId: string, 
  accessToken: string, 
  period: string
): Promise<CampaignData[] | null> {
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.clicks,
      metrics.ctr
    FROM campaign
    WHERE segments.date DURING ${period}
      AND campaign.status = 'ENABLED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 10
  `;

  const results = await executeGoogleAdsQuery(customerId, accessToken, query);
  if (!results) return null;

  return results.map(r => {
    const cost = parseInt(r.metrics.costMicros || '0') / 1000000;
    const convValue = parseFloat(r.metrics.conversionsValue || '0');
    return {
      id: r.campaign.id,
      name: r.campaign.name,
      status: r.campaign.status,
      cost: cost.toFixed(2),
      conversions: (parseFloat(r.metrics.conversions || '0')).toFixed(0),
      clicks: parseInt(r.metrics.clicks || '0'),
      ctr: ((parseFloat(r.metrics.ctr || '0')) * 100).toFixed(2),
      roas: cost > 0 ? (convValue / cost).toFixed(2) : '0.00',
    };
  });
}

// Fetch keyword performance
async function fetchKeywordPerformance(
  customerId: string, 
  accessToken: string, 
  period: string,
  limit: number = 20
): Promise<KeywordData[] | null> {
  const query = `
    SELECT
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      campaign.name,
      metrics.cost_micros,
      metrics.clicks,
      metrics.conversions,
      metrics.average_cpc,
      ad_group_criterion.quality_info.quality_score
    FROM keyword_view
    WHERE segments.date DURING ${period}
      AND metrics.impressions > 0
    ORDER BY metrics.cost_micros DESC
    LIMIT ${limit}
  `;

  const results = await executeGoogleAdsQuery(customerId, accessToken, query);
  if (!results) return null;

  return results.map(r => ({
    keyword: r.adGroupCriterion?.keyword?.text || 'N/A',
    matchType: r.adGroupCriterion?.keyword?.matchType || 'N/A',
    campaignName: r.campaign?.name || 'N/A',
    cost: (parseInt(r.metrics.costMicros || '0') / 1000000).toFixed(2),
    clicks: parseInt(r.metrics.clicks || '0'),
    conversions: (parseFloat(r.metrics.conversions || '0')).toFixed(0),
    avgCpc: (parseInt(r.metrics.averageCpc || '0') / 1000000).toFixed(2),
    qualityScore: r.adGroupCriterion?.qualityInfo?.qualityScore || null,
  }));
}

// Fetch search terms report
async function fetchSearchTermsReport(
  customerId: string, 
  accessToken: string, 
  period: string,
  limit: number = 30
): Promise<SearchTermData[] | null> {
  const query = `
    SELECT
      search_term_view.search_term,
      campaign.name,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions,
      metrics.cost_micros
    FROM search_term_view
    WHERE segments.date DURING ${period}
      AND metrics.impressions > 5
    ORDER BY metrics.impressions DESC
    LIMIT ${limit}
  `;

  const results = await executeGoogleAdsQuery(customerId, accessToken, query);
  if (!results) return null;

  return results.map(r => ({
    searchTerm: r.searchTermView?.searchTerm || 'N/A',
    campaignName: r.campaign?.name || 'N/A',
    clicks: parseInt(r.metrics.clicks || '0'),
    impressions: parseInt(r.metrics.impressions || '0'),
    conversions: (parseFloat(r.metrics.conversions || '0')).toFixed(0),
    cost: (parseInt(r.metrics.costMicros || '0') / 1000000).toFixed(2),
  }));
}

// ==================== CONTEXT BUILDER ====================

function formatPeriodLabel(period: string): string {
  const labels: Record<string, string> = {
    'LAST_7_DAYS': 'Últimos 7 dias',
    'LAST_14_DAYS': 'Últimos 14 dias',
    'LAST_30_DAYS': 'Últimos 30 dias',
    'LAST_60_DAYS': 'Últimos 60 dias',
    'LAST_90_DAYS': 'Últimos 90 dias',
  };
  return labels[period] || period;
}

function calculateVariation(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? '+∞' : '0%';
  const variation = ((current - previous) / previous) * 100;
  const sign = variation >= 0 ? '+' : '';
  return `${sign}${variation.toFixed(1)}%`;
}

async function buildAdsContext(
  customerId: string, 
  accessToken: string, 
  intent: UserIntent
): Promise<string> {
  let context = '\n\n📊 DADOS DO GOOGLE ADS:\n';
  
  // Always fetch current period metrics
  const currentMetrics = await fetchMetricsByPeriod(customerId, accessToken, intent.period);
  
  if (!currentMetrics) {
    return '\n\n⚠️ Não foi possível obter métricas do Google Ads no momento.';
  }

  context += `\n═══════════════════════════════════════\n`;
  context += `📈 VISÃO GERAL (${formatPeriodLabel(intent.period)}):\n`;
  context += `═══════════════════════════════════════\n`;
  context += `• Investimento: R$ ${currentMetrics.cost}\n`;
  context += `• Conversões: ${currentMetrics.conversions}\n`;
  context += `• Valor das Conversões: R$ ${currentMetrics.conversionValue}\n`;
  context += `• ROAS: ${currentMetrics.roas}x\n`;
  context += `• CPA Médio: R$ ${currentMetrics.cpa}\n`;
  context += `• Cliques: ${currentMetrics.clicks.toLocaleString('pt-BR')}\n`;
  context += `• Impressões: ${currentMetrics.impressions.toLocaleString('pt-BR')}\n`;
  context += `• CTR: ${currentMetrics.ctr}%\n`;
  context += `• CPC Médio: R$ ${currentMetrics.avgCpc}\n`;

  // Handle comparison
  if (intent.type === 'COMPARISON' && intent.comparisonPeriod) {
    const previousPeriod = intent.period === 'LAST_7_DAYS' ? 'LAST_14_DAYS' : 
                          intent.period === 'LAST_30_DAYS' ? 'LAST_60_DAYS' : 'LAST_90_DAYS';
    
    const previousMetrics = await fetchMetricsByPeriod(customerId, accessToken, previousPeriod);
    
    if (previousMetrics) {
      context += `\n═══════════════════════════════════════\n`;
      context += `📊 COMPARATIVO COM PERÍODO ANTERIOR:\n`;
      context += `═══════════════════════════════════════\n`;
      context += `| Métrica | Atual | Anterior | Variação |\n`;
      context += `|---------|-------|----------|----------|\n`;
      context += `| Gasto | R$ ${currentMetrics.cost} | R$ ${previousMetrics.cost} | ${calculateVariation(parseFloat(currentMetrics.cost), parseFloat(previousMetrics.cost))} |\n`;
      context += `| Conv. | ${currentMetrics.conversions} | ${previousMetrics.conversions} | ${calculateVariation(parseInt(currentMetrics.conversions), parseInt(previousMetrics.conversions))} |\n`;
      context += `| ROAS | ${currentMetrics.roas}x | ${previousMetrics.roas}x | ${calculateVariation(parseFloat(currentMetrics.roas), parseFloat(previousMetrics.roas))} |\n`;
      context += `| CPA | R$ ${currentMetrics.cpa} | R$ ${previousMetrics.cpa} | ${calculateVariation(parseFloat(currentMetrics.cpa), parseFloat(previousMetrics.cpa))} |\n`;
      context += `| Cliques | ${currentMetrics.clicks} | ${previousMetrics.clicks} | ${calculateVariation(currentMetrics.clicks, previousMetrics.clicks)} |\n`;
      context += `| CTR | ${currentMetrics.ctr}% | ${previousMetrics.ctr}% | ${calculateVariation(parseFloat(currentMetrics.ctr), parseFloat(previousMetrics.ctr))} |\n`;
      context += `| CPC | R$ ${currentMetrics.avgCpc} | R$ ${previousMetrics.avgCpc} | ${calculateVariation(parseFloat(currentMetrics.avgCpc), parseFloat(previousMetrics.avgCpc))} |\n`;
    }
  }

  // Handle daily report
  if (intent.type === 'DAILY_REPORT') {
    const dailyData = await fetchDailyMetrics(customerId, accessToken, intent.period);
    if (dailyData && dailyData.length > 0) {
      context += `\n═══════════════════════════════════════\n`;
      context += `📅 MÉTRICAS POR DIA:\n`;
      context += `═══════════════════════════════════════\n`;
      context += `| Data | Gasto | Conv. | Cliques | Impr. |\n`;
      context += `|------|-------|-------|---------|-------|\n`;
      dailyData.slice(0, 14).forEach(d => {
        context += `| ${d.date} | R$ ${d.cost.toFixed(2)} | ${d.conversions.toFixed(0)} | ${d.clicks} | ${d.impressions} |\n`;
      });
    }
  }

  // Handle campaigns
  if (intent.type === 'CAMPAIGNS' || intent.type === 'OVERVIEW') {
    const campaigns = await fetchCampaignDetails(customerId, accessToken, intent.period);
    if (campaigns && campaigns.length > 0) {
      context += `\n═══════════════════════════════════════\n`;
      context += `🎯 PERFORMANCE POR CAMPANHA:\n`;
      context += `═══════════════════════════════════════\n`;
      campaigns.forEach((c, i) => {
        context += `${i + 1}. ${c.name}\n`;
        context += `   • Gasto: R$ ${c.cost} | Conv: ${c.conversions} | ROAS: ${c.roas}x | CTR: ${c.ctr}%\n`;
      });
    }
  }

  // Handle keywords
  if (intent.type === 'KEYWORDS') {
    const keywords = await fetchKeywordPerformance(customerId, accessToken, intent.period, intent.limit);
    if (keywords && keywords.length > 0) {
      context += `\n═══════════════════════════════════════\n`;
      context += `🔑 TOP PALAVRAS-CHAVE:\n`;
      context += `═══════════════════════════════════════\n`;
      context += `| # | Palavra-Chave | Match | Gasto | Cliques | Conv. | CPC | QS |\n`;
      context += `|---|--------------|-------|-------|---------|-------|-----|----|\n`;
      keywords.forEach((k, i) => {
        const qs = k.qualityScore ? k.qualityScore.toString() : 'N/A';
        context += `| ${i + 1} | ${k.keyword.substring(0, 25)} | ${k.matchType} | R$ ${k.cost} | ${k.clicks} | ${k.conversions} | R$ ${k.avgCpc} | ${qs} |\n`;
      });
      
      // Add insights
      const highQS = keywords.filter(k => k.qualityScore && k.qualityScore >= 7);
      const lowQS = keywords.filter(k => k.qualityScore && k.qualityScore <= 4);
      if (highQS.length > 0 || lowQS.length > 0) {
        context += `\n💡 INSIGHTS:\n`;
        if (highQS.length > 0) {
          context += `• ${highQS.length} palavras-chave com Quality Score alto (≥7)\n`;
        }
        if (lowQS.length > 0) {
          context += `• ${lowQS.length} palavras-chave com Quality Score baixo (≤4) - considere otimizar\n`;
        }
      }
    }
  }

  // Handle search terms
  if (intent.type === 'SEARCH_TERMS') {
    const searchTerms = await fetchSearchTermsReport(customerId, accessToken, intent.period, intent.limit);
    if (searchTerms && searchTerms.length > 0) {
      context += `\n═══════════════════════════════════════\n`;
      context += `🔍 TERMOS DE PESQUISA REAIS:\n`;
      context += `═══════════════════════════════════════\n`;
      
      // Separate converting and non-converting
      const converting = searchTerms.filter(t => parseInt(t.conversions) > 0);
      const nonConverting = searchTerms.filter(t => parseInt(t.conversions) === 0);
      
      if (converting.length > 0) {
        context += `\n✅ TERMOS QUE CONVERTERAM:\n`;
        context += `| Termo | Campanha | Conv. | Cliques | Gasto |\n`;
        context += `|-------|----------|-------|---------|-------|\n`;
        converting.slice(0, 15).forEach(t => {
          context += `| ${t.searchTerm.substring(0, 30)} | ${t.campaignName.substring(0, 20)} | ${t.conversions} | ${t.clicks} | R$ ${t.cost} |\n`;
        });
      }
      
      if (nonConverting.length > 0) {
        context += `\n⚠️ TERMOS COM ALTO VOLUME SEM CONVERSÃO (avaliar negativação):\n`;
        const highClickNoConv = nonConverting.filter(t => t.clicks >= 5).slice(0, 10);
        highClickNoConv.forEach(t => {
          context += `• "${t.searchTerm}" - ${t.clicks} cliques, R$ ${t.cost} gasto\n`;
        });
      }
    }
  }

  context += `\n═══════════════════════════════════════\n`;
  context += `Use esses dados para análises detalhadas. Ao apresentar tabelas, mantenha o formato. Calcule variações percentuais quando relevante.\n`;

  return context;
}

// ==================== MAIN SERVER ====================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Manual authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No Authorization header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate user
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError?.message);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Authenticated user:', user.id);

    const { messages, clientId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user role and client info
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: userRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isAdmin = userRole?.role === 'admin';
    console.log('User role:', userRole?.role, 'isAdmin:', isAdmin);

    // Determine which client's documents to search
    let targetClientId = clientId;
    
    if (!isAdmin) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('client_id')
        .eq('user_id', user.id)
        .single();
      
      targetClientId = profile?.client_id;
    }

    console.log('Target client ID for RAG:', targetClientId);

    // Get the last user message for context retrieval
    const lastUserMessage = messages.filter((m: any) => m.role === 'user').pop();
    const query = lastUserMessage?.content || '';

    // Search for relevant documents
    let contextDocs: any[] = [];
    if (targetClientId && query) {
      const { data: docs, error: docsError } = await supabaseAdmin
        .from('documents_knowledge')
        .select('content, metadata')
        .eq('client_id', targetClientId)
        .limit(5);

      if (docsError) {
        console.error('Error fetching documents:', docsError);
      } else {
        contextDocs = docs || [];
        console.log('Found', contextDocs.length, 'documents for context');
      }
    }

    // Fetch Google Ads metrics with intelligent intent parsing
    let adsMetricsContext = '';
    if (targetClientId && isAskingAboutAds(query)) {
      console.log('User is asking about ads, parsing intent...');
      
      const intent = parseUserIntent(query);
      console.log('Parsed intent:', intent);
      
      // Get client's google_ads_id
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('name, google_ads_id')
        .eq('id', targetClientId)
        .single();

      if (client?.google_ads_id) {
        const accessToken = await getGoogleAccessToken();
        if (accessToken) {
          adsMetricsContext = await buildAdsContext(client.google_ads_id, accessToken, intent);
          console.log('Google Ads context built successfully, type:', intent.type);
        }
      } else {
        console.log('Client has no google_ads_id configured');
      }
    }

    // Build context from documents
    const documentContext = contextDocs.length > 0
      ? `\n\nContexto dos documentos do cliente:\n${contextDocs.map((d, i) => 
          `[Documento ${i + 1}${d.metadata?.filename ? ` - ${d.metadata.filename}` : ''}]:\n${d.content?.substring(0, 1500) || ''}`
        ).join('\n\n')}`
      : '';

    // Get client info for context
    let clientInfo = '';
    if (targetClientId) {
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('name')
        .eq('id', targetClientId)
        .single();
      
      if (client) {
        clientInfo = `\nVocê está auxiliando o cliente: ${client.name}`;
      }
    }

    // Build system prompt with enhanced guidelines
    const systemPrompt = `Você é o assistente IA da AgencyOS, uma plataforma de gestão para agências de marketing.
Seu papel é ajudar ${isAdmin ? 'administradores' : 'clientes'} com análises detalhadas de campanhas, performance, documentos e estratégias.
${clientInfo}
${adsMetricsContext}
${documentContext}

DIRETRIZES IMPORTANTES:

📊 APRESENTAÇÃO DE DADOS:
- Mantenha tabelas em formato markdown quando receber dados tabulados
- Calcule e destaque variações percentuais (crescimento/queda)
- Use emojis para indicar tendências: 📈 (alta), 📉 (baixa), ➡️ (estável)
- Arredonde valores monetários para 2 casas decimais

📈 ANÁLISE DE PERFORMANCE:
- Identifique tendências claras nos dados
- Compare métricas com benchmarks do mercado quando relevante
- Sugira ações concretas baseadas nos dados (ex: palavras negativas, ajuste de lance)
- Destaque anomalias ou oportunidades

🎯 OTIMIZAÇÃO:
- Ao falar de palavras-chave, priorize as com melhor custo-benefício
- Sugira termos de pesquisa para negativação quando tiverem alto custo sem conversão
- Recomende redistribuição de verba entre campanhas baseado em ROAS

💬 COMUNICAÇÃO:
- Seja conciso mas completo
- Use linguagem profissional mas acessível
- Explique termos técnicos quando o usuário parecer iniciante
- Responda sempre em português brasileiro`;

    console.log('Calling Lovable AI with streaming...');

    // Call Lovable AI with streaming
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add more credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return the stream
    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('chat-rag error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
