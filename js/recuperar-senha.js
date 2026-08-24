// ==========================================
// RECUPERAR-SENHA.JS
// Comércio da Cidade
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("recuperarSenhaForm");

    if (!form) {
        return;
    }

    form.addEventListener("submit", enviarRecuperacaoSenha);
});

function obterUrlRetornoRecuperacao() {
    const url = new URL("nova-senha.html", window.location.href);

    // Garante que parâmetros antigos da página atual não sejam enviados
    // como parte do callback de recuperação.
    url.search = "";
    url.hash = "";

    return url.href;
}

async function enviarRecuperacaoSenha(event) {
    event.preventDefault();

    if (!window.db) {
        notificar(
            "Não foi possível conectar ao sistema. Atualize a página e tente novamente.",
            "erro",
            "Erro de conexão",
            6000
        );
        return;
    }

    const campoEmail = document.getElementById("email");
    const botao = document.getElementById("btnRecuperar");
    const email = String(campoEmail?.value || "").trim().toLowerCase();

    if (!email) {
        notificar(
            "Informe o e-mail da sua conta.",
            "aviso",
            "E-mail obrigatório"
        );
        campoEmail?.focus();
        return;
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!emailValido) {
        notificar(
            "Digite um endereço de e-mail válido.",
            "aviso",
            "E-mail inválido"
        );
        campoEmail?.focus();
        return;
    }

    const conteudoOriginal = botao?.innerHTML;

    if (botao) {
        botao.disabled = true;
        botao.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Enviando...
        `;
    }

    try {
        const redirectTo = obterUrlRetornoRecuperacao();

        console.info("Retorno da recuperação de senha:", redirectTo);

        const { error } = await window.db.auth.resetPasswordForEmail(
            email,
            { redirectTo }
        );

        if (error) {
            throw error;
        }

        notificar(
            "Se existir uma conta com esse e-mail, você receberá as instruções para redefinir sua senha. Verifique também a pasta de spam.",
            "sucesso",
            "E-mail enviado",
            6500
        );

        if (campoEmail) {
            campoEmail.value = "";
        }

    } catch (erro) {
        console.error("Erro ao solicitar recuperação de senha:", erro);

        notificar(
            tratarErroRecuperacao(erro),
            "erro",
            "Não foi possível enviar o link",
            5500
        );

    } finally {
        if (botao) {
            botao.disabled = false;
            botao.innerHTML = conteudoOriginal || `
                <i class="fa-solid fa-paper-plane"></i>
                Enviar link de recuperação
            `;
        }
    }
}

function tratarErroRecuperacao(erro) {
    const texto = String(erro?.message || "").toLowerCase();

    if (
        texto.includes("rate limit") ||
        texto.includes("too many") ||
        texto.includes("security purposes")
    ) {
        return "Muitas solicitações foram feitas em pouco tempo. Aguarde alguns minutos e tente novamente.";
    }

    if (
        texto.includes("redirect") ||
        texto.includes("not allowed")
    ) {
        return "A página de retorno da recuperação ainda não está autorizada no Supabase Auth. Tente novamente após a configuração do endereço do site.";
    }

    if (
        texto.includes("failed to fetch") ||
        texto.includes("network")
    ) {
        return "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.";
    }

    return erro?.message || "Não foi possível iniciar a recuperação de senha.";
}

function notificar(texto, tipo = "info", titulo = null, duracao = 4000) {
    if (typeof window.mostrarAlerta === "function") {
        window.mostrarAlerta(texto, tipo, titulo, duracao);
        return;
    }

    console.warn(`[${tipo}] ${titulo || ""}`, texto);
}
