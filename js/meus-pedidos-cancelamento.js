// ==========================================
// MEUS PEDIDOS - CANCELAMENTO DO CLIENTE
// Comércio da Cidade
// ==========================================

const solicitacoesCancelamentoCliente = new Map();
let pedidoCancelamentoClienteId = null;
let modoCancelamentoCliente = null;
let observadorCancelamentoCliente = null;

document.addEventListener("DOMContentLoaded", iniciarCancelamentoCliente);

async function iniciarCancelamentoCliente() {
    if (!window.db) {
        return;
    }

    criarModalCancelamentoCliente();
    observarListaPedidosCliente();

    try {
        const { data, error } = await window.db.auth.getSession();

        if (error || !data.session) {
            return;
        }

        await carregarSolicitacoesCancelamentoCliente();
        decorarPedidosComCancelamento();

    } catch (erro) {
        console.warn("Não foi possível iniciar o cancelamento do cliente:", erro);
    }
}

async function carregarSolicitacoesCancelamentoCliente() {
    const { data, error } = await window.db.rpc(
        "listar_solicitacoes_cancelamento_cliente"
    );

    if (error) {
        console.warn("Não foi possível carregar solicitações de cancelamento:", error);
        return;
    }

    solicitacoesCancelamentoCliente.clear();

    (Array.isArray(data) ? data : []).forEach(solicitacao => {
        solicitacoesCancelamentoCliente.set(
            String(solicitacao.pedido_id),
            solicitacao
        );
    });
}

function observarListaPedidosCliente() {
    const lista = document.getElementById("lista-pedidos");
    if (!lista) return;

    observadorCancelamentoCliente?.disconnect();

    observadorCancelamentoCliente = new MutationObserver(() => {
        window.requestAnimationFrame(decorarPedidosComCancelamento);
    });

    observadorCancelamentoCliente.observe(lista, {
        childList: true,
        subtree: true
    });
}

function decorarPedidosComCancelamento() {
    document
        .querySelectorAll("#lista-pedidos .pedido-card")
        .forEach(card => {
            const status = String(card.dataset.status || "").trim();
            const botaoReferencia = card.querySelector("[data-pedido-id]");
            const pedidoId = botaoReferencia?.dataset.pedidoId;
            const acoes = card.querySelector(".pedido-acoes");

            if (!pedidoId || !acoes) {
                return;
            }

            card
                .querySelectorAll("[data-cancelamento-cliente-injetado]")
                .forEach(elemento => elemento.remove());

            const solicitacao = solicitacoesCancelamentoCliente.get(
                String(pedidoId)
            );

            if (status === "aguardando_pagamento" || status === "pago") {
                const botao = document.createElement("button");
                botao.type = "button";
                botao.className = "btn-cancelamento-cliente";
                botao.dataset.cancelamentoClienteInjetado = "true";
                botao.innerHTML = `
                    <i class="fa-solid fa-ban"></i>
                    Cancelar pedido
                `;

                botao.addEventListener("click", () => {
                    abrirCancelamentoCliente(
                        pedidoId,
                        "direto"
                    );
                });

                acoes.appendChild(botao);
                return;
            }

            if (status !== "em_preparacao") {
                return;
            }

            if (!solicitacao) {
                const botao = document.createElement("button");
                botao.type = "button";
                botao.className = "btn-solicitar-cancelamento";
                botao.dataset.cancelamentoClienteInjetado = "true";
                botao.innerHTML = `
                    <i class="fa-solid fa-paper-plane"></i>
                    Solicitar cancelamento
                `;

                botao.addEventListener("click", () => {
                    abrirCancelamentoCliente(
                        pedidoId,
                        "solicitacao"
                    );
                });

                acoes.appendChild(botao);
                return;
            }

            if (solicitacao.status === "pendente") {
                const aviso = criarAvisoCancelamentoCliente(
                    "Cancelamento solicitado",
                    "A loja ainda precisa aceitar ou recusar sua solicitação.",
                    false
                );

                card
                    .querySelector(".pedido-conteudo")
                    ?.appendChild(aviso);

                return;
            }

            if (solicitacao.status === "recusada") {
                const resposta = String(
                    solicitacao.resposta_loja ||
                    "A loja recusou a solicitação de cancelamento."
                );

                const aviso = criarAvisoCancelamentoCliente(
                    "Solicitação recusada",
                    resposta,
                    true
                );

                card
                    .querySelector(".pedido-conteudo")
                    ?.appendChild(aviso);
            }
        });
}

function criarAvisoCancelamentoCliente(titulo, texto, recusada) {
    const aviso = document.createElement("div");
    aviso.className = `cancelamento-status-cliente${recusada ? " recusa" : ""}`;
    aviso.dataset.cancelamentoClienteInjetado = "true";

    aviso.innerHTML = `
        <strong>${escaparHTMLCancelamento(titulo)}</strong>
        <div>${formatarTextoCancelamento(texto)}</div>
    `;

    return aviso;
}

