// ==========================================
// PAINEL-LOJA-ASSINATURA.JS
// Mostra ao lojista a situação da assinatura da loja.
// ==========================================

(() => {
    "use strict";

    const SITUACOES = {
        ativa: {
            rotulo: "Ativa",
            classe: "ativa",
            icone: "fa-circle-check"
        },
        carencia: {
            rotulo: "Em carência",
            classe: "carencia",
            icone: "fa-hourglass-half"
        },
        expirada: {
            rotulo: "Expirada",
            classe: "expirada",
            icone: "fa-circle-xmark"
        },
        sem_assinatura: {
            rotulo: "Sem assinatura",
            classe: "sem",
            icone: "fa-circle-minus"
        }
    };

    function formatarData(valor) {
        if (!valor) return "";
        const data = new Date(valor);
        return Number.isNaN(data.getTime())
            ? ""
            : data.toLocaleDateString("pt-BR");
    }

    function diasAte(valor) {
        const fim = new Date(valor).getTime();
        if (Number.isNaN(fim)) return null;
        return Math.ceil((fim - Date.now()) / 86400000);
    }

    function criarMensagem(assinatura) {
        const situacao = assinatura?.situacao || "sem_assinatura";

        if (situacao === "ativa") {
            const dias = diasAte(assinatura.fim_em);
            const prazo = dias !== null && dias <= 7
                ? ` Faltam ${dias} ${dias === 1 ? "dia" : "dias"}: fale com a administração para renovar.`
                : "";
            return `Sua assinatura vale até ${formatarData(assinatura.fim_em)}. Você anuncia sem limite e sem vencimento.${prazo}`;
        }

        if (situacao === "carencia") {
            return `A assinatura terminou em ${formatarData(assinatura.fim_em)}. A loja está pausada e os anúncios continuam no ar até ${formatarData(assinatura.carencia_ate)}. Renove para não perder a visibilidade.`;
        }

        if (situacao === "expirada") {
            return `A assinatura terminou em ${formatarData(assinatura.fim_em)} e os anúncios estão pausados. Fale com a administração para renovar e voltar ao ar.`;
        }

        return "Sua loja ainda não tem assinatura. Depois da aprovação, a administração ativa o plano de lojista.";
    }

    function renderizar(assinatura) {
        const selo = document.getElementById("selo-assinatura-loja");
        const texto = document.getElementById("texto-assinatura-loja");
        if (!selo || !texto) return;

        const situacao = assinatura?.situacao || "sem_assinatura";
        const config = SITUACOES[situacao] || SITUACOES.sem_assinatura;

        selo.className = `selo-assinatura-loja ${config.classe}`;
        selo.innerHTML = `<i class="fa-solid ${config.icone}"></i> `;
        selo.append(config.rotulo);
        texto.textContent = criarMensagem(assinatura);
    }

    async function carregar() {
        const texto = document.getElementById("texto-assinatura-loja");
        if (!texto || !window.db) return;

        try {
            const { data: sessao } = await window.db.auth.getSession();
            if (!sessao?.session) return;

            const { data, error } = await window.db.rpc("minha_assinatura");
            if (error) throw error;

            renderizar((data || [])[0] || null);
        } catch (erro) {
            console.error("Erro ao carregar a assinatura:", erro);
            texto.textContent = "Não foi possível carregar a situação da assinatura. Atualize a página para tentar de novo.";
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", carregar, { once: true });
    } else {
        carregar();
    }
})();
