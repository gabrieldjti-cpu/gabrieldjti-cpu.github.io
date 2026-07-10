// ===============================
// ELEMENTOS
// ===============================

const form = document.getElementById("loginForm");
const email = document.getElementById("email");
const senha = document.getElementById("senha");
const btnMostrarSenha = document.getElementById("toggleSenha");

// Verifica se o Supabase foi inicializado
if (!window.db) {
    alert("Erro: Supabase não foi inicializado.");
    throw new Error("window.db não encontrado.");
}

// ===============================
// MOSTRAR / ESCONDER SENHA
// ===============================

btnMostrarSenha.addEventListener("click", () => {

    const icone = btnMostrarSenha.querySelector("i");

    if (senha.type === "password") {

        senha.type = "text";
        icone.classList.replace("fa-eye", "fa-eye-slash");

    } else {

        senha.type = "password";
        icone.classList.replace("fa-eye-slash", "fa-eye");

    }

});

// ===============================
// LOGIN
// ===============================

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const btn = document.querySelector(".btn-login");

    btn.disabled = true;
    btn.textContent = "Entrando...";

    try {

        const { data, error } = await window.db.auth.signInWithPassword({

            email: email.value.trim(),
            password: senha.value

        });

        if (error) {
            throw error;
        }

        console.log("Login realizado:", data);

        window.location.href = "perfil.html";

    } catch (erro) {

        console.error(erro);

        let mensagem = "Erro ao fazer login.";

        switch (erro.message) {

            case "Invalid login credentials":
                mensagem = "E-mail ou senha incorretos.";
                break;

            case "Email not confirmed":
                mensagem = "Confirme seu e-mail antes de entrar.";
                break;

            default:
                mensagem = erro.message;

        }

        alert(mensagem);

        btn.disabled = false;
        btn.textContent = "Entrar";

    }

});