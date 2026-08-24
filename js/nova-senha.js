// ==========================================
// NOVA-SENHA.JS
// Comércio da Cidade
// ==========================================

const CHAVE_RECUPERACAO = "recuperacao_senha_ativa";
let sessaoDisponivel = false;

const { data: authListener } = window.db
    ? window.db.auth.onAuthStateChange((event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) {
            marcarRecuperacaoAtiva();
            definirSessaoDisponivel(true);
            limparParametrosAuthDaUrl();
            return;
        }

        if (
            event === "SIGNED_IN" &&
            session &&
            contextoRecuperacaoAtivo()
        ) {
            definirSessaoDisponivel(true);
            limparParametrosAuthDaUrl();
        }
    })
    : { data: null };

window.addEventListener("beforeunload", () => {
    authListener?.subscription?.unsubscribe();
});

document.addEventListener("DOMContentLoaded", iniciarNovaSenha);

async function iniciarNovaSenha() {
    configurarBotoesSenha();

    const form = document.getElementById("novaSenhaForm");
    form?.addEventListener("submit", salvarNovaSenha);

    if (!window.db) {
        notificar(
            "Não foi possível conectar ao sistema. Atualize a página e tente novamente.",
            "erro",
            "Erro de conexão",
            6000
        );
        return;
    }

    const erroRetorno = obterErroAuthDaUrl();

    if (erroRetorno) {
        limparRecuperacaoAtiva();
        definirSessaoDisponivel(false);

        notificar(
            erroRetorno,
            "erro",
            "Link de recuperação inválido",
            6500
        );

        limparParametrosAuthDaUrl();
        return;
    }

    if (temContextoRecuperacaoNaUrl()) {
        marcarRecuperacaoAtiva();
    }

    try {
        await trocarCodigoPorSessaoSeNecessario();

        const { data, error } = await window.db.auth.getSession();

        if (error) {
            throw error;
        }

        const podeRedefinir = Boolean(
            data.session && contextoRecuperacaoAtivo()
        );

        definirSessaoDisponivel(podeRedefinir);

        if (podeRedefinir) {
            limparParametrosAuthDaUrl();
            return;
        }

        notificar(
            "Abra esta página pelo link de recuperação enviado ao seu e-mail. Se o link expirou, solicite um novo.",
            "aviso",
            "Link de recuperação necessário",
            6500
        );

    } catch (erro) {
        console.error("Erro ao validar recuperação de senha:", erro);

        limparRecuperacaoAtiva();
        definirSessaoDisponivel(false);

        notificar(
            tratarErroLinkRecuperacao(erro),
            "erro",
            "Link inválido",
            6000
        );
    }
}

function marcarRecuperacaoAtiva() {
    sessionStorage.setItem(CHAVE_RECUPERACAO, "1");
}

function limparRecuperacaoAtiva() {
    sessionStorage.removeItem(CHAVE_RECUPERACAO);
}

function contextoRecuperacaoAtivo() {
    return (
        sessionStorage.getItem(CHAVE_RECUPERACAO) === "1" ||
        temContextoRecuperacaoNaUrl()
    );
}

