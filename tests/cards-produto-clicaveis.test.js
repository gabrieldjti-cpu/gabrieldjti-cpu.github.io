const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const raiz = path.resolve(__dirname, "..");

function ler(arquivo) {
    return fs.readFileSync(path.join(raiz, arquivo), "utf8");
}

test("cards da home abrem a página individual sem botão Ver produto", () => {
    const javascript = ler("js/pesquisa-global.js");

    assert.match(javascript, /class="produto-global-link-card"/);
    assert.match(javascript, /href="\$\{escaparAtributo\(link\)\}"/);
    assert.doesNotMatch(javascript, />\s*Ver produto\s*</i);
});

test("cards da categoria abrem a página individual sem botão Ver produto", () => {
    const javascript = ler("js/categoria.js");

    assert.match(javascript, /class="produto-global-link-card"/);
    assert.match(javascript, /href="\$\{escaparAtributo\(link\)\}"/);
    assert.doesNotMatch(javascript, />\s*Ver produto\s*</i);
});

test("cards da loja abrem a página individual do produto", () => {
    const javascript = ler("js/loja.js");

    assert.match(javascript, /class="produto-link-card"/);
    assert.match(javascript, /href="\$\{escaparHTML\(linkProduto\)\}"/);
    assert.doesNotMatch(javascript, /class="produto-link-detalhes"/);
});

test("ações internas dos cards permanecem acima do link clicável", () => {
    const cssGlobal = ler("css/pesquisa-global.css");
    const cssLoja = ler("css/loja-modern.css");
    const cssFavoritos = ler("components/favoritos.css");

    assert.match(cssGlobal, /\.produto-global-link-card\s*\{[\s\S]*?z-index:\s*1/);
    assert.match(cssLoja, /\.produto-link-card\s*\{[\s\S]*?z-index:\s*1/);
    assert.match(cssLoja, /\.produto \.btn-comprar\s*\{[\s\S]*?z-index:\s*2/);
    assert.match(cssFavoritos, /\.btn-favorito-produto\s*\{[\s\S]*?z-index:\s*4/);
});
