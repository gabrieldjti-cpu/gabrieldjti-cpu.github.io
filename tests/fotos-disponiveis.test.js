const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");
const ler = arquivo => fs.readFileSync(path.join(raiz, arquivo), "utf8");

test("formulários têm o campo de mais fotos e carregam o script", () => {
    for (const pagina of ["novo-produto.html", "editar-produto.html"]) {
        const html = ler(pagina);
        assert.match(html, /id="fotosExtras"[\s\S]*?multiple/, pagina);
        assert.match(html, /id="listaFotosExtras"/, pagina);
        assert.match(html, /js\/anuncio-fotos\.js/, pagina);
        assert.match(html, /foto principal/i, pagina);
    }
    assert.match(ler("js/novo-produto.js"), /anuncioFotos\?\.temNovas\(\)/);
    assert.match(ler("js/editar-produto.js"), /anuncioFotos\.enviar\(produtoId, lojaId\)/);
});

test("até 4 fotos extras (5 no total) na tela e no banco", () => {
    assert.match(ler("js/anuncio-fotos.js"), /MAX_EXTRAS = 4/);
    const sql = ler("supabase/migrations/20261013100000_anuncio_ate_5_fotos.sql");
    assert.match(sql, /pendente boolean/);
    assert.match(sql, />= 4/);
    assert.match(sql, /edicoes_anuncio/);
});

test("página do anúncio não mostra foto aguardando aprovação", () => {
    assert.match(ler("js/produto.js"), /\.eq\("pendente", false\)/);
});

test("imagens dos cards não são cortadas", () => {
    const regras = [
        ["css/produtos.css", /\.produto-card img\s*\{[^}]*object-fit:\s*contain/],
        ["css/pesquisa-global.css", /\.produto-global-imagem img\s*\{[^}]*object-fit:\s*contain/],
        ["css/loja.css", /\.imagem-produto\s*\{[^}]*object-fit:\s*contain/]
    ];
    for (const [arquivo, regra] of regras) {
        assert.match(ler(arquivo), regra, arquivo);
    }
});

test("início e categorias mostram só anúncios disponíveis", () => {
    assert.match(ler("js/pesquisa-global.js"), /p_disponibilidade: "estoque"/);
    assert.match(ler("js/categoria.js"), /p_disponibilidade: "estoque"/);
    assert.doesNotMatch(ler("index.html"), /filtro-disponibilidade-produto/);
    assert.doesNotMatch(ler("categoria.html"), /disponibilidade-categoria/);
});

test("início no celular: hero não passa da tela e o botão de busca fica só com a lupa", () => {
    const css = ler("css/style.css");
    assert.match(css, /grid-template-columns: minmax\(0, 1fr\);[\s\S]*?\.hero-conteudo \{\s*min-width: 0;/);
    assert.match(css, /\.hero-home \.pesquisa-home button \{\s*width: 48px;[\s\S]*?font-size: 0;/);
});
