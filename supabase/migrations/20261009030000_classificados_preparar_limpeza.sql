-- =====================================================================
-- ETAPA 12 (parte 1): DESLIGAR O QUE AINDA DEPENDIA DE PEDIDOS
-- =====================================================================
-- Antes de apagar as tabelas de compra, as funções que o site ainda usa
-- deixam de ler pedidos e avaliações antigas:
--   * resumo e listas do admin contam vendas confirmadas (vendas_anuncio);
--   * a denúncia de conteúdo fica só para anúncios (avaliação de vendedor
--     tem a própria denúncia);
--   * o registro de movimentação de estoque é desligado.
-- A parte 2 (20261009040000) apaga tabelas e funções de compra.
-- =====================================================================

create or replace function public.registrar_movimentacao_estoque()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.resumo_admin()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
    v_uid uuid := auth.uid();
begin
    if v_uid is null or not public._usuario_e_admin(v_uid) then
        raise exception 'Acesso restrito a administradores.';
    end if;

    return jsonb_build_object(
        'usuarios_ativos', (select count(*) from public.profiles where ativo = true),
        'lojas_total', (select count(*) from public.lojas),
        'lojas_pendentes', (select count(*) from public.lojas where status_aprovacao = 'pendente'),
        'lojas_aprovadas', (select count(*) from public.lojas where status_aprovacao = 'aprovada'),
        'lojas_rejeitadas', (select count(*) from public.lojas where status_aprovacao = 'rejeitada'),
        'lojas_suspensas', (select count(*) from public.lojas where status_aprovacao = 'suspensa'),
        -- Classificados: "pedidos_total" agora conta vendas confirmadas.
        'pedidos_total', (select count(*) from public.vendas_anuncio),
        'vendas_total', (select count(*) from public.vendas_anuncio),
        'anuncios_no_ar', (select count(*) from public.produtos p where p.ativo and p.status_aprovacao = 'aprovado' and (p.vence_em is null or p.vence_em > now()))
    );
end;
$function$;

