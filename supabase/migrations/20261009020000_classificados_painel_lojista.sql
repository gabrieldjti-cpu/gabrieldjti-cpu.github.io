-- =====================================================================
-- ETAPA 10: PAINEL DO VENDEDOR E MODERAÇÃO DAS AVALIAÇÕES
-- =====================================================================
-- * Resumo do painel: anúncios no ar, aguardando aprovação, recusados,
--   indisponíveis, edições na fila, interessados sem venda confirmada,
--   vendas confirmadas e nota média.
-- * O vendedor responde às avaliações que recebeu.
-- * Qualquer usuário denuncia uma avaliação (uma vez por avaliação).
-- * O admin vê as avaliações denunciadas e decide: ocultar, mostrar de
--   novo ou manter (descarta as denúncias).
-- =====================================================================

alter table public.avaliacoes_vendedor
  add column if not exists denuncias integer not null default 0,
  add column if not exists ultima_denuncia_em timestamptz,
  add column if not exists respondida_em timestamptz,
  add column if not exists moderado_em timestamptz,
  add column if not exists moderado_por uuid references public.profiles(id),
  add column if not exists motivo_moderacao text
    check (motivo_moderacao is null or char_length(motivo_moderacao) <= 500);

create table if not exists public.denuncias_avaliacao_vendedor (
  id uuid primary key default gen_random_uuid(),
  avaliacao_id uuid not null references public.avaliacoes_vendedor(id) on delete cascade,
  denunciante_id uuid not null references public.profiles(id) on delete cascade,
  motivo text not null check (char_length(motivo) between 5 and 500),
  criado_em timestamptz not null default now(),
  constraint denuncias_avaliacao_vendedor_unica unique (avaliacao_id, denunciante_id)
);

alter table public.denuncias_avaliacao_vendedor enable row level security;
revoke all on table public.denuncias_avaliacao_vendedor from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- RESUMO DO PAINEL
-- ---------------------------------------------------------------------

create or replace function public.resumo_painel_vendedor()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_loja public.lojas%rowtype;
  v_resultado jsonb;
begin
  if v_uid is null then
    raise exception 'Entre na sua conta.';
  end if;

  select * into v_loja
  from public.lojas l
  where l.proprietario_id = v_uid
  order by (l.tipo = 'loja') desc, l.criado_em
  limit 1;

  if not found then
    return jsonb_build_object('loja_id', null);
  end if;

  select jsonb_build_object(
    'loja_id', v_loja.id,
    'tipo', v_loja.tipo,
    'no_ar', count(*) filter (
      where p.ativo and p.status_aprovacao = 'aprovado'
        and (p.vence_em is null or p.vence_em > now())
        and p.estoque > 0),
    'aguardando', count(*) filter (where p.ativo and p.status_aprovacao = 'pendente'),
    'recusados', count(*) filter (where p.ativo and p.status_aprovacao = 'rejeitado'),
    'indisponiveis', count(*) filter (
      where p.ativo and p.status_aprovacao = 'aprovado' and p.estoque = 0),
    'vencidos', count(*) filter (
      where p.ativo and p.vence_em is not null and p.vence_em <= now()),
    'total', count(*) filter (where p.ativo)
  )
  into v_resultado
  from public.produtos p
  where p.loja_id = v_loja.id;

  return v_resultado || jsonb_build_object(
    'edicoes_na_fila', (
      select count(*) from public.edicoes_anuncio e
      join public.produtos p on p.id = e.produto_id
      where p.loja_id = v_loja.id and p.ativo and e.decidida_em is null),
    'interessados_sem_venda', (
      select count(*) from public.interesses_anuncio i
      join public.produtos p on p.id = i.produto_id
      where p.loja_id = v_loja.id and p.ativo
        and not exists (select 1 from public.vendas_anuncio v where v.interesse_id = i.id)),
    'confirmacoes_pedidas', (
      select count(*) from public.interesses_anuncio i
      join public.produtos p on p.id = i.produto_id
      where p.loja_id = v_loja.id and p.ativo and i.confirmacao_pedida_em is not null
        and not exists (select 1 from public.vendas_anuncio v where v.interesse_id = i.id)),
    'vendas', (select count(*) from public.vendas_anuncio v where v.loja_id = v_loja.id),
    'avaliacao_media', (
      select coalesce(round(avg(a.nota)::numeric, 1), 0)
      from public.avaliacoes_vendedor a where a.loja_id = v_loja.id and a.ativo),
    'total_avaliacoes', (
      select count(*) from public.avaliacoes_vendedor a where a.loja_id = v_loja.id and a.ativo)
  );
