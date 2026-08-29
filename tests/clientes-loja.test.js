const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const codigo = fs.readFileSync(
    path.join(__dirname, "..", "js", "clientes-loja.js"),
    "utf8"
);

function carregarUtilitarios() {
    const window = {
        addEventListener() {}
    };
    const document = {
        addEventListener() {}
    };

    vm.runInNewContext(codigo, {
        window,
        document,
        console,
        clearTimeout,
        setTimeout,
        Intl,
        URLSearchParams
    }, { filename: "clientes-loja.js" });

    return window.ClientesLojaTestes;
}

const utilitarios = carregarUtilitarios();

test("aceita apenas períodos previstos pela consulta", () => {
    assert.equal(utilitarios.normalizarPeriodo("30"), 30);
    assert.equal(utilitarios.normalizarPeriodo("365"), 365);
    assert.equal(utilitarios.normalizarPeriodo("10"), 0);
    assert.equal(utilitarios.normalizarPeriodo("invalido"), 0);
});

test("normaliza ordenação desconhecida para compras recentes", () => {
    assert.equal(utilitarios.normalizarOrdenacao("mais_pedidos"), "mais_pedidos");
    assert.equal(utilitarios.normalizarOrdenacao("maior_valor"), "maior_valor");
    assert.equal(utilitarios.normalizarOrdenacao("qualquer"), "recentes");
});

test("apresenta estados atuais e legados do pedido", () => {
    assert.equal(utilitarios.obterStatusPedido("em_preparacao").rotulo, "Em preparação");
    assert.equal(utilitarios.obterStatusPedido("preparando").rotulo, "Em preparação");
    assert.equal(utilitarios.obterStatusPedido("entregue").classe, "status-entregue");
    assert.equal(utilitarios.obterStatusPedido("cancelado").classe, "status-cancelado");
});

test("gera identificação visual sem revelar outros dados do cliente", () => {
    assert.equal(utilitarios.obterIniciais("Maria da Silva"), "MS");
    assert.equal(utilitarios.obterIniciais("João"), "JO");
    assert.equal(utilitarios.formatarNumeroPedido("12345678-abcd-4abc-8abc-1234567890ab"), "567890AB");
});

test("escapa conteúdo vindo do banco antes de montar os cartões", () => {
    assert.equal(
        utilitarios.escaparHtml('<img src=x onerror="alert(1)">'),
        "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
    );
});
