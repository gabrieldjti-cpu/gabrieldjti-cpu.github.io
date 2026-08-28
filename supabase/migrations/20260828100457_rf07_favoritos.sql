-- RF-07: favoritos privados por cliente.

create table public.favoritos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profiles(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  criado_em timestamptz not null default now(),
  constraint favoritos_cliente_produto_key unique (cliente_id, produto_id)
);

comment on table public.favoritos is
  'Produtos favoritados por cada cliente. Os registros são privados e protegidos por RLS.';

create index favoritos_cliente_criado_em_idx
  on public.favoritos (cliente_id, criado_em desc);

create index favoritos_produto_id_idx
  on public.favoritos (produto_id);

alter table public.favoritos enable row level security;

revoke all on table public.favoritos from public, anon, authenticated;
grant select, insert, delete on table public.favoritos to authenticated;
grant all on table public.favoritos to service_role;

create policy "favoritos_select_proprios"
  on public.favoritos
  for select
  to authenticated
  using ((select auth.uid()) = cliente_id);

create policy "favoritos_insert_proprios"
  on public.favoritos
  for insert
  to authenticated
  with check ((select auth.uid()) = cliente_id);

create policy "favoritos_delete_proprios"
  on public.favoritos
  for delete
  to authenticated
  using ((select auth.uid()) = cliente_id);
