-- Comércio da Cidade
-- Hardening de segurança do Supabase

begin;

-- ============================================================
-- CATEGORIAS DE PRODUTOS: RLS + LEITURA PÚBLICA CONTROLADA
-- ============================================================

alter table public.categorias_produtos
    enable row level security;

revoke all on table public.categorias_produtos
from anon, authenticated;

grant select on table public.categorias_produtos
to anon, authenticated;

drop policy if exists "Categorias de produtos ativas são públicas"
on public.categorias_produtos;

create policy "Categorias de produtos ativas são públicas"
on public.categorias_produtos
for select
to anon, authenticated
using (coalesce(ativa, true) = true);

-- ============================================================
-- CHECKOUT: SOMENTE USUÁRIO AUTENTICADO
-- ============================================================

revoke all on function public.finalizar_checkout(text, text, jsonb)
from public, anon;

grant execute on function public.finalizar_checkout(text, text, jsonb)
to authenticated;

-- ============================================================
-- FUNÇÕES INTERNAS: SEARCH PATH FIXO E SEM EXECUÇÃO VIA API
-- ============================================================

alter function public.handle_new_user()
    set search_path = public;

revoke all on function public.handle_new_user()
from public, anon, authenticated;

alter function public.vincular_lojista_automatico()
    set search_path = public;

revoke all on function public.vincular_lojista_automatico()
from public, anon, authenticated;

commit;
