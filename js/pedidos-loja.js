// ==========================================
// PEDIDOS-LOJA.JS
// Comércio da Cidade
// ==========================================

let usuario = null;
let loja = null;
let pedidos = [];

let filtroAtual = "todos";
let pesquisaAtual = "";

let pedidoCancelamentoId = null;
let pedidoRastreioId = null;


// ==========================================
// INICIAR
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    iniciarPagina
);


async function iniciarPagina() {

    if (!window.db) {

        notificar(
            "Não foi possível conectar ao sistema.",
            "erro",
            "Erro de conexão"
        );

        return;
    }


    configurarEventos();


    const autenticado =
        await verificarUsuario();


    if (!autenticado) {
        return;
    }


    const possuiLoja =
        await carregarLoja();


    if (!possuiLoja) {
        return;
    }


    await carregarPedidos();
}


// ==========================================
// VERIFICAR USUÁRIO
// ==========================================

async function verificarUsuario() {

    try {

        const {
            data: sessaoData,
            error: sessaoError
        } =
            await window.db
                .auth
                .getSession();


        if (
            sessaoError ||
            !sessaoData.session
        ) {

            notificar(
                "Entre na sua conta para acessar os pedidos da loja.",
                "info",
                "Login necessário"
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

            throw (
                error ||
                new Error(
                    "Usuário não encontrado."
                )
            );
        }


        usuario =
            data.user;


        return true;


    } catch (erro) {

        console.error(
            "Erro ao verificar usuário:",
            erro
        );


        notificar(
            "Não foi possível verificar sua sessão.",
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

                .select(`
                    id,
                    nome,
                    ativa
                `)

                .eq(
                    "proprietario_id",
                    usuario.id
                )

                .maybeSingle();


        if (error) {
            throw error;
        }


        if (!data) {

            notificar(
                "Você ainda não possui uma loja cadastrada.",
                "info",
                "Loja não encontrada"
            );


            setTimeout(
                () => {

                    window.location.href =
                        "cadastrar-loja.html";

                },
                900
            );


            return false;
        }


        loja =
            data;


        const nomeElemento =
            document.getElementById(
                "nome-loja-pedidos"
            );


        if (nomeElemento) {

            nomeElemento.textContent =
                `Pedidos recebidos por ${loja.nome}.`;
        }


        localStorage.setItem(
            "loja_id",
            loja.id
        );


        localStorage.setItem(
            "nome_loja",
            loja.nome || ""
        );


        return true;


    } catch (erro) {

        console.error(
            "Erro ao carregar loja:",
            erro
        );


        notificar(
            tratarErro(
                erro
            ),
            "erro",
            "Não foi possível carregar sua loja"
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
            "lista-pedidos-loja"
        );


    if (
        !lista ||
        !loja?.id
    ) {
        return;
    }


    lista.innerHTML = `

        <div class="estado-pedidos">

            <i class="fa-solid fa-spinner fa-spin"></i>

            <h3>
                Carregando pedidos...
            </h3>

            <p>
                Aguarde um momento.
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

                    motivo_cancelamento,
                    cancelado_em,
                    cancelado_por,

                    codigo_rastreio,
                    enviado_em,

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
                    "loja_id",
                    loja.id
                )

                .order(
                    "created_at",
                    {
                        ascending:
                            false
                    }
                )

                .limit(
                    200
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


        atualizarEstatisticas();

        renderizarPedidos();


    } catch (erro) {

        console.error(
            "Erro ao carregar pedidos:",
            erro
        );


        lista.innerHTML = `

            <div class="estado-pedidos">

                <i class="fa-solid fa-triangle-exclamation"></i>

                <h3>
                    Erro ao carregar pedidos
                </h3>

                <p>
                    Tente atualizar a página.
                </p>

            </div>

        `;


        notificar(
            tratarErro(
                erro
            ),
            "erro",
            "Erro ao carregar pedidos"
        );
    }
}


// ==========================================
// RENDERIZAR PEDIDOS
// ==========================================

function renderizarPedidos() {

    const lista =
        document.getElementById(
            "lista-pedidos-loja"
        );


    if (!lista) {
        return;
    }


    const filtrados =
        pedidos.filter(
            pedidoPassaNosFiltros
        );


    atualizarQuantidadeResultados(
        filtrados.length
    );


    if (
        filtrados.length === 0
    ) {

        lista.innerHTML = `

            <div class="estado-pedidos">

                <i class="fa-solid fa-box-open"></i>

                <h3>
                    Nenhum pedido encontrado
                </h3>

                <p>
                    Não encontramos pedidos
                    para este filtro ou pesquisa.
                </p>

            </div>

        `;


        return;
    }


    lista.innerHTML =
        filtrados

            .map(
                criarCardPedido
            )

            .join(
                ""
            );


    configurarEventosCards();
}


// ==========================================
// FILTROS E PESQUISA
// ==========================================

function pedidoPassaNosFiltros(
    pedido
) {

    const status =
        normalizarStatus(
            pedido.status
        );


    if (
        filtroAtual !== "todos" &&
        status !== filtroAtual
    ) {

        return false;
    }


    if (!pesquisaAtual) {
        return true;
    }


    const termo =
        normalizarTexto(
            pesquisaAtual
        );


    const produtos =
        Array.isArray(
            pedido.itens_pedido
        )
            ? pedido.itens_pedido
            : [];


    const nomesProdutos =
        produtos

            .map(
                item => {

                    let produto =
                        item.produtos;


                    if (
                        Array.isArray(
                            produto
                        )
                    ) {

                        produto =
                            produto[0];
                    }


                    return (
                        produto?.nome ||
                        ""
                    );
                }
            )

            .join(
                " "
            );


    const texto =
        normalizarTexto(

            [
                pedido.id,

                formatarStatus(
                    status
                ),

                pedido.forma_pagamento,

                pedido.observacoes,

                pedido.motivo_cancelamento,

                pedido.codigo_rastreio,

                nomesProdutos
            ]

                .filter(
                    Boolean
                )

                .join(
                    " "
                )
        );


    return texto.includes(
        termo
    );
}


// ==========================================
// CARD DO PEDIDO
// ==========================================

function criarCardPedido(
    pedido
) {

    const status =
        normalizarStatus(
            pedido.status
        );


    const itens =
        Array.isArray(
            pedido.itens_pedido
        )
            ? pedido.itens_pedido
            : [];


    const quantidadeItens =
        itens.reduce(
            (
                total,
                item
            ) => {

                return (
                    total +
                    Number(
                        item.quantidade ||
                        0
                    )
                );

            },
            0
        );


    const numero =
        obterNumeroPedido(
            pedido.id
        );


    const nomeCliente =
        obterNomeCliente(
            pedido
        );


    const proximaAcao =
        obterAcaoStatus(
            status
        );


    // ==================================
    // BOTÃO AVANÇAR
    // ==================================

    let botaoAvancar =
        "";


    if (proximaAcao) {

        botaoAvancar = `

            <button
                type="button"
                class="btn-pedido btn-avancar"
                data-acao="avancar"
                data-id="${escaparHTML(
                    pedido.id
                )}"
            >

                <i class="${proximaAcao.icone}"></i>

                ${proximaAcao.texto}

            </button>

        `;
    }


    // ==================================
    // BOTÃO CANCELAR
    // ==================================

    const podeCancelar =
        [
            "aguardando_pagamento",
            "pago",
            "em_preparacao"
        ]
            .includes(
                status
            );


    let botaoCancelar =
        "";


    if (podeCancelar) {

        botaoCancelar = `

            <button
                type="button"
                class="btn-pedido btn-cancelar-pedido"
                data-acao="cancelar"
                data-id="${escaparHTML(
                    pedido.id
                )}"
            >

                <i class="fa-solid fa-ban"></i>

                Cancelar Pedido

            </button>

        `;
    }


    // ==================================
    // CARD
    // ==================================

    return `

        <article class="pedido-card">

            <div class="pedido-topo">

                <div class="pedido-identificacao">

                    <div class="pedido-icone">

                        <i class="fa-solid fa-receipt"></i>

                    </div>


                    <div>

                        <h3>
                            Pedido #${numero}
                        </h3>

                        <small>

                            ${formatarDataHora(
                                pedido.created_at
                            )}

                        </small>

                    </div>

                </div>


                <span
                    class="status-pedido ${classeStatus(
                        status
                    )}"
                >

                    ${formatarStatus(
                        status
                    )}

                </span>

            </div>


            <div class="pedido-dados">

                <div class="pedido-dado">

                    <span>
                        Cliente
                    </span>

                    <strong>

                        ${escaparHTML(
                            nomeCliente
                        )}

                    </strong>

                </div>


                <div class="pedido-dado">

                    <span>
                        Itens
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


                <div class="pedido-dado">

                    <span>
                        Pagamento
                    </span>

                    <strong>

                        ${escaparHTML(
                            formatarPagamento(
                                pedido.forma_pagamento
                            )
                        )}

                    </strong>

                </div>


                <div class="pedido-dado">

                    <span>
                        Total
                    </span>

                    <strong>

                        ${formatarMoeda(
                            pedido.valor_total
                        )}

                    </strong>

                </div>

            </div>


            <div class="pedido-acoes">

                <button
                    type="button"
                    class="btn-pedido btn-detalhes"
                    data-acao="detalhes"
                    data-id="${escaparHTML(
                        pedido.id
                    )}"
                >

                    <i class="fa-solid fa-eye"></i>

                    Ver Detalhes

                </button>


                ${botaoAvancar}

                ${botaoCancelar}

            </div>

        </article>

    `;
}


// ==========================================
// EVENTOS DOS CARDS
// ==========================================

function configurarEventosCards() {

    document

        .querySelectorAll(
            "[data-acao='detalhes']"
        )

        .forEach(
            botao => {

                botao.addEventListener(
                    "click",
                    () => {

                        abrirDetalhesPedido(
                            botao.dataset.id
                        );
                    }
                );
            }
        );


    document

        .querySelectorAll(
            "[data-acao='avancar']"
        )

        .forEach(
            botao => {

                botao.addEventListener(
                    "click",
                    () => {

                        avancarStatusPedido(
                            botao.dataset.id
                        );
                    }
                );
            }
        );


    document

        .querySelectorAll(
            "[data-acao='cancelar']"
        )

        .forEach(
            botao => {

                botao.addEventListener(
                    "click",
                    () => {

                        abrirModalCancelamento(
                            botao.dataset.id
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


    const modal =
        document.getElementById(
            "modal-detalhes-pedido"
        );


    const numero =
        document.getElementById(
            "modal-numero-pedido"
        );


    const conteudo =
        document.getElementById(
            "modal-conteudo-pedido"
        );


    if (
        !modal ||
        !conteudo
    ) {

        return;
    }


    if (numero) {

        numero.textContent =
            `Pedido #${obterNumeroPedido(
                pedido.id
            )}`;
    }


    conteudo.innerHTML =
        criarDetalhesPedido(
            pedido
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
// HTML DOS DETALHES
// ==========================================

function criarDetalhesPedido(
    pedido
) {

    const itens =
        Array.isArray(
            pedido.itens_pedido
        )
            ? pedido.itens_pedido
            : [];


    const status =
        normalizarStatus(
            pedido.status
        );


    const itensHTML =
        itens.length

            ? itens
                .map(
                    criarItemPedido
                )
                .join(
                    ""
                )

            : `

                <p>
                    Nenhum item encontrado.
                </p>

            `;


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

                <h4>

                    <i class="fa-solid fa-location-dot"></i>

                    Entrega e Observações

                </h4>

                <p>

                    ${escaparHTML(
                        pedido.observacoes
                    )
                        .replace(
                            /\r?\n/g,
                            "<br>"
                        )}

                </p>

            </div>

        `;
    }


    // ==================================
    // RASTREIO
    // ==================================

    let rastreioHTML =
        "";


    if (
        pedido.codigo_rastreio
    ) {

        rastreioHTML = `

            <div class="rastreio-pedido">

                <h4>

                    <i class="fa-solid fa-truck-fast"></i>

                    Rastreamento

                </h4>


                <p>

                    <strong>
                        Código:
                    </strong>

                    <code>
                        ${escaparHTML(
                            pedido.codigo_rastreio
                        )}
                    </code>

                </p>


                ${
                    pedido.enviado_em
                        ? `

                            <p>

                                <strong>
                                    Enviado em:
                                </strong>

                                ${formatarDataHora(
                                    pedido.enviado_em
                                )}

                            </p>

                        `
                        : ""
                }

            </div>

        `;
    }


    // ==================================
    // CANCELAMENTO
    // ==================================

    let cancelamentoHTML =
        "";


    if (
        status ===
        "cancelado"
    ) {

        cancelamentoHTML = `

            <div class="observacoes-pedido">

                <h4>

                    <i class="fa-solid fa-ban"></i>

                    Pedido cancelado

                </h4>


                <p>

                    <strong>
                        Motivo:
                    </strong>

                    ${escaparHTML(
                        pedido.motivo_cancelamento ||
                        "Não informado"
                    )}

                </p>


                ${
                    pedido.cancelado_em
                        ? `

                            <p>

                                <strong>
                                    Cancelado em:
                                </strong>

                                ${formatarDataHora(
                                    pedido.cancelado_em
                                )}

                            </p>

                        `
                        : ""
                }

            </div>

        `;
    }


    return `

        <div class="detalhes-grid">

            <div class="detalhe-box">

                <span>
                    Cliente
                </span>

                <strong>

                    ${escaparHTML(
                        obterNomeCliente(
                            pedido
                        )
                    )}

                </strong>

            </div>


            <div class="detalhe-box">

                <span>
                    Data
                </span>

                <strong>

                    ${formatarDataHora(
                        pedido.created_at
                    )}

                </strong>

            </div>


            <div class="detalhe-box">

                <span>
                    Pagamento
                </span>

                <strong>

                    ${escaparHTML(
                        formatarPagamento(
                            pedido.forma_pagamento
                        )
                    )}

                </strong>

            </div>


            <div class="detalhe-box">

                <span>
                    Status
                </span>

                <strong>

                    ${formatarStatus(
                        status
                    )}

                </strong>

            </div>


            <div class="detalhe-box">

                <span>
                    Total
                </span>

                <strong>

                    ${formatarMoeda(
                        pedido.valor_total
                    )}

                </strong>

            </div>


            <div class="detalhe-box">

                <span>
                    Código
                </span>

                <strong>

                    #${obterNumeroPedido(
                        pedido.id
                    )}

                </strong>

            </div>

        </div>


        <h3 class="titulo-itens">

            <i class="fa-solid fa-box"></i>

            Produtos

        </h3>


        <div class="modal-itens">

            ${itensHTML}

        </div>


        ${observacoesHTML}

        ${rastreioHTML}

        ${cancelamentoHTML}

    `;
}


