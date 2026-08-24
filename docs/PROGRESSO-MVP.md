# Progresso do MVP

**Projeto:** Comércio da Cidade — Marketplace Multi-Lojas  
**Branch de validação atual:** `fix/autenticacao-mvp`  
**Referência:** `PRD-Marketplace.md`

Este documento registra o estado atual do MVP após as evoluções integradas à `main` e as correções finais de autenticação em validação.

## Escopo do MVP — Fase 1

Conforme o roadmap do PRD, o MVP precisa validar:

- autenticação (cadastro, login e recuperação de senha);
- cadastro e aprovação básica de lojas;
- cadastro de produtos, categorias e estoque simples;
- busca e navegação por categoria;
- carrinho e checkout com pagamento manual/simulado;
- gestão de pedidos para cliente e lojista;
- avaliações básicas.

---

## 1. Autenticação

### RF-01 — Cadastro

Implementado:

- cadastro por e-mail e senha com Supabase Auth;
- nome, e-mail e telefone;
- confirmação de senha;
- confirmação de e-mail;
- regra final do MVP: senha com no mínimo 8 caracteres, pelo menos uma letra e um número;
- dica visual da regra no cadastro.

**Situação:** implementação final pronta; falta validação funcional da nova regra antes do merge da PR atual.

### RF-02 — Login

Implementado:

- `signInWithPassword`;
- mensagens para credenciais inválidas, e-mail não confirmado, excesso de tentativas e falha de rede;
- proteção de conta excluída;
- redirecionamento por perfil:
  - administrador → `admin-dashboard.html`;
  - proprietário de loja → `painel-loja.html`;
  - cliente → `perfil.html`;
- ao identificar lojista, `loja_id` e `nome_loja` são sincronizados no `localStorage`.

**Situação:** implementação final pronta; falta validação dos três destinos antes do merge da PR atual.

### RF-03 — Recuperação de senha

Implementado:

- `recuperar-senha.html`;
- `nova-senha.html`;
- `js/recuperar-senha.js`;
- `js/nova-senha.js`;
- envio por `resetPasswordForEmail`;
- callback para `nova-senha.html`;
- suporte ao evento `PASSWORD_RECOVERY`;
- suporte a retorno por `code`/PKCE quando aplicável;
- nova senha com 8+ caracteres, letra e número;
- tratamento de link expirado/inválido;
- limpeza de tokens/parâmetros de autenticação da URL após reconhecimento;
- página de nova senha só é habilitada quando existe contexto real de recuperação.

**Configuração externa necessária:** a URL usada em `redirectTo` precisa estar autorizada em **Supabase Auth → URL Configuration**. A configuração será conferida durante o teste final com e-mail real.

**Situação:** código reforçado e pronto para validação final.

---

## 2. Perfil — RF-04 ✅ CONCLUÍDO

### Múltiplos endereços

Implementado e validado ponta a ponta:

- tabela `enderecos_cliente`;
- adicionar, editar e excluir por soft delete;
- endereço padrão;
- no máximo um padrão ativo;
- isolamento por usuário;
- cadastro/edição no perfil e checkout;
- checkout exige endereço completo;
- `pedidos.endereco_id` referencia o endereço escolhido;
- `pedidos.endereco_entrega` preserva snapshot histórico.

### Foto de perfil

Implementado e validado:

- bucket `avatars`;
- limite de 5 MB;
- JPEG, PNG e WebP;
- isolamento por usuário;
- upload, troca e remoção;
- persistência via `profiles.foto_url`.

### Exclusão de conta

Implementado e validado:

- soft delete em `profiles`;
- preservação de histórico;
- endereços e lojas desativados;
- sessão encerrada;
- nova tentativa de login bloqueada pelo guard do RF-04.

**Situação geral do RF-04:** ✅ concluído no MVP.

---

## 3. Lojas e administração ✅ MVP CONCLUÍDO

Implementado:

- cadastro de loja;
- estado de aprovação;
- fila administrativa;
- aprovação;
- rejeição com motivo;
- suspensão;
- histórico administrativo;
- catálogo público limitado a lojas ativas e aprovadas;
- dashboard administrativo básico;
- login administrativo redirecionado ao dashboard.

Validação funcional já realizada para aprovação, suspensão e retorno ao catálogo.

---

## 4. Produtos, categorias e estoque ✅ MVP CONCLUÍDO

Implementado:

