// =======================================
// DESIGN SYSTEM GLOBAL
// =======================================
// Carrega a identidade visual compartilhada antes das extensões específicas.

function carregarDesignSystemGlobal() {
    const css = "css/design-system.css";
    const scriptSrc = "js/design-system.js";

    if (!document.querySelector(`link[href="${css}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = css;
        link.dataset.designSystem = "comercio-da-cidade";
        document.head.appendChild(link);
    }

    const carregarScript = () => {
        if (document.querySelector(`script[src="${scriptSrc}"]`)) {
            return;
        }

        const script = document.createElement("script");
        script.src = scriptSrc;
        script.dataset.designSystem = "comercio-da-cidade";
        script.onerror = () => {
            console.error("Não foi possível carregar o design system global.");
        };
        document.body.appendChild(script);
    };

    if (document.body) {
        carregarScript();
    } else {
        document.addEventListener("DOMContentLoaded", carregarScript, { once: true });
    }
}

carregarDesignSystemGlobal();


// =======================================
// SUPABASE
// =======================================

// Verifica se a biblioteca do Supabase carregou
if (!window.supabase) {

    console.error(
        "Erro: biblioteca do Supabase não foi carregada."
    );

} else {

    // Evita criar o cliente mais de uma vez
    if (!window.db) {

        window.db = window.supabase.createClient(
            "https://ikrsxmjrdnhyecjchjju.supabase.co",
            "sb_publishable_kmt3zA_tzThnXJ4EIukJpg_cQ3q9BET"
        );

    }

    console.log("Supabase conectado!");
    console.log(window.db);

}


// =======================================
// GUARDA DE CONTA EXCLUÍDA — RF-04
// =======================================

let verificandoContaRF04 = false;

function paginaAtualRF04() {
    return window.location.pathname.split("/").pop() || "index.html";
}

function limparDadosLocaisDaContaRF04() {
    localStorage.removeItem("loja_id");
    localStorage.removeItem("nome_loja");
    localStorage.removeItem("carrinho");
    localStorage.removeItem("carrinho_usuario_id");
    localStorage.removeItem("carrinho_sincronizacao_pendente");
}

async function verificarContaAtivaRF04(opcoes = {}) {
    if (!window.db || verificandoContaRF04) return true;

    verificandoContaRF04 = true;

    try {
        const { data: sessaoData, error: sessaoError } =
            await window.db.auth.getSession();

        if (sessaoError || !sessaoData?.session) {
            return true;
        }

        const { data: ativa, error } =
            await window.db.rpc("minha_conta_ativa");

        if (error) {
            console.warn("Não foi possível verificar o estado da conta:", error);
            return true;
        }

        if (ativa === false) {
            limparDadosLocaisDaContaRF04();
            sessionStorage.setItem("conta_excluida_rf04", "1");

            await window.db.auth.signOut();

            if (opcoes.redirecionar !== false) {
                const destino = "login.html?conta=excluida";
                const pagina = paginaAtualRF04();

                if (pagina !== "login.html" || !window.location.search.includes("conta=excluida")) {
                    window.location.href = destino;
                }
            }

            return false;
        }

        return true;
    } catch (erro) {
        console.warn("Falha ao verificar conta ativa:", erro);
        return true;
    } finally {
        verificandoContaRF04 = false;
    }
}

window.verificarContaAtivaRF04 = verificarContaAtivaRF04;

function notificarContaExcluidaRF04() {
    if (paginaAtualRF04() !== "login.html") return;

    const parametros = new URLSearchParams(window.location.search);
    const excluida =
        parametros.get("conta") === "excluida" ||
        sessionStorage.getItem("conta_excluida_rf04") === "1";

    if (!excluida) return;

    sessionStorage.removeItem("conta_excluida_rf04");

    const mostrar = () => {
        if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(
                "Esta conta foi excluída e não pode mais ser utilizada.",
                "info",
                "Conta excluída",
                6000
            );

            if (window.location.search.includes("conta=excluida")) {
                window.history.replaceState({}, "", "login.html");
            }

            return;
        }

        setTimeout(mostrar, 120);
    };

    setTimeout(mostrar, 0);
}

function iniciarGuardaContaRF04() {
    verificarContaAtivaRF04({ redirecionar: true });
    notificarContaExcluidaRF04();
}

if (window.db) {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciarGuardaContaRF04, { once: true });
    } else {
        iniciarGuardaContaRF04();
    }

    window.db.auth.onAuthStateChange((evento, sessao) => {
        if (evento === "SIGNED_IN" && sessao) {
            setTimeout(() => {
                verificarContaAtivaRF04({ redirecionar: true });
            }, 0);
        }
    });
}


// =======================================
// EXTENSÕES MODULARES DE PÁGINAS
// =======================================
// Mantém recursos novos isolados dos scripts legados grandes.
// As extensões são carregadas somente nas páginas correspondentes.

function carregarExtensoesDaPagina() {

    const pagina =
        window.location.pathname
            .split("/")
            .pop()
        ||
        "index.html";


    const extensoes = {

        "meus-pedidos.html": {

            css:
                "css/cancelamento-cliente.css",

            scripts: [
                "js/meus-pedidos-cancelamento.js",
                "js/meus-pedidos-historico.js",
                "js/cancelamento-observer-fix.js"
            ],

            iniciar:
                "iniciarCancelamentoCliente"

        },


        "pedidos-loja.html": {

            css:
                "css/cancelamento-cliente.css",

            scripts: [
                "js/pedidos-loja-solicitacoes.js",
                "js/cancelamento-observer-fix.js"
            ],

            iniciar:
                "iniciarSolicitacoesCancelamentoLoja"

        },


        "perfil.html": {

            css:
                "css/enderecos-cliente.css",

            scripts: [
                "js/enderecos-cliente.js",
                "js/perfil-enderecos.js",
                "js/perfil-conta.js"
            ],

            iniciar:
                "iniciarEnderecosPerfil"

        },


        "checkout.html": {

            css:
                "css/enderecos-cliente.css",

            scripts: [
                "js/enderecos-cliente.js",
                "js/checkout-enderecos.js"
            ],

            iniciar:
                "iniciarEnderecosCheckout"

        },


        "login.html": {

            scripts: [
                "js/login-admin-redirect.js"
            ],

            iniciar:
                "iniciarRedirecionamentoAdminLogin"

        },


        "painel-loja.html": {

            css:
                "css/painel-loja-aprovacao.css",

            scripts: [
                "js/painel-loja-aprovacao.js",
                "js/painel-loja-estoque.js"
            ],

            iniciar:
                "iniciarAprovacaoPainelLoja"

        }

    };


    const extensao =
        extensoes[pagina];


    if (!extensao) {
        return;
    }


    if (
        extensao.css &&
        !document.querySelector(
            `link[href="${extensao.css}"]`
        )
    ) {

        const link =
            document.createElement(
                "link"
            );


        link.rel =
            "stylesheet";


        link.href =
            extensao.css;


        document.head.appendChild(
            link
        );
    }


    const scripts =
        Array.isArray(
            extensao.scripts
        )
            ? extensao.scripts
            : [];


    const iniciarExtensao =
        () => {

            const iniciar =
                window[
                    extensao.iniciar
                ];


            if (
                typeof iniciar ===
                "function"
            ) {

                iniciar();
            }
        };


    const carregarScript =
        (indice = 0) => {

            if (
                indice >=
                scripts.length
            ) {

                iniciarExtensao();
                return;
            }


            const caminho =
                scripts[indice];


            const existente =
                document.querySelector(
                    `script[src="${caminho}"]`
                );


            if (existente) {

                carregarScript(
                    indice + 1
                );

                return;
            }


            const script =
                document.createElement(
                    "script"
                );


            script.src =
                caminho;


            script.onload =
                () => {

                    carregarScript(
                        indice + 1
                    );
                };


            script.onerror =
                () => {

                    console.error(
                        `Não foi possível carregar ${caminho}.`
                    );
                };


            document.body.appendChild(
                script
            );
        };


    const iniciarCarregamento =
        () => {

            carregarScript(
                0
            );
        };


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            iniciarCarregamento,
            {
                once: true
            }
        );


    } else {

        iniciarCarregamento();
    }
}


carregarExtensoesDaPagina();
