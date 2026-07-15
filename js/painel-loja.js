// ======================================
// PAINEL DA LOJA
// Parte 1
// ======================================

let usuario = null;
let loja = null;

// ======================================
// INICIAR
// ======================================

document.addEventListener("DOMContentLoaded", async () => {

    try {

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

        console.log("Usuário:", usuario);

        await carregarLoja();

    } catch (erro) {

        console.error("Erro ao iniciar painel:", erro);

        alert("Erro ao carregar o painel.");

    }

});

// ======================================
// CARREGAR DADOS DA LOJA
// ======================================

async function carregarLoja() {

    try {

        const { data, error } = await window.db
            .from("lojas")
            .select(`
                *,
                categorias!categoria_id(
                    nome
                )
            `)
            .eq("proprietario_id", usuario.id)
            .maybeSingle();

        console.log("Loja:", data);
        console.log("Erro:", error);

        if (error) throw error;

        // Usuário não possui loja
        if (!data) {

            window.location.href = "cadastrar-loja.html";
            return;

        }

        loja = data;

        // ===========================
        // Dados da Loja
        // ===========================

        document.getElementById("nome-loja").textContent =
            loja.nome || "-";

        document.getElementById("categoria-loja").textContent =
            loja.categorias?.nome || "Sem categoria";

        document.getElementById("cidade-loja").textContent =
            loja.cidade || "-";

        document.getElementById("telefone-loja").textContent =
            loja.telefone || "-";

        document.getElementById("status-loja").innerHTML =
            loja.ativa
                ? "🟢 Ativa"
                : "🔴 Inativa";

        // ===========================
        // Botão Editar Loja
        // ===========================

        const botaoEditarLoja = document.querySelector(".btn");

        if (botaoEditarLoja) {

            botaoEditarLoja.onclick = () => {

                window.location.href =
                    `editar-loja.html?id=${loja.id}`;

            };

        }

        // ===========================
        // Carrega Produtos
        // ===========================

        await carregarProdutos();

        // ===========================
        // Estatísticas
        // ===========================

        await carregarEstatisticas();

    } catch (erro) {

        console.error("Erro ao carregar loja:", erro);

        alert("Erro ao carregar os dados da loja.");

    }

}
// ======================================
// CARREGAR PRODUTOS
// ======================================

async function carregarProdutos() {

    try {

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

        console.log("Produtos:", data);
        console.log("Erro produtos:", error);

        if (error) throw error;

        // Estatística
        const totalProdutos = document.getElementById("total-produtos");

        if (totalProdutos) {
            totalProdutos.textContent = data.length;
        }

        const lista = document.getElementById("lista-produtos");

        if (!lista) return;

        lista.innerHTML = "";

        // Nenhum produto

        if (!data || data.length === 0) {

            lista.innerHTML = `

                <div class="sem-produtos">

                    <i class="fa-solid fa-box-open"></i>

                    <h3>Nenhum produto cadastrado</h3>

                    <p>

                        Clique em <strong>Novo Produto</strong>
                        para cadastrar seu primeiro produto.

                    </p>

                    <a href="novo-produto.html" class="btn">

                        <i class="fa-solid fa-plus"></i>

                        Novo Produto

                    </a>

                </div>

            `;

            return;

        }

        // Lista de produtos

        data.forEach(produto => {

            lista.innerHTML += `

            <div class="produto-card">

                <img
                    src="${produto.imagem_url || "img/sem-imagem.png"}"
                    alt="${produto.nome}"
                    class="foto-produto"
                >

                <div class="produto-info">

                    <span class="categoria">

                        ${produto.categorias_produtos?.nome || "Sem categoria"}

                    </span>

                    <h3>${produto.nome}</h3>

                    <p class="descricao">

                        ${produto.descricao || "Sem descrição."}

                    </p>

                    <div class="precos">

                        <strong class="preco">

                            R$ ${Number(produto.preco).toFixed(2)}

                        </strong>

                        ${
                            produto.preco_promocional
                            ? `
                                <span class="promo">
                                    De R$ ${Number(produto.preco).toFixed(2)}
                                    por
                                    R$ ${Number(produto.preco_promocional).toFixed(2)}
                                </span>
                            `
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
                            ? '<span class="status ativo">🟢 Ativo</span>'
                            : '<span class="status inativo">🔴 Inativo</span>'
                        }

                    </p>

                </div>

                <div class="acoes">

                    <button
                        class="btn-editar"
                        onclick="editarProduto('${produto.id}')">

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

    } catch (erro) {

        console.error("Erro ao carregar produtos:", erro);

    }

}

// ======================================
// EDITAR PRODUTO
// ======================================

function editarProduto(id) {

    window.location.href = `editar-produto.html?id=${id}`;

}

// ======================================
// EXCLUIR PRODUTO
// ======================================

async function excluirProduto(id) {

    const confirmar = confirm(
        "Deseja realmente excluir este produto?"
    );

    if (!confirmar) return;

    try {

        const { error } = await window.db
            .from("produtos")
            .delete()
            .eq("id", id);

        if (error) throw error;

        alert("Produto excluído com sucesso!");

        carregarProdutos();

        carregarEstatisticas();

    } catch (erro) {

        console.error(erro);

        alert("Erro ao excluir produto.");

    }

}
// ======================================
// CARREGAR ESTATÍSTICAS
// ======================================

async function carregarEstatisticas() {

    const { count } = await window.db
        .from("produtos")
        .select("*", { count: "exact", head: true })
        .eq("loja_id", loja.id);

    document.getElementById("total-produtos").textContent = count || 0;

    document.getElementById("total-pedidos").textContent = "0";

    document.getElementById("total-vendas").textContent = "R$ 0,00";

}

// ======================================
// CARREGAR PEDIDOS (Preparação)
// ======================================

async function carregarPedidos() {

    const lista = document.getElementById("lista-pedidos");

    if (!lista) return;

    lista.innerHTML = `

        <div class="sem-pedidos">

            <i class="fa-solid fa-cart-shopping"></i>

            <h3>Nenhum pedido recebido</h3>

            <p>

                Quando algum cliente comprar um produto,
                os pedidos aparecerão aqui.

            </p>

        </div>

    `;

}

// ======================================
// FAZER LOGOUT
// ======================================

async function fazerLogout() {

    const sair = confirm("Deseja realmente sair da sua conta?");

    if (!sair) return;

    await window.db.auth.signOut();

    localStorage.clear();

    sessionStorage.clear();

    window.location.href = "login.html";

}