CREATE OR REPLACE FUNCTION public.listar_lojas_admin(p_status text DEFAULT NULL::text, p_busca text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
          -- Classificados: vendas confirmadas da loja.
          select count(*)
          from public.vendas_anuncio venda
          where venda.loja_id = loja.id
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
$function$;

CREATE OR REPLACE FUNCTION private.listar_usuarios_admin_core(p_busca text, p_papel text, p_status text, p_ordenacao text, p_limite integer, p_offset integer)
 RETURNS TABLE(usuario_id uuid, nome text, email text, tipo_usuario text, status_conta text, ativo boolean, excluido_em timestamp with time zone, email_confirmado boolean, ultimo_acesso timestamp with time zone, criado_em timestamp with time zone, total_pedidos bigint, total_compras numeric, total_lojas bigint, total_registros bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_admin_id uuid := (select auth.uid());
  v_busca text := public.normalizar_texto_busca(
    pg_catalog.left(pg_catalog.btrim(coalesce(p_busca, '')), 100)
  );
  v_papel text := case
    when p_papel in ('cliente', 'lojista', 'admin') then p_papel
    else ''
  end;
  v_status text := case
    when p_status in ('ativo', 'bloqueado', 'excluido') then p_status
    else ''
  end;
  v_ordenacao text := case
    when p_ordenacao in ('recentes', 'antigos', 'nome', 'ultimo_acesso')
      then p_ordenacao
    else 'recentes'
  end;
  v_limite integer := greatest(
    1,
    least(coalesce(p_limite, 12), 50)
  );
  v_offset integer := greatest(0, coalesce(p_offset, 0));
begin
  if v_admin_id is null
     or not public._usuario_e_admin(v_admin_id) then
    raise exception 'Acesso restrito a administradores.' using errcode = '42501';
  end if;

  return query
  -- Classificados: total_pedidos = compras confirmadas (vendas em que a
  -- pessoa foi a compradora); total_compras = anúncios ativos da pessoa.
  with pedidos_resumo as (
    select
      venda.comprador_id as cliente_id,
      count(*)::bigint as quantidade_pedidos,
      0::numeric(14, 2) as valor_compras
    from public.vendas_anuncio venda
    group by venda.comprador_id
  ),
  anuncios_resumo as (
    select
      loja.proprietario_id,
      count(*)::numeric(14, 2) as quantidade_anuncios
    from public.produtos produto
    join public.lojas loja on loja.id = produto.loja_id
    where produto.ativo
    group by loja.proprietario_id
  ),
  lojas_resumo as (
    select
      loja.proprietario_id,
      count(*)::bigint as quantidade_lojas
    from public.lojas loja
    group by loja.proprietario_id
  ),
  base as (
    select
      perfil.id,
      coalesce(nullif(pg_catalog.btrim(perfil.nome), ''), 'Usuário sem nome') as nome_exibicao,
      usuario.email,
      perfil.tipo_usuario,
      case
        when perfil.excluido_em is not null or usuario.deleted_at is not null
          then 'excluido'
        when perfil.ativo is not true
          or usuario.banned_until > pg_catalog.now()
          then 'bloqueado'
        else 'ativo'
      end as situacao,
      perfil.ativo,
      perfil.excluido_em,
      usuario.email_confirmed_at is not null as confirmado,
      usuario.last_sign_in_at,
      coalesce(perfil.criado_em, usuario.created_at) as data_criacao,
      coalesce(pedidos.quantidade_pedidos, 0)::bigint as quantidade_pedidos,
      coalesce(anuncios.quantidade_anuncios, 0)::numeric(14, 2) as valor_compras,
      coalesce(lojas.quantidade_lojas, 0)::bigint as quantidade_lojas,
      public.normalizar_texto_busca(
        coalesce(nullif(pg_catalog.btrim(perfil.nome), ''), 'Usuário sem nome')
      ) as nome_normalizado,
      public.normalizar_texto_busca(coalesce(usuario.email, '')) as email_normalizado
    from public.profiles perfil
    join auth.users usuario
      on usuario.id = perfil.id
    left join pedidos_resumo pedidos
      on pedidos.cliente_id = perfil.id
    left join lojas_resumo lojas
      on lojas.proprietario_id = perfil.id
    left join anuncios_resumo anuncios
      on anuncios.proprietario_id = perfil.id
  ),
  filtrados as (
    select base.*
    from base
    where (v_papel = '' or base.tipo_usuario = v_papel)
      and (v_status = '' or base.situacao = v_status)
      and (
        v_busca = ''
        or base.nome_normalizado like ('%' || v_busca || '%')
        or base.email_normalizado like ('%' || v_busca || '%')
      )
  )
  select
    filtrado.id,
    filtrado.nome_exibicao::text,
    filtrado.email::text,
    filtrado.tipo_usuario::text,
    filtrado.situacao::text,
    filtrado.ativo,
    filtrado.excluido_em,
    filtrado.confirmado,
    filtrado.last_sign_in_at,
    filtrado.data_criacao,
    filtrado.quantidade_pedidos,
    filtrado.valor_compras,
    filtrado.quantidade_lojas,
    count(*) over()::bigint
  from filtrados filtrado
  order by
    case when v_ordenacao = 'nome'
      then filtrado.nome_normalizado end asc nulls last,
    case when v_ordenacao = 'antigos'
      then filtrado.data_criacao end asc nulls last,
    case when v_ordenacao = 'ultimo_acesso'
      then filtrado.last_sign_in_at end desc nulls last,
    case when v_ordenacao = 'recentes'
      then filtrado.data_criacao end desc nulls last,
    filtrado.data_criacao desc nulls last,
    filtrado.id
  limit v_limite
  offset v_offset;
end;
$function$;

CREATE OR REPLACE FUNCTION private.criar_denuncia_conteudo_core(p_tipo_conteudo text, p_conteudo_id uuid, p_motivo text, p_detalhes text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_tipo text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_tipo_conteudo, '')));
  v_motivo text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_motivo, '')));
  v_detalhes text := nullif(
    pg_catalog.btrim(pg_catalog.left(coalesce(p_detalhes, ''), 1001)),
    ''
  );
  v_perfil record;
  v_alvo record;
  v_denuncia_id uuid;
  v_produto_id uuid;
  v_avaliacao_id uuid;
  v_admin_id uuid;
  v_titulo text;
  v_resumo text;
  v_motivos_produto text[] := array[
    'conteudo_improprio',
    'categoria_incorreta',
    'preco_abusivo',
    'produto_proibido',
    'outro'
  ];
  v_motivos_avaliacao text[] := array[
    'spam',
    'ofensa',
    'conteudo_falso',
    'outro'
  ];
