// ==========================================
// LOJA-MODERN.JS
// Integração funcional do novo visual da loja
// Comércio da Cidade
// ==========================================

(() => {
    "use strict";

    const carregarLojaOriginal = window.carregarLoja;
    const mostrarProdutosOriginal = window.mostrarProdutos;
    const adicionarCarrinhoOriginal = window.adicionarCarrinho;

    const lojaIdAtual = new URLSearchParams(window.location.search).get("id") || "";

    // ==========================================
    // LOJA CARREGADA
    // ==========================================

    if (typeof carregarLojaOriginal === "function") {
        window.carregarLoja = async function (...args) {
            const carregou = await carregarLojaOriginal.apply(this, args);

            if (carregou) {
                atualizarIdentidadeDaPagina();
            }

            return carregou;
        };
    }

    // ==========================================
    // PRODUTOS RENDERIZADOS
    // ==========================================

    if (typeof mostrarProdutosOriginal === "function") {
        window.mostrarProdutos = function (lista, pesquisando = false) {
            const retorno = mostrarProdutosOriginal.apply(this, arguments);
            const produtosVisiveis = Array.isArray(lista) ? lista : [];

            atualizarContadorProdutos(produtosVisiveis.length, pesquisando);
            decorarCardsProdutos(produtosVisiveis);

            return retorno;
        };
    }

    // ==========================================
    // FEEDBACK AO ADICIONAR AO CARRINHO
    // ==========================================

    if (typeof adicionarCarrinhoOriginal === "function") {
        window.adicionarCarrinho = function (id) {
            const quantidadeAntes = quantidadeNoCarrinho(id);
            const retorno = adicionarCarrinhoOriginal.apply(this, arguments);
            const quantidadeDepois = quantidadeNoCarrinho(id);

            if (quantidadeDepois > quantidadeAntes) {
                mostrarFeedbackBotaoCarrinho(id);
            }

            return retorno;
        };
    }

    // ==========================================
    // INICIAR RECURSOS VISUAIS
    // ==========================================

    document.addEventListener("DOMContentLoaded", () => {
        configurarBuscaModerna();
        atualizarEstadoBotaoLimpar();
    });

    // ==========================================
    // IDENTIDADE DA LOJA
    // ==========================================

    function atualizarIdentidadeDaPagina() {
        const nomeRenderizado = document.getElementById("nomeLoja")?.textContent;
        const nome = String(nomeRenderizado || "Loja").trim() || "Loja";

        document.title = `${nome} | Comércio da Cidade`;

        const breadcrumb = document.getElementById("breadcrumbLoja");
        if (breadcrumb) {
            breadcrumb.textContent = nome;
            breadcrumb.title = nome;
        }

        const pesquisa = document.getElementById("pesquisa");
        if (pesquisa) {
            pesquisa.placeholder = `Buscar produtos em ${nome}...`;
        }

        const whatsapp = document.getElementById("btnWhatsapp");
        if (whatsapp) {
            whatsapp.setAttribute(
                "aria-label",
                `Conversar com ${nome} pelo WhatsApp`
            );
        }

        const hero = document.querySelector(".loja-hero");
        if (hero) {
            hero.setAttribute("aria-label", `Informações da loja ${nome}`);
        }
    }

    // ==========================================
    // BUSCA MODERNA
    // ==========================================

    function configurarBuscaModerna() {
        const pesquisa = document.getElementById("pesquisa");
        const limpar = document.getElementById("btnLimparPesquisa");

        if (!pesquisa) return;

        pesquisa.addEventListener("input", atualizarEstadoBotaoLimpar);

        pesquisa.addEventListener("keydown", event => {
            if (event.key === "Escape" && pesquisa.value) {
                limparPesquisa();
            }
        });

        limpar?.addEventListener("click", limparPesquisa);
    }

    function limparPesquisa() {
        const pesquisa = document.getElementById("pesquisa");
        if (!pesquisa) return;

        pesquisa.value = "";
        pesquisa.dispatchEvent(new Event("input", { bubbles: true }));
        pesquisa.focus();
        atualizarEstadoBotaoLimpar();
    }

    function atualizarEstadoBotaoLimpar() {
        const pesquisa = document.getElementById("pesquisa");
        const limpar = document.getElementById("btnLimparPesquisa");

        if (!pesquisa || !limpar) return;

        const temTexto = pesquisa.value.trim().length > 0;

        limpar.hidden = !temTexto;
        limpar.setAttribute("aria-hidden", String(!temTexto));
    }

    // ==========================================
    // CONTADOR DO CATÁLOGO
    // ==========================================

    function atualizarContadorProdutos(quantidade, pesquisando) {
        const contador = document.getElementById("contadorProdutos");
        if (!contador) return;

        if (pesquisando) {
            contador.textContent = quantidade === 1
                ? "1 resultado encontrado"
                : `${quantidade} resultados encontrados`;
            return;
        }

        contador.textContent = quantidade === 1
            ? "1 produto disponível"
            : `${quantidade} produtos disponíveis`;
    }

    // ==========================================
    // DECORAR CARDS DE PRODUTOS
    // ==========================================

    function decorarCardsProdutos(lista) {
        const cards = Array.from(
            document.querySelectorAll("#listaProdutos .produto")
        );

        cards.forEach((card, indice) => {
            const produto = lista[indice];
            if (!produto) return;

            card.dataset.produtoId = String(produto.id ?? "");

            adicionarBadgePromocao(card, produto);
            atualizarVisualEstoque(card, produto);
        });
    }

    function adicionarBadgePromocao(card, produto) {
        const areaImagem = card.querySelector(".area-imagem-produto");
        if (!areaImagem) return;

        areaImagem.querySelector(".produto-badge-oferta")?.remove();

        const preco = Number(produto.preco || 0);
        const promocional = Number(produto.preco_promocional || 0);

        if (!(preco > 0 && promocional > 0 && promocional < preco)) {
            return;
        }

        const desconto = Math.max(
            1,
            Math.round(((preco - promocional) / preco) * 100)
        );

        const badge = document.createElement("span");
        badge.className = "produto-badge-oferta";
        badge.innerHTML = `<i class="fa-solid fa-tag"></i> ${desconto}% OFF`;

        areaImagem.appendChild(badge);
    }

    function atualizarVisualEstoque(card, produto) {
        const estoqueElemento = card.querySelector(".estoque");
        if (!estoqueElemento) return;

        const estoque = Math.max(0, Number(produto.estoque || 0));

        estoqueElemento.classList.remove(
            "estoque-disponivel",
            "estoque-baixo",
            "estoque-esgotado"
        );

        if (estoque <= 0) {
            estoqueElemento.classList.add("estoque-esgotado");
            estoqueElemento.innerHTML = `
                <i class="fa-solid fa-circle-xmark"></i>
                Sem estoque
            `;
            return;
        }

        if (estoque <= 5) {
            estoqueElemento.classList.add("estoque-baixo");
            estoqueElemento.innerHTML = `
                <i class="fa-solid fa-fire"></i>
                Últimas ${estoque} unidade${estoque === 1 ? "" : "s"}
            `;
            return;
        }

        estoqueElemento.classList.add("estoque-disponivel");
        estoqueElemento.innerHTML = `
            <i class="fa-solid fa-circle-check"></i>
            ${estoque} unidades disponíveis
        `;
    }

    // ==========================================
    // FEEDBACK DO BOTÃO DE CARRINHO
    // ==========================================

    function quantidadeNoCarrinho(produtoId) {
        try {
            const dados = JSON.parse(localStorage.getItem("carrinho"));
            const carrinho = Array.isArray(dados) ? dados : [];

            const item = carrinho.find(itemCarrinho =>
                String(itemCarrinho?.id) === String(produtoId) &&
                String(itemCarrinho?.loja_id) === String(lojaIdAtual)
            );

            return Math.max(0, Number(item?.quantidade || 0));
        } catch (_) {
            return 0;
        }
    }

    function mostrarFeedbackBotaoCarrinho(produtoId) {
        const card = Array.from(document.querySelectorAll(".produto"))
            .find(elemento => elemento.dataset.produtoId === String(produtoId));

        const botao = card?.querySelector(".btn-comprar:not(:disabled)");
        if (!botao) return;

        const htmlOriginal = botao.innerHTML;

        botao.classList.add("produto-adicionado");
        botao.innerHTML = `
            <i class="fa-solid fa-check"></i>
            Adicionado ao carrinho
        `;

        window.setTimeout(() => {
            if (!botao.isConnected) return;

            botao.classList.remove("produto-adicionado");
            botao.innerHTML = htmlOriginal;
        }, 1200);
    }
})();
