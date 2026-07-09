// ===============================
// ELEMENTOS
// ===============================

const form = document.getElementById("loginForm");
const email = document.getElementById("email");
const senha = document.getElementById("senha");

const btnMostrarSenha = document.getElementById("toggleSenha");

// ===============================
// MOSTRAR / ESCONDER SENHA
// ===============================

btnMostrarSenha.addEventListener("click", () => {

    const icone = btnMostrarSenha.querySelector("i");

    if (senha.type === "password") {

        senha.type = "text";

        icone.classList.remove("fa-eye");
        icone.classList.add("fa-eye-slash");

    } else {

        senha.type = "password";

        icone.classList.remove("fa-eye-slash");
        icone.classList.add("fa-eye");

    }

});

// ===============================
// LOGIN
// ===============================

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    const btn = form.querySelector(".btn-login");

    btn.disabled = true;
    btn.textContent = "Entrando...";

    const { data, error } = await supabase.auth.signInWithPassword({

        email: email.value.trim(),

        password: senha.value

    });

    if (error) {

    let mensagem = "Erro ao fazer login.";

    switch (error.message) {

        case "Invalid login credentials":
            mensagem = "E-mail ou senha incorretos.";
            break;

        case "Email not confirmed":
            mensagem = "Confirme seu e-mail antes de entrar.";
            break;

        default:
            mensagem = error.message;
    }

    alert(mensagem);

    btn.disabled = false;
    btn.textContent = "Entrar";

    return;

}

    console.log("Login realizado:", data);

    // Redirecionamento
    window.location.href = "index.html";

});