begin
  if v_uid is null then
    raise exception 'Entre na sua conta para enviar uma denúncia.' using errcode = '42501';
  end if;

  select
    perfil.nome,
    perfil.ativo,
    perfil.excluido_em
  into v_perfil
  from public.profiles perfil
  where perfil.id = v_uid;

  if not found
     or v_perfil.ativo is not true
     or v_perfil.excluido_em is not null then
    raise exception 'Sua conta não está disponível para enviar denúncias.' using errcode = '42501';
  end if;

  if v_tipo = 'avaliacao' then
    raise exception 'Para denunciar uma avaliação, use o botão Denunciar na própria avaliação.' using errcode = '22023';
  end if;

  if p_conteudo_id is null or v_tipo <> 'produto' then
    raise exception 'Conteúdo inválido para denúncia.' using errcode = '22023';
  end if;

  if (v_tipo = 'produto' and not v_motivo = any(v_motivos_produto))
     or (v_tipo = 'avaliacao' and not v_motivo = any(v_motivos_avaliacao)) then
    raise exception 'Selecione um motivo válido para a denúncia.' using errcode = '22023';
  end if;

  if v_detalhes is not null and char_length(v_detalhes) < 5 then
    raise exception 'Os detalhes devem ter pelo menos 5 caracteres.' using errcode = '22023';
  end if;

  if v_detalhes is not null and char_length(v_detalhes) > 1000 then
    raise exception 'Os detalhes devem ter no máximo 1000 caracteres.' using errcode = '22023';
  end if;

  if v_motivo = 'outro'
     and (v_detalhes is null or char_length(v_detalhes) < 10) then
    raise exception 'Descreva o motivo da denúncia com pelo menos 10 caracteres.' using errcode = '22023';
  end if;

  if (
    select count(*)
    from public.denuncias_conteudo denuncia
    where denuncia.denunciante_id = v_uid
      and denuncia.criado_em >= pg_catalog.now() - interval '24 hours'
  ) >= 10 then
    raise exception 'Você atingiu o limite de 10 denúncias em 24 horas. Tente novamente mais tarde.' using errcode = '54000';
  end if;

  if v_tipo = 'produto' then
    select
      produto.id as produto_id,
      produto.nome::text as produto_nome,
      produto.descricao::text as produto_descricao,
      loja.id as loja_id,
      loja.nome::text as loja_nome,
      loja.proprietario_id
    into v_alvo
    from public.produtos produto
    join public.lojas loja on loja.id = produto.loja_id
    where produto.id = p_conteudo_id
      and produto.ativo is true
      and produto.moderado_em is null
      and loja.ativa is true
      and loja.status_aprovacao = 'aprovada';

    if not found then
      raise exception 'Este produto não está disponível para denúncia.' using errcode = '22023';
    end if;

    if v_alvo.proprietario_id = v_uid then
      raise exception 'Você não pode denunciar um produto da própria loja.' using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.denuncias_conteudo denuncia
      where denuncia.denunciante_id = v_uid
        and denuncia.produto_id = v_alvo.produto_id
        and denuncia.tipo_conteudo = 'produto'
        and denuncia.status = 'pendente'
    ) then
      raise exception 'Você já enviou uma denúncia pendente para este produto.' using errcode = '23505';
    end if;

    v_produto_id := v_alvo.produto_id;
    v_titulo := pg_catalog.left(v_alvo.produto_nome, 180);
    v_resumo := nullif(pg_catalog.left(coalesce(v_alvo.produto_descricao, ''), 1200), '');
  end if;

  insert into public.denuncias_conteudo (
    denunciante_id,
    denunciante_nome,
    tipo_conteudo,
    produto_id,
    avaliacao_id,
    loja_id,
    loja_nome,
    conteudo_titulo,
    conteudo_resumo,
    motivo,
    detalhes
  ) values (
    v_uid,
    pg_catalog.left(
      coalesce(nullif(pg_catalog.btrim(v_perfil.nome), ''), 'Usuário'),
      120
    ),
    v_tipo,
    v_produto_id,
    v_avaliacao_id,
    v_alvo.loja_id,
    pg_catalog.left(v_alvo.loja_nome, 120),
    v_titulo,
    v_resumo,
    v_motivo,
    v_detalhes
  )
  returning id into v_denuncia_id;

  insert into public.historico_moderacao (
    denuncia_id,
    status_anterior,
    status_novo,
    acao,
    motivo,
    alterado_por,
    alterado_por_nome
  ) values (
    v_denuncia_id,
    null,
    'pendente',
    'denuncia_criada',
    coalesce(v_detalhes, 'Denúncia enviada para análise administrativa.'),
    v_uid,
    pg_catalog.left(
      coalesce(nullif(pg_catalog.btrim(v_perfil.nome), ''), 'Usuário'),
      120
    )
  );

  select admin.usuario_id
    into v_admin_id
  from private.admin_principal admin
  where admin.singleton is true;

  perform private.salvar_notificacao(
    v_admin_id,
    'moderacao_nova',
    'Nova denúncia para analisar',
    pg_catalog.format('%s recebeu uma denúncia de %s.', v_titulo, replace(v_motivo, '_', ' ')),
    pg_catalog.format('admin-moderacao.html?denuncia=%s', v_denuncia_id),
    pg_catalog.jsonb_build_object(
      'denuncia_id', v_denuncia_id,
      'tipo_conteudo', v_tipo,
      'produto_id', v_produto_id,
      'avaliacao_id', v_avaliacao_id
    ),
    pg_catalog.format('moderacao:%s:nova', v_denuncia_id),
    false
  );

  return pg_catalog.jsonb_build_object(
    'sucesso', true,
    'denuncia_id', v_denuncia_id,
    'status', 'pendente'
  );
