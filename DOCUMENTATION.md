# AgencyOS - Documentação Técnica Completa

> Sistema SaaS para gerenciamento de agências de marketing digital com arquitetura dual-role (Admin/Client), integrações avançadas com Google Ads e Google Drive, e chat com IA usando RAG.

---

## 📑 Índice

1. [Visão Geral](#visão-geral)
2. [Stack Tecnológica](#stack-tecnológica)
3. [Estrutura de Diretórios](#estrutura-de-diretórios)
4. [Arquitetura de Autenticação](#arquitetura-de-autenticação)
5. [Schema do Banco de Dados](#schema-do-banco-de-dados)
6. [Edge Functions (Endpoints)](#edge-functions-endpoints)
7. [Hooks Customizados](#hooks-customizados)
8. [Componentes Principais](#componentes-principais)
9. [Fluxos de Dados](#fluxos-de-dados)
10. [Políticas de Segurança (RLS)](#políticas-de-segurança-rls)
11. [Integrações Externas](#integrações-externas)
12. [Variáveis de Ambiente](#variáveis-de-ambiente)
13. [Guia de Desenvolvimento](#guia-de-desenvolvimento)

---

## Visão Geral

O **AgencyOS** é uma plataforma completa para agências de marketing digital gerenciarem seus clientes, campanhas, tarefas e comunicação. O sistema oferece:

### Funcionalidades Principais

| Módulo | Admin | Client |
|--------|-------|--------|
| Dashboard com métricas | ✅ | ❌ |
| Gerenciamento de Clientes | ✅ | ❌ |
| Gerenciamento de Usuários | ✅ | ❌ |
| Tarefas (CRUD) | ✅ | 👁️ (view only) |
| Pautas de Reunião | ✅ | 👁️ (view only) |
| Performance Google Ads | ✅ | ✅ |
| Arquivos Google Drive | ✅ | ✅ |
| Chat com IA (RAG) | ✅ | ✅ |

---

## Stack Tecnológica

### Frontend
| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| React | 18.3.1 | UI Library |
| TypeScript | - | Type Safety |
| Vite | - | Build Tool |
| Tailwind CSS | - | Styling |
| TanStack Query | 5.x | Data Fetching & Caching |
| React Router DOM | 6.x | Routing |
| Shadcn/UI | - | Component Library |
| Recharts | 2.x | Charts & Graphs |
| Lucide React | - | Icons |

### Backend (Supabase/Lovable Cloud)
| Serviço | Uso |
|---------|-----|
| PostgreSQL | Database |
| pgvector | Vector embeddings para RAG |
| Edge Functions (Deno) | API endpoints |
| Row Level Security (RLS) | Segurança de dados |
| Auth | Autenticação JWT |

---

## Estrutura de Diretórios

```
agencyos/
├── public/                    # Assets estáticos
│   ├── robots.txt
│   └── favicon.ico
│
├── src/
│   ├── components/           # Componentes React
│   │   ├── layout/          # Layouts (AdminLayout, ClientLayout, Sidebars)
│   │   ├── ui/              # Componentes Shadcn/UI
│   │   ├── NavLink.tsx      # Link de navegação customizado
│   │   └── ProtectedRoute.tsx # Wrapper de rotas protegidas
│   │
│   ├── contexts/            # Contextos React
│   │   ├── AuthContext.tsx  # Estado global de autenticação
│   │   └── ThemeContext.tsx # Estado de tema (light/dark)
│   │
│   ├── hooks/               # Hooks customizados
│   │   ├── useChatRAG.ts           # Chat com IA (RAG)
│   │   ├── useChatSessions.ts      # Sessões de chat
│   │   ├── useGoogleAdsMetrics.ts  # Métricas Google Ads
│   │   ├── useGoogleAdsDetailed.ts # Dados detalhados Google Ads
│   │   ├── useGoogleDriveFiles.ts  # Arquivos Google Drive
│   │   ├── useMeetingAgendas.ts    # Pautas de reunião
│   │   ├── use-mobile.tsx          # Detecção mobile
│   │   └── use-toast.ts            # Notificações toast
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts    # Cliente Supabase (auto-gerado)
│   │       └── types.ts     # Tipos TypeScript (auto-gerado)
│   │
│   ├── lib/
│   │   └── utils.ts         # Funções utilitárias (cn, etc.)
│   │
│   ├── pages/               # Páginas da aplicação
│   │   ├── admin/          # Páginas do painel admin
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Clients.tsx
│   │   │   ├── Users.tsx
│   │   │   ├── Tasks.tsx
│   │   │   ├── Performance.tsx
│   │   │   ├── Files.tsx
│   │   │   ├── MeetingAgenda.tsx
│   │   │   ├── Chat.tsx
│   │   │   └── Settings.tsx
│   │   │
│   │   ├── portal/         # Páginas do portal do cliente
│   │   │   ├── MeetingAgenda.tsx
│   │   │   ├── Performance.tsx
│   │   │   ├── Files.tsx
│   │   │   └── Chat.tsx
│   │   │
│   │   ├── Auth.tsx        # Página de login/cadastro
│   │   ├── Index.tsx       # Landing page
│   │   └── NotFound.tsx    # Página 404
│   │
│   ├── App.tsx             # Componente raiz com rotas
│   ├── App.css             # Estilos globais
│   ├── index.css           # Configuração Tailwind
│   └── main.tsx            # Entry point
│
├── supabase/
│   ├── config.toml         # Configuração do projeto Supabase
│   ├── functions/          # Edge Functions
│   │   ├── chat-rag/                  # Chat com IA + RAG
│   │   ├── create-client-user/        # Criar/vincular usuário a cliente
│   │   ├── generate-meeting-summary/  # Gerar resumo de reunião com IA
│   │   ├── google-ads-detailed/       # Dados detalhados Google Ads
│   │   ├── google-ads-metrics/        # Métricas Google Ads
│   │   ├── google-drive-files/        # Listar/obter arquivos Drive
│   │   ├── resend-invite/             # Reenviar convite/reset senha
│   │   └── sync-drive-documents/      # Sincronizar docs para RAG
│   │
│   └── migrations/         # Migrações SQL (auto-gerado)
│
├── .env                    # Variáveis de ambiente (auto-gerado)
├── tailwind.config.ts      # Configuração Tailwind
├── vite.config.ts          # Configuração Vite
└── package.json            # Dependências
```

---

## Arquitetura de Autenticação

### Roles (Papéis)

O sistema utiliza dois papéis distintos armazenados na tabela `user_roles`:

| Role | Descrição | Acesso |
|------|-----------|--------|
| `admin` | Usuário administrativo da agência | Acesso total ao painel `/admin/*` |
| `client` | Usuário do cliente | Acesso ao portal `/portal/*` |

### Fluxo de Autenticação

```
┌─────────────────────────────────────────────────────────────────┐
│                        FLUXO DE LOGIN                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Usuário acessa /auth                                        │
│           │                                                     │
│           ▼                                                     │
│  2. Submete email/senha                                         │
│           │                                                     │
│           ▼                                                     │
│  3. supabase.auth.signInWithPassword()                         │
│           │                                                     │
│           ▼                                                     │
│  4. AuthContext.onAuthStateChange dispara                       │
│           │                                                     │
│           ▼                                                     │
│  5. fetchUserRole() busca role em user_roles                    │
│           │                                                     │
│           ├──► role = 'admin' ──► redirect /admin               │
│           │                                                     │
│           └──► role = 'client' ──► redirect /portal             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### AuthContext

**Localização:** `src/contexts/AuthContext.tsx`

```typescript
interface AuthContextType {
  user: User | null;            // Usuário autenticado
  session: Session | null;      // Sessão Supabase
  role: 'admin' | 'client' | null;
  clientId: string | null;      // ID do cliente vinculado (para clients)
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}
```

### ProtectedRoute

**Localização:** `src/components/ProtectedRoute.tsx`

Wrapper que protege rotas baseado no role do usuário:

```tsx
<ProtectedRoute allowedRoles={['admin']}>
  <AdminLayout />
</ProtectedRoute>
```

---

## Schema do Banco de Dados

### Diagrama ER

```
┌──────────────────┐       ┌──────────────────┐
│   auth.users     │       │    user_roles    │
│  (Supabase)      │       ├──────────────────┤
├──────────────────┤       │ id: uuid PK      │
│ id: uuid PK      │◄──────│ user_id: uuid FK │
│ email            │       │ role: app_role   │
│ ...              │       └──────────────────┘
└────────┬─────────┘
         │
         ▼
┌──────────────────┐       ┌──────────────────┐
│    profiles      │       │     clients      │
├──────────────────┤       ├──────────────────┤
│ id: uuid PK      │       │ id: uuid PK      │
│ user_id: uuid FK │       │ name: text       │
│ email: text      │       │ google_ads_id    │
│ full_name: text  │◄──────│ google_drive_id  │
│ client_id: uuid  │───────│ logo_url         │
│ created_at       │       │ created_at       │
│ updated_at       │       │ updated_at       │
└──────────────────┘       └────────┬─────────┘
                                    │
         ┌──────────────────────────┼───────────────────────────┐
         │                          │                           │
         ▼                          ▼                           ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────┐
│      tasks       │    │ meeting_agendas  │    │  documents_knowledge │
├──────────────────┤    ├──────────────────┤    ├──────────────────────┤
│ id: uuid PK      │    │ id: uuid PK      │    │ id: uuid PK          │
│ client_id: uuid  │    │ client_id: uuid  │    │ client_id: uuid      │
│ title: text      │    │ created_by: uuid │    │ content: text        │
│ description      │    │ title: text      │    │ embedding: vector    │
│ category: enum   │◄───│ notes: text      │    │ metadata: jsonb      │
│ status: enum     │    │ generated_summary│    │ created_at           │
│ assigned_to      │    │ meeting_date     │    └──────────────────────┘
│ due_date         │    │ created_at       │
│ meeting_agenda_id│────│ updated_at       │
│ created_at       │    └──────────────────┘
│ updated_at       │
└──────────────────┘

┌──────────────────┐    ┌──────────────────┐
│  chat_sessions   │    │  chat_messages   │
├──────────────────┤    ├──────────────────┤
│ id: uuid PK      │◄───│ id: uuid PK      │
│ client_id: uuid  │    │ session_id: uuid │
│ user_id: uuid    │    │ content: text    │
│ title: text      │    │ role: text       │
│ created_at       │    │ created_at       │
│ updated_at       │    └──────────────────┘
└──────────────────┘
```

### Enums

```sql
-- Papéis de usuário
CREATE TYPE app_role AS ENUM ('admin', 'client');

-- Categorias de tarefas
CREATE TYPE task_category AS ENUM ('ads', 'dev', 'automation', 'creative');

-- Status de tarefas
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed');
```

### Tabelas Detalhadas

#### `clients`
Armazena informações das empresas clientes.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | uuid | No | PK |
| name | text | No | Nome da empresa |
| google_ads_id | text | Yes | ID da conta Google Ads (ex: 123-456-7890) |
| google_drive_id | text | Yes | ID da pasta no Google Drive |
| logo_url | text | Yes | URL do logo |
| created_at | timestamp | No | Data de criação |
| updated_at | timestamp | No | Última atualização |

#### `profiles`
Informações adicionais dos usuários.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | uuid | No | PK |
| user_id | uuid | No | FK para auth.users |
| email | text | No | Email do usuário |
| full_name | text | Yes | Nome completo |
| client_id | uuid | Yes | FK para clients (apenas para role=client) |
| created_at | timestamp | No | Data de criação |
| updated_at | timestamp | No | Última atualização |

#### `user_roles`
Define os papéis dos usuários no sistema.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | uuid | No | PK |
| user_id | uuid | No | FK para auth.users |
| role | app_role | No | 'admin' ou 'client' |

#### `tasks`
Tarefas associadas aos clientes.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | uuid | No | PK |
| client_id | uuid | No | FK para clients |
| title | text | No | Título da tarefa |
| description | text | Yes | Descrição |
| category | task_category | No | Categoria (ads, dev, etc.) |
| status | task_status | No | Status (pending, in_progress, completed) |
| assigned_to | uuid | Yes | FK para profiles (responsável) |
| due_date | timestamp | Yes | Data de vencimento |
| meeting_agenda_id | uuid | Yes | FK para meeting_agendas |
| created_at | timestamp | No | Data de criação |
| updated_at | timestamp | No | Última atualização |

#### `meeting_agendas`
Pautas de reunião.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | uuid | No | PK |
| client_id | uuid | No | FK para clients |
| created_by | uuid | No | FK para auth.users |
| title | text | Yes | Título da pauta |
| notes | text | Yes | Notas/anotações |
| generated_summary | text | Yes | Resumo gerado por IA |
| meeting_date | timestamp | Yes | Data da reunião |
| created_at | timestamp | Yes | Data de criação |
| updated_at | timestamp | Yes | Última atualização |

#### `documents_knowledge`
Base de conhecimento para RAG (Retrieval-Augmented Generation).

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | uuid | No | PK |
| client_id | uuid | No | FK para clients |
| content | text | No | Conteúdo do documento |
| embedding | vector | Yes | Embedding para busca semântica |
| metadata | jsonb | Yes | Metadados (filename, file_id, etc.) |
| created_at | timestamp | No | Data de criação |

#### `chat_sessions`
Sessões de conversa com a IA.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | uuid | No | PK |
| client_id | uuid | No | FK para clients |
| user_id | uuid | No | FK para auth.users |
| title | text | Yes | Título da sessão |
| created_at | timestamp | No | Data de criação |
| updated_at | timestamp | No | Última atualização |

#### `chat_messages`
Mensagens das conversas.

| Coluna | Tipo | Nullable | Descrição |
|--------|------|----------|-----------|
| id | uuid | No | PK |
| session_id | uuid | No | FK para chat_sessions |
| content | text | No | Conteúdo da mensagem |
| role | text | No | 'user' ou 'assistant' |
| created_at | timestamp | No | Data de criação |

---

## Edge Functions (Endpoints)

Todas as Edge Functions estão em `supabase/functions/` e são deployadas automaticamente.

### 1. `chat-rag`

**Propósito:** Chat com IA usando RAG (Retrieval-Augmented Generation) para consultas sobre Google Ads e documentos.

**Autenticação:** Pública (`verify_jwt = false`), mas valida token internamente.

**Método:** `POST`

**Request Body:**
```json
{
  "clientId": "uuid",
  "message": "Qual foi o ROAS de janeiro?",
  "sessionId": "uuid" // opcional
}
```

**Response:**
```json
{
  "response": "O ROAS de janeiro foi 4.5x...",
  "sessionId": "uuid"
}
```

**Funcionalidades:**
- Parser de intenção avançado para queries em português
- Suporte a períodos (mês, trimestre, ano, ranges)
- Filtros por campanha, tipo de campanha, grupo de anúncios
- Comparações entre períodos
- Integração com Google Ads API
- RAG com documentos do cliente

---

### 2. `google-ads-metrics`

**Propósito:** Obter métricas agregadas do Google Ads.

**Autenticação:** Pública (`verify_jwt = false`), valida token internamente.

**Método:** `POST`

**Request Body:**
```json
{
  "clientId": "uuid",
  "dateRange": "LAST_30_DAYS" // TODAY, YESTERDAY, LAST_7_DAYS, LAST_30_DAYS, THIS_MONTH
}
```

**Response:**
```json
{
  "success": true,
  "clientName": "Cliente X",
  "dateRange": "LAST_30_DAYS",
  "metrics": {
    "spend": 5000.00,
    "conversions": 150,
    "conversionsValue": 25000.00,
    "clicks": 3500,
    "impressions": 50000,
    "roas": 5.0,
    "cpa": 33.33,
    "ctr": 7.0,
    "avgCpc": 1.43
  }
}
```

---

### 3. `google-ads-detailed`

**Propósito:** Obter dados detalhados do Google Ads (campanhas, keywords, search terms).

**Autenticação:** Pública (`verify_jwt = false`), valida token internamente.

**Método:** `POST`

**Request Body:**
```json
{
  "clientId": "uuid",
  "type": "campaigns", // campaigns, keywords, searchTerms
  "dateRange": "LAST_30_DAYS"
}
```

---

### 4. `google-drive-files`

**Propósito:** Listar e obter conteúdo de arquivos do Google Drive.

**Autenticação:** Pública (`verify_jwt = false`), valida token internamente.

**Método:** `POST`

**Request Body (listar):**
```json
{
  "clientId": "uuid"
}
```

**Request Body (obter conteúdo):**
```json
{
  "clientId": "uuid",
  "action": "getContent",
  "fileId": "google_file_id"
}
```

**Response (lista):**
```json
{
  "files": [
    {
      "id": "file_id",
      "name": "Relatório.docx",
      "mimeType": "application/vnd.google-apps.document",
      "modifiedTime": "2025-01-03T10:00:00Z"
    }
  ]
}
```

---

### 5. `sync-drive-documents`

**Propósito:** Sincronizar documentos do Drive para a base de conhecimento (RAG).

**Autenticação:** Pública (`verify_jwt = false`), valida token internamente. Requer role=admin.

**Método:** `POST`

**Request Body:**
```json
{
  "clientId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "synced": 5,
  "skipped": 2,
  "total": 7,
  "clientName": "Cliente X"
}
```

---

### 6. `generate-meeting-summary`

**Propósito:** Gerar resumo de reunião usando IA.

**Autenticação:** Pública (`verify_jwt = false`), valida token internamente.

**Método:** `POST`

**Request Body:**
```json
{
  "clientId": "uuid",
  "notes": "Notas da reunião..."
}
```

**Response:**
```json
{
  "summary": "## Resumo da Reunião\n\n..."
}
```

---

### 7. `create-client-user`

**Propósito:** Criar ou vincular usuário a um cliente.

**Autenticação:** Pública (`verify_jwt = false`) para permitir criação administrativa.

**Método:** `POST`

**Request Body:**
```json
{
  "clientId": "uuid",
  "email": "usuario@email.com",
  "fullName": "Nome do Usuário"
}
```

**Response:**
```json
{
  "message": "User created and invitation sent",
  "userId": "uuid"
}
```

---

### 8. `resend-invite`

**Propósito:** Reenviar email de convite/reset de senha.

**Autenticação:** Pública (`verify_jwt = false`).

**Método:** `POST`

**Request Body:**
```json
{
  "email": "usuario@email.com",
  "action": "resend" // ou "create"
}
```

**Response:**
```json
{
  "message": "Password reset email sent"
}
```

---

## Hooks Customizados

### `useAuth()`

**Localização:** `src/contexts/AuthContext.tsx`

```typescript
const { user, session, role, clientId, loading, signIn, signUp, signOut } = useAuth();
```

---

### `useChatRAG(clientId)`

**Localização:** `src/hooks/useChatRAG.ts`

```typescript
const {
  messages,        // ChatMessage[]
  isLoading,
  sendMessage,     // (message: string) => Promise<void>
  clearMessages,
} = useChatRAG(clientId);
```

---

### `useChatSessions(clientId)`

**Localização:** `src/hooks/useChatSessions.ts`

```typescript
const {
  sessions,
  currentSessionId,
  isLoading,
  createSession,
  selectSession,
  deleteSession,
} = useChatSessions(clientId);
```

---

### `useGoogleAdsMetrics(clientId)`

**Localização:** `src/hooks/useGoogleAdsMetrics.ts`

```typescript
const {
  metrics,         // { spend, conversions, roas, cpa, ctr, ... }
  isLoading,
  error,
  refetch,
} = useGoogleAdsMetrics(clientId, dateRange);
```

---

### `useGoogleDriveFiles(clientId)`

**Localização:** `src/hooks/useGoogleDriveFiles.ts`

```typescript
const {
  files,
  isLoading,
  getFileContent,  // (fileId: string) => Promise<string>
  syncDocuments,   // () => Promise<void>
} = useGoogleDriveFiles(clientId);
```

---

### `useMeetingAgendas(clientId)`

**Localização:** `src/hooks/useMeetingAgendas.ts`

```typescript
const {
  agendas,
  isLoading,
  fetchAgendas,
  createAgenda,    // (title, notes, date, summary?, tasks?) => Promise<MeetingAgenda>
  updateAgenda,    // (id, updates) => Promise<boolean>
  deleteAgenda,    // (id) => Promise<boolean>
  generateSummary, // (notes) => Promise<string>
  fetchAgendaTasks,// (agendaId) => Promise<Task[]>
} = useMeetingAgendas(clientId);
```

---

## Componentes Principais

### Layouts

| Componente | Localização | Descrição |
|------------|-------------|-----------|
| `AdminLayout` | `src/components/layout/AdminLayout.tsx` | Layout do painel admin com sidebar |
| `ClientLayout` | `src/components/layout/ClientLayout.tsx` | Layout do portal do cliente |
| `AdminSidebar` | `src/components/layout/AdminSidebar.tsx` | Sidebar de navegação admin |
| `ClientSidebar` | `src/components/layout/ClientSidebar.tsx` | Sidebar de navegação cliente |

### Páginas Admin

| Página | Rota | Descrição |
|--------|------|-----------|
| `Dashboard` | `/admin` | Visão geral com métricas |
| `Clients` | `/admin/clients` | CRUD de clientes |
| `Users` | `/admin/users` | Gerenciamento de usuários |
| `Tasks` | `/admin/tasks` | Gerenciamento de tarefas |
| `Performance` | `/admin/performance` | Métricas Google Ads |
| `Files` | `/admin/files` | Arquivos Google Drive |
| `MeetingAgenda` | `/admin/agenda` | Pautas de reunião |
| `Chat` | `/admin/chat` | Chat com IA |
| `Settings` | `/admin/settings` | Configurações |

### Páginas Portal

| Página | Rota | Descrição |
|--------|------|-----------|
| `MeetingAgenda` | `/portal` | Visualizar pautas |
| `Performance` | `/portal/performance` | Visualizar métricas |
| `Files` | `/portal/files` | Visualizar arquivos |
| `Chat` | `/portal/chat` | Chat com IA |

---

## Fluxos de Dados

### Fluxo de Criação de Usuário Cliente

```
┌─────────────────────────────────────────────────────────────────┐
│                CRIAR USUÁRIO DE CLIENTE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Admin abre modal em /admin/users                            │
│           │                                                     │
│           ▼                                                     │
│  2. Preenche email, nome e seleciona cliente                    │
│           │                                                     │
│           ▼                                                     │
│  3. Chama edge function 'create-client-user'                    │
│           │                                                     │
│           ▼                                                     │
│  4. Função cria user em auth.users                              │
│           │                                                     │
│           ▼                                                     │
│  5. Trigger 'handle_new_user' cria profile                      │
│           │                                                     │
│           ▼                                                     │
│  6. Função atualiza profile.client_id                           │
│           │                                                     │
│           ▼                                                     │
│  7. Função insere em user_roles (role='client')                 │
│           │                                                     │
│           ▼                                                     │
│  8. Supabase envia email de convite                             │
│           │                                                     │
│           ▼                                                     │
│  9. Usuário clica no link e define senha                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Fluxo do Chat RAG

```
┌─────────────────────────────────────────────────────────────────┐
│                     CHAT RAG FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Usuário envia mensagem                                      │
│           │                                                     │
│           ▼                                                     │
│  2. useChatRAG.sendMessage()                                    │
│           │                                                     │
│           ▼                                                     │
│  3. Edge function 'chat-rag' recebe                             │
│           │                                                     │
│           ▼                                                     │
│  4. parseAdvancedUserIntent() analisa intenção                  │
│           │                                                     │
│           ├──► Sobre Google Ads? ──► Busca na API               │
│           │                                                     │
│           └──► Sobre docs? ──► Busca vetorial em                │
│                               documents_knowledge               │
│           │                                                     │
│           ▼                                                     │
│  5. Monta contexto e envia para LLM (Lovable AI)                │
│           │                                                     │
│           ▼                                                     │
│  6. Salva mensagens em chat_messages                            │
│           │                                                     │
│           ▼                                                     │
│  7. Retorna resposta para o frontend                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Políticas de Segurança (RLS)

### Funções Auxiliares

```sql
-- Verifica se usuário tem determinado role
CREATE FUNCTION has_role(_user_id uuid, _role app_role)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Obtém client_id do usuário
CREATE FUNCTION get_user_client_id(_user_id uuid)
RETURNS uuid AS $$
  SELECT client_id FROM profiles
  WHERE user_id = _user_id
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### Políticas por Tabela

#### `clients`
| Policy | Command | Regra |
|--------|---------|-------|
| Admins can manage all | ALL | `has_role(auth.uid(), 'admin')` |
| Clients can view their own | SELECT | `id = get_user_client_id(auth.uid())` |

#### `tasks`
| Policy | Command | Regra |
|--------|---------|-------|
| Admins can manage all | ALL | `has_role(auth.uid(), 'admin')` |
| Clients can view their own | SELECT | `client_id = get_user_client_id(auth.uid())` |

#### `meeting_agendas`
| Policy | Command | Regra |
|--------|---------|-------|
| Admins can manage all | ALL | `has_role(auth.uid(), 'admin')` |
| Clients can view their agendas | SELECT | `client_id = get_user_client_id(auth.uid())` |

#### `profiles`
| Policy | Command | Regra |
|--------|---------|-------|
| Admins can manage all | ALL | `has_role(auth.uid(), 'admin')` |
| Users can view own | SELECT | `user_id = auth.uid() OR has_role(...)` |
| Users can update own | UPDATE | `user_id = auth.uid()` |

---

## Integrações Externas

### Google Ads API

**Versão:** v22

**Autenticação:** OAuth 2.0 com Refresh Token

**Secrets necessários:**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_DEVELOPER_TOKEN`

**Configuração do Refresh Token:**
1. Acessar [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Configurar OAuth credentials (gear icon)
3. Selecionar scope: `https://www.googleapis.com/auth/adwords`
4. Autorizar e trocar código por refresh token
5. Adicionar refresh token aos secrets

### Google Drive API

**Versão:** v3

**Autenticação:** OAuth 2.0 (mesmas credenciais do Ads)

**Scope adicional:** `https://www.googleapis.com/auth/drive.readonly`

### Lovable AI

**Uso:** Geração de respostas para chat e resumos de reunião

**Modelo:** Configurado internamente pelo Lovable Cloud

**Não requer API key** - integração nativa

---

## Variáveis de Ambiente

### Automáticas (Lovable Cloud)

| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública (anon) |
| `VITE_SUPABASE_PROJECT_ID` | ID do projeto |

### Edge Functions (Secrets)

| Secret | Descrição |
|--------|-----------|
| `SUPABASE_URL` | URL interna Supabase |
| `SUPABASE_ANON_KEY` | Chave anon |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave admin (service role) |
| `LOVABLE_API_KEY` | Chave da API Lovable AI |
| `GOOGLE_CLIENT_ID` | OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret |
| `GOOGLE_REFRESH_TOKEN` | OAuth Refresh Token |
| `GOOGLE_DEVELOPER_TOKEN` | Google Ads Developer Token |

---

## Guia de Desenvolvimento

### Padrões de Código

1. **Componentes:** Functional components com TypeScript
2. **Estado global:** React Context (AuthContext, ThemeContext)
3. **Estado de servidor:** TanStack Query
4. **Estilização:** Tailwind CSS com design tokens em `index.css`
5. **Formulários:** React Hook Form + Zod
6. **Rotas:** React Router DOM v6

### Adicionando Nova Feature

1. **Banco de dados:**
   - Criar migration via Lovable
   - Adicionar RLS policies apropriadas

2. **Backend (se necessário):**
   - Criar edge function em `supabase/functions/`
   - Adicionar configuração em `supabase/config.toml`

3. **Frontend:**
   - Criar hook customizado em `src/hooks/`
   - Criar componentes em `src/components/`
   - Adicionar página em `src/pages/admin/` ou `src/pages/portal/`
   - Atualizar rotas em `src/App.tsx`

### Testando Localmente

As Edge Functions são deployadas automaticamente. Para testar:

1. Fazer alteração no código
2. Aguardar deploy automático
3. Verificar logs via Cloud UI

### Debug

- **Console logs:** Disponíveis no DevTools do navegador
- **Edge function logs:** Acessíveis via Lovable Cloud
- **Database queries:** Usar ferramentas de análise do Supabase

---

## Changelog

| Data | Versão | Descrição |
|------|--------|-----------|
| 2025-01-03 | 1.0.0 | Documentação inicial |

---

## Contato

Para dúvidas sobre o projeto, entre em contato com a equipe de desenvolvimento.
