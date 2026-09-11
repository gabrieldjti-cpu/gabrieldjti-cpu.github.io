begin;

alter table public.lojas
  add column if not exists banner_url text;

create table if not exists public.documentos_loja (
  id uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas(id) on delete cascade,
  tipo text not null check (tipo in ('documento_fiscal', 'comprovante_endereco')),
  tipo_pessoa text check (tipo_pessoa is null or tipo_pessoa in ('cpf', 'cnpj')),
  numero_fiscal text,
  arquivo_path text not null,
  nome_arquivo text not null,
  mime_type text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  tamanho_bytes bigint not null check (tamanho_bytes between 1 and 10485760),
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'rejeitado')),
  motivo_rejeicao text check (motivo_rejeicao is null or char_length(btrim(motivo_rejeicao)) between 5 and 500),
  analisado_por uuid references public.profiles(id),
  analisado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (loja_id, tipo),
  constraint documentos_loja_fiscal_check check (
    (tipo = 'documento_fiscal' and tipo_pessoa is not null and numero_fiscal ~ '^[0-9]{11}([0-9]{3})?$')
    or (tipo = 'comprovante_endereco' and tipo_pessoa is null and numero_fiscal is null)
  )
);

comment on table public.documentos_loja is
  'Documentação privada para análise cadastral das lojas. Nunca expor no catálogo público.';

create index if not exists documentos_loja_loja_status_idx
  on public.documentos_loja (loja_id, status);
create index if not exists documentos_loja_analisado_por_idx
  on public.documentos_loja (analisado_por)
  where analisado_por is not null;

alter table public.documentos_loja enable row level security;

drop policy if exists documentos_loja_select_owner_admin on public.documentos_loja;
create policy documentos_loja_select_owner_admin
on public.documentos_loja for select to authenticated
using (
  exists (
    select 1 from public.lojas loja
    where loja.id = documentos_loja.loja_id
      and loja.proprietario_id = (select auth.uid())
  )
  or (select public._usuario_e_admin((select auth.uid())))
);

drop policy if exists documentos_loja_insert_owner on public.documentos_loja;
create policy documentos_loja_insert_owner
on public.documentos_loja for insert to authenticated
with check (
  status = 'pendente'
  and analisado_por is null
  and analisado_em is null
  and exists (
    select 1 from public.lojas loja
    where loja.id = documentos_loja.loja_id
      and loja.proprietario_id = (select auth.uid())
      and loja.status_aprovacao = 'pendente'
  )
);

