// ==========================================
// NOVA-SENHA.JS
// Comércio da Cidade
// ==========================================

let sessaoDisponivel = false;

const { data: authListener } = window.db
    ? window.db.auth.onAuthStateChange((event, session) => {
        if (
            event === "PASSWORD_RECOVERY" ||
            (event === "SIGNED_IN" && session)
        ) {
            definirSessaoDisponivel(true);
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

    try {
        const { data, error } = await window.db.auth.getSession();

        if (error) {
            throw error;
        }

        definirSessaoDisponivel(Boolean(data.session));

        if (!data.session) {
            notificar(
                "Abra esta página pelo link de recuperação enviado ao seu e-mail. Se o link expirou, solicite um novo.",
                "aviso",
                "Link de recuperação necessário",
                6500
            );
        }

    } catch (erro) {
        console.error("Erro ao validar recuperação de senha:", erro);

        notificar(
            "Não foi possível validar o link de recuperação. Solicite um novo link e tente novamente.",
            "erro",
            "Link inválido",
            6000
        );
    }
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

    if (!sessaoDisponivel) {
        const { data } = await window.db.auth.getSession();
        definirSessaoDisponivel(Boolean(data.session));
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
