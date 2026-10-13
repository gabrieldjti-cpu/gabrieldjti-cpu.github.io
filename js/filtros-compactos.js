// ==========================================
// FILTROS-COMPACTOS.JS
// Página inicial e página de categoria: os filtros dos anúncios ficam
// recolhidos atrás do botão "Filtros" (com a quantidade de filtros
// ativos), no celular e no computador. A ordenação fica sempre à mão,
// ao lado do botão.
//
// Cada barra diz no HTML com quem trabalha:
//   data-formulario  id do painel de filtros
//   data-ordenacao   id do <select> de ordenação do painel
//   data-lista       id da lista de anúncios
//   data-limpar      id do botão "Limpar filtros"
// ==========================================

(() => {
    "use strict";

    const $ = id => (id ? document.getElementById(id) : null);

    function configurarBarra(barra) {
        const formulario = $(barra.dataset.formulario);
        const ordenacao = $(barra.dataset.ordenacao);
        const lista = $(barra.dataset.lista);
        const limpar = $(barra.dataset.limpar);
        const botao = barra.querySelector(".btn-abrir-filtros");
        const contador = barra.querySelector(".contador-filtros");
        const ordenacaoRapida = barra.querySelector(".ordenar-rapido select");
        const verAnuncios = formulario?.querySelector(".btn-ver-anuncios");
        if (!formulario || !botao) return;

        // A ordenação da barra é uma cópia da ordenação do painel.
        if (ordenacao && ordenacaoRapida) {
            ordenacaoRapida.innerHTML = ordenacao.innerHTML;
            ordenacaoRapida.value = ordenacao.value;

            ordenacaoRapida.addEventListener("change", () => {
                ordenacao.value = ordenacaoRapida.value;
                ordenacao.dispatchEvent(new Event("change", { bubbles: true }));
            });
        }

        function contarFiltros() {
            let ativos = 0;
            formulario.querySelectorAll("select, input").forEach(campo => {
                if (campo === ordenacao) return;
                if (String(campo.value || "").trim() !== "") ativos += 1;
            });
            return ativos;
        }

        function atualizar() {
            const ativos = contarFiltros();
            if (contador) {
                contador.textContent = String(ativos);
                contador.hidden = ativos === 0;
            }
            botao.setAttribute(
                "aria-label",
                ativos > 0 ? `Filtros (${ativos} ${ativos === 1 ? "ativo" : "ativos"})` : "Filtros"
            );
            if (ordenacao && ordenacaoRapida && ordenacaoRapida.value !== ordenacao.value) {
                ordenacaoRapida.value = ordenacao.value;
            }
        }

        function abrir(aberto) {
            formulario.classList.toggle("aberto", aberto);
            botao.classList.toggle("ativo", aberto);
            botao.setAttribute("aria-expanded", String(aberto));
        }

        botao.addEventListener("click", () => {
            abrir(!formulario.classList.contains("aberto"));
        });

        verAnuncios?.addEventListener("click", () => {
            abrir(false);
            lista?.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        formulario.addEventListener("change", atualizar);
        formulario.addEventListener("input", atualizar);
        limpar?.addEventListener("click", () => setTimeout(atualizar, 0));

        // A pesquisa pode restaurar filtros do endereço (?categoria=...).
        atualizar();
        setTimeout(atualizar, 600);
        setTimeout(atualizar, 2000);
    }

    function iniciar() {
        document.querySelectorAll(".filtros-barra[data-formulario]").forEach(configurarBarra);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }
})();
