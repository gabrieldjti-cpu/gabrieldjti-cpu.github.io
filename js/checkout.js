// ==========================================
// CHECKOUT.JS
// Comércio da Cidade
// ==========================================

let usuario = null;

let carrinho = [];

let pedidosPorLoja = {};

let totalPedido = 0;

let subtotalPedido = 0;

let fretePedido = 0;

let fretesPorLoja = new Map();


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


            notificar(
                "Não foi possível conectar ao sistema. Atualize a página e tente novamente.",
                "erro",
                "Erro de conexão",
                6000
            );


            const botao =
                document.getElementById(
                    "btn-finalizar"
                );


            if (botao) {

                botao.disabled =
                    true;

            }


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

        await window.CarrinhoSync?.iniciar();

        carregarCarrinho();


        if (
            carrinho.length === 0
        ) {

            notificar(
                "Adicione produtos ao carrinho antes de finalizar uma compra.",
                "aviso",
                "Carrinho vazio",
                2500
            );


            setTimeout(
                () => {

                    window.location.href =
                        "carrinho.html";

                },
                1000
            );


            return;

        }


        // ==================================
        // PREPARAR CHECKOUT
        // ==================================

        agruparProdutosPorLoja();


        const freteCarregado =
            await carregarFretesCheckout();


        if (!freteCarregado) {

            const btnFinalizar =
                document.getElementById(
                    "btn-finalizar"
                );


            if (btnFinalizar) {

                btnFinalizar.disabled =
                    true;

            }


            return;

        }

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


        if (
            !sessaoData.session
        ) {

            notificar(
                "Entre na sua conta para finalizar a compra.",
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


        return true;


    } catch (erro) {

        console.error(
            "Erro inesperado ao verificar usuário:",
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
// CARREGAR FRETES DAS LOJAS
// ==========================================

async function carregarFretesCheckout() {

    const lojaIds =
        Object.keys(
            pedidosPorLoja
        );


    if (!window.FreteLoja) {

        notificar(
            "Não foi possível iniciar o cálculo da entrega.",
            "erro",
            "Frete indisponível"
        );


        return false;

    }


    try {

        fretesPorLoja =
            await window.FreteLoja.carregar(
                lojaIds,
                {
                    forcar: true
                }
            );


        Object.values(
            pedidosPorLoja
        ).forEach(loja => {

            loja.taxa_entrega =
                window.FreteLoja.obterTaxa(
                    fretesPorLoja,
                    loja.loja_id
                );

        });


        return fretesPorLoja.size === lojaIds.length;


    } catch (erro) {

        console.error(
            "Erro ao carregar fretes no checkout:",
            erro
        );


        notificar(
            "Não foi possível calcular a entrega. Volte ao carrinho e tente novamente.",
            "erro",
            "Frete indisponível",
            6000
        );


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


        notificar(
            "Não foi possível carregar os produtos do carrinho.",
            "erro",
            "Erro no carrinho"
        );

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


    const freteElemento =
        document.getElementById(
            "frete"
        );


    if (
        !lista ||
        !subtotalElemento ||
        !totalElemento ||
        !freteElemento
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


    subtotalPedido =
        0;


    fretePedido =
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


                        subtotalPedido +=
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


                const freteLoja =
                    Number(
                        loja.taxa_entrega ||
                        0
                    );


                const totalLoja =
                    subtotalLoja +
                    freteLoja;


                fretePedido +=
                    freteLoja;


                totalPedido +=
                    totalLoja;


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


                            <div class="checkout-valores-loja">

                                <div>
                                    <span>Produtos</span>
                                    <strong>${formatarMoeda(subtotalLoja)}</strong>
                                </div>

                                <div>
                                    <span>Entrega</span>
                                    <strong>${
                                        freteLoja > 0
                                            ? formatarMoeda(freteLoja)
                                            : "Grátis"
                                    }</strong>
                                </div>

                                <div class="checkout-total-loja">
                                    <span>Total da loja</span>
                                    <strong>${formatarMoeda(totalLoja)}</strong>
                                </div>

                            </div>

                        </div>

                    `
                );

            }
        );


    subtotalElemento.textContent =
        formatarMoeda(
            subtotalPedido
        );


    freteElemento.textContent =
        fretePedido > 0
            ? formatarMoeda(
                fretePedido
            )
            : "Grátis";


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
                    loading="lazy"
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

                <div
                    class="imagem-checkout-placeholder"
                >

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
// PREENCHER DADOS DO USUÁRIO
// ==========================================

function preencherDadosUsuario() {

    if (!usuario) {

        return;

    }


    const campoNome =
        document.getElementById(
            "nome"
        );


    if (
        campoNome &&
        !campoNome.value
    ) {

        campoNome.value =
            usuario
                .user_metadata
                ?.display_name
            ||
            usuario
                .user_metadata
                ?.nome
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


    const enderecoSelecionadoId =
        String(
            window.checkoutEnderecoSelecionadoId ||
            ""
        )
            .trim();


    // ==================================
    // ENDEREÇO SALVO
    // ==================================

    if (!enderecoSelecionadoId) {

        notificar(
            "Cadastre ou selecione um endereço completo antes de finalizar o pedido.",
            "aviso",
            "Endereço obrigatório"
        );


        document
            .getElementById(
                "checkout-enderecos-rf04"
            )
            ?.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });


        return false;

    }


    // ==================================
    // NOME
    // ==================================

    if (!nome) {

        notificar(
            "Informe o nome de quem receberá o pedido.",
            "aviso",
            "Nome obrigatório"
        );


        focarCampo(
            "nome"
        );


        return false;

    }


    // ==================================
    // TELEFONE
    // ==================================

    if (!telefone) {

        notificar(
            "Informe um telefone para contato.",
            "aviso",
            "Telefone obrigatório"
        );


        focarCampo(
            "telefone"
        );


        return false;

    }


    const telefoneNumeros =
        telefone.replace(
            /\D/g,
            ""
        );


    if (
        telefoneNumeros.length < 10 ||
        telefoneNumeros.length > 11
    ) {

        notificar(
            "Digite um telefone válido com DDD.",
            "aviso",
            "Telefone inválido"
        );


        focarCampo(
            "telefone"
        );


        return false;

    }


    // ==================================
    // ENDEREÇO
    // ==================================

    if (!endereco) {

        notificar(
            "Informe onde o pedido deve ser entregue.",
            "aviso",
            "Endereço obrigatório"
        );


        focarCampo(
            "endereco"
        );


        return false;

    }


    // ==================================
    // CIDADE
    // ==================================

    if (!cidade) {

        notificar(
            "Informe a cidade de entrega.",
            "aviso",
            "Cidade obrigatória"
        );


        focarCampo(
            "cidade"
        );


        return false;

    }


    // ==================================
    // ESTADO
    // ==================================

    if (
        estado.length !== 2
    ) {

        notificar(
            "Informe a sigla do estado com 2 letras. Exemplo: BA, SP ou MG.",
            "aviso",
            "Estado inválido"
        );


        focarCampo(
            "estado"
        );


        return false;

    }


    // ==================================
    // CEP
    // ==================================

    const cepNumeros =
        cep.replace(
            /\D/g,
            ""
        );


    if (
        cepNumeros.length !== 8
    ) {

        notificar(
            "Digite um CEP válido com 8 números.",
            "aviso",
            "CEP inválido"
        );


        focarCampo(
            "cep"
        );


        return false;

    }


    // ==================================
    // PAGAMENTO
    // ==================================

    if (!pagamento) {

        notificar(
            "Escolha como deseja pagar pelo pedido.",
            "aviso",
            "Forma de pagamento"
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
                document
                    .getElementById(
                        "troco"
                    )
                    ?.value || 0
            );


        if (
            trocoValor > 0 &&
            trocoValor <
            totalPedido
        ) {

            notificar(
                `O valor informado para troco deve ser igual ou maior que ${formatarMoeda(totalPedido)}.`,
                "aviso",
                "Valor de troco inválido"
            );


            focarCampo(
                "troco"
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


    const conteudoOriginal =
        botao?.innerHTML;


    if (botao) {

        botao.disabled =
            true;


        botao.innerHTML = `

            <i class="fa-solid fa-spinner fa-spin"></i>

            Finalizando...

        `;

    }


    try {

        // Confirma a taxa mais recente antes de criar o pedido.
        // Se ela mudou, o cliente precisa revisar o novo total.

        const freteExibido =
            fretePedido;


        const freteAtualizado =
            await carregarFretesCheckout();


        if (!freteAtualizado) {

            throw new Error(
                "Não foi possível confirmar a taxa de entrega. Tente novamente."
            );

        }


        mostrarResumo();


        if (
            Math.abs(
                fretePedido -
                freteExibido
            ) > 0.009
        ) {

            throw new Error(
                "A taxa de entrega foi atualizada. Confira o novo total e finalize novamente."
            );

        }


        // ==================================
        // GARANTIR SESSÃO
        // ==================================

        const {
            data: sessaoData,
            error: sessaoError
        } =
            await window.db
                .auth
                .getSession();


        if (sessaoError) {

            throw sessaoError;

        }


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


        const enderecoSelecionadoId =
            String(
                window.checkoutEnderecoSelecionadoId ||
                ""
            )
                .trim();


        if (!enderecoSelecionadoId) {

            throw new Error(
                "Selecione um endereço de entrega antes de finalizar."
            );

        }


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
        // VALIDAR ITENS
        // ==================================

        if (
            itens.length === 0
        ) {

            throw new Error(
                "Nenhum produto foi encontrado no carrinho."
            );

        }


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


        // ==================================
        // OBSERVAÇÕES DO PEDIDO
        // ==================================

        const linhasObservacoes = [

            `Cliente: ${nome}`,

            `Telefone: ${telefone}`,

            `Endereço: ${endereco}`,

            `Cidade/UF: ${cidade} - ${estado}`,

            `CEP: ${cep}`

        ];


        if (
            pagamento === "dinheiro" &&
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
        } =
            await window.db
                .rpc(
                    "finalizar_checkout_endereco",
                    {

                        p_forma_pagamento:
                            pagamento,

                        p_observacoes:
                            observacoesBanco,

                        p_itens:
                            itens,

                        p_endereco_id:
                            enderecoSelecionadoId

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


        await window.CarrinhoSync
            ?.sincronizarAgora();


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

        if (botao) {

            botao.innerHTML = `

                <i class="fa-solid fa-circle-check"></i>

                Pedido realizado

            `;

        }


        notificar(
            "Seu pedido foi realizado com sucesso.",
            "sucesso",
            "Pedido confirmado!",
            3500
        );


        // Dá tempo de visualizar
        // a mensagem antes de redirecionar.

        setTimeout(
            () => {

                window.location.href =
                    "meus-pedidos.html";

            },
            1300
        );


    } catch (erro) {

        console.error(
            "Erro ao finalizar pedido:",
            erro
        );


        const mensagemErro =
            tratarErroCheckout(
                erro
            );


        notificar(
            mensagemErro,
            "erro",
            "Não foi possível finalizar",
            6000
        );


        if (botao) {

            botao.disabled =
                false;


            botao.innerHTML =
                conteudoOriginal ||
                `

                    <i class="fa-solid fa-check"></i>

                    Finalizar Pedido

                `;

        }

    }

}


// ==========================================
// TRATAR ERROS DO CHECKOUT
// ==========================================

function tratarErroCheckout(
    erro
) {

    const texto =
        String(
            erro?.message ||
            ""
        )
            .toLowerCase();


    // ==================================
    // ESTOQUE
    // ==================================

    if (
        texto.includes(
            "estoque insuficiente"
        )
    ) {

        return (
            erro.message ||
            "Um dos produtos não possui estoque suficiente."
        );

    }


    if (
        texto.includes(
            "não está disponível"
        )
        ||
        texto.includes(
            "nao esta disponivel"
        )
    ) {

        return (
            erro.message ||
            "Um dos produtos não está mais disponível."
        );

    }


    // ==================================
    // PRODUTO
    // ==================================

    if (
        texto.includes(
            "produto não encontrado"
        )
        ||
        texto.includes(
            "produto nao encontrado"
        )
    ) {

        return (
            "Um dos produtos do carrinho não está mais disponível. Volte ao carrinho e atualize sua compra."
        );

    }


    // ==================================
    // SESSÃO
    // ==================================

    if (
        texto.includes(
            "sessão expirou"
        )
        ||
        texto.includes(
            "sessao expirou"
        )
        ||
        texto.includes(
            "não autenticado"
        )
        ||
        texto.includes(
            "nao autenticado"
        )
    ) {

        return (
            "Sua sessão expirou. Entre novamente para finalizar o pedido."
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
            "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente."
        );

    }


    // ==================================
    // PADRÃO
    // ==================================

    return (
        erro?.message ||
        "Ocorreu um erro ao finalizar o pedido."
    );

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
        ?.trim()
        ||
        "";

}


// ==========================================
// FOCAR CAMPO
// ==========================================

function focarCampo(
    id
) {

    const campo =
        document.getElementById(
            id
        );


    if (!campo) {

        return;

    }


    campo.focus();


    campo.scrollIntoView(
        {
            behavior:
                "smooth",

            block:
                "center"
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
// GLOBAL
// ==========================================

window.mostrarPlaceholderCheckout =
    mostrarPlaceholderCheckout;
