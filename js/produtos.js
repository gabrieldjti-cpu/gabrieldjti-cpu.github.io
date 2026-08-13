// ==========================================
// PRODUTOS.JS
// Produtos da Loja
// Comércio da Cidade
// ==========================================

let usuario = null;

let loja = null;

let produtos = [];


// ==========================================
// INICIAR
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "Gerenciamento de produtos iniciado."
        );


        // ==================================
        // SUPABASE
        // ==================================

        if (!window.db) {

            console.error(
                "Produtos: Supabase não inicializado."
            );


            notificar(
                "Não foi possível conectar ao sistema. Atualize a página e tente novamente.",
                "erro",
                "Erro de conexão",
                6000
            );


            mostrarErroProdutos(
                "Não foi possível conectar ao sistema."
            );


            return;

        }


        // ==================================
        // USUÁRIO
        // ==================================

        const autenticado =
            await verificarUsuario();


        if (!autenticado) {

            return;

        }


        // ==================================
        // LOJA
        // ==================================

        const carregouLoja =
            await carregarLoja();


        if (!carregouLoja) {

            return;

        }


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
                pesquisarProdutos
            );

        }

    }
);


// ==========================================
// VERIFICAR USUÁRIO
// ==========================================

async function verificarUsuario() {

    try {

        // ==================================
        // SESSÃO
        // ==================================

        const {
            data: sessaoData,
            error: sessaoError
        } =
            await window.db
                .auth
                .getSession();


        if (sessaoError) {

            console.error(
                "Erro ao verificar sessão:",
                sessaoError
            );


            notificar(
                "Não foi possível verificar sua sessão.",
                "erro",
                "Erro de autenticação"
            );


            return false;

        }


        // ==================================
        // NÃO LOGADO
        // ==================================

        if (
            !sessaoData.session
        ) {

            notificar(
                "Entre na sua conta para gerenciar seus produtos.",
                "info",
                "Login necessário",
                2500
            );


            setTimeout(
                () => {

                    window.location.href =
                        "login.html";

                },
                900
            );


            return false;

        }


        // ==================================
        // USUÁRIO
        // ==================================

        const {
            data,
            error
        } =
            await window.db
                .auth
                .getUser();


        if (
            error ||
            !data.user
        ) {

            console.error(
                "Erro ao verificar usuário:",
                error
            );


            notificar(
                "Sua sessão não pôde ser validada. Entre novamente.",
                "erro",
                "Sessão inválida"
            );


            setTimeout(
                () => {

                    window.location.href =
                        "login.html";

                },
                1000
            );


            return false;

        }


        usuario =
            data.user;


        console.log(
            "Usuário conectado:",
            usuario.id
        );


        return true;


    } catch (erro) {

        console.error(
            "Erro ao verificar usuário:",
            erro
        );


        notificar(
            "Ocorreu um erro ao verificar sua conta.",
            "erro",
            "Erro de autenticação"
        );


        return false;

    }

}


// ==========================================
// CARREGAR LOJA
// ==========================================

async function carregarLoja() {

    try {

        const {
            data,
            error
        } =
            await window.db

                .from(
                    "lojas"
                )

                .select(
                    "id,nome,ativa"
                )

                .eq(
                    "proprietario_id",
                    usuario.id
                )

                .maybeSingle();


        if (error) {

            throw error;

        }


        // ==================================
        // SEM LOJA
        // ==================================

        if (!data) {

            localStorage.removeItem(
                "loja_id"
            );


            localStorage.removeItem(
                "nome_loja"
            );


            notificar(
                "Você ainda não possui uma loja cadastrada.",
                "aviso",
                "Loja não encontrada",
                3000
            );


            setTimeout(
                () => {

                    window.location.href =
                        "cadastrar-loja.html";

                },
                1100
            );


            return false;

        }


        loja =
            data;


        // ==================================
        // LOCAL STORAGE
        // ==================================

        localStorage.setItem(
            "loja_id",
            loja.id
        );


        localStorage.setItem(
            "nome_loja",
            loja.nome ||
            ""
        );


        // ==================================
        // CARREGAR PRODUTOS
        // ==================================

        await carregarProdutos();


        return true;


    } catch (erro) {

        console.error(
            "Erro ao carregar loja:",
            erro
        );


        mostrarErroProdutos(
            "Não foi possível carregar sua loja."
        );


        notificar(
            tratarErroProdutos(
                erro
            ),
            "erro",
            "Erro ao carregar loja",
            5000
        );


        return false;

    }

}


