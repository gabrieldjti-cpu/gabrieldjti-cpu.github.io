const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");
const ler = arquivo => fs.readFileSync(path.join(raiz, arquivo), "utf8");

const paginasDeCompra = [
    "carrinho.html",
    "checkout.html",
    "meus-pedidos.html",
    "historico-compras.html",
    "pedidos-loja.html",
    "clientes-loja.html"
];

test("as páginas de compra foram removidas do site", () => {
    for (const pagina of paginasDeCompra) {
        assert.ok(!fs.existsSync(path.join(raiz, pagina)), `${pagina} ainda existe`);
    }
    for (const arquivo of ["js/carrinho.js", "js/checkout.js", "components/carrinho-sync.js", "js/meus-pedidos.js", "js/pedidos-loja.js"]) {
        assert.ok(!fs.existsSync(path.join(raiz, arquivo)), `${arquivo} ainda existe`);
    }
});

test("nenhuma página aponta para as páginas de compra removidas", () => {
    const paginas = fs.readdirSync(raiz).filter(nome => nome.endsWith(".html"));
    for (const pagina of paginas) {
        const html = ler(pagina);
        assert.doesNotMatch(html, /(href|src)="(carrinho|checkout|meus-pedidos|historico-compras|pedidos-loja|clientes-loja|avaliacoes-loja)\.html"/, pagina);
        assert.doesNotMatch(html, /carrinho-sync\.js|frete-loja\.js/, pagina);
    }
});

test("o cabeçalho não oferece mais o carrinho", () => {
    assert.doesNotMatch(ler("components/header.js"), /href="carrinho\.html"/);
});

test("os cartões de produto levam ao anúncio em vez do carrinho", () => {
    const loja = ler("js/loja.js");
    const favoritos = ler("js/favoritos.js");

    assert.match(loja, /Ver a oferta/);
    assert.doesNotMatch(loja, /adicionarCarrinho/);
    assert.match(favoritos, /Ver a oferta/);
    assert.doesNotMatch(favoritos, /adicionarAoCarrinho/);
});

test("nenhuma página ativa aponta para as páginas de compra", () => {
    const ativas = fs.readdirSync(raiz)
        .filter(arquivo => arquivo.endsWith(".html"))
        .filter(arquivo => !paginasDeCompra.includes(arquivo));

    for (const pagina of ativas) {
        const html = ler(pagina);
        // Links dentro de blocos marcados como desativados não contam.
        const visivel = html.replace(
            /<(section|div)[^>]*data-desativado="classificados"[\s\S]*?<\/\1>/g,
            ""
        );

        for (const destino of ["carrinho.html", "checkout.html"]) {
            assert.doesNotMatch(
                visivel,
                new RegExp(`href="${destino.replace(".", "\\.")}"`),
                `${pagina} ainda aponta para ${destino}`
            );
        }
    }
});
