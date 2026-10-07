-- Classificados, etapa 5: fila de aprovação de anúncios.
--
-- Regras:
--   * todo anúncio novo, de usuário comum ou de lojista, nasce pendente
--     e só aparece ao público depois de aprovado pelo administrador;
--   * a edição feita pelo lojista em um anúncio já aprovado não altera o
--     que está no ar: fica guardada em edicoes_anuncio até o admin
--     decidir. A versão antiga continua publicada enquanto isso;
--   * anúncio rejeitado que é corrigido volta para a fila;
--   * disponibilidade (estoque) e exclusão (ativo) não passam pela fila.
--
-- Os anúncios que já existiam ficam como aprovados.

-- ---------------------------------------------------------------------
-- SITUAÇÃO DE APROVAÇÃO DO ANÚNCIO
-- ---------------------------------------------------------------------

-- O padrão 'aprovado' vale só para preencher as linhas existentes.
alter table public.produtos
  add column status_aprovacao text not null default 'aprovado';

alter table public.produtos
  alter column status_aprovacao set default 'pendente';

alter table public.produtos
  add constraint produtos_status_aprovacao_check
  check (status_aprovacao in ('pendente', 'aprovado', 'rejeitado'));

alter table public.produtos
  add column aprovado_em timestamptz,
  add column aprovado_por uuid references public.profiles (id) on delete set null,
  add column motivo_rejeicao text;

alter table public.produtos
  add constraint produtos_motivo_rejeicao_check
  check (motivo_rejeicao is null or char_length(motivo_rejeicao) <= 500);

create index produtos_pendentes_idx
  on public.produtos (criado_em)
  where status_aprovacao = 'pendente';

create index produtos_aprovado_por_idx
  on public.produtos (aprovado_por);

-- ---------------------------------------------------------------------
-- EDIÇÕES AGUARDANDO APROVAÇÃO
-- ---------------------------------------------------------------------
-- No máximo uma edição por anúncio; uma nova substitui a anterior. A linha
-- não é apagada ao decidir: fica marcada como decidida.

create table public.edicoes_anuncio (
  produto_id uuid primary key references public.produtos (id) on delete cascade,
  dados jsonb not null,
  solicitado_por uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now(),
  -- Preenchidos quando o admin decide. Edição pendente = decidida_em nulo.
  decidida_em timestamptz,
  aprovada boolean
);

comment on table public.edicoes_anuncio is
  'Classificados: edição de anúncio aprovado aguardando o administrador. A versão publicada segue no ar.';

create index edicoes_anuncio_solicitado_por_idx
  on public.edicoes_anuncio (solicitado_por);

alter table public.edicoes_anuncio enable row level security;

create policy edicoes_anuncio_leitura_dono_ou_admin
  on public.edicoes_anuncio
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.produtos p
      join public.lojas l on l.id = p.loja_id
      where p.id = edicoes_anuncio.produto_id
        and l.proprietario_id = (select auth.uid())
    )
    or (select public.sou_admin())
  );

revoke all on table public.edicoes_anuncio from anon, authenticated;
grant select on table public.edicoes_anuncio to authenticated;

-- ---------------------------------------------------------------------
-- VISIBILIDADE PÚBLICA
-- ---------------------------------------------------------------------
-- A busca (buscar_produtos_publicos) roda com as permissões de quem
-- consulta, então estas políticas também valem para ela. O dono continua
-- vendo os próprios anúncios em qualquer situação.

alter policy "Catálogo público de produtos"
  on public.produtos
  using (
    ativo = true
    and status_aprovacao = 'aprovado'
    and exists (
      select 1
      from public.lojas loja
      where loja.id = produtos.loja_id
        and loja.ativa = true
        and loja.status_aprovacao = 'aprovada'
    )
  );

alter policy "Produtos visíveis ao usuário autenticado"
  on public.produtos
  using (
    (
      ativo = true
      and status_aprovacao = 'aprovado'
      and exists (
        select 1
        from public.lojas loja
        where loja.id = produtos.loja_id
          and loja.ativa = true
          and loja.status_aprovacao = 'aprovada'
      )
    )
    or exists (
      select 1
      from public.lojas loja
      where loja.id = produtos.loja_id
        and loja.proprietario_id = (select auth.uid())
    )
    or (select public.sou_admin())
  );

-- ---------------------------------------------------------------------
-- AVISO AO ADMINISTRADOR
-- ---------------------------------------------------------------------

