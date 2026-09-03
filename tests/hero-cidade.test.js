const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(raiz, "index.html"), "utf8");
const css = fs.readFileSync(path.join(raiz, "css", "style.css"), "utf8");
const imagem = path.join(raiz, "assets", "jacinto-hero.webp");

test("a foto tratada da cidade existe e está otimizada", () => {
    assert.ok(fs.existsSync(imagem));
    assert.ok(fs.statSync(imagem).size < 400 * 1024, "A imagem do hero está pesada demais.");
});

test("a home antecipa o carregamento da imagem principal", () => {
    assert.match(html, /rel="preload" as="image" href="assets\/jacinto-hero\.webp"/);
    assert.match(html, /type="image\/webp"/);
});

test("a foto aparece apenas no hero e possui proteção de contraste responsiva", () => {
    assert.equal((css.match(/url\("\.\.\/assets\/jacinto-hero\.webp"\)/g) || []).length, 2);
    assert.match(css, /\.hero-home[\s\S]*linear-gradient[\s\S]*jacinto-hero\.webp/);
    assert.match(css, /@media \(max-width: 820px\)[\s\S]*\.hero-home[\s\S]*jacinto-hero\.webp/);
    assert.doesNotMatch(html, /<img[^>]+jacinto-hero/);
});
