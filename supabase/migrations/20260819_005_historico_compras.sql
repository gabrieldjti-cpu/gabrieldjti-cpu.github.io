-- Comércio da Cidade
-- RF-12 — Histórico de compras
-- Lista somente lojas que já possuem pedidos do cliente autenticado.

begin;

create or replace function public.listar_lojas_historico_cliente()
returns table(
    id uuid,
    nome text
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
    select distinct
        l.id,
        l.nome
    from public.pedidos p
    join public.lojas l
        on l.id = p.loja_id
    where p.cliente_id = v_uid
    order by l.nome;
end;
$$;

revoke all on function public.listar_lojas_historico_cliente()
    from public, anon;

grant execute on function public.listar_lojas_historico_cliente()
    to authenticated;

commit;
