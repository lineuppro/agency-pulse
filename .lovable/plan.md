

# Plano: Melhorias do Calendário Editorial

## Visao Geral

Este plano implementa melhorias significativas no sistema de Calendário Editorial, criando uma experiencia mais completa e colaborativa para administradores, designers e clientes.

---

## 1. Nova Pagina de Detalhes do Conteudo

Substituir o sidebar atual por uma pagina dedicada (`/admin/calendar/:contentId` e `/portal/calendar/:contentId`) com layout mais espacoso.

### Layout da Pagina

```text
+------------------------------------------------------------------+
|  [<] Voltar ao Calendario    Status: [Rascunho v]    [Acoes v]   |
+------------------------------------------------------------------+
|                                                                   |
|  +-------------------+  +--------------------------------------+  |
|  | INFO BASICAS      |  | CONTEUDO COMPLETO                    | |
|  | Instagram Post    |  | (area de leitura do artigo/post)     | |
|  | Cliente: Empresa  |  |                                       | |
|  | Data: 17/02/2026  |  | Titulo: LinkedIn 2026: Venda Mais!   | |
|  | Campanha: ...     |  | Subtitulo: Dicas para...             | |
|  +-------------------+  |                                       | |
|                         | [Conteudo gerado pela IA aqui]        | |
|  +-------------------+  |                                       | |
|  | METRICAS SEO      |  +--------------------------------------+ |
|  | Score: 72         |  |                                       | |
|  | Palavras: 1500    |  | +----------------------------------+   | |
|  | Densidade: 1.5%   |  | | COMENTARIOS E OBSERVACOES        |  | |
|  +-------------------+  | | (sistema de threads)              |  | |
|                         | +----------------------------------+   | |
|  +-------------------+  |                                       | |
|  | HASHTAGS          |  |                                       | |
|  | #marketing #...   |  |                                       | |
|  +-------------------+  +--------------------------------------+ |
+------------------------------------------------------------------+
```

### Componentes

- **Header**: Navegacao, seletor de status, menu de acoes (editar, excluir)
- **Painel Esquerdo**: Informacoes basicas, metricas SEO, hashtags, sugestoes de imagem
- **Painel Direito**: Conteudo completo (legivel), sistema de comentarios

---

## 2. Sistema de Comentarios para Conteudo Editorial

Criar tabela e logica para comentarios no conteudo editorial (similar ao sistema de tasks).

### Nova Tabela: `editorial_content_comments`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Chave primaria |
| editorial_content_id | uuid | FK para editorial_contents |
| user_id | uuid | Quem comentou |
| content | text | Texto do comentario |
| parent_comment_id | uuid | Para replies (threads) |
| created_at | timestamp | Data de criacao |

### Nova Tabela: `editorial_content_reactions`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Chave primaria |
| comment_id | uuid | FK para editorial_content_comments |
| user_id | uuid | Quem reagiu |
| reaction_type | text | like, heart, celebrate, thinking |

### Funcionalidades

- Comentarios com threads (respostas aninhadas)
- Reacoes com emojis
- Visivel para Admin, Designer e Cliente
- Log de atividade para historico

---

## 3. Visualizacao em Lista

Nova aba ou toggle no calendario para visualizacao em lista de todos os conteudos.

### Colunas da Lista

| Data | Status | Tipo | Titulo | Cliente | Comentarios | Acoes |
|------|--------|------|--------|---------|-------------|-------|
| 17/02 | Rascunho | Instagram | LinkedIn 2026 | Empresa X | 3 | [Ver] |

### Recursos

- Ordenacao por data, status, tipo
- Filtros rapidos
- Badge com contagem de comentarios
- Clique leva para pagina de detalhes

---

## 4. Subtitulo para Posts Instagram

Adicionar campo `subtitle` gerado pela IA para posts de redes sociais.

### Alteracoes

1. **Banco de Dados**: Adicionar coluna `subtitle` em `ai_generated_contents`
2. **Edge Function**: Atualizar prompt para gerar subtitulo
3. **Interface**: Exibir subtitulo na pagina de detalhes e formulario

---

## 5. Roles e Permissoes

### Visibilidade por Role

| Funcionalidade | Admin | Designer | Cliente |
|---------------|-------|----------|---------|
| Criar conteudo | Sim | Nao | Nao |
| Editar conteudo | Sim | Nao | Nao |
| Comentar | Sim | Sim | Sim |
| Aprovar/Rejeitar | Sim | Nao | Sim |
| Ver metricas SEO | Sim | Sim | Nao |
| Ver sugestoes imagem | Sim | Sim | Nao |

**Nota**: Designers sao usuarios admin, entao terao acesso completo. Clientes verao uma versao simplificada focada em aprovacao e feedback.

---

## Arquivos a Criar/Modificar

### Novos Arquivos

1. `src/pages/admin/ContentDetail.tsx` - Pagina de detalhes (admin)
2. `src/pages/portal/ContentDetail.tsx` - Pagina de detalhes (cliente)
3. `src/hooks/useEditorialContentComments.ts` - Hook para comentarios
4. `src/components/calendar/ContentListView.tsx` - Visualizacao em lista

### Arquivos Modificados

1. `src/App.tsx` - Novas rotas
2. `src/pages/admin/Calendar.tsx` - Toggle lista/calendario
3. `src/pages/portal/Calendar.tsx` - Toggle lista/calendario
4. `src/components/calendar/CalendarView.tsx` - Click navega para pagina
5. `supabase/functions/generate-content/index.ts` - Adicionar subtitulo

---

## Detalhes Tecnicos

### Migracao de Banco de Dados

```sql
-- Adicionar subtitulo
ALTER TABLE ai_generated_contents 
ADD COLUMN subtitle text;

-- Tabela de comentarios
CREATE TABLE editorial_content_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  editorial_content_id uuid REFERENCES editorial_contents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  parent_comment_id uuid REFERENCES editorial_content_comments(id),
  created_at timestamptz DEFAULT now()
);

-- Tabela de reacoes
CREATE TABLE editorial_content_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES editorial_content_comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('like','heart','celebrate','thinking')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id, reaction_type)
);

-- Indexes
CREATE INDEX idx_editorial_comments_content ON editorial_content_comments(editorial_content_id);
CREATE INDEX idx_editorial_comments_parent ON editorial_content_comments(parent_comment_id);

-- RLS policies para comentarios e reacoes
```

### Atualizacao do Prompt da IA

Para posts de Instagram, o formato JSON retornado incluira:

```json
{
  "title": "Titulo Principal",
  "subtitle": "Subtitulo para o Designer",
  "content": "Legenda completa...",
  "hashtags": [...],
  "image_suggestions": [...]
}
```

---

## Sugestoes Adicionais

1. **Notificacoes**: Alertar usuarios quando receberem comentarios em seus conteudos
2. **Historico de Alteracoes**: Log de quem editou o que e quando
3. **Anexos**: Permitir upload de imagens/arquivos nos comentarios
4. **Mencoes**: Marcar usuarios com @ nos comentarios
5. **Preview Mobile**: Simular como o post ficaria no Instagram/Facebook

