# Testes finais do MVP

**Projeto:** Comércio da Cidade — Marketplace Multi-Lojas  
**Branch de validação:** `fix/autenticacao-mvp`  
**Objetivo:** concentrar em um único roteiro os testes funcionais que faltam antes de considerar o MVP Fase 1 concluído.

> Os testes abaixo devem ser executados somente depois das correções finais estarem prontas. Não marcar como concluído sem validação real no navegador e, quando aplicável, confirmação no Supabase.

## 1. Autenticação

- [ ] Cadastro bloqueia senha com menos de 8 caracteres.
- [ ] Cadastro bloqueia senha com 8+ caracteres sem número.
- [ ] Cadastro bloqueia senha com 8+ caracteres sem letra.
- [ ] Cadastro aceita senha com 8+ caracteres contendo letra e número.
- [ ] Login de cliente redireciona para `perfil.html`.
- [ ] Login de proprietário de loja redireciona para `painel-loja.html`.
- [ ] Login de administrador redireciona para `admin-dashboard.html`.
- [ ] Conta excluída continua sendo bloqueada pelo guard do RF-04.

## 2. Recuperação de senha

O código já usa `resetPasswordForEmail` e gera retorno para `nova-senha.html` com base no endereço atual do site.

Antes do teste real, confirmar no Supabase Auth que os Redirect URLs usados no ambiente de teste/publicação estão autorizados.

- [ ] Solicitar recuperação para um e-mail real cadastrado.
- [ ] Receber o e-mail de recuperação.
- [ ] Abrir o link e chegar em `nova-senha.html`.
- [ ] Nova senha fraca é rejeitada.
- [ ] Nova senha com 8+ caracteres, letra e número é aceita.
- [ ] Login funciona com a nova senha.

## 3. Pedidos — cliente e lojista

### Fluxo normal

- [ ] Cliente finaliza checkout normalmente.
- [ ] Pedido aparece em `meus-pedidos.html`.
- [ ] Lojista vê o pedido em `pedidos-loja.html`.
- [ ] Lojista avança `aguardando_pagamento` → `pago`.
- [ ] Lojista avança `pago` → `em_preparacao`.
- [ ] Lojista avança `em_preparacao` → `enviado` com rastreio.
- [ ] Cliente confirma recebimento.
- [ ] Pedido passa para `entregue`.

### Cancelamento direto

- [ ] Cliente cancela pedido em `aguardando_pagamento`.
- [ ] Cliente cancela pedido em `pago` quando ainda permitido.
- [ ] Pedido passa para `cancelado`.
- [ ] Estoque é restaurado uma única vez.

### Solicitação durante preparação

- [ ] Em `em_preparacao`, cliente vê opção de solicitar cancelamento.
- [ ] Solicitação aparece para o lojista.
- [ ] Lojista consegue recusar com justificativa.
- [ ] Cliente visualiza a justificativa da recusa.
- [ ] Em outro pedido, lojista consegue aceitar a solicitação.
- [ ] Pedido aprovado para cancelamento passa para `cancelado`.
- [ ] Estoque é restaurado uma única vez.
- [ ] Pedido com solicitação pendente não pode ser enviado antes da decisão.

## 4. Avaliações

- [ ] Pedido `entregue` libera avaliação para o cliente.
- [ ] Cliente envia nota de 1 a 5 estrelas.
- [ ] Comentário opcional é salvo corretamente.
- [ ] A mesma combinação pedido/produto não gera avaliação duplicada.
- [ ] Média e total de avaliações aparecem na loja pública.
- [ ] Distribuição por estrelas aparece corretamente.
- [ ] Avaliação aparece em `avaliacoes-loja.html` para o proprietário.
- [ ] Lojista publica uma resposta.
- [ ] Resposta aparece publicamente junto da avaliação.
- [ ] Lojista consegue atualizar a própria resposta.

## 5. Regressão rápida das funcionalidades já validadas

Esses fluxos já passaram anteriormente, mas devem receber uma checagem rápida antes do merge final caso alguma correção posterior tenha tocado arquivos compartilhados.

- [ ] Produto ativo pode ser desativado sem exclusão física.
- [ ] Produto inativo desaparece do catálogo público.
- [ ] Produto pode ser reativado.
- [ ] Upload/troca de imagem própria continua funcionando.
- [ ] Dashboard ADM continua aprovando/rejeitando/suspendendo lojas.
- [ ] Paginação continua funcionando nas listagens principais.
- [ ] Alertas e histórico de estoque continuam carregando.

## Critério para encerrar o MVP

O MVP Fase 1 pode ser considerado funcionalmente concluído quando:

1. todos os testes críticos das seções 1 a 4 estiverem aprovados;
2. não houver regressão crítica na seção 5;
3. a PR de fechamento estiver mergeável e sem alterações não revisadas;
4. a documentação de progresso for atualizada com o resultado final.
