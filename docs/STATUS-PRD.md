# Status de Implementação do PRD

**Projeto:** Comércio da Cidade — Marketplace Multi-Lojas  
**PRD analisado:** `PRD-Marketplace.md` — versão 1.0, agosto de 2026  
**Branch de auditoria:** `feat/concluir-mvp-prd`  
**Objetivo deste documento:** comparar os requisitos oficiais do PRD com a implementação atualmente versionada no repositório.

## Legenda

- ✅ **Concluído** — requisito atendido integralmente no código versionado e com fluxo coerente de ponta a ponta.
- 🟡 **Parcial** — existe implementação relevante, mas ainda faltam partes previstas no PRD ou garantias de backend que não estão versionadas.
- ❌ **Pendente** — funcionalidade principal do requisito não está implementada no repositório atual.
- 🔵 **Fora do MVP atual** — requisito previsto no PRD, mas explicitamente priorizado para fase posterior pelo roadmap.

## Resumo executivo

| Classificação | Quantidade |
|---|---:|
| ✅ Concluído | 0 |
| 🟡 Parcial | 15 |
| ❌ Pendente | 8 |
| 🔵 Fora do MVP atual | 4 |
| **Total** | **27** |

> A contagem é propositalmente conservadora. O projeto já possui vários fluxos funcionais importantes, porém nenhum RF foi marcado como integralmente concluído quando o PRD exige partes que ainda não existem ou quando a segurança server-side depende de RPCs/policies que não estão versionadas neste repositório.

## Requisitos Funcionais

