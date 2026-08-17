// ==========================================
// MEUS-PEDIDOS.JS
// Comércio da Cidade
// ==========================================

let usuario = null;

let pedidos = [];

let filtroAtual = "todos";


// ==========================================
// AVALIAÇÕES
// ==========================================

let avaliacoesCliente = [];

let pedidoAvaliacaoId = null;

let produtoAvaliacaoId = null;

let notaAvaliacao = 0;


// ==========================================
// INICIAR
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    iniciarPagina
);


async function iniciarPagina() {

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


        if (!data.session) {

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

                    codigo_rastreio,
                    enviado_em,
                    entregue_em,
                    entregue_confirmado_por,

                    motivo_cancelamento,
                    cancelado_em,
                    cancelado_por,

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
            throw error;
        }


        pedidos =
            Array.isArray(
                data
            )
                ? data
                : [];


        console.log(
            "Pedidos encontrados:",
            pedidos
        );


        // ==================================
        // CARREGAR AVALIAÇÕES
        // ==================================

        await carregarAvaliacoesCliente();


        aplicarFiltro();


    } catch (erro) {

        console.error(
            "Erro ao carregar pedidos:",
            erro
        );


        mostrarErro(
            "Não foi possível carregar seus pedidos."
        );


        notificar(
            tratarErro(
                erro
            ),
            "erro",
            "Erro ao carregar pedidos",
            5000
        );
    }
}


// ==========================================
// CARREGAR AVALIAÇÕES DO CLIENTE
// ==========================================

async function carregarAvaliacoesCliente() {

    if (
        !usuario?.id ||
        !window.db
    ) {

        avaliacoesCliente =
            [];

        return;
    }


    try {

        const {
            data,
            error
        } =
            await window.db

                .from(
                    "avaliacoes"
                )

                .select(`
                    id,
                    pedido_id,
                    produto_id,
                    cliente_id,
                    nota,
                    comentario,
                    criado_em
                `)

                .eq(
                    "cliente_id",
                    usuario.id
                );


        if (error) {
            throw error;
        }


        avaliacoesCliente =
            Array.isArray(
                data
            )
                ? data
                : [];


        console.log(
            "Avaliações do cliente:",
            avaliacoesCliente
        );


    } catch (erro) {

        console.error(
            "Erro ao carregar avaliações:",
            erro
        );


        avaliacoesCliente =
            [];
    }
}


// ==========================================
// OBTER AVALIAÇÃO
// ==========================================

function obterAvaliacaoProduto(
    pedidoId,
    produtoId
) {

    return (

        avaliacoesCliente.find(
            avaliacao =>

                String(
                    avaliacao.pedido_id
                ) ===
                String(
                    pedidoId
                )

                &&

                String(
                    avaliacao.produto_id
                ) ===
                String(
                    produtoId
                )
        )

        ||

        null

    );
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


    lista.innerHTML =
        listaPedidos

            .map(
                criarCardPedido
            )

            .join(
                ""
            );


    configurarBotoesDetalhes();

    configurarBotoesConfirmarEntrega();
}


// ==========================================
// CRIAR CARD
// ==========================================

