-- RF-24: painel administrativo de categorias, subcategorias e destaques.
-- A gestão usa operações diretas protegidas por RLS e mantém a leitura pública
-- limitada às categorias ativas.

alter table public.categorias_produtos
  add column if not exists icone varchar(16),
  add column if not exists destaque boolean not null default false,
  add column if not exists ordem_destaque smallint;

update public.categorias_produtos
set ativa = true
where ativa is null;

alter table public.categorias_produtos
  alter column ativa set not null;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'categorias_produtos_icone_valido_check'
      and conrelid = 'public.categorias_produtos'::regclass
  ) then
    alter table public.categorias_produtos
      add constraint categorias_produtos_icone_valido_check
      check (
        icone is null
        or (
          pg_catalog.btrim(icone) <> ''
          and pg_catalog.char_length(icone) <= 16
        )
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'categorias_produtos_ordem_destaque_check'
      and conrelid = 'public.categorias_produtos'::regclass
  ) then
    alter table public.categorias_produtos
      add constraint categorias_produtos_ordem_destaque_check
      check (
        ordem_destaque is null
        or ordem_destaque between 1 and 99
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'categorias_produtos_destaque_raiz_check'
      and conrelid = 'public.categorias_produtos'::regclass
  ) then
    alter table public.categorias_produtos
      add constraint categorias_produtos_destaque_raiz_check
      check (
        destaque = false
        or (
          categoria_pai_id is null
          and ativa = true
          and ordem_destaque is not null
        )
      );
  end if;
end
$$;

create index if not exists idx_categorias_produtos_ativas_hierarquia
  on public.categorias_produtos(categoria_pai_id, nome)
  where ativa = true;

create index if not exists idx_categorias_produtos_destaques
  on public.categorias_produtos(ordem_destaque, nome)
  where destaque = true and ativa = true and categoria_pai_id is null;

comment on column public.categorias_produtos.icone is
  'Emoji curto usado na apresentação da categoria raiz.';

comment on column public.categorias_produtos.destaque is
  'Indica se a categoria raiz aparece na área de destaques da página inicial.';

comment on column public.categorias_produtos.ordem_destaque is
  'Posição da categoria na área de destaques da página inicial, de 1 a 99.';

create or replace function public.normalizar_categoria_produto_admin()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_pai_ativo boolean;
begin
  new.nome := pg_catalog.btrim(new.nome);
  new.icone := nullif(pg_catalog.btrim(new.icone), '');

  if new.categoria_pai_id is not null then
    new.destaque := false;
    new.ordem_destaque := null;
    new.icone := null;

    if new.ativa then
      select categoria.ativa
        into v_pai_ativo
      from public.categorias_produtos categoria
      where categoria.id = new.categoria_pai_id;

      if coalesce(v_pai_ativo, false) = false then
        raise exception 'Uma subcategoria ativa exige uma categoria-pai ativa.'
          using errcode = '23514';
      end if;
    end if;
  end if;

  if new.ativa = false then
    new.destaque := false;
    new.ordem_destaque := null;
  elsif new.destaque then
    new.ordem_destaque := coalesce(new.ordem_destaque, 99);
  else
    new.ordem_destaque := null;
  end if;

  return new;
end;
$$;

revoke all on function public.normalizar_categoria_produto_admin() from public;
revoke all on function public.normalizar_categoria_produto_admin()
  from anon, authenticated;

drop trigger if exists normalizar_categoria_produto_admin_trigger
  on public.categorias_produtos;

create trigger normalizar_categoria_produto_admin_trigger
before insert or update of nome, ativa, categoria_pai_id, icone, destaque, ordem_destaque
on public.categorias_produtos
for each row
execute function public.normalizar_categoria_produto_admin();

create or replace function public.desativar_subcategorias_categoria_produto()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.ativa = true
     and new.ativa = false
     and new.categoria_pai_id is null then
    update public.categorias_produtos
    set ativa = false,
        destaque = false,
        ordem_destaque = null
    where categoria_pai_id = new.id
      and ativa = true;
  end if;

  return new;
end;
$$;

revoke all on function public.desativar_subcategorias_categoria_produto()
  from public;
revoke all on function public.desativar_subcategorias_categoria_produto()
  from anon, authenticated;

drop trigger if exists desativar_subcategorias_categoria_produto_trigger
  on public.categorias_produtos;

create trigger desativar_subcategorias_categoria_produto_trigger
after update of ativa
on public.categorias_produtos
for each row
execute function public.desativar_subcategorias_categoria_produto();

drop policy if exists "Administradores gerenciam categorias de produtos"
  on public.categorias_produtos;

create policy "Administradores gerenciam categorias de produtos"
on public.categorias_produtos
for all
to authenticated
using ((select public.sou_admin()))
with check ((select public.sou_admin()));

drop policy if exists "Administradores visualizam todos os produtos"
  on public.produtos;

create policy "Administradores visualizam todos os produtos"
on public.produtos
for select
to authenticated
using ((select public.sou_admin()));

grant select on table public.categorias_produtos to anon;
grant select, insert, update, delete
  on table public.categorias_produtos
  to authenticated;
grant usage, select on sequence public.categorias_produtos_id_seq
  to authenticated;

update public.categorias_produtos
set icone = case nome
  when 'Artesanato' then '🧶'
  when 'Roupas' then '👕'
  when 'Calçados' then '👟'
  when 'Eletrônicos' then '💻'
  when 'Mercado' then '🛒'
  when 'Padaria' then '🥖'
  when 'Açougue' then '🥩'
  when 'Farmácia' then '💊'
  when 'Bebidas' then '🥤'
  when 'Hortifruti' then '🥬'
  when 'Limpeza' then '🧹'
  when 'Restaurante' then '🍽️'
  else icone
end
where categoria_pai_id is null;

with destaques(nome, ordem) as (
  values
    ('Mercado', 1::smallint),
    ('Farmácia', 2::smallint),
    ('Padaria', 3::smallint),
    ('Eletrônicos', 4::smallint),
    ('Artesanato', 5::smallint),
    ('Roupas', 6::smallint)
)
update public.categorias_produtos categoria
set destaque = true,
    ordem_destaque = destaques.ordem
from destaques
where categoria.categoria_pai_id is null
  and categoria.nome = destaques.nome
  and categoria.ativa = true;
