// ==========================================
// PAINEL-LOJA.JS
// Comércio da Cidade
// ==========================================

let usuario = null;
let loja = null;


// ==========================================
// INICIAR
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "Painel da loja iniciado."
        );


        // ==================================
        // SUPABASE
        // ==================================

        if (!window.db) {

            console.error(
                "Supabase não encontrado."
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

        await carregarLoja();

    }
);


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


        if (!sessaoData.session) {

            notificar(
                "Entre na sua conta para acessar o painel da loja.",
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

        console.log(
            "Buscando loja do usuário..."
        );


        const {
            data,
            error
        } =
            await window.db

                .from(
                    "lojas"
                )

                .select(`
                    *,
                    categorias!categoria_id(
                        nome
                    )
                `)

                .eq(
                    "proprietario_id",
                    usuario.id
                )

                .maybeSingle();


        if (error) {

            throw error;

        }


        // ==================================
        // NÃO POSSUI LOJA
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
                "info",
                "Crie sua loja",
                2500
            );


            setTimeout(
                () => {

                    window.location.href =
                        "cadastrar-loja.html";

                },
                900
            );


            return;

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
            loja.nome || ""
        );


        // ==================================
        // LOGO
        // ==================================

        carregarLogoLoja();


        // ==================================
        // DADOS
        // ==================================

        definirTexto(
            "nome-loja",
            loja.nome || "-"
        );

        definirTexto(
            "categoria-loja",
            loja.categorias?.nome ||
            "Sem categoria"
        );

        definirTexto(
            "cidade-loja",
            loja.cidade || "-"
        );

        definirTexto(
            "telefone-loja",
            loja.telefone ||
            loja.whatsapp ||
            "-"
        );


        // ==================================
        // STATUS DA LOJA
        // ==================================

        const statusLoja =
            document.getElementById(
                "status-loja"
            );


        if (statusLoja) {

            statusLoja.textContent =
                loja.ativa
                    ? "🟢 Ativa"
                    : "🔴 Inativa";

        }


        // ==================================
        // BOTÃO EDITAR
        // ==================================

        configurarBotaoEditar();


        // ==================================
        // PRODUTOS
        // ==================================

        await carregarProdutos();


        // ==================================
        // PEDIDOS E ESTATÍSTICAS
        // ==================================

        await Promise.all([
            carregarPedidos(),
            carregarEstatisticas()
        ]);


    } catch (erro) {

        console.error(
            "Erro ao carregar loja:",
            erro
        );

        notificar(
            tratarErroPainel(
                erro
            ),
            "erro",
            "Não foi possível carregar a loja",
            5500
        );

    }

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
// CARREGAR LOGO
// ==========================================

function carregarLogoLoja() {

    const imagem =
        document.getElementById(
            "logo-loja"
        );


    const placeholder =
        document.getElementById(
            "logo-loja-placeholder"
        );


    if (
        !imagem ||
        !placeholder
    ) {

        console.warn(
            "Elementos da logo não encontrados."
        );

        return;

    }


    if (loja?.logo_url) {

        imagem.src =
            loja.logo_url;

        imagem.hidden =
            false;

        imagem.style.display =
            "block";

        placeholder.style.display =
            "none";


        imagem.onerror =
            () => {

                console.warn(
                    "Erro ao carregar logo da loja."
                );

                imagem.hidden =
                    true;

                imagem.style.display =
                    "none";

                imagem.removeAttribute(
                    "src"
                );

                placeholder.style.display =
                    "flex";

            };


        return;

    }


    imagem.hidden =
        true;

    imagem.style.display =
        "none";

    imagem.removeAttribute(
        "src"
    );

    placeholder.style.display =
        "flex";

}


// ==========================================
// BOTÃO EDITAR LOJA
// ==========================================

function configurarBotaoEditar() {

    const botao =
        document.getElementById(
            "btnEditarLoja"
        );


    if (
        !botao ||
        !loja?.id
    ) {

        return;

    }


    botao.onclick =
        () => {

            window.location.href =
                `editar-loja.html?id=${encodeURIComponent(
                    loja.id
                )}`;

        };

}


// ==========================================
// CARREGAR PRODUTOS
// ==========================================

