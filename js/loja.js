// ==========================================
// LOJA.JS
// Página pública da loja
// Comércio da Cidade
// ==========================================

let produtos = [];

let lojaId = null;

let lojaAtual = null;


// ==========================================
// INICIAR
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "Página da loja iniciada."
        );


        // ==================================
        // VERIFICAR SUPABASE
        // ==================================

        if (!window.db) {

            console.error(
                "Loja: Supabase não foi inicializado."
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
        // PEGAR ID DA LOJA
        // ==================================

        const params =
            new URLSearchParams(
                window.location.search
            );


        lojaId =
            params.get(
                "id"
            );


        console.log(
            "ID da loja:",
            lojaId
        );


        if (!lojaId) {

            notificar(
                "Não foi possível identificar a loja que você está tentando acessar.",
                "erro",
                "Loja não encontrada",
                3000
            );


            setTimeout(
                () => {

                    window.location.href =
                        "index.html";

                },
                1000
            );


            return;

        }


        // ==================================
        // CARREGAR LOJA
        // ==================================

        const lojaCarregada =
            await carregarLoja();


        if (!lojaCarregada) {

            return;

        }


        // ==================================
        // CARREGAR PRODUTOS
        // ==================================

        await carregarProdutos();


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
                    *,
                    categorias(
                        nome
                    )
                `)

                .eq(
                    "id",
                    lojaId
                )

                .eq(
                    "ativa",
                    true
                )

                .maybeSingle();


        // ==================================
        // ERRO
        // ==================================

        if (error) {

            console.error(
                "Erro ao carregar loja:",
                error
            );


            notificar(
                "Não foi possível carregar os dados desta loja.",
                "erro",
                "Erro ao carregar loja",
                5000
            );


            return false;

        }


        // ==================================
        // LOJA NÃO ENCONTRADA
        // ==================================

        if (!data) {

            notificar(
                "Esta loja não foi encontrada ou está indisponível no momento.",
                "aviso",
                "Loja indisponível",
                3500
            );


            setTimeout(
                () => {

                    window.location.href =
                        "index.html";

                },
                1200
            );


            return false;

        }


        lojaAtual =
            data;


        console.log(
            "Loja carregada:",
            lojaAtual
        );


        // ==================================
        // NOME
        // ==================================

        const nomeLoja =
            document.getElementById(
                "nomeLoja"
            );


        if (nomeLoja) {

            nomeLoja.textContent =
                data.nome ||
                "Loja";

        }


        // ==================================
        // CATEGORIA
        // ==================================

        const categoriaLoja =
            document.getElementById(
                "categoriaLoja"
            );


        if (categoriaLoja) {

            categoriaLoja.textContent =
                data.categorias?.nome ||
                "Sem categoria";

        }


        // ==================================
        // CIDADE
        // ==================================

        const cidadeLoja =
            document.getElementById(
                "cidadeLoja"
            );


        if (cidadeLoja) {

            cidadeLoja.textContent =
                data.cidade ||
                "Não informada";

        }


        // ==================================
        // TELEFONE
        // ==================================

        const telefoneLoja =
            document.getElementById(
                "telefoneLoja"
            );


        if (telefoneLoja) {

            telefoneLoja.textContent =
                data.telefone ||
                data.whatsapp ||
                "Não informado";

        }


        // ==================================
        // LOGO
        // ==================================

        carregarLogoLoja(
            data.logo_url
        );


        // ==================================
        // WHATSAPP
        // ==================================

        configurarWhatsapp(
            data
        );


        return true;


    } catch (erro) {

        console.error(
            "Erro inesperado ao carregar loja:",
            erro
        );


        notificar(
            "Ocorreu um erro inesperado ao carregar esta loja.",
            "erro",
            "Não foi possível carregar",
            5000
        );


        return false;

    }

}


// ==========================================
// LOGO DA LOJA
// ==========================================

function carregarLogoLoja(
    logoUrl
) {

    const imagem =
        document.getElementById(
            "logoLoja"
        );


    if (!imagem) {

        return;

    }


    // ==================================
    // LOCALIZAR / CRIAR PLACEHOLDER
    // ==================================

    let placeholder =
        document.getElementById(
            "logoLojaPlaceholder"
        );


    if (!placeholder) {

        placeholder =
            document.createElement(
                "div"
            );


        placeholder.id =
            "logoLojaPlaceholder";


        placeholder.className =
            "logo-loja-placeholder";


        placeholder.innerHTML = `

            <i class="fa-solid fa-store"></i>

        `;


        imagem.insertAdjacentElement(
            "afterend",
            placeholder
        );

    }


    // ==================================
    // POSSUI LOGO
    // ==================================

    if (logoUrl) {

        imagem.src =
            logoUrl;


        imagem.style.display =
            "block";


        placeholder.style.display =
            "none";


        imagem.onerror =
            () => {

                console.warn(
                    "Erro ao carregar a logo da loja."
                );


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


    // ==================================
    // NÃO POSSUI LOGO
    // ==================================

    imagem.style.display =
        "none";


    imagem.removeAttribute(
        "src"
    );


    placeholder.style.display =
        "flex";

}


// ==========================================
// CONFIGURAR WHATSAPP
// ==========================================

function configurarWhatsapp(
    loja
) {

    const botao =
        document.getElementById(
            "btnWhatsapp"
        );


    if (!botao) {

        return;

    }


    const contato =
        loja.whatsapp ||
        loja.telefone;


    if (!contato) {

        botao.style.display =
            "none";


        return;

    }


    let numero =
        String(
            contato
        )
            .replace(
                /\D/g,
                ""
            );


    if (!numero) {

        botao.style.display =
            "none";


        return;

    }


    // ==================================
    // DDI DO BRASIL
    // ==================================

    if (
        !numero.startsWith(
            "55"
        )
    ) {

        numero =
            "55" +
            numero;

    }


    // ==================================
    // MENSAGEM
    // ==================================

    const mensagem =
        encodeURIComponent(
            `Olá! Encontrei a loja ${loja.nome} no Comércio da Cidade.`
        );


    botao.href =
        `https://wa.me/${numero}?text=${mensagem}`;


    botao.target =
        "_blank";


    botao.rel =
        "noopener noreferrer";


    botao.style.display =
        "";

}


// ==========================================
// CARREGAR PRODUTOS
// ==========================================

async function carregarProdutos() {

    const container =
        document.getElementById(
            "listaProdutos"
        );


    if (!container) {

        console.warn(
            "#listaProdutos não encontrado."
        );


        return;

    }


    // ==================================
    // CARREGANDO
    // ==================================

    container.innerHTML = `

        <div class="carregando">

            <i class="fa-solid fa-spinner fa-spin"></i>

            <p>
                Carregando produtos...
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
                    "produtos"
                )

                .select(
                    "*"
                )

                .eq(
                    "loja_id",
                    lojaId
                )

                .eq(
                    "ativo",
                    true
                )

                .order(
                    "nome",
                    {
                        ascending:
                            true
                    }
                );


        if (error) {

            console.error(
                "Erro ao carregar produtos:",
                error
            );


            mostrarErroProdutos();


            notificar(
                "Não foi possível carregar os produtos desta loja.",
                "erro",
                "Erro ao carregar produtos",
                5000
            );


            return;

        }


        produtos =
            Array.isArray(data)
                ? data
                : [];


        mostrarProdutos(
            produtos
        );


    } catch (erro) {

        console.error(
            "Erro inesperado ao carregar produtos:",
            erro
        );


        mostrarErroProdutos();


        notificar(
            "Ocorreu um erro inesperado ao carregar os produtos.",
            "erro",
            "Não foi possível carregar",
            5000
        );

    }

}


// ==========================================
// ERRO AO CARREGAR PRODUTOS
// ==========================================

function mostrarErroProdutos() {

    const container =
        document.getElementById(
            "listaProdutos"
        );


    if (!container) {

        return;

    }


    container.innerHTML = `

        <div class="sem-produtos">

            <i class="fa-solid fa-triangle-exclamation"></i>

            <h2>
                Não foi possível carregar os produtos.
            </h2>

            <p>
                Atualize a página e tente novamente.
            </p>

            <button
                type="button"
                class="btn"
                onclick="window.location.reload()"
            >

                <i class="fa-solid fa-rotate-right"></i>

                Tentar novamente

            </button>

        </div>

    `;

}


// ==========================================
// MOSTRAR PRODUTOS
// ==========================================

function mostrarProdutos(
    lista,
    pesquisando = false
) {

    const container =
        document.getElementById(
            "listaProdutos"
        );


    if (!container) {

        return;

    }


    container.innerHTML =
        "";


    // ==================================
    // SEM PRODUTOS
    // ==================================

    if (
        !lista ||
        lista.length === 0
    ) {

        if (pesquisando) {

            container.innerHTML = `

                <div class="sem-produtos">

                    <i class="fa-solid fa-magnifying-glass"></i>

                    <h2>
                        Nenhum produto encontrado.
                    </h2>

                    <p>
                        Tente pesquisar usando outro nome.
                    </p>

                </div>

            `;


        } else {

            container.innerHTML = `

                <div class="sem-produtos">

                    <i class="fa-solid fa-box-open"></i>

                    <h2>
                        Nenhum produto disponível.
                    </h2>

                    <p>
                        Esta loja ainda não possui produtos disponíveis.
                    </p>

                </div>

            `;

        }


        return;

    }


    // ==================================
    // PRODUTOS
    // ==================================

    const html =
        lista
            .map(
                criarCardProduto
            )
            .join("");


    container.innerHTML =
        html;

}


// ==========================================
// CRIAR CARD DO PRODUTO
// ==========================================

function criarCardProduto(
    produto
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


    const preco =
        Number(
            produto.preco || 0
        );


    const precoPromocional =
        Number(
            produto.preco_promocional || 0
        );


    const estoque =
        Math.max(
            0,
            Number(
                produto.estoque || 0
            )
        );


    // ==================================
    // PREÇO
    // ==================================

    let precoHTML;


    if (
        precoPromocional > 0 &&
        precoPromocional < preco
    ) {

        precoHTML = `

            <div class="preco">

                R$
                ${formatarPreco(
                    precoPromocional
                )}

            </div>

            <div class="preco-antigo">

                R$
                ${formatarPreco(
                    preco
                )}

            </div>

        `;


    } else {

        precoHTML = `

            <div class="preco">

                R$
                ${formatarPreco(
                    preco
                )}

            </div>

        `;

    }


    // ==================================
    // IMAGEM
    // ==================================

    let imagemHTML;


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
                    onerror="mostrarPlaceholderProduto(this)"
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
    // BOTÃO
    // ==================================

    let botaoHTML;


    if (
        estoque > 0
    ) {

        botaoHTML = `

            <button
                class="btn-comprar"
                type="button"
                onclick="adicionarCarrinho('${produto.id}')"
            >

                <i class="fa-solid fa-cart-plus"></i>

                Adicionar ao Carrinho

            </button>

        `;


    } else {

        botaoHTML = `

            <button
                class="btn-comprar"
                type="button"
                disabled
            >

                <i class="fa-solid fa-ban"></i>

                Produto sem estoque

            </button>

        `;

    }


    // ==================================
    // CARD
    // ==================================

    return `

        <div
            class="produto"
            data-nome="${escaparHTML(
                normalizarTexto(
                    produto.nome ||
                    ""
                )
            )}"
        >

            ${imagemHTML}


            <div class="conteudo">

                <h3>
                    ${nome}
                </h3>


                <p>
                    ${descricao}
                </p>


                ${precoHTML}


                <div class="estoque">

                    Estoque:
                    ${estoque}

                </div>


                ${botaoHTML}

            </div>

        </div>

    `;

}


// ==========================================
// IMAGEM DO PRODUTO COM ERRO
// ==========================================

function mostrarPlaceholderProduto(
    imagem
) {

    if (!imagem) {

        return;

    }


    const area =
        imagem.closest(
            ".area-imagem-produto"
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
            ".imagem-produto-placeholder"
        );


    if (placeholder) {

        placeholder.style.display =
            "flex";

    }

}


// ==========================================
// PESQUISAR PRODUTOS
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


    if (!texto) {

        mostrarProdutos(
            produtos
        );


        return;

    }


    const filtrados =
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


                return (
                    nome.includes(
                        texto
                    )
                    ||
                    descricao.includes(
                        texto
                    )
                );

            }
        );


    mostrarProdutos(
        filtrados,
        true
    );

}


// ==========================================
// ADICIONAR AO CARRINHO
// ==========================================

function adicionarCarrinho(
    id
) {

    const produto =
        produtos.find(
            (produto) =>
                String(
                    produto.id
                ) ===
                String(
                    id
                )
        );


    if (!produto) {

        notificar(
            "Este produto não foi encontrado ou não está mais disponível.",
            "erro",
            "Produto não encontrado"
        );


        return;

    }


    // ==================================
    // ESTOQUE
    // ==================================

    const estoque =
        Number(
            produto.estoque || 0
        );


    if (
        !Number.isFinite(
            estoque
        )
        ||
        estoque <= 0
    ) {

        notificar(
            `"${produto.nome || "Este produto"}" está sem estoque no momento.`,
            "aviso",
            "Produto indisponível"
        );


        return;

    }


    // ==================================
    // CARRINHO
    // ==================================

    let carrinho = [];


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
            "Erro ao ler carrinho:",
            erro
        );


        carrinho =
            [];


        localStorage.removeItem(
            "carrinho"
        );

    }


    // ==================================
    // PRODUTO JÁ EXISTE
    // ==================================

    const existente =
        carrinho.find(
            (item) =>
                String(
                    item.id
                ) ===
                    String(
                        produto.id
                    )
                &&
                String(
                    item.loja_id
                ) ===
                    String(
                        lojaId
                    )
        );


    if (existente) {

        const quantidadeAtual =
            Math.max(
                1,
                Number(
                    existente.quantidade ||
                    1
                )
            );


        if (
            quantidadeAtual >=
            estoque
        ) {

            notificar(
                `Você já adicionou todas as ${estoque} unidade(s) disponíveis deste produto.`,
                "aviso",
                "Limite de estoque"
            );


            return;

        }


        existente.quantidade =
            quantidadeAtual + 1;


        // Atualiza dados que podem
        // ter mudado no produto.

        existente.nome =
            produto.nome;


        existente.descricao =
            produto.descricao ||
            "";


        existente.preco =
            Number(
                produto.preco || 0
            );


        existente.preco_promocional =
            produto.preco_promocional
                ? Number(
                    produto.preco_promocional
                )
                : null;


        existente.imagem_url =
            produto.imagem_url ||
            null;


        existente.estoque =
            estoque;


        existente.nome_loja =
            lojaAtual?.nome ||
            "Loja";


    } else {

        carrinho.push({

            id:
                produto.id,

            loja_id:
                lojaId,

            nome_loja:
                lojaAtual?.nome ||
                "Loja",

            nome:
                produto.nome,

            descricao:
                produto.descricao ||
                "",

            preco:
                Number(
                    produto.preco || 0
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

            estoque:
                estoque,

            quantidade:
                1

        });

    }


    // ==================================
    // SALVAR
    // ==================================

    try {

        localStorage.setItem(
            "carrinho",
            JSON.stringify(
                carrinho
            )
        );


    } catch (erro) {

        console.error(
            "Erro ao salvar carrinho:",
            erro
        );


        notificar(
            "Não foi possível adicionar o produto ao carrinho.",
            "erro",
            "Erro no carrinho"
        );


        return;

    }


    // ==================================
    // ATUALIZAR HEADER
    // ==================================

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

    const quantidadeNoCarrinho =
        existente
            ? existente.quantidade
            : 1;


    if (
        quantidadeNoCarrinho > 1
    ) {

        notificar(
            `"${produto.nome}" agora possui ${quantidadeNoCarrinho} unidades no seu carrinho.`,
            "sucesso",
            "Carrinho atualizado",
            2800
        );


    } else {

        notificar(
            `"${produto.nome}" foi adicionado ao seu carrinho.`,
            "sucesso",
            "Produto adicionado!",
            2800
        );

    }

}


// ==========================================
// NORMALIZAR TEXTO
// Ignora maiúsculas e acentos
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
// FORMATAR PREÇO
// ==========================================

function formatarPreco(
    valor
) {

    return Number(
        valor || 0
    )
        .toLocaleString(
            "pt-BR",
            {
                minimumFractionDigits:
                    2,

                maximumFractionDigits:
                    2
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
// FUNÇÕES GLOBAIS
// ==========================================

window.adicionarCarrinho =
    adicionarCarrinho;


window.mostrarPlaceholderProduto =
    mostrarPlaceholderProduto;