exception
  when unique_violation then
    raise exception 'Você já enviou uma denúncia pendente para este conteúdo.' using errcode = '23505';
end;
$function$;

CREATE OR REPLACE FUNCTION private.resolver_denuncia_conteudo_core(p_denuncia_id uuid, p_decisao text, p_justificativa text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_decisao text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_decisao, '')));
  v_justificativa text := pg_catalog.btrim(
    pg_catalog.left(coalesce(p_justificativa, ''), 501)
  );
  v_denuncia public.denuncias_conteudo%rowtype;
  v_admin_nome text;
  v_conteudo_autor uuid;
  v_conteudo_ativo boolean := false;
  v_ocultado boolean := false;
  v_acao text;
begin
  if v_uid is null or not public._usuario_e_admin(v_uid) then
    raise exception 'Acesso restrito a administradores.' using errcode = '42501';
  end if;

  if p_denuncia_id is null or v_decisao not in ('procedente', 'improcedente') then
    raise exception 'Decisão de moderação inválida.' using errcode = '22023';
  end if;

  if char_length(v_justificativa) < 5 then
    raise exception 'Informe uma justificativa com pelo menos 5 caracteres.' using errcode = '22023';
  end if;

  if char_length(v_justificativa) > 500 then
    raise exception 'A justificativa deve ter no máximo 500 caracteres.' using errcode = '22023';
  end if;

  select denuncia.*
    into v_denuncia
  from public.denuncias_conteudo denuncia
  where denuncia.id = p_denuncia_id
  for update;

  if not found then
    raise exception 'Denúncia não encontrada.' using errcode = '22023';
  end if;

  if v_denuncia.status <> 'pendente' then
    raise exception 'Esta denúncia já foi analisada.' using errcode = '22023';
  end if;

  select pg_catalog.left(
    coalesce(nullif(pg_catalog.btrim(perfil.nome), ''), 'Administrador'),
    120
  )
  into v_admin_nome
  from public.profiles perfil
  where perfil.id = v_uid;

  v_admin_nome := coalesce(v_admin_nome, 'Administrador');

  if v_decisao = 'procedente' then
    if v_denuncia.tipo_conteudo = 'produto' then
      select produto.ativo, loja.proprietario_id
        into v_conteudo_ativo, v_conteudo_autor
      from public.produtos produto
      join public.lojas loja on loja.id = produto.loja_id
      where produto.id = v_denuncia.produto_id
      for update of produto;

      if not found then
        raise exception 'O produto denunciado não foi encontrado.' using errcode = '22023';
      end if;

      update public.produtos
      set ativo = false,
          moderado_em = pg_catalog.now(),
          moderado_por = v_uid,
          motivo_moderacao = v_justificativa
      where id = v_denuncia.produto_id;
    else
      -- Denúncias antigas de avaliação de pedido: o conteúdo não existe mais.
      v_conteudo_ativo := false;
      v_conteudo_autor := null;
    end if;

    v_ocultado := coalesce(v_conteudo_ativo, false);
    v_acao := case when v_ocultado
      then 'conteudo_ocultado'
      else 'violacao_confirmada'
    end;
  else
    v_acao := 'denuncia_arquivada';
  end if;

  update public.denuncias_conteudo
  set status = v_decisao,
      analisado_por = v_uid,
      analisado_por_nome = v_admin_nome,
      justificativa_admin = v_justificativa,
      conteudo_ocultado = v_ocultado,
      atualizado_em = pg_catalog.now(),
      analisado_em = pg_catalog.now()
  where id = v_denuncia.id;

  insert into public.historico_moderacao (
    denuncia_id,
    status_anterior,
    status_novo,
    acao,
    motivo,
    alterado_por,
    alterado_por_nome
  ) values (
    v_denuncia.id,
    'pendente',
    v_decisao,
    v_acao,
    v_justificativa,
    v_uid,
    v_admin_nome
  );

  perform private.salvar_notificacao(
    v_denuncia.denunciante_id,
    'moderacao_resolvida',
    case v_decisao
      when 'procedente' then 'Denúncia confirmada'
      else 'Denúncia analisada'
    end,
    case v_decisao
      when 'procedente' then pg_catalog.format(
        'A denúncia sobre %s foi confirmada e o conteúdo foi moderado.',
        v_denuncia.conteudo_titulo
      )
      else pg_catalog.format(
        'A denúncia sobre %s foi analisada e não foi confirmada.',
        v_denuncia.conteudo_titulo
      )
    end,
    'notificacoes.html',
    pg_catalog.jsonb_build_object(
      'denuncia_id', v_denuncia.id,
      'status', v_decisao,
      'tipo_conteudo', v_denuncia.tipo_conteudo
    ),
    pg_catalog.format('moderacao:%s:resolvida', v_denuncia.id),
    false
  );

  if v_decisao = 'procedente' and v_conteudo_autor is not null then
    perform private.salvar_notificacao(
      v_conteudo_autor,
      'conteudo_moderado',
      case v_denuncia.tipo_conteudo
        when 'produto' then 'Produto ocultado pela moderação'
        else 'Avaliação ocultada pela moderação'
      end,
      pg_catalog.format(
        '%s foi ocultado após análise administrativa. Motivo: %s',
        v_denuncia.conteudo_titulo,
        v_justificativa
      ),
      case v_denuncia.tipo_conteudo
        when 'produto' then 'produtos.html'
        else 'notificacoes.html'
      end,
      pg_catalog.jsonb_build_object(
        'denuncia_id', v_denuncia.id,
        'produto_id', v_denuncia.produto_id,
        'avaliacao_id', v_denuncia.avaliacao_id
      ),
      pg_catalog.format('moderacao:%s:conteudo', v_denuncia.id),
      false
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'sucesso', true,
    'denuncia_id', v_denuncia.id,
    'status', v_decisao,
    'conteudo_ocultado', v_ocultado
  );
