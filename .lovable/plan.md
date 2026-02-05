

# Plano: Sistema de Agendamento de Posts para Redes Sociais

## Esclarecimento Importante: Como Funciona a Conexão

Você mencionou que no mLabs é só colocar usuário e senha do Instagram. **Infelizmente, isso não é mais possível com a API oficial do Meta.**

### Por que não posso usar usuário/senha?

A Meta (Facebook/Instagram) **não permite** que apps de terceiros coletem login/senha dos usuários. Isso é proibido por:
- Termos de Uso da Meta
- Segurança (evitar roubo de credenciais)
- Conformidade com GDPR/LGPD

O mLabs e outras ferramentas usam o **fluxo OAuth** por trás dos panos - quando você clica "conectar Instagram", ele redireciona para o Facebook onde você faz login e autoriza o app.

### O que precisamos usar

**Facebook Login + Graph API** = Método oficial e obrigatório
- Usuário clica "Conectar Instagram/Facebook"
- Redireciona para página do Facebook para autenticação
- Usuário autoriza as permissões necessárias
- Sistema recebe um **Access Token** para publicar em nome do usuário

---

## Requisitos do Meta App

Já temos os secrets configurados:
- `META_APP_ID` ✓
- `META_APP_SECRET` ✓

### Permissões Necessárias no Meta for Developers

Para publicar posts, precisamos solicitar (no console do Meta for Developers):
- `pages_manage_posts` - Publicar no Facebook
- `pages_read_engagement` - Ler informações da página
- `instagram_basic` - Informações básicas do Instagram
- `instagram_content_publish` - Publicar no Instagram

**Importante:** Para produção, o app precisa passar por App Review da Meta.

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        ADMIN PANEL                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   /admin/social-media (NOVA PÁGINA)                                     │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  Gerenciar Conexões de Mídias Sociais                           │   │
│   │                                                                  │   │
│   │  [Selector: Cliente] ▼                                          │   │
│   │                                                                  │   │
│   │  ┌──────────────────┐  ┌──────────────────┐                     │   │
│   │  │  Instagram       │  │  Facebook        │                     │   │
│   │  │  @perfil_cliente │  │  Página FB       │                     │   │
│   │  │  [Conectado] ✓   │  │  [Conectado] ✓   │                     │   │
│   │  │  [Desconectar]   │  │  [Desconectar]   │                     │   │
│   │  └──────────────────┘  └──────────────────┘                     │   │
│   │                                                                  │   │
│   │  OU (se não conectado):                                         │   │
│   │  [Conectar Instagram/Facebook]                                  │   │
│   │  → Redireciona para OAuth do Meta                               │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     FLUXO DE AGENDAMENTO                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Admin cria conteúdo no Calendário Editorial                         │
│  2. Ao aprovar, opção "Agendar para Publicação"                         │
│  3. Abre modal para:                                                    │
│     - Selecionar plataformas (Instagram, Facebook)                      │
│     - Upload de mídia (imagem/vídeo)                                    │
│     - Definir legenda + hashtags                                        │
│     - Escolher data/hora de publicação                                  │
│  4. Post é salvo em `scheduled_posts`                                   │
│  5. Cron job publica automaticamente na hora agendada                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tabelas do Banco de Dados

### Tabela: `social_connections` (conexões por cliente)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador único |
| client_id | uuid | FK para clients |
| platform | enum | 'instagram', 'facebook', 'linkedin' |
| access_token | text | Token OAuth (criptografado) |
| refresh_token | text | Para renovar o token |
| token_expires_at | timestamptz | Quando expira |
| platform_user_id | text | ID do usuário na plataforma |
| platform_username | text | @username ou nome da página |
| page_id | text | ID da página (Facebook) |
| created_at | timestamptz | - |
| updated_at | timestamptz | - |

### Tabela: `scheduled_posts` (posts agendados)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | Identificador único |
| client_id | uuid | FK para clients |
| editorial_content_id | uuid | FK para editorial_contents (opcional) |
| platform | enum | 'instagram', 'facebook' |
| post_type | enum | 'image', 'carousel', 'video', 'story', 'reel' |
| media_urls | jsonb | Array de URLs das mídias |
| caption | text | Legenda do post |
| hashtags | text[] | Hashtags separadas |
| scheduled_at | timestamptz | Data/hora para publicar |
| published_at | timestamptz | Quando foi publicado |
| status | enum | 'scheduled', 'publishing', 'published', 'failed' |
| platform_post_id | text | ID do post após publicação |
| error_message | text | Mensagem de erro (se falhou) |
| created_by | uuid | Quem agendou |
| created_at | timestamptz | - |

---

## Edge Functions

### 1. `social-auth` - Fluxo OAuth
- **Ação `init`**: Gera URL de autorização do Meta
- **Ação `callback`**: Recebe code, troca por access_token, salva conexão
- **Ação `select-page`**: Quando usuário tem múltiplas páginas, permite escolher