function temContextoRecuperacaoNaUrl() {
    const busca = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(
        window.location.hash.replace(/^#/, "")
    );

    return (
        busca.get("type") === "recovery" ||
        hash.get("type") === "recovery" ||
        Boolean(busca.get("code"))
    );
}

function obterErroAuthDaUrl() {
    const busca = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(
        window.location.hash.replace(/^#/, "")
    );

    const codigo =
        busca.get("error_code") ||
        hash.get("error_code") ||
        busca.get("error") ||
        hash.get("error");

    if (!codigo) {
        return "";
    }

    const descricao = decodeURIComponent(
        busca.get("error_description") ||
        hash.get("error_description") ||
        ""
    ).replace(/\+/g, " ");

    const texto = `${codigo} ${descricao}`.toLowerCase();

    if (
        texto.includes("expired") ||
        texto.includes("otp_expired")
    ) {
        return "Este link de recuperação expirou. Solicite um novo link para redefinir sua senha.";
    }

    if (
        texto.includes("access_denied") ||
        texto.includes("invalid")
    ) {
        return "Este link de recuperação não é mais válido. Solicite um novo link.";
    }

    return descricao || "Não foi possível validar o link de recuperação.";
}

async function trocarCodigoPorSessaoSeNecessario() {
    const parametros = new URLSearchParams(window.location.search);
    const codigo = parametros.get("code");

    if (!codigo || !window.db?.auth?.exchangeCodeForSession) {
        return;
    }

    const { data: sessaoAtual } = await window.db.auth.getSession();

    if (sessaoAtual?.session) {
        return;
    }

    marcarRecuperacaoAtiva();

    const { error } = await window.db.auth.exchangeCodeForSession(codigo);

    if (error) {
        throw error;
    }
}

function limparParametrosAuthDaUrl() {
    if (!window.history?.replaceState) {
        return;
    }

    const url = new URL(window.location.href);

    const parametrosAuth = [
        "code",
        "type",
        "error",
        "error_code",
        "error_description"
    ];

    parametrosAuth.forEach(parametro => {
        url.searchParams.delete(parametro);
    });

    // Tokens e parâmetros do fluxo implícito ficam no fragmento.
    url.hash = "";

    window.history.replaceState(
        {},
        document.title,
        `${url.pathname}${url.search}`
    );
}

function definirSessaoDisponivel(disponivel) {
    sessaoDisponivel = Boolean(disponivel);

    const botao = document.getElementById("btnNovaSenha");

    if (botao) {
        botao.disabled = !sessaoDisponivel;
    }
}

function configurarBotoesSenha() {
    document
        .querySelectorAll("[data-toggle-senha]")
        .forEach(botao => {
            botao.addEventListener("click", () => {
                const campo = document.getElementById(
                    botao.dataset.toggleSenha
                );

                if (!campo) {
                    return;
                }

                const mostrando = campo.type === "text";
                campo.type = mostrando ? "password" : "text";

                const icone = botao.querySelector("i");

                if (icone) {
                    icone.className = mostrando
                        ? "fa-solid fa-eye"
                        : "fa-solid fa-eye-slash";
                }
            });
        });
}

async function salvarNovaSenha(event) {
    event.preventDefault();

    if (!window.db) {
        return;
    }

    const campoSenha = document.getElementById("novaSenha");
    const campoConfirmacao = document.getElementById("confirmarSenha");
    const botao = document.getElementById("btnNovaSenha");

    const senha = String(campoSenha?.value || "");
    const confirmacao = String(campoConfirmacao?.value || "");

    if (!sessaoDisponivel || !contextoRecuperacaoAtivo()) {
        const { data } = await window.db.auth.getSession();
        definirSessaoDisponivel(Boolean(
            data.session && contextoRecuperacaoAtivo()
        ));
    }

    if (!sessaoDisponivel) {
        notificar(
            "O link de recuperação não está ativo. Solicite um novo link.",
            "aviso",
            "Link inválido ou expirado"
        );
        return;
    }

    if (!senhaValida(senha)) {
        notificar(
            "A senha deve ter no mínimo 8 caracteres e conter pelo menos uma letra e um número.",
            "aviso",
            "Senha inválida"
        );
        campoSenha?.focus();
        return;
    }

    if (senha !== confirmacao) {
        notificar(
            "As duas senhas precisam ser iguais.",
            "aviso",
            "Senhas diferentes"
        );
        campoConfirmacao?.focus();
        return;
    }

    const conteudoOriginal = botao?.innerHTML;

    if (botao) {
        botao.disabled = true;
        botao.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Salvando...
        `;
    }

    try {
        const { error } = await window.db.auth.updateUser({
            password: senha
        });

        if (error) {
            throw error;
        }

        limparRecuperacaoAtiva();

        notificar(
            "Sua senha foi atualizada. Você já pode entrar usando a nova senha.",
            "sucesso",
            "Senha atualizada!",
            4000
        );

        await window.db.auth.signOut();

        setTimeout(() => {
            window.location.href = "login.html";
        }, 1300);

    } catch (erro) {
        console.error("Erro ao atualizar senha:", erro);

        notificar(
            tratarErroNovaSenha(erro),
            "erro",
            "Não foi possível atualizar a senha",
            5500
        );

        if (botao) {
            botao.disabled = false;
            botao.innerHTML = conteudoOriginal || `
                <i class="fa-solid fa-floppy-disk"></i>
                Salvar nova senha
            `;
        }
    }
}

function senhaValida(senha) {
    return (
        senha.length >= 8 &&
        /[A-Za-z]/.test(senha) &&
        /\d/.test(senha)
    );
}

function tratarErroLinkRecuperacao(erro) {
    const texto = String(erro?.message || "").toLowerCase();

    if (
        texto.includes("expired") ||
        texto.includes("invalid") ||
        texto.includes("code")
    ) {
        return "O link de recuperação expirou ou não é mais válido. Solicite um novo link.";
    }

    if (
        texto.includes("failed to fetch") ||
        texto.includes("network")
    ) {
        return "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.";
    }

    return erro?.message || "Não foi possível validar o link de recuperação.";
}

function tratarErroNovaSenha(erro) {
    const texto = String(erro?.message || "").toLowerCase();

    if (
        texto.includes("same password") ||
        texto.includes("different from the old password")
    ) {
        return "Escolha uma senha diferente da senha atual.";
    }

    if (
        texto.includes("session") ||
        texto.includes("jwt") ||
        texto.includes("expired")
    ) {
        return "O link de recuperação expirou ou não é mais válido. Solicite um novo link.";
    }

    if (
        texto.includes("failed to fetch") ||
        texto.includes("network")
    ) {
        return "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.";
    }

    return erro?.message || "Não foi possível atualizar sua senha.";
}

function notificar(texto, tipo = "info", titulo = null, duracao = 4000) {
    if (typeof window.mostrarAlerta === "function") {
        window.mostrarAlerta(texto, tipo, titulo, duracao);
        return;
    }

    console.warn(`[${tipo}] ${titulo || ""}`, texto);
}
