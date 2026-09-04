-- Comércio da Cidade
-- Central de notificações: avisos privados e em tempo real para clientes,
-- lojistas e para a conta administrativa principal.

begin;

create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles (id) on delete cascade,
  tipo text not null,
  titulo text not null,
  mensagem text not null,
  link text,
  dados jsonb not null default '{}'::jsonb,
  chave_unica text not null unique,
  lida_em timestamptz,
  criado_em timestamptz not null default now(),

  constraint notificacoes_tipo_check check (tipo in (
    'pedido_novo',
    'pedido_status',
    'cancelamento_solicitado',
    'cancelamento_resolvido',
    'estoque_baixo',
    'avaliacao_nova',
    'loja_pendente',
    'loja_status'
  )),
  constraint notificacoes_titulo_check
    check (char_length(trim(titulo)) between 1 and 120),
  constraint notificacoes_mensagem_check
    check (char_length(trim(mensagem)) between 1 and 500),
  constraint notificacoes_link_check
    check (
      link is null
      or (
        char_length(link) between 1 and 255
        and link ~ '^[a-z0-9-]+[.]html([?][a-z0-9_=&%-]+)?$'
      )
    ),
  constraint notificacoes_dados_check
    check (jsonb_typeof(dados) = 'object'),
  constraint notificacoes_chave_check
    check (char_length(trim(chave_unica)) between 3 and 180)
);

create index notificacoes_usuario_data_idx
  on public.notificacoes (usuario_id, criado_em desc);

create index notificacoes_usuario_nao_lidas_idx
  on public.notificacoes (usuario_id, criado_em desc)
  where lida_em is null;

alter table public.notificacoes enable row level security;

revoke all on table public.notificacoes from public, anon, authenticated;
grant select on table public.notificacoes to authenticated;
grant update (lida_em) on table public.notificacoes to authenticated;

create policy "Usuário visualiza próprias notificações"
  on public.notificacoes
  for select
  to authenticated
  using ((select auth.uid()) = usuario_id);

create policy "Usuário marca próprias notificações como lidas"
  on public.notificacoes
  for update
  to authenticated
  using ((select auth.uid()) = usuario_id)
  with check ((select auth.uid()) = usuario_id);

