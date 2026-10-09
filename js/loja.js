// ==========================================
// LOJA.JS
// Página pública da loja
// Comércio da Cidade
// ==========================================

let produtos = [];

let lojaId = null;

let lojaAtual = null;


// ==========================================
// RESUMOS DAS AVALIAÇÕES
// ==========================================

const resumosAvaliacoes =
    new Map();


// ==========================================
// INICIAR
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        configurarNavegacaoCardsProdutos();

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
        // CONFIGURAR MODAL DE AVALIAÇÕES
        // ==================================

        configurarAvaliacoes();


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


        destacarProdutoSolicitado();


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
        // NÃO ENCONTRADA
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

        const bannerLoja = document.getElementById("bannerLoja");
        if (bannerLoja && data.banner_url) {
            bannerLoja.src = data.banner_url;
            bannerLoja.hidden = false;
            bannerLoja.addEventListener("error", () => {
                bannerLoja.hidden = true;
                bannerLoja.removeAttribute("src");
            }, { once: true });
        }


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
    // SEM LOGO
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

                .select(`
                    *,
                    categorias_produtos!categoria_id(
                        nome,
                        categoria_pai:categorias_produtos!categoria_pai_id(
                            nome
                        )
                    )
                `)

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

            throw error;
        }


        produtos =
            Array.isArray(
                data
            )
                ? data
                : [];


        // ==================================
        // CARREGAR MÉDIAS
        // ==================================

        await carregarResumosAvaliacoes(
            produtos
        );


        mostrarProdutos(
            produtos
        );


    } catch (erro) {

        console.error(
            "Erro ao carregar produtos:",
            erro
        );


        mostrarErroProdutos();


        notificar(
            "Não foi possível carregar os produtos desta loja.",
            "erro",
            "Erro ao carregar produtos",
            5000
        );
    }
}


// ==========================================
// CARREGAR RESUMOS DAS AVALIAÇÕES
// ==========================================

async function carregarResumosAvaliacoes(
    listaProdutos
) {

    // Classificados: a avaliação é do vendedor (perfil ou loja), não de
    // cada produto. O resumo fica na seção "Avaliações" da página
    // (js/avaliacoes-vendedor.js).
    resumosAvaliacoes.clear();
}


// ==========================================
// OBTER RESUMO DE UM PRODUTO
// ==========================================

function obterResumoAvaliacao(
    produtoId
) {

    return (
        resumosAvaliacoes.get(
            String(
                produtoId
            )
        )
        ||
        {

            media:
                0,

            total:
                0,

            nota_5:
                0,

            nota_4:
                0,

            nota_3:
                0,

            nota_2:
                0,

            nota_1:
                0

        }
    );
}


// ==========================================
// CRIAR RESUMO VISUAL DA AVALIAÇÃO
// ==========================================

function criarResumoAvaliacaoHTML(
    produto
) {

    const resumo =
        obterResumoAvaliacao(
            produto.id
        );


    const media =
        Number(
            resumo.media ||
            0
        );


    const total =
        Number(
            resumo.total ||
            0
        );


    // ==================================
    // SEM AVALIAÇÕES
    // ==================================

    if (
        total <= 0
    ) {

        return `

            <div
                class="
                    avaliacao-produto
                    sem-avaliacoes
                "
            >

                <div class="estrelas-produto">

                    ${criarEstrelasMediaHTML(
                        0
                    )}

                </div>


                <span>
                    Sem avaliações
                </span>

            </div>

        `;
    }


    // ==================================
    // COM AVALIAÇÕES
    // ==================================

    return `

        <button
            type="button"
            class="
                avaliacao-produto
                avaliacao-produto-clicavel
            "
            data-ver-avaliacoes
            data-produto-id="${escaparHTML(
                produto.id
            )}"
            aria-label="Ver avaliações de ${escaparHTML(
                produto.nome ||
                "produto"
            )}"
        >

            <div class="estrelas-produto">

                ${criarEstrelasMediaHTML(
                    media
                )}

            </div>


            <strong>

                ${formatarMediaAvaliacao(
                    media
                )}

            </strong>


            <span>

                ${total}

                ${
                    total === 1
                        ? "avaliação"
                        : "avaliações"
                }

            </span>


            <i
                class="
                    fa-solid
                    fa-chevron-right
                    seta-avaliacoes
                "
                aria-hidden="true"
            ></i>

        </button>

    `;
}


// ==========================================
// ESTRELAS DA MÉDIA
// ==========================================

