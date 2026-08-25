// ==========================================
// LOGIN-ADMIN-REDIRECT.JS
// Redireciona uma sessão já autenticada conforme o perfil
// ==========================================

async function verificarRedirecionamentoPorPerfil() {
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

        if (typeof window.obterDestinoAposLogin !== "function") {
            return;
        }

        const destino = await window.obterDestinoAposLogin();

        if (destino) {
            window.location.replace(destino);
        }
    } catch (erro) {
        console.warn("Falha ao verificar destino da sessão:", erro);
    }
}

function iniciarRedirecionamentoAdminLogin() {
    if (!window.db) return;

    // Este script cuida do caso em que o usuário já chega à página de
    // login com uma sessão existente.
    // O redirecionamento após enviar o formulário é responsabilidade
    // exclusiva de login.js, evitando dois scripts disputando o destino.
    verificarRedirecionamentoPorPerfil();
}

window.iniciarRedirecionamentoAdminLogin = iniciarRedirecionamentoAdminLogin;
