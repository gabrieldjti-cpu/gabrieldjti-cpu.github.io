-- RF-26: permite abrir diretamente uma denúncia recebida por notificação,
-- sem depender da busca textual ou da página atual da fila.

begin;

drop function if exists public.listar_denuncias_admin(
  text, text, text, integer, integer
);

drop function if exists private.listar_denuncias_admin_core(
  text, text, text, integer, integer
);

create function private.listar_denuncias_admin_core(
  p_status text,
  p_tipo text,
  p_busca text,
  p_limite integer,
  p_offset integer,
  p_denuncia_id uuid
)
returns table (
  denuncia_id uuid,
  tipo_conteudo text,
  produto_id uuid,
  avaliacao_id uuid,
  conteudo_titulo text,
  conteudo_resumo text,
  loja_id uuid,
  loja_nome text,
  motivo text,
  detalhes text,
  status text,
  denunciante_nome text,
  criado_em timestamptz,
  analisado_em timestamptz,
  analisado_por_nome text,
  justificativa_admin text,
  conteudo_ocultado boolean,
  conteudo_ativo boolean,
  total_registros bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
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
        else coalesce(avaliacao.ativo, false) and avaliacao.moderado_em is null
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
    left join public.avaliacoes avaliacao on avaliacao.id = denuncia.avaliacao_id
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
$$;

revoke all on function private.listar_denuncias_admin_core(
  text, text, text, integer, integer, uuid
) from public, anon, authenticated, service_role;

grant execute on function private.listar_denuncias_admin_core(
  text, text, text, integer, integer, uuid
) to authenticated;

create function public.listar_denuncias_admin(
  p_status text default '',
  p_tipo text default '',
  p_busca text default '',
  p_limite integer default 12,
  p_offset integer default 0,
  p_denuncia_id uuid default null
)
returns table (
  denuncia_id uuid,
  tipo_conteudo text,
  produto_id uuid,
  avaliacao_id uuid,
  conteudo_titulo text,
  conteudo_resumo text,
  loja_id uuid,
  loja_nome text,
  motivo text,
  detalhes text,
  status text,
  denunciante_nome text,
  criado_em timestamptz,
  analisado_em timestamptz,
  analisado_por_nome text,
  justificativa_admin text,
  conteudo_ocultado boolean,
  conteudo_ativo boolean,
  total_registros bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select *
  from private.listar_denuncias_admin_core(
    p_status,
    p_tipo,
    p_busca,
    p_limite,
    p_offset,
    p_denuncia_id
  );
$$;

revoke all on function public.listar_denuncias_admin(
  text, text, text, integer, integer, uuid
) from public, anon, authenticated, service_role;

grant execute on function public.listar_denuncias_admin(
  text, text, text, integer, integer, uuid
) to authenticated;

comment on function public.listar_denuncias_admin(
  text, text, text, integer, integer, uuid
) is
  'RF-26: fila paginada de denúncias; permite localizar diretamente o ID recebido por notificação.';

commit;
