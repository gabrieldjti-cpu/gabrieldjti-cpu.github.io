# Status de Implementação do PRD

**Projeto:** Comércio da Cidade — Marketplace Multi-Lojas  
**PRD:** `PRD-Marketplace.md` — versão 1.0
**Branch de referência:** `main`
**Atualizado em:** 28/08/2026

Este documento compara o PRD com o código, as migrations e os testes atualmente versionados. Ele substitui a auditoria inicial, que não representava mais o estado da `main` após as PRs de conclusão do MVP, aprovação de lojas, estoque, paginação e hardening.

## Legenda

- ✅ **Concluído e validado** — fluxo principal implementado e testado.
- 🟡 **Parcial** — existe implementação útil, mas ainda falta parte do PRD ou teste de ponta a ponta.
- ❌ **Pendente** — funcionalidade principal ainda não existe.
- 🔵 **Fora do MVP atual** — previsto para uma fase posterior no roadmap.

## Resumo executivo

| Classificação | Quantidade |
|---|---:|
| ✅ Concluído e validado | 3 |
| 🟡 Parcial | 17 |
| ❌ Pendente | 3 |
| 🔵 Fora do MVP atual | 4 |
| **Total** | **27** |

O núcleo do marketplace já funciona: autenticação, perfil, lojas, aprovação administrativa, produtos, estoque, carrinho multi-loja, checkout autenticado, pedidos, cancelamento, avaliações e histórico. A conclusão formal do MVP depende principalmente de testes de regressão e de fechar as lacunas listadas abaixo.

## Requisitos funcionais

| Requisito | Status | Estado atual e pendências |
|---|---|---|
| **RF-01 — Cadastro de Usuário** | 🟡 | Cadastro com Supabase Auth, confirmação de e-mail e perfil Cliente padrão. A senha agora exige 8 caracteres, uma letra e um número. Falta validar novamente o e-mail real de confirmação. |
| **RF-02 — Login** | 🟡 | Login persistente e redirecionamento por perfil: cliente → perfil, lojista → painel e admin → dashboard. Conta excluída é bloqueada. Falta um fluxo administrativo genérico de bloqueio/desbloqueio. |
| **RF-03 — Recuperação de Senha** | ✅ | Solicitação, recebimento do e-mail, callback, definição de nova senha, login e recusa de link reutilizado validados em produção. |
| **RF-04 — Perfil** | ✅ | Nome, telefone, foto, múltiplos endereços, endereço padrão e exclusão lógica da conta implementados e validados. |
| **RF-05 — Pesquisa** | ✅ | Busca full-text, autocomplete, paginação server-side, filtros combináveis de categoria/loja/estoque/preço/nota e todas as ordenações do PRD implementados e validados no site. |
| **RF-06 — Categorias** | 🟡 | Hierarquia, filtros públicos, página de categoria e destaques configuráveis na home implementados. Falta validar em produção a nova gestão administrativa. |
| **RF-07 — Favoritos** | 🟡 | Tabela privada com RLS, coração nos catálogos, página Meus Favoritos, remoção e adição ao carrinho implementados. Falta validação no site publicado. |
| **RF-08 — Carrinho** | 🟡 | Agrupamento por loja, quantidades, estoque, persistência por usuário e frete fixo estimado por loja implementados. Visitantes continuam com armazenamento local e o carrinho é mesclado no login. Falta validar o frete no site publicado. |
| **RF-09 — Checkout** | 🟡 | Checkout autenticado, pagamento manual, endereço salvo, resumo de produtos/frete/total e RPC segura que gera pedidos por loja com snapshot dos valores. Faltam cupons e frete calculado por distância ou transportadora. |
| **RF-10 — Pedidos do Cliente** | 🟡 | Lista, detalhes, rastreio, cancelamento direto/solicitado e confirmação de recebimento implementados. Falta concluir regressão autenticada completa. |
| **RF-11 — Avaliações** | 🟡 | Cliente avalia compra entregue e lojista responde publicamente por RPC protegida. Falta concluir a validação pública ponta a ponta. |
| **RF-12 — Histórico** | 🟡 | Filtros por período/loja, paginação e Comprar novamente implementados. Falta executar todo o checklist de regressão. |
| **RF-13 — Cadastro da Loja** | 🟡 | Cadastro com categoria, contato, endereço, horários e logo; loja nasce pendente e inativa. Faltam CPF/CNPJ, banner e documentos. |
| **RF-14 — Dashboard do Lojista** | 🟡 | Métricas simples, produtos, pedidos, aprovação e alertas de estoque. Faltam gráficos, avaliação média e relatórios avançados. |
| **RF-15 — Cadastro de Produtos** | 🟡 | Cadastro/edição, categoria, subcategoria, preço promocional, estoque, imagem e ativação/desativação. Faltam SKU, peso, dimensões, múltiplas imagens e duplicação. |
| **RF-16 — Estoque** | ✅ | Quantidade, limite configurável, alertas, baixa/devolução automática e histórico de movimentações protegidos por RLS. |
| **RF-17 — Promoções** | 🔵 | Existe preço promocional simples. Sistema de campanhas e vigência pertence à v1.1. |
| **RF-18 — Cupons** | 🔵 | Previsto para v1.1. |
| **RF-19 — Relatórios** | 🔵 | Estatísticas simples existem; relatórios avançados e CSV pertencem à v1.1. |
| **RF-20 — Pedidos do Lojista** | 🟡 | Filtros, transições seguras, rastreio e resposta às solicitações de cancelamento. Falta regressão autenticada completa. |
| **RF-21 — Clientes do Lojista** | ❌ | Ainda não existe tela consolidada de clientes da loja. |
| **RF-22 — Gestão de Usuários Admin** | ❌ | O dashboard contabiliza usuários, mas não oferece listagem, bloqueio e gestão de papéis. |
| **RF-23 — Gestão de Lojas Admin** | 🟡 | Listagem, busca, filtros, detalhes, aprovação, rejeição, suspensão e histórico. Falta edição administrativa completa dos dados da loja. |
| **RF-24 — Gestão de Categorias Admin** | 🟡 | Painel com CRUD, busca, filtros, paginação, ativação, hierarquia e reordenação de destaques implementado com RLS. Falta validação no site publicado. |
| **RF-25 — Aprovação de Lojas** | 🟡 | Fluxo seguro de pendência, aprovação, rejeição, suspensão e reabertura implementado. Faltam documentos e notificação automática. |
| **RF-26 — Moderação** | 🔵 | Previsto para v1.1. |
| **RF-27 — Dashboard Administrativo** | 🟡 | Métricas globais básicas e gestão de lojas implementadas. Faltam GMV completo, ranking, disputas e módulos administrativos restantes. |

