-- =====================================================================
-- ETAPA 9: "TENHO INTERESSE", VENDA CONFIRMADA E AVALIAÇÃO DO VENDEDOR
-- =====================================================================
-- Fluxo:
--   1. O comprador clica em "Tenho interesse" no anúncio.
--   2. O vendedor vê a lista de interessados e confirma a venda para um
--      deles (pode marcar o anúncio como indisponível na mesma hora).
--   3. Só depois da confirmação o comprador avalia o vendedor (1 a 5
--      estrelas e comentário). Uma avaliação por venda.
--   4. Se o vendedor não confirmar, o comprador pode pedir a confirmação
--      (no máximo uma vez a cada 24 horas) ou denunciar o anúncio.
-- A avaliação vale para o perfil de quem vendeu: o perfil do usuário
-- comum ou a loja do lojista.
-- Tudo passa por funções; as tabelas não ficam abertas para o site.
-- =====================================================================

-- ---------------------------------------------------------------------
-- TABELAS
-- ---------------------------------------------------------------------

create table if not exists public.interesses_anuncio (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid not null references public.produtos(id) on delete cascade,
  interessado_id uuid not null references public.profiles(id) on delete cascade,
  criado_em timestamptz not null default now(),
  confirmacao_pedida_em timestamptz,
  constraint interesses_anuncio_unico unique (produto_id, interessado_id)
);

create index if not exists interesses_anuncio_interessado_idx
  on public.interesses_anuncio (interessado_id);

create table if not exists public.vendas_anuncio (
  id uuid primary key default gen_random_uuid(),
  interesse_id uuid unique references public.interesses_anuncio(id) on delete set null,
  produto_id uuid references public.produtos(id) on delete set null,
  loja_id uuid not null references public.lojas(id) on delete cascade,
  comprador_id uuid not null references public.profiles(id) on delete cascade,
  produto_nome text not null,
  confirmada_em timestamptz not null default now()
);

create index if not exists vendas_anuncio_loja_idx on public.vendas_anuncio (loja_id);
create index if not exists vendas_anuncio_comprador_idx on public.vendas_anuncio (comprador_id);

