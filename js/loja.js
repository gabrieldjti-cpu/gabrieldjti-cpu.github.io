// ==========================================
// LOJA.JS
// Página pública da loja
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

            alert(
                "Erro ao conectar com o Supabase."
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
            params.get("id");


        console.log(
            "ID da loja:",
            lojaId
        );


        if (!lojaId) {

            alert(
                "Loja não encontrada."
            );


            window.location.href =
                "index.html";


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
        } = await window.db

            .from("lojas")

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


            alert(
                "Erro ao carregar a loja."
            );


            return false;

        }


        // ==================================
        // LOJA NÃO ENCONTRADA
        // ==================================

        if (!data) {

            alert(
                "Loja não encontrada ou está indisponível."
            );


            window.location.href =
                "index.html";


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
                data.nome || "Loja";

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


        alert(
            "Erro ao carregar os dados da loja."
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


        // Se URL da imagem estiver quebrada

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


    // Prioriza o WhatsApp cadastrado.
    // Se não houver, usa o telefone.

    const contato =
        loja.whatsapp ||
        loja.telefone;


    if (!contato) {

        botao.style.display =
            "none";


        return;

    }


    let numero =
        String(contato)
            .replace(/\D/g, "");


    if (!numero) {

        botao.style.display =
            "none";


        return;

    }


    // ==================================
    // ADICIONAR DDI DO BRASIL
    // ==================================

    if (
        !numero.startsWith("55")
    ) {

        numero =
            "55" + numero;

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
        } = await window.db

            .from("produtos")

            .select("*")

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
                    ascending: true
                }
            );


        if (error) {

            console.error(
                "Erro ao carregar produtos:",
                error
            );


            container.innerHTML = `

                <div class="sem-produtos">

                    <i class="fa-solid fa-triangle-exclamation"></i>

                    <h2>
                        Erro ao carregar produtos.
                    </h2>

                </div>

            `;


            return;

        }


        produtos =
            data || [];


        mostrarProdutos(
            produtos
        );


    } catch (erro) {

        console.error(
            "Erro inesperado ao carregar produtos:",
            erro
        );


        container.innerHTML = `

            <div class="sem-produtos">

                <i class="fa-solid fa-triangle-exclamation"></i>

                <h2>
                    Não foi possível carregar os produtos.
                </h2>

            </div>

        `;

    }

}


// ==========================================
// MOSTRAR PRODUTOS
// ==========================================

function mostrarProdutos(
    lista
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

        container.innerHTML = `

            <div class="sem-produtos">

                <i class="fa-solid fa-box-open"></i>

                <h2>
                    Nenhum produto disponível.
                </h2>

            </div>

        `;


        return;

    }


    // ==================================
    // PRODUTOS
    // ==================================

    lista.forEach(
        (produto) => {

            const card =
                criarCardProduto(
                    produto
                );


            container.insertAdjacentHTML(
                "beforeend",
                card
            );

        }
    );

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
        Number(
            produto.estoque || 0
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
                ${formatarPreco(precoPromocional)}

            </div>

            <div class="preco-antigo">

                R$
                ${formatarPreco(preco)}

            </div>

        `;


    } else {

        precoHTML = `

            <div class="preco">

                R$
                ${formatarPreco(preco)}

            </div>

        `;

    }


    // ==================================
    // IMAGEM
    // ==================================

    let imagemHTML;


    if (produto.imagem_url) {

        imagemHTML = `

            <div class="area-imagem-produto">

                <img
                    src="${escaparHTML(produto.imagem_url)}"
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
            data-nome="${nome.toLowerCase()}"
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


    if (!area) {

        imagem.style.display =
            "none";


        return;

    }


    const placeholder =
        area.querySelector(
            ".imagem-produto-placeholder"
        );


    imagem.style.display =
        "none";


    imagem.removeAttribute(
        "src"
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
        pesquisa.value
            .trim()
            .toLowerCase();


    const filtrados =
        produtos.filter(
            (produto) => {

                const nome =
                    String(
                        produto.nome || ""
                    )
                        .toLowerCase();


                const descricao =
                    String(
                        produto.descricao || ""
                    )
                        .toLowerCase();


                return (
                    nome.includes(texto) ||
                    descricao.includes(texto)
                );

            }
        );


    mostrarProdutos(
        filtrados
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
                String(produto.id) ===
                String(id)
        );


    if (!produto) {

        alert(
            "Produto não encontrado."
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
        estoque <= 0
    ) {

        alert(
            "Este produto está sem estoque."
        );


        return;

    }


    // ==================================
    // CARRINHO
    // ==================================

    let carrinho = [];


    try {

        carrinho =
            JSON.parse(
                localStorage.getItem(
                    "carrinho"
                )
            ) || [];


        if (
            !Array.isArray(
                carrinho
            )
        ) {

            carrinho =
                [];

        }


    } catch (erro) {

        console.error(
            "Erro ao ler carrinho:",
            erro
        );


        carrinho =
            [];

    }


    // ==================================
    // PRODUTO JÁ EXISTE
    // ==================================

    const existente =
        carrinho.find(
            (item) =>
                String(item.id) ===
                    String(produto.id) &&
                String(item.loja_id) ===
                    String(lojaId)
        );


    if (existente) {

        const quantidadeAtual =
            Number(
                existente.quantidade || 1
            );


        if (
            quantidadeAtual >= estoque
        ) {

            alert(
                "Você já adicionou a quantidade máxima disponível deste produto."
            );


            return;

        }


        existente.quantidade =
            quantidadeAtual + 1;


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
                produto.descricao || "",

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
                produto.imagem_url || null,

            estoque:
                estoque,

            quantidade:
                1

        });

    }


    // ==================================
    // SALVAR
    // ==================================

    localStorage.setItem(
        "carrinho",
        JSON.stringify(
            carrinho
        )
    );


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


    alert(
        "Produto adicionado ao carrinho!"
    );

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
// ==========================================

window.adicionarCarrinho =
    adicionarCarrinho;


window.mostrarPlaceholderProduto =
    mostrarPlaceholderProduto;