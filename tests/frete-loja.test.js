const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const codigo = fs.readFileSync(
    path.join(__dirname, "..", "components", "frete-loja.js"),
    "utf8"
);

const LOJA_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const LOJA_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const LOJA_C = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function criarAmbiente(registros) {
    const consultas = [];

    const db = {
        from(tabela) {
            assert.equal(tabela, "lojas");

            const estado = { ids: [] };
            const consulta = {
                select(colunas) {
                    assert.equal(colunas, "id,nome,taxa_entrega");
                    return this;
                },
                in(coluna, ids) {
                    assert.equal(coluna, "id");
                    estado.ids = ids;
                    consultas.push([...ids]);
                    return this;
                },
                eq() {
                    return this;
                },
                then(resolve, reject) {
                    return Promise.resolve({
                        data: registros.filter(item => estado.ids.includes(item.id)),
                        error: null
                    }).then(resolve, reject);
                }
            };

            return consulta;
        }
    };

    const window = { db };
    vm.runInNewContext(codigo, { window, console }, { filename: "frete-loja.js" });

    return { api: window.FreteLoja, consultas };
}

test("carrega e normaliza as taxas das lojas", async () => {
    const ambiente = criarAmbiente([
        { id: LOJA_A, nome: "Loja A", taxa_entrega: "7.355" },
        { id: LOJA_B, nome: "Loja B", taxa_entrega: 0 }
    ]);

    const taxas = await ambiente.api.carregar([LOJA_A, LOJA_B]);

    assert.equal(ambiente.api.obterTaxa(taxas, LOJA_A), 7.36);
    assert.equal(ambiente.api.obterTaxa(taxas, LOJA_B), 0);
    assert.deepEqual(ambiente.consultas, [[LOJA_A, LOJA_B]]);
});

test("reutiliza o cache e permite atualização forçada", async () => {
    const ambiente = criarAmbiente([
        { id: LOJA_A, nome: "Loja A", taxa_entrega: 5 }
    ]);

    await ambiente.api.carregar([LOJA_A]);
    await ambiente.api.carregar([LOJA_A]);
    await ambiente.api.carregar([LOJA_A], { forcar: true });

    assert.equal(ambiente.consultas.length, 2);
});

test("bloqueia o checkout quando uma loja está indisponível", async () => {
    const ambiente = criarAmbiente([
        { id: LOJA_A, nome: "Loja A", taxa_entrega: 5 }
    ]);

    await assert.rejects(
        ambiente.api.carregar([LOJA_A, LOJA_C]),
        /lojas do carrinho estão indisponíveis/i
    );
});

test("mantém taxas dentro da faixa aceita pelo banco", () => {
    const ambiente = criarAmbiente([]);

    assert.equal(ambiente.api.normalizarTaxa(-1), 0);
    assert.equal(ambiente.api.normalizarTaxa("inválido"), 0);
    assert.equal(ambiente.api.normalizarTaxa(10000), 9999.99);
});
