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

### RF-12 — Histórico de compras e Comprar novamente

Implementação adicionada:

- nova página `historico-compras.html`;
- histórico paginado em blocos de 20 pedidos;
- filtro por período: 30 dias, 90 dias, 12 meses ou todo o histórico;
- filtro por loja usando RPC autenticada;
- exibição de loja, data, status, itens, preços históricos e total;
- botão **Comprar novamente**;
- recompra consulta novamente a loja e os produtos antes de alterar o carrinho;
- produto inativo, removido ou sem estoque não é incluído;
- quantidade é limitada ao estoque atual;
- preço e preço promocional usados no carrinho são sempre os valores atuais do produto;
- itens já existentes no carrinho são somados sem ultrapassar o estoque atual;
- após a recompra, o cliente pode ir ao carrinho ou continuar no histórico;
- `meus-pedidos.html` recebe o atalho **Histórico de Compras** por extensão modular, sem reescrever o arquivo legado.

Arquivos:

- `historico-compras.html`
- `css/historico-compras.css`
- `js/historico-compras.js`
- `js/meus-pedidos-historico.js`
- `js/supabase.js`
- `supabase/migrations/20260819_005_historico_compras.sql`

A migration 005 cria `listar_lojas_historico_cliente()`, que retorna apenas lojas relacionadas a pedidos do usuário autenticado e não expõe histórico de outros clientes.

**Situação:** frontend e SQL versionados. Falta aplicar a migration 005 e testar filtros, paginação e recompra com produtos ativos, sem estoque, inativos e com preço alterado.

### Casos de teste do RF-12

1. cliente com mais de 20 pedidos navega entre as páginas;
2. filtro de 30/90/365 dias retorna somente pedidos do período;
3. filtro de loja não retorna pedidos de outra loja;
4. produto ativo e com estoque volta para o carrinho usando o preço atual;
5. produto que teve o preço alterado não reutiliza o preço histórico;
6. produto inativo/removido não é adicionado;
7. produto sem estoque não é adicionado;
8. quantidade pedida maior que o estoque atual é reduzida ao disponível;
9. item já presente no carrinho é somado sem ultrapassar o estoque;
10. loja inativa impede a recompra do pedido.

---

## Migrations pendentes de aplicação

Aplicar em ordem:

1. `20260819_001_fluxo_seguro_pedidos.sql`
2. `20260819_002_avaliacoes_loja.sql`
3. `20260819_003_cancelamento_cliente.sql`
4. `20260819_004_evitar_trigger_cancelamento_duplicado.sql`
5. `20260819_005_historico_compras.sql`

A migration 004 existe para compatibilidade com o banco atual, caso o trigger de restauração de estoque já tenha sido criado manualmente antes de as migrations serem versionadas.

## Próximas prioridades do MVP

Depois dos testes deste bloco:

1. múltiplos endereços do cliente;
2. aprovação básica de lojas e dashboard administrativo;
3. alertas de estoque baixo;
4. paginação das demais listagens maiores que 20 registros;
5. revisão geral de RLS e versionamento das demais regras de banco.

## Regra de merge

A branch não deve ser mesclada na `main` até que:

- as migrations sejam aplicadas em ambiente controlado;
- os fluxos principais sejam testados com cliente e lojista autenticados;
- a recuperação de senha seja validada com e-mail real;
- a resposta de avaliação seja validada publicamente;
- o cancelamento seja testado incluindo restauração de estoque e concorrência de status;
- o histórico seja testado com filtros, paginação e recompra usando estoque/preço atuais.
