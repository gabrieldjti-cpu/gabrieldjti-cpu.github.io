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

    let lojaAtual = null;

    function formatarDataHora(valor) {
        const data = new Date(valor);
        return Number.isNaN(data.getTime()) ? "" : data.toLocaleDateString("pt-BR");
    }

    // Botão "Solicitar assinatura" / "Solicitar renovação" e aviso de
    // pedido em aberto. Quem ativa é o admin; aqui só se faz o pedido.
    function renderizarPedido(assinatura, pedido, loja) {
        const botao = document.getElementById("btnSolicitarAssinatura");
        const aviso = document.getElementById("pedido-assinatura-loja");
        if (!botao || !aviso) return;

        const situacao = assinatura?.situacao || "sem_assinatura";
        const statusLoja = loja?.status_aprovacao;
        const podePedir = statusLoja === "aprovada" || statusLoja === "pendente";

        if (pedido) {
            botao.hidden = true;
            aviso.hidden = false;
            aviso.textContent = `Pedido enviado em ${formatarDataHora(pedido.criado_em)}. A administração vai entrar em contato para combinar o pagamento e ativar.`;
            return;
        }

        aviso.hidden = true;

        // Com mais de 7 dias de assinatura pela frente, não há o que pedir.
        const fim = assinatura?.fim_em ? new Date(assinatura.fim_em).getTime() : 0;
        const longeDoFim = situacao === "ativa" && fim - Date.now() > 7 * 86400000;

        botao.hidden = !podePedir || longeDoFim;
        const texto = botao.querySelector("span");
        if (texto) {
            texto.textContent = situacao === "sem_assinatura"
                ? "Solicitar assinatura"
                : "Solicitar renovação";
        }
    }

    async function solicitar() {
        const botao = document.getElementById("btnSolicitarAssinatura");
        if (!botao || botao.disabled) return;
        botao.disabled = true;

        try {
            const { error } = await window.db.rpc("solicitar_assinatura");
            if (error) throw error;

            if (typeof window.notificar === "function") {
                window.notificar(
                    "A administração foi avisada e vai entrar em contato para combinar o pagamento.",
                    "sucesso",
                    "Pedido enviado",
                    5000
                );
            }

            await carregar();
        } catch (erro) {
            console.error("Erro ao solicitar a assinatura:", erro);
            if (typeof window.notificar === "function") {
                window.notificar(
                    erro?.message || "Não foi possível enviar o pedido.",
                    "erro",
                    "Erro no pedido",
                    5000
                );
            }
        } finally {
            botao.disabled = false;
        }
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

            const assinatura = (data || [])[0] || null;
            renderizar(assinatura);

            if (assinatura?.loja_id) {
                const [{ data: loja }, { data: pedidos }] = await Promise.all([
                    window.db
                        .from("lojas")
                        .select("id,status_aprovacao,tipo")
                        .eq("id", assinatura.loja_id)
                        .maybeSingle(),
                    window.db
                        .from("solicitacoes_assinatura")
                        .select("id,criado_em")
                        .eq("loja_id", assinatura.loja_id)
                        .is("atendida_em", null)
                ]);

                lojaAtual = loja || null;
                renderizarPedido(assinatura, (pedidos || [])[0] || null, lojaAtual);
            }
        } catch (erro) {
            console.error("Erro ao carregar a assinatura:", erro);
            texto.textContent = "Não foi possível carregar a situação da assinatura. Atualize a página para tentar de novo.";
        }
    }

    function iniciar() {
        document.getElementById("btnSolicitarAssinatura")
            ?.addEventListener("click", solicitar);
        carregar();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }
})();
