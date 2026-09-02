-- RF-22: gestão administrativa de usuários (migration remota 20260901222305).
-- A listagem expõe somente os dados necessários ao administrador. As mutações
-- são executadas por Edge Function com service_role e validadas novamente aqui.

begin;

-- Contas que já possuem loja devem refletir o papel de lojista. Administradores
-- são preservados mesmo quando também possuem uma loja.
update public.profiles perfil
set tipo_usuario = 'lojista',
    atualizado_em = pg_catalog.now()
where perfil.tipo_usuario = 'cliente'
  and exists (
    select 1
    from public.lojas loja
    where loja.proprietario_id = perfil.id
  );

create table if not exists public.historico_admin_usuarios (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.profiles(id) on delete set null,
  usuario_nome text not null,
  acao text not null check (
    acao in ('bloquear', 'desbloquear', 'alterar_papel')
  ),
  papel_anterior text check (
    papel_anterior is null
    or papel_anterior in ('cliente', 'lojista', 'admin')
  ),
  papel_novo text check (
    papel_novo is null
    or papel_novo in ('cliente', 'lojista', 'admin')
  ),
  ativo_anterior boolean,
  ativo_novo boolean,
  motivo text not null check (
    char_length(pg_catalog.btrim(motivo)) between 5 and 500
  ),
  alterado_por uuid not null references public.profiles(id) on delete restrict,
  criado_em timestamptz not null default pg_catalog.now()
);

comment on table public.historico_admin_usuarios is
  'Auditoria do RF-22: bloqueios, desbloqueios e alterações de papel realizadas por administradores.';

create index if not exists historico_admin_usuarios_usuario_data_idx
  on public.historico_admin_usuarios (usuario_id, criado_em desc);

create index if not exists historico_admin_usuarios_admin_data_idx
  on public.historico_admin_usuarios (alterado_por, criado_em desc);

create index if not exists profiles_tipo_ativo_criado_idx
  on public.profiles (tipo_usuario, ativo, criado_em desc);

create index if not exists profiles_nome_admin_trgm_idx
  on public.profiles using gin (
    public.normalizar_texto_busca(nome) extensions.gin_trgm_ops
  );

alter table public.historico_admin_usuarios enable row level security;

revoke all on table public.historico_admin_usuarios
  from public, anon, authenticated;

-- A guarda global usa este estado para diferenciar exclusão voluntária de
-- bloqueio administrativo sem expor qualquer outro dado do perfil.
create or replace function public.meu_status_conta()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when perfil.id is null then 'sem_perfil'
    when perfil.excluido_em is not null then 'excluida'
    when perfil.ativo is false then 'bloqueada'
    else 'ativa'
  end
  from (select 1) base
  left join public.profiles perfil
    on perfil.id = (select auth.uid());
$$;

revoke all on function public.meu_status_conta()
  from public, anon, authenticated, service_role;
grant execute on function public.meu_status_conta()
  to authenticated;

comment on function public.meu_status_conta() is
  'RF-22: informa somente o estado da própria conta para a guarda global do frontend.';

