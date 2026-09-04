// ==========================================
// PÁGINA CENTRAL DE NOTIFICAÇÕES
// ==========================================

(() => {
    "use strict";

    const TAMANHO_PAGINA = 15;
    const TIPOS_POR_FILTRO = {
        pedidos: ["pedido_novo", "pedido_status"],
        cancelamentos: ["cancelamento_solicitado", "cancelamento_resolvido"],
        lojas: ["loja_pendente", "loja_status"],
        estoque: ["estoque_baixo"],
        avaliacoes: ["avaliacao_nova"],
        moderacao: ["moderacao_nova", "moderacao_resolvida", "conteudo_moderado"]
    };

    const APRESENTACAO_TIPOS = {
        pedido_novo: { icone: "fa-solid fa-bag-shopping", classe: "pedido", nome: "Pedido" },
        pedido_status: { icone: "fa-solid fa-box", classe: "pedido", nome: "Pedido" },
        cancelamento_solicitado: { icone: "fa-solid fa-rotate-left", classe: "cancelamento", nome: "Cancelamento" },
        cancelamento_resolvido: { icone: "fa-solid fa-circle-check", classe: "cancelamento", nome: "Cancelamento" },
        estoque_baixo: { icone: "fa-solid fa-boxes-stacked", classe: "estoque", nome: "Estoque" },
        avaliacao_nova: { icone: "fa-solid fa-star", classe: "avaliacao", nome: "Avaliação" },
        loja_pendente: { icone: "fa-solid fa-shop-lock", classe: "loja", nome: "Loja" },
        loja_status: { icone: "fa-solid fa-store", classe: "loja", nome: "Loja" },
        moderacao_nova: { icone: "fa-solid fa-shield-halved", classe: "moderacao", nome: "Moderação" },
        moderacao_resolvida: { icone: "fa-solid fa-clipboard-check", classe: "moderacao", nome: "Moderação" },
        conteudo_moderado: { icone: "fa-solid fa-eye-slash", classe: "moderacao", nome: "Moderação" }
    };

    const estado = {
        pagina: 1,
        total: 0,
        naoLidas: 0,
        leitura: "todas",
        tipo: "",
        carregando: false
    };

    const elementos = {};
    let recarregamentoPendente = null;

    function mapearElementos() {
        elementos.lista = document.getElementById("lista-notificacoes");
        elementos.paginacao = document.getElementById("paginacao-notificacoes");
        elementos.totalNaoLidas = document.getElementById("total-nao-lidas");
        elementos.rotuloNaoLidas = document.getElementById("rotulo-nao-lidas");
        elementos.textoResultado = document.getElementById("texto-resultado-notificacoes");
        elementos.btnTodasLidas = document.getElementById("btn-marcar-todas-lidas");
        elementos.filtroTipo = document.getElementById("filtro-tipo-notificacao");
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

    function notificar(mensagem, tipo = "info", titulo = null) {
        if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(mensagem, tipo, titulo);
        }
    }

    function linkSeguro(link) {
        const valor = String(link || "").trim();
        return /^[a-z0-9-]+[.]html(?:[?][a-z0-9_=&%-]+)?$/.test(valor)
            ? valor
            : "notificacoes.html";
    }

    function formatarData(data) {
        const instante = new Date(data);
        if (Number.isNaN(instante.getTime())) return "Agora";

        return new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(instante);
    }

    async function exigirUsuario() {
        if (!window.db) throw new Error("Supabase não foi inicializado.");

        const { data, error } = await window.db.auth.getSession();
        if (error) throw error;

        if (!data?.session) {
            try {
                sessionStorage.setItem("destino_apos_login_notificacoes", "notificacoes.html");
            } catch (erro) {
                console.warn("Não foi possível salvar o retorno do login:", erro);
            }
            window.location.replace("login.html");
            return false;
        }

        return true;
    }

    function renderizarCarregando() {
        elementos.lista.setAttribute("aria-busy", "true");
        elementos.lista.innerHTML = `
            <div class="notificacoes-estado">
                <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                <h3>Carregando notificações...</h3>
                <p>Estamos buscando seus avisos mais recentes.</p>
            </div>
        `;
    }

    function renderizarErro() {
        elementos.lista.setAttribute("aria-busy", "false");
        elementos.lista.innerHTML = `
            <div class="notificacoes-estado">
                <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
                <h3>Não foi possível carregar as notificações.</h3>
                <p>Confira sua conexão e tente novamente.</p>
                <button type="button" data-recarregar-notificacoes>
                    <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>
                    Tentar novamente
                </button>
            </div>
        `;
    }

    function renderizarVazio() {
        const filtrado = estado.leitura !== "todas" || Boolean(estado.tipo);
        elementos.lista.setAttribute("aria-busy", "false");
        elementos.lista.innerHTML = `
            <div class="notificacoes-estado">
                <i class="fa-regular fa-bell-slash" aria-hidden="true"></i>
                <h3>${filtrado ? "Nenhum aviso neste filtro." : "Tudo tranquilo por aqui."}</h3>
                <p>${filtrado
                    ? "Altere os filtros para consultar outras notificações."
                    : "Seus próximos avisos de pedidos, lojas e atividades aparecerão aqui."}</p>
                ${filtrado ? '<button type="button" data-limpar-filtros>Limpar filtros</button>' : '<a href="index.html">Continuar explorando</a>'}
            </div>
        `;
    }

    function criarItem(item) {
        const apresentacao = APRESENTACAO_TIPOS[item.tipo] || {
            icone: "fa-regular fa-bell",
            classe: "",
            nome: "Aviso"
        };
        const lida = Boolean(item.lida_em);
        const link = linkSeguro(item.link);

        return `
            <a
                href="${escaparAtributo(link)}"
                class="notificacao-item notificacao-item-link ${lida ? "" : "nao-lida"}"
                data-notificacao-id="${escaparAtributo(item.id)}"
                data-notificacao-lida="${lida ? "true" : "false"}"
            >
                <span class="notificacao-icone ${apresentacao.classe}" aria-hidden="true">
                    <i class="${apresentacao.icone}"></i>
                </span>
                <span class="notificacao-corpo">
                    ${lida ? "" : '<span class="notificacao-leitura-acessivel">Não lida. </span>'}
                    <h3>${escaparHTML(item.titulo)}</h3>
                    <p>${escaparHTML(item.mensagem)}</p>
                    <span class="notificacao-meta">
                        <span>${escaparHTML(apresentacao.nome)}</span>
                        <span aria-hidden="true">•</span>
                        <time datetime="${escaparAtributo(item.criado_em)}">${escaparHTML(formatarData(item.criado_em))}</time>
                    </span>
                </span>
                <span class="notificacao-acao" aria-hidden="true">
                    <i class="fa-solid fa-chevron-right"></i>
                </span>
            </a>
        `;
    }

    function atualizarResumo() {
        elementos.totalNaoLidas.textContent = String(estado.naoLidas);
        elementos.rotuloNaoLidas.textContent = estado.naoLidas === 1
            ? "não lida"
            : "não lidas";
        elementos.btnTodasLidas.disabled = estado.naoLidas === 0 || estado.carregando;
    }

    function renderizarPaginacao() {
        const paginas = Math.max(1, Math.ceil(estado.total / TAMANHO_PAGINA));
        elementos.paginacao.hidden = estado.total <= TAMANHO_PAGINA;

        if (elementos.paginacao.hidden) {
            elementos.paginacao.innerHTML = "";
            return;
        }

        elementos.paginacao.innerHTML = `
            <button type="button" data-pagina="${estado.pagina - 1}" ${estado.pagina <= 1 ? "disabled" : ""}>
                <i class="fa-solid fa-chevron-left" aria-hidden="true"></i>
                Anterior
            </button>
            <span>Página ${estado.pagina} de ${paginas}</span>
            <button type="button" data-pagina="${estado.pagina + 1}" ${estado.pagina >= paginas ? "disabled" : ""}>
                Próxima
                <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
            </button>
        `;
    }

    async function consultarNaoLidas() {
        const { count, error } = await window.db
            .from("notificacoes")
            .select("id", { count: "exact", head: true })
            .is("lida_em", null);

        if (error) throw error;
        estado.naoLidas = count || 0;
    }

    async function carregarNotificacoes({ silencioso = false } = {}) {
        if (estado.carregando) return;

        estado.carregando = true;
        atualizarResumo();
        if (!silencioso) renderizarCarregando();

        const inicio = (estado.pagina - 1) * TAMANHO_PAGINA;
        const fim = inicio + TAMANHO_PAGINA - 1;

        try {
            let consulta = window.db
                .from("notificacoes")
                .select("id,tipo,titulo,mensagem,link,lida_em,criado_em", { count: "exact" })
                .order("criado_em", { ascending: false })
                .range(inicio, fim);

            if (estado.leitura === "nao_lidas") {
                consulta = consulta.is("lida_em", null);
            }

            const tipos = TIPOS_POR_FILTRO[estado.tipo];
            if (tipos?.length) {
                consulta = consulta.in("tipo", tipos);
            }

            const [resultado] = await Promise.all([
                consulta,
                consultarNaoLidas()
            ]);

            if (resultado.error) throw resultado.error;

            estado.total = resultado.count || 0;
            const paginas = Math.max(1, Math.ceil(estado.total / TAMANHO_PAGINA));
            if (estado.pagina > paginas) {
                estado.pagina = paginas;
                estado.carregando = false;
                return carregarNotificacoes({ silencioso });
            }

            elementos.lista.setAttribute("aria-busy", "false");
            if (!resultado.data?.length) {
                renderizarVazio();
            } else {
                elementos.lista.innerHTML = resultado.data.map(criarItem).join("");
            }

            elementos.textoResultado.textContent = `${estado.total} ${estado.total === 1 ? "notificação encontrada" : "notificações encontradas"}`;
            renderizarPaginacao();
        } catch (erro) {
            console.error("Erro ao carregar notificações:", erro);
            renderizarErro();
            elementos.textoResultado.textContent = "Falha ao carregar";
        } finally {
            estado.carregando = false;
            atualizarResumo();
        }
    }

    async function marcarComoLida(id) {
        if (!id) return;

        const { error } = await window.db
            .from("notificacoes")
            .update({ lida_em: new Date().toISOString() })
            .eq("id", id)
            .is("lida_em", null);

        if (error) throw error;
    }

    async function marcarTodasComoLidas() {
        if (estado.naoLidas === 0 || estado.carregando) return;

        elementos.btnTodasLidas.disabled = true;

        try {
            const { error } = await window.db
                .from("notificacoes")
                .update({ lida_em: new Date().toISOString() })
                .is("lida_em", null);

            if (error) throw error;

            estado.naoLidas = 0;
            notificar("Todas as notificações foram marcadas como lidas.", "sucesso");
            await carregarNotificacoes({ silencioso: true });
        } catch (erro) {
            console.error("Erro ao marcar notificações:", erro);
            notificar("Não foi possível marcar as notificações como lidas.", "erro");
        } finally {
            atualizarResumo();
        }
    }

    function limparFiltros() {
        estado.leitura = "todas";
        estado.tipo = "";
        estado.pagina = 1;
        elementos.filtroTipo.value = "";
        document.querySelectorAll("[data-leitura]").forEach(botao => {
            const ativo = botao.dataset.leitura === "todas";
            botao.classList.toggle("ativo", ativo);
            botao.setAttribute("aria-pressed", String(ativo));
        });
        carregarNotificacoes();
    }

    function configurarEventos() {
        document.addEventListener("click", async event => {
            const filtro = event.target.closest("[data-leitura]");
            if (filtro) {
                estado.leitura = filtro.dataset.leitura || "todas";
                estado.pagina = 1;
                document.querySelectorAll("[data-leitura]").forEach(botao => {
                    const ativo = botao === filtro;
                    botao.classList.toggle("ativo", ativo);
                    botao.setAttribute("aria-pressed", String(ativo));
                });
                carregarNotificacoes();
                return;
            }

            const pagina = event.target.closest("[data-pagina]");
            if (pagina && !pagina.disabled) {
                estado.pagina = Math.max(1, Number(pagina.dataset.pagina || 1));
                carregarNotificacoes();
                window.scrollTo({ top: 0, behavior: "smooth" });
                return;
            }

            if (event.target.closest("[data-recarregar-notificacoes]")) {
                carregarNotificacoes();
                return;
            }

            if (event.target.closest("[data-limpar-filtros]")) {
                limparFiltros();
                return;
            }

            const item = event.target.closest("[data-notificacao-id]");
            if (item && item.dataset.notificacaoLida !== "true") {
                event.preventDefault();
                try {
                    await marcarComoLida(item.dataset.notificacaoId);
                } catch (erro) {
                    console.warn("Não foi possível marcar a notificação como lida:", erro);
                }
                window.location.href = item.href;
            }
        });

        elementos.filtroTipo.addEventListener("change", () => {
            estado.tipo = elementos.filtroTipo.value;
            estado.pagina = 1;
            carregarNotificacoes();
        });

        elementos.btnTodasLidas.addEventListener("click", marcarTodasComoLidas);

        window.addEventListener("comercio:notificacao-alterada", () => {
            window.clearTimeout(recarregamentoPendente);
            recarregamentoPendente = window.setTimeout(
                () => carregarNotificacoes({ silencioso: true }),
                180
            );
        });
    }

    async function iniciar() {
        mapearElementos();
        configurarEventos();

        try {
            if (!await exigirUsuario()) return;
            await carregarNotificacoes();
        } catch (erro) {
            console.error("Erro ao iniciar a central de notificações:", erro);
            renderizarErro();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }
})();
