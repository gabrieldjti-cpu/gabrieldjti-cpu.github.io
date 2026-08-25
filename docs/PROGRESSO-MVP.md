# Progresso do MVP

**Projeto:** Comércio da Cidade — Marketplace Multi-Lojas  
**Branch:** `main`  
**Base:** `main`  
**Referência:** `PRD-Marketplace.md`

Este documento registra o avanço posterior à auditoria inicial de `docs/STATUS-PRD.md`.
Um requisito só deve ser tratado como totalmente concluído depois dos testes funcionais correspondentes.

## Implementado

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

**Situação:** implementação pronta; falta confirmar Redirect URLs e executar teste real de e-mail/recuperação.

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

### RF-04 — Perfil ✅ CONCLUÍDO

#### Múltiplos endereços

Implementado e validado:

- tabela `enderecos_cliente`;
- adicionar, editar e excluir endereço por soft delete;
- definir e trocar endereço padrão;
- no máximo um endereço padrão ativo por cliente;
- leitura somente dos próprios endereços;
- importação do endereço legado de `profiles`;
- endereço legado sem CEP/UF marcado como incompleto;
- sincronização do endereço padrão com os campos legados do perfil;
- gerenciamento em `perfil.html`;
- cadastro/edição também dentro do checkout;
- checkout exige endereço completo;
- `pedidos.endereco_id` referencia o endereço selecionado;
- `pedidos.endereco_entrega` guarda snapshot do endereço da compra;
- edição posterior do endereço não altera pedidos antigos;
- `finalizar_checkout_endereco` valida propriedade e completude do endereço;
- RPC legado `finalizar_checkout` sem execução para `anon`/`authenticated`.

**Situação:** ✅ subfluxo de múltiplos endereços validado ponta a ponta em ambiente autenticado.

Testes aprovados:

1. criação;
2. edição mantendo o mesmo ID;
3. definição/troca do padrão;
4. único padrão ativo;
5. sincronização com `profiles`;
6. soft delete de endereço;
7. seleção no checkout;
8. pedido real com `endereco_id`;
9. snapshot em `endereco_entrega`;
10. snapshot preservado após editar endereço cadastrado.

#### Foto de perfil

Implementado:

- usa `profiles.foto_url` para armazenar o caminho do avatar;
- bucket `avatars` com limite de 5 MB;
- formatos JPEG, PNG e WebP;
- escrita restrita à pasta do usuário autenticado;
- upload, troca e remoção da foto dentro do perfil;
- avatar antigo é removido quando possível;
- remoção volta ao ícone padrão;
- atualização de `foto_url` ocorre pela RPC `atualizar_foto_perfil`.

Arquivos:

- `js/perfil-conta.js`;
- `css/perfil-conta.css`;
- `js/supabase.js`.

**Situação:** ✅ fluxo principal de foto de perfil validado no navegador e confirmado no banco.

Testes aprovados:

1. controles de foto aparecem no perfil;
2. upload de imagem válida;
3. avatar aparece após upload;
4. foto permanece após recarregar a página;
5. troca atualiza `foto_url`;
6. arquivo anterior é removido do Storage;
7. remoção da foto zera `foto_url`;
8. após remover, não sobra arquivo de avatar na pasta do usuário.

Testes negativos de arquivo acima de 5 MB e formato não permitido continuam recomendados para regressão, mas não bloqueiam o requisito.

#### Exclusão de conta por soft delete

Implementado:

- `profiles.ativo`;
- `profiles.excluido_em`;
- RPC autenticada `excluir_minha_conta`;
- perfil e histórico são preservados;
- endereços ativos são desativados;
- lojas pertencentes à conta são desativadas;
- foto deixa de ser referenciada pelo perfil;
- sessão é encerrada no frontend;
- carrinho e dados locais de loja são limpos;
- conta excluída é detectada após autenticação e desconectada automaticamente;
- confirmação destrutiva exige confirmação visual e digitação de `EXCLUIR`;
- `authenticated` não pode alterar diretamente `ativo`, `excluido_em`, `tipo_usuario` ou `foto_url`.

