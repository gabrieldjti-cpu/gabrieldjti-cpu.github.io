-- Comércio da Cidade
-- RF-10/RF-20: cancelamento direto pelo cliente antes da preparação
-- e solicitação de cancelamento durante a preparação.
-- Depende de 20260819_001_fluxo_seguro_pedidos.sql para restauração de estoque.

begin;

create table if not exists public.solicitacoes_cancelamento (
    id uuid primary key default gen_random_uuid(),
    pedido_id uuid not null unique references public.pedidos(id) on delete cascade,
    cliente_id uuid not null references public.profiles(id) on delete cascade,
    loja_id uuid not null references public.lojas(id) on delete cascade,
    motivo text not null,
    status text not null default 'pendente',
    resposta_loja text,
    criado_em timestamptz not null default now(),
    respondido_em timestamptz,
    respondido_por uuid references public.profiles(id),

    constraint solicitacoes_cancelamento_motivo_check
        check (char_length(trim(motivo)) between 5 and 500),

    constraint solicitacoes_cancelamento_status_check
        check (status in ('pendente', 'aprovada', 'recusada')),

    constraint solicitacoes_cancelamento_resposta_check
        check (
            resposta_loja is null
            or char_length(trim(resposta_loja)) between 3 and 500
        )
);

create index if not exists idx_solicitacoes_cancelamento_loja_status
    on public.solicitacoes_cancelamento(loja_id, status, criado_em desc);

create index if not exists idx_solicitacoes_cancelamento_cliente
    on public.solicitacoes_cancelamento(cliente_id, criado_em desc);

alter table public.solicitacoes_cancelamento
    enable row level security;

-- O frontend usa somente RPCs SECURITY DEFINER para esta tabela.
-- Não são concedidas políticas de acesso direto a anon/authenticated.

-- ============================================================
-- EVITA ENVIO ENQUANTO HÁ SOLICITAÇÃO PENDENTE
-- ============================================================

create or replace function public.bloquear_envio_com_cancelamento_pendente()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if
        old.status = 'em_preparacao'
        and new.status = 'enviado'
        and exists (
            select 1
            from public.solicitacoes_cancelamento s
            where s.pedido_id = old.id
              and s.status = 'pendente'
        )
    then
        raise exception 'Existe uma solicitação de cancelamento pendente para este pedido.';
    end if;

    return new;
end;
$$;

revoke all on function public.bloquear_envio_com_cancelamento_pendente()
from public, anon, authenticated;

drop trigger if exists trg_bloquear_envio_cancelamento_pendente
on public.pedidos;

create trigger trg_bloquear_envio_cancelamento_pendente
before update of status on public.pedidos
for each row
execute function public.bloquear_envio_com_cancelamento_pendente();

-- ============================================================
-- CANCELAMENTO DIRETO PELO CLIENTE
-- Permitido somente antes de em_preparacao.
-- ============================================================

