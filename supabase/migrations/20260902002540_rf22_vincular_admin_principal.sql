-- RF-22: vincula o papel administrativo à conta principal já validada (20260902002540).
-- A migration captura o ID da única conta admin existente, sem persistir e-mail
-- ou outro dado pessoal no histórico do schema.

begin;

create table if not exists private.admin_principal (
  singleton boolean primary key default true check (singleton),
  usuario_id uuid not null unique references auth.users (id) on delete restrict
);

insert into private.admin_principal (singleton, usuario_id)
select true, perfil.id
from public.profiles perfil
where perfil.tipo_usuario = 'admin'
on conflict (singleton) do nothing;

do $$
begin
  if (
    select count(*)
    from private.admin_principal principal
    join public.profiles perfil on perfil.id = principal.usuario_id
    where principal.singleton
      and perfil.tipo_usuario = 'admin'
  ) <> 1 then
    raise exception 'Não foi possível vincular a conta administrativa principal.';
  end if;
end;
$$;

revoke all on table private.admin_principal
  from public, anon, authenticated, service_role;

create or replace function private.proteger_identidade_admin_principal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  admin_principal_id uuid;
begin
  select principal.usuario_id
    into strict admin_principal_id
  from private.admin_principal principal
  where principal.singleton;

  if tg_op = 'DELETE' then
    if old.id = admin_principal_id then
      raise exception 'A conta administrativa principal não pode ser excluída.';
    end if;

    return old;
  end if;

  if new.id = admin_principal_id
     and new.tipo_usuario is distinct from 'admin' then
    raise exception 'A conta administrativa principal não pode perder o papel de admin.';
  end if;

  if new.id is distinct from admin_principal_id
     and new.tipo_usuario = 'admin' then
    raise exception 'Somente a conta administrativa principal pode ter o papel de admin.';
  end if;

  return new;
end;
$$;

revoke all on function private.proteger_identidade_admin_principal()
  from public, anon, authenticated, service_role;

drop trigger if exists proteger_admin_principal_unico
  on public.profiles;

drop trigger if exists proteger_identidade_admin_principal
  on public.profiles;

create trigger proteger_identidade_admin_principal
before insert or update or delete on public.profiles
for each row
execute function private.proteger_identidade_admin_principal();

comment on table private.admin_principal is
  'RF-22: referência privada e imutável da única conta administrativa principal.';

comment on function private.proteger_identidade_admin_principal() is
  'RF-22: permite o papel admin somente para a conta principal vinculada.';

commit;
