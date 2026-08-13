// ==========================================
// INDEX.JS
// Página inicial - Comércio da Cidade
// ==========================================


// ==========================================
// INICIAR
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "Página inicial iniciada."
        );


        // ==================================
        // VERIFICAR SUPABASE
        // ==================================

        if (!window.db) {

            console.error(
                "Index: Supabase não foi inicializado."
            );


            notificar(
                "Não foi possível conectar ao sistema. Atualize a página e tente novamente.",
                "erro",
                "Erro de conexão",
                6000
            );


            mostrarErroLojas();


            return;

        }


        // ==================================
        // CARREGAR LOJAS
        // ==================================

        await carregarLojas();


        // ==================================
        // PESQUISA
        // ==================================

        const pesquisa =
            document.getElementById(
                "pesquisa"
            );


        if (pesquisa) {

            pesquisa.addEventListener(
                "input",
                pesquisarLojas
            );

        }

    }
);


// ==========================================
// CARREGAR LOJAS
// ==========================================

async function carregarLojas() {

    const lista =
        document.getElementById(
            "lista-lojas"
        );


    if (!lista) {

        console.warn(
            "#lista-lojas não encontrado."
        );


        return;

    }


    // ==================================
    // CARREGANDO
    // ==================================

    lista.innerHTML = `

        <div class="carregando">

            <i class="fa-solid fa-spinner fa-spin"></i>

            <p>
                Carregando lojas...
            </p>

        </div>

    `;


    try {

        // ==================================
        // BUSCAR LOJAS
        // ==================================

        const {
            data,
            error
        } =
            await window.db

                .from(
                    "lojas"
                )

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

                .eq(
                    "ativa",
                    true
                )

                .order(
                    "nome",
                    {
                        ascending:
                            true
                    }
                );


        // ==================================
        // ERRO
        // ==================================

        if (error) {

            console.error(
                "Erro ao carregar lojas:",
                error
            );


            mostrarErroLojas();


            notificar(
                "Não foi possível carregar as lojas disponíveis.",
                "erro",
                "Erro ao carregar lojas",
                5000
            );


            return;

        }


        // ==================================
        // TOTAL
        // ==================================

        const lojas =
            Array.isArray(data)
                ? data
                : [];


        atualizarTotalLojas(
            lojas.length
        );


        // ==================================
        // NENHUMA LOJA
        // ==================================

        if (
            lojas.length === 0
        ) {

            lista.innerHTML = `

                <div class="sem-produtos">

                    <i class="fa-solid fa-store-slash"></i>

                    <h3>
                        Nenhuma loja disponível.
                    </h3>

                    <p>
                        Ainda não existem lojas disponíveis no momento.
                    </p>

                </div>

            `;


            return;

        }


        // ==================================
        // CRIAR CARDS
        // ==================================

        lista.innerHTML =
            lojas
                .map(
                    criarCardLoja
                )
                .join("");


    } catch (erro) {

        console.error(
            "Erro inesperado ao carregar lojas:",
            erro
        );


        mostrarErroLojas();


        notificar(
            "Ocorreu um erro inesperado ao carregar as lojas.",
            "erro",
            "Não foi possível carregar",
            5000
        );

    }

}


// ==========================================
// MOSTRAR ERRO DAS LOJAS
// ==========================================

function mostrarErroLojas() {

    const lista =
        document.getElementById(
            "lista-lojas"
        );


    if (!lista) {

        return;

    }


    lista.innerHTML = `

        <div class="sem-produtos">

            <i class="fa-solid fa-triangle-exclamation"></i>

            <h3>
                Não foi possível carregar as lojas.
            </h3>

            <p>
                Atualize a página e tente novamente.
            </p>

            <button
                type="button"
                class="btn"
                onclick="window.location.reload()"
            >

                <i class="fa-solid fa-rotate-right"></i>

                Tentar novamente

            </button>

        </div>

    `;

}


// ==========================================
// ATUALIZAR TOTAL DE LOJAS
// ==========================================

function atualizarTotalLojas(
    quantidade
) {

    const total =
        document.getElementById(
            "total-lojas"
        );


    if (!total) {

        return;

    }


    total.textContent =
        quantidade === 1
            ? "1 loja"
            : `${quantidade} lojas`;

}


// ==========================================
// CRIAR CARD DA LOJA
// ==========================================