// ==========================================
// CARREGAR PRODUTOS
// ==========================================

async function carregarProdutos() {

    if (
        !loja?.id
    ) {

        return;

    }


    const lista =
        document.getElementById(
            "lista-produtos"
        );


    if (!lista) {

        console.error(
            "#lista-produtos não encontrado."
        );


        return;

    }


    // ==================================
    // CARREGANDO
    // ==================================

    lista.innerHTML = `

        <div class="sem-produtos">

            <i class="fa-solid fa-spinner fa-spin"></i>

            <h2>
                Carregando produtos...
            </h2>

        </div>

    `;


    try {

        const {
            data,
            error
        } =
            await window.db

                .from(
                    "produtos"
                )

                .select(`
                    *,
                    categorias_produtos!categoria_id(
                        nome
                    )
                `)

                .eq(
                    "loja_id",
                    loja.id
                )

                .order(
                    "created_at",
                    {
                        ascending:
                            false
                    }
                );


        if (error) {

            throw error;

        }


        produtos =
            Array.isArray(data)
                ? data
                : [];


        renderizarProdutos(
            produtos,
            false
        );


    } catch (erro) {

        console.error(
            "Erro ao carregar produtos:",
            erro
        );


        mostrarErroProdutos(
            "Não foi possível carregar os produtos da sua loja."
        );


        notificar(
            tratarErroProdutos(
                erro
            ),
            "erro",
            "Erro ao carregar produtos",
            5000
        );

    }

}


// ==========================================
// RENDERIZAR PRODUTOS
// ==========================================

function renderizarProdutos(
    listaProdutos,
    pesquisando = false
) {

    const lista =
        document.getElementById(
            "lista-produtos"
        );


    if (!lista) {

        return;

    }


    lista.innerHTML =
        "";


    const itens =
        Array.isArray(
            listaProdutos
        )
            ? listaProdutos
            : [];


    // ==================================
    // NENHUM RESULTADO DA PESQUISA
    // ==================================

    if (
        itens.length === 0 &&
        pesquisando
    ) {

        lista.innerHTML = `

            <div class="sem-produtos">

                <i class="fa-solid fa-magnifying-glass"></i>

                <h2>
                    Nenhum produto encontrado.
                </h2>

                <p>
                    Tente pesquisar usando outro nome
                    ou descrição.
                </p>

            </div>

        `;


        return;

    }


    // ==================================
    // NENHUM PRODUTO CADASTRADO
    // ==================================

    if (
        itens.length === 0
    ) {

        lista.innerHTML = `

            <div class="sem-produtos">

                <i class="fa-solid fa-box-open"></i>

                <h2>
                    Nenhum produto cadastrado.
                </h2>

                <p>
                    Cadastre um novo produto
                    para começar.
                </p>

                <a
                    href="novo-produto.html"
                    class="btn"
                >

                    <i class="fa-solid fa-plus"></i>

                    Novo Produto

                </a>

            </div>

        `;


        return;

    }


    // ==================================
    // CRIAR CARDS
    // ==================================

    lista.innerHTML =
        itens
            .map(
                criarCardProduto
            )
            .join("");


    configurarImagensProdutos();

}


// ==========================================
// CRIAR CARD DO PRODUTO
// ==========================================

