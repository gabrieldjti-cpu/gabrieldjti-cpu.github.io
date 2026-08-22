# Testes — RF-16 Estoque

**Projeto:** Comércio da Cidade — Marketplace Multi-Lojas  
**Branch de implementação:** `feat/rf16-estoque-baixo`  
**Referência:** `PRD-Marketplace.md` — RF-16

## Escopo implementado

O RF-16 exige:

- controle da quantidade disponível por produto;
- alertas de estoque baixo com limite configurável pelo lojista;
- baixa automática de estoque na confirmação/criação do pedido;
- devolução automática de estoque em cancelamento;
- histórico de movimentações para auditoria.

Nesta etapa:

- o controle de `produtos.estoque` já existente foi preservado;
- a baixa automática já existente no checkout foi mantida;
- a devolução automática já existente no cancelamento foi mantida;
- foi adicionado `produtos.estoque_minimo`, com valor padrão `5`;
- cada lojista pode configurar o limite individualmente por produto no painel;
- produto ativo entra em alerta quando `estoque <= estoque_minimo`;
- produtos esgotados recebem destaque próprio;
- foi criada a tabela `movimentacoes_estoque`;
- um trigger registra automaticamente entradas e saídas quando `produtos.estoque` muda;
- o histórico guarda estoque anterior, estoque novo, quantidade movimentada, tipo, origem e data;
- RLS permite ao lojista ler apenas movimentações da própria loja;
- o painel mostra as últimas 20 movimentações.

## Validação estrutural realizada

- [x] coluna `produtos.estoque_minimo` criada como `integer not null default 5`;
- [x] constraint impede limite negativo;
- [x] índice para consultas por loja/estoque criado;
- [x] tabela `movimentacoes_estoque` criada;
- [x] RLS habilitado no histórico;
- [x] policy de SELECT restrita ao proprietário da loja;
- [x] trigger `trg_registrar_movimentacao_estoque` ativo em INSERT/UPDATE de estoque;
- [x] migration aplicada no Supabase;
- [x] existem produtos reais com estoque menor ou igual ao limite padrão, permitindo teste visual imediato.

## Testes no navegador

### 1. Carregamento do painel — ✅ APROVADO

Validado no celular com conta de lojista:

- seção **Controle de Estoque** carregou normalmente;
- cartões **Estoque baixo**, **Esgotados** e **Produtos ativos** apareceram;
- contadores corresponderam aos produtos da loja;
- layout mobile permaneceu utilizável.

### 2. Alertas de estoque baixo — ✅ APROVADO

Validado no navegador:

- produtos com `estoque <= estoque_minimo` apareceram em **Produtos que precisam de atenção**;
- o estoque atual foi exibido corretamente;
- o limite padrão `5` apareceu nos cards;
- produtos acima do limite deixaram de aparecer quando aplicável.

### 3. Configuração do limite — ✅ APROVADO

Validado no navegador:

- **Configurar limites de alerta** abriu normalmente;
- o lojista alterou o limite de alerta de produto;
- o valor foi salvo;
- a lista de estoque baixo reagiu ao novo limite;
- ao restaurar o limite, o produto voltou a obedecer à regra `estoque <= estoque_minimo`.

### 4. Histórico por ajuste manual — ✅ APROVADO

Validado no navegador e confirmado no banco.

Caso real utilizado:

- produto: **Tapete de Crochê Oval**;
- estoque anterior: `1`;
- estoque novo: `100`;
- quantidade registrada: `+99`;
- tipo: `entrada`;
- origem: `alteracao_lojista`.

O painel exibiu a movimentação com estoque anterior → novo, quantidade, origem e data/hora.

### 5. Baixa automática por pedido — comportamento existente preservado

O checkout já reduz `produtos.estoque` automaticamente e a nova trigger do RF-16 registra qualquer alteração real na coluna `estoque`.

**Situação desta validação:** não reexecutado ponta a ponta nesta rodada específica do RF-16.

### 6. Devolução por cancelamento — comportamento existente preservado

O fluxo de cancelamento já devolve as unidades ao estoque e a nova trigger do RF-16 registra qualquer alteração real na coluna `estoque`.

**Situação desta validação:** não reexecutado ponta a ponta nesta rodada específica do RF-16.

### 7. Isolamento entre lojas — validação estrutural aprovada

A tabela `movimentacoes_estoque` possui RLS e policy de SELECT baseada na loja pertencente ao `auth.uid()`.

**Situação desta validação:** proteção estrutural confirmada; teste cruzado entre dois lojistas fica recomendado para regressão.

## Correção realizada durante os testes

Durante o primeiro teste da branch, o frontend retornou `Invalid API key` porque `js/supabase.js` da branch estava com uma chave inválida.

A branch foi corrigida para utilizar a publishable key ativa do projeto Supabase. A `main` não possuía esse erro.

Após a correção, o carregamento das lojas e os testes do RF-16 seguiram normalmente.

## Situação

✅ **RF-16 validado no escopo principal do MVP.**

Critérios funcionais mínimos definidos para esta etapa foram aprovados:

- [x] alerta visual de estoque baixo;
- [x] limite configurável por produto;
- [x] persistência do limite;
- [x] atualização dinâmica da lista de alertas;
- [x] registro automático de movimentação após mudança real de estoque;
- [x] histórico visível no painel do lojista;
- [x] estrutura de auditoria protegida por RLS.

Os testes ponta a ponta de baixa por checkout e devolução por cancelamento permanecem recomendados como regressão conjunta dos RF-10/RF-16/RF-20, mas não bloqueiam a integração desta implementação de alertas e histórico.