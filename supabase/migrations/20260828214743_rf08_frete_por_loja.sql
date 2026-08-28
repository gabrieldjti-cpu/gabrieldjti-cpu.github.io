-- RF-08 e RF-09: taxa fixa de entrega por loja e snapshot do frete no pedido.

begin;

alter table public.lojas
  add column if not exists taxa_entrega numeric(10, 2) not null default 0;

comment on column public.lojas.taxa_entrega is
  'Taxa fixa de entrega cobrada uma vez por pedido da loja. Zero representa frete grátis.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'lojas_taxa_entrega_check'
      and conrelid = 'public.lojas'::regclass
  ) then
    alter table public.lojas
      add constraint lojas_taxa_entrega_check
      check (taxa_entrega between 0 and 9999.99);
  end if;
end;
$$;

alter table public.pedidos
  add column if not exists subtotal_produtos numeric(12, 2);

alter table public.pedidos
  add column if not exists frete numeric(12, 2) not null default 0;

update public.pedidos
set subtotal_produtos = valor_total
where subtotal_produtos is null;

alter table public.pedidos
  alter column subtotal_produtos set default 0,
  alter column subtotal_produtos set not null;

comment on column public.pedidos.subtotal_produtos is
  'Snapshot da soma dos itens do pedido antes de frete e descontos.';

comment on column public.pedidos.frete is
  'Snapshot da taxa de entrega cobrada pela loja no momento do checkout.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pedidos_subtotal_produtos_check'
      and conrelid = 'public.pedidos'::regclass
  ) then
    alter table public.pedidos
      add constraint pedidos_subtotal_produtos_check
      check (subtotal_produtos >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'pedidos_frete_check'
      and conrelid = 'public.pedidos'::regclass
  ) then
    alter table public.pedidos
      add constraint pedidos_frete_check
      check (frete >= 0);
  end if;
end;
$$;

