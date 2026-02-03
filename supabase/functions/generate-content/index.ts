import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateContentRequest {
  client_id: string;
  content_type: 'blog_article' | 'social_post' | 'carousel' | 'stories' | 'reels';
  topic: string;
  main_keyword?: string;
  target_word_count?: number;
  additional_instructions?: string;
}

const YOAST_SEO_RULES = `
REGRAS OBRIGATÓRIAS PARA SEO (Yoast):
1. Título SEO: Máximo 60 caracteres, incluir palavra-chave principal
2. Meta descrição: 100-120 caracteres, incluir palavra-chave + CTA
3. Densidade de palavra-chave: 0.5–2.5% do texto, usada naturalmente
4. A palavra-chave DEVE aparecer: no título, introdução, 2-3 subtítulos e corpo
5. Use variações e sinônimos da palavra-chave para enriquecer

REGRAS DE LEGIBILIDADE (Yoast):
1. Frases curtas: <20 palavras em pelo menos 60% do texto
2. Parágrafos curtos: <150 palavras cada
3. Palavras de transição: >30% das frases (além disso, portanto, por exemplo, assim, no entanto, etc.)
4. Voz ativa: >80% do texto
5. Subtítulos (H2, H3) a cada 300 palavras máximo
6. Use listas, bullet points ou tabelas para quebra visual
7. Flesch Reading Ease: alvo 60-70+ (linguagem simples e variada)

ESTRUTURA DO ARTIGO:
1. Introdução envolvente (hook + palavra-chave nos primeiros 100 palavras)
2. Corpo com H2s e H3s bem distribuídos
3. Listas e destaques visuais
4. Links internos sugeridos: 2-3 (indicar onde inserir)
5. Links externos sugeridos: 1-2 para fontes confiáveis quando citar dados
6. Conclusão com CTA claro
`;

const SOCIAL_POST_RULES = `
ESTRUTURA DO POST:
1. Título chamativo e curto
2. Subtítulo que complementa (opcional)
3. Legenda envolvente com storytelling
4. Hashtags relevantes (5-10 hashtags populares e de nicho)
5. Sugestão detalhada de imagem para o designer criar

REGRAS:
- Use emojis estrategicamente
- Inclua CTA (call-to-action) claro
- Adapte o tom de voz da marca
- Quebre o texto em parágrafos curtos para facilitar leitura no mobile
`;

const CAROUSEL_RULES = `
ESTRUTURA DO CARROSSEL:
1. Capa: Título impactante que gere curiosidade
2. Slides (6-10): Cada slide com UMA ideia principal
3. Último slide: CTA + "Salve para não esquecer" ou similar

REGRAS POR SLIDE:
- Máximo 50-70 palavras por slide
- Título em destaque
- Texto de apoio conciso
- Sugestão de visual para cada slide
- Use números, listas ou passos quando possível
`;

const STORIES_RULES = `
ESTRUTURA DE STORIES/REELS:
1. Hook inicial (primeiros 3 segundos são cruciais)
2. Desenvolvimento rápido do tema
3. CTA final (responda, arraste, clique no link, etc.)

REGRAS:
- Texto curto e impactante (máximo 3 linhas por story)
- Sugestões de stickers, enquetes ou perguntas interativas
- Tom conversacional e direto
- Duração sugerida: 15-30 segundos por story
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: GenerateContentRequest = await req.json();
    const { client_id, content_type, topic, main_keyword, target_word_count, additional_instructions } = body;

    console.log("Generating content:", { content_type, topic, main_keyword });

    // Fetch client AI settings
    const { data: clientSettings } = await supabase
      .from('client_ai_settings')
      .select('*')
      .eq('client_id', client_id)
      .maybeSingle();

    // Fetch client info
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', client_id)
      .single();

    // Build the prompt based on content type
    let systemPrompt = "";
    let userPrompt = "";

    const clientContext = clientSettings ? `
CONTEXTO DA MARCA:
- Nome da empresa: ${client?.name || 'Cliente'}
- Tom de voz: ${clientSettings.brand_voice || 'Profissional e acessível'}
- Público-alvo: ${clientSettings.target_audience || 'Público geral'}
- Palavras-chave da marca: ${clientSettings.brand_keywords?.join(', ') || 'N/A'}
- Diretrizes: ${clientSettings.content_guidelines || 'Seguir boas práticas de marketing'}
${clientSettings.custom_prompt ? `- Instruções adicionais: ${clientSettings.custom_prompt}` : ''}
` : `
CONTEXTO DA MARCA:
- Nome da empresa: ${client?.name || 'Cliente'}
- Tom de voz: Profissional e acessível
`;

    const wordCount = target_word_count || clientSettings?.default_word_count || 1500;

    if (content_type === 'blog_article') {
      systemPrompt = `Você é um especialista em criação de conteúdo SEO otimizado para blogs. 