function criarCardProduto(
    produto
) {

    const id =
        escaparHTML(
            produto.id ||
            ""
        );


    const nome =
        escaparHTML(
            produto.nome ||
            "Produto"
        );


    const descricao =
        escaparHTML(
            produto.descricao ||
            "Sem descrição."
        );


    const categoria =
        escaparHTML(
            produto
                .categorias_produtos
                ?.nome ||
            "Sem categoria"
        );


    const preco =
        Number(
            produto.preco ||
            0
        );


    const precoPromocional =
        Number(
            produto.preco_promocional ||
            0
        );


    const estoque =
        Math.max(
            0,
            Number(
                produto.estoque ||
                0
            )
        );


    const temPromocao =
        precoPromocional > 0 &&
        precoPromocional < preco;


    // ==================================
    // IMAGEM
    // ==================================

    let imagemHTML =
        "";


    if (
        produto.imagem_url
    ) {

        imagemHTML = `

            <div class="area-imagem-produto">

                <img
                    src="${escaparHTML(
                        produto.imagem_url
                    )}"
                    alt="${nome}"
                    class="imagem-produto"
                    loading="lazy"
                >

                <div
                    class="imagem-produto-placeholder"
                    style="display:none;"
                >

                    <i class="fa-solid fa-box"></i>

                </div>

            </div>

        `;


    } else {

        imagemHTML = `

            <div class="area-imagem-produto">

                <div
                    class="imagem-produto-placeholder"
                >

                    <i class="fa-solid fa-box"></i>

                </div>

            </div>

        `;

    }


    // ==================================
    // PREÇOS
    // ==================================

    let precoHTML =
        "";


    if (
        temPromocao
    ) {

        precoHTML = `

            <strong>

                ${formatarMoeda(
                    precoPromocional
                )}

            </strong>


            <span class="promo">

                De
                ${formatarMoeda(
                    preco
                )}

            </span>

        `;


    } else {

        precoHTML = `

            <strong>

                ${formatarMoeda(
                    preco
                )}

            </strong>

        `;

    }


    // ==================================
    // CARD
    // ==================================

    return `

        <div class="produto-card">

            ${imagemHTML}


            <div class="produto-info">

                <span class="categoria">

                    ${categoria}

                </span>


                <h3>

                    ${nome}

                </h3>


                <p>

                    ${descricao}

                </p>


                <div class="preco">

                    ${precoHTML}

                </div>


                <p>

                    <strong>
                        Estoque:
                    </strong>

                    ${estoque}

                </p>


                <p>

                    ${
                        produto.ativo
                            ? `

                                <span class="ativo">

                                    🟢 Ativo

                                </span>

                            `
                            : `

                                <span class="inativo">

                                    🔴 Inativo

                                </span>

                            `
                    }

                </p>

            </div>


            <div class="acoes">

                <button
                    type="button"
                    onclick="editarProduto('${id}')"
                >

                    <i class="fa-solid fa-pen"></i>

                    Editar

                </button>


                <button
                    type="button"
                    class="btn-excluir"
                    data-produto-id="${id}"
                    onclick="excluirProduto('${id}')"
                >

                    <i class="fa-solid fa-trash"></i>

                    Excluir

                </button>

            </div>

        </div>

    `;

}


// ==========================================
// IMAGENS DOS PRODUTOS
// ==========================================

function configurarImagensProdutos() {

    const imagens =
        document.querySelectorAll(
            "#lista-produtos .area-imagem-produto img"
        );


    imagens.forEach(
        (imagem) => {

            imagem.addEventListener(
                "error",
                () => {

                    const area =
                        imagem.closest(
                            ".area-imagem-produto"
                        );


                    imagem.style.display =
                        "none";


                    imagem.removeAttribute(
                        "src"
                    );


                    const placeholder =
                        area?.querySelector(
                            ".imagem-produto-placeholder"
                        );


                    if (placeholder) {

                        placeholder.style.display =
                            "flex";

                    }

                },
                {
                    once:
                        true
                }
            );

        }
    );

}


// ==========================================
// PESQUISAR
// ==========================================

