const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");
const ler = arquivo => fs.readFileSync(path.join(raiz, arquivo), "utf8");
const migration = ler("supabase/migrations/20261013200000_destaque_assinante_aviso_vencimento.sql");

test("cards sem 'vendidos' e com a nota do vendedor", () => {
    for (const arquivo of ["js/pesquisa-global.js", "js/categoria.js"]) {
        const js = ler(arquivo);
        assert.doesNotMatch(js, /vendidos|totalVendido|mais-vendidos/, arquivo);
        assert.match(js, /Vendedor novo/, arquivo);
        assert.match(js, /Anunciado por/, arquivo);
        assert.match(js, /produto-global-destaque/, arquivo);
    }
    for (const pagina of ["index.html", "categoria.html"]) {
        const html = ler(pagina);
        assert.doesNotMatch(html, /mais-vendidos/, pagina);
        assert.match(html, />Nota do vendedor</, pagina);
    }
});

test("textos de anúncio no lugar de produto", () => {
    assert.match(ler("categoria.html"), /Anúncios da categoria/);
    assert.match(ler("novo-produto.html"), /Novo anúncio/);
    assert.match(ler("novo-produto.html"), /Título do anúncio/);
    assert.match(ler("produtos.html"), /Meus anúncios/);
    for (const pagina of ["novo-produto.html", "editar-produto.html"]) {
        assert.doesNotMatch(ler(pagina), /id="destaque"/, pagina);
    }
});

test("destaque é da loja assinante e aparece primeiro", () => {
    assert.match(migration, /function public\.loja_assinante/);
    assert.match(migration, /li\.assinante as destaque/);
    assert.match(migration, /resumo_avaliacoes_vendedor\(l\.id\)/);
    assert.doesNotMatch(migration, /'mais-vendidos'/);
    assert.match(migration, /when p\.ordenacao in \('relevancia', 'destaques'\) and p\.termo = ''/);
});

test("aviso de anúncio que sai do ar amanhã", () => {
    assert.match(migration, /interval '24 hours'/);
    assert.match(migration, /'anuncio_vence:'/);
    assert.match(migration, /meus-anuncios\.html/);
});

test("página do anúncio: nota do vendedor, vendas confirmadas e WhatsApp", () => {
    const js = ler("js/produto.js");
    assert.doesNotMatch(js, /from\("produto_metricas"\)/);
    assert.match(js, /rpc\("total_vendas_anuncio"/);
    assert.match(js, /https:\/\/wa\.me\/\?text=/);
    assert.match(ler("produto.html"), /id="compartilharWhatsappProduto"/);
    assert.match(ler("produto.html"), /Vendas confirmadas/);
});

test("fotos diminuídas antes do envio", () => {
    const js = ler("js/comprimir-imagem.js");
    assert.match(js, /LADO_MAXIMO = 1600/);
    assert.match(js, /toBlob\(resolver, "image\/jpeg"/);
    for (const arquivo of ["js/novo-produto.js", "js/editar-produto.js", "js/anuncio-fotos.js"]) {
        assert.match(ler(arquivo), /window\.comprimirImagem\(arquivo\)/, arquivo);
    }
    for (const pagina of ["novo-produto.html", "editar-produto.html"]) {
        assert.match(ler(pagina), /js\/comprimir-imagem\.js/, pagina);
    }
});