create or replace function private.salvar_notificacao(
  p_usuario_id uuid,
  p_tipo text,
  p_titulo text,
  p_mensagem text,
  p_link text,
  p_dados jsonb,
  p_chave_unica text,
  p_renovar boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_usuario_id is null then
    return;
  end if;

  insert into public.notificacoes (
    usuario_id,
    tipo,
    titulo,
    mensagem,
    link,
    dados,
    chave_unica
  ) values (
    p_usuario_id,
    p_tipo,
    trim(p_titulo),
    trim(p_mensagem),
    p_link,
    coalesce(p_dados, '{}'::jsonb),
    p_chave_unica
  )
  on conflict (chave_unica) do update
  set
    titulo = excluded.titulo,
    mensagem = excluded.mensagem,
    link = excluded.link,
    dados = excluded.dados,
    lida_em = null,
    criado_em = now()
  where p_renovar;
end;
$$;

revoke all on function private.salvar_notificacao(
  uuid, text, text, text, text, jsonb, text, boolean
) from public, anon, authenticated, service_role;

create or replace function private.notificar_pedido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_proprietario uuid;
  v_loja_nome text;
  v_status_texto text;
  v_pedido_curto text := upper(left(new.id::text, 8));
begin
  select loja.proprietario_id, loja.nome::text
    into v_proprietario, v_loja_nome
  from public.lojas loja
  where loja.id = new.loja_id;

  if tg_op = 'INSERT' then
    perform private.salvar_notificacao(
      v_proprietario,
      'pedido_novo',
      'Novo pedido recebido',
      format('A loja %s recebeu o pedido #%s no valor de R$ %s.',
        coalesce(v_loja_nome, 'sua loja'),
        v_pedido_curto,
        replace(to_char(coalesce(new.valor_total, 0), 'FM999999990D00'), '.', ',')
      ),
      'pedidos-loja.html',
      jsonb_build_object('pedido_id', new.id, 'loja_id', new.loja_id),
      format('pedido:%s:novo', new.id),
      false
    );

    return new;
  end if;

  if old.status is not distinct from new.status then
    return new;
  end if;

  v_status_texto := case new.status
    when 'aguardando_pagamento' then 'aguardando pagamento'
    when 'pago' then 'pagamento confirmado'
    when 'em_preparacao' then 'em preparação'
    when 'enviado' then 'enviado'
    when 'entregue' then 'entregue'
    when 'cancelado' then 'cancelado'
    else replace(coalesce(new.status, 'atualizado'), '_', ' ')
  end;

  perform private.salvar_notificacao(
    new.cliente_id,
    'pedido_status',
    'Pedido atualizado',
    format('O pedido #%s da loja %s agora está %s.',
      v_pedido_curto,
      coalesce(v_loja_nome, 'selecionada'),
      v_status_texto
    ),
    'meus-pedidos.html',
    jsonb_build_object(
      'pedido_id', new.id,
      'loja_id', new.loja_id,
      'status', new.status
    ),
    format('pedido:%s:status:%s', new.id, new.status),
    false
  );

  return new;
end;
$$;

revoke all on function private.notificar_pedido()
  from public, anon, authenticated, service_role;

drop trigger if exists notificar_pedido_trigger on public.pedidos;
create trigger notificar_pedido_trigger
after insert or update of status on public.pedidos
for each row execute function private.notificar_pedido();

create or replace function private.notificar_cancelamento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_proprietario uuid;
  v_loja_nome text;
  v_pedido_curto text := upper(left(new.pedido_id::text, 8));
begin
  select loja.proprietario_id, loja.nome::text
    into v_proprietario, v_loja_nome
  from public.lojas loja
  where loja.id = new.loja_id;

  if tg_op = 'INSERT' then
    perform private.salvar_notificacao(
      v_proprietario,
      'cancelamento_solicitado',
      'Solicitação de cancelamento',
      format('O cliente solicitou o cancelamento do pedido #%s.', v_pedido_curto),
      'pedidos-loja.html',
      jsonb_build_object(
        'pedido_id', new.pedido_id,
        'solicitacao_id', new.id,
        'loja_id', new.loja_id
      ),
      format('cancelamento:%s:solicitado', new.id),
      false
    );

    return new;
  end if;

  if old.status is not distinct from new.status
     or new.status not in ('aprovada', 'recusada') then
    return new;
  end if;

  perform private.salvar_notificacao(
    new.cliente_id,
    'cancelamento_resolvido',
    case new.status
      when 'aprovada' then 'Cancelamento aprovado'
      else 'Cancelamento não aprovado'
    end,
    case new.status
      when 'aprovada' then format(
        'A loja %s aprovou o cancelamento do pedido #%s.',
        coalesce(v_loja_nome, 'selecionada'), v_pedido_curto
      )
      else format(
        'A loja %s respondeu à solicitação do pedido #%s.',
        coalesce(v_loja_nome, 'selecionada'), v_pedido_curto
      )
    end,
    'meus-pedidos.html',
    jsonb_build_object(
      'pedido_id', new.pedido_id,
      'solicitacao_id', new.id,
      'status', new.status
    ),
    format('cancelamento:%s:status:%s', new.id, new.status),
    false
  );

  return new;
end;
$$;

revoke all on function private.notificar_cancelamento()
  from public, anon, authenticated, service_role;

drop trigger if exists notificar_cancelamento_trigger
  on public.solicitacoes_cancelamento;
create trigger notificar_cancelamento_trigger
after insert or update of status on public.solicitacoes_cancelamento
for each row execute function private.notificar_cancelamento();

create or replace function private.notificar_avaliacao()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_proprietario uuid;
  v_produto_nome text;
begin
  select loja.proprietario_id, produto.nome::text
    into v_proprietario, v_produto_nome
  from public.produtos produto
  join public.lojas loja on loja.id = produto.loja_id
  where produto.id = new.produto_id;

  perform private.salvar_notificacao(
    v_proprietario,
    'avaliacao_nova',
    'Nova avaliação recebida',
    format('%s recebeu uma avaliação de %s estrela%s.',
      coalesce(v_produto_nome, 'Um produto'),
      new.nota,
      case when new.nota = 1 then '' else 's' end
    ),
    'avaliacoes-loja.html',
    jsonb_build_object(
      'avaliacao_id', new.id,
      'produto_id', new.produto_id,
      'pedido_id', new.pedido_id,
      'nota', new.nota
    ),
    format('avaliacao:%s:nova', new.id),
    false
  );

  return new;
end;
$$;

revoke all on function private.notificar_avaliacao()
  from public, anon, authenticated, service_role;

drop trigger if exists notificar_avaliacao_trigger on public.avaliacoes;
create trigger notificar_avaliacao_trigger
after insert on public.avaliacoes
for each row execute function private.notificar_avaliacao();

create or replace function private.notificar_estoque_baixo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_proprietario uuid;
begin
  if new.ativo is not true
     or coalesce(new.estoque, 0) > coalesce(new.estoque_minimo, 0) then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.ativo is true
     and coalesce(old.estoque, 0) <= coalesce(old.estoque_minimo, 0) then
    return new;
  end if;

  select loja.proprietario_id
    into v_proprietario
  from public.lojas loja
  where loja.id = new.loja_id;

  perform private.salvar_notificacao(
    v_proprietario,
    'estoque_baixo',
    'Estoque baixo',
    format('%s chegou a %s unidade%s em estoque.',
      coalesce(new.nome, 'Um produto'),
      coalesce(new.estoque, 0),
      case when coalesce(new.estoque, 0) = 1 then '' else 's' end
    ),
    'produtos.html',
    jsonb_build_object(
      'produto_id', new.id,
      'loja_id', new.loja_id,
      'estoque', coalesce(new.estoque, 0),
      'estoque_minimo', coalesce(new.estoque_minimo, 0)
    ),
    format('produto:%s:estoque_baixo', new.id),
    true
  );

  return new;
end;
$$;

revoke all on function private.notificar_estoque_baixo()
  from public, anon, authenticated, service_role;

drop trigger if exists notificar_estoque_baixo_trigger on public.produtos;
create trigger notificar_estoque_baixo_trigger
after insert or update of estoque, estoque_minimo, ativo on public.produtos
for each row execute function private.notificar_estoque_baixo();

create or replace function private.notificar_loja()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
  v_status_texto text;
begin
  if tg_op = 'INSERT' and new.status_aprovacao = 'pendente' then
    select principal.usuario_id
      into v_admin_id
    from private.admin_principal principal
    where principal.singleton;

    perform private.salvar_notificacao(
      v_admin_id,
      'loja_pendente',
      'Nova loja aguardando análise',
      format('%s foi cadastrada e precisa de aprovação.', coalesce(new.nome, 'Uma loja')),
      'admin-dashboard.html',
      jsonb_build_object('loja_id', new.id),
      format('loja:%s:pendente', new.id),
      false
    );

    return new;
  end if;

  if tg_op = 'INSERT'
     or old.status_aprovacao is not distinct from new.status_aprovacao then
    return new;
  end if;

  v_status_texto := case new.status_aprovacao
    when 'aprovada' then 'aprovada'
    when 'rejeitada' then 'rejeitada'
    when 'suspensa' then 'suspensa'
    when 'pendente' then 'enviada para nova análise'
    else coalesce(new.status_aprovacao, 'atualizada')
  end;

  perform private.salvar_notificacao(
    new.proprietario_id,
    'loja_status',
    'Situação da loja atualizada',
    format('A loja %s foi %s.', coalesce(new.nome, 'cadastrada'), v_status_texto),
    'painel-loja.html',
    jsonb_build_object(
      'loja_id', new.id,
      'status', new.status_aprovacao,
      'motivo', new.motivo_rejeicao
    ),
    format('loja:%s:status:%s', new.id, new.status_aprovacao),
    false
  );

  return new;
end;
$$;

revoke all on function private.notificar_loja()
  from public, anon, authenticated, service_role;

drop trigger if exists notificar_loja_trigger on public.lojas;
create trigger notificar_loja_trigger
after insert or update of status_aprovacao on public.lojas
for each row execute function private.notificar_loja();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notificacoes'
  ) then
    alter publication supabase_realtime add table public.notificacoes;
  end if;
end;
$$;

comment on table public.notificacoes is
  'Avisos privados da central de notificações, protegidos por RLS e publicados em tempo real.';

commit;