function pesquisarProdutos() {

    const pesquisa =
        document.getElementById(
            "pesquisa"
        );


    if (!pesquisa) {

        return;

    }


    const texto =
        normalizarTexto(
            pesquisa.value
        );


    // ==================================
    // PESQUISA VAZIA
    // ==================================

    if (!texto) {

        renderizarProdutos(
            produtos,
            false
        );


        return;

    }


    const resultado =
        produtos.filter(
            (produto) => {

                const nome =
                    normalizarTexto(
                        produto.nome
                    );


                const descricao =
                    normalizarTexto(
                        produto.descricao
                    );


                const categoria =
                    normalizarTexto(
                        produto
                            .categorias_produtos
                            ?.nome
                    );


                return (
                    nome.includes(
                        texto
                    )
                    ||
                    descricao.includes(
                        texto
                    )
                    ||
                    categoria.includes(
                        texto
                    )
                );

            }
        );


    renderizarProdutos(
        resultado,
        true
    );

}


// ==========================================
// EDITAR PRODUTO
// ==========================================

function editarProduto(
    id
) {

    if (!id) {

        notificar(
            "Não foi possível identificar este produto.",
            "erro",
            "Produto não encontrado"
        );


        return;

    }


    window.location.href =
        `editar-produto.html?id=${encodeURIComponent(
            id
        )}`;

}


// ==========================================
// EXCLUIR PRODUTO
// ==========================================

async function excluirProduto(
    id
) {

    if (!id) {

        notificar(
            "Não foi possível identificar este produto.",
            "erro",
            "Produto não encontrado"
        );


        return;

    }


    if (!loja?.id) {

        notificar(
            "Não foi possível identificar sua loja.",
            "erro",
            "Loja não encontrada"
        );


        return;

    }


    // ==================================
    // LOCALIZAR PRODUTO
    // ==================================

    const produto =
        produtos.find(
            (item) =>
                String(
                    item.id
                ) ===
                String(
                    id
                )
        );


    const nomeProduto =
        produto?.nome ||
        "Produto";


    // ==================================
    // CONFIRMAÇÃO PERSONALIZADA
    // ==================================

    if (
        typeof window.confirmarAcao !==
        "function"
    ) {

        console.error(
            "feedback.js não foi carregado."
        );


        notificar(
            "Não foi possível abrir a confirmação de exclusão.",
            "erro",
            "Erro na confirmação"
        );


        return;

    }


    const confirmou =
        await window.confirmarAcao({

            titulo:
                "Excluir produto?",

            mensagem:
                `Deseja realmente excluir "${nomeProduto}"? Essa ação não poderá ser desfeita.`,

            textoConfirmar:
                "Sim, excluir",

            textoCancelar:
                "Cancelar",

            perigo:
                true

        });


    if (!confirmou) {

        return;

    }


    // ==================================
    // BOTÃO
    // ==================================

    const botao =
        localizarBotaoExcluir(
            id
        );


    const conteudoOriginal =
        botao?.innerHTML;


    if (botao) {

        botao.disabled =
            true;


        botao.innerHTML = `

            <i class="fa-solid fa-spinner fa-spin"></i>

            Excluindo...

        `;

    }


    try {

        const {
            error
        } =
            await window.db

                .from(
                    "produtos"
                )

                .delete()

                .eq(
                    "id",
                    id
                )

                .eq(
                    "loja_id",
                    loja.id
                );


        if (error) {

            throw error;

        }


        // ==================================
        // SUCESSO
        // ==================================

        notificar(
            `"${nomeProduto}" foi excluído com sucesso.`,
            "sucesso",
            "Produto excluído!",
            3000
        );


        // ==================================
        // ATUALIZAR LISTA
        // ==================================

        await carregarProdutos();


    } catch (erro) {

        console.error(
            "Erro ao excluir produto:",
            erro
        );


        notificar(
            tratarErroProdutos(
                erro
            ),
            "erro",
            "Não foi possível excluir",
            5000
        );


        if (botao) {

            botao.disabled =
                false;


            botao.innerHTML =
                conteudoOriginal ||
                `

                    <i class="fa-solid fa-trash"></i>

                    Excluir

                `;

        }

    }

}