create or replace function private.listar_usuarios_admin_core(
  p_busca text,
  p_papel text,
  p_status text,
  p_ordenacao text,
  p_limite integer,
  p_offset integer
)
returns table (
  usuario_id uuid,
  nome text,
  email text,
  tipo_usuario text,
  status_conta text,
  ativo boolean,
  excluido_em timestamptz,
  email_confirmado boolean,
  ultimo_acesso timestamptz,
  criado_em timestamptz,
  total_pedidos bigint,
  total_compras numeric,
  total_lojas bigint,
  total_registros bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_busca text := public.normalizar_texto_busca(
    pg_catalog.left(pg_catalog.btrim(coalesce(p_busca, '')), 100)
  );
  v_papel text := case
    when p_papel in ('cliente', 'lojista', 'admin') then p_papel
    else ''
  end;
  v_status text := case
    when p_status in ('ativo', 'bloqueado', 'excluido') then p_status
    else ''
  end;
  v_ordenacao text := case
    when p_ordenacao in ('recentes', 'antigos', 'nome', 'ultimo_acesso')
      then p_ordenacao
    else 'recentes'
  end;
  v_limite integer := greatest(
    1,
    least(coalesce(p_limite, 12), 50)
  );
  v_offset integer := greatest(0, coalesce(p_offset, 0));
begin
  if v_admin_id is null
     or not public._usuario_e_admin(v_admin_id) then
    raise exception 'Acesso restrito a administradores.' using errcode = '42501';
  end if;

  return query
  with pedidos_resumo as (
    select
      pedido.cliente_id,
      count(*)::bigint as quantidade_pedidos,
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
      )::numeric(14, 2) as valor_compras
    from public.pedidos pedido
    group by pedido.cliente_id
  ),
  lojas_resumo as (
    select
      loja.proprietario_id,
      count(*)::bigint as quantidade_lojas
    from public.lojas loja
    group by loja.proprietario_id
  ),
  base as (
    select
      perfil.id,
      coalesce(nullif(pg_catalog.btrim(perfil.nome), ''), 'Usuário sem nome') as nome_exibicao,
      usuario.email,
      perfil.tipo_usuario,
      case
        when perfil.excluido_em is not null or usuario.deleted_at is not null
          then 'excluido'
        when perfil.ativo is not true
          or usuario.banned_until > pg_catalog.now()
          then 'bloqueado'
        else 'ativo'
      end as situacao,
      perfil.ativo,
      perfil.excluido_em,
      usuario.email_confirmed_at is not null as confirmado,
      usuario.last_sign_in_at,
      coalesce(perfil.criado_em, usuario.created_at) as data_criacao,
      coalesce(pedidos.quantidade_pedidos, 0)::bigint as quantidade_pedidos,
      coalesce(pedidos.valor_compras, 0)::numeric(14, 2) as valor_compras,
      coalesce(lojas.quantidade_lojas, 0)::bigint as quantidade_lojas,
      public.normalizar_texto_busca(
        coalesce(nullif(pg_catalog.btrim(perfil.nome), ''), 'Usuário sem nome')
      ) as nome_normalizado,
      public.normalizar_texto_busca(coalesce(usuario.email, '')) as email_normalizado
    from public.profiles perfil
    join auth.users usuario
      on usuario.id = perfil.id
    left join pedidos_resumo pedidos
      on pedidos.cliente_id = perfil.id
    left join lojas_resumo lojas
      on lojas.proprietario_id = perfil.id
  ),
  filtrados as (
    select base.*
    from base
    where (v_papel = '' or base.tipo_usuario = v_papel)
      and (v_status = '' or base.situacao = v_status)
      and (
        v_busca = ''
        or base.nome_normalizado like ('%' || v_busca || '%')
        or base.email_normalizado like ('%' || v_busca || '%')
      )
  )
  select
    filtrado.id,
    filtrado.nome_exibicao::text,
    filtrado.email::text,
    filtrado.tipo_usuario::text,
    filtrado.situacao::text,
    filtrado.ativo,
    filtrado.excluido_em,
    filtrado.confirmado,
    filtrado.last_sign_in_at,
    filtrado.data_criacao,
    filtrado.quantidade_pedidos,
    filtrado.valor_compras,
    filtrado.quantidade_lojas,
    count(*) over()::bigint
  from filtrados filtrado
  order by
    case when v_ordenacao = 'nome'
      then filtrado.nome_normalizado end asc nulls last,
    case when v_ordenacao = 'antigos'
      then filtrado.data_criacao end asc nulls last,
    case when v_ordenacao = 'ultimo_acesso'
      then filtrado.last_sign_in_at end desc nulls last,
    case when v_ordenacao = 'recentes'
      then filtrado.data_criacao end desc nulls last,
    filtrado.data_criacao desc nulls last,
    filtrado.id
  limit v_limite
  offset v_offset;
end;
$$;

