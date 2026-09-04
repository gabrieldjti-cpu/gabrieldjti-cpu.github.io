-- Comércio da Cidade
-- RF-26: denúncias e moderação de produtos e avaliações com auditoria.

begin;

alter table public.produtos
  add column if not exists moderado_em timestamptz,
  add column if not exists moderado_por uuid
    references public.profiles(id) on delete restrict,
  add column if not exists motivo_moderacao text;

alter table public.avaliacoes
  add column if not exists ativo boolean not null default true,
  add column if not exists moderado_em timestamptz,
  add column if not exists moderado_por uuid
    references public.profiles(id) on delete restrict,
  add column if not exists motivo_moderacao text;

alter table public.produtos
  drop constraint if exists produtos_motivo_moderacao_check;
alter table public.produtos
  add constraint produtos_motivo_moderacao_check check (
    motivo_moderacao is null
    or char_length(pg_catalog.btrim(motivo_moderacao)) between 5 and 500
  );

alter table public.avaliacoes
  drop constraint if exists avaliacoes_motivo_moderacao_check;
alter table public.avaliacoes
  add constraint avaliacoes_motivo_moderacao_check check (
    motivo_moderacao is null
    or char_length(pg_catalog.btrim(motivo_moderacao)) between 5 and 500
  );

create index if not exists produtos_moderados_idx
  on public.produtos (moderado_em desc)
  where moderado_em is not null;

create index if not exists avaliacoes_produto_ativas_data_idx
  on public.avaliacoes (produto_id, criado_em desc)
  where ativo is true;

create table public.denuncias_conteudo (
  id uuid primary key default gen_random_uuid(),
  denunciante_id uuid not null
    references public.profiles(id) on delete restrict,
  denunciante_nome text not null,
  tipo_conteudo text not null,
  produto_id uuid not null
    references public.produtos(id) on delete restrict,
  avaliacao_id uuid
    references public.avaliacoes(id) on delete restrict,
  loja_id uuid not null
    references public.lojas(id) on delete restrict,
  loja_nome text not null,
  conteudo_titulo text not null,
  conteudo_resumo text,
  motivo text not null,
  detalhes text,
  status text not null default 'pendente',
  analisado_por uuid
    references public.profiles(id) on delete restrict,
  analisado_por_nome text,
  justificativa_admin text,
  conteudo_ocultado boolean not null default false,
  criado_em timestamptz not null default pg_catalog.now(),
  atualizado_em timestamptz not null default pg_catalog.now(),
  analisado_em timestamptz,

  constraint denuncias_conteudo_tipo_check check (
    tipo_conteudo in ('produto', 'avaliacao')
  ),
  constraint denuncias_conteudo_alvo_check check (
    (tipo_conteudo = 'produto' and avaliacao_id is null)
    or (tipo_conteudo = 'avaliacao' and avaliacao_id is not null)
  ),
  constraint denuncias_conteudo_motivo_check check (
    motivo in (
      'conteudo_improprio',
      'categoria_incorreta',
      'preco_abusivo',
      'produto_proibido',
      'spam',
      'ofensa',
      'conteudo_falso',
      'outro'
    )
  ),
  constraint denuncias_conteudo_status_check check (
    status in ('pendente', 'procedente', 'improcedente')
  ),
  constraint denuncias_conteudo_denunciante_nome_check check (
    char_length(pg_catalog.btrim(denunciante_nome)) between 1 and 120
  ),
  constraint denuncias_conteudo_loja_nome_check check (
    char_length(pg_catalog.btrim(loja_nome)) between 1 and 120
  ),
  constraint denuncias_conteudo_titulo_check check (
    char_length(pg_catalog.btrim(conteudo_titulo)) between 1 and 180
  ),
  constraint denuncias_conteudo_resumo_check check (
    conteudo_resumo is null
    or char_length(conteudo_resumo) <= 1200
  ),
  constraint denuncias_conteudo_detalhes_check check (
    detalhes is null
    or char_length(pg_catalog.btrim(detalhes)) between 5 and 1000
  ),
  constraint denuncias_conteudo_justificativa_check check (
    justificativa_admin is null
    or char_length(pg_catalog.btrim(justificativa_admin)) between 5 and 500
  ),
  constraint denuncias_conteudo_decisao_check check (
    (
      status = 'pendente'
      and analisado_por is null
      and analisado_em is null
      and justificativa_admin is null
      and conteudo_ocultado is false
    )
    or (
      status in ('procedente', 'improcedente')
      and analisado_por is not null
      and analisado_em is not null
      and justificativa_admin is not null
    )
  )
);

comment on table public.denuncias_conteudo is
  'RF-26: denúncias autenticadas de produtos e avaliações, com snapshot mínimo para análise e decisão administrativa.';

create unique index denuncias_produto_pendente_usuario_idx
  on public.denuncias_conteudo (denunciante_id, produto_id)
  where status = 'pendente' and tipo_conteudo = 'produto';

create unique index denuncias_avaliacao_pendente_usuario_idx
  on public.denuncias_conteudo (denunciante_id, avaliacao_id)
  where status = 'pendente' and tipo_conteudo = 'avaliacao';

