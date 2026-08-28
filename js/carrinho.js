// ==========================================
// CARRINHO.JS
// Comércio da Cidade
// ==========================================

let carrinho = [];

let fretesPorLoja = new Map();

let fretesCarregados = false;

let erroFreteNotificado = false;


// ==========================================
// INICIAR
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "Carrinho iniciado."
        );

        await window.CarrinhoSync?.iniciar();

        carregarCarrinho();

        await carregarFretesCarrinho();

        atualizarCarrinho();


        const btnFinalizar =
            document.getElementById(
                "btn-finalizar"
            );


        if (btnFinalizar) {

            btnFinalizar.addEventListener(
                "click",
                finalizarCompra
            );

        }

    }
);


// ==========================================
// CARREGAR CARRINHO
// ==========================================

function carregarCarrinho() {

    try {

        const dados =
            JSON.parse(
                localStorage.getItem(
                    "carrinho"
                )
            );


        carrinho =
            Array.isArray(dados)
                ? dados
                : [];


    } catch (erro) {

        console.error(
            "Erro ao carregar carrinho:",
            erro
        );


        carrinho = [];


        localStorage.removeItem(
            "carrinho"
        );


        notificar(
            "Não foi possível carregar os produtos salvos no carrinho.",
            "erro",
            "Erro no carrinho"
        );

    }

}


// ==========================================
// SALVAR CARRINHO
// ==========================================

function salvarCarrinho() {

    try {

        localStorage.setItem(
            "carrinho",
            JSON.stringify(
                carrinho
            )
        );


        // Atualizar contador do header
        if (
            typeof window
                .atualizarContadorCarrinho ===
            "function"
        ) {

            window
                .atualizarContadorCarrinho();

        }


        window.CarrinhoSync
            ?.notificarAlteracao();


    } catch (erro) {

        console.error(
            "Erro ao salvar carrinho:",
            erro
        );


        notificar(
            "Não foi possível salvar as alterações do carrinho.",
            "erro",
            "Erro ao salvar"
        );

    }

}


document.addEventListener(
    "carrinho:sincronizado",
    async () => {

        if (!document.getElementById("lista-carrinho")) {

            return;

        }

        carregarCarrinho();
        await carregarFretesCarrinho();
        atualizarCarrinho();

    }
);


// ==========================================
// CARREGAR FRETES DAS LOJAS
// ==========================================

async function carregarFretesCarrinho(
    opcoes = {}
) {

    const lojaIds = [
        ...new Set(
            carrinho
                .map(produto => String(produto.loja_id || ""))
                .filter(Boolean)
        )
    ];


    if (!window.FreteLoja) {

        fretesCarregados = false;
        return false;

    }


    try {

        fretesPorLoja =
            await window.FreteLoja.carregar(
                lojaIds,
                opcoes
            );


        fretesCarregados =
            fretesPorLoja.size === lojaIds.length;


        erroFreteNotificado = false;
        return fretesCarregados;


    } catch (erro) {

        console.error(
            "Erro ao carregar frete das lojas:",
            erro
        );


        fretesCarregados = false;


        if (!erroFreteNotificado) {

            erroFreteNotificado = true;


            notificar(
                "Não foi possível calcular a entrega. Atualize a página e tente novamente.",
                "erro",
                "Frete indisponível",
                5500
            );

        }


        return false;

    }

}


// ==========================================
// ATUALIZAR TELA
// ==========================================

