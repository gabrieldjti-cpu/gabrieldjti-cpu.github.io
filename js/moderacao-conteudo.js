// ==========================================
// MODERAÇÃO DE CONTEÚDO — RF-26
// Denúncia autenticada de produtos e avaliações
// ==========================================

(() => {
    "use strict";

    const CHAVE_RETORNO_LOGIN = "destino_apos_login_moderacao";
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const MOTIVOS = {
        produto: [
            ["conteudo_improprio", "Conteúdo impróprio ou enganoso"],
            ["categoria_incorreta", "Categoria incorreta"],
            ["preco_abusivo", "Preço possivelmente abusivo"],
            ["produto_proibido", "Produto proibido ou ilegal"],
            ["outro", "Outro motivo"]
        ],
        avaliacao: [
            ["spam", "Spam ou propaganda"],
            ["ofensa", "Ofensa ou linguagem imprópria"],
            ["conteudo_falso", "Conteúdo possivelmente falso"],
            ["outro", "Outro motivo"]
        ]
    };

    const estado = {
        alvo: null,
        botaoOrigem: null,
        enviando: false
    };

    function escaparHTML(valor) {
        return String(valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function notificar(mensagem, tipo = "info", titulo = null) {
        if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(mensagem, tipo, titulo);
        }
    }

    function obterDestinoAtual() {
        const arquivo = window.location.pathname.split("/").pop() || "produto.html";
        return `${arquivo}${window.location.search}${window.location.hash}`;
    }

    function criarModal() {
        if (document.getElementById("modalDenunciaConteudo")) return;

        document.body.insertAdjacentHTML("beforeend", `
            <div id="modalDenunciaConteudo" class="moderacao-modal" hidden>
                <div class="moderacao-modal-backdrop" data-fechar-denuncia></div>
                <section
                    class="moderacao-modal-caixa"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="tituloModalDenuncia"
                    aria-describedby="descricaoModalDenuncia"
                >
                    <button
                        type="button"
                        class="moderacao-modal-fechar"
                        data-fechar-denuncia
                        aria-label="Fechar denúncia"
                    >
                        <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                    </button>

                    <span class="moderacao-modal-icone" aria-hidden="true">
                        <i class="fa-regular fa-flag"></i>
                    </span>
                    <span class="moderacao-modal-eyebrow">Ajude a manter o marketplace seguro</span>
                    <h2 id="tituloModalDenuncia">Denunciar conteúdo</h2>
                    <p id="descricaoModalDenuncia"></p>

                    <div id="alertaModalDenuncia" class="moderacao-modal-alerta" hidden></div>

                    <form id="formDenunciaConteudo" novalidate>
                        <label class="moderacao-campo">
                            <span>Motivo da denúncia</span>
                            <select id="motivoDenunciaConteudo" required></select>
                        </label>

                        <label class="moderacao-campo">
                            <span>Detalhes <small>(opcional)</small></span>
                            <textarea
                                id="detalhesDenunciaConteudo"
                                rows="5"
                                minlength="5"
                                maxlength="1000"
                                placeholder="Explique o que deve ser analisado pela administração..."
                            ></textarea>
                            <small class="moderacao-contador">
                                <span id="contadorDetalhesDenuncia">0</span>/1000
                            </small>
                        </label>

                        <p class="moderacao-aviso-privacidade">
                            <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
                            Sua denúncia será analisada apenas pela administração. O responsável pelo conteúdo não verá seu nome.
                        </p>

                        <div class="moderacao-modal-acoes">
                            <button type="button" class="moderacao-btn-secundario" data-fechar-denuncia>
                                Cancelar
                            </button>
                            <button type="submit" id="btnEnviarDenuncia" class="moderacao-btn-primario">
                                <i class="fa-regular fa-paper-plane" aria-hidden="true"></i>
                                Enviar denúncia
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        `);
    }

    function preencherMotivos(tipo) {
        const select = document.getElementById("motivoDenunciaConteudo");
        if (!select) return;

        select.innerHTML = `
            <option value="">Selecione um motivo</option>
            ${(MOTIVOS[tipo] || []).map(([valor, rotulo]) => `
                <option value="${valor}">${escaparHTML(rotulo)}</option>
            `).join("")}
        `;
    }

    function salvarRetornoLogin() {
        try {
            sessionStorage.setItem(CHAVE_RETORNO_LOGIN, obterDestinoAtual());
        } catch (erro) {
            console.warn("Não foi possível salvar o retorno da denúncia:", erro);
        }
    }

    async function exigirLogin() {
        if (!window.db) {
            notificar(
                "Não foi possível conectar ao sistema. Atualize a página e tente novamente.",
                "erro",
                "Erro de conexão"
            );
            return false;
        }

        try {
            const { data, error } = await window.db.auth.getSession();
            if (error) throw error;
            if (data?.session) return true;
        } catch (erro) {
            console.error("Erro ao verificar a sessão da denúncia:", erro);
        }

        salvarRetornoLogin();
        notificar(
            "Entre na sua conta para enviar uma denúncia.",
            "info",
            "Login necessário"
        );
        setTimeout(() => {
            window.location.href = "login.html";
        }, 450);
        return false;
    }

    async function abrirDenuncia(botao) {
        const tipo = String(botao?.dataset?.tipoConteudo || "").trim();
        const id = String(botao?.dataset?.conteudoId || "").trim();
        const titulo = String(botao?.dataset?.conteudoTitulo || "Conteúdo").trim();

        if (!MOTIVOS[tipo] || !UUID.test(id)) {
            notificar(
                "Este conteúdo não está disponível para denúncia.",
                "aviso",
                "Conteúdo indisponível"
            );
            return;
        }

        if (!await exigirLogin()) return;

        criarModal();
        estado.alvo = { tipo, id, titulo };
        estado.botaoOrigem = botao;

        const modal = document.getElementById("modalDenunciaConteudo");
        const form = document.getElementById("formDenunciaConteudo");
        const alerta = document.getElementById("alertaModalDenuncia");
        form?.reset();
        preencherMotivos(tipo);
        document.getElementById("contadorDetalhesDenuncia").textContent = "0";
        alerta.hidden = true;
        alerta.textContent = "";

        document.getElementById("tituloModalDenuncia").textContent = tipo === "produto"
            ? "Denunciar produto"
            : "Denunciar avaliação";
        document.getElementById("descricaoModalDenuncia").textContent =
            `Conte o que precisa ser analisado em “${titulo || "conteúdo"}”.`;

        modal.hidden = false;
        document.body.classList.add("moderacao-modal-aberto");
        setTimeout(() => document.getElementById("motivoDenunciaConteudo")?.focus(), 0);
    }

    function fecharDenuncia() {
        const modal = document.getElementById("modalDenunciaConteudo");
        if (!modal || modal.hidden || estado.enviando) return;

        modal.hidden = true;
        document.body.classList.remove("moderacao-modal-aberto");
        estado.alvo = null;

        if (estado.botaoOrigem && typeof estado.botaoOrigem.focus === "function") {
            estado.botaoOrigem.focus();
        }
        estado.botaoOrigem = null;
    }

    function mostrarErroModal(mensagem) {
        const alerta = document.getElementById("alertaModalDenuncia");
        if (!alerta) return;
        alerta.textContent = mensagem;
        alerta.hidden = false;
    }

    async function enviarDenuncia(event) {
        event.preventDefault();
        const alvo = estado.alvo;
        const select = document.getElementById("motivoDenunciaConteudo");
        const textarea = document.getElementById("detalhesDenunciaConteudo");
        const botao = document.getElementById("btnEnviarDenuncia");
        const motivo = select?.value || "";
        const detalhes = textarea?.value?.trim() || "";

        if (!alvo || !botao) return;

        if (!motivo) {
            mostrarErroModal("Selecione o motivo da denúncia.");
            select?.focus();
            return;
        }

        if (detalhes && detalhes.length < 5) {
            mostrarErroModal("Os detalhes devem ter pelo menos 5 caracteres.");
            textarea?.focus();
            return;
        }

        if (motivo === "outro" && detalhes.length < 10) {
            mostrarErroModal("Para outro motivo, escreva pelo menos 10 caracteres nos detalhes.");
            textarea?.focus();
            return;
        }

        const original = botao.innerHTML;
        estado.enviando = true;
        botao.disabled = true;
        botao.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Enviando';
        document.getElementById("alertaModalDenuncia").hidden = true;

        try {
            const { data, error } = await window.db.rpc("criar_denuncia_conteudo", {
                p_tipo_conteudo: alvo.tipo,
                p_conteudo_id: alvo.id,
                p_motivo: motivo,
                p_detalhes: detalhes || null
            });

            if (error) throw error;
            if (data?.sucesso !== true) {
                throw new Error("A denúncia não foi confirmada pelo servidor.");
            }

            const botaoOrigem = estado.botaoOrigem;
            estado.enviando = false;
            fecharDenuncia();

            if (botaoOrigem) {
                botaoOrigem.disabled = true;
                botaoOrigem.classList.add("denuncia-enviada");
                botaoOrigem.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Denúncia enviada';
            }

            notificar(
                "A administração recebeu sua denúncia e fará a análise.",
                "sucesso",
                "Denúncia enviada"
            );
        } catch (erro) {
            console.error("Erro ao enviar denúncia:", erro);
            mostrarErroModal(
                erro?.message || "Não foi possível enviar a denúncia. Tente novamente."
            );
        } finally {
            estado.enviando = false;
            botao.disabled = false;
            botao.innerHTML = original;
        }
    }

    function configurarEventos() {
        document.addEventListener("click", event => {
            const denunciar = event.target.closest("[data-denunciar-conteudo]");
            if (denunciar) {
                abrirDenuncia(denunciar);
                return;
            }

            if (event.target.closest("[data-fechar-denuncia]")) {
                fecharDenuncia();
            }
        });

        document.addEventListener("submit", event => {
            if (event.target?.id === "formDenunciaConteudo") enviarDenuncia(event);
        });

        document.addEventListener("input", event => {
            if (event.target?.id === "detalhesDenunciaConteudo") {
                document.getElementById("contadorDetalhesDenuncia").textContent =
                    String(event.target.value.length);
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") fecharDenuncia();
        });
    }

    configurarEventos();

    window.ModeracaoConteudoTestes = Object.freeze({
        MOTIVOS,
        obterDestinoAtual,
        escaparHTML
    });
})();
