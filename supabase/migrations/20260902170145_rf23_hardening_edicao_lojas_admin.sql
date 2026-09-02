-- RF-23: remove a RPC privilegiada do acesso direto de usuários autenticados (20260902170145).
-- A Edge Function valida o JWT e chama esta ponte somente com service_role.

begin;

create or replace function public.editar_loja_admin_service(
  p_admin_id uuid,
  p_loja_id uuid,
  p_nome text,
  p_categoria_id integer,
  p_descricao text,
  p_telefone text,
  p_whatsapp text,
  p_endereco text,
  p_cidade text,
  p_estado text,
  p_horario_abertura time,
  p_horario_fechamento time,
  p_taxa_entrega numeric,
  p_motivo text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_admin_id is null or not public._usuario_e_admin(p_admin_id) then
    raise exception 'Acesso restrito ao administrador principal.';
  end if;

  -- A função principal também valida esse ID contra private.admin_principal.
  perform set_config('request.jwt.claim.sub', p_admin_id::text, true);

  return public.editar_loja_admin(
    p_loja_id,
    p_nome,
    p_categoria_id,
    p_descricao,
    p_telefone,
    p_whatsapp,
    p_endereco,
    p_cidade,
    p_estado,
    p_horario_abertura,
    p_horario_fechamento,
    p_taxa_entrega,
    p_motivo
  );
end;
$$;

revoke all on function public.editar_loja_admin(
  uuid, text, integer, text, text, text, text, text, text, time, time, numeric, text
) from public, anon, authenticated, service_role;

revoke all on function public.editar_loja_admin_service(
  uuid, uuid, text, integer, text, text, text, text, text, text, time, time, numeric, text
) from public, anon, authenticated, service_role;

grant execute on function public.editar_loja_admin(
  uuid, text, integer, text, text, text, text, text, text, time, time, numeric, text
) to service_role;

grant execute on function public.editar_loja_admin_service(
  uuid, uuid, text, integer, text, text, text, text, text, text, time, time, numeric, text
) to service_role;

comment on function public.editar_loja_admin_service(
  uuid, uuid, text, integer, text, text, text, text, text, text, time, time, numeric, text
) is 'RF-23: ponte interna SECURITY INVOKER chamada apenas pela Edge Function admin-lojas.';

commit;
