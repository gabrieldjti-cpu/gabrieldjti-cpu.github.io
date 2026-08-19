-- Comércio da Cidade
-- Versiona as regras críticas do ciclo de pedidos usadas pelo frontend.
-- Esta migration é idempotente para funções/triggers e deve ser aplicada ao projeto Supabase.

begin;

-- ============================================================
-- STATUS PADRÃO E VALORES LEGADOS
-- ============================================================

alter table public.pedidos
    alter column status set default 'aguardando_pagamento';

update public.pedidos
set status = case lower(trim(status))
    when 'pendente' then 'aguardando_pagamento'
    when 'preparando' then 'em_preparacao'
    when 'finalizado' then 'entregue'
    else status
end
where lower(trim(status)) in ('pendente', 'preparando', 'finalizado');

alter table public.pedidos
    drop constraint if exists pedidos_status_check;

alter table public.pedidos
    add constraint pedidos_status_check
    check (status in (
        'aguardando_pagamento',
        'pago',
        'em_preparacao',
        'enviado',
        'entregue',
        'cancelado'
    ));

-- ============================================================
-- PROTEÇÃO E RESTAURAÇÃO DE ESTOQUE NO CANCELAMENTO
-- ============================================================

create or replace function public.proteger_cancelamento_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_motivo text := trim(coalesce(new.motivo_cancelamento, ''));
begin
    if old.status = 'cancelado' and new.status <> 'cancelado' then
        raise exception 'Pedidos cancelados não podem ser reativados.';
    end if;

    if new.status = 'cancelado' and old.status <> 'cancelado' then
        if old.status in ('enviado', 'entregue') then
            raise exception 'Pedido enviado ou entregue não pode mais ser cancelado.';
        end if;

        if char_length(v_motivo) < 5 or char_length(v_motivo) > 500 then
            raise exception 'O motivo do cancelamento deve ter entre 5 e 500 caracteres.';
        end if;

        new.motivo_cancelamento := v_motivo;
        new.cancelado_em := coalesce(new.cancelado_em, now());
        new.cancelado_por := coalesce(new.cancelado_por, v_uid);

        update public.produtos p
        set estoque = coalesce(p.estoque, 0) + itens.quantidade
        from (
            select
                ip.produto_id,
                sum(ip.quantidade)::integer as quantidade
            from public.itens_pedido ip
            where ip.pedido_id = old.id
            group by ip.produto_id
        ) itens
        where p.id = itens.produto_id;
    end if;

    return new;
end;
$$;

revoke all on function public.proteger_cancelamento_pedido()
from public, anon, authenticated;

drop trigger if exists trg_proteger_cancelamento_pedido
on public.pedidos;

create trigger trg_proteger_cancelamento_pedido
before update of status on public.pedidos
for each row
execute function public.proteger_cancelamento_pedido();

-- ============================================================
-- TRANSIÇÕES DO LOJISTA
-- aguardando_pagamento -> pago
-- pago -> em_preparacao
-- em_preparacao -> enviado (com rastreio)
-- ============================================================

