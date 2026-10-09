// ==========================================
// AVALIACOES-RECEBIDAS.JS
// Lista as avaliações que o vendedor recebeu e permite responder.
// Usado no painel da loja e na página Interessados.
// ==========================================

(() => {
    "use strict";

    const $ = id => document.getElementById(id);

    function escapar(valor) {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function estrelas(nota) {
        const n = Math.max(0, Math.min(5, Number(nota) || 0));
        return Array.from({ length: 5 }, (_, i) =>
            `<i class="fa-${i < n ? "solid" : "regular"} fa-star" aria-hidden="true"></i>`
        ).join("");
    }

    function data(valor) {
        const d = new Date(valor);
        return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
    }

    function avisar(mensagem, tipo, titulo) {
        if (typeof window.notificar === "function") {
            window.notificar(mensagem, tipo, titulo, 4500);
        } else if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(mensagem, tipo, titulo, 4500);
        }
    }

    function criarItem(item) {
        return `
            <article class="avaliacao-recebida${item.oculta ? " oculta" : ""}" data-avaliacao="${escapar(item.id)}">
                <div class="avaliacao-recebida-topo">
                    <span class="avaliacao-recebida-estrelas" aria-label="${Number(item.nota)} de 5 estrelas">${estrelas(item.nota)}</span>
                    <small>${escapar(item.avaliador_nome)} · ${escapar(item.produto_nome || "")} · ${escapar(data(item.criado_em))}</small>
                </div>
                ${item.oculta ? '<p class="avaliacao-recebida-aviso">Ocultada pela administração. Não aparece no site.</p>' : ""}
                <p>${item.comentario ? escapar(item.comentario) : "<em>Sem comentário.</em>"}</p>
                ${item.resposta
                    ? `<div class="avaliacao-recebida-resposta"><strong>Sua resposta</strong><p>${escapar(item.resposta)}</p></div>`
                    : `
                        <form class="avaliacao-recebida-form" data-responder="${escapar(item.id)}" novalidate>
                            <label class="sr-only" for="resposta-${escapar(item.id)}">Sua resposta</label>
                            <textarea id="resposta-${escapar(item.id)}" maxlength="1000" rows="2" placeholder="Escreva uma resposta (opcional)"></textarea>
                            <button type="submit">Responder</button>
                        </form>
                    `}
            </article>
        `;
    }

    async function carregar() {
        const lista = $("lista-avaliacoes-recebidas");
        if (!lista || !window.db) return;

        try {
            const { data: sessao } = await window.db.auth.getSession();
            if (!sessao?.session) return;

            const { data: itens, error } = await window.db.rpc("listar_minhas_avaliacoes_recebidas");
            if (error) throw error;

            lista.innerHTML = (itens || []).length
                ? itens.map(criarItem).join("")
                : '<p class="avaliacoes-recebidas-vazio">Você ainda não recebeu avaliações. Elas aparecem depois que você confirma uma venda em Interessados.</p>';
        } catch (erro) {
            console.error("Erro ao carregar as avaliações recebidas:", erro);
            lista.textContent = "Não foi possível carregar as avaliações.";
        }
    }

    async function responder(form) {
        const campo = form.querySelector("textarea");
        const resposta = String(campo?.value || "").trim();
        if (resposta.length < 2) {
            avisar("Escreva a resposta antes de enviar.", "aviso", "Resposta vazia");
            campo?.focus();
            return;
        }

        const botao = form.querySelector("button");
        if (botao) botao.disabled = true;

        try {
            const { error } = await window.db.rpc("responder_avaliacao_vendedor", {
                p_avaliacao_id: form.dataset.responder,
                p_resposta: resposta
            });
            if (error) throw error;
            avisar("Resposta publicada.", "sucesso", "Avaliações");
            await carregar();
        } catch (erro) {
            console.error("Erro ao responder:", erro);
            avisar(erro?.message || "Não foi possível responder.", "erro", "Erro");
            if (botao) botao.disabled = false;
        }
    }

    function iniciar() {
        $("lista-avaliacoes-recebidas")?.addEventListener("submit", evento => {
            const form = evento.target.closest("[data-responder]");
            if (!form) return;
            evento.preventDefault();
            responder(form);
        });
        carregar();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }
})();
