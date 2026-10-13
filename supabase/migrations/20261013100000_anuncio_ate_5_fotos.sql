-- =====================================================================
-- ATÉ 5 FOTOS POR ANÚNCIO
-- =====================================================================
-- A foto principal fica em produtos.imagem_url; as outras (até 4) ficam
-- em produto_imagens. Regras:
--   * no máximo 4 fotos extras por anúncio (5 no total);
--   * foto extra nova em anúncio JÁ APROVADO de lojista entra como
--     "pendente": vai para a fila do admin junto com a edição e só
--     aparece no site depois da aprovação; se a edição for recusada, a
--     foto é apagada;
--   * o público só vê fotos que não estão pendentes;
--   * no plano grátis as fotos continuam travadas depois do envio
--     (gatilho proteger_imagens_anuncio_gratuito).
-- =====================================================================

alter table public.produto_imagens
  add column if not exists pendente boolean not null default false;

create or replace function private.controlar_fotos_anuncio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_produto record;
  v_total integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('fotos_anuncio:' || new.produto_id::text, 0));

  select count(*) into v_total
  from public.produto_imagens i
  where i.produto_id = new.produto_id;

  if v_total >= 4 then
    raise exception 'Cada anúncio pode ter até 5 fotos: a principal e mais 4.';
  end if;

  if v_uid is null or public._usuario_e_admin(v_uid) then
    return new;
  end if;

  select p.id, p.nome::text as nome, p.descricao, p.preco, p.preco_promocional,
         p.categoria_id, p.condicao, p.imagem_url, p.status_aprovacao, l.tipo
  into v_produto
  from public.produtos p
  join public.lojas l on l.id = p.loja_id
  where p.id = new.produto_id;

  new.pendente := false;

  if v_produto.tipo = 'loja' and v_produto.status_aprovacao = 'aprovado' then
    if not exists (
      select 1 from private.situacao_assinatura(
        (select p.loja_id from public.produtos p where p.id = new.produto_id)
      ) s where s.situacao = 'ativa'
    ) then
      raise exception 'Sua loja está sem assinatura ativa. Solicite a assinatura no painel da loja para editar anúncios.';
    end if;

    new.pendente := true;

    -- Garante que a edição apareça na fila do admin, mesmo que só as
    -- fotos tenham mudado.
    if not exists (
      select 1 from public.edicoes_anuncio e
      where e.produto_id = new.produto_id and e.decidida_em is null
    ) then
      insert into public.edicoes_anuncio (produto_id, dados, solicitado_por)
      values (
        new.produto_id,
        jsonb_build_object(
          'nome', v_produto.nome,
          'descricao', v_produto.descricao,
          'preco', v_produto.preco,
          'preco_promocional', v_produto.preco_promocional,
          'categoria_id', v_produto.categoria_id,
          'condicao', v_produto.condicao,
          'imagem_url', v_produto.imagem_url
        ),
        v_uid
      )
      on conflict (produto_id) do update
      set dados = excluded.dados, solicitado_por = excluded.solicitado_por,
          criado_em = now(), decidida_em = null, aprovada = null;

      perform private.avisar_admin_anuncio_pendente(new.produto_id, v_produto.nome, true);
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.controlar_fotos_anuncio() from public, anon, authenticated;

create trigger trg_controlar_fotos_anuncio
before insert on public.produto_imagens
for each row
execute function private.controlar_fotos_anuncio();

-- O público vê só as fotos aprovadas; dono e admin veem também as
-- pendentes. (São duas regras porque visitante não pode chamar sou_admin.)
alter policy "Visualizar imagens"
on public.produto_imagens
using (pendente = false);

create policy "Dono e admin veem fotos pendentes"
on public.produto_imagens
for select
to authenticated
using (
  exists (
    select 1 from public.produtos p
    join public.lojas l on l.id = p.loja_id
    where p.id = produto_imagens.produto_id
      and l.proprietario_id = (select auth.uid())
  )
  or (select public.sou_admin())
);

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

    -- Fotos novas enviadas junto com a edição passam a aparecer.
    update public.produto_imagens
    set pendente = false
    where produto_id = p_produto_id and pendente;
  else
    -- Edição recusada: as fotos novas não vão ao ar.
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
$$;

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
    jsonb_build_object(
      'condicao_atual', p.condicao,
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
$$;