create or replace function public.atualizar_status_pedido_loja(
    p_pedido_id uuid,
    p_novo_status text,
    p_codigo_rastreio text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_pedido public.pedidos%rowtype;
    v_proprietario uuid;
    v_novo_status text := lower(trim(coalesce(p_novo_status, '')));
    v_rastreio text := trim(coalesce(p_codigo_rastreio, ''));
begin
    if v_uid is null then
        raise exception 'Usuário não autenticado.';
    end if;

    select *
    into v_pedido
    from public.pedidos
    where id = p_pedido_id
    for update;

    if not found then
        raise exception 'Pedido não encontrado.';
    end if;

    select l.proprietario_id
    into v_proprietario
    from public.lojas l
    where l.id = v_pedido.loja_id;

    if v_proprietario is null or v_proprietario <> v_uid then
        raise exception 'Sua conta não possui permissão para atualizar este pedido.';
    end if;

    if v_pedido.status = 'cancelado' then
        raise exception 'Pedidos cancelados não podem ter o status alterado.';
    end if;

    if v_pedido.status = 'entregue' then
        raise exception 'Pedidos já entregues não podem ter o status alterado.';
    end if;

    if not (
        (v_pedido.status = 'aguardando_pagamento' and v_novo_status = 'pago')
        or (v_pedido.status = 'pago' and v_novo_status = 'em_preparacao')
        or (v_pedido.status = 'em_preparacao' and v_novo_status = 'enviado')
    ) then
        raise exception 'Transição de status não permitida.';
    end if;

    if v_novo_status = 'enviado' then
        if char_length(v_rastreio) < 3 or char_length(v_rastreio) > 100 then
            raise exception 'O código de rastreio deve ter entre 3 e 100 caracteres.';
        end if;

        update public.pedidos
        set
            status = 'enviado',
            codigo_rastreio = v_rastreio,
            enviado_em = now()
        where id = v_pedido.id;
    else
        update public.pedidos
        set status = v_novo_status
        where id = v_pedido.id;
    end if;

    return jsonb_build_object(
        'sucesso', true,
        'pedido_id', v_pedido.id,
        'status', v_novo_status,
        'codigo_rastreio',
            case
                when v_novo_status = 'enviado' then v_rastreio
                else null
            end
    );
end;
$$;

revoke all on function public.atualizar_status_pedido_loja(uuid, text, text)
from public, anon;

grant execute on function public.atualizar_status_pedido_loja(uuid, text, text)
to authenticated;

-- ============================================================
-- CANCELAMENTO DIRETO PELO LOJISTA
-- A restauração de estoque é feita pelo trigger acima.
-- ============================================================

create or replace function public.cancelar_pedido_loja(
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
    v_proprietario uuid;
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

    select l.proprietario_id
    into v_proprietario
    from public.lojas l
    where l.id = v_pedido.loja_id;

    if v_proprietario is null or v_proprietario <> v_uid then
        raise exception 'Sua conta não possui permissão para cancelar este pedido.';
    end if;

    if v_pedido.status = 'cancelado' then
        raise exception 'Este pedido já foi cancelado.';
    end if;

    if v_pedido.status in ('enviado', 'entregue') then
        raise exception 'Pedido enviado ou entregue não pode mais ser cancelado.';
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

revoke all on function public.cancelar_pedido_loja(uuid, text)
from public, anon;

grant execute on function public.cancelar_pedido_loja(uuid, text)
to authenticated;

-- ============================================================
-- CONFIRMAÇÃO DE ENTREGA PELO CLIENTE
-- ============================================================

create or replace function public.confirmar_entrega_cliente(
    p_pedido_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_pedido public.pedidos%rowtype;
begin
    if v_uid is null then
        raise exception 'Usuário não autenticado.';
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
        raise exception 'Sua conta não possui permissão para confirmar esta entrega.';
    end if;

    if v_pedido.status = 'entregue' then
        raise exception 'A entrega deste pedido já foi confirmada.';
    end if;

    if v_pedido.status <> 'enviado' then
        raise exception 'Somente pedidos enviados podem ter o recebimento confirmado.';
    end if;

    if char_length(trim(coalesce(v_pedido.codigo_rastreio, ''))) < 3 then
        raise exception 'Este pedido ainda não possui um código de rastreio válido.';
    end if;

    update public.pedidos
    set
        status = 'entregue',
        entregue_em = now(),
        entregue_confirmado_por = v_uid
    where id = v_pedido.id;

    return jsonb_build_object(
        'sucesso', true,
        'pedido_id', v_pedido.id,
        'status', 'entregue'
    );
end;
$$;

revoke all on function public.confirmar_entrega_cliente(uuid)
from public, anon;

grant execute on function public.confirmar_entrega_cliente(uuid)
to authenticated;

commit;
