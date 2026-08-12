// ==========================================
// CARRINHO.JS
// Comércio da Cidade
// ==========================================

let carrinho = [];


// ==========================================
// INICIAR
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "Carrinho iniciado."
        );


        carregarCarrinho();

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


        carrinho =
            [];


        localStorage.removeItem(
            "carrinho"
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


        // Atualiza contador do header
        if (
            typeof window
                .atualizarContadorCarrinho ===
            "function"
        ) {

            window
                .atualizarContadorCarrinho();

        }


    } catch (erro) {

        console.error(
            "Erro ao salvar carrinho:",
            erro
        );

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


    const btnFinalizar =
        document.getElementById(
            "btn-finalizar"
        );


    if (
        !lista ||
        !quantidade ||
        !subtotal ||
        !total
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
            false;

    }


    // ======================================
    // AGRUPAR POR LOJA
    // ======================================

    const grupos =
        agruparPorLoja();


    let totalItens =
        0;


    let valorTotal =
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


                    valorTotal +=
                        subtotalProduto;


                    itensLoja +=
                        criarItemCarrinho(
                            produto,
                            index
                        );

                }
            );


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
            valorTotal
        );


    total.textContent =
        formatarMoeda(
            valorTotal
        );


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
        produto.estoque !==
            undefined &&
        produto.estoque !==
            null &&
        produto.estoque !==
            "";


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
        produto.estoque !==
            undefined &&
        produto.estoque !==
            null &&
        produto.estoque !==
            "";


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

            alert(
                "Este produto está sem estoque."
            );


            return;

        }


        if (
            quantidadeAtual >=
            estoque
        ) {

            alert(
                `Quantidade máxima disponível: ${estoque}.`
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

function diminuirQuantidade(
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


    const confirmar =
        confirm(
            `Remover "${produto.nome}" do carrinho?`
        );


    if (!confirmar) {

        return;

    }


    carrinho.splice(
        index,
        1
    );


    salvarCarrinho();

    atualizarCarrinho();

}


// ==========================================
// REMOVER PRODUTO
// ==========================================

function removerProduto(
    index
) {

    const produto =
        carrinho[index];


    if (!produto) {

        return;

    }


    const confirmar =
        confirm(
            `Remover "${produto.nome}" do carrinho?`
        );


    if (!confirmar) {

        return;

    }


    carrinho.splice(
        index,
        1
    );


    salvarCarrinho();

    atualizarCarrinho();

}


// ==========================================
// LIMPAR CARRINHO
// ==========================================

function limparCarrinho() {

    if (
        carrinho.length === 0
    ) {

        return;

    }


    const confirmar =
        confirm(
            "Deseja remover todos os produtos do carrinho?"
        );


    if (!confirmar) {

        return;

    }


    carrinho =
        [];


    salvarCarrinho();

    atualizarCarrinho();

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

        alert(
            "Seu carrinho está vazio."
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


        alert(
            "Alguns produtos do carrinho estão inválidos. Remova-os e adicione novamente."
        );


        return;

    }


    // ======================================
    // SALVAR PARA CHECKOUT
    // ======================================

    localStorage.setItem(
        "checkout",
        JSON.stringify(
            carrinho
        )
    );


    window.location.href =
        "checkout.html";

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