function atualizarCarrinho() {

    const lista =
        document.getElementById(
            "lista-carrinho"
        );


    const quantidade =
        document.getElementById(
            "quantidade-itens"
        );


    const subtotal =
        document.getElementById(
            "subtotal"
        );


    const total =
        document.getElementById(
            "total-geral"
        );


    const freteTotal =
        document.getElementById(
            "frete-total"
        );


    const btnFinalizar =
        document.getElementById(
            "btn-finalizar"
        );


    if (
        !lista ||
        !quantidade ||
        !subtotal ||
        !total ||
        !freteTotal
    ) {

        console.error(
            "Elementos do carrinho não encontrados."
        );

        return;

    }


    // ======================================
    // CARRINHO VAZIO
    // ======================================

    if (
        carrinho.length === 0
    ) {

        lista.innerHTML = `

            <div class="carrinho-vazio">

                <i class="fa-solid fa-cart-shopping"></i>

                <h3>
                    Seu carrinho está vazio.
                </h3>

                <p>
                    Adicione alguns produtos para continuar.
                </p>

                <a
                    href="index.html"
                    class="btn"
                >

                    <i class="fa-solid fa-store"></i>

                    Continuar Comprando

                </a>

            </div>

        `;


        quantidade.textContent =
            "0";


        subtotal.textContent =
            "R$ 0,00";


        total.textContent =
            "R$ 0,00";


        freteTotal.textContent =
            "R$ 0,00";


        if (btnFinalizar) {

            btnFinalizar.disabled =
                true;

        }


        atualizarAvisoMultiloja(
            0
        );


        if (
            typeof window
                .atualizarContadorCarrinho ===
            "function"
        ) {

            window
                .atualizarContadorCarrinho();

        }


        return;

    }


    // ======================================
    // HABILITAR FINALIZAR
    // ======================================

    if (btnFinalizar) {

        btnFinalizar.disabled =
            !fretesCarregados;

    }


    // ======================================
    // AGRUPAR POR LOJA
    // ======================================

    const grupos =
        agruparPorLoja();


    let totalItens =
        0;


    let valorSubtotal =
        0;


    let valorFrete =
        0;


    let html =
        "";


    // ======================================
    // PERCORRER LOJAS
    // ======================================

    grupos.forEach(
        (grupo) => {

            let itensLoja =
                "";


            let subtotalLoja =
                0;


            grupo.itens.forEach(
                ({ produto, index }) => {

                    const quantidadeProduto =
                        normalizarQuantidade(
                            produto.quantidade
                        );


                    const preco =
                        obterPrecoFinal(
                            produto
                        );


                    const subtotalProduto =
                        preco *
                        quantidadeProduto;


                    totalItens +=
                        quantidadeProduto;


                    subtotalLoja +=
                        subtotalProduto;


                    valorSubtotal +=
                        subtotalProduto;


                    itensLoja +=
                        criarItemCarrinho(
                            produto,
                            index
                        );

                }
            );


            const freteLoja =
                fretesCarregados
                    ? window.FreteLoja.obterTaxa(
                        fretesPorLoja,
                        grupo.id
                    )
                    : 0;


            valorFrete +=
                freteLoja;


            const textoFrete =
                fretesCarregados
                    ? freteLoja > 0
                        ? formatarMoeda(freteLoja)
                        : "Grátis"
                    : "Indisponível";


            html += `

                <div class="grupo-loja">

                    <div class="cabecalho-loja">

                        <i class="fa-solid fa-store"></i>

                        <strong>
                            ${escaparHTML(
                                grupo.nome
                            )}
                        </strong>

                    </div>

                    ${itensLoja}

                    <div class="resumo-grupo-loja">

                        <div>
                            <span>Produtos</span>
                            <strong>${formatarMoeda(subtotalLoja)}</strong>
                        </div>

                        <div>
                            <span>Entrega</span>
                            <strong>${textoFrete}</strong>
                        </div>

                    </div>

                </div>

            `;

        }
    );


    lista.innerHTML =
        html;


    // ======================================
    // RESUMO
    // ======================================

    quantidade.textContent =
        totalItens;


    subtotal.textContent =
        formatarMoeda(
            valorSubtotal
        );


    freteTotal.textContent =
        fretesCarregados
            ? valorFrete > 0
                ? formatarMoeda(valorFrete)
                : "Grátis"
            : "Indisponível";


    total.textContent =
        fretesCarregados
            ? formatarMoeda(
                valorSubtotal + valorFrete
            )
            : "—";


    atualizarAvisoMultiloja(
        grupos.length
    );


    // ======================================
    // HEADER
    // ======================================

    if (
        typeof window
            .atualizarContadorCarrinho ===
        "function"
    ) {

        window
            .atualizarContadorCarrinho();

    }

}