create or replace function public.finalizar_checkout(
  p_forma_pagamento text,
  p_observacoes text,
  p_itens jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_item jsonb;
  v_produto public.produtos%rowtype;
  v_loja public.lojas%rowtype;
  v_loja_id public.lojas.id%type;
  v_pedido_id public.pedidos.id%type;
  v_quantidade integer;
  v_preco numeric;
  v_subtotal numeric(12, 2);
  v_frete numeric(12, 2);
  v_total numeric(12, 2);
  v_resultado jsonb := '[]'::jsonb;
begin
  if v_usuario is null then
    raise exception 'Usuário não autenticado.' using errcode = '42501';
  end if;

  if coalesce(trim(p_forma_pagamento), '') = '' then
    raise exception 'Forma de pagamento não informada.' using errcode = '22023';
  end if;

  if p_itens is null
     or jsonb_typeof(p_itens) <> 'array'
     or jsonb_array_length(p_itens) = 0 then
    raise exception 'Carrinho vazio.' using errcode = '22023';
  end if;

  if jsonb_array_length(p_itens) > 200 then
    raise exception 'O carrinho excede o limite de 200 produtos.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_itens) as item(value)
    group by item.value ->> 'produto_id'
    having count(*) > 1
  ) then
    raise exception 'O carrinho contém produtos duplicados.' using errcode = '22023';
  end if;

  -- Mantém a mesma ordem de bloqueio em checkouts concorrentes.
  perform produto.id
  from public.produtos produto
  join jsonb_array_elements(p_itens) as item(value)
    on produto.id::text = item.value ->> 'produto_id'
  order by produto.id
  for update of produto;

  for v_item in
    select value
    from jsonb_array_elements(p_itens)
  loop
    if coalesce(v_item ->> 'produto_id', '') = '' then
      raise exception 'Produto inválido.' using errcode = '22023';
    end if;

    begin
      v_quantidade := (v_item ->> 'quantidade')::integer;
    exception
      when others then
        raise exception 'Quantidade inválida.' using errcode = '22023';
    end;

    if v_quantidade < 1 or v_quantidade > 1000 then
      raise exception 'Quantidade inválida.' using errcode = '22023';
    end if;

    select produto.*
    into v_produto
    from public.produtos produto
    where produto.id::text = v_item ->> 'produto_id';

    if not found then
      raise exception 'Produto não encontrado.';
    end if;

    if not coalesce(v_produto.ativo, false) then
      raise exception 'O produto "%" não está disponível.', v_produto.nome;
    end if;

    select loja.*
    into v_loja
    from public.lojas loja
    where loja.id = v_produto.loja_id;

    if not found
       or v_loja.ativa is not true
       or v_loja.status_aprovacao <> 'aprovada' then
      raise exception 'A loja do produto "%" está indisponível.', v_produto.nome;
    end if;

    if coalesce(v_produto.estoque, 0) < v_quantidade then
      raise exception
        'Estoque insuficiente para "%". Disponível: %.',
        v_produto.nome,
        coalesce(v_produto.estoque, 0);
    end if;
  end loop;

  for v_loja_id in
    select distinct produto.loja_id
    from jsonb_array_elements(p_itens) as item(value)
    join public.produtos produto
      on produto.id::text = item.value ->> 'produto_id'
    order by produto.loja_id
  loop
    select loja.*
    into v_loja
    from public.lojas loja
    where loja.id = v_loja_id
    for share;

    if not found
       or v_loja.ativa is not true
       or v_loja.status_aprovacao <> 'aprovada' then
      raise exception 'Uma das lojas do carrinho está indisponível.';
    end if;

    select coalesce(
      sum(
        case
          when produto.preco_promocional is not null
               and produto.preco_promocional > 0
               and produto.preco_promocional < produto.preco
            then produto.preco_promocional
          else produto.preco
        end * (item.value ->> 'quantidade')::integer
      ),
      0
    )::numeric(12, 2)
    into v_subtotal
    from jsonb_array_elements(p_itens) as item(value)
    join public.produtos produto
      on produto.id::text = item.value ->> 'produto_id'
    where produto.loja_id = v_loja_id;

    v_frete := round(coalesce(v_loja.taxa_entrega, 0), 2);
    v_total := v_subtotal + v_frete;

    insert into public.pedidos (
      cliente_id,
      loja_id,
      subtotal_produtos,
      frete,
      valor_total,
      forma_pagamento,
      observacoes
    )
    values (
      v_usuario,
      v_loja_id,
      v_subtotal,
      v_frete,
      v_total,
      p_forma_pagamento,
      nullif(trim(p_observacoes), '')
    )
    returning id into v_pedido_id;

    for v_item in
      select item.value
      from jsonb_array_elements(p_itens) as item(value)
      join public.produtos produto
        on produto.id::text = item.value ->> 'produto_id'
      where produto.loja_id = v_loja_id
    loop
      select produto.*
      into v_produto
      from public.produtos produto
      where produto.id::text = v_item ->> 'produto_id'
      for update;

      v_quantidade := (v_item ->> 'quantidade')::integer;

      if coalesce(v_produto.estoque, 0) < v_quantidade then
        raise exception 'Estoque insuficiente para "%".', v_produto.nome;
      end if;

      if v_produto.preco_promocional is not null
         and v_produto.preco_promocional > 0
         and v_produto.preco_promocional < v_produto.preco then
        v_preco := v_produto.preco_promocional;
      else
        v_preco := v_produto.preco;
      end if;

      insert into public.itens_pedido (
        pedido_id,
        produto_id,
        quantidade,
        preco_unitario,
        subtotal
      )
      values (
        v_pedido_id,
        v_produto.id,
        v_quantidade,
        v_preco,
        v_preco * v_quantidade
      );

      update public.produtos
      set estoque = estoque - v_quantidade
      where id = v_produto.id;
    end loop;

    v_resultado := v_resultado || jsonb_build_array(
      jsonb_build_object(
        'pedido_id', v_pedido_id,
        'loja_id', v_loja_id,
        'subtotal_produtos', v_subtotal,
        'frete', v_frete,
        'valor_total', v_total
      )
    );
  end loop;

  return v_resultado;
end;
$$;

revoke all on function public.finalizar_checkout(text, text, jsonb)
  from public, anon, authenticated;

comment on function public.finalizar_checkout(text, text, jsonb) is
  'Checkout interno: recalcula preços e frete por loja, cria pedidos e reduz estoque atomicamente.';

commit;
