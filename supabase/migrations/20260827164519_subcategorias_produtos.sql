-- RF-06: hierarquia de categorias e subcategorias de produtos.
-- Mantém as categorias existentes como raízes e permite que produtos apontem
-- diretamente para uma categoria raiz ou para uma subcategoria.

alter table public.categorias_produtos
  add column if not exists categoria_pai_id integer;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'categorias_produtos_categoria_pai_id_fkey'
      and conrelid = 'public.categorias_produtos'::regclass
  ) then
    alter table public.categorias_produtos
      add constraint categorias_produtos_categoria_pai_id_fkey
      foreign key (categoria_pai_id)
      references public.categorias_produtos(id)
      on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'categorias_produtos_pai_diferente_check'
      and conrelid = 'public.categorias_produtos'::regclass
  ) then
    alter table public.categorias_produtos
      add constraint categorias_produtos_pai_diferente_check
      check (categoria_pai_id is null or categoria_pai_id <> id);
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'categorias_produtos_nome_preenchido_check'
      and conrelid = 'public.categorias_produtos'::regclass
  ) then
    alter table public.categorias_produtos
      add constraint categorias_produtos_nome_preenchido_check
      check (pg_catalog.btrim(nome) <> '');
  end if;
end
$$;

alter table public.categorias_produtos
  drop constraint if exists categorias_produtos_nome_key;

create unique index if not exists categorias_produtos_nome_raiz_unique
  on public.categorias_produtos (
    pg_catalog.lower(pg_catalog.btrim(nome))
  )
  where categoria_pai_id is null;

create unique index if not exists categorias_produtos_pai_nome_unique
  on public.categorias_produtos (
    categoria_pai_id,
    pg_catalog.lower(pg_catalog.btrim(nome))
  )
  where categoria_pai_id is not null;

create index if not exists idx_categorias_produtos_categoria_pai_id
  on public.categorias_produtos(categoria_pai_id)
  where categoria_pai_id is not null;

comment on column public.categorias_produtos.categoria_pai_id is
  'Categoria raiz da subcategoria. NULL identifica uma categoria de primeiro nível.';

create or replace function public.validar_hierarquia_categoria_produto()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_categoria_avo_id integer;
begin
  if new.categoria_pai_id is null then
    return new;
  end if;

  if new.id is not null and new.categoria_pai_id = new.id then
    raise exception 'Uma categoria não pode ser pai dela mesma.'
      using errcode = '23514';
  end if;

  select categoria_pai_id
    into v_categoria_avo_id
  from public.categorias_produtos
  where id = new.categoria_pai_id;

  if not found then
    raise exception 'A categoria-pai informada não existe.'
      using errcode = '23503';
  end if;

  if v_categoria_avo_id is not null then
    raise exception 'A hierarquia aceita somente categoria e subcategoria.'
      using errcode = '23514';
  end if;

  if new.id is not null and exists (
    select 1
    from public.categorias_produtos filha
    where filha.categoria_pai_id = new.id
  ) then
    raise exception 'Uma categoria com subcategorias não pode virar subcategoria.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.validar_hierarquia_categoria_produto() from public;
revoke all on function public.validar_hierarquia_categoria_produto()
  from anon, authenticated;

drop trigger if exists validar_hierarquia_categoria_produto_trigger
  on public.categorias_produtos;

create trigger validar_hierarquia_categoria_produto_trigger
before insert or update of categoria_pai_id
on public.categorias_produtos
for each row
execute function public.validar_hierarquia_categoria_produto();

with subcategorias(categoria_pai, nome) as (
  values
    ('Artesanato', 'Crochê'),
    ('Artesanato', 'Bordado'),
    ('Artesanato', 'Decoração artesanal'),
    ('Roupas', 'Feminina'),
    ('Roupas', 'Masculina'),
    ('Roupas', 'Infantil'),
    ('Calçados', 'Femininos'),
    ('Calçados', 'Masculinos'),
    ('Calçados', 'Infantis'),
    ('Eletrônicos', 'Celulares'),
    ('Eletrônicos', 'Informática'),
    ('Eletrônicos', 'Acessórios eletrônicos'),
    ('Mercado', 'Alimentos'),
    ('Mercado', 'Bebidas'),
    ('Mercado', 'Hortifruti'),
    ('Mercado', 'Limpeza'),
    ('Padaria', 'Pães'),
    ('Padaria', 'Bolos e doces'),
    ('Padaria', 'Salgados'),
    ('Açougue', 'Carne bovina'),
    ('Açougue', 'Aves'),
    ('Açougue', 'Suínos'),
    ('Farmácia', 'Medicamentos'),
    ('Farmácia', 'Higiene pessoal'),
    ('Farmácia', 'Vitaminas e suplementos'),
    ('Bebidas', 'Refrigerantes'),
    ('Bebidas', 'Sucos'),
    ('Bebidas', 'Águas'),
    ('Bebidas', 'Bebidas alcoólicas'),
    ('Hortifruti', 'Frutas'),
    ('Hortifruti', 'Verduras e legumes'),
    ('Hortifruti', 'Ovos'),
    ('Limpeza', 'Limpeza da casa'),
    ('Limpeza', 'Lavanderia'),
    ('Limpeza', 'Utensílios de limpeza'),
    ('Restaurante', 'Pratos feitos'),
    ('Restaurante', 'Lanches'),
    ('Restaurante', 'Sobremesas'),
    ('Restaurante', 'Bebidas')
)
insert into public.categorias_produtos(nome, ativa, categoria_pai_id)
select
  s.nome,
  true,
  pai.id
from subcategorias s
join public.categorias_produtos pai
  on pg_catalog.lower(pg_catalog.btrim(pai.nome)) =
     pg_catalog.lower(pg_catalog.btrim(s.categoria_pai))
 and pai.categoria_pai_id is null
where not exists (
  select 1
  from public.categorias_produtos existente
  where existente.categoria_pai_id = pai.id
    and pg_catalog.lower(pg_catalog.btrim(existente.nome)) =
        pg_catalog.lower(pg_catalog.btrim(s.nome))
);

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
      case
        when categoria_pai.id is not null
          then categoria_pai.nome::text || ' › ' || cp.nome::text
        else cp.nome::text
      end as categoria_produto_nome,
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
    left join public.categorias_produtos categoria_pai
      on categoria_pai.id = cp.categoria_pai_id
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
  'Pesquisa pública paginada com categorias hierárquicas, relevância e tolerância a erros.';

revoke all on function public.buscar_produtos_publicos(
  text, integer, uuid, integer, text, text, integer, integer
) from public;
grant execute on function public.buscar_produtos_publicos(
  text, integer, uuid, integer, text, text, integer, integer
) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