## Requisitos não funcionais

| Categoria | Status | Diagnóstico atual |
|---|---|---|
| **Segurança** | 🟢 Forte no MVP | RLS, grants mínimos, RPCs com autorização, isolamento de Storage e ausência de `service_role` no frontend. Leaked Password Protection ainda deve ser habilitada no Auth. |
| **Performance** | 🟡 | Lazy loading, índices de foreign keys e paginação visual. Listagens grandes ainda devem migrar para paginação server-side. |
| **Responsividade** | 🟡 | Todas as páginas possuem viewport e CSS responsivo; falta auditoria formal dos três breakpoints do PRD. |
| **Acessibilidade** | 🟡 | HTML semântico, labels, `alt` e ARIA em vários fluxos; falta auditoria WCAG 2.1 AA automatizada e manual. |
| **SEO** | ❌ | Apenas a home possui description. Faltam catálogo indexável, URLs amigáveis, Open Graph, canonical, Schema.org, sitemap e robots. |
| **Escalabilidade** | 🟡 | Frontend estático + Supabase é adequado ao MVP, mas scripts globais e paginação client-side limitam a evolução. |
| **Disponibilidade** | ❌ | Não há monitoramento de erros ou medição de SLA. |
| **Manutenibilidade** | 🟡 | Componentes e extensões reutilizáveis existem, mas os scripts principais ainda são globais e muito grandes. |

## Correções e evoluções realizadas em 24–27/08/2026

- exclusão física de produtos removida dos fluxos do painel e da listagem;
- desativação agora usa `UPDATE ativo=false` e preserva o histórico;
- cadastro alinhado à senha mínima de 8 caracteres com letra e número;
- redirecionamento após login alinhado aos perfis cliente, lojista e admin;
- checkout passa a chamar diretamente `finalizar_checkout_endereco`;
- removida a interceptação global de `window.db.rpc` no checkout;
- corrigida a prévia quebrada da logo no cadastro da loja;
- versão do `supabase-js` fixada para evitar atualização inesperada do CDN;
- catálogo global de produtos adicionado à home, respeitando produtos ativos, lojas aprovadas e RLS;
- busca global recebeu filtros, ordenação, paginação e acesso direto ao produto dentro da loja.
- autocomplete da busca global com sugestões de produtos, preço, loja e navegação por teclado.
- página global de categoria com lojas aprovadas, produtos ativos, filtros e navegação entre categorias.
- pesquisa migrada para `tsvector` em português com índices GIN, relevância e tolerância a erros via `pg_trgm`.
- categorias de produtos receberam auto-relacionamento, 39 subcategorias iniciais, filtros dependentes e seleção hierárquica no cadastro/edição.
- pesquisa recebeu faixa de preço efetivo, nota mínima e ordenações por vendas e avaliação.
- métricas públicas agregadas preservam a privacidade das avaliações, clientes e pedidos.
- painel administrativo de categorias e subcategorias com destaques dinâmicos na home, validação de hierarquia e permissões RLS exclusivas de admin.
- favoritos privados por usuário com coração nos catálogos, página própria, paginação e envio ao carrinho.
- carrinho persistido por conta autenticada, com mesclagem do carrinho visitante, isolamento entre usuários, sincronização pendente e RLS.
- taxa fixa de entrega configurável por loja, exibida no carrinho e checkout e gravada separadamente no pedido com recálculo seguro no servidor.

## Pendências prioritárias do MVP

1. Validar no site publicado o frete por loja no carrinho, checkout e detalhes do pedido.
2. Validar no site publicado o painel administrativo de categorias e os destaques da home.
3. Gerar uma baseline oficial do schema remoto com `supabase db pull`.
4. Adicionar testes automatizados para os fluxos críticos.
5. Validar no site publicado o fluxo completo de favoritos do RF-07.

## Versionamento do banco

As 21 migrations incrementais do projeto estão versionadas no repositório. Elas começam depois da criação manual das tabelas principais, portanto ainda falta uma baseline inicial reproduzível.

Essa baseline não deve ser escrita manualmente nem aplicada como uma migration comum sobre o banco existente. O procedimento seguro está documentado em `docs/REPRODUCAO-SUPABASE.md` e deve usar o schema real gerado pelo Supabase CLI.

---

Este arquivo deve ser atualizado sempre que um bloco funcional for integrado. Um requisito só muda para ✅ depois da validação do fluxo principal correspondente.
