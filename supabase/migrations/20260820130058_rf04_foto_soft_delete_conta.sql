-- RF-04 — foto de perfil e exclusão de conta por soft delete

alter table public.profiles
    add column if not exists ativo boolean;

update public.profiles
set ativo = true
where ativo is null;

alter table public.profiles
    alter column ativo set default true,
    alter column ativo set not null;

alter table public.profiles
    add column if not exists excluido_em timestamptz;

comment on column public.profiles.foto_url is
    'Caminho do objeto no bucket avatars. URLs legadas continuam aceitas pelo frontend.';

comment on column public.profiles.ativo is
    'Indica se a conta está ativa para uso normal no marketplace.';

comment on column public.profiles.excluido_em is
    'Data/hora da exclusão lógica da conta. O usuário de auth é preservado para manter histórico e referências.';

create index if not exists idx_profiles_ativo_excluido
    on public.profiles (ativo, excluido_em);

-- Evita que o cliente altere flags sensíveis (ativo, excluido_em, tipo_usuario, id)
-- diretamente pelo PostgREST. Dados básicos continuam editáveis.
revoke update on table public.profiles from public, anon, authenticated;
grant update (nome, telefone, rua, numero, bairro, cidade)
    on public.profiles to authenticated;

-- Bucket público para leitura de avatar, com escrita isolada por pasta do usuário.
insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'avatars',
    'avatars',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_select_public" on storage.objects;
create policy "avatars_select_public"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_owner" on storage.objects;
create policy "avatars_insert_owner"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_update_owner" on storage.objects;
create policy "avatars_update_owner"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_delete_owner" on storage.objects;
create policy "avatars_delete_owner"
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
);

-- Verificação leve usada após login e em páginas autenticadas.
create or replace function public.minha_conta_ativa()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.ativo = true
          and p.excluido_em is null
    );
$$;

revoke all on function public.minha_conta_ativa() from public, anon;
grant execute on function public.minha_conta_ativa() to authenticated;

-- Atualização do avatar por RPC para impedir que o cliente escreva foto_url arbitrariamente.
create or replace function public.atualizar_foto_perfil(
    p_foto_path text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_path text := nullif(btrim(p_foto_path), '');
begin
    if v_uid is null then
        raise exception 'Autenticação obrigatória.';
    end if;

    if not exists (
        select 1
        from public.profiles p
        where p.id = v_uid
          and p.ativo = true
          and p.excluido_em is null
    ) then
        raise exception 'Conta inativa ou excluída.';
    end if;

    if v_path is not null then
        if length(v_path) > 500 then
            raise exception 'Caminho da foto inválido.';
        end if;

        if split_part(v_path, '/', 1) <> v_uid::text then
            raise exception 'A foto não pertence ao usuário autenticado.';
        end if;

        if v_path like '%..%' then
            raise exception 'Caminho da foto inválido.';
        end if;
    end if;

    update public.profiles
    set foto_url = v_path,
        atualizado_em = now()
    where id = v_uid;

    return v_path;
end;
$$;

revoke all on function public.atualizar_foto_perfil(text) from public, anon;
grant execute on function public.atualizar_foto_perfil(text) to authenticated;

-- Exclusão lógica: preserva perfil, pedidos e referências históricas.
-- Endereços ativos são desativados e lojas pertencentes ao usuário deixam de ficar ativas.
create or replace function public.excluir_minha_conta()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_lojas_desativadas integer := 0;
    v_enderecos_desativados integer := 0;
    v_ja_excluida boolean := false;
begin
    if v_uid is null then
        raise exception 'Autenticação obrigatória.';
    end if;

    select (not p.ativo or p.excluido_em is not null)
    into v_ja_excluida
    from public.profiles p
    where p.id = v_uid;

    if not found then
        raise exception 'Perfil não encontrado.';
    end if;

    if v_ja_excluida then
        return jsonb_build_object(
            'conta_excluida', true,
            'ja_estava_excluida', true,
            'lojas_desativadas', 0,
            'enderecos_desativados', 0
        );
    end if;

    update public.enderecos_cliente
    set ativo = false,
        padrao = false,
        excluido_em = coalesce(excluido_em, now()),
        atualizado_em = now()
    where cliente_id = v_uid
      and ativo = true
      and excluido_em is null;

    get diagnostics v_enderecos_desativados = row_count;

    update public.lojas
    set ativa = false
    where proprietario_id = v_uid
      and coalesce(ativa, false) = true;

    get diagnostics v_lojas_desativadas = row_count;

    update public.profiles
    set ativo = false,
        excluido_em = now(),
        foto_url = null,
        atualizado_em = now()
    where id = v_uid;

    return jsonb_build_object(
        'conta_excluida', true,
        'ja_estava_excluida', false,
        'lojas_desativadas', v_lojas_desativadas,
        'enderecos_desativados', v_enderecos_desativados
    );
end;
$$;

revoke all on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;
