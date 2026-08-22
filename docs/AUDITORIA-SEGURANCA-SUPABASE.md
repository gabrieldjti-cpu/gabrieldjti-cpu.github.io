# Auditoria e Hardening do Supabase

**Projeto:** Comércio da Cidade — Marketplace Multi-Lojas  
**Branch:** `fix/hardening-rls-indices`  
**Escopo:** RLS, grants, Storage, integridade histórica e índices

## Objetivo

Fechar permissões herdadas das primeiras versões do projeto sem apagar dados e sem mudar as regras de negócio já validadas.

## Problemas encontrados

### 1. Escrita direta em pedidos e itens

Antes do hardening, `authenticated` possuía `INSERT` direto em `pedidos` e `itens_pedido`, e o lojista também possuía `UPDATE` direto em `pedidos`.

Isso permitia tentar contornar as RPCs que validam estoque, preço, status, endereço e autorização.

### 2. Exclusão física de loja e produto

O navegador ainda possuía permissão de `DELETE` em lojas e produtos.

Como existem relacionamentos históricos com `ON DELETE CASCADE`, uma exclusão física poderia apagar registros necessários para pedidos antigos.

### 3. Storage de produtos sem isolamento por proprietário

As policies antigas do bucket `produtos` verificavam apenas o bucket, sem validar o proprietário do arquivo.

### 4. Policies e grants herdados

Havia policies equivalentes/duplicadas e grants excessivos como `DELETE`, `TRUNCATE`, `REFERENCES` e `TRIGGER` em tabelas que não precisam dessas permissões no frontend.

### 5. Foreign keys sem índice de apoio

A auditoria encontrou relacionamentos sem índice cobrindo a coluna de foreign key.

## Correções aplicadas

### Pedidos

- `pedidos`: navegador autenticado ficou somente com `SELECT`;
- `itens_pedido`: navegador autenticado ficou somente com `SELECT`;
- removidas as policies de `INSERT` direto de pedido/item;
- removida a policy de `UPDATE` direto de pedido pelo lojista;
- checkout, mudança de status, cancelamento e confirmação continuam via RPCs `SECURITY DEFINER` com validação de `auth.uid()`.

Validação estrutural:

- `authenticated` pode inserir pedido direto: **false**;
- `authenticated` pode atualizar pedido direto: **false**;
- `authenticated` pode inserir item direto: **false**.

### Lojas

- removida a policy de `DELETE` físico pelo proprietário;
- `authenticated` continua podendo criar/editar a própria loja;
- aprovação/suspensão continua exclusiva do fluxo administrativo;
- `authenticated` pode excluir loja fisicamente: **false**.

### Produtos

- removidas policies antigas duplicadas de INSERT/UPDATE/DELETE;
- removida permissão de `DELETE` físico;
- criação e edição continuam disponíveis ao proprietário;
- o botão de exclusão da interface passa a executar `UPDATE ativo=false`;
- produto inativo permanece no banco e preserva referências de pedidos antigos;
- `authenticated` pode excluir produto fisicamente: **false**;
- `authenticated` pode editar produto: **true**.

### Profiles

- removidas três policies antigas equivalentes;
- acesso direto anônimo foi removido;
- privilégios desnecessários de `DELETE`, `TRUNCATE`, `REFERENCES` e `TRIGGER` foram revogados de `authenticated`;
- as colunas editáveis do perfil continuam protegidas pelos grants específicos já existentes.

### Storage

Bucket `produtos`:

- INSERT somente quando `owner_id = auth.uid()`;
- UPDATE somente pelo proprietário do objeto;
- DELETE somente pelo proprietário do objeto;
- SELECT público continua permitido porque imagens de catálogo são públicas.

Buckets `produtos` e `logos-lojas` agora possuem:

- limite de 5 MB;
- `image/jpeg`;
- `image/png`;
- `image/webp`.

`avatars` já possuía as mesmas restrições.

### Índices

Após a migration, todas as foreign keys auditadas no schema `public` possuem índice de apoio.

Foram adicionados índices para, entre outros:

- itens por pedido e produto;
- pedidos por cliente e loja;
- lojas por proprietário/categoria/aprovador;
- produto_imagens por produto;
- produtos por categoria;
- histórico e movimentações por usuário relacionado;
- resposta de cancelamento por responsável.

## Otimização de RLS

Uma segunda migration substituiu chamadas repetidas de `auth.uid()` por `(SELECT auth.uid())` nas policies relevantes.

Também foram unificadas:

- as duas policies SELECT de `lojas` em uma única regra: público vê loja aprovada/ativa e proprietário vê a própria loja;
- as duas policies SELECT de `pedidos` em uma única regra: cliente ou proprietário da loja pode visualizar.

Após essa otimização, o advisor de performance deixou de apontar:

- `auth_rls_initplan` nas policies ajustadas;
- `multiple_permissive_policies` em lojas e pedidos.

## Advisors do Supabase — avisos restantes

### Esperados / intencionais

O advisor de segurança ainda avisa sobre funções `SECURITY DEFINER` executáveis por `authenticated`.

Neste projeto isso é intencional para as RPCs de negócio, porque elas substituem escrita direta nas tabelas. As funções críticas verificam o usuário (`auth.uid()`), propriedade da loja/pedido, papel de administrador ou outras regras antes de escrever.

As duas RPCs públicas de avaliações também são intencionais porque a página pública da loja precisa consultar avaliações sem expor escrita pública na tabela `avaliacoes`.

### Informativos

- `historico_status_lojas` e `solicitacoes_cancelamento` têm RLS sem policy direta porque são acessadas pelas RPCs autorizadas;
- `teste` é uma tabela vazia antiga, bloqueada para `anon`/`authenticated`, mas ainda sem primary key;
- índices recém-criados aparecem como `unused_index` até acumularem uso real.

### Configuração de Auth ainda recomendada

O advisor informa que **Leaked Password Protection** está desativado. Essa configuração pertence ao Supabase Auth e não foi alterada nesta migration de banco.

## Dados preservados

A migration de hardening não removeu registros existentes.

Após a aplicação, continuavam presentes no banco:

- 8 pedidos;
- 11 itens de pedido;
- 25 produtos;
- 9 lojas;
- 20 objetos no bucket de produtos.

## Testes recomendados no navegador

- [ ] entrar como lojista e abrir `produtos.html`;
- [ ] confirmar que o botão aparece como **Desativar**, não **Excluir**;
- [ ] desativar um produto de teste;
- [ ] confirmar que o produto fica `Inativo` no painel;
- [ ] confirmar que ele desaparece do catálogo público;
- [ ] abrir a edição e reativar o produto;
- [ ] cadastrar um produto novo com imagem JPG/PNG/WebP menor que 5 MB;
- [ ] trocar/remover imagem de produto próprio;
- [ ] realizar um checkout normal como cliente;
- [ ] confirmar que o pedido aparece em `meus-pedidos.html`;
- [ ] confirmar que o lojista continua vendo e alterando o pedido pelas ações normais;
- [ ] abrir o dashboard admin e confirmar que aprovação/suspensão continuam funcionando.

## Migrations

- `supabase/migrations/20260822153500_hardening_rls_indices.sql`
- `supabase/migrations/20260822155000_otimiza_policies_rls.sql`

## Situação

**Hardening estrutural aplicado no Supabase e pronto para validação funcional básica no navegador antes do merge.**
