// ==========================================
// LIMITE-ANUNCIOS.JS
// No formulário do anúncio, avisa o usuário do plano gratuito quanto
// resta no ciclo e o leva de volta se o limite acabou. A regra é
// aplicada pelo banco; este aviso só evita preencher à toa.
// ==========================================

(() => {
    "use strict";

    function avisar(mensagem, tipo, titulo, tempo) {
        if (typeof window.notificar === "function") {
            window.notificar(mensagem, tipo, titulo, tempo);
            return;
        }
        if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(mensagem, tipo, titulo, tempo);
        }
    }

    async function verificar() {
        if (!window.db) return;

        try {
            const { data: sessao } = await window.db.auth.getSession();
            if (!sessao?.session) return;

            const { data, error } = await window.db.rpc("meu_limite_anuncios");
            if (error || !data || data.plano !== "gratuito" || data.limite === null) return;

            if (data.restantes === 0) {
                const reinicio = data.ciclo_fim
                    ? new Date(data.ciclo_fim).toLocaleDateString("pt-BR")
                    : "";

                avisar(
                    `Você já usou os ${data.limite} anúncios deste ciclo do plano gratuito.${reinicio ? ` Um novo ciclo começa em ${reinicio}.` : ""}`,
                    "aviso",
                    "Limite atingido",
                    6000
                );

                setTimeout(() => {
                    window.location.replace("meus-anuncios.html");
                }, 2500);
                return;
            }

            avisar(
                `Plano gratuito: este será o seu anúncio ${data.usados + 1} de ${data.limite} neste ciclo.`,
                "info",
                "Seu plano",
                5000
            );
        } catch (erro) {
            console.warn("Não foi possível verificar o limite do plano:", erro);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", verificar, { once: true });
    } else {
        verificar();
    }
})();
