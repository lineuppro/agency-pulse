
# Plano: Integração com Meta (Facebook/Instagram)

## Visão Geral

Este plano implementa duas funcionalidades principais usando a **Meta Graph API**:
1. **Agendamento e Publicação de Posts** no Instagram/Facebook
2. **Dashboard de Meta Ads** (campanhas de tráfego pago)

---

## Pré-requisitos Importantes

Antes de começar a implementação, você precisará:

### 1. Criar um App no Meta for Developers
- Acesse: https://developers.facebook.com/apps
- Crie um novo app do tipo "Business"
- Anote o **App ID** e **App Secret**

### 2. Solicitar Permissões via App Review

A Meta exige aprovação manual para permissões avançadas. Você precisará solicitar:

| Permissão | Para que serve |
|-----------|----------------|
| `instagram_basic` | Ler informações da conta Instagram |
| `instagram_content_publish` | Publicar posts no Instagram |
| `pages_manage_posts` | Publicar no Facebook |
| `pages_read_engagement` | Ler métricas do Facebook |
| `ads_read` | Ler campanhas e métricas de Ads |
| `ads_management` | Gerenciar campanhas (opcional) |

**Tempo estimado**: O processo de App Review pode levar de **1 a 4 semanas**.

### 3. Conectar Conta Business

Cada cliente precisará:
- Uma **Página do Facebook** conectada ao Instagram Business
- Uma **Conta de Anúncios** (para Meta Ads)
- Autorizar seu app a acessar essas contas

---

## Parte 1: Agendamento de Posts (como MLabs)

### Como Funciona a API

```text
Fluxo de Publicação:
                                                    
1. Upload da mídia (imagem/vídeo)
   POST /ig-user-id/media
   → Retorna: creation_id
                                                    
2. Publicar o container
   POST /ig-user-id/media_publish
   → Retorna: media_id (post publicado!)
                                                    
3. Para agendamento futuro:
   - Salvar no banco com data/hora
   - Cron job executa na hora marcada
```

### Limitações da API

- **25 posts por dia** por conta Instagram (via API)
- Não existe agendamento nativo na API - você salva e publica via cron
- Reels e Stories têm endpoints específicos
- Carrosséis suportam até 10 imagens

### Novas Tabelas

```text
scheduled_posts
├── id (uuid)
├── client_id (uuid)
├── editorial_content_id (uuid, opcional)
├── platform: 'instagram' | 'facebook' | 'both'
├── post_type: 'image' | 'video' | 'carousel' | 'reel' | 'story'
├── media_urls (jsonb) - URLs das imagens/vídeos
├── caption (text)
├── hashtags (text[])
├── scheduled_at (timestamptz)
├── published_at (timestamptz)
├── status: 'scheduled' | 'publishing' | 'published' | 'failed'
├── meta_post_id (text) - ID do post na Meta
├── error_message (text)
└── created_at, updated_at

meta_connections
├── id (uuid)
├── client_id (uuid)
├── facebook_page_id (text)
├── instagram_account_id (text)
├── access_token (text, criptografado)
├── token_expires_at (timestamptz)
└── created_at, updated_at
```

### Edge Functions Necessárias

1. **meta-auth** - Fluxo OAuth para conectar contas
2. **meta-publish** - Publicar posts
3. **meta-scheduler** - Cron que verifica posts agendados

### Interface de Agendamento

```text
+------------------------------------------------------------------+
|  Agendar Publicação                                    [X]       |
+------------------------------------------------------------------+
|                                                                   |
|  Plataforma:  [x] Instagram  [x] Facebook                        |
|                                                                   |
|  Tipo:  ( ) Imagem  ( ) Vídeo  ( ) Carrossel  ( ) Reels          |
|                                                                   |
|  +------------------------+  +-----------------------------+      |
|  | [Arrastar imagem aqui] |  | Preview Instagram           |      |
|  |                        |  | +-------------------------+  |      |
|  | ou selecionar arquivo  |  | |      [ Imagem ]        |  |      |
|  +------------------------+  | |                        |  |      |
|                              | | @suaempresa             |  |      |
|  Legenda:                    | | Legenda do post...      |  |      |
|  +------------------------+  | +-------------------------+  |      |
|  | Texto da legenda...    |  +-----------------------------+      |
|  |                        |                                       |
|  +------------------------+                                       |
|                                                                   |
|  Hashtags: #marketing #2026                                       |
|                                                                   |
|  Data e Hora: [17/02/2026] [14:30]                               |
|                                                                   |
|  +-------------------+  +-------------------+                     |
|  |     Cancelar      |  |  Agendar Post     |                     |
|  +-------------------+  +-------------------+                     |
+------------------------------------------------------------------+
```

