const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");
const ler = arquivo => fs.readFileSync(path.join(raiz, arquivo), "utf8");

for (const [pagina, formulario, ordenacao] of [
    ["index.html", "filtros-produtos-globais", "ordenacao-produtos-globais"],
    ["categoria.html", "filtros-categoria", "ordenacao-categoria"]
]) {
    test(`${pagina}: filtros recolhidos atrás do botão "Filtros"`, () => {
        const html = ler(pagina);
        assert.match(html, new RegExp(`class="filtros-barra" data-formulario="${formulario}" data-ordenacao="${ordenacao}"`));
        assert.match(html, new RegExp(`aria-controls="${formulario}"`));
        assert.match(html, /class="contador-filtros"/);
        assert.match(html, /class="ordenar-rapido"/);
        assert.match(html, /class="btn-ver-anuncios"/);
        assert.match(html, new RegExp(`id="${formulario}" class="[^"]*filtros-recolhiveis`));
        assert.match(html, /css\/filtros-compactos\.css/);
        assert.match(html, /js\/filtros-compactos\.js/);
    });
}

test("categoria: pesquisa fica na barra, fora do painel", () => {
    const html = ler("categoria.html");
    const barra = html.indexOf('class="filtros-barra"');
    const pesquisa = html.indexOf('id="pesquisa-produtos-categoria"');
    const painel = html.indexOf('<form id="filtros-categoria"');
    assert.ok(barra < pesquisa && pesquisa < painel);
});

test("painel recolhido no celular e no computador", () => {
    const css = ler("css/filtros-compactos.css");
    assert.match(css, /^\.filtros-recolhiveis \{\s*display: none !important;/m);
    assert.match(css, /\.filtros-recolhiveis\.aberto \{\s*display: grid !important;/);

    const js = ler("js/filtros-compactos.js");
    assert.match(js, /aria-expanded/);
    assert.match(js, /dispatchEvent\(new Event\("change"/);
    assert.match(js, /\.filtros-barra\[data-formulario\]/);
});
