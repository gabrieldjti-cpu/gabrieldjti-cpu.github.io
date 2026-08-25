// ==========================================
// CADASTRO.JS
// Comércio da Cidade
// ==========================================


// ==========================================
// ELEMENTOS
// ==========================================

const form =
    document.getElementById(
        "cadastroForm"
    );

const nome =
    document.getElementById(
        "nome"
    );

const email =
    document.getElementById(
        "email"
    );

const telefone =
    document.getElementById(
        "telefone"
    );

const senha =
    document.getElementById(
        "senha"
    );

const confirmarSenha =
    document.getElementById(
        "confirmarSenha"
    );

const mensagem =
    document.getElementById(
        "mensagem"
    );

const botaoCadastro =
    document.querySelector(
        ".btn-cadastro"
    );


// ==========================================
// VERIFICAR SUPABASE
// ==========================================

if (!window.db) {

    console.error(
        "Supabase não foi inicializado."
    );


    notificar(
        "Não foi possível conectar ao sistema. Atualize a página e tente novamente.",
        "erro",
        "Erro de conexão",
        6000
    );


    if (botaoCadastro) {

        botaoCadastro.disabled =
            true;

    }

}


// ==========================================
// MOSTRAR / ESCONDER SENHA
// ==========================================

function configurarMostrarSenha(
    botaoId,
    inputId
) {

    const botao =
        document.getElementById(
            botaoId
        );


    const input =
        document.getElementById(
            inputId
        );


    if (
        !botao ||
        !input
    ) {

        return;

    }


    botao.addEventListener(
        "click",
        () => {

            const icone =
                botao.querySelector(
                    "i"
                );


            const vaiMostrar =
                input.type ===
                "password";


            input.type =
                vaiMostrar
                    ? "text"
                    : "password";


            if (icone) {

                if (vaiMostrar) {

                    icone.classList.replace(
                        "fa-eye",
                        "fa-eye-slash"
                    );


                    botao.setAttribute(
                        "aria-label",
                        "Ocultar senha"
                    );

                } else {

                    icone.classList.replace(
                        "fa-eye-slash",
                        "fa-eye"
                    );


                    botao.setAttribute(
                        "aria-label",
                        "Mostrar senha"
                    );

                }

            }

        }
    );

}


// ==========================================
// CONFIGURAR SENHAS
// ==========================================

configurarMostrarSenha(
    "toggleSenha",
    "senha"
);

configurarMostrarSenha(
    "toggleConfirmarSenha",
    "confirmarSenha"
);


// ==========================================
// CADASTRO
// ==========================================

