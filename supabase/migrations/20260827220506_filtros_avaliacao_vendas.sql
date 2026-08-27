-- RF-05: filtros por preco/avaliacao e ordenacoes por vendas/avaliacao.
-- As metricas publicas ficam separadas dos pedidos e das avaliacoes privadas.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create table if not exists public.produto_metricas (
  produto_id uuid primary key
    references public.produtos(id)
    on delete cascade,
  avaliacao_media numeric(3, 2) not null default 0
    check (avaliacao_media >= 0 and avaliacao_media <= 5),
  total_avaliacoes integer not null default 0
    check (total_avaliacoes >= 0),
  total_vendido bigint not null default 0
    check (total_vendido >= 0),
  atualizado_em timestamptz not null default now()
);

comment on table public.produto_metricas is
  'Metricas agregadas e publicas de produtos, sem dados de clientes ou pedidos.';

alter table public.produto_metricas enable row level security;

revoke all on table public.produto_metricas from public, anon, authenticated;
grant select on table public.produto_metricas to anon, authenticated, service_role;

drop policy if exists "Metricas de produtos publicos" on public.produto_metricas;

create policy "Metricas de produtos publicos"
on public.produto_metricas
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.produtos p
    join public.lojas l on l.id = p.loja_id
    where p.id = produto_metricas.produto_id
      and p.ativo = true
      and l.ativa = true
      and l.status_aprovacao = 'aprovada'
  )
);

create index if not exists idx_avaliacoes_produto_id
  on public.avaliacoes(produto_id);

create index if not exists idx_produto_metricas_avaliacao
  on public.produto_metricas(avaliacao_media desc, total_avaliacoes desc, produto_id);

create index if not exists idx_produto_metricas_vendas
  on public.produto_metricas(total_vendido desc, produto_id);

create index if not exists idx_produtos_preco_publico
  on public.produtos ((
    case
      when preco_promocional is not null
        and preco_promocional > 0
        and preco_promocional < preco
        then preco_promocional
      else preco
    end
  ))
  where ativo = true;

