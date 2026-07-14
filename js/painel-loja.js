// ===============================
// PAINEL DA LOJA
// ===============================

let usuario = null;
let loja = null;

// ===============================
// INICIAR
// ===============================

document.addEventListener("DOMContentLoaded", async () => {

    if (!window.db) {
        alert("Erro ao conectar ao Supabase.");
        return;
    }

    // Verifica usuário logado
    const { data, error } = await window.db.auth.getUser();

    if (error || !data.user) {
        window.location.href = "login.html";
        return;
    }

    usuario = data.user;

    console.log("Usuário:", usuario.id);

    await carregarLoja();

});

// ===============================
// CARREGAR LOJA
// ===============================

async function carregarLoja() {

    const { data, error } = await window.db
        .from("lojas")
        .select(`
            *,
            categorias (
                nome
            )
        `)
        .eq("proprietario_id", usuario.id)
        .maybeSingle();

    if (error) {
        console.error(error);
        alert("Erro ao carregar a loja.");
        return;
    }

    // Usuário ainda não possui loja
    if (!data) {

        window.location.href = "cadastrar-loja.html";
        return;

    }

    loja = data;

    console.log("Loja:", loja);

    document.getElementById("nome-loja").textContent =
        loja.nome;

    document.getElementById("categoria-loja").textContent =
        loja.categorias?.nome || "Sem categoria";

    document.getElementById("cidade-loja").textContent =
        loja.cidade || "-";

    document.getElementById("telefone-loja").textContent =
        loja.telefone || "-";

    document.getElementById("status-loja").textContent =
        loja.ativa ? "🟢 Ativa" : "🔴 Inativa";

    carregarProdutos();

}

// ===============================
// CARREGAR PRODUTOS
// ===============================

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
            <p>Nenhum produto cadastrado.</p>
        `;

        return;
    }

    data.forEach(produto => {

        lista.innerHTML += `

            <div class="produto-card">

                <h3>${produto.nome}</h3>

                <p>${produto.descricao || ""}</p>

                <p>
                    <strong>Preço:</strong>
                    R$ ${Number(produto.preco).toFixed(2)}
                </p>

                <p>
                    <strong>Estoque:</strong>
                    ${produto.estoque}
                </p>

                <button onclick="editarProduto('${produto.id}')">
                    Editar
                </button>

                <button onclick="excluirProduto('${produto.id}')">
                    Excluir
                </button>

            </div>

        `;

    });

}

// ===============================
// NOVO PRODUTO
// ===============================

function novoProduto() {

    alert("Na próxima etapa criaremos o formulário de cadastro.");

}

// ===============================
// EDITAR
// ===============================

function editarProduto(id) {

    alert("Editar produto: " + id);

}

// ===============================
// EXCLUIR
// ===============================

async function excluirProduto(id) {

    const confirmar = confirm("Deseja excluir este produto?");

    if (!confirmar) return;

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

// ===============================
// LOGOUT
// ===============================

async function fazerLogout() {

    await window.db.auth.signOut();

    localStorage.clear();

    window.location.href = "login.html";

}