// ==========================================
// HEADER.JS
// Componente global do cabeçalho
// ==========================================

(() => {

    // ==========================================
    // INICIAR HEADER
    // ==========================================

    document.addEventListener("DOMContentLoaded", async () => {

        console.log("Header iniciado.");

        criarHeader();

        atualizarContadorCarrinho();

        configurarEventos();

        await verificarUsuarioHeader();

    });


    // ==========================================
    // CRIAR HEADER
    // ==========================================

    function criarHeader() {

        const containerHeader =
            document.getElementById("header");


        const html = `

            <header class="header">

                <div class="header-container">

                    <!-- LOGO -->

                    <a
                        href="index.html"
                        class="logo"
                    >

                        <i class="fa-solid fa-store"></i>

                        <span>
                            Comércio da Cidade
                        </span>

                    </a>


                    <!-- MENU -->

                    <nav class="menu">


                        <!-- INÍCIO -->

                        <a href="index.html">

                            <i class="fa-solid fa-house"></i>

                            Início

                        </a>


                        <!-- CATEGORIAS -->

                        <a href="index.html#categorias">

                            <i class="fa-solid fa-layer-group"></i>

                            Categorias

                        </a>


                        <!-- CARRINHO -->

                        <a
                            href="carrinho.html"
                            class="btn-carrinho"
                        >

                            <i class="fa-solid fa-cart-shopping"></i>

                            Carrinho

                            <span
                                id="contador-carrinho"
                                class="contador"
                            >
                                0
                            </span>

                        </a>


                        <!-- MINHA LOJA -->

                        <a
                            href="painel-loja.html"
                            id="btnMinhaLoja"
                            style="display:none;"
                        >

                            <i class="fa-solid fa-store"></i>

                            Minha Loja

                        </a>


                        <!-- PERFIL -->

                        <a
                            href="perfil.html"
                            id="btnPerfil"
                            style="display:none;"
                        >

                            <i class="fa-solid fa-user"></i>

                            <span id="nomeUsuario">
                                Perfil
                            </span>

                        </a>


                        <!-- LOGIN -->

                        <a
                            href="login.html"
                            id="btnLogin"
                        >

                            <i class="fa-solid fa-right-to-bracket"></i>

                            Entrar

                        </a>


                        <!-- LOGOUT -->

                        <button
                            type="button"
                            id="btnLogout"
                            style="display:none;"
                        >

                            <i class="fa-solid fa-right-from-bracket"></i>

                            Sair

                        </button>


                    </nav>

                </div>

            </header>

        `;


        // Se a página possui <div id="header"></div>,
        // coloca o componente dentro dela.

        if (containerHeader) {

            containerHeader.innerHTML =
                html;

        } else {

            // Segurança para páginas antigas
            // que ainda não possuem a div.

            document.body.insertAdjacentHTML(
                "afterbegin",
                html
            );

        }

    }


    // ==========================================
    // VERIFICAR USUÁRIO
    // ==========================================

    async function verificarUsuarioHeader() {

        if (!window.db) {

            console.error(
                "Header: Supabase não foi inicializado."
            );

            return;

        }


        try {

            const {
                data: { user },
                error
            } = await window.db.auth.getUser();


            if (error) {

                console.error(
                    "Header - erro ao verificar usuário:",
                    error
                );

                mostrarUsuarioDeslogado();

                return;

            }


            // ======================================
            // NÃO LOGADO
            // ======================================

            if (!user) {

                mostrarUsuarioDeslogado();

                return;

            }


            // ======================================
            // USUÁRIO LOGADO
            // ======================================

            mostrarUsuarioLogado(user);


            // ======================================
            // VERIFICAR SE POSSUI LOJA
            // ======================================

            await verificarLojaUsuario(
                user.id
            );


        } catch (erro) {

            console.error(
                "Header - erro inesperado:",
                erro
            );

        }

    }


    // ==========================================
    // USUÁRIO DESLOGADO
    // ==========================================

    function mostrarUsuarioDeslogado() {

        const btnLogin =
            document.getElementById("btnLogin");

        const btnPerfil =
            document.getElementById("btnPerfil");

        const btnLogout =
            document.getElementById("btnLogout");

        const btnMinhaLoja =
            document.getElementById("btnMinhaLoja");


        if (btnLogin) {

            btnLogin.style.display =
                "flex";

        }


        if (btnPerfil) {

            btnPerfil.style.display =
                "none";

        }


        if (btnLogout) {

            btnLogout.style.display =
                "none";

        }


        if (btnMinhaLoja) {

            btnMinhaLoja.style.display =
                "none";

        }

    }


    // ==========================================
    // USUÁRIO LOGADO
    // ==========================================

    function mostrarUsuarioLogado(user) {

        const btnLogin =
            document.getElementById("btnLogin");

        const btnPerfil =
            document.getElementById("btnPerfil");

        const btnLogout =
            document.getElementById("btnLogout");

        const nomeUsuario =
            document.getElementById("nomeUsuario");


        const nome =
            user.user_metadata?.display_name ||
            user.email?.split("@")[0] ||
            "Perfil";


        if (nomeUsuario) {

            nomeUsuario.textContent =
                nome;

        }


        if (btnLogin) {

            btnLogin.style.display =
                "none";

        }


        if (btnPerfil) {

            btnPerfil.style.display =
                "flex";

        }


        if (btnLogout) {

            btnLogout.style.display =
                "flex";

        }

    }


    // ==========================================
    // VERIFICAR LOJA DO USUÁRIO
    // ==========================================

    async function verificarLojaUsuario(usuarioId) {

        const btnMinhaLoja =
            document.getElementById(
                "btnMinhaLoja"
            );


        if (!btnMinhaLoja) {

            return;

        }


        try {

            const {
                data: loja,
                error
            } = await window.db

                .from("lojas")

                .select("id,nome")

                .eq(
                    "proprietario_id",
                    usuarioId
                )

                .maybeSingle();


            if (error) {

                console.error(
                    "Header - erro ao verificar loja:",
                    error
                );

                btnMinhaLoja.style.display =
                    "none";

                return;

            }


            if (loja) {

                btnMinhaLoja.style.display =
                    "flex";


                btnMinhaLoja.href =
                    "painel-loja.html";


                // Salva apenas como apoio.
                // O Supabase continua sendo a fonte oficial.

                localStorage.setItem(
                    "loja_id",
                    loja.id
                );


                localStorage.setItem(
                    "nome_loja",
                    loja.nome || ""
                );


            } else {

                btnMinhaLoja.style.display =
                    "none";


                localStorage.removeItem(
                    "loja_id"
                );


                localStorage.removeItem(
                    "nome_loja"
                );

            }


        } catch (erro) {

            console.error(
                "Header - erro ao buscar loja:",
                erro
            );

            btnMinhaLoja.style.display =
                "none";

        }

    }


    // ==========================================
    // CONTADOR DO CARRINHO
    // ==========================================

    function atualizarContadorCarrinho() {

        const contador =
            document.getElementById(
                "contador-carrinho"
            );


        if (!contador) {

            return;

        }


        let carrinho = [];


        try {

            carrinho =
                JSON.parse(
                    localStorage.getItem(
                        "carrinho"
                    )
                ) || [];


        } catch (erro) {

            console.error(
                "Erro ao ler carrinho:",
                erro
            );

            carrinho = [];

        }


        let total = 0;


        carrinho.forEach(produto => {

            const quantidade =
                Number(
                    produto.quantidade || 1
                );


            if (
                Number.isFinite(quantidade)
            ) {

                total += quantidade;

            }

        });


        contador.textContent =
            total;

    }


    // ==========================================
    // CONFIGURAR EVENTOS
    // ==========================================

    function configurarEventos() {

        const btnLogout =
            document.getElementById(
                "btnLogout"
            );


        if (btnLogout) {

            btnLogout.addEventListener(
                "click",
                fazerLogoutHeader
            );

        }


        // Quando voltar para a aba

        window.addEventListener(
            "focus",
            () => {

                atualizarContadorCarrinho();

            }
        );


        // Quando localStorage mudar
        // em outra aba

        window.addEventListener(
            "storage",
            (event) => {

                if (
                    event.key === "carrinho"
                ) {

                    atualizarContadorCarrinho();

                }

            }
        );

    }


    // ==========================================
    // LOGOUT
    // ==========================================

    async function fazerLogoutHeader() {

        const confirmar =
            confirm(
                "Deseja realmente sair da sua conta?"
            );


        if (!confirmar) {

            return;

        }


        if (!window.db) {

            alert(
                "Erro ao conectar com o Supabase."
            );

            return;

        }


        try {

            const {
                error
            } = await window.db.auth.signOut();


            if (error) {

                console.error(
                    "Erro ao sair:",
                    error
                );

                alert(
                    "Erro ao sair da conta."
                );

                return;

            }


            // Remove apenas informações relacionadas
            // à loja do usuário.

            localStorage.removeItem(
                "loja_id"
            );

            localStorage.removeItem(
                "nome_loja"
            );


            window.location.href =
                "login.html";


        } catch (erro) {

            console.error(
                "Erro inesperado no logout:",
                erro
            );


            alert(
                "Erro ao sair da conta."
            );

        }

    }


    // ==========================================
    // ATUALIZAR HEADER
    // ==========================================

    async function atualizarHeader() {

        atualizarContadorCarrinho();

        await verificarUsuarioHeader();

    }


    // ==========================================
    // FUNÇÕES QUE OUTRAS PÁGINAS PODEM USAR
    // ==========================================

    window.atualizarHeader =
        atualizarHeader;


    window.atualizarContadorCarrinho =
        atualizarContadorCarrinho;


})();