if (
    form &&
    window.db
) {

    form.addEventListener(
        "submit",
        async (
            event
        ) => {

            event.preventDefault();


            limparMensagemInterna();


            // ==================================
            // DADOS
            // ==================================

            const nomeDigitado =
                nome?.value
                    .trim()
                ||
                "";


            const emailDigitado =
                email?.value
                    .trim()
                    .toLowerCase()
                ||
                "";


            const telefoneDigitado =
                telefone?.value
                    .trim()
                ||
                "";


            const senhaDigitada =
                senha?.value
                ||
                "";


            const confirmarSenhaDigitada =
                confirmarSenha?.value
                ||
                "";


            // ==================================
            // VALIDAR NOME
            // ==================================

            if (!nomeDigitado) {

                notificar(
                    "Digite seu nome para continuar.",
                    "aviso",
                    "Nome obrigatório"
                );


                nome?.focus();


                return;

            }


            if (
                nomeDigitado.length < 3
            ) {

                notificar(
                    "Seu nome deve possuir pelo menos 3 caracteres.",
                    "aviso",
                    "Nome muito curto"
                );


                nome?.focus();


                return;

            }


            // ==================================
            // VALIDAR E-MAIL
            // ==================================

            if (!emailDigitado) {

                notificar(
                    "Digite seu e-mail para continuar.",
                    "aviso",
                    "E-mail obrigatório"
                );


                email?.focus();


                return;

            }


            if (
                !validarEmail(
                    emailDigitado
                )
            ) {

                notificar(
                    "Digite um endereço de e-mail válido.",
                    "aviso",
                    "E-mail inválido"
                );


                email?.focus();


                return;

            }


            // ==================================
            // VALIDAR TELEFONE
            // ==================================

            if (
                telefoneDigitado
            ) {

                const numerosTelefone =
                    telefoneDigitado.replace(
                        /\D/g,
                        ""
                    );


                if (
                    numerosTelefone.length < 10
                ) {

                    notificar(
                        "Digite um telefone válido com DDD.",
                        "aviso",
                        "Telefone inválido"
                    );


                    telefone?.focus();


                    return;

                }

            }


            // ==================================
            // VALIDAR SENHA
            // ==================================

            if (!senhaDigitada) {

                notificar(
                    "Crie uma senha para sua conta.",
                    "aviso",
                    "Senha obrigatória"
                );


                senha?.focus();


                return;

            }


            if (
                !senhaAtendeRequisitos(
                    senhaDigitada
                )
            ) {

                notificar(
                    "A senha deve ter no mínimo 8 caracteres e conter pelo menos uma letra e um número.",
                    "aviso",
                    "Senha inválida"
                );


                senha?.focus();


                return;

            }


            // ==================================
            // CONFIRMAR SENHA
            // ==================================

            if (
                senhaDigitada !==
                confirmarSenhaDigitada
            ) {

                notificar(
                    "As duas senhas digitadas precisam ser iguais.",
                    "aviso",
                    "As senhas não coincidem"
                );


                confirmarSenha.value =
                    "";


                confirmarSenha?.focus();


                return;

            }


            // ==================================
            // BOTÃO CARREGANDO
            // ==================================

            const conteudoOriginal =
                botaoCadastro?.innerHTML;


            if (botaoCadastro) {

                botaoCadastro.disabled =
                    true;


                botaoCadastro.innerHTML = `

                    <i class="fa-solid fa-spinner fa-spin"></i>

                    Criando conta...

                `;

            }


            atualizarMensagemInterna(
                "Criando sua conta..."
            );


            let cadastroConcluido =
                false;


            try {

                // ==================================
                // CRIAR CONTA
                // ==================================

                const {
                    data,
                    error
                } =
                    await window.db
                        .auth
                        .signUp({

                            email:
                                emailDigitado,

                            password:
                                senhaDigitada,

                            options: {

                                data: {

                                    nome:
                                        nomeDigitado,

                                    display_name:
                                        nomeDigitado,

                                    telefone:
                                        telefoneDigitado

                                }

                            }

                        });


                if (error) {

                    throw error;

                }


                if (!data?.user) {

                    throw new Error(
                        "Não foi possível criar o usuário."
                    );

                }


                console.log(
                    "Usuário criado:",
                    data.user.id
                );


                // ==================================
                // ATUALIZAR PROFILE
                // ==================================
                // Só fazemos isso se o Supabase
                // tiver criado uma sessão.
                //
                // Quando confirmação de e-mail
                // está ativa, normalmente data.session
                // será null.
                // ==================================

                if (
                    data.session
                ) {

                    const {
                        error: profileError
                    } =
                        await window.db

                            .from(
                                "profiles"
                            )

                            .update({

                                nome:
                                    nomeDigitado,

                                telefone:
                                    telefoneDigitado

                            })

                            .eq(
                                "id",
                                data.user.id
                            );


                    if (profileError) {

                        console.warn(
                            "Não foi possível atualizar o profile:",
                            profileError
                        );

                    }

                }


                cadastroConcluido =
                    true;


                limparMensagemInterna();


                // ==================================
                // LIMPAR FORMULÁRIO
                // ==================================

                form.reset();


                // ==================================
                // CONFIRMAÇÃO DE E-MAIL
                // ==================================

                if (
                    !data.session
                ) {

                    notificar(
                        "Sua conta foi criada. Confira seu e-mail e confirme o cadastro antes de entrar.",
                        "sucesso",
                        "Conta criada!",
                        5000
                    );


                } else {

                    notificar(
                        "Sua conta foi criada com sucesso.",
                        "sucesso",
                        "Cadastro concluído!",
                        3000
                    );

                }


                // ==================================
                // BOTÃO
                // ==================================

                if (botaoCadastro) {

                    botaoCadastro.innerHTML = `

                        <i class="fa-solid fa-circle-check"></i>

                        Conta criada

                    `;

                }


                // ==================================
                // REDIRECIONAR
                // ==================================

                setTimeout(
                    () => {

                        window.location.href =
                            "login.html";

                    },
                    data.session
                        ? 1400
                        : 2500
                );


            } catch (erro) {

                console.error(
                    "Erro ao criar conta:",
                    erro
                );


                limparMensagemInterna();


                const textoErro =
                    traduzirErroCadastro(
                        erro
                    );


                notificar(
                    textoErro,
                    "erro",
                    "Não foi possível criar a conta",
                    5500
                );


            } finally {

                // ==================================
                // RESTAURAR BOTÃO
                // ==================================

                if (
                    !cadastroConcluido &&
                    botaoCadastro
                ) {

                    botaoCadastro.disabled =
                        false;


                    botaoCadastro.innerHTML =
                        conteudoOriginal ||
                        "Criar Conta";

                }

            }

        }
    );

}


