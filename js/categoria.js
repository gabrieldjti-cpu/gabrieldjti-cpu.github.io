// ==========================================
// CATEGORIA.JS
// Página global de categoria de lojas
// ==========================================

(() => {
    "use strict";

    const TAMANHO_PAGINA = 12;
    const LIMITE_TERMO = 80;

    const estado = {
        categoriaId: null,
        categoria: null,
        termo: "",
        categoriaProdutoId: "",
        subcategoriaProdutoId: "",
        disponibilidade: "",
        precoMinimo: "",
        precoMaximo: "",
        avaliacaoMinima: "",
        ordenacao: "relevancia",
        pagina: 1,
        totalProdutos: 0
    };

    const elementos = {};
    let temporizadorPesquisa = null;
    let numeroConsultaProdutos = 0;
    let categoriasProdutos = [];

    document.addEventListener("DOMContentLoaded", iniciarPaginaCategoria);

    async function iniciarPaginaCategoria() {
        mapearElementos();
        configurarEventos();

        estado.categoriaId = obterCategoriaDaURL();

        if (!estado.categoriaId) {
            mostrarCategoriaInvalida(
                "Categoria não encontrada",
                "Escolha uma categoria válida para continuar explorando o comércio local."
            );
            return;
        }

        if (!window.db) {
            mostrarCategoriaInvalida(
                "Não foi possível conectar",
                "Atualize a página e tente novamente em alguns instantes."
            );
            return;
        }

        restaurarFiltrosDaURL();

        const categoriaCarregada = await carregarCategoria();
        if (!categoriaCarregada) return;

        await carregarCategoriasProdutos();

        await Promise.allSettled([
            carregarAtalhosCategorias(),
            carregarLojasCategoria(),
            buscarProdutosCategoria()
        ]);
    }

    function mapearElementos() {
        elementos.main = document.querySelector(".categoria-main");
        elementos.breadcrumb = document.getElementById("breadcrumb-categoria");
        elementos.icone = document.getElementById("icone-categoria");
        elementos.titulo = document.getElementById("titulo-categoria");
        elementos.descricao = document.getElementById("descricao-categoria");
        elementos.resumoLojas = document.getElementById("resumo-lojas");
        elementos.resumoProdutos = document.getElementById("resumo-produtos");
        elementos.atalhos = document.getElementById("atalhos-categorias");
        elementos.listaLojas = document.getElementById("lista-lojas-categoria");
        elementos.totalLojas = document.getElementById("total-lojas-categoria");
        elementos.formulario = document.getElementById("filtros-categoria");
        elementos.pesquisa = document.getElementById("pesquisa-produtos-categoria");
        elementos.categoriaProduto = document.getElementById("categoria-produto-categoria");
        elementos.subcategoriaProduto = document.getElementById("subcategoria-produto-categoria");
        elementos.disponibilidade = document.getElementById("disponibilidade-categoria");
        elementos.precoMinimo = document.getElementById("preco-minimo-categoria");
        elementos.precoMaximo = document.getElementById("preco-maximo-categoria");
        elementos.avaliacaoMinima = document.getElementById("avaliacao-minima-categoria");
        elementos.ordenacao = document.getElementById("ordenacao-categoria");
        elementos.limpar = document.getElementById("limpar-filtros-categoria");
        elementos.listaProdutos = document.getElementById("lista-produtos-categoria");
        elementos.totalProdutos = document.getElementById("total-produtos-categoria");
        elementos.paginacao = document.getElementById("paginacao-categoria");
        elementos.secaoProdutos = document.getElementById("produtos-categoria");
        elementos.categoriaInvalida = document.getElementById("categoria-invalida");
    }

    function configurarEventos() {
        elementos.formulario?.addEventListener("submit", event => {
            event.preventDefault();
            executarPesquisaImediata();
        });

        elementos.pesquisa?.addEventListener("input", () => {
            estado.pagina = 1;
            numeroConsultaProdutos += 1;
            clearTimeout(temporizadorPesquisa);
            temporizadorPesquisa = setTimeout(buscarProdutosCategoria, 350);
        });

        elementos.pesquisa?.addEventListener("keydown", event => {
            if (event.key !== "Enter") return;

            event.preventDefault();
            executarPesquisaImediata();
        });

        elementos.categoriaProduto?.addEventListener("change", () => {
            estado.pagina = 1;
            estado.subcategoriaProdutoId = "";
            preencherSubcategoriasProdutos(elementos.categoriaProduto.value);
            buscarProdutosCategoria();
        });

        [
            elementos.subcategoriaProduto,
            elementos.disponibilidade,
            elementos.precoMinimo,
            elementos.precoMaximo,
            elementos.avaliacaoMinima,
            elementos.ordenacao
        ].forEach(campo => {
            campo?.addEventListener("change", () => {
                estado.pagina = 1;
                buscarProdutosCategoria();
            });
        });

        elementos.limpar?.addEventListener("click", limparFiltros);

        elementos.listaLojas?.addEventListener("click", event => {
            if (event.target.closest("[data-recarregar-lojas]")) {
                carregarLojasCategoria();
            }
        });

        elementos.listaProdutos?.addEventListener("click", event => {
            if (event.target.closest("[data-recarregar-produtos-categoria]")) {
                buscarProdutosCategoria();
            }

            if (event.target.closest("[data-limpar-produtos-categoria]")) {
                limparFiltros();
            }
        });

        elementos.paginacao?.addEventListener("click", event => {
            const botao = event.target.closest("button[data-pagina]");
            if (!botao || botao.disabled) return;

            const pagina = Number(botao.dataset.pagina);
            if (!Number.isInteger(pagina) || pagina < 1 || pagina === estado.pagina) return;

            estado.pagina = pagina;
            buscarProdutosCategoria({ rolarAteProdutos: true });
        });
    }

    function obterCategoriaDaURL() {
        const valor = String(new URLSearchParams(window.location.search).get("id") || "");
        if (!/^\d+$/.test(valor)) return null;

        const categoriaId = Number(valor);
        return Number.isSafeInteger(categoriaId) && categoriaId > 0 ? categoriaId : null;
    }

    async function carregarCategoria() {
        try {
            const { data, error } = await window.db
                .from("categorias")
                .select("id,nome,icone,ativa")
                .eq("id", estado.categoriaId)
                .eq("ativa", true)
                .limit(1);

            if (error) throw error;

            const categoria = Array.isArray(data) ? data[0] : null;
            if (!categoria) {
                mostrarCategoriaInvalida(
                    "Categoria não encontrada",
                    "Esta categoria não existe ou não está disponível no momento."
                );
                return false;
            }

            estado.categoria = categoria;
            atualizarCabecalhoCategoria();
            return true;
        } catch (erro) {
            console.error("Erro ao carregar categoria:", erro);
            mostrarCategoriaInvalida(
                "Não foi possível carregar a categoria",
                "Atualize a página e tente novamente em alguns instantes."
            );
            return false;
        }
    }

    async function carregarCategoriasProdutos() {
        if (!elementos.categoriaProduto) return;

        elementos.categoriaProduto.disabled = true;

        try {
            const { data, error } = await window.db
                .from("categorias_produtos")
                .select("id,nome,categoria_pai_id")
                .eq("ativa", true)
                .order("nome", { ascending: true });

            if (error) throw error;

            categoriasProdutos = Array.isArray(data) ? data : [];
            const categoriasRaiz = categoriasProdutos.filter(
                categoria => categoria.categoria_pai_id === null
            );

            preencherSelect(
                elementos.categoriaProduto,
                categoriasRaiz,
                "Todas as categorias"
            );

            elementos.categoriaProduto.value = estado.categoriaProdutoId;
            if (!elementos.categoriaProduto.value) estado.categoriaProdutoId = "";
            elementos.categoriaProduto.disabled = false;

            preencherSubcategoriasProdutos(
                estado.categoriaProdutoId,
                estado.subcategoriaProdutoId
            );
        } catch (erro) {
            console.warn("Não foi possível carregar as categorias dos produtos:", erro);
            elementos.categoriaProduto.disabled = false;
        }
    }

    function preencherSubcategoriasProdutos(categoriaId, selecionada = "") {
        if (!elementos.subcategoriaProduto) return;

        const paiId = Number(categoriaId);
        const subcategorias = Number.isSafeInteger(paiId) && paiId > 0
            ? categoriasProdutos.filter(
                categoria => Number(categoria.categoria_pai_id) === paiId
            )
            : [];

        preencherSelect(
            elementos.subcategoriaProduto,
            subcategorias,
            "Todas as subcategorias"
        );

        elementos.subcategoriaProduto.disabled = subcategorias.length === 0;
        elementos.subcategoriaProduto.value = String(selecionada || "");

        if (!elementos.subcategoriaProduto.value) {
            estado.subcategoriaProdutoId = "";
        }
    }

    function preencherSelect(select, itens, textoInicial) {
        select.replaceChildren();

        const inicial = document.createElement("option");
        inicial.value = "";
        inicial.textContent = textoInicial;
        select.appendChild(inicial);

        itens.forEach(item => {
            const option = document.createElement("option");
            option.value = String(item.id ?? "");
            option.textContent = String(item.nome || "Sem nome");
            select.appendChild(option);
        });
    }

    function atualizarCabecalhoCategoria() {
        const nome = String(estado.categoria?.nome || "Categoria");
        const icone = String(estado.categoria?.icone || "🏪");

        if (elementos.breadcrumb) elementos.breadcrumb.textContent = nome;
        if (elementos.titulo) elementos.titulo.textContent = nome;
        if (elementos.icone) elementos.icone.textContent = icone;
        if (elementos.descricao) {
            elementos.descricao.textContent =
                `Descubra as lojas de ${nome} e compare os produtos disponíveis no comércio local.`;
        }

        document.title = `${nome} | Comércio da Cidade`;

        const metaDescricao = document.querySelector('meta[name="description"]');
        metaDescricao?.setAttribute(
            "content",
            `Encontre lojas e produtos de ${nome} no Comércio da Cidade.`
        );
    }

    async function carregarAtalhosCategorias() {
        if (!elementos.atalhos) return;

        try {
            const { data, error } = await window.db
                .from("categorias")
                .select("id,nome,icone")
                .eq("ativa", true)
                .order("nome", { ascending: true });

            if (error) throw error;

            const categorias = Array.isArray(data) ? data : [];
            elementos.atalhos.innerHTML = categorias.map(categoria => {
                const ativa = Number(categoria.id) === estado.categoriaId;

                return `
                    <a
                        href="categoria.html?id=${encodeURIComponent(categoria.id)}"
                        class="atalho-categoria${ativa ? " ativo" : ""}"
                        ${ativa ? 'aria-current="page"' : ""}
                    >
                        <span aria-hidden="true">${escaparHTML(categoria.icone || "🏪")}</span>
                        ${escaparHTML(categoria.nome || "Categoria")}
                    </a>
                `;
            }).join("");
        } catch (erro) {
            console.warn("Não foi possível carregar os atalhos de categorias:", erro);
            elementos.atalhos.innerHTML = `
                <a class="atalho-categoria" href="index.html#categorias">
                    <i class="fa-solid fa-layer-group" aria-hidden="true"></i>
                    Ver categorias na página inicial
                </a>
            `;
        }
    }

    async function carregarLojasCategoria() {
        if (!elementos.listaLojas) return;

        mostrarCarregamentoLojas();

        try {
            const { data, error } = await window.db
                .from("lojas")
                .select("id,nome,descricao,cidade,estado,logo_url,categoria_id")
                .eq("categoria_id", estado.categoriaId)
                .eq("ativa", true)
                .eq("status_aprovacao", "aprovada")
                .order("nome", { ascending: true });

            if (error) throw error;

            const lojas = Array.isArray(data) ? data : [];
            renderizarLojas(lojas);
            atualizarTotalLojas(lojas.length);
        } catch (erro) {
            console.error("Erro ao carregar lojas da categoria:", erro);
            mostrarErroLojas();

            if (elementos.totalLojas) elementos.totalLojas.textContent = "";
            if (elementos.resumoLojas) elementos.resumoLojas.textContent = "—";
        }
    }

    function mostrarCarregamentoLojas() {
        elementos.listaLojas?.setAttribute("aria-busy", "true");

        if (elementos.listaLojas) {
            elementos.listaLojas.innerHTML = `
                <div class="categoria-estado">
                    <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                    <h3>Carregando lojas...</h3>
                    <p>Estamos buscando os estabelecimentos desta categoria.</p>
                </div>
            `;
        }
    }

    function renderizarLojas(lojas) {
        elementos.listaLojas.setAttribute("aria-busy", "false");

        if (!lojas.length) {
            elementos.listaLojas.innerHTML = `
                <div class="categoria-estado">
                    <i class="fa-solid fa-store-slash" aria-hidden="true"></i>
                    <h3>Ainda não há lojas nesta categoria.</h3>
                    <p>Novos comerciantes poderão aparecer aqui assim que forem aprovados.</p>
                    <a href="cadastrar-loja.html">
                        <i class="fa-solid fa-shop" aria-hidden="true"></i>
                        Cadastrar uma loja
                    </a>
                </div>
            `;
            return;
        }

        elementos.listaLojas.innerHTML = lojas.map(criarCardLoja).join("");
        configurarErrosDeImagemLojas();
    }

    function criarCardLoja(loja) {
        const nome = escaparHTML(loja.nome || "Loja");
        const cidade = escaparHTML(loja.cidade || "Cidade não informada");
        const estadoLoja = escaparHTML(loja.estado || "");
        const descricao = escaparHTML(
            loja.descricao || "Conheça o catálogo e os produtos disponíveis nesta loja."
        );
        const link = `loja.html?id=${encodeURIComponent(loja.id || "")}`;

        const local = estadoLoja ? `${cidade} - ${estadoLoja}` : cidade;
        const logo = loja.logo_url
            ? `<img src="${escaparAtributo(loja.logo_url)}" alt="Logo da ${nome}" loading="lazy">`
            : '<i class="fa-solid fa-store" aria-hidden="true"></i>';

        return `
            <article class="categoria-loja-card">
                <div class="categoria-loja-topo">
                    <div class="categoria-loja-logo">${logo}</div>
                    <div>
                        <h3>${nome}</h3>
                        <span class="categoria-loja-local">
                            <i class="fa-solid fa-location-dot" aria-hidden="true"></i>
                            ${local}
                        </span>
                    </div>
                </div>

                <p class="categoria-loja-descricao">${descricao}</p>

                <a class="categoria-loja-acao" href="${escaparAtributo(link)}">
                    Ver loja
                    <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </a>
            </article>
        `;
    }

    function configurarErrosDeImagemLojas() {
        elementos.listaLojas.querySelectorAll(".categoria-loja-logo img").forEach(imagem => {
            imagem.addEventListener("error", () => {
                const area = imagem.parentElement;
                if (!area) return;

                area.innerHTML = '<i class="fa-solid fa-store" aria-hidden="true"></i>';
            }, { once: true });
        });
    }

    function atualizarTotalLojas(total) {
        if (elementos.totalLojas) {
            elementos.totalLojas.textContent = total === 1 ? "1 loja" : `${total} lojas`;
        }

        if (elementos.resumoLojas) elementos.resumoLojas.textContent = String(total);
    }

    function mostrarErroLojas() {
        elementos.listaLojas?.setAttribute("aria-busy", "false");

        if (elementos.listaLojas) {
            elementos.listaLojas.innerHTML = `
                <div class="categoria-estado">
                    <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                    <h3>Não foi possível carregar as lojas.</h3>
                    <p>Tente novamente em alguns instantes.</p>
                    <button type="button" data-recarregar-lojas>
                        <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
                        Tentar novamente
                    </button>
                </div>
            `;
        }
    }

    async function buscarProdutosCategoria(opcoes = {}) {
        if (!window.db || !elementos.listaProdutos || !estado.categoriaId) return;

        sincronizarFiltros();
        const consultaAtual = ++numeroConsultaProdutos;
        mostrarCarregamentoProdutos();

        const inicio = (estado.pagina - 1) * TAMANHO_PAGINA;
        try {
            const { data, error } = await window.db.rpc("buscar_produtos_publicos", {
                p_termo: estado.termo,
                p_categoria_id: estado.subcategoriaProdutoId
                    ? Number(estado.subcategoriaProdutoId)
                    : (estado.categoriaProdutoId
                        ? Number(estado.categoriaProdutoId)
                        : null),
                p_loja_id: null,
                p_categoria_loja_id: estado.categoriaId,
                p_disponibilidade: estado.disponibilidade || null,
                p_preco_min: estado.precoMinimo === ""
                    ? null
                    : Number(estado.precoMinimo),
                p_preco_max: estado.precoMaximo === ""
                    ? null
                    : Number(estado.precoMaximo),
                p_avaliacao_min: estado.avaliacaoMinima === ""
                    ? null
                    : Number(estado.avaliacaoMinima),
                p_ordenacao: estado.ordenacao,
                p_limite: TAMANHO_PAGINA,
                p_offset: inicio
            });

            if (consultaAtual !== numeroConsultaProdutos) return;
            if (error) throw error;

            const produtos = adaptarProdutosDaBusca(data);
            estado.totalProdutos = obterTotalDaBusca(produtos);

            const totalPaginas = Math.max(
                1,
                Math.ceil(estado.totalProdutos / TAMANHO_PAGINA)
            );

            if (estado.pagina > totalPaginas) {
                estado.pagina = totalPaginas;
                await buscarProdutosCategoria(opcoes);
                return;
            }

            renderizarProdutos(produtos);
            atualizarTotalProdutos();
            renderizarPaginacao(totalPaginas);
            atualizarURL();

            if (opcoes.rolarAteProdutos) {
                elementos.secaoProdutos?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        } catch (erro) {
            if (consultaAtual !== numeroConsultaProdutos) return;

            console.error("Erro ao carregar produtos da categoria:", erro);
            mostrarErroProdutos();

            if (elementos.totalProdutos) elementos.totalProdutos.textContent = "";
            if (elementos.resumoProdutos) elementos.resumoProdutos.textContent = "—";
        }
    }

    function sincronizarFiltros() {
        estado.termo = sanitizarTermo(elementos.pesquisa?.value);
        estado.categoriaProdutoId = String(elementos.categoriaProduto?.value || "");
        estado.subcategoriaProdutoId = String(
            elementos.subcategoriaProduto?.value || ""
        );
        estado.disponibilidade = String(elementos.disponibilidade?.value || "");
        estado.precoMinimo = sanitizarPrecoFiltro(elementos.precoMinimo?.value);
        estado.precoMaximo = sanitizarPrecoFiltro(elementos.precoMaximo?.value);
        estado.avaliacaoMinima = sanitizarAvaliacaoFiltro(
            elementos.avaliacaoMinima?.value
        );
        normalizarFaixaPreco();
        estado.ordenacao = String(elementos.ordenacao?.value || "relevancia");
    }

    function sanitizarPrecoFiltro(valor) {
        const texto = String(valor ?? "").trim();
        if (!texto) return "";

        const numero = Number(texto.replace(",", "."));
        if (!Number.isFinite(numero) || numero < 0) return "";

        return String(Math.min(numero, 1000000));
    }

    function sanitizarAvaliacaoFiltro(valor) {
        const avaliacao = String(valor || "");
        return ["1", "2", "3", "4", "5"].includes(avaliacao) ? avaliacao : "";
    }

    function normalizarFaixaPreco() {
        if (
            estado.precoMinimo === ""
            || estado.precoMaximo === ""
            || Number(estado.precoMinimo) <= Number(estado.precoMaximo)
        ) {
            return;
        }

        [estado.precoMinimo, estado.precoMaximo] = [
            estado.precoMaximo,
            estado.precoMinimo
        ];

        if (elementos.precoMinimo) elementos.precoMinimo.value = estado.precoMinimo;
        if (elementos.precoMaximo) elementos.precoMaximo.value = estado.precoMaximo;
    }

    function adaptarProdutosDaBusca(dados) {
        if (!Array.isArray(dados)) return [];

        return dados.map(produto => ({
            ...produto,
            categorias_produtos: produto.categoria_produto_id
                ? {
                    id: produto.categoria_produto_id,
                    nome: produto.categoria_produto_nome
                }
                : null,
            lojas: {
                id: produto.loja_id,
                nome: produto.loja_nome,
                cidade: produto.loja_cidade,
                logo_url: produto.loja_logo_url,
                categoria_id: produto.loja_categoria_id
            }
        }));
    }

    function obterTotalDaBusca(produtos) {
        const total = Number(produtos[0]?.total_count);
        return Number.isFinite(total) ? total : 0;
    }

    function mostrarCarregamentoProdutos() {
        elementos.listaProdutos.setAttribute("aria-busy", "true");
        elementos.listaProdutos.innerHTML = `
            <div class="estado-produtos-globais">
                <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                <h3>Carregando produtos...</h3>
                <p>Estamos preparando o catálogo desta categoria.</p>
            </div>
        `;
    }

    function renderizarProdutos(produtos) {
        elementos.listaProdutos.setAttribute("aria-busy", "false");

        if (!produtos.length) {
            const temFiltro = Boolean(
                estado.termo
                || estado.categoriaProdutoId
                || estado.subcategoriaProdutoId
                || estado.disponibilidade
                || estado.precoMinimo
                || estado.precoMaximo
                || estado.avaliacaoMinima
            );

            elementos.listaProdutos.innerHTML = `
                <div class="estado-produtos-globais">
                    <i class="fa-solid fa-box-open" aria-hidden="true"></i>
                    <h3>${temFiltro ? "Nenhum produto encontrado." : "Ainda não há produtos nesta categoria."}</h3>
                    <p>${temFiltro ? "Tente outro nome ou remova os filtros." : "Os produtos aparecerão aqui quando as lojas adicionarem seus catálogos."}</p>
                    ${temFiltro ? `
                        <button type="button" data-limpar-produtos-categoria>
                            <i class="fa-solid fa-rotate-left" aria-hidden="true"></i>
                            Limpar pesquisa
                        </button>
                    ` : ""}
                </div>
            `;
            return;
        }

        elementos.listaProdutos.innerHTML = produtos.map(criarCardProduto).join("");
        configurarErrosDeImagemProdutos();
    }

    function criarCardProduto(produto) {
        const loja = obterRelacao(produto.lojas) || {};
        const categoriaProduto = obterRelacao(produto.categorias_produtos) || {};
        const nome = escaparHTML(produto.nome || "Produto");
        const descricao = escaparHTML(
            produto.descricao || "Produto disponível no comércio local."
        );
        const nomeLoja = escaparHTML(loja.nome || "Loja");
        const nomeCategoria = escaparHTML(categoriaProduto.nome || "Sem categoria");
        const produtoId = escaparAtributo(produto.id || "");
        const lojaId = escaparAtributo(loja.id || produto.loja_id || "");
        const estoque = Math.max(0, Number(produto.estoque || 0));
        const preco = Math.max(0, Number(produto.preco || 0));
        const promocional = Math.max(0, Number(produto.preco_promocional || 0));
        const temPromocao = promocional > 0 && promocional < preco;
        const precoAtual = temPromocao ? promocional : preco;
        const totalAvaliacoes = Math.max(0, Number(produto.total_avaliacoes || 0));
        const avaliacaoMedia = totalAvaliacoes > 0
            ? Math.min(5, Math.max(0, Number(produto.avaliacao_media || 0)))
            : 0;
        const totalVendido = Math.max(0, Number(produto.total_vendido || 0));
        const textoAvaliacoes = totalAvaliacoes > 0
            ? `${avaliacaoMedia.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} de 5, ${totalAvaliacoes} ${totalAvaliacoes === 1 ? "avaliação" : "avaliações"}`
            : "Produto ainda sem avaliações";
        const link = `loja.html?id=${encodeURIComponent(loja.id || produto.loja_id || "")}&produto=${encodeURIComponent(produto.id || "")}`;

        const imagem = produto.imagem_url
            ? `
                <img
                    src="${escaparAtributo(produto.imagem_url)}"
                    alt="${nome}"
                    loading="lazy"
                >
                <div class="produto-global-placeholder" hidden>
                    <i class="fa-solid fa-box" aria-hidden="true"></i>
                </div>
            `
            : `
                <div class="produto-global-placeholder">
                    <i class="fa-solid fa-box" aria-hidden="true"></i>
                </div>
            `;

        const precoHTML = temPromocao
            ? `
                <strong>${formatarMoeda(precoAtual)}</strong>
                <span>${formatarMoeda(preco)}</span>
            `
            : `<strong>${formatarMoeda(precoAtual)}</strong>`;

        return `
            <article class="produto-global-card" data-produto-id="${produtoId}" data-loja-id="${lojaId}">
                <div class="produto-global-imagem">
                    ${imagem}
                    ${temPromocao ? '<span class="produto-global-oferta"><i class="fa-solid fa-tag" aria-hidden="true"></i> Oferta</span>' : ""}
                    <button
                        type="button"
                        class="btn-favorito-produto"
                        data-favorito-produto="${produtoId}"
                        data-favorito-nome="${escaparAtributo(produto.nome || "Produto")}"
                        aria-label="Adicionar ${nome} aos favoritos"
                        aria-pressed="false"
                    >
                        <i class="fa-regular fa-heart" aria-hidden="true"></i>
                    </button>
                </div>

                <div class="produto-global-conteudo">
                    <div class="produto-global-meta">
                        <span>${nomeCategoria}</span>
                        <span class="${estoque > 0 ? "em-estoque" : "sem-estoque"}">
                            ${estoque > 0 ? `${estoque} em estoque` : "Sem estoque"}
                        </span>
                    </div>

                    <h3>${nome}</h3>
                    <p class="produto-global-descricao">${descricao}</p>

                    <div class="produto-global-indicadores">
                        <span class="produto-global-avaliacao" aria-label="${escaparAtributo(textoAvaliacoes)}">
                            <i class="fa-solid fa-star" aria-hidden="true"></i>
                            ${totalAvaliacoes > 0
                                ? `<strong>${avaliacaoMedia.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong><small>(${totalAvaliacoes})</small>`
                                : "Sem avaliações"}
                        </span>
                        <span aria-label="${totalVendido} ${totalVendido === 1 ? "unidade vendida" : "unidades vendidas"}">
                            <i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>
                            ${totalVendido} ${totalVendido === 1 ? "vendido" : "vendidos"}
                        </span>
                    </div>

                    <p class="produto-global-loja">
                        <i class="fa-solid fa-store" aria-hidden="true"></i>
                        Vendido por <strong>${nomeLoja}</strong>
                    </p>

                    <div class="produto-global-rodape">
                        <div class="produto-global-preco">${precoHTML}</div>
                        <a href="${escaparAtributo(link)}" aria-label="Ver ${nome} na loja ${nomeLoja}">
                            Ver na loja
                            <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                        </a>
                    </div>
                </div>
            </article>
        `;
    }

    function configurarErrosDeImagemProdutos() {
        elementos.listaProdutos.querySelectorAll(".produto-global-imagem img").forEach(imagem => {
            imagem.addEventListener("error", () => {
                imagem.hidden = true;
                imagem.removeAttribute("src");

                const placeholder = imagem.parentElement?.querySelector(
                    ".produto-global-placeholder"
                );
                if (placeholder) placeholder.hidden = false;
            }, { once: true });
        });
    }

    function atualizarTotalProdutos() {
        const texto = estado.totalProdutos === 1
            ? "1 produto"
            : `${estado.totalProdutos} produtos`;

        if (elementos.totalProdutos) elementos.totalProdutos.textContent = texto;
        if (elementos.resumoProdutos) {
            elementos.resumoProdutos.textContent = String(estado.totalProdutos);
        }
    }

    function mostrarErroProdutos() {
        elementos.listaProdutos?.setAttribute("aria-busy", "false");

        if (elementos.listaProdutos) {
            elementos.listaProdutos.innerHTML = `
                <div class="estado-produtos-globais">
                    <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                    <h3>Não foi possível carregar os produtos.</h3>
                    <p>Tente novamente em alguns instantes.</p>
                    <button type="button" data-recarregar-produtos-categoria>
                        <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
                        Tentar novamente
                    </button>
                </div>
            `;
        }

        if (elementos.paginacao) elementos.paginacao.hidden = true;
    }

    function renderizarPaginacao(totalPaginas) {
        if (!elementos.paginacao) return;

        if (totalPaginas <= 1 || estado.totalProdutos === 0) {
            elementos.paginacao.hidden = true;
            elementos.paginacao.replaceChildren();
            return;
        }

        const paginas = criarJanelaDePaginas(estado.pagina, totalPaginas);
        const botoes = [];

        botoes.push(criarBotaoPagina(
            estado.pagina - 1,
            '<i class="fa-solid fa-chevron-left" aria-hidden="true"></i><span>Anterior</span>',
            estado.pagina === 1,
            "Página anterior"
        ));

        paginas.forEach(pagina => {
            if (pagina === "...") {
                botoes.push('<span class="paginacao-reticencias" aria-hidden="true">…</span>');
                return;
            }

            botoes.push(criarBotaoPagina(
                pagina,
                String(pagina),
                false,
                `Ir para a página ${pagina}`,
                pagina === estado.pagina
            ));
        });

        botoes.push(criarBotaoPagina(
            estado.pagina + 1,
            '<span>Próxima</span><i class="fa-solid fa-chevron-right" aria-hidden="true"></i>',
            estado.pagina === totalPaginas,
            "Próxima página"
        ));

        elementos.paginacao.innerHTML = botoes.join("");
        elementos.paginacao.hidden = false;
    }

    function criarJanelaDePaginas(atual, total) {
        if (total <= 7) {
            return Array.from({ length: total }, (_, indice) => indice + 1);
        }

        if (atual <= 4) return [1, 2, 3, 4, 5, "...", total];
        if (atual >= total - 3) {
            return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
        }
        return [1, "...", atual - 1, atual, atual + 1, "...", total];
    }

    function criarBotaoPagina(pagina, conteudo, desabilitado, rotulo, ativo = false) {
        return `
            <button
                type="button"
                data-pagina="${pagina}"
                aria-label="${escaparAtributo(rotulo)}"
                ${ativo ? 'aria-current="page"' : ""}
                ${desabilitado ? "disabled" : ""}
            >${conteudo}</button>
        `;
    }

    function executarPesquisaImediata() {
        clearTimeout(temporizadorPesquisa);
        estado.pagina = 1;
        buscarProdutosCategoria({ rolarAteProdutos: true });
    }

    function limparFiltros() {
        clearTimeout(temporizadorPesquisa);
        numeroConsultaProdutos += 1;

        if (elementos.pesquisa) elementos.pesquisa.value = "";
        if (elementos.categoriaProduto) elementos.categoriaProduto.value = "";
        estado.categoriaProdutoId = "";
        estado.subcategoriaProdutoId = "";
        preencherSubcategoriasProdutos("");
        if (elementos.disponibilidade) elementos.disponibilidade.value = "";
        if (elementos.precoMinimo) elementos.precoMinimo.value = "";
        if (elementos.precoMaximo) elementos.precoMaximo.value = "";
        if (elementos.avaliacaoMinima) elementos.avaliacaoMinima.value = "";
        if (elementos.ordenacao) elementos.ordenacao.value = "relevancia";

        estado.pagina = 1;
        buscarProdutosCategoria();
    }

    function restaurarFiltrosDaURL() {
        const params = new URLSearchParams(window.location.search);
        const termo = sanitizarTermo(params.get("q"));
        const categoriaProduto = String(params.get("categoria_produto") || "");
        const subcategoriaProduto = String(params.get("subcategoria_produto") || "");
        const disponibilidade = String(params.get("disponibilidade") || "");
        const precoMinimo = sanitizarPrecoFiltro(params.get("preco_minimo"));
        const precoMaximo = sanitizarPrecoFiltro(params.get("preco_maximo"));
        const avaliacaoMinima = sanitizarAvaliacaoFiltro(params.get("avaliacao_minima"));
        const ordenacao = String(params.get("ordenacao") || "relevancia");
        const pagina = Number(params.get("pagina") || 1);

        estado.categoriaProdutoId = /^\d+$/.test(categoriaProduto)
            ? categoriaProduto
            : "";
        estado.subcategoriaProdutoId = /^\d+$/.test(subcategoriaProduto)
            ? subcategoriaProduto
            : "";
        estado.disponibilidade = ["estoque", "esgotado"].includes(disponibilidade)
            ? disponibilidade
            : "";
        estado.precoMinimo = precoMinimo;
        estado.precoMaximo = precoMaximo;
        estado.avaliacaoMinima = avaliacaoMinima;
        normalizarFaixaPreco();
        estado.ordenacao = [
            "relevancia",
            "destaques",
            "nome",
            "menor-preco",
            "maior-preco",
            "mais-vendidos",
            "melhor-avaliados",
            "recentes"
        ].includes(ordenacao)
            ? ordenacao
            : "relevancia";
        estado.pagina = Number.isSafeInteger(pagina) && pagina > 0 ? pagina : 1;

        if (elementos.pesquisa) elementos.pesquisa.value = termo;
        if (elementos.disponibilidade) {
            elementos.disponibilidade.value = estado.disponibilidade;
        }
        if (elementos.precoMinimo) elementos.precoMinimo.value = estado.precoMinimo;
        if (elementos.precoMaximo) elementos.precoMaximo.value = estado.precoMaximo;
        if (elementos.avaliacaoMinima) {
            elementos.avaliacaoMinima.value = estado.avaliacaoMinima;
        }
        if (elementos.ordenacao) elementos.ordenacao.value = estado.ordenacao;
    }

    function atualizarURL() {
        const url = new URL(window.location.href);

        atualizarParametro(url, "q", estado.termo);
        atualizarParametro(url, "categoria_produto", estado.categoriaProdutoId);
        atualizarParametro(url, "subcategoria_produto", estado.subcategoriaProdutoId);
        atualizarParametro(url, "disponibilidade", estado.disponibilidade);
        atualizarParametro(url, "preco_minimo", estado.precoMinimo);
        atualizarParametro(url, "preco_maximo", estado.precoMaximo);
        atualizarParametro(url, "avaliacao_minima", estado.avaliacaoMinima);
        atualizarParametro(
            url,
            "ordenacao",
            estado.ordenacao === "relevancia" ? "" : estado.ordenacao
        );
        atualizarParametro(url, "pagina", estado.pagina > 1 ? estado.pagina : "");

        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }

    function atualizarParametro(url, nome, valor) {
        if (valor) {
            url.searchParams.set(nome, valor);
        } else {
            url.searchParams.delete(nome);
        }
    }

    function mostrarCategoriaInvalida(titulo, mensagem) {
        elementos.main?.classList.add("categoria-main-invalida");

        if (!elementos.categoriaInvalida) return;

        elementos.categoriaInvalida.hidden = false;
        const tituloElemento = elementos.categoriaInvalida.querySelector("h1");
        const mensagemElemento = elementos.categoriaInvalida.querySelector("p");

        if (tituloElemento) tituloElemento.textContent = titulo;
        if (mensagemElemento) mensagemElemento.textContent = mensagem;
        document.title = `${titulo} | Comércio da Cidade`;
    }

    function sanitizarTermo(valor) {
        return String(valor || "")
            .slice(0, LIMITE_TERMO)
            .replace(/[%_\\]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function obterRelacao(valor) {
        return Array.isArray(valor) ? valor[0] || null : valor || null;
    }

    function formatarMoeda(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function escaparHTML(valor) {
        return String(valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function escaparAtributo(valor) {
        return escaparHTML(valor);
    }

    window.buscarProdutosCategoria = buscarProdutosCategoria;
})();
