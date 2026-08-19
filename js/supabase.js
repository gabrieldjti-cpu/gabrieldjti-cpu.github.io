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
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrcnN4bWpyZG5oeWVjamNoamp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMDE5MjAsImV4cCI6MjA5MzY3NzkyMH0.7Pm_MR0nPwVhed0xV5ndvZX91EX-NS7DWZq5-5vF1Hg"
        );

    }

    console.log("Supabase conectado!");
    console.log(window.db);

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
