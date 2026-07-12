// ===============================
// INDEX.JS
// Verifica login e loja do usuário
// ===============================

document.addEventListener("DOMContentLoaded", async () => {

    await verificarUsuario();

});

// ===============================
// VERIFICAR USUÁRIO
// ===============================

async function verificarUsuario() {

    const {
        data: { user },
        error
    } = await window.db.auth.getUser();

    if (error) {
        console.error(error);
        return;
    }

    const btnLogin = document.getElementById("btnLogin");

    if (!btnLogin) return;

    // Não está logado
    if (!user) {

        btnLogin.innerText = "Entrar";
        btnLogin.href = "login.html";

        return;
    }

    // Está logado
    const nome =
        user.user_metadata?.display_name ||
        user.email.split("@")[0];

    btnLogin.innerText = nome;
    btnLogin.href = "perfil.html";

    // Verifica se possui loja
    verificarLoja(user.id);

}

// ===============================
// VERIFICAR LOJA
// ===============================

async function verificarLoja(usuarioId) {

    const { data, error } = await window.db
        .from("lojas")
        .select("*")
        .eq("proprietario_id", usuarioId)
        .maybeSingle();

    if (error) {

        console.error(error);
        return;

    }

    if (data) {

        console.log("Loja encontrada:", data);

        localStorage.setItem(
            "loja_id",
            data.id
        );

        localStorage.setItem(
            "nome_loja",
            data.nome
        );

    } else {

        console.log("Usuário ainda não possui loja.");

    }

}
async function abrirMinhaLoja() {

    const {
        data: { user }
    } = await window.db.auth.getUser();

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const { data, error } = await window.db
        .from("lojas")
        .select("id")
        .eq("proprietario_id", user.id)
        .maybeSingle();

    if (error) {
        console.error(error);
        alert("Erro ao verificar sua loja.");
        return;
    }

    if (data) {
        window.location.href = "painel-loja.html";
    } else {
        window.location.href = "cadastrar-loja.html";
    }
}