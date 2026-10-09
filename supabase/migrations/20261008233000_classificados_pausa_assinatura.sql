-- =====================================================================
-- ETAPA 7: FIM DA ASSINATURA, PAUSA DA LOJA E AVISOS
-- =====================================================================
-- Regras:
--   * Assinatura ativa: a loja publica e edita anúncios normalmente.
--   * Terminou (carência de 15 dias): a loja fica pausada. Não publica
--     nem edita anúncios, mas os que já estão no ar continuam visíveis.
--     Ainda pode marcar como indisponível ou excluir.
--   * Passaram os 15 dias (expirada): a loja e os anúncios saem do ar e
--     das buscas. Voltam sozinhos quando o admin renova a assinatura.
--   * Loja aprovada que ainda não tem assinatura: não publica nem edita
--     até a administração ativar o plano.
-- Avisos ao lojista (sem duplicar):
--   * 7 dias antes do fim da assinatura;
--   * quando a assinatura termina e a loja é pausada;
--   * no fim dos 15 dias, quando os anúncios saem do ar.
-- Tudo é calculado pela data, sem tarefa agendada: os avisos são
-- gerados quando o lojista abre o site (o sininho chama a função).
-- =====================================================================

-- ---------------------------------------------------------------------
-- A LOJA ESTÁ NO AR?
-- ---------------------------------------------------------------------
-- Falso só quando a assinatura acabou há mais de 15 dias. Perfis
-- pessoais e lojas que nunca tiveram assinatura continuam no ar.

create or replace function public.loja_no_ar(p_loja_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select s.situacao <> 'expirada'
     from private.situacao_assinatura(p_loja_id) s),
    true
  );
$$;

revoke all on function public.loja_no_ar(uuid) from public;
grant execute on function public.loja_no_ar(uuid) to anon, authenticated;

-- Verdadeiro durante os 15 dias de carência (loja pausada, anúncios no ar).
create or replace function public.loja_pausada(p_loja_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select s.situacao in ('carencia', 'expirada')
     from private.situacao_assinatura(p_loja_id) s),
    false
  );
$$;

revoke all on function public.loja_pausada(uuid) from public;
grant execute on function public.loja_pausada(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- VISIBILIDADE: LOJA E ANÚNCIOS SAEM DO AR DEPOIS DOS 15 DIAS
-- ---------------------------------------------------------------------

alter policy "Catálogo público e loja do proprietário"
on public.lojas
using (
  (
    ativa = true
    and status_aprovacao = 'aprovada'
    and public.loja_no_ar(id)
  )
  or proprietario_id = (select auth.uid())
);

alter policy "Catálogo público de produtos"
on public.produtos
using (
  ativo = true
  and status_aprovacao = 'aprovado'
  and (vence_em is null or vence_em > now())
  and exists (
    select 1
    from public.lojas loja
    where loja.id = produtos.loja_id
      and loja.ativa = true
      and loja.status_aprovacao = 'aprovada'
  )
  and public.loja_no_ar(loja_id)
);

alter policy "Produtos visíveis ao usuário autenticado"
on public.produtos
using (
  (
    ativo = true
    and status_aprovacao = 'aprovado'
    and (vence_em is null or vence_em > now())
    and exists (
      select 1
      from public.lojas loja
      where loja.id = produtos.loja_id
        and loja.ativa = true
        and loja.status_aprovacao = 'aprovada'
    )
    and public.loja_no_ar(loja_id)
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
-- LOJA SEM ASSINATURA ATIVA NÃO PUBLICA NEM EDITA
-- ---------------------------------------------------------------------
-- O nome começa com "trg_bloquear" para rodar antes do gatilho que
-- guarda a edição na fila do admin.

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
    or new.imagem_url is distinct from old.imagem_url
    or new.destaque is distinct from old.destaque
  ) then
    -- Marcar como indisponível ou excluir continua liberado.
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

revoke all on function private.bloquear_loja_sem_assinatura()
  from public, anon, authenticated;

create trigger trg_bloquear_loja_sem_assinatura
before insert or update on public.produtos
for each row
execute function private.bloquear_loja_sem_assinatura();

-- ---------------------------------------------------------------------
-- AVISOS AO LOJISTA
-- ---------------------------------------------------------------------
-- A chave única inclui a data de fim do período, então cada aviso sai
-- uma vez por período e volta a valer depois de uma renovação.

create or replace function public.verificar_avisos_assinatura()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_loja record;
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
      -- Quando o admin encerra, ele já manda o aviso de encerramento.
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

  return v_criados;
end;
$$;

revoke all on function public.verificar_avisos_assinatura() from public, anon;
grant execute on function public.verificar_avisos_assinatura() to authenticated;
