// ======================================
// CHECKOUT.JS
// PARTE 1 - INICIALIZAÇÃO
// ======================================

const db = window.db;

let usuario = null;

let carrinho = [];

let pedidosPorLoja = {};

let totalPedido = 0;

// ======================================
// INICIAR
// ======================================

document.addEventListener("DOMContentLoaded", async () => {

    if (!db) {

        alert("Erro ao conectar ao banco.");

        return;

    }

    await verificarUsuario();

    carregarCarrinho();

    if (carrinho.length === 0) {

        alert("Seu carrinho está vazio.");

        window.location.href = "carrinho.html";

        return;

    }

    agruparProdutosPorLoja();

    mostrarResumo();

    await carregarDadosCliente();

    configurarPagamento();

    document
        .getElementById("form-checkout")
        ?.addEventListener("submit", finalizarCompra);

});

// ======================================
// VERIFICAR USUÁRIO
// ======================================

async function verificarUsuario() {

    const {

        data: { user },

        error

    } = await db.auth.getUser();

    if (error || !user) {

        window.location.href = "login.html";

        return;

    }

    usuario = user;

}

// ======================================
// CARREGAR CARRINHO
// ======================================

function carregarCarrinho() {

    carrinho = JSON.parse(

        localStorage.getItem("carrinho")

    ) || [];

}

// ======================================
// AGRUPAR PRODUTOS POR LOJA
// ======================================

function agruparProdutosPorLoja() {

    pedidosPorLoja = {};

    carrinho.forEach(produto => {

        if (!pedidosPorLoja[produto.loja_id]) {

            pedidosPorLoja[produto.loja_id] = {

                loja_id: produto.loja_id,

                nome_loja: produto.loja,

                produtos: []

            };

        }

        pedidosPorLoja[produto.loja_id]

            .produtos

            .push(produto);

    });

}
// ======================================
// ATUALIZAR RESUMO DO PEDIDO
// ======================================

function atualizarResumo() {

    const lista = document.getElementById("lista-resumo");

    const total = document.getElementById("total-geral");

    if (!lista) return;

    lista.innerHTML = "";

    totalPedido = 0;

    Object.values(pedidosPorLoja).forEach(loja => {

        let htmlProdutos = "";

        loja.produtos.forEach(produto => {

            const subtotal =
                Number(produto.preco) *
                Number(produto.quantidade);

            totalPedido += subtotal;

            htmlProdutos += `

                <div class="produto-resumo">

                    <img
                        src="${produto.imagem_url || "img/sem-imagem.png"}"
                        alt="${produto.nome}"
                    >

                    <div class="dados">

                        <h4>${produto.nome}</h4>

                        <p>

                            ${produto.quantidade} ×
                            R$ ${Number(produto.preco).toFixed(2)}

                        </p>

                    </div>

                    <strong>

                        R$ ${subtotal.toFixed(2)}

                    </strong>

                </div>

            `;

        });

        lista.innerHTML += `

            <div class="card-loja">

                <div class="topo-loja">

                    <h3>

                        <i class="fa-solid fa-store"></i>

                        ${loja.nome_loja}

                    </h3>

                </div>

                ${htmlProdutos}

                <div class="subtotal-loja">

                    <span>Subtotal da Loja</span>

                    <strong>

                        R$ ${loja.total.toFixed(2)}

                    </strong>

                </div>

            </div>

        `;

    });

    total.textContent =
        `R$ ${totalPedido.toFixed(2)}`;

}

// ======================================
// FORMATAR DINHEIRO
// ======================================

function formatarPreco(valor) {

    return Number(valor)
        .toLocaleString("pt-BR", {

            style: "currency",

            currency: "BRL"

        });

}
// ======================================
// CARREGAR DADOS DO CLIENTE
// ======================================

async function carregarDadosCliente() {

    try {

        const { data, error } = await db
            .from("profiles")
            .select("*")
            .eq("id", usuario.id)
            .single();

        if (error) {

            console.error(error);
            return;

        }

        document.getElementById("nome").value =
            data.nome || "";

        document.getElementById("telefone").value =
            data.telefone || "";

        document.getElementById("cidade").value =
            data.cidade || "";

        document.getElementById("endereco").value =
            data.endereco || "";

        document.getElementById("numero").value =
            data.numero || "";

        document.getElementById("bairro").value =
            data.bairro || "";

        document.getElementById("complemento").value =
            data.complemento || "";

    } catch (erro) {

        console.error(erro);

    }

}