create or replace function private.avisar_admin_anuncio_pendente(
  p_produto_id uuid,
  p_nome text,
  p_edicao boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin_id uuid;
begin
  select principal.usuario_id
  into v_admin_id
  from private.admin_principal principal
  where principal.singleton;

  perform private.salvar_notificacao(
    v_admin_id,
    'moderacao_nova',
    case when p_edicao
      then 'Edição de anúncio aguardando aprovação'
      else 'Anúncio aguardando aprovação'
    end,
    left(coalesce(nullif(trim(p_nome), ''), 'Um anúncio'), 120)
      || case when p_edicao
           then ' foi editado e precisa de aprovação.'
           else ' foi enviado e precisa de aprovação.'
         end,
    'admin-anuncios.html',
    jsonb_build_object('produto_id', p_produto_id, 'edicao', p_edicao),
    'anuncio_pendente:' || p_produto_id::text,
    true
  );
end;
$$;

revoke all on function private.avisar_admin_anuncio_pendente(uuid, text, boolean)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- GATILHO DE APROVAÇÃO
-- ---------------------------------------------------------------------
-- O nome começa com "trg_controlar" para rodar antes de
-- trg_proteger_edicao_anuncio_gratuito, que barra a edição no plano gratuito.

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
  -- Operações internas sem JWT e o administrador não passam pela fila.
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

  -- O dono nunca altera a própria aprovação.
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
    or new.imagem_url is distinct from old.imagem_url;

  if not v_conteudo_mudou then
    return new;
  end if;

  select l.tipo into v_tipo
  from public.lojas l
  where l.id = old.loja_id;

  -- Plano gratuito: quem decide é o gatilho que proíbe a edição.
  if v_tipo = 'pessoal' then
    return new;
  end if;

  if old.status_aprovacao = 'aprovado' then
    -- Guarda a edição e mantém no ar a versão já aprovada.
    insert into public.edicoes_anuncio (produto_id, dados, solicitado_por)
    values (
      old.id,
      jsonb_build_object(
        'nome', new.nome,
        'descricao', new.descricao,
        'preco', new.preco,
        'preco_promocional', new.preco_promocional,
        'categoria_id', new.categoria_id,
        'imagem_url', new.imagem_url
      ),
      v_uid
    )
    on conflict (produto_id) do update
    set
      dados = excluded.dados,
      solicitado_por = excluded.solicitado_por,
      criado_em = now(),
      decidida_em = null,
      aprovada = null;

    perform private.avisar_admin_anuncio_pendente(old.id, new.nome, true);

    new.nome := old.nome;
    new.descricao := old.descricao;
    new.preco := old.preco;
    new.preco_promocional := old.preco_promocional;
    new.categoria_id := old.categoria_id;
    new.imagem_url := old.imagem_url;

    return new;
  end if;

  if old.status_aprovacao = 'rejeitado' then
    -- Corrigiu o anúncio rejeitado: volta para a fila.
    new.status_aprovacao := 'pendente';
    new.motivo_rejeicao := null;

    perform private.avisar_admin_anuncio_pendente(old.id, new.nome, false);
  end if;

  -- Anúncio ainda pendente: a correção vale direto, ele segue na fila.
  return new;
end;
$$;

revoke all on function private.controlar_aprovacao_anuncio()
  from public, anon, authenticated;

create trigger trg_controlar_aprovacao_anuncio
before insert or update on public.produtos
for each row
execute function private.controlar_aprovacao_anuncio();

-- ---------------------------------------------------------------------
-- ADMIN: FILA E DECISÕES
-- ---------------------------------------------------------------------

create or replace function public.listar_fila_anuncios_admin()
returns table (
  tipo_item text,
  produto_id uuid,
  nome text,
  descricao text,
  preco numeric,
  preco_promocional numeric,
  imagem_url text,
  categoria text,
  loja_id uuid,
  loja_nome text,
  loja_tipo text,
  enviado_em timestamptz,
  dados_novos jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
     or not public._usuario_e_admin((select auth.uid())) then
    raise exception 'Acesso restrito a administradores.';
  end if;

  return query
  select
    'novo'::text,
    p.id,
    p.nome::text,
    p.descricao,
    p.preco,
    p.preco_promocional,
    p.imagem_url,
    cp.nome::text,
    l.id,
    l.nome::text,
    l.tipo,
    coalesce(p.criado_em, p.created_at),
    null::jsonb
  from public.produtos p
  join public.lojas l on l.id = p.loja_id
  left join public.categorias_produtos cp on cp.id = p.categoria_id
  where p.status_aprovacao = 'pendente'
    and p.ativo = true

  union all

  select
    'edicao'::text,
    p.id,
    p.nome::text,
    p.descricao,
    p.preco,
    p.preco_promocional,
    p.imagem_url,
    cp.nome::text,
    l.id,
    l.nome::text,
    l.tipo,
    e.criado_em,
    e.dados || jsonb_build_object(
      'categoria',
      (
        select cn.nome
        from public.categorias_produtos cn
        where cn.id = nullif(e.dados ->> 'categoria_id', '')::integer
      )
    )
  from public.edicoes_anuncio e
  join public.produtos p on p.id = e.produto_id
  join public.lojas l on l.id = p.loja_id
  left join public.categorias_produtos cp on cp.id = p.categoria_id
  where p.ativo = true
    and e.decidida_em is null

  order by 12;
end;
$$;

revoke all on function public.listar_fila_anuncios_admin() from public, anon;
grant execute on function public.listar_fila_anuncios_admin() to authenticated;

-- Avisa o dono do anúncio sobre a decisão.
create or replace function private.avisar_dono_decisao_anuncio(
  p_produto_id uuid,
  p_titulo text,
  p_mensagem text,
  p_chave text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dono uuid;
  v_tipo text;
begin
  select l.proprietario_id, l.tipo
  into v_dono, v_tipo
  from public.produtos p
  join public.lojas l on l.id = p.loja_id
  where p.id = p_produto_id;

  perform private.salvar_notificacao(
    v_dono,
    'conteudo_moderado',
    p_titulo,
    left(p_mensagem, 500),
    case when v_tipo = 'pessoal' then 'meus-anuncios.html' else 'produtos.html' end,
    jsonb_build_object('produto_id', p_produto_id),
    p_chave || ':' || p_produto_id::text,
    true
  );
end;
$$;

revoke all on function private.avisar_dono_decisao_anuncio(uuid, text, text, text)
  from public, anon, authenticated;

create or replace function public.decidir_anuncio_admin(
  p_produto_id uuid,
  p_aprovar boolean,
  p_motivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_motivo text := nullif(trim(coalesce(p_motivo, '')), '');
  v_produto public.produtos%rowtype;
begin
  if v_uid is null or not public._usuario_e_admin(v_uid) then
    raise exception 'Acesso restrito a administradores.';
  end if;

  if p_aprovar is null then
    raise exception 'Informe a decisão.';
  end if;

  if not p_aprovar and (v_motivo is null or char_length(v_motivo) < 5) then
    raise exception 'Informe o motivo da rejeição, com pelo menos 5 caracteres.';
  end if;

  if v_motivo is not null and char_length(v_motivo) > 500 then
    raise exception 'O motivo deve ter no máximo 500 caracteres.';
  end if;

  select *
  into v_produto
  from public.produtos
  where id = p_produto_id
  for update;

  if not found then
    raise exception 'Anúncio não encontrado.';
  end if;

  if v_produto.status_aprovacao <> 'pendente' then
    raise exception 'Este anúncio não está aguardando aprovação.';
  end if;

  update public.produtos
  set
    status_aprovacao = case when p_aprovar then 'aprovado' else 'rejeitado' end,
    aprovado_em = case when p_aprovar then now() else null end,
    aprovado_por = case when p_aprovar then v_uid else null end,
    motivo_rejeicao = case when p_aprovar then null else v_motivo end,
    atualizado_em = now()
  where id = p_produto_id;

  perform private.avisar_dono_decisao_anuncio(
    p_produto_id,
    case when p_aprovar then 'Anúncio aprovado' else 'Anúncio rejeitado' end,
    case when p_aprovar
      then 'O anúncio ' || v_produto.nome || ' foi aprovado e já está no ar.'
      else 'O anúncio ' || v_produto.nome || ' foi rejeitado. Motivo: ' || v_motivo
    end,
    'anuncio_decisao'
  );

  return jsonb_build_object(
    'produto_id', p_produto_id,
    'status_aprovacao', case when p_aprovar then 'aprovado' else 'rejeitado' end
  );
end;
$$;

revoke all on function public.decidir_anuncio_admin(uuid, boolean, text)
  from public, anon;
grant execute on function public.decidir_anuncio_admin(uuid, boolean, text)
  to authenticated;

create or replace function public.decidir_edicao_anuncio_admin(
  p_produto_id uuid,
  p_aprovar boolean,
  p_motivo text default null
)
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

  if p_aprovar is null then
    raise exception 'Informe a decisão.';
  end if;

  if not p_aprovar and (v_motivo is null or char_length(v_motivo) < 5) then
    raise exception 'Informe o motivo da rejeição, com pelo menos 5 caracteres.';
  end if;

  if v_motivo is not null and char_length(v_motivo) > 500 then
    raise exception 'O motivo deve ter no máximo 500 caracteres.';
  end if;

  select e.dados
  into v_dados
  from public.edicoes_anuncio e
  where e.produto_id = p_produto_id
    and e.decidida_em is null
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
      imagem_url = v_dados ->> 'imagem_url',
      atualizado_em = now()
    where id = p_produto_id;
  end if;

  select p.nome::text into v_nome
  from public.produtos p
  where p.id = p_produto_id;

  update public.edicoes_anuncio e
  set decidida_em = now(), aprovada = p_aprovar
  where e.produto_id = p_produto_id;

  perform private.avisar_dono_decisao_anuncio(
    p_produto_id,
    case when p_aprovar then 'Edição aprovada' else 'Edição rejeitada' end,
    case when p_aprovar
      then 'A edição do anúncio ' || v_nome || ' foi aprovada e já está no ar.'
      else 'A edição do anúncio ' || v_nome
        || ' foi rejeitada e a versão anterior continua no ar. Motivo: ' || v_motivo
    end,
    'anuncio_edicao_decisao'
  );

  return jsonb_build_object('produto_id', p_produto_id, 'aplicada', p_aprovar);
end;
$$;

revoke all on function public.decidir_edicao_anuncio_admin(uuid, boolean, text)
  from public, anon;
grant execute on function public.decidir_edicao_anuncio_admin(uuid, boolean, text)
  to authenticated;
