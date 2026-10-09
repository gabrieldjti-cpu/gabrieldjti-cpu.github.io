-- =====================================================================
-- ETAPA 8: CATEGORIAS, "NOVO OU USADO" E DISPONIBILIDADE
-- =====================================================================
-- * Cada categoria de anúncio diz se pede "novo ou usado". Uma
--   subcategoria segue a categoria principal quando ela pede.
-- * O anúncio guarda a condição (novo/usado) só onde faz sentido; nas
--   outras categorias o campo fica vazio.
-- * O estoque vira só disponível (1) ou indisponível (0).
-- * Novas categorias no estilo OLX, além das que já existiam.
-- * Nova busca pública com filtro por condição.
-- =====================================================================

-- ---------------------------------------------------------------------
-- CATEGORIAS: QUAIS PEDEM "NOVO OU USADO"
-- ---------------------------------------------------------------------

alter table public.categorias_produtos
  add column if not exists pede_condicao boolean not null default false;

comment on column public.categorias_produtos.pede_condicao is
  'Quando verdadeiro, o anúncio desta categoria (e das subcategorias) informa se é novo ou usado.';

-- Categorias atuais em que faz sentido perguntar.
update public.categorias_produtos
set pede_condicao = true
where categoria_pai_id is null
  and nome in ('Roupas', 'Calçados', 'Eletrônicos', 'Música');

-- Novas categorias principais no estilo OLX.
insert into public.categorias_produtos (nome, icone, pede_condicao)
select v.nome, v.icone, v.pede
from (values
  ('Casa e móveis', '🛋️', true),
  ('Eletrodomésticos', '🧺', true),
  ('Esportes e lazer', '⚽', true),
  ('Bebês e crianças', '🧸', true),
  ('Autopeças e acessórios', '🚗', true),
  ('Ferramentas e construção', '🛠️', false),
  ('Livros e papelaria', '📚', false),
  ('Animais e pet', '🐾', false),
  ('Serviços', '🧰', false),
  ('Outros', '📦', false)
) as v(nome, icone, pede)
where not exists (
  select 1 from public.categorias_produtos c
  where c.categoria_pai_id is null and lower(c.nome) = lower(v.nome)
);

-- Subcategorias das novas categorias.
insert into public.categorias_produtos (nome, categoria_pai_id, pede_condicao)
select v.sub, pai.id, v.pede
from (values
  ('Casa e móveis', 'Móveis', false),
  ('Casa e móveis', 'Decoração', false),
  ('Casa e móveis', 'Utilidades domésticas', false),
  ('Eletrodomésticos', 'Geladeiras e fogões', false),
  ('Eletrodomésticos', 'Máquinas de lavar', false),
  ('Eletrodomésticos', 'Pequenos eletrodomésticos', false),
  ('Esportes e lazer', 'Bicicletas', false),
  ('Esportes e lazer', 'Academia e fitness', false),
  ('Esportes e lazer', 'Camping e pesca', false),
  ('Bebês e crianças', 'Brinquedos', false),
  ('Bebês e crianças', 'Carrinhos e cadeirinhas', false),
  ('Bebês e crianças', 'Roupas de bebê', false),
  ('Autopeças e acessórios', 'Peças', false),
  ('Autopeças e acessórios', 'Pneus e rodas', false),
  ('Autopeças e acessórios', 'Som automotivo', false),
  ('Ferramentas e construção', 'Ferramentas', true),
  ('Ferramentas e construção', 'Materiais de construção', false),
  ('Livros e papelaria', 'Livros', true),
  ('Livros e papelaria', 'Material escolar', false),
  ('Animais e pet', 'Acessórios para pets', true),
  ('Animais e pet', 'Ração e petiscos', false),
  ('Serviços', 'Reformas e reparos', false),
  ('Serviços', 'Aulas', false),
  ('Serviços', 'Beleza', false)
) as v(pai, sub, pede)
join public.categorias_produtos pai
  on pai.categoria_pai_id is null and pai.nome = v.pai