// ==========================================
// AGRUPAR POR LOJA
// ==========================================

function agruparPorLoja() {

    const grupos =
        new Map();


    carrinho.forEach(
        (produto, index) => {

            const lojaId =
                String(
                    produto.loja_id ||
                    "sem-loja"
                );


            const nomeLoja =
                produto.nome_loja ||
                produto.loja ||
                "Loja";


            if (
                !grupos.has(
                    lojaId
                )
            ) {

                grupos.set(
                    lojaId,
                    {
                        id:
                            lojaId,

                        nome:
                            nomeLoja,

                        itens:
                            []
                    }
                );

            }


            grupos
                .get(lojaId)
                .itens
                .push({
                    produto,
                    index
                });

        }
    );


    return Array.from(
        grupos.values()
    );

}


// ==========================================
// CRIAR ITEM
// ==========================================

function criarItemCarrinho(
    produto,
    index
) {

    const nome =
        escaparHTML(
            produto.nome ||
            "Produto"
        );


    const descricao =
        escaparHTML(
            produto.descricao ||
            ""
        );


    const nomeLoja =
        escaparHTML(
            produto.nome_loja ||
            produto.loja ||
            "Loja"
        );


    const quantidade =
        normalizarQuantidade(
            produto.quantidade
        );


    const precoNormal =
        Number(
            produto.preco || 0
        );


    const precoPromocional =
        Number(
            produto.preco_promocional || 0
        );


    const precoFinal =
        obterPrecoFinal(
            produto
        );


    const subtotal =
        precoFinal *
        quantidade;


    // ======================================
    // ESTOQUE
    // ======================================

    const possuiEstoque =
        produto.estoque !== undefined &&
        produto.estoque !== null &&
        produto.estoque !== "";


    const estoque =
        Number(
            produto.estoque
        );


    const atingiuLimite =
        possuiEstoque &&
        Number.isFinite(
            estoque
        ) &&
        quantidade >= estoque;


    // ======================================
    // IMAGEM
    // ======================================

    let imagemHTML =
        "";


    if (
        produto.imagem_url
    ) {

        imagemHTML = `

            <div class="area-foto-produto">

                <img
                    src="${escaparHTML(
                        produto.imagem_url
                    )}"
                    alt="${nome}"
                    class="foto-produto"
                    loading="lazy"
                    onerror="mostrarPlaceholderCarrinho(this)"
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
                    class="foto-produto-placeholder"
                >

                    <i class="fa-solid fa-box"></i>

                </div>

            </div>

        `;

    }


    // ======================================
    // PREÇOS
    // ======================================

    let precoHTML =
        "";


    if (
        precoPromocional > 0 &&
        precoPromocional <
        precoNormal
    ) {

        precoHTML = `

            <div class="precos-produto">

                <span class="preco-produto">

                    ${formatarMoeda(
                        precoPromocional
                    )}

                </span>

                <span class="preco-antigo">

                    ${formatarMoeda(
                        precoNormal
                    )}

                </span>

            </div>

        `;


    } else {

        precoHTML = `

            <div class="precos-produto">

                <span class="preco-produto">

                    ${formatarMoeda(
                        precoFinal
                    )}

                </span>

            </div>

        `;

    }


    // ======================================
    // ESTOQUE HTML
    // ======================================

    let estoqueHTML =
        "";


    if (
        possuiEstoque &&
        Number.isFinite(
            estoque
        )
    ) {

        estoqueHTML = `

            <div class="estoque-item">

                Estoque disponível:
                ${estoque}

            </div>

        `;

    }


    // ======================================
    // ITEM
    // ======================================

    return `

        <div class="item-carrinho">

            ${imagemHTML}


            <div class="dados-produto">

                <h3>
                    ${nome}
                </h3>


                <div class="nome-loja-item">

                    <i class="fa-solid fa-store"></i>

                    ${nomeLoja}

                </div>


                ${
                    descricao
                        ? `

                            <div class="descricao-produto">

                                ${descricao}

                            </div>

                        `
                        : ""
                }


                ${precoHTML}

                ${estoqueHTML}


                <div class="controles-item">

                    <div class="quantidade">

                        <button
                            type="button"
                            onclick="diminuirQuantidade(${index})"
                            aria-label="Diminuir quantidade"
                        >

                            <i class="fa-solid fa-minus"></i>

                        </button>


                        <span>
                            ${quantidade}
                        </span>


                        <button
                            type="button"
                            onclick="aumentarQuantidade(${index})"
                            aria-label="Aumentar quantidade"
                            ${
                                atingiuLimite
                                    ? "disabled"
                                    : ""
                            }
                        >

                            <i class="fa-solid fa-plus"></i>

                        </button>

                    </div>


                    <button
                        type="button"
                        class="btn-remover"
                        onclick="removerProduto(${index})"
                    >

                        <i class="fa-solid fa-trash"></i>

                        Remover

                    </button>

                </div>

            </div>


            <div class="subtotal-item">

                <span>
                    Subtotal
                </span>

                <strong>

                    ${formatarMoeda(
                        subtotal
                    )}

                </strong>

            </div>

        </div>

    `;

}


