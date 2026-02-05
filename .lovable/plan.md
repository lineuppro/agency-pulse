

# Plano para Resolver os Problemas de Meta Ads e Social Media

## Resumo dos Problemas Identificados

Após investigar o código e banco de dados, identifiquei **3 problemas principais**:

### Problema 1: Meta Ads Metrics não funciona
**Causa:** A tabela `client_meta_ads` está **vazia** - não há nenhuma configuração de conta de anúncios para nenhum cliente. O sistema busca métricas de anúncios a partir desta tabela, que precisa conter o **Ad Account ID** e **Access Token**.

**Diferença importante:** A conexão de **Social Media** (tabela `meta_connections`) é diferente da configuração de **Meta Ads** (tabela `client_meta_ads`):
- `meta_connections` = Para publicar posts no Instagram/Facebook
- `client_meta_ads` = Para buscar métricas de campanhas de anúncios

### Problema 2: Não consegue adicionar novo perfil para "O Macegossa"
**Causa:** A conexão OAuth sempre pega a **primeira página** retornada pela API Meta (linha 99 do meta-auth: `const page = pagesData.data[0]`). Se o usuário tem acesso a múltiplas páginas, não há como escolher qual conectar - sempre será a primeira.

**Situação atual no banco:**
- "Delta Ultrassons" → conectado a @deltaultrassons
- "O Macegossa" → também conectado a @deltaultrassons (deveria ter sua própria página!)

### Problema 3: Publicação manual pode falhar silenciosamente
**Causa:** A função `meta-publish` foi corrigida mas ainda pode ter problemas ao buscar a conexão Meta do cliente.

---

## Plano de Solução

### Fase 1: Corrigir a Configuração de Meta Ads

**1.1 Atualizar meta-auth para também configurar Meta Ads automaticamente**
- Durante o fluxo OAuth, buscar as Ad Accounts disponíveis do usuário
- Salvar a primeira Ad Account encontrada na tabela `client_meta_ads`
- Isso permitirá que ao conectar a conta Meta, tanto Social Media quanto Ads sejam configurados

**1.2 Adicionar logs detalhados**
- Melhorar logging na função `meta-ads-metrics` para debugar problemas

### Fase 2: Permitir Seleção de Página no OAuth

**2.1 Modificar meta-auth para suportar seleção de página**
- Quando o usuário tem múltiplas páginas, retornar a lista para o frontend
- Criar um fluxo de 2 etapas: OAuth → Seleção de Página

**2.2 Atualizar MetaConnectButton**
- Adicionar modal para selecionar a página quando houver múltiplas opções
- Permitir reconectar com página diferente

### Fase 3: Melhorar a Publicação de Posts

**3.1 Corrigir meta-publish**
- Usar service role para acessar `meta_connections` (evita problemas de RLS)
- Adicionar mais logs de diagnóstico
- Melhorar tratamento de erros

---

## Mudanças Técnicas Detalhadas

### Arquivos a Modificar

```text
supabase/functions/meta-auth/index.ts
├── Adicionar busca de Ad Accounts durante OAuth
├── Salvar Ad Account na tabela client_meta_ads
├── Adicionar suporte para seleção de página (action: 'select-page')
└── Melhorar logs

supabase/functions/meta-ads-metrics/index.ts
├── Adicionar logs detalhados
├── Usar service role para queries no banco
└── Melhorar mensagens de erro

supabase/functions/meta-publish/index.ts
├── Usar service role para acessar meta_connections
├── Adicionar logs de debug
└── Corrigir fluxo de publicação

src/components/meta/MetaConnectButton.tsx
├── Adicionar estado para seleção de página
├── Mostrar modal quando múltiplas páginas disponíveis
└── Permitir reconexão com página diferente

src/hooks/useMetaConnection.ts
├── Adicionar função para listar páginas disponíveis
└── Adicionar função para selecionar página específica
```

### Fluxo Corrigido para Meta Ads

```text
1. Usuário clica "Conectar Meta"
2. OAuth redireciona para Facebook
3. Após autorização, sistema busca:
   - Páginas do Facebook
   - Conta do Instagram de cada página
   - Ad Accounts disponíveis
4. Se múltiplas páginas, mostra modal para seleção
5. Salva em meta_connections (Social Media)
6. Salva em client_meta_ads (Ads - se Ad Account disponível)
7. Métricas passam a funcionar automaticamente
```

---

## Solução Rápida (Opcional)

Se preferir uma solução mais rápida enquanto implementamos o fluxo completo:

**Configurar manualmente o Meta Ads para Delta:**
1. Obter o Ad Account ID do Meta Business Manager (formato: act_XXXXX)
2. Usar o access_token existente da tabela `meta_connections`
3. Inserir manualmente na tabela `client_meta_ads`

Isso faria as métricas funcionarem imediatamente para Delta, enquanto implementamos o fluxo automático.

---

## Ordem de Implementação Sugerida

1. **Primeiro:** Corrigir `meta-ads-metrics` com logs e usar service role
2. **Segundo:** Atualizar `meta-auth` para salvar Ad Account automaticamente
3. **Terceiro:** Implementar seleção de página no frontend
4. **Quarto:** Testar publicação de posts
5. **Quinto:** Limpar conexões duplicadas no banco de dados

