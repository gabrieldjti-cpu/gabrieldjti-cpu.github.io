// ==========================================
// CHECKOUT.JS
// Comércio da Cidade
// ==========================================

let usuario = null;

let carrinho = [];

let pedidosPorLoja = {};

let totalPedido = 0;


// ==========================================
// INICIAR
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "Checkout iniciado."
        );


        // ==================================
        // SUPABASE
        // ==================================

        if (!window.db) {

            console.error(
                "Checkout: Supabase não inicializado."
            );


            alert(
                "Erro ao conectar ao banco."
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
        // CARRINHO
        // ==================================

        carregarCarrinho();


        if (
            carrinho.length === 0
        ) {

            alert(
                "Seu carrinho está vazio."
            );


            window.location.href =
                "carrinho.html";


            return;

        }


        // ==================================
        // PREPARAR CHECKOUT
        // ==================================

        agruparProdutosPorLoja();


        mostrarResumo();


        preencherDadosUsuario();


        configurarPagamento();


        // ==================================
        // BOTÃO FINALIZAR
        // ==================================

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
// VERIFICAR USUÁRIO
// ==========================================

async function verificarUsuario() {

    try {

        // Primeiro verifica a sessão

        const {
            data: sessaoData,
            error: sessaoError
        } = await window.db.auth.getSession();


        if (sessaoError) {

            console.error(
                "Erro ao verificar sessão:",
                sessaoError
            );


            window.location.href =
                "login.html";


            return false;

        }


        if (
            !sessaoData.session
        ) {

            window.location.href =
                "login.html";


            return false;

        }


        // ==================================
        // BUSCAR USUÁRIO
        // ==================================

        const {
            data,
            error
        } = await window.db.auth.getUser();


        if (
            error ||
            !data.user
        ) {

            console.error(
                "Erro ao verificar usuário:",
                error
            );


            window.location.href =
                "login.html";


            return false;

        }


        usuario =
            data.user;


        return true;


    } catch (erro) {

        console.error(
            "Erro inesperado ao verificar usuário:",
            erro
        );


        window.location.href =
            "login.html";


        return false;

    }

}


// ==========================================
// CARREGAR CARRINHO
// ==========================================

function carregarCarrinho() {

    try {

        // Carrinho é a fonte principal.
        // checkout fica como fallback.

        const dados =
            localStorage.getItem(
                "carrinho"
            )
            ||
            localStorage.getItem(
                "checkout"
            );


        const parsed =
            dados
                ? JSON.parse(dados)
                : [];


        carrinho =
            Array.isArray(parsed)
                ? parsed
                : [];


    } catch (erro) {

        console.error(
            "Erro ao carregar carrinho:",
            erro
        );


        carrinho =
            [];

    }

}


// ==========================================
// AGRUPAR PRODUTOS POR LOJA
// ==========================================

function agruparProdutosPorLoja() {

    pedidosPorLoja =
        {};


    carrinho.forEach(
        (produto) => {

            const lojaId =
                String(
                    produto.loja_id ||
                    ""
                );


            if (!lojaId) {

                return;

            }


            if (
                !pedidosPorLoja[
                    lojaId
                ]
            ) {

                pedidosPorLoja[
                    lojaId
                ] = {

                    loja_id:
                        lojaId,

                    nome_loja:
                        produto.nome_loja ||
                        produto.loja ||
                        "Loja",

                    produtos:
                        []

                };

            }


            pedidosPorLoja[
                lojaId
            ]
                .produtos
                .push(
                    produto
                );

        }
    );

}


// ==========================================
// MOSTRAR RESUMO
// ==========================================

function mostrarResumo() {

    const lista =
        document.getElementById(
            "lista-checkout"
        );


    const subtotalElemento =
        document.getElementById(
            "subtotal"
        );


    const totalElemento =
        document.getElementById(
            "total"
        );


    if (
        !lista ||
        !subtotalElemento ||
        !totalElemento
    ) {

        console.error(
            "Elementos do resumo não encontrados."
        );


        return;

    }


    lista.innerHTML =
        "";


    totalPedido =
        0;


    Object.values(
        pedidosPorLoja
    )
        .forEach(
            (loja) => {

                let htmlProdutos =
                    "";


                let subtotalLoja =
                    0;


                loja.produtos.forEach(
                    (produto) => {

                        const quantidade =
                            normalizarQuantidade(
                                produto.quantidade
                            );


                        const preco =
                            obterPrecoFinal(
                                produto
                            );


                        const subtotal =
                            preco *
                            quantidade;


                        subtotalLoja +=
                            subtotal;


                        totalPedido +=
                            subtotal;


                        htmlProdutos +=
                            criarProdutoResumo(
                                produto,
                                quantidade,
                                preco,
                                subtotal
                            );

                    }
                );


                lista.insertAdjacentHTML(
                    "beforeend",
                    `

                        <div class="checkout-loja">


                            <div class="checkout-loja-topo">

                                <i class="fa-solid fa-store"></i>

                                ${escaparHTML(
                                    loja.nome_loja
                                )}

                            </div>


                            ${htmlProdutos}


                            <div class="checkout-subtotal-loja">

                                <span>
                                    Subtotal da loja
                                </span>

                                <strong>

                                    ${formatarMoeda(
                                        subtotalLoja
                                    )}

                                </strong>

                            </div>


                        </div>

                    `
                );

            }
        );


    subtotalElemento.textContent =
        formatarMoeda(
            totalPedido
        );


    totalElemento.textContent =
        formatarMoeda(
            totalPedido
        );

}


// ==========================================
// CRIAR PRODUTO DO RESUMO
// ==========================================

function criarProdutoResumo(
    produto,
    quantidade,
    preco,
    subtotal
) {

    const nome =
        escaparHTML(
            produto.nome ||
            "Produto"
        );


    let imagemHTML =
        "";


    if (
        produto.imagem_url
    ) {

        imagemHTML = `

            <div class="area-imagem-checkout">

                <img
                    src="${escaparHTML(
                        produto.imagem_url
                    )}"
                    alt="${nome}"
                    class="imagem-checkout"
                    onerror="mostrarPlaceholderCheckout(this)"
                >

                <div
                    class="imagem-checkout-placeholder"
                    style="display:none;"
                >

                    <i class="fa-solid fa-box"></i>

                </div>

            </div>

        `;


    } else {

        imagemHTML = `

            <div class="area-imagem-checkout">

                <div class="imagem-checkout-placeholder">

                    <i class="fa-solid fa-box"></i>

                </div>

            </div>

        `;

    }


    return `

        <div class="item-checkout">


            ${imagemHTML}


            <div class="dados-checkout">

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


            <div class="valor-checkout">

                ${formatarMoeda(
                    subtotal
                )}

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
// QUANTIDADE
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
// PREENCHER NOME
// ==========================================

function preencherDadosUsuario() {

    if (!usuario) {

        return;

    }


    const nome =
        document.getElementById(
            "nome"
        );


    if (
        nome &&
        !nome.value
    ) {

        nome.value =
            usuario
                .user_metadata
                ?.display_name
            ||
            usuario.email
                ?.split("@")[0]
            ||
            "";

    }

}


// ==========================================
// CONFIGURAR PAGAMENTO
// ==========================================

function configurarPagamento() {

    const opcoes =
        document.querySelectorAll(
            "input[name='pagamento']"
        );


    const trocoArea =
        document.getElementById(
            "troco-area"
        );


    const troco =
        document.getElementById(
            "troco"
        );


    function atualizarTroco() {

        const selecionado =
            document.querySelector(
                "input[name='pagamento']:checked"
            );


        if (!selecionado) {

            return;

        }


        if (
            selecionado.value ===
            "dinheiro"
        ) {

            if (trocoArea) {

                trocoArea.style.display =
                    "block";

            }


        } else {

            if (trocoArea) {

                trocoArea.style.display =
                    "none";

            }


            if (troco) {

                troco.value =
                    "";

            }

        }

    }


    opcoes.forEach(
        (opcao) => {

            opcao.addEventListener(
                "change",
                atualizarTroco
            );

        }
    );


    atualizarTroco();

}


// ==========================================
// VALIDAR FORMULÁRIO
// ==========================================

function validarFormulario() {

    const nome =
        valorCampo(
            "nome"
        );


    const telefone =
        valorCampo(
            "telefone"
        );


    const endereco =
        valorCampo(
            "endereco"
        );


    const cidade =
        valorCampo(
            "cidade"
        );


    const estado =
        valorCampo(
            "estado"
        );


    const cep =
        valorCampo(
            "cep"
        );


    const pagamento =
        document.querySelector(
            "input[name='pagamento']:checked"
        );


    if (!nome) {

        alert(
            "Informe seu nome."
        );


        return false;

    }


    if (!telefone) {

        alert(
            "Informe seu telefone."
        );


        return false;

    }


    const telefoneNumeros =
        telefone.replace(
            /\D/g,
            ""
        );


    if (
        telefoneNumeros.length < 10
    ) {

        alert(
            "Informe um telefone válido."
        );


        return false;

    }


    if (!endereco) {

        alert(
            "Informe o endereço de entrega."
        );


        return false;

    }


    if (!cidade) {

        alert(
            "Informe a cidade."
        );


        return false;

    }


    if (
        estado.length !== 2
    ) {

        alert(
            "Informe o estado com 2 letras. Ex.: MG."
        );


        return false;

    }


    const cepNumeros =
        cep.replace(
            /\D/g,
            ""
        );


    if (
        cepNumeros.length !== 8
    ) {

        alert(
            "Informe um CEP válido."
        );


        return false;

    }


    if (!pagamento) {

        alert(
            "Selecione uma forma de pagamento."
        );


        return false;

    }


    // ==================================
    // TROCO
    // ==================================

    if (
        pagamento.value ===
        "dinheiro"
    ) {

        const trocoValor =
            Number(
                document.getElementById(
                    "troco"
                )?.value || 0
            );


        if (
            trocoValor > 0 &&
            trocoValor <
                totalPedido
        ) {

            alert(
                "O valor para troco não pode ser menor que o total do pedido."
            );


            return false;

        }

    }


    return true;

}


// ==========================================
// FINALIZAR COMPRA
// ==========================================

async function finalizarCompra() {

    if (
        !validarFormulario()
    ) {

        return;

    }


    const botao =
        document.getElementById(
            "btn-finalizar"
        );


    if (botao) {

        botao.disabled =
            true;


        botao.innerHTML = `

            <i class="fa-solid fa-spinner fa-spin"></i>

            Finalizando...

        `;

    }


    try {

        // ==================================
        // GARANTIR SESSÃO
        // ==================================

        const {
            data: sessaoData
        } = await window.db.auth.getSession();


        if (
            !sessaoData.session
        ) {

            throw new Error(
                "Sua sessão expirou. Entre novamente."
            );

        }


        // ==================================
        // PAGAMENTO
        // ==================================

        const pagamento =
            document.querySelector(
                "input[name='pagamento']:checked"
            ).value;


        // ==================================
        // ITENS PARA O BANCO
        // ==================================

        const itens =
            carrinho.map(
                (produto) => ({

                    produto_id:
                        String(
                            produto.id
                        ),

                    quantidade:
                        normalizarQuantidade(
                            produto.quantidade
                        )

                })
            );


        // ==================================
        // DADOS DE ENTREGA
        // ==================================

        const nome =
            valorCampo(
                "nome"
            );


        const telefone =
            valorCampo(
                "telefone"
            );


        const endereco =
            valorCampo(
                "endereco"
            );


        const cidade =
            valorCampo(
                "cidade"
            );


        const estado =
            valorCampo(
                "estado"
            )
                .toUpperCase();


        const cep =
            valorCampo(
                "cep"
            );


        const observacaoUsuario =
            document
                .getElementById(
                    "observacoes"
                )
                ?.value
                .trim()
            ||
            "";


        const troco =
            Number(
                document
                    .getElementById(
                        "troco"
                    )
                    ?.value || 0
            );


        // Por enquanto os dados de entrega ficam
        // registrados em observacoes do pedido.

        const linhasObservacoes = [

            `Cliente: ${nome}`,

            `Telefone: ${telefone}`,

            `Endereço: ${endereco}`,

            `Cidade/UF: ${cidade} - ${estado}`,

            `CEP: ${cep}`

        ];


        if (
            pagamento ===
                "dinheiro" &&
            troco > 0
        ) {

            linhasObservacoes.push(
                `Troco para: ${formatarMoeda(
                    troco
                )}`
            );

        }


        if (
            observacaoUsuario
        ) {

            linhasObservacoes.push(
                `Observação: ${observacaoUsuario}`
            );

        }


        const observacoesBanco =
            linhasObservacoes.join(
                "\n"
            );


        // ==================================
        // FINALIZAR NO BANCO
        // ==================================

        const {
            data,
            error
        } = await window.db.rpc(
            "finalizar_checkout",
            {

                p_forma_pagamento:
                    pagamento,

                p_observacoes:
                    observacoesBanco,

                p_itens:
                    itens

            }
        );


        if (error) {

            throw error;

        }


        console.log(
            "Pedidos criados:",
            data
        );


        // ==================================
        // LIMPAR CARRINHO
        // ==================================

        localStorage.removeItem(
            "carrinho"
        );


        localStorage.removeItem(
            "checkout"
        );


        if (
            typeof window
                .atualizarContadorCarrinho ===
            "function"
        ) {

            window
                .atualizarContadorCarrinho();

        }


        // ==================================
        // SUCESSO
        // ==================================

        alert(
            "Pedido realizado com sucesso!"
        );


        window.location.href =
            "meus-pedidos.html";


    } catch (erro) {

        console.error(
            "Erro ao finalizar pedido:",
            erro
        );


        alert(
            "Erro ao finalizar o pedido:\n\n" +
            (
                erro.message ||
                "Erro desconhecido."
            )
        );


        if (botao) {

            botao.disabled =
                false;


            botao.innerHTML = `

                <i class="fa-solid fa-check"></i>

                Finalizar Pedido

            `;

        }

    }

}


// ==========================================
// PLACEHOLDER DE IMAGEM
// ==========================================

function mostrarPlaceholderCheckout(
    imagem
) {

    if (!imagem) {

        return;

    }


    const area =
        imagem.closest(
            ".area-imagem-checkout"
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
            ".imagem-checkout-placeholder"
        );


    if (placeholder) {

        placeholder.style.display =
            "flex";

    }

}


// ==========================================
// PEGAR VALOR DE CAMPO
// ==========================================

function valorCampo(
    id
) {

    return document
        .getElementById(
            id
        )
        ?.value
        .trim()
        ||
        "";

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
// GLOBAL
// ==========================================

window.mostrarPlaceholderCheckout =
    mostrarPlaceholderCheckout;