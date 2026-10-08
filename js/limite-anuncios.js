// ==========================================
// LIMITE-ANUNCIOS.JS
// No formulário do anúncio, avisa o usuário do plano gratuito quanto
// resta no ciclo e o leva de volta se o limite acabou. A regra é
// aplicada pelo banco; este aviso só evita preencher à toa.
// Para o lojista, avisa quando a loja está sem assinatura ativa (sem
// assinatura ou pausada): nesse caso não dá para publicar nem editar.
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

    const MENSAGENS_ASSINATURA = {
        sem_assinatura: "Sua loja ainda não tem assinatura ativa. Solicite a assinatura no painel da loja para publicar anúncios.",
        carencia: "A assinatura da loja terminou e a loja está pausada. Os anúncios já publicados seguem no ar por 15 dias. Solicite a renovação no painel para publicar ou editar.",
        expirada: "A assinatura da loja terminou e os anúncios saíram do ar. Solicite a renovação no painel para voltar."
    };

    async function verificarAssinaturaLoja() {
        const { data, error } = await window.db.rpc("minha_assinatura");
        if (error) return;

        const assinatura = (data || [])[0];
        const situacao = assinatura?.situacao || "sem_assinatura";
        if (situacao === "ativa") return;

        const editando = window.location.pathname.includes("editar-produto");

        avisar(
            editando
                ? `${MENSAGENS_ASSINATURA[situacao] || MENSAGENS_ASSINATURA.sem_assinatura} Você ainda pode marcar o anúncio como indisponível.`
                : MENSAGENS_ASSINATURA[situacao] || MENSAGENS_ASSINATURA.sem_assinatura,
            "aviso",
            situacao === "sem_assinatura" ? "Assinatura necessária" : "Loja pausada",
            7000
        );

        if (!editando) {
            setTimeout(() => {
                window.location.replace("painel-loja.html");
            }, 3500);
        }
    }

    async function verificar() {
        if (!window.db) return;

        try {
            const { data: sessao } = await window.db.auth.getSession();
            if (!sessao?.session) return;

            const { data, error } = await window.db.rpc("meu_limite_anuncios");
            if (error || !data) return;

            if (data.plano === "lojista") {
                await verificarAssinaturaLoja();
                return;
            }

            // Na edição o limite do ciclo não importa.
            if (window.location.pathname.includes("editar-produto")) return;
            if (data.plano !== "gratuito" || data.limite === null) return;

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
