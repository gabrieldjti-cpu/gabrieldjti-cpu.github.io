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

## Testes recomendados

### 1. Produtos do lojista

Usar uma loja com mais de 6 produtos.

- [ ] abrir `produtos.html`;
- [ ] confirmar que aparecem no máximo 6 cards na primeira página;
- [ ] clicar em **Próxima** e confirmar os produtos restantes;
- [ ] voltar com **Anterior**;
- [ ] pesquisar um produto e confirmar que a lista filtrada continua correta;
- [ ] abrir **Editar** em um produto após trocar de página.

### 2. Catálogo público da loja

- [ ] abrir uma loja com mais de 6 produtos;
- [ ] confirmar paginação abaixo do catálogo;
- [ ] navegar para a segunda página;
- [ ] adicionar um produto dessa página ao carrinho;
- [ ] pesquisar um produto e confirmar que a paginação se adapta ao resultado.

### 3. Pedidos do cliente

Com uma conta que possua mais de 5 pedidos:

- [ ] abrir `meus-pedidos.html`;
- [ ] navegar entre as páginas;
- [ ] usar um filtro de status;
- [ ] abrir os detalhes de um pedido em uma página diferente da primeira.

### 4. Pedidos do lojista

Com uma loja que possua mais de 5 pedidos:

- [ ] abrir `pedidos-loja.html`;
- [ ] confirmar a segunda página;
- [ ] trocar filtro de status e confirmar retorno para a página 1;
- [ ] pesquisar e confirmar atualização da paginação;
- [ ] abrir detalhes de um pedido após navegar.

### 5. Avaliações

Quando existirem mais de 5 avaliações:

- [ ] navegar entre páginas;
- [ ] filtrar **Sem resposta** / **Respondidas**;
- [ ] responder uma avaliação e confirmar que a paginação continua funcional.

### 6. Dashboard administrativo

Com mais de 6 lojas:

- [ ] abrir `admin-dashboard.html`;
- [ ] confirmar segunda página;
- [ ] navegar entre as lojas;
- [ ] usar busca e filtro de status;
- [ ] abrir detalhes de uma loja após trocar de página;
- [ ] confirmar que Aprovar/Rejeitar/Suspender continuam funcionando.

### 7. Celular

- [ ] controles cabem na largura da tela;
- [ ] botões não se sobrepõem;
- [ ] troca de página posiciona a tela no início da lista;
- [ ] não há rolagem horizontal causada pela paginação.

## Observação técnica

Nesta etapa, a paginação adicional atua sobre os cards já carregados pelos scripts existentes. Isso foi escolhido para não reescrever fluxos sensíveis de pedidos, avaliações, carrinho e administração durante o fechamento do MVP.

O histórico de compras já possui paginação no servidor com `.range(...)`. Se o volume do marketplace crescer significativamente, as demais telas podem migrar em uma etapa posterior para paginação server-side sem mudar a experiência visual criada aqui.

## Situação

**Implementação pronta para validação funcional no navegador antes do merge.**