create index denuncias_status_tipo_data_idx
  on public.denuncias_conteudo (status, tipo_conteudo, criado_em desc);

create index denuncias_denunciante_data_idx
  on public.denuncias_conteudo (denunciante_id, criado_em desc);

create index denuncias_produto_idx
  on public.denuncias_conteudo (produto_id);

create index denuncias_avaliacao_idx
  on public.denuncias_conteudo (avaliacao_id)
  where avaliacao_id is not null;

create table public.historico_moderacao (
  id bigint generated always as identity primary key,
  denuncia_id uuid not null
    references public.denuncias_conteudo(id) on delete restrict,
  status_anterior text,
  status_novo text not null,
  acao text not null,
  motivo text not null,
  alterado_por uuid
    references public.profiles(id) on delete restrict,
  alterado_por_nome text not null,
  criado_em timestamptz not null default pg_catalog.now(),

  constraint historico_moderacao_status_anterior_check check (
    status_anterior is null
    or status_anterior in ('pendente', 'procedente', 'improcedente')
  ),
  constraint historico_moderacao_status_novo_check check (
    status_novo in ('pendente', 'procedente', 'improcedente')
  ),
  constraint historico_moderacao_acao_check check (
    acao in (
      'denuncia_criada',
      'violacao_confirmada',
      'conteudo_ocultado',
      'denuncia_arquivada'
    )
  ),
  constraint historico_moderacao_motivo_check check (
    char_length(pg_catalog.btrim(motivo)) between 5 and 1000
  ),
  constraint historico_moderacao_autor_check check (
    char_length(pg_catalog.btrim(alterado_por_nome)) between 1 and 120
  )
);

comment on table public.historico_moderacao is
  'RF-26: trilha imutável das denúncias e decisões administrativas de moderação.';

create index historico_moderacao_denuncia_data_idx
  on public.historico_moderacao (denuncia_id, criado_em desc);

create index historico_moderacao_admin_data_idx
  on public.historico_moderacao (alterado_por, criado_em desc)
  where alterado_por is not null;

alter table public.denuncias_conteudo enable row level security;
alter table public.historico_moderacao enable row level security;

revoke all on table public.denuncias_conteudo
  from public, anon, authenticated;
revoke all on table public.historico_moderacao
  from public, anon, authenticated;
revoke all on sequence public.historico_moderacao_id_seq
  from public, anon, authenticated;

grant select on table public.denuncias_conteudo to authenticated;

create policy "Usuário visualiza próprias denúncias"
  on public.denuncias_conteudo
  for select
  to authenticated
  using ((select auth.uid()) = denunciante_id);

create policy "Histórico de moderação sem acesso direto"
  on public.historico_moderacao
  as restrictive
  for all
  to authenticated
  using (false)
  with check (false);

alter table public.notificacoes
  drop constraint if exists notificacoes_tipo_check;

alter table public.notificacoes
  add constraint notificacoes_tipo_check check (tipo in (
    'pedido_novo',
    'pedido_status',
    'cancelamento_solicitado',
    'cancelamento_resolvido',
    'estoque_baixo',
    'avaliacao_nova',
    'loja_pendente',
    'loja_status',
    'moderacao_nova',
    'moderacao_resolvida',
    'conteudo_moderado'
  ));

drop policy if exists "Lojista pode cadastrar produtos" on public.produtos;
create policy "Lojista pode cadastrar produtos"
  on public.produtos
  for insert
  to authenticated
  with check (
    moderado_em is null
    and moderado_por is null
    and motivo_moderacao is null
    and exists (
      select 1
      from public.lojas loja
      where loja.id = produtos.loja_id
        and loja.proprietario_id = (select auth.uid())
    )
  );

drop policy if exists "Lojista pode editar produtos" on public.produtos;
create policy "Lojista pode editar produtos"
  on public.produtos
  for update
  to authenticated
  using (
    moderado_em is null
    and exists (
      select 1
      from public.lojas loja
      where loja.id = produtos.loja_id
        and loja.proprietario_id = (select auth.uid())
    )
  )
  with check (
    moderado_em is null
    and moderado_por is null
    and motivo_moderacao is null
    and exists (
      select 1
      from public.lojas loja
      where loja.id = produtos.loja_id
        and loja.proprietario_id = (select auth.uid())
    )
  );

create or replace function private.criar_denuncia_conteudo_core(
  p_tipo_conteudo text,
  p_conteudo_id uuid,
  p_motivo text,
  p_detalhes text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_tipo text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_tipo_conteudo, '')));
  v_motivo text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_motivo, '')));
  v_detalhes text := nullif(
    pg_catalog.btrim(pg_catalog.left(coalesce(p_detalhes, ''), 1001)),
    ''
  );
  v_perfil record;
  v_alvo record;
  v_denuncia_id uuid;
  v_produto_id uuid;
  v_avaliacao_id uuid;
  v_admin_id uuid;
  v_titulo text;
  v_resumo text;
  v_motivos_produto text[] := array[
    'conteudo_improprio',
    'categoria_incorreta',
    'preco_abusivo',
    'produto_proibido',
    'outro'
  ];
  v_motivos_avaliacao text[] := array[
    'spam',
    'ofensa',
    'conteudo_falso',
    'outro'
  ];
