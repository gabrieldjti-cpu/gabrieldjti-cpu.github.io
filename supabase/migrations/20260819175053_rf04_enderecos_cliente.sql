-- Comércio da Cidade
-- RF-04 — múltiplos endereços do cliente + integração segura ao checkout

begin;

create table if not exists public.enderecos_cliente (
    id uuid primary key default gen_random_uuid(),
    cliente_id uuid not null references public.profiles(id) on delete cascade,
    apelido text not null default 'Endereço',
    cep text,
    logradouro text not null,
    numero text not null,
    complemento text,
    bairro text not null,
    cidade text not null,
    estado text,
    referencia text,
    padrao boolean not null default false,
    ativo boolean not null default true,
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now(),
    excluido_em timestamptz,

    constraint enderecos_cliente_apelido_check
        check (char_length(trim(apelido)) between 1 and 50),

    constraint enderecos_cliente_logradouro_check
        check (char_length(trim(logradouro)) between 2 and 160),

    constraint enderecos_cliente_numero_check
        check (char_length(trim(numero)) between 1 and 30),

    constraint enderecos_cliente_bairro_check
        check (char_length(trim(bairro)) between 2 and 100),

    constraint enderecos_cliente_cidade_check
        check (char_length(trim(cidade)) between 2 and 100),

    constraint enderecos_cliente_cep_check
        check (cep is null or cep ~ '^[0-9]{8}$'),

    constraint enderecos_cliente_estado_check
        check (estado is null or estado ~ '^[A-Z]{2}$'),

    constraint enderecos_cliente_complemento_check
        check (complemento is null or char_length(trim(complemento)) <= 120),

    constraint enderecos_cliente_referencia_check
        check (referencia is null or char_length(trim(referencia)) <= 180)
);

create index if not exists idx_enderecos_cliente_cliente_ativo
    on public.enderecos_cliente(cliente_id, ativo, criado_em desc);

create unique index if not exists idx_enderecos_cliente_um_padrao
    on public.enderecos_cliente(cliente_id)
    where padrao = true
      and ativo = true
      and excluido_em is null;

alter table public.enderecos_cliente
    enable row level security;

revoke all on table public.enderecos_cliente
from anon, authenticated;

grant select on table public.enderecos_cliente
to authenticated;

drop policy if exists "Cliente visualiza próprios endereços"
on public.enderecos_cliente;

create policy "Cliente visualiza próprios endereços"
on public.enderecos_cliente
for select
to authenticated
using (
    cliente_id = (select auth.uid())
    and ativo = true
    and excluido_em is null
);

create or replace function public.atualizar_timestamp_endereco_cliente()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.atualizado_em := now();
    return new;
end;
$$;

revoke all on function public.atualizar_timestamp_endereco_cliente()
from public, anon, authenticated;

drop trigger if exists trg_atualizar_timestamp_endereco_cliente
on public.enderecos_cliente;

create trigger trg_atualizar_timestamp_endereco_cliente
before update on public.enderecos_cliente
for each row
execute function public.atualizar_timestamp_endereco_cliente();