function criarCardPedido(
    pedido
) {

    const loja =
        obterLojaPedido(
            pedido
        );


    const nomeLoja =
        escaparHTML(
            loja?.nome ||
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


    // ==================================
    // RASTREIO
    // ==================================

    let rastreioHTML =
        "";


    if (
        pedido.codigo_rastreio &&
        (
            status.filtro ===
                "enviado"
            ||
            status.filtro ===
                "entregue"
        )
    ) {

        rastreioHTML = `

            <div class="pedido-rastreio-resumo">

                <span>

                    <i class="fa-solid fa-truck-fast"></i>

                    Rastreio

                </span>

                <strong>

                    ${escaparHTML(
                        pedido.codigo_rastreio
                    )}

                </strong>

            </div>

        `;
    }


    // ==================================
    // CONFIRMAR ENTREGA
    // ==================================

    let botaoConfirmarEntrega =
        "";


    if (
        status.filtro ===
        "enviado"
    ) {

        botaoConfirmarEntrega = `

            <button
                type="button"
                class="
                    btn-detalhes
                    btn-confirmar-entrega
                "
                data-confirmar-entrega
                data-pedido-id="${escaparHTML(
                    pedido.id
                )}"
            >

                <i class="fa-solid fa-box-circle-check"></i>

                Confirmar que recebi

            </button>

        `;
    }


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


                ${rastreioHTML}


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


                    ${botaoConfirmarEntrega}

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
        botao => {

            botao.addEventListener(
                "click",
                () => {

                    botoes.forEach(
                        item => {

                            item
                                .classList
                                .remove(
                                    "ativo"
                                );
                        }
                    );


                    botao.classList.add(
                        "ativo"
                    );


                    filtroAtual =
                        normalizarFiltroStatus(
                            botao.dataset.status ||
                            "todos"
                        );


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
            pedido => {

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
// NORMALIZAR FILTRO
// ==========================================

function normalizarFiltroStatus(
    valor
) {

    const status =
        normalizarStatusPedido(
            valor
        );


    if (
        status ===
        "todos"
    ) {

        return "todos";
    }


    return status;
}


// ==========================================
// NORMALIZAR STATUS
// ==========================================

function normalizarStatusPedido(
    statusOriginal
) {

    const status =
        normalizarTexto(
            statusOriginal ||
            ""
        )
            .replace(
                /\s+/g,
                "_"
            );


    const antigos = {

        pendente:
            "aguardando_pagamento",

        aguardando:
            "aguardando_pagamento",

        preparando:
            "em_preparacao",

        em_preparo:
            "em_preparacao",

        preparo:
            "em_preparacao",

        finalizado:
            "entregue",

        finalizada:
            "entregue",

        concluido:
            "entregue",

        concluida:
            "entregue",

        cancelada:
            "cancelado"

    };


    return (
        antigos[status] ||
        status
    );
}


// ==========================================
// DADOS DO STATUS
// ==========================================

function obterDadosStatus(
    statusOriginal
) {

    const status =
        normalizarStatusPedido(
            statusOriginal
        );


    if (
        status ===
        "aguardando_pagamento"
    ) {

        return {

            filtro:
                "aguardando_pagamento",

            texto:
                "Aguardando pagamento",

            classe:
                "status-pendente",

            icone:
                "fa-solid fa-clock"

        };
    }


    if (
        status ===
        "pago"
    ) {

        return {

            filtro:
                "pago",

            texto:
                "Pago",

            classe:
                "status-pago",

            icone:
                "fa-solid fa-circle-dollar-to-slot"

        };
    }


    if (
        status ===
        "em_preparacao"
    ) {

        return {

            filtro:
                "em_preparacao",

            texto:
                "Em preparação",

            classe:
                "status-preparando",

            icone:
                "fa-solid fa-box-open"

        };
    }


    if (
        status ===
        "enviado"
    ) {

        return {

            filtro:
                "enviado",

            texto:
                "Enviado",

            classe:
                "status-enviado",

            icone:
                "fa-solid fa-truck-fast"

        };
    }


    if (
        status ===
        "entregue"
    ) {

        return {

            filtro:
                "entregue",

            texto:
                "Entregue",

            classe:
                "status-finalizado",

            icone:
                "fa-solid fa-circle-check"

        };
    }


    if (
        status ===
        "cancelado"
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


    return {

        filtro:
            status,

        texto:
            statusOriginal ||
            "Desconhecido",

        classe:
            "status-pendente",

        icone:
            "fa-solid fa-circle-info"

    };
}


// ==========================================
// BOTÕES VER DETALHES
// ==========================================

function configurarBotoesDetalhes() {

    const botoes =
        document.querySelectorAll(
            ".btn-detalhes:not([data-confirmar-entrega])"
        );


    botoes.forEach(
        botao => {

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
// BOTÕES CONFIRMAR ENTREGA
// ==========================================

function configurarBotoesConfirmarEntrega() {

    const botoes =
        document.querySelectorAll(
            "[data-confirmar-entrega]"
        );


    botoes.forEach(
        botao => {

            botao.addEventListener(
                "click",
                () => {

                    confirmarEntregaPedido(
                        botao.dataset.pedidoId,
                        botao
                    );
                }
            );
        }
    );
}


// ==========================================
// CONFIRMAR ENTREGA
// ==========================================

async function confirmarEntregaPedido(
    pedidoId,
    botao = null
) {

    const pedido =
        pedidos.find(
            item =>
                String(
                    item.id
                ) ===
                String(
                    pedidoId
                )
        );


    if (!pedido) {

        notificar(
            "Não foi possível localizar este pedido.",
            "erro",
            "Pedido não encontrado"
        );


        return;
    }


    const status =
        normalizarStatusPedido(
            pedido.status
        );


    if (
        status ===
        "entregue"
    ) {

        notificar(
            "A entrega deste pedido já foi confirmada.",
            "info",
            "Entrega já confirmada"
        );


        await carregarPedidos();


        return;
    }


    if (
        status !==
        "enviado"
    ) {

        notificar(
            "Somente pedidos enviados podem ter o recebimento confirmado.",
            "aviso",
            "Confirmação indisponível"
        );


        await carregarPedidos();


        return;
    }


    if (
        typeof window.confirmarAcao !==
        "function"
    ) {

        notificar(
            "O sistema de confirmação não está disponível.",
            "erro",
            "Erro"
        );


        return;
    }


    const numero =
        formatarNumeroPedido(
            pedido.id
        );


    const confirmou =
        await window.confirmarAcao({

            titulo:
                "Confirmar recebimento?",

            mensagem:
                `Confirme somente se você realmente recebeu o pedido #${numero}. Depois disso, o pedido será marcado como entregue.`,

            textoConfirmar:
                "Sim, recebi o pedido",

            textoCancelar:
                "Ainda não recebi",

            perigo:
                false

        });


    if (!confirmou) {
        return;
    }


    const htmlOriginal =
        botao?.innerHTML;


    if (botao) {

        botao.disabled =
            true;


        botao.innerHTML = `

            <i class="fa-solid fa-spinner fa-spin"></i>

            Confirmando...

        `;
    }


    try {

        const {
            data,
            error
        } =
            await window.db.rpc(
                "confirmar_entrega_cliente",
                {
                    p_pedido_id:
                        pedido.id
                }
            );


        if (error) {
            throw error;
        }


        console.log(
            "Entrega confirmada:",
            data
        );


        fecharModal();


        notificar(
            `Recebimento do pedido #${numero} confirmado com sucesso.`,
            "sucesso",
            "Pedido entregue!",
            4500
        );


        await carregarPedidos();


    } catch (erro) {

        console.error(
            "Erro ao confirmar entrega:",
            erro
        );


        notificar(
            tratarErroConfirmacaoEntrega(
                erro
            ),
            "erro",
            "Não foi possível confirmar a entrega",
            5500
        );


    } finally {

        if (botao) {

            botao.disabled =
                false;


            botao.innerHTML =
                htmlOriginal ||
                `

                    <i class="fa-solid fa-box-circle-check"></i>

                    Confirmar que recebi

                `;
        }
    }
}


// ==========================================
// ERROS DA CONFIRMAÇÃO
// ==========================================

function tratarErroConfirmacaoEntrega(
    erro
) {

    const mensagem =
        String(
            erro?.message ||
            ""
        );


    const texto =
        mensagem.toLowerCase();


    if (
        texto.includes(
            "já foi confirmada"
        )
        ||
        texto.includes(
            "ja foi confirmada"
        )
    ) {

        return (
            "A entrega deste pedido já foi confirmada."
        );
    }


    if (
        texto.includes(
            "somente pedidos enviados"
        )
    ) {

        return (
            "Este pedido ainda não está disponível para confirmação de entrega."
        );
    }


    if (
        texto.includes(
            "código de rastreio"
        )
        ||
        texto.includes(
            "codigo de rastreio"
        )
    ) {

        return (
            "Este pedido ainda não possui um código de rastreio válido."
        );
    }


    if (
        texto.includes(
            "não possui permissão"
        )
        ||
        texto.includes(
            "nao possui permissao"
        )
        ||
        texto.includes(
            "pedido não encontrado"
        )
        ||
        texto.includes(
            "pedido nao encontrado"
        )
    ) {

        return (
            "Pedido não encontrado ou sua conta não possui permissão para confirmar esta entrega."
        );
    }


    return (
        mensagem ||
        "Não foi possível confirmar a entrega."
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
            item =>
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


    if (numeroPedido) {

        numeroPedido.textContent =
            `Pedido #${formatarNumeroPedido(
                pedido.id
            )}`;
    }


    const loja =
        obterLojaPedido(
            pedido
        );


    const nomeLoja =
        escaparHTML(
            loja?.nome ||
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
    // ==================================

    const itens =
        Array.isArray(
            pedido.itens_pedido
        )
            ? pedido.itens_pedido
            : [];


    let itensHTML =
        "";


    itens.forEach(
        item => {

            itensHTML +=
                criarItemDetalhe(
                    item,
                    pedido
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
    // ==================================

    let observacoesHTML =
        "";


    if (
        String(
            pedido.observacoes ||
            ""
        ).trim()
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
    // RASTREAMENTO
    // ==================================

    let rastreioHTML =
        "";


    if (
        pedido.codigo_rastreio
    ) {

        rastreioHTML = `

            <div class="
                observacoes-pedido
                rastreio-pedido-cliente
            ">

                <h3>

                    <i class="fa-solid fa-truck-fast"></i>

                    Rastreamento

                </h3>


                <p>

                    <strong>
                        Código:
                    </strong>

                    ${escaparHTML(
                        pedido.codigo_rastreio
                    )}

                </p>


                ${
                    pedido.enviado_em
                        ? `

                            <p>

                                <strong>
                                    Enviado em:
                                </strong>

                                ${formatarData(
                                    pedido.enviado_em
                                )}

                            </p>

                        `
                        : ""
                }


                ${
                    status.filtro ===
                        "enviado"
                        ? `

                            <p>

                                O pedido está a caminho.
                                Quando receber,
                                confirme a entrega abaixo.

                            </p>

                        `
                        : ""
                }

            </div>

        `;
    }


    // ==================================
    // ENTREGA
    // ==================================

    let entregaHTML =
        "";


    if (
        status.filtro ===
        "entregue"
    ) {

        entregaHTML = `

            <div class="
                observacoes-pedido
                entrega-confirmada
            ">

                <h3>

                    <i class="fa-solid fa-circle-check"></i>

                    Entrega confirmada

                </h3>


                <p>

                    ${
                        pedido.entregue_em
                            ? `Recebimento confirmado em ${formatarData(
                                pedido.entregue_em
                            )}.`
                            : "O recebimento deste pedido foi confirmado."
                    }

                </p>

            </div>

        `;
    }


    // ==================================
    // CANCELAMENTO
    // ==================================

    let cancelamentoHTML =
        "";


    if (
        status.filtro ===
        "cancelado"
    ) {

        cancelamentoHTML = `

            <div class="
                observacoes-pedido
                pedido-cancelado-cliente
            ">

                <h3>

                    <i class="fa-solid fa-ban"></i>

                    Pedido cancelado

                </h3>


                ${
                    pedido.motivo_cancelamento
                        ? `

                            <p>

                                <strong>
                                    Motivo:
                                </strong>

                                ${escaparHTML(
                                    pedido.motivo_cancelamento
                                )}

                            </p>

                        `
                        : ""
                }


                ${
                    pedido.cancelado_em
                        ? `

                            <p>

                                <strong>
                                    Cancelado em:
                                </strong>

                                ${formatarData(
                                    pedido.cancelado_em
                                )}

                            </p>

                        `
                        : ""
                }

            </div>

        `;
    }


    // ==================================
    // BOTÃO ENTREGA
    // ==================================

    let confirmarEntregaHTML =
        "";


    if (
        status.filtro ===
        "enviado"
    ) {

        confirmarEntregaHTML = `

            <div class="acoes-entrega-modal">

                <button
                    type="button"
                    id="btn-confirmar-entrega-modal"
                    class="
                        btn-detalhes
                        btn-confirmar-entrega
                    "
                >

                    <i class="fa-solid fa-box-circle-check"></i>

                    Confirmar que recebi

                </button>

            </div>

        `;
    }


    // ==================================
    // CONTEÚDO
    // ==================================

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

        ${rastreioHTML}

        ${entregaHTML}

        ${cancelamentoHTML}


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


        ${confirmarEntregaHTML}

    `;


    configurarImagensModal();

    configurarBotoesAvaliacao();


    // ==================================
    // BOTÃO CONFIRMAR ENTREGA
    // ==================================

    const botaoConfirmar =
        document.getElementById(
            "btn-confirmar-entrega-modal"
        );


    botaoConfirmar?.addEventListener(
        "click",
        () => {

            confirmarEntregaPedido(
                pedido.id,
                botaoConfirmar
            );
        }
    );


    // ==================================
    // ABRIR
    // ==================================

    modal.classList.add(
        "aberto"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";
}


// ==========================================
// CRIAR ITEM DO MODAL
// ==========================================

function criarItemDetalhe(
    item,
    pedido
) {

    const produto =
        obterProdutoItem(
            item
        );


    const produtoId =
        produto?.id ||
        item.produto_id;


    const nome =
        escaparHTML(
            produto?.nome ||
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
    // ==================================

    let imagemHTML =
        "";


    if (
        produto?.imagem_url
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


    // ==================================
    // AVALIAÇÃO
    // ==================================

    let avaliacaoHTML =
        "";


    const statusPedido =
        normalizarStatusPedido(
            pedido.status
        );


    if (
        statusPedido ===
            "entregue"
        &&
        produtoId
    ) {

        const avaliacao =
            obterAvaliacaoProduto(
                pedido.id,
                produtoId
            );


        // ==================================
        // JÁ AVALIADO
        // ==================================

        if (avaliacao) {

            avaliacaoHTML = `

                <div class="produto-ja-avaliado">

                    <div class="estrelas-ja-avaliado">

                        ${criarEstrelasHTML(
                            avaliacao.nota
                        )}

                    </div>


                    <span>

                        Avaliado com

                        ${Number(
                            avaliacao.nota
                        )}/5

                    </span>

                </div>

            `;


        } else {

            // ==================================
            // AVALIAR
            // ==================================

            avaliacaoHTML = `

                <button
                    type="button"
                    class="btn-avaliar-produto"
                    data-avaliar-produto
                    data-pedido-id="${escaparHTML(
                        pedido.id
                    )}"
                    data-produto-id="${escaparHTML(
                        produtoId
                    )}"
                >

                    <i class="fa-solid fa-star"></i>

                    Avaliar produto

                </button>

            `;
        }
    }


    return `

        <div class="
            item-detalhe
            item-detalhe-com-avaliacao
        ">

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


                ${avaliacaoHTML}

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
// CRIAR ESTRELAS HTML
// ==========================================

function criarEstrelasHTML(
    nota
) {

    const valor =
        Math.max(
            0,
            Math.min(
                5,
                Number(
                    nota ||
                    0
                )
            )
        );


    let html =
        "";


    for (
        let estrela = 1;
        estrela <= 5;
        estrela++
    ) {

        html += `

            <i
                class="${
                    estrela <= valor
                        ? "fa-solid"
                        : "fa-regular"
                } fa-star"
            ></i>

        `;
    }


    return html;
}


// ==========================================
// CONFIGURAR BOTÕES AVALIAÇÃO
// ==========================================

function configurarBotoesAvaliacao() {

    document

        .querySelectorAll(
            "[data-avaliar-produto]"
        )

        .forEach(
            botao => {

                botao.addEventListener(
                    "click",
                    () => {

                        abrirModalAvaliacao(
                            botao.dataset.pedidoId,
                            botao.dataset.produtoId
                        );
                    }
                );
            }
        );
}


// ==========================================
// ABRIR MODAL DE AVALIAÇÃO
// ==========================================

function abrirModalAvaliacao(
    pedidoId,
    produtoId
) {

    const pedido =
        pedidos.find(
            item =>
                String(
                    item.id
                ) ===
                String(
                    pedidoId
                )
        );


    if (!pedido) {

        notificar(
            "Pedido não encontrado.",
            "erro",
            "Erro"
        );


        return;
    }


    if (
        normalizarStatusPedido(
            pedido.status
        ) !==
        "entregue"
    ) {

        notificar(
            "Este produto ainda não pode ser avaliado.",
            "aviso",
            "Avaliação indisponível"
        );


        return;
    }


    const itens =
        Array.isArray(
            pedido.itens_pedido
        )
            ? pedido.itens_pedido
            : [];


    const item =
        itens.find(
            itemPedido =>

                String(
                    itemPedido.produto_id
                ) ===
                String(
                    produtoId
                )
        );


    if (!item) {

        notificar(
            "Este produto não pertence ao pedido.",
            "erro",
            "Produto não encontrado"
        );


        return;
    }


    // ==================================
    // JÁ AVALIOU
    // ==================================

    const avaliacaoExistente =
        obterAvaliacaoProduto(
            pedidoId,
            produtoId
        );


    if (avaliacaoExistente) {

        notificar(
            "Você já avaliou este produto neste pedido.",
            "info",
            "Produto já avaliado"
        );


        return;
    }


    const produto =
        obterProdutoItem(
            item
        );


    const modal =
        document.getElementById(
            "modal-avaliacao"
        );


    if (!modal) {

        console.error(
            "#modal-avaliacao não encontrado."
        );


        notificar(
            "Não foi possível abrir a avaliação.",
            "erro",
            "Erro"
        );


        return;
    }


    pedidoAvaliacaoId =
        pedidoId;


    produtoAvaliacaoId =
        produtoId;


    notaAvaliacao =
        0;


    // ==================================
    // NOME
    // ==================================

    const nomeProduto =
        document.getElementById(
            "nome-produto-avaliacao"
        );


    if (nomeProduto) {

        nomeProduto.textContent =
            produto?.nome ||
            "Produto";
    }


    // ==================================
    // COMENTÁRIO
    // ==================================

    const comentario =
        document.getElementById(
            "comentario-avaliacao"
        );


    if (comentario) {

        comentario.value =
            "";
    }


    atualizarContadorAvaliacao();

    selecionarNotaAvaliacao(
        0
    );


    modal.classList.add(
        "aberto"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";
}


// ==========================================
// FECHAR MODAL DE AVALIAÇÃO
// ==========================================

function fecharModalAvaliacao() {

    const modal =
        document.getElementById(
            "modal-avaliacao"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "aberto"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    pedidoAvaliacaoId =
        null;


    produtoAvaliacaoId =
        null;


    notaAvaliacao =
        0;


    const comentario =
        document.getElementById(
            "comentario-avaliacao"
        );


    if (comentario) {

        comentario.value =
            "";
    }


    selecionarNotaAvaliacao(
        0
    );


    atualizarContadorAvaliacao();


    // ==================================
    // MANTER MODAL DO PEDIDO
    // ==================================

    const modalPedido =
        document.getElementById(
            "modal-pedido"
        );


    document.body.style.overflow =
        modalPedido?.classList.contains(
            "aberto"
        )
            ? "hidden"
            : "";
}


// ==========================================
// SELECIONAR NOTA
// ==========================================

function selecionarNotaAvaliacao(
    nota
) {

    notaAvaliacao =
        Number(
            nota ||
            0
        );


    const estrelas =
        document.querySelectorAll(
            "#modal-avaliacao [data-nota]"
        );


    estrelas.forEach(
        estrela => {

            const valor =
                Number(
                    estrela.dataset.nota
                );


            const ativa =
                valor <=
                notaAvaliacao;


            estrela.classList.toggle(
                "ativa",
                ativa
            );


            estrela.setAttribute(
                "aria-pressed",
                ativa
                    ? "true"
                    : "false"
            );
        }
    );


    const texto =
        document.getElementById(
            "nota-avaliacao-texto"
        );


    if (!texto) {
        return;
    }


    const textos = {

        0:
            "Nenhuma nota selecionada",

        1:
            "1 estrela — Muito ruim",

        2:
            "2 estrelas — Ruim",

        3:
            "3 estrelas — Regular",

        4:
            "4 estrelas — Muito bom",

        5:
            "5 estrelas — Excelente"

    };


    texto.textContent =
        textos[
            notaAvaliacao
        ]
        ||
        textos[0];
}


// ==========================================
// CONTADOR DO COMENTÁRIO
// ==========================================

function atualizarContadorAvaliacao() {

    const campo =
        document.getElementById(
            "comentario-avaliacao"
        );


    const contador =
        document.getElementById(
            "contador-comentario-avaliacao"
        );


    if (!contador) {
        return;
    }


    contador.textContent =
        `${
            campo?.value?.length ||
            0
        }/1000`;
}


// ==========================================
// PUBLICAR AVALIAÇÃO
// ==========================================

async function publicarAvaliacao() {

    if (
        !pedidoAvaliacaoId ||
        !produtoAvaliacaoId
    ) {

        notificar(
            "Produto não identificado.",
            "erro",
            "Erro"
        );


        return;
    }


    // ==================================
    // VALIDAR NOTA
    // ==================================

    if (
        notaAvaliacao < 1 ||
        notaAvaliacao > 5
    ) {

        notificar(
            "Selecione uma nota de 1 a 5 estrelas.",
            "aviso",
            "Escolha uma nota"
        );


        return;
    }


    const comentarioCampo =
        document.getElementById(
            "comentario-avaliacao"
        );


    const botao =
        document.getElementById(
            "btn-publicar-avaliacao"
        );


    const comentario =
        String(
            comentarioCampo?.value ||
            ""
        )
            .trim();


    if (
        comentario.length > 1000
    ) {

        notificar(
            "O comentário deve possuir no máximo 1000 caracteres.",
            "aviso",
            "Comentário muito grande"
        );


        comentarioCampo?.focus();


        return;
    }


    // ==================================
    // CONFIRMAR PEDIDO LOCALMENTE
    // ==================================

    const pedido =
        pedidos.find(
            item =>
                String(
                    item.id
                ) ===
                String(
                    pedidoAvaliacaoId
                )
        );


    if (
        !pedido ||
        normalizarStatusPedido(
            pedido.status
        ) !==
        "entregue"
    ) {

        notificar(
            "Este pedido não está disponível para avaliação.",
            "aviso",
            "Avaliação indisponível"
        );


        fecharModalAvaliacao();


        await carregarPedidos();


        return;
    }


    // ==================================
    // JÁ AVALIADO LOCALMENTE
    // ==================================

    if (
        obterAvaliacaoProduto(
            pedidoAvaliacaoId,
            produtoAvaliacaoId
        )
    ) {

        notificar(
            "Você já avaliou este produto neste pedido.",
            "info",
            "Produto já avaliado"
        );


        fecharModalAvaliacao();


        return;
    }


    const pedidoId =
        pedidoAvaliacaoId;


    const produtoId =
        produtoAvaliacaoId;


    const nota =
        notaAvaliacao;


    const htmlOriginal =
        botao?.innerHTML;


    if (botao) {

        botao.disabled =
            true;


        botao.innerHTML = `

            <i class="fa-solid fa-spinner fa-spin"></i>

            Publicando...

        `;
    }


    try {

        // ==================================
        // RPC SEGURA
        // ==================================

        const {
            data,
            error
        } =
            await window.db.rpc(
                "avaliar_produto_cliente",
                {

                    p_pedido_id:
                        pedidoId,

                    p_produto_id:
                        produtoId,

                    p_nota:
                        nota,

                    p_comentario:
                        comentario ||
                        null

                }
            );


        if (error) {
            throw error;
        }


        console.log(
            "Avaliação publicada:",
            data
        );


        // ==================================
        // ATUALIZAR LOCALMENTE
        // ==================================

        avaliacoesCliente.push({

            id:
                data?.avaliacao_id ||
                null,

            pedido_id:
                pedidoId,

            produto_id:
                produtoId,

            cliente_id:
                usuario.id,

            nota:
                nota,

            comentario:
                comentario ||
                null,

            criado_em:
                new Date()
                    .toISOString()

        });


        fecharModalAvaliacao();


        notificar(
            "Sua avaliação foi publicada com sucesso.",
            "sucesso",
            "Obrigado pela avaliação!",
            4500
        );


        // ==================================
        // ATUALIZAR PEDIDO NA TELA
        // ==================================

        aplicarFiltro();


        abrirDetalhesPedido(
            pedidoId
        );


    } catch (erro) {

        console.error(
            "Erro ao publicar avaliação:",
            erro
        );


        notificar(
            tratarErroAvaliacao(
                erro
            ),
            "erro",
            "Não foi possível publicar",
            5500
        );


    } finally {

        if (botao) {

            botao.disabled =
                false;


            botao.innerHTML =
                htmlOriginal ||
                `

                    <i class="fa-solid fa-paper-plane"></i>

                    Publicar avaliação

                `;
        }
    }
}


// ==========================================
// ERROS DA AVALIAÇÃO
// ==========================================

function tratarErroAvaliacao(
    erro
) {

    const mensagem =
        String(
            erro?.message ||
            ""
        );


    const texto =
        mensagem
            .toLowerCase();


    if (
        texto.includes(
            "já foi avaliado"
        )
        ||
        texto.includes(
            "ja foi avaliado"
        )
        ||
        texto.includes(
            "duplicate key"
        )
        ||
        texto.includes(
            "unique"
        )
    ) {

        return (
            "Você já avaliou este produto neste pedido."
        );
    }


    if (
        texto.includes(
            "pedidos entregues"
        )
        ||
        texto.includes(
            "pedido entregue"
        )
    ) {

        return (
            "Este produto só poderá ser avaliado depois que o pedido for entregue."
        );
    }


    if (
        texto.includes(
            "nota"
        )
    ) {

        return (
            "Selecione uma nota válida de 1 a 5 estrelas."
        );
    }


    if (
        texto.includes(
            "comentário"
        )
        ||
        texto.includes(
            "comentario"
        )
    ) {

        return (
            "O comentário informado não é válido."
        );
    }


    if (
        texto.includes(
            "não pertence ao pedido"
        )
        ||
        texto.includes(
            "nao pertence ao pedido"
        )
    ) {

        return (
            "Este produto não pertence ao pedido informado."
        );
    }


    if (
        texto.includes(
            "pedido não encontrado"
        )
        ||
        texto.includes(
            "pedido nao encontrado"
        )
    ) {

        return (
            "Pedido não encontrado ou sua conta não possui permissão para avaliá-lo."
        );
    }


    if (
        texto.includes(
            "não autenticado"
        )
        ||
        texto.includes(
            "nao autenticado"
        )
    ) {

        return (
            "Sua sessão expirou. Entre novamente na sua conta."
        );
    }


    return (
        mensagem ||
        "Não foi possível publicar sua avaliação."
    );
}


// ==========================================
// OBTER LOJA
// ==========================================

function obterLojaPedido(
    pedido
) {

    if (
        Array.isArray(
            pedido.lojas
        )
    ) {

        return (
            pedido.lojas[0] ||
            null
        );
    }


    return (
        pedido.lojas ||
        null
    );
}


// ==========================================
// OBTER PRODUTO
// ==========================================

function obterProdutoItem(
    item
) {

    if (
        Array.isArray(
            item.produtos
        )
    ) {

        return (
            item.produtos[0] ||
            null
        );
    }


    return (
        item.produtos ||
        null
    );
}


// ==========================================
// CONFIGURAR IMAGENS
// ==========================================

function configurarImagensModal() {

    const imagens =
        document.querySelectorAll(
            "#conteudo-modal-pedido .item-detalhe-imagem img"
        );


    imagens.forEach(
        imagem => {

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
// CONFIGURAR MODAIS
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


    botao?.addEventListener(
        "click",
        fecharModal
    );


    overlay?.addEventListener(
        "click",
        fecharModal
    );


    // ==================================
    // MODAL DE AVALIAÇÃO
    // ==================================

    document

        .getElementById(
            "btn-fechar-avaliacao"
        )

        ?.addEventListener(
            "click",
            fecharModalAvaliacao
        );


    document

        .getElementById(
            "btn-cancelar-avaliacao"
        )

        ?.addEventListener(
            "click",
            fecharModalAvaliacao
        );


    document

        .querySelectorAll(
            "[data-fechar-avaliacao]"
        )

        .forEach(
            elemento => {

                elemento.addEventListener(
                    "click",
                    fecharModalAvaliacao
                );
            }
        );


    // ==================================
    // ESTRELAS
    // ==================================

    document

        .querySelectorAll(
            "#modal-avaliacao [data-nota]"
        )

        .forEach(
            estrela => {

                estrela.addEventListener(
                    "click",
                    () => {

                        selecionarNotaAvaliacao(
                            estrela.dataset.nota
                        );
                    }
                );
            }
        );


    // ==================================
    // COMENTÁRIO
    // ==================================

    document

        .getElementById(
            "comentario-avaliacao"
        )

        ?.addEventListener(
            "input",
            atualizarContadorAvaliacao
        );


    // ==================================
    // PUBLICAR
    // ==================================

    document

        .getElementById(
            "btn-publicar-avaliacao"
        )

        ?.addEventListener(
            "click",
            publicarAvaliacao
        );


    // ==================================
    // ESC
    // ==================================

    document.addEventListener(
        "keydown",
        evento => {

            if (
                evento.key !==
                "Escape"
            ) {

                return;
            }


            const modalAvaliacao =
                document.getElementById(
                    "modal-avaliacao"
                );


            // Fecha avaliação primeiro.

            if (
                modalAvaliacao
                    ?.classList
                    .contains(
                        "aberto"
                    )
            ) {

                fecharModalAvaliacao();

                return;
            }


            if (
                modal
                    ?.classList
                    .contains(
                        "aberto"
                    )
            ) {

                fecharModal();
            }
        }
    );
}


// ==========================================
// FECHAR MODAL DO PEDIDO
// ==========================================

function fecharModal() {

    const modal =
        document.getElementById(
            "modal-pedido"
        );


    if (!modal) {
        return;
    }


    // Se avaliação estiver aberta,
    // fecha avaliação primeiro.

    const modalAvaliacao =
        document.getElementById(
            "modal-avaliacao"
        );


    if (
        modalAvaliacao
            ?.classList
            .contains(
                "aberto"
            )
    ) {

        fecharModalAvaliacao();

        return;
    }


    modal.classList.remove(
        "aberto"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
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
// NÚMERO DO PEDIDO
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

        return (
            "Data não informada"
        );
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
// TEXTO MULTILINHA
// ==========================================

function formatarTextoMultilinha(
    valor
) {

    return escaparHTML(
        valor
    )
        .replace(
            /\r?\n/g,
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
// TRATAR ERROS
// ==========================================

function tratarErro(
    erro
) {

    const texto =
        String(
            erro?.message ||
            ""
        )
            .toLowerCase();


    if (
        texto.includes(
            "row-level security"
        )
        ||
        texto.includes(
            "permission denied"
        )
    ) {

        return (
            "Sua conta não possui permissão para acessar estes pedidos."
        );
    }


    if (
        texto.includes(
            "column"
        )
        &&
        texto.includes(
            "does not exist"
        )
    ) {

        return (
            "O banco de dados ainda não possui todos os campos necessários."
        );
    }


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


    return (
        erro?.message ||
        "Ocorreu um erro inesperado."
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