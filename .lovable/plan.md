
# Plano: Evolução do Sistema de Agendamento de Posts

## Situação Atual

A conexão com Instagram/Facebook já está funcionando. Agora precisamos adicionar a funcionalidade de **agendar posts** a partir do Calendário Editorial.

## O que Será Implementado

### 1. Botão "Agendar Publicação" na Página de Detalhes

Quando o conteúdo estiver com status **"Aprovado"** ou superior, aparecerá um botão para agendar a publicação nas redes sociais conectadas.

```text
┌─────────────────────────────────────────────────────────────────┐
│  📷 como vender mais em 2026                                     │
│  Instagram • O Macegossa                       [Aprovado ▼]     │
│                                                                  │
│  [Excluir]  [Salvar]  [📅 Agendar Publicação]  ← NOVO BOTÃO    │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Modal de Agendamento Completo

Ao clicar em "Agendar Publicação", abrirá um modal com:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Agendar Publicação                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Plataformas:                                                   │
│  ┌────────────────┐  ┌────────────────┐                         │
│  │ ☑ Instagram    │  │ ☑ Facebook     │                         │
│  │ @omacegossa    │  │ O Macegossa    │                         │
│  └────────────────┘  └────────────────┘                         │
│                                                                  │
│  Mídia:                                                         │
│  ┌───────────────────────────────────────┐                      │
│  │  📷 Arraste ou clique para upload     │                      │
│  │     Imagem ou Vídeo (até 50MB)        │                      │
│  └───────────────────────────────────────┘                      │
│  [imagem_preview.jpg] ✕                                         │
│                                                                  │
│  Legenda:                                                       │
│  ┌───────────────────────────────────────┐                      │
│  │ Descubra como vender mais em 2026...  │                      │
│  │ (pré-preenchido com conteúdo IA)      │                      │
│  └───────────────────────────────────────┘                      │
│  📊 Caracteres: 234/2200                                        │
│                                                                  │
│  Hashtags:                                                      │
│  #vendas #marketing #2026 #negocios                             │
│                                                                  │
│  Data e Hora:                                                   │
│  [📅 11/02/2026]  [⏰ 10:30]                                    │
│                                                                  │
│  ─────────────────────────────────────────────                  │
│  [Cancelar]              [📅 Agendar] [▶ Publicar Agora]        │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Lista de Posts Agendados

Na mesma página ou em uma seção dedicada, mostrará os posts agendados para este conteúdo:

```text
┌─────────────────────────────────────────────────────────────────┐
│  📅 Agendamentos                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📷 Instagram                  📅 11/02 às 10:30                │
│  @omacegossa                  [Agendado]  [Editar] [Cancelar]   │
│                                                                  │
│  📘 Facebook                   📅 11/02 às 10:30                │
│  O Macegossa                  [Agendado]  [Editar] [Cancelar]   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquitetura Técnica

### Banco de Dados

**Criar bucket de storage para mídias:**
```sql
-- Bucket público para mídias de posts sociais
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-media', 'social-media', true);

-- Políticas de acesso
-- Admins podem fazer upload e gerenciar
-- Público pode visualizar (necessário para Meta API)
```

### Edge Functions

**1. `social-publish` (nova função)**
- Publica o post na plataforma selecionada
- Para Instagram: usa fluxo em 2 etapas (`/media` → `/media_publish`)
- Para Facebook: usa `/photos` ou `/feed`
- Atualiza status do post após publicação

**2. `social-scheduler` (cron job - futuro)**
- Executa a cada 5 minutos
- Busca posts com `scheduled_at <= now()` e `status = 'scheduled'`
- Chama `social-publish` para cada um

### Componentes Frontend

**1. `SchedulePostModal.tsx` (novo)**
- Modal para configurar o agendamento
- Upload de mídia
- Edição de legenda e hashtags
- Seleção de data/hora

**2. `ScheduledPostsList.tsx` (novo)**
- Lista posts agendados para um conteúdo
- Ações: editar, cancelar, publicar agora

**3. Alterações em `ContentDetail.tsx`**
- Adicionar botão "Agendar Publicação"
- Integrar modal e lista

### Hook `useScheduledPosts.ts` (novo)

```typescript
// Gerencia posts agendados
- createScheduledPost()
- updateScheduledPost()
- deleteScheduledPost()
- publishNow()
```

---

## Ordem de Implementação

### Fase 2.1: Infraestrutura de Storage
1. Criar bucket `social-media` no storage
2. Configurar políticas de acesso

### Fase 2.2: UI de Agendamento
3. Criar `SchedulePostModal.tsx` com upload de mídia
4. Criar hook `useScheduledPosts.ts`
5. Adicionar botão e modal no `ContentDetail.tsx`
6. Pré-preencher legenda com conteúdo da IA (se existir)

### Fase 2.3: Publicação
7. Criar edge function `social-publish`
8. Implementar fluxo de publicação para Instagram e Facebook
9. Adicionar lista de posts agendados
10. Testar publicação completa

### Fase 2.4: Automação (futuro)
11. Criar cron job `social-scheduler`
12. Implementar verificação automática de posts

---

## Fluxo do Usuário Final

```text
1. Admin cria conteúdo no Calendário Editorial
2. Admin gera conteúdo com IA (opcional)
3. Cliente aprova o conteúdo
4. Admin clica em "Agendar Publicação"
5. Modal abre com:
   - Plataformas conectadas do cliente
   - Legenda pré-preenchida (se IA gerou)
   - Hashtags sugeridas
   - Campo para upload de mídia
6. Admin faz upload da imagem/vídeo
7. Escolhe data/hora
8. Clica em "Agendar" ou "Publicar Agora"
9. Post é salvo na tabela scheduled_posts
10. Na hora agendada, cron job publica automaticamente
```

---

## Pré-requisitos da Configuração Meta

Para que a publicação funcione, o app Meta precisa ter:
- **Permissões**: `instagram_content_publish`, `pages_manage_posts`
- **App Mode**: Em modo de teste ou aprovado pelo App Review
- **URLs de mídia**: Devem ser públicas (por isso o bucket será público)

---

## Resumo das Mudanças

| Componente | Ação |
|------------|------|
| Storage bucket `social-media` | Criar |
| `SchedulePostModal.tsx` | Criar |
| `ScheduledPostsList.tsx` | Criar |
| `useScheduledPosts.ts` | Criar |
| `social-publish` edge function | Criar |
| `ContentDetail.tsx` | Modificar (adicionar botão + integração) |
