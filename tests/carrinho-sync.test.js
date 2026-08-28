const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const codigo = fs.readFileSync(
    path.join(__dirname, "..", "components", "carrinho-sync.js"),
    "utf8"
);

const USUARIO = "11111111-1111-4111-8111-111111111111";
const OUTRO_USUARIO = "22222222-2222-4222-8222-222222222222";
const PRODUTO_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PRODUTO_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function criarProduto(id, nome, quantidade = 1) {
    return {
        produto_id: id,
        quantidade,
        adicionado_em: "2026-08-28T14:00:00.000Z",
        produto: {
            id,
            loja_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
            nome,
            descricao: `${nome} descrição`,
            preco: 10,
            preco_promocional: null,
            imagem_url: null,
            estoque: 20,
            ativo: true,
            loja: { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", nome: "Loja Teste" }
        }
    };
}

function criarAmbiente({ itensLocais = [], donoLocal = null, pendente = false, remoto = [] } = {}) {
    const armazenamento = new Map();
    const chamadasRpc = [];
    let registrosRemotos = remoto;

    if (itensLocais.length) {
        armazenamento.set("carrinho", JSON.stringify(itensLocais));
    }

    if (donoLocal) armazenamento.set("carrinho_usuario_id", donoLocal);
    if (pendente) armazenamento.set("carrinho_sincronizacao_pendente", "1");

    const localStorage = {
        getItem: chave => armazenamento.has(chave) ? armazenamento.get(chave) : null,
        setItem: (chave, valor) => armazenamento.set(chave, String(valor)),
        removeItem: chave => armazenamento.delete(chave)
    };

    const produtos = new Map([
        [PRODUTO_A, criarProduto(PRODUTO_A, "Produto A")],
        [PRODUTO_B, criarProduto(PRODUTO_B, "Produto B")]
    ]);

    const db = {
        auth: {
            getSession: async () => ({
                data: { session: { user: { id: USUARIO } } },
                error: null
            }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
        },
        from: () => ({
            select() { return this; },
            eq() { return this; },
            order: async () => ({ data: registrosRemotos, error: null })
        }),
        rpc: async (nome, parametros) => {
            assert.equal(nome, "sincronizar_carrinho_usuario");
            chamadasRpc.push(parametros.p_itens);
            registrosRemotos = parametros.p_itens.map(item => ({
                ...produtos.get(item.produto_id),
                quantidade: item.quantidade
            }));
            return { data: registrosRemotos.length, error: null };
        }
    };

    const document = {
        readyState: "loading",
        addEventListener() {},
        dispatchEvent() {}
    };

    const window = {
        db,
        addEventListener() {},
        atualizarContadorCarrinho() {}
    };

    const contexto = {
        window,
        document,
        localStorage,
        CustomEvent: class CustomEvent {
            constructor(tipo, opcoes) {
                this.type = tipo;
                this.detail = opcoes?.detail;
            }
        },
        console,
        clearTimeout,
        setTimeout
    };

    vm.runInNewContext(codigo, contexto, { filename: "carrinho-sync.js" });

    return {
        api: window.CarrinhoSync,
        chamadasRpc,
        armazenamento,
        obterCarrinho: () => JSON.parse(armazenamento.get("carrinho") || "[]")
    };
}

test("mescla o carrinho visitante com o carrinho da conta", async () => {
    const ambiente = criarAmbiente({
        itensLocais: [{ id: PRODUTO_A, nome: "Produto A", estoque: 20, quantidade: 2 }],
        remoto: [criarProduto(PRODUTO_B, "Produto B", 1)]
    });

    await ambiente.api.iniciar();

    assert.deepEqual(
        ambiente.obterCarrinho().map(item => item.id).sort(),
        [PRODUTO_A, PRODUTO_B].sort()
    );
    assert.equal(ambiente.chamadasRpc.length, 1);
    assert.equal(ambiente.armazenamento.get("carrinho_usuario_id"), USUARIO);
});

test("não reutiliza o carrinho local pertencente a outra conta", async () => {
    const ambiente = criarAmbiente({
        itensLocais: [{ id: PRODUTO_A, nome: "Produto A", estoque: 20, quantidade: 2 }],
        donoLocal: OUTRO_USUARIO,
        remoto: [criarProduto(PRODUTO_B, "Produto B", 1)]
    });

    await ambiente.api.iniciar();

    assert.deepEqual(ambiente.obterCarrinho().map(item => item.id), [PRODUTO_B]);
    assert.equal(ambiente.chamadasRpc.length, 0);
    assert.equal(ambiente.armazenamento.get("carrinho_usuario_id"), USUARIO);
});

test("reenvia uma alteração local que ficou pendente", async () => {
    const ambiente = criarAmbiente({
        itensLocais: [{ id: PRODUTO_A, nome: "Produto A", estoque: 20, quantidade: 3 }],
        donoLocal: USUARIO,
        pendente: true,
        remoto: [criarProduto(PRODUTO_A, "Produto A", 1)]
    });

    await ambiente.api.iniciar();

    assert.equal(ambiente.chamadasRpc[0][0].quantidade, 3);
    assert.equal(ambiente.obterCarrinho()[0].quantidade, 3);
    assert.equal(ambiente.armazenamento.has("carrinho_sincronizacao_pendente"), false);
});

test("sincroniza a última alteração e limpa o aparelho no logout", async () => {
    const ambiente = criarAmbiente({ remoto: [criarProduto(PRODUTO_A, "Produto A", 1)] });
    await ambiente.api.iniciar();

    const carrinho = ambiente.obterCarrinho();
    carrinho[0].quantidade = 4;
    ambiente.armazenamento.set("carrinho", JSON.stringify(carrinho));

    await ambiente.api.notificarAlteracao({ imediato: true });
    await ambiente.api.prepararLogout();

    assert.equal(ambiente.chamadasRpc.at(-1)[0].quantidade, 4);
    assert.equal(ambiente.armazenamento.has("carrinho"), false);
    assert.equal(ambiente.armazenamento.has("carrinho_usuario_id"), false);
});
