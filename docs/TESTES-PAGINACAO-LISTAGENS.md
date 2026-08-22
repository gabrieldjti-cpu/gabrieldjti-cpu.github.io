# Testes — Paginação das Listagens

**Projeto:** Comércio da Cidade — Marketplace Multi-Lojas  
**Branch:** `feat/paginacao-listagens`  
**Referência:** `PRD-Marketplace.md` e `docs/PROGRESSO-MVP.md`

## Objetivo

Evitar que as listagens principais cresçam indefinidamente na tela e manter a navegação confortável principalmente no celular.

A implementação foi feita em uma camada reutilizável, preservando os scripts e as regras de negócio já existentes.

## Páginas cobertas

| Página | Lista | Itens por página |
| --- | --- | ---: |
| `produtos.html` | Produtos do lojista | 6 |
| `loja.html` | Catálogo público da loja | 6 |
| `meus-pedidos.html` | Pedidos do cliente | 5 |
| `pedidos-loja.html` | Pedidos recebidos | 5 |
| `avaliacoes-loja.html` | Avaliações do lojista | 5 |
| `admin-dashboard.html` | Lojas do marketplace | 6 |

`historico-compras.html` não recebe esta extensão porque já possui paginação própria de 20 registros utilizando consulta paginada no Supabase.

## Comportamento esperado

- controles aparecem somente quando a quantidade de cards ultrapassa o limite da página;
- botões **Anterior** e **Próxima** respeitam início e fim;
- página atual é destacada;
- resumo informa faixa visível, quantidade total e número da página;
- ao trocar de página, a tela retorna suavemente ao início da lista;
- pesquisa e filtros existentes continuam funcionando;
- quando uma pesquisa/filtro recria a lista, a paginação volta para a página 1;
- ações existentes dentro dos cards continuam funcionando;
- layout permanece utilizável no celular.

## Validação funcional realizada

Em 22/08/2026, a paginação foi testada no navegador/celular na branch `feat/paginacao-listagens` e o fluxo principal foi aprovado.

Testes confirmados no fluxo principal:

- [x] `produtos.html` exibiu a segunda página quando a quantidade ultrapassou 6 produtos;
- [x] navegação entre páginas funcionou;
- [x] `loja.html` manteve o catálogo público funcional com paginação;
- [x] `pedidos-loja.html` manteve a listagem e navegação funcionais;
- [x] `admin-dashboard.html` exibiu a segunda página com a quantidade atual de lojas;
- [x] pesquisa/filtros continuaram funcionando após a paginação;
- [x] ações existentes nos cards continuaram funcionando após trocar de página;
- [x] controles ficaram utilizáveis no celular sem quebrar o layout.

## Casos condicionais / regressão recomendada

Estas telas já estão cobertas pelo mesmo módulo, mas continuam boas candidatas a regressão quando houver volume suficiente de dados reais:

- `meus-pedidos.html` com mais de 5 pedidos do mesmo cliente;
- `avaliacoes-loja.html` com mais de 5 avaliações;
- filtros que reduzam uma lista de várias páginas para apenas uma;
- exclusão/alteração de um registro enquanto o usuário estiver na última página.

## Observação técnica

Nesta etapa, a paginação adicional atua sobre os cards já carregados pelos scripts existentes. Isso foi escolhido para não reescrever fluxos sensíveis de pedidos, avaliações, carrinho e administração durante o fechamento do MVP.

O histórico de compras já possui paginação no servidor com `.range(...)`. Se o volume do marketplace crescer significativamente, as demais telas podem migrar em uma etapa posterior para paginação server-side sem mudar a experiência visual criada aqui.

## Situação

✅ **Validação funcional básica aprovada e implementação pronta para merge.**

A integração ainda depende de autorização explícita para mesclar a PR #11 na `main`.
