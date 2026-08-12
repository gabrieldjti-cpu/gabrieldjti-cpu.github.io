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
        } = await window.db

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

            .eq(
                "ativa",
                true
            )

            .order(
                "nome",
                {
                    ascending: true
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


            lista.innerHTML = `

                <div class="sem-produtos">

                    <i class="fa-solid fa-triangle-exclamation"></i>

                    <h3>
                        Erro ao carregar lojas.
                    </h3>

                    <p>
                        Tente atualizar a página.
                    </p>

                </div>

            `;


            return;

        }


        // ==================================
        // TOTAL
        // ==================================

        const lojas =
            data || [];


        const total =
            document.getElementById(
                "total-lojas"
            );


        if (total) {

            total.textContent =
                lojas.length === 1
                    ? "1 loja"
                    : `${lojas.length} lojas`;

        }


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
                        Nenhuma loja cadastrada.
                    </h3>

                    <p>
                        Ainda não existem lojas disponíveis.
                    </p>

                </div>

            `;


            return;

        }


        // ==================================
        // LIMPAR CARREGAMENTO
        // ==================================

        lista.innerHTML =
            "";


        // ==================================
        // CRIAR CARDS
        // ==================================

        lojas.forEach(
            (loja) => {

                const card =
                    criarCardLoja(
                        loja
                    );


                lista.insertAdjacentHTML(
                    "beforeend",
                    card
                );

            }
        );


    } catch (erro) {

        console.error(
            "Erro inesperado ao carregar lojas:",
            erro
        );


        lista.innerHTML = `

            <div class="sem-produtos">

                <i class="fa-solid fa-triangle-exclamation"></i>

                <h3>
                    Não foi possível carregar as lojas.
                </h3>

            </div>

        `;

    }

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


    // ==================================
    // LOGO
    // ==================================

    let logoHTML;


    if (loja.logo_url) {

        logoHTML = `

            <div class="area-logo-card">

                <img
                    src="${escaparAtributo(loja.logo_url)}"
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
            data-nome="${nome.toLowerCase()}"
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
                onclick="abrirLoja('${loja.id}')"
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


    if (!area) {

        imagem.style.display =
            "none";

        return;

    }


    const placeholder =
        area.querySelector(
            ".logo-card-placeholder"
        );


    imagem.style.display =
        "none";


    imagem.removeAttribute(
        "src"
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
        input.value
            .trim()
            .toLowerCase();


    const cards =
        document.querySelectorAll(
            "#lista-lojas .card"
        );


    cards.forEach(
        (card) => {

            const nome =
                card.dataset.nome ||
                card
                    .querySelector("h3")
                    ?.textContent
                    .toLowerCase() ||
                "";


            card.style.display =
                nome.includes(texto)
                    ? ""
                    : "none";

        }
    );

}


// ==========================================
// ABRIR LOJA
// ==========================================

function abrirLoja(
    id
) {

    if (!id) {

        return;

    }


    window.location.href =
        `loja.html?id=${encodeURIComponent(id)}`;

}


// ==========================================
// MINHA LOJA
// Mantida caso algum botão antigo utilize
// abrirMinhaLoja()
// ==========================================

async function abrirMinhaLoja() {

    if (!window.db) {

        alert(
            "Erro ao conectar com o Supabase."
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
        } = await window.db.auth.getSession();


        if (error) {

            console.error(
                "Erro ao verificar sessão:",
                error
            );


            window.location.href =
                "login.html";


            return;

        }


        const session =
            data.session;


        // ==================================
        // NÃO LOGADO
        // ==================================

        if (!session) {

            window.location.href =
                "login.html";


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
        } = await window.db

            .from("lojas")

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


            alert(
                "Erro ao verificar sua loja."
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
                loja.nome || ""
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


        window.location.href =
            "cadastrar-loja.html";


    } catch (erro) {

        console.error(
            "Erro ao abrir Minha Loja:",
            erro
        );


        alert(
            "Erro ao verificar sua loja."
        );

    }

}


// ==========================================
// ESCAPAR HTML
// ==========================================

function escaparHTML(
    valor
) {

    return String(
        valor ?? ""
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
// FUNÇÕES GLOBAIS
// Necessárias para onclick no HTML
// ==========================================

window.abrirLoja =
    abrirLoja;


window.abrirMinhaLoja =
    abrirMinhaLoja;


window.mostrarPlaceholderLogo =
    mostrarPlaceholderLogo;