begin
  if v_uid is null then
    raise exception 'Entre na sua conta para enviar uma denúncia.' using errcode = '42501';
  end if;

  select
    perfil.nome,
    perfil.ativo,
    perfil.excluido_em
  into v_perfil
  from public.profiles perfil
  where perfil.id = v_uid;

  if not found
     or v_perfil.ativo is not true
     or v_perfil.excluido_em is not null then
    raise exception 'Sua conta não está disponível para enviar denúncias.' using errcode = '42501';
  end if;

  if p_conteudo_id is null or v_tipo not in ('produto', 'avaliacao') then
    raise exception 'Conteúdo inválido para denúncia.' using errcode = '22023';
  end if;

  if (v_tipo = 'produto' and not v_motivo = any(v_motivos_produto))
     or (v_tipo = 'avaliacao' and not v_motivo = any(v_motivos_avaliacao)) then
    raise exception 'Selecione um motivo válido para a denúncia.' using errcode = '22023';
  end if;

  if v_detalhes is not null and char_length(v_detalhes) < 5 then
    raise exception 'Os detalhes devem ter pelo menos 5 caracteres.' using errcode = '22023';
  end if;

  if v_detalhes is not null and char_length(v_detalhes) > 1000 then
    raise exception 'Os detalhes devem ter no máximo 1000 caracteres.' using errcode = '22023';
  end if;

  if v_motivo = 'outro'
     and (v_detalhes is null or char_length(v_detalhes) < 10) then
    raise exception 'Descreva o motivo da denúncia com pelo menos 10 caracteres.' using errcode = '22023';
  end if;

  if (
    select count(*)
    from public.denuncias_conteudo denuncia
    where denuncia.denunciante_id = v_uid
      and denuncia.criado_em >= pg_catalog.now() - interval '24 hours'
  ) >= 10 then
    raise exception 'Você atingiu o limite de 10 denúncias em 24 horas. Tente novamente mais tarde.' using errcode = '54000';
  end if;

  if v_tipo = 'produto' then
    select
      produto.id as produto_id,
      produto.nome::text as produto_nome,
      produto.descricao::text as produto_descricao,
      loja.id as loja_id,
      loja.nome::text as loja_nome,
      loja.proprietario_id
    into v_alvo
    from public.produtos produto
    join public.lojas loja on loja.id = produto.loja_id
    where produto.id = p_conteudo_id
      and produto.ativo is true
      and produto.moderado_em is null
      and loja.ativa is true
      and loja.status_aprovacao = 'aprovada';

    if not found then
      raise exception 'Este produto não está disponível para denúncia.' using errcode = '22023';
    end if;

    if v_alvo.proprietario_id = v_uid then
      raise exception 'Você não pode denunciar um produto da própria loja.' using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.denuncias_conteudo denuncia
      where denuncia.denunciante_id = v_uid
        and denuncia.produto_id = v_alvo.produto_id
        and denuncia.tipo_conteudo = 'produto'
        and denuncia.status = 'pendente'
    ) then
      raise exception 'Você já enviou uma denúncia pendente para este produto.' using errcode = '23505';
    end if;

    v_produto_id := v_alvo.produto_id;
    v_titulo := pg_catalog.left(v_alvo.produto_nome, 180);
    v_resumo := nullif(pg_catalog.left(coalesce(v_alvo.produto_descricao, ''), 1200), '');
  else
    select
      avaliacao.id as avaliacao_id,
      avaliacao.cliente_id,
      avaliacao.comentario::text,
      avaliacao.resposta_loja::text,
      produto.id as produto_id,
      produto.nome::text as produto_nome,
      loja.id as loja_id,
      loja.nome::text as loja_nome,
      loja.proprietario_id
    into v_alvo
    from public.avaliacoes avaliacao
    join public.produtos produto on produto.id = avaliacao.produto_id
    join public.lojas loja on loja.id = produto.loja_id
    where avaliacao.id = p_conteudo_id
      and avaliacao.ativo is true
      and avaliacao.moderado_em is null
      and produto.ativo is true
      and loja.ativa is true
      and loja.status_aprovacao = 'aprovada';

    if not found then
      raise exception 'Esta avaliação não está disponível para denúncia.' using errcode = '22023';
    end if;

    if v_alvo.cliente_id = v_uid then
      raise exception 'Você não pode denunciar a própria avaliação.' using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.denuncias_conteudo denuncia
      where denuncia.denunciante_id = v_uid
        and denuncia.avaliacao_id = v_alvo.avaliacao_id
        and denuncia.status = 'pendente'
    ) then
      raise exception 'Você já enviou uma denúncia pendente para esta avaliação.' using errcode = '23505';
    end if;

    v_produto_id := v_alvo.produto_id;
    v_avaliacao_id := v_alvo.avaliacao_id;
    v_titulo := pg_catalog.left(
      pg_catalog.format('Avaliação de %s', v_alvo.produto_nome),
      180
    );
    v_resumo := pg_catalog.left(
      coalesce(nullif(pg_catalog.btrim(v_alvo.comentario), ''), 'Avaliação sem comentário.')
      || case
        when nullif(pg_catalog.btrim(v_alvo.resposta_loja), '') is not null
          then E'\nResposta da loja: ' || pg_catalog.btrim(v_alvo.resposta_loja)
        else ''
      end,
      1200
    );
  end if;

  insert into public.denuncias_conteudo (
    denunciante_id,
    denunciante_nome,
    tipo_conteudo,
    produto_id,
    avaliacao_id,
    loja_id,
    loja_nome,
    conteudo_titulo,
    conteudo_resumo,
    motivo,
    detalhes
  ) values (
    v_uid,
    pg_catalog.left(
      coalesce(nullif(pg_catalog.btrim(v_perfil.nome), ''), 'Usuário'),
      120
    ),
    v_tipo,
    v_produto_id,
    v_avaliacao_id,
    v_alvo.loja_id,
    pg_catalog.left(v_alvo.loja_nome, 120),
    v_titulo,
    v_resumo,
    v_motivo,
    v_detalhes
  )
  returning id into v_denuncia_id;

  insert into public.historico_moderacao (
    denuncia_id,
    status_anterior,
    status_novo,
    acao,
    motivo,
    alterado_por,
    alterado_por_nome
  ) values (
    v_denuncia_id,
    null,
    'pendente',
    'denuncia_criada',
    coalesce(v_detalhes, 'Denúncia enviada para análise administrativa.'),
    v_uid,
    pg_catalog.left(
      coalesce(nullif(pg_catalog.btrim(v_perfil.nome), ''), 'Usuário'),
      120
    )
  );

  select admin.usuario_id
    into v_admin_id
  from private.admin_principal admin
  where admin.singleton is true;

  perform private.salvar_notificacao(
    v_admin_id,
    'moderacao_nova',
    'Nova denúncia para analisar',
    pg_catalog.format('%s recebeu uma denúncia de %s.', v_titulo, replace(v_motivo, '_', ' ')),
    pg_catalog.format('admin-moderacao.html?denuncia=%s', v_denuncia_id),
    pg_catalog.jsonb_build_object(
      'denuncia_id', v_denuncia_id,
      'tipo_conteudo', v_tipo,
      'produto_id', v_produto_id,
      'avaliacao_id', v_avaliacao_id
    ),
    pg_catalog.format('moderacao:%s:nova', v_denuncia_id),
    false
  );

  return pg_catalog.jsonb_build_object(
    'sucesso', true,
    'denuncia_id', v_denuncia_id,
    'status', 'pendente'
  );