create table if not exists public.avaliacoes_vendedor (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null unique references public.vendas_anuncio(id) on delete cascade,
  loja_id uuid not null references public.lojas(id) on delete cascade,
  avaliador_id uuid not null references public.profiles(id) on delete cascade,
  nota smallint not null check (nota between 1 and 5),
  comentario text check (comentario is null or char_length(comentario) <= 1000),
  resposta text check (resposta is null or char_length(resposta) <= 1000),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create index if not exists avaliacoes_vendedor_loja_idx
  on public.avaliacoes_vendedor (loja_id, criado_em desc);

alter table public.interesses_anuncio enable row level security;
alter table public.vendas_anuncio enable row level security;
alter table public.avaliacoes_vendedor enable row level security;

revoke all on table public.interesses_anuncio from public, anon, authenticated;
revoke all on table public.vendas_anuncio from public, anon, authenticated;
revoke all on table public.avaliacoes_vendedor from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- AUXILIAR: O ANÚNCIO ESTÁ NO AR PARA O PÚBLICO?
-- ---------------------------------------------------------------------

create or replace function private.anuncio_publico(p_produto_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.produtos p
    join public.lojas l on l.id = p.loja_id
    where p.id = p_produto_id
      and p.ativo = true
      and p.status_aprovacao = 'aprovado'
      and (p.vence_em is null or p.vence_em > now())
      and l.ativa = true
      and l.status_aprovacao = 'aprovada'
      and public.loja_no_ar(l.id)
  );
$$;

revoke all on function private.anuncio_publico(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- COMPRADOR: SITUAÇÃO DO MEU INTERESSE
-- ---------------------------------------------------------------------

create or replace function public.meu_interesse_anuncio(p_produto_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_dono boolean;
  v_interesse public.interesses_anuncio%rowtype;
  v_venda public.vendas_anuncio%rowtype;
  v_avaliacao public.avaliacoes_vendedor%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('logado', false);
  end if;

  select l.proprietario_id = v_uid
  into v_dono
  from public.produtos p
  join public.lojas l on l.id = p.loja_id
  where p.id = p_produto_id;

  if v_dono is null then
    raise exception 'Anúncio não encontrado.';
  end if;

  if v_dono then
    return jsonb_build_object('logado', true, 'dono', true);
  end if;

  select * into v_interesse
  from public.interesses_anuncio i
  where i.produto_id = p_produto_id and i.interessado_id = v_uid;

  if not found then
    return jsonb_build_object('logado', true, 'dono', false, 'interesse', false);
  end if;

  select * into v_venda
  from public.vendas_anuncio v
  where v.interesse_id = v_interesse.id;

  if found then
    select * into v_avaliacao
    from public.avaliacoes_vendedor a
    where a.venda_id = v_venda.id;
  end if;

  return jsonb_build_object(
    'logado', true,
    'dono', false,
    'interesse', true,
    'interesse_em', v_interesse.criado_em,
    'confirmacao_pedida_em', v_interesse.confirmacao_pedida_em,
    'pode_pedir_confirmacao',
      v_venda.id is null
      and (v_interesse.confirmacao_pedida_em is null
           or v_interesse.confirmacao_pedida_em < now() - interval '24 hours'),
    'venda_id', v_venda.id,
    'venda_em', v_venda.confirmada_em,
    'avaliado', v_avaliacao.id is not null,
    'nota', v_avaliacao.nota
  );
end;
$$;

revoke all on function public.meu_interesse_anuncio(uuid) from public, anon;
grant execute on function public.meu_interesse_anuncio(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- COMPRADOR: TENHO INTERESSE
-- ---------------------------------------------------------------------

create or replace function public.registrar_interesse_anuncio(p_produto_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_produto record;
  v_nome text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Entre na sua conta para demonstrar interesse.';
  end if;

  if not exists (
    select 1 from public.profiles pr
    where pr.id = v_uid and coalesce(pr.ativo, true) and pr.excluido_em is null
  ) then
    raise exception 'Sua conta não está ativa.';
  end if;

  select p.id, p.nome::text as nome, l.proprietario_id
  into v_produto
  from public.produtos p
  join public.lojas l on l.id = p.loja_id
  where p.id = p_produto_id;

  if not found or not private.anuncio_publico(p_produto_id) then
    raise exception 'Este anúncio não está disponível.';
  end if;

  if v_produto.proprietario_id = v_uid then
    raise exception 'Este anúncio é seu.';
  end if;

  insert into public.interesses_anuncio (produto_id, interessado_id)
  values (p_produto_id, v_uid)
  on conflict (produto_id, interessado_id) do nothing
  returning id into v_id;

  if v_id is not null then
    select coalesce(nullif(split_part(trim(pr.nome), ' ', 1), ''), 'Um usuário')
    into v_nome
    from public.profiles pr where pr.id = v_uid;

    perform private.salvar_notificacao(
      v_produto.proprietario_id,
      'pedido_novo',
      'Novo interessado',
      coalesce(v_nome, 'Um usuário') || ' tem interesse no anúncio ' || v_produto.nome
        || '. Quando a venda acontecer, confirme em Interessados para liberar a avaliação.',
      'interessados.html',
      jsonb_build_object('produto_id', p_produto_id, 'interesse_id', v_id),
      'interesse:' || v_id::text,
      false
    );
  end if;

  return public.meu_interesse_anuncio(p_produto_id);
end;
$$;

revoke all on function public.registrar_interesse_anuncio(uuid) from public, anon;
grant execute on function public.registrar_interesse_anuncio(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- COMPRADOR: PEDIR A CONFIRMAÇÃO DA VENDA
-- ---------------------------------------------------------------------

create or replace function public.pedir_confirmacao_venda(p_produto_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_interesse public.interesses_anuncio%rowtype;
  v_produto record;
  v_nome text;
begin
  if v_uid is null then
    raise exception 'Entre na sua conta.';
  end if;

  select * into v_interesse
  from public.interesses_anuncio i
  where i.produto_id = p_produto_id and i.interessado_id = v_uid
  for update;

  if not found then
    raise exception 'Clique em "Tenho interesse" antes de pedir a confirmação.';
  end if;

  if exists (select 1 from public.vendas_anuncio v where v.interesse_id = v_interesse.id) then
    raise exception 'O vendedor já confirmou esta venda.';
  end if;

  if v_interesse.confirmacao_pedida_em is not null
     and v_interesse.confirmacao_pedida_em > now() - interval '24 hours' then
    raise exception 'Você já pediu a confirmação. Aguarde 24 horas para pedir de novo.';
  end if;

  update public.interesses_anuncio
  set confirmacao_pedida_em = now()
  where id = v_interesse.id;

  select p.nome::text as nome, l.proprietario_id
  into v_produto
  from public.produtos p
  join public.lojas l on l.id = p.loja_id
  where p.id = p_produto_id;

  select coalesce(nullif(split_part(trim(pr.nome), ' ', 1), ''), 'Um comprador')
  into v_nome
  from public.profiles pr where pr.id = v_uid;

  perform private.salvar_notificacao(
    v_produto.proprietario_id,
    'pedido_status',
    'Confirme a venda',
    coalesce(v_nome, 'Um comprador') || ' pediu que você confirme a venda do anúncio '
      || v_produto.nome || '. Se a venda aconteceu, confirme em Interessados.',
    'interessados.html',
    jsonb_build_object('produto_id', p_produto_id, 'interesse_id', v_interesse.id),
    'pedir_confirmacao:' || v_interesse.id::text || ':' || to_char(now(), 'YYYYMMDDHH24MISS'),
    false
  );

  return public.meu_interesse_anuncio(p_produto_id);
end;
$$;

revoke all on function public.pedir_confirmacao_venda(uuid) from public, anon;
grant execute on function public.pedir_confirmacao_venda(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- VENDEDOR: LISTA DE INTERESSADOS NOS MEUS ANÚNCIOS
-- ---------------------------------------------------------------------

create or replace function public.listar_interessados_anuncios()
returns table (
  produto_id uuid,
  produto_nome text,
  produto_imagem_url text,
  produto_disponivel boolean,
  interesse_id uuid,
  interessado_nome text,
  interesse_em timestamptz,
  confirmacao_pedida_em timestamptz,
  venda_id uuid,
  venda_em timestamptz,
  avaliacao_nota smallint,
  avaliacao_comentario text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.nome::text,
    p.imagem_url,
    p.estoque > 0,
    i.id,
    coalesce(nullif(trim(pr.nome), ''), 'Usuário'),
    i.criado_em,
    i.confirmacao_pedida_em,
    v.id,
    v.confirmada_em,
    a.nota,
    a.comentario
  from public.interesses_anuncio i
  join public.produtos p on p.id = i.produto_id
  join public.lojas l on l.id = p.loja_id
  left join public.profiles pr on pr.id = i.interessado_id
  left join public.vendas_anuncio v on v.interesse_id = i.id
  left join public.avaliacoes_vendedor a on a.venda_id = v.id
  where l.proprietario_id = (select auth.uid())
    and p.ativo = true
  order by
    (v.id is null and i.confirmacao_pedida_em is not null) desc,
    coalesce(i.confirmacao_pedida_em, i.criado_em) desc;
$$;

revoke all on function public.listar_interessados_anuncios() from public, anon;
grant execute on function public.listar_interessados_anuncios() to authenticated;

-- ---------------------------------------------------------------------
-- VENDEDOR: CONFIRMAR A VENDA
-- ---------------------------------------------------------------------

create or replace function public.confirmar_venda_anuncio(
  p_interesse_id uuid,
  p_marcar_indisponivel boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_dados record;
  v_venda_id uuid;
begin
  if v_uid is null then
    raise exception 'Entre na sua conta.';
  end if;

  select i.id, i.interessado_id, p.id as produto_id, p.nome::text as produto_nome,
         l.id as loja_id, l.nome::text as loja_nome, l.proprietario_id
  into v_dados
  from public.interesses_anuncio i
  join public.produtos p on p.id = i.produto_id
  join public.lojas l on l.id = p.loja_id
  where i.id = p_interesse_id
  for update of i;

  if not found or v_dados.proprietario_id is distinct from v_uid then
    raise exception 'Interessado não encontrado nos seus anúncios.';
  end if;

  if exists (select 1 from public.vendas_anuncio v where v.interesse_id = p_interesse_id) then
    raise exception 'Esta venda já foi confirmada.';
  end if;

  insert into public.vendas_anuncio (interesse_id, produto_id, loja_id, comprador_id, produto_nome)
  values (v_dados.id, v_dados.produto_id, v_dados.loja_id, v_dados.interessado_id, v_dados.produto_nome)
  returning id into v_venda_id;

  if coalesce(p_marcar_indisponivel, false) then
    update public.produtos set estoque = 0 where id = v_dados.produto_id;
  end if;

  perform private.salvar_notificacao(
    v_dados.interessado_id,
    'pedido_status',
    'Venda confirmada',
    v_dados.loja_nome || ' confirmou a venda de ' || v_dados.produto_nome
      || '. Conte como foi: avalie o vendedor na página do anúncio.',
    'produto.html?id=' || v_dados.produto_id::text,
    jsonb_build_object('produto_id', v_dados.produto_id, 'venda_id', v_venda_id),
    'venda_confirmada:' || v_venda_id::text,
    false
  );

  return jsonb_build_object('venda_id', v_venda_id, 'produto_id', v_dados.produto_id);
end;
$$;

revoke all on function public.confirmar_venda_anuncio(uuid, boolean) from public, anon;
grant execute on function public.confirmar_venda_anuncio(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- COMPRADOR: AVALIAR O VENDEDOR
-- ---------------------------------------------------------------------

create or replace function public.avaliar_vendedor(
  p_venda_id uuid,
  p_nota integer,
  p_comentario text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_venda public.vendas_anuncio%rowtype;
  v_comentario text := nullif(trim(coalesce(p_comentario, '')), '');
  v_dono uuid;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Entre na sua conta para avaliar.';
  end if;

  if p_nota is null or p_nota < 1 or p_nota > 5 then
    raise exception 'Escolha de 1 a 5 estrelas.';
  end if;

  if v_comentario is not null and char_length(v_comentario) > 1000 then
    raise exception 'O comentário deve ter no máximo 1000 caracteres.';
  end if;

  select * into v_venda from public.vendas_anuncio v where v.id = p_venda_id;

  if not found or v_venda.comprador_id is distinct from v_uid then
    raise exception 'Só quem comprou pode avaliar, depois que o vendedor confirmar a venda.';
  end if;

  if exists (select 1 from public.avaliacoes_vendedor a where a.venda_id = p_venda_id) then
    raise exception 'Você já avaliou esta compra.';
  end if;

  insert into public.avaliacoes_vendedor (venda_id, loja_id, avaliador_id, nota, comentario)
  values (p_venda_id, v_venda.loja_id, v_uid, p_nota, v_comentario)
  returning id into v_id;

  select l.proprietario_id into v_dono from public.lojas l where l.id = v_venda.loja_id;

  perform private.salvar_notificacao(
    v_dono,
    'avaliacao_nova',
    'Nova avaliação',
    'Você recebeu ' || p_nota || ' ' || case when p_nota = 1 then 'estrela' else 'estrelas' end
      || ' pela venda de ' || v_venda.produto_nome || '.',
    'interessados.html',
    jsonb_build_object('avaliacao_id', v_id, 'venda_id', p_venda_id),
    'avaliacao_vendedor:' || v_id::text,
    false
  );

  return jsonb_build_object('avaliacao_id', v_id, 'nota', p_nota);
end;
$$;

revoke all on function public.avaliar_vendedor(uuid, integer, text) from public, anon;
grant execute on function public.avaliar_vendedor(uuid, integer, text) to authenticated;

-- ---------------------------------------------------------------------
-- PÚBLICO: AVALIAÇÕES DO VENDEDOR (PERFIL OU LOJA)
-- ---------------------------------------------------------------------

create or replace function public.resumo_avaliacoes_vendedor(p_loja_id uuid)
returns table (
  media numeric,
  total bigint,
  nota_5 bigint,
  nota_4 bigint,
  nota_3 bigint,
  nota_2 bigint,
  nota_1 bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(round(avg(a.nota)::numeric, 1), 0),
    count(*),
    count(*) filter (where a.nota = 5),
    count(*) filter (where a.nota = 4),
    count(*) filter (where a.nota = 3),
    count(*) filter (where a.nota = 2),
    count(*) filter (where a.nota = 1)
  from public.avaliacoes_vendedor a
  where a.loja_id = p_loja_id
    and a.ativo = true;
$$;

revoke all on function public.resumo_avaliacoes_vendedor(uuid) from public;
grant execute on function public.resumo_avaliacoes_vendedor(uuid) to anon, authenticated;

create or replace function public.listar_avaliacoes_vendedor(
  p_loja_id uuid,
  p_limite integer default 20
)
returns table (
  id uuid,
  nota smallint,
  comentario text,
  resposta_loja text,
  criado_em timestamptz,
  avaliador_nome text,
  produto_nome text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    a.id,
    a.nota,
    a.comentario,
    a.resposta,
    a.criado_em,
    coalesce(nullif(split_part(trim(pr.nome), ' ', 1), ''), 'Comprador'),
    v.produto_nome
  from public.avaliacoes_vendedor a
  join public.vendas_anuncio v on v.id = a.venda_id
  left join public.profiles pr on pr.id = a.avaliador_id
  where a.loja_id = p_loja_id
    and a.ativo = true
  order by a.criado_em desc
  limit greatest(1, least(coalesce(p_limite, 20), 50));
$$;

revoke all on function public.listar_avaliacoes_vendedor(uuid, integer) from public;
grant execute on function public.listar_avaliacoes_vendedor(uuid, integer) to anon, authenticated;

-- ---------------------------------------------------------------------
-- SEM AVISO DE "ESTOQUE BAIXO"
-- ---------------------------------------------------------------------
-- Com o anúncio só disponível (1) ou indisponível (0), o aviso antigo
-- de estoque baixo disparava a cada anúncio novo. Ele fica desligado.

create or replace function private.notificar_estoque_baixo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  return new;
end;
$$;