| Requisito | Status | Implementação atual | O que falta |
|---|---|---|---|
| **RF-01 — Cadastro de Usuário** | 🟡 Parcial | `cadastro.html`/`js/cadastro.js` usam Supabase Auth `signUp`, validam e-mail, confirmam senha e tratam confirmação de e-mail. | O código aceita senha com mínimo de 6 caracteres; o PRD exige 8 caracteres com letras e números. Falta também o fluxo explícito de perfil inicial Cliente/conversão para Lojista. |
| **RF-02 — Login** | 🟡 Parcial | `js/login.js` usa `signInWithPassword` e trata credenciais inválidas, e-mail não confirmado e limite de tentativas. | O redirecionamento atual vai para `perfil.html`; falta redirecionamento por role (cliente/lojista/admin) e tratamento específico de conta bloqueada. |
| **RF-03 — Recuperação de Senha** | ❌ Pendente | Não foram encontrados `recuperar-senha.html`, página de nova senha ou uso de `resetPasswordForEmail`. | Implementar solicitação de recuperação, callback/redefinição e validação de senha conforme RF-01. |
| **RF-04 — Perfil** | 🟡 Parcial | `perfil.html`/`js/perfil.js` permitem visualizar e editar nome, telefone e um endereço simples no próprio profile. | Falta foto/avatar, múltiplos endereços com CRUD e endereço padrão, além de exclusão de conta por soft delete. |
| **RF-05 — Pesquisa** | 🟡 Parcial | A home possui busca local de lojas e a página da loja possui busca textual simples de produtos. | Falta full-text no PostgreSQL, autocomplete, ordenações e filtros combináveis. O roadmap deixa as melhorias avançadas de busca para v1.1, mas a busca base do MVP ainda é limitada. |
| **RF-06 — Categorias** | 🟡 Parcial | Categorias de lojas e `categorias_produtos` são usadas no cadastro e exibição. | Falta hierarquia/subcategorias, página de categoria paginada/filtrável e gestão de destaques pelo administrador. |
| **RF-07 — Favoritos** | ❌ Pendente | Não há página, script ou fluxo de favoritos versionado. | Implementar marcar/desmarcar, página Meus Favoritos e mover ao carrinho. |
| **RF-08 — Carrinho** | 🟡 Parcial | `js/carrinho.js` agrupa itens por loja, persiste no `localStorage`, controla quantidade, mostra estoque e calcula totais. | Para cliente autenticado, o PRD prevê persistência associada ao usuário. Falta também frete estimado por loja. |
| **RF-09 — Checkout** | 🟡 Parcial | `js/checkout.js` agrupa por loja, exige autenticação, coleta entrega/pagamento manual e chama a RPC `finalizar_checkout`. | Falta seleção de endereço salvo, cupons, frete/desconto no resumo e código SQL versionado da RPC para auditoria integral. |
| **RF-10 — Pedidos do Cliente** | 🟡 Parcial | `js/meus-pedidos.js` lista os status oficiais, mostra itens/valores/rastreio, exibe cancelamento já ocorrido e permite ao cliente confirmar recebimento via `confirmar_entrega_cliente`. | Falta o cliente solicitar/cancelar pedido conforme regra de negócio, inclusive o fluxo de solicitação após `em_preparacao`. |
| **RF-11 — Avaliações** | 🟡 Parcial | Cliente avalia pedido entregue com 1–5 estrelas e comentário via `avaliar_produto_cliente`. A loja pública mostra média, distribuição/listagem de avaliações e resposta quando existente. | Falta interface do lojista para listar e responder avaliações. As RPCs de avaliação também não estão versionadas para revisão de segurança. |
| **RF-12 — Histórico** | 🟡 Parcial | Perfil mostra compras recentes e `meus-pedidos.html` lista pedidos do cliente. | Falta filtro por período/loja e a ação Comprar Novamente com validação de disponibilidade, estoque e preço atual. |
| **RF-13 — Cadastro da Loja** | 🟡 Parcial | `cadastrar-loja.html`/`js/cadastrar-loja.js` cadastram nome, categoria, contato, endereço, horários e logo. | Falta CPF/CNPJ, banner/documentos e fluxo de aprovação. Atualmente o cadastro grava `ativa: true`, contrariando o estado inicial `pendente` previsto no PRD. |
| **RF-14 — Dashboard do Lojista** | 🟡 Parcial | `painel-loja` mostra total de produtos, pedidos, total de vendas e itens/pedidos recentes. | Falta vendas do dia/mês, pedidos aguardando ação, estoque baixo, média de avaliações, gráficos e atalhos para áreas futuras. O painel atual também contém um fluxo de status inseguro que precisa ser substituído pela lógica da PR #2. |
| **RF-15 — Cadastro de Produtos** | 🟡 Parcial | Cadastro/edição possui nome, descrição, categoria, preço, promocional, estoque, imagem, ativo e destaque, com upload ao Storage. | Falta SKU, peso/dimensões, múltiplas imagens e duplicar produto. A exclusão atual é física; a regra de negócio determina desativação quando há histórico associado. |
| **RF-16 — Estoque** | 🟡 Parcial | Existe quantidade por produto, limite de quantidade no carrinho e checkout por RPC. O fluxo de cancelamento do lojista chama RPC específica e espera restauração de estoque. | Falta limite configurável de estoque baixo, alertas e histórico de movimentações. O SQL de baixa/restauração não está versionado para auditoria. |
| **RF-17 — Promoções** | 🔵 Fora do MVP atual | Há suporte simples a `preco_promocional` e exibição de preço promocional. | O sistema completo de promoções com tipo de desconto, aplicação por produto/loja e vigência pertence à v1.1 no roadmap. |
| **RF-18 — Cupons** | 🔵 Fora do MVP atual | Não há gestão/aplicação de cupons no fluxo atual. | Implementação completa prevista para v1.1 conforme roadmap. |
| **RF-19 — Relatórios** | 🔵 Fora do MVP atual | O painel possui estatísticas básicas, mas não relatórios por período/produto/categoria. | Relatórios avançados e CSV são priorizados para v1.1. |
| **RF-20 — Pedidos do Lojista** | 🟡 Parcial | `pedidos-loja.js` lista, filtra/pesquisa pedidos, usa `atualizar_status_pedido_loja`, exige rastreio para envio e não oferece `enviado → entregue`. Também possui cancelamento do lojista por RPC. | Falta aceite/recusa da solicitação de cancelamento do cliente. `painel-loja.js` na `main` ainda altera `pedidos.status` diretamente e permite fluxo indevido até `entregue`; a correção da PR #2 ainda não está integrada nesta branch. A listagem usa `.limit(200)` em vez de paginação. |
| **RF-21 — Clientes do Lojista** | ❌ Pendente | Não há tela específica de clientes da loja. | Implementar clientes que já compraram, histórico consolidado e exposição mínima de dados. |
| **RF-22 — Gestão de Usuários Admin** | ❌ Pendente | Não foram encontradas páginas administrativas de usuários. | Listagem/filtros, bloqueio/desbloqueio e gestão de role com segurança administrativa. |
| **RF-23 — Gestão de Lojas Admin** | ❌ Pendente | Não existe área administrativa de gestão de lojas. | Listagem por status, edição/suspensão e controles administrativos. |
| **RF-24 — Gestão de Categorias Admin** | ❌ Pendente | Categorias são consumidas pelo front-end, mas não há CRUD administrativo. | CRUD de categorias/subcategorias e ordenação/destaques. |
| **RF-25 — Aprovação de Lojas** | ❌ Pendente | Não existe fila/admin de aprovação; loja nova é criada ativa. | Criar status de solicitação, fila de pendentes, aprovação/rejeição com justificativa e bloqueio de catálogo enquanto não aprovada. |
| **RF-26 — Moderação** | 🔵 Fora do MVP atual | Não há moderação/admin de denúncias. | O roadmap prioriza moderação para v1.1. |
| **RF-27 — Dashboard Administrativo** | ❌ Pendente | Não existe dashboard de administrador versionado. | Implementar ao menos o dashboard simples exigido no MVP: métricas globais e lojas pendentes; métricas avançadas podem evoluir depois. |