// ==========================================
// LOCALIZAR BOTÃO DE EXCLUSÃO
// ==========================================

function localizarBotaoExcluir(
    id
) {

    const botoes =
        document.querySelectorAll(
            ".btn-excluir[data-produto-id]"
        );


    return Array.from(
        botoes
    )
        .find(
            (botao) =>
                String(
                    botao.dataset.produtoId
                ) ===
                String(
                    id
                )
        )
        ||
        null;

}


// ==========================================
// MOSTRAR ERRO NA LISTA
// ==========================================

function mostrarErroProdutos(
    mensagem
) {

    const lista =
        document.getElementById(
            "lista-produtos"
        );


    if (!lista) {

        return;

    }


    lista.innerHTML = `

        <div class="sem-produtos">

            <i class="fa-solid fa-triangle-exclamation"></i>

            <h2>
                Não foi possível carregar os produtos.
            </h2>

            <p>

                ${escaparHTML(
                    mensagem
                )}

            </p>

            <button
                type="button"
                class="btn"
                onclick="carregarProdutos()"
            >

                <i class="fa-solid fa-rotate-right"></i>

                Tentar novamente

            </button>

        </div>

    `;

}


// ==========================================
// TRATAR ERROS
// ==========================================

function tratarErroProdutos(
    erro
) {

    const texto =
        String(
            erro?.message ||
            ""
        )
            .toLowerCase();


    // ==================================
    // RLS
    // ==================================

    if (
        texto.includes(
            "row-level security"
        )
        ||
        texto.includes(
            "rls"
        )
    ) {

        return (
            "Sua conta não possui permissão para realizar esta ação."
        );

    }


    // ==================================
    // RELACIONAMENTOS
    // ==================================

    if (
        texto.includes(
            "foreign key"
        )
        ||
        texto.includes(
            "violates foreign key"
        )
    ) {

        return (
            "Este produto possui registros relacionados e não pode ser excluído."
        );

    }


    // ==================================
    // REDE
    // ==================================

    if (
        texto.includes(
            "failed to fetch"
        )
        ||
        texto.includes(
            "network"
        )
    ) {

        return (
            "Não foi possível conectar ao servidor. Verifique sua internet."
        );

    }


    // ==================================
    // PADRÃO
    // ==================================

    return (
        erro?.message ||
        "Ocorreu um erro. Tente novamente."
    );

}


// ==========================================
// NORMALIZAR TEXTO
// Ignora acentos e maiúsculas
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
// FORMATAR MOEDA
// ==========================================

function formatarMoeda(
    valor
) {

    return Number(
        valor ||
        0
    )
        .toLocaleString(
            "pt-BR",
            {
                style:
                    "currency",

                currency:
                    "BRL"
            }
        );

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
// LOGOUT
// ==========================================

async function fazerLogout() {

    if (
        typeof window.confirmarAcao !==
        "function"
    ) {

        console.error(
            "feedback.js não foi carregado."
        );


        return;

    }


    const confirmou =
        await window.confirmarAcao({

            titulo:
                "Sair da conta?",

            mensagem:
                "Deseja realmente sair da sua conta?",

            textoConfirmar:
                "Sim, sair",

            textoCancelar:
                "Cancelar",

            perigo:
                true

        });


    if (!confirmou) {

        return;

    }


    try {

        const {
            error
        } =
            await window.db
                .auth
                .signOut();


        if (error) {

            throw error;

        }


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
            "Erro ao sair:",
            erro
        );


        notificar(
            "Não foi possível sair da sua conta.",
            "erro",
            "Erro ao sair"
        );

    }

}


// ==========================================
// FUNÇÕES GLOBAIS
// ==========================================

window.editarProduto =
    editarProduto;


window.excluirProduto =
    excluirProduto;


window.fazerLogout =
    fazerLogout;


window.carregarProdutos =
    carregarProdutos;