async function carregarProdutos() {

    const lista =
        document.getElementById(
            "lista-produtos"
        );


    if (lista) {

        lista.innerHTML = `

            <div class="sem-produtos">

                <i class="fa-solid fa-spinner fa-spin"></i>

                <h3>
                    Carregando produtos...
                </h3>

            </div>

        `;

    }


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
                        ascending: false
                    }
                );


        if (error) {

            throw error;

        }


        const produtos =
            Array.isArray(data)
                ? data
                : [];


        definirTexto(
            "total-produtos",
            produtos.length
        );


        if (!lista) {

            return;

        }


        // ==================================
        // SEM PRODUTOS
        // ==================================

        if (
            produtos.length === 0
        ) {

            lista.innerHTML = `

                <div class="sem-produtos">

                    <i class="fa-solid fa-box-open"></i>

                    <h3>
                        Nenhum produto cadastrado
                    </h3>

                    <p>
                        Clique em
                        <strong>Novo Produto</strong>
                        para cadastrar seu primeiro produto.
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
        // MOSTRAR PRODUTOS
        // ==================================

        lista.innerHTML =
            produtos
                .map(
                    criarCardProduto
                )
                .join("");


        configurarImagensProdutos();


    } catch (erro) {

        console.error(
            "Erro ao carregar produtos:",
            erro
        );


        if (lista) {

            lista.innerHTML = `

                <div class="sem-produtos">

                    <i class="fa-solid fa-triangle-exclamation"></i>

                    <h3>
                        Erro ao carregar produtos
                    </h3>

                    <p>
                        Tente novamente.
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


        notificar(
            "Não foi possível carregar os produtos da sua loja.",
            "erro",
            "Erro ao carregar produtos",
            5000
        );

    }

}


// ==========================================
// CRIAR CARD DO PRODUTO
// ==========================================

