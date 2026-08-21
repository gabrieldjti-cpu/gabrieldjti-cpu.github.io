-- RF-13 / RF-23 — aprovação de lojas e base do dashboard administrativo

alter table public.lojas
    add column if not exists status_aprovacao text,
    add column if not exists aprovado_em timestamptz,
    add column if not exists aprovado_por uuid references public.profiles(id) on delete set null,
    add column if not exists motivo_rejeicao text;

-- Lojas anteriores ao fluxo de aprovação já estavam publicadas no marketplace.
update public.lojas
set
    status_aprovacao = 'aprovada',
    aprovado_em = coalesce(aprovado_em, criado_em, created_at, now())
where status_aprovacao is null;

alter table public.lojas
    alter column status_aprovacao set default 'pendente',
    alter column status_aprovacao set not null;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'lojas_status_aprovacao_check'
          and conrelid = 'public.lojas'::regclass
    ) then
        alter table public.lojas
            add constraint lojas_status_aprovacao_check
            check (status_aprovacao in ('pendente', 'aprovada', 'rejeitada', 'suspensa'));
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname = 'lojas_motivo_rejeicao_tamanho_check'
          and conrelid = 'public.lojas'::regclass
    ) then
        alter table public.lojas
            add constraint lojas_motivo_rejeicao_tamanho_check
            check (motivo_rejeicao is null or char_length(motivo_rejeicao) <= 500);
    end if;
end
$$;

create index if not exists lojas_status_aprovacao_idx
    on public.lojas(status_aprovacao, criado_em desc);

create table if not exists public.historico_status_lojas (
    id uuid primary key default gen_random_uuid(),
    loja_id uuid not null references public.lojas(id) on delete cascade,
    status_anterior text,
    status_novo text not null,
    motivo text,
    alterado_por uuid references public.profiles(id) on delete set null,
    criado_em timestamptz not null default now(),
    constraint historico_status_lojas_status_novo_check
        check (status_novo in ('pendente', 'aprovada', 'rejeitada', 'suspensa')),
    constraint historico_status_lojas_status_anterior_check
        check (status_anterior is null or status_anterior in ('pendente', 'aprovada', 'rejeitada', 'suspensa'))
);

create index if not exists historico_status_lojas_loja_idx
    on public.historico_status_lojas(loja_id, criado_em desc);

alter table public.historico_status_lojas enable row level security;

