// ==========================================
// PERFIL-PESSOAL.JS
// As telas de lojista (painel, produtos, editar loja, editar produto)
// não valem para o usuário comum. Quem tem perfil de anunciante é
// levado para "Meus anúncios".
// ==========================================

(() => {
    "use strict";

    async function verificar() {
        if (!window.db) return;

        try {
            const { data: sessao } = await window.db.auth.getSession();
            const usuario = sessao?.session?.user;
            if (!usuario) return;

            const { data } = await window.db
                .from("lojas")
                .select("tipo")
                .eq("proprietario_id", usuario.id)
                .maybeSingle();

            if (data?.tipo === "pessoal") {
                window.location.replace("meus-anuncios.html");
            }
        } catch (erro) {
            console.warn("Não foi possível verificar o tipo de cadastro:", erro);
        }
    }

    verificar();
})();
