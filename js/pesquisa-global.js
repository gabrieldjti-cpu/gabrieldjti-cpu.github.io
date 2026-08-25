// ==========================================
// PESQUISA-GLOBAL.JS
// Catálogo público de produtos na página inicial
// ==========================================

(() => {
    "use strict";

    const TAMANHO_PAGINA = 12;
    const LIMITE_TERMO = 80;

    const estado = {
        pagina: 1,
        total: 0,
        termo: "",
        categoriaId: "",
        lojaId: "",
        disponibilidade: "",
        ordenacao: "destaques"
    };

    const elementos = {};
    let temporizadorPesquisa = null;
    let numeroConsulta = 0;
    let ignorarEventoPesquisa = false;

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
        elementos.botaoPesquisa = document.getElementById("btnPesquisar");
        elementos.formulario = document.getElementById("filtros-produtos-globais");
        elementos.categoria = document.getElementById("filtro-categoria-produto");
        elementos.loja = document.getElementById("filtro-loja-produto");
        elementos.disponibilidade = document.getElementById("filtro-disponibilidade-produto");
        elementos.ordenacao = document.getElementById("ordenacao-produtos-globais");
        elementos.limpar = document.getElementById("limpar-filtros-produtos");
        elementos.lista = document.getElementById("lista-produtos-globais");
        elementos.total = document.getElementById("total-produtos-globais");
        elementos.descricao = document.getElementById("descricao-produtos-globais");
        elementos.paginacao = document.getElementById("paginacao-produtos-globais");
        elementos.secao = document.getElementById("produtos-globais");
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
            clearTimeout(temporizadorPesquisa);
            temporizadorPesquisa = setTimeout(buscarProdutos, 350);
        });

        elementos.pesquisa?.addEventListener("keydown", event => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            executarPesquisaImediata();
        });

        elementos.botaoPesquisa?.addEventListener("click", executarPesquisaImediata);

        [
            elementos.categoria,
            elementos.loja,
            elementos.disponibilidade,
            elementos.ordenacao
        ].forEach(campo => {
            campo?.addEventListener("change", () => {
                estado.pagina = 1;
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
        estado.pagina = 1;
        buscarProdutos();
    }

    async function carregarCategorias() {
        if (!elementos.categoria) return;

        elementos.categoria.disabled = true;

        const { data, error } = await window.db
            .from("categorias_produtos")
            .select("id,nome")
            .eq("ativa", true)
            .order("nome", { ascending: true });

        if (error) {
            console.warn("Não foi possível carregar as categorias da pesquisa:", error);
            elementos.categoria.disabled = false;
            return;
        }

        adicionarOpcoes(
            elementos.categoria,
            Array.isArray(data) ? data : [],
            "Todas as categorias"
        );

        elementos.categoria.value = estado.categoriaId;
        elementos.categoria.disabled = false;
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
        const fim = inicio + TAMANHO_PAGINA - 1;

        try {
            let consulta = window.db
                .from("produtos")
                .select(`
                    id,
                    loja_id,
                    categoria_id,
                    nome,
                    descricao,
                    preco,
                    preco_promocional,
                    estoque,
                    imagem_url,
                    destaque,
                    created_at,
                    categorias_produtos!categoria_id(
                        id,
                        nome
                    ),
                    lojas!inner(
                        id,
                        nome,
                        cidade,
                        logo_url,
                        ativa,
                        status_aprovacao
                    )
                `, { count: "exact" })
                .eq("ativo", true)
                .eq("lojas.ativa", true)
                .eq("lojas.status_aprovacao", "aprovada");

            if (estado.termo) {
                consulta = consulta.ilike("nome", `%${estado.termo}%`);
            }

            if (estado.categoriaId) {
                consulta = consulta.eq("categoria_id", Number(estado.categoriaId));
            }

            if (estado.lojaId) {
                consulta = consulta.eq("loja_id", estado.lojaId);
            }

            if (estado.disponibilidade === "estoque") {
                consulta = consulta.gt("estoque", 0);
            } else if (estado.disponibilidade === "esgotado") {
                consulta = consulta.eq("estoque", 0);
            }

            consulta = aplicarOrdenacao(consulta).range(inicio, fim);

            const { data, error, count } = await consulta;

            if (consultaAtual !== numeroConsulta) return;
            if (error) throw error;

            const produtos = Array.isArray(data) ? data : [];
            estado.total = Number.isFinite(Number(count)) ? Number(count) : produtos.length;

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

    function aplicarOrdenacao(consulta) {
        switch (estado.ordenacao) {
            case "nome":
                return consulta.order("nome", { ascending: true });
            case "menor-preco":
                return consulta.order("preco", { ascending: true }).order("nome", { ascending: true });
            case "maior-preco":
                return consulta.order("preco", { ascending: false }).order("nome", { ascending: true });
            case "recentes":
                return consulta.order("created_at", { ascending: false }).order("nome", { ascending: true });
            default:
                return consulta.order("destaque", { ascending: false }).order("nome", { ascending: true });
        }
    }

    function sincronizarEstadoComCampos() {
        estado.termo = sanitizarTermo(elementos.pesquisa?.value);
        estado.categoriaId = String(elementos.categoria?.value || "");
        estado.lojaId = String(elementos.loja?.value || "");
        estado.disponibilidade = String(elementos.disponibilidade?.value || "");
        estado.ordenacao = String(elementos.ordenacao?.value || "destaques");
    }

    function sanitizarTermo(valor) {
        return String(valor || "")
            .slice(0, LIMITE_TERMO)
            .replace(/[%_]/g, " ")
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

        if (elementos.pesquisa) elementos.pesquisa.value = "";
        if (elementos.categoria) elementos.categoria.value = "";
        if (elementos.loja) elementos.loja.value = "";
        if (elementos.disponibilidade) elementos.disponibilidade.value = "";
        if (elementos.ordenacao) elementos.ordenacao.value = "destaques";

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
        const loja = String(params.get("loja_produto") || "");
        const disponibilidade = String(params.get("disponibilidade") || "");
        const ordenacao = String(params.get("ordenacao") || "destaques");

        if (elementos.pesquisa && termo) elementos.pesquisa.value = termo;
        estado.categoriaId = /^\d+$/.test(categoria) ? categoria : "";
        estado.lojaId = /^[0-9a-f-]{36}$/i.test(loja) ? loja : "";
        estado.disponibilidade = ["estoque", "esgotado"].includes(disponibilidade)
            ? disponibilidade
            : "";
        estado.ordenacao = ["destaques", "nome", "menor-preco", "maior-preco", "recentes"].includes(ordenacao)
            ? ordenacao
            : "destaques";

        if (elementos.disponibilidade) elementos.disponibilidade.value = estado.disponibilidade;
        if (elementos.ordenacao) elementos.ordenacao.value = estado.ordenacao;
    }

    function atualizarURL() {
        const url = new URL(window.location.href);

        atualizarParametro(url, "q", estado.termo);
        atualizarParametro(url, "categoria_produto", estado.categoriaId);
        atualizarParametro(url, "loja_produto", estado.lojaId);
        atualizarParametro(url, "disponibilidade", estado.disponibilidade);
        atualizarParametro(url, "ordenacao", estado.ordenacao === "destaques" ? "" : estado.ordenacao);

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