function criarCardLoja(
    loja
) {

    const nome =
        escaparHTML(
            loja.nome ||
            "Loja"
        );


    const cidade =
        escaparHTML(
            loja.cidade ||
            "Cidade não informada"
        );


    const categoria =
        escaparHTML(
            loja.categorias?.nome ||
            "Sem categoria"
        );


    const lojaId =
        escaparAtributo(
            loja.id ||
            ""
        );


    // ==================================
    // LOGO
    // ==================================

    let logoHTML;


    if (
        loja.logo_url
    ) {

        logoHTML = `

            <div class="area-logo-card">

                <img
                    src="${escaparAtributo(
                        loja.logo_url
                    )}"
                    alt="Logo da ${nome}"
                    class="logo-card-loja"
                    loading="lazy"
                    onerror="mostrarPlaceholderLogo(this)"
                >

                <div
                    class="logo-card-placeholder"
                    style="display:none;"
                >

                    <i class="fa-solid fa-store"></i>

                </div>

            </div>

        `;


    } else {

        logoHTML = `

            <div class="area-logo-card">

                <div class="logo-card-placeholder">

                    <i class="fa-solid fa-store"></i>

                </div>

            </div>

        `;

    }


    // ==================================
    // CARD
    // ==================================

    return `

        <div
            class="card"
            data-nome="${escaparAtributo(
                normalizarTexto(
                    loja.nome ||
                    ""
                )
            )}"
        >

            ${logoHTML}


            <h3>
                ${nome}
            </h3>


            <p>

                <i class="fa-solid fa-layer-group"></i>

                ${categoria}

            </p>


            <p>

                <i class="fa-solid fa-location-dot"></i>

                ${cidade}

            </p>


            <button
                type="button"
                onclick="abrirLoja('${lojaId}')"
            >

                <i class="fa-solid fa-store"></i>

                Ver Loja

            </button>

        </div>

    `;

}


// ==========================================
// IMAGEM COM ERRO
// ==========================================

function mostrarPlaceholderLogo(
    imagem
) {

    if (!imagem) {

        return;

    }


    const area =
        imagem.closest(
            ".area-logo-card"
        );


    imagem.style.display =
        "none";


    imagem.removeAttribute(
        "src"
    );


    if (!area) {

        return;

    }


    const placeholder =
        area.querySelector(
            ".logo-card-placeholder"
        );


    if (placeholder) {

        placeholder.style.display =
            "flex";

    }

}


// ==========================================
// PESQUISAR LOJAS
// ==========================================

function pesquisarLojas() {

    const input =
        document.getElementById(
            "pesquisa"
        );


    if (!input) {

        return;

    }


    const texto =
        normalizarTexto(
            input.value
        );


    const cards =
        document.querySelectorAll(
            "#lista-lojas .card"
        );


    let encontrados =
        0;


    cards.forEach(
        (card) => {

            const nome =
                card.dataset.nome ||
                normalizarTexto(
                    card
                        .querySelector(
                            "h3"
                        )
                        ?.textContent ||
                    ""
                );


            const encontrou =
                nome.includes(
                    texto
                );


            card.style.display =
                encontrou
                    ? ""
                    : "none";


            if (encontrou) {

                encontrados++;

            }

        }
    );


    atualizarMensagemPesquisa(
        texto,
        encontrados,
        cards.length
    );

}


// ==========================================
// MENSAGEM DA PESQUISA
// ==========================================

function atualizarMensagemPesquisa(
    texto,
    encontrados,
    totalCards
) {

    const lista =
        document.getElementById(
            "lista-lojas"
        );


    if (!lista) {

        return;

    }


    let mensagem =
        document.getElementById(
            "nenhuma-loja-pesquisa"
        );


    // ==================================
    // SEM PESQUISA
    // ==================================

    if (
        !texto ||
        totalCards === 0 ||
        encontrados > 0
    ) {

        if (mensagem) {

            mensagem.remove();

        }


        return;

    }


    // ==================================
    // NENHUM RESULTADO
    // ==================================

    if (!mensagem) {

        mensagem =
            document.createElement(
                "div"
            );


        mensagem.id =
            "nenhuma-loja-pesquisa";


        mensagem.className =
            "sem-produtos";


        lista.appendChild(
            mensagem
        );

    }


    mensagem.innerHTML = `

        <i class="fa-solid fa-magnifying-glass"></i>

        <h3>
            Nenhuma loja encontrada.
        </h3>

        <p>
            Tente pesquisar usando outro nome.
        </p>

    `;

}