// ==========================================
// ITEM DO PEDIDO
// ==========================================

function criarItemPedido(
    item
) {

    let produto =
        item.produtos;


    if (
        Array.isArray(
            produto
        )
    ) {

        produto =
            produto[0];
    }


    const nome =
        produto?.nome ||
        "Produto";


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
            preco * quantidade
        );


    let imagem = `

        <div class="modal-item-placeholder">

            <i class="fa-solid fa-box"></i>

        </div>

    `;


    if (
        produto?.imagem_url
    ) {

        imagem = `

            <img
                src="${escaparHTML(
                    produto.imagem_url
                )}"
                alt="${escaparHTML(
                    nome
                )}"
                class="modal-item-imagem"
                loading="lazy"
                onerror="this.style.display='none'"
            >

        `;
    }


    return `

        <div class="modal-item">

            ${imagem}


            <div class="modal-item-info">

                <strong>

                    ${escaparHTML(
                        nome
                    )}

                </strong>


                <small>

                    ${quantidade}

                    ×

                    ${formatarMoeda(
                        preco
                    )}

                </small>

            </div>


            <strong class="modal-item-total">

                ${formatarMoeda(
                    subtotal
                )}

            </strong>

        </div>

    `;
}


// ==========================================
// AVANÇAR STATUS
// ==========================================