function criarCardProduto(
    produto
) {

    const id =
        escaparHTML(
            produto.id || ""
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
            produto.preco || 0
        );


    const promocional =
        Number(
            produto.preco_promocional ||
            0
        );


    const temPromocao =
        promocional > 0 &&
        promocional < preco;


    const estoque =
        Math.max(
            0,
            Number(
                produto.estoque || 0
            )
        );


    // ==================================
    // IMAGEM
    // ==================================

    let imagemHTML =
        "";


    if (produto.imagem_url) {

        imagemHTML = `

            <div class="area-foto-produto">

                <img
                    src="${escaparHTML(
                        produto.imagem_url
                    )}"
                    alt="${nome}"
                    class="foto-produto"
                    loading="lazy"
                >

                <div
                    class="foto-produto-placeholder"
                    style="display:none;"
                >

                    <i class="fa-solid fa-box"></i>

                </div>

            </div>

        `;


    } else {

        imagemHTML = `

            <div class="area-foto-produto">

                <div
                    class="foto-produto foto-produto-placeholder"
                    style="
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        font-size:45px;
                        color:#198754;
                    "
                >

                    <i class="fa-solid fa-box"></i>

                </div>

            </div>

        `;

    }


    // ==================================
    // PREÇO
    // ==================================

    const precoHTML =
        temPromocao
            ? `

                <span class="promo">

                    De
                    ${formatarMoeda(
                        preco
                    )}

                </span>

                <strong class="preco">

                    ${formatarMoeda(
                        promocional
                    )}

                </strong>

            `
            : `

                <strong class="preco">

                    ${formatarMoeda(
                        preco
                    )}

                </strong>

            `;


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


                <p class="descricao">

                    ${descricao}

                </p>


                <div class="precos">

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

                                <span class="status ativo">

                                    🟢 Ativo

                                </span>

                            `
                            : `

                                <span class="status inativo">

                                    🔴 Inativo

                                </span>

                            `
                    }

                </p>

            </div>


            <div class="acoes">

                <button
                    type="button"
                    class="btn-editar"
                    onclick="editarProduto('${id}')"
                >

                    <i class="fa-solid fa-pen"></i>

                    Editar

                </button>


                <button
                    type="button"
                    class="btn-excluir"
                    onclick="excluirProduto(
                        '${id}',
                        '${escaparJS(
                            produto.nome ||
                            "Produto"
                        )}'
                    )"
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
            "#lista-produtos .area-foto-produto img"
        );


    imagens.forEach(
        (imagem) => {

            imagem.addEventListener(
                "error",
                () => {

                    const area =
                        imagem.closest(
                            ".area-foto-produto"
                        );


                    imagem.style.display =
                        "none";


                    imagem.removeAttribute(
                        "src"
                    );


                    const placeholder =
                        area?.querySelector(
                            ".foto-produto-placeholder"
                        );


                    if (placeholder) {

                        placeholder.style.display =
                            "flex";

                    }

                },
                {
                    once: true
                }
            );

        }
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
    id,
    nomeProduto = "Produto"
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
    // CONFIRMAÇÃO PERSONALIZADA
    // ==================================

    if (
        typeof window.confirmarAcao !==
        "function"
    ) {

        console.error(
            "Sistema de confirmação não carregado."
        );

        notificar(
            "Não foi possível abrir a confirmação.",
            "erro",
            "Erro no sistema"
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


        notificar(
            `"${nomeProduto}" foi excluído com sucesso.`,
            "sucesso",
            "Produto excluído!",
            3000
        );


        await carregarProdutos();

        await carregarEstatisticas();


    } catch (erro) {

        console.error(
            "Erro ao excluir produto:",
            erro
        );


        notificar(
            tratarErroPainel(
                erro
            ),
            "erro",
            "Não foi possível excluir",
            5000
        );

    }

}


// ==========================================
// CARREGAR ESTATÍSTICAS
// ==========================================

async function carregarEstatisticas() {

    try {

        if (!loja?.id) {

            return;

        }


        // ==================================
        // PRODUTOS
        // ==================================

        const consultaProdutos =
            window.db

                .from(
                    "produtos"
                )

                .select(
                    "*",
                    {
                        count: "exact",
                        head: true
                    }
                )

                .eq(
                    "loja_id",
                    loja.id
                );


        // ==================================
        // PEDIDOS
        // ==================================

        const consultaPedidos =
            window.db

                .from(
                    "pedidos"
                )

                .select(`
                    id,
                    status,
                    valor_total
                `)

                .eq(
                    "loja_id",
                    loja.id
                );


        const [
            resultadoProdutos,
            resultadoPedidos
        ] =
            await Promise.all([
                consultaProdutos,
                consultaPedidos
            ]);


        // ==================================
        // TOTAL PRODUTOS
        // ==================================

        if (resultadoProdutos.error) {

            console.error(
                "Erro ao contar produtos:",
                resultadoProdutos.error
            );

        }


        definirTexto(
            "total-produtos",
            resultadoProdutos.count || 0
        );


        // ==================================
        // TOTAL PEDIDOS
        // ==================================

        if (resultadoPedidos.error) {

            throw resultadoPedidos.error;

        }


        const pedidos =
            Array.isArray(
                resultadoPedidos.data
            )
                ? resultadoPedidos.data
                : [];


        definirTexto(
            "total-pedidos",
            pedidos.length
        );


        // ==================================
        // TOTAL DE VENDAS
        //
        // Somente pedidos que já foram pagos.
        // aguardando_pagamento não entra.
        // cancelado também não entra.
        // ==================================

        const statusQueContamComoVenda =
            new Set([
                "pago",
                "em_preparacao",
                "enviado",
                "entregue"
            ]);


        const totalVendas =
            pedidos.reduce(
                (
                    total,
                    pedido
                ) => {

                    const status =
                        normalizarStatusPedido(
                            pedido.status
                        );


                    if (
                        !statusQueContamComoVenda
                            .has(
                                status
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
            "total-vendas",
            formatarMoeda(
                totalVendas
            )
        );


    } catch (erro) {

        console.error(
            "Erro ao carregar estatísticas:",
            erro
        );


        notificar(
            tratarErroPainel(
                erro
            ),
            "erro",
            "Erro nas estatísticas",
            4500
        );

    }

}


// ==========================================
// CARREGAR PEDIDOS RECENTES
// ==========================================

async function carregarPedidos() {

    const lista =
        document.getElementById(
            "lista-pedidos"
        );


    if (!lista) {

        return;

    }


    // ==================================
    // CARREGANDO
    // ==================================

    lista.innerHTML = `

        <div class="sem-pedidos">

            <i class="fa-solid fa-spinner fa-spin"></i>

            <h3>
                Carregando pedidos...
            </h3>

        </div>

    `;


    try {

        if (!loja?.id) {

            return;

        }


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
                        ascending: false
                    }
                )

                .limit(
                    5
                );


        if (error) {

            throw error;

        }


        const pedidos =
            Array.isArray(data)
                ? data
                : [];


        // ==================================
        // SEM PEDIDOS
        // ==================================

        if (
            pedidos.length === 0
        ) {

            lista.innerHTML = `

                <div class="sem-pedidos">

                    <i class="fa-solid fa-cart-shopping"></i>

                    <h3>
                        Nenhum pedido recebido
                    </h3>

                    <p>
                        Quando algum cliente fizer
                        um pedido, ele aparecerá aqui.
                    </p>

                </div>

            `;


            return;

        }


        // ==================================
        // MOSTRAR PEDIDOS
        // ==================================

        lista.innerHTML =
            pedidos
                .map(
                    criarCardPedido
                )
                .join("");


    } catch (erro) {

        console.error(
            "Erro ao carregar pedidos:",
            erro
        );


        lista.innerHTML = `

            <div class="sem-pedidos">

                <i class="fa-solid fa-triangle-exclamation"></i>

                <h3>
                    Erro ao carregar pedidos
                </h3>

                <p>
                    Não foi possível buscar os pedidos
                    da sua loja.
                </p>

                <button
                    type="button"
                    class="btn"
                    onclick="carregarPedidos()"
                >

                    <i class="fa-solid fa-rotate-right"></i>

                    Tentar novamente

                </button>

            </div>

        `;


        notificar(
            tratarErroPainel(
                erro
            ),
            "erro",
            "Erro ao carregar pedidos",
            5000
        );

    }

}


// ==========================================
// CRIAR CARD DO PEDIDO
// ==========================================

function criarCardPedido(
    pedido
) {

    const id =
        String(
            pedido.id || ""
        );


    const idSeguro =
        escaparHTML(
            id
        );


    const status =
        normalizarStatusPedido(
            pedido.status
        );


    const itens =
        Array.isArray(
            pedido.itens_pedido
        )
            ? pedido.itens_pedido
            : [];


    const totalItens =
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


    const numeroPedido =
        obterNumeroPedido(
            id
        );


    const dataPedido =
        formatarDataHora(
            pedido.created_at
        );


    const pagamento =
        formatarPagamento(
            pedido.forma_pagamento
        );


    const statusTexto =
        formatarStatusPedido(
            status
        );


    const classeStatus =
        obterClasseStatusPedido(
            status
        );


    const acao =
        obterAcaoProximoStatus(
            status
        );


    const itensHTML =
        itens.length > 0

            ? itens
                .map(
                    criarItemDetalhePedido
                )
                .join("")

            : `

                <div class="pedido-item-vazio">

                    Nenhum item encontrado.

                </div>

            `;


    let observacoesHTML =
        "";


    if (
        pedido.observacoes &&
        String(
            pedido.observacoes
        ).trim()
    ) {

        observacoesHTML = `

            <div class="pedido-observacoes">

                <strong>

                    <i class="fa-solid fa-comment"></i>

                    Informações do pedido

                </strong>

                <p>
                    ${formatarTextoMultilinha(
                        pedido.observacoes
                    )}
                </p>

            </div>

        `;

    }


    let botaoStatusHTML =
        "";


    if (acao) {

        botaoStatusHTML = `

            <button
                type="button"
                class="btn btn-status-pedido"
                onclick="
                    avancarStatusPedido(
                        '${escaparJS(
                            id
                        )}',
                        '${escaparJS(
                            status
                        )}'
                    )
                "
            >

                <i class="${acao.icone}"></i>

                ${acao.texto}

            </button>

        `;

    }


    return `

        <article
            class="pedido-card"
            data-pedido-id="${idSeguro}"
        >


            <!-- CABEÇALHO -->

            <div class="pedido-cabecalho">

                <div>

                    <h3 class="pedido-numero">

                        <i class="fa-solid fa-receipt"></i>

                        Pedido #${numeroPedido}

                    </h3>

                    <span class="pedido-data">

                        ${dataPedido}

                    </span>

                </div>


                <span
                    class="status-pedido ${classeStatus}"
                >

                    ${statusTexto}

                </span>

            </div>


            <!-- RESUMO -->

            <div class="pedido-resumo">


                <div class="pedido-resumo-item">

                    <i class="fa-solid fa-wallet"></i>

                    <div>

                        <small>
                            Pagamento
                        </small>

                        <strong>
                            ${escaparHTML(
                                pagamento
                            )}
                        </strong>

                    </div>

                </div>


                <div class="pedido-resumo-item">

                    <i class="fa-solid fa-box"></i>

                    <div>

                        <small>
                            Itens
                        </small>

                        <strong>

                            ${totalItens}

                            ${
                                totalItens === 1
                                    ? "item"
                                    : "itens"
                            }

                        </strong>

                    </div>

                </div>


                <div class="pedido-resumo-item">

                    <i class="fa-solid fa-sack-dollar"></i>

                    <div>

                        <small>
                            Total
                        </small>

                        <strong>

                            ${formatarMoeda(
                                pedido.valor_total
                            )}

                        </strong>

                    </div>

                </div>

            </div>


            <!-- AÇÕES -->

            <div class="pedido-acoes">

                <button
                    type="button"
                    class="btn btn-secundario"
                    onclick="
                        alternarDetalhesPedido(
                            '${escaparJS(
                                id
                            )}',
                            this
                        )
                    "
                >

                    <i class="fa-solid fa-eye"></i>

                    Ver detalhes

                </button>


                ${botaoStatusHTML}

            </div>


            <!-- DETALHES -->

            <div
                id="detalhes-pedido-${idSeguro}"
                class="pedido-detalhes"
                hidden
            >

                <h4>

                    <i class="fa-solid fa-box-open"></i>

                    Produtos do pedido

                </h4>


                <div class="pedido-itens">

                    ${itensHTML}

                </div>


                ${observacoesHTML}

            </div>


        </article>

    `;

}


// ==========================================
// CRIAR ITEM DO PEDIDO
// ==========================================

function criarItemDetalhePedido(
    item
) {

    let produto =
        item?.produtos;


    if (
        Array.isArray(
            produto
        )
    ) {

        produto =
            produto[0];

    }


    const nome =
        escaparHTML(
            produto?.nome ||
            "Produto"
        );


    const quantidade =
        Math.max(
            0,
            Number(
                item?.quantidade ||
                0
            )
        );


    const preco =
        Number(
            item?.preco_unitario ||
            0
        );


    const subtotal =
        Number(
            item?.subtotal ||
            (
                preco *
                quantidade
            )
        );


    let imagemHTML =
        `

            <div class="pedido-item-sem-imagem">

                <i class="fa-solid fa-box"></i>

            </div>

        `;


    if (produto?.imagem_url) {

        imagemHTML = `

            <img
                src="${escaparHTML(
                    produto.imagem_url
                )}"
                alt="${nome}"
                class="pedido-item-imagem"
                loading="lazy"
                onerror="
                    this.style.display='none';
                "
            >

        `;

    }


    return `

        <div class="pedido-item">

            <div class="pedido-item-foto">

                ${imagemHTML}

            </div>


            <div class="pedido-item-info">

                <strong>
                    ${nome}
                </strong>

                <small>

                    ${quantidade}

                    ×

                    ${formatarMoeda(
                        preco
                    )}

                </small>

            </div>


            <strong class="pedido-item-subtotal">

                ${formatarMoeda(
                    subtotal
                )}

            </strong>

        </div>

    `;

}


// ==========================================
// MOSTRAR / OCULTAR DETALHES
// ==========================================

function alternarDetalhesPedido(
    pedidoId,
    botao = null
) {

    const detalhes =
        document.getElementById(
            `detalhes-pedido-${pedidoId}`
        );


    if (!detalhes) {

        notificar(
            "Não foi possível abrir os detalhes deste pedido.",
            "erro",
            "Pedido não encontrado"
        );

        return;

    }


    const vaiAbrir =
        detalhes.hidden;


    detalhes.hidden =
        !vaiAbrir;


    if (botao) {

        botao.innerHTML =
            vaiAbrir
                ? `

                    <i class="fa-solid fa-eye-slash"></i>

                    Ocultar detalhes

                `
                : `

                    <i class="fa-solid fa-eye"></i>

                    Ver detalhes

                `;

    }

}


// ==========================================
// AVANÇAR STATUS DO PEDIDO
// ==========================================

async function avancarStatusPedido(
    pedidoId,
    statusAtual
) {

    if (
        !pedidoId ||
        !loja?.id
    ) {

        notificar(
            "Não foi possível identificar este pedido.",
            "erro",
            "Pedido inválido"
        );

        return;

    }


    const statusNormalizado =
        normalizarStatusPedido(
            statusAtual
        );


    const proximoStatus =
        obterProximoStatusPedido(
            statusNormalizado
        );


    if (!proximoStatus) {

        notificar(
            "Este pedido não possui uma próxima etapa.",
            "info",
            "Status final"
        );

        return;

    }


    const acao =
        obterAcaoProximoStatus(
            statusNormalizado
        );


    // ==================================
    // CONFIRMAÇÃO
    // ==================================

    if (
        typeof window.confirmarAcao !==
        "function"
    ) {

        console.error(
            "Sistema de confirmação não carregado."
        );

        notificar(
            "Não foi possível abrir a confirmação.",
            "erro",
            "Erro no sistema"
        );

        return;

    }


    const confirmou =
        await window.confirmarAcao({

            titulo:
                acao?.titulo ||
                "Atualizar pedido?",

            mensagem:
                `O pedido #${obterNumeroPedido(
                    pedidoId
                )} passará de "${formatarStatusPedido(
                    statusNormalizado
                )}" para "${formatarStatusPedido(
                    proximoStatus
                )}". Deseja continuar?`,

            textoConfirmar:
                acao?.textoConfirmar ||
                "Confirmar",

            textoCancelar:
                "Cancelar",

            perigo:
                false

        });


    if (!confirmou) {

        return;

    }


    try {

        const {
            data,
            error
        } =
            await window.db

                .from(
                    "pedidos"
                )

                .update({
                    status:
                        proximoStatus
                })

                .eq(
                    "id",
                    pedidoId
                )

                .eq(
                    "loja_id",
                    loja.id
                )

                // Protege contra status alterado
                // em outra aba/dispositivo.
                .eq(
                    "status",
                    statusNormalizado
                )

                .select(`
                    id,
                    status
                `)

                .maybeSingle();


        if (error) {

            throw error;

        }


        if (!data) {

            notificar(
                "O status deste pedido pode ter sido alterado em outra tela. Atualize os pedidos e tente novamente.",
                "aviso",
                "Pedido atualizado"
            );

            await carregarPedidos();

            await carregarEstatisticas();

            return;

        }


        // ==================================
        // SUCESSO
        // ==================================

        notificar(
            `Pedido #${obterNumeroPedido(
                pedidoId
            )} atualizado para "${formatarStatusPedido(
                proximoStatus
            )}".`,
            "sucesso",
            "Status atualizado!",
            3500
        );


        // ==================================
        // ATUALIZAR PAINEL
        // ==================================

        await Promise.all([
            carregarPedidos(),
            carregarEstatisticas()
        ]);


    } catch (erro) {

        console.error(
            "Erro ao atualizar pedido:",
            erro
        );


        notificar(
            tratarErroPainel(
                erro
            ),
            "erro",
            "Não foi possível atualizar o pedido",
            5500
        );

    }

}