function criarModalCancelamentoCliente() {
    if (document.getElementById("modal-cancelamento-cliente")) {
        return;
    }

    const modal = document.createElement("div");
    modal.id = "modal-cancelamento-cliente";
    modal.className = "modal-cancelamento-cliente";
    modal.setAttribute("aria-hidden", "true");

    modal.innerHTML = `
        <div
            class="modal-cancelamento-cliente-overlay"
            data-fechar-cancelamento-cliente
        ></div>

        <div
            class="modal-cancelamento-cliente-conteudo"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-cancelamento-cliente"
        >
            <div class="modal-cancelamento-cliente-topo">
                <div>
                    <h2 id="titulo-cancelamento-cliente">
                        Cancelar pedido
                    </h2>

                    <p id="texto-cancelamento-cliente">
                        Informe o motivo do cancelamento.
                    </p>
                </div>

                <button
                    type="button"
                    class="btn-fechar-cancelamento-cliente"
                    data-fechar-cancelamento-cliente
                    aria-label="Fechar"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="campo-motivo-cancelamento-cliente">
                <label for="motivo-cancelamento-cliente">
                    Motivo
                </label>

                <textarea
                    id="motivo-cancelamento-cliente"
                    maxlength="500"
                    rows="5"
                    placeholder="Explique brevemente por que deseja cancelar este pedido."
                ></textarea>

                <div class="rodape-motivo-cancelamento">
                    <span>Mínimo de 5 caracteres</span>
                    <span id="contador-cancelamento-cliente">0/500</span>
                </div>
            </div>

            <div class="acoes-modal-cancelamento-cliente">
                <button
                    type="button"
                    class="btn-voltar-cancelamento-cliente"
                    data-fechar-cancelamento-cliente
                >
                    Voltar
                </button>

                <button
                    type="button"
                    id="btn-confirmar-cancelamento-cliente"
                    class="btn-confirmar-cancelamento-cliente"
                >
                    <i class="fa-solid fa-ban"></i>
                    Confirmar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal
        .querySelectorAll("[data-fechar-cancelamento-cliente]")
        .forEach(elemento => {
            elemento.addEventListener("click", fecharCancelamentoCliente);
        });

    document
        .getElementById("motivo-cancelamento-cliente")
        ?.addEventListener("input", atualizarContadorCancelamentoCliente);

    document
        .getElementById("btn-confirmar-cancelamento-cliente")
        ?.addEventListener("click", confirmarCancelamentoCliente);

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape") {
            fecharCancelamentoCliente();
        }
    });
}

function abrirCancelamentoCliente(pedidoId, modo) {
    pedidoCancelamentoClienteId = pedidoId;
    modoCancelamentoCliente = modo;

    const modal = document.getElementById("modal-cancelamento-cliente");
    const titulo = document.getElementById("titulo-cancelamento-cliente");
    const texto = document.getElementById("texto-cancelamento-cliente");
    const motivo = document.getElementById("motivo-cancelamento-cliente");
    const botao = document.getElementById("btn-confirmar-cancelamento-cliente");

    if (!modal || !motivo || !botao) {
        return;
    }

    motivo.value = "";
    atualizarContadorCancelamentoCliente();

    if (modo === "solicitacao") {
        if (titulo) titulo.textContent = "Solicitar cancelamento";
        if (texto) {
            texto.textContent =
                "Este pedido já está em preparação. A loja precisará aceitar sua solicitação.";
        }

        botao.classList.add("solicitacao");
        botao.innerHTML = `
            <i class="fa-solid fa-paper-plane"></i>
            Enviar solicitação
        `;
    } else {
        if (titulo) titulo.textContent = "Cancelar pedido";
        if (texto) {
            texto.textContent =
                "O pedido será cancelado e o estoque será restaurado automaticamente.";
        }

        botao.classList.remove("solicitacao");
        botao.innerHTML = `
            <i class="fa-solid fa-ban"></i>
            Cancelar pedido
        `;
    }

    modal.classList.add("aberto");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    setTimeout(() => motivo.focus(), 80);
}

function fecharCancelamentoCliente() {
    const modal = document.getElementById("modal-cancelamento-cliente");
    if (!modal?.classList.contains("aberto")) {
        return;
    }

    modal.classList.remove("aberto");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    pedidoCancelamentoClienteId = null;
    modoCancelamentoCliente = null;

    const motivo = document.getElementById("motivo-cancelamento-cliente");
    if (motivo) motivo.value = "";

    atualizarContadorCancelamentoCliente();
}

function atualizarContadorCancelamentoCliente() {
    const campo = document.getElementById("motivo-cancelamento-cliente");
    const contador = document.getElementById("contador-cancelamento-cliente");

    if (contador) {
        contador.textContent = `${campo?.value?.length || 0}/500`;
    }
}

async function confirmarCancelamentoCliente() {
    if (!pedidoCancelamentoClienteId || !modoCancelamentoCliente) {
        return;
    }

    const campo = document.getElementById("motivo-cancelamento-cliente");
    const botao = document.getElementById("btn-confirmar-cancelamento-cliente");
    const motivo = String(campo?.value || "").trim();

    if (motivo.length < 5) {
        notificarCancelamentoCliente(
            "Informe um motivo com pelo menos 5 caracteres.",
            "aviso",
            "Motivo obrigatório"
        );
        campo?.focus();
        return;
    }

    if (motivo.length > 500) {
        notificarCancelamentoCliente(
            "O motivo deve possuir no máximo 500 caracteres.",
            "aviso",
            "Motivo muito grande"
        );
        campo?.focus();
        return;
    }

    if (typeof window.confirmarAcao !== "function") {
        notificarCancelamentoCliente(
            "O sistema de confirmação não está disponível.",
            "erro",
            "Erro"
        );
        return;
    }

    const solicitacao = modoCancelamentoCliente === "solicitacao";

    const confirmou = await window.confirmarAcao({
        titulo: solicitacao
            ? "Enviar solicitação de cancelamento?"
            : "Cancelar este pedido?",
        mensagem: solicitacao
            ? "A loja receberá sua solicitação e poderá aceitar ou recusar."
            : "O cancelamento será realizado agora e não poderá ser desfeito.",
        textoConfirmar: solicitacao
            ? "Enviar solicitação"
            : "Sim, cancelar pedido",
        textoCancelar: "Voltar",
        perigo: !solicitacao
    });

    if (!confirmou) {
        return;
    }

    const conteudoOriginal = botao?.innerHTML;

    if (botao) {
        botao.disabled = true;
        botao.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Processando...
        `;
    }

    try {
        const rpc = solicitacao
            ? "solicitar_cancelamento_cliente"
            : "cancelar_pedido_cliente";

        const { error } = await window.db.rpc(
            rpc,
            {
                p_pedido_id: pedidoCancelamentoClienteId,
                p_motivo: motivo
            }
        );

        if (error) {
            throw error;
        }

        fecharCancelamentoCliente();

        notificarCancelamentoCliente(
            solicitacao
                ? "Sua solicitação foi enviada para a loja."
                : "Pedido cancelado com sucesso.",
            "sucesso",
            solicitacao
                ? "Solicitação enviada!"
                : "Pedido cancelado!",
            4500
        );

        setTimeout(() => {
            window.location.reload();
        }, 900);

    } catch (erro) {
        console.error("Erro no cancelamento do cliente:", erro);

        notificarCancelamentoCliente(
            tratarErroCancelamentoCliente(erro),
            "erro",
            "Não foi possível continuar",
            5500
        );

        if (botao) {
            botao.disabled = false;
            botao.innerHTML = conteudoOriginal || "Confirmar";
        }
    }
}

