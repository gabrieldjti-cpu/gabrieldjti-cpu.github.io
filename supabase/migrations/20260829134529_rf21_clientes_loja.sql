-- RF-21: visão consolidada de clientes para o proprietário da loja.

begin;

create index if not exists idx_pedidos_loja_cliente_created_at
  on public.pedidos (loja_id, cliente_id, created_at desc);

create or replace function private.listar_clientes_loja_core(
  p_loja_id uuid,
  p_busca text,
  p_periodo_dias integer,
  p_ordenacao text,
  p_limite integer,
  p_offset integer
)
returns table (
  cliente_id uuid,
  nome text,
  total_pedidos bigint,
  pedidos_concluidos bigint,
  pedidos_cancelados bigint,
  pedidos_em_andamento bigint,
  total_compras numeric,
  ticket_medio numeric,
  primeiro_pedido timestamptz,
  ultimo_pedido timestamptz,
  total_registros bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := (select auth.uid());
  v_periodo integer := case
    when p_periodo_dias in (30, 90, 365) then p_periodo_dias
    else 0
  end;
  v_ordenacao text := case
    when p_ordenacao in (
      'recentes',
      'antigos',
      'nome',
      'mais_pedidos',
      'maior_valor'
    ) then p_ordenacao
    else 'recentes'
  end;
  v_limite integer := greatest(1, least(coalesce(p_limite, 12), 50));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_termo text := public.normalizar_texto_busca(
    pg_catalog.left(pg_catalog.btrim(coalesce(p_busca, '')), 80)
  );
begin
  if v_usuario_id is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  if p_loja_id is null or not exists (
    select 1
    from public.lojas loja
    where loja.id = p_loja_id
      and loja.proprietario_id = v_usuario_id
  ) then
    raise exception 'Você não possui acesso aos clientes desta loja.'
      using errcode = '42501';
  end if;

  return query
  with agregados as (
    select
      pedido.cliente_id,
      case
        when perfil.ativo is true
         and perfil.excluido_em is null
         and nullif(pg_catalog.btrim(perfil.nome), '') is not null
          then pg_catalog.btrim(perfil.nome)
        else 'Conta encerrada'
      end as nome_exibicao,
      count(*)::bigint as quantidade_pedidos,
      count(*) filter (
        where pedido.status in ('entregue', 'finalizado')
      )::bigint as quantidade_concluidos,
      count(*) filter (
        where pedido.status = 'cancelado'
      )::bigint as quantidade_cancelados,
      count(*) filter (
        where pedido.status in (
          'aguardando_pagamento',
          'pendente',
          'pago',
          'em_preparacao',
          'preparando',
          'enviado'
        )
      )::bigint as quantidade_em_andamento,
      coalesce(
        sum(pedido.valor_total) filter (
          where pedido.status in (
            'pago',
            'em_preparacao',
            'preparando',
            'enviado',
            'entregue',
            'finalizado'
          )
        ),
        0
      )::numeric(14, 2) as valor_compras,
      coalesce(
        avg(pedido.valor_total) filter (
          where pedido.status in (
            'pago',
            'em_preparacao',
            'preparando',
            'enviado',
            'entregue',
            'finalizado'
          )
        ),
        0
      )::numeric(14, 2) as valor_ticket_medio,
      min(pedido.created_at) as data_primeiro_pedido,
      max(pedido.created_at) as data_ultimo_pedido
    from public.pedidos pedido
    join public.profiles perfil
      on perfil.id = pedido.cliente_id
    where pedido.loja_id = p_loja_id
      and (
        v_periodo = 0
        or pedido.created_at >= pg_catalog.now() - pg_catalog.make_interval(days => v_periodo)
      )
    group by
      pedido.cliente_id,
      perfil.nome,
      perfil.ativo,
      perfil.excluido_em
  ),
  filtrados as (
    select
      agregado.*,
      public.normalizar_texto_busca(agregado.nome_exibicao) as nome_normalizado
    from agregados agregado
    where v_termo = ''
       or public.normalizar_texto_busca(agregado.nome_exibicao)
          like ('%' || v_termo || '%')
  )
  select
    filtrado.cliente_id,
    filtrado.nome_exibicao::text,
    filtrado.quantidade_pedidos,
    filtrado.quantidade_concluidos,
    filtrado.quantidade_cancelados,
    filtrado.quantidade_em_andamento,
    filtrado.valor_compras,
    filtrado.valor_ticket_medio,
    filtrado.data_primeiro_pedido,
    filtrado.data_ultimo_pedido,
    count(*) over()::bigint
  from filtrados filtrado
  order by
    case when v_ordenacao = 'nome'
      then filtrado.nome_normalizado end asc nulls last,
    case when v_ordenacao = 'mais_pedidos'
      then filtrado.quantidade_pedidos end desc nulls last,
    case when v_ordenacao = 'maior_valor'
      then filtrado.valor_compras end desc nulls last,
    case when v_ordenacao = 'antigos'
      then filtrado.data_primeiro_pedido end asc nulls last,
    case when v_ordenacao = 'recentes'
      then filtrado.data_ultimo_pedido end desc nulls last,
    filtrado.data_ultimo_pedido desc nulls last,
    filtrado.cliente_id
  limit v_limite
  offset v_offset;
end;
$$;

create or replace function private.resumo_clientes_loja_core(
  p_loja_id uuid,
  p_periodo_dias integer
)
returns table (
  total_clientes bigint,
  clientes_recorrentes bigint,
  total_pedidos bigint,
  receita_total numeric,
  ticket_medio numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := (select auth.uid());
  v_periodo integer := case
    when p_periodo_dias in (30, 90, 365) then p_periodo_dias
    else 0
  end;
begin
  if v_usuario_id is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  if p_loja_id is null or not exists (
    select 1
    from public.lojas loja
    where loja.id = p_loja_id
      and loja.proprietario_id = v_usuario_id
  ) then
    raise exception 'Você não possui acesso aos clientes desta loja.'
      using errcode = '42501';
  end if;

  return query
  with pedidos_periodo as (
    select
      pedido.cliente_id,
      pedido.status,
      pedido.valor_total
    from public.pedidos pedido
    where pedido.loja_id = p_loja_id
      and (
        v_periodo = 0
        or pedido.created_at >= pg_catalog.now() - pg_catalog.make_interval(days => v_periodo)
      )
  ),
  clientes as (
    select
      pedido.cliente_id,
      count(*)::bigint as quantidade_pedidos
    from pedidos_periodo pedido
    group by pedido.cliente_id
  ),
  vendas as (
    select
      coalesce(sum(pedido.valor_total), 0)::numeric(14, 2) as receita,
      coalesce(avg(pedido.valor_total), 0)::numeric(14, 2) as media
    from pedidos_periodo pedido
    where pedido.status in (
      'pago',
      'em_preparacao',
      'preparando',
      'enviado',
      'entregue',
      'finalizado'
    )
  )
  select
    (select count(*) from clientes)::bigint,
    (
      select count(*)
      from clientes cliente
      where cliente.quantidade_pedidos > 1
    )::bigint,
    (select count(*) from pedidos_periodo)::bigint,
    venda.receita,
    venda.media
  from vendas venda;
end;
$$;

revoke all on function private.listar_clientes_loja_core(
  uuid, text, integer, text, integer, integer
) from public, anon, authenticated;

revoke all on function private.resumo_clientes_loja_core(
  uuid, integer
) from public, anon, authenticated;

grant usage on schema private to authenticated;

grant execute on function private.listar_clientes_loja_core(
  uuid, text, integer, text, integer, integer
) to authenticated;

grant execute on function private.resumo_clientes_loja_core(
  uuid, integer
) to authenticated;

create or replace function public.listar_clientes_loja(
  p_loja_id uuid,
  p_busca text default '',
  p_periodo_dias integer default 0,
  p_ordenacao text default 'recentes',
  p_limite integer default 12,
  p_offset integer default 0
)
returns table (
  cliente_id uuid,
  nome text,
  total_pedidos bigint,
  pedidos_concluidos bigint,
  pedidos_cancelados bigint,
  pedidos_em_andamento bigint,
  total_compras numeric,
  ticket_medio numeric,
  primeiro_pedido timestamptz,
  ultimo_pedido timestamptz,
  total_registros bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from private.listar_clientes_loja_core(
    p_loja_id,
    p_busca,
    p_periodo_dias,
    p_ordenacao,
    p_limite,
    p_offset
  );
$$;

create or replace function public.resumo_clientes_loja(
  p_loja_id uuid,
  p_periodo_dias integer default 0
)
returns table (
  total_clientes bigint,
  clientes_recorrentes bigint,
  total_pedidos bigint,
  receita_total numeric,
  ticket_medio numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from private.resumo_clientes_loja_core(
    p_loja_id,
    p_periodo_dias
  );
$$;

revoke all on function public.listar_clientes_loja(
  uuid, text, integer, text, integer, integer
) from public, anon, authenticated;

revoke all on function public.resumo_clientes_loja(
  uuid, integer
) from public, anon, authenticated;

grant execute on function public.listar_clientes_loja(
  uuid, text, integer, text, integer, integer
) to authenticated;

grant execute on function public.resumo_clientes_loja(
  uuid, integer
) to authenticated;

comment on function public.listar_clientes_loja(
  uuid, text, integer, text, integer, integer
) is
  'RF-21: lista somente clientes que compraram na loja do usuário autenticado, sem expor contato ou endereço.';

comment on function public.resumo_clientes_loja(uuid, integer) is
  'RF-21: resume clientes, recorrência, pedidos e receita da loja do usuário autenticado.';

commit;
