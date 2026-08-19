# Progresso do MVP

**Projeto:** Comércio da Cidade — Marketplace Multi-Lojas  
**Branch:** `feat/concluir-mvp-prd`  
**Base:** `main`  
**Referência:** `PRD-Marketplace.md`

Este documento registra o avanço posterior à auditoria inicial de `docs/STATUS-PRD.md`.
Um requisito só deve ser tratado como totalmente concluído depois dos testes funcionais correspondentes.

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

**Situação:** implementação pronta na branch; falta confirmar Redirect URLs e executar teste real de e-mail/recuperação.

---

### RF-10 / RF-20 — Ciclo seguro e cancelamento de pedidos

Fluxo versionado:

```text
aguardando_pagamento
→ pago
→ em_preparacao
→ enviado
→ entregue
```

Regras:

- lojista confirma pagamento;
- lojista inicia preparação;
- envio exige rastreio;
- lojista não define `entregue`;
- cliente confirma recebimento;
- pedido cancelado não volta a status ativo;
- cancelamento restaura estoque uma única vez;
- envio fica bloqueado quando existe solicitação de cancelamento pendente;
- cliente cancela diretamente antes da preparação;
- em preparação, cliente cria solicitação para decisão do lojista.

**Situação:** migrations aplicadas e registradas no Supabase; testes autenticados de cliente/lojista ainda pendentes.

---

### RF-11 — Resposta do lojista às avaliações

Implementação:

- `avaliacoes-loja.html`;
- resumo com total, média e avaliações sem resposta;
- filtro e pesquisa;
- resposta pública de até 1000 caracteres;
- validação server-side de avaliação → produto → loja → proprietário.

**Situação:** migration aplicada; falta validar o fluxo completo com lojista autenticado e resposta aparecendo na página pública.

---

### RF-12 — Histórico de compras e Comprar novamente

Implementação:

- `historico-compras.html`;
- paginação de 20 pedidos;
- filtros por período e loja;
- preços históricos na visualização;
- recompra consulta loja, produto, preço e estoque atuais;
- produto inativo/removido/sem estoque é ignorado;
- quantidade é limitada ao estoque atual;
- itens existentes no carrinho não ultrapassam o estoque;
- atalho adicionado a `meus-pedidos.html` por extensão modular.

**Situação:** migration aplicada; testes funcionais de filtros, paginação e recompra ainda pendentes.

### Casos de teste do RF-12

1. cliente com mais de 20 pedidos navega entre páginas;
2. filtros 30/90/365 dias;
3. filtro por loja;
4. recompra usa preço atual;
5. preço histórico não volta para o carrinho;
6. produto inativo/removido é ignorado;
7. produto sem estoque é ignorado;
8. quantidade é reduzida ao estoque disponível;
9. item já no carrinho não ultrapassa estoque;
10. loja inativa impede recompra.

---

### RF-04 — Múltiplos endereços do cliente

Parte de endereços do RF-04 implementada:

- nova tabela `enderecos_cliente`;
- cliente pode adicionar, editar e excluir endereço por soft delete;
- cliente pode definir um endereço padrão;
- índice parcial garante no máximo um endereço padrão ativo por cliente;
- RLS permite leitura apenas dos próprios endereços;
- alterações passam por RPCs autenticadas que validam `auth.uid()`;
- endereço legado de `profiles` é importado quando existe;
- endereço legado sem CEP/UF fica marcado como incompleto até ser editado;
- endereço padrão é sincronizado com os campos legados de `profiles` para compatibilidade;
- gerenciamento aparece dentro de `perfil.html` via extensão modular;
- campos antigos de endereço do modal de edição do perfil ficam ocultos para evitar duas fontes de verdade;
- checkout lista os endereços salvos;
- cliente pode cadastrar/editar um endereço sem sair do checkout;
- checkout exige endereço completo com CEP e UF;
- campos de endereço do checkout passam a ser preenchidos pela seleção e ficam somente leitura;
- `pedidos` recebe `endereco_id` e `endereco_entrega`;
- `endereco_entrega` guarda um snapshot JSON do endereço usado na compra;
- editar um endereço depois não altera o endereço registrado em pedidos antigos;
- novo RPC `finalizar_checkout_endereco` valida que o endereço pertence ao cliente e executa o checkout em uma única transação;
- `anon` não pode executar o checkout com endereço.

Arquivos principais:

- `js/enderecos-cliente.js`
- `js/perfil-enderecos.js`
- `js/checkout-enderecos.js`
- `css/enderecos-cliente.css`
- `js/supabase.js`
- `supabase/migrations/20260819175053_rf04_enderecos_cliente.sql`

**Situação:** banco aplicado e estrutura validada; frontend versionado. Falta teste ponta a ponta autenticado de cadastro/edição/exclusão/padrão e criação real de pedido com snapshot do endereço.

**Observação:** RF-04 completo ainda inclui foto de perfil e exclusão de conta por soft delete, que permanecem como pendências separadas.

---

## Segurança e versionamento do Supabase

Hardening já aplicado:

- RLS habilitado em `categorias_produtos`;
- leitura pública limitada às categorias ativas;
- `anon` não executa `finalizar_checkout`;
- funções internas `handle_new_user` e `vincular_lojista_automatico` usam `search_path = public` e não ficam expostas para execução direta pela API;
- nenhuma `service_role` foi adicionada ao frontend.

O histórico oficial do Supabase agora está alinhado aos nomes dos arquivos locais.

## Migrations aplicadas e registradas

1. `20260819174044_fluxo_seguro_pedidos.sql`
2. `20260819174110_avaliacoes_loja.sql`
3. `20260819174137_cancelamento_cliente.sql`
4. `20260819174150_evitar_trigger_cancelamento_duplicado.sql`
5. `20260819174202_historico_compras.sql`
6. `20260819174218_seguranca_supabase.sql`
7. `20260819175053_rf04_enderecos_cliente.sql`

Os antigos nomes com timestamp repetido `20260819_00X` foram substituídos pelos timestamps oficiais registrados no histórico remoto do Supabase.

## Próximas prioridades do MVP

Depois dos testes deste bloco:

1. aprovação básica de lojas e dashboard administrativo;
2. alertas de estoque baixo;
3. paginação das demais listagens maiores que 20 registros;
4. revisão geral de RLS/policies duplicadas e índices de foreign keys;
5. concluir as partes restantes do RF-04: foto de perfil e soft delete da conta.

## Regra de merge

A branch não deve ser mesclada na `main` até que:

- os fluxos principais sejam testados com cliente e lojista autenticados;
- recuperação de senha seja validada com e-mail real;
- resposta de avaliação seja validada publicamente;
- cancelamento seja testado incluindo restauração de estoque;
- histórico seja testado com filtros, paginação e recompra;
- RF-04 seja testado criando, editando, excluindo e selecionando endereços e finalizando um pedido real;
- o diff grande herdado de `js/painel-loja.js` seja revisado.
