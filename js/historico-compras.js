// ==========================================
// HISTORICO-COMPRAS.JS
// Comércio da Cidade
// RF-12 — Histórico de compras
// ==========================================

let usuarioHistorico = null;
let paginaHistorico = 1;
let totalHistorico = 0;
let pedidosHistorico = [];

const ITENS_POR_PAGINA_HISTORICO = 20;


document.addEventListener(
    "DOMContentLoaded",
    iniciarHistoricoCompras
);


async function iniciarHistoricoCompras() {

    if (!window.db) {

        mostrarEstadoHistorico(
            "Não foi possível conectar ao sistema.",
            "Atualize a página e tente novamente.",
            "fa-triangle-exclamation"
        );

        notificarHistorico(
            "Não foi possível conectar ao sistema.",
            "erro",
            "Erro de conexão"
        );

        return;
    }


    configurarEventosHistorico();


    const autenticado =
        await verificarUsuarioHistorico();


    if (!autenticado) {
        return;
    }


    await carregarLojasHistorico();
    await carregarHistoricoCompras();
}


async function verificarUsuarioHistorico() {

    try {

        const {
            data,
            error
        } =
            await window.db.auth.getSession();


        if (error) {
            throw error;
        }


        if (!data.session?.user) {

            notificarHistorico(
                "Entre na sua conta para visualizar seu histórico de compras.",
                "info",
                "Login necessário",
                2600
            );


            setTimeout(
                () => {
                    window.location.href = "login.html";
                },
                900
            );


            return false;
        }


        usuarioHistorico =
            data.session.user;


        return true;


    } catch (erro) {

        console.error(
            "Erro ao verificar usuário do histórico:",
            erro
        );


        mostrarEstadoHistorico(
            "Não foi possível validar sua sessão.",
            "Entre novamente e tente acessar o histórico.",
            "fa-user-lock"
        );


        return false;
    }
}


function configurarEventosHistorico() {

    const periodo =
        document.getElementById(
            "filtro-periodo"
        );


    const loja =
        document.getElementById(
            "filtro-loja"
        );


    const limpar =
        document.getElementById(
            "btn-limpar-filtros"
        );


    const anterior =
        document.getElementById(
            "btn-pagina-anterior"
        );


    const proxima =
        document.getElementById(
            "btn-proxima-pagina"
        );


    periodo?.addEventListener(
        "change",
        async () => {

            paginaHistorico = 1;
            await carregarHistoricoCompras();
        }
    );


    loja?.addEventListener(
        "change",
        async () => {

            paginaHistorico = 1;
            await carregarHistoricoCompras();
        }
    );


    limpar?.addEventListener(
        "click",
        async () => {

            if (periodo) {
                periodo.value = "todos";
            }


            if (loja) {
                loja.value = "todos";
            }


            paginaHistorico = 1;
            await carregarHistoricoCompras();
        }
    );


    anterior?.addEventListener(
        "click",
        async () => {

            if (paginaHistorico <= 1) {
                return;
            }


            paginaHistorico -= 1;
            await carregarHistoricoCompras();


            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }
    );


    proxima?.addEventListener(
        "click",
        async () => {

            const totalPaginas =
                obterTotalPaginasHistorico();


            if (
                paginaHistorico >=
                totalPaginas
            ) {
                return;
            }


            paginaHistorico += 1;
            await carregarHistoricoCompras();


            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }
    );


    document
        .getElementById(
            "lista-historico"
        )
        ?.addEventListener(
            "click",
            async evento => {

                const botao =
                    evento.target.closest(
                        "[data-recomprar-pedido]"
                    );


                if (!botao) {
                    return;
                }


                const pedidoId =
                    botao.dataset.recomprarPedido;


                const pedido =
                    pedidosHistorico.find(
                        item =>
                            String(item.id) ===
                            String(pedidoId)
                    );


                if (!pedido) {

                    notificarHistorico(
                        "Não foi possível localizar este pedido na página atual.",
                        "erro",
                        "Pedido não encontrado"
                    );

                    return;
                }


                await comprarNovamente(
                    pedido,
                    botao
                );
            }
        );
}


