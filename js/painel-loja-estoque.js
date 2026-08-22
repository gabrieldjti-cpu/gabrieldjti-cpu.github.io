// ==========================================
// PAINEL-LOJA-ESTOQUE.JS — RF-16
// Alertas, limite configurável e histórico
// ==========================================

(() => {
    "use strict";

    let iniciado = false;
    let lojaEstoque = null;
    let produtosEstoque = [];

    async function iniciarEstoquePainelLoja() {
        if (iniciado) return;
        iniciado = true;

        carregarCssEstoque();
        criarSecaoEstoque();
        configurarEventosEstoque();

        await carregarDadosEstoque();
    }

    function carregarCssEstoque() {
        const caminho = "css/painel-loja-estoque.css";

        if (document.querySelector(`link[href="${caminho}"]`)) return;

        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = caminho;
        document.head.appendChild(link);
    }

    function criarSecaoEstoque() {
        if (document.getElementById("secao-estoque-rf16")) return;

        const listaProdutos = document.getElementById("lista-produtos");
        const cardProdutos = listaProdutos?.closest("section.card");
        const container = document.querySelector("main.container");

        if (!container) return;

        const secao = document.createElement("section");
        secao.id = "secao-estoque-rf16";
        secao.className = "card estoque-rf16";
        secao.innerHTML = `
            <div class="topo-card estoque-rf16-topo">
                <div>
                    <span class="estoque-rf16-selo">
                        <i class="fa-solid fa-boxes-stacked"></i>
                        RF-16
                    </span>
                    <h2>
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        Controle de Estoque
                    </h2>
                    <p>
                        Acompanhe produtos com poucas unidades e defina quando deseja receber o alerta.
                    </p>
                </div>

                <button type="button" id="btn-atualizar-estoque-rf16" class="btn btn-secundario">
                    <i class="fa-solid fa-rotate"></i>
                    Atualizar
                </button>
            </div>

            <div class="estoque-rf16-resumo" aria-label="Resumo do estoque">
                <article class="estoque-rf16-metrica estoque-rf16-metrica-alerta">
                    <span class="estoque-rf16-icone">
                        <i class="fa-solid fa-bell"></i>
                    </span>
                    <div>
                        <small>Estoque baixo</small>
                        <strong id="rf16-total-baixo">—</strong>
                    </div>
                </article>

                <article class="estoque-rf16-metrica estoque-rf16-metrica-esgotado">
                    <span class="estoque-rf16-icone">
                        <i class="fa-solid fa-circle-xmark"></i>
                    </span>
                    <div>
                        <small>Esgotados</small>
                        <strong id="rf16-total-esgotado">—</strong>
                    </div>
                </article>

                <article class="estoque-rf16-metrica">
                    <span class="estoque-rf16-icone">
                        <i class="fa-solid fa-box"></i>
                    </span>
                    <div>
                        <small>Produtos ativos</small>
                        <strong id="rf16-total-ativos">—</strong>
                    </div>
                </article>
            </div>

            <div class="estoque-rf16-bloco">
                <div class="estoque-rf16-titulo-linha">
                    <div>
                        <h3>Produtos que precisam de atenção</h3>
                        <p>O alerta aparece quando o estoque atual é menor ou igual ao limite configurado.</p>
                    </div>
                </div>

                <div id="rf16-lista-alertas" class="estoque-rf16-lista" aria-live="polite">
                    <div class="estoque-rf16-estado">
                        <i class="fa-solid fa-spinner fa-spin"></i>
                        <span>Carregando estoque...</span>
                    </div>
                </div>
            </div>

            <details class="estoque-rf16-detalhes" id="rf16-configuracao">
                <summary>
                    <span>
                        <i class="fa-solid fa-sliders"></i>
                        Configurar limites de alerta
                    </span>
                    <small>Cada produto pode ter seu próprio limite.</small>
                </summary>

                <div id="rf16-lista-configuracao" class="estoque-rf16-configuracao"></div>
            </details>

            <details class="estoque-rf16-detalhes" id="rf16-historico">
                <summary>
                    <span>
                        <i class="fa-solid fa-clock-rotate-left"></i>
                        Histórico de movimentações
                    </span>
                    <small>Últimas 20 entradas e saídas.</small>
                </summary>

                <div id="rf16-lista-historico" class="estoque-rf16-historico"></div>
            </details>
        `;

        if (cardProdutos) {
            cardProdutos.insertAdjacentElement("beforebegin", secao);
        } else {
            container.appendChild(secao);
        }
    }

    function configurarEventosEstoque() {
        document
            .getElementById("btn-atualizar-estoque-rf16")
            ?.addEventListener("click", carregarDadosEstoque);

        document
            .getElementById("rf16-lista-configuracao")
            ?.addEventListener("click", async event => {
                const botao = event.target.closest("[data-rf16-salvar-limite]");
                if (!botao) return;

                await salvarLimiteProduto(botao.dataset.produtoId, botao);
            });
    }

    async function carregarDadosEstoque() {
        const botaoAtualizar = document.getElementById("btn-atualizar-estoque-rf16");
        definirCarregandoBotao(botaoAtualizar, true);

        try {
            const { data: sessaoData, error: sessaoError } = await window.db.auth.getSession();

            if (sessaoError) throw sessaoError;
            if (!sessaoData?.session?.user) return;

            const usuarioId = sessaoData.session.user.id;

            const { data: loja, error: lojaError } = await window.db
                .from("lojas")
                .select("id,nome")
                .eq("proprietario_id", usuarioId)
                .maybeSingle();

            if (lojaError) throw lojaError;
            if (!loja) return;

            lojaEstoque = loja;

            const [resultadoProdutos, resultadoHistorico] = await Promise.all([
                window.db
                    .from("produtos")
                    .select("id,nome,estoque,estoque_minimo,ativo")
                    .eq("loja_id", loja.id)
                    .order("nome", { ascending: true }),

                window.db
                    .from("movimentacoes_estoque")
                    .select("id,produto_id,produto_nome,estoque_anterior,estoque_novo,quantidade,tipo,origem,criado_em")
                    .eq("loja_id", loja.id)
                    .order("criado_em", { ascending: false })
                    .limit(20)
            ]);

            if (resultadoProdutos.error) throw resultadoProdutos.error;
            if (resultadoHistorico.error) throw resultadoHistorico.error;

            produtosEstoque = Array.isArray(resultadoProdutos.data)
                ? resultadoProdutos.data
                : [];

            const historico = Array.isArray(resultadoHistorico.data)
                ? resultadoHistorico.data
                : [];

            renderizarResumoEstoque();
            renderizarAlertasEstoque();
            renderizarConfiguracaoEstoque();
            renderizarHistoricoEstoque(historico);

        } catch (erro) {
            console.error("RF-16: erro ao carregar estoque:", erro);

            const lista = document.getElementById("rf16-lista-alertas");
            if (lista) {
                lista.innerHTML = `
                    <div class="estoque-rf16-estado estoque-rf16-erro">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                        <span>Não foi possível carregar os alertas de estoque.</span>
                    </div>
                `;
            }

            notificarEstoque(
                "Não foi possível carregar os dados de estoque da sua loja.",
                "erro",
                "Erro no estoque"
            );
        } finally {
            definirCarregandoBotao(botaoAtualizar, false);
        }
    }

    function renderizarResumoEstoque() {
        const ativos = produtosEstoque.filter(produto => produto.ativo !== false);
        const baixos = ativos.filter(estaComEstoqueBaixo);
        const esgotados = ativos.filter(produto => numeroSeguro(produto.estoque) <= 0);

        definirTextoEstoque("rf16-total-baixo", baixos.length);
        definirTextoEstoque("rf16-total-esgotado", esgotados.length);
        definirTextoEstoque("rf16-total-ativos", ativos.length);
    }

    function renderizarAlertasEstoque() {
        const lista = document.getElementById("rf16-lista-alertas");
        if (!lista) return;

        const baixos = produtosEstoque
            .filter(produto => produto.ativo !== false && estaComEstoqueBaixo(produto))
            .sort((a, b) => numeroSeguro(a.estoque) - numeroSeguro(b.estoque));

        if (baixos.length === 0) {
            lista.innerHTML = `
                <div class="estoque-rf16-estado estoque-rf16-ok">
                    <i class="fa-solid fa-circle-check"></i>
                    <div>
                        <strong>Estoque saudável</strong>
                        <span>Nenhum produto ativo atingiu o limite de alerta.</span>
                    </div>
                </div>
            `;
            return;
        }

        lista.innerHTML = baixos.map(produto => {
            const estoque = numeroSeguro(produto.estoque);
            const limite = limiteSeguro(produto.estoque_minimo);
            const esgotado = estoque <= 0;

            return `
                <article class="estoque-rf16-alerta ${esgotado ? "esgotado" : "baixo"}">
                    <span class="estoque-rf16-alerta-icone">
                        <i class="fa-solid ${esgotado ? "fa-circle-xmark" : "fa-triangle-exclamation"}"></i>
                    </span>

                    <div class="estoque-rf16-alerta-info">
                        <strong>${escaparEstoque(produto.nome || "Produto")}</strong>
                        <span>
                            ${esgotado
                                ? "Produto esgotado"
                                : `${estoque} unidade${estoque === 1 ? "" : "s"} disponível${estoque === 1 ? "" : "is"}`}
                        </span>
                    </div>

                    <span class="estoque-rf16-limite">
                        Alerta em ≤ ${limite}
                    </span>
                </article>
            `;
        }).join("");
    }

    function renderizarConfiguracaoEstoque() {
        const container = document.getElementById("rf16-lista-configuracao");
        if (!container) return;

        if (produtosEstoque.length === 0) {
            container.innerHTML = `
                <div class="estoque-rf16-estado">
                    <i class="fa-solid fa-box-open"></i>
                    <span>Cadastre um produto para configurar alertas.</span>
                </div>
            `;
            return;
        }

        container.innerHTML = produtosEstoque.map(produto => {
            const id = escaparEstoque(produto.id || "");
            const estoque = numeroSeguro(produto.estoque);
            const limite = limiteSeguro(produto.estoque_minimo);

            return `
                <div class="estoque-rf16-config-item">
                    <div class="estoque-rf16-config-produto">
                        <strong>${escaparEstoque(produto.nome || "Produto")}</strong>
                        <span>Estoque atual: ${estoque}</span>
                    </div>

                    <label class="estoque-rf16-campo-limite">
                        <span>Alertar quando chegar a</span>
                        <input
                            type="number"
                            min="0"
                            max="1000000"
                            step="1"
                            value="${limite}"
                            data-rf16-limite="${id}"
                            inputmode="numeric"
                            aria-label="Limite de estoque de ${escaparEstoque(produto.nome || "produto")}" 
                        >
                    </label>

                    <button
                        type="button"
                        class="btn btn-secundario estoque-rf16-btn-salvar"
                        data-rf16-salvar-limite
                        data-produto-id="${id}"
                    >
                        <i class="fa-solid fa-floppy-disk"></i>
                        Salvar
                    </button>
                </div>
            `;
        }).join("");
    }

    function renderizarHistoricoEstoque(historico) {
        const container = document.getElementById("rf16-lista-historico");
        if (!container) return;

        if (!historico.length) {
            container.innerHTML = `
                <div class="estoque-rf16-estado">
                    <i class="fa-solid fa-clock"></i>
                    <span>Ainda não há movimentações registradas após a ativação do RF-16.</span>
                </div>
            `;
            return;
        }

        container.innerHTML = historico.map(item => {
            const entrada = item.tipo === "entrada";
            const quantidade = numeroSeguro(item.quantidade);
            const anterior = numeroSeguro(item.estoque_anterior);
            const novo = numeroSeguro(item.estoque_novo);

            return `
                <article class="estoque-rf16-movimento ${entrada ? "entrada" : "saida"}">
                    <span class="estoque-rf16-movimento-icone">
                        <i class="fa-solid ${entrada ? "fa-arrow-trend-up" : "fa-arrow-trend-down"}"></i>
                    </span>

                    <div class="estoque-rf16-movimento-info">
                        <strong>${escaparEstoque(item.produto_nome || "Produto")}</strong>
                        <span>
                            ${entrada ? "+" : "−"}${quantidade} unidade${quantidade === 1 ? "" : "s"}
                            · ${anterior} → ${novo}
                        </span>
                        <small>${descricaoOrigem(item)}</small>
                    </div>

                    <time datetime="${escaparEstoque(item.criado_em || "")}">
                        ${formatarDataEstoque(item.criado_em)}
                    </time>
                </article>
            `;
        }).join("");
    }

    async function salvarLimiteProduto(produtoId, botao) {
        if (!produtoId || !lojaEstoque?.id) return;

        const input = document.querySelector(`[data-rf16-limite="${cssEscape(produtoId)}"]`);
        if (!input) return;

        const limite = Number(input.value);

        if (!Number.isInteger(limite) || limite < 0 || limite > 1000000) {
            notificarEstoque(
                "Informe um limite inteiro entre 0 e 1.000.000.",
                "aviso",
                "Limite inválido"
            );
            input.focus();
            return;
        }

        definirCarregandoBotao(botao, true, "Salvando...");

        try {
            const { error } = await window.db
                .from("produtos")
                .update({ estoque_minimo: limite })
                .eq("id", produtoId)
                .eq("loja_id", lojaEstoque.id);

            if (error) throw error;

            notificarEstoque(
                "Limite de estoque atualizado com sucesso.",
                "sucesso",
                "Alerta atualizado",
                2600
            );

            await carregarDadosEstoque();
        } catch (erro) {
            console.error("RF-16: erro ao salvar limite:", erro);
            notificarEstoque(
                "Não foi possível atualizar o limite deste produto.",
                "erro",
                "Erro ao salvar"
            );
        } finally {
            definirCarregandoBotao(botao, false);
        }
    }

    function estaComEstoqueBaixo(produto) {
        return numeroSeguro(produto.estoque) <= limiteSeguro(produto.estoque_minimo);
    }

    function limiteSeguro(valor) {
        const numero = Number(valor);
        return Number.isInteger(numero) && numero >= 0 ? numero : 5;
    }

    function numeroSeguro(valor) {
        const numero = Number(valor);
        return Number.isFinite(numero) ? Math.max(0, numero) : 0;
    }

    function descricaoOrigem(item) {
        if (item.origem === "alteracao_lojista") {
            return item.tipo === "entrada"
                ? "Entrada ou ajuste realizado pelo lojista"
                : "Saída ou ajuste realizado pelo lojista";
        }

        if (item.origem === "pedido_ou_cancelamento") {
            return item.tipo === "entrada"
                ? "Entrada automática após devolução/cancelamento"
                : "Baixa automática associada a pedido";
        }

        return "Movimentação automática do sistema";
    }

    function formatarDataEstoque(valor) {
        if (!valor) return "—";

        const data = new Date(valor);
        if (Number.isNaN(data.getTime())) return "—";

        return data.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function definirTextoEstoque(id, valor) {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = String(valor);
    }

    function definirCarregandoBotao(botao, carregando, texto = "Atualizar") {
        if (!botao) return;

        if (carregando) {
            if (!botao.dataset.htmlOriginal) {
                botao.dataset.htmlOriginal = botao.innerHTML;
            }
            botao.disabled = true;
            botao.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${texto}`;
            return;
        }

        botao.disabled = false;
        if (botao.dataset.htmlOriginal) {
            botao.innerHTML = botao.dataset.htmlOriginal;
            delete botao.dataset.htmlOriginal;
        }
    }

    function notificarEstoque(texto, tipo = "info", titulo = null, duracao = 4000) {
        if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(texto, tipo, titulo, duracao);
            return;
        }

        console.warn(`[RF16:${tipo}] ${titulo || ""}`, texto);
    }

    function escaparEstoque(valor) {
        return String(valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function cssEscape(valor) {
        if (window.CSS?.escape) return window.CSS.escape(String(valor));
        return String(valor).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
    }

    window.iniciarEstoquePainelLoja = iniciarEstoquePainelLoja;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciarEstoquePainelLoja, { once: true });
    } else {
        iniciarEstoquePainelLoja();
    }
})();
