-- =====================================================================
-- MELHORIAS PARA A FEIRA
--  1. Destaque é benefício do assinante: anúncio de loja com assinatura
--     ativa sai como "destaque" e aparece primeiro no início e nas
--     categorias. A caixinha "Produto em destaque" sai dos formulários.
--  2. Nota dos cards = nota do vendedor (avaliações depois da venda),
--     não mais a nota de produto do modelo antigo. "Mais vendidos" vira
--     "relevância". total_vendido = vendas confirmadas do anúncio.
--  3. Aviso "seu anúncio sai do ar amanhã" para o plano grátis, junto
--     com os avisos de assinatura (verificar_avisos_assinatura).
-- =====================================================================

-- Loja com assinatura ativa (pode ser chamada por visitantes).
create or replace function public.loja_assinante(p_loja_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.lojas l
    cross join lateral private.situacao_assinatura(l.id) s
    where l.id = p_loja_id
      and l.tipo = 'loja'
      and s.situacao = 'ativa'
  );
$$;

revoke all on function public.loja_assinante(uuid) from public;
grant execute on function public.loja_assinante(uuid) to anon, authenticated;

-- Vendas confirmadas por anúncio (só a contagem, sem dados do comprador).
create or replace function public.total_vendas_anuncio(p_produto_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) from public.vendas_anuncio v where v.produto_id = p_produto_id;
$$;

revoke all on function public.total_vendas_anuncio(uuid) from public;
grant execute on function public.total_vendas_anuncio(uuid) to anon, authenticated;

