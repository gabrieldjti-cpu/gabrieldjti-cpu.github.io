// ==========================================
// CANCELAMENTO - PROTEÇÃO DOS OBSERVADORES
// Comércio da Cidade
// ==========================================
// Evita que os MutationObservers reajam às próprias alterações
// feitas pelos scripts auxiliares de cancelamento.

if (
    typeof decorarPedidosComCancelamento === "function" &&
    typeof observadorCancelamentoCliente !== "undefined"
) {

    const decorarPedidosComCancelamentoOriginal =
        decorarPedidosComCancelamento;


    decorarPedidosComCancelamento =
        function () {

            const lista =
                document.getElementById(
                    "lista-pedidos"
                );


            observadorCancelamentoCliente
                ?.disconnect();


            try {

                decorarPedidosComCancelamentoOriginal();


            } finally {

                if (
                    lista &&
                    observadorCancelamentoCliente
                ) {

                    observadorCancelamentoCliente.observe(
                        lista,
                        {
                            childList: true,
                            subtree: true
                        }
                    );
                }
            }
        };
}


if (
    typeof decorarPedidosComSolicitacoes === "function" &&
    typeof observadorSolicitacoesLoja !== "undefined"
) {

    const decorarPedidosComSolicitacoesOriginal =
        decorarPedidosComSolicitacoes;


    decorarPedidosComSolicitacoes =
        function () {

            const lista =
                document.getElementById(
                    "lista-pedidos-loja"
                );


            observadorSolicitacoesLoja
                ?.disconnect();


            try {

                decorarPedidosComSolicitacoesOriginal();


                // Com uma solicitação pendente, o lojista precisa
                // decidir sobre ela antes de enviar o pedido.
                document
                    .querySelectorAll(
                        "#lista-pedidos-loja .pedido-card"
                    )
                    .forEach(
                        card => {

                            const referencia =
                                card.querySelector(
                                    "[data-id]"
                                );


                            const pedidoId =
                                referencia?.dataset.id;


                            if (!pedidoId) {
                                return;
                            }


                            const solicitacao =
                                solicitacoesCancelamentoLoja
                                    ?.get(
                                        String(
                                            pedidoId
                                        )
                                    );


                            if (
                                solicitacao?.status !==
                                "pendente"
                            ) {

                                return;
                            }


                            const botaoAvancar =
                                card.querySelector(
                                    '[data-acao="avancar"]'
                                );


                            if (botaoAvancar) {

                                botaoAvancar.hidden =
                                    true;


                                botaoAvancar.disabled =
                                    true;
                            }
                        }
                    );


            } finally {

                if (
                    lista &&
                    observadorSolicitacoesLoja
                ) {

                    observadorSolicitacoesLoja.observe(
                        lista,
                        {
                            childList: true,
                            subtree: true
                        }
                    );
                }
            }
        };
}
