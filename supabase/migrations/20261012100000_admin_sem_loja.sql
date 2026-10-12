-- =====================================================================
-- A CONTA DE ADMINISTRADOR NÃO TEM LOJA NEM PERFIL DE ANUNCIANTE
-- =====================================================================
-- O admin aprova e modera; ele não anuncia. No site, o botão "Perfil"
-- do admin vira "Painel ADM" e as páginas de loja e anúncio levam ao
-- painel. Aqui o banco garante a mesma regra: nenhuma loja ou perfil de
-- anunciante pode ser criado pela conta de administrador.
-- =====================================================================

create or replace function private.bloquear_loja_de_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is not null
     and public._usuario_e_admin(v_uid)
     and new.proprietario_id = v_uid then
    raise exception 'A conta de administrador não tem loja nem perfil de anunciante. Use outra conta para anunciar.';
  end if;
  return new;
end;
$$;

revoke all on function private.bloquear_loja_de_admin() from public, anon, authenticated;

create trigger trg_bloquear_loja_de_admin
before insert on public.lojas
for each row
execute function private.bloquear_loja_de_admin();
