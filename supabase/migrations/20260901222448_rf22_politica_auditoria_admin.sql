-- RF-22: explicita que o histórico administrativo não possui acesso direto (20260901222448).
-- A leitura continua disponível somente pela RPC que valida o administrador.

begin;

drop policy if exists "historico_admin_usuarios_sem_acesso_direto"
  on public.historico_admin_usuarios;

create policy "historico_admin_usuarios_sem_acesso_direto"
on public.historico_admin_usuarios
as restrictive
for all
to authenticated
using (false)
with check (false);

commit;
