// =====================================
// PRODUTOS DA LOJA
// =====================================

let usuario = null;
let loja = null;

document.addEventListener("DOMContentLoaded", async () => {

    if (!window.db) {
        alert("Erro ao conectar ao banco.");
        return;
    }

    // Verifica usuário logado
    const { data, error } = await window.db.auth.getUser();

    if (error || !data.user) {
        window.location.href = "login.html";
        return;
    }

    usuario = data.user;

    await carregarLoja();

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

    carregarProdutos();

}

// =====================================
// CARREGAR PRODUTOS
// =====================================

async function carregarProdutos() {

    const { data, error } = await window.db
        .from("produtos")
        .select("*")
        .eq("loja_id", loja.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    const lista = document.getElementById("lista-produtos");

    lista.innerHTML = "";

    if (data.length === 0) {

        lista.innerHTML = `
            <div class="card">
                <h3>Nenhum produto cadastrado.</h3>
                <p>Clique em <strong>Novo Produto</strong> para começar.</p>
            </div>
        `;

        return;
    }

    data.forEach(produto => {

        lista.innerHTML += `

            <div class="produto-card">

                <img src="${produto.imagem_url || 'img/sem-imagem.png'}" alt="${produto.nome}">

                <h3>${produto.nome}</h3>

                <p>${produto.descricao || ''}</p>

                <h2>R$ ${Number(produto.preco).toFixed(2)}</h2>

                <p>Estoque: ${produto.estoque}</p>

                <div class="acoes">

                    <button onclick="editarProduto('${produto.id}')">
                        ✏️ Editar
                    </button>

                    <button onclick="excluirProduto('${produto.id}')">
                        🗑️ Excluir
                    </button>

                </div>

            </div>

        `;

    });

}

// =====================================
// EDITAR
// =====================================

function editarProduto(id) {

    window.location.href = `editar-produto.html?id=${id}`;

}

// =====================================
// EXCLUIR
// =====================================

async function excluirProduto(id) {

    if (!confirm("Deseja excluir este produto?")) return;

    const { error } = await window.db
        .from("produtos")
        .delete()
        .eq("id", id);

    if (error) {
        alert(error.message);
        return;
    }

    carregarProdutos();

}