const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");
const paginasInstitucionais = [
    "ajuda.html",
    "como-funciona.html",
    "termos.html",
    "privacidade.html",
    "cancelamentos.html"
];

function ler(arquivo) {
    return fs.readFileSync(path.join(raiz, arquivo), "utf8");
}

test("a central pública possui todas as páginas e metadados essenciais", () => {
    paginasInstitucionais.forEach(arquivo => {
        assert.ok(fs.existsSync(path.join(raiz, arquivo)), `Página ausente: ${arquivo}`);

        const html = ler(arquivo);
        assert.match(html, /<html lang="pt-BR">/);
        assert.match(html, /name="description"/);
        assert.match(html, /css\/institucional\.css/);
        assert.match(html, /components\/header\.js/);
        assert.match(html, /class="institucional-footer"/);

        paginasInstitucionais.forEach(destino => {
            assert.match(html, new RegExp(`href="${destino}"`), `${arquivo} não aponta para ${destino}`);
        });
    });
});

test("a Central de Ajuda oferece busca acessível e canais reais", () => {
    const html = ler("ajuda.html");
    const codigo = ler("js/ajuda.js");

    assert.match(html, /id="buscaAjuda"/);
    assert.match(html, /aria-live="polite"/);
    assert.ok((html.match(/data-faq/g) || []).length >= 12);
    assert.match(html, /href="meus-pedidos\.html"/);
    assert.match(html, /href="perfil\.html"/);
    assert.match(html, /href="painel-loja\.html"/);
    assert.match(html, /WhatsApp/);
    assert.match(codigo, /normalize\("NFD"\)/);
    assert.match(codigo, /pergunta\.hidden = !corresponde/);
});

test("cadastro exige aceite com acesso aos documentos", () => {
    const html = ler("cadastro.html");

    assert.match(html, /id="termos"[\s\S]*required/);
    assert.match(html, /href="termos\.html"/);
    assert.match(html, /href="privacidade\.html"/);
});

test("cabeçalho identifica as páginas institucionais como Ajuda", () => {
    const header = ler("components/header.js");
    const design = ler("js/design-system.js");

    assert.match(header, /id="btnAjuda"/);
    paginasInstitucionais.forEach(arquivo => {
        assert.match(header, new RegExp(`"${arquivo}": '#btnAjuda'`));
        assert.match(design, new RegExp(`"${arquivo}"`));
    });
});

test("rodapés públicos levam à área de ajuda e confiança", () => {
    for (const arquivo of ["index.html", "categoria.html", "favoritos.html", "loja.html", "produto.html"]) {
        const html = ler(arquivo);
        for (const destino of paginasInstitucionais) {
            assert.match(html, new RegExp(`href="${destino}"`), `${arquivo} não aponta para ${destino}`);
        }
    }
});

test("documentos jurídicos refletem o fluxo atual e citam fontes oficiais", () => {
    const termos = ler("termos.html");
    const privacidade = ler("privacidade.html");
    const cancelamentos = ler("cancelamentos.html");

    assert.match(termos, /não processa Pix, cartão ou dinheiro de forma automática/);
    assert.match(termos, /planalto\.gov\.br\/ccivil_03\/leis\/l8078compilado\.htm/);
    assert.match(privacidade, /não comercializa dados pessoais/);
    assert.match(privacidade, /lei\/l13709\.htm/);
    assert.match(cancelamentos, /aguardando pagamento[\s\S]*pago/);
    assert.match(cancelamentos, /prazo de 7 dias/);
    assert.match(cancelamentos, /devolução automática dos itens ao estoque/);
    assert.match(cancelamentos, /decreto\/d7962\.htm/);
});

test("toda referência local das páginas institucionais aponta para um arquivo existente", () => {
    paginasInstitucionais.forEach(arquivo => {
        const html = ler(arquivo);
        const referencias = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
            .map(resultado => resultado[1])
            .filter(valor => !/^(?:https?:|#)/.test(valor))
            .map(valor => valor.split(/[?#]/)[0]);

        referencias.forEach(referencia => {
            assert.ok(
                fs.existsSync(path.join(raiz, referencia)),
                `${arquivo} referencia arquivo inexistente: ${referencia}`
            );
        });
    });
});
