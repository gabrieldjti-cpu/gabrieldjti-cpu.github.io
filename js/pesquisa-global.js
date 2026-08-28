// ==========================================
// PESQUISA-GLOBAL.JS
// Catálogo público de produtos na página inicial
// ==========================================

(() => {
    "use strict";

    const TAMANHO_PAGINA = 12;
    const LIMITE_TERMO = 80;
    const MINIMO_AUTOCOMPLETE = 2;
    const LIMITE_AUTOCOMPLETE = 6;

    const estado = {
        pagina: 1,
        total: 0,
        termo: "",
        categoriaId: "",
        subcategoriaId: "",
        lojaId: "",
        disponibilidade: "",
        precoMinimo: "",
        precoMaximo: "",
        avaliacaoMinima: "",
        ordenacao: "relevancia"
    };

    const elementos = {};
    let temporizadorPesquisa = null;
    let temporizadorSugestoes = null;
    let numeroConsulta = 0;
    let numeroConsultaSugestoes = 0;
    let ignorarEventoPesquisa = false;
    let indiceSugestaoAtiva = -1;
    let sugestoesAtuais = [];
    let categoriasProdutos = [];

    document.addEventListener("DOMContentLoaded", iniciarPesquisaGlobal);

    async function iniciarPesquisaGlobal() {
        mapearElementos();

        if (!elementos.lista || !elementos.pesquisa) {
            return;
        }

        configurarEventos();
        restaurarFiltrosDaURL();

        if (!window.db) {
            mostrarErro(
                "Não foi possível conectar ao catálogo agora. Atualize a página e tente novamente."
            );
            return;
        }

        await Promise.allSettled([
            carregarCategorias(),
            carregarLojas()
        ]);

        await buscarProdutos();
    }

    function mapearElementos() {
        elementos.pesquisa = document.getElementById("pesquisa");
        elementos.caixaPesquisa = document.getElementById("pesquisa-home");
        elementos.botaoPesquisa = document.getElementById("btnPesquisar");
        elementos.sugestoes = document.getElementById("sugestoes-pesquisa");
        elementos.statusSugestoes = document.getElementById("status-sugestoes-pesquisa");
        elementos.formulario = document.getElementById("filtros-produtos-globais");
        elementos.categoria = document.getElementById("filtro-categoria-produto");
        elementos.subcategoria = document.getElementById("filtro-subcategoria-produto");
        elementos.loja = document.getElementById("filtro-loja-produto");
        elementos.disponibilidade = document.getElementById("filtro-disponibilidade-produto");
        elementos.precoMinimo = document.getElementById("filtro-preco-minimo-produto");
        elementos.precoMaximo = document.getElementById("filtro-preco-maximo-produto");
        elementos.avaliacaoMinima = document.getElementById("filtro-avaliacao-produto");
        elementos.ordenacao = document.getElementById("ordenacao-produtos-globais");
        elementos.limpar = document.getElementById("limpar-filtros-produtos");
        elementos.lista = document.getElementById("lista-produtos-globais");
        elementos.total = document.getElementById("total-produtos-globais");
        elementos.descricao = document.getElementById("descricao-produtos-globais");
        elementos.paginacao = document.getElementById("paginacao-produtos-globais");
        elementos.secao = document.getElementById("produtos-globais");
        elementos.secaoCategoriasDestaque = document.getElementById("categorias-produtos-destaque");
        elementos.listaCategoriasDestaque = document.getElementById("lista-categorias-produtos-destaque");
    }

    function configurarEventos() {
        elementos.formulario?.addEventListener("submit", event => {
            event.preventDefault();
            executarPesquisaImediata();
        });

        elementos.pesquisa?.addEventListener("input", () => {
            if (ignorarEventoPesquisa) return;

            estado.pagina = 1;
            numeroConsulta += 1;
            numeroConsultaSugestoes += 1;
            fecharSugestoes({ limpar: true });
            anunciarSugestoes("");
            clearTimeout(temporizadorPesquisa);
            clearTimeout(temporizadorSugestoes);
            temporizadorPesquisa = setTimeout(buscarProdutos, 350);
            temporizadorSugestoes = setTimeout(buscarSugestoes, 180);
        });

        elementos.pesquisa?.addEventListener("keydown", event => {
            if (tratarTeclaAutocomplete(event)) return;
            if (event.key !== "Enter") return;
            event.preventDefault();
            executarPesquisaImediata();
        });

        elementos.pesquisa?.addEventListener("focus", () => {
            if (sanitizarTermo(elementos.pesquisa?.value).length >= MINIMO_AUTOCOMPLETE) {
                buscarSugestoes();
            }
        });

        elementos.botaoPesquisa?.addEventListener("click", () => {
            fecharSugestoes();
            executarPesquisaImediata();
        });

        elementos.sugestoes?.addEventListener("mousedown", event => {
            if (event.target.closest("[data-sugestao-opcao]")) {
                event.preventDefault();
            }
        });

        elementos.sugestoes?.addEventListener("mousemove", event => {
            const opcao = event.target.closest("[data-sugestao-opcao]");
            if (!opcao) return;

            definirSugestaoAtiva(Number(opcao.dataset.sugestaoIndice));
        });

        elementos.sugestoes?.addEventListener("click", event => {
            const opcao = event.target.closest("[data-sugestao-opcao]");
            if (!opcao) return;

            if (opcao.dataset.acao === "ver-todos") {
                event.preventDefault();
                pesquisarTodosResultados();
            }
        });

        document.addEventListener("click", event => {
            if (!elementos.caixaPesquisa?.contains(event.target)) {
                fecharSugestoes();
            }
        });

        elementos.categoria?.addEventListener("change", () => {
            estado.pagina = 1;
            estado.subcategoriaId = "";
            preencherSubcategorias(elementos.categoria.value);
            fecharSugestoes();
            buscarProdutos();
        });

        [
            elementos.subcategoria,
            elementos.loja,
            elementos.disponibilidade,
            elementos.precoMinimo,
            elementos.precoMaximo,
            elementos.avaliacaoMinima,
            elementos.ordenacao
        ].forEach(campo => {
            campo?.addEventListener("change", () => {
                estado.pagina = 1;
                fecharSugestoes();
                buscarProdutos();
            });
        });

        elementos.limpar?.addEventListener("click", limparFiltros);

        elementos.lista?.addEventListener("click", event => {
            const tentarNovamente = event.target.closest("[data-recarregar-produtos]");
            const limparBusca = event.target.closest("[data-limpar-pesquisa-global]");

            if (tentarNovamente) {
                buscarProdutos();
            }

            if (limparBusca) {
                limparFiltros();
            }
        });

        elementos.paginacao?.addEventListener("click", event => {
            const botao = event.target.closest("button[data-pagina]");
            if (!botao || botao.disabled) return;

            const pagina = Number(botao.dataset.pagina);
            if (!Number.isInteger(pagina) || pagina < 1 || pagina === estado.pagina) return;

            estado.pagina = pagina;
            buscarProdutos({ rolarAteSecao: true });
        });
    }

    function executarPesquisaImediata() {
        clearTimeout(temporizadorPesquisa);
        clearTimeout(temporizadorSugestoes);
        numeroConsultaSugestoes += 1;
        estado.pagina = 1;
        fecharSugestoes();
        buscarProdutos();
    }

    async function buscarSugestoes() {
        const termo = sanitizarTermo(elementos.pesquisa?.value);

        if (!window.db || !elementos.sugestoes || termo.length < MINIMO_AUTOCOMPLETE) {
            fecharSugestoes({ limpar: true });
            anunciarSugestoes("");
            return;
        }

        const consultaAtual = ++numeroConsultaSugestoes;
        mostrarCarregamentoSugestoes();

        try {
            const categoriaId = String(elementos.categoria?.value || "");
            const subcategoriaId = String(elementos.subcategoria?.value || "");
            const lojaId = String(elementos.loja?.value || "");
            const disponibilidade = String(elementos.disponibilidade?.value || "");
            const precoMinimo = sanitizarPrecoFiltro(elementos.precoMinimo?.value);
            const precoMaximo = sanitizarPrecoFiltro(elementos.precoMaximo?.value);
            const avaliacaoMinima = sanitizarAvaliacaoFiltro(
                elementos.avaliacaoMinima?.value
            );

            const { data, error } = await window.db.rpc("buscar_produtos_publicos", {
                p_termo: termo,
                p_categoria_id: subcategoriaId
                    ? Number(subcategoriaId)
                    : (categoriaId ? Number(categoriaId) : null),
                p_loja_id: lojaId || null,
                p_categoria_loja_id: null,
                p_disponibilidade: disponibilidade || null,
                p_preco_min: precoMinimo === "" ? null : Number(precoMinimo),
                p_preco_max: precoMaximo === "" ? null : Number(precoMaximo),
                p_avaliacao_min: avaliacaoMinima === ""
                    ? null
                    : Number(avaliacaoMinima),
                p_ordenacao: "relevancia",
                p_limite: LIMITE_AUTOCOMPLETE,
                p_offset: 0
            });

            if (consultaAtual !== numeroConsultaSugestoes) return;
            if (error) throw error;

            renderizarSugestoes(adaptarProdutosDaBusca(data), termo);
        } catch (erro) {
            if (consultaAtual !== numeroConsultaSugestoes) return;

            console.warn("Não foi possível carregar o autocomplete:", erro);
            mostrarEstadoSugestoes(
                "fa-circle-exclamation",
                "Sugestões indisponíveis. Pressione Enter para pesquisar."
            );
            anunciarSugestoes("Sugestões indisponíveis. Pressione Enter para pesquisar.");
        }
    }

    function mostrarCarregamentoSugestoes() {
        sugestoesAtuais = [];
        indiceSugestaoAtiva = -1;
        mostrarEstadoSugestoes("fa-spinner fa-spin", "Buscando sugestões...");
        anunciarSugestoes("Buscando sugestões.");
    }

    function mostrarEstadoSugestoes(icone, mensagem) {
        if (!elementos.sugestoes) return;

        elementos.sugestoes.innerHTML = `
            <div class="sugestoes-estado" role="status">
                <i class="fa-solid ${escaparAtributo(icone)}" aria-hidden="true"></i>
                <span>${escaparHTML(mensagem)}</span>
            </div>
        `;

        abrirSugestoes();
    }

    function renderizarSugestoes(produtos, termo) {
        if (!elementos.sugestoes) return;

        indiceSugestaoAtiva = -1;
        sugestoesAtuais = produtos.map(produto => ({
            tipo: "produto",
            href: criarLinkProduto(produto)
        }));

        if (!produtos.length) {
            mostrarEstadoSugestoes(
                "fa-magnifying-glass",
                `Nenhum produto sugerido para “${termo}”. Pressione Enter para pesquisar.`
            );
            anunciarSugestoes(`Nenhuma sugestão encontrada para ${termo}.`);
            return;
        }

        sugestoesAtuais.push({ tipo: "todos" });

        const itens = produtos.map((produto, indice) => criarSugestaoProduto(produto, indice));
        const indiceTodos = produtos.length;

        elementos.sugestoes.innerHTML = `
            <div class="sugestoes-cabecalho" role="presentation" aria-hidden="true">
                <span>Sugestões de produtos</span>
                <small>Use ↑ ↓ e Enter</small>
            </div>

            ${itens.join("")}

            <button
                type="button"
                id="sugestao-pesquisa-${indiceTodos}"
                class="sugestao-ver-todos"
                role="option"
                aria-selected="false"
                data-sugestao-opcao
                data-sugestao-indice="${indiceTodos}"
                data-acao="ver-todos"
            >
                <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                Ver todos os resultados para “${escaparHTML(termo)}”
            </button>
        `;

        configurarErrosDeImagemSugestoes();
        abrirSugestoes();
        anunciarSugestoes(
            `${produtos.length} ${produtos.length === 1 ? "sugestão disponível" : "sugestões disponíveis"}. Use as setas para navegar.`
        );
    }

    function criarSugestaoProduto(produto, indice) {
        const loja = obterRelacao(produto.lojas) || {};
        const nome = escaparHTML(produto.nome || "Produto");
        const nomeLoja = escaparHTML(loja.nome || "Loja");
        const preco = Math.max(0, Number(produto.preco || 0));
        const promocional = Math.max(0, Number(produto.preco_promocional || 0));
        const precoAtual = promocional > 0 && promocional < preco ? promocional : preco;
        const link = criarLinkProduto(produto);

        const imagem = produto.imagem_url
            ? `<img src="${escaparAtributo(produto.imagem_url)}" alt="" loading="lazy">`
            : '<i class="fa-solid fa-box" aria-hidden="true"></i>';

        return `
            <a
                href="${escaparAtributo(link)}"
                id="sugestao-pesquisa-${indice}"
                class="sugestao-produto"
                role="option"
                aria-selected="false"
                data-sugestao-opcao
                data-sugestao-indice="${indice}"
            >
                <span class="sugestao-produto-imagem">${imagem}</span>
                <span class="sugestao-produto-info">
                    <strong>${nome}</strong>
                    <span>Vendido por ${nomeLoja}</span>
                </span>
                <span class="sugestao-produto-preco">${formatarMoeda(precoAtual)}</span>
            </a>
        `;
    }

    function criarLinkProduto(produto) {
        const loja = obterRelacao(produto.lojas) || {};
        const lojaId = loja.id || produto.loja_id || "";
        const produtoId = produto.id || "";

        return `loja.html?id=${encodeURIComponent(lojaId)}&produto=${encodeURIComponent(produtoId)}`;
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

    function configurarErrosDeImagemSugestoes() {
        elementos.sugestoes?.querySelectorAll(".sugestao-produto-imagem img").forEach(imagem => {
            imagem.addEventListener("error", () => {
                const contenedor = imagem.parentElement;
                if (!contenedor) return;

                contenedor.innerHTML = '<i class="fa-solid fa-box" aria-hidden="true"></i>';
            }, { once: true });
        });
    }

    function tratarTeclaAutocomplete(event) {
        const aberta = elementos.pesquisa?.getAttribute("aria-expanded") === "true";

        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const opcoes = obterOpcoesSugestoes();

            if (!aberta && opcoes.length) {
                abrirSugestoes();
            } else if (!aberta) {
                buscarSugestoes();
            }

            if (opcoes.length) {
                moverSugestaoAtiva(event.key === "ArrowDown" ? 1 : -1);
            }

            return true;
        }

        if (event.key === "Escape" && aberta) {
            event.preventDefault();
            fecharSugestoes();
            return true;
        }

        if (event.key === "Enter" && aberta && indiceSugestaoAtiva >= 0) {
            event.preventDefault();
            event.stopImmediatePropagation();
            ativarSugestaoSelecionada();
            return true;
        }

        if (event.key === "Tab" && aberta) {
            fecharSugestoes();
        }

        return false;
    }

    function obterOpcoesSugestoes() {
        return Array.from(
            elementos.sugestoes?.querySelectorAll("[data-sugestao-opcao]") || []
        );
    }

    function moverSugestaoAtiva(direcao) {
        const opcoes = obterOpcoesSugestoes();
        if (!opcoes.length) return;

        const proximoIndice = indiceSugestaoAtiva < 0
            ? (direcao > 0 ? 0 : opcoes.length - 1)
            : (indiceSugestaoAtiva + direcao + opcoes.length) % opcoes.length;

        definirSugestaoAtiva(proximoIndice);
    }

    function definirSugestaoAtiva(indice) {
        const opcoes = obterOpcoesSugestoes();
        if (!opcoes.length || !Number.isInteger(indice) || indice < 0 || indice >= opcoes.length) {
            return;
        }

        opcoes.forEach(opcao => {
            opcao.classList.remove("ativa");
            opcao.setAttribute("aria-selected", "false");
        });

        const ativa = opcoes[indice];
        indiceSugestaoAtiva = indice;
        ativa.classList.add("ativa");
        ativa.setAttribute("aria-selected", "true");
        elementos.pesquisa?.setAttribute("aria-activedescendant", ativa.id);
        ativa.scrollIntoView({ block: "nearest" });
    }

    function ativarSugestaoSelecionada() {
        const sugestao = sugestoesAtuais[indiceSugestaoAtiva];
        if (!sugestao) return;

        if (sugestao.tipo === "todos") {
            pesquisarTodosResultados();
            return;
        }

        if (sugestao.href) {
            window.location.href = sugestao.href;
        }
    }

    function pesquisarTodosResultados() {
        fecharSugestoes();
        executarPesquisaImediata();
        elementos.secao?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function abrirSugestoes() {
        if (!elementos.sugestoes || !elementos.pesquisa) return;

        elementos.sugestoes.hidden = false;
        elementos.pesquisa.setAttribute("aria-expanded", "true");
    }

    function fecharSugestoes(opcoes = {}) {
        if (!elementos.sugestoes || !elementos.pesquisa) return;

        elementos.sugestoes.hidden = true;
        elementos.pesquisa.setAttribute("aria-expanded", "false");
        elementos.pesquisa.removeAttribute("aria-activedescendant");
        indiceSugestaoAtiva = -1;

        if (opcoes.limpar) {
            elementos.sugestoes.replaceChildren();
            sugestoesAtuais = [];
        }
    }

    function anunciarSugestoes(mensagem) {
        if (elementos.statusSugestoes) {
            elementos.statusSugestoes.textContent = mensagem;
        }
    }

    async function carregarCategorias() {
        if (!elementos.categoria) return;

        elementos.categoria.disabled = true;

        const { data, error } = await window.db
            .from("categorias_produtos")
            .select("id,nome,categoria_pai_id,icone,destaque,ordem_destaque")
            .eq("ativa", true)
            .order("nome", { ascending: true });

        if (error) {
            console.warn("Não foi possível carregar as categorias da pesquisa:", error);
            elementos.categoria.disabled = false;
            return;
        }

        categoriasProdutos = Array.isArray(data) ? data : [];
        const categoriasRaiz = categoriasProdutos.filter(
            categoria => categoria.categoria_pai_id === null
        );

        adicionarOpcoes(
            elementos.categoria,
            categoriasRaiz,
            "Todas as categorias"
        );

        elementos.categoria.value = estado.categoriaId;
        if (!elementos.categoria.value) estado.categoriaId = "";
        elementos.categoria.disabled = false;
        preencherSubcategorias(estado.categoriaId, estado.subcategoriaId);
        renderizarCategoriasProdutosDestaque();
    }

    function renderizarCategoriasProdutosDestaque() {
        if (!elementos.secaoCategoriasDestaque || !elementos.listaCategoriasDestaque) return;

        const destaques = categoriasProdutos
            .filter(categoria => (
                categoria.categoria_pai_id === null
                && categoria.destaque === true
            ))
            .sort((a, b) => {
                const ordemA = Number(a.ordem_destaque) || 99;
                const ordemB = Number(b.ordem_destaque) || 99;
                return ordemA - ordemB
                    || String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR");
            });

        if (destaques.length === 0) {
            elementos.listaCategoriasDestaque.replaceChildren();
            elementos.secaoCategoriasDestaque.hidden = true;
            return;
        }

        elementos.listaCategoriasDestaque.innerHTML = destaques.map(categoria => {
            const id = Number(categoria.id);
            const nome = escaparHTML(categoria.nome || "Categoria");
            const icone = escaparHTML(categoria.icone || "📦");

            return `
                <a
                    class="categoria-produto-destaque"
                    href="index.html?categoria_produto=${id}#produtos-globais"
                    aria-label="Ver produtos de ${nome}"
                >
                    <span class="categoria-produto-destaque-icone" aria-hidden="true">${icone}</span>
                    <span>
                        <strong>${nome}</strong>
                        <small>Explorar produtos</small>
                    </span>
                    <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </a>
            `;
        }).join("");

        elementos.secaoCategoriasDestaque.hidden = false;
    }

    function preencherSubcategorias(categoriaId, selecionada = "") {
        if (!elementos.subcategoria) return;

        const paiId = Number(categoriaId);
        const subcategorias = Number.isSafeInteger(paiId) && paiId > 0
            ? categoriasProdutos.filter(
                categoria => Number(categoria.categoria_pai_id) === paiId
            )
            : [];

        adicionarOpcoes(
            elementos.subcategoria,
            subcategorias,
            "Todas as subcategorias"
        );

        elementos.subcategoria.disabled = subcategorias.length === 0;
        elementos.subcategoria.value = String(selecionada || "");

        if (!elementos.subcategoria.value) {
            estado.subcategoriaId = "";
        }
    }

    async function carregarLojas() {
        if (!elementos.loja) return;

        elementos.loja.disabled = true;

        const { data, error } = await window.db
            .from("lojas")
            .select("id,nome")
            .eq("ativa", true)
            .eq("status_aprovacao", "aprovada")
            .order("nome", { ascending: true });

        if (error) {
            console.warn("Não foi possível carregar as lojas da pesquisa:", error);
            elementos.loja.disabled = false;
            return;
        }

        adicionarOpcoes(
            elementos.loja,
            Array.isArray(data) ? data : [],
            "Todas as lojas"
        );

        elementos.loja.value = estado.lojaId;
        elementos.loja.disabled = false;
    }

    function adicionarOpcoes(select, itens, textoInicial) {
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

    async function buscarProdutos(opcoes = {}) {
        if (!window.db || !elementos.lista) return;

        sincronizarEstadoComCampos();

        const consultaAtual = ++numeroConsulta;
        mostrarCarregamento();

        const inicio = (estado.pagina - 1) * TAMANHO_PAGINA;
        try {
            const { data, error } = await window.db.rpc("buscar_produtos_publicos", {
                p_termo: estado.termo,
                p_categoria_id: estado.subcategoriaId
                    ? Number(estado.subcategoriaId)
                    : (estado.categoriaId ? Number(estado.categoriaId) : null),
                p_loja_id: estado.lojaId || null,
                p_categoria_loja_id: null,
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

            if (consultaAtual !== numeroConsulta) return;
            if (error) throw error;

            const produtos = adaptarProdutosDaBusca(data);
            estado.total = obterTotalDaBusca(produtos);

            const totalPaginas = Math.max(1, Math.ceil(estado.total / TAMANHO_PAGINA));
            if (estado.pagina > totalPaginas) {
                estado.pagina = totalPaginas;
                await buscarProdutos(opcoes);
                return;
            }

            renderizarProdutos(produtos);
            renderizarPaginacao(totalPaginas);
            atualizarResumo();
            atualizarURL();

            if (opcoes.rolarAteSecao) {
                elementos.secao?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        } catch (erro) {
            if (consultaAtual !== numeroConsulta) return;

            console.error("Erro na pesquisa global de produtos:", erro);
            mostrarErro("Não foi possível pesquisar os produtos agora. Tente novamente.");
        }
    }

    function sincronizarEstadoComCampos() {
        estado.termo = sanitizarTermo(elementos.pesquisa?.value);
        estado.categoriaId = String(elementos.categoria?.value || "");
        estado.subcategoriaId = String(elementos.subcategoria?.value || "");
        estado.lojaId = String(elementos.loja?.value || "");
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

    function sanitizarTermo(valor) {
        return String(valor || "")
            .slice(0, LIMITE_TERMO)
            .replace(/[%_\\]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function mostrarCarregamento() {
        elementos.lista.setAttribute("aria-busy", "true");
        elementos.lista.innerHTML = `
            <div class="estado-produtos-globais">
                <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                <h3>Pesquisando produtos...</h3>
                <p>Aguarde enquanto consultamos as lojas da cidade.</p>
            </div>
        `;
    }

    function renderizarProdutos(produtos) {
        elementos.lista.setAttribute("aria-busy", "false");

        if (!produtos.length) {
            elementos.lista.innerHTML = `
                <div class="estado-produtos-globais">
                    <i class="fa-solid fa-box-open" aria-hidden="true"></i>
                    <h3>Nenhum produto encontrado.</h3>
                    <p>Tente outro nome ou remova alguns filtros.</p>
                    <button type="button" data-limpar-pesquisa-global>
                        <i class="fa-solid fa-rotate-left" aria-hidden="true"></i>
                        Limpar pesquisa
                    </button>
                </div>
            `;
            return;
        }

        elementos.lista.innerHTML = produtos.map(criarCardProduto).join("");
        configurarErrosDeImagem();
    }

    function criarCardProduto(produto) {
        const loja = obterRelacao(produto.lojas) || {};
        const categoria = obterRelacao(produto.categorias_produtos) || {};
        const nome = escaparHTML(produto.nome || "Produto");
        const descricao = escaparHTML(produto.descricao || "Produto disponível no comércio local.");
        const nomeLoja = escaparHTML(loja.nome || "Loja");
        const nomeCategoria = escaparHTML(categoria.nome || "Sem categoria");
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

    function obterRelacao(valor) {
        return Array.isArray(valor) ? valor[0] || null : valor || null;
    }

    function configurarErrosDeImagem() {
        elementos.lista.querySelectorAll(".produto-global-imagem img").forEach(imagem => {
            imagem.addEventListener("error", () => {
                imagem.hidden = true;
                imagem.removeAttribute("src");

                const placeholder = imagem.parentElement?.querySelector(".produto-global-placeholder");
                if (placeholder) placeholder.hidden = false;
            }, { once: true });
        });
    }

    function renderizarPaginacao(totalPaginas) {
        if (!elementos.paginacao) return;

        if (totalPaginas <= 1 || estado.total === 0) {
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
        if (atual >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
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

    function atualizarResumo() {
        if (elementos.total) {
            elementos.total.textContent = estado.total === 1
                ? "1 produto"
                : `${estado.total} produtos`;
        }

        if (!elementos.descricao) return;

        elementos.descricao.textContent = estado.termo
            ? `Resultados para “${estado.termo}” nas lojas da cidade.`
            : "Pesquise e compare produtos disponíveis no comércio local.";
    }

    function mostrarErro(mensagem) {
        elementos.lista?.setAttribute("aria-busy", "false");

        if (elementos.lista) {
            elementos.lista.innerHTML = `
                <div class="estado-produtos-globais">
                    <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                    <h3>Não foi possível carregar os produtos.</h3>
                    <p>${escaparHTML(mensagem)}</p>
                    <button type="button" data-recarregar-produtos>
                        <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
                        Tentar novamente
                    </button>
                </div>
            `;
        }

        if (elementos.paginacao) elementos.paginacao.hidden = true;
    }

    function limparFiltros() {
        clearTimeout(temporizadorPesquisa);
        clearTimeout(temporizadorSugestoes);
        numeroConsultaSugestoes += 1;
        fecharSugestoes({ limpar: true });
        anunciarSugestoes("");

        if (elementos.pesquisa) elementos.pesquisa.value = "";
        if (elementos.categoria) elementos.categoria.value = "";
        estado.subcategoriaId = "";
        preencherSubcategorias("");
        if (elementos.loja) elementos.loja.value = "";
        if (elementos.disponibilidade) elementos.disponibilidade.value = "";
        if (elementos.precoMinimo) elementos.precoMinimo.value = "";
        if (elementos.precoMaximo) elementos.precoMaximo.value = "";
        if (elementos.avaliacaoMinima) elementos.avaliacaoMinima.value = "";
        if (elementos.ordenacao) elementos.ordenacao.value = "relevancia";

        estado.pagina = 1;
        ignorarEventoPesquisa = true;
        elementos.pesquisa?.dispatchEvent(new Event("input", { bubbles: true }));
        ignorarEventoPesquisa = false;
        buscarProdutos();
    }

    function restaurarFiltrosDaURL() {
        const params = new URLSearchParams(window.location.search);

        const termo = String(params.get("q") || "").slice(0, LIMITE_TERMO);
        const categoria = String(params.get("categoria_produto") || "");
        const subcategoria = String(params.get("subcategoria_produto") || "");
        const loja = String(params.get("loja_produto") || "");
        const disponibilidade = String(params.get("disponibilidade") || "");
        const precoMinimo = sanitizarPrecoFiltro(params.get("preco_minimo"));
        const precoMaximo = sanitizarPrecoFiltro(params.get("preco_maximo"));
        const avaliacaoMinima = sanitizarAvaliacaoFiltro(params.get("avaliacao_minima"));
        const ordenacao = String(params.get("ordenacao") || "relevancia");

        if (elementos.pesquisa && termo) elementos.pesquisa.value = termo;
        estado.categoriaId = /^\d+$/.test(categoria) ? categoria : "";
        estado.subcategoriaId = /^\d+$/.test(subcategoria) ? subcategoria : "";
        estado.lojaId = /^[0-9a-f-]{36}$/i.test(loja) ? loja : "";
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

        if (elementos.disponibilidade) elementos.disponibilidade.value = estado.disponibilidade;
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
        atualizarParametro(url, "categoria_produto", estado.categoriaId);
        atualizarParametro(url, "subcategoria_produto", estado.subcategoriaId);
        atualizarParametro(url, "loja_produto", estado.lojaId);
        atualizarParametro(url, "disponibilidade", estado.disponibilidade);
        atualizarParametro(url, "preco_minimo", estado.precoMinimo);
        atualizarParametro(url, "preco_maximo", estado.precoMaximo);
        atualizarParametro(url, "avaliacao_minima", estado.avaliacaoMinima);
        atualizarParametro(url, "ordenacao", estado.ordenacao === "relevancia" ? "" : estado.ordenacao);

        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }

    function atualizarParametro(url, nome, valor) {
        if (valor) {
            url.searchParams.set(nome, valor);
        } else {
            url.searchParams.delete(nome);
        }
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

    window.buscarProdutosGlobais = buscarProdutos;
})();
