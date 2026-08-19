-- Comércio da Cidade
-- RF-11: leitura das avaliações pertencentes às lojas do usuário
-- e resposta pública do lojista sem expor dados privados do cliente.

begin;

create or replace function public.listar_avaliacoes_loja()
returns table(
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
        a.id,
        a.produto_id,
        p.nome::text as produto_nome,
        l.id as loja_id,
        l.nome::text as loja_nome,
        a.nota,
        a.comentario,
        a.resposta_loja,
        a.criado_em
    from public.avaliacoes a
    join public.produtos p on p.id = a.produto_id
    join public.lojas l on l.id = p.loja_id
    where l.proprietario_id = v_uid
    order by a.criado_em desc;
end;
$$;

revoke all on function public.listar_avaliacoes_loja() from public, anon;
grant execute on function public.listar_avaliacoes_loja() to authenticated;

create or replace function public.responder_avaliacao_loja(
    p_avaliacao_id uuid,
    p_resposta text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_resposta text := trim(coalesce(p_resposta, ''));
    v_proprietario uuid;
begin
    if v_uid is null then
        raise exception 'Usuário não autenticado.';
    end if;

    if char_length(v_resposta) < 1 or char_length(v_resposta) > 1000 then
        raise exception 'A resposta deve ter entre 1 e 1000 caracteres.';
    end if;

    select l.proprietario_id
    into v_proprietario
    from public.avaliacoes a
    join public.produtos p on p.id = a.produto_id
    join public.lojas l on l.id = p.loja_id
    where a.id = p_avaliacao_id;

    if not found then
        raise exception 'Avaliação não encontrada.';
    end if;

    if v_proprietario <> v_uid then
        raise exception 'Sua conta não possui permissão para responder esta avaliação.';
    end if;

    update public.avaliacoes
    set resposta_loja = v_resposta
    where id = p_avaliacao_id;

    return jsonb_build_object(
        'sucesso', true,
        'avaliacao_id', p_avaliacao_id,
        'resposta', v_resposta
    );
end;
$$;

revoke all on function public.responder_avaliacao_loja(uuid, text) from public, anon;
grant execute on function public.responder_avaliacao_loja(uuid, text) to authenticated;

commit;
