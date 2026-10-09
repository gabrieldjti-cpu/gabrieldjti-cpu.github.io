// ==========================================
// DENUNCIAR-AVALIACAO.JS
// Botão "Denunciar" nas avaliações de vendedor (página do anúncio e
// página da loja). Abre um campo para o motivo e envia ao admin.
// ==========================================

(() => {
    "use strict";

    function avisar(mensagem, tipo, titulo) {
        if (typeof window.notificar === "function") {
            window.notificar(mensagem, tipo, titulo, 4500);
        } else if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(mensagem, tipo, titulo, 4500);
        }
    }

    function abrirFormulario(botao) {
        const card = botao.closest("article, li");
        if (!card || card.querySelector(".denuncia-avaliacao-form")) return;

        const form = document.createElement("form");
        form.className = "denuncia-avaliacao-form";
        form.dataset.avaliacao = botao.dataset.denunciarAvaliacaoVendedor;
        form.noValidate = true;
        form.innerHTML = `
            <label>O que há de errado com esta avaliação?
                <textarea maxlength="500" rows="2" required placeholder="Ex.: ofensiva, falsa, fala de outra pessoa"></textarea>
            </label>
            <div class="denuncia-avaliacao-acoes">
                <button type="submit">Enviar denúncia</button>
                <button type="button" data-cancelar>Cancelar</button>
            </div>
        `;
        botao.after(form);
        botao.hidden = true;
        form.querySelector("textarea")?.focus();
    }

    async function enviar(form) {
        const motivo = String(form.querySelector("textarea")?.value || "").trim();
        if (motivo.length < 5) {
            avisar("Conte em poucas palavras o motivo (pelo menos 5 letras).", "aviso", "Falta o motivo");
            return;
        }

        const { data: sessao } = await window.db.auth.getSession();
        if (!sessao?.session) {
            avisar("Entre na sua conta para denunciar.", "info", "Entrar");
            return;
        }

        const botao = form.querySelector("button[type=submit]");
        if (botao) botao.disabled = true;

        try {
            const { data, error } = await window.db.rpc("denunciar_avaliacao_vendedor", {
                p_avaliacao_id: form.dataset.avaliacao,
                p_motivo: motivo
            });
            if (error) throw error;
            avisar(
                data?.ja_denunciada
                    ? "Você já tinha denunciado esta avaliação. A administração vai analisar."
                    : "Denúncia enviada. A administração vai analisar.",
                "sucesso",
                "Denúncia"
            );
            form.replaceWith(Object.assign(document.createElement("small"), {
                className: "denuncia-avaliacao-enviada",
                textContent: "Denúncia enviada."
            }));
        } catch (erro) {
            console.error("Erro ao denunciar avaliação:", erro);
            avisar(erro?.message || "Não foi possível enviar a denúncia.", "erro", "Erro");
            if (botao) botao.disabled = false;
        }
    }

    document.addEventListener("click", evento => {
        const botao = evento.target.closest("[data-denunciar-avaliacao-vendedor]");
        if (botao) {
            abrirFormulario(botao);
            return;
        }
        const cancelar = evento.target.closest(".denuncia-avaliacao-form [data-cancelar]");
        if (cancelar) {
            const form = cancelar.closest("form");
            const original = form?.previousElementSibling;
            if (original?.matches("[data-denunciar-avaliacao-vendedor]")) original.hidden = false;
            form?.remove();
        }
    });

    document.addEventListener("submit", evento => {
        const form = evento.target.closest(".denuncia-avaliacao-form");
        if (!form || !window.db) return;
        evento.preventDefault();
        enviar(form);
    });
})();
