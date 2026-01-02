import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  category: string;
  due_date: string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { clientId, notes } = body;

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: "clientId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-meeting-summary] Generating summary for client: ${clientId}`);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch client info
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("name, google_ads_id")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      console.error("[generate-meeting-summary] Client not found:", clientError);
      return new Response(
        JSON.stringify({ error: "Client not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch tasks
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (tasksError) {
      console.error("[generate-meeting-summary] Error fetching tasks:", tasksError);
    }

    const taskList = tasks || [];
    const pendingTasks = taskList.filter((t: Task) => t.status === "pending");
    const inProgressTasks = taskList.filter((t: Task) => t.status === "in_progress");
    const completedTasks = taskList.filter((t: Task) => t.status === "completed");

    // Build context for AI
    const today = new Date().toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const tasksContext = `
## Tarefas do Cliente: ${client.name}

### Em Progresso (${inProgressTasks.length}):
${inProgressTasks.length > 0 
  ? inProgressTasks.map((t: Task) => `- ${t.title}${t.description ? `: ${t.description}` : ""} [${t.category}]`).join("\n")
  : "Nenhuma tarefa em progresso"}

### Pendentes (${pendingTasks.length}):
${pendingTasks.length > 0
  ? pendingTasks.map((t: Task) => `- ${t.title}${t.due_date ? ` (prazo: ${new Date(t.due_date).toLocaleDateString("pt-BR")})` : ""} [${t.category}]`).join("\n")
  : "Nenhuma tarefa pendente"}

### Concluídas Recentemente (${completedTasks.length}):
${completedTasks.length > 0
  ? completedTasks.slice(0, 10).map((t: Task) => `- ✅ ${t.title} [${t.category}]`).join("\n")
  : "Nenhuma tarefa concluída"}
`;

    const systemPrompt = `Você é um especialista em gestão de agências de marketing digital. Gere um resumo executivo para uma reunião com o cliente.

O resumo deve ser estruturado em formato Markdown e incluir:
1. **Resumo Executivo** - Uma visão geral rápida do status atual
2. **O que foi Entregue** - Tarefas concluídas recentemente
3. **Em Andamento** - Status das tarefas atuais
4. **Próximos Passos** - O que será trabalhado a seguir, priorizando por urgência
5. **Pontos de Atenção** - Alertas ou recomendações importantes

Seja objetivo, profissional e foque em entregar valor ao cliente. Use emojis moderadamente para melhorar a legibilidade.`;

    const userPrompt = `Data de hoje: ${today}

${tasksContext}
${notes ? `\n## Anotações da Reunião:\n${notes}\n` : ""}
Gere o resumo da pauta de reunião para o cliente ${client.name}.${notes ? " Inclua e formate as anotações fornecidas no resumo." : ""}`;

    // Call Lovable AI
    if (!LOVABLE_API_KEY) {
      console.error("[generate-meeting-summary] LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[generate-meeting-summary] Calling Lovable AI...");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[generate-meeting-summary] AI error:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to generate summary" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content || "Não foi possível gerar o resumo.";

    console.log("[generate-meeting-summary] Summary generated successfully");

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[generate-meeting-summary] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
