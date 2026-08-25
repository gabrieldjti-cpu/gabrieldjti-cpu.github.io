// ==========================================
// CHECKOUT-ENDERECOS.JS
// RF-04/RF-09 — seleção/cadastro de endereço
// ==========================================

(function () {
    "use strict";

    let enderecos = [];
    let usuarioAtual = null;

    window.checkoutEnderecoSelecionadoId = null;

    window.iniciarEnderecosCheckout = async function () {
        if (!window.EnderecosCliente || !window.db) return;

        const { data } = await window.db.auth.getSession();
        usuarioAtual = data?.session?.user || null;
        if (!usuarioAtual) return;

        inserirSeletor();
        inserirModal();
        configurarEventos();
        bloquearEdicaoManual();
        await preencherContatoDoPerfil();
        await carregarEnderecos();
    };

    function inserirSeletor() {
        if (document.getElementById("checkout-enderecos-rf04")) return;

        const titulo = Array.from(document.querySelectorAll(".card h2")).find((el) =>
            el.textContent.includes("Endereço de Entrega")
        );

        const card = titulo?.closest(".card");
        if (!card) return;

        const area = document.createElement("div");
        area.id = "checkout-enderecos-rf04";
        area.className = "checkout-enderecos-rf04";
        area.innerHTML = `
            <div class="enderecos-rf04-topo">
                <div>
                    <h3>Escolha o endereço</h3>
                    <p class="checkout-enderecos-rf04-aviso">O endereço escolhido será gravado no pedido e não mudará em compras antigas se você editá-lo depois.</p>
                </div>
                <button type="button" class="endereco-rf04-btn secundario" id="btn-novo-endereco-checkout">
                    <i class="fa-solid fa-plus"></i> Novo endereço
                </button>
            </div>
            <div id="lista-enderecos-checkout" class="enderecos-rf04-lista" aria-live="polite">
                <div class="endereco-rf04-carregando"><i class="fa-solid fa-spinner fa-spin"></i> Carregando endereços...</div>
            </div>
        `;

        titulo.insertAdjacentElement("afterend", area);
    }

    function inserirModal() {
        if (document.getElementById("modal-endereco-checkout")) return;

        const modal = document.createElement("div");
        modal.id = "modal-endereco-checkout";
        modal.className = "endereco-rf04-modal";
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.innerHTML = `
            <div class="endereco-rf04-modal-box">
                <div class="endereco-rf04-modal-topo">
                    <h2 id="titulo-modal-endereco-checkout">Novo endereço</h2>
                    <button type="button" class="endereco-rf04-fechar" data-fechar-endereco-checkout aria-label="Fechar"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <form id="form-endereco-checkout">
                    <input type="hidden" id="end-checkout-id">
                    <div class="endereco-rf04-form-grid">
                        <div class="endereco-rf04-campo">
                            <label for="end-checkout-apelido">Apelido</label>
                            <input id="end-checkout-apelido" maxlength="50" required placeholder="Casa, Trabalho...">
                        </div>
                        <div class="endereco-rf04-campo">
                            <label for="end-checkout-cep">CEP</label>
                            <input id="end-checkout-cep" maxlength="9" inputmode="numeric" required placeholder="00000-000">
                        </div>
                        <div class="endereco-rf04-campo largo">
                            <label for="end-checkout-logradouro">Rua / Logradouro</label>
                            <input id="end-checkout-logradouro" maxlength="160" required>
                        </div>
                        <div class="endereco-rf04-campo">
                            <label for="end-checkout-numero">Número</label>
                            <input id="end-checkout-numero" maxlength="30" required placeholder="123 ou S/N">
                        </div>
                        <div class="endereco-rf04-campo">
                            <label for="end-checkout-bairro">Bairro</label>
                            <input id="end-checkout-bairro" maxlength="100" required>
                        </div>
                        <div class="endereco-rf04-campo">
                            <label for="end-checkout-cidade">Cidade</label>
                            <input id="end-checkout-cidade" maxlength="100" required>
                        </div>
                        <div class="endereco-rf04-campo">
                            <label for="end-checkout-estado">UF</label>
                            <input id="end-checkout-estado" maxlength="2" required placeholder="BA">
                        </div>
                        <div class="endereco-rf04-campo largo">
                            <label for="end-checkout-complemento">Complemento</label>
                            <input id="end-checkout-complemento" maxlength="120" placeholder="Apto, bloco...">
                        </div>
                        <div class="endereco-rf04-campo largo">
                            <label for="end-checkout-referencia">Ponto de referência</label>
                            <textarea id="end-checkout-referencia" rows="2" maxlength="180"></textarea>
                        </div>
                    </div>
                    <label class="endereco-rf04-check">
                        <input type="checkbox" id="end-checkout-padrao"> Definir como endereço padrão
                    </label>
                    <div class="endereco-rf04-modal-acoes">
                        <button type="button" class="endereco-rf04-btn secundario" data-fechar-endereco-checkout>Cancelar</button>
                        <button type="submit" class="btn" id="btn-salvar-endereco-checkout"><i class="fa-solid fa-floppy-disk"></i> Salvar e usar</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
    }

    function configurarEventos() {
        document.getElementById("btn-novo-endereco-checkout")?.addEventListener("click", () => abrirModal());
        document.getElementById("form-endereco-checkout")?.addEventListener("submit", salvarFormulario);

        document.querySelectorAll("[data-fechar-endereco-checkout]").forEach((botao) =>
            botao.addEventListener("click", fecharModal)
        );

        document.getElementById("modal-endereco-checkout")?.addEventListener("click", (event) => {
            if (event.target.id === "modal-endereco-checkout") fecharModal();
        });

        document.getElementById("lista-enderecos-checkout")?.addEventListener("click", (event) => {
            const editar = event.target.closest("button[data-editar-endereco-checkout]");
            if (editar) {
                event.stopPropagation();
                const endereco = enderecos.find((item) => item.id === editar.dataset.id);
                if (endereco) abrirModal(endereco);
                return;
            }

            const item = event.target.closest("[data-endereco-checkout-id]");
            if (!item) return;

            const endereco = enderecos.find((e) => e.id === item.dataset.enderecoCheckoutId);
            if (!endereco) return;

            if (!endereco.completo) {
                window.EnderecosCliente.notificar("Complete o CEP e a UF deste endereço antes de usá-lo.", "aviso", "Endereço incompleto");
                abrirModal(endereco);
                return;
            }

            selecionarEndereco(endereco.id);
        });

        const btnFinalizar = document.getElementById("btn-finalizar");
        btnFinalizar?.addEventListener("click", (event) => {
            if (window.checkoutEnderecoSelecionadoId) return;

            event.preventDefault();
            event.stopImmediatePropagation();
            window.EnderecosCliente.notificar(
                "Cadastre ou selecione um endereço completo antes de finalizar o pedido.",
                "aviso",
                "Endereço obrigatório"
            );
            document.getElementById("checkout-enderecos-rf04")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, true);
    }

    async function preencherContatoDoPerfil() {
        try {
            const { data, error } = await window.db
                .from("profiles")
                .select("nome,telefone")
                .eq("id", usuarioAtual.id)
                .maybeSingle();

            if (error) throw error;

            const nome = document.getElementById("nome");
            const telefone = document.getElementById("telefone");
            if (nome && data?.nome) nome.value = data.nome;
            if (telefone && data?.telefone) telefone.value = data.telefone;
        } catch (erro) {
            console.warn("Não foi possível preencher o contato do perfil:", erro);
        }
    }

    async function carregarEnderecos(preferirId = null) {
        const lista = document.getElementById("lista-enderecos-checkout");
        const botao = document.getElementById("btn-finalizar");
        if (botao) botao.disabled = true;

        try {
            enderecos = await window.EnderecosCliente.listar();
            renderizar();

            const completos = enderecos.filter((item) => item.completo);
            const escolhido = completos.find((item) => item.id === preferirId)
                || completos.find((item) => item.padrao)
                || completos[0]
                || null;

            if (escolhido) selecionarEndereco(escolhido.id);
            else limparSelecao();
        } catch (erro) {
            console.error("Erro ao carregar endereços do checkout:", erro);
            if (lista) lista.innerHTML = '<div class="endereco-rf04-vazio">Não foi possível carregar seus endereços.</div>';
            limparSelecao();
        } finally {
            if (botao) botao.disabled = false;
        }
    }

    function renderizar() {
        const lista = document.getElementById("lista-enderecos-checkout");
        if (!lista) return;

        if (enderecos.length === 0) {
            lista.innerHTML = `
                <div class="endereco-rf04-vazio">
                    <p>Nenhum endereço salvo.</p>
                    <button type="button" class="endereco-rf04-btn secundario" id="btn-primeiro-endereco-checkout">Cadastrar agora</button>
                </div>
            `;
            document.getElementById("btn-primeiro-endereco-checkout")?.addEventListener("click", () => abrirModal());
            return;
        }

        const api = window.EnderecosCliente;
        lista.innerHTML = enderecos.map((endereco) => `
            <article class="endereco-rf04-item ${window.checkoutEnderecoSelecionadoId === endereco.id ? "selecionado" : ""}" data-endereco-checkout-id="${endereco.id}" tabindex="0">
                <div class="endereco-rf04-item-topo">
                    <div class="endereco-rf04-titulo">
                        <strong>${api.escaparHTML(endereco.apelido)}</strong>
                        ${endereco.padrao ? '<span class="endereco-rf04-badge"><i class="fa-solid fa-star"></i> Padrão</span>' : ""}
                        ${!endereco.completo ? '<span class="endereco-rf04-badge incompleto"><i class="fa-solid fa-triangle-exclamation"></i> Incompleto</span>' : ""}
                    </div>
                    ${window.checkoutEnderecoSelecionadoId === endereco.id ? '<i class="fa-solid fa-circle-check" aria-label="Selecionado"></i>' : ""}
                </div>
                <p class="endereco-rf04-texto">${api.escaparHTML(api.formatarLinha(endereco))}</p>
                <div class="endereco-rf04-acoes">
                    <button type="button" class="endereco-rf04-btn secundario" data-editar-endereco-checkout data-id="${endereco.id}"><i class="fa-solid fa-pen"></i> Editar</button>
                </div>
            </article>
        `).join("");
    }

    function selecionarEndereco(id) {
        const endereco = enderecos.find((item) => item.id === id && item.completo);
        if (!endereco) return;

        window.checkoutEnderecoSelecionadoId = endereco.id;

        const linha = [
            `${endereco.logradouro}, ${endereco.numero}`,
            endereco.complemento,
            endereco.bairro
        ].filter(Boolean).join(" - ");

        definirCampo("endereco", linha);
        definirCampo("cidade", endereco.cidade);
        definirCampo("estado", endereco.estado);
        definirCampo("cep", window.EnderecosCliente.formatarCep(endereco.cep));
        renderizar();
    }

    function limparSelecao() {
        window.checkoutEnderecoSelecionadoId = null;
        definirCampo("endereco", "");
        definirCampo("cidade", "");
        definirCampo("estado", "");
        definirCampo("cep", "");
        renderizar();
    }

    function bloquearEdicaoManual() {
        ["endereco", "cidade", "estado", "cep"].forEach((id) => {
            const campo = document.getElementById(id);
            if (campo) {
                campo.readOnly = true;
                campo.setAttribute("aria-readonly", "true");
            }
        });
    }

    function abrirModal(endereco = null) {
        document.getElementById("titulo-modal-endereco-checkout").textContent = endereco ? "Editar endereço" : "Novo endereço";
        valor("end-checkout-id", endereco?.id || "");
        valor("end-checkout-apelido", endereco?.apelido || "Casa");
        valor("end-checkout-cep", endereco?.cep ? window.EnderecosCliente.formatarCep(endereco.cep) : "");
        valor("end-checkout-logradouro", endereco?.logradouro || "");
        valor("end-checkout-numero", endereco?.numero || "");
        valor("end-checkout-bairro", endereco?.bairro || "");
        valor("end-checkout-cidade", endereco?.cidade || "");
        valor("end-checkout-estado", endereco?.estado || "");
        valor("end-checkout-complemento", endereco?.complemento || "");
        valor("end-checkout-referencia", endereco?.referencia || "");
        document.getElementById("end-checkout-padrao").checked = Boolean(endereco?.padrao || enderecos.length === 0);
        document.getElementById("modal-endereco-checkout")?.classList.add("aberto");
        document.getElementById("end-checkout-apelido")?.focus();
    }

    function fecharModal() {
        document.getElementById("modal-endereco-checkout")?.classList.remove("aberto");
    }

    async function salvarFormulario(event) {
        event.preventDefault();
        const botao = document.getElementById("btn-salvar-endereco-checkout");
        if (botao) botao.disabled = true;

        try {
            const resultado = await window.EnderecosCliente.salvar({
                id: obter("end-checkout-id") || null,
                apelido: obter("end-checkout-apelido"),
                cep: obter("end-checkout-cep"),
                logradouro: obter("end-checkout-logradouro"),
                numero: obter("end-checkout-numero"),
                complemento: obter("end-checkout-complemento"),
                bairro: obter("end-checkout-bairro"),
                cidade: obter("end-checkout-cidade"),
                estado: obter("end-checkout-estado").toUpperCase(),
                referencia: obter("end-checkout-referencia"),
                padrao: document.getElementById("end-checkout-padrao")?.checked
            });

            fecharModal();
            await carregarEnderecos(resultado?.endereco_id || null);
            window.EnderecosCliente.notificar("Endereço salvo e selecionado para esta compra.", "sucesso", "Endereço pronto");
        } catch (erro) {
            console.error("Erro ao salvar endereço no checkout:", erro);
            window.EnderecosCliente.notificar(erro?.message || "Não foi possível salvar o endereço.", "erro", "Erro ao salvar");
        } finally {
            if (botao) botao.disabled = false;
        }
    }

    function definirCampo(id, conteudo) {
        const campo = document.getElementById(id);
        if (campo) campo.value = conteudo || "";
    }

    function obter(id) {
        return String(document.getElementById(id)?.value || "").trim();
    }

    function valor(id, conteudo) {
        const campo = document.getElementById(id);
        if (campo) campo.value = conteudo ?? "";
    }
})();
