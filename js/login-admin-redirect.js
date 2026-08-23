// ==========================================
// LOGIN-ADMIN-REDIRECT.JS
// Roteamento pós-login por perfil
// ==========================================

function aguardarDestinoLogin(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function obterDestinoAposLoginMvp() {
    if (!window.db) {
        return "perfil.html";
    }

    if (typeof window.verificarContaAtivaRF04 === "function") {
        const ativa = await window.verificarContaAtivaRF04({
            redirecionar: true
        });

        if (ativa === false) {
            return null;
        }
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

    for (let tentativa = 0; tentativa < 2; tentativa += 1) {
        let erroAdmin = null;

        try {
            const { data: admin, error } =
                await window.db.rpc("sou_admin");

            erroAdmin = error || null;

            if (!error && admin === true) {
                localStorage.removeItem("loja_id");
                localStorage.removeItem("nome_loja");
                return "admin-dashboard.html";
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
                console.warn(
                    "Não foi possível verificar loja do usuário:",
                    lojaError
                );
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
            await aguardarDestinoLogin(150);
        }
    }

    // Em caso de indisponibilidade temporária das verificações,
    // mantém o usuário em uma área segura da própria conta.
    return "perfil.html";
}

async function verificarRedirecionamentoAdmin() {
    if (!window.db) return;

    try {
        const { data: sessaoData, error: sessaoError } =
            await window.db.auth.getSession();

        if (sessaoError || !sessaoData?.session) return;

        if (typeof window.verificarContaAtivaRF04 === "function") {
            const ativa = await window.verificarContaAtivaRF04({
                redirecionar: true
            });

            if (ativa === false) return;
        }

        const { data: admin, error } = await window.db.rpc("sou_admin");

        if (error) {
            console.warn(
                "Não foi possível verificar redirecionamento administrativo:",
                error
            );
            return;
        }

        if (admin === true) {
            window.location.replace("admin-dashboard.html");
        }
    } catch (erro) {
        console.warn("Falha ao verificar destino administrativo:", erro);
    }
}

function iniciarRedirecionamentoAdminLogin() {
    if (!window.db) return;

    // login.js é carregado primeiro. Esta atribuição substitui apenas
    // a decisão de destino, preservando todo o fluxo de autenticação,
    // mensagens e tratamento de erros já existente.
    window.obterDestinoAposLogin = obterDestinoAposLoginMvp;

    // Mantém o comportamento anterior: se um administrador já chegar
    // autenticado à página de login, ele volta ao dashboard ADM.
    verificarRedirecionamentoAdmin();
}

window.obterDestinoAposLoginMvp = obterDestinoAposLoginMvp;
window.iniciarRedirecionamentoAdminLogin = iniciarRedirecionamentoAdminLogin;
