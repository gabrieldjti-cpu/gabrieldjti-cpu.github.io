// ==========================================
// PEDIDOS DA LOJA - SOLICITAÇÕES DE CANCELAMENTO
// Comércio da Cidade
// ==========================================

const solicitacoesCancelamentoLoja = new Map();
let solicitacaoRecusaId = null;
let observadorSolicitacoesLoja = null;

document.addEventListener("DOMContentLoaded", iniciarSolicitacoesCancelamentoLoja);

async function iniciarSolicitacoesCancelamentoLoja() {
    if (!window.db) {
        return;
    }

    criarModalRecusaCancelamento();
    observarListaPedidosLoja();

    try {
        const { data, error } = await window.db.auth.getSession();

        if (error || !data.session) {
            return;
        }

        await carregarSolicitacoesCancelamentoLoja();
        decorarPedidosComSolicitacoes();

    } catch (erro) {
        console.warn("Não foi possível iniciar as solicitações de cancelamento:", erro);
    }
}

async function carregarSolicitacoesCancelamentoLoja() {
    const { data, error } = await window.db.rpc(
        "listar_solicitacoes_cancelamento_loja"
    );

    if (error) {
        console.warn("Não foi possível carregar solicitações de cancelamento:", error);
        return;
    }

    solicitacoesCancelamentoLoja.clear();

    (Array.isArray(data) ? data : []).forEach(solicitacao => {
        solicitacoesCancelamentoLoja.set(
            String(solicitacao.pedido_id),
            solicitacao
        );
    });
}

function observarListaPedidosLoja() {
    const lista = document.getElementById("lista-pedidos-loja");
    if (!lista) return;

    observadorSolicitacoesLoja?.disconnect();

    observadorSolicitacoesLoja = new MutationObserver(() => {
        window.requestAnimationFrame(decorarPedidosComSolicitacoes);
    });

    observadorSolicitacoesLoja.observe(lista, {
        childList: true,
        subtree: true
    });
}

function decorarPedidosComSolicitacoes() {
    document
        .querySelectorAll("#lista-pedidos-loja .pedido-card")
        .forEach(card => {
            card
                .querySelectorAll("[data-solicitacao-cancelamento-injetada]")
                .forEach(elemento => elemento.remove());

            const referencia = card.querySelector("[data-id]");
            const pedidoId = referencia?.dataset.id;

            if (!pedidoId) {
                return;
            }

            const solicitacao = solicitacoesCancelamentoLoja.get(
                String(pedidoId)
            );

            if (!solicitacao || solicitacao.status !== "pendente") {
                return;
            }

            const botaoCancelarDireto = card.querySelector(
                '[data-acao="cancelar"]'
            );

            if (botaoCancelarDireto) {
                botaoCancelarDireto.hidden = true;
                botaoCancelarDireto.disabled = true;
            }

            const aviso = document.createElement("div");
            aviso.className = "solicitacao-cancelamento-loja";
            aviso.dataset.solicitacaoCancelamentoInjetada = "true";

            aviso.innerHTML = `
                <strong>
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    Cliente solicitou cancelamento
                </strong>

                <p>
                    ${formatarTextoSolicitacao(
                        solicitacao.motivo || "Motivo não informado."
                    )}
                </p>

                <div class="acoes-solicitacao-cancelamento">
                    <button
                        type="button"
                        class="btn-aprovar-cancelamento"
                        data-aprovar-solicitacao
                    >
                        <i class="fa-solid fa-check"></i>
                        Aceitar cancelamento
                    </button>

                    <button
                        type="button"
                        class="btn-recusar-cancelamento"
                        data-recusar-solicitacao
                    >
                        <i class="fa-solid fa-xmark"></i>
                        Recusar
                    </button>
                </div>
            `;

            const acoes = card.querySelector(".pedido-acoes");
            const destino = acoes?.parentElement || card;
            destino.appendChild(aviso);

            aviso
                .querySelector("[data-aprovar-solicitacao]")
                ?.addEventListener("click", event => {
                    aprovarSolicitacaoCancelamento(
                        solicitacao,
                        event.currentTarget
                    );
                });

            aviso
                .querySelector("[data-recusar-solicitacao]")
                ?.addEventListener("click", () => {
                    abrirModalRecusaCancelamento(solicitacao);
                });
        });
}