// ==========================================
// PRÓXIMO STATUS
// ==========================================

function obterProximoStatusPedido(
    status
) {

    const fluxo = {

        aguardando_pagamento:
            "pago",

        pago:
            "em_preparacao",

        em_preparacao:
            "enviado",

        enviado:
            "entregue"

    };


    return (
        fluxo[
            normalizarStatusPedido(
                status
            )
        ] ||
        null
    );

}


// ==========================================
// AÇÃO DO PRÓXIMO STATUS
// ==========================================

function obterAcaoProximoStatus(
    status
) {

    const statusNormalizado =
        normalizarStatusPedido(
            status
        );


    const acoes = {

        aguardando_pagamento: {

            texto:
                "Marcar como pago",

            titulo:
                "Confirmar pagamento?",

            textoConfirmar:
                "Sim, marcar como pago",

            icone:
                "fa-solid fa-circle-dollar-to-slot"

        },


        pago: {

            texto:
                "Iniciar preparação",

            titulo:
                "Iniciar preparação?",

            textoConfirmar:
                "Iniciar preparação",

            icone:
                "fa-solid fa-box-open"

        },


        em_preparacao: {

            texto:
                "Marcar como enviado",

            titulo:
                "Pedido enviado?",

            textoConfirmar:
                "Sim, marcar como enviado",

            icone:
                "fa-solid fa-truck"

        },


        enviado: {

            texto:
                "Marcar como entregue",

            titulo:
                "Confirmar entrega?",

            textoConfirmar:
                "Sim, marcar como entregue",

            icone:
                "fa-solid fa-circle-check"

        }

    };


    return (
        acoes[
            statusNormalizado
        ] ||
        null
    );

}


