// ==========================================
// CLIENTES-LOJA.JS
// Comércio da Cidade — RF-21
// ==========================================

(function () {
    "use strict";

    const PERIODOS_VALIDOS = new Set([0, 30, 90, 365]);
    const ORDENACOES_VALIDAS = new Set([
        "recentes",
        "antigos",
        "nome",
        "mais_pedidos",
        "maior_valor"
    ]);

    const estado = {
        usuario: null,
        loja: null,
        clientes: new Map(),
        pagina: 1,
        porPagina: 12,
        total: 0,
        busca: "",
        periodo: 0,
        ordenacao: "recentes",
        clienteSelecionado: null,
        historicoPagina: 1,
        historicoPorPagina: 6,
        historicoTotal: 0,
        requisicaoLista: 0,
        requisicaoHistorico: 0,
        temporizadorBusca: null,
        focoAnterior: null
    };

    document.addEventListener("DOMContentLoaded", iniciarPagina);

    async function iniciarPagina() {
        if (!window.db) {
            mostrarEstadoErro(
                "Não foi possível conectar ao sistema.",
                "Tentar novamente"
            );
            notificar("Não foi possível conectar ao sistema.", "erro", "Erro de conexão");
            return;
        }

        configurarEventos();
        lerFiltrosDaUrl();
        atualizarCamposDosFiltros();

        try {
            if (window.CarrinhoSync?.iniciar) {
                await window.CarrinhoSync.iniciar();
            }

            const autenticado = await carregarUsuario();
            if (!autenticado) return;

            const possuiLoja = await carregarLoja();
            if (!possuiLoja) return;

            await carregarPaginaCompleta();
        } catch (erro) {
            console.error("Erro ao iniciar clientes da loja:", erro);
            mostrarEstadoErro(
                "Não foi possível carregar os clientes da loja.",
                "Tentar novamente"
            );
            notificar(
                "Não foi possível carregar os clientes da loja.",
                "erro",
                "Erro ao carregar"
            );
        }
    }

    async function carregarUsuario() {
        const { data, error } = await window.db.auth.getUser();

        if (error || !data?.user) {
            notificar(
                "Entre na sua conta para acessar os clientes da loja.",
                "info",
                "Login necessário"
            );
            setTimeout(() => {
                window.location.href = "login.html";
            }, 900);
            return false;
        }

        estado.usuario = data.user;
        return true;
    }

    async function carregarLoja() {
        const { data, error } = await window.db
            .from("lojas")
            .select("id, nome, ativa, status_aprovacao")
            .eq("proprietario_id", estado.usuario.id)
            .order("criado_em", { ascending: true })
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            notificar(
                "Você ainda não possui uma loja cadastrada.",
                "info",
                "Loja não encontrada"
            );
            setTimeout(() => {
                window.location.href = "cadastrar-loja.html";
            }, 900);
            return false;
        }

        estado.loja = data;
        const nomeLoja = document.getElementById("nome-loja-clientes");
        if (nomeLoja) {
            nomeLoja.textContent = `Relacionamento de clientes de ${data.nome}.`;
        }

        return true;
    }

    function configurarEventos() {
        const form = document.getElementById("form-filtros-clientes");
        const busca = document.getElementById("busca-clientes");
        const periodo = document.getElementById("periodo-clientes");
        const ordenacao = document.getElementById("ordenacao-clientes");

        form?.addEventListener("submit", (event) => {
            event.preventDefault();
            aplicarBusca(busca?.value || "");
        });

        busca?.addEventListener("input", () => {
            clearTimeout(estado.temporizadorBusca);
            estado.temporizadorBusca = setTimeout(() => {
                aplicarBusca(busca.value);
            }, 350);
        });

        periodo?.addEventListener("change", async () => {
            estado.periodo = normalizarPeriodo(periodo.value);
            estado.pagina = 1;
            atualizarUrl();
            await carregarPaginaCompleta();
        });

        ordenacao?.addEventListener("change", async () => {
            estado.ordenacao = normalizarOrdenacao(ordenacao.value);
            estado.pagina = 1;
            atualizarUrl();
            await carregarClientes();
        });

        document.getElementById("btn-limpar-filtros")?.addEventListener("click", async () => {
            clearTimeout(estado.temporizadorBusca);
            estado.busca = "";
            estado.periodo = 0;
            estado.ordenacao = "recentes";
            estado.pagina = 1;
            atualizarCamposDosFiltros();
            atualizarUrl();
            await carregarPaginaCompleta();
        });

        document.getElementById("btn-atualizar-clientes")?.addEventListener("click", carregarPaginaCompleta);
        document.getElementById("pagina-anterior-clientes")?.addEventListener("click", () => mudarPagina(-1));
        document.getElementById("proxima-pagina-clientes")?.addEventListener("click", () => mudarPagina(1));
        document.getElementById("historico-anterior")?.addEventListener("click", () => mudarPaginaHistorico(-1));
        document.getElementById("historico-proximo")?.addEventListener("click", () => mudarPaginaHistorico(1));
        document.getElementById("btn-fechar-modal-cliente")?.addEventListener("click", fecharModalHistorico);

        document.querySelector("[data-fechar-modal-cliente]")?.addEventListener("click", fecharModalHistorico);

        document.getElementById("lista-clientes-loja")?.addEventListener("click", (event) => {
            const botao = event.target.closest("[data-cliente-id]");
            if (botao) abrirModalHistorico(botao.dataset.clienteId, botao);

            if (event.target.closest("[data-recarregar-clientes]")) {
                carregarPaginaCompleta();
            }
        });

        window.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && !document.getElementById("modal-historico-cliente")?.hidden) {
                fecharModalHistorico();
            }
        });
    }

    async function aplicarBusca(valor) {
        estado.busca = String(valor || "").trim().slice(0, 80);
        estado.pagina = 1;
        atualizarUrl();
        await carregarClientes();
    }

    async function carregarPaginaCompleta() {
        if (!estado.loja) return;

        const botao = document.getElementById("btn-atualizar-clientes");
        if (botao) botao.disabled = true;

        try {
            await Promise.all([carregarResumo(), carregarClientes()]);
        } finally {
            if (botao) botao.disabled = false;
        }
    }

    async function carregarResumo() {
        const { data, error } = await window.db.rpc("resumo_clientes_loja", {
            p_loja_id: estado.loja.id,
            p_periodo_dias: estado.periodo
        });

        if (error) {
            console.error("Erro ao carregar resumo de clientes:", error);
            definirTexto("estat-total-clientes", "—");
            definirTexto("estat-clientes-recorrentes", "—");
            definirTexto("estat-total-pedidos", "—");
            definirTexto("estat-receita-total", "—");
            definirTexto("estat-ticket-medio", "Ticket médio: —");
            notificar(
                "Os indicadores não puderam ser atualizados, mas a lista continua disponível.",
                "aviso",
                "Resumo indisponível"
            );
            return;
        }

        const resumo = data?.[0] || {};
        definirTexto("estat-total-clientes", formatarInteiro(resumo.total_clientes));
        definirTexto("estat-clientes-recorrentes", formatarInteiro(resumo.clientes_recorrentes));
        definirTexto("estat-total-pedidos", formatarInteiro(resumo.total_pedidos));
        definirTexto("estat-receita-total", formatarMoeda(resumo.receita_total));
        definirTexto("estat-ticket-medio", `Ticket médio: ${formatarMoeda(resumo.ticket_medio)}`);
    }

    async function carregarClientes() {
        const requisicao = ++estado.requisicaoLista;
        mostrarCarregamentoClientes();

        const offset = (estado.pagina - 1) * estado.porPagina;
        const { data, error } = await window.db.rpc("listar_clientes_loja", {
            p_loja_id: estado.loja.id,
            p_busca: estado.busca,
            p_periodo_dias: estado.periodo,
            p_ordenacao: estado.ordenacao,
            p_limite: estado.porPagina,
            p_offset: offset
        });

        if (requisicao !== estado.requisicaoLista) return;

        if (error) {
            console.error("Erro ao listar clientes:", error);
            mostrarEstadoErro("Não foi possível carregar os clientes.", "Tentar novamente");
            notificar("Não foi possível carregar os clientes.", "erro", "Erro ao carregar");
            return;
        }

        const clientes = Array.isArray(data) ? data : [];
        estado.total = Number(clientes[0]?.total_registros || 0);

        const totalPaginas = Math.max(1, Math.ceil(estado.total / estado.porPagina));
        if (estado.pagina > totalPaginas && estado.total > 0) {
            estado.pagina = totalPaginas;
            atualizarUrl();
            await carregarClientes();
            return;
        }

        estado.clientes = new Map(clientes.map((cliente) => [cliente.cliente_id, cliente]));
        renderizarClientes(clientes);
        atualizarPaginacaoClientes();
        atualizarResumoResultados();
    }

    function renderizarClientes(clientes) {
        const lista = document.getElementById("lista-clientes-loja");
        if (!lista) return;

        if (!clientes.length) {
            const mensagem = estado.busca
                ? `Nenhum cliente encontrado para “${escaparHtml(estado.busca)}”.`
                : "Nenhum cliente realizou compras neste período.";

            lista.innerHTML = `
                <div class="estado-clientes">
                    <i class="fa-solid fa-user-slash"></i>
                    <h3>Nenhum cliente encontrado</h3>
                    <p>${mensagem}</p>
                </div>
            `;
            return;
        }

        lista.innerHTML = clientes.map((cliente) => {
            const nome = escaparHtml(cliente.nome || "Cliente");
            const totalPedidos = Number(cliente.total_pedidos || 0);
            const recorrente = totalPedidos > 1;

            return `
                <article class="cliente-card">
                    <div class="cliente-card-topo">
                        <span class="cliente-iniciais" aria-hidden="true">${escaparHtml(obterIniciais(cliente.nome))}</span>
                        <div class="cliente-identidade">
                            <h3 title="${nome}">${nome}</h3>
                            <p>Última compra: ${formatarData(cliente.ultimo_pedido)}</p>
                        </div>
                    </div>

                    ${recorrente ? `
                        <span class="selo-recorrente">
                            <i class="fa-solid fa-rotate"></i>
                            Cliente recorrente
                        </span>
                    ` : ""}

                    <div class="cliente-metricas">
                        <div class="cliente-metrica">
                            <span>Pedidos</span>
                            <strong>${formatarInteiro(totalPedidos)}</strong>
                        </div>
                        <div class="cliente-metrica">
                            <span>Concluídos</span>
                            <strong>${formatarInteiro(cliente.pedidos_concluidos)}</strong>
                        </div>
                        <div class="cliente-metrica">
                            <span>Em andamento</span>
                            <strong>${formatarInteiro(cliente.pedidos_em_andamento)}</strong>
                        </div>
                        <div class="cliente-metrica">
                            <span>Cancelados</span>
                            <strong>${formatarInteiro(cliente.pedidos_cancelados)}</strong>
                        </div>
                    </div>

                    <div class="cliente-valores">
                        <div>
                            <span>Total confirmado</span>
                            <strong>${formatarMoeda(cliente.total_compras)}</strong>
                        </div>
                        <div>
                            <span>Ticket médio</span>
                            <strong>${formatarMoeda(cliente.ticket_medio)}</strong>
                        </div>
                    </div>

                    <div class="cliente-card-rodape">
                        <span class="cliente-desde">Cliente desde ${formatarData(cliente.primeiro_pedido)}</span>
                        <button type="button" class="btn-historico" data-cliente-id="${escaparHtml(cliente.cliente_id)}">
                            <i class="fa-solid fa-clock-rotate-left"></i>
                            Ver histórico
                        </button>
                    </div>
                </article>
            `;
        }).join("");
    }

    async function mudarPagina(direcao) {
        const totalPaginas = Math.max(1, Math.ceil(estado.total / estado.porPagina));
        const novaPagina = Math.min(totalPaginas, Math.max(1, estado.pagina + direcao));
        if (novaPagina === estado.pagina) return;

        estado.pagina = novaPagina;
        atualizarUrl();
        await carregarClientes();
        document.getElementById("titulo-lista-clientes")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function atualizarPaginacaoClientes() {
        const paginacao = document.getElementById("paginacao-clientes");
        const anterior = document.getElementById("pagina-anterior-clientes");
        const proxima = document.getElementById("proxima-pagina-clientes");
        const info = document.getElementById("info-pagina-clientes");
        const totalPaginas = Math.max(1, Math.ceil(estado.total / estado.porPagina));

        if (!paginacao) return;
        paginacao.hidden = estado.total <= estado.porPagina;
        if (anterior) anterior.disabled = estado.pagina <= 1;
        if (proxima) proxima.disabled = estado.pagina >= totalPaginas;
        if (info) info.textContent = `Página ${estado.pagina} de ${totalPaginas}`;
    }

    function atualizarResumoResultados() {
        const resumo = document.getElementById("resumo-resultados-clientes");
        if (!resumo) return;

        if (estado.total === 0) {
            resumo.textContent = "Nenhum cliente encontrado com os filtros atuais.";
            return;
        }

        const inicio = (estado.pagina - 1) * estado.porPagina + 1;
        const fim = Math.min(estado.pagina * estado.porPagina, estado.total);
        resumo.textContent = `Mostrando ${inicio}–${fim} de ${estado.total} ${estado.total === 1 ? "cliente" : "clientes"}.`;
    }

    function mostrarCarregamentoClientes() {
        const lista = document.getElementById("lista-clientes-loja");
        if (lista) {
            lista.innerHTML = `
                <div class="estado-clientes">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <h3>Carregando clientes...</h3>
                    <p>Aguarde enquanto organizamos o histórico da loja.</p>
                </div>
            `;
        }
        const paginacao = document.getElementById("paginacao-clientes");
        if (paginacao) paginacao.hidden = true;
    }

    function mostrarEstadoErro(mensagem, rotuloBotao) {
        const lista = document.getElementById("lista-clientes-loja");
        if (!lista) return;

        lista.innerHTML = `
            <div class="estado-clientes">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <h3>Algo não saiu como esperado</h3>
                <p>${escaparHtml(mensagem)}</p>
                <button type="button" data-recarregar-clientes>${escaparHtml(rotuloBotao)}</button>
            </div>
        `;
    }

    async function abrirModalHistorico(clienteId, botaoOrigem) {
        const cliente = estado.clientes.get(clienteId);
        const modal = document.getElementById("modal-historico-cliente");
        if (!cliente || !modal) return;

        estado.clienteSelecionado = cliente;
        estado.historicoPagina = 1;
        estado.focoAnterior = botaoOrigem || document.activeElement;

        definirTexto("titulo-modal-cliente", cliente.nome || "Cliente");
        renderizarResumoModal(cliente);
        modal.hidden = false;
        document.body.classList.add("modal-aberto");
        document.getElementById("btn-fechar-modal-cliente")?.focus();

        await carregarHistoricoCliente();
    }

    function fecharModalHistorico() {
        const modal = document.getElementById("modal-historico-cliente");
        if (!modal || modal.hidden) return;

        estado.requisicaoHistorico += 1;
        modal.hidden = true;
        document.body.classList.remove("modal-aberto");
        estado.clienteSelecionado = null;

        if (estado.focoAnterior && typeof estado.focoAnterior.focus === "function") {
            estado.focoAnterior.focus();
        }
        estado.focoAnterior = null;
    }

    function renderizarResumoModal(cliente) {
        const resumo = document.getElementById("resumo-modal-cliente");
        if (!resumo) return;

        resumo.innerHTML = `
            <div>
                <span>Total confirmado</span>
                <strong>${formatarMoeda(cliente.total_compras)}</strong>
            </div>
            <div>
                <span>Pedidos no período</span>
                <strong>${formatarInteiro(cliente.total_pedidos)}</strong>
            </div>
            <div>
                <span>Cliente desde</span>
                <strong>${formatarData(cliente.primeiro_pedido)}</strong>
            </div>
        `;
    }

    async function carregarHistoricoCliente() {
        const cliente = estado.clienteSelecionado;
        if (!cliente) return;

        const requisicao = ++estado.requisicaoHistorico;
        mostrarCarregamentoHistorico();

        const inicio = (estado.historicoPagina - 1) * estado.historicoPorPagina;
        const fim = inicio + estado.historicoPorPagina - 1;

        let consulta = window.db
            .from("pedidos")
            .select(`
                id,
                status,
                subtotal_produtos,
                frete,
                valor_total,
                forma_pagamento,
                created_at,
                itens_pedido (
                    id,
                    quantidade,
                    preco_unitario,
                    subtotal,
                    produtos (id, nome)
                )
            `, { count: "exact" })
            .eq("loja_id", estado.loja.id)
            .eq("cliente_id", cliente.cliente_id);

        if (estado.periodo > 0) {
            const inicioPeriodo = new Date();
            inicioPeriodo.setDate(inicioPeriodo.getDate() - estado.periodo);
            consulta = consulta.gte("created_at", inicioPeriodo.toISOString());
        }

        const { data, error, count } = await consulta
            .order("created_at", { ascending: false })
            .range(inicio, fim);

        if (requisicao !== estado.requisicaoHistorico || !estado.clienteSelecionado) return;

        if (error) {
            console.error("Erro ao carregar histórico do cliente:", error);
            mostrarErroHistorico();
            return;
        }

        estado.historicoTotal = Number(count || 0);
        renderizarHistorico(Array.isArray(data) ? data : []);
        atualizarPaginacaoHistorico();
    }

    function mostrarCarregamentoHistorico() {
        const lista = document.getElementById("lista-historico-cliente");
        if (lista) {
            lista.innerHTML = `
                <div class="estado-clientes">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <h3>Carregando histórico...</h3>
                </div>
            `;
        }
        const paginacao = document.getElementById("paginacao-historico-cliente");
        if (paginacao) paginacao.hidden = true;
    }

    function mostrarErroHistorico() {
        const lista = document.getElementById("lista-historico-cliente");
        if (!lista) return;

        lista.innerHTML = `
            <div class="estado-clientes">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <h3>Histórico indisponível</h3>
                <p>Não foi possível carregar os pedidos deste cliente.</p>
            </div>
        `;
    }

    function renderizarHistorico(pedidos) {
        const lista = document.getElementById("lista-historico-cliente");
        if (!lista) return;

        if (!pedidos.length) {
            lista.innerHTML = `
                <div class="estado-clientes">
                    <i class="fa-solid fa-receipt"></i>
                    <h3>Nenhum pedido encontrado</h3>
                    <p>Não há pedidos para mostrar neste histórico.</p>
                </div>
            `;
            return;
        }

        lista.innerHTML = pedidos.map((pedido) => {
            const status = obterStatusPedido(pedido.status);
            const itens = Array.isArray(pedido.itens_pedido) ? pedido.itens_pedido : [];
            const resumoItens = itens.length
                ? itens.map((item) => {
                    const nome = item.produtos?.nome || "Produto indisponível";
                    return `${escaparHtml(nome)} <strong>× ${formatarInteiro(item.quantidade)}</strong>`;
                }).join(" · ")
                : "Itens indisponíveis";

            return `
                <article class="pedido-historico">
                    <div class="pedido-historico-topo">
                        <div class="pedido-historico-identificacao">
                            <strong>Pedido #${escaparHtml(formatarNumeroPedido(pedido.id))}</strong>
                            <span>${formatarDataHora(pedido.created_at)}</span>
                        </div>
                        <span class="status-pedido ${status.classe}">
                            <i class="${status.icone}"></i>
                            ${status.rotulo}
                        </span>
                    </div>

                    <div class="pedido-historico-corpo">
                        <p class="pedido-itens-resumo">${resumoItens}</p>
                        <div class="pedido-valores">
                            <span>Total do pedido</span>
                            <strong>${formatarMoeda(pedido.valor_total)}</strong>
                            <small>${escaparHtml(formatarPagamento(pedido.forma_pagamento))}</small>
                        </div>
                    </div>
                </article>
            `;
        }).join("");
    }

    async function mudarPaginaHistorico(direcao) {
        const totalPaginas = Math.max(1, Math.ceil(estado.historicoTotal / estado.historicoPorPagina));
        const novaPagina = Math.min(totalPaginas, Math.max(1, estado.historicoPagina + direcao));
        if (novaPagina === estado.historicoPagina) return;

        estado.historicoPagina = novaPagina;
        await carregarHistoricoCliente();
    }

    function atualizarPaginacaoHistorico() {
        const paginacao = document.getElementById("paginacao-historico-cliente");
        const anterior = document.getElementById("historico-anterior");
        const proximo = document.getElementById("historico-proximo");
        const info = document.getElementById("info-pagina-historico");
        const totalPaginas = Math.max(1, Math.ceil(estado.historicoTotal / estado.historicoPorPagina));

        if (!paginacao) return;
        paginacao.hidden = estado.historicoTotal <= estado.historicoPorPagina;
        if (anterior) anterior.disabled = estado.historicoPagina <= 1;
        if (proximo) proximo.disabled = estado.historicoPagina >= totalPaginas;
        if (info) info.textContent = `Página ${estado.historicoPagina} de ${totalPaginas}`;
    }

    function lerFiltrosDaUrl() {
        const parametros = new URLSearchParams(window.location.search);
        estado.busca = String(parametros.get("busca") || "").trim().slice(0, 80);
        estado.periodo = normalizarPeriodo(parametros.get("periodo"));
        estado.ordenacao = normalizarOrdenacao(parametros.get("ordem"));
        estado.pagina = Math.max(1, Number.parseInt(parametros.get("pagina"), 10) || 1);
    }

    function atualizarUrl() {
        const parametros = new URLSearchParams();
        if (estado.busca) parametros.set("busca", estado.busca);
        if (estado.periodo) parametros.set("periodo", String(estado.periodo));
        if (estado.ordenacao !== "recentes") parametros.set("ordem", estado.ordenacao);
        if (estado.pagina > 1) parametros.set("pagina", String(estado.pagina));

        const consulta = parametros.toString();
        const novaUrl = `${window.location.pathname}${consulta ? `?${consulta}` : ""}`;
        window.history.replaceState({}, "", novaUrl);
    }

    function atualizarCamposDosFiltros() {
        const busca = document.getElementById("busca-clientes");
        const periodo = document.getElementById("periodo-clientes");
        const ordenacao = document.getElementById("ordenacao-clientes");

        if (busca) busca.value = estado.busca;
        if (periodo) periodo.value = String(estado.periodo);
        if (ordenacao) ordenacao.value = estado.ordenacao;
    }

    function normalizarPeriodo(valor) {
        const periodo = Number.parseInt(valor, 10) || 0;
        return PERIODOS_VALIDOS.has(periodo) ? periodo : 0;
    }

    function normalizarOrdenacao(valor) {
        return ORDENACOES_VALIDAS.has(valor) ? valor : "recentes";
    }

    function obterStatusPedido(statusOriginal) {
        const status = String(statusOriginal || "").toLowerCase();
        const configuracoes = {
            aguardando_pagamento: ["Aguardando pagamento", "status-aguardando", "fa-solid fa-clock"],
            pendente: ["Pendente", "status-aguardando", "fa-solid fa-clock"],
            pago: ["Pago", "status-pago", "fa-solid fa-circle-check"],
            em_preparacao: ["Em preparação", "status-preparacao", "fa-solid fa-box-open"],
            preparando: ["Em preparação", "status-preparacao", "fa-solid fa-box-open"],
            enviado: ["Enviado", "status-enviado", "fa-solid fa-truck"],
            entregue: ["Entregue", "status-entregue", "fa-solid fa-circle-check"],
            finalizado: ["Finalizado", "status-entregue", "fa-solid fa-circle-check"],
            cancelado: ["Cancelado", "status-cancelado", "fa-solid fa-circle-xmark"]
        };
        const [rotulo, classe, icone] = configuracoes[status] || ["Status não informado", "status-aguardando", "fa-solid fa-circle-info"];
        return { rotulo, classe, icone };
    }

    function obterIniciais(nome) {
        const partes = String(nome || "Cliente")
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        if (!partes.length) return "CL";
        if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
        return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
    }

    function formatarNumeroPedido(id) {
        const texto = String(id || "").replaceAll("-", "");
        return texto ? texto.slice(-8).toUpperCase() : "—";
    }

    function formatarPagamento(valor) {
        const pagamentos = {
            pix: "Pix",
            dinheiro: "Dinheiro",
            cartao: "Cartão",
            cartao_credito: "Cartão de crédito",
            cartao_debito: "Cartão de débito"
        };
        const chave = String(valor || "").toLowerCase();
        return pagamentos[chave] || (valor ? String(valor) : "Pagamento não informado");
    }

    function formatarMoeda(valor) {
        const numero = Number(valor || 0);
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
        }).format(Number.isFinite(numero) ? numero : 0);
    }

    function formatarInteiro(valor) {
        const numero = Number(valor || 0);
        return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 })
            .format(Number.isFinite(numero) ? numero : 0);
    }

    function formatarData(valor) {
        if (!valor) return "—";
        const data = new Date(valor);
        if (Number.isNaN(data.getTime())) return "—";
        return new Intl.DateTimeFormat("pt-BR").format(data);
    }

    function formatarDataHora(valor) {
        if (!valor) return "Data não informada";
        const data = new Date(valor);
        if (Number.isNaN(data.getTime())) return "Data não informada";
        return new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short"
        }).format(data);
    }

    function definirTexto(id, texto) {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = texto;
    }

    function escaparHtml(valor) {
        return String(valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function notificar(mensagem, tipo = "info", titulo = null) {
        if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(mensagem, tipo, titulo);
        }
    }

    // Funções puras expostas para os testes automatizados do frontend.
    window.ClientesLojaTestes = Object.freeze({
        normalizarPeriodo,
        normalizarOrdenacao,
        obterStatusPedido,
        obterIniciais,
        formatarNumeroPedido,
        escaparHtml
    });
})();