end;
$function$;

CREATE OR REPLACE FUNCTION private.listar_denuncias_admin_core(p_status text, p_tipo text, p_busca text, p_limite integer, p_offset integer, p_denuncia_id uuid)
 RETURNS TABLE(denuncia_id uuid, tipo_conteudo text, produto_id uuid, avaliacao_id uuid, conteudo_titulo text, conteudo_resumo text, loja_id uuid, loja_nome text, motivo text, detalhes text, status text, denunciante_nome text, criado_em timestamp with time zone, analisado_em timestamp with time zone, analisado_por_nome text, justificativa_admin text, conteudo_ocultado boolean, conteudo_ativo boolean, total_registros bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_status text := case
    when p_status in ('pendente', 'procedente', 'improcedente') then p_status
    else ''
  end;
  v_tipo text := case
    when p_tipo in ('produto', 'avaliacao') then p_tipo
    else ''
  end;
  v_busca text := public.normalizar_texto_busca(
    pg_catalog.left(pg_catalog.btrim(coalesce(p_busca, '')), 100)
  );
  v_limite integer := greatest(1, least(coalesce(p_limite, 12), 50));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
begin
  if v_uid is null or not public._usuario_e_admin(v_uid) then
    raise exception 'Acesso restrito a administradores.' using errcode = '42501';
  end if;

  return query
  with base as (
    select
      denuncia.*,
      case
        when denuncia.tipo_conteudo = 'produto'
          then coalesce(produto.ativo, false) and produto.moderado_em is null
        else false
      end as alvo_ativo,
      public.normalizar_texto_busca(
        pg_catalog.concat_ws(
          ' ',
          denuncia.conteudo_titulo,
          denuncia.conteudo_resumo,
          denuncia.loja_nome,
          denuncia.denunciante_nome,
          denuncia.motivo,
          denuncia.detalhes
        )
      ) as texto_busca
    from public.denuncias_conteudo denuncia
    left join public.produtos produto on produto.id = denuncia.produto_id
  ),
  filtradas as (
    select base.*
    from base
    where (p_denuncia_id is null or base.id = p_denuncia_id)
      and (v_status = '' or base.status = v_status)
      and (v_tipo = '' or base.tipo_conteudo = v_tipo)
      and (v_busca = '' or base.texto_busca like ('%' || v_busca || '%'))
  )
  select
    filtrada.id,
    filtrada.tipo_conteudo,
    filtrada.produto_id,
    filtrada.avaliacao_id,
    filtrada.conteudo_titulo,
    filtrada.conteudo_resumo,
    filtrada.loja_id,
    filtrada.loja_nome,
    filtrada.motivo,
    filtrada.detalhes,
    filtrada.status,
    filtrada.denunciante_nome,
    filtrada.criado_em,
    filtrada.analisado_em,
    filtrada.analisado_por_nome,
    filtrada.justificativa_admin,
    filtrada.conteudo_ocultado,
    filtrada.alvo_ativo,
    count(*) over()::bigint
  from filtradas filtrada
  order by
    case when filtrada.status = 'pendente' then 0 else 1 end,
    filtrada.criado_em desc,
    filtrada.id
  limit v_limite
  offset v_offset;
end;
$function$;