end;
$$;

revoke all on function public.resumo_painel_vendedor() from public, anon;
grant execute on function public.resumo_painel_vendedor() to authenticated;

-- ---------------------------------------------------------------------
-- VENDEDOR: AVALIAÇÕES RECEBIDAS E RESPOSTA
-- ---------------------------------------------------------------------

create or replace function public.listar_minhas_avaliacoes_recebidas()
returns table (
  id uuid,
  nota smallint,
  comentario text,
  resposta text,
  criado_em timestamptz,
  avaliador_nome text,
  produto_nome text,
  oculta boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,
    a.nota,
    a.comentario,
    a.resposta,
    a.criado_em,
    coalesce(nullif(split_part(trim(pr.nome), ' ', 1), ''), 'Comprador'),
    v.produto_nome,
    not a.ativo
  from public.avaliacoes_vendedor a
  join public.lojas l on l.id = a.loja_id
  join public.vendas_anuncio v on v.id = a.venda_id
  left join public.profiles pr on pr.id = a.avaliador_id
  where l.proprietario_id = (select auth.uid())
  order by a.criado_em desc
  limit 50;
$$;

revoke all on function public.listar_minhas_avaliacoes_recebidas() from public, anon;
grant execute on function public.listar_minhas_avaliacoes_recebidas() to authenticated;

create or replace function public.responder_avaliacao_vendedor(
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
  v_resposta text := nullif(trim(coalesce(p_resposta, '')), '');
  v_avaliacao record;
begin
  if v_uid is null then
    raise exception 'Entre na sua conta.';
  end if;

  if v_resposta is null or char_length(v_resposta) < 2 then
    raise exception 'Escreva a resposta.';
  end if;

  if char_length(v_resposta) > 1000 then
    raise exception 'A resposta deve ter no máximo 1000 caracteres.';
  end if;

  select a.id, a.avaliador_id, l.id as loja_id, l.nome::text as loja_nome, l.proprietario_id
  into v_avaliacao
  from public.avaliacoes_vendedor a
  join public.lojas l on l.id = a.loja_id
  where a.id = p_avaliacao_id;

  if not found or v_avaliacao.proprietario_id is distinct from v_uid then
    raise exception 'Avaliação não encontrada.';
  end if;

  update public.avaliacoes_vendedor
  set resposta = v_resposta, respondida_em = now()
  where id = p_avaliacao_id;

  perform private.salvar_notificacao(
    v_avaliacao.avaliador_id,
    'avaliacao_nova',
    'O vendedor respondeu',
    v_avaliacao.loja_nome || ' respondeu à sua avaliação.',
    'loja.html?id=' || v_avaliacao.loja_id::text,
    jsonb_build_object('avaliacao_id', p_avaliacao_id),
    'resposta_avaliacao:' || p_avaliacao_id::text,
    true
  );

  return jsonb_build_object('avaliacao_id', p_avaliacao_id, 'respondida', true);
end;
$$;

revoke all on function public.responder_avaliacao_vendedor(uuid, text) from public, anon;
grant execute on function public.responder_avaliacao_vendedor(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- DENUNCIAR UMA AVALIAÇÃO
-- ---------------------------------------------------------------------

create or replace function public.denunciar_avaliacao_vendedor(
  p_avaliacao_id uuid,
  p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_motivo text := nullif(trim(coalesce(p_motivo, '')), '');
  v_id uuid;
  v_admin record;
begin
  if v_uid is null then
    raise exception 'Entre na sua conta para denunciar.';
  end if;

  if v_motivo is null or char_length(v_motivo) < 5 then
    raise exception 'Conte em poucas palavras o que há de errado (pelo menos 5 letras).';
  end if;

  if char_length(v_motivo) > 500 then
    raise exception 'O motivo deve ter no máximo 500 caracteres.';
  end if;

  if not exists (
    select 1 from public.avaliacoes_vendedor a
    where a.id = p_avaliacao_id and a.ativo
  ) then
    raise exception 'Avaliação não encontrada.';
  end if;

  insert into public.denuncias_avaliacao_vendedor (avaliacao_id, denunciante_id, motivo)
  values (p_avaliacao_id, v_uid, v_motivo)
  on conflict (avaliacao_id, denunciante_id) do nothing
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('registrada', false, 'ja_denunciada', true);
  end if;

  update public.avaliacoes_vendedor
  set denuncias = denuncias + 1, ultima_denuncia_em = now()
  where id = p_avaliacao_id;

  for v_admin in
    select pr.id from public.profiles pr
    where pr.tipo_usuario = 'admin' and coalesce(pr.ativo, true)
  loop
    perform private.salvar_notificacao(
      v_admin.id,
      'moderacao_nova',
      'Avaliação denunciada',
      'Uma avaliação de vendedor foi denunciada. Motivo: ' || left(v_motivo, 300),
      'admin-avaliacoes.html',
      jsonb_build_object('avaliacao_id', p_avaliacao_id),
      'denuncia_avaliacao:' || p_avaliacao_id::text || ':' || v_admin.id::text,
      true
    );
  end loop;

  return jsonb_build_object('registrada', true);
end;
$$;

revoke all on function public.denunciar_avaliacao_vendedor(uuid, text) from public, anon;
grant execute on function public.denunciar_avaliacao_vendedor(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- ADMIN: LISTAR E MODERAR AVALIAÇÕES
-- ---------------------------------------------------------------------

create or replace function public.listar_avaliacoes_vendedor_admin(p_filtro text default 'denunciadas')
returns table (
  id uuid,
  nota smallint,
  comentario text,
  resposta text,
  ativo boolean,
  denuncias integer,
  ultima_denuncia_em timestamptz,
  criado_em timestamptz,
  avaliador_nome text,
  loja_id uuid,
  loja_nome text,
  produto_nome text,
  motivos text,
  motivo_moderacao text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public._usuario_e_admin((select auth.uid())) then
    raise exception 'Acesso restrito a administradores.';
  end if;

  return query
  select
    a.id,
    a.nota,
    a.comentario,
    a.resposta,
    a.ativo,
    a.denuncias,
    a.ultima_denuncia_em,
    a.criado_em,
    coalesce(nullif(trim(pr.nome), ''), 'Comprador'),
    l.id,
    l.nome::text,
    v.produto_nome,
    (select string_agg(d.motivo, ' | ' order by d.criado_em desc)
     from public.denuncias_avaliacao_vendedor d where d.avaliacao_id = a.id),
    a.motivo_moderacao
  from public.avaliacoes_vendedor a
  join public.lojas l on l.id = a.loja_id
  join public.vendas_anuncio v on v.id = a.venda_id
  left join public.profiles pr on pr.id = a.avaliador_id
  where case coalesce(p_filtro, 'denunciadas')
          when 'denunciadas' then a.denuncias > 0
          when 'ocultas' then not a.ativo
          else true
        end
  order by a.denuncias desc, coalesce(a.ultima_denuncia_em, a.criado_em) desc
  limit 100;
end;
$$;

revoke all on function public.listar_avaliacoes_vendedor_admin(text) from public, anon;
grant execute on function public.listar_avaliacoes_vendedor_admin(text) to authenticated;

create or replace function public.moderar_avaliacao_vendedor_admin(
  p_avaliacao_id uuid,
  p_acao text,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_motivo text := nullif(trim(coalesce(p_motivo, '')), '');
begin
  if v_uid is null or not public._usuario_e_admin(v_uid) then
    raise exception 'Acesso restrito a administradores.';
  end if;

  if p_acao not in ('ocultar', 'mostrar', 'manter') then
    raise exception 'Ação inválida.';
  end if;

  if p_acao = 'ocultar' and (v_motivo is null or char_length(v_motivo) < 5) then
    raise exception 'Informe o motivo para ocultar (pelo menos 5 letras).';
  end if;

  update public.avaliacoes_vendedor
  set
    ativo = case when p_acao = 'ocultar' then false else true end,
    denuncias = 0,
    moderado_em = now(),
    moderado_por = v_uid,
    motivo_moderacao = case when p_acao = 'ocultar' then left(v_motivo, 500) else null end
  where id = p_avaliacao_id;

  if not found then
    raise exception 'Avaliação não encontrada.';
  end if;

  return jsonb_build_object('avaliacao_id', p_avaliacao_id, 'acao', p_acao);
end;
$$;

revoke all on function public.moderar_avaliacao_vendedor_admin(uuid, text, text) from public, anon;
grant execute on function public.moderar_avaliacao_vendedor_admin(uuid, text, text) to authenticated;
