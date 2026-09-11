begin;

create or replace function public.enviar_documento_loja(
  p_loja_id uuid,
  p_documento_id uuid,
  p_tipo text,
  p_tipo_pessoa text,
  p_numero_fiscal text,
  p_arquivo_path text,
  p_nome_arquivo text,
  p_mime_type text,
  p_tamanho_bytes bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_documento public.documentos_loja%rowtype;
  v_admin_id uuid;
  v_numero text := regexp_replace(coalesce(p_numero_fiscal, ''), '[^0-9]', '', 'g');
begin
  if v_uid is null then
    raise exception 'Autenticação obrigatória.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.lojas loja
    where loja.id = p_loja_id and loja.proprietario_id = v_uid
  ) then
    raise exception 'Loja não encontrada ou sem permissão.' using errcode = '42501';
  end if;
  if p_tipo not in ('documento_fiscal', 'comprovante_endereco') then
    raise exception 'Tipo de documento inválido.' using errcode = '22023';
  end if;
  if p_mime_type not in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')
     or p_tamanho_bytes not between 1 and 10485760 then
    raise exception 'Arquivo inválido ou maior que 10 MB.' using errcode = '22023';
  end if;
  if p_arquivo_path !~ ('^' || v_uid::text || '/' || p_loja_id::text || '/[A-Za-z0-9._-]+$') then
    raise exception 'Caminho do arquivo inválido.' using errcode = '22023';
  end if;
  if p_tipo = 'documento_fiscal'
     and (p_tipo_pessoa not in ('cpf', 'cnpj')
          or (p_tipo_pessoa = 'cpf' and char_length(v_numero) <> 11)
          or (p_tipo_pessoa = 'cnpj' and char_length(v_numero) <> 14)) then
    raise exception 'CPF ou CNPJ inválido.' using errcode = '22023';
  end if;

  if p_documento_id is null then
    insert into public.documentos_loja (
      loja_id, tipo, tipo_pessoa, numero_fiscal, arquivo_path,
      nome_arquivo, mime_type, tamanho_bytes, status
    ) values (
      p_loja_id, p_tipo,
      case when p_tipo = 'documento_fiscal' then p_tipo_pessoa else null end,
      case when p_tipo = 'documento_fiscal' then v_numero else null end,
      p_arquivo_path, left(btrim(p_nome_arquivo), 255), p_mime_type, p_tamanho_bytes, 'pendente'
    ) returning * into v_documento;
  else
    update public.documentos_loja documento
    set tipo_pessoa = case when p_tipo = 'documento_fiscal' then p_tipo_pessoa else null end,
        numero_fiscal = case when p_tipo = 'documento_fiscal' then v_numero else null end,
        arquivo_path = p_arquivo_path,
        nome_arquivo = left(btrim(p_nome_arquivo), 255),
        mime_type = p_mime_type,
        tamanho_bytes = p_tamanho_bytes,
        status = 'pendente', motivo_rejeicao = null,
        analisado_por = null, analisado_em = null, atualizado_em = now()
    where documento.id = p_documento_id
      and documento.loja_id = p_loja_id
      and documento.tipo = p_tipo
      and documento.status = 'rejeitado'
    returning * into v_documento;
    if not found then
      raise exception 'Somente documentos rejeitados podem ser reenviados.' using errcode = '22023';
    end if;
  end if;

  select principal.usuario_id into v_admin_id
  from private.admin_principal principal where principal.singleton;
  perform private.salvar_notificacao(
    v_admin_id, 'loja_pendente', 'Documento aguardando nova análise',
    'Uma loja enviou ou reenviou um documento para validação.',
    'admin-dashboard.html',
    jsonb_build_object('loja_id', p_loja_id, 'documento_id', v_documento.id),
    format('documento:%s:reenviado:%s', v_documento.id, extract(epoch from v_documento.atualizado_em)::bigint),
    false
  );

  return jsonb_build_object('id', v_documento.id, 'status', v_documento.status);
end;
$$;

revoke all on function public.enviar_documento_loja(
  uuid, uuid, text, text, text, text, text, text, bigint
) from public, anon, authenticated;
grant execute on function public.enviar_documento_loja(
  uuid, uuid, text, text, text, text, text, text, bigint
) to authenticated;

commit;