// ==========================================
// PREÇO FINAL
// ==========================================

function obterPrecoFinal(
    produto
) {

    const preco =
        Number(
            produto.preco || 0
        );


    const promocional =
        Number(
            produto.preco_promocional || 0
        );


    if (
        promocional > 0 &&
        promocional < preco
    ) {

        return promocional;

    }


    return preco;

}


// ==========================================
// NORMALIZAR QUANTIDADE
// ==========================================

function normalizarQuantidade(
    quantidade
) {

    const valor =
        Number(
            quantidade
        );


    if (
        !Number.isFinite(valor) ||
        valor < 1
    ) {

        return 1;

    }


    return Math.floor(
        valor
    );

}


// ==========================================
// AUMENTAR QUANTIDADE
// ==========================================

function aumentarQuantidade(
    index
) {

    const produto =
        carrinho[index];


    if (!produto) {

        return;

    }


    const quantidadeAtual =
        normalizarQuantidade(
            produto.quantidade
        );


    // ======================================
    // VERIFICAR ESTOQUE
    // ======================================

    const possuiEstoque =
        produto.estoque !== undefined &&
        produto.estoque !== null &&
        produto.estoque !== "";


    const estoque =
        Number(
            produto.estoque
        );


    if (
        possuiEstoque &&
        Number.isFinite(
            estoque
        )
    ) {

        if (
            estoque <= 0
        ) {

            notificar(
                `"${produto.nome || "Este produto"}" está sem estoque no momento.`,
                "aviso",
                "Produto indisponível"
            );


            return;

        }


        if (
            quantidadeAtual >=
            estoque
        ) {

            notificar(
                `Você já adicionou a quantidade máxima disponível. Estoque: ${estoque}.`,
                "aviso",
                "Limite de estoque"
            );


            return;

        }

    }


    produto.quantidade =
        quantidadeAtual + 1;


    salvarCarrinho();

    atualizarCarrinho();

}


// ==========================================
// DIMINUIR QUANTIDADE
// ==========================================

