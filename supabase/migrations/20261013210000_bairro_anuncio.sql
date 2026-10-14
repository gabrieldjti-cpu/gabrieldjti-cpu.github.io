-- =====================================================================
-- BAIRRO DO ANÚNCIO (opcional)
--  * produtos.bairro: texto livre, opcional (2 a 60 letras), arrumado
--    no banco (espaços extras e vazio viram nulo).
--  * Edição de lojista passa pela aprovação, como os outros campos;
--    no plano grátis não muda depois de publicado.
--  * Busca: filtro p_bairro e coluna bairro no resultado.
--  * listar_bairros_anuncios(): bairros com anúncios disponíveis, para
--    o filtro do início e das categorias.
-- Obs.: a busca com bairro tem nome novo (buscar_anuncios) para não
-- precisar apagar a antiga; o site passa a usar só a nova.
-- =====================================================================

alter table public.produtos
  add column if not exists bairro text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'produtos_bairro_tamanho') then
    alter table public.produtos
      add constraint produtos_bairro_tamanho
      check (bairro is null or char_length(bairro) between 2 and 60);
  end if;
end $$;

create or replace function private.ajustar_bairro_anuncio()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.bairro := nullif(
    pg_catalog.btrim(pg_catalog.regexp_replace(coalesce(new.bairro, ''), '\s+', ' ', 'g')),
    ''
  );
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_ajustar_bairro_anuncio') then
    create trigger trg_ajustar_bairro_anuncio
      before insert or update of bairro on public.produtos
      for each row execute function private.ajustar_bairro_anuncio();
  end if;
end $$;

-- Edição de lojista: bairro entra na aprovação.
create or replace function private.controlar_aprovacao_anuncio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_tipo text;
  v_conteudo_mudou boolean;
begin
  if v_uid is null or public._usuario_e_admin(v_uid) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.status_aprovacao := 'pendente';
    new.aprovado_em := null;
    new.aprovado_por := null;
    new.motivo_rejeicao := null;
    perform private.avisar_admin_anuncio_pendente(new.id, new.nome, false);
    return new;
  end if;
  new.status_aprovacao := old.status_aprovacao;
  new.aprovado_em := old.aprovado_em;
  new.aprovado_por := old.aprovado_por;
  new.motivo_rejeicao := old.motivo_rejeicao;
  v_conteudo_mudou :=
    new.nome is distinct from old.nome
    or new.descricao is distinct from old.descricao
    or new.preco is distinct from old.preco
    or new.preco_promocional is distinct from old.preco_promocional
    or new.categoria_id is distinct from old.categoria_id
    or new.condicao is distinct from old.condicao
    or new.bairro is distinct from old.bairro
    or new.imagem_url is distinct from old.imagem_url;
  if not v_conteudo_mudou then
    return new;
  end if;
  select l.tipo into v_tipo from public.lojas l where l.id = old.loja_id;
  if v_tipo = 'pessoal' then
    return new;
  end if;
  if old.status_aprovacao = 'aprovado' then
    insert into public.edicoes_anuncio (produto_id, dados, solicitado_por)
    values (
      old.id,
      jsonb_build_object(
        'nome', new.nome,
        'descricao', new.descricao,
        'preco', new.preco,
        'preco_promocional', new.preco_promocional,
        'categoria_id', new.categoria_id,
        'condicao', new.condicao,
        'bairro', new.bairro,
        'imagem_url', new.imagem_url
      ),
      v_uid
    )
    on conflict (produto_id) do update
    set dados = excluded.dados, solicitado_por = excluded.solicitado_por, criado_em = now(), decidida_em = null, aprovada = null;
    perform private.avisar_admin_anuncio_pendente(old.id, new.nome, true);
    new.nome := old.nome;
    new.descricao := old.descricao;
    new.preco := old.preco;
    new.preco_promocional := old.preco_promocional;
    new.categoria_id := old.categoria_id;
    new.condicao := old.condicao;
    new.bairro := old.bairro;
    new.imagem_url := old.imagem_url;
    return new;
  end if;
  if old.status_aprovacao = 'rejeitado' then
    new.status_aprovacao := 'pendente';
    new.motivo_rejeicao := null;
    perform private.avisar_admin_anuncio_pendente(old.id, new.nome, false);
  end if;
  return new;
