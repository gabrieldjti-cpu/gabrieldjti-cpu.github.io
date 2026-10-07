-- Classificados, etapa 4: anúncio de usuário comum.
--
-- O usuário comum anuncia por um "perfil de anunciante": uma linha em
-- public.lojas com tipo = 'pessoal'. Assim as políticas de produtos, a
-- busca e a página do anúncio continuam valendo sem reescrita, porque
-- todo anúncio segue pertencendo a uma linha de lojas.
--
--   tipo = 'loja'    -> loja de lojista (aprovação do admin + assinatura)
--   tipo = 'pessoal' -> perfil de usuário comum (plano gratuito)
--
-- Esta migration só acrescenta colunas, funções e um gatilho. Nenhum
-- dado existente é apagado; as lojas atuais ficam com tipo = 'loja'.

-- ---------------------------------------------------------------------
-- TIPO DA LOJA
-- ---------------------------------------------------------------------

alter table public.lojas
  add column tipo text not null default 'loja';

alter table public.lojas
  add constraint lojas_tipo_check check (tipo in ('loja', 'pessoal'));

-- O perfil pessoal não tem categoria de loja.
alter table public.lojas
  alter column categoria_id drop not null;

alter table public.lojas
  add constraint lojas_categoria_por_tipo_check
  check (tipo = 'pessoal' or categoria_id is not null);

create index lojas_tipo_idx on public.lojas (tipo);

comment on column public.lojas.tipo is
  'Classificados: loja (lojista com assinatura) ou pessoal (perfil de usuário comum no plano gratuito).';

-- ---------------------------------------------------------------------
-- PROTEÇÃO DE APROVAÇÃO E DE TIPO
-- ---------------------------------------------------------------------
-- Mesma função de antes, com dois acréscimos:
--   * o perfil pessoal só nasce pela função criar_perfil_anunciante, que
--     liga a marca app.perfil_anunciante dentro da própria transação;
--   * ninguém além do admin troca o tipo depois de criado.

create or replace function public.proteger_aprovacao_loja()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
    v_uid uuid := auth.uid();
    v_admin boolean := false;
    v_perfil_pessoal boolean :=
        coalesce(current_setting('app.perfil_anunciante', true), '') = '1';
begin
    -- Operações internas/migrations sem JWT continuam permitidas.
    if v_uid is null then
        return new;
    end if;

    v_admin := public._usuario_e_admin(v_uid);

    if tg_op = 'INSERT' then
        if not v_admin then
            if new.proprietario_id is distinct from v_uid then
                raise exception 'Você só pode cadastrar uma loja para sua própria conta.';
            end if;

            if v_perfil_pessoal then
                -- Perfil de anunciante: entra ativo. Quem passa por
                -- aprovação é cada anúncio, não o perfil.
                new.tipo := 'pessoal';
                new.status_aprovacao := 'aprovada';
                new.ativa := true;
                new.aprovado_em := now();
                new.aprovado_por := null;
                new.motivo_rejeicao := null;
                return new;
            end if;

            new.tipo := 'loja';
            new.status_aprovacao := 'pendente';
            new.ativa := false;
            new.aprovado_em := null;
            new.aprovado_por := null;
            new.motivo_rejeicao := null;
        end if;

        return new;
    end if;

    if tg_op = 'UPDATE' and not v_admin then
        if new.proprietario_id is distinct from old.proprietario_id then
            raise exception 'O proprietário da loja não pode ser alterado.';
        end if;

        if new.tipo is distinct from old.tipo then
            raise exception 'O tipo do cadastro não pode ser alterado.';
        end if;

        if new.status_aprovacao is distinct from old.status_aprovacao
           or new.aprovado_em is distinct from old.aprovado_em
           or new.aprovado_por is distinct from old.aprovado_por
           or new.motivo_rejeicao is distinct from old.motivo_rejeicao then
            raise exception 'Somente um administrador pode alterar a aprovação da loja.';
        end if;

        -- Loja pendente, rejeitada ou suspensa nunca pode ser reativada pelo proprietário.
        if old.status_aprovacao <> 'aprovada' then
            new.ativa := false;
        end if;
    end if;

    return new;
end;
$function$;

-- ---------------------------------------------------------------------
-- CRIAR O PERFIL DE ANUNCIANTE
-- ---------------------------------------------------------------------
-- Cada conta tem no máximo um cadastro em lojas. Quem já tem loja ou
-- perfil recebe o cadastro existente de volta.