exception
  when unique_violation then
    raise exception 'Você já enviou uma denúncia pendente para este conteúdo.' using errcode = '23505';
end;
$$;

create or replace function private.listar_denuncias_admin_core(
  p_status text,
  p_tipo text,
  p_busca text,
  p_limite integer,
  p_offset integer
)
returns table (
  denuncia_id uuid,
  tipo_conteudo text,
  produto_id uuid,
  avaliacao_id uuid,
  conteudo_titulo text,
  conteudo_resumo text,
  loja_id uuid,
  loja_nome text,
  motivo text,
  detalhes text,
  status text,
  denunciante_nome text,
  criado_em timestamptz,
  analisado_em timestamptz,
  analisado_por_nome text,
  justificativa_admin text,
  conteudo_ocultado boolean,
  conteudo_ativo boolean,
  total_registros bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_status text := case
    when p_status in ('pendente', 'procedente', 'improcedente') then p_status
    else ''
  end;
  v_tipo text := case
    when p_tipo in ('produto', 'avaliacao') then p_tipo
    else ''
  end;
  v_busca text := public.normalizar_texto_busca(
    pg_catalog.left(pg_catalog.btrim(coalesce(p_busca, '')), 100)
  );
  v_limite integer := greatest(1, least(coalesce(p_limite, 12), 50));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
begin
  if v_uid is null or not public._usuario_e_admin(v_uid) then
    raise exception 'Acesso restrito a administradores.' using errcode = '42501';
  end if;

  return query
  with base as (
    select
      denuncia.*,
      case
        when denuncia.tipo_conteudo = 'produto'
          then coalesce(produto.ativo, false) and produto.moderado_em is null
        else coalesce(avaliacao.ativo, false) and avaliacao.moderado_em is null
      end as alvo_ativo,
      public.normalizar_texto_busca(
        pg_catalog.concat_ws(
          ' ',
          denuncia.conteudo_titulo,
          denuncia.conteudo_resumo,
          denuncia.loja_nome,
          denuncia.denunciante_nome,
          denuncia.id::text,
          denuncia.motivo,
          denuncia.detalhes
        )
      ) as texto_busca
    from public.denuncias_conteudo denuncia
    left join public.produtos produto on produto.id = denuncia.produto_id
    left join public.avaliacoes avaliacao on avaliacao.id = denuncia.avaliacao_id
  ),
  filtradas as (
    select base.*
    from base
    where (v_status = '' or base.status = v_status)
      and (v_tipo = '' or base.tipo_conteudo = v_tipo)
      and (v_busca = '' or base.texto_busca like ('%' || v_busca || '%'))
  )
  select
    filtrada.id,
    filtrada.tipo_conteudo,
    filtrada.produto_id,
    filtrada.avaliacao_id,
    filtrada.conteudo_titulo,
    filtrada.conteudo_resumo,
    filtrada.loja_id,
    filtrada.loja_nome,
    filtrada.motivo,
    filtrada.detalhes,
    filtrada.status,
    filtrada.denunciante_nome,
    filtrada.criado_em,
    filtrada.analisado_em,
    filtrada.analisado_por_nome,
    filtrada.justificativa_admin,
    filtrada.conteudo_ocultado,
    filtrada.alvo_ativo,
    count(*) over()::bigint
  from filtradas filtrada
  order by
    case when filtrada.status = 'pendente' then 0 else 1 end,
    filtrada.criado_em desc,
    filtrada.id
  limit v_limite
  offset v_offset;
end;
$$;

create or replace function private.resumo_moderacao_admin_core()
returns table (
  total_denuncias bigint,
  pendentes bigint,
  procedentes bigint,
  improcedentes bigint,
  conteudos_ocultados bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not public._usuario_e_admin(v_uid) then
    raise exception 'Acesso restrito a administradores.' using errcode = '42501';
  end if;

  return query
  select
    count(*)::bigint,
    count(*) filter (where denuncia.status = 'pendente')::bigint,
    count(*) filter (where denuncia.status = 'procedente')::bigint,
    count(*) filter (where denuncia.status = 'improcedente')::bigint,
    count(*) filter (where denuncia.conteudo_ocultado is true)::bigint
  from public.denuncias_conteudo denuncia;
end;
$$;

create or replace function private.listar_historico_moderacao_admin_core(
  p_denuncia_id uuid
)
returns table (
  id bigint,
  status_anterior text,
  status_novo text,
  acao text,
  motivo text,
  alterado_por_nome text,
  criado_em timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not public._usuario_e_admin(v_uid) then
    raise exception 'Acesso restrito a administradores.' using errcode = '42501';
  end if;

  if p_denuncia_id is null then
    raise exception 'Denúncia inválida.' using errcode = '22023';
  end if;

  return query
  select
    historico.id,
    historico.status_anterior,
    historico.status_novo,
    historico.acao,
    historico.motivo,
    historico.alterado_por_nome,
    historico.criado_em
  from public.historico_moderacao historico
  where historico.denuncia_id = p_denuncia_id
  order by historico.criado_em desc, historico.id desc;
end;
$$;

create or replace function private.resolver_denuncia_conteudo_core(
  p_denuncia_id uuid,
  p_decisao text,
  p_justificativa text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_decisao text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_decisao, '')));
  v_justificativa text := pg_catalog.btrim(
    pg_catalog.left(coalesce(p_justificativa, ''), 501)
  );
  v_denuncia public.denuncias_conteudo%rowtype;
  v_admin_nome text;
  v_conteudo_autor uuid;
  v_conteudo_ativo boolean := false;
  v_ocultado boolean := false;
  v_acao text;
begin
  if v_uid is null or not public._usuario_e_admin(v_uid) then
    raise exception 'Acesso restrito a administradores.' using errcode = '42501';
  end if;

  if p_denuncia_id is null or v_decisao not in ('procedente', 'improcedente') then
    raise exception 'Decisão de moderação inválida.' using errcode = '22023';
  end if;

  if char_length(v_justificativa) < 5 then
    raise exception 'Informe uma justificativa com pelo menos 5 caracteres.' using errcode = '22023';
  end if;

  if char_length(v_justificativa) > 500 then
    raise exception 'A justificativa deve ter no máximo 500 caracteres.' using errcode = '22023';
  end if;

  select denuncia.*
    into v_denuncia
  from public.denuncias_conteudo denuncia
  where denuncia.id = p_denuncia_id
  for update;

  if not found then
    raise exception 'Denúncia não encontrada.' using errcode = '22023';
  end if;

  if v_denuncia.status <> 'pendente' then
    raise exception 'Esta denúncia já foi analisada.' using errcode = '22023';
  end if;

  select pg_catalog.left(
    coalesce(nullif(pg_catalog.btrim(perfil.nome), ''), 'Administrador'),
    120
  )
  into v_admin_nome
  from public.profiles perfil
  where perfil.id = v_uid;

  v_admin_nome := coalesce(v_admin_nome, 'Administrador');

  if v_decisao = 'procedente' then
    if v_denuncia.tipo_conteudo = 'produto' then
      select produto.ativo, loja.proprietario_id
        into v_conteudo_ativo, v_conteudo_autor
      from public.produtos produto
      join public.lojas loja on loja.id = produto.loja_id
      where produto.id = v_denuncia.produto_id
      for update of produto;

      if not found then
        raise exception 'O produto denunciado não foi encontrado.' using errcode = '22023';
      end if;

      update public.produtos
      set ativo = false,
          moderado_em = pg_catalog.now(),
          moderado_por = v_uid,
          motivo_moderacao = v_justificativa
      where id = v_denuncia.produto_id;
    else
      select avaliacao.ativo, avaliacao.cliente_id
        into v_conteudo_ativo, v_conteudo_autor
      from public.avaliacoes avaliacao
      where avaliacao.id = v_denuncia.avaliacao_id
      for update;

      if not found then
        raise exception 'A avaliação denunciada não foi encontrada.' using errcode = '22023';
      end if;

      update public.avaliacoes
      set ativo = false,
          moderado_em = pg_catalog.now(),
          moderado_por = v_uid,
          motivo_moderacao = v_justificativa
      where id = v_denuncia.avaliacao_id;
    end if;

    v_ocultado := coalesce(v_conteudo_ativo, false);
    v_acao := case when v_ocultado
      then 'conteudo_ocultado'
      else 'violacao_confirmada'
    end;
  else
    v_acao := 'denuncia_arquivada';
  end if;

  update public.denuncias_conteudo
  set status = v_decisao,
      analisado_por = v_uid,
      analisado_por_nome = v_admin_nome,
      justificativa_admin = v_justificativa,
      conteudo_ocultado = v_ocultado,
      atualizado_em = pg_catalog.now(),
      analisado_em = pg_catalog.now()
  where id = v_denuncia.id;

  insert into public.historico_moderacao (
    denuncia_id,
    status_anterior,
    status_novo,
    acao,
    motivo,
    alterado_por,
    alterado_por_nome
  ) values (
    v_denuncia.id,
    'pendente',
    v_decisao,
    v_acao,
    v_justificativa,
    v_uid,
    v_admin_nome
  );

  perform private.salvar_notificacao(
    v_denuncia.denunciante_id,
    'moderacao_resolvida',
    case v_decisao
      when 'procedente' then 'Denúncia confirmada'
      else 'Denúncia analisada'
    end,
    case v_decisao
      when 'procedente' then pg_catalog.format(
        'A denúncia sobre %s foi confirmada e o conteúdo foi moderado.',
        v_denuncia.conteudo_titulo
      )
      else pg_catalog.format(
        'A denúncia sobre %s foi analisada e não foi confirmada.',
        v_denuncia.conteudo_titulo
      )
    end,
    'notificacoes.html',
    pg_catalog.jsonb_build_object(
      'denuncia_id', v_denuncia.id,
      'status', v_decisao,
      'tipo_conteudo', v_denuncia.tipo_conteudo
    ),
    pg_catalog.format('moderacao:%s:resolvida', v_denuncia.id),
    false
  );

  if v_decisao = 'procedente' and v_conteudo_autor is not null then
    perform private.salvar_notificacao(
      v_conteudo_autor,
      'conteudo_moderado',
      case v_denuncia.tipo_conteudo
        when 'produto' then 'Produto ocultado pela moderação'
        else 'Avaliação ocultada pela moderação'
      end,
      pg_catalog.format(
        '%s foi ocultado após análise administrativa. Motivo: %s',
        v_denuncia.conteudo_titulo,
        v_justificativa
      ),
      case v_denuncia.tipo_conteudo
        when 'produto' then 'produtos.html'
        else 'meus-pedidos.html'
      end,
      pg_catalog.jsonb_build_object(
        'denuncia_id', v_denuncia.id,
        'produto_id', v_denuncia.produto_id,
        'avaliacao_id', v_denuncia.avaliacao_id
      ),
      pg_catalog.format('moderacao:%s:conteudo', v_denuncia.id),
      false
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'sucesso', true,
    'denuncia_id', v_denuncia.id,
    'status', v_decisao,
    'conteudo_ocultado', v_ocultado
  );
end;
$$;

revoke all on function private.criar_denuncia_conteudo_core(
  text, uuid, text, text
) from public, anon, authenticated, service_role;
revoke all on function private.listar_denuncias_admin_core(
  text, text, text, integer, integer
) from public, anon, authenticated, service_role;
revoke all on function private.resumo_moderacao_admin_core()
  from public, anon, authenticated, service_role;
revoke all on function private.listar_historico_moderacao_admin_core(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.resolver_denuncia_conteudo_core(uuid, text, text)
  from public, anon, authenticated, service_role;

grant usage on schema private to authenticated;
grant execute on function private.criar_denuncia_conteudo_core(
  text, uuid, text, text
) to authenticated;
grant execute on function private.listar_denuncias_admin_core(
  text, text, text, integer, integer
) to authenticated;
grant execute on function private.resumo_moderacao_admin_core()
  to authenticated;
grant execute on function private.listar_historico_moderacao_admin_core(uuid)
  to authenticated;
grant execute on function private.resolver_denuncia_conteudo_core(uuid, text, text)
  to authenticated;

create or replace function public.criar_denuncia_conteudo(
  p_tipo_conteudo text,
  p_conteudo_id uuid,
  p_motivo text,
  p_detalhes text default null
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.criar_denuncia_conteudo_core(
    p_tipo_conteudo,
    p_conteudo_id,
    p_motivo,
    p_detalhes
  );
$$;

create or replace function public.listar_denuncias_admin(
  p_status text default '',
  p_tipo text default '',
  p_busca text default '',
  p_limite integer default 12,
  p_offset integer default 0
)
returns table (
  denuncia_id uuid,
  tipo_conteudo text,
  produto_id uuid,
  avaliacao_id uuid,
  conteudo_titulo text,
  conteudo_resumo text,
  loja_id uuid,
  loja_nome text,
  motivo text,
  detalhes text,
  status text,
  denunciante_nome text,
  criado_em timestamptz,
  analisado_em timestamptz,
  analisado_por_nome text,
  justificativa_admin text,
  conteudo_ocultado boolean,
  conteudo_ativo boolean,
  total_registros bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from private.listar_denuncias_admin_core(
    p_status,
    p_tipo,
    p_busca,
    p_limite,
    p_offset
  );
$$;

create or replace function public.resumo_moderacao_admin()
returns table (
  total_denuncias bigint,
  pendentes bigint,
  procedentes bigint,
  improcedentes bigint,
  conteudos_ocultados bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.resumo_moderacao_admin_core();
$$;

create or replace function public.listar_historico_moderacao_admin(
  p_denuncia_id uuid
)
returns table (
  id bigint,
  status_anterior text,
  status_novo text,
  acao text,
  motivo text,
  alterado_por_nome text,
  criado_em timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from private.listar_historico_moderacao_admin_core(p_denuncia_id);
$$;

create or replace function public.resolver_denuncia_conteudo(
  p_denuncia_id uuid,
  p_decisao text,
  p_justificativa text
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.resolver_denuncia_conteudo_core(
    p_denuncia_id,
    p_decisao,
    p_justificativa
  );
$$;

revoke all on function public.criar_denuncia_conteudo(text, uuid, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.listar_denuncias_admin(
  text, text, text, integer, integer
) from public, anon, authenticated, service_role;
revoke all on function public.resumo_moderacao_admin()
  from public, anon, authenticated, service_role;
revoke all on function public.listar_historico_moderacao_admin(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.resolver_denuncia_conteudo(uuid, text, text)
  from public, anon, authenticated, service_role;

grant execute on function public.criar_denuncia_conteudo(text, uuid, text, text)
  to authenticated;
grant execute on function public.listar_denuncias_admin(
  text, text, text, integer, integer
) to authenticated;
grant execute on function public.resumo_moderacao_admin()
  to authenticated;
grant execute on function public.listar_historico_moderacao_admin(uuid)
  to authenticated;
grant execute on function public.resolver_denuncia_conteudo(uuid, text, text)
  to authenticated;

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
    join public.produtos produto on produto.id = ids.produto_id
    where ids.produto_id is not null
  ),
  avaliacoes_agregadas as (
    select
      avaliacao.produto_id,
      pg_catalog.round(pg_catalog.avg(avaliacao.nota)::numeric, 2) as avaliacao_media,
      pg_catalog.count(*)::integer as total_avaliacoes
    from public.avaliacoes avaliacao
    join produtos_afetados afetado on afetado.produto_id = avaliacao.produto_id
    where avaliacao.ativo is true
    group by avaliacao.produto_id
  ),
  vendas_agregadas as (
    select
      item.produto_id,
      coalesce(pg_catalog.sum(item.quantidade), 0)::bigint as total_vendido
    from public.itens_pedido item
    join produtos_afetados afetado on afetado.produto_id = item.produto_id
    join public.pedidos pedido on pedido.id = item.pedido_id
    where pedido.status in ('pago', 'em_preparacao', 'enviado', 'entregue')
    group by item.produto_id
  )
  select
    afetado.produto_id,
    coalesce(avaliacoes.avaliacao_media, 0)::numeric(3, 2),
    coalesce(avaliacoes.total_avaliacoes, 0),
    coalesce(vendas.total_vendido, 0),
    pg_catalog.now()
  from produtos_afetados afetado
  left join avaliacoes_agregadas avaliacoes
    on avaliacoes.produto_id = afetado.produto_id
  left join vendas_agregadas vendas
    on vendas.produto_id = afetado.produto_id
  on conflict (produto_id) do update
  set avaliacao_media = excluded.avaliacao_media,
      total_avaliacoes = excluded.total_avaliacoes,
      total_vendido = excluded.total_vendido,
      atualizado_em = excluded.atualizado_em;
end;
$$;

revoke all on function private.recalcular_metricas_produtos(uuid[])
  from public, anon, authenticated, service_role;

drop trigger if exists sincronizar_metricas_avaliacao_trigger
  on public.avaliacoes;
create trigger sincronizar_metricas_avaliacao_trigger
after insert or update of produto_id, nota, ativo or delete
on public.avaliacoes
for each row
execute function private.sincronizar_metricas_avaliacao();

create or replace function public.listar_avaliacoes_produto(
  p_produto_id uuid
)
returns table (
  id uuid,
  nota integer,
  comentario text,
  resposta_loja text,
  criado_em timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    avaliacao.id,
    avaliacao.nota,
    avaliacao.comentario,
    avaliacao.resposta_loja,
    avaliacao.criado_em
  from public.avaliacoes avaliacao
  join public.produtos produto on produto.id = avaliacao.produto_id
  join public.lojas loja on loja.id = produto.loja_id
  where avaliacao.produto_id = p_produto_id
    and avaliacao.ativo is true
    and avaliacao.moderado_em is null
    and produto.ativo is true
    and produto.moderado_em is null
    and loja.ativa is true
    and loja.status_aprovacao = 'aprovada'
  order by avaliacao.criado_em desc;
$$;

create or replace function public.obter_resumo_avaliacoes_produto(
  p_produto_id uuid
)
returns table (
  media numeric,
  total bigint,
  nota_5 bigint,
  nota_4 bigint,
  nota_3 bigint,
  nota_2 bigint,
  nota_1 bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(pg_catalog.round(pg_catalog.avg(avaliacao.nota)::numeric, 1), 0),
    pg_catalog.count(*),
    pg_catalog.count(*) filter (where avaliacao.nota = 5),
    pg_catalog.count(*) filter (where avaliacao.nota = 4),
    pg_catalog.count(*) filter (where avaliacao.nota = 3),
    pg_catalog.count(*) filter (where avaliacao.nota = 2),
    pg_catalog.count(*) filter (where avaliacao.nota = 1)
  from public.avaliacoes avaliacao
  join public.produtos produto on produto.id = avaliacao.produto_id
  join public.lojas loja on loja.id = produto.loja_id
  where avaliacao.produto_id = p_produto_id
    and avaliacao.ativo is true
    and avaliacao.moderado_em is null
    and produto.ativo is true
    and produto.moderado_em is null
    and loja.ativa is true
    and loja.status_aprovacao = 'aprovada';
$$;

create or replace function public.listar_avaliacoes_loja()
returns table (
  id uuid,
  produto_id uuid,
  produto_nome text,
  loja_id uuid,
  loja_nome text,
  nota integer,
  comentario text,
  resposta_loja text,
  criado_em timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  return query
  select
    avaliacao.id,
    avaliacao.produto_id,
    produto.nome::text,
    loja.id,
    loja.nome::text,
    avaliacao.nota,
    avaliacao.comentario,
    avaliacao.resposta_loja,
    avaliacao.criado_em
  from public.avaliacoes avaliacao
  join public.produtos produto on produto.id = avaliacao.produto_id
  join public.lojas loja on loja.id = produto.loja_id
  where loja.proprietario_id = v_uid
    and avaliacao.ativo is true
    and avaliacao.moderado_em is null
  order by avaliacao.criado_em desc;
end;
$$;

create or replace function public.responder_avaliacao_loja(
  p_avaliacao_id uuid,
  p_resposta text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_resposta text := pg_catalog.btrim(coalesce(p_resposta, ''));
  v_proprietario uuid;
begin
  if v_uid is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  if char_length(v_resposta) < 1 or char_length(v_resposta) > 1000 then
    raise exception 'A resposta deve ter entre 1 e 1000 caracteres.' using errcode = '22023';
  end if;

  select loja.proprietario_id
    into v_proprietario
  from public.avaliacoes avaliacao
  join public.produtos produto on produto.id = avaliacao.produto_id
  join public.lojas loja on loja.id = produto.loja_id
  where avaliacao.id = p_avaliacao_id
    and avaliacao.ativo is true
    and avaliacao.moderado_em is null;

  if not found then
    raise exception 'Avaliação não encontrada ou moderada.' using errcode = '22023';
  end if;

  if v_proprietario <> v_uid then
    raise exception 'Sua conta não possui permissão para responder esta avaliação.' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.denuncias_conteudo denuncia
    where denuncia.avaliacao_id = p_avaliacao_id
  ) then
    raise exception 'A resposta não pode ser alterada após uma denúncia.' using errcode = '22023';
  end if;

  update public.avaliacoes
  set resposta_loja = v_resposta
  where id = p_avaliacao_id;

  return pg_catalog.jsonb_build_object(
    'sucesso', true,
    'avaliacao_id', p_avaliacao_id,
    'resposta', v_resposta
  );
end;
$$;

revoke all on function public.listar_avaliacoes_produto(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.obter_resumo_avaliacoes_produto(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.listar_avaliacoes_loja()
  from public, anon, authenticated, service_role;
revoke all on function public.responder_avaliacao_loja(uuid, text)
  from public, anon, authenticated, service_role;

grant execute on function public.listar_avaliacoes_produto(uuid)
  to anon, authenticated;
grant execute on function public.obter_resumo_avaliacoes_produto(uuid)
  to anon, authenticated;
grant execute on function public.listar_avaliacoes_loja()
  to authenticated;
grant execute on function public.responder_avaliacao_loja(uuid, text)
  to authenticated;

select private.recalcular_metricas_produtos(
  pg_catalog.array_agg(produto.id)
)
from public.produtos produto;

commit;
