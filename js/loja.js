// =====================================
// LOJA.JS
// =====================================

const db = window.db;

let produtos = [];
let lojaId = null;

// =====================================
// INICIAR
// =====================================

document.addEventListener("DOMContentLoaded", async () => {

    const params = new URLSearchParams(window.location.search);

    lojaId = params.get("id");

    if (!lojaId) {

        alert("Loja não encontrada.");

        window.location.href = "index.html";

        return;

    }

    await carregarLoja();

    await carregarProdutos();

    document
        .getElementById("pesquisa")
        .addEventListener("input", pesquisarProdutos);

});

// =====================================
// CARREGAR LOJA
// =====================================

async function carregarLoja() {

    const { data, error } = await db

        .from("lojas")

        .select(`
            *,
            categorias(nome)
        `)

        .eq("id", lojaId)

        .single();

    if (error) {

        console.error(error);

        alert("Loja não encontrada.");

        window.location.href = "index.html";

        return;

    }

    document.getElementById("nomeLoja").textContent =
        data.nome;

    document.getElementById("categoriaLoja").textContent =
        data.categorias?.nome || "Sem categoria";

    document.getElementById("cidadeLoja").textContent =
        data.cidade || "-";

    document.getElementById("telefoneLoja").textContent =
        data.telefone || "-";

    document.getElementById("logoLoja").src =
        data.logo_url || "img/loja.png";

    const whatsapp =
        document.getElementById("btnWhatsapp");

    if (data.telefone) {

        const numero =
            data.telefone.replace(/\D/g, "");

        whatsapp.href =
            `https://wa.me/55${numero}`;

    } else {

        whatsapp.style.display = "none";

    }

}

// =====================================
// CARREGAR PRODUTOS
// =====================================

async function carregarProdutos() {

    const { data, error } = await db

        .from("produtos")

        .select("*")

        .eq("loja_id", lojaId)

        .eq("ativo", true)

        .order("nome");

    if (error) {

        console.error(error);

        return;

    }

    produtos = data;

    mostrarProdutos(produtos);

}

// =====================================
// MOSTRAR PRODUTOS
// =====================================

function mostrarProdutos(lista) {

    const container =
        document.getElementById("listaProdutos");

    container.innerHTML = "";

    if (lista.length === 0) {

        container.innerHTML = `

            <div class="sem-produtos">

                <i class="fa-solid fa-box-open"></i>

                <h2>Nenhum produto disponível.</h2>

            </div>

        `;

        return;

    }

    lista.forEach(produto => {

        container.innerHTML += `

        <div class="produto">

            <img
                src="${produto.imagem_url || "img/sem-imagem.png"}"
                alt="${produto.nome}">

            <div class="conteudo">

                <h3>${produto.nome}</h3>

                <p>

                    ${produto.descricao || ""}

                </p>

                <div class="preco">

                    R$ ${Number(produto.preco).toFixed(2)}

                </div>

                <div class="estoque">

                    Estoque:
                    ${produto.estoque}

                </div>

                <button
                    class="btn-comprar"
                    onclick="adicionarCarrinho('${produto.id}')">

                    <i class="fa-solid fa-cart-plus"></i>

                    Adicionar ao Carrinho

                </button>

            </div>

        </div>

        `;

    });

}

// =====================================
// PESQUISA
// =====================================

function pesquisarProdutos() {

    const texto =
        document.getElementById("pesquisa")
        .value
        .toLowerCase();

    const filtrados =
        produtos.filter(produto =>
            produto.nome
                .toLowerCase()
                .includes(texto)
        );

    mostrarProdutos(filtrados);

}

// =====================================
// ADICIONAR AO CARRINHO
// =====================================

function adicionarCarrinho(id) {

    const produto = produtos.find(p => p.id === id);

    if (!produto) {
        alert("Produto não encontrado.");
        return;
    }

    let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];

    // Verifica se já existe o mesmo produto da mesma loja
    const existente = carrinho.find(item =>
        item.id === produto.id &&
        item.loja_id === lojaId
    );

    if (existente) {

        existente.quantidade++;

    } else {

        carrinho.push({

            id: produto.id,

            loja_id: lojaId,

            nome_loja: document.getElementById("nomeLoja").textContent,

            nome: produto.nome,

            descricao: produto.descricao,

            preco: Number(produto.preco),

            preco_promocional: produto.preco_promocional,

            imagem_url: produto.imagem_url,

            quantidade: 1

        });

    }

    localStorage.setItem("carrinho", JSON.stringify(carrinho));

    alert("Produto adicionado ao carrinho!");

}