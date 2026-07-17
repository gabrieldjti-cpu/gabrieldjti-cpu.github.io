// ======================================
// CARRINHO
// ======================================

const db = window.db;

let carrinho = [];

// ======================================
// INICIAR
// ======================================

document.addEventListener("DOMContentLoaded", async () => {

    carregarCarrinho();

    atualizarCarrinho();

    document
        .getElementById("btn-finalizar")
        ?.addEventListener("click", finalizarCompra);

});

// ======================================
// CARREGAR DO LOCALSTORAGE
// ======================================

function carregarCarrinho() {

    carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

}

// ======================================
// SALVAR
// ======================================

function salvarCarrinho() {

    localStorage.setItem(
        "carrinho",
        JSON.stringify(carrinho)
    );

}

// ======================================
// ATUALIZAR TELA
// ======================================

function atualizarCarrinho() {

    const lista = document.getElementById("lista-carrinho");

    const quantidade = document.getElementById("quantidade-itens");

    const subtotal = document.getElementById("subtotal");

    const total = document.getElementById("total-geral");

    lista.innerHTML = "";

    if (carrinho.length === 0) {

        lista.innerHTML = `

        <div class="carrinho-vazio">

            <i class="fa-solid fa-cart-shopping"></i>

            <h3>Seu carrinho está vazio.</h3>

            <p>Adicione produtos para continuar.</p>

            <a href="index.html" class="btn">

                Continuar Comprando

            </a>

        </div>

        `;

        quantidade.textContent = "0";

        subtotal.textContent = "R$ 0,00";

        total.textContent = "R$ 0,00";

        return;

    }

    let totalItens = 0;

    let valorTotal = 0;
        carrinho.forEach((produto, index) => {

        const preco = Number(produto.preco);
        const quantidadeProduto = Number(produto.quantidade);

        totalItens += quantidadeProduto;
        valorTotal += preco * quantidadeProduto;

        lista.innerHTML += `

        <div class="item-carrinho">

            <img
                src="${produto.imagem_url || 'img/sem-imagem.png'}"
                class="foto-produto"
                alt="${produto.nome}"
            >

            <div class="dados-produto">

                <h3>${produto.nome}</h3>

                <p>${produto.loja || ""}</p>

                <strong>

                    R$ ${preco.toFixed(2)}

                </strong>

            </div>

            <div class="quantidade">

                <button
                    onclick="diminuirQuantidade(${index})">

                    <i class="fa-solid fa-minus"></i>

                </button>

                <span>

                    ${quantidadeProduto}

                </span>

                <button
                    onclick="aumentarQuantidade(${index})">

                    <i class="fa-solid fa-plus"></i>

                </button>

            </div>

            <div class="subtotal-item">

                <strong>

                    R$ ${(preco * quantidadeProduto).toFixed(2)}

                </strong>

            </div>

            <button
                class="btn-remover"
                onclick="removerProduto(${index})">

                <i class="fa-solid fa-trash"></i>

            </button>

        </div>

        `;

    });

    quantidade.textContent = totalItens;

    subtotal.textContent =
        `R$ ${valorTotal.toFixed(2)}`;

    total.textContent =
        `R$ ${valorTotal.toFixed(2)}`;

}
// ======================================
// AUMENTAR QUANTIDADE
// ======================================

function aumentarQuantidade(index) {

    carrinho[index].quantidade++;

    salvarCarrinho();

    atualizarCarrinho();

}

// ======================================
// DIMINUIR QUANTIDADE
// ======================================

function diminuirQuantidade(index) {

    if (carrinho[index].quantidade > 1) {

        carrinho[index].quantidade--;

    } else {

        const confirmar = confirm(
            "Deseja remover este produto do carrinho?"
        );

        if (!confirmar) return;

        carrinho.splice(index, 1);

    }

    salvarCarrinho();

    atualizarCarrinho();

}

// ======================================
// REMOVER PRODUTO
// ======================================

function removerProduto(index) {

    const confirmar = confirm(
        "Remover este produto do carrinho?"
    );

    if (!confirmar) return;

    carrinho.splice(index, 1);

    salvarCarrinho();

    atualizarCarrinho();

}

// ======================================
// LIMPAR CARRINHO
// ======================================

function limparCarrinho() {

    const confirmar = confirm(
        "Deseja limpar todo o carrinho?"
    );

    if (!confirmar) return;

    carrinho = [];

    salvarCarrinho();

    atualizarCarrinho();

}

// ======================================
// FINALIZAR COMPRA
// ======================================

function finalizarCompra() {

    if (carrinho.length === 0) {

        alert("Seu carrinho está vazio.");

        return;

    }

    localStorage.setItem(
        "checkout",
        JSON.stringify(carrinho)
    );

    window.location.href = "checkout.html";

}

// ======================================
// LOGOUT
// ======================================

async function fazerLogout() {

    await db.auth.signOut();

    localStorage.clear();

    window.location.href = "login.html";

}