// ==========================================
// VALIDAR E-MAIL
// ==========================================

function validarEmail(
    valor
) {

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(
            valor
        );

}


// ==========================================
// TRADUZIR ERROS
// ==========================================

function traduzirErroCadastro(
    erro
) {

    const mensagemErro =
        String(
            erro?.message ||
            ""
        )
            .toLowerCase();


    // ==================================
    // E-MAIL JÁ CADASTRADO
    // ==================================

    if (
        mensagemErro.includes(
            "user already registered"
        )
        ||
        mensagemErro.includes(
            "already registered"
        )
    ) {

        return (
            "Este e-mail já está cadastrado. Tente entrar na sua conta."
        );

    }


    // ==================================
    // SENHA
    // ==================================

    if (
        mensagemErro.includes(
            "password should be at least"
        )
    ) {

        return (
            "A senha deve ter no mínimo 8 caracteres e conter pelo menos uma letra e um número."
        );

    }


    if (
        mensagemErro.includes(
            "weak password"
        )
    ) {

        return (
            "Escolha uma senha mais segura."
        );

    }


    // ==================================
    // E-MAIL INVÁLIDO
    // ==================================

    if (
        mensagemErro.includes(
            "invalid email"
        )
    ) {

        return (
            "Digite um endereço de e-mail válido."
        );

    }


    // ==================================
    // LIMITE DE E-MAIL
    // ==================================

    if (
        mensagemErro.includes(
            "email rate limit"
        )
        ||
        mensagemErro.includes(
            "rate limit"
        )
        ||
        mensagemErro.includes(
            "too many requests"
        )
    ) {

        return (
            "Foram feitas muitas tentativas. Aguarde alguns minutos e tente novamente."
        );

    }


    // ==================================
    // REDE
    // ==================================

    if (
        mensagemErro.includes(
            "failed to fetch"
        )
        ||
        mensagemErro.includes(
            "network"
        )
    ) {

        return (
            "Não foi possível conectar ao servidor. Verifique sua internet."
        );

    }


    // ==================================
    // PADRÃO
    // ==================================

    return (
        erro?.message ||
        "Ocorreu um erro ao criar sua conta."
    );

}


// ==================================
// REQUISITOS DA SENHA — RF-01
// ==================================

function senhaAtendeRequisitos(
    senhaInformada
) {

    const valor =
        String(
            senhaInformada ||
            ""
        );


    return (
        valor.length >= 8 &&
        /[A-Za-z]/.test(valor) &&
        /\d/.test(valor)
    );

}


// ==========================================
// MENSAGEM INTERNA
// ==========================================

function atualizarMensagemInterna(
    texto
) {

    if (!mensagem) {

        return;

    }


    mensagem.textContent =
        texto;


    mensagem.style.color =
        "#6b7280";

}


function limparMensagemInterna() {

    if (!mensagem) {

        return;

    }


    mensagem.textContent =
        "";

}


// ==========================================
// NOTIFICAÇÃO
// ==========================================

function notificar(
    texto,
    tipo = "info",
    titulo = null,
    duracao = 4000
) {

    if (
        typeof window.mostrarAlerta ===
        "function"
    ) {

        window.mostrarAlerta(
            texto,
            tipo,
            titulo,
            duracao
        );


        return;

    }


    console.warn(
        `[${tipo}] ${titulo || ""}`,
        texto
    );

}
