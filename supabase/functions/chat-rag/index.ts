import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==================== TYPES ====================

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
  type: string;
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
  adGroupName: string;
  cost: string;
  clicks: number;
  conversions: string;
  avgCpc: string;
  qualityScore: number | null;
}

interface SearchTermData {
  searchTerm: string;
  campaignName: string;
  adGroupName: string;
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

interface MonthlyMetrics {
  month: string;
  year: number;
  cost: number;
  conversions: number;
  conversionValue: number;
  clicks: number;
  impressions: number;
}

// ==================== ADVANCED INTENT SYSTEM ====================

interface DateRange {
  type: 'PREDEFINED' | 'CUSTOM';
  predefined?: string;
  customStart?: string;
  customEnd?: string;
  label: string;
}

interface QueryFilters {
  campaignName?: string;
  campaignType?: 'SEARCH' | 'DISPLAY' | 'VIDEO' | 'SHOPPING' | 'PERFORMANCE_MAX';
  adGroupName?: string;
}

interface AdvancedUserIntent {
  type: 'OVERVIEW' | 'COMPARISON' | 'KEYWORDS' | 'SEARCH_TERMS' | 'CAMPAIGNS' | 'DAILY_REPORT' | 'MONTHLY_REPORT' | 'FILTERED';
  dateRange: DateRange;
  comparisonDateRange?: DateRange;
  filters: QueryFilters;
  focusMetrics?: string[];
  limit: number;
  compareCampaigns?: { campaign1: string; campaign2: string };
}

// Month name to number mapping
const MONTH_MAP: Record<string, number> = {
  'janeiro': 1, 'jan': 1,
  'fevereiro': 2, 'fev': 2,
  'março': 3, 'marco': 3, 'mar': 3,
  'abril': 4, 'abr': 4,
  'maio': 5, 'mai': 5,
  'junho': 6, 'jun': 6,
  'julho': 7, 'jul': 7,
  'agosto': 8, 'ago': 8,
  'setembro': 9, 'set': 9,
  'outubro': 10, 'out': 10,
  'novembro': 11, 'nov': 11,
  'dezembro': 12, 'dez': 12,
};

// Campaign type mapping
const CAMPAIGN_TYPE_MAP: Record<string, 'SEARCH' | 'DISPLAY' | 'VIDEO' | 'SHOPPING' | 'PERFORMANCE_MAX'> = {
  'busca': 'SEARCH',
  'search': 'SEARCH',
  'pesquisa': 'SEARCH',
  'display': 'DISPLAY',
  'rede de display': 'DISPLAY',
  'gdn': 'DISPLAY',
  'video': 'VIDEO',
  'vídeo': 'VIDEO',
  'youtube': 'VIDEO',
  'shopping': 'SHOPPING',
  'compras': 'SHOPPING',
  'pmax': 'PERFORMANCE_MAX',
  'performance max': 'PERFORMANCE_MAX',
  'performance máxima': 'PERFORMANCE_MAX',
};

function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function parseMonthToDateRange(monthStr: string, yearStr?: string): DateRange | null {
  const monthLower = monthStr.toLowerCase();
  const monthNum = MONTH_MAP[monthLower];
  if (!monthNum) return null;
  
  const year = yearStr ? parseInt(yearStr) : new Date().getFullYear();
  const lastDay = getLastDayOfMonth(year, monthNum);
  
  const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
  const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
  
  const monthNames = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  return {
    type: 'CUSTOM',
    customStart: startDate,
    customEnd: endDate,
    label: `${monthNames[monthNum]} de ${year}`,
  };
}

function parseYearToDateRange(yearStr: string): DateRange {
  const year = parseInt(yearStr);
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  let endDate: string;
  if (year === currentYear) {
    // Current year - use today's date
    endDate = currentDate.toISOString().split('T')[0];
  } else {
    endDate = `${year}-12-31`;
  }
  
  return {
    type: 'CUSTOM',
    customStart: `${year}-01-01`,
    customEnd: endDate,
    label: `Ano de ${year}`,
  };
}

function parseQuarterToDateRange(quarter: number, yearStr?: string): DateRange {
  const year = yearStr ? parseInt(yearStr) : new Date().getFullYear();
  const quarterMonths: Record<number, [number, number]> = {
    1: [1, 3],
    2: [4, 6],
    3: [7, 9],
    4: [10, 12],
  };
  
  const [startMonth, endMonth] = quarterMonths[quarter];
  const lastDay = getLastDayOfMonth(year, endMonth);
  
  return {
    type: 'CUSTOM',
    customStart: `${year}-${startMonth.toString().padStart(2, '0')}-01`,
    customEnd: `${year}-${endMonth.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`,
    label: `Q${quarter} de ${year}`,
  };
}

function parseMonthRangeToDateRange(
  startMonth: string,
  endMonth: string,
  startYear?: string,
  endYear?: string
): DateRange | null {
  const startMonthNum = MONTH_MAP[startMonth.toLowerCase()];
  const endMonthNum = MONTH_MAP[endMonth.toLowerCase()];
  if (!startMonthNum || !endMonthNum) return null;

  const currentYear = new Date().getFullYear();

  // Infer missing years from the provided one (common in PT-BR queries)
  // Example: "de janeiro a março de 2025" => startYear should be 2025.
  const inferredStartYear = startYear ?? endYear ?? String(currentYear);
  const inferredEndYear = endYear ?? startYear ?? String(currentYear);

  const sYear = parseInt(inferredStartYear);
  const eYear = parseInt(inferredEndYear);

  const lastDay = getLastDayOfMonth(eYear, endMonthNum);

  const monthNames = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return {
    type: 'CUSTOM',
    customStart: `${sYear}-${startMonthNum.toString().padStart(2, '0')}-01`,
    customEnd: `${eYear}-${endMonthNum.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`,
    label: `${monthNames[startMonthNum]}/${sYear} a ${monthNames[endMonthNum]}/${eYear}`,
  };
}

function parseAdvancedUserIntent(message: string): AdvancedUserIntent {
  const lowerMessage = message.toLowerCase();
  
  // Default intent
  const intent: AdvancedUserIntent = {
    type: 'OVERVIEW',
    dateRange: { type: 'PREDEFINED', predefined: 'LAST_30_DAYS', label: 'Últimos 30 dias' },
    filters: {},
    limit: 20,
  };
  
  // ==================== DATE RANGE PARSING ====================
  
  // Check for specific month: "janeiro 2025", "março de 2024"
  const specificMonthMatch = lowerMessage.match(
    /(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s*(?:de\s*)?(20\d{2})?/i
  );
  
  // Check for month range: "de janeiro a março", "janeiro até março de 2025"
  const monthRangeMatch = lowerMessage.match(
    /(?:de\s+)?(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s*(?:de\s*)?(20\d{2})?\s*(?:a|até|à)\s*(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s*(?:de\s*)?(20\d{2})?/i
  );
  
  // Check for year: "em 2024", "ano de 2023", just "2024"
  const yearMatch = lowerMessage.match(/(?:em\s+|ano\s+(?:de\s+)?|dados\s+de\s+)?(20\d{2})(?!\d)/);
  
  // Check for quarter: "Q1 2025", "primeiro trimestre"
  const quarterMatch = lowerMessage.match(
    /(?:q([1-4])|(?:(primeiro|segundo|terceiro|quarto)\s*trimestre))\s*(?:de\s*)?(20\d{2})?/i
  );
  
  // Check for year comparison: "2024 vs 2023", "comparar 2024 com 2025"
  const yearComparisonMatch = lowerMessage.match(
    /(20\d{2})\s*(?:vs|versus|com|e|x)\s*(20\d{2})/i
  );
  
  // Process date range matches (priority order)
  if (yearComparisonMatch) {
    intent.dateRange = parseYearToDateRange(yearComparisonMatch[1]);
    intent.comparisonDateRange = parseYearToDateRange(yearComparisonMatch[2]);
    intent.type = 'COMPARISON';
  } else if (monthRangeMatch) {
    const range = parseMonthRangeToDateRange(
      monthRangeMatch[1],
      monthRangeMatch[3],
      monthRangeMatch[2],
      monthRangeMatch[4]
    );
    if (range) intent.dateRange = range;
  } else if (quarterMatch) {
    let quarterNum: number;
    if (quarterMatch[1]) {
      quarterNum = parseInt(quarterMatch[1]);
    } else {
      const quarterNames: Record<string, number> = {
        'primeiro': 1, 'segundo': 2, 'terceiro': 3, 'quarto': 4
      };
      quarterNum = quarterNames[quarterMatch[2].toLowerCase()];
    }
    intent.dateRange = parseQuarterToDateRange(quarterNum, quarterMatch[3]);
  } else if (specificMonthMatch && !monthRangeMatch) {
    const range = parseMonthToDateRange(specificMonthMatch[1], specificMonthMatch[2]);
    if (range) intent.dateRange = range;
  } else if (yearMatch && !specificMonthMatch) {
    intent.dateRange = parseYearToDateRange(yearMatch[1]);
  } else {
    // Fallback to predefined periods
    if (/últim[oa]s?\s*7\s*dias|última\s*semana|semana\s*passada/i.test(lowerMessage)) {
      intent.dateRange = { type: 'PREDEFINED', predefined: 'LAST_7_DAYS', label: 'Últimos 7 dias' };
    } else if (/últim[oa]s?\s*14\s*dias|duas\s*semanas/i.test(lowerMessage)) {
      intent.dateRange = { type: 'PREDEFINED', predefined: 'LAST_14_DAYS', label: 'Últimos 14 dias' };
    } else if (/últim[oa]s?\s*90\s*dias|3\s*meses|trimestre/i.test(lowerMessage)) {
      intent.dateRange = { type: 'PREDEFINED', predefined: 'LAST_90_DAYS', label: 'Últimos 90 dias' };
    }
    // Default: LAST_30_DAYS already set
  }
  
  // ==================== FILTER PARSING ====================
  
  // Campaign name filter: "campanha de remarketing", "campanha 'Black Friday'"
  const campaignNameMatch = lowerMessage.match(
    /campanha\s+(?:de\s+)?["']?([^"',]+?)["']?(?:\s|$|,|\?|!)/i
  );
  if (campaignNameMatch) {
    const campaignName = campaignNameMatch[1].trim();
    // Exclude common words that aren't campaign names
    if (!['google', 'ads', 'busca', 'display', 'shopping', 'video', 'pmax'].includes(campaignName)) {
      intent.filters.campaignName = campaignName;
      intent.type = 'FILTERED';
    }
  }
  
  // Campaign type filter: "campanhas de busca", "só display"
  const campaignTypeMatch = lowerMessage.match(
    /(?:campanha[s]?\s+(?:de\s+)?|só\s+|apenas\s+|somente\s+)(busca|search|pesquisa|display|rede de display|gdn|video|vídeo|youtube|shopping|compras|pmax|performance max|performance máxima)/i
  );
  if (campaignTypeMatch) {
    const typeKey = campaignTypeMatch[1].toLowerCase();
    intent.filters.campaignType = CAMPAIGN_TYPE_MAP[typeKey];
  }
  
  // Ad group filter: "grupo de anúncios vendas"
  const adGroupMatch = lowerMessage.match(
    /grupo\s+(?:de\s+)?anúncios?\s+["']?([^"',]+?)["']?(?:\s|$|,|\?|!)/i
  );
  if (adGroupMatch) {
    intent.filters.adGroupName = adGroupMatch[1].trim();
    intent.type = 'FILTERED';
  }
  
  // Campaign comparison: "comparar busca com display"
  const compareCampaignsMatch = lowerMessage.match(
    /comparar?\s+(?:campanha[s]?\s+)?(.+?)\s+(?:com|vs|versus|e|x)\s+(?:campanha[s]?\s+)?(.+?)(?:\s|$|\?|!)/i
  );
  if (compareCampaignsMatch) {
    intent.compareCampaigns = {
      campaign1: compareCampaignsMatch[1].trim(),
      campaign2: compareCampaignsMatch[2].trim(),
    };
    intent.type = 'COMPARISON';
  }
  
  // ==================== INTENT TYPE DETECTION ====================
  
  // Keywords intent
  const keywordPatterns = [
    /palavra[s]?[\s-]?chave/i,
    /keyword[s]?/i,
    /melhor(es)?\s+termo[s]?/i,
    /quality\s*score/i,
    /índice de qualidade/i,
    /qs\s+baixo|qs\s+alto/i,
  ];
  if (keywordPatterns.some(p => p.test(lowerMessage))) {
    intent.type = 'KEYWORDS';
  }
  
  // Search terms intent
  const searchTermPatterns = [
    /termo[s]?\s+de\s+pesquisa/i,
    /search\s+term[s]?/i,
    /o que.*(pesquisaram|buscaram)/i,
    /busca[s]?\s+real|reais/i,
    /negativar|negativação|negativas/i,
  ];
  if (searchTermPatterns.some(p => p.test(lowerMessage))) {
    intent.type = 'SEARCH_TERMS';
  }
  
  // Campaigns intent
  const campaignPatterns = [
    /performance\s+por\s+campanha/i,
    /todas\s+as\s+campanhas/i,
    /lista[r]?\s+campanha/i,
    /detalhe[s]?\s+(da|das)\s+campanha/i,
    /campanhas?\s+(?:de\s+)?google\s*ads/i,
    /me\s+fale\s+sobre\s+as\s+campanhas/i,
  ];
  if (campaignPatterns.some(p => p.test(lowerMessage)) && !intent.filters.campaignName) {
    intent.type = 'CAMPAIGNS';
  }
  
  // Daily report intent
  const dailyPatterns = [
    /por\s+dia/i,
    /diário|diaria/i,
    /dia\s+a\s+dia/i,
    /cada\s+dia/i,
  ];
  if (dailyPatterns.some(p => p.test(lowerMessage))) {
    intent.type = 'DAILY_REPORT';
  }
  
  // Monthly report intent
  const monthlyPatterns = [
    /mês\s+a\s+mês/i,
    /mensal|mensais/i,
    /por\s+mês/i,
    /evolução\s+mensal/i,
  ];
  if (monthlyPatterns.some(p => p.test(lowerMessage))) {
    intent.type = 'MONTHLY_REPORT';
  }
  
  // Comparison intent (if not already set)
  const comparisonPatterns = [
    /comparar|comparativo/i,
    /evolução|evolucao/i,
    /tendência|tendencia/i,
    /vs|versus/i,
  ];
  if (comparisonPatterns.some(p => p.test(lowerMessage)) && intent.type === 'OVERVIEW') {
    intent.type = 'COMPARISON';
    // Set comparison period if not already set
    if (!intent.comparisonDateRange) {
      if (intent.dateRange.type === 'PREDEFINED') {
        const periodMap: Record<string, string> = {
          'LAST_7_DAYS': 'LAST_14_DAYS',
          'LAST_14_DAYS': 'LAST_30_DAYS',
          'LAST_30_DAYS': 'LAST_60_DAYS',
          'LAST_90_DAYS': 'THIS_YEAR',
        };
        intent.comparisonDateRange = {
          type: 'PREDEFINED',
          predefined: periodMap[intent.dateRange.predefined || 'LAST_30_DAYS'] || 'LAST_60_DAYS',
          label: 'Período anterior',
        };
      }
    }
  }
  
  // Focus metrics detection
  const metricsPatterns: Array<[RegExp, string]> = [
    [/\bcpc\b|custo\s+por\s+clique/i, 'cpc'],
    [/\broas\b|retorno\s+sobre/i, 'roas'],
    [/\bcpa\b|custo\s+por\s+aquisição/i, 'cpa'],
    [/\bctr\b|taxa\s+de\s+clique/i, 'ctr'],
    [/conversões|conversoes|conversão/i, 'conversions'],
    [/gasto|investimento|custo\s+total/i, 'cost'],
    [/cliques/i, 'clicks'],
    [/impressões|impressoes/i, 'impressions'],
  ];
  
  const focusMetrics: string[] = [];
  metricsPatterns.forEach(([pattern, metric]) => {
    if (pattern.test(lowerMessage)) focusMetrics.push(metric);
  });
  if (focusMetrics.length > 0) {
    intent.focusMetrics = focusMetrics;
  }
  
  return intent;
}

function isAskingAboutAds(message: string): boolean {
  const keywords = [
    'google ads', 'campanha', 'campanhas', 'performance', 'métricas', 'metricas',
    'roas', 'cpa', 'conversões', 'conversoes', 'cliques', 'impressões', 'impressoes',
    'ctr', 'cpc', 'custo', 'gasto', 'resultado', 'resultados', 'anúncios', 'anuncios',
    'ads', 'tráfego pago', 'trafego pago', 'mídia paga', 'midia paga', 'palavra-chave',
    'palavras-chave', 'keyword', 'keywords', 'termo de pesquisa', 'termos de pesquisa',
    'search term', 'quality score', 'índice de qualidade', 'investimento', 'verba',
    'orçamento', 'orcamento', 'semana passada', 'mês passado', 'comparar', 'evolução',
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto',
    'setembro', 'outubro', 'novembro', 'dezembro', '2024', '2025', 'trimestre'
  ];
  const lowerMessage = message.toLowerCase();
  return keywords.some(keyword => lowerMessage.includes(keyword));
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

// ==================== GOOGLE ADS API QUERIES ====================

function buildDateClause(dateRange: DateRange): string {
  if (dateRange.type === 'CUSTOM' && dateRange.customStart && dateRange.customEnd) {
    return `segments.date BETWEEN '${dateRange.customStart}' AND '${dateRange.customEnd}'`;
  }
  return `segments.date DURING ${dateRange.predefined || 'LAST_30_DAYS'}`;
}

function buildCampaignTypeClause(campaignType: string): string {
  return `AND campaign.advertising_channel_type = '${campaignType}'`;
}

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

// Fetch aggregated metrics with custom date range
async function fetchMetricsByDateRange(
  customerId: string, 
  accessToken: string, 
  dateRange: DateRange,
  filters?: QueryFilters
): Promise<GoogleAdsMetrics | null> {
  let whereClause = buildDateClause(dateRange);
  
  if (filters?.campaignType) {
    whereClause += ` ${buildCampaignTypeClause(filters.campaignType)}`;
  }
  
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
    WHERE ${whereClause}
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

// Fetch monthly metrics for long-term analysis
async function fetchMonthlyMetrics(
  customerId: string, 
  accessToken: string, 
  dateRange: DateRange
): Promise<MonthlyMetrics[] | null> {
  const whereClause = buildDateClause(dateRange);
  
  const query = `
    SELECT
      segments.month,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.clicks,
      metrics.impressions
    FROM customer
    WHERE ${whereClause}
    ORDER BY segments.month DESC
  `;

  const results = await executeGoogleAdsQuery(customerId, accessToken, query);
  if (!results) return null;

  return results.map(r => {
    const monthStr = r.segments.month; // Format: YYYY-MM
    const [year, month] = monthStr.split('-').map(Number);
    return {
      month: monthStr,
      year,
      cost: parseInt(r.metrics.costMicros || '0') / 1000000,
      conversions: parseFloat(r.metrics.conversions || '0'),
      conversionValue: parseFloat(r.metrics.conversionsValue || '0'),
      clicks: parseInt(r.metrics.clicks || '0'),
      impressions: parseInt(r.metrics.impressions || '0'),
    };
  });
}

// Fetch daily metrics for trend analysis
async function fetchDailyMetrics(
  customerId: string, 
  accessToken: string, 
  dateRange: DateRange
): Promise<DailyMetrics[] | null> {
  const whereClause = buildDateClause(dateRange);
  
  const query = `
    SELECT
      segments.date,
      metrics.cost_micros,
      metrics.conversions,
      metrics.clicks,
      metrics.impressions
    FROM customer
    WHERE ${whereClause}
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

// Fetch campaign performance with filters
async function fetchCampaignDetails(
  customerId: string, 
  accessToken: string, 
  dateRange: DateRange,
  filters?: QueryFilters
): Promise<CampaignData[] | null> {
  let whereClause = buildDateClause(dateRange);
  whereClause += ` AND campaign.status = 'ENABLED'`;
  
  if (filters?.campaignName) {
    whereClause += ` AND campaign.name LIKE '%${filters.campaignName}%'`;
  }
  if (filters?.campaignType) {
    whereClause += ` ${buildCampaignTypeClause(filters.campaignType)}`;
  }
  
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      metrics.cost_micros,
      metrics.conversions,
      metrics.conversions_value,
      metrics.clicks,
      metrics.ctr
    FROM campaign
    WHERE ${whereClause}
    ORDER BY metrics.cost_micros DESC
    LIMIT 20
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
      type: r.campaign.advertisingChannelType || 'UNKNOWN',
      cost: cost.toFixed(2),
      conversions: (parseFloat(r.metrics.conversions || '0')).toFixed(0),
      clicks: parseInt(r.metrics.clicks || '0'),
      ctr: ((parseFloat(r.metrics.ctr || '0')) * 100).toFixed(2),
      roas: cost > 0 ? (convValue / cost).toFixed(2) : '0.00',
    };
  });
}

// Fetch keyword performance with filters
async function fetchKeywordPerformance(
  customerId: string, 
  accessToken: string, 
  dateRange: DateRange,
  filters?: QueryFilters,
  limit: number = 20
): Promise<KeywordData[] | null> {
  let whereClause = buildDateClause(dateRange);
  whereClause += ` AND metrics.impressions > 0`;
  
  if (filters?.campaignName) {
    whereClause += ` AND campaign.name LIKE '%${filters.campaignName}%'`;
  }
  if (filters?.adGroupName) {
    whereClause += ` AND ad_group.name LIKE '%${filters.adGroupName}%'`;
  }
  
  const query = `
    SELECT
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      campaign.name,
      ad_group.name,
      metrics.cost_micros,
      metrics.clicks,
      metrics.conversions,
      metrics.average_cpc,
      ad_group_criterion.quality_info.quality_score
    FROM keyword_view
    WHERE ${whereClause}
    ORDER BY metrics.cost_micros DESC
    LIMIT ${limit}
  `;

  const results = await executeGoogleAdsQuery(customerId, accessToken, query);
  if (!results) return null;

  return results.map(r => ({
    keyword: r.adGroupCriterion?.keyword?.text || 'N/A',
    matchType: r.adGroupCriterion?.keyword?.matchType || 'N/A',
    campaignName: r.campaign?.name || 'N/A',
    adGroupName: r.adGroup?.name || 'N/A',
    cost: (parseInt(r.metrics.costMicros || '0') / 1000000).toFixed(2),
    clicks: parseInt(r.metrics.clicks || '0'),
    conversions: (parseFloat(r.metrics.conversions || '0')).toFixed(0),
    avgCpc: (parseInt(r.metrics.averageCpc || '0') / 1000000).toFixed(2),
    qualityScore: r.adGroupCriterion?.qualityInfo?.qualityScore || null,
  }));
}

// Fetch search terms report with filters
async function fetchSearchTermsReport(
  customerId: string, 
  accessToken: string, 
  dateRange: DateRange,
  filters?: QueryFilters,
  limit: number = 30
): Promise<SearchTermData[] | null> {
  let whereClause = buildDateClause(dateRange);
  whereClause += ` AND metrics.impressions > 5`;
  
  if (filters?.campaignName) {
    whereClause += ` AND campaign.name LIKE '%${filters.campaignName}%'`;
  }
  if (filters?.adGroupName) {
    whereClause += ` AND ad_group.name LIKE '%${filters.adGroupName}%'`;
  }
  
  const query = `
    SELECT
      search_term_view.search_term,
      campaign.name,
      ad_group.name,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions,
      metrics.cost_micros
    FROM search_term_view
    WHERE ${whereClause}
    ORDER BY metrics.impressions DESC
    LIMIT ${limit}
  `;

  const results = await executeGoogleAdsQuery(customerId, accessToken, query);
  if (!results) return null;

  return results.map(r => ({
    searchTerm: r.searchTermView?.searchTerm || 'N/A',
    campaignName: r.campaign?.name || 'N/A',
    adGroupName: r.adGroup?.name || 'N/A',
    clicks: parseInt(r.metrics.clicks || '0'),
    impressions: parseInt(r.metrics.impressions || '0'),
    conversions: (parseFloat(r.metrics.conversions || '0')).toFixed(0),
    cost: (parseInt(r.metrics.costMicros || '0') / 1000000).toFixed(2),
  }));
}

// ==================== CONTEXT BUILDER ====================

function calculateVariation(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? '+∞' : '0%';
  const variation = ((current - previous) / previous) * 100;
  const sign = variation >= 0 ? '+' : '';
  return `${sign}${variation.toFixed(1)}%`;
}

async function buildAdvancedAdsContext(
  customerId: string,
  accessToken: string,
  intent: AdvancedUserIntent
): Promise<string> {
  let context = '\n\n📊 DADOS DO GOOGLE ADS:\n';

  const today = new Date().toISOString().split('T')[0];
  let effectiveIntent: AdvancedUserIntent = intent;
  let requestedPeriodLabel = intent.dateRange.label;

  // Normalize/guard custom ranges (swap if inverted; clamp future end; fallback if fully future)
  if (intent.dateRange.type === 'CUSTOM' && intent.dateRange.customStart && intent.dateRange.customEnd) {
    let start = intent.dateRange.customStart;
    let end = intent.dateRange.customEnd;

    if (start > end) {
      const tmp = start;
      start = end;
      end = tmp;
    }

    if (start > today) {
      // Entirely in the future => show latest available instead
      context += `\n⚠️ O período solicitado (${requestedPeriodLabel}) está no futuro. Não existem dados ainda.`;
      context += `\n➡️ Vou mostrar o período mais recente disponível (Últimos 30 dias).\n`;
      effectiveIntent = {
        ...intent,
        dateRange: { type: 'PREDEFINED', predefined: 'LAST_30_DAYS', label: 'Últimos 30 dias' },
      };
    } else {
      if (end > today) {
        context += `\nℹ️ O período solicitado inclui datas futuras; vou considerar dados até ${today}.\n`;
        end = today;
      }
      effectiveIntent = {
        ...intent,
        dateRange: {
          ...intent.dateRange,
          customStart: start,
          customEnd: end,
          label: intent.dateRange.label,
        },
      };
    }
  }

  // Build filter description
  let filterDesc = '';
  if (effectiveIntent.filters.campaignName) {
    filterDesc += `\n🔍 Filtro de campanha: "${effectiveIntent.filters.campaignName}"`;
  }
  if (effectiveIntent.filters.campaignType) {
    const typeLabels: Record<string, string> = {
      'SEARCH': 'Busca',
      'DISPLAY': 'Display',
      'VIDEO': 'Vídeo',
      'SHOPPING': 'Shopping',
      'PERFORMANCE_MAX': 'Performance Max',
    };
    filterDesc += `\n🔍 Tipo de campanha: ${typeLabels[effectiveIntent.filters.campaignType] || effectiveIntent.filters.campaignType}`;
  }
  if (effectiveIntent.filters.adGroupName) {
    filterDesc += `\n🔍 Grupo de anúncios: "${effectiveIntent.filters.adGroupName}"`;
  }

  context += filterDesc;

  // Always fetch current period metrics
  const currentMetrics = await fetchMetricsByDateRange(customerId, accessToken, effectiveIntent.dateRange, effectiveIntent.filters);

  if (!currentMetrics) {
    return `\n\n⚠️ Não há dados disponíveis para o período solicitado (${requestedPeriodLabel}).`; 
  }

  context += `\n\n═══════════════════════════════════════\n`;
  context += `📈 VISÃO GERAL (${effectiveIntent.dateRange.label}):\n`;
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
  if (effectiveIntent.type === 'COMPARISON' && effectiveIntent.comparisonDateRange) {
    const previousMetrics = await fetchMetricsByDateRange(
      customerId,
      accessToken,
      effectiveIntent.comparisonDateRange,
      effectiveIntent.filters
    );

    if (previousMetrics) {
      context += `\n═══════════════════════════════════════\n`;
      context += `📊 COMPARATIVO: ${effectiveIntent.dateRange.label} vs ${effectiveIntent.comparisonDateRange.label}\n`;
      context += `═══════════════════════════════════════\n`;
      context += `| Métrica | ${effectiveIntent.dateRange.label} | ${effectiveIntent.comparisonDateRange.label} | Variação |\n`;
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

  // Handle monthly report
  if (effectiveIntent.type === 'MONTHLY_REPORT') {
    const monthlyData = await fetchMonthlyMetrics(customerId, accessToken, effectiveIntent.dateRange);
    if (monthlyData && monthlyData.length > 0) {
      const monthNames = ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

      context += `\n═══════════════════════════════════════\n`;
      context += `📅 MÉTRICAS MENSAIS:\n`;
      context += `═══════════════════════════════════════\n`;
      context += `| Mês | Gasto | Conv. | Valor Conv. | Cliques | Impr. |\n`;
      context += `|-----|-------|-------|-------------|---------|-------|\n`;
      monthlyData.forEach(m => {
        const [year, monthNum] = m.month.split('-').map(Number);
        const monthLabel = `${monthNames[monthNum]}/${year}`;
        context += `| ${monthLabel} | R$ ${m.cost.toFixed(2)} | ${m.conversions.toFixed(0)} | R$ ${m.conversionValue.toFixed(2)} | ${m.clicks} | ${m.impressions} |\n`;
      });
    }
  }

  // Handle daily report
  if (effectiveIntent.type === 'DAILY_REPORT') {
    const dailyData = await fetchDailyMetrics(customerId, accessToken, effectiveIntent.dateRange);
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
  if (effectiveIntent.type === 'CAMPAIGNS' || effectiveIntent.type === 'OVERVIEW' || effectiveIntent.type === 'FILTERED') {
    const campaigns = await fetchCampaignDetails(customerId, accessToken, effectiveIntent.dateRange, effectiveIntent.filters);
    if (campaigns && campaigns.length > 0) {
      const typeLabels: Record<string, string> = {
        'SEARCH': '🔍 Busca',
        'DISPLAY': '🖼️ Display',
        'VIDEO': '🎬 Vídeo',
        'SHOPPING': '🛒 Shopping',
        'PERFORMANCE_MAX': '⚡ PMax',
        'UNKNOWN': '❓',
      };

      context += `\n═══════════════════════════════════════\n`;
      context += `🎯 PERFORMANCE POR CAMPANHA:\n`;
      context += `═══════════════════════════════════════\n`;
      campaigns.forEach((c, i) => {
        context += `${i + 1}. ${c.name} [${typeLabels[c.type] || c.type}]\n`;
        context += `   • Gasto: R$ ${c.cost} | Conv: ${c.conversions} | ROAS: ${c.roas}x | CTR: ${c.ctr}%\n`;
      });
    }
  }

  // Handle keywords
  if (effectiveIntent.type === 'KEYWORDS') {
    const keywords = await fetchKeywordPerformance(
      customerId,
      accessToken,
      effectiveIntent.dateRange,
      effectiveIntent.filters,
      effectiveIntent.limit
    );
    if (keywords && keywords.length > 0) {
      context += `\n═══════════════════════════════════════\n`;
      context += `🔑 TOP PALAVRAS-CHAVE:\n`;
      context += `═══════════════════════════════════════\n`;
      context += `| # | Palavra-Chave | Campanha | Gasto | Cliques | Conv. | CPC | QS |\n`;
      context += `|---|--------------|----------|-------|---------|-------|-----|----|\n`;
      keywords.forEach((k, i) => {
        const qs = k.qualityScore ? k.qualityScore.toString() : 'N/A';
        const qsEmoji = k.qualityScore ? (k.qualityScore >= 7 ? '🟢' : k.qualityScore >= 5 ? '🟡' : '🔴') : '';
        context += `| ${i + 1} | ${k.keyword.substring(0, 20)} | ${k.campaignName.substring(0, 15)} | R$ ${k.cost} | ${k.clicks} | ${k.conversions} | R$ ${k.avgCpc} | ${qs} ${qsEmoji} |\n`;
      });

      const highQS = keywords.filter(k => k.qualityScore && k.qualityScore >= 7);
      const lowQS = keywords.filter(k => k.qualityScore && k.qualityScore <= 4);
      if (highQS.length > 0 || lowQS.length > 0) {
        context += `\n💡 INSIGHTS:\n`;
        if (highQS.length > 0) context += `• 🟢 ${highQS.length} palavras-chave com Quality Score alto (≥7)\n`;
        if (lowQS.length > 0) context += `• 🔴 ${lowQS.length} palavras-chave com Quality Score baixo (≤4) - considere otimizar\n`;
      }
    }
  }

  // Handle search terms
  if (effectiveIntent.type === 'SEARCH_TERMS') {
    const searchTerms = await fetchSearchTermsReport(
      customerId,
      accessToken,
      effectiveIntent.dateRange,
      effectiveIntent.filters,
      effectiveIntent.limit
    );
    if (searchTerms && searchTerms.length > 0) {
      context += `\n═══════════════════════════════════════\n`;
      context += `🔍 TERMOS DE PESQUISA REAIS:\n`;
      context += `═══════════════════════════════════════\n`;

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
  if (requestedPeriodLabel !== effectiveIntent.dateRange.label) {
    context += `📝 PERÍODO SOLICITADO: ${requestedPeriodLabel}\n`;
  }
  context += `📍 PERÍODO DOS DADOS: ${effectiveIntent.dateRange.label}\n`;
  if (Object.keys(effectiveIntent.filters).length > 0) {
    context += `🔍 FILTROS APLICADOS: ${JSON.stringify(effectiveIntent.filters)}\n`;
  }
  context += `Use esses dados para análises detalhadas.\n`;

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

    // Fetch Google Ads metrics with advanced intent parsing
    let adsMetricsContext = '';
    let parsedIntent: AdvancedUserIntent | null = null;
    
    if (targetClientId && isAskingAboutAds(query)) {
      console.log('User is asking about ads, parsing advanced intent...');
      
      parsedIntent = parseAdvancedUserIntent(query);
      console.log('Parsed advanced intent:', JSON.stringify(parsedIntent, null, 2));
      
      // Get client's google_ads_id
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('name, google_ads_id')
        .eq('id', targetClientId)
        .single();

      if (client?.google_ads_id) {
        const accessToken = await getGoogleAccessToken();
        if (accessToken) {
          adsMetricsContext = await buildAdvancedAdsContext(client.google_ads_id, accessToken, parsedIntent);
          console.log('Google Ads context built successfully, type:', parsedIntent.type, 'period:', parsedIntent.dateRange.label);
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

    // Build filter context for system prompt
    let filterContext = '';
    if (parsedIntent) {
      filterContext = `\n📍 PERÍODO DA CONSULTA: ${parsedIntent.dateRange.label}`;
      if (parsedIntent.filters.campaignName) {
        filterContext += `\n🔍 FILTRO DE CAMPANHA: "${parsedIntent.filters.campaignName}"`;
      }
      if (parsedIntent.filters.campaignType) {
        filterContext += `\n🔍 TIPO DE CAMPANHA: ${parsedIntent.filters.campaignType}`;
      }
      if (parsedIntent.filters.adGroupName) {
        filterContext += `\n🔍 GRUPO DE ANÚNCIOS: "${parsedIntent.filters.adGroupName}"`;
      }
    }

    // Build enhanced system prompt
    const systemPrompt = `Você é o assistente IA da AgencyOS, uma plataforma de gestão para agências de marketing.
Seu papel é ajudar ${isAdmin ? 'administradores' : 'clientes'} com análises detalhadas de campanhas, performance, documentos e estratégias.
${clientInfo}

🚨 REGRA CRÍTICA - VOCÊ TEM ACESSO DIRETO AOS DADOS:
Os dados do Google Ads estão listados abaixo em "DADOS DO GOOGLE ADS".
${filterContext}

REGRAS ABSOLUTAS:
1. NUNCA diga que você não tem acesso aos dados
2. NUNCA peça para o usuário fornecer dados ou exportar relatórios
3. NUNCA sugira que o usuário acesse o Google Ads para obter informações
4. NUNCA mencione "limitações técnicas" ou "impossibilidade de acessar"
5. Use EXCLUSIVAMENTE os dados fornecidos neste contexto
6. Se não houver dados para o período solicitado, diga: "Não há dados disponíveis para [período]. Aqui estão os dados que tenho..." e mostre o que você tem
7. Apresente os dados de forma clara, visual e com insights acionáveis

${adsMetricsContext}
${documentContext}

DIRETRIZES DE APRESENTAÇÃO:

📊 FORMATAÇÃO:
- Mantenha tabelas em formato markdown quando receber dados tabulados
- Use emojis para indicar tendências: 📈 (alta), 📉 (baixa), ➡️ (estável)
- Arredonde valores monetários para 2 casas decimais
- Destaque variações percentuais importantes

📈 ANÁLISE:
- Identifique tendências claras nos dados
- Compare métricas com benchmarks quando possível
- Sugira ações concretas baseadas nos dados
- Destaque anomalias e oportunidades

🎯 OTIMIZAÇÃO:
- Priorize keywords com melhor custo-benefício
- Sugira termos de pesquisa para negativação (alto custo, sem conversão)
- Recomende redistribuição de verba baseado em ROAS
- Identifique Quality Scores baixos para otimização

💬 COMUNICAÇÃO:
- Seja conciso mas completo
- Use linguagem profissional mas acessível
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
