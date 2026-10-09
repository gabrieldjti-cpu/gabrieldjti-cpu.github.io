-- Permite o banco ficar temporariamente sem admin principal.
--
-- A função anterior usava "select ... into strict" e falhava quando
-- private.admin_principal estava vazia, travando qualquer cadastro de
-- conta. Isso acontece depois de uma limpeza geral dos dados, até a
-- nova conta de admin ser definida.
--
-- Sem admin principal definido:
--   * cadastros e alterações comuns de perfil continuam funcionando;
--   * ninguém recebe o papel de admin pelo site (só por SQL direto,
--     sem JWT, como na criação do admin principal).
-- Com admin principal definido, as regras são as mesmas de antes.

create or replace function private.proteger_identidade_admin_principal()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  admin_principal_id uuid;
begin
  select principal.usuario_id
    into admin_principal_id
  from private.admin_principal principal
  where principal.singleton;

  if tg_op = 'DELETE' then
    if admin_principal_id is not null and old.id = admin_principal_id then
      raise exception 'A conta administrativa principal não pode ser excluída.';
    end if;

    return old;
  end if;

  if admin_principal_id is not null
     and new.id = admin_principal_id
     and new.tipo_usuario is distinct from 'admin' then
    raise exception 'A conta administrativa principal não pode perder o papel de admin.';
  end if;

  if new.id is distinct from admin_principal_id
     and new.tipo_usuario = 'admin' then
    raise exception 'Somente a conta administrativa principal pode ter o papel de admin.';
  end if;

  return new;
end;
$function$;
