# Testes — Aprovação de Lojas e Dashboard Administrativo

**Projeto:** Comércio da Cidade — Marketplace Multi-Lojas  
**Origem:** `feat/aprovacao-lojas-admin` — integrada na `main`  
**PRD:** RF-13 e RF-23  
**Migration:** `20260821130500_aprovacao_lojas_admin.sql`

## Objetivo

Garantir que uma nova loja não seja publicada automaticamente. A loja nasce como `pendente`, somente um administrador pode aprovar/rejeitar/suspender, e o catálogo público só exibe lojas aprovadas e ativas.

## Implementado

### Banco de dados e segurança

- `lojas.status_aprovacao`: `pendente`, `aprovada`, `rejeitada` ou `suspensa`;
- `lojas.aprovado_em`;
- `lojas.aprovado_por`;
- `lojas.motivo_rejeicao`;
- trigger impede o proprietário de alterar campos de aprovação;
- nova loja criada por usuário comum é forçada para `pendente` e `ativa = false`;
- lojas anteriores à migration foram preservadas como `aprovada`;
- público só visualiza loja com `status_aprovacao = 'aprovada'` e `ativa = true`;
- produtos de loja pendente/rejeitada/suspensa não aparecem no catálogo público;
- checkout autenticado rejeita produtos de loja indisponível, inclusive carrinho antigo;
- histórico auditável em `historico_status_lojas`;
- RPCs administrativas validam `profiles.tipo_usuario = 'admin'` e conta ativa;
- helper interno de autorização não é executável pelo navegador.

### Dashboard administrativo

Arquivos:

- `admin-dashboard.html`;
- `css/admin-dashboard.css`;
- `js/admin-dashboard.js`.

Recursos:

- métricas de usuários, lojas, pendências e pedidos;
- busca por loja, proprietário, cidade e categoria;
- filtro por status;
- aprovação de loja;
- rejeição com motivo obrigatório;
- suspensão com motivo obrigatório;
- reabertura para análise;
- detalhes da loja;
- histórico das decisões administrativas;
- proteção contra acesso de usuário não-admin.

### Painel do lojista

Arquivos:

- `js/painel-loja-aprovacao.js`;
- `css/painel-loja-aprovacao.css`.

O painel passa a explicar ao lojista se a loja está pendente, aprovada, rejeitada ou suspensa. Em rejeição/suspensão, o motivo administrativo é exibido.

### Login

- `js/login-admin-redirect.js` direciona perfil administrador para `admin-dashboard.html` após login;
- usuário comum continua no fluxo normal.

## Validação estrutural concluída

- ✅ 5 lojas já existentes permaneceram `aprovada` e `ativa = true`;
- ✅ `anon` não executa `sou_admin`;
- ✅ `authenticated` pode chamar `sou_admin`, mas a função só retorna verdadeiro para perfil admin ativo;
- ✅ `anon` não executa `alterar_status_loja_admin`;
- ✅ RPC de alteração de status verifica a função interna de autorização;
- ✅ helper `_usuario_e_admin` não é executável por `authenticated`;
- ✅ policy pública de `lojas` exige loja aprovada e ativa;
- ✅ policy pública de `produtos` exige produto ativo de loja aprovada/ativa, preservando visão do proprietário sobre seus próprios produtos.

## Testes funcionais

A conta **Administrador Comércio da Cidade** foi criada e promovida para `tipo_usuario = 'admin'` exclusivamente para os testes administrativos.

| Caso | Resultado |
|---|---|
| Usuário comum cria nova loja | ✅ Aprovado |
| Nova loja fica `pendente` e `ativa = false` | ✅ Aprovado — confirmado no banco |
| Loja pendente não aparece na home | ⏳ Pendente de confirmação específica no navegador |
| Produtos da loja pendente não aparecem publicamente | ⏳ Pendente |
| Proprietário continua vendo a própria loja e produtos | ⏳ Pendente |
| Painel do lojista mostra aviso “aguardando aprovação” | ⏳ Pendente |
| Proprietário não consegue se autoaprovar | ⏳ Pendente funcional — proteção estrutural validada |
| Usuário comum não acessa dashboard admin | ⏳ Pendente |
| Admin faz login e vai ao dashboard | ✅ Aprovado |
| Admin vê métricas e lista de lojas | ⏳ Pendente de validação completa |
| Admin aprova loja pendente pelo botão do dashboard | ⏳ Pendente — nesta rodada a aprovação foi aplicada diretamente no banco com autorização do responsável pelo projeto |
| Fluxo de status `pendente` → `aprovada` ativa a loja | ✅ Aprovado |
| Loja aprovada passa a aparecer na home | ✅ Aprovado — confirmado no navegador |
| Admin rejeita loja informando motivo | ⏳ Pendente |
| Lojista vê motivo da rejeição | ⏳ Pendente |
| Admin suspende loja aprovada | ✅ Aprovado — confirmado no dashboard e no banco |
| Loja suspensa desaparece do catálogo | ✅ Aprovado — confirmado no navegador |
| Checkout bloqueia carrinho antigo de loja suspensa | ⏳ Pendente |
| Histórico administrativo registra as mudanças | ✅ Aprovado — aprovação e suspensão confirmadas no banco |

## Fluxos validados nesta rodada

Fluxo de publicação:

`cadastro da loja` → `pendente / inativa` → `aprovada / ativa` → `visível na home`

Fluxo de suspensão:

`aprovada / ativa` → `suspensa / inativa` → `removida do catálogo público`

A aprovação inicial da loja de teste foi executada diretamente no banco, com autorização explícita do responsável pelo projeto, registrando `aprovado_por` e o histórico administrativo. Por isso, o comportamento do **botão Aprovar do dashboard** ainda precisa de um teste funcional separado. A suspensão, por outro lado, foi executada pelo dashboard e validada no banco e no catálogo público.

## Situação

A funcionalidade já foi integrada na `main`. Os fluxos principais de cadastro, aprovação/publicação e suspensão/remoção pública foram validados. Permanecem testes complementares de aprovação pelo botão do dashboard, rejeição, reabertura, bloqueio de usuário comum, visibilidade de produtos e bloqueio de checkout com carrinho antigo.
