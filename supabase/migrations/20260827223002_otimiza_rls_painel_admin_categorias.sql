-- Evita políticas permissivas duplicadas para SELECT, mantendo uma única
-- expressão por papel e operação nas tabelas usadas pelo painel de categorias.

drop policy if exists "Categorias de produtos ativas são públicas"
  on public.categorias_produtos;
drop policy if exists "Administradores gerenciam categorias de produtos"
  on public.categorias_produtos;

create policy "Categorias de produtos ativas são públicas"
on public.categorias_produtos
for select
to anon
using (ativa = true);

create policy "Categorias autenticadas ativas ou administradas"
on public.categorias_produtos
for select
to authenticated
using (
  ativa = true
  or (select public.sou_admin())
);

create policy "Administradores criam categorias de produtos"
on public.categorias_produtos
for insert
to authenticated
with check ((select public.sou_admin()));

create policy "Administradores atualizam categorias de produtos"
on public.categorias_produtos
for update
to authenticated
using ((select public.sou_admin()))
with check ((select public.sou_admin()));

create policy "Administradores excluem categorias de produtos"
on public.categorias_produtos
for delete
to authenticated
using ((select public.sou_admin()));

drop policy if exists "Catálogo público e produtos do proprietário"
  on public.produtos;
drop policy if exists "Administradores visualizam todos os produtos"
  on public.produtos;

create policy "Catálogo público de produtos"
on public.produtos
for select
to anon
using (
  ativo = true
  and exists (
    select 1
    from public.lojas loja
    where loja.id = produtos.loja_id
      and loja.ativa = true
      and loja.status_aprovacao = 'aprovada'
  )
);

create policy "Produtos visíveis ao usuário autenticado"
on public.produtos
for select
to authenticated
using (
  (
    ativo = true
    and exists (
      select 1
      from public.lojas loja
      where loja.id = produtos.loja_id
        and loja.ativa = true
        and loja.status_aprovacao = 'aprovada'
    )
  )
  or exists (
    select 1
    from public.lojas loja
    where loja.id = produtos.loja_id
      and loja.proprietario_id = (select auth.uid())
  )
  or (select public.sou_admin())
);
