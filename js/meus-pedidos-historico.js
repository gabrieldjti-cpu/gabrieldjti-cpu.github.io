// ==========================================
// MEUS-PEDIDOS-HISTORICO.JS
// Comércio da Cidade
// Atalho para RF-12
// ==========================================

(() => {

    function adicionarAtalhoHistorico() {

        const topo =
            document.querySelector(
                ".topo-pagina"
            );


        if (!topo) {
            return;
        }


        if (
            topo.querySelector(
                'a[href="historico-compras.html"]'
            )
        ) {
            return;
        }


        const link =
            document.createElement(
                "a"
            );


        link.href =
            "historico-compras.html";


        link.className =
            "btn-comprar";


        link.innerHTML = `
            <i class="fa-solid fa-clock-rotate-left"></i>
            Histórico de Compras
        `;


        link.setAttribute(
            "aria-label",
            "Abrir histórico de compras"
        );


        topo.appendChild(
            link
        );
    }


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            adicionarAtalhoHistorico,
            {
                once: true
            }
        );


    } else {

        adicionarAtalhoHistorico();
    }

})();