create or replace function public.cancelar_pedido_cliente(
    p_pedido_id uuid,
    p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_pedido public.pedidos%rowtype;
    v_motivo text := trim(coalesce(p_motivo, ''));
begin
    if v_uid is null then
        raise exception 'Usuário não autenticado.';
    end if;

    if char_length(v_motivo) < 5 or char_length(v_motivo) > 500 then
        raise exception 'O motivo do cancelamento deve ter entre 5 e 500 caracteres.';
    end if;

    select *
    into v_pedido
    from public.pedidos
    where id = p_pedido_id
    for update;

    if not found then
        raise exception 'Pedido não encontrado.';
    end if;

    if v_pedido.cliente_id <> v_uid then
        raise exception 'Sua conta não possui permissão para cancelar este pedido.';
    end if;

    if v_pedido.status = 'cancelado' then
        raise exception 'Este pedido já foi cancelado.';
    end if;

    if v_pedido.status not in ('aguardando_pagamento', 'pago') then
        raise exception 'Este pedido não pode mais ser cancelado diretamente.';
    end if;

    update public.pedidos
    set
        motivo_cancelamento = v_motivo,
        status = 'cancelado'
    where id = v_pedido.id;

    return jsonb_build_object(
        'sucesso', true,
        'pedido_id', v_pedido.id,
        'status', 'cancelado'
    );
end;
$$;

revoke all on function public.cancelar_pedido_cliente(uuid, text)
from public, anon;

grant execute on function public.cancelar_pedido_cliente(uuid, text)
to authenticated;

-- ============================================================
-- SOLICITAR CANCELAMENTO DURANTE A PREPARAÇÃO
-- ============================================================

create or replace function public.solicitar_cancelamento_cliente(
    p_pedido_id uuid,
    p_motivo text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_pedido public.pedidos%rowtype;
    v_motivo text := trim(coalesce(p_motivo, ''));
    v_solicitacao public.solicitacoes_cancelamento%rowtype;
begin
    if v_uid is null then
        raise exception 'Usuário não autenticado.';
    end if;

    if char_length(v_motivo) < 5 or char_length(v_motivo) > 500 then
        raise exception 'O motivo do cancelamento deve ter entre 5 e 500 caracteres.';
    end if;

    select *
    into v_pedido
    from public.pedidos
    where id = p_pedido_id
    for update;

    if not found then
        raise exception 'Pedido não encontrado.';
    end if;

    if v_pedido.cliente_id <> v_uid then
        raise exception 'Sua conta não possui permissão para solicitar o cancelamento deste pedido.';
    end if;

    if v_pedido.status <> 'em_preparacao' then
        raise exception 'A solicitação de cancelamento só pode ser criada para pedidos em preparação.';
    end if;

    if exists (
        select 1
        from public.solicitacoes_cancelamento s
        where s.pedido_id = v_pedido.id
    ) then
        raise exception 'Já existe uma solicitação de cancelamento para este pedido.';
    end if;

    insert into public.solicitacoes_cancelamento (
        pedido_id,
        cliente_id,
        loja_id,
        motivo
    )
    values (
        v_pedido.id,
        v_uid,
        v_pedido.loja_id,
        v_motivo
    )
    returning *
    into v_solicitacao;

    return jsonb_build_object(
        'sucesso', true,
        'solicitacao_id', v_solicitacao.id,
        'pedido_id', v_solicitacao.pedido_id,
        'status', v_solicitacao.status
    );
end;
$$;

revoke all on function public.solicitar_cancelamento_cliente(uuid, text)
from public, anon;

grant execute on function public.solicitar_cancelamento_cliente(uuid, text)
to authenticated;

-- ============================================================
-- CONSULTA DO CLIENTE
-- ============================================================

create or replace function public.listar_solicitacoes_cancelamento_cliente()
returns table(
    id uuid,
    pedido_id uuid,
    status text,
    motivo text,
    resposta_loja text,
    criado_em timestamptz,
    respondido_em timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
begin
    if v_uid is null then
        raise exception 'Usuário não autenticado.';
    end if;

    return query
    select
        s.id,
        s.pedido_id,
        s.status,
        s.motivo,
        s.resposta_loja,
        s.criado_em,
        s.respondido_em
    from public.solicitacoes_cancelamento s
    where s.cliente_id = v_uid
    order by s.criado_em desc;
end;
$$;

revoke all on function public.listar_solicitacoes_cancelamento_cliente()
from public, anon;

grant execute on function public.listar_solicitacoes_cancelamento_cliente()
to authenticated;

-- ============================================================
-- CONSULTA DO LOJISTA
-- ============================================================

create or replace function public.listar_solicitacoes_cancelamento_loja()
returns table(
    id uuid,
    pedido_id uuid,
    status text,
    motivo text,
    resposta_loja text,
    criado_em timestamptz,
    respondido_em timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
begin
    if v_uid is null then
        raise exception 'Usuário não autenticado.';
    end if;

    return query
    select
        s.id,
        s.pedido_id,
        s.status,
        s.motivo,
        s.resposta_loja,
        s.criado_em,
        s.respondido_em
    from public.solicitacoes_cancelamento s
    join public.lojas l
      on l.id = s.loja_id
    where l.proprietario_id = v_uid
    order by
        case when s.status = 'pendente' then 0 else 1 end,
        s.criado_em desc;
end;
$$;

revoke all on function public.listar_solicitacoes_cancelamento_loja()
from public, anon;

grant execute on function public.listar_solicitacoes_cancelamento_loja()
to authenticated;

-- ============================================================
-- RESPOSTA DO LOJISTA
-- Ao aprovar, o pedido é cancelado e o trigger da migration 001
-- restaura o estoque uma única vez.
-- ============================================================

create or replace function public.responder_solicitacao_cancelamento_loja(
    p_solicitacao_id uuid,
    p_aprovar boolean,
    p_resposta text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_solicitacao public.solicitacoes_cancelamento%rowtype;
    v_pedido public.pedidos%rowtype;
    v_proprietario uuid;
    v_resposta text := trim(coalesce(p_resposta, ''));
begin
    if v_uid is null then
        raise exception 'Usuário não autenticado.';
    end if;

    select *
    into v_solicitacao
    from public.solicitacoes_cancelamento
    where id = p_solicitacao_id
    for update;

    if not found then
        raise exception 'Solicitação de cancelamento não encontrada.';
    end if;

    select l.proprietario_id
    into v_proprietario
    from public.lojas l
    where l.id = v_solicitacao.loja_id;

    if v_proprietario is null or v_proprietario <> v_uid then
        raise exception 'Sua conta não possui permissão para responder esta solicitação.';
    end if;

    if v_solicitacao.status <> 'pendente' then
        raise exception 'Esta solicitação já foi respondida.';
    end if;

    select *
    into v_pedido
    from public.pedidos
    where id = v_solicitacao.pedido_id
    for update;

    if not found then
        raise exception 'Pedido não encontrado.';
    end if;

    if p_aprovar then
        if v_pedido.status <> 'em_preparacao' then
            raise exception 'O pedido não está mais em preparação e não pode ser cancelado por esta solicitação.';
        end if;

        update public.pedidos
        set
            motivo_cancelamento = v_solicitacao.motivo,
            status = 'cancelado'
        where id = v_pedido.id;

        update public.solicitacoes_cancelamento
        set
            status = 'aprovada',
            resposta_loja = case
                when v_resposta = '' then 'Cancelamento aprovado pela loja.'
                else v_resposta
            end,
            respondido_em = now(),
            respondido_por = v_uid
        where id = v_solicitacao.id;

    else
        if char_length(v_resposta) < 3 or char_length(v_resposta) > 500 then
            raise exception 'Informe uma justificativa de recusa entre 3 e 500 caracteres.';
        end if;

        update public.solicitacoes_cancelamento
        set
            status = 'recusada',
            resposta_loja = v_resposta,
            respondido_em = now(),
            respondido_por = v_uid
        where id = v_solicitacao.id;
    end if;

    return jsonb_build_object(
        'sucesso', true,
        'solicitacao_id', v_solicitacao.id,
        'pedido_id', v_solicitacao.pedido_id,
        'status', case when p_aprovar then 'aprovada' else 'recusada' end
    );
end;
$$;

revoke all on function public.responder_solicitacao_cancelamento_loja(uuid, boolean, text)
from public, anon;

grant execute on function public.responder_solicitacao_cancelamento_loja(uuid, boolean, text)
to authenticated;

commit;
