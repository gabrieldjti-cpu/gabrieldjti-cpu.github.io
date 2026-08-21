// ==========================================
// LOGIN-ADMIN-REDIRECT.JS
// Redirecionamento condicional do RF-02
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
            console.warn("Não foi possível verificar redirecionamento administrativo:", error);
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

    verificarRedirecionamentoAdmin();

    window.db.auth.onAuthStateChange((evento, sessao) => {
        if (evento === "SIGNED_IN" && sessao) {
            setTimeout(verificarRedirecionamentoAdmin, 0);
        }
    });
}

window.iniciarRedirecionamentoAdminLogin = iniciarRedirecionamentoAdminLogin;