async function carregarLojasHistorico() {

    const select =
        document.getElementById(
            "filtro-loja"
        );


    if (!select) {
        return;
    }


    try {

        const {
            data,
            error
        } =
            await window.db.rpc(
                "listar_lojas_historico_cliente"
            );


        if (error) {
            throw error;
        }


        const lojas =
            Array.isArray(data)
                ? data
                : [];


        select.innerHTML =
            '<option value="todos">Todas as lojas</option>';


        lojas.forEach(
            loja => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    String(
                        loja.id ||
                        ""
                    );


                option.textContent =
                    loja.nome ||
                    "Loja";


                select.appendChild(
                    option
                );
            }
        );


        select.disabled =
            false;


    } catch (erro) {

        console.warn(
            "Filtro por loja ainda não disponível:",
            erro
        );


        select.innerHTML =
            '<option value="todos">Todas as lojas</option>';


        select.disabled =
            true;


        notificarHistorico(
            "O histórico pode ser consultado normalmente. O filtro por loja ficará disponível após a migration do RF-12 ser aplicada no Supabase.",
            "info",
            "Filtro por loja pendente",
            5000
        );
    }
}


async function carregarHistoricoCompras() {

    if (!usuarioHistorico?.id) {
        return;
    }


    mostrarEstadoHistorico(
        "Carregando seu histórico...",
        "Buscando os pedidos desta página.",
        "fa-spinner fa-spin"
    );


    try {

        const inicio =
            (paginaHistorico - 1) *
            ITENS_POR_PAGINA_HISTORICO;


        const fim =
            inicio +
            ITENS_POR_PAGINA_HISTORICO -
            1;


        let consulta =
            window.db
                .from("pedidos")
                .select(`
                    id,
                    cliente_id,
                    loja_id,
                    status,
                    subtotal_produtos,
                    frete,
                    valor_total,
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
                `, {
                    count: "exact"
                })
                .eq(
                    "cliente_id",
                    usuarioHistorico.id
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        const lojaSelecionada =
            document.getElementById(
                "filtro-loja"
            )?.value ||
            "todos";


        if (
            lojaSelecionada !==
            "todos"
        ) {

            consulta =
                consulta.eq(
                    "loja_id",
                    lojaSelecionada
                );
        }


        const dataInicio =
            obterDataInicioFiltro();


        if (dataInicio) {

            consulta =
                consulta.gte(
                    "created_at",
                    dataInicio
                );
        }


        consulta =
            consulta.range(
                inicio,
                fim
            );


        const {
            data,
            error,
            count
        } =
            await consulta;


        if (error) {
            throw error;
        }


        pedidosHistorico =
            Array.isArray(data)
                ? data
                : [];


        totalHistorico =
            Number(
                count ||
                0
            );


        const totalPaginas =
            obterTotalPaginasHistorico();


        if (
            paginaHistorico >
            totalPaginas &&
            totalHistorico > 0
        ) {

            paginaHistorico =
                totalPaginas;


            await carregarHistoricoCompras();
            return;
        }


        renderizarHistoricoCompras();
        atualizarPaginacaoHistorico();


    } catch (erro) {

        console.error(
            "Erro ao carregar histórico de compras:",
            erro
        );


        pedidosHistorico = [];
        totalHistorico = 0;


        mostrarEstadoHistorico(
            "Não foi possível carregar o histórico.",
            "Tente novamente em alguns instantes.",
            "fa-triangle-exclamation"
        );


        atualizarPaginacaoHistorico();


        notificarHistorico(
            tratarErroHistorico(erro),
            "erro",
            "Erro no histórico",
            5200
        );
    }
}


function obterDataInicioFiltro() {

    const valor =
        document.getElementById(
            "filtro-periodo"
        )?.value ||
        "todos";


    if (valor === "todos") {
        return null;
    }


    const dias =
        Number(valor);


    if (
        !Number.isFinite(dias) ||
        dias <= 0
    ) {
        return null;
    }


    const data =
        new Date();


    data.setDate(
        data.getDate() - dias
    );


    return data.toISOString();
}


function renderizarHistoricoCompras() {

    const lista =
        document.getElementById(
            "lista-historico"
        );


    const quantidade =
        document.getElementById(
            "quantidade-historico"
        );


    if (quantidade) {

        quantidade.textContent =
            String(
                totalHistorico
            );
    }


    if (!lista) {
        return;
    }


    if (
        pedidosHistorico.length === 0
    ) {

        lista.innerHTML = `
            <div class="estado-historico">
                <i class="fa-solid fa-bag-shopping"></i>

                <h2>Nenhuma compra encontrada.</h2>

                <p>
                    Não há pedidos correspondentes aos filtros selecionados.
                    Você pode limpar os filtros ou continuar explorando as lojas.
                </p>

                <a href="index.html" class="btn-voltar">
                    <i class="fa-solid fa-store"></i>
                    Explorar lojas
                </a>
            </div>
        `;


        return;
    }


    lista.innerHTML =
        pedidosHistorico
            .map(
                criarCardHistorico
            )
            .join("");
}


function criarCardHistorico(pedido) {

    const lojaNome =
        escaparHTMLHistorico(
            pedido.lojas?.nome ||
            "Loja"
        );


    const status =
        normalizarStatusHistorico(
            pedido.status
        );


    const itens =
        Array.isArray(
            pedido.itens_pedido
        )
            ? pedido.itens_pedido
            : [];


    const itensHTML =
        itens.length > 0
            ? itens
                .map(
                    criarItemHistorico
                )
                .join("")
            : `
                <div class="historico-item">
                    <div class="item-imagem-placeholder">
                        <i class="fa-solid fa-box-open"></i>
                    </div>

                    <div>
                        <h3>Itens não disponíveis</h3>
                        <p>Não foi possível recuperar os itens deste pedido.</p>
                    </div>
                </div>
            `;


    return `
        <article class="historico-card">
            <header class="historico-card-topo">
                <div class="historico-loja">
                    <i class="fa-solid fa-store"></i>
                    ${lojaNome}
                </div>

                <div class="historico-identificacao">
                    <span class="numero-pedido">
                        Pedido #${formatarNumeroHistorico(pedido.id)}
                    </span>

                    <span class="data-pedido">
                        ${formatarDataHistorico(pedido.created_at)}
                    </span>

                    <span class="status-historico ${status.classe}">
                        <i class="${status.icone}"></i>
                        ${status.texto}
                    </span>
                </div>
            </header>

            <div class="historico-itens">
                ${itensHTML}
            </div>

            <footer class="historico-card-rodape">
                <div class="historico-total">
                    <div>
                        <span>Produtos</span>
                        <strong>${formatarMoedaHistorico(
                            pedido.subtotal_produtos ??
                            pedido.valor_total
                        )}</strong>
                    </div>

                    <div>
                        <span>Entrega</span>
                        <strong>${Number(pedido.frete || 0) > 0
                            ? formatarMoedaHistorico(pedido.frete)
                            : "Grátis"}</strong>
                    </div>

                    <div class="historico-total-geral">
                        <span>Total do pedido</span>
                        <strong>${formatarMoedaHistorico(pedido.valor_total)}</strong>
                    </div>
                </div>

                <button
                    type="button"
                    class="btn-recomprar"
                    data-recomprar-pedido="${escaparHTMLHistorico(pedido.id)}"
                    ${itens.length === 0 ? "disabled" : ""}
                >
                    <i class="fa-solid fa-cart-arrow-down"></i>
                    Comprar novamente
                </button>
            </footer>
        </article>
    `;
}


function criarItemHistorico(item) {

    const produto =
        item.produtos ||
        null;


    const nome =
        escaparHTMLHistorico(
            produto?.nome ||
            "Produto indisponível"
        );


    const quantidade =
        normalizarQuantidadeHistorico(
            item.quantidade
        );


    const imagem =
        produto?.imagem_url
            ? `
                <img
                    src="${escaparHTMLHistorico(produto.imagem_url)}"
                    alt="${nome}"
                    class="item-imagem"
                    loading="lazy"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                >

                <div class="item-imagem-placeholder" style="display:none;">
                    <i class="fa-solid fa-box"></i>
                </div>
            `
            : `
                <div class="item-imagem-placeholder">
                    <i class="fa-solid fa-box"></i>
                </div>
            `;


    return `
        <div class="historico-item">
            <div>
                ${imagem}
            </div>

            <div>
                <h3>${nome}</h3>

                <p>
                    ${quantidade} ${quantidade === 1 ? "unidade" : "unidades"}
                    · ${formatarMoedaHistorico(item.preco_unitario)} cada
                </p>
            </div>

            <div class="item-subtotal">
                <span>Subtotal</span>
                <strong>${formatarMoedaHistorico(item.subtotal)}</strong>
            </div>
        </div>
    `;
}


async function comprarNovamente(
    pedido,
    botao
) {

    const itens =
        Array.isArray(
            pedido.itens_pedido
        )
            ? pedido.itens_pedido
            : [];


    const produtoIds =
        [
            ...new Set(
                itens
                    .map(
                        item =>
                            item.produto_id
                    )
                    .filter(Boolean)
            )
        ];


    if (produtoIds.length === 0) {

        notificarHistorico(
            "Este pedido não possui produtos disponíveis para uma nova compra.",
            "aviso",
            "Não é possível recomprar"
        );

        return;
    }


    const htmlOriginal =
        botao?.innerHTML ||
        "";


    if (botao) {

        botao.disabled = true;
        botao.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Verificando disponibilidade...
        `;
    }


    try {

        const {
            data: lojaAtual,
            error: lojaError
        } =
            await window.db
                .from("lojas")
                .select("id,nome,ativa")
                .eq(
                    "id",
                    pedido.loja_id
                )
                .maybeSingle();


        if (lojaError) {
            throw lojaError;
        }


        if (
            !lojaAtual ||
            lojaAtual.ativa !== true
        ) {

            notificarHistorico(
                "A loja deste pedido não está disponível para novas compras no momento.",
                "aviso",
                "Loja indisponível"
            );

            return;
        }


        const {
            data: produtosAtuais,
            error: produtosError
        } =
            await window.db
                .from("produtos")
                .select(`
                    id,
                    loja_id,
                    nome,
                    descricao,
                    preco,
                    preco_promocional,
                    imagem_url,
                    estoque,
                    ativo
                `)
                .in(
                    "id",
                    produtoIds
                )
                .eq(
                    "loja_id",
                    pedido.loja_id
                )
                .eq(
                    "ativo",
                    true
                );


        if (produtosError) {
            throw produtosError;
        }


        const mapaProdutos =
            new Map(
                (Array.isArray(produtosAtuais)
                    ? produtosAtuais
                    : []
                ).map(
                    produto => [
                        String(produto.id),
                        produto
                    ]
                )
            );


        let carrinho =
            lerCarrinhoHistorico();


        let unidadesAdicionadas = 0;
        let produtosAdicionados = 0;
        let produtosIndisponiveis = 0;
        let quantidadesAjustadas = 0;


        itens.forEach(
            item => {

                const produto =
                    mapaProdutos.get(
                        String(
                            item.produto_id ||
                            ""
                        )
                    );


                if (!produto) {

                    produtosIndisponiveis += 1;
                    return;
                }


                const estoque =
                    Math.max(
                        0,
                        Math.floor(
                            Number(
                                produto.estoque ||
                                0
                            )
                        )
                    );


                if (estoque <= 0) {

                    produtosIndisponiveis += 1;
                    return;
                }


                const quantidadePedido =
                    normalizarQuantidadeHistorico(
                        item.quantidade
                    );


                const existente =
                    carrinho.find(
                        produtoCarrinho =>
                            String(produtoCarrinho.id) ===
                                String(produto.id)
                            &&
                            String(produtoCarrinho.loja_id) ===
                                String(produto.loja_id)
                    );


                const quantidadeExistente =
                    existente
                        ? Math.max(
                            0,
                            Math.floor(
                                Number(
                                    existente.quantidade ||
                                    0
                                )
                            )
                        )
                        : 0;


                const disponivelParaAdicionar =
                    Math.max(
                        0,
                        estoque -
                        quantidadeExistente
                    );


                if (
                    disponivelParaAdicionar <= 0
                ) {

                    produtosIndisponiveis += 1;
                    return;
                }


                const quantidadeAdicionar =
                    Math.min(
                        quantidadePedido,
                        disponivelParaAdicionar
                    );


                if (
                    quantidadeAdicionar <
                    quantidadePedido
                ) {

                    quantidadesAjustadas += 1;
                }


                const dadosAtualizados = {
                    id: produto.id,
                    loja_id: produto.loja_id,
                    nome_loja:
                        lojaAtual.nome ||
                        pedido.lojas?.nome ||
                        "Loja",
                    nome:
                        produto.nome ||
                        "Produto",
                    descricao:
                        produto.descricao ||
                        "",
                    preco:
                        Number(
                            produto.preco ||
                            0
                        ),
                    preco_promocional:
                        produto.preco_promocional
                            ? Number(
                                produto.preco_promocional
                            )
                            : null,
                    imagem_url:
                        produto.imagem_url ||
                        null,
                    estoque,
                    quantidade:
                        quantidadeAdicionar
                };


                if (existente) {

                    Object.assign(
                        existente,
                        dadosAtualizados,
                        {
                            quantidade:
                                quantidadeExistente +
                                quantidadeAdicionar
                        }
                    );


                } else {

                    carrinho.push(
                        dadosAtualizados
                    );
                }


                unidadesAdicionadas +=
                    quantidadeAdicionar;


                produtosAdicionados += 1;
            }
        );


        if (
            unidadesAdicionadas <= 0
        ) {

            notificarHistorico(
                "Nenhum item deste pedido pode ser adicionado agora. Os produtos podem estar inativos, sem estoque ou já ter atingido o limite disponível no seu carrinho.",
                "aviso",
                "Nada foi adicionado",
                6000
            );

            return;
        }


        localStorage.setItem(
            "carrinho",
            JSON.stringify(
                carrinho
            )
        );


        window.CarrinhoSync
            ?.notificarAlteracao();


        if (
            typeof window
                .atualizarContadorCarrinho ===
            "function"
        ) {

            window
                .atualizarContadorCarrinho();
        }


        const resumo =
            criarResumoRecompra({
                produtosAdicionados,
                unidadesAdicionadas,
                produtosIndisponiveis,
                quantidadesAjustadas
            });


        notificarHistorico(
            resumo,
            "sucesso",
            "Carrinho atualizado!",
            5000
        );


        if (
            typeof window.confirmarAcao ===
            "function"
        ) {

            const irCarrinho =
                await window.confirmarAcao({
                    titulo: "Itens adicionados ao carrinho",
                    mensagem:
                        `${resumo} Deseja abrir o carrinho agora?`,
                    textoConfirmar:
                        "Ir para o carrinho",
                    textoCancelar:
                        "Continuar no histórico",
                    perigo: false
                });


            if (irCarrinho) {
                window.location.href = "carrinho.html";
            }
        }


    } catch (erro) {

        console.error(
            "Erro ao comprar novamente:",
            erro
        );


        notificarHistorico(
            tratarErroHistorico(erro),
            "erro",
            "Não foi possível recomprar",
            5500
        );


    } finally {

        if (botao) {

            botao.disabled = false;
            botao.innerHTML =
                htmlOriginal ||
                `
                    <i class="fa-solid fa-cart-arrow-down"></i>
                    Comprar novamente
                `;
        }
    }
}


function criarResumoRecompra({
    produtosAdicionados,
    unidadesAdicionadas,
    produtosIndisponiveis,
    quantidadesAjustadas
}) {

    const partes = [
        `${produtosAdicionados} produto(s) e ${unidadesAdicionadas} unidade(s) adicionados.`
    ];


    if (produtosIndisponiveis > 0) {

        partes.push(
            `${produtosIndisponiveis} produto(s) não puderam ser adicionados.`
        );
    }


    if (quantidadesAjustadas > 0) {

        partes.push(
            `A quantidade de ${quantidadesAjustadas} produto(s) foi ajustada ao estoque atual.`
        );
    }


    return partes.join(" ");
}


function lerCarrinhoHistorico() {

    try {

        const dados =
            JSON.parse(
                localStorage.getItem(
                    "carrinho"
                )
            );


        return Array.isArray(dados)
            ? dados
            : [];


    } catch (erro) {

        console.warn(
            "Carrinho local inválido. Um novo carrinho será iniciado.",
            erro
        );


        localStorage.removeItem(
            "carrinho"
        );


        return [];
    }
}


function obterTotalPaginasHistorico() {

    return Math.max(
        1,
        Math.ceil(
            totalHistorico /
            ITENS_POR_PAGINA_HISTORICO
        )
    );
}


function atualizarPaginacaoHistorico() {

    const anterior =
        document.getElementById(
            "btn-pagina-anterior"
        );


    const proxima =
        document.getElementById(
            "btn-proxima-pagina"
        );


    const texto =
        document.getElementById(
            "texto-paginacao"
        );


    const totalPaginas =
        obterTotalPaginasHistorico();


    if (anterior) {

        anterior.disabled =
            paginaHistorico <= 1 ||
            totalHistorico === 0;
    }


    if (proxima) {

        proxima.disabled =
            paginaHistorico >= totalPaginas ||
            totalHistorico === 0;
    }


    if (texto) {

        texto.textContent =
            `Página ${paginaHistorico} de ${totalPaginas}`;
    }
}


function mostrarEstadoHistorico(
    titulo,
    texto,
    icone
) {

    const lista =
        document.getElementById(
            "lista-historico"
        );


    if (!lista) {
        return;
    }


    lista.innerHTML = `
        <div class="estado-historico">
            <i class="fa-solid ${icone}"></i>
            <h2>${escaparHTMLHistorico(titulo)}</h2>
            <p>${escaparHTMLHistorico(texto)}</p>
        </div>
    `;
}


function normalizarStatusHistorico(statusOriginal) {

    const status =
        String(
            statusOriginal ||
            ""
        )
            .trim()
            .toLowerCase();


    const mapa = {
        aguardando_pagamento: {
            texto: "Aguardando pagamento",
            classe: "aguardando_pagamento",
            icone: "fa-regular fa-clock"
        },
        pago: {
            texto: "Pago",
            classe: "pago",
            icone: "fa-solid fa-circle-dollar-to-slot"
        },
        em_preparacao: {
            texto: "Em preparação",
            classe: "em_preparacao",
            icone: "fa-solid fa-box-open"
        },
        enviado: {
            texto: "Enviado",
            classe: "enviado",
            icone: "fa-solid fa-truck-fast"
        },
        entregue: {
            texto: "Entregue",
            classe: "entregue",
            icone: "fa-solid fa-circle-check"
        },
        cancelado: {
            texto: "Cancelado",
            classe: "cancelado",
            icone: "fa-solid fa-circle-xmark"
        }
    };


    return mapa[status] || {
        texto:
            statusOriginal ||
            "Status desconhecido",
        classe: "",
        icone: "fa-solid fa-circle-info"
    };
}


function normalizarQuantidadeHistorico(valor) {

    const numero =
        Number(valor);


    if (
        !Number.isFinite(numero) ||
        numero < 1
    ) {
        return 1;
    }


    return Math.floor(numero);
}


function formatarNumeroHistorico(id) {

    const texto =
        String(
            id ||
            ""
        )
            .replaceAll("-", "")
            .toUpperCase();


    return escaparHTMLHistorico(
        texto.slice(-8) ||
        "--------"
    );
}


function formatarDataHistorico(data) {

    if (!data) {
        return "Data não informada";
    }


    const objeto =
        new Date(data);


    if (
        Number.isNaN(
            objeto.getTime()
        )
    ) {
        return "Data inválida";
    }


    return objeto.toLocaleDateString(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}


function formatarMoedaHistorico(valor) {

    return Number(
        valor ||
        0
    ).toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );
}


function escaparHTMLHistorico(valor) {

    return String(
        valor ??
        ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function tratarErroHistorico(erro) {

    const texto =
        String(
            erro?.message ||
            ""
        )
            .toLowerCase();


    if (
        texto.includes("jwt") ||
        texto.includes("session") ||
        texto.includes("authenticated")
    ) {

        return "Sua sessão expirou. Entre novamente e tente de novo.";
    }


    if (
        texto.includes("failed to fetch") ||
        texto.includes("network")
    ) {

        return "Não foi possível conectar ao servidor. Verifique sua internet.";
    }


    return erro?.message ||
        "Não foi possível concluir esta operação.";
}


function notificarHistorico(
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
