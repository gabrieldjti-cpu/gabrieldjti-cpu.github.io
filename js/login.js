// ==========================================
// LOGIN.JS
// Comércio da Cidade
// ==========================================

const form = document.getElementById("loginForm");
const email = document.getElementById("email");
const senha = document.getElementById("senha");
const btnMostrarSenha = document.getElementById("toggleSenha");
const btnLogin = document.querySelector(".btn-login");

if (!window.db) {
    console.error("Erro: Supabase não foi inicializado.");

    if (typeof window.mostrarAlerta === "function") {
        mostrarAlerta(
            "Não foi possível conectar ao sistema. Atualize a página e tente novamente.",
            "erro",
            "Erro de conexão",
            6000
        );
    }

    if (btnLogin) btnLogin.disabled = true;
}

// ==========================================
// MOSTRAR / ESCONDER SENHA
// ==========================================

if (btnMostrarSenha && senha) {
    btnMostrarSenha.addEventListener("click", () => {
        const icone = btnMostrarSenha.querySelector("i");
        const mostrar = senha.type === "password";

        senha.type = mostrar ? "text" : "password";

        if (icone) {
            if (mostrar) {
                icone.classList.replace("fa-eye", "fa-eye-slash");
                btnMostrarSenha.setAttribute("aria-label", "Ocultar senha");
            } else {
                icone.classList.replace("fa-eye-slash", "fa-eye");
                btnMostrarSenha.setAttribute("aria-label", "Mostrar senha");
            }
        }
    });
}

// ==========================================
// DESTINO APÓS O LOGIN
// ==========================================

function aguardarLogin(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function obterDestinoAposLogin() {
    // Mantém a proteção do RF04 para conta desativada/excluída.
    if (typeof window.verificarContaAtivaRF04 === "function") {
        const ativa = await window.verificarContaAtivaRF04({ redirecionar: true });
        if (ativa === false) return null;
    }

    const { data: sessaoData, error: sessaoError } =
        await window.db.auth.getSession();

    if (sessaoError || !sessaoData?.session?.user) {
        console.warn(
            "Não foi possível identificar a sessão para decidir o destino:",
            sessaoError
        );
        return "perfil.html";
    }

    const usuario = sessaoData.session.user;

    // O destino é decidido aqui, antes de qualquer redirecionamento.
    // Uma segunda tentativa curta evita falha transitória logo após SIGNED_IN.
    for (let tentativa = 0; tentativa < 2; tentativa += 1) {
        let erroAdmin = null;

        try {
            const { data: admin, error } = await window.db.rpc("sou_admin");
            erroAdmin = error || null;

            if (!error && admin === true) {
                localStorage.removeItem("loja_id");
                localStorage.removeItem("nome_loja");
                return "admin-dashboard.html";
            }

            if (error) {
                console.warn("Não foi possível verificar perfil administrativo:", error);
            }
        } catch (erro) {
            erroAdmin = erro;
            console.warn("Falha ao verificar perfil administrativo:", erro);
        }

        try {
            const { data: loja, error: lojaError } =
                await window.db
                    .from("lojas")
                    .select("id,nome")
                    .eq("proprietario_id", usuario.id)
                    .limit(1)
                    .maybeSingle();

            if (lojaError) {
                console.warn("Não foi possível verificar loja do usuário:", lojaError);
            } else if (loja) {
                localStorage.setItem("loja_id", loja.id);

                if (loja.nome) {
                    localStorage.setItem("nome_loja", loja.nome);
                } else {
                    localStorage.removeItem("nome_loja");
                }

                return "painel-loja.html";
            } else if (!erroAdmin) {
                localStorage.removeItem("loja_id");
                localStorage.removeItem("nome_loja");
                return "perfil.html";
            }
        } catch (erro) {
            console.warn("Falha ao verificar perfil de lojista:", erro);
        }

        if (tentativa === 0) {
            await aguardarLogin(150);
        }
    }

    // Em caso de indisponibilidade temporária das verificações,
    // mantém o fluxo comum em uma área segura da própria conta.
    return "perfil.html";
}

// ==========================================
// LOGIN
// ==========================================

if (form && email && senha && btnLogin && window.db) {
    form.addEventListener("submit", async event => {
        event.preventDefault();

        const emailDigitado = email.value.trim();
        const senhaDigitada = senha.value;

        if (!emailDigitado) {
            mostrarAlerta(
                "Digite seu e-mail para continuar.",
                "aviso",
                "E-mail obrigatório"
            );
            email.focus();
            return;
        }

        if (!senhaDigitada) {
            mostrarAlerta(
                "Digite sua senha para continuar.",
                "aviso",
                "Senha obrigatória"
            );
            senha.focus();
            return;
        }

        const conteudoOriginal = btnLogin.innerHTML;
        btnLogin.disabled = true;
        btnLogin.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Entrando...
        `;

        try {
            const { data, error } = await window.db.auth.signInWithPassword({
                email: emailDigitado,
                password: senhaDigitada
            });

            if (error) throw error;

            if (!data?.user) {
                throw new Error("Não foi possível identificar o usuário.");
            }

            console.log("Login realizado:", data.user.id);

            const destino = await obterDestinoAposLogin();

            // Se o guard do RF04 bloqueou a conta, ele cuida do logout/redirecionamento.
            if (!destino) return;

            mostrarAlerta(
                "Login realizado com sucesso.",
                "sucesso",
                "Bem-vindo!",
                1200
            );

            setTimeout(() => {
                window.location.replace(destino);
            }, 650);
        } catch (erro) {
            console.error("Erro no login:", erro);

            const mensagem = obterMensagemErroLogin(erro);

            mostrarAlerta(
                mensagem,
                "erro",
                "Não foi possível entrar",
                5000
            );

            senha.value = "";
            senha.focus();
            btnLogin.disabled = false;
            btnLogin.innerHTML = conteudoOriginal;
        }
    });
}

// ==========================================
// MENSAGEM DE ERRO
// ==========================================

function obterMensagemErroLogin(erro) {
    const mensagem = String(erro?.message || "").toLowerCase();

    if (mensagem.includes("invalid login credentials")) {
        return "E-mail ou senha incorretos. Confira seus dados e tente novamente.";
    }

    if (mensagem.includes("email not confirmed")) {
        return "Confirme seu e-mail antes de entrar na sua conta.";
    }

    if (
        mensagem.includes("rate limit") ||
        mensagem.includes("too many requests")
    ) {
        return "Foram feitas muitas tentativas. Aguarde um momento e tente novamente.";
    }

    if (
        mensagem.includes("failed to fetch") ||
        mensagem.includes("network")
    ) {
        return "Não foi possível conectar ao servidor. Verifique sua internet.";
    }

    return "Ocorreu um erro ao fazer login. Tente novamente.";
}