async function avancarStatusPedido(
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
            "Pedido não encontrado.",
            "erro",
            "Erro"
        );

        return;
    }


    const statusAtual =
        normalizarStatus(
            pedido.status
        );


    const acao =
        obterAcaoStatus(
            statusAtual
        );


    if (!acao) {

        notificar(
            "Este pedido não possui uma próxima etapa disponível para o lojista.",
            "info",
            "Sem próxima etapa"
        );

        return;
    }


    // ==================================
    // EM PREPARAÇÃO EXIGE RASTREIO
    // ==================================

    if (
        statusAtual ===
        "em_preparacao"
    ) {

        abrirModalRastreio(
            pedido.id
        );

        return;
    }


    // ==================================
    // CONFIRMAÇÃO
    // ==================================

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


    const confirmou =
        await window.confirmarAcao({

            titulo:
                acao.titulo,

            mensagem:
                `O pedido #${obterNumeroPedido(
                    pedido.id
                )} será alterado de "${formatarStatus(
                    statusAtual
                )}" para "${formatarStatus(
                    acao.proximo
                )}".`,

            textoConfirmar:
                acao.textoConfirmar,

            textoCancelar:
                "Cancelar",

            perigo:
                false

        });


    if (!confirmou) {
        return;
    }


    await atualizarStatusViaRPC(
        pedido.id,
        acao.proximo,
        null,
        true
    );
}