function tratarErroCancelamentoCliente(erro) {
    const texto = String(erro?.message || "").toLowerCase();

    if (texto.includes("já existe uma solicitação")) {
        return "Já existe uma solicitação de cancelamento para este pedido.";
    }

    if (
        texto.includes("não pode mais ser cancelado") ||
        texto.includes("nao pode mais ser cancelado") ||
        texto.includes("só pode ser criada") ||
        texto.includes("so pode ser criada")
    ) {
        return "O status deste pedido mudou e o cancelamento não está mais disponível desta forma.";
    }

    if (
        texto.includes("não possui permissão") ||
        texto.includes("nao possui permissao") ||
        texto.includes("pedido não encontrado") ||
        texto.includes("pedido nao encontrado")
    ) {
        return "Pedido não encontrado ou sua conta não possui permissão para cancelá-lo.";
    }

    if (texto.includes("motivo")) {
        return erro?.message || "Informe um motivo válido para o cancelamento.";
    }

    return erro?.message || "Não foi possível processar o cancelamento.";
}

function formatarTextoCancelamento(valor) {
    return escaparHTMLCancelamento(valor).replace(/\r?\n/g, "<br>");
}

function escaparHTMLCancelamento(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function notificarCancelamentoCliente(
    texto,
    tipo = "info",
    titulo = null,
    duracao = 4000
) {
    if (typeof window.mostrarAlerta === "function") {
        window.mostrarAlerta(texto, tipo, titulo, duracao);
        return;
    }

    console.warn(`[${tipo}] ${titulo || ""}`, texto);
}