async function diminuirQuantidade(
    index
) {

    const produto =
        carrinho[index];


    if (!produto) {

        return;

    }


    const quantidadeAtual =
        normalizarQuantidade(
            produto.quantidade
        );


    if (
        quantidadeAtual > 1
    ) {

        produto.quantidade =
            quantidadeAtual - 1;


        salvarCarrinho();

        atualizarCarrinho();


        return;

    }


    // Quando está em 1 unidade,
    // diminuir significa remover.

    const confirmou =
        await confirmarRemocaoProduto(
            produto
        );


    if (!confirmou) {

        return;

    }


    carrinho.splice(
        index,
        1
    );


    salvarCarrinho();

    atualizarCarrinho();


    notificar(
        `"${produto.nome || "Produto"}" foi removido do carrinho.`,
        "sucesso",
        "Produto removido",
        2500
    );

}


// ==========================================
// REMOVER PRODUTO
// ==========================================

async function removerProduto(
    index
) {

    const produto =
        carrinho[index];


    if (!produto) {

        return;

    }


    const confirmou =
        await confirmarRemocaoProduto(
            produto
        );


    if (!confirmou) {

        return;

    }


    carrinho.splice(
        index,
        1
    );


    salvarCarrinho();

    atualizarCarrinho();


    notificar(
        `"${produto.nome || "Produto"}" foi removido do carrinho.`,
        "sucesso",
        "Produto removido",
        2500
    );

}


// ==========================================
// CONFIRMAR REMOÇÃO
// ==========================================

async function confirmarRemocaoProduto(
    produto
) {

    const nome =
        produto?.nome ||
        "este produto";


    if (
        typeof window.confirmarAcao ===
        "function"
    ) {

        return await window.confirmarAcao({

            titulo:
                "Remover produto?",

            mensagem:
                `Deseja remover "${nome}" do seu carrinho?`,

            textoConfirmar:
                "Sim, remover",

            textoCancelar:
                "Cancelar",

            perigo:
                true

        });

    }


    // Fallback caso feedback.js
    // não tenha sido carregado.

    console.warn(
        "feedback.js não foi carregado."
    );


    return window.confirm(
        `Remover "${nome}" do carrinho?`
    );

}


// ==========================================
// LIMPAR CARRINHO
// ==========================================

async function limparCarrinho() {

    if (
        carrinho.length === 0
    ) {

        notificar(
            "Seu carrinho já está vazio.",
            "info",
            "Carrinho vazio"
        );


        return;

    }


    let confirmou =
        false;


    if (
        typeof window.confirmarAcao ===
        "function"
    ) {

        confirmou =
            await window.confirmarAcao({

                titulo:
                    "Esvaziar carrinho?",

                mensagem:
                    "Todos os produtos serão removidos do seu carrinho. Deseja continuar?",

                textoConfirmar:
                    "Sim, esvaziar",

                textoCancelar:
                    "Cancelar",

                perigo:
                    true

            });


    } else {

        confirmou =
            window.confirm(
                "Deseja remover todos os produtos do carrinho?"
            );

    }


    if (!confirmou) {

        return;

    }


    carrinho = [];


    salvarCarrinho();

    atualizarCarrinho();


    notificar(
        "Todos os produtos foram removidos.",
        "sucesso",
        "Carrinho esvaziado",
        2500
    );

}


// ==========================================
// PLACEHOLDER DA IMAGEM
// ==========================================

function mostrarPlaceholderCarrinho(
    imagem
) {

    if (!imagem) {

        return;

    }


    const area =
        imagem.closest(
            ".area-foto-produto"
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
            ".foto-produto-placeholder"
        );


    if (placeholder) {

        placeholder.style.display =
            "flex";

    }

}


// ==========================================
// AVISO DE MÚLTIPLAS LOJAS
// ==========================================