// ==========================================
// ATUALIZAR STATUS VIA RPC
// ==========================================

async function atualizarStatusViaRPC(
    pedidoId,
    novoStatus,
    codigoRastreio = null,
    mostrarSucesso = true
) {

    try {

        const {
            data,
            error
        } =
            await window.db.rpc(
                "atualizar_status_pedido_loja",
                {

                    p_pedido_id:
                        pedidoId,

                    p_novo_status:
                        novoStatus,

                    p_codigo_rastreio:
                        codigoRastreio

                }
            );


        if (error) {
            throw error;
        }


        if (mostrarSucesso) {

            notificar(
                `Pedido #${obterNumeroPedido(
                    pedidoId
                )} atualizado para "${formatarStatus(
                    novoStatus
                )}".`,
                "sucesso",
                "Status atualizado!"
            );
        }


        await carregarPedidos();


        return data;


    } catch (erro) {

        console.error(
            "Erro ao atualizar status:",
            erro
        );


        notificar(
            tratarErroStatusPedido(
                erro
            ),
            "erro",
            "Não foi possível atualizar o pedido",
            5000
        );


        return null;
    }
}


// ==========================================
// ERROS DE STATUS
// ==========================================

function tratarErroStatusPedido(
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
            "código de rastreio"
        )
        ||
        texto.includes(
            "codigo de rastreio"
        )
    ) {

        return (
            erro?.message ||
            "Informe um código de rastreio válido."
        );
    }


    if (
        texto.includes(
            "transição de status"
        )
        ||
        texto.includes(
            "transicao de status"
        )
    ) {

        return (
            "Esta alteração de status não é permitida."
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
            "permission"
        )
    ) {

        return (
            "Sua conta não possui permissão para atualizar este pedido."
        );
    }


    if (
        texto.includes(
            "cancelado"
        )
    ) {

        return (
            "Pedidos cancelados não podem ter o status alterado."
        );
    }


    if (
        texto.includes(
            "entregue"
        )
    ) {

        return (
            "Pedidos já entregues não podem ter o status alterado."
        );
    }


    return tratarErro(
        erro
    );
}


// ==========================================
// FLUXO DOS STATUS
// ==========================================

function obterAcaoStatus(
    status
) {

    const acoes = {


        aguardando_pagamento: {

            proximo:
                "pago",

            texto:
                "Marcar como Pago",

            titulo:
                "Confirmar pagamento?",

            textoConfirmar:
                "Marcar como Pago",

            icone:
                "fa-solid fa-circle-dollar-to-slot"

        },


        pago: {

            proximo:
                "em_preparacao",

            texto:
                "Iniciar Preparação",

            titulo:
                "Iniciar preparação?",

            textoConfirmar:
                "Iniciar Preparação",

            icone:
                "fa-solid fa-box-open"

        },


        em_preparacao: {

            proximo:
                "enviado",

            texto:
                "Informar Rastreio e Enviar",

            titulo:
                "Enviar pedido",

            textoConfirmar:
                "Marcar como Enviado",

            icone:
                "fa-solid fa-truck"

        }

    };


    return (

        acoes[
            normalizarStatus(
                status
            )
        ] ||

        null
    );
}


// ==========================================
// ABRIR MODAL DE RASTREIO
// ==========================================