---

## Parte 2: Dashboard Meta Ads

### Estrutura da API

Similar ao Google Ads que vocês já têm implementado:

```text
GET /act_{ad-account-id}/insights
   ?fields=spend,impressions,clicks,cpc,cpm,reach,frequency,
           actions,cost_per_action_type
   &date_preset=last_30d
   &level=campaign
```

### Métricas Disponíveis

| Métrica | Descrição |
|---------|-----------|
| spend | Valor gasto |
| impressions | Impressões |
| reach | Alcance único |
| clicks | Cliques |
| cpc | Custo por clique |
| cpm | Custo por mil impressões |
| ctr | Taxa de cliques |
| frequency | Frequência média |
| conversions | Conversões (se pixel configurado) |
| roas | Retorno sobre investimento |

### Nova Tabela

```text
client_meta_ads
├── id (uuid)
├── client_id (uuid)
├── ad_account_id (text)
├── access_token (text, criptografado)
├── token_expires_at (timestamptz)
└── created_at, updated_at
```

### Edge Function

**meta-ads-metrics** - Similar à google-ads-metrics existente

### Interface no Dashboard

Adicionar uma aba "Meta Ads" na página de Performance, com:
- Cards de métricas principais (Gasto, ROAS, Alcance, etc.)
- Tabela de campanhas com performance
- Gráficos de evolução
- Filtros por período e campanha

---

## Arquivos a Criar

### Banco de Dados (Migrations)

1. Tabela `scheduled_posts`
2. Tabela `meta_connections`
3. Tabela `client_meta_ads`
4. Políticas RLS apropriadas

### Edge Functions

1. `supabase/functions/meta-auth/index.ts` - OAuth flow
2. `supabase/functions/meta-publish/index.ts` - Publicação
3. `supabase/functions/meta-scheduler/index.ts` - Cron job
4. `supabase/functions/meta-ads-metrics/index.ts` - Métricas de Ads

### Hooks

1. `src/hooks/useMetaConnection.ts` - Gerenciar conexão OAuth
2. `src/hooks/useScheduledPosts.ts` - CRUD de posts agendados
3. `src/hooks/useMetaAdsMetrics.ts` - Buscar métricas

### Componentes

1. `src/components/meta/MetaConnectButton.tsx` - Botão OAuth
2. `src/components/meta/SchedulePostModal.tsx` - Modal de agendamento
3. `src/components/meta/PostPreview.tsx` - Preview do post
4. `src/components/meta/MetaAdsCard.tsx` - Cards de métricas

### Páginas

1. Atualizar `src/pages/admin/Performance.tsx` - Adicionar aba Meta Ads
2. Nova página ou modal de configuração de conexões Meta

---

## Secrets Necessários

Você precisará configurar:

| Secret | Descrição |
|--------|-----------|
| META_APP_ID | ID do app Meta |
| META_APP_SECRET | Secret do app Meta |

Os tokens de acesso dos clientes serão armazenados no banco de dados (tabela `meta_connections`).

---

## Ordem de Implementação Sugerida

### Fase 1: Configuração (1-2 dias)
1. Criar app no Meta for Developers
2. Configurar secrets
3. Criar migrations do banco

### Fase 2: Autenticação OAuth (2-3 dias)
1. Edge function meta-auth
2. Fluxo de conexão na interface
3. Armazenamento seguro de tokens

### Fase 3: Meta Ads Dashboard (3-4 dias)
1. Edge function meta-ads-metrics
2. Hook useMetaAdsMetrics
3. Interface no dashboard de Performance

### Fase 4: Agendamento de Posts (5-7 dias)
1. Edge function meta-publish
2. Interface de agendamento
3. Sistema de cron para publicação automática
4. Notificações de sucesso/falha

---

## Próximos Passos Imediatos

Antes de começar a implementação, você precisa:

1. **Criar o app no Meta for Developers** e obter App ID + Secret
2. **Iniciar o processo de App Review** para as permissões necessárias
3. **Ter uma conta Instagram Business** para testes

Quer que eu comece pela implementação do **Meta Ads Dashboard** (mais simples, similar ao Google Ads) ou pelo **Sistema de Agendamento de Posts**?
