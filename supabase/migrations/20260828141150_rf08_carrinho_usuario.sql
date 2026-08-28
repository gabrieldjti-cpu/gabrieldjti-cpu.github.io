-- RF-08: persistência do carrinho por usuário autenticado.

create table public.carrinho (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.profiles(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  quantidade integer not null default 1,
  adicionado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint carrinho_cliente_produto_key unique (cliente_id, produto_id),
  constraint carrinho_quantidade_check check (quantidade between 1 and 1000)
);

comment on table public.carrinho is
  'Itens do carrinho persistidos por usuário autenticado. Visitantes continuam usando localStorage.';

create index carrinho_produto_id_idx
  on public.carrinho (produto_id);

alter table public.carrinho enable row level security;

revoke all on table public.carrinho from public, anon, authenticated;
grant select, insert, update, delete on table public.carrinho to authenticated;
grant all on table public.carrinho to service_role;

create policy "carrinho_select_proprio"
  on public.carrinho
  for select
  to authenticated
  using ((select auth.uid()) = cliente_id);

create policy "carrinho_insert_proprio"
  on public.carrinho
  for insert
  to authenticated
  with check (
    (select auth.uid()) = cliente_id
    and exists (
      select 1
      from public.produtos produto
      join public.lojas loja on loja.id = produto.loja_id
      where produto.id = carrinho.produto_id
        and produto.ativo = true
        and produto.estoque > 0
        and loja.ativa = true
        and loja.status_aprovacao = 'aprovada'
    )
  );

create policy "carrinho_update_proprio"
  on public.carrinho
  for update
  to authenticated
  using ((select auth.uid()) = cliente_id)
  with check (
    (select auth.uid()) = cliente_id
    and exists (
      select 1
      from public.produtos produto
      join public.lojas loja on loja.id = produto.loja_id
      where produto.id = carrinho.produto_id
        and produto.ativo = true
        and produto.estoque > 0
        and loja.ativa = true
        and loja.status_aprovacao = 'aprovada'
    )
  );

create policy "carrinho_delete_proprio"
  on public.carrinho
  for delete
  to authenticated
  using ((select auth.uid()) = cliente_id);

create or replace function public.sincronizar_carrinho_usuario(p_itens jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_cliente_id uuid := (select auth.uid());
  v_total integer := 0;
begin
  if v_cliente_id is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  if p_itens is null or jsonb_typeof(p_itens) <> 'array' then
    raise exception 'O carrinho deve ser enviado como uma lista.' using errcode = '22023';
  end if;

  if jsonb_array_length(p_itens) > 200 then
    raise exception 'O carrinho excede o limite de 200 produtos.' using errcode = '22023';
  end if;

  delete from public.carrinho
  where cliente_id = v_cliente_id;

  with itens_parseados as (
    select
      (item ->> 'produto_id')::uuid as produto_id,
      case
        when coalesce(item ->> 'quantidade', '') ~ '^[0-9]{1,4}$'
          then least(greatest((item ->> 'quantidade')::integer, 1), 1000)
        else 1
      end as quantidade
    from jsonb_array_elements(p_itens) as entrada(item)
    where coalesce(item ->> 'produto_id', '') ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  itens_consolidados as (
    select
      produto_id,
      max(quantidade)::integer as quantidade
    from itens_parseados
    group by produto_id
  ),
  itens_validos as (
    select
      item.produto_id,
      least(item.quantidade, produto.estoque)::integer as quantidade
    from itens_consolidados item
    join public.produtos produto on produto.id = item.produto_id
    join public.lojas loja on loja.id = produto.loja_id
    where produto.ativo = true
      and produto.estoque > 0
      and loja.ativa = true
      and loja.status_aprovacao = 'aprovada'
  )
  insert into public.carrinho (
    cliente_id,
    produto_id,
    quantidade,
    adicionado_em,
    atualizado_em
  )
  select
    v_cliente_id,
    item.produto_id,
    item.quantidade,
    now(),
    now()
  from itens_validos item;

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

revoke all on function public.sincronizar_carrinho_usuario(jsonb)
  from public, anon, authenticated;
grant execute on function public.sincronizar_carrinho_usuario(jsonb)
  to authenticated, service_role;

comment on function public.sincronizar_carrinho_usuario(jsonb) is
  'Substitui atomicamente o carrinho do usuário atual por itens ativos e limita quantidades ao estoque.';