create or replace function public._usuario_e_admin(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select exists (
        select 1
        from public.profiles p
        where p.id = p_uid
          and p.ativo = true
          and p.tipo_usuario = 'admin'
    );
$$;

revoke all on function public._usuario_e_admin(uuid) from public;
revoke all on function public._usuario_e_admin(uuid) from anon;
revoke all on function public._usuario_e_admin(uuid) from authenticated;

create or replace function public.sou_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select coalesce(public._usuario_e_admin(auth.uid()), false);
$$;

revoke all on function public.sou_admin() from public;
revoke all on function public.sou_admin() from anon;
grant execute on function public.sou_admin() to authenticated;

create or replace function public.proteger_aprovacao_loja()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_uid uuid := auth.uid();
    v_admin boolean := false;
begin
    if v_uid is null then
        return new;
    end if;

    v_admin := public._usuario_e_admin(v_uid);

    if tg_op = 'INSERT' then
        if not v_admin then
            if new.proprietario_id is distinct from v_uid then
                raise exception 'Você só pode cadastrar uma loja para sua própria conta.';
            end if;

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

        if new.status_aprovacao is distinct from old.status_aprovacao
           or new.aprovado_em is distinct from old.aprovado_em
           or new.aprovado_por is distinct from old.aprovado_por
           or new.motivo_rejeicao is distinct from old.motivo_rejeicao then
            raise exception 'Somente um administrador pode alterar a aprovação da loja.';
        end if;

        if old.status_aprovacao <> 'aprovada' then
            new.ativa := false;
        end if;
    end if;

    return new;
end;
$$;

revoke all on function public.proteger_aprovacao_loja() from public;
revoke all on function public.proteger_aprovacao_loja() from anon;
revoke all on function public.proteger_aprovacao_loja() from authenticated;

drop trigger if exists trg_proteger_aprovacao_loja on public.lojas;
create trigger trg_proteger_aprovacao_loja
before insert or update on public.lojas
for each row
execute function public.proteger_aprovacao_loja();

drop policy if exists "Qualquer pessoa pode visualizar lojas ativas" on public.lojas;
drop policy if exists "Público visualiza lojas aprovadas e ativas" on public.lojas;
drop policy if exists "Proprietário visualiza própria loja" on public.lojas;

create policy "Público visualiza lojas aprovadas e ativas"
on public.lojas
for select
to anon, authenticated
using (
    ativa = true
    and status_aprovacao = 'aprovada'
);

create policy "Proprietário visualiza própria loja"
on public.lojas
for select
to authenticated
using (proprietario_id = auth.uid());

drop policy if exists "Qualquer pessoa pode visualizar produtos" on public.produtos;
drop policy if exists "Visualizar produtos" on public.produtos;
drop policy if exists "Catálogo público e produtos do proprietário" on public.produtos;

create policy "Catálogo público e produtos do proprietário"
on public.produtos
for select
to public
using (
    (
        ativo = true
        and exists (
            select 1
            from public.lojas l
            where l.id = produtos.loja_id
              and l.ativa = true
              and l.status_aprovacao = 'aprovada'
        )
    )
    or exists (
        select 1
        from public.lojas l
        where l.id = produtos.loja_id
          and l.proprietario_id = auth.uid()
    )
);

create or replace function public.resumo_admin()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
    v_uid uuid := auth.uid();
begin
    if v_uid is null or not public._usuario_e_admin(v_uid) then
        raise exception 'Acesso restrito a administradores.';
    end if;

    return jsonb_build_object(
        'usuarios_ativos', (select count(*) from public.profiles where ativo = true),
        'lojas_total', (select count(*) from public.lojas),
        'lojas_pendentes', (select count(*) from public.lojas where status_aprovacao = 'pendente'),
        'lojas_aprovadas', (select count(*) from public.lojas where status_aprovacao = 'aprovada'),
        'lojas_rejeitadas', (select count(*) from public.lojas where status_aprovacao = 'rejeitada'),
        'lojas_suspensas', (select count(*) from public.lojas where status_aprovacao = 'suspensa'),
        'pedidos_total', (select count(*) from public.pedidos)
    );
end;
$$;

revoke all on function public.resumo_admin() from public;
revoke all on function public.resumo_admin() from anon;
grant execute on function public.resumo_admin() to authenticated;

create or replace function public.listar_lojas_admin(
    p_status text default null,
    p_busca text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
    v_uid uuid := auth.uid();
    v_status text := nullif(trim(coalesce(p_status, '')), '');
    v_busca text := nullif(trim(coalesce(p_busca, '')), '');
begin
    if v_uid is null or not public._usuario_e_admin(v_uid) then
        raise exception 'Acesso restrito a administradores.';
    end if;

    if v_status is not null
       and v_status not in ('pendente', 'aprovada', 'rejeitada', 'suspensa') then
        raise exception 'Status de loja inválido.';
    end if;

    return coalesce((
        select jsonb_agg(item order by item->>'criado_em' desc)
        from (
            select jsonb_build_object(
                'id', l.id,
                'nome', l.nome,
                'descricao', l.descricao,
                'telefone', l.telefone,
                'whatsapp', l.whatsapp,
                'endereco', l.endereco,
                'cidade', l.cidade,
                'estado', l.estado,
                'logo_url', l.logo_url,
                'ativa', l.ativa,
                'status_aprovacao', l.status_aprovacao,
                'motivo_rejeicao', l.motivo_rejeicao,
                'aprovado_em', l.aprovado_em,
                'aprovado_por', l.aprovado_por,
                'criado_em', coalesce(l.criado_em, l.created_at),
                'categoria', c.nome,
                'proprietario_id', l.proprietario_id,
                'proprietario_nome', p.nome,
                'proprietario_telefone', p.telefone,
                'total_produtos', (
                    select count(*)
                    from public.produtos pr
                    where pr.loja_id = l.id
                ),
                'total_pedidos', (
                    select count(*)
                    from public.pedidos pe
                    where pe.loja_id = l.id
                )
            ) as item
            from public.lojas l
            left join public.categorias c on c.id = l.categoria_id
            left join public.profiles p on p.id = l.proprietario_id
            where (v_status is null or l.status_aprovacao = v_status)
              and (
                    v_busca is null
                    or l.nome ilike '%' || v_busca || '%'
                    or coalesce(l.cidade, '') ilike '%' || v_busca || '%'
                    or coalesce(p.nome, '') ilike '%' || v_busca || '%'
                    or coalesce(c.nome, '') ilike '%' || v_busca || '%'
              )
        ) dados
    ), '[]'::jsonb);
end;
$$;

revoke all on function public.listar_lojas_admin(text, text) from public;
revoke all on function public.listar_lojas_admin(text, text) from anon;
grant execute on function public.listar_lojas_admin(text, text) to authenticated;

create or replace function public.listar_historico_loja_admin(p_loja_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
    v_uid uuid := auth.uid();
begin
    if v_uid is null or not public._usuario_e_admin(v_uid) then
        raise exception 'Acesso restrito a administradores.';
    end if;

    return coalesce((
        select jsonb_agg(
            jsonb_build_object(
                'id', h.id,
                'status_anterior', h.status_anterior,
                'status_novo', h.status_novo,
                'motivo', h.motivo,
                'criado_em', h.criado_em,
                'administrador_nome', p.nome
            )
            order by h.criado_em desc
        )
        from public.historico_status_lojas h
        left join public.profiles p on p.id = h.alterado_por
        where h.loja_id = p_loja_id
    ), '[]'::jsonb);
end;
$$;

revoke all on function public.listar_historico_loja_admin(uuid) from public;
revoke all on function public.listar_historico_loja_admin(uuid) from anon;
grant execute on function public.listar_historico_loja_admin(uuid) to authenticated;

create or replace function public.alterar_status_loja_admin(
    p_loja_id uuid,
    p_status text,
    p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_uid uuid := auth.uid();
    v_status text := lower(trim(coalesce(p_status, '')));
    v_motivo text := nullif(trim(coalesce(p_motivo, '')), '');
    v_loja public.lojas%rowtype;
    v_status_anterior text;
begin
    if v_uid is null or not public._usuario_e_admin(v_uid) then
        raise exception 'Acesso restrito a administradores.';
    end if;

    if v_status not in ('pendente', 'aprovada', 'rejeitada', 'suspensa') then
        raise exception 'Status de loja inválido.';
    end if;

    if v_status in ('rejeitada', 'suspensa') and v_motivo is null then
        raise exception 'Informe o motivo da rejeição ou suspensão.';
    end if;

    if v_motivo is not null and char_length(v_motivo) > 500 then
        raise exception 'O motivo deve ter no máximo 500 caracteres.';
    end if;

    select *
    into v_loja
    from public.lojas
    where id = p_loja_id
    for update;

    if not found then
        raise exception 'Loja não encontrada.';
    end if;

    v_status_anterior := v_loja.status_aprovacao;

    update public.lojas
    set
        status_aprovacao = v_status,
        ativa = case when v_status = 'aprovada' then true else false end,
        aprovado_em = case when v_status = 'aprovada' then now() else null end,
        aprovado_por = case when v_status = 'aprovada' then v_uid else null end,
        motivo_rejeicao = case when v_status in ('rejeitada', 'suspensa') then v_motivo else null end,
        atualizado_em = now()
    where id = p_loja_id
    returning * into v_loja;

    if v_status is distinct from v_status_anterior
       or v_motivo is not null then
        insert into public.historico_status_lojas (
            loja_id,
            status_anterior,
            status_novo,
            motivo,
            alterado_por
        ) values (
            p_loja_id,
            v_status_anterior,
            v_status,
            v_motivo,
            v_uid
        );
    end if;

    return jsonb_build_object(
        'id', v_loja.id,
        'nome', v_loja.nome,
        'status_aprovacao', v_loja.status_aprovacao,
        'ativa', v_loja.ativa,
        'motivo_rejeicao', v_loja.motivo_rejeicao,
        'aprovado_em', v_loja.aprovado_em
    );
end;
$$;

revoke all on function public.alterar_status_loja_admin(uuid, text, text) from public;
revoke all on function public.alterar_status_loja_admin(uuid, text, text) from anon;
grant execute on function public.alterar_status_loja_admin(uuid, text, text) to authenticated;

create or replace function public.finalizar_checkout_endereco(
    p_forma_pagamento text,
    p_observacoes text,
    p_itens jsonb,
    p_endereco_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
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

    if p_itens is null
       or jsonb_typeof(p_itens) <> 'array'
       or jsonb_array_length(p_itens) = 0 then
        raise exception 'Carrinho vazio.';
    end if;

    if exists (
        select 1
        from jsonb_array_elements(p_itens) item
        left join public.produtos pr
          on pr.id::text = item ->> 'produto_id'
        left join public.lojas l
          on l.id = pr.loja_id
        where pr.id is null
           or l.id is null
           or pr.ativo is not true
           or l.ativa is not true
           or l.status_aprovacao <> 'aprovada'
    ) then
        raise exception 'Um ou mais produtos pertencem a uma loja indisponível no momento.';
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

revoke all on function public.finalizar_checkout_endereco(text, text, jsonb, uuid) from public;
revoke all on function public.finalizar_checkout_endereco(text, text, jsonb, uuid) from anon;
grant execute on function public.finalizar_checkout_endereco(text, text, jsonb, uuid) to authenticated;