end;
$function$;

-- Plano grátis: bairro também não muda depois de publicado.
create or replace function private.proteger_edicao_anuncio_gratuito()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_tipo text;
begin
  if v_uid is null or public._usuario_e_admin(v_uid) then return new; end if;
  select l.tipo into v_tipo from public.lojas l where l.id = old.loja_id;
  if v_tipo is distinct from 'pessoal' then return new; end if;
  if new.loja_id is distinct from old.loja_id
     or new.nome is distinct from old.nome
     or new.descricao is distinct from old.descricao
     or new.preco is distinct from old.preco
     or new.preco_promocional is distinct from old.preco_promocional
     or new.categoria_id is distinct from old.categoria_id
     or new.condicao is distinct from old.condicao
     or new.bairro is distinct from old.bairro
     or new.imagem_url is distinct from old.imagem_url
     or new.destaque is distinct from old.destaque then
    raise exception 'No plano gratuito o anúncio não pode ser editado. Você pode marcar como indisponível ou excluir.';
  end if;
  return new;
end;
$function$;

create or replace function public.decidir_edicao_anuncio_admin(p_produto_id uuid, p_aprovar boolean, p_motivo text default null::text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_motivo text := nullif(trim(coalesce(p_motivo, '')), '');
  v_dados jsonb;
  v_nome text;
begin
  if v_uid is null or not public._usuario_e_admin(v_uid) then
    raise exception 'Acesso restrito a administradores.';
  end if;
  if p_aprovar is null then raise exception 'Informe a decisão.'; end if;
  if not p_aprovar and (v_motivo is null or char_length(v_motivo) < 5) then
    raise exception 'Informe o motivo da rejeição, com pelo menos 5 caracteres.';
  end if;
  if v_motivo is not null and char_length(v_motivo) > 500 then
    raise exception 'O motivo deve ter no máximo 500 caracteres.';
  end if;
  select e.dados into v_dados from public.edicoes_anuncio e
  where e.produto_id = p_produto_id and e.decidida_em is null
  for update;
  if not found then
    raise exception 'Este anúncio não tem edição aguardando aprovação.';
  end if;
  if p_aprovar then
    update public.produtos
    set
      nome = v_dados ->> 'nome',
      descricao = v_dados ->> 'descricao',
      preco = (v_dados ->> 'preco')::numeric,
      preco_promocional = nullif(v_dados ->> 'preco_promocional', '')::numeric,
      categoria_id = nullif(v_dados ->> 'categoria_id', '')::integer,
      condicao = case when v_dados ? 'condicao'
                      then nullif(v_dados ->> 'condicao', '')
                      else condicao end,
      bairro = case when v_dados ? 'bairro'
                    then nullif(v_dados ->> 'bairro', '')
                    else bairro end,
      imagem_url = v_dados ->> 'imagem_url',
      atualizado_em = now()
    where id = p_produto_id;

    update public.produto_imagens
    set pendente = false
    where produto_id = p_produto_id and pendente;
  else
    delete from public.produto_imagens
    where produto_id = p_produto_id and pendente;
  end if;
  select p.nome::text into v_nome from public.produtos p where p.id = p_produto_id;
  update public.edicoes_anuncio e set decidida_em = now(), aprovada = p_aprovar where e.produto_id = p_produto_id;
  perform private.avisar_dono_decisao_anuncio(
    p_produto_id,
    case when p_aprovar then 'Edição aprovada' else 'Edição rejeitada' end,
    case when p_aprovar
      then 'A edição do anúncio ' || v_nome || ' foi aprovada e já está no ar.'
      else 'A edição do anúncio ' || v_nome || ' foi rejeitada e a versão anterior continua no ar. Motivo: ' || v_motivo
    end,
    'anuncio_edicao_decisao'
  );
  return jsonb_build_object('produto_id', p_produto_id, 'aplicada', p_aprovar);
end;
$function$;

create or replace function public.listar_fila_anuncios_admin()
returns table(tipo_item text, produto_id uuid, nome text, descricao text, preco numeric, preco_promocional numeric, imagem_url text, categoria text, loja_id uuid, loja_nome text, loja_tipo text, enviado_em timestamp with time zone, dados_novos jsonb)
language plpgsql
stable security definer
set search_path = ''
as $function$
begin
  if (select auth.uid()) is null or not public._usuario_e_admin((select auth.uid())) then
    raise exception 'Acesso restrito a administradores.';
  end if;
  return query
  select
    'novo'::text, p.id, p.nome::text, p.descricao, p.preco, p.preco_promocional, p.imagem_url,
    cp.nome::text, l.id, l.nome::text, l.tipo, coalesce(p.criado_em, p.created_at),
    jsonb_build_object(
      'condicao_atual', p.condicao,
      'bairro_atual', p.bairro,
      'imagens_extras', coalesce((
        select jsonb_agg(i.imagem_url order by i.ordem)
        from public.produto_imagens i where i.produto_id = p.id
      ), '[]'::jsonb)
    )
  from public.produtos p
  join public.lojas l on l.id = p.loja_id
  left join public.categorias_produtos cp on cp.id = p.categoria_id
  where p.status_aprovacao = 'pendente' and p.ativo = true
  union all
  select
    'edicao'::text, p.id, p.nome::text, p.descricao, p.preco, p.preco_promocional, p.imagem_url,
    cp.nome::text, l.id, l.nome::text, l.tipo, e.criado_em,
    e.dados || jsonb_build_object(
      'categoria',
      (select cn.nome from public.categorias_produtos cn where cn.id = nullif(e.dados ->> 'categoria_id', '')::integer),
      'condicao_atual', p.condicao,
      'bairro_atual', p.bairro,
      'imagens_novas', coalesce((
        select jsonb_agg(i.imagem_url order by i.ordem)
        from public.produto_imagens i where i.produto_id = p.id and i.pendente
      ), '[]'::jsonb)
    )
  from public.edicoes_anuncio e
  join public.produtos p on p.id = e.produto_id
  join public.lojas l on l.id = p.loja_id
  left join public.categorias_produtos cp on cp.id = p.categoria_id
  where p.ativo = true and e.decidida_em is null
  order by 12;
end;
$function$;

-- Busca com filtro de bairro (mesma lógica de buscar_anuncios_publicos).
create or replace function public.buscar_anuncios(
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
  p_condicao text default null::text,
  p_bairro text default null::text
)
returns table(
  id uuid, loja_id uuid, categoria_id integer, nome text, descricao text,
  preco numeric, preco_promocional numeric, preco_atual numeric, estoque integer,
  imagem_url text, destaque boolean, created_at timestamp with time zone,
  categoria_produto_id integer, categoria_produto_nome text, loja_nome text,
  loja_cidade text, loja_logo_url text, loja_categoria_id integer,
  avaliacao_media numeric, total_avaliacoes integer, total_vendido bigint,
  relevancia real, condicao text, bairro text, total_count bigint
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
      p.bairro,
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
      and (
        nullif(btrim(coalesce(p_bairro, '')), '') is null
        or public.normalizar_texto_busca(coalesce(p.bairro, '')) = public.normalizar_texto_busca(p_bairro)
      )
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
    p.relevancia_calculada as relevancia, p.condicao, p.bairro,
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

grant execute on function public.buscar_anuncios(text, integer, uuid, integer, text, numeric, numeric, numeric, text, integer, integer, text, text) to anon, authenticated;

-- Bairros com anúncios disponíveis (respeita o que o visitante pode ver).
create or replace function public.listar_bairros_anuncios()
returns table(bairro text, total bigint)
language sql
stable
set search_path = ''
as $$
  select min(p.bairro) as bairro, count(*) as total
  from public.produtos p
  join public.lojas l on l.id = p.loja_id
  where p.ativo = true
    and p.estoque > 0
    and p.bairro is not null
    and l.ativa = true
    and l.status_aprovacao = 'aprovada'
  group by public.normalizar_texto_busca(p.bairro)
  order by 1;
$$;

grant execute on function public.listar_bairros_anuncios() to anon, authenticated;