create or replace function public.sincronizar_endereco_padrao_profile(
    p_cliente_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_endereco public.enderecos_cliente%rowtype;
begin
    select *
    into v_endereco
    from public.enderecos_cliente
    where cliente_id = p_cliente_id
      and ativo = true
      and excluido_em is null
      and padrao = true
    order by atualizado_em desc
    limit 1;

    if found then
        update public.profiles
        set
            rua = v_endereco.logradouro,
            numero = v_endereco.numero,
            bairro = v_endereco.bairro,
            cidade = v_endereco.cidade
        where id = p_cliente_id;
    else
        update public.profiles
        set
            rua = null,
            numero = null,
            bairro = null,
            cidade = null
        where id = p_cliente_id;
    end if;
end;
$$;

revoke all on function public.sincronizar_endereco_padrao_profile(uuid)
from public, anon, authenticated;

insert into public.enderecos_cliente (
    cliente_id,
    apelido,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    referencia,
    padrao,
    ativo
)
select
    p.id,
    'Endereço principal',
    null,
    trim(p.rua),
    coalesce(nullif(trim(p.numero), ''), 'S/N'),
    null,
    coalesce(nullif(trim(p.bairro), ''), 'Não informado'),
    coalesce(nullif(trim(p.cidade), ''), 'Não informado'),
    null,
    null,
    true,
    true
from public.profiles p
where nullif(trim(p.rua), '') is not null
  and not exists (
      select 1
      from public.enderecos_cliente e
      where e.cliente_id = p.id
        and e.ativo = true
        and e.excluido_em is null
  );

create or replace function public.listar_enderecos_cliente()
returns table(
    id uuid,
    apelido text,
    cep text,
    logradouro text,
    numero text,
    complemento text,
    bairro text,
    cidade text,
    estado text,
    referencia text,
    padrao boolean,
    completo boolean,
    criado_em timestamptz,
    atualizado_em timestamptz
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
        e.id,
        e.apelido,
        e.cep,
        e.logradouro,
        e.numero,
        e.complemento,
        e.bairro,
        e.cidade,
        e.estado,
        e.referencia,
        e.padrao,
        (
            e.cep ~ '^[0-9]{8}$'
            and e.estado ~ '^[A-Z]{2}$'
        ) as completo,
        e.criado_em,
        e.atualizado_em
    from public.enderecos_cliente e
    where e.cliente_id = v_uid
      and e.ativo = true
      and e.excluido_em is null
    order by e.padrao desc, e.atualizado_em desc, e.criado_em desc;
end;
$$;

revoke all on function public.listar_enderecos_cliente()
from public, anon;

grant execute on function public.listar_enderecos_cliente()
to authenticated;

create or replace function public.salvar_endereco_cliente(
    p_endereco_id uuid,
    p_apelido text,
    p_cep text,
    p_logradouro text,
    p_numero text,
    p_complemento text,
    p_bairro text,
    p_cidade text,
    p_estado text,
    p_referencia text,
    p_padrao boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_id uuid;
    v_apelido text := trim(coalesce(p_apelido, ''));
    v_cep text := regexp_replace(coalesce(p_cep, ''), '[^0-9]', '', 'g');
    v_logradouro text := trim(coalesce(p_logradouro, ''));
    v_numero text := trim(coalesce(p_numero, ''));
    v_complemento text := nullif(trim(coalesce(p_complemento, '')), '');
    v_bairro text := trim(coalesce(p_bairro, ''));
    v_cidade text := trim(coalesce(p_cidade, ''));
    v_estado text := upper(trim(coalesce(p_estado, '')));
    v_referencia text := nullif(trim(coalesce(p_referencia, '')), '');
    v_tornar_padrao boolean := coalesce(p_padrao, false);
    v_atual public.enderecos_cliente%rowtype;
begin
    if v_uid is null then
        raise exception 'Usuário não autenticado.';
    end if;

    if char_length(v_apelido) < 1 or char_length(v_apelido) > 50 then
        raise exception 'O apelido do endereço deve ter entre 1 e 50 caracteres.';
    end if;

    if char_length(v_logradouro) < 2 or char_length(v_logradouro) > 160 then
        raise exception 'Informe um logradouro válido.';
    end if;

    if char_length(v_numero) < 1 or char_length(v_numero) > 30 then
        raise exception 'Informe o número do endereço.';
    end if;

    if char_length(v_bairro) < 2 or char_length(v_bairro) > 100 then
        raise exception 'Informe um bairro válido.';
    end if;

    if char_length(v_cidade) < 2 or char_length(v_cidade) > 100 then
        raise exception 'Informe uma cidade válida.';
    end if;

    if v_cep !~ '^[0-9]{8}$' then
        raise exception 'Informe um CEP válido com 8 números.';
    end if;

    if v_estado !~ '^[A-Z]{2}$' then
        raise exception 'Informe a UF com 2 letras.';
    end if;

    if v_complemento is not null and char_length(v_complemento) > 120 then
        raise exception 'O complemento deve ter no máximo 120 caracteres.';
    end if;

    if v_referencia is not null and char_length(v_referencia) > 180 then
        raise exception 'A referência deve ter no máximo 180 caracteres.';
    end if;

    if p_endereco_id is not null then
        select *
        into v_atual
        from public.enderecos_cliente
        where id = p_endereco_id
          and cliente_id = v_uid
          and ativo = true
          and excluido_em is null
        for update;

        if not found then
            raise exception 'Endereço não encontrado.';
        end if;

        if v_atual.padrao then
            v_tornar_padrao := true;
        end if;
    end if;

    if not exists (
        select 1
        from public.enderecos_cliente e
        where e.cliente_id = v_uid
          and e.ativo = true
          and e.excluido_em is null
          and e.padrao = true
          and (p_endereco_id is null or e.id <> p_endereco_id)
    ) then
        v_tornar_padrao := true;
    end if;

    if v_tornar_padrao then
        update public.enderecos_cliente
        set padrao = false
        where cliente_id = v_uid
          and ativo = true
          and excluido_em is null
          and (p_endereco_id is null or id <> p_endereco_id);
    end if;

    if p_endereco_id is null then
        insert into public.enderecos_cliente (
            cliente_id,
            apelido,
            cep,
            logradouro,
            numero,
            complemento,
            bairro,
            cidade,
            estado,
            referencia,
            padrao,
            ativo,
            excluido_em
        )
        values (
            v_uid,
            v_apelido,
            v_cep,
            v_logradouro,
            v_numero,
            v_complemento,
            v_bairro,
            v_cidade,
            v_estado,
            v_referencia,
            v_tornar_padrao,
            true,
            null
        )
        returning id into v_id;
    else
        update public.enderecos_cliente
        set
            apelido = v_apelido,
            cep = v_cep,
            logradouro = v_logradouro,
            numero = v_numero,
            complemento = v_complemento,
            bairro = v_bairro,
            cidade = v_cidade,
            estado = v_estado,
            referencia = v_referencia,
            padrao = v_tornar_padrao
        where id = p_endereco_id
          and cliente_id = v_uid
        returning id into v_id;
    end if;

    perform public.sincronizar_endereco_padrao_profile(v_uid);

    return jsonb_build_object(
        'sucesso', true,
        'endereco_id', v_id,
        'padrao', v_tornar_padrao
    );
end;
$$;

revoke all on function public.salvar_endereco_cliente(
    uuid, text, text, text, text, text, text, text, text, text, boolean
)
from public, anon;

grant execute on function public.salvar_endereco_cliente(
    uuid, text, text, text, text, text, text, text, text, text, boolean
)
to authenticated;

create or replace function public.definir_endereco_padrao_cliente(
    p_endereco_id uuid
)
returns jsonb
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

    if not exists (
        select 1
        from public.enderecos_cliente e
        where e.id = p_endereco_id
          and e.cliente_id = v_uid
          and e.ativo = true
          and e.excluido_em is null
    ) then
        raise exception 'Endereço não encontrado.';
    end if;

    update public.enderecos_cliente
    set padrao = (id = p_endereco_id)
    where cliente_id = v_uid
      and ativo = true
      and excluido_em is null;

    perform public.sincronizar_endereco_padrao_profile(v_uid);

    return jsonb_build_object(
        'sucesso', true,
        'endereco_id', p_endereco_id,
        'padrao', true
    );
end;
$$;

revoke all on function public.definir_endereco_padrao_cliente(uuid)
from public, anon;

grant execute on function public.definir_endereco_padrao_cliente(uuid)
to authenticated;

create or replace function public.excluir_endereco_cliente(
    p_endereco_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_padrao boolean;
    v_novo_padrao uuid;
begin
    if v_uid is null then
        raise exception 'Usuário não autenticado.';
    end if;

    select e.padrao
    into v_padrao
    from public.enderecos_cliente e
    where e.id = p_endereco_id
      and e.cliente_id = v_uid
      and e.ativo = true
      and e.excluido_em is null
    for update;

    if not found then
        raise exception 'Endereço não encontrado.';
    end if;

    update public.enderecos_cliente
    set
        ativo = false,
        padrao = false,
        excluido_em = now()
    where id = p_endereco_id
      and cliente_id = v_uid;

    if v_padrao then
        select e.id
        into v_novo_padrao
        from public.enderecos_cliente e
        where e.cliente_id = v_uid
          and e.ativo = true
          and e.excluido_em is null
        order by e.atualizado_em desc, e.criado_em desc
        limit 1;

        if v_novo_padrao is not null then
            update public.enderecos_cliente
            set padrao = true
            where id = v_novo_padrao;
        end if;
    end if;

    perform public.sincronizar_endereco_padrao_profile(v_uid);

    return jsonb_build_object(
        'sucesso', true,
        'endereco_id', p_endereco_id,
        'novo_padrao', v_novo_padrao
    );
end;
$$;

revoke all on function public.excluir_endereco_cliente(uuid)
from public, anon;

grant execute on function public.excluir_endereco_cliente(uuid)
to authenticated;

alter table public.pedidos
    add column if not exists endereco_id uuid references public.enderecos_cliente(id) on delete set null;

alter table public.pedidos
    add column if not exists endereco_entrega jsonb;

create index if not exists idx_pedidos_endereco_id
    on public.pedidos(endereco_id);

create or replace function public.finalizar_checkout_endereco(
    p_forma_pagamento text,
    p_observacoes text,
    p_itens jsonb,
    p_endereco_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_endereco public.enderecos_cliente%rowtype;
    v_resultado jsonb;
    v_snapshot jsonb;
begin
    if v_uid is null then
        raise exception 'Usuário não autenticado.';
    end if;

    select *
    into v_endereco
    from public.enderecos_cliente
    where id = p_endereco_id
      and cliente_id = v_uid
      and ativo = true
      and excluido_em is null
    for share;

    if not found then
        raise exception 'Selecione um endereço de entrega válido.';
    end if;

    if v_endereco.cep is null
       or v_endereco.cep !~ '^[0-9]{8}$'
       or v_endereco.estado is null
       or v_endereco.estado !~ '^[A-Z]{2}$' then
        raise exception 'Complete o CEP e a UF do endereço antes de finalizar o pedido.';
    end if;

    v_resultado := public.finalizar_checkout(
        p_forma_pagamento,
        p_observacoes,
        p_itens
    );

    v_snapshot := jsonb_build_object(
        'endereco_id', v_endereco.id,
        'apelido', v_endereco.apelido,
        'cep', v_endereco.cep,
        'logradouro', v_endereco.logradouro,
        'numero', v_endereco.numero,
        'complemento', v_endereco.complemento,
        'bairro', v_endereco.bairro,
        'cidade', v_endereco.cidade,
        'estado', v_endereco.estado,
        'referencia', v_endereco.referencia,
        'capturado_em', now()
    );

    update public.pedidos p
    set
        endereco_id = v_endereco.id,
        endereco_entrega = v_snapshot
    where p.cliente_id = v_uid
      and p.id in (
          select (item ->> 'pedido_id')::uuid
          from jsonb_array_elements(v_resultado) item
      );

    return v_resultado;
end;
$$;

revoke all on function public.finalizar_checkout_endereco(text, text, jsonb, uuid)
from public, anon;

grant execute on function public.finalizar_checkout_endereco(text, text, jsonb, uuid)
to authenticated;

commit;