- cadastro/edição de produtos;
- upload/troca de imagem;
- categorias de produto;
- preço e preço promocional;
- quantidade de estoque;
- ativação/desativação sem exclusão física;
- produto inativo sai do catálogo público e preserva histórico;
- estoque mínimo configurável;
- alertas de estoque baixo;
- histórico de movimentações;
- baixa automática no checkout;
- restauração automática em cancelamento;
- paginação nas principais listagens.

Fluxos principais de ativação/desativação, imagem e estoque foram validados.

---

## 5. Busca e navegação ✅ ADEQUADO AO MVP

Implementado:

- busca de lojas na home;
- filtro visual por categoria;
- busca de produtos dentro da loja;
- páginas públicas responsivas;
- paginação de catálogo.

Busca avançada full-text, autocomplete e filtros sofisticados continuam como evolução posterior e não bloqueiam o MVP da Fase 1.

---

## 6. Carrinho e checkout ✅ MVP CONCLUÍDO

Implementado:

- carrinho por loja;
- quantidades e validação de estoque;
- persistência local;
- endereço de entrega;
- forma de pagamento manual/simulada;
- checkout seguro por RPC;
- criação de pedidos e itens sem INSERT direto pelo navegador;
- snapshot do endereço da compra.

Validação funcional após hardening confirmou criação real de pedido e exibição em `meus-pedidos.html`.

---

## 7. Pedidos — RF-10 / RF-20

Fluxo implementado:

```text
aguardando_pagamento
→ pago
→ em_preparacao
→ enviado
→ entregue
```

Também implementado:

- lojista confirma pagamento;
- lojista inicia preparação;
- envio exige rastreio;
- somente cliente confirma entrega;
- cancelamento direto pelo cliente antes da preparação;
- solicitação de cancelamento durante preparação;
- lojista aceita ou recusa solicitação;
- envio bloqueado enquanto existe solicitação pendente;
- cancelamento restaura estoque uma única vez;
- pedido cancelado não volta a status ativo;
- operações críticas usam RPCs protegidas.

Já validado:

- checkout → pedido criado;
- `Pago` → `Em preparação` → `Enviado` pelo lojista;
- status `enviado` e rastreio confirmados no banco.

**Pendente apenas para a bateria final:** cancelamento direto, solicitação/aceite ou recusa e confirmação de entrega pelo cliente.

---

## 8. Avaliações — RF-11

Implementado:

- nota de 1 a 5 estrelas;
- comentário opcional de até 1000 caracteres;
- somente produto pertencente a pedido do próprio cliente;
- somente pedido `entregue` pode ser avaliado;
- uma avaliação por produto/pedido/cliente;
- média e distribuição pública;
- listagem pública de avaliações;
- marcação de compra verificada;
- painel do lojista para avaliações;
- resposta pública do lojista;
- lojista não pode excluir avaliação;
- autorização server-side confirma que a avaliação pertence a produto de sua loja.

**Pendente apenas para a bateria final:** confirmar no navegador o ciclo `entregue → avaliar → média pública → responder como lojista → resposta pública`.

---

## 9. Segurança do Supabase ✅ HARDENING CONCLUÍDO

Já aplicado e validado:

- RLS nas tabelas auditadas;
- escrita direta em `pedidos` e `itens_pedido` bloqueada;
- UPDATE direto de status de pedido bloqueado;
- exclusão física de lojas e produtos bloqueada no frontend autenticado;
- Storage de produtos isolado por proprietário;
- buckets de imagens limitados a 5 MB e JPEG/PNG/WebP;
- policies duplicadas removidas;
- grants excessivos removidos;
- foreign keys auditadas com índice de apoio;
- otimização de RLS com `(SELECT auth.uid())`;
- checkout, produto, imagem, pedido do lojista e ação administrativa retestados após o hardening.

Observações não bloqueantes:

- **Leaked Password Protection** ainda é uma configuração recomendada do Supabase Auth;
- a tabela legada vazia `teste` permanece sem primary key;
- índices recém-criados podem aparecer como não utilizados até acumularem tráfego.

---

## Situação geral

O código necessário para o **MVP Fase 1** está implementado.

A branch `fix/autenticacao-mvp` contém os últimos ajustes de autenticação e recuperação de senha. Antes do merge, será executada uma bateria final concentrada cobrindo:

1. regra de senha no cadastro;
2. login de cliente, lojista e administrador;
3. recuperação de senha com e-mail real;
4. cancelamento direto de pedido;
5. solicitação de cancelamento durante preparação e resposta do lojista;
6. confirmação de entrega pelo cliente;
7. avaliação após entrega;
8. resposta do lojista e exibição pública.

Se essa bateria final passar, o **MVP Fase 1 poderá ser marcado como concluído**.
