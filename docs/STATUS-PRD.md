# Status de Implementação do PRD

**Projeto:** Comércio da Cidade — Marketplace Multi-Lojas  
**PRD:** `PRD-Marketplace.md` — versão 1.0
**Branch de referência:** `main`
**Atualizado em:** 25/08/2026

Este documento compara o PRD com o código, as migrations e os testes atualmente versionados. Ele substitui a auditoria inicial, que não representava mais o estado da `main` após as PRs de conclusão do MVP, aprovação de lojas, estoque, paginação e hardening.

## Legenda

- ✅ **Concluído e validado** — fluxo principal implementado e testado.
- 🟡 **Parcial** — existe implementação útil, mas ainda falta parte do PRD ou teste de ponta a ponta.
- ❌ **Pendente** — funcionalidade principal ainda não existe.
- 🔵 **Fora do MVP atual** — previsto para uma fase posterior no roadmap.

## Resumo executivo

| Classificação | Quantidade |
|---|---:|
| ✅ Concluído e validado | 2 |
| 🟡 Parcial | 17 |
| ❌ Pendente | 4 |
| 🔵 Fora do MVP atual | 4 |
| **Total** | **27** |

O núcleo do marketplace já funciona: autenticação, perfil, lojas, aprovação administrativa, produtos, estoque, carrinho multi-loja, checkout autenticado, pedidos, cancelamento, avaliações e histórico. A conclusão formal do MVP depende principalmente de testes de regressão e de fechar as lacunas listadas abaixo.

## Requisitos funcionais

| Requisito | Status | Estado atual e pendências |
|---|---|---|
| **RF-01 — Cadastro de Usuário** | 🟡 | Cadastro com Supabase Auth, confirmação de e-mail e perfil Cliente padrão. A senha agora exige 8 caracteres, uma letra e um número. Falta validar novamente o e-mail real de confirmação. |
| **RF-02 — Login** | 🟡 | Login persistente e redirecionamento por perfil: cliente → perfil, lojista → painel e admin → dashboard. Conta excluída é bloqueada. Falta um fluxo administrativo genérico de bloqueio/desbloqueio. |
| **RF-03 — Recuperação de Senha** | 🟡 | Solicitação, callback e nova senha implementados com os mesmos requisitos do cadastro. Falta teste final com e-mail real e Redirect URLs de produção. |
| **RF-04 — Perfil** | ✅ | Nome, telefone, foto, múltiplos endereços, endereço padrão e exclusão lógica da conta implementados e validados. |
| **RF-05 — Pesquisa** | 🟡 | Busca de lojas, catálogo global de produtos, filtros por categoria/loja/disponibilidade, ordenação e paginação server-side implementados. Faltam full-text com relevância, autocomplete e página global de categoria. |
| **RF-06 — Categorias** | 🟡 | Categorias de lojas e produtos existem. Faltam subcategorias, página global de categoria e gestão de destaques pelo admin. |
| **RF-07 — Favoritos** | ❌ | Ainda não há tabela, página ou fluxo de favoritos. |
| **RF-08 — Carrinho** | 🟡 | Agrupamento por loja, quantidades, estoque e persistência local. Faltam persistência por usuário autenticado e frete estimado por loja. |
| **RF-09 — Checkout** | 🟡 | Checkout autenticado, pagamento manual, endereço salvo e RPC segura que gera pedidos por loja. Faltam cupons e cálculo real de frete. |
| **RF-10 — Pedidos do Cliente** | 🟡 | Lista, detalhes, rastreio, cancelamento direto/solicitado e confirmação de recebimento implementados. Falta concluir regressão autenticada completa. |
| **RF-11 — Avaliações** | 🟡 | Cliente avalia compra entregue e lojista responde publicamente por RPC protegida. Falta concluir a validação pública ponta a ponta. |
| **RF-12 — Histórico** | 🟡 | Filtros por período/loja, paginação e Comprar novamente implementados. Falta executar todo o checklist de regressão. |
| **RF-13 — Cadastro da Loja** | 🟡 | Cadastro com categoria, contato, endereço, horários e logo; loja nasce pendente e inativa. Faltam CPF/CNPJ, banner e documentos. |
| **RF-14 — Dashboard do Lojista** | 🟡 | Métricas simples, produtos, pedidos, aprovação e alertas de estoque. Faltam gráficos, avaliação média e relatórios avançados. |
| **RF-15 — Cadastro de Produtos** | 🟡 | Cadastro/edição, categoria, preço promocional, estoque, imagem e ativação/desativação. Faltam SKU, peso, dimensões, múltiplas imagens e duplicação. |
| **RF-16 — Estoque** | ✅ | Quantidade, limite configurável, alertas, baixa/devolução automática e histórico de movimentações protegidos por RLS. |
| **RF-17 — Promoções** | 🔵 | Existe preço promocional simples. Sistema de campanhas e vigência pertence à v1.1. |
| **RF-18 — Cupons** | 🔵 | Previsto para v1.1. |
| **RF-19 — Relatórios** | 🔵 | Estatísticas simples existem; relatórios avançados e CSV pertencem à v1.1. |
| **RF-20 — Pedidos do Lojista** | 🟡 | Filtros, transições seguras, rastreio e resposta às solicitações de cancelamento. Falta regressão autenticada completa. |
| **RF-21 — Clientes do Lojista** | ❌ | Ainda não existe tela consolidada de clientes da loja. |
| **RF-22 — Gestão de Usuários Admin** | ❌ | O dashboard contabiliza usuários, mas não oferece listagem, bloqueio e gestão de papéis. |
| **RF-23 — Gestão de Lojas Admin** | 🟡 | Listagem, busca, filtros, detalhes, aprovação, rejeição, suspensão e histórico. Falta edição administrativa completa dos dados da loja. |
| **RF-24 — Gestão de Categorias Admin** | ❌ | Ainda não existe CRUD administrativo de categorias e subcategorias. |
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

## Correções e evoluções realizadas em 24–25/08/2026

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

## Pendências prioritárias do MVP

1. Testar recuperação de senha com e-mail real e URLs de produção.
2. Executar regressão completa de checkout, estoque, cancelamento e pedidos.
3. Finalizar testes de aprovação/rejeição/reabertura pelo dashboard.
4. Implementar página global de categoria e autocomplete da pesquisa.
5. Gerar uma baseline oficial do schema remoto com `supabase db pull`.
6. Adicionar testes automatizados para os fluxos críticos.

## Versionamento do banco

As 13 migrations incrementais registradas no Supabase estão versionadas no repositório. Elas começam depois da criação manual das tabelas principais, portanto ainda falta uma baseline inicial reproduzível.

Essa baseline não deve ser escrita manualmente nem aplicada como uma migration comum sobre o banco existente. O procedimento seguro está documentado em `docs/REPRODUCAO-SUPABASE.md` e deve usar o schema real gerado pelo Supabase CLI.

---

Este arquivo deve ser atualizado sempre que um bloco funcional for integrado. Um requisito só muda para ✅ depois da validação do fluxo principal correspondente.