async function aprovarSolicitacaoCancelamento(solicitacao, botao) {
    if (typeof window.confirmarAcao !== "function") {
        notificarSolicitacao(
            "O sistema de confirmação não está disponível.",
            "erro",
            "Erro"
        );
        return;
    }

    const confirmou = await window.confirmarAcao({
        titulo: "Aceitar cancelamento?",
        mensagem:
            "O pedido será cancelado e o estoque será restaurado automaticamente. Essa ação não poderá ser desfeita.",
        textoConfirmar: "Sim, aceitar cancelamento",
        textoCancelar: "Voltar",
        perigo: true
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
        const { error } = await window.db.rpc(
            "responder_solicitacao_cancelamento_loja",
            {
                p_solicitacao_id: solicitacao.id,
                p_aprovar: true,
                p_resposta: null
            }
        );

        if (error) {
            throw error;
        }

        notificarSolicitacao(
            "Cancelamento aprovado. O pedido foi cancelado e o estoque restaurado.",
            "sucesso",
            "Cancelamento aprovado!",
            4500
        );

        setTimeout(() => {
            window.location.reload();
        }, 900);

    } catch (erro) {
        console.error("Erro ao aprovar solicitação:", erro);

        notificarSolicitacao(
            tratarErroSolicitacao(erro),
            "erro",
            "Não foi possível aprovar",
            5500
        );

        if (botao) {
            botao.disabled = false;
            botao.innerHTML = conteudoOriginal || "Aceitar cancelamento";
        }
    }
}

function criarModalRecusaCancelamento() {
    if (document.getElementById("modal-recusar-cancelamento")) {
        return;
    }

    const modal = document.createElement("div");
    modal.id = "modal-recusar-cancelamento";
    modal.className = "modal-cancelamento-cliente";
    modal.setAttribute("aria-hidden", "true");

    modal.innerHTML = `
        <div
            class="modal-cancelamento-cliente-overlay"
            data-fechar-recusa-cancelamento
        ></div>

        <div
            class="modal-cancelamento-cliente-conteudo"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-recusar-cancelamento"
        >
            <div class="modal-cancelamento-cliente-topo">
                <div>
                    <h2 id="titulo-recusar-cancelamento">
                        Recusar cancelamento
                    </h2>

                    <p>
                        Informe ao cliente por que a solicitação não poderá ser aceita.
                    </p>
                </div>

                <button
                    type="button"
                    class="btn-fechar-cancelamento-cliente"
                    data-fechar-recusa-cancelamento
                    aria-label="Fechar"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="campo-motivo-cancelamento-cliente">
                <label for="motivo-recusa-cancelamento">
                    Justificativa
                </label>

                <textarea
                    id="motivo-recusa-cancelamento"
                    maxlength="500"
                    rows="5"
                    placeholder="Explique brevemente o motivo da recusa."
                ></textarea>

                <div class="rodape-motivo-cancelamento">
                    <span>Mínimo de 3 caracteres</span>
                    <span id="contador-recusa-cancelamento">0/500</span>
                </div>
            </div>

            <div class="acoes-modal-cancelamento-cliente">
                <button
                    type="button"
                    class="btn-voltar-cancelamento-cliente"
                    data-fechar-recusa-cancelamento
                >
                    Voltar
                </button>

                <button
                    type="button"
                    id="btn-confirmar-recusa-cancelamento"
                    class="btn-confirmar-cancelamento-cliente"
                >
                    <i class="fa-solid fa-xmark"></i>
                    Recusar solicitação
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal
        .querySelectorAll("[data-fechar-recusa-cancelamento]")
        .forEach(elemento => {
            elemento.addEventListener("click", fecharModalRecusaCancelamento);
        });

    document
        .getElementById("motivo-recusa-cancelamento")
        ?.addEventListener("input", atualizarContadorRecusa);

    document
        .getElementById("btn-confirmar-recusa-cancelamento")
        ?.addEventListener("click", confirmarRecusaCancelamento);

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape") {
            fecharModalRecusaCancelamento();
        }
    });
}

function abrirModalRecusaCancelamento(solicitacao) {
    solicitacaoRecusaId = solicitacao.id;

    const modal = document.getElementById("modal-recusar-cancelamento");
    const campo = document.getElementById("motivo-recusa-cancelamento");

    if (!modal || !campo) {
        return;
    }

    campo.value = "";
    atualizarContadorRecusa();

    modal.classList.add("aberto");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    setTimeout(() => campo.focus(), 80);
}

function fecharModalRecusaCancelamento() {
    const modal = document.getElementById("modal-recusar-cancelamento");

    if (!modal?.classList.contains("aberto")) {
        return;
    }

    modal.classList.remove("aberto");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    solicitacaoRecusaId = null;

    const campo = document.getElementById("motivo-recusa-cancelamento");
    if (campo) campo.value = "";

    atualizarContadorRecusa();
}

function atualizarContadorRecusa() {
    const campo = document.getElementById("motivo-recusa-cancelamento");
    const contador = document.getElementById("contador-recusa-cancelamento");

    if (contador) {
        contador.textContent = `${campo?.value?.length || 0}/500`;
    }
}

async function confirmarRecusaCancelamento() {
    if (!solicitacaoRecusaId) {
        return;
    }

    const campo = document.getElementById("motivo-recusa-cancelamento");
    const botao = document.getElementById("btn-confirmar-recusa-cancelamento");
    const resposta = String(campo?.value || "").trim();

    if (resposta.length < 3) {
        notificarSolicitacao(
            "Informe uma justificativa com pelo menos 3 caracteres.",
            "aviso",
            "Justificativa obrigatória"
        );
        campo?.focus();
        return;
    }

    if (resposta.length > 500) {
        notificarSolicitacao(
            "A justificativa deve possuir no máximo 500 caracteres.",
            "aviso",
            "Justificativa muito grande"
        );
        campo?.focus();
        return;
    }

    const conteudoOriginal = botao?.innerHTML;

    if (botao) {
        botao.disabled = true;
        botao.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Salvando...
        `;
    }

    try {
        const { error } = await window.db.rpc(
            "responder_solicitacao_cancelamento_loja",
            {
                p_solicitacao_id: solicitacaoRecusaId,
                p_aprovar: false,
                p_resposta: resposta
            }
        );

        if (error) {
            throw error;
        }

        fecharModalRecusaCancelamento();

        notificarSolicitacao(
            "A solicitação foi recusada e o cliente poderá ver sua justificativa.",
            "sucesso",
            "Solicitação respondida!",
            4500
        );

        setTimeout(() => {
            window.location.reload();
        }, 900);

    } catch (erro) {
        console.error("Erro ao recusar solicitação:", erro);

        notificarSolicitacao(
            tratarErroSolicitacao(erro),
            "erro",
            "Não foi possível recusar",
            5500
        );

        if (botao) {
            botao.disabled = false;
            botao.innerHTML = conteudoOriginal || "Recusar solicitação";
        }
    }
}

function tratarErroSolicitacao(erro) {
    const texto = String(erro?.message || "").toLowerCase();

    if (
        texto.includes("já foi respondida") ||
        texto.includes("ja foi respondida")
    ) {
        return "Esta solicitação já foi respondida em outra tela. Atualize os pedidos.";
    }

    if (
        texto.includes("não está mais em preparação") ||
        texto.includes("nao esta mais em preparacao")
    ) {
        return "O pedido mudou de status e esta solicitação não pode mais cancelar o pedido.";
    }

    if (
        texto.includes("não possui permissão") ||
        texto.includes("nao possui permissao") ||
        texto.includes("não encontrada") ||
        texto.includes("nao encontrada")
    ) {
        return "Solicitação não encontrada ou sua conta não possui permissão para respondê-la.";
    }

    if (
        texto.includes("justificativa") ||
        texto.includes("resposta")
    ) {
        return erro?.message || "Informe uma justificativa válida.";
    }

    return erro?.message || "Não foi possível responder a solicitação.";
}

function formatarTextoSolicitacao(valor) {
    return escaparHTMLSolicitacao(valor).replace(/\r?\n/g, "<br>");
}

function escaparHTMLSolicitacao(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function notificarSolicitacao(
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
