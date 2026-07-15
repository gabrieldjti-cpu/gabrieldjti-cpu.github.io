// =====================================
// PRODUTOS DA LOJA
// =====================================

let usuario = null;
let loja = null;
let produtos = [];

// =====================================
// INICIAR
// =====================================

document.addEventListener("DOMContentLoaded", async () => {

    if (!window.db) {
        alert("Erro ao conectar ao banco.");
        return;
    }

    const { data, error } = await window.db.auth.getUser();

    if (error || !data.user) {
        window.location.href = "login.html";
        return;
    }

    usuario = data.user;

    await carregarLoja();

    const pesquisa = document.getElementById("pesquisa");

    if (pesquisa) {
        pesquisa.addEventListener("input", pesquisarProdutos);
    }

});

// =====================================
// CARREGAR LOJA
// =====================================

async function carregarLoja() {

    const { data, error } = await window.db
        .from("lojas")
        .select("*")
        .eq("proprietario_id", usuario.id)
        .single();

    if (error) {
        console.error(error);
        alert("Loja não encontrada.");
        return;
    }

    loja = data;

    await carregarProdutos();

}

// =====================================
// CARREGAR PRODUTOS
// =====================================

async function carregarProdutos() {

    const { data, error } = await window.db
        .from("produtos")
        .select(`
            *,
            categorias_produtos!categoria_id(
                nome
            )
        `)
        .eq("loja_id", loja.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        alert(error.message);
        return;
    }

    produtos = data || [];

    renderizarProdutos(produtos);

}

// =====================================
// RENDERIZAR PRODUTOS
// =====================================

function renderizarProdutos(listaProdutos) {

    const lista = document.getElementById("lista-produtos");

    lista.innerHTML = "";

    if (listaProdutos.length === 0) {

        lista.innerHTML = `
            <div class="sem-produtos">

                <i class="fa-solid fa-box-open"></i>

                <h2>Nenhum produto encontrado.</h2>

                <p>
                    Cadastre um novo produto para começar.
                </p>

                <a href="novo-produto.html" class="btn">
                    <i class="fa-solid fa-plus"></i>
                    Novo Produto
                </a>

            </div>
        `;

        return;

    }

    listaProdutos.forEach(produto => {

        lista.innerHTML += `

            <div class="produto-card">

                <img
                    src="${produto.imagem_url || 'img/sem-imagem.png'}"
                    alt="${produto.nome}">

                <div class="produto-info">

                    <span class="categoria">
                        ${produto.categorias_produtos?.nome || "Sem categoria"}
                    </span>

                    <h3>${produto.nome}</h3>

                    <p>${produto.descricao || "Sem descrição."}</p>

                    <div class="preco">

                        <strong>
                            R$ ${Number(produto.preco).toFixed(2)}
                        </strong>

                        ${
                            produto.preco_promocional
                                ? `<span class="promo">
                                    Promo: R$ ${Number(produto.preco_promocional).toFixed(2)}
                                   </span>`
                                : ""
                        }

                    </div>

                    <p>

                        <strong>Estoque:</strong>

                        ${produto.estoque}

                    </p>

                    <p>

                        ${
                            produto.ativo
                                ? '<span class="ativo">🟢 Ativo</span>'
                                : '<span class="inativo">🔴 Inativo</span>'
                        }

                    </p>

                </div>

                <div class="acoes">

                    <button onclick="editarProduto('${produto.id}')">

                        <i class="fa-solid fa-pen"></i>

                        Editar

                    </button>

                    <button
                        class="btn-excluir"
                        onclick="excluirProduto('${produto.id}')">

                        <i class="fa-solid fa-trash"></i>

                        Excluir

                    </button>

                </div>

            </div>

        `;

    });

}

// =====================================
// PESQUISAR
// =====================================

function pesquisarProdutos() {

    const texto = document
        .getElementById("pesquisa")
        .value
        .toLowerCase();

    const resultado = produtos.filter(produto =>

        produto.nome.toLowerCase().includes(texto) ||

        (produto.descricao || "")
            .toLowerCase()
            .includes(texto)

    );

    renderizarProdutos(resultado);

}

// =====================================
// EDITAR PRODUTO
// =====================================

function editarProduto(id) {

    window.location.href = `editar-produto.html?id=${id}`;

}

// =====================================
// EXCLUIR
// =====================================

async function excluirProduto(id) {

    if (!confirm("Deseja excluir este produto?")) return;

    try {

        const { error } = await window.db
            .from("produtos")
            .delete()
            .eq("id", id);

        if (error) throw error;

        alert("Produto excluído com sucesso!");

        await carregarProdutos();

    } catch (erro) {

        console.error(erro);

        alert(erro.message);

    }

}

// =====================================
// LOGOUT
// =====================================

async function fazerLogout() {

    await window.db.auth.signOut();

    window.location.href = "login.html";

}