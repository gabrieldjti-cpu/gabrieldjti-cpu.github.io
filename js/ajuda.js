// ==========================================
// AJUDA.JS
// Pesquisa local das perguntas frequentes
// ==========================================

(() => {
    "use strict";

    const normalizar = valor => String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    function iniciar() {
        const busca = document.getElementById("buscaAjuda");
        const limpar = document.getElementById("limparBuscaAjuda");
        const status = document.getElementById("statusBuscaAjuda");
        const vazio = document.getElementById("ajudaSemResultados");
        const perguntas = [...document.querySelectorAll("[data-faq]")];
        const grupos = [...document.querySelectorAll("[data-faq-grupo]")];

        if (!busca || !perguntas.length) return;

        function filtrar() {
            const termo = normalizar(busca.value);
            let visiveis = 0;

            perguntas.forEach(pergunta => {
                const corresponde = !termo || normalizar(pergunta.textContent).includes(termo);
                pergunta.hidden = !corresponde;
                if (corresponde) visiveis += 1;
            });

            grupos.forEach(grupo => {
                grupo.hidden = !grupo.querySelector("[data-faq]:not([hidden])");
            });

            if (limpar) limpar.hidden = !termo;
            if (vazio) vazio.hidden = visiveis > 0;

            if (status) {
                status.textContent = termo
                    ? `${visiveis} ${visiveis === 1 ? "resposta encontrada" : "respostas encontradas"}.`
                    : `${perguntas.length} perguntas frequentes disponíveis.`;
            }
        }

        busca.addEventListener("input", filtrar);

        limpar?.addEventListener("click", () => {
            busca.value = "";
            filtrar();
            busca.focus();
        });

        filtrar();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }
})();