where not exists (
  select 1 from public.categorias_produtos c
  where c.categoria_pai_id = pai.id and lower(c.nome) = lower(v.sub)
);

-- A categoria pede "novo ou usado"? (a subcategoria herda da principal)
create or replace function public.categoria_pede_condicao(p_categoria_id integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select c.pede_condicao or coalesce(pai.pede_condicao, false)
     from public.categorias_produtos c
     left join public.categorias_produtos pai on pai.id = c.categoria_pai_id
     where c.id = p_categoria_id),
    false
  );
$$;

revoke all on function public.categoria_pede_condicao(integer) from public;
grant execute on function public.categoria_pede_condicao(integer) to anon, authenticated;

-- ---------------------------------------------------------------------
-- ANÚNCIO: CONDIÇÃO E DISPONIBILIDADE
-- ---------------------------------------------------------------------

alter table public.produtos
  add column if not exists condicao text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'produtos_condicao_check'
      and conrelid = 'public.produtos'::regclass
  ) then
    alter table public.produtos
      add constraint produtos_condicao_check
      check (condicao is null or condicao in ('novo', 'usado'));
  end if;
end;
$$;

-- Estoque antigo vira disponível (1) ou indisponível (0).
update public.produtos
set estoque = case when estoque > 0 then 1 else 0 end
where estoque not in (0, 1);

-- O nome começa com "trg_ajustar" para rodar antes dos outros gatilhos:
-- a edição que vai para a fila do admin já chega validada.
create or replace function private.ajustar_condicao_disponibilidade()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.estoque := case when coalesce(new.estoque, 0) > 0 then 1 else 0 end;

  if new.condicao is not null then
    new.condicao := lower(trim(new.condicao));
    if new.condicao = '' then
      new.condicao := null;
    end if;
  end if;

  if tg_op = 'INSERT'
     or new.categoria_id is distinct from old.categoria_id
     or new.condicao is distinct from old.condicao then
    if public.categoria_pede_condicao(new.categoria_id) then
      if new.condicao is null then
        raise exception 'Informe se o produto é novo ou usado.';
      end if;
    else
      new.condicao := null;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.ajustar_condicao_disponibilidade()
  from public, anon, authenticated;

create trigger trg_ajustar_condicao_disponibilidade
before insert or update on public.produtos
for each row
execute function private.ajustar_condicao_disponibilidade();

-- ---------------------------------------------------------------------
-- A CONDIÇÃO CONTA COMO CONTEÚDO DO ANÚNCIO
-- ---------------------------------------------------------------------
-- Plano gratuito não muda; lojista sem assinatura não muda; a edição do
-- lojista com assinatura passa pela aprovação do admin.

create or replace function private.proteger_edicao_anuncio_gratuito()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
     or new.imagem_url is distinct from old.imagem_url
     or new.destaque is distinct from old.destaque then
    raise exception 'No plano gratuito o anúncio não pode ser editado. Você pode marcar como indisponível ou excluir.';
  end if;
  return new;
end;
$$;

create or replace function private.bloquear_loja_sem_assinatura()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_tipo text;
  v_situacao text;
begin
  if v_uid is null or public._usuario_e_admin(v_uid) then
    return new;
  end if;

  select l.tipo into v_tipo
  from public.lojas l
  where l.id = case when tg_op = 'INSERT' then new.loja_id else old.loja_id end;

  if v_tipo is distinct from 'loja' then
    return new;
  end if;

  if tg_op = 'UPDATE' and not (
    new.loja_id is distinct from old.loja_id
    or new.nome is distinct from old.nome
    or new.descricao is distinct from old.descricao
    or new.preco is distinct from old.preco
    or new.preco_promocional is distinct from old.preco_promocional
    or new.categoria_id is distinct from old.categoria_id
    or new.condicao is distinct from old.condicao
    or new.imagem_url is distinct from old.imagem_url
    or new.destaque is distinct from old.destaque
  ) then
    return new;
  end if;

  select s.situacao into v_situacao
  from private.situacao_assinatura(
    case when tg_op = 'INSERT' then new.loja_id else old.loja_id end
  ) s;

  if v_situacao = 'ativa' then
    return new;
  end if;

  if v_situacao in ('carencia', 'expirada') then
    raise exception 'Sua loja está pausada porque a assinatura terminou. Solicite a renovação no painel da loja para publicar ou editar anúncios.';
  end if;

  raise exception 'Sua loja ainda não tem assinatura ativa. Solicite a assinatura no painel da loja para publicar ou editar anúncios.';
