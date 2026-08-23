// ==========================================
// LOGIN-ADMIN-REDIRECT.JS
// Redireciona admin que já chegou autenticado ao login
// ==========================================

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

    // Este script cuida apenas do caso em que o usuário já chega à
    // página de login com uma sessão admin existente.
    // O redirecionamento após enviar o formulário é responsabilidade
    // exclusiva de login.js, evitando dois scripts disputando o destino.
    verificarRedirecionamentoAdmin();
}

window.iniciarRedirecionamentoAdminLogin = iniciarRedirecionamentoAdminLogin;
