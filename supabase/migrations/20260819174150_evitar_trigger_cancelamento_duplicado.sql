-- Comércio da Cidade
-- Compatibilidade com bancos onde o trigger de cancelamento já foi criado manualmente.
-- Se existir mais de um trigger chamando proteger_cancelamento_pedido(),
-- remove apenas o trigger versionado por esta migration e mantém o trigger anterior.

begin;

do $$
declare
    v_total integer;
begin
    select count(*)
    into v_total
    from pg_trigger t
    where t.tgrelid = 'public.pedidos'::regclass
      and not t.tgisinternal
      and t.tgfoid = 'public.proteger_cancelamento_pedido()'::regprocedure;

    if v_total > 1 then
        execute 'drop trigger if exists trg_proteger_cancelamento_pedido on public.pedidos';
    end if;
end;
$$;

commit;
