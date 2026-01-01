import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to refresh Google access token
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

// Function to fetch Google Ads metrics
async function fetchGoogleAdsMetrics(customerId: string, accessToken: string): Promise<any | null> {
  const developerToken = Deno.env.get('GOOGLE_DEVELOPER_TOKEN');
  if (!developerToken) {
    console.log('GOOGLE_DEVELOPER_TOKEN not configured');
    return null;
  }

  const cleanCustomerId = customerId.replace(/-/g, '');
  
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
    WHERE segments.date DURING LAST_30_DAYS
  `;

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
      console.error('Google Ads API error:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data && data[0]?.results?.[0]?.metrics) {
      const metrics = data[0].results[0].metrics;
      const cost = parseInt(metrics.costMicros || '0') / 1000000;
      const conversions = metrics.conversions || 0;
      const conversionValue = metrics.conversionsValue || 0;
      const clicks = parseInt(metrics.clicks || '0');
      const impressions = parseInt(metrics.impressions || '0');
      const ctr = (metrics.ctr || 0) * 100;
      const avgCpc = (metrics.averageCpc || 0) / 1000000;
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

    return null;
  } catch (error) {
    console.error('Error fetching Google Ads metrics:', error);
    return null;
  }
}

// Check if message is asking about Google Ads / performance
function isAskingAboutAds(message: string): boolean {
  const keywords = [
    'google ads', 'campanha', 'campanhas', 'performance', 'métricas', 'metricas',
    'roas', 'cpa', 'conversões', 'conversoes', 'cliques', 'impressões', 'impressoes',
    'ctr', 'cpc', 'custo', 'gasto', 'resultado', 'resultados', 'anúncios', 'anuncios',
    'ads', 'tráfego pago', 'trafego pago', 'mídia paga', 'midia paga'
  ];
  const lowerMessage = message.toLowerCase();
  return keywords.some(keyword => lowerMessage.includes(keyword));
}

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
      // For clients, get their client_id from profiles
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

    // Fetch Google Ads metrics if asking about ads/performance
    let adsMetricsContext = '';
    if (targetClientId && isAskingAboutAds(query)) {
      console.log('User is asking about ads, fetching Google Ads metrics...');
      
      // Get client's google_ads_id
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('name, google_ads_id')
        .eq('id', targetClientId)
        .single();

      if (client?.google_ads_id) {
        const accessToken = await getGoogleAccessToken();
        if (accessToken) {
          const metrics = await fetchGoogleAdsMetrics(client.google_ads_id, accessToken);
          if (metrics) {
            console.log('Google Ads metrics fetched successfully');
            adsMetricsContext = `

MÉTRICAS ATUAIS DO GOOGLE ADS (últimos 30 dias):
- Investimento total: R$ ${metrics.cost}
- Conversões: ${metrics.conversions}
- Valor das conversões: R$ ${metrics.conversionValue}
- ROAS: ${metrics.roas}x
- CPA médio: R$ ${metrics.cpa}
- Cliques: ${metrics.clicks}
- Impressões: ${metrics.impressions}
- CTR: ${metrics.ctr}%
- CPC médio: R$ ${metrics.avgCpc}

Use esses dados para responder perguntas sobre a performance atual das campanhas.`;
          }
        }
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

    // Build system prompt
    const systemPrompt = `Você é o assistente IA da AgencyOS, uma plataforma de gestão para agências de marketing.
Seu papel é ajudar ${isAdmin ? 'administradores' : 'clientes'} com informações sobre campanhas, performance, documentos e estratégias.
${clientInfo}
${adsMetricsContext}
${documentContext}

Diretrizes:
- Seja conciso e direto nas respostas
- Use dados e informações dos documentos e métricas quando disponíveis
- Quando falar de métricas do Google Ads, use os dados reais fornecidos acima
- Se não tiver informação suficiente, diga claramente
- Mantenha um tom profissional mas amigável
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