// ==========================================
// NORMALIZAR STATUS
// ==========================================

function normalizarStatusPedido(
    status
) {

    const valor =
        String(
            status || ""
        )
            .trim()
            .toLowerCase()
            .replaceAll(
                " ",
                "_"
            );


    // Compatibilidade com pedidos antigos.

    const antigos = {

        pendente:
            "aguardando_pagamento",

        preparando:
            "em_preparacao",

        finalizado:
            "entregue",

        cancelado:
            "cancelado"

    };


    return (
        antigos[valor] ||
        valor
    );

}


// ==========================================
// TEXTO DO STATUS
// ==========================================

function formatarStatusPedido(
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
        normalizarStatusPedido(
            status
        );


    return (
        textos[normalizado] ||
        "Status desconhecido"
    );

}


// ==========================================
// CLASSE DO STATUS
// ==========================================

function obterClasseStatusPedido(
    status
) {

    const normalizado =
        normalizarStatusPedido(
            status
        );


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
        classes[normalizado] ||
        "status-desconhecido"
    );

}


// ==========================================
// FORMA DE PAGAMENTO
// ==========================================

function formatarPagamento(
    pagamento
) {

    const valor =
        String(
            pagamento || ""
        )
            .trim()
            .toLowerCase();


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


    return (
        pagamentos[valor] ||
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

    const texto =
        String(
            id || ""
        );


    if (!texto) {

        return "--------";

    }


    return (
        texto
            .replaceAll(
                "-",
                ""
            )
            .slice(
                0,
                8
            )
            .toUpperCase()
    );

}


// ==========================================
// DATA / HORA
// ==========================================

function formatarDataHora(
    data
) {

    if (!data) {

        return "-";

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

        return "-";

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
// TEXTO COM QUEBRAS DE LINHA
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
// TRATAR ERROS
// ==========================================

function tratarErroPainel(
    erro
) {

    const texto =
        String(
            erro?.message || ""
        )
            .toLowerCase();


    // ==================================
    // RLS
    // ==================================

    if (
        texto.includes(
            "row-level security"
        ) ||
        texto.includes(
            "rls"
        ) ||
        texto.includes(
            "permission denied"
        )
    ) {

        return (
            "Sua conta não possui permissão para realizar esta ação."
        );

    }


    // ==================================
    // STATUS
    // ==================================

    if (
        texto.includes(
            "pedidos_status_check"
        ) ||
        (
            texto.includes(
                "check constraint"
            ) &&
            texto.includes(
                "status"
            )
        )
    ) {

        return (
            "Este status não é permitido para o pedido."
        );

    }


    // ==================================
    // FOREIGN KEY
    // ==================================

    if (
        texto.includes(
            "foreign key"
        ) ||
        texto.includes(
            "violates foreign key"
        )
    ) {

        return (
            "Este registro está relacionado a outros dados do sistema e não pode ser alterado dessa forma."
        );

    }


    // ==================================
    // REDE
    // ==================================

    if (
        texto.includes(
            "failed to fetch"
        ) ||
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
        "Ocorreu um erro. Tente novamente."
    );

}


// ==========================================
// FORMATAR MOEDA
// ==========================================

function formatarMoeda(
    valor
) {

    return Number(
        valor || 0
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
// ESCAPAR TEXTO PARA ONCLICK
// ==========================================

function escaparJS(
    valor
) {

    return String(
        valor ?? ""
    )

        .replaceAll(
            "\\",
            "\\\\"
        )

        .replaceAll(
            "'",
            "\\'"
        )

        .replaceAll(
            "\n",
            " "
        )

        .replaceAll(
            "\r",
            " "
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

window.editarProduto =
    editarProduto;

window.excluirProduto =
    excluirProduto;

window.carregarProdutos =
    carregarProdutos;

window.carregarPedidos =
    carregarPedidos;

window.carregarEstatisticas =
    carregarEstatisticas;

window.alternarDetalhesPedido =
    alternarDetalhesPedido;

window.avancarStatusPedido =
    avancarStatusPedido;