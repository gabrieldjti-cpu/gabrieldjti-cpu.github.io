const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(raiz, "editar-loja.html"), "utf8");
const codigo = fs.readFileSync(path.join(raiz, "js", "editar-loja.js"), "utf8");

test("edição da loja permite adicionar e visualizar o banner", () => {
    assert.match(html, /id="banner"/);
    assert.match(html, /id="preview-banner"/);
    assert.match(codigo, /atualizarPreviewBanner\(dados\.banner_url\)/);
    assert.match(codigo, /from\("banners-lojas"\)\.upload/);
    assert.match(codigo, /banner_url:\s*bannerUrl/);
});

test("banner aceita apenas imagens permitidas com até 5 MB", () => {
    assert.match(codigo, /image\/jpeg/);
    assert.match(codigo, /image\/png/);
    assert.match(codigo, /image\/webp/);
    assert.match(codigo, /5 \* 1024 \* 1024/);
});