create or replace function private.resumo_usuarios_admin_core()
returns table (
  total_usuarios bigint,
  usuarios_ativos bigint,
  usuarios_bloqueados bigint,
  usuarios_excluidos bigint,
  total_clientes bigint,
  total_lojistas bigint,
  total_admins bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := (select auth.uid());
begin
  if v_admin_id is null
     or not public._usuario_e_admin(v_admin_id) then
    raise exception 'Acesso restrito a administradores.' using errcode = '42501';
  end if;

  return query
  with usuarios as (
    select
      perfil.tipo_usuario,
      case
        when perfil.excluido_em is not null or usuario.deleted_at is not null
          then 'excluido'
        when perfil.ativo is not true
          or usuario.banned_until > pg_catalog.now()
          then 'bloqueado'
        else 'ativo'
      end as situacao
    from public.profiles perfil
    join auth.users usuario
      on usuario.id = perfil.id
  )
  select
    count(*)::bigint,
    count(*) filter (where situacao = 'ativo')::bigint,
    count(*) filter (where situacao = 'bloqueado')::bigint,
    count(*) filter (where situacao = 'excluido')::bigint,
    count(*) filter (
      where tipo_usuario = 'cliente' and situacao <> 'excluido'
    )::bigint,
    count(*) filter (
      where tipo_usuario = 'lojista' and situacao <> 'excluido'
    )::bigint,
    count(*) filter (
      where tipo_usuario = 'admin' and situacao <> 'excluido'
    )::bigint
  from usuarios;
end;
$$;

create or replace function private.listar_historico_usuario_admin_core(
  p_usuario_id uuid,
  p_limite integer,
  p_offset integer
)
returns table (
  id uuid,
  acao text,
  papel_anterior text,
  papel_novo text,
  ativo_anterior boolean,
  ativo_novo boolean,
  motivo text,
  administrador_nome text,
  criado_em timestamptz,
  total_registros bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_limite integer := greatest(
    1,
    least(coalesce(p_limite, 8), 50)
  );
  v_offset integer := greatest(0, coalesce(p_offset, 0));
begin
  if v_admin_id is null
     or not public._usuario_e_admin(v_admin_id) then
    raise exception 'Acesso restrito a administradores.' using errcode = '42501';
  end if;

  if p_usuario_id is null then
    raise exception 'Usuário inválido.';
  end if;

  return query
  select
    historico.id,
    historico.acao,
    historico.papel_anterior,
    historico.papel_novo,
    historico.ativo_anterior,
    historico.ativo_novo,
    historico.motivo,
    coalesce(admin.nome, 'Administrador')::text,
    historico.criado_em,
    count(*) over()::bigint
  from public.historico_admin_usuarios historico
  left join public.profiles admin
    on admin.id = historico.alterado_por
  where historico.usuario_id = p_usuario_id
  order by historico.criado_em desc, historico.id
  limit v_limite
  offset v_offset;
end;
$$;

create or replace function private.validar_acao_usuario_admin_core(
  p_admin_id uuid,
  p_usuario_id uuid,
  p_acao text,
  p_novo_papel text,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_acao text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_acao, '')));
  v_novo_papel text := pg_catalog.lower(
    pg_catalog.btrim(coalesce(p_novo_papel, ''))
  );
  v_motivo text := nullif(
    pg_catalog.btrim(pg_catalog.left(coalesce(p_motivo, ''), 501)),
    ''
  );
  v_perfil record;
  v_banido boolean := false;
  v_admins_ativos bigint := 0;
