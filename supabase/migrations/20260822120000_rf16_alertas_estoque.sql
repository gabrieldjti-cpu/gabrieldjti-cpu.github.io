-- ============================================================
-- RF-16 — Estoque
-- Alertas configuráveis e histórico de movimentações
-- ============================================================

alter table public.produtos
    add column if not exists estoque_minimo integer not null default 5;

alter table public.produtos
    drop constraint if exists produtos_estoque_minimo_check;

alter table public.produtos
    add constraint produtos_estoque_minimo_check
    check (estoque_minimo >= 0 and estoque_minimo <= 1000000);

create index if not exists idx_produtos_loja_estoque_alerta
    on public.produtos (loja_id, estoque, estoque_minimo);

create table if not exists public.movimentacoes_estoque (
    id uuid primary key default gen_random_uuid(),
    loja_id uuid not null references public.lojas(id) on delete cascade,
    produto_id uuid references public.produtos(id) on delete set null,
    produto_nome text not null,
    estoque_anterior integer not null,
    estoque_novo integer not null,
    quantidade integer not null check (quantidade > 0),
    tipo text not null check (tipo in ('entrada', 'saida')),
    origem text not null default 'sistema',
    movimentado_por uuid references public.profiles(id) on delete set null,
    criado_em timestamptz not null default now()
);

create index if not exists idx_movimentacoes_estoque_loja_data
    on public.movimentacoes_estoque (loja_id, criado_em desc);

create index if not exists idx_movimentacoes_estoque_produto_data
    on public.movimentacoes_estoque (produto_id, criado_em desc);

alter table public.movimentacoes_estoque enable row level security;

revoke all on public.movimentacoes_estoque from anon, authenticated;
grant select on public.movimentacoes_estoque to authenticated;

drop policy if exists "Lojista visualiza movimentações da própria loja"
    on public.movimentacoes_estoque;

create policy "Lojista visualiza movimentações da própria loja"
    on public.movimentacoes_estoque
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.lojas l
            where l.id = movimentacoes_estoque.loja_id
              and l.proprietario_id = auth.uid()
        )
    );

create or replace function public.registrar_movimentacao_estoque()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_anterior integer;
    v_novo integer;
    v_quantidade integer;
    v_tipo text;
    v_origem text;
    v_proprietario uuid;
begin
    if tg_op = 'INSERT' then
        v_anterior := 0;
        v_novo := greatest(coalesce(new.estoque, 0), 0);

        if v_novo = 0 then
            return new;
        end if;
    else
        v_anterior := greatest(coalesce(old.estoque, 0), 0);
        v_novo := greatest(coalesce(new.estoque, 0), 0);

        if v_anterior = v_novo then
            return new;
        end if;
    end if;

    v_quantidade := abs(v_novo - v_anterior);
    v_tipo := case when v_novo > v_anterior then 'entrada' else 'saida' end;

    select l.proprietario_id
      into v_proprietario
      from public.lojas l
     where l.id = new.loja_id;

    v_origem := case
        when auth.uid() is null then 'sistema'
        when auth.uid() = v_proprietario then 'alteracao_lojista'
        else 'pedido_ou_cancelamento'
    end;

    insert into public.movimentacoes_estoque (
        loja_id,
        produto_id,
        produto_nome,
        estoque_anterior,
        estoque_novo,
        quantidade,
        tipo,
        origem,
        movimentado_por
    ) values (
        new.loja_id,
        new.id,
        coalesce(new.nome, 'Produto'),
        v_anterior,
        v_novo,
        v_quantidade,
        v_tipo,
        v_origem,
        auth.uid()
    );

    return new;
end;
$$;

revoke all on function public.registrar_movimentacao_estoque() from public, anon, authenticated;

drop trigger if exists trg_registrar_movimentacao_estoque on public.produtos;

create trigger trg_registrar_movimentacao_estoque
after insert or update of estoque
on public.produtos
for each row
execute function public.registrar_movimentacao_estoque();
