-- Classificados, etapa 6: limite e vencimento do plano gratuito.
--
-- Regras (os números vêm da tabela planos, código 'gratuito'):
--   * 5 anúncios a cada 30 dias. O ciclo começa na criação do primeiro
--     anúncio do perfil e se repete em janelas fixas de 30 dias;
--   * anúncio excluído continua contando no ciclo. Anúncio rejeitado
--     não conta, porque nunca foi ao ar;
--   * cada anúncio vale 60 dias a partir da aprovação. Depois disso sai
--     dos resultados, mas o dono continua vendo em "Meus anúncios";
--   * anúncio de loja não tem limite nem vencimento.

alter table public.produtos
  add column vence_em timestamptz;

create index produtos_vence_em_idx
  on public.produtos (vence_em)
  where vence_em is not null;

comment on column public.produtos.vence_em is
  'Classificados: fim da validade do anúncio do plano gratuito. Nulo = não vence.';

-- ---------------------------------------------------------------------
-- VISIBILIDADE PÚBLICA: SÓ ANÚNCIO VIGENTE
-- ---------------------------------------------------------------------

alter policy "Catálogo público de produtos"
  on public.produtos
  using (
    ativo = true
    and status_aprovacao = 'aprovado'
    and (vence_em is null or vence_em > now())
    and exists (
      select 1
      from public.lojas loja
      where loja.id = produtos.loja_id
        and loja.ativa = true
        and loja.status_aprovacao = 'aprovada'
    )
  );

