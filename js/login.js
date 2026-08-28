// ==========================================
// LOGIN.JS
// Comércio da Cidade
// ==========================================

const form = document.getElementById("loginForm");
const email = document.getElementById("email");
const senha = document.getElementById("senha");
const btnMostrarSenha = document.getElementById("toggleSenha");
const btnLogin = document.querySelector(".btn-login");
const CHAVE_RETORNO_FAVORITOS = "destino_apos_login_favoritos";

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

function obterRetornoFavoritosSeguro() {
    let destino = "";

    try {
        destino = sessionStorage.getItem(CHAVE_RETORNO_FAVORITOS) || "";
        sessionStorage.removeItem(CHAVE_RETORNO_FAVORITOS);
    } catch (erro) {
        console.warn("Não foi possível recuperar o destino após o login:", erro);
        return null;
    }

    const paginasPermitidas = new Set([
        "index.html",
        "categoria.html",
        "loja.html",
        "favoritos.html"
    ]);

    try {
        const url = new URL(destino, window.location.origin);
        const arquivo = url.pathname.split("/").pop() || "index.html";

        if (url.origin !== window.location.origin || !paginasPermitidas.has(arquivo)) {
            return null;
        }

        return `${arquivo}${url.search}${url.hash}`;
    } catch (erro) {
        return null;
    }
}

async function obterDestinoAposLogin() {
    // Mantém a proteção do RF04 para conta desativada/excluída.
    if (typeof window.verificarContaAtivaRF04 === "function") {
        const ativa = await window.verificarContaAtivaRF04({ redirecionar: true });
        if (ativa === false) return null;
    }

    // Administradores são verificados por uma RPC protegida no banco.
    // Uma segunda tentativa curta evita falha transitória logo após SIGNED_IN.
    for (let tentativa = 0; tentativa < 2; tentativa += 1) {
        try {
            const { data: admin, error } = await window.db.rpc("sou_admin");

            if (!error) {
                if (admin === true) {
                    return "admin-dashboard.html";
                }

                break;
            }

            console.warn("Não foi possível verificar perfil administrativo:", error);
        } catch (erro) {
            console.warn("Falha ao verificar destino do login:", erro);
        }

        if (tentativa === 0) {
            await aguardarLogin(150);
        }
    }

    try {
        const { data: usuarioData, error: usuarioError } =
            await window.db.auth.getUser();

        if (usuarioError) throw usuarioError;

        const usuario = usuarioData?.user;

        if (!usuario) {
            return "perfil.html";
        }

        const { data: perfil, error: perfilError } = await window.db
            .from("profiles")
            .select("tipo_usuario")
            .eq("id", usuario.id)
            .maybeSingle();

        if (perfilError) {
            console.warn("Não foi possível consultar o tipo de perfil:", perfilError);
        }

        if (perfil?.tipo_usuario === "admin") {
            return "admin-dashboard.html";
        }

        if (perfil?.tipo_usuario === "lojista") {
            return "painel-loja.html";
        }

        // Compatibilidade com contas antigas que possuem loja, mas ainda
        // não tiveram tipo_usuario atualizado para lojista.
        const { data: loja, error: lojaError } = await window.db
            .from("lojas")
            .select("id")
            .eq("proprietario_id", usuario.id)
            .limit(1)
            .maybeSingle();

        if (lojaError) {
            console.warn("Não foi possível verificar a loja do usuário:", lojaError);
        }

        if (loja?.id) {
            return "painel-loja.html";
        }
    } catch (erro) {
        console.warn("Falha ao determinar o destino pelo perfil:", erro);
    }

    // Cliente ou falha temporária de consulta segue para o perfil comum.
    return "perfil.html";
}

window.obterDestinoAposLogin = obterDestinoAposLogin;

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

            const destinoPerfil = await obterDestinoAposLogin();

            // Se o guard do RF04 bloqueou a conta, ele cuida do logout/redirecionamento.
            if (!destinoPerfil) return;

            const destinoSolicitado = obterRetornoFavoritosSeguro();
            const destino = destinoSolicitado || destinoPerfil;

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