// ======================================
// VALIDAR FORMULÁRIO
// ======================================

function validarFormulario() {

    const nome =
        document.getElementById("nome").value.trim();

    const telefone =
        document.getElementById("telefone").value.trim();

    const cidade =
        document.getElementById("cidade").value.trim();

    const endereco =
        document.getElementById("endereco").value.trim();

    const numero =
        document.getElementById("numero").value.trim();

    const bairro =
        document.getElementById("bairro").value.trim();

    const pagamento =
        document.querySelector("input[name='pagamento']:checked");

    if (!nome) {

        alert("Informe seu nome.");

        return false;

    }

    if (!telefone) {

        alert("Informe seu telefone.");

        return false;

    }

    if (!cidade) {

        alert("Informe sua cidade.");

        return false;

    }

    if (!endereco) {

        alert("Informe o endereço.");

        return false;

    }

    if (!numero) {

        alert("Informe o número.");

        return false;

    }

    if (!bairro) {

        alert("Informe o bairro.");

        return false;

    }

    if (!pagamento) {

        alert("Selecione uma forma de pagamento.");

        return false;

    }

    return true;

}

// ======================================
// INICIAR CHECKOUT
// ======================================

document.addEventListener("DOMContentLoaded", async () => {

    if (!db) {

        alert("Erro ao conectar ao banco.");
        return;

    }

    await verificarUsuario();

    carregarCarrinho();

    if (carrinho.length === 0) {

        alert("Seu carrinho está vazio.");

        window.location.href = "carrinho.html";

        return;

    }

    agruparPedidos();

    atualizarResumo();

    await carregarDadosCliente();

});
// ======================================
// FINALIZAR PEDIDO
// ======================================

async function finalizarPedido() {

    try {

        if (!validarFormulario()) return;

        const botao = document.getElementById("btn-finalizar");

        if (botao) {

            botao.disabled = true;
            botao.innerHTML =
                '<i class="fa-solid fa-spinner fa-spin"></i> Finalizando...';

        }

        const formaPagamento =
            document.querySelector(
                "input[name='pagamento']:checked"
            ).value;

        const endereco = {

            nome:
                document.getElementById("nome").value.trim(),

            telefone:
                document.getElementById("telefone").value.trim(),

            cidade:
                document.getElementById("cidade").value.trim(),

            endereco:
                document.getElementById("endereco").value.trim(),

            numero:
                document.getElementById("numero").value.trim(),

            bairro:
                document.getElementById("bairro").value.trim(),

            complemento:
                document.getElementById("complemento").value.trim()

        };

        // Cria um pedido para cada loja

        for (const loja of Object.values(pedidosPorLoja)) {

            const { data: pedido, error: erroPedido } =
                await db
                    .from("pedidos")
                    .insert({

                        cliente_id: usuario.id,

                        loja_id: loja.loja_id,

                        status: "pendente",

                        forma_pagamento: formaPagamento,

                        valor_total: loja.total,

                        nome_cliente: endereco.nome,

                        telefone: endereco.telefone,

                        cidade: endereco.cidade,

                        endereco: endereco.endereco,

                        numero: endereco.numero,

                        bairro: endereco.bairro,

                        complemento: endereco.complemento

                    })
                    .select()
                    .single();

            if (erroPedido) throw erroPedido;

            // Salva os produtos

            for (const produto of loja.produtos) {

                const { error: erroItem } =
                    await db
                        .from("itens_pedido")
                        .insert({

                            pedido_id: pedido.id,

                            produto_id: produto.id,

                            quantidade: produto.quantidade,

                            preco: produto.preco

                        });

                if (erroItem) throw erroItem;

                // Atualiza estoque

                const novoEstoque =
                    Math.max(
                        0,
                        produto.estoque - produto.quantidade
                    );

                await db
                    .from("produtos")
                    .update({

                        estoque: novoEstoque

                    })
                    .eq("id", produto.id);

            }

        }

        localStorage.removeItem("carrinho");

        alert("Pedido realizado com sucesso!");

        window.location.href = "meus-pedidos.html";

    } catch (erro) {

        console.error(erro);

        alert("Erro ao finalizar o pedido:\n\n" + erro.message);

        const botao = document.getElementById("btn-finalizar");

        if (botao) {

            botao.disabled = false;

            botao.innerHTML =
                '<i class="fa-solid fa-check"></i> Finalizar Pedido';

        }

    }

}