Seu objetivo é criar artigos que passem 100% no checklist do Yoast SEO (verde em SEO e Legibilidade).

${YOAST_SEO_RULES}

${clientContext}

FORMATO DE RESPOSTA (JSON):
{
  "title": "Título do artigo",
  "seo_title": "Título SEO (máx 60 chars)",
  "meta_description": "Meta descrição (100-120 chars com CTA)",
  "content": "Conteúdo completo em Markdown com H2, H3, listas, etc.",
  "keyword_density": 1.5,
  "readability_score": 65,
  "word_count": ${wordCount},
  "image_suggestions": ["Sugestão 1 para imagem destacada", "Sugestão 2 para imagem no corpo"]
}`;

      userPrompt = `Crie um artigo de blog completo sobre: "${topic}"
${main_keyword ? `Palavra-chave principal: "${main_keyword}"` : ''}
Quantidade de palavras: aproximadamente ${wordCount}
${additional_instructions ? `Instruções adicionais: ${additional_instructions}` : ''}

Retorne APENAS o JSON, sem markdown code blocks.`;

    } else if (content_type === 'social_post') {
      systemPrompt = `Você é um especialista em criação de conteúdo para redes sociais (Instagram/Facebook).

${SOCIAL_POST_RULES}

${clientContext}

FORMATO DE RESPOSTA (JSON):
{
  "title": "Título do post (chamativo, curto)",
  "subtitle": "Subtítulo complementar para o designer usar no visual",
  "content": "Legenda completa com emojis e quebras de linha",
  "hashtags": ["hashtag1", "hashtag2", "..."],
  "image_suggestions": ["Descrição detalhada para o designer criar a imagem"]
}`;

      userPrompt = `Crie um post para redes sociais sobre: "${topic}"
${additional_instructions ? `Instruções adicionais: ${additional_instructions}` : ''}

Retorne APENAS o JSON, sem markdown code blocks.`;

    } else if (content_type === 'carousel') {
      systemPrompt = `Você é um especialista em criação de carrosséis para Instagram.

${CAROUSEL_RULES}

${clientContext}

FORMATO DE RESPOSTA (JSON):
{
  "title": "Título do carrossel (capa)",
  "subtitle": "Subtítulo para complementar a capa",
  "content": "Descrição/legenda do post",
  "hashtags": ["hashtag1", "hashtag2", "..."],
  "slides": [
    {"title": "Título slide 1 (capa)", "content": "Texto do slide", "image_suggestion": "Visual sugerido"},
    {"title": "Título slide 2", "content": "Texto do slide", "image_suggestion": "Visual sugerido"},
    ...
  ],
  "image_suggestions": ["Estilo visual geral do carrossel"]
}`;

      userPrompt = `Crie um carrossel para Instagram sobre: "${topic}"
${additional_instructions ? `Instruções adicionais: ${additional_instructions}` : ''}

Crie entre 6 a 10 slides. Retorne APENAS o JSON, sem markdown code blocks.`;

    } else if (content_type === 'stories' || content_type === 'reels') {
      systemPrompt = `Você é um especialista em criação de conteúdo para Stories e Reels.

${STORIES_RULES}

${clientContext}

FORMATO DE RESPOSTA (JSON):
{
  "title": "Conceito/tema",
  "content": "Roteiro completo com indicações de tempo e ações",
  "hashtags": ["hashtag1", "hashtag2", "..."],
  "slides": [
    {"title": "Story/Cena 1", "content": "Texto + ação", "image_suggestion": "Visual/elemento sugerido"},
    {"title": "Story/Cena 2", "content": "Texto + ação", "image_suggestion": "Visual/elemento sugerido"},
    ...
  ],
  "image_suggestions": ["Estilo visual geral", "Sugestões de stickers/elementos"]
}`;

      userPrompt = `Crie um roteiro de ${content_type === 'stories' ? 'Stories' : 'Reels'} sobre: "${topic}"
${additional_instructions ? `Instruções adicionais: ${additional_instructions}` : ''}

Retorne APENAS o JSON, sem markdown code blocks.`;
    }

    // Call Lovable AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const generatedText = aiResponse.choices?.[0]?.message?.content || "";

    console.log("AI Response received, parsing JSON...");

    // Parse the JSON response
    let parsedContent;
    try {
      // Remove potential markdown code blocks
      const cleanedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedContent = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError, generatedText);
      throw new Error("Erro ao processar resposta da IA. Tente novamente.");
    }

    console.log("Content generated successfully:", { title: parsedContent.title });

    return new Response(JSON.stringify(parsedContent), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in generate-content:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