alter policy "Produtos visíveis ao usuário autenticado"
  on public.produtos
  using (
    (
      ativo = true
      and status_aprovacao = 'aprovado'
      and (vence_em is null or vence_em > now())
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

-- ---------------------------------------------------------------------
-- CICLO DO PLANO GRATUITO
-- ---------------------------------------------------------------------

create or replace function private.ciclo_anuncios_gratuito(p_loja_id uuid)
returns table (
  limite integer,
  usados integer,
  ciclo_inicio timestamptz,
  ciclo_fim timestamptz,
  dias_validade integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limite integer;
  v_dias_ciclo integer;
  v_dias_validade integer;
  v_primeiro timestamptz;
  v_inicio timestamptz;
  v_usados integer := 0;
begin
  select p.limite_anuncios_ciclo, p.dias_ciclo, p.dias_validade_anuncio
  into v_limite, v_dias_ciclo, v_dias_validade
  from public.planos p
  where p.codigo = 'gratuito'
    and p.ativo = true;

  -- Plano sem limite configurado: nada a contar.
  if v_limite is null or v_dias_ciclo is null then
    return query select null::integer, 0, null::timestamptz, null::timestamptz, v_dias_validade;
    return;
  end if;

  select min(coalesce(pr.criado_em, pr.created_at))
  into v_primeiro
  from public.produtos pr
  where pr.loja_id = p_loja_id;

  if v_primeiro is null then
    return query select v_limite, 0, null::timestamptz, null::timestamptz, v_dias_validade;
    return;
  end if;

  -- Janelas fixas a partir do primeiro anúncio.
  v_inicio := v_primeiro
    + floor(extract(epoch from (now() - v_primeiro)) / (v_dias_ciclo * 86400.0))
      * v_dias_ciclo * interval '1 day';

  select count(*)::integer
  into v_usados
  from public.produtos pr
  where pr.loja_id = p_loja_id
    and coalesce(pr.criado_em, pr.created_at) >= v_inicio
    and pr.status_aprovacao <> 'rejeitado';

  return query
  select
    v_limite,
    v_usados,
    v_inicio,
    v_inicio + v_dias_ciclo * interval '1 day',
    v_dias_validade;
end;
$$;

revoke all on function private.ciclo_anuncios_gratuito(uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- LIMITE NA CRIAÇÃO DO ANÚNCIO
-- ---------------------------------------------------------------------
-- O nome começa com "trg_aplicar" para rodar antes dos demais gatilhos.

create or replace function private.aplicar_limite_plano_gratuito()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_tipo text;
  v_ciclo record;
begin
  if v_uid is null or public._usuario_e_admin(v_uid) then
    return new;
  end if;

  -- As datas são sempre as do servidor: ninguém escolhe quando o
  -- anúncio foi criado nem quando vence.
  new.criado_em := now();
  new.created_at := now();
  new.vence_em := null;

  select l.tipo into v_tipo
  from public.lojas l
  where l.id = new.loja_id;

  if v_tipo is distinct from 'pessoal' then
    return new;
  end if;

  -- Dois envios simultâneos não podem passar juntos pelo limite.
  perform pg_advisory_xact_lock(
    hashtextextended('limite_anuncios:' || new.loja_id::text, 0)
  );

  select * into v_ciclo
  from private.ciclo_anuncios_gratuito(new.loja_id);

  if v_ciclo.limite is not null and v_ciclo.usados >= v_ciclo.limite then
    raise exception
      'Você já usou os % anúncios deste ciclo do plano gratuito. Um novo ciclo começa em %.',
      v_ciclo.limite,
      to_char(v_ciclo.ciclo_fim at time zone 'America/Sao_Paulo', 'DD/MM/YYYY');
  end if;

  return new;
end;
$$;

revoke all on function private.aplicar_limite_plano_gratuito()
  from public, anon, authenticated;

create trigger trg_aplicar_limite_plano_gratuito
before insert on public.produtos
for each row
execute function private.aplicar_limite_plano_gratuito();

-- ---------------------------------------------------------------------
-- VENCIMENTO DEFINIDO NA APROVAÇÃO
-- ---------------------------------------------------------------------

create or replace function private.definir_vencimento_anuncio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_tipo text;
  v_dias integer;
begin
  -- O dono não mexe nas datas que controlam ciclo e vencimento.
  if v_uid is not null and not public._usuario_e_admin(v_uid) then
    new.vence_em := old.vence_em;
    new.criado_em := old.criado_em;
    new.created_at := old.created_at;
  end if;

  if new.status_aprovacao = 'aprovado'
     and old.status_aprovacao is distinct from 'aprovado'
     and new.vence_em is null then
    select l.tipo into v_tipo
    from public.lojas l
    where l.id = new.loja_id;

    if v_tipo = 'pessoal' then
      select p.dias_validade_anuncio into v_dias
      from public.planos p
      where p.codigo = 'gratuito'
        and p.ativo = true;

      if v_dias is not null then
        new.vence_em := now() + v_dias * interval '1 day';
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.definir_vencimento_anuncio()
  from public, anon, authenticated;

create trigger trg_definir_vencimento_anuncio
before update on public.produtos
for each row
execute function private.definir_vencimento_anuncio();

-- ---------------------------------------------------------------------
-- CONSULTA DO PRÓPRIO LIMITE
-- ---------------------------------------------------------------------

create or replace function public.meu_limite_anuncios()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_loja public.lojas%rowtype;
  v_ciclo record;
begin
  if v_uid is null then
    raise exception 'Entre na sua conta.';
  end if;

  select *
  into v_loja
  from public.lojas l
  where l.proprietario_id = v_uid
  order by l.criado_em
  limit 1;

  if not found then
    return jsonb_build_object('plano', 'nenhum');
  end if;

  if v_loja.tipo <> 'pessoal' then
    return jsonb_build_object('plano', 'lojista', 'limite', null);
  end if;

  select * into v_ciclo
  from private.ciclo_anuncios_gratuito(v_loja.id);

  return jsonb_build_object(
    'plano', 'gratuito',
    'limite', v_ciclo.limite,
    'usados', v_ciclo.usados,
    'restantes',
      case when v_ciclo.limite is null then null
           else greatest(v_ciclo.limite - v_ciclo.usados, 0) end,
    'ciclo_inicio', v_ciclo.ciclo_inicio,
    'ciclo_fim', v_ciclo.ciclo_fim,
    'dias_validade', v_ciclo.dias_validade
  );
end;
$$;

revoke all on function public.meu_limite_anuncios() from public, anon;
grant execute on function public.meu_limite_anuncios() to authenticated;
