-- Classificados: pedido de assinatura e "quero ser lojista".
--
--   * o lojista pede a assinatura (ou a renovação) pelo painel; o admin
--     é avisado e vê o pedido ao lado do botão "Ativar 1 mês";
--   * ativar a assinatura marca o pedido como atendido;
--   * o usuário comum transforma o perfil de anunciante em loja, que
--     fica pendente de aprovação. Os anúncios que ele já tinha passam
--     para a loja e deixam de vencer quando a assinatura é ativada.
--
-- Só acrescenta: uma tabela e funções. As funções existentes que mudam
-- são recriadas com o mesmo nome e os mesmos parâmetros.

-- ---------------------------------------------------------------------
-- PEDIDOS DE ASSINATURA
-- ---------------------------------------------------------------------

create table public.solicitacoes_assinatura (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas (id) on delete cascade,
  solicitado_por uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now(),
  atendida_em timestamptz,
  atendida_por uuid references public.profiles (id) on delete set null
);

comment on table public.solicitacoes_assinatura is
  'Classificados: pedidos de assinatura feitos pelo lojista. Pendente = atendida_em nulo.';

-- No máximo um pedido em aberto por loja.
create unique index solicitacoes_assinatura_pendente_unica
  on public.solicitacoes_assinatura (loja_id)
  where atendida_em is null;

create index solicitacoes_assinatura_solicitado_por_idx
  on public.solicitacoes_assinatura (solicitado_por);
create index solicitacoes_assinatura_atendida_por_idx
  on public.solicitacoes_assinatura (atendida_por);

alter table public.solicitacoes_assinatura enable row level security;

create policy solicitacoes_assinatura_leitura_dono_ou_admin
  on public.solicitacoes_assinatura
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.lojas l
      where l.id = solicitacoes_assinatura.loja_id
        and l.proprietario_id = (select auth.uid())
    )
    or (select public.sou_admin())
  );

revoke all on table public.solicitacoes_assinatura from anon, authenticated;
grant select on table public.solicitacoes_assinatura to authenticated;

create or replace function public.solicitar_assinatura()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_loja public.lojas%rowtype;
  v_existente public.solicitacoes_assinatura%rowtype;
  v_admin_id uuid;
  v_situacao text;
begin
  if v_uid is null then
    raise exception 'Entre na sua conta.';
  end if;

  select *
  into v_loja
  from public.lojas l
  where l.proprietario_id = v_uid
    and l.tipo = 'loja'
  order by l.criado_em
  limit 1
  for update;

  if not found then
    raise exception 'Só lojas podem pedir assinatura.';
  end if;

  if v_loja.status_aprovacao not in ('pendente', 'aprovada') then
    raise exception 'Esta loja está % e não pode pedir assinatura agora.', v_loja.status_aprovacao;
  end if;

  select *
  into v_existente
  from public.solicitacoes_assinatura s
  where s.loja_id = v_loja.id
    and s.atendida_em is null;

  if found then
    return jsonb_build_object('id', v_existente.id, 'criado_em', v_existente.criado_em, 'novo', false);
  end if;

  select s.situacao into v_situacao
  from private.situacao_assinatura(v_loja.id) s;

  insert into public.solicitacoes_assinatura (loja_id, solicitado_por)
  values (v_loja.id, v_uid)
  returning * into v_existente;

  select principal.usuario_id
  into v_admin_id
  from private.admin_principal principal
  where principal.singleton;

  perform private.salvar_notificacao(
    v_admin_id,
    'loja_pendente',
    case when v_situacao in ('carencia', 'expirada', 'ativa')
      then 'Pedido de renovação de assinatura'
      else 'Pedido de assinatura'
    end,
    left(v_loja.nome::text, 120) || ' pediu '
      || case when v_situacao in ('carencia', 'expirada', 'ativa')
           then 'a renovação da assinatura.'
           else 'a assinatura de lojista.'
         end,
    'admin-dashboard.html',
    jsonb_build_object('loja_id', v_loja.id),
    'assinatura_solicitada:' || v_loja.id::text,
    true
  );

  return jsonb_build_object('id', v_existente.id, 'criado_em', v_existente.criado_em, 'novo', true);
