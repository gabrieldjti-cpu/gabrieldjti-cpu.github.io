const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");

function ler(arquivo) {
    return fs.readFileSync(path.join(raiz, arquivo), "utf8");
}

test("produto e avaliações oferecem denúncia autenticada", () => {
    const html = ler("produto.html");
    const produto = ler("js/produto.js");
    const moderacao = ler("js/moderacao-conteudo.js");

    assert.match(html, /id="denunciarProduto"[\s\S]*data-tipo-conteudo="produto"/);
    assert.match(html, /css\/moderacao-conteudo\.css/);
    assert.match(html, /js\/moderacao-conteudo\.js/);
    assert.match(produto, /data-tipo-conteudo="avaliacao"/);
    assert.match(produto, /data-conteudo-id="\$\{escaparAtributo\(avaliacaoId\)\}"/);
    assert.match(moderacao, /auth\.getSession\(\)/);
    assert.match(moderacao, /destino_apos_login_moderacao/);
    assert.match(moderacao, /rpc\("criar_denuncia_conteudo"/);
    assert.match(moderacao, /motivo === "outro"[\s\S]*detalhes\.length < 10/);
});

test("o painel de moderação possui fila, filtros, decisão e histórico", () => {
    const html = ler("admin-moderacao.html");
    const codigo = ler("js/admin-moderacao.js");

    for (const id of [
        "metricaTotalDenuncias",
        "metricaDenunciasPendentes",
        "buscaModeracao",
        "filtroStatusModeracao",
        "filtroTipoModeracao",
        "listaModeracao",
        "paginacaoModeracao",
        "modalDecisaoModeracao",
        "modalHistoricoModeracao"
    ]) {
        assert.match(html, new RegExp(`id=["']${id}["']`));
    }

    assert.match(codigo, /rpc\("sou_admin"\)/);
    assert.match(codigo, /rpc\("resumo_moderacao_admin"\)/);
    assert.match(codigo, /rpc\("listar_denuncias_admin"/);
    assert.match(codigo, /rpc\("resolver_denuncia_conteudo"/);
    assert.match(codigo, /rpc\("listar_historico_moderacao_admin"/);
    assert.match(codigo, /p_limite: estado\.porPagina/);
    assert.match(codigo, /p_offset: offset/);
    assert.match(codigo, /p_denuncia_id: estado\.denunciaId/);
    assert.match(codigo, /escaparHTML\(item\.conteudo_titulo/);
});

test("todas as páginas administrativas apontam para a moderação", () => {
    for (const arquivo of [
        "admin-dashboard.html",
        "admin-usuarios.html",
        "admin-categorias.html",
        "admin-moderacao.html"
    ]) {
        assert.match(ler(arquivo), /href="admin-moderacao\.html"/);
    }
});

test("a migration protege denúncias, bloqueia abuso e preserva auditoria", () => {
    const migration = ler("supabase/migrations/20260904214706_rf26_moderacao_conteudo.sql");

    assert.match(migration, /create table public\.denuncias_conteudo/);
    assert.match(migration, /create table public\.historico_moderacao/);
    assert.match(migration, /alter table public\.denuncias_conteudo enable row level security/);
    assert.match(migration, /alter table public\.historico_moderacao enable row level security/);
    assert.match(migration, /grant select on table public\.denuncias_conteudo to authenticated/);
    assert.match(migration, /using \(\(select auth\.uid\(\)\) = denunciante_id\)/);
    assert.match(migration, /denuncias_produto_pendente_usuario_idx/);
    assert.match(migration, /denuncias_avaliacao_pendente_usuario_idx/);
    assert.match(migration, /limite de 10 denúncias em 24 horas/);
    assert.match(migration, /security definer\n\+?set search_path = ''/);
    assert.match(migration, /public\._usuario_e_admin\(v_uid\)/);
    assert.match(migration, /moderado_em = pg_catalog\.now\(\)/);
    assert.match(migration, /conteudo_ocultado/);

    const hardening = ler("supabase/migrations/20260904220343_rf26_hardening_moderacao.sql");
    assert.match(hardening, /p_denuncia_id uuid default null/);
    assert.match(hardening, /p_denuncia_id is null or base\.id = p_denuncia_id/);

    const indices = ler("supabase/migrations/20260904220632_rf26_indices_fks_moderacao.sql");
    assert.match(indices, /produtos_moderado_por_idx/);
    assert.match(indices, /avaliacoes_moderado_por_idx/);
    assert.match(indices, /denuncias_loja_id_idx/);
    assert.match(indices, /denuncias_analisado_por_idx/);
});

test("avaliações moderadas saem do público e das métricas", () => {
    const migration = ler("supabase/migrations/20260904214706_rf26_moderacao_conteudo.sql");

    assert.match(migration, /add column if not exists ativo boolean not null default true/);
    assert.match(migration, /where avaliacao\.ativo is true[\s\S]*group by avaliacao\.produto_id/);
    assert.match(migration, /update of produto_id, nota, ativo/);
    assert.match(migration, /listar_avaliacoes_produto[\s\S]*avaliacao\.moderado_em is null/);
    assert.match(migration, /obter_resumo_avaliacoes_produto[\s\S]*avaliacao\.ativo is true/);
    assert.match(migration, /A resposta não pode ser alterada após uma denúncia/);
});

test("notificações incluem o ciclo de moderação", () => {
    const migration = ler("supabase/migrations/20260904214706_rf26_moderacao_conteudo.sql");
    const pagina = ler("notificacoes.html");
    const codigo = ler("js/notificacoes.js");

    for (const tipo of ["moderacao_nova", "moderacao_resolvida", "conteudo_moderado"]) {
        assert.match(migration, new RegExp(tipo));
        assert.match(codigo, new RegExp(tipo));
    }
    assert.match(pagina, /option value="moderacao"/);
});

test("referências locais das páginas alteradas existem", () => {
    for (const arquivo of ["produto.html", "admin-moderacao.html"]) {
        const referencias = [...ler(arquivo).matchAll(/(?:href|src)="([^"]+)"/g)]
            .map(resultado => resultado[1])
            .filter(valor => !/^(?:https?:|#)/.test(valor))
            .map(valor => valor.split(/[?#]/)[0]);

        referencias.forEach(referencia => {
            assert.ok(fs.existsSync(path.join(raiz, referencia)), `Referência inexistente em ${arquivo}: ${referencia}`);
        });
    }
});
