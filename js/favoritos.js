// ==========================================
// PÁGINA MEUS FAVORITOS - RF-07
// ==========================================

(() => {
    "use strict";

    const TAMANHO_PAGINA = 12;
    const CHAVE_RETORNO_LOGIN = "destino_apos_login_favoritos";
    const estado = {
        usuarioId: null,
        pagina: 1,
        total: 0,
        itens: []
    };

    const elementos = {};

    function mapearElementos() {
        elementos.lista = document.getElementById("lista-favoritos");
        elementos.total = document.getElementById("total-favoritos");
        elementos.rotuloTotal = document.getElementById("rotulo-total-favoritos");
        elementos.paginacao = document.getElementById("paginacao-favoritos");
    }

    function notificar(mensagem, tipo = "info", titulo = null) {
        if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(mensagem, tipo, titulo);
        }
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
        return escaparHTML(valor).replaceAll("`", "&#096;");
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

    function salvarRetornoLogin() {
        try {
            sessionStorage.setItem(CHAVE_RETORNO_LOGIN, "favoritos.html");
        } catch (erro) {
            console.warn("Não foi possível salvar o retorno do login:", erro);
        }
    }

    async function verificarUsuario() {
        if (!window.db) throw new Error("Supabase não foi inicializado.");

        const { data: sessaoData, error: sessaoError } =
            await window.db.auth.getSession();

        if (sessaoError) throw sessaoError;

        if (!sessaoData?.session) {
            salvarRetornoLogin();
            window.location.replace("login.html");
            return false;
        }

        const { data: usuarioData, error: usuarioError } =
            await window.db.auth.getUser();

        if (usuarioError || !usuarioData?.user) {
            salvarRetornoLogin();
            window.location.replace("login.html");
            return false;
        }

        estado.usuarioId = usuarioData.user.id;
        return true;
    }

    function renderizarCarregando() {
        elementos.lista.setAttribute("aria-busy", "true");
        elementos.lista.innerHTML = `
            <div class="favoritos-estado">
                <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                <h3>Carregando seus favoritos...</h3>
                <p>Estamos buscando os produtos que você salvou.</p>
            </div>
        `;
    }

    function renderizarErro() {
        elementos.lista.setAttribute("aria-busy", "false");
        elementos.lista.innerHTML = `
            <div class="favoritos-estado">
                <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
                <h3>Não foi possível carregar seus favoritos.</h3>
                <p>Confira sua conexão e tente novamente.</p>
                <button type="button" data-recarregar-favoritos>
                    <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
                    Tentar novamente
                </button>
            </div>
        `;
    }

    function renderizarVazio() {
        elementos.lista.setAttribute("aria-busy", "false");
        elementos.lista.innerHTML = `
            <div class="favoritos-estado">
                <i class="fa-regular fa-heart" aria-hidden="true"></i>
                <h3>Você ainda não salvou nenhum produto.</h3>
                <p>Use o coração nos produtos para montar sua lista de favoritos.</p>
                <a href="index.html#produtos-globais">
                    <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                    Explorar produtos
                </a>
            </div>
        `;
    }

    function criarCard(item) {
        const produto = obterRelacao(item.produto) || {};
        const loja = obterRelacao(produto.loja) || {};
        const categoria = obterRelacao(produto.categoria) || {};
        const produtoId = escaparAtributo(produto.id || item.produto_id || "");
        const nome = escaparHTML(produto.nome || "Produto");
        const descricao = escaparHTML(
            produto.descricao || "Produto disponível no comércio local."
        );
        const nomeLoja = escaparHTML(loja.nome || "Loja");
        const nomeCategoria = escaparHTML(categoria.nome || "Sem categoria");
        const estoque = Math.max(0, Number(produto.estoque || 0));
        const preco = Math.max(0, Number(produto.preco || 0));
        const promocional = Math.max(0, Number(produto.preco_promocional || 0));
        const temPromocao = promocional > 0 && promocional < preco;
        const lojaId = loja.id || produto.loja_id || "";
        const link = `produto.html?id=${encodeURIComponent(produto.id || "")}`;

        const imagem = produto.imagem_url
            ? `
                <img
                    src="${escaparAtributo(produto.imagem_url)}"
                    alt="${nome}"
                    loading="lazy"
                >
                <div class="favorito-card-placeholder" hidden>
                    <i class="fa-solid fa-box" aria-hidden="true"></i>
                </div>
            `
            : `
                <div class="favorito-card-placeholder">
                    <i class="fa-solid fa-box" aria-hidden="true"></i>
                </div>
            `;

        const precoHTML = temPromocao
            ? `<strong>${formatarMoeda(promocional)}</strong><span>${formatarMoeda(preco)}</span>`
            : `<strong>${formatarMoeda(preco)}</strong>`;

        return `
            <article class="favorito-card" data-item-favorito="${produtoId}">
                <div class="favorito-card-imagem">
                    ${imagem}
                    ${temPromocao ? '<span class="favorito-card-oferta"><i class="fa-solid fa-tag" aria-hidden="true"></i> Oferta</span>' : ""}
                    <button
                        type="button"
                        class="btn-favorito-produto ativo"
                        data-favorito-produto="${produtoId}"
                        data-favorito-nome="${escaparAtributo(produto.nome || "Produto")}"
                        aria-label="Remover ${nome} dos favoritos"
                        aria-pressed="true"
                    >
                        <i class="fa-solid fa-heart" aria-hidden="true"></i>
                    </button>
                </div>

                <div class="favorito-card-conteudo">
                    <div class="favorito-card-meta">
                        <span>${nomeCategoria}</span>
                        <span class="${estoque > 0 ? "em-estoque" : "sem-estoque"}">
                            ${estoque > 0 ? `${estoque} em estoque` : "Sem estoque"}
                        </span>
                    </div>

                    <h3>${nome}</h3>
                    <p class="favorito-card-descricao">${descricao}</p>
                    <p class="favorito-card-loja">
                        <i class="fa-solid fa-store" aria-hidden="true"></i>
                        Vendido por <strong>${nomeLoja}</strong>
                    </p>
                    <div class="favorito-card-preco">${precoHTML}</div>

                    <div class="favorito-card-acoes">
                        <button
                            type="button"
                            class="favorito-adicionar"
                            data-adicionar-favorito-carrinho="${produtoId}"
                            ${estoque <= 0 ? "disabled" : ""}
                        >
                            <i class="fa-solid fa-cart-plus" aria-hidden="true"></i>
                            ${estoque > 0 ? "Adicionar ao carrinho" : "Sem estoque"}
                        </button>
                        <a class="favorito-ver" href="${escaparAtributo(link)}" aria-label="Ver detalhes de ${nome}">
                            <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>
                            <span class="texto-acessivel">Ver produto</span>
                        </a>
                        <button
                            type="button"
                            class="favorito-remover"
                            data-remover-favorito="${produtoId}"
                        >
                            <i class="fa-regular fa-trash-can" aria-hidden="true"></i>
                            Remover dos favoritos
                        </button>
                    </div>
                </div>
            </article>
        `;
    }

    function configurarErrosImagem() {
        elementos.lista.querySelectorAll(".favorito-card-imagem img").forEach(imagem => {
            imagem.addEventListener("error", () => {
                imagem.hidden = true;
                imagem.removeAttribute("src");
                const placeholder = imagem.parentElement?.querySelector(
                    ".favorito-card-placeholder"
                );
                if (placeholder) placeholder.hidden = false;
            }, { once: true });
        });
    }

    function renderizarItens() {
        elementos.lista.setAttribute("aria-busy", "false");

        if (!estado.itens.length) {
            renderizarVazio();
            return;
        }

        elementos.lista.innerHTML = estado.itens.map(criarCard).join("");
        configurarErrosImagem();
        window.Favoritos?.atualizarBotoes(elementos.lista);
    }

    function atualizarResumo() {
        elementos.total.textContent = String(estado.total);
        elementos.rotuloTotal.textContent =
            estado.total === 1 ? "produto salvo" : "produtos salvos";
    }

    function criarJanelaPaginas(totalPaginas) {
        const inicio = Math.max(1, estado.pagina - 2);
        const fim = Math.min(totalPaginas, inicio + 4);
        const ajustado = Math.max(1, fim - 4);
        return Array.from({ length: fim - ajustado + 1 }, (_, indice) => ajustado + indice);
    }

    function renderizarPaginacao() {
        const totalPaginas = Math.max(1, Math.ceil(estado.total / TAMANHO_PAGINA));

        if (totalPaginas <= 1 || estado.total === 0) {
            elementos.paginacao.hidden = true;
            elementos.paginacao.replaceChildren();
            return;
        }

        const paginas = criarJanelaPaginas(totalPaginas);
        elementos.paginacao.innerHTML = `
            <button type="button" data-pagina-favoritos="${estado.pagina - 1}" ${estado.pagina === 1 ? "disabled" : ""} aria-label="Página anterior">
                <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
            </button>
            ${paginas.map(pagina => `
                <button
                    type="button"
                    data-pagina-favoritos="${pagina}"
                    ${pagina === estado.pagina ? 'aria-current="page"' : ""}
                    aria-label="Página ${pagina}"
                >${pagina}</button>
            `).join("")}
            <button type="button" data-pagina-favoritos="${estado.pagina + 1}" ${estado.pagina === totalPaginas ? "disabled" : ""} aria-label="Próxima página">
                <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
            </button>
        `;
        elementos.paginacao.hidden = false;
    }

    async function carregarFavoritos() {
        renderizarCarregando();

        try {
            const inicio = (estado.pagina - 1) * TAMANHO_PAGINA;
            const fim = inicio + TAMANHO_PAGINA - 1;
            const { data, error, count } = await window.db
                .from("favoritos")
                .select(`
                    id,
                    produto_id,
                    criado_em,
                    produto:produtos!inner(
                        id,
                        loja_id,
                        categoria_id,
                        nome,
                        descricao,
                        preco,
                        preco_promocional,
                        estoque,
                        imagem_url,
                        ativo,
                        loja:lojas!produtos_loja_id_fkey(id, nome),
                        categoria:categorias_produtos!produtos_categoria_id_fkey(id, nome)
                    )
                `, { count: "exact" })
                .eq("cliente_id", estado.usuarioId)
                .eq("produto.ativo", true)
                .order("criado_em", { ascending: false })
                .range(inicio, fim);

            if (error) throw error;

            estado.itens = data || [];
            estado.total = Number(count || 0);

            if (!estado.itens.length && estado.pagina > 1 && estado.total > 0) {
                estado.pagina = Math.max(1, Math.ceil(estado.total / TAMANHO_PAGINA));
                await carregarFavoritos();
                return;
            }

            atualizarResumo();
            renderizarItens();
            renderizarPaginacao();
        } catch (erro) {
            console.error("Erro ao carregar favoritos:", erro);
            renderizarErro();
            elementos.paginacao.hidden = true;
        }
    }

    function obterProduto(produtoId) {
        const item = estado.itens.find(favorito =>
            String(favorito.produto_id) === String(produtoId)
        );
        return obterRelacao(item?.produto);
    }

    function adicionarAoCarrinho(produtoId) {
        const produto = obterProduto(produtoId);
        if (!produto) {
            notificar("Este produto não está mais disponível.", "erro", "Produto não encontrado");
            return;
        }

        const estoque = Math.max(0, Number(produto.estoque || 0));
        if (estoque <= 0) {
            notificar("O produto está sem estoque no momento.", "aviso", "Produto indisponível");
            return;
        }

        const loja = obterRelacao(produto.loja) || {};
        let carrinho = [];

        try {
            const salvo = JSON.parse(localStorage.getItem("carrinho"));
            carrinho = Array.isArray(salvo) ? salvo : [];
        } catch (erro) {
            console.warn("O carrinho salvo estava inválido e foi reiniciado:", erro);
        }

        const existente = carrinho.find(item =>
            String(item.id) === String(produto.id)
            && String(item.loja_id) === String(produto.loja_id)
        );

        if (existente) {
            const quantidade = Math.max(1, Number(existente.quantidade || 1));
            if (quantidade >= estoque) {
                notificar(
                    `Você já adicionou todas as ${estoque} unidade(s) disponíveis.`,
                    "aviso",
                    "Limite de estoque"
                );
                return;
            }

            existente.quantidade = quantidade + 1;
            existente.estoque = estoque;
        } else {
            carrinho.push({
                id: produto.id,
                loja_id: produto.loja_id,
                nome_loja: loja.nome || "Loja",
                nome: produto.nome,
                descricao: produto.descricao || "",
                preco: Number(produto.preco || 0),
                preco_promocional: produto.preco_promocional
                    ? Number(produto.preco_promocional)
                    : null,
                imagem_url: produto.imagem_url || null,
                estoque,
                quantidade: 1
            });
        }

        try {
            localStorage.setItem("carrinho", JSON.stringify(carrinho));
            window.CarrinhoSync?.notificarAlteracao();
            window.atualizarContadorCarrinho?.();
            notificar(
                `${produto.nome || "Produto"} foi adicionado ao carrinho.`,
                "sucesso",
                "Produto adicionado"
            );
        } catch (erro) {
            console.error("Não foi possível salvar o carrinho:", erro);
            notificar("Não foi possível atualizar o carrinho.", "erro", "Erro no carrinho");
        }
    }

    function configurarEventos() {
        document.addEventListener("click", async event => {
            const recarregar = event.target.closest?.("[data-recarregar-favoritos]");
            if (recarregar) {
                carregarFavoritos();
                return;
            }

            const adicionar = event.target.closest?.("[data-adicionar-favorito-carrinho]");
            if (adicionar) {
                adicionarAoCarrinho(adicionar.dataset.adicionarFavoritoCarrinho);
                return;
            }

            const remover = event.target.closest?.("[data-remover-favorito]");
            if (remover) {
                remover.disabled = true;
                const alterado = await window.Favoritos?.alternar(remover.dataset.removerFavorito);
                if (!alterado) remover.disabled = false;
                return;
            }

            const pagina = event.target.closest?.("[data-pagina-favoritos]");
            if (pagina && !pagina.disabled) {
                const numero = Number(pagina.dataset.paginaFavoritos);
                if (Number.isInteger(numero) && numero > 0 && numero !== estado.pagina) {
                    estado.pagina = numero;
                    await carregarFavoritos();
                    document.getElementById("titulo-lista-favoritos")?.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }
            }
        });

        document.addEventListener("favoritos:alterado", event => {
            if (event.detail?.favorito === false) {
                carregarFavoritos();
            }
        });
    }

    async function iniciar() {
        mapearElementos();
        configurarEventos();

        try {
            if (!await verificarUsuario()) return;
            await window.Favoritos?.iniciar();
            await carregarFavoritos();
        } catch (erro) {
            console.error("Erro ao iniciar a página de favoritos:", erro);
            renderizarErro();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }
})();
