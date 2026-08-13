// ==========================================
// LOGIN.JS
// Comércio da Cidade
// ==========================================


// ==========================================
// ELEMENTOS
// ==========================================

const form =
    document.getElementById(
        "loginForm"
    );

const email =
    document.getElementById(
        "email"
    );

const senha =
    document.getElementById(
        "senha"
    );

const btnMostrarSenha =
    document.getElementById(
        "toggleSenha"
    );

const btnLogin =
    document.querySelector(
        ".btn-login"
    );


// ==========================================
// VERIFICAR SUPABASE
// ==========================================

if (!window.db) {

    console.error(
        "Erro: Supabase não foi inicializado."
    );


    if (
        typeof window.mostrarAlerta ===
        "function"
    ) {

        mostrarAlerta(
            "Não foi possível conectar ao sistema. Atualize a página e tente novamente.",
            "erro",
            "Erro de conexão",
            6000
        );

    }


    if (btnLogin) {

        btnLogin.disabled =
            true;

    }

}


// ==========================================
// MOSTRAR / ESCONDER SENHA
// ==========================================

if (
    btnMostrarSenha &&
    senha
) {

    btnMostrarSenha.addEventListener(
        "click",
        () => {

            const icone =
                btnMostrarSenha.querySelector(
                    "i"
                );


            const mostrar =
                senha.type ===
                "password";


            senha.type =
                mostrar
                    ? "text"
                    : "password";


            if (icone) {

                if (mostrar) {

                    icone.classList.replace(
                        "fa-eye",
                        "fa-eye-slash"
                    );


                    btnMostrarSenha.setAttribute(
                        "aria-label",
                        "Ocultar senha"
                    );

                } else {

                    icone.classList.replace(
                        "fa-eye-slash",
                        "fa-eye"
                    );


                    btnMostrarSenha.setAttribute(
                        "aria-label",
                        "Mostrar senha"
                    );

                }

            }

        }
    );

}


// ==========================================
// LOGIN
// ==========================================

if (
    form &&
    email &&
    senha &&
    btnLogin &&
    window.db
) {

    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            // ==================================
            // DADOS
            // ==================================

            const emailDigitado =
                email.value
                    .trim();


            const senhaDigitada =
                senha.value;


            // ==================================
            // VALIDAR E-MAIL
            // ==================================

            if (!emailDigitado) {

                mostrarAlerta(
                    "Digite seu e-mail para continuar.",
                    "aviso",
                    "E-mail obrigatório"
                );


                email.focus();


                return;

            }


            // ==================================
            // VALIDAR SENHA
            // ==================================

            if (!senhaDigitada) {

                mostrarAlerta(
                    "Digite sua senha para continuar.",
                    "aviso",
                    "Senha obrigatória"
                );


                senha.focus();


                return;

            }


            // ==================================
            // BOTÃO CARREGANDO
            // ==================================

            const conteudoOriginal =
                btnLogin.innerHTML;


            btnLogin.disabled =
                true;


            btnLogin.innerHTML = `

                <i class="fa-solid fa-spinner fa-spin"></i>

                Entrando...

            `;


            try {

                // ==================================
                // LOGIN SUPABASE
                // ==================================

                const {
                    data,
                    error
                } =
                    await window.db
                        .auth
                        .signInWithPassword({

                            email:
                                emailDigitado,

                            password:
                                senhaDigitada

                        });


                if (error) {

                    throw error;

                }


                if (
                    !data ||
                    !data.user
                ) {

                    throw new Error(
                        "Não foi possível identificar o usuário."
                    );

                }


                console.log(
                    "Login realizado:",
                    data.user.id
                );


                // ==================================
                // SUCESSO
                // ==================================

                mostrarAlerta(
                    "Login realizado com sucesso.",
                    "sucesso",
                    "Bem-vindo!",
                    1200
                );


                // Pequeno atraso para o usuário
                // visualizar a mensagem

                setTimeout(
                    () => {

                        window.location.href =
                            "perfil.html";

                    },
                    650
                );


            } catch (erro) {

                console.error(
                    "Erro no login:",
                    erro
                );


                // ==================================
                // TRATAR ERRO
                // ==================================

                const mensagem =
                    obterMensagemErroLogin(
                        erro
                    );


                mostrarAlerta(
                    mensagem,
                    "erro",
                    "Não foi possível entrar",
                    5000
                );


                // ==================================
                // LIMPAR SENHA
                // ==================================

                senha.value =
                    "";


                senha.focus();


                // ==================================
                // RESTAURAR BOTÃO
                // ==================================

                btnLogin.disabled =
                    false;


                btnLogin.innerHTML =
                    conteudoOriginal;

            }

        }
    );

}


// ==========================================
// MENSAGEM DE ERRO
// ==========================================

function obterMensagemErroLogin(
    erro
) {

    const mensagem =
        String(
            erro?.message ||
            ""
        )
            .toLowerCase();


    // ==================================
    // LOGIN INVÁLIDO
    // ==================================

    if (
        mensagem.includes(
            "invalid login credentials"
        )
    ) {

        return (
            "E-mail ou senha incorretos. Confira seus dados e tente novamente."
        );

    }


    // ==================================
    // E-MAIL NÃO CONFIRMADO
    // ==========================================

    if (
        mensagem.includes(
            "email not confirmed"
        )
    ) {

        return (
            "Confirme seu e-mail antes de entrar na sua conta."
        );

    }


    // ==================================
    // MUITAS TENTATIVAS
    // ==========================================

    if (
        mensagem.includes(
            "rate limit"
        )
        ||
        mensagem.includes(
            "too many requests"
        )
    ) {

        return (
            "Foram feitas muitas tentativas. Aguarde um momento e tente novamente."
        );

    }


    // ==================================
    // REDE
    // ==========================================

    if (
        mensagem.includes(
            "failed to fetch"
        )
        ||
        mensagem.includes(
            "network"
        )
    ) {

        return (
            "Não foi possível conectar ao servidor. Verifique sua internet."
        );

    }


    // ==================================
    // PADRÃO
    // ==========================================

    return (
        "Ocorreu um erro ao fazer login. Tente novamente."
    );

}