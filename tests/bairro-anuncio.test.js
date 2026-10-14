const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");
const ler = arquivo => fs.readFileSync(path.join(raiz, arquivo), "utf8");
const migration = ler("supabase/migrations/20261013210000_bairro_anuncio.sql");

test("banco: bairro opcional, na aprovação e no plano grátis", () => {
    assert.match(migration, /add column if not exists bairro text/);
    assert.match(migration, /bairro is null or char_length\(bairro\) between 2 and 60/);
    assert.match(migration, /new\.bairro is distinct from old\.bairro/);
    assert.match(migration, /'bairro', new\.bairro/);
    assert.match(migration, /bairro = case when v_dados \? 'bairro'/);
    assert.match(migration, /'bairro_atual', p\.bairro/);
    assert.doesNotMatch(migration, /\bdrop\b/i);
});

test("banco: busca com filtro de bairro e lista de bairros", () => {
    assert.match(migration, /function public\.buscar_anuncios\(/);
    assert.match(migration, /p_bairro text default null/);
    assert.match(migration, /normalizar_texto_busca\(p_bairro\)/);
    assert.match(migration, /function public\.listar_bairros_anuncios\(\)/);
});

test("formulários: campo bairro opcional", () => {
    for (const pagina of ["novo-produto.html", "editar-produto.html"]) {
        const html = ler(pagina);
        assert.match(html, /id="bairro"/, pagina);
        assert.match(html, /\(opcional\)/, pagina);
        assert.doesNotMatch(html, /id="bairro"[^>]*required/, pagina);
    }
    for (const arquivo of ["js/novo-produto.js", "js/editar-produto.js"]) {
        assert.match(ler(arquivo), /bairro:\s*lerBairroAnuncio\(\)/, arquivo);
    }
    assert.match(ler("js/novo-produto.js"), /preencherBairroDoPerfil/);
});

test("filtros e cards mostram o bairro", () => {
    assert.match(ler("index.html"), /id="filtro-bairro-produto"/);
    assert.match(ler("categoria.html"), /id="bairro-categoria"/);
    for (const arquivo of ["js/pesquisa-global.js", "js/categoria.js"]) {
        const js = ler(arquivo);
        assert.match(js, /p_bairro: estado\.bairro \|\| null/, arquivo);
        assert.match(js, /rpc\("listar_bairros_anuncios"\)/, arquivo);
        assert.match(js, /produto-global-bairro/, arquivo);
        assert.match(js, /atualizarParametro\(url, "bairro"/, arquivo);
    }
    assert.match(ler("produto.html"), /id="detalheBairroProduto"/);
});
