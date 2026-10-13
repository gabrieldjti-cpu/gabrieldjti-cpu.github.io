const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");
const ler = arquivo => fs.readFileSync(path.join(raiz, arquivo), "utf8");

test("início: barra de filtros compacta no celular", () => {
    const html = ler("index.html");
    assert.match(html, /id="btn-abrir-filtros"[\s\S]*?aria-controls="filtros-produtos-globais"/);
    assert.match(html, /id="contador-filtros"/);
    assert.match(html, /id="ordenacao-rapida"/);
    assert.match(html, /id="btn-ver-anuncios"/);
    assert.match(html, /css\/filtros-compactos\.css/);
    assert.match(html, /js\/filtros-compactos\.js/);

    const css = ler("css/filtros-compactos.css");
    assert.match(css, /@media \(max-width: 820px\)[\s\S]*?\.filtros-produtos-globais \{\s*display: none !important;/);
    assert.match(css, /\.filtros-produtos-globais\.aberto \{\s*display: grid !important;/);

    const js = ler("js/filtros-compactos.js");
    assert.match(js, /aria-expanded/);
    assert.match(js, /dispatchEvent\(new Event\("change"/);
});