create or replace function public.buscar_anuncios_publicos(
  p_termo text default ''::text,
  p_categoria_id integer default null::integer,
  p_loja_id uuid default null::uuid,
  p_categoria_loja_id integer default null::integer,
  p_disponibilidade text default null::text,
  p_preco_min numeric default null::numeric,
  p_preco_max numeric default null::numeric,
  p_avaliacao_min numeric default null::numeric,
  p_ordenacao text default 'relevancia'::text,
  p_limite integer default 12,
  p_offset integer default 0,
  p_condicao text default null::text
)
returns table(
  id uuid, loja_id uuid, categoria_id integer, nome text, descricao text,
  preco numeric, preco_promocional numeric, preco_atual numeric, estoque integer,
  imagem_url text, destaque boolean, created_at timestamp with time zone,
  categoria_produto_id integer, categoria_produto_nome text, loja_nome text,
  loja_cidade text, loja_logo_url text, loja_categoria_id integer,
  avaliacao_media numeric, total_avaliacoes integer, total_vendido bigint,
  relevancia real, condicao text, total_count bigint
)
language sql
stable
set search_path = ''
as $function$
  with parametros as (
    select
      pg_catalog.btrim(
        pg_catalog.regexp_replace(
          public.normalizar_texto_busca(
            pg_catalog.translate(pg_catalog.left(coalesce(p_termo, ''), 80), E'%_\\', '   ')
          ),
          '[[:space:]]+', ' ', 'g'
        )
      ) as termo,
      case
        when p_ordenacao in ('relevancia','destaques','nome','menor-preco','maior-preco','melhor-avaliados','recentes')
          then p_ordenacao
        else 'relevancia'
      end as ordenacao,
      case when p_preco_min is null then null
           else greatest(0::numeric, least(p_preco_min, 1000000::numeric)) end as preco_min,
      case when p_preco_max is null then null
           else greatest(0::numeric, least(p_preco_max, 1000000::numeric)) end as preco_max,
      case when p_avaliacao_min >= 1 and p_avaliacao_min <= 5 then p_avaliacao_min else null end as avaliacao_min,
      greatest(1, least(coalesce(p_limite, 12), 50)) as limite,
      greatest(0, coalesce(p_offset, 0)) as deslocamento
  ),
  consulta as (
    select x.*, pg_catalog.websearch_to_tsquery('pg_catalog.portuguese'::regconfig, x.termo) as tsquery
    from parametros x
  ),
  lojas_info as (
    select
      l.id,
      public.loja_assinante(l.id) as assinante,
      coalesce(av.media, 0)::numeric as avaliacao_media,
      coalesce(av.total, 0)::integer as total_avaliacoes
    from public.lojas l
    left join lateral public.resumo_avaliacoes_vendedor(l.id) av on true
    where l.ativa = true
      and l.status_aprovacao = 'aprovada'
  ),
  candidatos as (
    select
      p.id, p.loja_id, p.categoria_id, p.nome::text as nome, p.descricao,
      p.preco, p.preco_promocional,
      case when p.preco_promocional is not null and p.preco_promocional > 0 and p.preco_promocional < p.preco
           then p.preco_promocional else p.preco end as preco_atual,
      p.estoque, p.imagem_url,
      li.assinante as destaque,
      p.condicao,
      coalesce(p.created_at, p.criado_em) as created_at,
      cp.id as categoria_produto_id,
      case when categoria_pai.id is not null then categoria_pai.nome::text || ' › ' || cp.nome::text
           else cp.nome::text end as categoria_produto_nome,
      l.nome::text as loja_nome, l.cidade::text as loja_cidade,
      l.logo_url as loja_logo_url, l.categoria_id as loja_categoria_id,
      li.avaliacao_media, li.total_avaliacoes,
      p.busca_tsv,
      public.normalizar_texto_busca(p.nome) as nome_normalizado,
      public.normalizar_texto_busca(coalesce(p.descricao, '')) as descricao_normalizada,
      q.termo, q.ordenacao, q.limite, q.deslocamento, q.tsquery
    from public.produtos p
    join public.lojas l on l.id = p.loja_id
    join lojas_info li on li.id = l.id
    left join public.categorias_produtos cp on cp.id = p.categoria_id
    left join public.categorias_produtos categoria_pai on categoria_pai.id = cp.categoria_pai_id
    cross join consulta q
    where p.ativo = true
      and (p_categoria_id is null or p.categoria_id = p_categoria_id or cp.categoria_pai_id = p_categoria_id)
      and (p_loja_id is null or p.loja_id = p_loja_id)
      and (p_condicao is null or p_condicao = '' or p.condicao = p_condicao)
      and (p_categoria_loja_id is null or l.categoria_id = p_categoria_loja_id)
      and (
        p_disponibilidade is null or p_disponibilidade = ''
        or (p_disponibilidade = 'estoque' and p.estoque > 0)
        or (p_disponibilidade = 'esgotado' and p.estoque = 0)
      )
      and (q.preco_min is null or (case when p.preco_promocional is not null and p.preco_promocional > 0 and p.preco_promocional < p.preco then p.preco_promocional else p.preco end) >= q.preco_min)
      and (q.preco_max is null or (case when p.preco_promocional is not null and p.preco_promocional > 0 and p.preco_promocional < p.preco then p.preco_promocional else p.preco end) <= q.preco_max)
      and (q.avaliacao_min is null or (li.total_avaliacoes > 0 and li.avaliacao_media >= q.avaliacao_min))
      and (
        q.termo = ''
        or p.busca_tsv @@ q.tsquery
        or public.normalizar_texto_busca(p.nome) operator(extensions.%) q.termo
        or public.normalizar_texto_busca(coalesce(p.descricao, '')) operator(extensions.%) q.termo
        or public.normalizar_texto_busca(p.nome) like ('%' || q.termo || '%')
        or public.normalizar_texto_busca(coalesce(p.descricao, '')) like ('%' || q.termo || '%')
        or extensions.word_similarity(q.termo, public.normalizar_texto_busca(p.nome)) >= 0.45
        or extensions.word_similarity(q.termo, public.normalizar_texto_busca(coalesce(p.descricao, ''))) >= 0.55
      )
  ),
  pontuados as (
    select c.*,
      case when c.termo = '' then 0::real
      else (
        pg_catalog.ts_rank_cd(c.busca_tsv, c.tsquery, 32) * 4.0
        + case when c.nome_normalizado = c.termo then 4.0
               when c.nome_normalizado like (c.termo || '%') then 2.0
               when c.nome_normalizado like ('%' || c.termo || '%') then 1.0
               else 0.0 end
        + extensions.similarity(c.nome_normalizado, c.termo) * 1.5
        + extensions.word_similarity(c.termo, c.nome_normalizado) * 1.25
        + extensions.word_similarity(c.termo, c.descricao_normalizada) * 0.45
      )::real end as relevancia_calculada
    from candidatos c
  )
  select
    p.id, p.loja_id, p.categoria_id, p.nome, p.descricao, p.preco, p.preco_promocional,
    p.preco_atual, p.estoque, p.imagem_url, p.destaque, p.created_at,
    p.categoria_produto_id, p.categoria_produto_nome, p.loja_nome, p.loja_cidade,
    p.loja_logo_url, p.loja_categoria_id, p.avaliacao_media, p.total_avaliacoes,
    public.total_vendas_anuncio(p.id) as total_vendido,
    p.relevancia_calculada as relevancia, p.condicao,
    pg_catalog.count(*) over () as total_count
  from pontuados p
  order by
    -- Sem texto pesquisado: assinantes primeiro (destaque)
    case when p.ordenacao in ('relevancia', 'destaques') and p.termo = ''
         then case when p.destaque then 1 else 0 end end desc nulls last,
    case when p.ordenacao = 'relevancia' and p.termo <> '' then p.relevancia_calculada end desc nulls last,
    case when p.ordenacao = 'destaques' and p.termo <> ''
         then case when p.destaque then 1 else 0 end end desc nulls last,
    case when p.ordenacao = 'nome' then p.nome end asc nulls last,
    case when p.ordenacao = 'menor-preco' then p.preco_atual end asc nulls last,
    case when p.ordenacao = 'maior-preco' then p.preco_atual end desc nulls last,
    case when p.ordenacao = 'melhor-avaliados' then p.avaliacao_media end desc nulls last,
    case when p.ordenacao = 'melhor-avaliados' then p.total_avaliacoes end desc nulls last,
    case when p.ordenacao = 'recentes' or p.termo = '' then p.created_at end desc nulls last,
    p.relevancia_calculada desc,
    p.nome asc,
    p.id asc
  limit (select q.limite from consulta q)
  offset (select q.deslocamento from consulta q);