begin
  if p_admin_id is null
     or not public._usuario_e_admin(p_admin_id) then
    raise exception 'Acesso restrito a administradores.' using errcode = '42501';
  end if;

  if p_usuario_id is null then
    raise exception 'Usuário inválido.';
  end if;

  if p_usuario_id = p_admin_id then
    raise exception 'Você não pode alterar o bloqueio ou o papel da própria conta.';
  end if;

  if v_acao not in ('bloquear', 'desbloquear', 'alterar_papel') then
    raise exception 'Ação administrativa inválida.';
  end if;

  if v_motivo is null or char_length(v_motivo) < 5 then
    raise exception 'Informe um motivo com pelo menos 5 caracteres.';
  end if;

  if char_length(v_motivo) > 500 then
    raise exception 'O motivo deve ter no máximo 500 caracteres.';
  end if;

  select
    perfil.id,
    perfil.nome,
    perfil.tipo_usuario,
    perfil.ativo,
    perfil.excluido_em,
    coalesce(usuario.banned_until > pg_catalog.now(), false) as banido
  into v_perfil
  from public.profiles perfil
  join auth.users usuario
    on usuario.id = perfil.id
  where perfil.id = p_usuario_id;

  if not found then
    raise exception 'Usuário não encontrado.';
  end if;

  if v_perfil.excluido_em is not null then
    raise exception 'Contas excluídas não podem ser administradas.';
  end if;

  v_banido := v_perfil.banido;

  select count(*)
  into v_admins_ativos
  from public.profiles perfil
  join auth.users usuario
    on usuario.id = perfil.id
  where perfil.tipo_usuario = 'admin'
    and perfil.ativo is true
    and perfil.excluido_em is null
    and not coalesce(usuario.banned_until > pg_catalog.now(), false);

  if v_acao = 'bloquear' then
    if v_perfil.ativo is false and v_banido then
      raise exception 'Esta conta já está bloqueada.';
    end if;

    if v_perfil.tipo_usuario = 'admin' and v_admins_ativos <= 1 then
      raise exception 'O último administrador ativo não pode ser bloqueado.';
    end if;
  elsif v_acao = 'desbloquear' then
    if v_perfil.ativo is true and not v_banido then
      raise exception 'Esta conta já está ativa.';
    end if;
  else
    if v_novo_papel not in ('cliente', 'lojista', 'admin') then
      raise exception 'Papel de usuário inválido.';
    end if;

    if v_perfil.ativo is false or v_banido then
      raise exception 'Desbloqueie a conta antes de alterar o papel.';
    end if;

    if v_novo_papel = v_perfil.tipo_usuario then
      raise exception 'O usuário já possui este papel.';
    end if;

    if v_perfil.tipo_usuario = 'admin' and v_admins_ativos <= 1 then
      raise exception 'O último administrador ativo não pode perder esse papel.';
    end if;

    if v_novo_papel = 'cliente' and exists (
      select 1
      from public.lojas loja
      where loja.proprietario_id = p_usuario_id
    ) then
      raise exception 'Um proprietário de loja não pode ser alterado para cliente. Gerencie a loja primeiro.';
    end if;
  end if;

  return jsonb_build_object(
    'valido', true,
    'usuario_id', v_perfil.id,
    'nome', coalesce(nullif(pg_catalog.btrim(v_perfil.nome), ''), 'Usuário'),
    'papel_atual', v_perfil.tipo_usuario,
    'ativo_atual', v_perfil.ativo,
    'banido_auth', v_banido,
    'acao', v_acao,
    'novo_papel', case
      when v_acao = 'alterar_papel' then v_novo_papel
      else null
    end
  );
end;
$$;

create or replace function private.executar_acao_usuario_admin_core(
  p_admin_id uuid,
  p_usuario_id uuid,
  p_acao text,
  p_novo_papel text,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_validacao jsonb;
  v_acao text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_acao, '')));
  v_novo_papel text := pg_catalog.lower(
    pg_catalog.btrim(coalesce(p_novo_papel, ''))
  );
  v_motivo text := pg_catalog.btrim(coalesce(p_motivo, ''));
  v_perfil record;
  v_lojas_suspensas integer := 0;
