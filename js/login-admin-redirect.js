// ==========================================
// LOGIN-ADMIN-REDIRECT.JS
// Redireciona sessão já existente conforme o perfil
// ==========================================

async function verificarRedirecionamentoSessaoExistente() {
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

        const { data: admin, error: adminError } =
            await window.db.rpc("sou_admin");

        if (adminError) {
            console.warn(
                "Não foi possível verificar perfil administrativo:",
                adminError
            );
            return;
        }

        if (admin === true) {
            window.location.replace("admin-dashboard.html");
            return;
        }

        const usuarioId = sessaoData.session.user?.id;

        if (!usuarioId) {
            return;
        }

        const { data: loja, error: lojaError } =
            await window.db
                .from("lojas")
                .select("id,nome")
                .eq("proprietario_id", usuarioId)
                .limit(1)
                .maybeSingle();

        if (lojaError) {
            console.warn(
                "Não foi possível verificar se a sessão pertence a um lojista:",
                lojaError
            );
            return;
        }

        if (loja?.id) {
            localStorage.setItem("loja_id", loja.id);

            if (loja.nome) {
                localStorage.setItem("nome_loja", loja.nome);
            } else {
                localStorage.removeItem("nome_loja");
            }

            window.location.replace("painel-loja.html");
            return;
        }

        localStorage.removeItem("loja_id");
        localStorage.removeItem("nome_loja");
        window.location.replace("perfil.html");

    } catch (erro) {
        console.warn("Falha ao verificar destino da sessão existente:", erro);
    }
}

function iniciarRedirecionamentoAdminLogin() {
    if (!window.db) return;

    // Este script cuida apenas do caso em que o usuário já chega à
    // página de login com uma sessão existente.
    // O redirecionamento após enviar o formulário continua sendo
    // responsabilidade exclusiva de login.js, evitando disputa de destino.
    verificarRedirecionamentoSessaoExistente();
}

window.iniciarRedirecionamentoAdminLogin = iniciarRedirecionamentoAdminLogin;