create or replace function private.recalcular_metricas_produtos(
  p_produtos uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_produtos is null or pg_catalog.cardinality(p_produtos) = 0 then
    return;
  end if;

  insert into public.produto_metricas (
    produto_id,
    avaliacao_media,
    total_avaliacoes,
    total_vendido,
    atualizado_em
  )
  with produtos_afetados as (
    select distinct ids.produto_id
    from pg_catalog.unnest(p_produtos) as ids(produto_id)
    join public.produtos p on p.id = ids.produto_id
    where ids.produto_id is not null
  ),
  avaliacoes_agregadas as (
    select
      a.produto_id,
      pg_catalog.round(pg_catalog.avg(a.nota)::numeric, 2) as avaliacao_media,
      pg_catalog.count(*)::integer as total_avaliacoes
    from public.avaliacoes a
    join produtos_afetados pa on pa.produto_id = a.produto_id
    group by a.produto_id
  ),
  vendas_agregadas as (
    select
      ip.produto_id,
      coalesce(pg_catalog.sum(ip.quantidade), 0)::bigint as total_vendido
    from public.itens_pedido ip
    join produtos_afetados pa on pa.produto_id = ip.produto_id
    join public.pedidos pe on pe.id = ip.pedido_id
    where pe.status in ('pago', 'em_preparacao', 'enviado', 'entregue')
    group by ip.produto_id
  )
  select
    pa.produto_id,
    coalesce(aa.avaliacao_media, 0)::numeric(3, 2),
    coalesce(aa.total_avaliacoes, 0),
    coalesce(va.total_vendido, 0),
    pg_catalog.now()
  from produtos_afetados pa
  left join avaliacoes_agregadas aa on aa.produto_id = pa.produto_id
  left join vendas_agregadas va on va.produto_id = pa.produto_id
  on conflict (produto_id) do update
  set
    avaliacao_media = excluded.avaliacao_media,
    total_avaliacoes = excluded.total_avaliacoes,
    total_vendido = excluded.total_vendido,
    atualizado_em = excluded.atualizado_em;
end;
$$;

revoke all on function private.recalcular_metricas_produtos(uuid[]) from public;
revoke all on function private.recalcular_metricas_produtos(uuid[])
  from anon, authenticated;

create or replace function private.sincronizar_metricas_avaliacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_produtos uuid[];
begin
  if tg_op = 'INSERT' then
    v_produtos := array[new.produto_id];
  elsif tg_op = 'DELETE' then
    v_produtos := array[old.produto_id];
  else
    v_produtos := array[old.produto_id, new.produto_id];
  end if;

  perform private.recalcular_metricas_produtos(v_produtos);
  return coalesce(new, old);
end;
$$;

revoke all on function private.sincronizar_metricas_avaliacao() from public;
revoke all on function private.sincronizar_metricas_avaliacao()
  from anon, authenticated;

drop trigger if exists sincronizar_metricas_avaliacao_trigger
  on public.avaliacoes;

create trigger sincronizar_metricas_avaliacao_trigger
after insert or update of produto_id, nota or delete
on public.avaliacoes
for each row
execute function private.sincronizar_metricas_avaliacao();

create or replace function private.sincronizar_metricas_item_pedido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_produtos uuid[];
begin
  if tg_op = 'INSERT' then
    v_produtos := array[new.produto_id];
  elsif tg_op = 'DELETE' then
    v_produtos := array[old.produto_id];
  else
    v_produtos := array[old.produto_id, new.produto_id];
  end if;

  perform private.recalcular_metricas_produtos(v_produtos);
  return coalesce(new, old);
end;
$$;

revoke all on function private.sincronizar_metricas_item_pedido() from public;
revoke all on function private.sincronizar_metricas_item_pedido()
  from anon, authenticated;

drop trigger if exists sincronizar_metricas_item_pedido_trigger
  on public.itens_pedido;

create trigger sincronizar_metricas_item_pedido_trigger
after insert or update of pedido_id, produto_id, quantidade or delete
on public.itens_pedido
for each row
execute function private.sincronizar_metricas_item_pedido();

create or replace function private.sincronizar_metricas_status_pedido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_produtos uuid[];
begin
  select pg_catalog.array_agg(distinct ip.produto_id)
    into v_produtos
  from public.itens_pedido ip
  where ip.pedido_id = new.id;

  perform private.recalcular_metricas_produtos(v_produtos);
  return new;
end;
$$;

revoke all on function private.sincronizar_metricas_status_pedido() from public;
revoke all on function private.sincronizar_metricas_status_pedido()
  from anon, authenticated;

drop trigger if exists sincronizar_metricas_status_pedido_trigger
  on public.pedidos;

create trigger sincronizar_metricas_status_pedido_trigger
after update of status
on public.pedidos
for each row
when (old.status is distinct from new.status)
execute function private.sincronizar_metricas_status_pedido();

select private.recalcular_metricas_produtos(
  pg_catalog.array_agg(p.id)
)
from public.produtos p;

drop function if exists public.buscar_produtos_publicos(
  text, integer, uuid, integer, text, text, integer, integer
);

create function public.buscar_produtos_publicos(
  p_termo text default '',
  p_categoria_id integer default null,
  p_loja_id uuid default null,
  p_categoria_loja_id integer default null,
  p_disponibilidade text default null,
  p_preco_min numeric default null,
  p_preco_max numeric default null,
  p_avaliacao_min numeric default null,
  p_ordenacao text default 'relevancia',
  p_limite integer default 12,
  p_offset integer default 0
)
returns table (
  id uuid,
  loja_id uuid,
  categoria_id integer,
  nome text,
  descricao text,
  preco numeric,
  preco_promocional numeric,
  preco_atual numeric,
  estoque integer,
  imagem_url text,
  destaque boolean,
  created_at timestamptz,
  categoria_produto_id integer,
  categoria_produto_nome text,
  loja_nome text,
  loja_cidade text,
  loja_logo_url text,
  loja_categoria_id integer,
  avaliacao_media numeric,
  total_avaliacoes integer,
  total_vendido bigint,
  relevancia real,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with parametros as (
    select
      pg_catalog.btrim(
        pg_catalog.regexp_replace(
          public.normalizar_texto_busca(
            pg_catalog.translate(
              pg_catalog.left(coalesce(p_termo, ''), 80),
              E'%_\\',
              '   '
            )
          ),
          '[[:space:]]+',
          ' ',
          'g'
        )
      ) as termo,
      case
        when p_ordenacao in (
          'relevancia',
          'destaques',
          'nome',
          'menor-preco',
          'maior-preco',
          'mais-vendidos',
          'melhor-avaliados',
          'recentes'
        ) then p_ordenacao
        else 'relevancia'
      end as ordenacao,
      case
        when p_preco_min is null then null
        else greatest(
          0::numeric,
          least(p_preco_min, 1000000::numeric)
        )
      end as preco_min,
      case
        when p_preco_max is null then null
        else greatest(
          0::numeric,
          least(p_preco_max, 1000000::numeric)
        )
      end as preco_max,
      case
        when p_avaliacao_min >= 1 and p_avaliacao_min <= 5
          then p_avaliacao_min
        else null
      end as avaliacao_min,
      greatest(1, least(coalesce(p_limite, 12), 50)) as limite,
      greatest(0, coalesce(p_offset, 0)) as deslocamento
  ),
  consulta as (
    select
      x.*,
      pg_catalog.websearch_to_tsquery(
        'pg_catalog.portuguese'::regconfig,
        x.termo
      ) as tsquery
    from parametros x
  ),
  candidatos as (
    select
      p.id,
      p.loja_id,
      p.categoria_id,
      p.nome::text as nome,
      p.descricao,
      p.preco,
      p.preco_promocional,
      case
        when p.preco_promocional is not null
          and p.preco_promocional > 0
          and p.preco_promocional < p.preco
          then p.preco_promocional
        else p.preco
      end as preco_atual,
      p.estoque,
      p.imagem_url,
      p.destaque,
      coalesce(p.created_at, p.criado_em) as created_at,
      cp.id as categoria_produto_id,
      case
        when categoria_pai.id is not null
          then categoria_pai.nome::text || ' › ' || cp.nome::text
        else cp.nome::text
      end as categoria_produto_nome,
      l.nome::text as loja_nome,
      l.cidade::text as loja_cidade,
      l.logo_url as loja_logo_url,
      l.categoria_id as loja_categoria_id,
      coalesce(pm.avaliacao_media, 0) as avaliacao_media,
      coalesce(pm.total_avaliacoes, 0) as total_avaliacoes,
      coalesce(pm.total_vendido, 0) as total_vendido,
      p.busca_tsv,
      public.normalizar_texto_busca(p.nome) as nome_normalizado,
      public.normalizar_texto_busca(coalesce(p.descricao, '')) as descricao_normalizada,
      q.termo,
      q.ordenacao,
      q.limite,
      q.deslocamento,
      q.tsquery
    from public.produtos p
    join public.lojas l on l.id = p.loja_id
    left join public.categorias_produtos cp on cp.id = p.categoria_id
    left join public.categorias_produtos categoria_pai
      on categoria_pai.id = cp.categoria_pai_id
    left join public.produto_metricas pm on pm.produto_id = p.id
    cross join consulta q
    where p.ativo = true
      and l.ativa = true
      and l.status_aprovacao = 'aprovada'
      and (
        p_categoria_id is null
        or p.categoria_id = p_categoria_id
        or cp.categoria_pai_id = p_categoria_id
      )
      and (p_loja_id is null or p.loja_id = p_loja_id)
      and (p_categoria_loja_id is null or l.categoria_id = p_categoria_loja_id)
      and (
        p_disponibilidade is null
        or p_disponibilidade = ''
        or (p_disponibilidade = 'estoque' and p.estoque > 0)
        or (p_disponibilidade = 'esgotado' and p.estoque = 0)
      )
      and (
        q.preco_min is null
        or (
          case
            when p.preco_promocional is not null
              and p.preco_promocional > 0
              and p.preco_promocional < p.preco
              then p.preco_promocional
            else p.preco
          end
        ) >= q.preco_min
      )
      and (
        q.preco_max is null
        or (
          case
            when p.preco_promocional is not null
              and p.preco_promocional > 0
              and p.preco_promocional < p.preco
              then p.preco_promocional
            else p.preco
          end
        ) <= q.preco_max
      )
      and (
        q.avaliacao_min is null
        or (
          coalesce(pm.total_avaliacoes, 0) > 0
          and coalesce(pm.avaliacao_media, 0) >= q.avaliacao_min
        )
      )
      and (
        q.termo = ''
        or p.busca_tsv @@ q.tsquery
        or public.normalizar_texto_busca(p.nome)
          operator(extensions.%) q.termo
        or public.normalizar_texto_busca(coalesce(p.descricao, ''))
          operator(extensions.%) q.termo
        or public.normalizar_texto_busca(p.nome)
          like ('%' || q.termo || '%')
        or public.normalizar_texto_busca(coalesce(p.descricao, ''))
          like ('%' || q.termo || '%')
        or extensions.word_similarity(
          q.termo,
          public.normalizar_texto_busca(p.nome)
        ) >= 0.45
        or extensions.word_similarity(
          q.termo,
          public.normalizar_texto_busca(coalesce(p.descricao, ''))
        ) >= 0.55
      )
  ),
  pontuados as (
    select
      c.*,
      case
        when c.termo = '' then 0::real
        else (
          pg_catalog.ts_rank_cd(c.busca_tsv, c.tsquery, 32) * 4.0
          + case
              when c.nome_normalizado = c.termo then 4.0
              when c.nome_normalizado like (c.termo || '%') then 2.0
              when c.nome_normalizado like ('%' || c.termo || '%') then 1.0
              else 0.0
            end
          + extensions.similarity(c.nome_normalizado, c.termo) * 1.5
          + extensions.word_similarity(c.termo, c.nome_normalizado) * 1.25
          + extensions.word_similarity(c.termo, c.descricao_normalizada) * 0.45
        )::real
      end as relevancia_calculada
    from candidatos c
  )
  select
    p.id,
    p.loja_id,
    p.categoria_id,
    p.nome,
    p.descricao,
    p.preco,
    p.preco_promocional,
    p.preco_atual,
    p.estoque,
    p.imagem_url,
    p.destaque,
    p.created_at,
    p.categoria_produto_id,
    p.categoria_produto_nome,
    p.loja_nome,
    p.loja_cidade,
    p.loja_logo_url,
    p.loja_categoria_id,
    p.avaliacao_media,
    p.total_avaliacoes,
    p.total_vendido,
    p.relevancia_calculada as relevancia,
    pg_catalog.count(*) over () as total_count
  from pontuados p
  order by
    case
      when p.ordenacao = 'relevancia' and p.termo <> ''
        then p.relevancia_calculada
    end desc nulls last,
    case
      when p.ordenacao = 'destaques'
        or (p.ordenacao = 'relevancia' and p.termo = '')
        then case when p.destaque then 1 else 0 end
    end desc nulls last,
    case when p.ordenacao = 'nome' then p.nome end asc nulls last,
    case when p.ordenacao = 'menor-preco' then p.preco_atual end asc nulls last,
    case when p.ordenacao = 'maior-preco' then p.preco_atual end desc nulls last,
    case when p.ordenacao = 'mais-vendidos' then p.total_vendido end desc nulls last,
    case when p.ordenacao = 'melhor-avaliados' then p.avaliacao_media end desc nulls last,
    case when p.ordenacao = 'melhor-avaliados' then p.total_avaliacoes end desc nulls last,
    case when p.ordenacao = 'recentes' then p.created_at end desc nulls last,
    p.relevancia_calculada desc,
    p.nome asc,
    p.id asc
  limit (select q.limite from consulta q)
  offset (select q.deslocamento from consulta q);
$$;

comment on function public.buscar_produtos_publicos(
  text, integer, uuid, integer, text, numeric, numeric, numeric,
  text, integer, integer
) is
  'Pesquisa publica paginada com relevancia, preco efetivo, nota e vendas agregadas.';

revoke all on function public.buscar_produtos_publicos(
  text, integer, uuid, integer, text, numeric, numeric, numeric,
  text, integer, integer
) from public;

grant execute on function public.buscar_produtos_publicos(
  text, integer, uuid, integer, text, numeric, numeric, numeric,
  text, integer, integer
) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
