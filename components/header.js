// ==========================================
// HEADER.JS
// Componente global do cabeçalho
// ==========================================

(() => {

    document.addEventListener("DOMContentLoaded", async () => {

        console.log("Header iniciado.");

        criarHeader();

        atualizarContadorCarrinho();

        configurarMenuMobile();

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


                    <!-- BOTÃO MENU MOBILE -->

                    <button
                        id="btnMenuMobile"
                        class="btn-menu-mobile"
                        type="button"
                        aria-label="Abrir menu"
                        aria-expanded="false"
                    >

                        <i
                            id="iconeMenuMobile"
                            class="fa-solid fa-bars"
                        ></i>

                    </button>


                    <!-- MENU -->

                    <nav
                        class="menu"
                        id="menuPrincipal"
                    >


                        <a href="index.html">

                            <i class="fa-solid fa-house"></i>

                            <span>
                                Início
                            </span>

                        </a>


                        <a href="index.html#categorias">

                            <i class="fa-solid fa-layer-group"></i>

                            <span>
                                Categorias
                            </span>

                        </a>


                        <a
                            href="carrinho.html"
                            class="btn-carrinho"
                        >

                            <i class="fa-solid fa-cart-shopping"></i>

                            <span>
                                Carrinho
                            </span>

                            <span
                                id="contador-carrinho"
                                class="contador"
                            >
                                0
                            </span>

                        </a>


                        <a
                            href="painel-loja.html"
                            id="btnMinhaLoja"
                            style="display:none;"
                        >

                            <i class="fa-solid fa-store"></i>

                            <span>
                                Minha Loja
                            </span>

                        </a>


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


                        <a
                            href="login.html"
                            id="btnLogin"
                        >

                            <i class="fa-solid fa-right-to-bracket"></i>

                            <span>
                                Entrar
                            </span>

                        </a>


                        <button
                            type="button"
                            id="btnLogout"
                            style="display:none;"
                        >

                            <i class="fa-solid fa-right-from-bracket"></i>

                            <span>
                                Sair
                            </span>

                        </button>


                    </nav>

                </div>

            </header>


            <!-- OVERLAY MOBILE -->

            <div
                id="menuOverlay"
                class="menu-overlay"
            ></div>

        `;


        if (containerHeader) {

            containerHeader.innerHTML =
                html;

        } else {

            document.body.insertAdjacentHTML(
                "afterbegin",
                html
            );

        }

    }


    // ==========================================
    // CONFIGURAR MENU MOBILE
    // ==========================================

    function configurarMenuMobile() {

        const btnMenu =
            document.getElementById(
                "btnMenuMobile"
            );


        const menu =
            document.getElementById(
                "menuPrincipal"
            );


        const overlay =
            document.getElementById(
                "menuOverlay"
            );


        if (!btnMenu || !menu) {

            console.warn(
                "Elementos do menu mobile não encontrados."
            );

            return;

        }


        btnMenu.addEventListener(
            "click",
            () => {

                if (
                    menu.classList.contains(
                        "aberto"
                    )
                ) {

                    fecharMenuMobile();

                } else {

                    abrirMenuMobile();

                }

            }
        );


        if (overlay) {

            overlay.addEventListener(
                "click",
                fecharMenuMobile
            );

        }


        menu.addEventListener(
            "click",
            (event) => {

                const link =
                    event.target.closest(
                        "a"
                    );


                if (link) {

                    fecharMenuMobile();

                }

            }
        );


        document.addEventListener(
            "keydown",
            (event) => {

                if (
                    event.key === "Escape"
                ) {

                    fecharMenuMobile();

                }

            }
        );


        window.addEventListener(
            "resize",
            () => {

                if (
                    window.innerWidth > 900
                ) {

                    fecharMenuMobile();

                }

            }
        );

    }


    // ==========================================
    // ABRIR MENU MOBILE
    // ==========================================

    function abrirMenuMobile() {

        const menu =
            document.getElementById(
                "menuPrincipal"
            );


        const overlay =
            document.getElementById(
                "menuOverlay"
            );


        const btnMenu =
            document.getElementById(
                "btnMenuMobile"
            );


        const icone =
            document.getElementById(
                "iconeMenuMobile"
            );


        if (!menu) {

            return;

        }


        menu.classList.add(
            "aberto"
        );


        if (overlay) {

            overlay.classList.add(
                "ativo"
            );

        }


        if (btnMenu) {

            btnMenu.setAttribute(
                "aria-expanded",
                "true"
            );


            btnMenu.setAttribute(
                "aria-label",
                "Fechar menu"
            );

        }


        if (icone) {

            icone.className =
                "fa-solid fa-xmark";

        }

    }


    // ==========================================
    // FECHAR MENU MOBILE
    // ==========================================

    function fecharMenuMobile() {

        const menu =
            document.getElementById(
                "menuPrincipal"
            );


        const overlay =
            document.getElementById(
                "menuOverlay"
            );


        const btnMenu =
            document.getElementById(
                "btnMenuMobile"
            );


        const icone =
            document.getElementById(
                "iconeMenuMobile"
            );


        if (menu) {

            menu.classList.remove(
                "aberto"
            );

        }


        if (overlay) {

            overlay.classList.remove(
                "ativo"
            );

        }


        if (btnMenu) {

            btnMenu.setAttribute(
                "aria-expanded",
                "false"
            );


            btnMenu.setAttribute(
                "aria-label",
                "Abrir menu"
            );

        }


        if (icone) {

            icone.className =
                "fa-solid fa-bars";

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

        // Primeiro verifica se existe sessão

        const {
            data: sessaoData,
            error: sessaoError
        } = await window.db.auth.getSession();


        if (sessaoError) {

            console.error(
                "Header - erro ao verificar sessão:",
                sessaoError
            );

            mostrarUsuarioDeslogado();

            return;

        }


        // Nenhuma sessão = usuário deslogado
        // Isso é normal e não deve gerar erro

        if (!sessaoData.session) {

            mostrarUsuarioDeslogado();

            return;

        }


        // Agora sim busca o usuário

        const {
            data: usuarioData,
            error: usuarioError
        } = await window.db.auth.getUser();


        if (usuarioError) {

            console.error(
                "Header - erro ao buscar usuário:",
                usuarioError
            );

            mostrarUsuarioDeslogado();

            return;

        }


        const user =
            usuarioData.user;


        if (!user) {

            mostrarUsuarioDeslogado();

            return;

        }


        mostrarUsuarioLogado(
            user
        );


        await verificarLojaUsuario(
            user.id
        );


    } catch (erro) {

        console.error(
            "Header - erro inesperado:",
            erro
        );


        mostrarUsuarioDeslogado();

    }

}


    // ==========================================
    // USUÁRIO DESLOGADO
    // ==========================================

    function mostrarUsuarioDeslogado() {

        const btnLogin =
            document.getElementById(
                "btnLogin"
            );


        const btnPerfil =
            document.getElementById(
                "btnPerfil"
            );


        const btnLogout =
            document.getElementById(
                "btnLogout"
            );


        const btnMinhaLoja =
            document.getElementById(
                "btnMinhaLoja"
            );


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
            document.getElementById(
                "btnLogin"
            );


        const btnPerfil =
            document.getElementById(
                "btnPerfil"
            );


        const btnLogout =
            document.getElementById(
                "btnLogout"
            );


        const nomeUsuario =
            document.getElementById(
                "nomeUsuario"
            );


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

    async function verificarLojaUsuario(
        usuarioId
    ) {

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

                .select(
                    "id,nome"
                )

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


        carrinho.forEach(
            (produto) => {

                const quantidade =
                    Number(
                        produto.quantidade || 1
                    );


                if (
                    Number.isFinite(
                        quantidade
                    )
                ) {

                    total +=
                        quantidade;

                }

            }
        );


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


        window.addEventListener(
            "focus",
            atualizarContadorCarrinho
        );


        window.addEventListener(
            "storage",
            (event) => {

                if (
                    event.key ===
                    "carrinho"
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


            localStorage.removeItem(
                "loja_id"
            );


            localStorage.removeItem(
                "nome_loja"
            );


            fecharMenuMobile();


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
    // FUNÇÕES GLOBAIS
    // ==========================================

    window.atualizarHeader =
        atualizarHeader;


    window.atualizarContadorCarrinho =
        atualizarContadorCarrinho;


})(); // FIM DO HEADER