Migration:

- `supabase/migrations/20260820130058_rf04_foto_soft_delete_conta.sql`.

Validação funcional aprovada com conta descartável:

1. conta estava ativa antes do teste;
2. confirmação de exclusão executou o soft delete;
3. `profiles.ativo` passou para `false`;
4. `profiles.excluido_em` recebeu timestamp;
5. `foto_url` ficou `null`;
6. registro do usuário no Auth foi preservado;
7. sessão foi encerrada pelo frontend;
8. nova tentativa de login foi detectada como conta excluída, exibiu a mensagem correspondente e encerrou a sessão rapidamente.

Validação estrutural aprovada:

- colunas `ativo` e `excluido_em` existem;
- bucket `avatars` existe e possui limite de 5 MB;
- políticas de Storage restringem INSERT/UPDATE/DELETE à pasta do próprio usuário;
- `anon` não executa as RPCs de conta;
- `authenticated` executa `minha_conta_ativa`, `atualizar_foto_perfil` e `excluir_minha_conta`;
- `authenticated` pode editar os campos básicos permitidos do perfil;
- `authenticated` não possui `UPDATE` direto em `ativo`, `excluido_em` nem `foto_url`.

**Situação geral do RF-04:** ✅ **CONCLUÍDO no MVP.** Múltiplos endereços, foto de perfil e exclusão lógica de conta foram implementados e tiveram seus fluxos principais validados.

Checklist: `docs/TESTES-RF04-FOTO-CONTA.md`.

---

## Segurança e versionamento do Supabase

Hardening já aplicado:

- RLS habilitado em `categorias_produtos`;
- leitura pública limitada às categorias ativas;
- `finalizar_checkout` legado não é executável diretamente por `anon` nem `authenticated`;
- checkout autenticado passa pelo RPC `finalizar_checkout_endereco`;
- funções internas `handle_new_user` e `vincular_lojista_automatico` usam `search_path = public` e não ficam expostas para execução direta pela API;
- flags sensíveis do perfil não podem ser alteradas diretamente pelo navegador;
- upload de avatar fica isolado pela pasta do `auth.uid()`;
- nenhuma `service_role` foi adicionada ao frontend.

## Migrations aplicadas e registradas

1. `20260819174044_fluxo_seguro_pedidos.sql`
2. `20260819174110_avaliacoes_loja.sql`
3. `20260819174137_cancelamento_cliente.sql`
4. `20260819174150_evitar_trigger_cancelamento_duplicado.sql`
5. `20260819174202_historico_compras.sql`
6. `20260819174218_seguranca_supabase.sql`
7. `20260819175053_rf04_enderecos_cliente.sql`
8. `20260819180010_rf04_exigir_endereco_checkout.sql`
9. `20260820130058_rf04_foto_soft_delete_conta.sql`
10. `20260821130500_aprovacao_lojas_admin.sql`
11. `20260822120000_rf16_alertas_estoque.sql`
12. `20260822153500_hardening_rls_indices.sql`
13. `20260822155000_otimiza_policies_rls.sql`

## Próximas prioridades do MVP

As prioridades antigas de aprovação de lojas, estoque baixo, paginação e hardening já foram integradas à `main`.

Prioridades atuais:

1. concluir os testes autenticados de checkout, cancelamento e ciclo de pedidos;
2. validar recuperação de senha com e-mail real e Redirect URLs de produção;
3. finalizar os testes complementares do dashboard administrativo;
4. implementar pesquisa global básica de produtos;
5. gerar a baseline oficial do schema remoto com `supabase db pull`;
6. iniciar testes automatizados dos fluxos críticos.

## Integração com `main`

A evolução realizada na branch `feat/concluir-mvp-prd` e as etapas posteriores de aprovação, estoque, paginação e hardening já foram integradas à `main`.

Ainda permanecem pendentes no MVP:

- recuperação de senha com e-mail real;
- testes autenticados completos de cliente/lojista;
- validação pública da resposta de avaliação;
- testes do RF-12;
- baseline inicial reproduzível do banco;
- pesquisa global básica de produtos.
