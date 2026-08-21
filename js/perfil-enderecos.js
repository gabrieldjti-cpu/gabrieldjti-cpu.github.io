// ==========================================
// PERFIL-ENDERECOS.JS
// RF-04 — múltiplos endereços no perfil
// ==========================================

(function () {
    "use strict";

    let enderecos = [];

    window.iniciarEnderecosPerfil = async function () {
        if (!window.EnderecosCliente || !window.db) return;

        const { data } = await window.db.auth.getSession();
        if (!data?.session) return;

        ocultarCamposLegadosDoModal();
        inserirCard();
        inserirModal();
        configurarEventos();
        await carregarEnderecos();
    };

    function inserirCard() {
        if (document.getElementById("enderecos-rf04-card")) return;

        const conteudo = document.querySelector(".conteudo");
        if (!conteudo) return;

        const card = document.createElement("div");
        card.className = "card enderecos-rf04-card";
        card.id = "enderecos-rf04-card";
        card.innerHTML = `
            <div class="enderecos-rf04-topo">
                <div>
                    <h2><i class="fa-solid fa-location-dot"></i> Meus Endereços</h2>
                    <p>Cadastre mais de um endereço de entrega e escolha o principal.</p>
                </div>
                <button type="button" class="btn verde" id="btn-novo-endereco-rf04">
                    <i class="fa-solid fa-plus"></i> Adicionar endereço
                </button>
            </div>
            <div id="lista-enderecos-rf04" class="enderecos-rf04-lista" aria-live="polite">
                <div class="endereco-rf04-carregando">
                    <i class="fa-solid fa-spinner fa-spin"></i> Carregando endereços...
                </div>
            </div>
        `;

        const historico = Array.from(conteudo.children).find((el) =>
            el.querySelector?.("#historico-compras")
        );

        if (historico) conteudo.insertBefore(card, historico);
        else conteudo.appendChild(card);
    }

    function inserirModal() {
        if (document.getElementById("modal-endereco-rf04")) return;

        const modal = document.createElement("div");
        modal.id = "modal-endereco-rf04";
        modal.className = "endereco-rf04-modal";
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.innerHTML = `
            <div class="endereco-rf04-modal-box">
                <div class="endereco-rf04-modal-topo">
                    <h2 id="titulo-modal-endereco-rf04">Novo endereço</h2>
                    <button type="button" class="endereco-rf04-fechar" data-fechar-endereco aria-label="Fechar">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>

                <form id="form-endereco-rf04">
                    <input type="hidden" id="end-rf04-id">

                    <div class="endereco-rf04-form-grid">
                        <div class="endereco-rf04-campo">
                            <label for="end-rf04-apelido">Apelido</label>
                            <input id="end-rf04-apelido" maxlength="50" required placeholder="Casa, Trabalho...">
                        </div>
                        <div class="endereco-rf04-campo">
                            <label for="end-rf04-cep">CEP</label>
                            <input id="end-rf04-cep" maxlength="9" inputmode="numeric" autocomplete="postal-code" required placeholder="00000-000">
                        </div>
                        <div class="endereco-rf04-campo largo">
                            <label for="end-rf04-logradouro">Rua / Logradouro</label>
                            <input id="end-rf04-logradouro" maxlength="160" autocomplete="address-line1" required>
                        </div>
                        <div class="endereco-rf04-campo">
                            <label for="end-rf04-numero">Número</label>
                            <input id="end-rf04-numero" maxlength="30" required placeholder="123 ou S/N">
                        </div>
                        <div class="endereco-rf04-campo">
                            <label for="end-rf04-bairro">Bairro</label>
                            <input id="end-rf04-bairro" maxlength="100" required>
                        </div>
                        <div class="endereco-rf04-campo">
                            <label for="end-rf04-cidade">Cidade</label>
                            <input id="end-rf04-cidade" maxlength="100" autocomplete="address-level2" required>
                        </div>
                        <div class="endereco-rf04-campo">
                            <label for="end-rf04-estado">UF</label>
                            <input id="end-rf04-estado" maxlength="2" autocomplete="address-level1" required placeholder="BA">
                        </div>
                        <div class="endereco-rf04-campo largo">
                            <label for="end-rf04-complemento">Complemento</label>
                            <input id="end-rf04-complemento" maxlength="120" autocomplete="address-line2" placeholder="Apto, bloco...">
                        </div>
                        <div class="endereco-rf04-campo largo">
                            <label for="end-rf04-referencia">Ponto de referência</label>
                            <textarea id="end-rf04-referencia" rows="2" maxlength="180" placeholder="Próximo à praça..."></textarea>
                        </div>
                    </div>

                    <label class="endereco-rf04-check">
                        <input type="checkbox" id="end-rf04-padrao">
                        Definir como endereço padrão
                    </label>

                    <div class="endereco-rf04-modal-acoes">
                        <button type="button" class="endereco-rf04-btn secundario" data-fechar-endereco>Cancelar</button>
                        <button type="submit" class="btn verde" id="btn-salvar-endereco-rf04">
                            <i class="fa-solid fa-floppy-disk"></i> Salvar endereço
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
    }

    function ocultarCamposLegadosDoModal() {
        const rua = document.getElementById("edit-rua");
        const numero = document.getElementById("edit-numero");
        const cidade = document.getElementById("edit-cidade");

        rua?.closest(".campo")?.setAttribute("hidden", "");
        numero?.closest(".linha")?.setAttribute("hidden", "");
        cidade?.closest(".campo")?.setAttribute("hidden", "");

        const modalBox = document.querySelector("#modal-editar-perfil .modal-box");
        if (modalBox && !modalBox.querySelector(".endereco-rf04-legacy-note")) {
            const botoes = modalBox.querySelector(".botoes");
            const nota = document.createElement("p");
            nota.className = "endereco-rf04-legacy-note";
            nota.textContent = "Os endereços de entrega agora são gerenciados na seção Meus Endereços do perfil.";
            if (botoes) modalBox.insertBefore(nota, botoes);
        }
    }

    function configurarEventos() {
        document.getElementById("btn-novo-endereco-rf04")?.addEventListener("click", () => abrirModal());
        document.getElementById("form-endereco-rf04")?.addEventListener("submit", salvarFormulario);

        document.querySelectorAll("[data-fechar-endereco]").forEach((botao) => {
            botao.addEventListener("click", fecharModal);
        });

        document.getElementById("modal-endereco-rf04")?.addEventListener("click", (event) => {
            if (event.target.id === "modal-endereco-rf04") fecharModal();
        });

        document.getElementById("lista-enderecos-rf04")?.addEventListener("click", async (event) => {
            const botao = event.target.closest("button[data-acao-endereco]");
            if (!botao) return;

            const id = botao.dataset.id;
            const endereco = enderecos.find((item) => item.id === id);
            if (!endereco) return;

            if (botao.dataset.acaoEndereco === "editar") {
                abrirModal(endereco);
                return;
            }

            if (botao.dataset.acaoEndereco === "padrao") {
                await definirPadrao(id);
                return;
            }

            if (botao.dataset.acaoEndereco === "excluir") {
                await excluirEndereco(id, endereco.apelido);
            }
        });
    }

    async function carregarEnderecos() {
        const lista = document.getElementById("lista-enderecos-rf04");
        if (!lista) return;

        try {
            enderecos = await window.EnderecosCliente.listar();
            renderizar();
            atualizarResumoPerfil();
        } catch (erro) {
            console.error("Erro ao carregar endereços:", erro);
            lista.innerHTML = `<div class="endereco-rf04-vazio">Não foi possível carregar seus endereços.</div>`;
            window.EnderecosCliente.notificar(
                erro?.message || "Não foi possível carregar os endereços.",
                "erro",
                "Erro nos endereços"
            );
        }
    }

    function renderizar() {
        const lista = document.getElementById("lista-enderecos-rf04");
        if (!lista) return;

        if (enderecos.length === 0) {
            lista.innerHTML = `
                <div class="endereco-rf04-vazio">
                    <i class="fa-solid fa-location-dot"></i>
                    <p>Você ainda não cadastrou um endereço de entrega.</p>
                </div>
            `;
            return;
        }

        lista.innerHTML = enderecos.map((endereco) => {
            const api = window.EnderecosCliente;
            return `
                <article class="endereco-rf04-item">
                    <div class="endereco-rf04-item-topo">
                        <div class="endereco-rf04-titulo">
                            <strong>${api.escaparHTML(endereco.apelido)}</strong>
                            ${endereco.padrao ? '<span class="endereco-rf04-badge"><i class="fa-solid fa-star"></i> Padrão</span>' : ""}
                            ${!endereco.completo ? '<span class="endereco-rf04-badge incompleto"><i class="fa-solid fa-triangle-exclamation"></i> Complete CEP/UF</span>' : ""}
                        </div>
                    </div>
                    <p class="endereco-rf04-texto">${api.escaparHTML(api.formatarLinha(endereco))}</p>
                    ${endereco.referencia ? `<span class="endereco-rf04-referencia">Referência: ${api.escaparHTML(endereco.referencia)}</span>` : ""}
                    <div class="endereco-rf04-acoes">
                        <button type="button" class="endereco-rf04-btn secundario" data-acao-endereco="editar" data-id="${endereco.id}">
                            <i class="fa-solid fa-pen"></i> Editar
                        </button>
                        ${!endereco.padrao ? `
                            <button type="button" class="endereco-rf04-btn secundario" data-acao-endereco="padrao" data-id="${endereco.id}">
                                <i class="fa-solid fa-star"></i> Tornar padrão
                            </button>
                        ` : ""}
                        <button type="button" class="endereco-rf04-btn perigo" data-acao-endereco="excluir" data-id="${endereco.id}">
                            <i class="fa-solid fa-trash"></i> Excluir
                        </button>
                    </div>
                </article>
            `;
        }).join("");
    }

    function abrirModal(endereco = null) {
        document.getElementById("titulo-modal-endereco-rf04").textContent = endereco ? "Editar endereço" : "Novo endereço";
        valor("end-rf04-id", endereco?.id || "");
        valor("end-rf04-apelido", endereco?.apelido || "Casa");
        valor("end-rf04-cep", endereco?.cep ? window.EnderecosCliente.formatarCep(endereco.cep) : "");
        valor("end-rf04-logradouro", endereco?.logradouro || "");
        valor("end-rf04-numero", endereco?.numero || "");
        valor("end-rf04-complemento", endereco?.complemento || "");
        valor("end-rf04-bairro", endereco?.bairro || "");
        valor("end-rf04-cidade", endereco?.cidade || "");
        valor("end-rf04-estado", endereco?.estado || "");
        valor("end-rf04-referencia", endereco?.referencia || "");
        document.getElementById("end-rf04-padrao").checked = Boolean(endereco?.padrao || enderecos.length === 0);
        document.getElementById("modal-endereco-rf04")?.classList.add("aberto");
        document.getElementById("end-rf04-apelido")?.focus();
    }

    function fecharModal() {
        document.getElementById("modal-endereco-rf04")?.classList.remove("aberto");
    }

    async function salvarFormulario(event) {
        event.preventDefault();

        const botao = document.getElementById("btn-salvar-endereco-rf04");
        if (botao) botao.disabled = true;

        try {
            await window.EnderecosCliente.salvar({
                id: obter("end-rf04-id") || null,
                apelido: obter("end-rf04-apelido"),
                cep: obter("end-rf04-cep"),
                logradouro: obter("end-rf04-logradouro"),
                numero: obter("end-rf04-numero"),
                complemento: obter("end-rf04-complemento"),
                bairro: obter("end-rf04-bairro"),
                cidade: obter("end-rf04-cidade"),
                estado: obter("end-rf04-estado").toUpperCase(),
                referencia: obter("end-rf04-referencia"),
                padrao: document.getElementById("end-rf04-padrao")?.checked
            });

            fecharModal();
            await carregarEnderecos();
            window.EnderecosCliente.notificar("Endereço salvo com sucesso.", "sucesso", "Endereço salvo");
        } catch (erro) {
            console.error("Erro ao salvar endereço:", erro);
            window.EnderecosCliente.notificar(erro?.message || "Não foi possível salvar o endereço.", "erro", "Erro ao salvar");
        } finally {
            if (botao) botao.disabled = false;
        }
    }

    async function definirPadrao(id) {
        try {
            await window.EnderecosCliente.definirPadrao(id);
            await carregarEnderecos();
            window.EnderecosCliente.notificar("Endereço padrão atualizado.", "sucesso", "Endereço padrão");
        } catch (erro) {
            window.EnderecosCliente.notificar(erro?.message || "Não foi possível alterar o endereço padrão.", "erro", "Erro");
        }
    }

    async function excluirEndereco(id, apelido) {
        const confirmar = window.confirm(`Excluir o endereço "${apelido || "Endereço"}"?`);
        if (!confirmar) return;

        try {
            await window.EnderecosCliente.excluir(id);
            await carregarEnderecos();
            window.EnderecosCliente.notificar("Endereço removido.", "sucesso", "Endereço excluído");
        } catch (erro) {
            window.EnderecosCliente.notificar(erro?.message || "Não foi possível excluir o endereço.", "erro", "Erro");
        }
    }

    function atualizarResumoPerfil() {
        const resumo = document.getElementById("perf-endereco-resumo");
        if (!resumo) return;

        const padrao = enderecos.find((item) => item.padrao) || enderecos[0];
        resumo.textContent = padrao ? window.EnderecosCliente.formatarLinha(padrao) : "Não informado";
    }

    function obter(id) {
        return String(document.getElementById(id)?.value || "").trim();
    }

    function valor(id, conteudo) {
        const campo = document.getElementById(id);
        if (campo) campo.value = conteudo ?? "";
    }
})();