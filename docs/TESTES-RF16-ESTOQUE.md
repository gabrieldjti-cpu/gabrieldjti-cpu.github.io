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

## Validação estrutural já realizada

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

### 1. Carregamento do painel

1. entrar com uma conta que possua loja;
2. abrir `painel-loja.html`;
3. confirmar que aparece a seção **Controle de Estoque** antes da lista de produtos;
4. confirmar os cartões de resumo:
   - Estoque baixo;
   - Esgotados;
   - Produtos ativos.

**Esperado:** os números devem corresponder aos produtos da própria loja.

### 2. Alertas de estoque baixo

1. observar a lista **Produtos que precisam de atenção**;
2. confirmar que produtos com `estoque <= estoque_minimo` aparecem;
3. confirmar que produto com estoque `0` aparece como esgotado;
4. confirmar que produto acima do limite não aparece nessa lista.

### 3. Configuração do limite

1. abrir **Configurar limites de alerta**;
2. escolher um produto;
3. alterar o limite para um número inteiro não negativo;
4. clicar em **Salvar**;
5. recarregar o painel.

**Esperado:** o novo valor deve permanecer salvo e a lista de alertas deve mudar quando aplicável.

Exemplo:

- estoque atual = `3`;
- limite = `5` → produto aparece no alerta;
- alterar limite para `2` → produto deixa de aparecer no alerta.

### 4. Histórico por ajuste manual

1. abrir a edição de um produto;
2. anotar o estoque atual;
3. aumentar ou reduzir a quantidade;
4. salvar;
5. retornar ao painel;
6. abrir **Histórico de movimentações**.

**Esperado:** deve aparecer uma nova movimentação com:

- produto correto;
- entrada ou saída;
- quantidade alterada;
- estoque anterior → estoque novo;
- data/hora.

### 5. Baixa automática por pedido

1. realizar um checkout de produto com estoque disponível;
2. confirmar o novo valor de estoque;
3. abrir o histórico no painel do lojista.

**Esperado:** o estoque diminui e uma movimentação de saída é registrada automaticamente.

### 6. Devolução por cancelamento

1. cancelar um pedido elegível que já tenha baixado estoque;
2. conferir o estoque do produto;
3. abrir o histórico.

**Esperado:** a quantidade retorna ao estoque e uma movimentação de entrada é registrada.

### 7. Isolamento entre lojas

1. entrar como lojista A;
2. abrir o painel;
3. confirmar que produtos e movimentações da loja B não aparecem.

**Esperado:** cada lojista acessa somente o próprio histórico.

## Situação

**Implementação pronta para validação funcional no navegador.**

O RF-16 só deve ser marcado como concluído após validar, no mínimo:

- alerta visual;
- alteração do limite;
- registro de movimentação após mudança real de estoque.