function criarEstrelasMediaHTML(
    media
) {

    const valor =
        Math.max(
            0,
            Math.min(
                5,
                Number(
                    media ||
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

        // ==================================
        // CHEIA
        // ==================================

        if (
            valor >=
            estrela
        ) {

            html += `

                <i
                    class="fa-solid fa-star"
                    aria-hidden="true"
                ></i>

            `;


            continue;
        }


        // ==================================
        // METADE
        // ==================================

        if (
            valor >=
            estrela - 0.5
        ) {

            html += `

                <i
                    class="fa-solid fa-star-half-stroke"
                    aria-hidden="true"
                ></i>

            `;


            continue;
        }


        // ==================================
        // VAZIA
        // ==================================

        html += `

            <i
                class="fa-regular fa-star"
                aria-hidden="true"
            ></i>

        `;
    }


    return html;
}


// ==========================================
// FORMATAR MÉDIA
// ==========================================

function formatarMediaAvaliacao(
    valor
) {

    return Number(
        valor ||
        0
    )
        .toLocaleString(
            "pt-BR",
            {

                minimumFractionDigits:
                    1,

                maximumFractionDigits:
                    1

            }
        );
}


// ==========================================
// CONFIGURAR SISTEMA DE AVALIAÇÕES
// ==========================================

function configurarAvaliacoes() {

    const listaProdutos =
        document.getElementById(
            "listaProdutos"
        );


    const modal =
        document.getElementById(
            "modalAvaliacoes"
        );


    const botaoFechar =
        document.getElementById(
            "btnFecharAvaliacoes"
        );


    // ==================================
    // CLIQUE NA AVALIAÇÃO DO PRODUTO
    // ==================================

    listaProdutos?.addEventListener(
        "click",
        evento => {

            const botao =
                evento.target.closest(
                    "[data-ver-avaliacoes]"
                );


            if (!botao) {

                return;
            }


            const produtoId =
                botao.dataset.produtoId;


            if (!produtoId) {

                return;
            }


            abrirAvaliacoesProduto(
                produtoId
            );
        }
    );


    // ==================================
    // BOTÃO X
    // ==================================

    botaoFechar?.addEventListener(
        "click",
        fecharModalAvaliacoes
    );


    // ==================================
    // OVERLAY
    // ==================================

    modal
        ?.querySelectorAll(
            "[data-fechar-avaliacoes]"
        )
        .forEach(
            elemento => {

                elemento.addEventListener(
                    "click",
                    fecharModalAvaliacoes
                );
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


            if (
                modal?.classList.contains(
                    "aberto"
                )
            ) {

                fecharModalAvaliacoes();
            }
        }
    );
}


// ==========================================
// ABRIR AVALIAÇÕES DO PRODUTO
// ==========================================

async function abrirAvaliacoesProduto(
    produtoId
) {

    // Classificados: mostra as avaliações do vendedor desta página.
    const secao =
        document.getElementById(
            "avaliacoesVendedor"
        );

    if (secao) {

        secao.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}


// ==========================================
// CRIAR CONTEÚDO DO MODAL
// ==========================================

function criarConteudoAvaliacoesHTML(
    resumo,
    avaliacoes
) {

    const media =
        Number(
            resumo?.media ||
            0
        );


    const total =
        Number(
            resumo?.total ||
            0
        );


    const lista =
        Array.isArray(
            avaliacoes
        )
            ? avaliacoes
            : [];


    // ==================================
    // RESUMO
    // ==================================

    const resumoHTML = `

        <section class="resumo-avaliacoes">


            <div class="nota-geral-avaliacoes">

                <strong>

                    ${formatarMediaAvaliacao(
                        media
                    )}

                </strong>


                <div
                    class="estrelas-resumo-modal"
                    aria-label="Média ${formatarMediaAvaliacao(
                        media
                    )} de 5 estrelas"
                >

                    ${criarEstrelasMediaHTML(
                        media
                    )}

                </div>


                <span>

                    ${total}

                    ${
                        total === 1
                            ? "avaliação"
                            : "avaliações"
                    }

                </span>

            </div>


            <div class="distribuicao-avaliacoes">

                ${criarDistribuicaoAvaliacoesHTML(
                    resumo
                )}

            </div>


        </section>

    `;


    // ==================================
    // SEM AVALIAÇÕES
    // ==================================

    if (
        total <= 0 ||
        lista.length === 0
    ) {

        return `

            ${resumoHTML}


            <div class="nenhuma-avaliacao-modal">

                <i class="fa-regular fa-star"></i>

                <h3>
                    Ainda não há avaliações.
                </h3>

                <p>

                    Este produto ainda não recebeu
                    avaliações dos clientes.

                </p>

            </div>

        `;
    }


    // ==================================
    // LISTA DE AVALIAÇÕES
    // ==================================

    const listaHTML =
        lista
            .map(
                criarAvaliacaoPublicaHTML
            )
            .join(
                ""
            );


    return `

        ${resumoHTML}


        <section class="lista-avaliacoes-publicas">

            <h3>

                <i class="fa-solid fa-comments"></i>

                Avaliações dos clientes

            </h3>


            ${listaHTML}

        </section>

    `;
}


// ==========================================
// DISTRIBUIÇÃO DAS NOTAS
// ==========================================

function criarDistribuicaoAvaliacoesHTML(
    resumo
) {

    const total =
        Number(
            resumo?.total ||
            0
        );


    let html =
        "";


    for (
        let nota = 5;
        nota >= 1;
        nota--
    ) {

        const quantidade =
            Number(
                resumo?.[
                    `nota_${nota}`
                ] ||
                0
            );


        const percentual =
            total > 0
                ? (
                    quantidade /
                    total
                ) * 100
                : 0;


        const percentualSeguro =
            Math.min(
                100,
                Math.max(
                    0,
                    percentual
                )
            );


        html += `

            <div class="linha-distribuicao">

                <span class="nota-distribuicao">

                    ${nota}

                    <i class="fa-solid fa-star"></i>

                </span>


                <div
                    class="barra-distribuicao"
                    aria-label="${nota} estrelas: ${quantidade} avaliação ou avaliações"
                >

                    <div
                        class="barra-distribuicao-preenchida"
                        style="width:${percentualSeguro}%"
                    ></div>

                </div>


                <span class="quantidade-distribuicao">

                    ${quantidade}

                </span>

            </div>

        `;
    }


    return html;
}


// ==========================================
// CRIAR AVALIAÇÃO PÚBLICA
// ==========================================

function criarAvaliacaoPublicaHTML(
    avaliacao
) {

    const nota =
        Math.max(
            1,
            Math.min(
                5,
                Number(
                    avaliacao?.nota ||
                    1
                )
            )
        );


    const comentario =
        String(
            avaliacao?.comentario ||
            ""
        )
            .trim();


    const resposta =
        String(
            avaliacao?.resposta_loja ||
            ""
        )
            .trim();


    const data =
        formatarDataAvaliacao(
            avaliacao?.criado_em
        );


    return `

        <article class="avaliacao-publica">


            <!-- ==================================
                 TOPO
            =================================== -->

            <div class="avaliacao-publica-topo">


                <div>


                    <div
                        class="estrelas-avaliacao-publica"
                        aria-label="${nota} de 5 estrelas"
                    >

                        ${criarEstrelasMediaHTML(
                            nota
                        )}

                    </div>


                    <span class="compra-verificada">

                        <i class="fa-solid fa-circle-check"></i>

                        Compra verificada

                    </span>


                </div>


                ${
                    data
                        ? `

                            <time>

                                ${escaparHTML(
                                    data
                                )}

                            </time>

                        `
                        : ""
                }


            </div>


            <!-- ==================================
                 COMENTÁRIO
            =================================== -->

            ${
                comentario
                    ? `

                        <p class="comentario-avaliacao-publica">

                            ${escaparHTML(
                                comentario
                            )}

                        </p>

                    `
                    : `

                        <p
                            class="
                                comentario-avaliacao-publica
                                sem-comentario
                            "
                        >

                            Cliente avaliou este produto
                            sem deixar comentário.

                        </p>

                    `
            }


            <!-- ==================================
                 RESPOSTA DA LOJA
            =================================== -->

            ${
                resposta
                    ? `

                        <div class="resposta-loja-avaliacao">

                            <strong>

                                <i class="fa-solid fa-store"></i>

                                Resposta da loja

                            </strong>


                            <p>

                                ${escaparHTML(
                                    resposta
                                )}

                            </p>

                        </div>

                    `
                    : ""
            }


        </article>

    `;
}


// ==========================================
// FORMATAR DATA DA AVALIAÇÃO
// ==========================================

function formatarDataAvaliacao(
    data
) {

    if (!data) {

        return "";
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

        return "";
    }


    return objeto.toLocaleDateString(
        "pt-BR",
        {

            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric"

        }
    );
}


// ==========================================
// FECHAR MODAL DE AVALIAÇÕES
// ==========================================

function fecharModalAvaliacoes() {

    const modal =
        document.getElementById(
            "modalAvaliacoes"
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


    document.body.style.overflow =
        "";
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


    const html =
        lista
            .map(
                criarCardProduto
            )
            .join(
                ""
            );


    container.innerHTML =
        html;
}


// ==========================================
// CRIAR CARD DO PRODUTO
// ==========================================

function obterNomeCategoriaProduto(
    produto
) {

    const categoria =
        produto?.categorias_produtos ||
        {};


    if (
        categoria.categoria_pai?.nome
    ) {

        return `${categoria.categoria_pai.nome} › ${categoria.nome || ""}`;

    }


    return categoria.nome || "";

}


function criarCardProduto(
    produto
) {

    const produtoId =
        escaparHTML(
            produto.id ||
            ""
        );

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


    const categoria =
        escaparHTML(
            obterNomeCategoriaProduto(
                produto
            ) ||
            "Sem categoria"
        );


    const preco =
        Number(
            produto.preco ||
            0
        );


    const precoPromocional =
        Number(
            produto.preco_promocional ||
            0
        );


    const estoque =
        Math.max(
            0,
            Number(
                produto.estoque ||
                0
            )
        );

    const linkProduto =
        `produto.html?id=${encodeURIComponent(
            produto.id || ""
        )}`;


    // ==================================
    // AVALIAÇÃO
    // ==================================

    const avaliacaoHTML =
        criarResumoAvaliacaoHTML(
            produto
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

                <button
                    type="button"
                    class="btn-favorito-produto"
                    data-favorito-produto="${produtoId}"
                    data-favorito-nome="${nome}"
                    aria-label="Adicionar ${nome} aos favoritos"
                    aria-pressed="false"
                >
                    <i class="fa-regular fa-heart" aria-hidden="true"></i>
                </button>

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

                <button
                    type="button"
                    class="btn-favorito-produto"
                    data-favorito-produto="${produtoId}"
                    data-favorito-nome="${nome}"
                    aria-label="Adicionar ${nome} aos favoritos"
                    aria-pressed="false"
                >
                    <i class="fa-regular fa-heart" aria-hidden="true"></i>
                </button>

                <div
                    class="imagem-produto-placeholder"
                >

                    <i class="fa-solid fa-box"></i>

                </div>

            </div>

        `;
    }


    // ==================================
    // BOTÃO "VER A OFERTA"
    // ==================================
    // Classificados: não há carrinho. O botão leva ao anúncio,
    // onde ficam o contato e o endereço do anunciante.

    const botaoHTML = `

        <a
            class="btn-comprar btn-ver-oferta"
            href="${escaparHTML(linkProduto)}"
        >

            <i class="fa-solid fa-tag"></i>

            ${estoque > 0 ? "Ver a oferta" : "Indisponível · ver anúncio"}

        </a>

    `;


    // ==================================
    // CARD
    // ==================================

    return `

        <div
            class="produto produto-card-clicavel"
            id="produto-${produtoId}"
            data-produto-id="${produtoId}"
            data-link-produto="${escaparHTML(linkProduto)}"
            role="link"
            tabindex="0"
            aria-label="Ver detalhes de ${nome}"
            data-nome="${escaparHTML(
                normalizarTexto(
                    produto.nome ||
                    ""
                )
            )}"
        >

            ${imagemHTML}


            <div class="conteudo">

                <span class="produto-categoria">
                    ${categoria}
                </span>

                <h3>${nome}</h3>


                <p>
                    ${descricao}
                </p>


                ${avaliacaoHTML}


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

function configurarNavegacaoCardsProdutos() {
    const container = document.getElementById("listaProdutos");
    if (!container) return;

    container.addEventListener("click", event => {
        const card = event.target.closest("[data-link-produto]");
        if (!card || event.target.closest("a, button, input, select, textarea, label")) return;

        window.location.href = card.dataset.linkProduto;
    });

    container.addEventListener("keydown", event => {
        const card = event.target.closest("[data-link-produto]");
        if (!card || event.target !== card || !["Enter", " "].includes(event.key)) return;

        event.preventDefault();
        window.location.href = card.dataset.linkProduto;
    });
}


// ==========================================
// DESTACAR PRODUTO VINDO DA PESQUISA GLOBAL
// ==========================================

function destacarProdutoSolicitado() {

    const produtoId =
        new URLSearchParams(
            window.location.search
        )
            .get(
                "produto"
            );


    if (!produtoId) {

        return;

    }


    const card =
        Array.from(
            document.querySelectorAll(
                "#listaProdutos .produto[data-produto-id]"
            )
        )
            .find(
                item =>
                    String(
                        item.dataset.produtoId
                    ) ===
                    String(
                        produtoId
                    )
            );


    if (!card) {

        return;

    }


    card.classList.add(
        "produto-destacado-busca"
    );


    card.setAttribute(
        "tabindex",
        "-1"
    );


    requestAnimationFrame(
        () => {

            card.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });


            card.focus({
                preventScroll: true
            });

        }
    );


    setTimeout(
        () => {

            card.classList.remove(
                "produto-destacado-busca"
            );

        },
        4000
    );

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
            produto => {

                const nome =
                    normalizarTexto(
                        produto.nome
                    );


                const descricao =
                    normalizarTexto(
                        produto.descricao
                    );


                const categoria =
                    normalizarTexto(
                        obterNomeCategoriaProduto(
                            produto
                        )
                    );


                return (
                    nome.includes(
                        texto
                    )
                    ||
                    descricao.includes(
                        texto
                    )
                    ||
                    categoria.includes(
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
// NORMALIZAR TEXTO
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
        valor ||
        0
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

window.mostrarPlaceholderProduto =
    mostrarPlaceholderProduto;
