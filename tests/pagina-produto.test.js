const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(raiz, "produto.html"), "utf8");
const codigo = fs.readFileSync(path.join(raiz, "js", "produto.js"), "utf8");

test("a página possui as áreas essenciais do detalhe do produto", () => {
    for (const id of [
        "conteudoProduto",
        "imagemProdutoPrincipal",
        "nomeProduto",
        "precoAtualProduto",
        "quantidadeProduto",
        "adicionarCarrinhoProduto",
        "comprarAgoraProduto",
        "favoritarProduto",
        "compartilharProduto",
        "nomeLojaProduto",
        "avaliacoesProduto",
        "listaProdutosRelacionados"
    ]) {
        assert.match(html, new RegExp(`id=["']${id}["']`));
    }
});

test("todos os elementos usados pelo JavaScript existem no HTML", () => {
    const bloco = codigo.match(/function mapearElementos\(\) \{([\s\S]*?)\.forEach\(id/);
    assert.ok(bloco, "Não foi possível localizar o mapa de elementos.");

    const ids = [...bloco[1].matchAll(/"([A-Za-z][A-Za-z0-9]+)"/g)]
        .map(resultado => resultado[1]);

    assert.ok(ids.length > 30, "O mapa de elementos parece incompleto.");
    ids.forEach(id => {
        assert.match(html, new RegExp(`id=["']${id}["']`), `Elemento ausente: ${id}`);
    });
});

test("a página preserva carrinho persistente e favoritos compartilhados", () => {
    assert.match(html, /components\/carrinho-sync\.js/);
    assert.match(html, /components\/favoritos\.js/);
    assert.match(codigo, /CarrinhoSync\?\.iniciar/);
    assert.match(codigo, /CarrinhoSync\?\.notificarAlteracao/);
    assert.match(codigo, /dataset\.favoritoProduto = produto\.id/);
});

test("o produto público exige item ativo e loja aprovada", () => {
    assert.match(codigo, /\.eq\("ativo", true\)/);
    assert.match(codigo, /loja\.ativa !== true/);
    assert.match(codigo, /loja\.status_aprovacao !== "aprovada"/);
    assert.match(codigo, /UUID\.test\(estado\.produtoId\)/);
});

test("avaliações e produtos relacionados usam as APIs públicas existentes", () => {
    assert.match(codigo, /obter_resumo_avaliacoes_produto/);
    assert.match(codigo, /listar_avaliacoes_produto/);
    assert.match(codigo, /buscar_produtos_publicos/);
    assert.match(codigo, /p_disponibilidade: "estoque"/);
});

test("busca, categoria e favoritos abrem a nova página individual", () => {
    for (const arquivo of [
        path.join(raiz, "js", "pesquisa-global.js"),
        path.join(raiz, "js", "categoria.js"),
        path.join(raiz, "js", "favoritos.js"),
        path.join(raiz, "js", "loja.js")
    ]) {
        const conteudo = fs.readFileSync(arquivo, "utf8");
        assert.match(conteudo, /produto\.html\?id=/);
        assert.doesNotMatch(conteudo, /loja\.html\?id=.*&produto=/);
    }
});

test("a página atualiza metadados e dados estruturados do produto", () => {
    assert.match(html, /property="og:type" content="product"/);
    assert.match(codigo, /application\/ld\+json/);
    assert.match(codigo, /"@type": "Product"/);
    assert.match(codigo, /"@type": "Offer"/);
});