$function$;

-- ---------------------------------------------------------------------
-- Aviso de vencimento do anúncio (plano grátis): nas últimas 24 horas.
-- Fica na mesma função que o sininho já chama ao abrir o site.
-- ---------------------------------------------------------------------
create or replace function public.verificar_avisos_assinatura()
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_loja record;
  v_anuncio record;
  v_chave_fim text;
  v_encerrada_pelo_admin boolean;
  v_criados integer := 0;
begin
  if v_uid is null then
    return 0;
  end if;

  for v_loja in
    select l.id, l.nome::text as nome, l.proprietario_id,
           s.situacao, s.fim_em, s.carencia_ate
    from public.lojas l
    cross join lateral private.situacao_assinatura(l.id) s
    where l.proprietario_id = v_uid
      and l.tipo = 'loja'
      and s.situacao in ('ativa', 'carencia', 'expirada')
  loop
    v_chave_fim := to_char(v_loja.fim_em at time zone 'UTC', 'YYYYMMDDHH24MI');

    if v_loja.situacao = 'ativa'
       and v_loja.fim_em - now() <= interval '7 days' then
      perform private.salvar_notificacao(
        v_loja.proprietario_id,
        'loja_status',
        'Assinatura perto do fim',
        'A assinatura da loja ' || v_loja.nome || ' termina em '
          || to_char(v_loja.fim_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY')
          || '. Solicite a renovação no painel para a loja não ser pausada.',
        'painel-loja.html',
        jsonb_build_object('loja_id', v_loja.id, 'fim_em', v_loja.fim_em),
        'assinatura_7_dias:' || v_loja.id::text || ':' || v_chave_fim,
        false
      );
      v_criados := v_criados + 1;

    elsif v_loja.situacao = 'carencia' then
      select exists (
        select 1
        from public.assinaturas a
        where a.loja_id = v_loja.id
          and a.encerrada_em is not null
          and a.encerrada_em = v_loja.fim_em
      ) into v_encerrada_pelo_admin;

      if not v_encerrada_pelo_admin then
        perform private.salvar_notificacao(
          v_loja.proprietario_id,
          'loja_status',
          'Loja pausada',
          'A assinatura da loja ' || v_loja.nome || ' terminou e a loja foi pausada. '
            || 'Os anúncios continuam no ar até '
            || to_char(v_loja.carencia_ate at time zone 'America/Sao_Paulo', 'DD/MM/YYYY')
            || '. Solicite a renovação no painel.',
          'painel-loja.html',
          jsonb_build_object('loja_id', v_loja.id, 'carencia_ate', v_loja.carencia_ate),
          'assinatura_pausada:' || v_loja.id::text || ':' || v_chave_fim,
          false
        );
        v_criados := v_criados + 1;
      end if;

    elsif v_loja.situacao = 'expirada' then
      perform private.salvar_notificacao(
        v_loja.proprietario_id,
        'loja_status',
        'Anúncios fora do ar',
        'Acabaram os 15 dias depois do fim da assinatura da loja ' || v_loja.nome
          || '. A loja e os anúncios saíram do ar e das buscas. '
          || 'Solicite a renovação no painel para voltar.',
        'painel-loja.html',
        jsonb_build_object('loja_id', v_loja.id),
        'assinatura_expirada:' || v_loja.id::text || ':' || v_chave_fim,
        false
      );
      v_criados := v_criados + 1;
    end if;
  end loop;

  -- Anúncios do plano grátis que saem do ar nas próximas 24 horas.
  for v_anuncio in
    select p.id, p.nome::text as nome, p.vence_em
    from public.produtos p
    join public.lojas l on l.id = p.loja_id
    where l.proprietario_id = v_uid
      and p.status_aprovacao = 'aprovado'
      and p.ativo = true
      and p.vence_em is not null
      and p.vence_em > now()
      and p.vence_em <= now() + interval '24 hours'
  loop
    perform private.salvar_notificacao(
      v_uid,
      'loja_status',
      'Anúncio sai do ar amanhã',
      'O anúncio "' || left(v_anuncio.nome, 120) || '" sai do ar em '
        || to_char(v_anuncio.vence_em at time zone 'America/Sao_Paulo', 'DD/MM "às" HH24:MI')
        || '. Se ainda estiver à venda, publique de novo depois que ele sair.',
      'meus-anuncios.html',
      jsonb_build_object('produto_id', v_anuncio.id, 'vence_em', v_anuncio.vence_em),
      'anuncio_vence:' || v_anuncio.id::text || ':'
        || to_char(v_anuncio.vence_em at time zone 'UTC', 'YYYYMMDDHH24MI'),
      false
    );
    v_criados := v_criados + 1;
  end loop;

  return v_criados;
end;
$function$;