### 2. `social-publish` - Publicar Post
- Recebe post_id ou dados do post
- Busca token da conexão do cliente
- Chama Graph API para publicar:
  - Instagram: /media → /media_publish
  - Facebook: /photos ou /feed
- Atualiza status do post

### 3. `social-scheduler` (Cron Job)
- Roda a cada 5 minutos
- Busca posts com `scheduled_at <= now()` e `status = 'scheduled'`
- Publica cada post via `social-publish`
- Atualiza status

---

## Componentes do Frontend

### Novos Componentes

1. **`/admin/social-media`** - Página de gerenciamento
   - Lista conexões por cliente
   - Botão para conectar novas plataformas
   - Status de cada conexão

2. **`SocialConnectButton`** - Botão de conexão
   - Inicia fluxo OAuth
   - Mostra modal de seleção se múltiplas páginas

3. **`SchedulePostModal`** - Modal de agendamento
   - Upload de mídia
   - Editor de legenda
   - Seletor de plataformas
   - Picker de data/hora

4. **`ScheduledPostsList`** - Lista de posts agendados
   - Grid/tabela de posts
   - Ações: editar, cancelar, publicar agora

---

## Fluxo de Conexão (Detalhado)

```text
USUÁRIO                     FRONTEND                      EDGE FUNCTION                  META API
   │                           │                               │                            │
   │  Clica "Conectar"         │                               │                            │
   │ ────────────────────────> │                               │                            │
   │                           │  social-auth (init)           │                            │
   │                           │ ────────────────────────────> │                            │
   │                           │                               │  Gera URL OAuth            │
   │                           │ <──────────────────────────── │                            │
   │  Redireciona para Meta    │                               │                            │
   │ <──────────────────────── │                               │                            │
   │                           │                               │                            │
   │  Faz login no Facebook    │                               │                            │
   │ ──────────────────────────────────────────────────────────────────────────────────────>│
   │                           │                               │                            │
   │  Autoriza permissões      │                               │                            │
   │ ──────────────────────────────────────────────────────────────────────────────────────>│
   │                           │                               │                            │
   │  Redirect com code        │                               │                            │
   │ <──────────────────────────────────────────────────────────────────────────────────────│
   │                           │                               │                            │
   │  Chega em /admin/social-media?code=XXX                    │                            │
   │ ────────────────────────> │                               │                            │
   │                           │  social-auth (callback)       │                            │
   │                           │ ────────────────────────────> │                            │
   │                           │                               │  Troca code por token      │
   │                           │                               │ ──────────────────────────>│
   │                           │                               │  Access Token              │
   │                           │                               │ <──────────────────────────│
   │                           │                               │  Busca páginas do usuário  │
   │                           │                               │ ──────────────────────────>│
   │                           │                               │  Lista de páginas          │
   │                           │                               │ <──────────────────────────│
   │                           │  Se múltiplas páginas:        │                            │
   │                           │  retorna lista para seleção   │                            │
   │                           │ <──────────────────────────── │                            │
   │  Seleciona página         │                               │                            │
   │ ────────────────────────> │                               │                            │
   │                           │  social-auth (select-page)    │                            │
   │                           │ ────────────────────────────> │                            │
   │                           │                               │  Salva conexão no banco    │
   │                           │ <──────────────────────────── │                            │
   │  Conexão salva! ✓         │                               │                            │
   │ <──────────────────────── │                               │                            │
```

---

## Ordem de Implementação

### Fase 1: Infraestrutura (Base)
1. Criar tabelas `social_connections` e `scheduled_posts` com RLS
2. Criar edge function `social-auth` com fluxo OAuth
3. Criar página `/admin/social-media` básica

### Fase 2: Conexão de Contas
4. Implementar `SocialConnectButton` com OAuth
5. Adicionar modal de seleção de página
6. Testar conexão end-to-end

### Fase 3: Agendamento de Posts
7. Criar `SchedulePostModal` com upload de mídia
8. Implementar edge function `social-publish`
9. Integrar com Calendário Editorial

### Fase 4: Publicação Automática
10. Criar cron job `social-scheduler`
11. Adicionar lista de posts agendados
12. Implementar ações (editar, cancelar, republicar)

---

## Configuração Necessária no Meta for Developers

Antes de começar, você precisa configurar no console do Meta:

1. **App Settings > Basic**
   - Adicionar domínio: `macservices.lovable.app`

2. **Facebook Login > Settings**
   - Valid OAuth Redirect URIs:
     ```
     https://vsqlwyabgfccszqycmto.supabase.co/functions/v1/social-auth
     ```

3. **Permissions**
   - Solicitar: `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`

4. **App Mode**
   - Para testes: adicionar usuários como Testers
   - Para produção: submeter para App Review

---

## Resumo

| Item | Status |
|------|--------|
| Meta App configurado | ✓ Secrets existem |
| OAuth será via redirect | Método oficial |
| Múltiplos clientes | ✓ Cada cliente terá sua conexão |
| Múltiplas páginas | ✓ Modal de seleção |
| Instagram + Facebook | ✓ Ambos suportados |
| LinkedIn (futuro) | Arquitetura preparada |