// ==========================================
// ABRIR LOJA
// ==========================================

function abrirLoja(
    id
) {

    if (!id) {

        notificar(
            "Não foi possível identificar esta loja.",
            "erro",
            "Loja indisponível"
        );


        return;

    }


    window.location.href =
        `loja.html?id=${encodeURIComponent(
            id
        )}`;

}


// ==========================================
// MINHA LOJA
// Mantida caso algum botão antigo utilize
// abrirMinhaLoja()
// ==========================================

async function abrirMinhaLoja() {

    if (!window.db) {

        notificar(
            "Não foi possível conectar ao sistema.",
            "erro",
            "Erro de conexão"
        );


        return;

    }


    try {

        // ==================================
        // VERIFICAR SESSÃO
        // ==================================

        const {
            data,
            error
        } =
            await window.db
                .auth
                .getSession();


        if (error) {

            console.error(
                "Erro ao verificar sessão:",
                error
            );


            notificar(
                "Não foi possível verificar sua sessão.",
                "erro",
                "Erro de autenticação"
            );


            return;

        }


        const session =
            data.session;


        // ==================================
        // NÃO LOGADO
        // ==================================

        if (!session) {

            notificar(
                "Entre na sua conta para acessar sua loja.",
                "info",
                "Login necessário",
                2500
            );


            setTimeout(
                () => {

                    window.location.href =
                        "login.html";

                },
                800
            );


            return;

        }


        const user =
            session.user;


        // ==================================
        // BUSCAR LOJA
        // ==================================

        const {
            data: loja,
            error: lojaError
        } =
            await window.db

                .from(
                    "lojas"
                )

                .select(
                    "id,nome"
                )

                .eq(
                    "proprietario_id",
                    user.id
                )

                .maybeSingle();


        if (lojaError) {

            console.error(
                "Erro ao verificar sua loja:",
                lojaError
            );


            notificar(
                "Não foi possível verificar sua loja.",
                "erro",
                "Erro ao carregar loja"
            );


            return;

        }


        // ==================================
        // POSSUI LOJA
        // ==================================

        if (loja) {

            localStorage.setItem(
                "loja_id",
                loja.id
            );


            localStorage.setItem(
                "nome_loja",
                loja.nome ||
                ""
            );


            window.location.href =
                "painel-loja.html";


            return;

        }


        // ==================================
        // NÃO POSSUI LOJA
        // ==================================

        localStorage.removeItem(
            "loja_id"
        );


        localStorage.removeItem(
            "nome_loja"
        );


        notificar(
            "Você ainda não possui uma loja cadastrada.",
            "info",
            "Crie sua loja",
            2500
        );


        setTimeout(
            () => {

                window.location.href =
                    "cadastrar-loja.html";

            },
            800
        );


    } catch (erro) {

        console.error(
            "Erro ao abrir Minha Loja:",
            erro
        );


        notificar(
            "Ocorreu um erro ao verificar sua loja.",
            "erro",
            "Não foi possível continuar"
        );

    }

}


// ==========================================
// NORMALIZAR TEXTO
// Melhora a busca com acentos
// ==========================================

function normalizarTexto(
    valor
) {

    return String(
        valor ??
        ""
    )

        .normalize(
            "NFD"
        )

        .replace(
            /[\u0300-\u036f]/g,
            ""
        )

        .trim()

        .toLowerCase();

}


// ==========================================
// ESCAPAR HTML
// ==========================================

function escaparHTML(
    valor
) {

    return String(
        valor ??
        ""
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


// ==========================================
// ESCAPAR ATRIBUTO
// ==========================================

function escaparAtributo(
    valor
) {

    return escaparHTML(
        valor
    );

}


// ==========================================
// FEEDBACK
// ==========================================

function notificar(
    texto,
    tipo = "info",
    titulo = null,
    duracao = 4000
) {

    if (
        typeof window.mostrarAlerta ===
        "function"
    ) {

        window.mostrarAlerta(
            texto,
            tipo,
            titulo,
            duracao
        );


        return;

    }


    console.warn(
        `[${tipo}] ${titulo || ""}`,
        texto
    );

}


// ==========================================
// FUNÇÕES GLOBAIS
// Necessárias para onclick no HTML
// ==========================================

window.abrirLoja =
    abrirLoja;


window.abrirMinhaLoja =
    abrirMinhaLoja;


window.mostrarPlaceholderLogo =
    mostrarPlaceholderLogo;