end;
$$;

revoke all on function public.solicitar_assinatura() from public, anon;
grant execute on function public.solicitar_assinatura() to authenticated;

-- ---------------------------------------------------------------------
-- ATIVAR: ATENDE O PEDIDO E TIRA O VENCIMENTO DOS ANÚNCIOS
-- ---------------------------------------------------------------------
-- Mesma função da etapa 3 com dois acréscimos no fim.

create or replace function public.ativar_assinatura_loja_admin(
  p_loja_id uuid,
  p_meses integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_loja public.lojas%rowtype;
  v_plano_id smallint;
  v_inicio timestamptz;
  v_fim timestamptz;
  v_fim_atual timestamptz;
begin
  if v_uid is null or not public._usuario_e_admin(v_uid) then
    raise exception 'Acesso restrito a administradores.';
  end if;

  if p_meses is null or p_meses < 1 or p_meses > 12 then
    raise exception 'Informe de 1 a 12 meses.';
  end if;

  select * into v_loja from public.lojas where id = p_loja_id for update;

  if not found then
    raise exception 'Loja não encontrada.';
  end if;

  if v_loja.status_aprovacao <> 'aprovada' then
    raise exception 'Só é possível ativar a assinatura de uma loja aprovada.';
  end if;

  select p.id into v_plano_id
  from public.planos p
  where p.codigo = 'lojista' and p.ativo = true;

  if v_plano_id is null then
    raise exception 'O plano de lojista não está disponível.';
  end if;

  select s.fim_em into v_fim_atual
  from private.situacao_assinatura(p_loja_id) s
  where s.situacao = 'ativa';

  v_inicio := coalesce(v_fim_atual, now());
  v_fim := v_inicio + make_interval(months => p_meses);

  insert into public.assinaturas (loja_id, plano_id, inicio_em, fim_em, ativada_por)
  values (p_loja_id, v_plano_id, v_inicio, v_fim, v_uid);

  -- Atende o pedido em aberto, se houver.
  update public.solicitacoes_assinatura s
  set atendida_em = now(), atendida_por = v_uid
  where s.loja_id = p_loja_id
    and s.atendida_em is null;

  -- Anúncios que vieram do plano gratuito deixam de vencer.
  update public.produtos p
  set vence_em = null
  where p.loja_id = p_loja_id
    and p.vence_em is not null;

  perform private.salvar_notificacao(
    v_loja.proprietario_id,
    'loja_status',
    'Assinatura ativa',
    'A assinatura da loja ' || v_loja.nome || ' está ativa até '
      || to_char(v_fim at time zone 'America/Sao_Paulo', 'DD/MM/YYYY') || '.',
    'painel-loja.html',
    jsonb_build_object('loja_id', p_loja_id, 'assinatura_fim', v_fim),
    'assinatura_ativa:' || p_loja_id::text,
    true
  );

  return jsonb_build_object(
    'loja_id', p_loja_id,
    'situacao', 'ativa',
    'inicio_em', v_inicio,
    'fim_em', v_fim
  );
end;
$$;

-- ---------------------------------------------------------------------
-- QUERO SER LOJISTA
-- ---------------------------------------------------------------------
-- A conversão só acontece por esta função, que liga a marca
-- app.converter_perfil para o gatilho de proteção aceitar a troca.

create or replace function public.proteger_aprovacao_loja()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
    v_uid uuid := auth.uid();
    v_admin boolean := false;
    v_perfil_pessoal boolean :=
        coalesce(current_setting('app.perfil_anunciante', true), '') = '1';
    v_convertendo boolean :=
        coalesce(current_setting('app.converter_perfil', true), '') = '1';
begin
    -- Operações internas/migrations sem JWT continuam permitidas.
    if v_uid is null then
        return new;
    end if;

    v_admin := public._usuario_e_admin(v_uid);

    if tg_op = 'INSERT' then
        if not v_admin then
            if new.proprietario_id is distinct from v_uid then
                raise exception 'Você só pode cadastrar uma loja para sua própria conta.';
            end if;

            if v_perfil_pessoal then
                new.tipo := 'pessoal';
                new.status_aprovacao := 'aprovada';
                new.ativa := true;
                new.aprovado_em := now();
                new.aprovado_por := null;
                new.motivo_rejeicao := null;
                return new;
            end if;

            new.tipo := 'loja';
            new.status_aprovacao := 'pendente';
            new.ativa := false;
            new.aprovado_em := null;
            new.aprovado_por := null;
            new.motivo_rejeicao := null;
        end if;

        return new;
    end if;

    if tg_op = 'UPDATE' and not v_admin then
        if new.proprietario_id is distinct from old.proprietario_id then
            raise exception 'O proprietário da loja não pode ser alterado.';
        end if;

        -- Perfil pessoal virando loja: entra em análise, como loja nova.
        if v_convertendo and old.tipo = 'pessoal' and new.tipo = 'loja' then
            new.status_aprovacao := 'pendente';
            new.ativa := false;
            new.aprovado_em := null;
            new.aprovado_por := null;
            new.motivo_rejeicao := null;
            return new;
        end if;

        if new.tipo is distinct from old.tipo then
            raise exception 'O tipo do cadastro não pode ser alterado.';
        end if;

        if new.status_aprovacao is distinct from old.status_aprovacao
           or new.aprovado_em is distinct from old.aprovado_em
           or new.aprovado_por is distinct from old.aprovado_por
           or new.motivo_rejeicao is distinct from old.motivo_rejeicao then
            raise exception 'Somente um administrador pode alterar a aprovação da loja.';
        end if;

        -- Loja pendente, rejeitada ou suspensa nunca pode ser reativada pelo proprietário.
        if old.status_aprovacao <> 'aprovada' then
            new.ativa := false;
        end if;
    end if;

    return new;
end;
$function$;

create or replace function public.converter_perfil_em_loja(p_categoria_id integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_loja public.lojas%rowtype;
  v_admin_id uuid;
begin
  if v_uid is null then
    raise exception 'Entre na sua conta.';
  end if;

  select *
  into v_loja
  from public.lojas l
  where l.proprietario_id = v_uid
  order by l.criado_em
  limit 1
  for update;

  if not found then
    raise exception 'Você ainda não tem perfil de anunciante.';
  end if;

  if v_loja.tipo <> 'pessoal' then
    raise exception 'Sua conta já é de lojista.';
  end if;

  if not exists (
    select 1 from public.categorias c
    where c.id = p_categoria_id and coalesce(c.ativa, true)
  ) then
    raise exception 'Escolha uma categoria de loja válida.';
  end if;

  perform set_config('app.converter_perfil', '1', true);

  update public.lojas
  set tipo = 'loja',
      categoria_id = p_categoria_id,
      atualizado_em = now()
  where id = v_loja.id;

  perform set_config('app.converter_perfil', '', true);

  update public.profiles
  set tipo_usuario = 'lojista', atualizado_em = now()
  where id = v_uid
    and tipo_usuario = 'cliente';

  select principal.usuario_id
  into v_admin_id
  from private.admin_principal principal
  where principal.singleton;

  perform private.salvar_notificacao(
    v_admin_id,
    'loja_pendente',
    'Nova loja aguardando análise',
    left(v_loja.nome::text, 120) || ' deixou de ser perfil de anunciante e virou loja. Precisa de aprovação.',
    'admin-dashboard.html',
    jsonb_build_object('loja_id', v_loja.id),
    'loja:' || v_loja.id::text || ':pendente',
    true
  );

  return jsonb_build_object('loja_id', v_loja.id, 'tipo', 'loja', 'status_aprovacao', 'pendente');
end;
$$;

revoke all on function public.converter_perfil_em_loja(integer) from public, anon;
grant execute on function public.converter_perfil_em_loja(integer) to authenticated;
