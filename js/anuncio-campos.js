// ==========================================
// ANUNCIO-CAMPOS.JS
// No formulário do anúncio (novo e edição):
//  * mostra "Novo ou usado" só nas categorias em que faz sentido
//    (a categoria marca isso no painel do admin; a subcategoria segue
//    a categoria principal);
//  * troca a quantidade em estoque por Disponível / Indisponível.
// O banco confere as duas regras; aqui é só para ajudar quem preenche.
// ==========================================

(() => {
    "use strict";

    let categorias = [];
    let categoriasCarregadas = false;
    // Condição do anúncio em edição, guardada até as categorias chegarem.
    let condicaoPendente = "";

    const $ = id => document.getElementById(id);

    function categoriaEscolhida() {
        const sub = $("subcategoria")?.value;
        const principal = $("categoria")?.value;
        return Number(sub || principal || 0) || null;
    }

    function pedeCondicao(id) {
        if (!id) return false;
        const categoria = categorias.find(item => Number(item.id) === Number(id));
        if (!categoria) return false;
        if (categoria.pede_condicao) return true;
        if (!categoria.categoria_pai_id) return false;
        const pai = categorias.find(item => Number(item.id) === Number(categoria.categoria_pai_id));
        return Boolean(pai?.pede_condicao);
    }

    function atualizarCondicao() {
        const campo = $("campo-condicao");
        const select = $("condicao");
        if (!campo || !select) return;

        if (!categoriasCarregadas) return;

        const pede = pedeCondicao(categoriaEscolhida());
        campo.hidden = !pede;
        select.required = pede;
        if (!pede) {
            select.value = "";
        } else if (!select.value && condicaoPendente) {
            select.value = condicaoPendente;
        }
    }

    function sincronizarDisponibilidade() {
        const select = $("disponibilidade");
        const estoque = $("estoque");
        if (!select || !estoque) return;
        estoque.value = select.value === "0" ? "0" : "1";
    }

    function avisar(mensagem) {
        if (typeof window.notificar === "function") {
            window.notificar(mensagem, "aviso", "Falta uma informação", 4500);
        } else if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(mensagem, "aviso", "Falta uma informação", 4500);
        }
    }

    // Roda antes do envio do formulário principal.
    function conferirAntesDeEnviar(evento) {
        if (evento.target?.id !== "form-produto") return;
        sincronizarDisponibilidade();

        const select = $("condicao");
        if (select && !$("campo-condicao")?.hidden && !select.value) {
            evento.preventDefault();
            evento.stopImmediatePropagation();
            avisar("Informe se o produto é novo ou usado.");
            select.focus();
        }
    }

    async function carregarCategorias() {
        if (!window.db) return;
        try {
            const { data, error } = await window.db
                .from("categorias_produtos")
                .select("id,categoria_pai_id,pede_condicao")
                .eq("ativa", true);
            if (error) throw error;
            categorias = data || [];
            categoriasCarregadas = true;
            atualizarCondicao();
        } catch (erro) {
            console.warn("Não foi possível carregar as regras de condição:", erro);
        }
    }

    window.anuncioCampos = {
        // Valor que vai para o banco: "novo", "usado" ou null.
        condicao() {
            const campo = $("campo-condicao");
            const valor = $("condicao")?.value || "";
            return campo && !campo.hidden && valor ? valor : null;
        },

        // Usado pela edição, depois de carregar o anúncio.
        preencher(produto) {
            const disponivel = Number(produto?.estoque || 0) > 0;
            const select = $("disponibilidade");
            if (select) select.value = disponivel ? "1" : "0";
            sincronizarDisponibilidade();

            condicaoPendente = produto?.condicao || "";
            const condicao = $("condicao");
            if (condicao && condicaoPendente) condicao.value = condicaoPendente;
            atualizarCondicao();
        },

        atualizar: atualizarCondicao
    };

    function iniciar() {
        $("categoria")?.addEventListener("change", () => setTimeout(atualizarCondicao, 0));
        $("subcategoria")?.addEventListener("change", atualizarCondicao);
        $("disponibilidade")?.addEventListener("change", sincronizarDisponibilidade);
        document.addEventListener("submit", conferirAntesDeEnviar, true);
        sincronizarDisponibilidade();
        carregarCategorias();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }
})();
