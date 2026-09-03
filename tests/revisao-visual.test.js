const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");
const designCss = fs.readFileSync(
    path.join(raiz, "css", "design-system.css"),
    "utf8"
);
const designJs = fs.readFileSync(
    path.join(raiz, "js", "design-system.js"),
    "utf8"
);
const headerJs = fs.readFileSync(
    path.join(raiz, "components", "header.js"),
    "utf8"
);
const feedbackCss = fs.readFileSync(
    path.join(raiz, "components", "feedback.css"),
    "utf8"
);

test("todas as páginas carregam a base visual compartilhada no head", () => {
    const paginas = fs.readdirSync(raiz)
        .filter(arquivo => arquivo.endsWith(".html"));

    assert.ok(paginas.length >= 25, "A lista de páginas parece incompleta.");
    assert.match(feedbackCss, /^@import url\("\.\.\/css\/design-system\.css"\);/);

    paginas.forEach(arquivo => {
        const html = fs.readFileSync(path.join(raiz, arquivo), "utf8");
        assert.match(
            html,
            /components\/feedback\.css/,
            `${arquivo} não carrega a base visual compartilhada.`
        );
    });
});

test("páginas novas pertencem aos grupos visuais corretos", () => {
    assert.match(designJs, /lojista:[\s\S]*"clientes-loja\.html"/);
    assert.match(designJs, /admin:[\s\S]*"admin-usuarios\.html"/);
    assert.match(designJs, /publico:[\s\S]*"categoria\.html"/);
});

test("tema cobre consistência, responsividade e acessibilidade", () => {
    for (const trecho of [
        "--app-gradient",
        "--app-shadow-hover",
        ".ativo-pagina",
        ".topo-pagina",
        ".historico-topo",
        ".cabecalho-avaliacoes",
        ".admin-intro",
        "@media (max-width: 480px)",
        "@media (prefers-reduced-motion: reduce)",
        ":focus-visible"
    ]) {
        assert.ok(designCss.includes(trecho), `Regra visual ausente: ${trecho}`);
    }
});

test("cabeçalho indica visualmente a página atual", () => {
    assert.match(headerJs, /function marcarPaginaAtual\(\)/);
    assert.match(headerJs, /classList\.add\("ativo-pagina"\)/);
    assert.match(headerJs, /setAttribute\("aria-current", "page"\)/);
});

