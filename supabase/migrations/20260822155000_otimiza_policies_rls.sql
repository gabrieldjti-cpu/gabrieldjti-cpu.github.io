-- =========================================================
-- OTIMIZAÇÃO DE POLICIES RLS
-- Mantém as mesmas regras, reduzindo reavaliações de auth.uid()
-- e unificando policies permissivas equivalentes.
-- =========================================================

-- ---------------------------------------------------------
-- PROFILES
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Usuário pode visualizar seu perfil" ON public.profiles;
CREATE POLICY "Usuário pode visualizar seu perfil"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Usuário pode inserir seu perfil" ON public.profiles;
CREATE POLICY "Usuário pode inserir seu perfil"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Usuário pode atualizar seu perfil" ON public.profiles;
CREATE POLICY "Usuário pode atualizar seu perfil"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- ---------------------------------------------------------
-- LOJAS
-- Uma única policy SELECT atende público + proprietário.
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Proprietário visualiza própria loja" ON public.lojas;
DROP POLICY IF EXISTS "Público visualiza lojas aprovadas e ativas" ON public.lojas;

CREATE POLICY "Catálogo público e loja do proprietário"
ON public.lojas
FOR SELECT
TO public
USING (
    (ativa = true AND status_aprovacao = 'aprovada')
    OR proprietario_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS "Usuário pode criar sua loja" ON public.lojas;
CREATE POLICY "Usuário pode criar sua loja"
ON public.lojas
FOR INSERT
TO authenticated
WITH CHECK (proprietario_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Usuário pode editar sua loja" ON public.lojas;
CREATE POLICY "Usuário pode editar sua loja"
ON public.lojas
FOR UPDATE
TO authenticated
USING (proprietario_id = (SELECT auth.uid()))
WITH CHECK (proprietario_id = (SELECT auth.uid()));

-- ---------------------------------------------------------
-- PRODUTOS
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Lojista pode cadastrar produtos" ON public.produtos;
CREATE POLICY "Lojista pode cadastrar produtos"
ON public.produtos
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.lojas l
        WHERE l.id = produtos.loja_id
          AND l.proprietario_id = (SELECT auth.uid())
    )
);

DROP POLICY IF EXISTS "Lojista pode editar produtos" ON public.produtos;
CREATE POLICY "Lojista pode editar produtos"
ON public.produtos
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.lojas l
        WHERE l.id = produtos.loja_id
          AND l.proprietario_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.lojas l
        WHERE l.id = produtos.loja_id
          AND l.proprietario_id = (SELECT auth.uid())
    )
);

DROP POLICY IF EXISTS "Catálogo público e produtos do proprietário" ON public.produtos;
CREATE POLICY "Catálogo público e produtos do proprietário"
ON public.produtos
FOR SELECT
TO public
USING (
    (
        ativo = true
        AND EXISTS (
            SELECT 1
            FROM public.lojas l
            WHERE l.id = produtos.loja_id
              AND l.ativa = true
              AND l.status_aprovacao = 'aprovada'
        )
    )
    OR EXISTS (
        SELECT 1
        FROM public.lojas l
        WHERE l.id = produtos.loja_id
          AND l.proprietario_id = (SELECT auth.uid())
    )
);

-- ---------------------------------------------------------
-- PEDIDOS
-- Uma única policy SELECT atende cliente ou lojista.
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Cliente visualiza seus pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Loja visualiza pedidos" ON public.pedidos;

CREATE POLICY "Cliente ou loja visualiza pedidos"
ON public.pedidos
FOR SELECT
TO authenticated
USING (
    cliente_id = (SELECT auth.uid())
    OR EXISTS (
        SELECT 1
        FROM public.lojas l
        WHERE l.id = pedidos.loja_id
          AND l.proprietario_id = (SELECT auth.uid())
    )
);

-- ---------------------------------------------------------
-- ITENS DE PEDIDO
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Visualizar itens" ON public.itens_pedido;
CREATE POLICY "Visualizar itens"
ON public.itens_pedido
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.pedidos p
        WHERE p.id = itens_pedido.pedido_id
          AND (
              p.cliente_id = (SELECT auth.uid())
              OR EXISTS (
                  SELECT 1
                  FROM public.lojas l
                  WHERE l.id = p.loja_id
                    AND l.proprietario_id = (SELECT auth.uid())
              )
          )
    )
);

-- ---------------------------------------------------------
-- AVALIAÇÕES
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Cliente visualiza próprias avaliações" ON public.avaliacoes;
CREATE POLICY "Cliente visualiza próprias avaliações"
ON public.avaliacoes
FOR SELECT
TO authenticated
USING (cliente_id = (SELECT auth.uid()));

-- ---------------------------------------------------------
-- MOVIMENTAÇÕES DE ESTOQUE
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Lojista visualiza movimentações da própria loja" ON public.movimentacoes_estoque;
CREATE POLICY "Lojista visualiza movimentações da própria loja"
ON public.movimentacoes_estoque
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.lojas l
        WHERE l.id = movimentacoes_estoque.loja_id
          AND l.proprietario_id = (SELECT auth.uid())
    )
);
