-- RF-05: busca pública de produtos por nome e descrição.
-- Combina full-text em português, relevância, normalização de acentos e
-- tolerância a pequenos erros de digitação com pg_trgm.

create schema if not exists extensions;

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create or replace function public.normalizar_texto_busca(p_texto text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select extensions.unaccent(
    'extensions.unaccent'::regdictionary,
    pg_catalog.lower(p_texto)
  );
$$;

alter table public.produtos
  add column busca_tsv tsvector
  generated always as (
    setweight(
      to_tsvector(
        'pg_catalog.portuguese'::regconfig,
        public.normalizar_texto_busca(coalesce(nome, ''))
      ),
      'A'
    )
    ||
    setweight(
      to_tsvector(
        'pg_catalog.portuguese'::regconfig,
        public.normalizar_texto_busca(coalesce(descricao, ''))
      ),
      'B'
    )
  ) stored;

comment on column public.produtos.busca_tsv is
  'Vetor de busca em português. Nome possui peso A e descrição possui peso B.';

create index idx_produtos_busca_tsv_ativos
  on public.produtos using gin (busca_tsv)
  where ativo = true;

create index idx_produtos_nome_trgm_ativos
  on public.produtos using gin (
    public.normalizar_texto_busca(nome) extensions.gin_trgm_ops
  )
  where ativo = true;

create index idx_produtos_descricao_trgm_ativos
  on public.produtos using gin (
    public.normalizar_texto_busca(coalesce(descricao, '')) extensions.gin_trgm_ops
  )
  where ativo = true;

create or replace function public.buscar_produtos_publicos(
  p_termo text default '',
  p_categoria_id integer default null,
  p_loja_id uuid default null,
  p_categoria_loja_id integer default null,
  p_disponibilidade text default null,
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
          'recentes'
        ) then p_ordenacao
        else 'relevancia'
      end as ordenacao,
      greatest(1, least(coalesce(p_limite, 12), 50)) as limite,
      greatest(0, coalesce(p_offset, 0)) as deslocamento
  ),
  consulta as (
    select
      x.*,
      websearch_to_tsquery(
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
      p.estoque,
      p.imagem_url,
      p.destaque,
      coalesce(p.created_at, p.criado_em) as created_at,
      cp.id as categoria_produto_id,
      cp.nome::text as categoria_produto_nome,
      l.nome::text as loja_nome,
      l.cidade::text as loja_cidade,
      l.logo_url as loja_logo_url,
      l.categoria_id as loja_categoria_id,
      p.busca_tsv,
      public.normalizar_texto_busca(p.nome) as nome_normalizado,
      public.normalizar_texto_busca(coalesce(p.descricao, '')) as descricao_normalizada,
      q.termo,
      q.ordenacao,
      q.limite,
      q.deslocamento,
      q.tsquery
    from public.produtos p
    join public.lojas l
      on l.id = p.loja_id
    left join public.categorias_produtos cp
      on cp.id = p.categoria_id
    cross join consulta q
    where p.ativo = true
      and l.ativa = true
      and l.status_aprovacao = 'aprovada'
      and (p_categoria_id is null or p.categoria_id = p_categoria_id)
      and (p_loja_id is null or p.loja_id = p_loja_id)
      and (p_categoria_loja_id is null or l.categoria_id = p_categoria_loja_id)
      and (
        p_disponibilidade is null
        or p_disponibilidade = ''
        or (p_disponibilidade = 'estoque' and p.estoque > 0)
        or (p_disponibilidade = 'esgotado' and p.estoque = 0)
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
          ts_rank_cd(c.busca_tsv, c.tsquery, 32) * 4.0
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
    p.relevancia_calculada as relevancia,
    count(*) over () as total_count
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
    case when p.ordenacao = 'menor-preco' then p.preco end asc nulls last,
    case when p.ordenacao = 'maior-preco' then p.preco end desc nulls last,
    case when p.ordenacao = 'recentes' then p.created_at end desc nulls last,
    p.relevancia_calculada desc,
    p.nome asc,
    p.id asc
  limit (select q.limite from consulta q)
  offset (select q.deslocamento from consulta q);
$$;

comment on function public.buscar_produtos_publicos(
  text, integer, uuid, integer, text, text, integer, integer
) is
  'Pesquisa pública paginada por nome e descrição, com relevância e tolerância a erros.';

revoke all on function public.normalizar_texto_busca(text) from public;
grant execute on function public.normalizar_texto_busca(text)
  to anon, authenticated, service_role;

revoke all on function public.buscar_produtos_publicos(
  text, integer, uuid, integer, text, text, integer, integer
) from public;
grant execute on function public.buscar_produtos_publicos(
  text, integer, uuid, integer, text, text, integer, integer
) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
