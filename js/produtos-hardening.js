// ==========================================
// PRODUTOS-HARDENING.JS
// Preserva histórico: "Excluir" vira desativação lógica
// ==========================================

(() => {
    "use strict";

    let observer = null;

    function localizarBotao(id) {
        return Array.from(
            document.querySelectorAll(".btn-excluir[data-produto-id]")
        ).find((botao) => String(botao.dataset.produtoId) === String(id)) || null;
    }

    function obterNomeProduto(id) {
        const botao = localizarBotao(id);
        return botao
            ?.closest(".produto-card")
            ?.querySelector("h3")
            ?.textContent
            ?.trim()
            || "Produto";
    }

    function notificar(texto, tipo = "info", titulo = null, duracao = 4000) {
        if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(texto, tipo, titulo, duracao);
            return;
        }

        console.log(`[${tipo}] ${titulo || ""}`, texto);
    }

    async function confirmarDesativacao(nomeProduto) {
        const mensagem = `Deseja desativar "${nomeProduto}"? Ele sairá do catálogo público, mas será mantido no banco para preservar pedidos e históricos antigos. Você poderá reativá-lo pela tela de edição.`;

        if (typeof window.confirmarAcao === "function") {
            return window.confirmarAcao({
                titulo: "Desativar produto?",
                mensagem,
                textoConfirmar: "Sim, desativar",
                textoCancelar: "Cancelar",
                perigo: false
            });
        }

        return window.confirm(mensagem);
    }

    async function desativarProduto(id) {
        if (!id || !window.db) {
            notificar(
                "Não foi possível identificar o produto ou conectar ao sistema.",
                "erro",
                "Não foi possível desativar"
            );
            return;
        }

        const nomeProduto = obterNomeProduto(id);
        const confirmou = await confirmarDesativacao(nomeProduto);

        if (!confirmou) return;

        const botao = localizarBotao(id);
        const conteudoOriginal = botao?.innerHTML;

        if (botao) {
            botao.disabled = true;
            botao.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Desativando...';
        }

        try {
            const { data, error } = await window.db
                .from("produtos")
                .update({ ativo: false })
                .eq("id", id)
                .select("id,ativo")
                .maybeSingle();

            if (error) throw error;
            if (!data) {
                throw new Error("Produto não encontrado ou sem permissão para alteração.");
            }

            notificar(
                `"${nomeProduto}" foi desativado. O histórico de pedidos foi preservado.`,
                "sucesso",
                "Produto desativado",
                3500
            );

            if (typeof window.carregarProdutos === "function") {
                await window.carregarProdutos();
            } else {
                window.location.reload();
            }
        } catch (erro) {
            console.error("Erro ao desativar produto:", erro);

            notificar(
                erro?.message || "Não foi possível desativar o produto.",
                "erro",
                "Erro ao desativar",
                5000
            );

            if (botao) {
                botao.disabled = false;
                botao.innerHTML = conteudoOriginal || '<i class="fa-solid fa-eye-slash"></i> Desativar';
            }
        }
    }

    function atualizarBotoes() {
        document
            .querySelectorAll(".btn-excluir[data-produto-id]")
            .forEach((botao) => {
                const card = botao.closest(".produto-card");
                const jaInativo = Boolean(card?.querySelector(".inativo"));

                botao.setAttribute(
                    "aria-label",
                    jaInativo ? "Produto já está inativo" : "Desativar produto"
                );

                if (jaInativo) {
                    botao.disabled = true;
                    botao.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Inativo';
                    return;
                }

                botao.disabled = false;
                botao.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Desativar';
            });
    }

    function instalar() {
        // A função original fazia DELETE físico. Sobrescrevemos o handler global
        // para que o onclick já existente passe a fazer UPDATE ativo=false.
        window.excluirProduto = desativarProduto;
        atualizarBotoes();

        const lista = document.getElementById("lista-produtos");
        if (!lista || observer) return;

        observer = new MutationObserver(() => atualizarBotoes());
        observer.observe(lista, { childList: true, subtree: true });
    }

    if (document.readyState === "complete") {
        instalar();
    } else {
        window.addEventListener("load", instalar, { once: true });
    }

    // Reforço para cenários em que scripts assíncronos terminem depois do load.
    setTimeout(instalar, 1200);
})();