end;
$$;

create or replace function private.controlar_aprovacao_anuncio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

create or replace function public.decidir_edicao_anuncio_admin(p_produto_id uuid, p_aprovar boolean, p_motivo text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
      -- Edições antigas não tinham a condição: mantém a atual.
      condicao = case when v_dados ? 'condicao'
                      then nullif(v_dados ->> 'condicao', '')
                      else condicao end,
      imagem_url = v_dados ->> 'imagem_url',
      atualizado_em = now()
    where id = p_produto_id;
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
$$;

-- ---------------------------------------------------------------------
-- BUSCA PÚBLICA COM FILTRO POR CONDIÇÃO
-- ---------------------------------------------------------------------
-- Mesma busca de buscar_produtos_publicos, com o parâmetro p_condicao
-- ('novo', 'usado' ou vazio) e a coluna condicao no resultado. A busca
-- antiga continua existindo para não quebrar nada durante a troca.

CREATE OR REPLACE FUNCTION public.buscar_anuncios_publicos(p_termo text DEFAULT ''::text, p_categoria_id integer DEFAULT NULL::integer, p_loja_id uuid DEFAULT NULL::uuid, p_categoria_loja_id integer DEFAULT NULL::integer, p_disponibilidade text DEFAULT NULL::text, p_preco_min numeric DEFAULT NULL::numeric, p_preco_max numeric DEFAULT NULL::numeric, p_avaliacao_min numeric DEFAULT NULL::numeric, p_ordenacao text DEFAULT 'relevancia'::text, p_limite integer DEFAULT 12, p_offset integer DEFAULT 0, p_condicao text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, loja_id uuid, categoria_id integer, nome text, descricao text, preco numeric, preco_promocional numeric, preco_atual numeric, estoque integer, imagem_url text, destaque boolean, created_at timestamp with time zone, categoria_produto_id integer, categoria_produto_nome text, loja_nome text, loja_cidade text, loja_logo_url text, loja_categoria_id integer, avaliacao_media numeric, total_avaliacoes integer, total_vendido bigint, relevancia real, condicao text, total_count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with parametros as (
    select
      pg_catalog.btrim(
        pg_catalog.regexp_replace(
          public.normalizar_texto_busca(
            pg_catalog.translate(
              pg_catalog.left(coalesce(p_termo, ''), 80),
              E'%_\\',
              '   '
            )
          ),
          '[[:space:]]+',
          ' ',
          'g'
        )
      ) as termo,
      case
        when p_ordenacao in (
          'relevancia',
          'destaques',
          'nome',
          'menor-preco',
          'maior-preco',
          'mais-vendidos',
          'melhor-avaliados',
          'recentes'
        ) then p_ordenacao
        else 'relevancia'
      end as ordenacao,
      case
        when p_preco_min is null then null
        else greatest(
          0::numeric,
          least(p_preco_min, 1000000::numeric)
        )
      end as preco_min,
      case
        when p_preco_max is null then null
        else greatest(
          0::numeric,
          least(p_preco_max, 1000000::numeric)
        )
      end as preco_max,
      case
        when p_avaliacao_min >= 1 and p_avaliacao_min <= 5
          then p_avaliacao_min
        else null
      end as avaliacao_min,
      greatest(1, least(coalesce(p_limite, 12), 50)) as limite,
      greatest(0, coalesce(p_offset, 0)) as deslocamento
  ),
  consulta as (
    select
      x.*,
      pg_catalog.websearch_to_tsquery(
        'pg_catalog.portuguese'::regconfig,
        x.termo
      ) as tsquery
    from parametros x
  ),
  candidatos as (
    select
      p.id,
      p.loja_id,
      p.categoria_id,
      p.nome::text as nome,
      p.descricao,
      p.preco,
      p.preco_promocional,
      case
        when p.preco_promocional is not null
          and p.preco_promocional > 0
          and p.preco_promocional < p.preco
          then p.preco_promocional
        else p.preco
      end as preco_atual,
      p.estoque,
      p.imagem_url,
      p.destaque,
      p.condicao,
      coalesce(p.created_at, p.criado_em) as created_at,
      cp.id as categoria_produto_id,
      case
        when categoria_pai.id is not null
          then categoria_pai.nome::text || ' › ' || cp.nome::text
        else cp.nome::text
      end as categoria_produto_nome,
      l.nome::text as loja_nome,
      l.cidade::text as loja_cidade,
      l.logo_url as loja_logo_url,
      l.categoria_id as loja_categoria_id,
      coalesce(pm.avaliacao_media, 0) as avaliacao_media,
      coalesce(pm.total_avaliacoes, 0) as total_avaliacoes,
      coalesce(pm.total_vendido, 0) as total_vendido,
      p.busca_tsv,
      public.normalizar_texto_busca(p.nome) as nome_normalizado,
      public.normalizar_texto_busca(coalesce(p.descricao, '')) as descricao_normalizada,
      q.termo,
      q.ordenacao,
      q.limite,
      q.deslocamento,
      q.tsquery
    from public.produtos p
    join public.lojas l on l.id = p.loja_id
    left join public.categorias_produtos cp on cp.id = p.categoria_id
    left join public.categorias_produtos categoria_pai
      on categoria_pai.id = cp.categoria_pai_id
    left join public.produto_metricas pm on pm.produto_id = p.id
    cross join consulta q
    where p.ativo = true
      and l.ativa = true
      and l.status_aprovacao = 'aprovada'
      and (
        p_categoria_id is null
        or p.categoria_id = p_categoria_id
        or cp.categoria_pai_id = p_categoria_id
      )
      and (p_loja_id is null or p.loja_id = p_loja_id)
      and (
        p_condicao is null
        or p_condicao = ''
        or p.condicao = p_condicao
      )
      and (p_categoria_loja_id is null or l.categoria_id = p_categoria_loja_id)
      and (
        p_disponibilidade is null
        or p_disponibilidade = ''
        or (p_disponibilidade = 'estoque' and p.estoque > 0)
        or (p_disponibilidade = 'esgotado' and p.estoque = 0)
      )
      and (
        q.preco_min is null
        or (
          case
            when p.preco_promocional is not null
              and p.preco_promocional > 0
              and p.preco_promocional < p.preco
              then p.preco_promocional
            else p.preco
          end
        ) >= q.preco_min
      )
      and (
        q.preco_max is null
        or (
          case
            when p.preco_promocional is not null
              and p.preco_promocional > 0
              and p.preco_promocional < p.preco
              then p.preco_promocional
            else p.preco
          end
        ) <= q.preco_max
      )
      and (
        q.avaliacao_min is null
        or (
          coalesce(pm.total_avaliacoes, 0) > 0
          and coalesce(pm.avaliacao_media, 0) >= q.avaliacao_min
        )
      )
      and (
        q.termo = ''
        or p.busca_tsv @@ q.tsquery
        or public.normalizar_texto_busca(p.nome)
          operator(extensions.%) q.termo
        or public.normalizar_texto_busca(coalesce(p.descricao, ''))
          operator(extensions.%) q.termo
        or public.normalizar_texto_busca(p.nome)
          like ('%' || q.termo || '%')
        or public.normalizar_texto_busca(coalesce(p.descricao, ''))
          like ('%' || q.termo || '%')
        or extensions.word_similarity(
          q.termo,
          public.normalizar_texto_busca(p.nome)
        ) >= 0.45
        or extensions.word_similarity(
          q.termo,
          public.normalizar_texto_busca(coalesce(p.descricao, ''))
        ) >= 0.55
      )
  ),
  pontuados as (
    select
      c.*,
      case
        when c.termo = '' then 0::real
        else (
          pg_catalog.ts_rank_cd(c.busca_tsv, c.tsquery, 32) * 4.0
          + case
              when c.nome_normalizado = c.termo then 4.0
              when c.nome_normalizado like (c.termo || '%') then 2.0
              when c.nome_normalizado like ('%' || c.termo || '%') then 1.0
              else 0.0
            end
          + extensions.similarity(c.nome_normalizado, c.termo) * 1.5
          + extensions.word_similarity(c.termo, c.nome_normalizado) * 1.25
          + extensions.word_similarity(c.termo, c.descricao_normalizada) * 0.45
        )::real
      end as relevancia_calculada
    from candidatos c
  )
  select
    p.id,
    p.loja_id,
    p.categoria_id,
    p.nome,
    p.descricao,
    p.preco,
    p.preco_promocional,
    p.preco_atual,
    p.estoque,
    p.imagem_url,
    p.destaque,
    p.created_at,
    p.categoria_produto_id,
    p.categoria_produto_nome,
    p.loja_nome,
    p.loja_cidade,
    p.loja_logo_url,
    p.loja_categoria_id,
    p.avaliacao_media,
    p.total_avaliacoes,
    p.total_vendido,
    p.relevancia_calculada as relevancia,
    p.condicao,
    pg_catalog.count(*) over () as total_count
  from pontuados p
  order by
    case
      when p.ordenacao = 'relevancia' and p.termo <> ''
        then p.relevancia_calculada
    end desc nulls last,
    case
      when p.ordenacao = 'destaques'
        or (p.ordenacao = 'relevancia' and p.termo = '')
        then case when p.destaque then 1 else 0 end
    end desc nulls last,
    case when p.ordenacao = 'nome' then p.nome end asc nulls last,
    case when p.ordenacao = 'menor-preco' then p.preco_atual end asc nulls last,
    case when p.ordenacao = 'maior-preco' then p.preco_atual end desc nulls last,
    case when p.ordenacao = 'mais-vendidos' then p.total_vendido end desc nulls last,
    case when p.ordenacao = 'melhor-avaliados' then p.avaliacao_media end desc nulls last,
    case when p.ordenacao = 'melhor-avaliados' then p.total_avaliacoes end desc nulls last,
    case when p.ordenacao = 'recentes' then p.created_at end desc nulls last,
    p.relevancia_calculada desc,
    p.nome asc,
    p.id asc
  limit (select q.limite from consulta q)
  offset (select q.deslocamento from consulta q);
$function$
;

revoke all on function public.buscar_anuncios_publicos(
  text, integer, uuid, integer, text, numeric, numeric, numeric, text, integer, integer, text
) from public;
grant execute on function public.buscar_anuncios_publicos(
  text, integer, uuid, integer, text, numeric, numeric, numeric, text, integer, integer, text
) to anon, authenticated;

-- ---------------------------------------------------------------------
-- FILA DO ADMIN: MOSTRA A CONDIÇÃO ATUAL AO LADO DA NOVA
-- ---------------------------------------------------------------------

create or replace function public.listar_fila_anuncios_admin()
returns table(tipo_item text, produto_id uuid, nome text, descricao text, preco numeric, preco_promocional numeric, imagem_url text, categoria text, loja_id uuid, loja_nome text, loja_tipo text, enviado_em timestamp with time zone, dados_novos jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public._usuario_e_admin((select auth.uid())) then
    raise exception 'Acesso restrito a administradores.';
  end if;
  return query
  select
    'novo'::text, p.id, p.nome::text, p.descricao, p.preco, p.preco_promocional, p.imagem_url,
    cp.nome::text, l.id, l.nome::text, l.tipo, coalesce(p.criado_em, p.created_at),
    jsonb_build_object('condicao_atual', p.condicao)
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
      'condicao_atual', p.condicao
    )
  from public.edicoes_anuncio e
  join public.produtos p on p.id = e.produto_id
  join public.lojas l on l.id = p.loja_id
  left join public.categorias_produtos cp on cp.id = p.categoria_id
  where p.ativo = true and e.decidida_em is null
  order by 12;
end;
$$;