revoke all on table public.documentos_loja from public, anon, authenticated;
grant select, insert on table public.documentos_loja to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documentos-lojas',
  'documentos-lojas',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('banners-lojas', 'banners-lojas', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists banners_lojas_insert_owner on storage.objects;
create policy banners_lojas_insert_owner on storage.objects for insert to authenticated
with check (bucket_id = 'banners-lojas' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists banners_lojas_delete_owner on storage.objects;
create policy banners_lojas_delete_owner on storage.objects for delete to authenticated
using (bucket_id = 'banners-lojas' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists documentos_lojas_insert_owner on storage.objects;
create policy documentos_lojas_insert_owner
on storage.objects for insert to authenticated
with check (
  bucket_id = 'documentos-lojas'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists documentos_lojas_select_owner_admin on storage.objects;
create policy documentos_lojas_select_owner_admin
on storage.objects for select to authenticated
using (
  bucket_id = 'documentos-lojas'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or (select public._usuario_e_admin((select auth.uid())))
  )
);

drop policy if exists documentos_lojas_delete_owner on storage.objects;
create policy documentos_lojas_delete_owner
on storage.objects for delete to authenticated
using (
  bucket_id = 'documentos-lojas'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create or replace function public.listar_documentos_loja_admin(p_loja_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not public._usuario_e_admin(v_uid) then
    raise exception 'Acesso restrito a administradores.' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', documento.id,
      'tipo', documento.tipo,
      'tipo_pessoa', documento.tipo_pessoa,
      'numero_fiscal', documento.numero_fiscal,
      'arquivo_path', documento.arquivo_path,
      'nome_arquivo', documento.nome_arquivo,
      'mime_type', documento.mime_type,
      'tamanho_bytes', documento.tamanho_bytes,
      'status', documento.status,
      'motivo_rejeicao', documento.motivo_rejeicao,
      'analisado_em', documento.analisado_em,
      'criado_em', documento.criado_em
    ) order by documento.tipo)
    from public.documentos_loja documento
    where documento.loja_id = p_loja_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.analisar_documento_loja_admin(
  p_documento_id uuid,
  p_status text,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
  v_documento public.documentos_loja%rowtype;
  v_proprietario_id uuid;
begin
  if v_uid is null or not public._usuario_e_admin(v_uid) then
    raise exception 'Acesso restrito a administradores.' using errcode = '42501';
  end if;
  if v_status not in ('aprovado', 'rejeitado') then
    raise exception 'Situação de documento inválida.' using errcode = '22023';
  end if;
  if v_status = 'rejeitado' and (v_motivo is null or char_length(v_motivo) < 5) then
    raise exception 'Informe um motivo com pelo menos 5 caracteres.' using errcode = '22023';
  end if;
  if v_motivo is not null and char_length(v_motivo) > 500 then
    raise exception 'O motivo deve ter no máximo 500 caracteres.' using errcode = '22023';
  end if;

  update public.documentos_loja
  set status = v_status,
      motivo_rejeicao = case when v_status = 'rejeitado' then v_motivo else null end,
      analisado_por = v_uid,
      analisado_em = now(),
      atualizado_em = now()
  where id = p_documento_id
  returning * into v_documento;

  if not found then
    raise exception 'Documento não encontrado.' using errcode = '22023';
  end if;

  select proprietario_id into v_proprietario_id
  from public.lojas where id = v_documento.loja_id;

  perform private.salvar_notificacao(
    v_proprietario_id,
    'loja_status',
    case when v_status = 'aprovado' then 'Documento aprovado' else 'Documento rejeitado' end,
    case
      when v_status = 'aprovado' then 'Um documento da sua loja foi aprovado pela administração.'
      else 'Um documento da sua loja foi rejeitado: ' || v_motivo
    end,
    'painel-loja.html',
    jsonb_build_object('loja_id', v_documento.loja_id, 'documento_id', v_documento.id, 'status', v_status),
    format('documento:%s:status:%s', v_documento.id, v_status),
    true
  );

  return jsonb_build_object('id', v_documento.id, 'status', v_documento.status);
end;
$$;

revoke all on function public.listar_documentos_loja_admin(uuid) from public, anon, authenticated;
revoke all on function public.analisar_documento_loja_admin(uuid, text, text) from public, anon, authenticated;
grant execute on function public.listar_documentos_loja_admin(uuid) to authenticated;
grant execute on function public.analisar_documento_loja_admin(uuid, text, text) to authenticated;

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

revoke all on function public.cancelar_cadastro_loja_incompleto(uuid) from public, anon, authenticated;
grant execute on function public.cancelar_cadastro_loja_incompleto(uuid) to authenticated;

create or replace function public.alterar_status_loja_admin(
  p_loja_id uuid,
  p_status text,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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

  if v_status = 'aprovada' and (
    select (count(*) <> 2 or count(*) filter (where status = 'aprovado') <> 2)
    from public.documentos_loja
    where loja_id = p_loja_id
      and tipo in ('documento_fiscal', 'comprovante_endereco')
  ) then
    raise exception 'Aprove o documento fiscal e o comprovante de endereço antes de aprovar a loja.' using errcode = '22023';
  end if;

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
$$;

revoke all on function public.alterar_status_loja_admin(uuid, text, text) from public, anon;
grant execute on function public.alterar_status_loja_admin(uuid, text, text) to authenticated;

commit;
