begin;

create or replace function public.cancelar_cadastro_loja_incompleto(p_loja_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Autenticação obrigatória.' using errcode = '42501';
  end if;

  delete from public.lojas loja
  where loja.id = p_loja_id
    and loja.proprietario_id = v_uid
    and loja.status_aprovacao = 'pendente'
    and not exists (
      select 1 from public.documentos_loja documento
      where documento.loja_id = loja.id
        and documento.status = 'aprovado'
    );

  return found;
end;
$$;

revoke all on function public.cancelar_cadastro_loja_incompleto(uuid)
  from public, anon, authenticated;
grant execute on function public.cancelar_cadastro_loja_incompleto(uuid)
  to authenticated;

commit;