create or replace function public.criar_perfil_anunciante(
  p_nome text,
  p_whatsapp text,
  p_cidade text,
  p_estado text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_nome text := nullif(trim(coalesce(p_nome, '')), '');
  v_whatsapp text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
  v_cidade text := nullif(trim(coalesce(p_cidade, '')), '');
  v_estado text := upper(trim(coalesce(p_estado, '')));
  v_existente public.lojas%rowtype;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Entre na sua conta para anunciar.';
  end if;

  if not exists (
    select 1 from public.profiles p where p.id = v_uid and p.ativo = true
  ) then
    raise exception 'Sua conta não está ativa.';
  end if;

  -- Evita dois cadastros se a pessoa clicar duas vezes.
  perform pg_advisory_xact_lock(hashtextextended('perfil_anunciante:' || v_uid::text, 0));

  select *
  into v_existente
  from public.lojas l
  where l.proprietario_id = v_uid
  order by l.criado_em
  limit 1;

  if found then
    return jsonb_build_object(
      'id', v_existente.id,
      'tipo', v_existente.tipo,
      'criado', false
    );
  end if;

  if v_nome is null or char_length(v_nome) < 2 or char_length(v_nome) > 80 then
    raise exception 'Informe um nome de 2 a 80 caracteres.';
  end if;

  if char_length(v_whatsapp) < 10 or char_length(v_whatsapp) > 13 then
    raise exception 'Informe um WhatsApp com DDD.';
  end if;

  if v_cidade is null or char_length(v_cidade) > 100 then
    raise exception 'Informe a cidade.';
  end if;

  if v_estado !~ '^[A-Z]{2}$' then
    raise exception 'Informe a sigla do estado com 2 letras.';
  end if;

  perform set_config('app.perfil_anunciante', '1', true);

  insert into public.lojas (
    proprietario_id, tipo, nome, whatsapp, telefone, cidade, estado
  ) values (
    v_uid, 'pessoal', v_nome, v_whatsapp, v_whatsapp, v_cidade, v_estado
  )
  returning id into v_id;

  perform set_config('app.perfil_anunciante', '', true);

  return jsonb_build_object('id', v_id, 'tipo', 'pessoal', 'criado', true);
end;
$$;

revoke all on function public.criar_perfil_anunciante(text, text, text, text)
  from public, anon;
grant execute on function public.criar_perfil_anunciante(text, text, text, text)
  to authenticated;

-- ---------------------------------------------------------------------
-- PLANO GRATUITO NÃO EDITA O ANÚNCIO
-- ---------------------------------------------------------------------
-- O dono de um perfil pessoal ainda pode marcar o anúncio como
-- indisponível (estoque) e excluir (ativo). O conteúdo fica travado.

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
  -- Operações internas sem JWT e o administrador continuam livres.
  if v_uid is null or public._usuario_e_admin(v_uid) then
    return new;
  end if;

  select l.tipo into v_tipo
  from public.lojas l
  where l.id = old.loja_id;

  if v_tipo is distinct from 'pessoal' then
    return new;
  end if;

  if new.loja_id is distinct from old.loja_id
     or new.nome is distinct from old.nome
     or new.descricao is distinct from old.descricao
     or new.preco is distinct from old.preco
     or new.preco_promocional is distinct from old.preco_promocional
     or new.categoria_id is distinct from old.categoria_id
     or new.imagem_url is distinct from old.imagem_url
     or new.destaque is distinct from old.destaque then
    raise exception 'No plano gratuito o anúncio não pode ser editado. Você pode marcar como indisponível ou excluir.';
  end if;

  return new;
end;
$$;

revoke all on function private.proteger_edicao_anuncio_gratuito()
  from public, anon, authenticated;

create trigger trg_proteger_edicao_anuncio_gratuito
before update on public.produtos
for each row
execute function private.proteger_edicao_anuncio_gratuito();

-- As fotos extras do anúncio seguem a mesma regra: depois de publicado,
-- o perfil pessoal não troca nem acrescenta imagens.
create or replace function private.proteger_imagens_anuncio_gratuito()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_produto_id uuid;
  v_tipo text;
  v_criado_em timestamptz;
begin
  if tg_op = 'DELETE' then
    v_produto_id := old.produto_id;
  else
    v_produto_id := new.produto_id;
  end if;

  if v_uid is null or public._usuario_e_admin(v_uid) then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  select l.tipo, p.criado_em
  into v_tipo, v_criado_em
  from public.produtos p
  join public.lojas l on l.id = p.loja_id
  where p.id = v_produto_id;

  -- Dá 15 minutos para o cadastro terminar de enviar as fotos.
  if v_tipo = 'pessoal' and v_criado_em < now() - interval '15 minutes' then
    raise exception 'No plano gratuito as fotos do anúncio não podem ser alteradas.';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.proteger_imagens_anuncio_gratuito()
  from public, anon, authenticated;

create trigger trg_proteger_imagens_anuncio_gratuito
before insert or update or delete on public.produto_imagens
for each row
execute function private.proteger_imagens_anuncio_gratuito();

-- ---------------------------------------------------------------------
-- ASSINATURA SÓ PARA LOJA
-- ---------------------------------------------------------------------

create or replace function private.exigir_loja_para_assinatura()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.lojas l
    where l.id = new.loja_id and l.tipo <> 'loja'
  ) then
    raise exception 'Perfil de anunciante usa o plano gratuito e não tem assinatura.';
  end if;

  return new;
end;
$$;

revoke all on function private.exigir_loja_para_assinatura()
  from public, anon, authenticated;

create trigger trg_exigir_loja_para_assinatura
before insert on public.assinaturas
for each row
execute function private.exigir_loja_para_assinatura();