function abrirModalRastreio(
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
            "Pedido não encontrado.",
            "erro",
            "Erro"
        );

        return;
    }


    const status =
        normalizarStatus(
            pedido.status
        );


    if (
        status !==
        "em_preparacao"
    ) {

        notificar(
            "Somente pedidos em preparação podem ser marcados como enviados.",
            "aviso",
            "Envio indisponível"
        );

        return;
    }


    const modal =
        document.getElementById(
            "modal-rastreio-pedido"
        );


    const numero =
        document.getElementById(
            "numero-pedido-rastreio"
        );


    const campo =
        document.getElementById(
            "codigo-rastreio"
        );


    if (
        !modal ||
        !campo
    ) {

        console.error(
            "Modal de rastreio não encontrado no HTML."
        );


        notificar(
            "Não foi possível abrir o formulário de rastreio.",
            "erro",
            "Erro"
        );

        return;
    }


    pedidoRastreioId =
        pedido.id;


    if (numero) {

        numero.textContent =
            `Pedido #${obterNumeroPedido(
                pedido.id
            )}`;
    }


    campo.value =
        pedido.codigo_rastreio ||
        "";


    modal.classList.add(
        "aberto"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";


    setTimeout(
        () => {

            campo.focus();
        },
        100
    );
}


// ==========================================
// FECHAR MODAL DE RASTREIO
// ==========================================

