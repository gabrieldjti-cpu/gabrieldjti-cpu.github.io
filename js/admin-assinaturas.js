// ==========================================
// ADMIN-ASSINATURAS.JS
// Mostra a situação da assinatura em cada loja do painel
// administrativo e permite ativar, renovar e encerrar.
// Toda regra é validada no banco pelas funções *_admin.
// ==========================================

(() => {
    "use strict";

    const SITUACOES = {
        ativa: { rotulo: "Assinatura ativa", classe: "ativa", icone: "fa-circle-check" },
        carencia: { rotulo: "Em carência", classe: "carencia", icone: "fa-hourglass-half" },
        expirada: { rotulo: "Assinatura expirada", classe: "expirada", icone: "fa-circle-xmark" },
        sem_assinatura: { rotulo: "Sem assinatura", classe: "sem", icone: "fa-circle-minus" }
    };

    let assinaturas = new Map();
    let perfisPessoais = new Set();
    let pedidos = new Map();
    let soPedidos = false;
    let carregando = null;
    let observador = null;

    function escapar(valor) {
        return String(valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function formatarData(valor) {
        if (!valor) return "";
        const data = new Date(valor);
        return Number.isNaN(data.getTime())
            ? ""
            : data.toLocaleDateString("pt-BR");
    }

    function avisar(mensagem, tipo, titulo) {
        if (typeof window.notificar === "function") {
            window.notificar(mensagem, tipo, titulo, 5000);
            return;
        }
        if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(mensagem, tipo, titulo, 5000);
            return;
        }
        window.alert(`${titulo}\n\n${mensagem}`);
    }

    async function confirmar(titulo, mensagem, textoConfirmar) {
        if (typeof window.confirmarAcao === "function") {
            return window.confirmarAcao({
                titulo,
                mensagem,
                textoConfirmar,
                textoCancelar: "Cancelar",
                tipo: "aviso"
            });
        }
        return window.confirm(`${titulo}\n\n${mensagem}`);
    }

    function descreverSituacao(assinatura) {
        const situacao = assinatura?.situacao || "sem_assinatura";

        if (situacao === "ativa") {
            return `Válida até ${formatarData(assinatura.fim_em)}`;
        }
        if (situacao === "carencia") {
            return `Terminou em ${formatarData(assinatura.fim_em)}. Anúncios no ar até ${formatarData(assinatura.carencia_ate)}`;
        }
        if (situacao === "expirada") {
            return `Terminou em ${formatarData(assinatura.fim_em)}`;
        }
        return "Esta loja ainda não assinou";
    }

    function criarBloco(lojaId, lojaAprovada) {
        if (perfisPessoais.has(lojaId)) {
            return `
                <div class="assinatura-admin" data-assinatura-loja="${escapar(lojaId)}">
                    <div class="assinatura-admin-info">
                        <span class="assinatura-admin-selo sem">
                            <i class="fa-solid fa-user"></i>
                            Perfil de anunciante
                        </span>
                        <small>Usuário comum no plano gratuito. Não tem assinatura.</small>
                    </div>
                </div>
            `;
        }

        const assinatura = assinaturas.get(lojaId);
        const situacao = assinatura?.situacao || "sem_assinatura";
        const config = SITUACOES[situacao] || SITUACOES.sem_assinatura;
        const id = escapar(lojaId);

        const botaoAtivar = lojaAprovada
            ? `
                <button type="button" class="btn-admin btn-primario" data-assinatura-acao="ativar" data-loja-id="${id}">
                    <i class="fa-solid fa-calendar-plus"></i>
                    ${situacao === "ativa" ? "Renovar 1 mês" : "Ativar 1 mês"}
                </button>
            `
            : `<small class="assinatura-admin-aviso">Aprove a loja para ativar a assinatura.</small>`;

        const botaoEncerrar = situacao === "ativa"
            ? `
                <button type="button" class="btn-admin btn-claro" data-assinatura-acao="encerrar" data-loja-id="${id}">
                    <i class="fa-solid fa-ban"></i>
                    Encerrar
                </button>
            `
            : "";

        const pedido = pedidos.get(lojaId);
        const avisoPedido = pedido
            ? `<span class="assinatura-admin-pedido"><i class="fa-solid fa-bell"></i> ${situacao === "sem_assinatura" ? "Assinatura solicitada" : "Renovação solicitada"} em ${escapar(formatarData(pedido.criado_em))}</span>`
            : "";

        return `
            <div class="assinatura-admin" data-assinatura-loja="${id}">
                <div class="assinatura-admin-info">
                    ${avisoPedido}
                    <span class="assinatura-admin-selo ${config.classe}">
                        <i class="fa-solid ${config.icone}"></i>
                        ${config.rotulo}
                    </span>
                    <small>${escapar(descreverSituacao(assinatura))}</small>
                </div>
                <div class="assinatura-admin-acoes">
                    ${botaoAtivar}
                    ${botaoEncerrar}
                </div>
            </div>
        `;
    }

    // "lojasAdmin" é a lista mantida por admin-dashboard.js.
    function lojaEstaAprovada(lojaId, card) {
        if (typeof lojasAdmin !== "undefined" && Array.isArray(lojasAdmin)) {
            const loja = lojasAdmin.find(item => item.id === lojaId);
            if (loja) return loja.status_aprovacao === "aprovada";
        }
        return Boolean(card.querySelector(".status-admin.status-aprovada"));
    }

    function decorarCards() {
        const lista = document.getElementById("listaLojasAdmin");
        if (!lista) return;

        // Evita que a própria decoração dispare o observador em laço.
        observador?.disconnect();

        lista.querySelectorAll(".loja-admin-card[data-loja-id]").forEach(card => {
            const lojaId = card.dataset.lojaId;
            const aprovada = lojaEstaAprovada(lojaId, card);
            const existente = card.querySelector(".assinatura-admin");
            const html = criarBloco(lojaId, aprovada);

            if (existente) {
                existente.outerHTML = html;
                return;
            }

            const acoes = card.querySelector(".loja-admin-acoes");
            if (acoes) {
                acoes.insertAdjacentHTML("beforebegin", html);
            } else {
                card.insertAdjacentHTML("beforeend", html);
            }
        });

        aplicarFiltroPedidos();
        observador?.observe(lista, { childList: true });
    }

    function aplicarFiltroPedidos() {
        const lista = document.getElementById("listaLojasAdmin");
        if (!lista) return;

        lista.querySelectorAll(".loja-admin-card[data-loja-id]").forEach(card => {
            card.hidden = soPedidos && !pedidos.has(card.dataset.lojaId);
        });

        const contador = document.getElementById("contadorPedidosAssinatura");
        if (contador) contador.textContent = String(pedidos.size);
    }

    // Filtro "Assinatura solicitada" ao lado do filtro de status.
    function criarFiltroPedidos() {
        if (document.getElementById("filtroPedidosAssinatura")) return;

        const status = document.getElementById("filtroStatusAdmin");
        const campo = status?.closest("label");
        if (!campo) return;

        const rotulo = document.createElement("label");
        rotulo.className = "campo-admin filtro-pedidos-assinatura";
        rotulo.innerHTML = `
            <span>Assinatura</span>
            <span class="filtro-pedidos-opcao">
                <input type="checkbox" id="filtroPedidosAssinatura">
                Só assinatura solicitada (<strong id="contadorPedidosAssinatura">0</strong>)
            </span>
        `;
        campo.insertAdjacentElement("afterend", rotulo);

        rotulo.querySelector("input").addEventListener("change", event => {
            soPedidos = event.target.checked;
            aplicarFiltroPedidos();
        });
    }

    async function carregarAssinaturas() {
        if (!window.db) return;
        if (carregando) return carregando;

        carregando = (async () => {
            try {
                const { data, error } = await window.db.rpc("listar_assinaturas_admin");
                if (error) throw error;

                assinaturas = new Map(
                    (data || []).map(item => [item.loja_id, item])
                );

                // Perfis de anunciante usam o plano gratuito, sem assinatura.
                const pessoais = await window.db
                    .from("lojas")
                    .select("id")
                    .eq("tipo", "pessoal");

                perfisPessoais = new Set(
                    (pessoais.data || []).map(item => item.id)
                );

                // Pedidos de assinatura ainda não atendidos.
                const abertos = await window.db
                    .from("solicitacoes_assinatura")
                    .select("loja_id,criado_em")
                    .is("atendida_em", null);

                pedidos = new Map(
                    (abertos.data || []).map(item => [item.loja_id, item])
                );
            } catch (erro) {
                console.error("Erro ao carregar assinaturas:", erro);
            } finally {
                carregando = null;
                decorarCards();
            }
        })();

        return carregando;
    }

    async function ativar(lojaId) {
        const atual = assinaturas.get(lojaId);
        const renovando = atual?.situacao === "ativa";

        const confirmou = await confirmar(
            renovando ? "Renovar a assinatura?" : "Ativar a assinatura?",
            renovando
                ? "Será somado 1 mês ao fim da assinatura atual."
                : "A loja terá 1 mês de assinatura a partir de agora. Confirme somente depois de receber o pagamento.",
            renovando ? "Renovar" : "Ativar"
        );
        if (!confirmou) return;

        try {
            const { data, error } = await window.db.rpc("ativar_assinatura_loja_admin", {
                p_loja_id: lojaId,
                p_meses: 1
            });
            if (error) throw error;

            avisar(
                `Assinatura válida até ${formatarData(data?.fim_em)}.`,
                "sucesso",
                renovando ? "Assinatura renovada" : "Assinatura ativada"
            );
        } catch (erro) {
            console.error("Erro ao ativar assinatura:", erro);
            avisar(
                erro?.message || "Não foi possível ativar a assinatura.",
                "erro",
                "Erro na assinatura"
            );
        }

        await carregarAssinaturas();
    }

    async function encerrar(lojaId) {
        const confirmou = await confirmar(
            "Encerrar a assinatura?",
            "A loja ficará pausada e os anúncios continuarão no ar por mais 15 dias.",
            "Encerrar"
        );
        if (!confirmou) return;

        try {
            const { error } = await window.db.rpc("encerrar_assinatura_loja_admin", {
                p_loja_id: lojaId,
                p_motivo: null
            });
            if (error) throw error;

            avisar(
                "A loja entrou no período de 15 dias de carência.",
                "sucesso",
                "Assinatura encerrada"
            );
        } catch (erro) {
            console.error("Erro ao encerrar assinatura:", erro);
            avisar(
                erro?.message || "Não foi possível encerrar a assinatura.",
                "erro",
                "Erro na assinatura"
            );
        }

        await carregarAssinaturas();
    }

    function iniciar() {
        const lista = document.getElementById("listaLojasAdmin");
        if (!lista) return;

        criarFiltroPedidos();

        // A lista é redesenhada a cada busca ou filtro; recarrega as
        // assinaturas sempre que os cartões mudarem.
        observador = new MutationObserver(() => {
            if (lista.querySelector(".loja-admin-card")) {
                carregarAssinaturas();
            }
        });
        observador.observe(lista, { childList: true });

        lista.addEventListener("click", event => {
            const botao = event.target.closest?.("[data-assinatura-acao]");
            if (!botao || botao.disabled) return;

            const lojaId = botao.dataset.lojaId;
            botao.disabled = true;

            const acao = botao.dataset.assinaturaAcao === "encerrar"
                ? encerrar(lojaId)
                : ativar(lojaId);

            acao.finally(() => {
                if (botao.isConnected) botao.disabled = false;
            });
        });

        if (lista.querySelector(".loja-admin-card")) {
            carregarAssinaturas();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }
})();
