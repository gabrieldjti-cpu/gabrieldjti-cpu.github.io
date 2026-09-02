-- RF-23: edição administrativa segura dos dados da loja com auditoria (20260902165653).

begin;

alter table public.historico_status_lojas
  add column if not exists tipo_evento text not null default 'status',
  add column if not exists campos_alterados text[] not null default '{}'::text[];

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'historico_status_lojas_tipo_evento_check'
      and conrelid = 'public.historico_status_lojas'::regclass
  ) then
    alter table public.historico_status_lojas
      add constraint historico_status_lojas_tipo_evento_check
      check (tipo_evento in ('status', 'edicao'));
  end if;
end;
$$;

comment on column public.historico_status_lojas.tipo_evento is
  'Diferencia mudanças de status de edições administrativas dos dados da loja.';

comment on column public.historico_status_lojas.campos_alterados is
  'Nomes dos campos modificados, sem armazenar cópias desnecessárias dos dados da loja.';

create or replace function public.listar_lojas_admin(
  p_status text default null,
  p_busca text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_status text := nullif(trim(coalesce(p_status, '')), '');
  v_busca text := nullif(trim(coalesce(p_busca, '')), '');
begin
  if v_uid is null or not exists (
    select 1
    from private.admin_principal principal
    where principal.singleton
      and principal.usuario_id = v_uid
  ) then
    raise exception 'Acesso restrito ao administrador principal.';
  end if;

  if v_status is not null
     and v_status not in ('pendente', 'aprovada', 'rejeitada', 'suspensa') then
    raise exception 'Status de loja inválido.';
  end if;

  return coalesce((
    select jsonb_agg(item order by item->>'criado_em' desc)
    from (
      select jsonb_build_object(
        'id', loja.id,
        'nome', loja.nome,
        'descricao', loja.descricao,
        'telefone', loja.telefone,
        'whatsapp', loja.whatsapp,
        'endereco', loja.endereco,
        'cidade', loja.cidade,
        'estado', loja.estado,
        'horario_abertura', loja.horario_abertura,
        'horario_fechamento', loja.horario_fechamento,
        'taxa_entrega', loja.taxa_entrega,
        'logo_url', loja.logo_url,
        'ativa', loja.ativa,
        'status_aprovacao', loja.status_aprovacao,
        'motivo_rejeicao', loja.motivo_rejeicao,
        'aprovado_em', loja.aprovado_em,
        'aprovado_por', loja.aprovado_por,
        'criado_em', coalesce(loja.criado_em, loja.created_at),
        'categoria_id', loja.categoria_id,
        'categoria', categoria.nome,
        'proprietario_id', loja.proprietario_id,
        'proprietario_nome', perfil.nome,
        'proprietario_telefone', perfil.telefone,
        'total_produtos', (
          select count(*)
          from public.produtos produto
          where produto.loja_id = loja.id
        ),
        'total_pedidos', (
          select count(*)
          from public.pedidos pedido
          where pedido.loja_id = loja.id
        )
      ) as item
      from public.lojas loja
      left join public.categorias categoria on categoria.id = loja.categoria_id
      left join public.profiles perfil on perfil.id = loja.proprietario_id
      where (v_status is null or loja.status_aprovacao = v_status)
        and (
          v_busca is null
          or loja.nome ilike '%' || v_busca || '%'
          or coalesce(loja.cidade, '') ilike '%' || v_busca || '%'
          or coalesce(perfil.nome, '') ilike '%' || v_busca || '%'
          or coalesce(categoria.nome, '') ilike '%' || v_busca || '%'
        )
    ) dados
  ), '[]'::jsonb);
end;
$$;

create or replace function public.listar_historico_loja_admin(p_loja_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists (
    select 1
    from private.admin_principal principal
    where principal.singleton
      and principal.usuario_id = v_uid
  ) then
    raise exception 'Acesso restrito ao administrador principal.';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', historico.id,
        'tipo_evento', historico.tipo_evento,
        'campos_alterados', historico.campos_alterados,
        'status_anterior', historico.status_anterior,
        'status_novo', historico.status_novo,
        'motivo', historico.motivo,
        'criado_em', historico.criado_em,
        'administrador_nome', perfil.nome
      )
      order by historico.criado_em desc
    )
    from public.historico_status_lojas historico
    left join public.profiles perfil on perfil.id = historico.alterado_por
    where historico.loja_id = p_loja_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.editar_loja_admin(
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
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_loja public.lojas%rowtype;
  v_nome text := trim(coalesce(p_nome, ''));
  v_descricao text := nullif(trim(coalesce(p_descricao, '')), '');
  v_telefone text := nullif(trim(coalesce(p_telefone, '')), '');
  v_whatsapp text := nullif(trim(coalesce(p_whatsapp, '')), '');
  v_endereco text := nullif(trim(coalesce(p_endereco, '')), '');
  v_cidade text := nullif(trim(coalesce(p_cidade, '')), '');
  v_estado text := upper(nullif(trim(coalesce(p_estado, '')), ''));
  v_taxa_entrega numeric := round(coalesce(p_taxa_entrega, 0), 2);
  v_motivo text := trim(coalesce(p_motivo, ''));
  v_categoria_nome text;
  v_campos text[] := '{}'::text[];
begin
  if v_uid is null or not exists (
    select 1
    from private.admin_principal principal
    where principal.singleton
      and principal.usuario_id = v_uid
  ) then
    raise exception 'Acesso restrito ao administrador principal.';
  end if;

  if p_loja_id is null then
    raise exception 'Loja inválida.';
  end if;

  if char_length(v_nome) < 3 or char_length(v_nome) > 100 then
    raise exception 'O nome da loja deve possuir entre 3 e 100 caracteres.';
  end if;

  if v_descricao is not null and char_length(v_descricao) > 1000 then
    raise exception 'A descrição deve ter no máximo 1.000 caracteres.';
  end if;

  if v_telefone is not null and (
    char_length(v_telefone) > 20
    or char_length(regexp_replace(v_telefone, '[^0-9]', '', 'g')) not between 10 and 13
  ) then
    raise exception 'Informe um telefone válido com DDD.';
  end if;

  if v_whatsapp is not null and (
    char_length(v_whatsapp) > 20
    or char_length(regexp_replace(v_whatsapp, '[^0-9]', '', 'g')) not between 10 and 13
  ) then
    raise exception 'Informe um WhatsApp válido com DDD.';
  end if;

  if v_endereco is not null and char_length(v_endereco) > 240 then
    raise exception 'O endereço deve ter no máximo 240 caracteres.';
  end if;

  if v_cidade is not null and (char_length(v_cidade) < 2 or char_length(v_cidade) > 100) then
    raise exception 'A cidade deve possuir entre 2 e 100 caracteres.';
  end if;

  if v_estado is not null and v_estado !~ '^[A-Z]{2}$' then
    raise exception 'O estado deve ser informado com duas letras.';
  end if;

  if (p_horario_abertura is null) <> (p_horario_fechamento is null) then
    raise exception 'Informe os horários de abertura e fechamento juntos.';
  end if;

  if v_taxa_entrega < 0 or v_taxa_entrega > 9999.99 then
    raise exception 'A taxa de entrega deve estar entre R$ 0,00 e R$ 9.999,99.';
  end if;

  if char_length(v_motivo) < 5 or char_length(v_motivo) > 500 then
    raise exception 'O motivo da edição deve possuir entre 5 e 500 caracteres.';
  end if;

  select categoria.nome
    into v_categoria_nome
  from public.categorias categoria
  where categoria.id = p_categoria_id
    and coalesce(categoria.ativa, true);

  if not found then
    raise exception 'Selecione uma categoria ativa.';
  end if;

  select *
    into v_loja
  from public.lojas loja
  where loja.id = p_loja_id
  for update;

  if not found then
    raise exception 'Loja não encontrada.';
  end if;

  if v_loja.nome is distinct from v_nome then
    v_campos := array_append(v_campos, 'Nome');
  end if;
  if v_loja.categoria_id is distinct from p_categoria_id then
    v_campos := array_append(v_campos, 'Categoria');
  end if;
  if v_loja.descricao is distinct from v_descricao then
    v_campos := array_append(v_campos, 'Descrição');
  end if;
  if v_loja.telefone is distinct from v_telefone then
    v_campos := array_append(v_campos, 'Telefone');
  end if;
  if v_loja.whatsapp is distinct from v_whatsapp then
    v_campos := array_append(v_campos, 'WhatsApp');
  end if;
  if v_loja.endereco is distinct from v_endereco then
    v_campos := array_append(v_campos, 'Endereço');
  end if;
  if v_loja.cidade is distinct from v_cidade then
    v_campos := array_append(v_campos, 'Cidade');
  end if;
  if v_loja.estado is distinct from v_estado then
    v_campos := array_append(v_campos, 'Estado');
  end if;
  if v_loja.horario_abertura is distinct from p_horario_abertura then
    v_campos := array_append(v_campos, 'Horário de abertura');
  end if;
  if v_loja.horario_fechamento is distinct from p_horario_fechamento then
    v_campos := array_append(v_campos, 'Horário de fechamento');
  end if;
  if v_loja.taxa_entrega is distinct from v_taxa_entrega then
    v_campos := array_append(v_campos, 'Taxa de entrega');
  end if;

  if cardinality(v_campos) = 0 then
    raise exception 'Nenhuma alteração foi identificada.';
  end if;

  update public.lojas
  set
    nome = v_nome,
    categoria_id = p_categoria_id,
    descricao = v_descricao,
    telefone = v_telefone,
    whatsapp = v_whatsapp,
    endereco = v_endereco,
    cidade = v_cidade,
    estado = v_estado,
    horario_abertura = p_horario_abertura,
    horario_fechamento = p_horario_fechamento,
    taxa_entrega = v_taxa_entrega,
    atualizado_em = now()
  where id = p_loja_id
  returning * into v_loja;

  insert into public.historico_status_lojas (
    loja_id,
    tipo_evento,
    campos_alterados,
    status_anterior,
    status_novo,
    motivo,
    alterado_por
  ) values (
    v_loja.id,
    'edicao',
    v_campos,
    v_loja.status_aprovacao,
    v_loja.status_aprovacao,
    v_motivo,
    v_uid
  );

  return jsonb_build_object(
    'id', v_loja.id,
    'nome', v_loja.nome,
    'categoria_id', v_loja.categoria_id,
    'categoria', v_categoria_nome,
    'campos_alterados', v_campos,
    'atualizado_em', v_loja.atualizado_em
  );
end;
$$;

revoke all on function public.listar_lojas_admin(text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.listar_historico_loja_admin(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.editar_loja_admin(
  uuid, text, integer, text, text, text, text, text, text, time, time, numeric, text
) from public, anon, authenticated, service_role;

grant execute on function public.listar_lojas_admin(text, text)
  to authenticated;
grant execute on function public.listar_historico_loja_admin(uuid)
  to authenticated;
grant execute on function public.editar_loja_admin(
  uuid, text, integer, text, text, text, text, text, text, time, time, numeric, text
) to authenticated;

commit;