begin
  v_validacao := private.validar_acao_usuario_admin_core(
    p_admin_id,
    p_usuario_id,
    p_acao,
    p_novo_papel,
    p_motivo
  );

  select
    perfil.nome,
    perfil.tipo_usuario,
    perfil.ativo
  into v_perfil
  from public.profiles perfil
  where perfil.id = p_usuario_id
  for update;

  if v_acao = 'bloquear' then
    select count(*)::integer
    into v_lojas_suspensas
    from public.lojas loja
    where loja.proprietario_id = p_usuario_id
      and coalesce(loja.status_aprovacao, 'pendente')
          not in ('rejeitada', 'suspensa');

    insert into public.historico_status_lojas (
      loja_id,
      status_anterior,
      status_novo,
      motivo,
      alterado_por
    )
    select
      loja.id,
      loja.status_aprovacao,
      'suspensa',
      pg_catalog.left('Conta do proprietário bloqueada: ' || v_motivo, 500),
      p_admin_id
    from public.lojas loja
    where loja.proprietario_id = p_usuario_id
      and coalesce(loja.status_aprovacao, 'pendente')
          not in ('rejeitada', 'suspensa');

    update public.lojas loja
    set ativa = false,
        status_aprovacao = case
          when coalesce(loja.status_aprovacao, 'pendente')
               in ('rejeitada', 'suspensa')
            then loja.status_aprovacao
          else 'suspensa'
        end,
        motivo_rejeicao = case
          when coalesce(loja.status_aprovacao, 'pendente') = 'rejeitada'
            then loja.motivo_rejeicao
          else pg_catalog.left('Conta do proprietário bloqueada: ' || v_motivo, 500)
        end,
        aprovado_em = null,
        aprovado_por = null,
        atualizado_em = pg_catalog.now()
    where loja.proprietario_id = p_usuario_id;

    update public.profiles
    set ativo = false,
        atualizado_em = pg_catalog.now()
    where id = p_usuario_id;
  elsif v_acao = 'desbloquear' then
    update public.profiles
    set ativo = true,
        atualizado_em = pg_catalog.now()
    where id = p_usuario_id;
  else
    update public.profiles
    set tipo_usuario = v_novo_papel,
        atualizado_em = pg_catalog.now()
    where id = p_usuario_id;
  end if;

  insert into public.historico_admin_usuarios (
    usuario_id,
    usuario_nome,
    acao,
    papel_anterior,
    papel_novo,
    ativo_anterior,
    ativo_novo,
    motivo,
    alterado_por
  ) values (
    p_usuario_id,
    coalesce(nullif(pg_catalog.btrim(v_perfil.nome), ''), 'Usuário'),
    v_acao,
    v_perfil.tipo_usuario,
    case
      when v_acao = 'alterar_papel' then v_novo_papel
      else v_perfil.tipo_usuario
    end,
    v_perfil.ativo,
    case
      when v_acao = 'bloquear' then false
      when v_acao = 'desbloquear' then true
      else v_perfil.ativo
    end,
    v_motivo,
    p_admin_id
  );

  return jsonb_build_object(
    'sucesso', true,
    'usuario_id', p_usuario_id,
    'acao', v_acao,
    'papel', case
      when v_acao = 'alterar_papel' then v_novo_papel
      else v_perfil.tipo_usuario
    end,
    'ativo', case
      when v_acao = 'bloquear' then false
      when v_acao = 'desbloquear' then true
      else v_perfil.ativo
    end,
    'lojas_suspensas', v_lojas_suspensas
  );
end;
$$;

revoke all on function private.listar_usuarios_admin_core(
  text, text, text, text, integer, integer
) from public, anon, authenticated, service_role;
revoke all on function private.resumo_usuarios_admin_core()
  from public, anon, authenticated, service_role;
