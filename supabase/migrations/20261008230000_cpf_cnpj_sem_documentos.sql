-- Validação da loja só com CPF ou CNPJ digitado.
--
-- Pedido do grupo: sem envio de foto de documento e sem comprovante de
-- endereço. A loja informa apenas o CPF ou o CNPJ, que fica numa tabela
-- privada (só o dono da loja e o administrador leem). A tabela lojas é
-- pública para lojas aprovadas, por isso o número não fica lá.
--
-- A aprovação da loja deixa de exigir documentos. A tabela
-- documentos_loja e suas funções continuam no banco, sem uso, até a
-- limpeza depois da feira.

create table public.dados_fiscais_loja (
  loja_id uuid primary key references public.lojas (id) on delete cascade,
  tipo_pessoa text not null,
  numero text not null,
  atualizado_em timestamptz not null default now(),

  constraint dados_fiscais_tipo_check check (tipo_pessoa in ('cpf', 'cnpj')),
  constraint dados_fiscais_numero_check check (
    (tipo_pessoa = 'cpf' and numero ~ '^[0-9]{11}$')
    or (tipo_pessoa = 'cnpj' and numero ~ '^[0-9]{14}$')
  )
);

comment on table public.dados_fiscais_loja is
  'CPF ou CNPJ informado pela loja. Privado: só o dono e o administrador leem.';

alter table public.dados_fiscais_loja enable row level security;

create policy dados_fiscais_leitura_dono_ou_admin
  on public.dados_fiscais_loja
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.lojas l
      where l.id = dados_fiscais_loja.loja_id
        and l.proprietario_id = (select auth.uid())
    )
    or (select public.sou_admin())
  );

revoke all on table public.dados_fiscais_loja from anon, authenticated;
grant select on table public.dados_fiscais_loja to authenticated;

-- Aproveita o CPF/CNPJ que já tenha sido informado no fluxo antigo.
insert into public.dados_fiscais_loja (loja_id, tipo_pessoa, numero)
select distinct on (d.loja_id) d.loja_id, d.tipo_pessoa, d.numero_fiscal
from public.documentos_loja d
where d.tipo = 'documento_fiscal'
  and d.tipo_pessoa in ('cpf', 'cnpj')
  and d.numero_fiscal ~ '^[0-9]{11}$|^[0-9]{14}$'
order by d.loja_id, d.atualizado_em desc
on conflict (loja_id) do nothing;

-- O dono da loja salva ou corrige o próprio CPF/CNPJ.
create or replace function public.salvar_dados_fiscais_loja(
  p_tipo_pessoa text,
  p_numero text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_tipo text := lower(trim(coalesce(p_tipo_pessoa, '')));
  v_numero text := regexp_replace(coalesce(p_numero, ''), '\D', '', 'g');
  v_loja_id uuid;
begin
  if v_uid is null then
    raise exception 'Entre na sua conta.';
  end if;

  if v_tipo not in ('cpf', 'cnpj')
     or (v_tipo = 'cpf' and char_length(v_numero) <> 11)
     or (v_tipo = 'cnpj' and char_length(v_numero) <> 14)
     or v_numero ~ '^(\d)\1+$' then
    raise exception 'Informe um CPF com 11 números ou um CNPJ com 14 números.';
  end if;

  select l.id into v_loja_id
  from public.lojas l
  where l.proprietario_id = v_uid
    and l.tipo = 'loja'
  order by l.criado_em
  limit 1;

  if v_loja_id is null then
    raise exception 'Cadastre a loja antes de informar o CPF ou CNPJ.';
  end if;

  insert into public.dados_fiscais_loja (loja_id, tipo_pessoa, numero)
  values (v_loja_id, v_tipo, v_numero)
  on conflict (loja_id) do update
  set tipo_pessoa = excluded.tipo_pessoa,
      numero = excluded.numero,
      atualizado_em = now();

  return jsonb_build_object('loja_id', v_loja_id, 'tipo_pessoa', v_tipo);
end;
$$;

revoke all on function public.salvar_dados_fiscais_loja(text, text) from public, anon;
grant execute on function public.salvar_dados_fiscais_loja(text, text) to authenticated;

-- Mesma função de antes, sem a exigência de documentos aprovados.
create or replace function public.alterar_status_loja_admin(
  p_loja_id uuid,
  p_status text,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_loja public.lojas%rowtype;
  v_status_anterior text;
begin
  if v_uid is null or not public._usuario_e_admin(v_uid) then
    raise exception 'Acesso restrito a administradores.' using errcode = '42501';
  end if;
  if v_status not in ('pendente', 'aprovada', 'rejeitada', 'suspensa') then
    raise exception 'Status de loja inválido.' using errcode = '22023';
  end if;
  if v_status in ('rejeitada', 'suspensa') and v_motivo is null then
    raise exception 'Informe o motivo da rejeição ou suspensão.' using errcode = '22023';
  end if;
  if v_motivo is not null and char_length(v_motivo) > 500 then
    raise exception 'O motivo deve ter no máximo 500 caracteres.' using errcode = '22023';
  end if;

  select * into v_loja from public.lojas where id = p_loja_id for update;
  if not found then raise exception 'Loja não encontrada.' using errcode = '22023'; end if;

  v_status_anterior := v_loja.status_aprovacao;
  update public.lojas
  set status_aprovacao = v_status,
      ativa = (v_status = 'aprovada'),
      aprovado_em = case when v_status = 'aprovada' then now() else null end,
      aprovado_por = case when v_status = 'aprovada' then v_uid else null end,
      motivo_rejeicao = case when v_status in ('rejeitada', 'suspensa') then v_motivo else null end,
      atualizado_em = now()
  where id = p_loja_id returning * into v_loja;

  if v_status is distinct from v_status_anterior or v_motivo is not null then
    insert into public.historico_status_lojas (
      loja_id, status_anterior, status_novo, motivo, alterado_por
    ) values (p_loja_id, v_status_anterior, v_status, v_motivo, v_uid);
  end if;

  return jsonb_build_object(
    'id', v_loja.id,
    'nome', v_loja.nome,
    'status_aprovacao', v_loja.status_aprovacao,
    'ativa', v_loja.ativa,
    'motivo_rejeicao', v_loja.motivo_rejeicao,
    'aprovado_em', v_loja.aprovado_em
  );
end;
$function$;
