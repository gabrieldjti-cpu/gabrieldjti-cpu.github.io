// ==========================================
// PAGINACAO-LISTAGENS.JS
// Comércio da Cidade
// Paginação reutilizável para listas grandes
// ==========================================

(() => {
    "use strict";

    const pagina = (
        window.location.pathname
            .split("/")
            .pop()
        || "index.html"
    ).toLowerCase();

    const configuracoes = {
        "produtos.html": {
            container: "#lista-produtos",
            item: ".produto-card",
            porPagina: 6,
            rotuloSingular: "produto",
            rotuloPlural: "produtos"
        },
        "loja.html": {
            container: "#listaProdutos",
            item: ".produto",
            porPagina: 6,
            rotuloSingular: "produto",
            rotuloPlural: "produtos"
        },
        "meus-pedidos.html": {
            container: "#lista-pedidos",
            item: ".pedido-card",
            porPagina: 5,
            rotuloSingular: "pedido",
            rotuloPlural: "pedidos"
        },
        "pedidos-loja.html": {
            container: "#lista-pedidos-loja",
            item: ".pedido-card",
            porPagina: 5,
            rotuloSingular: "pedido",
            rotuloPlural: "pedidos"
        },
        "avaliacoes-loja.html": {
            container: "#lista-avaliacoes-loja",
            item: ".avaliacao-card",
            porPagina: 5,
            rotuloSingular: "avaliação",
            rotuloPlural: "avaliações"
        },
        "admin-dashboard.html": {
            container: "#listaLojasAdmin",
            item: ".loja-admin-card",
            porPagina: 6,
            rotuloSingular: "loja",
            rotuloPlural: "lojas"
        },
        "admin-categorias.html": {
            container: "#listaCategoriasAdmin",
            item: ".categoria-admin-card",
            porPagina: 12,
            rotuloSingular: "categoria",
            rotuloPlural: "categorias"
        }
    };

    const config = configuracoes[pagina];

    if (!config) {
        return;
    }

    let paginaAtual = 1;
    let container = null;
    let controle = null;
    let textoResumo = null;
    let botoesNumericos = null;
    let botaoAnterior = null;
    let botaoProxima = null;
    let observador = null;
    let temporizador = null;

    function iniciar() {
        container = document.querySelector(config.container);

        if (!container) {
            aguardarContainer();
            return;
        }

        prepararPaginacao();
    }

    function aguardarContainer() {
        if (!document.documentElement) {
            return;
        }

        const observadorPagina = new MutationObserver(() => {
            container = document.querySelector(config.container);

            if (!container) {
                return;
            }

            observadorPagina.disconnect();
            prepararPaginacao();
        });

        observadorPagina.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    function prepararPaginacao() {
        if (!container || container.dataset.paginacaoAtiva === "true") {
            return;
        }

        container.dataset.paginacaoAtiva = "true";

        criarControle();
        observarLista();
        atualizarPaginacao(false);
    }

    function criarControle() {
        controle = document.createElement("nav");
        controle.className = "paginacao-listagem";
        controle.setAttribute("aria-label", "Paginação da listagem");
        controle.hidden = true;

        controle.innerHTML = `
            <div class="paginacao-resumo" aria-live="polite"></div>

            <div class="paginacao-acoes">
                <button
                    type="button"
                    class="paginacao-btn paginacao-anterior"
                    aria-label="Página anterior"
                >
                    <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
                    <span>Anterior</span>
                </button>

                <div class="paginacao-numeros" aria-label="Páginas"></div>

                <button
                    type="button"
                    class="paginacao-btn paginacao-proxima"
                    aria-label="Próxima página"
                >
                    <span>Próxima</span>
                    <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
                </button>
            </div>
        `;

        container.insertAdjacentElement("afterend", controle);

        textoResumo = controle.querySelector(".paginacao-resumo");
        botoesNumericos = controle.querySelector(".paginacao-numeros");
        botaoAnterior = controle.querySelector(".paginacao-anterior");
        botaoProxima = controle.querySelector(".paginacao-proxima");

        botaoAnterior?.addEventListener("click", () => {
            mudarPagina(paginaAtual - 1);
        });

        botaoProxima?.addEventListener("click", () => {
            mudarPagina(paginaAtual + 1);
        });

        botoesNumericos?.addEventListener("click", evento => {
            const botao = evento.target.closest("[data-pagina-listagem]");

            if (!botao) {
                return;
            }

            mudarPagina(Number(botao.dataset.paginaListagem));
        });
    }

    function observarLista() {
        observador = new MutationObserver(mutacoes => {
            const mudouEstrutura = mutacoes.some(
                mutacao => mutacao.type === "childList"
            );

            if (!mudouEstrutura) {
                return;
            }

            clearTimeout(temporizador);

            temporizador = setTimeout(() => {
                paginaAtual = 1;
                atualizarPaginacao(false);
            }, 40);
        });

        observador.observe(container, {
            childList: true,
            subtree: false
        });
    }

    function obterItens() {
        if (!container) {
            return [];
        }

        return Array.from(
            container.querySelectorAll(config.item)
        );
    }

    function atualizarPaginacao(rolar = false) {
        const itens = obterItens();
        const total = itens.length;

        if (total === 0) {
            paginaAtual = 1;

            if (controle) {
                controle.hidden = true;
            }

            return;
        }

        const totalPaginas = Math.max(
            1,
            Math.ceil(total / config.porPagina)
        );

        paginaAtual = Math.min(
            Math.max(1, paginaAtual),
            totalPaginas
        );

        const inicio = (paginaAtual - 1) * config.porPagina;
        const fim = Math.min(inicio + config.porPagina, total);

        itens.forEach((item, indice) => {
            const visivel = indice >= inicio && indice < fim;

            item.hidden = !visivel;

            if (visivel) {
                item.removeAttribute("aria-hidden");
            } else {
                item.setAttribute("aria-hidden", "true");
            }
        });

        atualizarResumo(total, inicio, fim, totalPaginas);
        atualizarBotoes(totalPaginas);

        if (controle) {
            controle.hidden = total <= config.porPagina;
        }

        if (rolar) {
            rolarParaLista();
        }
    }

    function atualizarResumo(total, inicio, fim, totalPaginas) {
        if (!textoResumo) {
            return;
        }

        const rotulo = total === 1
            ? config.rotuloSingular
            : config.rotuloPlural;

        textoResumo.innerHTML = `
            <span>
                Mostrando <strong>${inicio + 1}–${fim}</strong>
                de <strong>${total}</strong> ${rotulo}
            </span>
            <span class="paginacao-pagina-atual">
                Página <strong>${paginaAtual}</strong> de <strong>${totalPaginas}</strong>
            </span>
        `;
    }

    function atualizarBotoes(totalPaginas) {
        if (botaoAnterior) {
            botaoAnterior.disabled = paginaAtual <= 1;
        }

        if (botaoProxima) {
            botaoProxima.disabled = paginaAtual >= totalPaginas;
        }

        if (!botoesNumericos) {
            return;
        }

        const paginas = obterPaginasVisiveis(totalPaginas);

        botoesNumericos.innerHTML = paginas
            .map(item => {
                if (item === "...") {
                    return '<span class="paginacao-reticencias" aria-hidden="true">…</span>';
                }

                const ativa = Number(item) === paginaAtual;

                return `
                    <button
                        type="button"
                        class="paginacao-numero ${ativa ? "ativo" : ""}"
                        data-pagina-listagem="${item}"
                        aria-label="Ir para a página ${item}"
                        ${ativa ? 'aria-current="page"' : ""}
                    >
                        ${item}
                    </button>
                `;
            })
            .join("");
    }

    function obterPaginasVisiveis(totalPaginas) {
        if (totalPaginas <= 5) {
            return Array.from(
                { length: totalPaginas },
                (_, indice) => indice + 1
            );
        }

        if (paginaAtual <= 3) {
            return [1, 2, 3, 4, "...", totalPaginas];
        }

        if (paginaAtual >= totalPaginas - 2) {
            return [
                1,
                "...",
                totalPaginas - 3,
                totalPaginas - 2,
                totalPaginas - 1,
                totalPaginas
            ];
        }

        return [
            1,
            "...",
            paginaAtual - 1,
            paginaAtual,
            paginaAtual + 1,
            "...",
            totalPaginas
        ];
    }

    function mudarPagina(novaPagina) {
        const itens = obterItens();
        const totalPaginas = Math.max(
            1,
            Math.ceil(itens.length / config.porPagina)
        );

        if (
            !Number.isInteger(novaPagina)
            || novaPagina < 1
            || novaPagina > totalPaginas
            || novaPagina === paginaAtual
        ) {
            return;
        }

        paginaAtual = novaPagina;
        atualizarPaginacao(true);
    }

    function rolarParaLista() {
        if (!container) {
            return;
        }

        const topo =
            container.getBoundingClientRect().top
            + window.scrollY
            - 110;

        window.scrollTo({
            top: Math.max(0, topo),
            behavior: "smooth"
        });
    }

    window.atualizarPaginacaoListagem = () => {
        paginaAtual = 1;
        atualizarPaginacao(false);
    };

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            iniciar,
            { once: true }
        );
    } else {
        iniciar();
    }
})();