function fecharModalRastreio() {

    const modal =
        document.getElementById(
            "modal-rastreio-pedido"
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


    pedidoRastreioId =
        null;


    const campo =
        document.getElementById(
            "codigo-rastreio"
        );


    if (campo) {
        campo.value = "";
    }


    atualizarBloqueioScroll();
}


// ==========================================
// CONFIRMAR ENVIO
// ==========================================

async function confirmarEnvioPedido() {

    if (
        !pedidoRastreioId
    ) {

        notificar(
            "Pedido não identificado.",
            "erro",
            "Erro"
        );

        return;
    }


    const pedido =
        pedidos.find(
            item =>
                String(
                    item.id
                ) ===
                String(
                    pedidoRastreioId
                )
        );


    if (!pedido) {

        notificar(
            "Pedido não encontrado. Atualize a lista e tente novamente.",
            "erro",
            "Pedido não encontrado"
        );


        fecharModalRastreio();

        return;
    }


    if (
        normalizarStatus(
            pedido.status
        ) !==
        "em_preparacao"
    ) {

        notificar(
            "Este pedido não está mais em preparação.",
            "aviso",
            "Status alterado"
        );


        fecharModalRastreio();

        await carregarPedidos();

        return;
    }


    const campo =
        document.getElementById(
            "codigo-rastreio"
        );


    const botao =
        document.getElementById(
            "btn-confirmar-rastreio"
        );


    const codigo =
        String(
            campo?.value ||
            ""
        )
            .trim();


    if (
        codigo.length < 3
    ) {

        notificar(
            "Informe um código de rastreio com pelo menos 3 caracteres.",
            "aviso",
            "Código obrigatório"
        );


        campo?.focus();

        return;
    }


    if (
        codigo.length > 100
    ) {

        notificar(
            "O código de rastreio deve possuir no máximo 100 caracteres.",
            "aviso",
            "Código inválido"
        );


        campo?.focus();

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


    const confirmou =
        await window.confirmarAcao({

            titulo:
                "Confirmar envio?",

            mensagem:
                `O pedido será marcado como enviado com o código de rastreio "${codigo}".`,

            textoConfirmar:
                "Confirmar Envio",

            textoCancelar:
                "Voltar",

            perigo:
                false

        });


    if (!confirmou) {
        return;
    }


    const pedidoId =
        pedidoRastreioId;


    const conteudoOriginal =
        botao?.innerHTML;


    if (botao) {

        botao.disabled =
            true;


        botao.innerHTML = `

            <i class="fa-solid fa-spinner fa-spin"></i>

            Enviando...

        `;
    }


    try {

        const resultado =
            await atualizarStatusViaRPC(
                pedidoId,
                "enviado",
                codigo,
                false
            );


        if (!resultado) {
            return;
        }


        fecharModalRastreio();


        notificar(
            `Pedido #${obterNumeroPedido(
                pedidoId
            )} enviado com o código de rastreio ${codigo}.`,
            "sucesso",
            "Pedido enviado!",
            4500
        );


    } finally {

        if (botao) {

            botao.disabled =
                false;


            botao.innerHTML =
                conteudoOriginal ||
                `

                    <i class="fa-solid fa-truck"></i>

                    Marcar como Enviado

                `;
        }
    }
}


// ==========================================
// ABRIR MODAL DE CANCELAMENTO
// ==========================================

function abrirModalCancelamento(
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
            "Pedido não encontrado.",
            "erro",
            "Erro"
        );

        return;
    }


    const status =
        normalizarStatus(
            pedido.status
        );


    const statusPermitidos = [

        "aguardando_pagamento",
        "pago",
        "em_preparacao"

    ];


    if (
        !statusPermitidos.includes(
            status
        )
    ) {

        notificar(
            "Este pedido não pode mais ser cancelado.",
            "aviso",
            "Cancelamento indisponível"
        );

        return;
    }


    const modal =
        document.getElementById(
            "modal-cancelar-pedido"
        );


    const numero =
        document.getElementById(
            "numero-pedido-cancelamento"
        );


    const motivo =
        document.getElementById(
            "motivo-cancelamento"
        );


    if (
        !modal ||
        !motivo
    ) {

        console.error(
            "Modal de cancelamento não encontrado no HTML."
        );


        notificar(
            "Não foi possível abrir o cancelamento.",
            "erro",
            "Erro"
        );

        return;
    }


    pedidoCancelamentoId =
        pedido.id;


    if (numero) {

        numero.textContent =
            `Pedido #${obterNumeroPedido(
                pedido.id
            )}`;
    }


    motivo.value =
        "";


    atualizarContadorMotivo();


    modal.classList.add(
        "aberto"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";


    setTimeout(
        () => {

            motivo.focus();
        },
        100
    );
}


// ==========================================
// FECHAR MODAL DE CANCELAMENTO
// ==========================================

function fecharModalCancelamento() {

    const modal =
        document.getElementById(
            "modal-cancelar-pedido"
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


    pedidoCancelamentoId =
        null;


    const motivo =
        document.getElementById(
            "motivo-cancelamento"
        );


    if (motivo) {
        motivo.value = "";
    }


    atualizarContadorMotivo();

    atualizarBloqueioScroll();
}


// ==========================================
// CONTADOR DO MOTIVO
// ==========================================

function atualizarContadorMotivo() {

    const campo =
        document.getElementById(
            "motivo-cancelamento"
        );


    const contador =
        document.getElementById(
            "contador-motivo-cancelamento"
        );


    if (!contador) {
        return;
    }


    const quantidade =
        campo?.value?.length ||
        0;


    contador.textContent =
        `${quantidade}/500`;
}


// ==========================================
// CONFIRMAR CANCELAMENTO
// ==========================================

async function confirmarCancelamentoPedido() {

    if (
        !pedidoCancelamentoId
    ) {

        notificar(
            "Pedido não identificado.",
            "erro",
            "Erro"
        );

        return;
    }


    const pedido =
        pedidos.find(
            item =>
                String(
                    item.id
                ) ===
                String(
                    pedidoCancelamentoId
                )
        );


    if (!pedido) {

        notificar(
            "Pedido não encontrado. Atualize a lista e tente novamente.",
            "erro",
            "Pedido não encontrado"
        );


        fecharModalCancelamento();

        return;
    }


    const statusAtual =
        normalizarStatus(
            pedido.status
        );


    if (
        ![
            "aguardando_pagamento",
            "pago",
            "em_preparacao"
        ].includes(
            statusAtual
        )
    ) {

        notificar(
            "Este pedido não pode mais ser cancelado.",
            "aviso",
            "Cancelamento indisponível"
        );


        fecharModalCancelamento();

        await carregarPedidos();

        return;
    }


    const campoMotivo =
        document.getElementById(
            "motivo-cancelamento"
        );


    const botao =
        document.getElementById(
            "btn-confirmar-cancelamento"
        );


    const motivo =
        String(
            campoMotivo?.value ||
            ""
        )
            .trim();


    if (
        motivo.length < 5
    ) {

        notificar(
            "Informe um motivo com pelo menos 5 caracteres.",
            "aviso",
            "Motivo obrigatório"
        );


        campoMotivo?.focus();

        return;
    }


    if (
        motivo.length > 500
    ) {

        notificar(
            "O motivo deve possuir no máximo 500 caracteres.",
            "aviso",
            "Motivo muito grande"
        );


        campoMotivo?.focus();

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


    const confirmou =
        await window.confirmarAcao({

            titulo:
                "Cancelar este pedido?",

            mensagem:
                "O pedido será cancelado e os produtos serão devolvidos automaticamente ao estoque.",

            textoConfirmar:
                "Sim, cancelar pedido",

            textoCancelar:
                "Voltar",

            perigo:
                true

        });


    if (!confirmou) {
        return;
    }


    const conteudoOriginal =
        botao?.innerHTML;


    if (botao) {

        botao.disabled =
            true;


        botao.innerHTML = `

            <i class="fa-solid fa-spinner fa-spin"></i>

            Cancelando...

        `;
    }


    const pedidoId =
        pedidoCancelamentoId;


    try {

        const {
            data,
            error
        } =
            await window.db

                .rpc(
                    "cancelar_pedido_loja",
                    {

                        p_pedido_id:
                            pedidoId,

                        p_motivo:
                            motivo

                    }
                );


        if (error) {
            throw error;
        }


        console.log(
            "Pedido cancelado:",
            data
        );


        fecharModalCancelamento();


        notificar(
            `Pedido #${obterNumeroPedido(
                pedidoId
            )} cancelado. Os produtos foram devolvidos ao estoque.`,
            "sucesso",
            "Pedido cancelado!",
            4500
        );


        await carregarPedidos();


    } catch (erro) {

        console.error(
            "Erro ao cancelar pedido:",
            erro
        );


        notificar(
            tratarErroCancelamento(
                erro
            ),
            "erro",
            "Não foi possível cancelar o pedido",
            5500
        );


    } finally {

        if (botao) {

            botao.disabled =
                false;


            botao.innerHTML =
                conteudoOriginal ||
                `

                    <i class="fa-solid fa-ban"></i>

                    Cancelar Pedido

                `;
        }
    }
}


// ==========================================
// ERROS DO CANCELAMENTO
// ==========================================

function tratarErroCancelamento(
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
            "já foi cancelado"
        )
    ) {

        return (
            "Este pedido já foi cancelado."
        );
    }


    if (
        texto.includes(
            "enviado ou entregue"
        )
        ||
        texto.includes(
            "não pode mais ser cancelado"
        )
    ) {

        return (
            "Este pedido não pode mais ser cancelado porque já foi enviado ou entregue."
        );
    }


    if (
        texto.includes(
            "motivo"
        )
    ) {

        return (
            erro?.message ||
            "Informe um motivo válido para o cancelamento."
        );
    }


    if (
        texto.includes(
            "não possui permissão"
        )
        ||
        texto.includes(
            "pedido não encontrado"
        )
    ) {

        return (
            "Pedido não encontrado ou sua conta não possui permissão para cancelá-lo."
        );
    }


    return tratarErro(
        erro
    );
}


// ==========================================
// ESTATÍSTICAS
// ==========================================

function atualizarEstatisticas() {

    definirTexto(
        "estat-total-pedidos",
        pedidos.length
    );


    const aguardando =
        pedidos.filter(
            pedido =>
                normalizarStatus(
                    pedido.status
                ) ===
                "aguardando_pagamento"
        )
            .length;


    definirTexto(
        "estat-aguardando",
        aguardando
    );


    const statusAndamento =
        new Set([
            "pago",
            "em_preparacao",
            "enviado"
        ]);


    const andamento =
        pedidos.filter(
            pedido =>
                statusAndamento.has(
                    normalizarStatus(
                        pedido.status
                    )
                )
        )
            .length;


    definirTexto(
        "estat-andamento",
        andamento
    );


    const statusVenda =
        new Set([
            "pago",
            "em_preparacao",
            "enviado",
            "entregue"
        ]);


    const vendas =
        pedidos.reduce(
            (
                total,
                pedido
            ) => {

                if (
                    !statusVenda.has(
                        normalizarStatus(
                            pedido.status
                        )
                    )
                ) {

                    return total;
                }


                return (
                    total +
                    Number(
                        pedido.valor_total ||
                        0
                    )
                );

            },
            0
        );


    definirTexto(
        "estat-vendas",
        formatarMoeda(
            vendas
        )
    );
}


// ==========================================
// EVENTOS DA PÁGINA
// ==========================================

function configurarEventos() {

    // ==================================
    // FILTROS
    // ==================================

    document

        .querySelectorAll(
            ".filtro"
        )

        .forEach(
            botao => {

                botao.addEventListener(
                    "click",
                    () => {

                        document

                            .querySelectorAll(
                                ".filtro"
                            )

                            .forEach(
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
                            botao.dataset.status ||
                            "todos";


                        renderizarPedidos();
                    }
                );
            }
        );


    // ==================================
    // PESQUISA
    // ==================================

    const pesquisa =
        document.getElementById(
            "pesquisa-pedidos"
        );


    pesquisa?.addEventListener(
        "input",
        () => {

            pesquisaAtual =
                pesquisa.value.trim();


            renderizarPedidos();
        }
    );


    // ==================================
    // ATUALIZAR
    // ==================================

    const atualizar =
        document.getElementById(
            "btn-atualizar-pedidos"
        );


    atualizar?.addEventListener(
        "click",
        async () => {

            const conteudoOriginal =
                atualizar.innerHTML;


            atualizar.disabled =
                true;


            atualizar.innerHTML = `

                <i class="fa-solid fa-spinner fa-spin"></i>

                Atualizando...

            `;


            try {

                await carregarPedidos();


            } finally {

                atualizar.disabled =
                    false;


                atualizar.innerHTML =
                    conteudoOriginal ||
                    `

                        <i class="fa-solid fa-rotate-right"></i>

                        Atualizar

                    `;
            }
        }
    );


    // ==================================
    // MODAL DE DETALHES
    // ==================================

    document

        .getElementById(
            "btn-fechar-modal"
        )

        ?.addEventListener(
            "click",
            fecharModal
        );


    document

        .querySelectorAll(
            "[data-fechar-modal]"
        )

        .forEach(
            elemento => {

                elemento.addEventListener(
                    "click",
                    fecharModal
                );
            }
        );


    // ==================================
    // MODAL DE CANCELAMENTO
    // ==================================

    document

        .getElementById(
            "btn-fechar-cancelamento"
        )

        ?.addEventListener(
            "click",
            fecharModalCancelamento
        );


    document

        .getElementById(
            "btn-voltar-cancelamento"
        )

        ?.addEventListener(
            "click",
            fecharModalCancelamento
        );


    document

        .querySelectorAll(
            "[data-fechar-cancelamento]"
        )

        .forEach(
            elemento => {

                elemento.addEventListener(
                    "click",
                    fecharModalCancelamento
                );
            }
        );


    document

        .getElementById(
            "btn-confirmar-cancelamento"
        )

        ?.addEventListener(
            "click",
            confirmarCancelamentoPedido
        );


    document

        .getElementById(
            "motivo-cancelamento"
        )

        ?.addEventListener(
            "input",
            atualizarContadorMotivo
        );


    // ==================================
    // MODAL DE RASTREIO
    // ==================================

    document

        .getElementById(
            "btn-fechar-rastreio"
        )

        ?.addEventListener(
            "click",
            fecharModalRastreio
        );


    document

        .getElementById(
            "btn-voltar-rastreio"
        )

        ?.addEventListener(
            "click",
            fecharModalRastreio
        );


    document

        .querySelectorAll(
            "[data-fechar-rastreio]"
        )

        .forEach(
            elemento => {

                elemento.addEventListener(
                    "click",
                    fecharModalRastreio
                );
            }
        );


    document

        .getElementById(
            "btn-confirmar-rastreio"
        )

        ?.addEventListener(
            "click",
            confirmarEnvioPedido
        );


    // Enter no campo de rastreio.

    document

        .getElementById(
            "codigo-rastreio"
        )

        ?.addEventListener(
            "keydown",
            evento => {

                if (
                    evento.key ===
                    "Enter"
                ) {

                    evento.preventDefault();

                    confirmarEnvioPedido();
                }
            }
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


            fecharModal();

            fecharModalCancelamento();

            fecharModalRastreio();
        }
    );
}


// ==========================================
// FECHAR MODAL DE DETALHES
// ==========================================

function fecharModal() {

    const modal =
        document.getElementById(
            "modal-detalhes-pedido"
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


    atualizarBloqueioScroll();
}


// ==========================================
// CONTROLE DO SCROLL DOS MODAIS
// ==========================================

function atualizarBloqueioScroll() {

    const existeModalAberto =
        document.querySelector(
            ".modal-pedido.aberto"
        );


    document.body.style.overflow =
        existeModalAberto
            ? "hidden"
            : "";
}


// ==========================================
// NOME DO CLIENTE
// ==========================================

function obterNomeCliente(
    pedido
) {

    const observacoes =
        String(
            pedido.observacoes ||
            ""
        );


    const expressoes = [

        /nome\s*:\s*([^\n\r]+)/i,

        /cliente\s*:\s*([^\n\r]+)/i

    ];


    for (
        const expressao
        of expressoes
    ) {

        const resultado =
            observacoes.match(
                expressao
            );


        if (
            resultado?.[1]
        ) {

            return (
                resultado[1]
                    .trim()
            );
        }
    }


    const clienteId =
        String(
            pedido.cliente_id ||
            ""
        )

            .replaceAll(
                "-",
                ""
            )

            .slice(
                0,
                6
            )

            .toUpperCase();


    return (
        clienteId
            ? `Cliente #${clienteId}`
            : "Cliente"
    );
}


// ==========================================
// NORMALIZAR STATUS
// ==========================================

function normalizarStatus(
    status
) {

    const valor =
        String(
            status ||
            ""
        )

            .trim()

            .toLowerCase()

            .replaceAll(
                " ",
                "_"
            );


    const antigos = {

        pendente:
            "aguardando_pagamento",

        preparando:
            "em_preparacao",

        finalizado:
            "entregue"

    };


    return (
        antigos[valor] ||
        valor
    );
}


// ==========================================
// FORMATAR STATUS
// ==========================================

function formatarStatus(
    status
) {

    const textos = {

        aguardando_pagamento:
            "Aguardando pagamento",

        pago:
            "Pago",

        em_preparacao:
            "Em preparação",

        enviado:
            "Enviado",

        entregue:
            "Entregue",

        cancelado:
            "Cancelado"

    };


    const normalizado =
        normalizarStatus(
            status
        );


    return (
        textos[
            normalizado
        ] ||
        "Desconhecido"
    );
}


// ==========================================
// CLASSE DO STATUS
// ==========================================

function classeStatus(
    status
) {

    const classes = {

        aguardando_pagamento:
            "status-aguardando",

        pago:
            "status-pago",

        em_preparacao:
            "status-preparacao",

        enviado:
            "status-enviado",

        entregue:
            "status-entregue",

        cancelado:
            "status-cancelado"

    };


    return (
        classes[
            normalizarStatus(
                status
            )
        ] ||
        "status-desconhecido"
    );
}


// ==========================================
// PAGAMENTO
// ==========================================

function formatarPagamento(
    pagamento
) {

    const pagamentos = {

        pix:
            "PIX",

        credito:
            "Cartão de Crédito",

        debito:
            "Cartão de Débito",

        dinheiro:
            "Dinheiro"

    };


    const chave =
        String(
            pagamento ||
            ""
        )

            .trim()

            .toLowerCase();


    return (
        pagamentos[chave] ||
        pagamento ||
        "Não informado"
    );
}


// ==========================================
// NÚMERO DO PEDIDO
// ==========================================

function obterNumeroPedido(
    id
) {

    return (
        String(
            id ||
            ""
        )

            .replaceAll(
                "-",
                ""
            )

            .slice(
                0,
                8
            )

            .toUpperCase()

        ||

        "--------"
    );
}


// ==========================================
// DATA E HORA
// ==========================================

function formatarDataHora(
    valor
) {

    if (!valor) {
        return "-";
    }


    const data =
        new Date(
            valor
        );


    if (
        Number.isNaN(
            data.getTime()
        )
    ) {

        return "-";
    }


    return data.toLocaleString(
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
// MOEDA
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
// QUANTIDADE DE RESULTADOS
// ==========================================

function atualizarQuantidadeResultados(
    quantidade
) {

    definirTexto(
        "quantidade-resultados",
        `${quantidade} ${
            quantidade === 1
                ? "pedido"
                : "pedidos"
        }`
    );
}


// ==========================================
// DEFINIR TEXTO
// ==========================================

function definirTexto(
    id,
    texto
) {

    const elemento =
        document.getElementById(
            id
        );


    if (elemento) {

        elemento.textContent =
            texto;
    }
}


// ==========================================
// NORMALIZAR PESQUISA
// ==========================================

function normalizarTexto(
    texto
) {

    return String(
        texto ||
        ""
    )

        .normalize(
            "NFD"
        )

        .replace(
            /[\u0300-\u036f]/g,
            ""
        )

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
// ERROS GERAIS
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
            "pedidos_status_check"
        )
    ) {

        return (
            "O status informado não é válido."
        );
    }


    if (
        texto.includes(
            "pedidos_codigo_rastreio_check"
        )
    ) {

        return (
            "O código de rastreio informado não é válido."
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