function atualizarAvisoMultiloja(
    quantidadeLojas
) {

    const resumo =
        document.querySelector(
            ".resumo"
        );


    const btnFinalizar =
        document.getElementById(
            "btn-finalizar"
        );


    if (
        !resumo ||
        !btnFinalizar
    ) {

        return;

    }


    let aviso =
        document.getElementById(
            "aviso-multiloja"
        );


    // ======================================
    // MAIS DE UMA LOJA
    // ======================================

    if (
        quantidadeLojas > 1
    ) {

        if (!aviso) {

            aviso =
                document.createElement(
                    "div"
                );


            aviso.id =
                "aviso-multiloja";


            aviso.className =
                "aviso-lojas";


            btnFinalizar
                .insertAdjacentElement(
                    "beforebegin",
                    aviso
                );

        }


        aviso.innerHTML = `

            <i class="fa-solid fa-circle-info"></i>

            Seu carrinho possui produtos de

            <strong>
                ${quantidadeLojas} lojas
            </strong>.

            Os pedidos serão organizados
            por loja na finalização.

        `;


        return;

    }


    // ======================================
    // UMA OU NENHUMA LOJA
    // ======================================

    if (aviso) {

        aviso.remove();

    }

}


// ==========================================
// FINALIZAR COMPRA
// ==========================================

function finalizarCompra() {

    if (
        carrinho.length === 0
    ) {

        notificar(
            "Adicione pelo menos um produto antes de continuar.",
            "aviso",
            "Carrinho vazio"
        );


        return;

    }


    if (!fretesCarregados) {

        notificar(
            "Aguarde o cálculo da entrega antes de continuar.",
            "aviso",
            "Frete não calculado"
        );


        return;

    }


    // ======================================
    // VALIDAR ITENS
    // ======================================

    const itensInvalidos =
        carrinho.filter(
            (produto) => {

                const preco =
                    obterPrecoFinal(
                        produto
                    );


                const quantidade =
                    normalizarQuantidade(
                        produto.quantidade
                    );


                return (
                    !produto.id ||
                    !produto.loja_id ||
                    preco <= 0 ||
                    quantidade <= 0
                );

            }
        );


    if (
        itensInvalidos.length > 0
    ) {

        console.error(
            "Itens inválidos no carrinho:",
            itensInvalidos
        );


        notificar(
            "Alguns produtos possuem informações inválidas. Remova esses itens e adicione-os novamente.",
            "erro",
            "Problema no carrinho",
            5500
        );


        return;

    }


    // ======================================
    // VALIDAR ESTOQUE LOCAL
    // ======================================

    const produtoSemEstoque =
        carrinho.find(
            (produto) => {

                if (
                    produto.estoque === undefined ||
                    produto.estoque === null ||
                    produto.estoque === ""
                ) {

                    return false;

                }


                const estoque =
                    Number(
                        produto.estoque
                    );


                const quantidade =
                    normalizarQuantidade(
                        produto.quantidade
                    );


                return (
                    Number.isFinite(estoque) &&
                    (
                        estoque <= 0 ||
                        quantidade > estoque
                    )
                );

            }
        );


    if (
        produtoSemEstoque
    ) {

        notificar(
            `"${produtoSemEstoque.nome || "Um produto"}" não possui estoque suficiente para a quantidade escolhida.`,
            "aviso",
            "Estoque insuficiente",
            5000
        );


        return;

    }


    // ======================================
    // SALVAR PARA CHECKOUT
    // ======================================

    try {

        localStorage.setItem(
            "checkout",
            JSON.stringify(
                carrinho
            )
        );


        window.location.href =
            "checkout.html";


    } catch (erro) {

        console.error(
            "Erro ao preparar checkout:",
            erro
        );


        notificar(
            "Não foi possível iniciar a finalização da compra.",
            "erro",
            "Erro no checkout"
        );

    }

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
// NOTIFICAÇÃO
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
// Usadas pelos onclick criados no HTML
// ==========================================

window.aumentarQuantidade =
    aumentarQuantidade;


window.diminuirQuantidade =
    diminuirQuantidade;


window.removerProduto =
    removerProduto;


window.limparCarrinho =
    limparCarrinho;


window.mostrarPlaceholderCarrinho =
    mostrarPlaceholderCarrinho;
