// ==========================================
// FAVORITOS.JS
// Estado compartilhado dos corações de produto
// ==========================================

(() => {
    "use strict";

    const CHAVE_RETORNO_LOGIN = "destino_apos_login_favoritos";
    const favoritos = new Set();
    let usuarioId = null;
    let inicializando = null;

    function notificar(mensagem, tipo = "info", titulo = null) {
        if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(mensagem, tipo, titulo);
        }
    }

    function obterProdutoId(botao) {
        return String(botao?.dataset?.favoritoProduto || "").trim();
    }

    function atualizarBotao(botao) {
        const produtoId = obterProdutoId(botao);
        if (!produtoId) return;

        const ativo = favoritos.has(produtoId);
        const nomeProduto = String(botao.dataset.favoritoNome || "produto").trim();
        const icone = botao.querySelector("i");
        const classeIcone = ativo ? "fa-solid fa-heart" : "fa-regular fa-heart";

        botao.classList.toggle("ativo", ativo);
        botao.setAttribute("aria-pressed", String(ativo));
        botao.setAttribute(
            "aria-label",
            ativo
                ? `Remover ${nomeProduto} dos favoritos`
                : `Adicionar ${nomeProduto} aos favoritos`
        );
        botao.title = ativo ? "Remover dos favoritos" : "Adicionar aos favoritos";

        if (icone && icone.className !== classeIcone) {
            icone.className = classeIcone;
        }
    }

    function atualizarBotoes(raiz = document) {
        raiz
            .querySelectorAll?.("[data-favorito-produto]")
            .forEach(atualizarBotao);
    }

    function obterDestinoAtual() {
        const arquivo = window.location.pathname.split("/").pop() || "index.html";
        return `${arquivo}${window.location.search}${window.location.hash}`;
    }

    function redirecionarParaLogin() {
        try {
            sessionStorage.setItem(CHAVE_RETORNO_LOGIN, obterDestinoAtual());
        } catch (erro) {
            console.warn("Não foi possível salvar o retorno após o login:", erro);
        }

        notificar(
            "Entre na sua conta para salvar produtos nos favoritos.",
            "info",
            "Login necessário"
        );

        setTimeout(() => {
            window.location.href = "login.html";
        }, 450);
    }

    async function carregarFavoritos() {
        favoritos.clear();

        if (!window.db) {
            console.error("Favoritos: Supabase não foi inicializado.");
            atualizarBotoes();
            return;
        }

        try {
            const { data: sessaoData, error: sessaoError } =
                await window.db.auth.getSession();

            if (sessaoError) throw sessaoError;

            usuarioId = sessaoData?.session?.user?.id || null;

            if (!usuarioId) {
                atualizarBotoes();
                return;
            }

            const { data, error } = await window.db
                .from("favoritos")
                .select("produto_id")
                .eq("cliente_id", usuarioId);

            if (error) throw error;

            (data || []).forEach(item => {
                if (item?.produto_id) favoritos.add(String(item.produto_id));
            });
        } catch (erro) {
            console.error("Não foi possível carregar os favoritos:", erro);
        } finally {
            atualizarBotoes();
        }
    }

    function iniciar() {
        if (!inicializando) {
            inicializando = carregarFavoritos();
        }

        return inicializando;
    }

    async function alternar(produtoId, botao = null) {
        const id = String(produtoId || "").trim();
        if (!id) return false;

        await iniciar();

        if (!usuarioId) {
            redirecionarParaLogin();
            return false;
        }

        const estavaFavorito = favoritos.has(id);
        const botoesProduto = [
            ...document.querySelectorAll("[data-favorito-produto]")
        ].filter(item => obterProdutoId(item) === id);

        if (botao && !botoesProduto.includes(botao)) botoesProduto.push(botao);
        botoesProduto.forEach(item => { item.disabled = true; });

        try {
            if (estavaFavorito) {
                const { error } = await window.db
                    .from("favoritos")
                    .delete()
                    .eq("cliente_id", usuarioId)
                    .eq("produto_id", id);

                if (error) throw error;
                favoritos.delete(id);
            } else {
                const { error } = await window.db
                    .from("favoritos")
                    .insert({ cliente_id: usuarioId, produto_id: id });

                if (error && error.code !== "23505") throw error;
                favoritos.add(id);
            }

            atualizarBotoes();
            document.dispatchEvent(new CustomEvent("favoritos:alterado", {
                detail: { produtoId: id, favorito: !estavaFavorito }
            }));

            notificar(
                estavaFavorito
                    ? "Produto removido dos seus favoritos."
                    : "Produto salvo nos seus favoritos.",
                "sucesso",
                estavaFavorito ? "Favorito removido" : "Favorito adicionado"
            );

            return true;
        } catch (erro) {
            console.error("Não foi possível alterar o favorito:", erro);
            notificar(
                "Não foi possível atualizar seus favoritos. Tente novamente.",
                "erro",
                "Erro nos favoritos"
            );
            return false;
        } finally {
            botoesProduto.forEach(item => { item.disabled = false; });
            atualizarBotoes();
        }
    }

    document.addEventListener("click", event => {
        const botao = event.target.closest?.("[data-favorito-produto]");
        if (!botao) return;

        event.preventDefault();
        event.stopPropagation();
        alternar(obterProdutoId(botao), botao);
    });

    const observarCards = () => {
        const observador = new MutationObserver(mudancas => {
            mudancas.forEach(mudanca => {
                mudanca.addedNodes.forEach(no => {
                    if (!(no instanceof Element)) return;
                    if (no.matches?.("[data-favorito-produto]")) atualizarBotao(no);
                    atualizarBotoes(no);
                });
            });
        });

        observador.observe(document.body, { childList: true, subtree: true });
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            observarCards();
            iniciar();
        }, { once: true });
    } else {
        observarCards();
        iniciar();
    }

    window.Favoritos = Object.freeze({
        iniciar,
        alternar,
        atualizarBotoes,
        contem: produtoId => favoritos.has(String(produtoId || "")),
        obterIds: () => new Set(favoritos)
    });
})();
