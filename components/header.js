// ==========================================
// HEADER.JS
// Componente global do cabeçalho
// ==========================================

const db = window.db;

// ==========================================
// INICIAR HEADER
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {

    criarHeader();

    await verificarUsuario();

    atualizarContadorCarrinho();

    configurarEventos();

});

// ==========================================
// CRIAR HEADER
// ==========================================

function criarHeader() {

    document.body.insertAdjacentHTML("afterbegin", `

<header class="header">

    <div class="header-container">

        <a href="index.html" class="logo">

            <i class="fa-solid fa-store"></i>

            <span>Comércio da Cidade</span>

        </a>

        <nav class="menu">

            <a href="index.html">

                <i class="fa-solid fa-house"></i>

                Início

            </a>

            <a href="index.html#categorias">

                <i class="fa-solid fa-layer-group"></i>

                Categorias

            </a>

            <a
                href="carrinho.html"
                class="btn-carrinho">

                <i class="fa-solid fa-cart-shopping"></i>

                Carrinho

                <span
                    id="contador-carrinho"
                    class="contador">

                    0

                </span>

            </a>

            <a
                href="#"
                id="btnMinhaLoja"
                style="display:none;">

                <i class="fa-solid fa-store"></i>

                Minha Loja

            </a>

            <a
                href="perfil.html"
                id="btnPerfil"
                style="display:none;">

                <i class="fa-solid fa-user"></i>

                <span id="nomeUsuario">

                    Perfil

                </span>

            </a>

            <a
                href="login.html"
                id="btnLogin">

                <i class="fa-solid fa-right-to-bracket"></i>

                Entrar

            </a>

            <button
                id="btnLogout"
                style="display:none;">

                <i class="fa-solid fa-right-from-bracket"></i>

                Sair

            </button>

        </nav>

    </div>

</header>

    `);

}
// ==========================================
// VERIFICAR USUÁRIO
// ==========================================

async function verificarUsuario() {

    const {
        data: { user },
        error
    } = await db.auth.getUser();

    if (error) {

        console.error(error);
        return;

    }

    const btnLogin = document.getElementById("btnLogin");
    const btnPerfil = document.getElementById("btnPerfil");
    const btnLogout = document.getElementById("btnLogout");
    const btnMinhaLoja = document.getElementById("btnMinhaLoja");
    const nomeUsuario = document.getElementById("nomeUsuario");

    // Usuário não logado
    if (!user) {

        btnLogin.style.display = "flex";
        btnPerfil.style.display = "none";
        btnLogout.style.display = "none";
        btnMinhaLoja.style.display = "none";

        return;

    }

    // Nome do usuário
    const nome =

        user.user_metadata?.display_name ||

        user.email.split("@")[0];

    nomeUsuario.textContent = nome;

    btnLogin.style.display = "none";
    btnPerfil.style.display = "flex";
    btnLogout.style.display = "flex";

    // Verifica se possui loja
    const { data: loja, error: erroLoja } = await db

        .from("lojas")

        .select("id")

        .eq("proprietario_id", user.id)

        .maybeSingle();

    if (erroLoja) {

        console.error(erroLoja);
        return;

    }

    if (loja) {

        btnMinhaLoja.style.display = "flex";

        btnMinhaLoja.onclick = () => {

            window.location.href = "painel-loja.html";

        };

    } else {

        btnMinhaLoja.style.display = "none";

    }

}
// ==========================================
// CONTADOR DO CARRINHO
// ==========================================

function atualizarContadorCarrinho() {

    const contador = document.getElementById("contador-carrinho");

    if (!contador) return;

    const carrinho =
        JSON.parse(localStorage.getItem("carrinho")) || [];

    let total = 0;

    carrinho.forEach(produto => {

        total += Number(produto.quantidade || 1);

    });

    contador.textContent = total;

}

// ==========================================
// CONFIGURAR EVENTOS
// ==========================================

function configurarEventos() {

    const btnLogout = document.getElementById("btnLogout");

    if (btnLogout) {

        btnLogout.addEventListener("click", fazerLogout);

    }

    // Atualiza contador quando voltar para a página
    window.addEventListener("focus", () => {

        atualizarContadorCarrinho();

    });

    // Atualiza quando outra aba modificar o localStorage
    window.addEventListener("storage", () => {

        atualizarContadorCarrinho();

    });

}