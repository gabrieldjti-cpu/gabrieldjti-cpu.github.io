// ==========================================
// CENTRAL DE NOTIFICAÇÕES — CONTADOR GLOBAL
// ==========================================

(() => {
    "use strict";

    if (window.__centralNotificacoesIniciada) return;
    window.__centralNotificacoesIniciada = true;

    let usuarioId = null;
    let canal = null;
    let observador = null;
    let atualizacaoPendente = null;

    function criarBotaoAdmin() {
        if (document.getElementById("btnNotificacoes")) return;

        const acoes = document.querySelector(".admin-header-acoes");
        if (!acoes) return;

        const link = document.createElement("a");
        link.href = "notificacoes.html";
        link.id = "btnNotificacoes";
        link.className = "btn-admin btn-claro btn-notificacoes-admin";
        link.setAttribute("aria-label", "Notificações");
        link.hidden = true;
        link.innerHTML = `
            <i class="fa-regular fa-bell" aria-hidden="true"></i>
            <span>Notificações</span>
            <span id="contadorNotificacoes" class="contador-notificacoes" aria-hidden="true" hidden>0</span>
        `;

        acoes.prepend(link);
    }

    function obterBotao() {
        criarBotaoAdmin();
        return document.getElementById("btnNotificacoes");
    }

    function exibirBotao(exibir) {
        const botao = obterBotao();
        if (!botao) return;

        botao.hidden = !exibir;
        botao.style.display = exibir ? "" : "none";
    }

    function renderizarContador(total) {
        const botao = obterBotao();
        const contador = document.getElementById("contadorNotificacoes");
        if (!botao || !contador) return;

        const quantidade = Math.max(0, Number(total || 0));
        contador.textContent = quantidade > 99 ? "99+" : String(quantidade);
        contador.hidden = quantidade === 0;
        botao.setAttribute(
            "aria-label",
            quantidade === 0
                ? "Notificações, nenhuma não lida"
                : `Notificações, ${quantidade} ${quantidade === 1 ? "não lida" : "não lidas"}`
        );
    }

    async function atualizarContador() {
        if (!window.db || !usuarioId) {
            renderizarContador(0);
            return;
        }

        const { count, error } = await window.db
            .from("notificacoes")
            .select("id", { count: "exact", head: true })
            .is("lida_em", null);

        if (error) {
            console.warn("Não foi possível atualizar as notificações:", error);
            return;
        }

        renderizarContador(count || 0);
    }

    function agendarAtualizacao() {
        window.clearTimeout(atualizacaoPendente);
        atualizacaoPendente = window.setTimeout(atualizarContador, 120);
    }

    function removerCanal() {
        if (canal && window.db) {
            window.db.removeChannel(canal);
        }
        canal = null;
    }

    function assinarTempoReal(id) {
        removerCanal();
        if (!window.db || !id) return;

        canal = window.db
            .channel(`notificacoes-${id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "notificacoes",
                    filter: `usuario_id=eq.${id}`
                },
                payload => {
                    agendarAtualizacao();
                    window.dispatchEvent(new CustomEvent(
                        "comercio:notificacao-alterada",
                        { detail: payload }
                    ));

                    if (
                        payload.eventType === "INSERT"
                        && typeof window.mostrarAlerta === "function"
                    ) {
                        window.mostrarAlerta(
                            payload.new?.mensagem || "Você recebeu uma nova notificação.",
                            "info",
                            payload.new?.titulo || "Nova notificação",
                            5000
                        );
                    }
                }
            )
            .subscribe(status => {
                if (status === "CHANNEL_ERROR") {
                    console.warn("A atualização em tempo real das notificações foi interrompida.");
                }
            });
    }

    async function configurarUsuario(id) {
        const novoId = id || null;

        if (usuarioId === novoId) {
            exibirBotao(Boolean(novoId));
            agendarAtualizacao();
            return;
        }

        usuarioId = novoId;
        removerCanal();
        exibirBotao(Boolean(usuarioId));
        renderizarContador(0);

        if (!usuarioId) return;

        await atualizarContador();
        assinarTempoReal(usuarioId);
    }

    function observarCabecalho() {
        if (observador || !document.body) return;

        if (obterBotao()) {
            return;
        }

        observador = new MutationObserver(() => {
            if (obterBotao()) {
                observador.disconnect();
                observador = null;
                exibirBotao(Boolean(usuarioId));
                renderizarContador(0);
                if (usuarioId) agendarAtualizacao();
            }
        });

        observador.observe(document.body, { childList: true, subtree: true });
    }

    async function iniciar() {
        if (!window.db) return;

        observarCabecalho();

        const { data, error } = await window.db.auth.getSession();
        if (error) {
            console.warn("Não foi possível iniciar as notificações:", error);
            return;
        }

        await configurarUsuario(data?.session?.user?.id || null);

        window.db.auth.onAuthStateChange((_evento, sessao) => {
            window.setTimeout(
                () => configurarUsuario(sessao?.user?.id || null),
                0
            );
        });
    }

    window.addEventListener("beforeunload", removerCanal, { once: true });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }
})();
