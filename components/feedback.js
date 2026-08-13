// ==========================================
// FEEDBACK.JS
// Comércio da Cidade
// ==========================================

(function () {

    // ======================================
    // CRIAR CONTAINER
    // ======================================

    function obterContainer() {

        let container =
            document.querySelector(
                ".feedback-container"
            );


        if (!container) {

            container =
                document.createElement(
                    "div"
                );


            container.className =
                "feedback-container";


            document.body.appendChild(
                container
            );

        }


        return container;

    }


    // ======================================
    // ÍCONES
    // ======================================

    function obterIcone(tipo) {

        const icones = {

            sucesso:
                "fa-solid fa-circle-check",

            erro:
                "fa-solid fa-circle-xmark",

            aviso:
                "fa-solid fa-triangle-exclamation",

            info:
                "fa-solid fa-circle-info"

        };


        return (
            icones[tipo] ||
            icones.info
        );

    }


    // ======================================
    // TÍTULOS
    // ======================================

    function obterTitulo(
        tipo
    ) {

        const titulos = {

            sucesso:
                "Tudo certo!",

            erro:
                "Ops!",

            aviso:
                "Atenção!",

            info:
                "Informação"

        };


        return (
            titulos[tipo] ||
            titulos.info
        );

    }


    // ======================================
    // MOSTRAR ALERTA
    // ======================================

    function mostrarAlerta(
        mensagem,
        tipo = "info",
        titulo = null,
        duracao = 4000
    ) {

        const container =
            obterContainer();


        const toast =
            document.createElement(
                "div"
            );


        toast.className =
            `feedback-toast ${tipo}`;


        toast.innerHTML = `

            <div class="feedback-icone">

                <i class="${obterIcone(tipo)}"></i>

            </div>


            <div class="feedback-conteudo">

                <strong>
                    ${escaparHTML(
                        titulo ||
                        obterTitulo(tipo)
                    )}
                </strong>

                <p>
                    ${escaparHTML(
                        mensagem
                    )}
                </p>

            </div>


            <button
                type="button"
                class="feedback-fechar"
                aria-label="Fechar"
            >

                <i class="fa-solid fa-xmark"></i>

            </button>

        `;


        container.appendChild(
            toast
        );


        // ==================================
        // REMOVER
        // ==================================

        function remover() {

            if (
                toast.classList.contains(
                    "saindo"
                )
            ) {

                return;

            }


            toast.classList.add(
                "saindo"
            );


            setTimeout(
                () => toast.remove(),
                250
            );

        }


        toast
            .querySelector(
                ".feedback-fechar"
            )
            ?.addEventListener(
                "click",
                remover
            );


        if (
            duracao > 0
        ) {

            setTimeout(
                remover,
                duracao
            );

        }

    }


    // ======================================
    // CONFIRMAR AÇÃO
    // ======================================

    function confirmarAcao({
        titulo = "Confirmar ação",
        mensagem = "Deseja continuar?",
        textoConfirmar = "Confirmar",
        textoCancelar = "Cancelar",
        perigo = true
    } = {}) {

        return new Promise(
            (resolve) => {

                const modal =
                    document.createElement(
                        "div"
                    );


                modal.className =
                    "feedback-modal aberto";


                modal.innerHTML = `

                    <div class="feedback-modal-box">


                        <div class="feedback-modal-icone">

                            <i class="${
                                perigo
                                    ? "fa-solid fa-triangle-exclamation"
                                    : "fa-solid fa-circle-question"
                            }"></i>

                        </div>


                        <h3>
                            ${escaparHTML(
                                titulo
                            )}
                        </h3>


                        <p>
                            ${escaparHTML(
                                mensagem
                            )}
                        </p>


                        <div class="feedback-modal-botoes">

                            <button
                                type="button"
                                class="feedback-btn-cancelar"
                            >

                                ${escaparHTML(
                                    textoCancelar
                                )}

                            </button>


                            <button
                                type="button"
                                class="feedback-btn-confirmar"
                            >

                                ${escaparHTML(
                                    textoConfirmar
                                )}

                            </button>

                        </div>


                    </div>

                `;


                document.body.appendChild(
                    modal
                );


                document.body.style.overflow =
                    "hidden";


                const cancelar =
                    modal.querySelector(
                        ".feedback-btn-cancelar"
                    );


                const confirmar =
                    modal.querySelector(
                        ".feedback-btn-confirmar"
                    );


                function fechar(
                    resultado
                ) {

                    modal.remove();


                    document.body.style.overflow =
                        "";


                    resolve(
                        resultado
                    );

                }


                cancelar.addEventListener(
                    "click",
                    () => fechar(false)
                );


                confirmar.addEventListener(
                    "click",
                    () => fechar(true)
                );


                modal.addEventListener(
                    "click",
                    (event) => {

                        if (
                            event.target ===
                            modal
                        ) {

                            fechar(false);

                        }

                    }
                );

            }
        );

    }


    // ======================================
    // ESCAPAR HTML
    // ======================================

    function escaparHTML(
        valor
    ) {

        return String(
            valor ?? ""
        )

            .replaceAll(
                "&",
                "&amp;"
            )

            .replaceAll(
                "<",
                "&lt;"
            )

            .replaceAll(
                ">",
                "&gt;"
            )

            .replaceAll(
                '"',
                "&quot;"
            )

            .replaceAll(
                "'",
                "&#039;"
            );

    }


    // ======================================
    // GLOBAL
    // ======================================

    window.mostrarAlerta =
        mostrarAlerta;


    window.confirmarAcao =
        confirmarAcao;

})();