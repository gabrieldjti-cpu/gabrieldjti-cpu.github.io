-- RF-22: mantém uma única conta administrativa principal (20260902002058).
-- A identidade atual é confirmada antes da aplicação desta migration; o
-- schema registra apenas a regra, sem versionar e-mail ou outro dado pessoal.

begin;

do $$
begin
  if (
    select count(*)
    from public.profiles perfil
    where perfil.tipo_usuario = 'admin'
  ) <> 1 then
    raise exception 'A proteção do administrador principal exige exatamente uma conta admin.';
  end if;
end;
$$;

create unique index if not exists profiles_admin_principal_unico_idx
  on public.profiles (tipo_usuario)
  where tipo_usuario = 'admin';

create or replace function private.proteger_admin_principal_unico()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.tipo_usuario = 'admin'
     and new.tipo_usuario is distinct from 'admin' then
    raise exception 'A conta administrativa principal não pode perder o papel de admin.';
  end if;

  if old.tipo_usuario is distinct from 'admin'
     and new.tipo_usuario = 'admin' then
    raise exception 'A conta administrativa principal é única e não pode ser substituída.';
  end if;

  return new;
end;
$$;

revoke all on function private.proteger_admin_principal_unico()
  from public, anon, authenticated, service_role;

drop trigger if exists proteger_admin_principal_unico
  on public.profiles;

create trigger proteger_admin_principal_unico
before update of tipo_usuario on public.profiles
for each row
when (old.tipo_usuario is distinct from new.tipo_usuario)
execute function private.proteger_admin_principal_unico();

comment on function private.proteger_admin_principal_unico() is
  'RF-22: impede promoção ou substituição da única conta administrativa principal.';

commit;
