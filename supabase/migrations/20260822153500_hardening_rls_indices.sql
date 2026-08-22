-- =========================================================
-- HARDENING DE RLS, GRANTS, STORAGE E ÍNDICES
-- Comércio da Cidade
-- =========================================================

-- ---------------------------------------------------------
-- 1. PEDIDOS E ITENS: escrita somente pelas RPCs seguras
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Cliente cria pedido" ON public.pedidos;
DROP POLICY IF EXISTS "Loja atualiza pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Inserir itens" ON public.itens_pedido;

REVOKE ALL PRIVILEGES ON TABLE public.pedidos FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.itens_pedido FROM anon, authenticated;

GRANT SELECT ON TABLE public.pedidos TO authenticated;
GRANT SELECT ON TABLE public.itens_pedido TO authenticated;

-- ---------------------------------------------------------
-- 2. LOJAS: impedir exclusão física pelo navegador
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Usuário pode excluir sua loja" ON public.lojas;

REVOKE ALL PRIVILEGES ON TABLE public.lojas FROM anon, authenticated;
GRANT SELECT ON TABLE public.lojas TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.lojas TO authenticated;

-- ---------------------------------------------------------
-- 3. PRODUTOS: manter cadastro/edição, remover hard delete
--    e limpar policies duplicadas antigas
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Excluir produtos" ON public.produtos;
DROP POLICY IF EXISTS "Inserir produtos" ON public.produtos;
DROP POLICY IF EXISTS "Atualizar produtos" ON public.produtos;
DROP POLICY IF EXISTS "Lojista pode excluir produtos" ON public.produtos;

REVOKE ALL PRIVILEGES ON TABLE public.produtos FROM anon, authenticated;
GRANT SELECT ON TABLE public.produtos TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.produtos TO authenticated;

-- ---------------------------------------------------------
-- 4. PROFILES: remover policies equivalentes antigas
--    e privilégios que o frontend não precisa
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Usuário pode inserir seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuário pode visualizar seu próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Usuário pode atualizar seu próprio perfil" ON public.profiles;

REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM anon;
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.profiles FROM authenticated;

-- ---------------------------------------------------------
-- 5. OUTRAS TABELAS: remover grants herdados excessivos
-- ---------------------------------------------------------

REVOKE ALL PRIVILEGES ON TABLE public.avaliacoes FROM anon, authenticated;
GRANT SELECT ON TABLE public.avaliacoes TO authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.categorias FROM anon, authenticated;
GRANT SELECT ON TABLE public.categorias TO anon, authenticated;

REVOKE ALL PRIVILEGES ON TABLE public.historico_status_lojas FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.solicitacoes_cancelamento FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.teste FROM anon, authenticated;

-- ---------------------------------------------------------
-- 6. PRODUTO_IMAGENS: mutations somente para authenticated
--    e vinculadas à loja do usuário
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Inserir imagens" ON public.produto_imagens;
DROP POLICY IF EXISTS "Editar imagens" ON public.produto_imagens;
DROP POLICY IF EXISTS "Excluir imagens" ON public.produto_imagens;

CREATE POLICY "Inserir imagens"
ON public.produto_imagens
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.produtos p
        JOIN public.lojas l ON l.id = p.loja_id
        WHERE p.id = produto_imagens.produto_id
          AND l.proprietario_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Editar imagens"
ON public.produto_imagens
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.produtos p
        JOIN public.lojas l ON l.id = p.loja_id
        WHERE p.id = produto_imagens.produto_id
          AND l.proprietario_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.produtos p
        JOIN public.lojas l ON l.id = p.loja_id
        WHERE p.id = produto_imagens.produto_id
          AND l.proprietario_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Excluir imagens"
ON public.produto_imagens
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.produtos p
        JOIN public.lojas l ON l.id = p.loja_id
        WHERE p.id = produto_imagens.produto_id
          AND l.proprietario_id = (SELECT auth.uid())
    )
);

REVOKE ALL PRIVILEGES ON TABLE public.produto_imagens FROM anon, authenticated;
GRANT SELECT ON TABLE public.produto_imagens TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.produto_imagens TO authenticated;

-- ---------------------------------------------------------
-- 7. STORAGE DE PRODUTOS: cada usuário só altera seus arquivos
-- ---------------------------------------------------------

DROP POLICY IF EXISTS "Upload imagens produtos" ON storage.objects;
DROP POLICY IF EXISTS "Atualizar imagens produtos" ON storage.objects;
DROP POLICY IF EXISTS "Excluir imagens produtos" ON storage.objects;

DROP POLICY IF EXISTS "produtos_insert_owner" ON storage.objects;
DROP POLICY IF EXISTS "produtos_update_owner" ON storage.objects;
DROP POLICY IF EXISTS "produtos_delete_owner" ON storage.objects;

CREATE POLICY "produtos_insert_owner"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'produtos'
    AND owner_id = (SELECT auth.uid())::text
);

CREATE POLICY "produtos_update_owner"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'produtos'
    AND owner_id = (SELECT auth.uid())::text
)
WITH CHECK (
    bucket_id = 'produtos'
    AND owner_id = (SELECT auth.uid())::text
);

CREATE POLICY "produtos_delete_owner"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'produtos'
    AND owner_id = (SELECT auth.uid())::text
);

-- Limites de upload para novos arquivos. Não remove arquivos existentes.
UPDATE storage.buckets
SET
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
WHERE id IN ('produtos', 'logos-lojas');

-- ---------------------------------------------------------
-- 8. ÍNDICES PARA FOREIGN KEYS SEM COBERTURA
-- ---------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_historico_status_lojas_alterado_por
    ON public.historico_status_lojas(alterado_por);

CREATE INDEX IF NOT EXISTS idx_itens_pedido_pedido_id
    ON public.itens_pedido(pedido_id);

CREATE INDEX IF NOT EXISTS idx_itens_pedido_produto_id
    ON public.itens_pedido(produto_id);

CREATE INDEX IF NOT EXISTS idx_lojas_aprovado_por
    ON public.lojas(aprovado_por);

CREATE INDEX IF NOT EXISTS idx_lojas_categoria_id
    ON public.lojas(categoria_id);

CREATE INDEX IF NOT EXISTS idx_lojas_proprietario_id
    ON public.lojas(proprietario_id);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_movimentado_por
    ON public.movimentacoes_estoque(movimentado_por);

CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id_created_at
    ON public.pedidos(cliente_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pedidos_loja_id_created_at
    ON public.pedidos(loja_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_produto_imagens_produto_id
    ON public.produto_imagens(produto_id);

CREATE INDEX IF NOT EXISTS idx_produtos_categoria_id
    ON public.produtos(categoria_id);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_cancelamento_respondido_por
    ON public.solicitacoes_cancelamento(respondido_por);