revoke all on function private.listar_historico_usuario_admin_core(
  uuid, integer, integer
) from public, anon, authenticated, service_role;
revoke all on function private.validar_acao_usuario_admin_core(
  uuid, uuid, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function private.executar_acao_usuario_admin_core(
  uuid, uuid, text, text, text
) from public, anon, authenticated, service_role;

grant usage on schema private to authenticated, service_role;

grant execute on function private.listar_usuarios_admin_core(
  text, text, text, text, integer, integer
) to authenticated;
grant execute on function private.resumo_usuarios_admin_core()
  to authenticated;
grant execute on function private.listar_historico_usuario_admin_core(
  uuid, integer, integer
) to authenticated;
grant execute on function private.validar_acao_usuario_admin_core(
  uuid, uuid, text, text, text
) to service_role;
grant execute on function private.executar_acao_usuario_admin_core(
  uuid, uuid, text, text, text
) to service_role;

create or replace function public.listar_usuarios_admin(
  p_busca text default '',
  p_papel text default '',
  p_status text default '',
  p_ordenacao text default 'recentes',
  p_limite integer default 12,
  p_offset integer default 0
)
returns table (
  usuario_id uuid,
  nome text,
  email text,
  tipo_usuario text,
  status_conta text,
  ativo boolean,
  excluido_em timestamptz,
  email_confirmado boolean,
  ultimo_acesso timestamptz,
  criado_em timestamptz,
  total_pedidos bigint,
  total_compras numeric,
  total_lojas bigint,
  total_registros bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from private.listar_usuarios_admin_core(
    p_busca,
    p_papel,
    p_status,
    p_ordenacao,
    p_limite,
    p_offset
  );
$$;

create or replace function public.resumo_usuarios_admin()
returns table (
  total_usuarios bigint,
  usuarios_ativos bigint,
  usuarios_bloqueados bigint,
  usuarios_excluidos bigint,
  total_clientes bigint,
  total_lojistas bigint,
  total_admins bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.resumo_usuarios_admin_core();
$$;

create or replace function public.listar_historico_usuario_admin(
  p_usuario_id uuid,
  p_limite integer default 8,
  p_offset integer default 0
)
returns table (
  id uuid,
  acao text,
  papel_anterior text,
  papel_novo text,
  ativo_anterior boolean,
  ativo_novo boolean,
  motivo text,
  administrador_nome text,
  criado_em timestamptz,
  total_registros bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from private.listar_historico_usuario_admin_core(
    p_usuario_id,
    p_limite,
    p_offset
  );
$$;

create or replace function public.validar_acao_usuario_admin_service(
  p_admin_id uuid,
  p_usuario_id uuid,
  p_acao text,
  p_novo_papel text default null,
  p_motivo text default ''
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.validar_acao_usuario_admin_core(
    p_admin_id,
    p_usuario_id,
    p_acao,
    p_novo_papel,
    p_motivo
  );
$$;

create or replace function public.executar_acao_usuario_admin_service(
  p_admin_id uuid,
  p_usuario_id uuid,
  p_acao text,
  p_novo_papel text default null,
  p_motivo text default ''
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.executar_acao_usuario_admin_core(
    p_admin_id,
    p_usuario_id,
    p_acao,
    p_novo_papel,
    p_motivo
  );
$$;

revoke all on function public.listar_usuarios_admin(
  text, text, text, text, integer, integer
) from public, anon, authenticated, service_role;
revoke all on function public.resumo_usuarios_admin()
  from public, anon, authenticated, service_role;
revoke all on function public.listar_historico_usuario_admin(
  uuid, integer, integer
) from public, anon, authenticated, service_role;
revoke all on function public.validar_acao_usuario_admin_service(
  uuid, uuid, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.executar_acao_usuario_admin_service(
  uuid, uuid, text, text, text
) from public, anon, authenticated, service_role;

grant execute on function public.listar_usuarios_admin(
  text, text, text, text, integer, integer
) to authenticated;
grant execute on function public.resumo_usuarios_admin()
  to authenticated;
grant execute on function public.listar_historico_usuario_admin(
  uuid, integer, integer
) to authenticated;
grant execute on function public.validar_acao_usuario_admin_service(
  uuid, uuid, text, text, text
) to service_role;
grant execute on function public.executar_acao_usuario_admin_service(
  uuid, uuid, text, text, text
) to service_role;

comment on function public.listar_usuarios_admin(
  text, text, text, text, integer, integer
) is
  'RF-22: lista paginada de usuários, disponível somente para administradores autenticados.';

comment on function public.executar_acao_usuario_admin_service(
  uuid, uuid, text, text, text
) is
  'RF-22: mutação reservada à Edge Function com service_role; repete todas as validações antes de alterar perfil e auditoria.';

commit;