## Requisitos Não Funcionais

| Categoria | Status | Diagnóstico atual |
|---|---|---|
| **Segurança** | 🟡 Parcial | Supabase Auth é usado, o client global é `window.db` e várias ações críticas usam RPC. Porém as RPCs/policies/RLS não estão versionadas e `painel-loja.js` da `main` ainda atualiza status diretamente. A segurança de ponta a ponta ainda não pode ser comprovada pelo repositório. |
| **Performance** | 🟡 Parcial | Há lazy loading de imagens em várias telas. Falta paginação obrigatória acima de 20 itens; `pedidos-loja.js` carrega até 200 registros e outras listagens também podem crescer sem paginação. Não há evidência versionada de índices/caching previstos no PRD. |
| **Responsividade** | 🟡 Parcial | O projeto possui CSS separado por página e estrutura responsiva em várias telas, porém ainda não houve auditoria completa dos três breakpoints definidos no PRD. |
| **Acessibilidade** | 🟡 Parcial | Existem `aria-label`, `aria-hidden`, HTML semântico e `alt` em vários fluxos. Ainda falta auditoria WCAG 2.1 AA completa, foco/teclado e contraste em todas as telas críticas. |
| **SEO** | ❌ Pendente | As páginas usam URLs por arquivo/query string; não há evidência de URLs amigáveis, Schema.org, sitemap dinâmico ou meta tags dinâmicas por produto/loja. |
| **Escalabilidade** | 🟡 Parcial | Frontend estático + Supabase está alinhado à arquitetura geral. Porém a lógica permanece bastante acoplada aos scripts de página e as funções server-side não estão versionadas em `supabase/`. |
| **Disponibilidade** | ❌ Pendente | Não foi encontrada integração de monitoramento de erros (ex.: Sentry) nem instrumentação de SLA. |
| **Manutenibilidade** | 🟡 Parcial | Há componentes reutilizáveis (`header` e `feedback`) e arquivos separados por página. O PRD, entretanto, pede ES Modules e separação clara entre serviços de dados e UI; o projeto ainda usa scripts globais grandes. |

## Gaps mais importantes do MVP

A ordem abaixo segue o impacto no fluxo principal e o roadmap do PRD:

1. **Integrar o fluxo seguro da PR #2 no painel resumido do lojista.** A branch atual nasceu da `main`, onde `js/painel-loja.js` ainda faz `UPDATE` direto no status e permite o lojista chegar até `entregue`.
2. **Implementar cancelamento pelo cliente e solicitação após início da preparação.** Esse ponto fecha RF-10/RF-20 e a regra de negócio de devolução de estoque.
3. **Adicionar recuperação de senha (RF-03).** É requisito explícito do MVP de autenticação.
4. **Completar avaliações com resposta do lojista (RF-11).** O lado do cliente e a exibição pública já estão bem encaminhados.
5. **Criar aprovação básica de lojas e dashboard admin simples (RF-25/RF-27).** O cadastro atual ativa a loja imediatamente, em desacordo com o MVP.
6. **Completar histórico/Comprar Novamente (RF-12).** Validar produto ativo, estoque e preço atual.
7. **Evoluir perfil para múltiplos endereços (RF-04).** O modelo atual mantém apenas um endereço no profile.
8. **Adicionar estoque baixo e histórico de movimentação (RF-16).**
9. **Adicionar paginação nas listagens acima de 20 itens.** Começar por pedidos do lojista e pedidos do cliente.
10. **Revisar e versionar SQL/RPC/RLS.** Sem isso, as garantias de autorização existentes no Supabase remoto não são reproduzíveis pelo repositório.

## Divergências de modelo entre PRD e implementação

O PRD descreve uma arquitetura-alvo. O banco atual usa nomes diferentes em vários pontos, por exemplo:

- PRD: `lojas.dono_id`; implementação: `lojas.proprietario_id`.
- PRD: `lojas.nome_fantasia`; implementação: `lojas.nome`.
- PRD: `lojas.status`; implementação atual usa principalmente `ativa`.
- PRD: estoque em tabela própria; implementação atual mantém `produtos.estoque`.
- PRD: `pedidos.total`; implementação: `pedidos.valor_total`.
- PRD: endereço relacionado ao pedido; implementação atual guarda dados de entrega em `pedidos.observacoes` no checkout.

Essas diferenças **não devem gerar renomeações destrutivas automáticas**. O desenvolvimento deve priorizar comportamento e segurança, migrando estrutura apenas quando trouxer benefício claro e com migration compatível.

## Limitação de auditoria do banco

O frontend referencia RPCs importantes, entre elas:

- `finalizar_checkout`
- `atualizar_status_pedido_loja`
- `cancelar_pedido_loja`
- `confirmar_entrega_cliente`
- `avaliar_produto_cliente`
- RPCs de consulta pública de avaliações

Entretanto, não existe atualmente uma pasta versionada de migrations/functions/policies contendo as definições dessas rotinas. Portanto, este diagnóstico confirma **como o frontend chama o backend**, mas não declara como comprovadas as seguintes garantias sem o SQL correspondente:

- validação de `auth.uid()`;
- ownership do cliente/lojista;
- matriz de transições de status;
- obrigatoriedade de rastreio no banco;
- atomicidade de estoque;
- prevenção de restauração dupla;
- `SECURITY DEFINER`/`search_path`;
- `GRANT`/`REVOKE`;
- políticas RLS.

## Critério para considerar o MVP concluído

O MVP só deve ser tratado como concluído quando, no mínimo:

- autenticação inclui cadastro, login e recuperação de senha;
- lojas passam por aprovação básica antes de vender;
- produtos/categorias/estoque simples funcionam com segurança;
- busca básica e navegação por categoria funcionam;
- carrinho e checkout manual geram pedidos por loja de forma consistente;
- cliente e lojista conseguem completar o ciclo do pedido sem transições indevidas;
- cancelamento respeita a regra de negócio e restaura estoque com segurança;
- avaliações básicas incluem resposta pública do lojista;
- dashboards simples de lojista e admin existem;
- listagens grandes são paginadas;
- regras críticas de banco estão versionadas e reproduzíveis.

---

Este arquivo deve ser atualizado a cada bloco funcional concluído. Um requisito só deve mudar para ✅ quando todas as partes relevantes do PRD e suas regras críticas estiverem realmente atendidas.