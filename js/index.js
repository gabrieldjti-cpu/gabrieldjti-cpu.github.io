// ===============================
// INDEX.JS
// ===============================

document.addEventListener("DOMContentLoaded", async () => {

    await verificarUsuario();
    await carregarLojas();

    const pesquisa = document.getElementById("pesquisa");

    if (pesquisa) {
        pesquisa.addEventListener("input", pesquisarLojas);
    }

});

// ===============================
// VERIFICAR USUÁRIO
// ===============================

async function verificarUsuario() {

    const {
        data: { user },
        error
    } = await window.db.auth.getUser();

    if (error) {
        console.error(error);
        return;
    }

    const btnLogin = document.getElementById("btnLogin");

    if (!btnLogin) return;

    if (!user) {

        btnLogin.innerText = "Entrar";
        btnLogin.href = "login.html";

        return;

    }

    const nome =
        user.user_metadata?.display_name ||
        user.email.split("@")[0];

    btnLogin.innerText = nome;
    btnLogin.href = "perfil.html";

    verificarLoja(user.id);

}

// ===============================
// VERIFICAR LOJA
// ===============================

async function verificarLoja(usuarioId) {

    const { data, error } = await window.db
        .from("lojas")
        .select("*")
        .eq("proprietario_id", usuarioId)
        .maybeSingle();

    if (error) {

        console.error(error);
        return;

    }

    if (data) {

        localStorage.setItem("loja_id", data.id);
        localStorage.setItem("nome_loja", data.nome);

    }

}
// ===============================
// CARREGAR LOJAS
// ===============================

async function carregarLojas() {

    const lista = document.getElementById("lista-lojas");

    if (!lista) return;

    lista.innerHTML = `
        <div class="carregando">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Carregando lojas...</p>
        </div>
    `;

    const { data, error } = await window.db
        .from("lojas")
        .select(`
            id,
            nome,
            cidade,
            logo_url,
            ativa,
            categorias (
                nome
            )
        `)
        .eq("ativa", true)
        .order("nome", { ascending: true });

    if (error) {

        console.error("Erro ao carregar lojas:", error);

        lista.innerHTML = `
            <p>Erro ao carregar lojas.</p>
        `;

        return;

    }

    lista.innerHTML = "";

    const total = document.getElementById("total-lojas");

    if (total) {
        total.textContent = `${data.length} lojas`;
    }

    if (!data || data.length === 0) {

        lista.innerHTML = `
            <div class="sem-produtos">
                <i class="fa-solid fa-store-slash"></i>
                <h3>Nenhuma loja cadastrada.</h3>
            </div>
        `;

        return;

    }

    data.forEach(loja => {

        lista.innerHTML += `

            <div class="card">

                <img
                    src="${loja.logo_url || "img/loja.png"}"
                    alt="${loja.nome}">

                <h3>${loja.nome}</h3>

                <p>
                    ${loja.categorias?.nome || "Sem categoria"}
                </p>

                <p>
                    📍 ${loja.cidade || "Cidade não informada"}
                </p>

                <button onclick="abrirLoja('${loja.id}')">

                    Ver Loja

                </button>

            </div>

        `;

    });

}

// ===============================
// PESQUISAR LOJAS
// ===============================

function pesquisarLojas() {

    const texto =
        document.getElementById("pesquisa")
        .value
        .toLowerCase();

    const cards =
        document.querySelectorAll("#lista-lojas .card");

    cards.forEach(card => {

        const nome =
            card.querySelector("h3")
            .textContent
            .toLowerCase();

        card.style.display =
            nome.includes(texto)
            ? "block"
            : "none";

    });

}

// ===============================
// ABRIR LOJA
// ===============================

function abrirLoja(id) {

    window.location.href =
        `loja.html?id=${id}`;

}

// ===============================
// MINHA LOJA
// ===============================

async function abrirMinhaLoja() {

    const {
        data: { user }
    } = await window.db.auth.getUser();

    if (!user) {

        window.location.href = "login.html";
        return;

    }

    const { data, error } = await window.db
        .from("lojas")
        .select("id")
        .eq("proprietario_id", user.id)
        .maybeSingle();

    if (error) {

        console.error(error);

        alert("Erro ao verificar sua loja.");

        return;

    }

    if (data) {

        window.location.href = "painel-loja.html";

    } else {

        window.location.href = "cadastrar-loja.html";

    }

}