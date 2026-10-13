// ==========================================
// FILTROS-COMPACTOS.JS
// No celular, os filtros dos anúncios ficam recolhidos atrás do botão
// "Filtros" (com a quantidade de filtros ativos). A ordenação fica
// sempre à mão, ao lado do botão. No computador nada muda: o painel
// continua aberto e esta barra fica escondida pelo CSS.
// ==========================================

(() => {
    "use strict";

    const $ = id => document.getElementById(id);

    function iniciar() {
        const formulario = $("filtros-produtos-globais");
        const botao = $("btn-abrir-filtros");
        const contador = $("contador-filtros");
        const ordenacao = $("ordenacao-produtos-globais");
        const ordenacaoRapida = $("ordenacao-rapida");
        const verAnuncios = $("btn-ver-anuncios");
        const limpar = $("limpar-filtros-produtos");
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
            const campos = formulario.querySelectorAll("select, input");
            let ativos = 0;
            campos.forEach(campo => {
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
            $("lista-produtos-globais")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });

        formulario.addEventListener("change", atualizar);
        formulario.addEventListener("input", atualizar);
        limpar?.addEventListener("click", () => setTimeout(atualizar, 0));

        // A pesquisa pode restaurar filtros do endereço (?categoria=...).
        atualizar();
        setTimeout(atualizar, 600);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }
})();
