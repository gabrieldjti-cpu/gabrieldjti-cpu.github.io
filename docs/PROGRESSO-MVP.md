# Progresso do MVP

**Projeto:** Comércio da Cidade — Marketplace Multi-Lojas  
**Branch:** `feat/concluir-mvp-prd`  
**Base:** `main`  
**Referência:** `PRD-Marketplace.md`

Este documento registra o avanço posterior à auditoria inicial de `docs/STATUS-PRD.md`.
Os requisitos abaixo **não são promovidos automaticamente para ✅ Concluído** enquanto os fluxos que dependem do Supabase não forem aplicados e testados de ponta a ponta.

## Implementado nesta branch

### RF-03 — Recuperação de senha

Implementação versionada:

- `recuperar-senha.html`
- `nova-senha.html`
- `js/recuperar-senha.js`
- `js/nova-senha.js`

Fluxo preparado:

1. usuário informa o e-mail;
2. Supabase envia o link de recuperação;
3. link direciona para `nova-senha.html`;
4. nova senha exige pelo menos 8 caracteres, uma letra e um número;
5. senha é atualizada com `auth.updateUser`;
6. usuário retorna ao login.

**Situação:** implementação pronta na branch; falta confirmar Redirect URLs e executar teste real de e-mail/recuperação no Supabase.

---

### RF-10 / RF-20 — Ciclo seguro e cancelamento de pedidos

O painel resumido do lojista foi atualizado para usar o fluxo seguro já desenvolvido para pedidos.

Fluxo esperado:

```text
aguardando_pagamento
→ pago
→ em_preparacao
→ enviado
→ entregue
```

Regras versionadas:

- lojista confirma pagamento;
- lojista inicia preparação;
- envio exige rastreio;
- lojista não define `entregue`;
- cliente confirma recebimento;
- pedido cancelado não pode voltar a um status ativo;
- cancelamento restaura estoque uma única vez;
- envio fica bloqueado quando existe solicitação de cancelamento pendente.

Cancelamento do cliente:

- `aguardando_pagamento`: cancelamento direto;
- `pago`: cancelamento direto;
- `em_preparacao`: cria solicitação para decisão do lojista;
- lojista pode aprovar ou recusar;
- recusa exige justificativa;
- aprovação cancela o pedido e aciona a restauração de estoque.

Arquivos principais:

- `js/painel-loja.js`
- `css/cancelamento-cliente.css`
- `js/meus-pedidos-cancelamento.js`
- `js/pedidos-loja-solicitacoes.js`
- `js/cancelamento-observer-fix.js`
- `supabase/migrations/20260819_001_fluxo_seguro_pedidos.sql`
- `supabase/migrations/20260819_003_cancelamento_cliente.sql`
- `supabase/migrations/20260819_004_evitar_trigger_cancelamento_duplicado.sql`

**Situação:** frontend e SQL versionados; falta aplicar as migrations e executar testes autenticados de cliente/lojista.

---

### RF-11 — Resposta do lojista às avaliações

Implementação adicionada:

- página `avaliacoes-loja.html`;
- resumo com total, média e avaliações sem resposta;
- filtro por respondidas/pendentes;
- pesquisa;
- visualização da nota e comentário;
- resposta pública de até 1000 caracteres;
- edição da resposta existente;
- acesso pelo painel da loja;
- RPC valida que avaliação → produto → loja pertence ao usuário autenticado.

Arquivos:

- `avaliacoes-loja.html`
- `css/avaliacoes-loja.css`
- `js/avaliacoes-loja.js`
- `supabase/migrations/20260819_002_avaliacoes_loja.sql`

**Situação:** implementação versionada; falta aplicar a migration e validar resposta real aparecendo na página pública.

---

## Migrations pendentes de aplicação

Aplicar em ordem:

1. `20260819_001_fluxo_seguro_pedidos.sql`
2. `20260819_002_avaliacoes_loja.sql`
3. `20260819_003_cancelamento_cliente.sql`
4. `20260819_004_evitar_trigger_cancelamento_duplicado.sql`

A migration 004 existe para compatibilidade com o banco atual, caso o trigger de restauração de estoque já tenha sido criado manualmente antes de as migrations serem versionadas.

## Próximas prioridades do MVP

Depois dos testes deste bloco:

1. histórico de compras com filtros e **Comprar novamente**;
2. múltiplos endereços do cliente;
3. aprovação básica de lojas e dashboard administrativo;
4. alertas de estoque baixo;
5. paginação das listagens maiores que 20 registros;
6. revisão geral de RLS e versionamento das demais regras de banco.

## Regra de merge

A branch não deve ser mesclada na `main` até que:

- as migrations sejam aplicadas em ambiente controlado;
- os fluxos principais sejam testados com cliente e lojista autenticados;
- a recuperação de senha seja validada com e-mail real;
- a resposta de avaliação seja validada publicamente;
- o cancelamento seja testado incluindo restauração de estoque e concorrência de status.
