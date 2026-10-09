const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");
const ler = arquivo => fs.readFileSync(path.join(raiz, arquivo), "utf8");

const migration = ler("supabase/migrations/20261009000000_classificados_condicao_disponibilidade.sql");

test("categoria marca se pede novo ou usado e a subcategoria herda", () => {
    assert.match(migration, /add column if not exists pede_condicao boolean not null default false/);
    assert.match(migration, /c\.pede_condicao or coalesce\(pai\.pede_condicao, false\)/);
    assert.match(migration, /'Casa e móveis'/);
    assert.match(ler("admin-categorias.html"), /id="categoriaAdminCondicao"/);
    assert.match(ler("js/admin-categorias.js"), /pede_condicao: pedeCondicao/);
});

test("o banco exige a condição só onde faz sentido e guarda disponível como 0 ou 1", () => {
    assert.match(migration, /check \(condicao is null or condicao in \('novo', 'usado'\)\)/);
    assert.match(migration, /raise exception 'Informe se o produto é novo ou usado\.'/);
    assert.match(migration, /new\.estoque := case when coalesce\(new\.estoque, 0\) > 0 then 1 else 0 end/);
    // Roda antes do gatilho que manda a edição para a fila do admin.
    assert.ok("trg_ajustar_condicao_disponibilidade" < "trg_aplicar_limite_plano_gratuito");
    assert.ok("trg_ajustar_condicao_disponibilidade" < "trg_controlar_aprovacao_anuncio");
});

test("mudar a condição é edição: vai para a fila e é travada no plano grátis", () => {
    assert.match(migration, /'condicao', new\.condicao,/);
    assert.match(migration, /new\.condicao := old\.condicao;/);
    assert.match(migration, /when v_dados \? 'condicao'/);
    const gratis = migration.slice(migration.indexOf("function private.proteger_edicao_anuncio_gratuito"));
    assert.match(gratis.slice(0, gratis.indexOf("$$;")), /new\.condicao is distinct from old\.condicao/);
});

test("formulários trocam o estoque por disponível/indisponível e pedem a condição", () => {
    for (const arquivo of ["novo-produto.html", "editar-produto.html"]) {
        const html = ler(arquivo);
        assert.match(html, /id="disponibilidade"/);
        assert.match(html, /<input type="hidden" id="estoque"/);
        assert.match(html, /id="campo-condicao" hidden/);
        assert.match(html, /js\/anuncio-campos\.js/);
        assert.doesNotMatch(html, /type="number"\s+id="estoque"/);
    }
    assert.match(ler("js/novo-produto.js"), /condicao:\s+window\.anuncioCampos\?\.condicao\(\)/);
    assert.match(ler("js/editar-produto.js"), /window\.anuncioCampos\?\.preencher\(produto\)/);
});

test("busca filtra por condição e mostra o selo", () => {
    assert.match(migration, /function public\.buscar_anuncios_publicos/);
    assert.match(migration, /p_condicao text DEFAULT NULL::text/);
    assert.match(migration, /or p\.condicao = p_condicao/);
    assert.match(ler("index.html"), /id="filtro-condicao-produto"/);
    assert.match(ler("categoria.html"), /id="condicao-categoria"/);
    for (const arquivo of ["js/pesquisa-global.js", "js/categoria.js"]) {
        const codigo = ler(arquivo);
        assert.match(codigo, /rpc\("buscar_anuncios_publicos"/);
        assert.doesNotMatch(codigo, /rpc\("buscar_produtos_publicos"/);
        assert.match(codigo, /p_condicao:/);
        assert.match(codigo, /condicao-anuncio/);
    }
    assert.match(ler("produto.html"), /id="detalheCondicaoProduto"/);
});
