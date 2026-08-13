// ==========================================
// MEUS-PEDIDOS.JS
// Comércio da Cidade
// ==========================================

let usuario = null;

let pedidos = [];

let filtroAtual = "todos";


// ==========================================
// INICIAR
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "Meus pedidos iniciado."
        );


        // ==================================
        // SUPABASE
        // ==================================

        if (!window.db) {

            console.error(
                "Meus Pedidos: Supabase não inicializado."
            );


            mostrarErro(
                "Não foi possível conectar ao banco de dados."
            );


            notificar(
                "Não foi possível conectar ao sistema. Atualize a página e tente novamente.",
                "erro",
                "Erro de conexão",
                6000
            );


            return;

        }


        // ==================================
        // AUTENTICAÇÃO
        // ==================================

        const autenticado =
            await verificarUsuario();


        if (!autenticado) {

            return;

        }


        // ==================================
        // EVENTOS
        // ==================================

        configurarFiltros();

        configurarModal();


        // ==================================
        // CARREGAR PEDIDOS
        // ==================================

        await carregarPedidos();

    }
);


// ==========================================
// VERIFICAR USUÁRIO
// ==========================================

async function verificarUsuario() {

    try {

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


            return false;

        }


        // ==================================
        // NÃO LOGADO
        // ==================================

        if (
            !data.session
        ) {

            notificar(
                "Entre na sua conta para visualizar seus pedidos.",
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


        usuario =
            data.session.user;


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
// CARREGAR PEDIDOS
// ==========================================

async function carregarPedidos() {

    const lista =
        document.getElementById(
            "lista-pedidos"
        );


    if (!lista) {

        console.error(
            "#lista-pedidos não encontrado."
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
                Carregando seus pedidos...
            </p>

        </div>

    `;


    try {

        const {
            data,
            error
        } =
            await window.db

                .from(
                    "pedidos"
                )

                .select(`
                    id,
                    cliente_id,
                    loja_id,
                    status,
                    valor_total,
                    forma_pagamento,
                    observacoes,
                    created_at,

                    lojas (
                        id,
                        nome
                    ),

                    itens_pedido (
                        id,
                        produto_id,
                        quantidade,
                        preco_unitario,
                        subtotal,

                        produtos (
                            id,
                            nome,
                            imagem_url
                        )
                    )
                `)

                .eq(
                    "cliente_id",
                    usuario.id
                )

                .order(
                    "created_at",
                    {
                        ascending:
                            false
                    }
                );


        if (error) {

            console.error(
                "Erro ao buscar pedidos:",
                error
            );


            mostrarErro(
                "Não foi possível carregar seus pedidos."
            );


            notificar(
                "Não foi possível carregar seu histórico de pedidos.",
                "erro",
                "Erro ao carregar pedidos",
                5000
            );


            return;

        }


        pedidos =
            Array.isArray(data)
                ? data
                : [];


        console.log(
            "Pedidos encontrados:",
            pedidos
        );


        aplicarFiltro();


    } catch (erro) {

        console.error(
            "Erro inesperado ao carregar pedidos:",
            erro
        );


        mostrarErro(
            "Ocorreu um erro ao carregar seus pedidos."
        );


        notificar(
            "Ocorreu um erro inesperado ao carregar seus pedidos.",
            "erro",
            "Não foi possível carregar",
            5000
        );

    }

}


// ==========================================
// MOSTRAR PEDIDOS
// ==========================================

function mostrarPedidos(
    listaPedidos
) {

    const lista =
        document.getElementById(
            "lista-pedidos"
        );


    if (!lista) {

        return;

    }


    // ==================================
    // NENHUM PEDIDO
    // ==================================

    if (
        !listaPedidos ||
        listaPedidos.length === 0
    ) {

        if (
            filtroAtual ===
            "todos"
        ) {

            lista.innerHTML = `

                <div class="sem-pedidos">

                    <i class="fa-solid fa-box-open"></i>

                    <h3>
                        Você ainda não possui pedidos.
                    </h3>

                    <p>
                        Quando realizar uma compra,
                        seus pedidos aparecerão aqui.
                    </p>

                    <a
                        href="index.html"
                        class="btn-comprar"
                    >

                        <i class="fa-solid fa-store"></i>

                        Explorar lojas

                    </a>

                </div>

            `;


        } else {

            lista.innerHTML = `

                <div class="sem-pedidos">

                    <i class="fa-solid fa-magnifying-glass"></i>

                    <h3>
                        Nenhum pedido encontrado.
                    </h3>

                    <p>
                        Você não possui pedidos
                        com esse status.
                    </p>

                </div>

            `;

        }


        return;

    }


    // ==================================
    // CRIAR CARDS
    // ==================================

    lista.innerHTML =
        listaPedidos
            .map(
                criarCardPedido
            )
            .join("");


    configurarBotoesDetalhes();

}


// ==========================================
// CRIAR CARD
// ==========================================

function criarCardPedido(
    pedido
) {

    const nomeLoja =
        escaparHTML(
            pedido.lojas?.nome ||
            "Loja"
        );


    const status =
        obterDadosStatus(
            pedido.status
        );


    const quantidadeItens =
        calcularQuantidadeItens(
            pedido
        );


    const pagamento =
        formatarPagamento(
            pedido.forma_pagamento
        );


    const numero =
        formatarNumeroPedido(
            pedido.id
        );


    const data =
        formatarData(
            pedido.created_at
        );


    const total =
        formatarMoeda(
            pedido.valor_total
        );


    return `

        <article
            class="pedido-card"
            data-status="${status.filtro}"
        >

            <div class="pedido-topo">

                <div class="pedido-loja">

                    <i class="fa-solid fa-store"></i>

                    <span>
                        ${nomeLoja}
                    </span>

                </div>


                <span
                    class="
                        status-pedido
                        ${status.classe}
                    "
                >

                    <i class="${status.icone}"></i>

                    ${status.texto}

                </span>

            </div>


            <div class="pedido-conteudo">

                <div class="numero-pedido">

                    Pedido
                    #${numero}

                </div>


                <div class="data-pedido">

                    <i class="fa-regular fa-calendar"></i>

                    ${data}

                </div>


                <div class="pedido-infos">

                    <div class="info-pedido">

                        <span>
                            Produtos
                        </span>

                        <strong>

                            ${quantidadeItens}

                            ${
                                quantidadeItens === 1
                                    ? "item"
                                    : "itens"
                            }

                        </strong>

                    </div>


                    <div class="info-pedido">

                        <span>
                            Pagamento
                        </span>

                        <strong>
                            ${pagamento}
                        </strong>

                    </div>

                </div>


                <div class="pedido-total">

                    <span>
                        Total do pedido
                    </span>

                    <strong>
                        ${total}
                    </strong>

                </div>


                <div class="pedido-acoes">

                    <button
                        type="button"
                        class="btn-detalhes"
                        data-pedido-id="${escaparHTML(
                            pedido.id
                        )}"
                    >

                        <i class="fa-solid fa-eye"></i>

                        Ver detalhes

                    </button>

                </div>

            </div>

        </article>

    `;

}


// ==========================================
// QUANTIDADE DE ITENS
// ==========================================

function calcularQuantidadeItens(
    pedido
) {

    const itens =
        Array.isArray(
            pedido.itens_pedido
        )
            ? pedido.itens_pedido
            : [];


    return itens.reduce(
        (
            total,
            item
        ) => {

            const quantidade =
                Number(
                    item.quantidade ||
                    0
                );


            return (
                total +
                (
                    Number.isFinite(
                        quantidade
                    )
                        ? quantidade
                        : 0
                )
            );

        },
        0
    );

}


// ==========================================
// CONFIGURAR FILTROS
// ==========================================

function configurarFiltros() {

    const botoes =
        document.querySelectorAll(
            ".filtro"
        );


    botoes.forEach(
        (botao) => {

            botao.addEventListener(
                "click",
                () => {

                    botoes.forEach(
                        (item) => {

                            item.classList.remove(
                                "ativo"
                            );

                        }
                    );


                    botao.classList.add(
                        "ativo"
                    );


                    filtroAtual =
                        botao.dataset.status ||
                        "todos";


                    aplicarFiltro();

                }
            );

        }
    );

}


// ==========================================
// APLICAR FILTRO
// ==========================================

function aplicarFiltro() {

    if (
        filtroAtual ===
        "todos"
    ) {

        mostrarPedidos(
            pedidos
        );


        return;

    }


    const filtrados =
        pedidos.filter(
            (pedido) => {

                const status =
                    obterDadosStatus(
                        pedido.status
                    );


                return (
                    status.filtro ===
                    filtroAtual
                );

            }
        );


    mostrarPedidos(
        filtrados
    );

}


// ==========================================
// DADOS DO STATUS
// ==========================================

function obterDadosStatus(
    statusOriginal
) {

    const status =
        normalizarTexto(
            statusOriginal ||
            "pendente"
        );


    // ==================================
    // PENDENTE
    // ==================================

    if (
        status ===
        "pendente"
    ) {

        return {

            filtro:
                "pendente",

            texto:
                "Pendente",

            classe:
                "status-pendente",

            icone:
                "fa-solid fa-clock"

        };

    }


    // ==================================
    // PREPARANDO
    // ==========================================

    if (
        status === "preparando" ||
        status === "em preparacao" ||
        status === "em preparo" ||
        status === "preparo"
    ) {

        return {

            filtro:
                "preparando",

            texto:
                "Preparando",

            classe:
                "status-preparando",

            icone:
                "fa-solid fa-box-open"

        };

    }


    // ==================================
    // FINALIZADO
    // ==========================================

    if (
        status === "finalizado" ||
        status === "finalizada" ||
        status === "concluido" ||
        status === "concluida" ||
        status === "entregue"
    ) {

        return {

            filtro:
                "finalizado",

            texto:
                "Finalizado",

            classe:
                "status-finalizado",

            icone:
                "fa-solid fa-circle-check"

        };

    }


    // ==================================
    // CANCELADO
    // ==========================================

    if (
        status === "cancelado" ||
        status === "cancelada"
    ) {

        return {

            filtro:
                "cancelado",

            texto:
                "Cancelado",

            classe:
                "status-cancelado",

            icone:
                "fa-solid fa-circle-xmark"

        };

    }


    // ==================================
    // STATUS DESCONHECIDO
    // ==========================================

    return {

        filtro:
            status,

        texto:
            statusOriginal ||
            "Pendente",

        classe:
            "status-pendente",

        icone:
            "fa-solid fa-clock"

    };

}


// ==========================================
// BOTÕES VER DETALHES
// ==========================================

function configurarBotoesDetalhes() {

    const botoes =
        document.querySelectorAll(
            ".btn-detalhes"
        );


    botoes.forEach(
        (botao) => {

            botao.addEventListener(
                "click",
                () => {

                    const pedidoId =
                        botao.dataset
                            .pedidoId;


                    abrirDetalhesPedido(
                        pedidoId
                    );

                }
            );

        }
    );

}


// ==========================================
// ABRIR DETALHES
// ==========================================

function abrirDetalhesPedido(
    pedidoId
) {

    const pedido =
        pedidos.find(
            (item) =>
                String(
                    item.id
                ) ===
                String(
                    pedidoId
                )
        );


    if (!pedido) {

        notificar(
            "Não foi possível localizar os detalhes deste pedido.",
            "erro",
            "Pedido não encontrado"
        );


        return;

    }


    const modal =
        document.getElementById(
            "modal-pedido"
        );


    const numeroPedido =
        document.getElementById(
            "modal-numero-pedido"
        );


    const conteudo =
        document.getElementById(
            "conteudo-modal-pedido"
        );


    if (
        !modal ||
        !conteudo
    ) {

        console.error(
            "Elementos do modal de pedido não encontrados."
        );


        notificar(
            "Não foi possível abrir os detalhes do pedido.",
            "erro",
            "Erro ao abrir pedido"
        );


        return;

    }


    // ==================================
    // NÚMERO
    // ==========================================

    if (numeroPedido) {

        numeroPedido.textContent =
            `Pedido #${formatarNumeroPedido(
                pedido.id
            )}`;

    }


    // ==================================
    // DADOS
    // ==========================================

    const nomeLoja =
        escaparHTML(
            pedido.lojas?.nome ||
            "Loja"
        );


    const pagamento =
        formatarPagamento(
            pedido.forma_pagamento
        );


    const status =
        obterDadosStatus(
            pedido.status
        );


    const data =
        formatarData(
            pedido.created_at
        );


    // ==================================
    // ITENS
    // ==========================================

    const itens =
        Array.isArray(
            pedido.itens_pedido
        )
            ? pedido.itens_pedido
            : [];


    let itensHTML =
        "";


    itens.forEach(
        (item) => {

            itensHTML +=
                criarItemDetalhe(
                    item
                );

        }
    );


    if (
        itens.length === 0
    ) {

        itensHTML = `

            <p
                style="
                    color:#6b7280;
                    font-size:13px;
                    padding:15px 0;
                "
            >

                Nenhum item encontrado
                neste pedido.

            </p>

        `;

    }


    // ==================================
    // OBSERVAÇÕES
    // ==========================================

    let observacoesHTML =
        "";


    if (
        pedido.observacoes
    ) {

        observacoesHTML = `

            <div class="observacoes-pedido">

                <h3>

                    <i class="fa-solid fa-comment"></i>

                    Informações do pedido

                </h3>

                <p>
                    ${formatarTextoMultilinha(
                        pedido.observacoes
                    )}
                </p>

            </div>

        `;

    }


    // ==================================
    // CONTEÚDO DO MODAL
    // ==========================================

    conteudo.innerHTML = `

        <div class="detalhes-info">

            <div class="detalhe-box">

                <span>
                    Loja
                </span>

                <strong>
                    ${nomeLoja}
                </strong>

            </div>


            <div class="detalhe-box">

                <span>
                    Status
                </span>

                <strong>
                    ${status.texto}
                </strong>

            </div>


            <div class="detalhe-box">

                <span>
                    Pagamento
                </span>

                <strong>
                    ${pagamento}
                </strong>

            </div>


            <div class="detalhe-box">

                <span>
                    Data
                </span>

                <strong>
                    ${data}
                </strong>

            </div>

        </div>


        <div class="detalhes-produtos">

            <h3>

                <i class="fa-solid fa-box"></i>

                Produtos

            </h3>


            ${itensHTML}

        </div>


        ${observacoesHTML}


        <div class="total-detalhes">

            <span>
                Total
            </span>

            <strong>

                ${formatarMoeda(
                    pedido.valor_total
                )}

            </strong>

        </div>

    `;


    // ==================================
    // IMAGENS QUEBRADAS
    // ==========================================

    configurarImagensModal();


    // ==================================
    // ABRIR
    // ==========================================

    modal.classList.add(
        "aberto"
    );


    document.body.style.overflow =
        "hidden";

}


// ==========================================
// CRIAR ITEM DO MODAL
// ==========================================

function criarItemDetalhe(
    item
) {

    const produto =
        item.produtos ||
        {};


    const nome =
        escaparHTML(
            produto.nome ||
            "Produto"
        );


    const quantidade =
        Number(
            item.quantidade ||
            0
        );


    const preco =
        Number(
            item.preco_unitario ||
            0
        );


    const subtotal =
        Number(
            item.subtotal ||
            (
                preco *
                quantidade
            )
        );


    // ==================================
    // IMAGEM
    // ==========================================

    let imagemHTML =
        "";


    if (
        produto.imagem_url
    ) {

        imagemHTML = `

            <div class="item-detalhe-imagem">

                <img
                    src="${escaparHTML(
                        produto.imagem_url
                    )}"
                    alt="${nome}"
                    loading="lazy"
                >

            </div>

        `;


    } else {

        imagemHTML = `

            <div class="item-detalhe-imagem">

                <div class="item-detalhe-placeholder">

                    <i class="fa-solid fa-box"></i>

                </div>

            </div>

        `;

    }


    return `

        <div class="item-detalhe">

            ${imagemHTML}


            <div class="item-detalhe-dados">

                <strong>
                    ${nome}
                </strong>

                <span>

                    ${quantidade}
                    ×
                    ${formatarMoeda(
                        preco
                    )}

                </span>

            </div>


            <div class="item-detalhe-valor">

                ${formatarMoeda(
                    subtotal
                )}

            </div>

        </div>

    `;

}


// ==========================================
// CONFIGURAR IMAGENS DO MODAL
// ==========================================

function configurarImagensModal() {

    const imagens =
        document.querySelectorAll(
            "#conteudo-modal-pedido .item-detalhe-imagem img"
        );


    imagens.forEach(
        (imagem) => {

            imagem.addEventListener(
                "error",
                () => {

                    const area =
                        imagem.parentElement;


                    if (!area) {

                        return;

                    }


                    area.innerHTML = `

                        <div class="item-detalhe-placeholder">

                            <i class="fa-solid fa-box"></i>

                        </div>

                    `;

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
// CONFIGURAR MODAL
// ==========================================

function configurarModal() {

    const modal =
        document.getElementById(
            "modal-pedido"
        );


    const botao =
        document.getElementById(
            "btn-fechar-modal"
        );


    const overlay =
        modal?.querySelector(
            ".modal-overlay"
        );


    if (botao) {

        botao.addEventListener(
            "click",
            fecharModal
        );

    }


    if (overlay) {

        overlay.addEventListener(
            "click",
            fecharModal
        );

    }


    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key ===
                    "Escape"
                &&
                modal?.classList.contains(
                    "aberto"
                )
            ) {

                fecharModal();

            }

        }
    );

}


// ==========================================
// FECHAR MODAL
// ==========================================

function fecharModal() {

    const modal =
        document.getElementById(
            "modal-pedido"
        );


    if (!modal) {

        return;

    }


    modal.classList.remove(
        "aberto"
    );


    document.body.style.overflow =
        "";

}


// ==========================================
// MOSTRAR ERRO
// ==========================================

function mostrarErro(
    mensagem
) {

    const lista =
        document.getElementById(
            "lista-pedidos"
        );


    if (!lista) {

        return;

    }


    lista.innerHTML = `

        <div class="erro-pedidos">

            <i class="fa-solid fa-triangle-exclamation"></i>

            <h3>
                Não foi possível carregar seus pedidos.
            </h3>

            <p>
                ${escaparHTML(
                    mensagem
                )}
            </p>

            <button
                type="button"
                class="btn-comprar"
                onclick="carregarPedidos()"
            >

                <i class="fa-solid fa-rotate-right"></i>

                Tentar novamente

            </button>

        </div>

    `;

}


// ==========================================
// FORMATAR PAGAMENTO
// ==========================================

function formatarPagamento(
    pagamento
) {

    const valor =
        String(
            pagamento ||
            ""
        )
            .toLowerCase();


    switch (valor) {

        case "pix":

            return "PIX";


        case "credito":

            return "Cartão de Crédito";


        case "debito":

            return "Cartão de Débito";


        case "dinheiro":

            return "Dinheiro";


        default:

            return (
                pagamento ||
                "Não informado"
            );

    }

}


// ==========================================
// FORMATAR NÚMERO DO PEDIDO
// ==========================================

function formatarNumeroPedido(
    id
) {

    if (!id) {

        return "------";

    }


    return String(
        id
    )

        .replaceAll(
            "-",
            ""
        )

        .substring(
            0,
            8
        )

        .toUpperCase();

}


// ==========================================
// FORMATAR DATA
// ==========================================

function formatarData(
    data
) {

    if (!data) {

        return "Data não informada";

    }


    const objeto =
        new Date(
            data
        );


    if (
        Number.isNaN(
            objeto.getTime()
        )
    ) {

        return data;

    }


    return objeto.toLocaleString(
        "pt-BR",
        {
            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit"
        }
    );

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
// FORMATAR TEXTO MULTILINHA
// ==========================================

function formatarTextoMultilinha(
    valor
) {

    return escaparHTML(
        valor
    )
        .replaceAll(
            "\n",
            "<br>"
        );

}


// ==========================================
// NORMALIZAR TEXTO
// ==========================================

function normalizarTexto(
    valor
) {

    return String(
        valor ||
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
// ==========================================

window.carregarPedidos =
    carregarPedidos;