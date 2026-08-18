// Correção segura temporária para o fluxo de pedidos do painel.
// Carregar depois de js/painel-loja.js.

(function () {
    function normalizarStatus(status) {
        const valor = String(status || "")
            .trim()
            .toLowerCase()
            .replaceAll(" ", "_");

        const antigos = {
            pendente: "aguardando_pagamento",
            preparando: "em_preparacao",
            finalizado: "entregue",
            cancelado: "cancelado"
        };

        return antigos[valor] || valor;
    }

    function textoStatus(status) {
        const textos = {
            aguardando_pagamento: "Aguardando pagamento",
            pago: "Pago",
            em_preparacao: "Em preparação",
            enviado: "Enviado",
            entregue: "Entregue",
            cancelado: "Cancelado"
        };

        return textos[normalizarStatus(status)] || "Status desconhecido";
    }

    function numeroPedido(id) {
        return String(id || "")
            .replaceAll("-", "")
            .slice(0, 8)
            .toUpperCase() || "--------";
    }

    function avisar(texto, tipo = "info", titulo = null, duracao = 4000) {
        if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(texto, tipo, titulo, duracao);
            return;
        }

        console.warn(`[${tipo}] ${titulo || ""}`, texto);
    }

    window.obterAcaoProximoStatus = function (status) {
        const atual = normalizarStatus(status);

        const acoes = {
            aguardando_pagamento: {
                texto: "Marcar como pago",
                titulo: "Confirmar pagamento?",
                textoConfirmar: "Sim, marcar como pago",
                icone: "fa-solid fa-circle-dollar-to-slot"
            },
            pago: {
                texto: "Iniciar preparação",
                titulo: "Iniciar preparação?",
                textoConfirmar: "Iniciar preparação",
                icone: "fa-solid fa-box-open"
            },
            em_preparacao: {
                texto: "Informar rastreio e enviar",
                titulo: "Informar rastreio",
                textoConfirmar: "Ir para pedidos",
                icone: "fa-solid fa-truck"
            }
        };

        return acoes[atual] || null;
    };

    window.obterProximoStatusPedido = function (status) {
        const fluxo = {
            aguardando_pagamento: "pago",
            pago: "em_preparacao"
        };

        return fluxo[normalizarStatus(status)] || null;
    };

    window.avancarStatusPedido = async function (pedidoId, statusAtual) {
        if (!pedidoId || !window.db) {
            avisar(
                "Não foi possível identificar este pedido.",
                "erro",
                "Pedido inválido"
            );
            return;
        }

        const atual = normalizarStatus(statusAtual);

        if (atual === "em_preparacao") {
            avisar(
                "Para enviar este pedido é obrigatório informar o código de rastreio.",
                "info",
                "Rastreio obrigatório",
                2800
            );

            setTimeout(() => {
                window.location.href = "pedidos-loja.html";
            }, 500);
            return;
        }

        if (atual === "enviado") {
            avisar(
                "Este pedido já foi enviado e agora aguarda a confirmação de entrega pelo cliente.",
                "info",
                "Aguardando cliente"
            );
            return;
        }

        const proximo =
            atual === "aguardando_pagamento"
                ? "pago"
                : atual === "pago"
                    ? "em_preparacao"
                    : null;

        if (!proximo) {
            avisar(
                "Este pedido não possui uma próxima ação disponível no painel.",
                "info",
                "Sem ação disponível"
            );
            return;
        }

        if (typeof window.confirmarAcao !== "function") {
            avisar(
                "Não foi possível abrir a confirmação.",
                "erro",
                "Erro no sistema"
            );
            return;
        }

        const confirmou = await window.confirmarAcao({
            titulo: proximo === "pago"
                ? "Confirmar pagamento?"
                : "Iniciar preparação?",
            mensagem: `O pedido #${numeroPedido(pedidoId)} passará de "${textoStatus(atual)}" para "${textoStatus(proximo)}". Deseja continuar?`,
            textoConfirmar: proximo === "pago"
                ? "Sim, marcar como pago"
                : "Iniciar preparação",
            textoCancelar: "Cancelar",
            perigo: false
        });

        if (!confirmou) {
            return;
        }

        try {
            const { data, error } = await window.db.rpc(
                "atualizar_status_pedido_loja",
                {
                    p_pedido_id: pedidoId,
                    p_novo_status: proximo,
                    p_codigo_rastreio: null
                }
            );

            if (error) {
                throw error;
            }

            avisar(
                `Pedido #${numeroPedido(pedidoId)} atualizado para "${textoStatus(proximo)}".`,
                "sucesso",
                "Status atualizado!",
                3200
            );

            await Promise.all([
                typeof window.carregarPedidos === "function"
                    ? window.carregarPedidos()
                    : Promise.resolve(),
                typeof window.carregarEstatisticas === "function"
                    ? window.carregarEstatisticas()
                    : Promise.resolve()
            ]);

            return data;

        } catch (erro) {
            console.error("Erro ao atualizar pedido pelo fluxo seguro:", erro);

            avisar(
                erro?.message || "Não foi possível atualizar o pedido.",
                "erro",
                "Erro ao atualizar pedido",
                5000
            );
        }
    };
})();
